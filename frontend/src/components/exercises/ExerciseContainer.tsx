import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseType, SessionProgress } from '../../../../shared/types/exercise.types';
import { Annotation } from '../../../../shared/types/annotation.types';
import { VisualDiscrimination } from './VisualDiscrimination';
import { ContextualFill } from './ContextualFill';
import { ExerciseGenerator } from '../../services/exerciseGenerator';

interface ExerciseContainerProps {
  annotations: Annotation[];
  onComplete?: (progress: SessionProgress) => void;
}

export const ExerciseContainer: React.FC<ExerciseContainerProps> = ({
  annotations,
  onComplete
}) => {
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [generator] = useState(() => new ExerciseGenerator(annotations));
  const [progress, setProgress] = useState<SessionProgress>({
    sessionId: `session_${Date.now()}`,
    exercisesCompleted: 0,
    correctAnswers: 0,
    currentStreak: 0,
    startedAt: new Date()
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; feedback: string } | null>(null);

  useEffect(() => {
    generateNewExercise();
  }, []);

  const generateNewExercise = () => {
    const types: ExerciseType[] = ['visual_discrimination', 'contextual_fill'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const exercise = generator.generateExercise(randomType);

    if (exercise) {
      setCurrentExercise(exercise);
      setShowFeedback(false);
      setLastResult(null);
    }
  };

  const handleAnswer = (answer: any) => {
    if (!currentExercise) return;

    const isCorrect = ExerciseGenerator.checkAnswer(currentExercise, answer);
    const feedback = ExerciseGenerator.generateFeedback(isCorrect, currentExercise);

    const newProgress = {
      ...progress,
      exercisesCompleted: progress.exercisesCompleted + 1,
      correctAnswers: progress.correctAnswers + (isCorrect ? 1 : 0),
      currentStreak: isCorrect ? progress.currentStreak + 1 : 0
    };

    setProgress(newProgress);
    setLastResult({ correct: isCorrect, feedback });
    setShowFeedback(true);

    // Auto-advance after delay
    setTimeout(() => {
      generateNewExercise();
    }, 2500);
  };

  const renderExercise = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case 'visual_discrimination':
        return (
          <VisualDiscrimination
            exercise={currentExercise}
            onAnswer={handleAnswer}
            disabled={showFeedback}
          />
        );
      case 'contextual_fill':
        return (
          <ContextualFill
            exercise={currentExercise}
            onAnswer={handleAnswer}
            disabled={showFeedback}
          />
        );
      default:
        return null;
    }
  };

  const accuracyPercentage = progress.exercisesCompleted > 0
    ? Math.round((progress.correctAnswers / progress.exercisesCompleted) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Practice Session</h2>
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