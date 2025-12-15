// CONCEPT: Audio-based Spanish vocabulary recognition
// WHY: Develops listening comprehension for Spanish bird terms
// PATTERN: Play audio -> select correct written form

import React, { useState, useCallback, useEffect } from 'react';
import { audioService } from '../../services/audioService';
import type { ExerciseResultCallback } from '../../types';

interface AudioOption {
  id: string;
  spanish: string;
  english: string;
  pronunciation?: string;
}

interface AudioRecognitionExerciseProps {
  correctAnswer: AudioOption;
  options: AudioOption[];
  onComplete: ExerciseResultCallback;
  autoPlayOnLoad?: boolean;
}

export const AudioRecognitionExercise: React.FC<AudioRecognitionExerciseProps> = ({
  correctAnswer,
  options,
  onComplete,
  autoPlayOnLoad = true,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Auto-play audio on load
  useEffect(() => {
    if (autoPlayOnLoad && !hasAutoPlayed) {
      setHasAutoPlayed(true);
      // Small delay for component mount
      const timer = setTimeout(() => {
        playAudio();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayOnLoad, hasAutoPlayed]);

  const playAudio = useCallback(async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setPlayCount(prev => prev + 1);

    try {
      await audioService.speakTerm(
        correctAnswer.spanish,
        correctAnswer.pronunciation
      );
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      setIsPlaying(false);
    }
  }, [correctAnswer, isPlaying]);

  const handleOptionSelect = useCallback((option: AudioOption) => {
    if (showResult) return;

    setSelectedOption(option.id);
    setShowResult(true);

    const timeTaken = Date.now() - startTime;
    const isCorrect = option.id === correctAnswer.id;

    // Play feedback audio
    if (isCorrect) {
      // Could play a success sound here
    }

    onComplete({
      exerciseId: 'audio-recognition-' + Date.now(),
      exerciseType: 'audio_recognition',
      correct: isCorrect,
      score: isCorrect ? 1 : 0,
      timeTaken,
      metadata: {
        playCount,
      },
    });
  }, [showResult, startTime, correctAnswer.id, playCount, onComplete]);

  const getOptionClass = (option: AudioOption) => {
    const base = 'w-full p-4 rounded-xl border-2 transition-all duration-200 text-left';

    if (!showResult) {
      if (selectedOption === option.id) {
        return `${base} border-blue-500 bg-blue-50 shadow-md`;
      }
      return `${base} border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer`;
    }

    // Show results
    if (option.id === correctAnswer.id) {
      return `${base} border-green-500 bg-green-50`;
    }
    if (selectedOption === option.id && option.id !== correctAnswer.id) {
      return `${base} border-red-500 bg-red-50`;
    }
    return `${base} border-gray-200 bg-gray-50 opacity-50`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          ¿Qué palabra escuchas?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Listen and select the correct Spanish term
        </p>
      </div>

      {/* Audio Player Section */}
      <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
        {/* Large Play Button */}
        <button
          onClick={playAudio}
          disabled={isPlaying}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isPlaying
              ? 'bg-blue-600 scale-110 shadow-xl'
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg'
          }`}
          aria-label="Play pronunciation"
        >
          {isPlaying ? (
            // Sound waves animation
            <div className="flex items-center gap-1">
              <div className="w-1 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-8 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              <div className="w-1 h-7 bg-white rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
            </div>
          ) : (
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Play count and hint */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isPlaying ? 'Escuchando...' : 'Tap to listen'}
          </p>
          {playCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Played {playCount} time{playCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Hint after multiple plays */}
        {playCount >= 3 && !showResult && (
          <p className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
            Hint: {correctAnswer.english}
          </p>
        )}
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionSelect(option)}
            disabled={showResult}
            className={getOptionClass(option)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-medium text-gray-800">
                  {option.spanish}
                </span>
                {showResult && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({option.english})
                  </span>
                )}
              </div>
              {showResult && option.id === correctAnswer.id && (
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
              {showResult && selectedOption === option.id && option.id !== correctAnswer.id && (
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Result Feedback */}
      {showResult && (
        <div className={`p-4 rounded-xl text-center ${
          selectedOption === correctAnswer.id
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {selectedOption === correctAnswer.id ? (
            <>
              <p className="text-lg font-semibold text-green-700">¡Correcto!</p>
              <p className="text-sm text-green-600 mt-1">
                {correctAnswer.spanish} = {correctAnswer.english}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-red-700">Incorrecto</p>
              <p className="text-sm text-red-600 mt-1">
                The correct answer was: <strong>{correctAnswer.spanish}</strong>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioRecognitionExercise;
