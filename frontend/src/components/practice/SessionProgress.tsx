// CONCEPT: Session progress tracker component
// WHY: Provides visual feedback on practice session progress and performance
// PATTERN: Real-time progress display with streak tracking and time estimation

import React, { useMemo } from 'react';

interface SessionProgressProps {
  currentExercise: number;
  totalExercises: number;
  currentScore: number;
  streak: number; // consecutive correct answers
  averageTime?: number; // average time per exercise in seconds
  elapsedTime?: number; // total elapsed time in seconds
}

export const SessionProgress: React.FC<SessionProgressProps> = ({
  currentExercise,
  totalExercises,
  currentScore,
  streak,
  averageTime,
  elapsedTime,
}) => {
  // Calculate progress percentage
  const progressPercentage = (currentExercise / totalExercises) * 100;

  // Calculate accuracy
  const accuracy = currentExercise > 0
    ? Math.round((currentScore / currentExercise) * 100)
    : 0;

  // Estimate remaining time
  const estimatedTimeRemaining = useMemo(() => {
    if (!averageTime || currentExercise === 0) return null;

    const remaining = totalExercises - currentExercise;
    const estimatedSeconds = remaining * averageTime;

    if (estimatedSeconds < 60) {
      return `${Math.ceil(estimatedSeconds)}s`;
    }

    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = Math.ceil(estimatedSeconds % 60);
    return `${minutes}m ${seconds}s`;
  }, [averageTime, currentExercise, totalExercises]);

  // Format elapsed time
  const formattedElapsedTime = useMemo(() => {
    if (elapsedTime === undefined) return null;

    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  // Determine streak color
  const getStreakColor = (streakCount: number) => {
    if (streakCount >= 5) return 'text-purple-600 bg-purple-100';
    if (streakCount >= 3) return 'text-blue-600 bg-blue-100';
    if (streakCount >= 1) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
      {/* Header with exercise count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">
              {currentExercise}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-lg text-gray-600">{totalExercises}</span>
          </div>
          <span className="text-sm text-gray-500">exercises</span>
        </div>

        {/* Timer */}
        {formattedElapsedTime && (
          <div className="flex items-center gap-2 text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">{formattedElapsedTime}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          {estimatedTimeRemaining && (
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              ~{estimatedTimeRemaining} left
            </span>
          )}
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Milestone markers */}
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className="absolute top-0 bottom-0 w-px bg-white opacity-50"
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Score */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-medium text-green-700">Score</span>
          </div>
          <p className="text-xl font-bold text-green-700">{currentScore}</p>
        </div>

        {/* Accuracy */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium text-blue-700">Accuracy</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{accuracy}%</p>
        </div>

        {/* Streak */}
        <div className={`bg-gradient-to-br rounded-lg p-3 border ${
          streak >= 5 ? 'from-purple-50 to-pink-50 border-purple-200' :
          streak >= 3 ? 'from-blue-50 to-cyan-50 border-blue-200' :
          'from-gray-50 to-slate-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <svg
              className={`w-4 h-4 ${getStreakColor(streak).split(' ')[0]} ${
                streak >= 3 ? 'animate-bounce' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                clipRule="evenodd"
              />
            </svg>
            <span className={`text-xs font-medium ${getStreakColor(streak).split(' ')[0]}`}>
              Streak
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className={`text-xl font-bold ${getStreakColor(streak).split(' ')[0]}`}>
              {streak}
            </p>
            {streak >= 3 && (
              <span className="text-xs animate-pulse">
                🔥
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Streak message */}
      {streak >= 5 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border border-purple-300 animate-fadeInUp">
          <p className="text-sm font-semibold text-purple-700 text-center">
            ¡Increíble! {streak} en racha 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionProgress;
