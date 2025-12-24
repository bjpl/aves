/**
 * ReviewDueBadge Component
 *
 * Badge displaying the count of terms due for review via SRS.
 * Designed to be added to the navbar. Links to /practice?mode=review.
 * Uses the useUserSRSStats hook to fetch the due count.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useUserSRSStats } from '../../hooks/useSpacedRepetition';
import { Badge } from '../ui/Badge';

export interface ReviewDueBadgeProps {
  /**
   * Show as a pill/button instead of just a badge
   */
  showAsButton?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Minimum count to show the badge (default: 1)
   */
  minimumCount?: number;
}

export const ReviewDueBadge: React.FC<ReviewDueBadgeProps> = ({
  showAsButton = false,
  className = '',
  minimumCount = 1,
}) => {
  const { data: stats, isLoading } = useUserSRSStats();
  const dueCount = stats?.dueForReview || 0;

  // Don't show if loading or count is below minimum
  if (isLoading || dueCount < minimumCount) {
    return null;
  }

  // Badge variant based on urgency
  const getBadgeVariant = (count: number): 'warning' | 'danger' => {
    if (count >= 10) return 'danger';
    return 'warning';
  };

  const variant = getBadgeVariant(dueCount);

  // Button style (for navbar)
  if (showAsButton) {
    return (
      <Link
        to="/practice?mode=review"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:shadow-md ${
          variant === 'danger'
            ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
            : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200'
        } ${className}`}
        aria-label={`${dueCount} term${dueCount === 1 ? '' : 's'} due for review`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">Review</span>
        <Badge
          variant={variant}
          size="sm"
          rounded
          className="ml-1"
        >
          {dueCount}
        </Badge>
      </Link>
    );
  }

  // Simple badge style
  return (
    <Link
      to="/practice?mode=review"
      className={`inline-block ${className}`}
      aria-label={`${dueCount} term${dueCount === 1 ? '' : 's'} due for review`}
    >
      <Badge
        variant={variant}
        size="md"
        rounded
        dot
        className="hover:opacity-80 transition-opacity cursor-pointer"
      >
        {dueCount} due for review
      </Badge>
    </Link>
  );
};

export default ReviewDueBadge;
