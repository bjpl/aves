import React from 'react';
import { DisclosureLevel } from '../../../../shared/types/vocabulary.types';

interface ProgressIndicatorProps {
  currentLevel: DisclosureLevel;
  maxLevel?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentLevel,
  maxLevel = 4
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => (
          <div
            key={level}
            className={`w-2 h-2 rounded-full transition-colors ${
              level <= currentLevel
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
            title={`Level ${level}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">
        Level {currentLevel}/{maxLevel}
      </span>
    </div>
  );
};