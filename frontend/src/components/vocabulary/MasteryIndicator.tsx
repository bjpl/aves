import React from 'react';

interface MasteryIndicatorProps {
  masteryScore: number; // 0-1
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const MasteryIndicator: React.FC<MasteryIndicatorProps> = ({
  masteryScore,
  showLabel = true,
  size = 'medium'
}) => {
  const percentage = Math.round(masteryScore * 100);

  const getColor = () => {
    if (masteryScore < 0.3) return 'text-red-500 bg-red-100';
    if (masteryScore < 0.6) return 'text-yellow-500 bg-yellow-100';
    if (masteryScore < 0.9) return 'text-blue-500 bg-blue-100';
    return 'text-green-500 bg-green-100';
  };

  const getProgressColor = () => {
    if (masteryScore < 0.3) return 'bg-red-500';
    if (masteryScore < 0.6) return 'bg-yellow-500';
    if (masteryScore < 0.9) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Mastery Level</span>
          <span className={`text-sm font-medium ${getColor().split(' ')[0]}`}>
            {percentage}%
          </span>
        </div>
      )}
      <div className="relative">
        <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
          <div
            className={`${getProgressColor()} ${sizeClasses[size]} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {masteryScore >= 0.9 && (
          <div className="absolute -top-1 -right-1">
            <span className="text-lg">🌟</span>
          </div>
        )}
      </div>
    </div>
  );
};