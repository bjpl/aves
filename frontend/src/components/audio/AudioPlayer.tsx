// CONCEPT: Unified audio player for pronunciation and bird calls
// WHY: Provides consistent audio playback with visual feedback
// PATTERN: Component with Web Audio API integration

import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl?: string;
  text?: string;
  type: 'pronunciation' | 'bird-call';
  size?: 'small' | 'medium' | 'large';
  onPlay?: () => void;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  text,
  type,
  size = 'medium',
  onPlay,
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Size classes
  const sizeClasses = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base'
  };

  // Initialize audio or speech synthesis
  useEffect(() => {
    if (audioUrl) {
      // Use audio file if URL provided
      const audio = new Audio(audioUrl);
      audio.preload = 'metadata';

      audio.addEventListener('loadstart', () => setIsLoading(true));
      audio.addEventListener('canplay', () => setIsLoading(false));
      audio.addEventListener('error', () => {
        setError('Failed to load audio');
        setIsLoading(false);
      });
      audio.addEventListener('ended', () => setIsPlaying(false));

      audioRef.current = audio;
    } else if (text && type === 'pronunciation') {
      // Use speech synthesis for pronunciation without audio file
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);

        // Configure for Spanish
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find Spanish voice
        const voices = speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice =>
          voice.lang.startsWith('es') && voice.lang.includes('ES')
        );

        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }

        utterance.addEventListener('end', () => setIsPlaying(false));
        utterance.addEventListener('error', () => {
          setError('Speech synthesis failed');
          setIsPlaying(false);
        });

        speechSynthesisRef.current = utterance;
      } else {
        setError('Speech synthesis not supported');
      }
    }

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
        speechSynthesisRef.current = null;
      }
    };
  }, [audioUrl, text, type]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && !error) {
      handlePlay();
    }
  }, [autoPlay]);

  const handlePlay = async () => {
    setError(null);

    try {
      if (isPlaying) {
        // Stop playing
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        if (speechSynthesisRef.current) {
          speechSynthesis.cancel();
        }
        setIsPlaying(false);
      } else {
        // Start playing
        setIsPlaying(true);
        onPlay?.();

        if (audioRef.current) {
          await audioRef.current.play();
        } else if (speechSynthesisRef.current) {
          speechSynthesis.speak(speechSynthesisRef.current);
        } else {
          throw new Error('No audio source available');
        }
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  // Icon based on type and state
  const getIcon = () => {
    if (isLoading) {
      return (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    if (error) {
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }

    if (isPlaying) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      );
    }

    if (type === 'pronunciation') {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      );
    }

    // Bird call icon
    return (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  };

  // Button color based on state
  const getButtonClasses = () => {
    const base = `${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200 `;

    if (error) {
      return base + 'bg-red-100 text-red-600 hover:bg-red-200 cursor-not-allowed';
    }

    if (isPlaying) {
      return base + 'bg-blue-500 text-white shadow-lg scale-110';
    }

    if (type === 'pronunciation') {
      return base + 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105';
    }

    return base + 'bg-purple-100 text-purple-600 hover:bg-purple-200 hover:scale-105';
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handlePlay}
        disabled={isLoading || !!error}
        className={getButtonClasses()}
        aria-label={
          isPlaying ? 'Stop audio' :
          type === 'pronunciation' ? 'Play pronunciation' : 'Play bird call'
        }
        title={error || (isPlaying ? 'Stop' : 'Play')}
      >
        {getIcon()}
      </button>

      {/* Optional text label */}
      {text && type === 'pronunciation' && (
        <span className="text-sm text-gray-600 italic">
          {text}
        </span>
      )}

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
};