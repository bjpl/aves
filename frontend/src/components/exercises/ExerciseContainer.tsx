import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SessionProgress } from '../../../../shared/types/exercise.types';
import { Annotation } from '../../../../shared/types/annotation.types';
import { EnhancedExercise } from '../../../../shared/types/enhanced-exercise.types';
import { VisualDiscrimination } from './VisualDiscrimination';
import { ContextualFill } from './ContextualFill';
import { VisualIdentification } from './VisualIdentification';
import { TermMatchingExercise } from './TermMatchingExercise';
import { AudioRecognitionExercise } from './AudioRecognitionExercise';
import { SentenceBuildingExercise } from './SentenceBuildingExercise';
import { CategorySortingExercise } from './CategorySortingExercise';
import { SpatialIdentificationExercise } from './SpatialIdentificationExercise';
import { ComparativeAnalysisExercise } from './ComparativeAnalysisExercise';
import { EnhancedExerciseGenerator } from '../../services/enhancedExerciseGenerator';
import type { ExerciseResult } from '../../types/exercise-result.types';
import { createExerciseResult } from '../../types/exercise-result.types';
import type { ExerciseAnswer } from '../../types/api.types';

interface ExerciseContainerProps {
  annotations: Annotation[];
  onComplete?: (progress: SessionProgress) => void;
  onExerciseComplete?: (result: ExerciseResult) => void;
}

