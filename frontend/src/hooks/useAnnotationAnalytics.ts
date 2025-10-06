// CONCEPT: React Query hook for annotation review analytics
// WHY: Fetch and cache analytics data for dashboard visualization
// PATTERN: useQuery with typed response and error handling

import { useQuery } from '@tanstack/react-query';
import { api as axios } from '../config/axios';
import { error as logError } from '../utils/logger';

/**
 * Analytics data structure returned from backend
 */
export interface AnnotationAnalytics {
  overview: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    avgConfidence: string; // e.g., "0.87"
  };
  bySpecies: Record<string, number>; // { "Mallard Duck": 12, ... }
  byType: Record<string, number>; // { "anatomical": 45, ... }
  rejectionsByCategory: Record<string, number>; // { "TOO_SMALL": 5, ... }
  qualityFlags: {
    tooSmall: number;
    lowConfidence: number;
  };
}

/**
 * Query key for annotation analytics
 */
export const annotationAnalyticsKeys = {
  all: ['annotation-analytics'] as const,
  analytics: () => [...annotationAnalyticsKeys.all, 'data'] as const,
};

/**
 * Hook: Fetch annotation analytics for dashboard
 *
 * @returns Query object with analytics data
 *
 * @example
 * const { data: analytics, isLoading } = useAnnotationAnalytics();
 *
 * if (analytics) {
 *   console.log(`Total: ${analytics.overview.total}`);
 *   console.log(`Pending: ${analytics.overview.pending}`);
 * }
 */
export const useAnnotationAnalytics = () => {
  return useQuery({
    queryKey: annotationAnalyticsKeys.analytics(),
    queryFn: async (): Promise<AnnotationAnalytics> => {
      try {
        const response = await axios.get<AnnotationAnalytics>('/api/annotations/analytics');
        return response.data;
      } catch (err) {
        logError('Error fetching annotation analytics:', err instanceof Error ? err : new Error(String(err)));

        // Return empty analytics on error
        return {
          overview: {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            avgConfidence: '0.00',
          },
          bySpecies: {},
          byType: {},
          rejectionsByCategory: {},
          qualityFlags: {
            tooSmall: 0,
            lowConfidence: 0,
          },
        };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - analytics don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    retry: 2, // Retry twice on failure
  });
};

/**
 * Helper: Calculate dataset completion percentage
 *
 * @param total - Total annotations in dataset
 * @param target - Target annotation count (default: 400 for MVP)
 * @returns Percentage complete (0-100)
 */
export const calculateDatasetProgress = (total: number, target: number = 400): number => {
  return Math.min(100, Math.round((total / target) * 100));
};

/**
 * Helper: Get status color for badges
 *
 * @param status - Annotation status
 * @returns Tailwind color class
 */
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
