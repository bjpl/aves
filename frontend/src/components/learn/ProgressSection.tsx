import React from 'react';

interface ProgressSectionProps {
  progress: number;
  discoveredCount: number;
  totalCount: number;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  progress,
  discoveredCount,
  totalCount
}) => {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Learning Progress</span>
        <span>{Math.round(progress)}% ({discoveredCount} / {totalCount} terms)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
