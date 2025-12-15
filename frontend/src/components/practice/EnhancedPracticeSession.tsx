// CONCEPT: Enhanced practice session with multiple exercise types
// WHY: Provides varied learning experience balancing Spanish and bird knowledge
// PATTERN: Session manager that cycles through different exercise types

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TermMatchingExercise } from '../exercises/TermMatchingExercise';
import { AudioRecognitionExercise } from '../exercises/AudioRecognitionExercise';
import { SentenceBuildingExercise } from '../exercises/SentenceBuildingExercise';
import { CategorySortingExercise } from '../exercises/CategorySortingExercise';
import { SpatialIdentificationExercise } from '../exercises/SpatialIdentificationExercise';
import { EnhancedExerciseGenerator } from '../exercises/EnhancedExerciseGenerator';
import { ExerciseErrorBoundary } from '../exercises/ExerciseErrorBoundary';
import { ExerciseFeedback } from './ExerciseFeedback';
import { SessionProgress } from './SessionProgress';
import type { Exercise } from '../exercises/EnhancedExerciseGenerator';
import type { Annotation, ExerciseResult } from '../../types';

interface EnhancedPracticeSessionProps {
  annotations: Annotation[];
  imageUrl?: string;
  onComplete: (score: number, total: number) => void;
  onExerciseComplete?: (result: ExerciseResult) => void;
}

// Extended result type for feedback display
interface ExtendedExerciseResult extends ExerciseResult {
  correctAnswer?: string;
  userAnswer?: string;
}

