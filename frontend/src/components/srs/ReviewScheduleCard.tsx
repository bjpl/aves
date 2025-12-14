/**
 * ReviewScheduleCard Component
 *
 * Displays upcoming review schedule and next review information.
 * Shows due count, upcoming reviews in 24h and 7d, and next review time.
 */

import React from 'react';
import { Badge } from '../ui/Badge';
import type { TermProgress } from '../../hooks/useSpacedRepetition';

interface ReviewScheduleCardProps {
  dueCount: number;
  upcomingReviews: {
    next24h: TermProgress[];
    next7d: TermProgress[];
  };
  nextReviewDate: Date | null;
  isLoading?: boolean;
}

export const ReviewScheduleCard: React.FC<ReviewScheduleCardProps> = ({
  dueCount,
  upcomingReviews,
  nextReviewDate,
  isLoading = false
}) => {
  const formatNextReview = (date: Date | null): string => {
    if (!date) return 'No reviews scheduled';

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
      return 'tomorrow';
    } else if (diffDays < 7) {
      return `in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Review Schedule
        </h3>
        {dueCount > 0 && (
          <Badge variant="warning" size="md">
            {dueCount} due now
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Due now */}
        {dueCount > 0 ? (
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm font-medium text-orange-800">
                Ready to review
              </span>
            </div>
            <span className="text-lg font-bold text-orange-600">
              {dueCount}
            </span>
          </div>
        ) : (
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              All caught up!
            </span>
          </div>
        )}

        {/* Next 24 hours */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-gray-700">Next 24 hours</span>
          <span className="text-sm font-semibold text-blue-600">
            {upcomingReviews.next24h.length} term{upcomingReviews.next24h.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Next 7 days */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <span className="text-sm text-gray-700">Next 7 days</span>
          <span className="text-sm font-semibold text-purple-600">
            {upcomingReviews.next7d.length} term{upcomingReviews.next7d.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Next review time */}
        {nextReviewDate && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>Next review: <strong className="text-gray-900">{formatNextReview(nextReviewDate)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="mt-4 text-xs text-gray-500 italic">
        Reviews are scheduled based on your performance using spaced repetition algorithm
      </p>
    </div>
  );
};
