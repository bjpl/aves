import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PracticeStats } from '../components/practice/PracticeStats';
import { ExerciseRenderer } from '../components/practice/ExerciseRenderer';
import { FeedbackDisplay } from '../components/practice/FeedbackDisplay';
import { PracticeModePicker, PracticeMode } from '../components/practice/PracticeModePicker';
import { practiceExerciseService, PracticeExercise } from '../services/practiceExerciseService';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { error as logError, warn } from '../utils/logger';

// Practice exercise types available in the system (kept for documentation)
const EXERCISE_TYPES = {
  VISUAL_MATCH: 'visual_match',
  FILL_BLANK: 'fill_blank',
  MULTIPLE_CHOICE: 'multiple_choice'
} as const;
void EXERCISE_TYPES;

export const EnhancedPracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [exercises, setExercises] = useState<PracticeExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode picker state
  const [showModePicker, setShowModePicker] = useState(true);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('quick');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | undefined>(
    searchParams.get('speciesId') || undefined
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>();
  const [selectedType, setSelectedType] = useState<string | undefined>();

  // Store timeout ref for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track response time for SRS quality calculation
  const exerciseStartTimeRef = useRef<number>(Date.now());

  // Spaced Repetition System integration
  const {
    // dueTerms and dueCount available for future 'review' mode integration
    recordReview,
    calculateQuality,
    isRecording,
    stats: srsStats
  } = useSpacedRepetition();

  // Load exercises from the service
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        setError(null);
        const generatedExercises = await practiceExerciseService.generateMixedExercises(30);

        if (generatedExercises.length === 0) {
          setError('No exercises available. Please ensure species data with images is loaded.');
          return;
        }

        setExercises(generatedExercises);
      } catch (err) {
        logError('Failed to load exercises', err instanceof Error ? err : { error: err });
        setError('Failed to load practice exercises. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  const getCurrentExerciseData = useCallback(() => {
    if (exercises.length === 0) {
      return null;
    }
    return exercises[currentExerciseIndex % exercises.length];
  }, [exercises, currentExerciseIndex]);

  const nextExercise = useCallback(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentExerciseIndex(prev => prev + 1);
    // Reset timer for next exercise
    exerciseStartTimeRef.current = Date.now();
  }, []);

  const handleAnswer = useCallback(async (answer: string) => {
    setSelectedAnswer(answer);
    const exercise = getCurrentExerciseData();

    if (!exercise) return;

    const correct = answer.toLowerCase() === exercise.correctAnswer.toLowerCase();
    const responseTimeMs = Date.now() - exerciseStartTimeRef.current;

    setIsCorrect(correct);
    setShowFeedback(true);
    setTotalAttempts(prev => prev + 1);

    if (correct) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Record review in SRS system (if exercise has termId for tracking)
    if (exercise.termId || exercise.speciesId) {
      try {
        const quality = calculateQuality(correct, responseTimeMs);
        await recordReview({
          termId: exercise.termId || `species-${exercise.speciesId}`,
          quality,
          responseTimeMs,
        });
      } catch (err) {
        // SRS recording is non-critical, log but continue
        warn('Failed to record SRS review', { error: err });
      }
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-advance after 2 seconds
    timeoutRef.current = setTimeout(() => {
      nextExercise();
    }, 2000);
  }, [getCurrentExerciseData, nextExercise, calculateQuality, recordReview]);

  const renderExercise = useCallback(() => {
    const exercise = getCurrentExerciseData();

    if (!exercise) {
      return (
        <div className="text-center py-8 text-gray-500">
          No exercises available
        </div>
      );
    }

    return (
      <ExerciseRenderer
        type={exercise.type}
        question={exercise.question}
        imageUrl={exercise.imageUrl}
        translation={exercise.translation}
        options={exercise.options}
        selectedAnswer={selectedAnswer}
        correctAnswer={exercise.correctAnswer}
        showFeedback={showFeedback}
        explanation={exercise.explanation}
        onAnswer={handleAnswer}
      />
    );
  }, [getCurrentExerciseData, selectedAnswer, showFeedback, handleAnswer]);

  const accuracy = useMemo(() =>
    totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0,
    [score, totalAttempts]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleStartPractice = useCallback(() => {
    setShowModePicker(false);
    setLoading(true);
    // Re-trigger exercise loading with new filters
    setExercises([]);
    setCurrentExerciseIndex(0);
    setScore(0);
    setTotalAttempts(0);
    setStreak(0);
    // Reset exercise timer
    exerciseStartTimeRef.current = Date.now();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with stats */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Practice Exercises</h1>
            <div className="flex gap-3">
              {!showModePicker && (
                <button
                  onClick={() => setShowModePicker(true)}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Change Mode
                </button>
              )}
              <Link
                to="/learn"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Learn
              </Link>
            </div>
          </div>

          {!showModePicker && (
            <PracticeStats
              score={score}
              accuracy={accuracy}
              streak={streak}
              totalAttempts={totalAttempts}
              srsStats={srsStats}
              isRecording={isRecording}
            />
          )}
        </div>

        {/* Mode Picker */}
        {showModePicker && (
          <div className="mb-8">
            <PracticeModePicker
              selectedMode={practiceMode}
              onModeSelect={setPracticeMode}
              selectedSpeciesId={selectedSpeciesId}
              onSpeciesSelect={setSelectedSpeciesId}
              selectedDifficulty={selectedDifficulty}
              onDifficultySelect={setSelectedDifficulty}
              selectedType={selectedType}
              onTypeSelect={setSelectedType}
            />
            <div className="mt-6 text-center">
              <button
                onClick={handleStartPractice}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Start Practice
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading practice exercises...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching bird species with images</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Exercises</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Exercise area */}
        {!loading && !error && exercises.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Exercise type indicator */}
              <div className="mb-6 text-center">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {getCurrentExerciseData()?.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
              </div>

              {renderExercise()}

              {/* Feedback */}
              {showFeedback && getCurrentExerciseData() && (
                <FeedbackDisplay
                  isCorrect={isCorrect}
                  correctAnswer={getCurrentExerciseData()!.correctAnswer}
                />
              )}

              {/* Skip button */}
              {!showFeedback && (
                <div className="mt-6 text-center">
                  <button
                    onClick={nextExercise}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Skip this exercise →
                  </button>
                </div>
              )}
            </div>

            {/* Motivational messages */}
            {streak >= 5 && (
              <div className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg text-center">
                <p className="text-lg font-bold">🔥 You're on fire! {streak} in a row!</p>
              </div>
            )}

            {totalAttempts > 0 && totalAttempts % 10 === 0 && (
              <div className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg text-center">
                <p className="text-lg font-bold">🎉 Milestone: {totalAttempts} exercises completed!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};