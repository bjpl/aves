import React, { useMemo } from 'react';
import { Tooltip } from '../ui/Tooltip';

export interface MasteryIndicatorProps {
  masteryLevel: number; // 0-100
  timesCorrect?: number;
  timesIncorrect?: number;
  nextReviewAt?: string | Date;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const MasteryIndicator: React.FC<MasteryIndicatorProps> = ({
  masteryLevel,
  timesCorrect = 0,
  timesIncorrect = 0,
  nextReviewAt,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  // Clamp mastery level between 0 and 100
  const clampedLevel = Math.min(100, Math.max(0, masteryLevel));

  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          dimension: 24,
          strokeWidth: 3,
          radius: 9,
          fontSize: '8px',
          showPercentage: false,
        };
      case 'md':
        return {
          dimension: 40,
          strokeWidth: 4,
          radius: 16,
          fontSize: '11px',
          showPercentage: true,
        };
      case 'lg':
        return {
          dimension: 64,
          strokeWidth: 6,
          radius: 26,
          fontSize: '16px',
          showPercentage: true,
        };
      default:
        return {
          dimension: 40,
          strokeWidth: 4,
          radius: 16,
          fontSize: '11px',
          showPercentage: true,
        };
    }
  }, [size]);

  // Color coding based on mastery level
  const getColor = (level: number): { stroke: string; text: string; bg: string } => {
    if (level <= 25) {
      return {
        stroke: '#EF4444', // red-500
        text: 'text-red-600',
        bg: 'bg-red-50',
      };
    } else if (level <= 50) {
      return {
        stroke: '#F97316', // orange-500
        text: 'text-orange-600',
        bg: 'bg-orange-50',
      };
    } else if (level <= 75) {
      return {
        stroke: '#EAB308', // yellow-500
        text: 'text-yellow-600',
        bg: 'bg-yellow-50',
      };
    } else {
      return {
        stroke: '#22C55E', // green-500
        text: 'text-green-600',
        bg: 'bg-green-50',
      };
    }
  };

  const color = getColor(clampedLevel);

  // Calculate SVG circle properties
  const { dimension, strokeWidth, radius, fontSize, showPercentage } = sizeConfig;
  const center = dimension / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedLevel / 100) * circumference;

  // Format next review date
  const formatNextReview = (date: string | Date | undefined): string => {
    if (!date) return 'Not scheduled';

    const reviewDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = reviewDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Ready now';
    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;

    return reviewDate.toLocaleDateString();
  };

  // Build tooltip content
  const tooltipContent = (
    <div className="space-y-1.5">
      <div className="font-semibold border-b border-gray-700 pb-1 mb-1.5">
        Mastery: {Math.round(clampedLevel)}%
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Correct:</span>
          <span className="font-medium text-green-400">{timesCorrect}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Incorrect:</span>
          <span className="font-medium text-red-400">{timesIncorrect}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Accuracy:</span>
          <span className="font-medium text-blue-400">
            {timesCorrect + timesIncorrect > 0
              ? Math.round((timesCorrect / (timesCorrect + timesIncorrect)) * 100)
              : 0}
            %
          </span>
        </div>
        {nextReviewAt && (
          <div className="flex justify-between gap-3 pt-1 border-t border-gray-700">
            <span className="text-gray-300">Next review:</span>
            <span className="font-medium text-purple-400">{formatNextReview(nextReviewAt)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const indicator = (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={dimension}
          height={dimension}
          className="transform -rotate-90 transition-all duration-500 ease-out"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />

          {/* Progress circle with animation */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{
              transitionProperty: 'stroke-dashoffset, stroke',
            }}
          />
        </svg>

        {/* Percentage text in center for md/lg sizes */}
        {showPercentage && (
          <div
            className={`absolute inset-0 flex items-center justify-center font-bold ${color.text}`}
            style={{ fontSize }}
          >
            {Math.round(clampedLevel)}
          </div>
        )}
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium">
          Mastery
        </span>
      )}
    </div>
  );

  // Wrap with tooltip if stats are available
  if (timesCorrect > 0 || timesIncorrect > 0 || nextReviewAt) {
    return (
      <Tooltip content={tooltipContent} position="top" delay={150}>
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
};
