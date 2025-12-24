import React from 'react';
import type { UserStats } from '../../hooks/useSpacedRepetition';

interface PracticeStatsProps {
  score: number;
  accuracy: number;
  streak: number;
  totalAttempts: number;
  srsStats?: UserStats;
  isRecording?: boolean;
}

export const PracticeStats: React.FC<PracticeStatsProps> = ({
  score,
  accuracy,
  streak,
  totalAttempts,
  srsStats,
  isRecording
}) => {
  return (
    <div className="space-y-4">
      {/* Session Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{score}</p>
          <p className="text-sm text-gray-600">Correct</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
          <p className="text-sm text-gray-600">Accuracy</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{streak}</p>
          <p className="text-sm text-gray-600">Streak</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-purple-600">{totalAttempts}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
      </div>

      {/* SRS Progress Stats */}
      {srsStats && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-indigo-700">{srsStats.mastered}</p>
                <p className="text-xs text-gray-600">Mastered</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-600">{srsStats.learning}</p>
                <p className="text-xs text-gray-600">Learning</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-rose-600">{srsStats.dueForReview}</p>
                <p className="text-xs text-gray-600">Due</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Syncing progress..." />
                )}
                <p className="text-sm font-medium text-gray-700">
                  {Math.round(srsStats.averageMastery * 100)}% Mastery
                </p>
              </div>
              <p className="text-xs text-gray-500">{srsStats.totalTerms} terms tracked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
