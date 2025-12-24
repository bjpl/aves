import React, { useState, useRef } from 'react';
import { error as logError } from '../../utils/logger';

interface PronunciationPlayerProps {
  audioUrl: string;
  size?: 'small' | 'medium' | 'large';
}

export const PronunciationPlayer: React.FC<PronunciationPlayerProps> = ({
  audioUrl,
  size = 'small'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        await audioRef.current.play();

        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    } catch (error) {
      logError('Error playing audio:', error instanceof Error ? error : new Error(String(error)));
      setIsPlaying(false);
    }
  };

  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  return (
    <button
      onClick={handlePlay}
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        transition-all duration-200
        ${isPlaying
          ? 'bg-blue-500 text-white scale-110'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
      aria-label={isPlaying ? 'Stop pronunciation' : 'Play pronunciation'}
    >
      {isPlaying ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <rect x="6" y="4" width="3" height="12" />
          <rect x="11" y="4" width="3" height="12" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};