export const EnhancedPracticeSession: React.FC<EnhancedPracticeSessionProps> = ({
  annotations,
  imageUrl,
  onComplete,
  onExerciseComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<ExtendedExerciseResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [totalTime, setTotalTime] = useState(0);
  const [exerciseTimes, setExerciseTimes] = useState<number[]>([]);

  // Generate exercise set
  const exercises = useMemo(() => {
    const generator = new EnhancedExerciseGenerator(annotations);
    return generator.generateExerciseSet(5, imageUrl);
  }, [annotations, imageUrl]);

  const currentExercise = exercises[currentIndex];
  const totalExercises = exercises.length;

  // Update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalTime((Date.now() - sessionStartTime) / 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Reset exercise timer when moving to next exercise
  useEffect(() => {
    setExerciseStartTime(Date.now());
  }, [currentIndex]);

  // Handle exercise completion
  const handleExerciseComplete = useCallback((result: ExerciseResult) => {
    const timeTaken = (Date.now() - exerciseStartTime) / 1000;

    // Update score based on result score (0-1)
    setScore(prev => prev + result.score);

    // Update streak
    if (result.score >= 0.9) { // Consider 90%+ as correct for streak
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Store exercise time
    setExerciseTimes(prev => [...prev, timeTaken]);

    // Store result and show feedback (with additional fields for feedback display)
    const extendedResult: ExtendedExerciseResult = {
      ...result,
      timeTaken,
      // These could be populated from the exercise if available in future updates
      correctAnswer: (result.metadata as any)?.correctAnswer as string | undefined,
      userAnswer: (result.metadata as any)?.userAnswer as string | undefined,
    };
    setLastResult(extendedResult);
    setShowFeedback(true);

    // Pass result to parent callback
    if (currentExercise) {
      onExerciseComplete?.(result);
    }

    // Move to next or show results after feedback
    setTimeout(() => {
      setShowFeedback(false);

      if (currentIndex < totalExercises - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setShowResults(true);
        onComplete(score + result.score, totalExercises);
      }
    }, 2000); // Longer delay to show feedback
  }, [currentIndex, totalExercises, currentExercise, score, exerciseStartTime, onComplete, onExerciseComplete]);

  // Handle skipping an exercise (when error boundary is triggered)
  const handleSkipExercise = useCallback(() => {
    console.log(`Skipping exercise ${currentIndex + 1} due to error`);

    // Move to next exercise or show results
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
      onComplete(score, totalExercises);
    }
  }, [currentIndex, totalExercises, score, onComplete]);

  // Render current exercise based on type
  const renderExercise = useCallback((exercise: Exercise) => {
    switch (exercise.type) {
      case 'term_matching':
        return (
          <TermMatchingExercise
            pairs={exercise.pairs}
            onComplete={(result) => handleExerciseComplete(result)}
          />
        );

      case 'audio_recognition':
        return (
          <AudioRecognitionExercise
            correctAnswer={exercise.correctAnswer}
            options={exercise.options}
            onComplete={(result) => handleExerciseComplete(result)}
          />
        );

      case 'sentence_building':
        return (
          <SentenceBuildingExercise
            targetSentence={exercise.targetSentence}
            englishTranslation={exercise.englishTranslation}
            words={exercise.words}
            hint={exercise.hint}
            onComplete={(result) => handleExerciseComplete(result)}
          />
        );

      case 'category_sorting':
        return (
          <CategorySortingExercise
            categories={exercise.categories}
            items={exercise.items}
            onComplete={(result) => handleExerciseComplete(result)}
          />
        );

      case 'spatial_identification':
        return (
          <SpatialIdentificationExercise
            imageUrl={exercise.imageUrl}
            imageAlt="Bird anatomy"
            targetPoint={exercise.targetPoint}
            allPoints={exercise.allPoints}
            onComplete={(result) => handleExerciseComplete(result)}
          />
        );

      default:
        return (
          <div className="text-center p-8 text-gray-500">
            Unknown exercise type
          </div>
        );
    }
  }, [handleExerciseComplete]);

  // Results screen
  if (showResults) {
    const percentage = Math.round((score / (totalExercises * 1)) * 100);
    const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;

    return (
      <div className="text-center p-8">
        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((star) => (
              <svg
                key={star}
                className={`w-12 h-12 ${star <= stars ? 'text-yellow-400' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {percentage >= 90 ? '¡Excelente!' : percentage >= 70 ? '¡Muy bien!' : percentage >= 50 ? '¡Buen trabajo!' : 'Keep practicing!'}
          </h2>
          <p className="text-xl text-gray-600">
            Score: {score} / {totalExercises}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Session Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalExercises}</p>
              <p className="text-sm text-gray-600">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{score}</p>
              <p className="text-sm text-gray-600">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
              <p className="text-sm text-gray-600">Accuracy</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentIndex(0);
            setScore(0);
            setShowResults(false);
          }}
          className="px-8 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-lg"
        >
          Practice Again
        </button>
      </div>
    );
  }

  // No exercises generated
  if (exercises.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p className="mb-4">Not enough annotations to generate exercises.</p>
        <p className="text-sm">Add more vocabulary terms to enable enhanced practice.</p>
      </div>
    );
  }

  // Calculate average time for progress estimation
  const averageTime = exerciseTimes.length > 0
    ? exerciseTimes.reduce((a, b) => a + b, 0) / exerciseTimes.length
    : undefined;

  return (
    <div className="space-y-6">
      {/* Session Progress Component */}
      <SessionProgress
        currentExercise={currentIndex}
        totalExercises={totalExercises}
        currentScore={score}
        streak={streak}
        averageTime={averageTime}
        elapsedTime={totalTime}
      />

      {/* Exercise Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 min-h-[400px]">
        {!showFeedback && currentExercise && (
          <ExerciseErrorBoundary
            exerciseType={currentExercise.type}
            onSkip={handleSkipExercise}
          >
            {renderExercise(currentExercise)}
          </ExerciseErrorBoundary>
        )}

        {/* Show feedback after exercise completion */}
        {showFeedback && lastResult && (
          <ExerciseFeedback
            isCorrect={lastResult.score >= 0.9}
            correctAnswer={lastResult.correctAnswer}
            userAnswer={lastResult.userAnswer}
            timeTaken={lastResult.timeTaken}
            showCelebration={score + lastResult.score === totalExercises && lastResult.score >= 0.9}
          />
        )}
      </div>

      {/* Exercise Type Indicator */}
      {!showFeedback && (
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">
            {currentExercise?.type.replace(/_/g, ' ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedPracticeSession;