export const ExerciseContainer: React.FC<ExerciseContainerProps> = ({
  annotations,
  onExerciseComplete
}) => {
  const [currentExercise, setCurrentExercise] = useState<EnhancedExercise | null>(null);
  // Create generator that updates when annotations change
  const generator = useMemo(
    () => new EnhancedExerciseGenerator(annotations),
    [annotations]
  );
  const [progress, setProgress] = useState<SessionProgress>({
    sessionId: `session_${Date.now()}`,
    exercisesCompleted: 0,
    correctAnswers: 0,
    currentStreak: 0,
    startedAt: new Date()
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; feedback: string } | null>(null);

  // Store timeout ID for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if initial exercise has been generated
  const initialGenerationDone = useRef(false);
  // Track exercise start time for timing metrics
  const exerciseStartTime = useRef<number>(Date.now());

  // Generate initial exercise on mount or when annotations change
  useEffect(() => {
    // Generate new exercise when annotations change
    const exercise = generator.generateAdaptiveExercise();
    if (exercise) {
      setCurrentExercise(exercise);
      setShowFeedback(false);
      setLastResult(null);
    }
    initialGenerationDone.current = true;

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [generator]);

  const generateNewExercise = useCallback(() => {
    // Use adaptive exercise generation for better learning progression
    const exercise = generator.generateAdaptiveExercise();

    if (exercise) {
      setCurrentExercise(exercise);
      setShowFeedback(false);
      setLastResult(null);
      // Reset exercise timer
      exerciseStartTime.current = Date.now();
    }
  }, [generator]);

  const handleAnswer = useCallback((answer: ExerciseAnswer | boolean | null) => {
    if (!currentExercise) return;

    // Convert answer to the format expected by checkAnswer
    let checkableAnswer: string | { spanish: string; english: string }[];
    if (typeof answer === 'boolean' || answer === null || typeof answer === 'number') {
      checkableAnswer = '';
    } else if (typeof answer === 'string') {
      checkableAnswer = answer;
    } else if (Array.isArray(answer)) {
      checkableAnswer = answer as { spanish: string; english: string }[];
    } else {
      checkableAnswer = '';
    }
    const isCorrect = EnhancedExerciseGenerator.checkAnswer(currentExercise, checkableAnswer);
    const feedback = EnhancedExerciseGenerator.generateFeedback(isCorrect, currentExercise);
    const timeTaken = Date.now() - exerciseStartTime.current;

    const newProgress = {
      ...progress,
      exercisesCompleted: progress.exercisesCompleted + 1,
      correctAnswers: progress.correctAnswers + (isCorrect ? 1 : 0),
      currentStreak: isCorrect ? progress.currentStreak + 1 : 0
    };

    setProgress(newProgress);
    setLastResult({ correct: isCorrect, feedback });
    setShowFeedback(true);

    // Update generator level based on performance
    generator.updateLevel({ correct: newProgress.correctAnswers, total: newProgress.exercisesCompleted });

    // Call onExerciseComplete with ExerciseResult if provided and we have an annotation ID
    if (onExerciseComplete && currentExercise.annotation?.id) {
      const result = createExerciseResult(
        currentExercise.annotation.id,
        currentExercise.type,
        isCorrect,
        timeTaken
      );
      onExerciseComplete(result);
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-advance after delay
    timeoutRef.current = setTimeout(() => {
      generateNewExercise();
    }, 3000);
  }, [currentExercise, progress, generator, generateNewExercise, onExerciseComplete]);

  const renderExercise = useCallback(() => {
    if (!currentExercise) return null;

    // Show pre-teaching if available
    const preTeaching = currentExercise.preTeaching && !showFeedback ? (
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <strong>📚 Learning Tip:</strong> {currentExercise.preTeaching}
      </div>
    ) : null;

    // Render appropriate exercise component
    let exerciseComponent = null;

    switch (currentExercise.type) {
      case 'visual_identification':
        exerciseComponent = (
          <VisualIdentification
            exercise={currentExercise as any}
            onAnswer={handleAnswer}
            disabled={showFeedback}
          />
        );
        break;
      case 'visual_discrimination':
        exerciseComponent = (
          <VisualDiscrimination
            exercise={currentExercise as any}
            onAnswer={handleAnswer}
            disabled={showFeedback}
          />
        );
        break;
      case 'contextual_fill':
        exerciseComponent = (
          <ContextualFill
            exercise={currentExercise as any}
            onAnswer={handleAnswer}
            disabled={showFeedback}
          />
        );
        break;
      case 'term_matching':
        exerciseComponent = (
          <TermMatchingExercise
            pairs={(currentExercise as any).pairs || []}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      case 'audio_recognition':
        exerciseComponent = (
          <AudioRecognitionExercise
            correctAnswer={(currentExercise as any).correctAnswer}
            options={(currentExercise as any).options || []}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      case 'sentence_building':
        exerciseComponent = (
          <SentenceBuildingExercise
            targetSentence={(currentExercise as any).targetSentence || ''}
            englishTranslation={(currentExercise as any).englishTranslation || ''}
            words={(currentExercise as any).words || []}
            hint={(currentExercise as any).hint}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      case 'category_sorting':
        exerciseComponent = (
          <CategorySortingExercise
            categories={(currentExercise as any).categories || []}
            items={(currentExercise as any).items || []}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      case 'spatial_identification':
        exerciseComponent = (
          <SpatialIdentificationExercise
            imageUrl={(currentExercise as any).imageUrl || ''}
            imageAlt="Bird anatomy"
            targetPoint={(currentExercise as any).targetPoint}
            allPoints={(currentExercise as any).allPoints || []}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      case 'comparative_analysis':
        exerciseComponent = (
          <ComparativeAnalysisExercise
            birdA={(currentExercise as any).birdA}
            birdB={(currentExercise as any).birdB}
            questions={(currentExercise as any).questions || []}
            onComplete={(result) => handleAnswer(result.correct)}
          />
        );
        break;
      default:
        // Fallback for new exercise types
        exerciseComponent = (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-4">{currentExercise.prompt}</h3>
            <p className="text-gray-600">{currentExercise.instructions}</p>
            <button
              onClick={() => handleAnswer(null)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        );
    }

    return (
      <>
        {preTeaching}
        {exerciseComponent}
        {currentExercise.culturalNote && showFeedback && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-yellow-700">
              <strong>🌍 Cultural Note:</strong> {currentExercise.culturalNote}
            </p>
          </div>
        )}
      </>
    );
  }, [currentExercise, showFeedback, handleAnswer]);

  const accuracyPercentage = useMemo(() => progress.exercisesCompleted > 0
    ? Math.round((progress.correctAnswers / progress.exercisesCompleted) * 100)
    : 0, [progress.exercisesCompleted, progress.correctAnswers]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Practice Session</h2>
            {currentExercise && (
              <p className="text-xs text-gray-500 mt-1">
                Level: {currentExercise.pedagogicalLevel} •
                Objective: {currentExercise.learningObjective}
              </p>
            )}
          </div>
          <button
            onClick={() => generateNewExercise()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Skip →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{progress.exercisesCompleted}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{accuracyPercentage}%</p>
            <p className="text-sm text-gray-500">Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{progress.currentStreak}</p>
            <p className="text-sm text-gray-500">Streak</p>
          </div>
        </div>
      </div>

      {/* Exercise Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {renderExercise()}
      </div>

      {/* Feedback */}
      {showFeedback && lastResult && (
        <div className={`mt-4 p-4 rounded-lg text-center transition-all ${
          lastResult.correct
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="text-lg font-bold">{lastResult.feedback}</p>
          <p className="text-sm mt-1">Next exercise loading...</p>
        </div>
      )}
    </div>
  );
};