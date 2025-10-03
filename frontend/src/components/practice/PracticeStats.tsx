import React from 'react';

interface PracticeStatsProps {
  score: number;
  accuracy: number;
  streak: number;
  totalAttempts: number;
}

export const PracticeStats: React.FC<PracticeStatsProps> = ({
  score,
  accuracy,
  streak,
  totalAttempts
}) => {
  return (
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
  );
};
