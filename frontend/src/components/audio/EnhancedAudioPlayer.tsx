// CONCEPT: Modern audio player with waveform visualization for TTS
// WHY: Elegant visual feedback for pronunciation and bird call playback
// PATTERN: Canvas-based waveform with Web Audio API analyzer

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { audioService } from '../../services/audioService';

interface EnhancedAudioPlayerProps {
  // For TTS
  text?: string;
  language?: 'es' | 'en';

  // For audio files
  audioUrl?: string;

  // Display options
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent';
  showWaveform?: boolean;
  autoPlay?: boolean;

  // Callbacks
  onPlay?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export const EnhancedAudioPlayer: React.FC<EnhancedAudioPlayerProps> = ({
  text,
  language = 'es',
  audioUrl,
  label,
  sublabel,
  size = 'md',
  variant = 'primary',
  showWaveform = true,
  autoPlay = false,
  onPlay,
  onEnd,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  // Note: Web Audio API refs reserved for future real audio analysis
  // const audioContextRef = useRef<AudioContext | null>(null);
  // const analyzerRef = useRef<AnalyserNode | null>(null);

  // Size configurations
  const sizeConfig = {
    sm: { button: 'w-10 h-10', icon: 'w-4 h-4', canvas: 'h-8', text: 'text-sm' },
    md: { button: 'w-14 h-14', icon: 'w-6 h-6', canvas: 'h-10', text: 'text-base' },
    lg: { button: 'w-20 h-20', icon: 'w-8 h-8', canvas: 'h-12', text: 'text-lg' },
  };

  // Color variants
  const variantConfig = {
    primary: {
      bg: 'bg-blue-500 hover:bg-blue-600',
      ring: 'ring-blue-300',
      wave: '#3b82f6',
      text: 'text-blue-700',
    },
    secondary: {
      bg: 'bg-purple-500 hover:bg-purple-600',
      ring: 'ring-purple-300',
      wave: '#8b5cf6',
      text: 'text-purple-700',
    },
    accent: {
      bg: 'bg-green-500 hover:bg-green-600',
      ring: 'ring-green-300',
      wave: '#10b981',
      text: 'text-green-700',
    },
  };

  const config = sizeConfig[size];
  const colors = variantConfig[variant];

  // Draw animated waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isPlaying) {
      // Draw static waveform when not playing
      ctx.beginPath();
      ctx.strokeStyle = colors.wave;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;

      const bars = 20;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i++) {
        const barHeight = Math.random() * (height * 0.4) + height * 0.1;
        const x = i * barWidth + barWidth / 2;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = colors.wave;
        ctx.fillRect(x - 2, y, 4, barHeight);
      }

      ctx.globalAlpha = 1;
      return;
    }

    // Animate while playing
    const time = Date.now() / 1000;
    const bars = 30;
    const barWidth = width / bars;

    for (let i = 0; i < bars; i++) {
      const frequency = 2 + i * 0.3;
      const amplitude = Math.sin(time * frequency) * 0.3 + 0.5;
      const barHeight = amplitude * height * 0.8;
      const x = i * barWidth + barWidth / 2;
      const y = (height - barHeight) / 2;

      // Gradient effect
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, colors.wave);
      gradient.addColorStop(0.5, colors.wave + 'dd');
      gradient.addColorStop(1, colors.wave);

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 2, y, 4, barHeight);
    }

    animationRef.current = requestAnimationFrame(drawWaveform);
  }, [isPlaying, colors.wave]);

  // Update waveform animation
  useEffect(() => {
    if (showWaveform) {
      drawWaveform();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, showWaveform, drawWaveform]);

  // Resize canvas to parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
        drawWaveform();
      }
    });

    resizeObserver.observe(canvas.parentElement!);
    return () => resizeObserver.disconnect();
  }, [drawWaveform]);

  // Handle play/pause
  const handleToggle = useCallback(async () => {
    setHasError(false);

    if (isPlaying) {
      audioService.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    onPlay?.();

    try {
      if (audioUrl) {
        await audioService.playAudio(audioUrl);
      } else if (text) {
        await audioService.speak({
          text,
          lang: language === 'es' ? 'es-ES' : 'en-US',
          onStart: () => setIsPlaying(true),
          onEnd: () => {
            setIsPlaying(false);
            onEnd?.();
          },
          onError: (error) => {
            setHasError(true);
            setIsPlaying(false);
            onError?.(error);
          },
        });
      }
    } catch (error) {
      setHasError(true);
      setIsPlaying(false);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    setIsPlaying(false);
    onEnd?.();
  }, [isPlaying, audioUrl, text, language, onPlay, onEnd, onError]);

  // Auto-play on mount
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(handleToggle, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-4">
      {/* Play Button */}
      <button
        onClick={handleToggle}
        disabled={hasError}
        className={`${config.button} ${colors.bg} rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isPlaying ? `scale-110 ring-4 ${colors.ring}` : 'hover:scale-105'
        } ${hasError ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? (
          // Animated sound bars
          <div className="flex items-end gap-0.5">
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '80%', animationDelay: '450ms' }} />
          </div>
        ) : hasError ? (
          <svg className={`${config.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className={`${config.icon} text-white ml-0.5`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {/* Labels */}
        {(label || sublabel) && (
          <div className="mb-1">
            {label && (
              <p className={`${config.text} font-semibold ${colors.text} truncate`}>
                {label}
              </p>
            )}
            {sublabel && (
              <p className="text-xs text-gray-500 truncate">
                {sublabel}
              </p>
            )}
          </div>
        )}

        {/* Waveform Visualization */}
        {showWaveform && (
          <div className={`${config.canvas} w-full rounded-lg overflow-hidden bg-gray-100`}>
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAudioPlayer;
