// CONCEPT: AI Exercise Container Component
// WHY: Wrapper for AI-generated exercises with loading states and error handling
// PATTERN: Container/Presenter pattern with React Query integration

import React, { useEffect, useState, useRef } from 'react';
import { ExerciseRenderer } from '../practice/ExerciseRenderer';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useGenerateAIExercise, useAIExerciseAvailability } from '../../hooks/useAIExercise';
import type { Exercise } from '../../types';
import { error as logError } from '../../utils/logger';

export interface AIExerciseContainerProps {
  userId: string;
  exerciseType?: 'fill_in_blank' | 'multiple_choice' | 'translation' | 'contextual' | 'adaptive';
  difficulty?: 1 | 2 | 3 | 4 | 5;
  onComplete?: (correct: boolean, exercise: Exercise) => void;
  onError?: (error: Error) => void;
  autoGenerate?: boolean; // Auto-generate on mount
  showAIBadge?: boolean;  // Show AI-generated badge
}

export const AIExerciseContainer: React.FC<AIExerciseContainerProps> = ({
  userId,
  exerciseType,
  difficulty,
  onComplete,
  onError,
  autoGenerate = true,
  showAIBadge = true,
}) => {
  // State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // Track if initial auto-generation has been attempted
  const autoGenerateAttempted = useRef(false);

  // Hooks
  const { isAvailable, reason } = useAIExerciseAvailability();
  const { mutate: generateExercise, data, isPending, error, reset } = useGenerateAIExercise();

  // Memoize onError to prevent unnecessary effect runs
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Auto-generate on mount (only once)
  useEffect(() => {
    if (autoGenerate && isAvailable && !autoGenerateAttempted.current) {
      autoGenerateAttempted.current = true;
      // Reset state and generate
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
      reset();
      generateExercise({
        userId,
        type: exerciseType,
        difficulty,
      });
    }
  }, [autoGenerate, isAvailable, generateExercise, reset, userId, exerciseType, difficulty]);

  // Handle error callback
  useEffect(() => {
    if (error && onErrorRef.current) {
      onErrorRef.current(error);
      logError('AI exercise error', error);
    }
  }, [error]);

  const handleGenerateExercise = () => {
    // Reset state
    setSelectedAnswer(null);
    setShowFeedback(false);
    setIsCorrect(false);
    reset();

    // Generate new exercise
    generateExercise({
      userId,
      type: exerciseType,
      difficulty,
    });
  };

  const handleAnswer = (answer: string) => {
    if (!data?.exercise || showFeedback) return;

    setSelectedAnswer(answer);
    const correct = checkAnswer(answer, data.exercise);
    setIsCorrect(correct);
    setShowFeedback(true);

    // Call onComplete callback
    if (onComplete) {
      onComplete(correct, data.exercise);
    }
  };

  const handleNextExercise = () => {
    handleGenerateExercise();
  };

  const checkAnswer = (answer: string, exercise: Exercise): boolean => {
    // Type-specific answer checking
    const normalizeAnswer = (str: string) => str.trim().toLowerCase();

    if ('correctAnswer' in exercise) {
      return normalizeAnswer(answer) === normalizeAnswer(exercise.correctAnswer);
    }

    return false;
  };

  const getExerciseOptions = (exercise: Exercise): string[] => {
    if ('options' in exercise && exercise.options) {
      // Handle both array of strings and array of objects
      if (typeof exercise.options[0] === 'string') {
        return exercise.options as string[];
      }
      // For visual discrimination, options are objects - return IDs or species names
      return (exercise.options as Array<{ id: string; species: string }>).map(opt => opt.species || opt.id);
    }
    if ('distractors' in exercise && (exercise as { distractors?: string[] }).distractors && 'correctAnswer' in exercise) {
      // Combine correct answer and distractors, then shuffle
      const distractors = (exercise as { distractors: string[] }).distractors;
      const correctAnswer = (exercise as { correctAnswer: string }).correctAnswer;
      const options = [...distractors, correctAnswer];
      return shuffleArray(options);
    }
    return [];
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Map ExerciseType to ExerciseRenderer's expected type
  const mapExerciseType = (type: string): 'visual_match' | 'fill_blank' | 'multiple_choice' => {
    switch (type) {
      case 'visual_discrimination':
      case 'visual_identification':
      case 'image_labeling':
        return 'visual_match';
      case 'contextual_fill':
        return 'fill_blank';
      case 'term_matching':
      default:
        return 'multiple_choice';
    }
  };

  // Not available in static mode
  if (!isAvailable) {
    return (
      <div
        className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
        role="alert"
        aria-live="polite"
      >
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          AI Exercises Unavailable
        </h3>
        <p className="text-yellow-800 mb-4">{reason}</p>
        <p className="text-sm text-yellow-700">
          AI-powered exercise generation requires a backend server connection.
        </p>
      </div>
    );
  }

  // Loading state
  if (isPending) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 space-y-4"
        role="status"
        aria-live="polite"
        aria-label="Generating AI exercise"
      >
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">
            Generating personalized exercise...
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Using AI to create content just for you
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
        role="alert"
        aria-live="assertive"
      >
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Failed to Generate Exercise
        </h3>
        <p className="text-red-800 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button
          variant="danger"
          onClick={handleGenerateExercise}
          aria-label="Retry generating exercise"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // No exercise loaded
  if (!data?.exercise) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">No exercise loaded</p>
        <Button onClick={handleGenerateExercise} aria-label="Generate new exercise">
          Generate Exercise
        </Button>
      </div>
    );
  }

  const exercise = data.exercise;
  const options = getExerciseOptions(exercise);

  return (
    <div className="space-y-6" role="region" aria-label="AI Exercise">
      {/* AI Badge */}
      {showAIBadge && (
        <div className="flex items-center justify-between">
          <Badge
            variant="primary"
            size="md"
            dot
            className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border border-purple-300"
            aria-label={data.metadata.generated ? 'AI-generated exercise' : 'Cached exercise'}
          >
            {data.metadata.generated ? (
              <>
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI-Generated
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
                Cached
              </>
            )}
          </Badge>

          {/* Difficulty indicator */}
          <Badge
            variant="info"
            size="sm"
            outlined
            aria-label={`Difficulty level ${data.metadata.difficulty} out of 5`}
          >
            Difficulty: {data.metadata.difficulty}/5
          </Badge>
        </div>
      )}

      {/* Exercise Content */}
      <ExerciseRenderer
        type={mapExerciseType(exercise.type)}
        question={'prompt' in exercise ? (exercise.prompt ?? '') : ''}
        imageUrl={'imageUrl' in exercise ? (exercise as { imageUrl?: string }).imageUrl : undefined}
        translation={'translation' in exercise ? (exercise as { translation?: string }).translation : undefined}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={'correctAnswer' in exercise ? (exercise as { correctAnswer: string }).correctAnswer : ''}
        showFeedback={showFeedback}
        explanation={'explanation' in exercise ? String((exercise as { explanation?: unknown }).explanation || '') : undefined}
        onAnswer={handleAnswer}
      />

      {/* Feedback */}
      {showFeedback && (
        <div
          className={`p-4 rounded-lg text-center ${
            isCorrect
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
          role="alert"
          aria-live="polite"
        >
          <p className={`text-lg font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          {'hint' in exercise && (exercise as { hint?: string }).hint && !isCorrect && (
            <p className="text-sm text-red-700 mt-2">Hint: {String((exercise as { hint?: string }).hint)}</p>
          )}
        </div>
      )}

      {/* Next Exercise Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleNextExercise}
          disabled={isPending}
          isLoading={isPending}
          size="lg"
          className="min-w-[200px]"
          aria-label="Generate next exercise"
        >
          {showFeedback ? 'Next Exercise' : 'Skip Exercise'}
        </Button>
      </div>

      {/* Metadata for debugging (dev only) */}
      {process.env.NODE_ENV === 'development' && data.metadata && (
        <details className="text-xs text-gray-500 mt-4">
          <summary className="cursor-pointer hover:text-gray-700">
            Debug Info
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(data.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default AIExerciseContainer;
