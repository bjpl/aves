/**
 * useSpacedRepetition Hook
 *
 * Client-side interface to the Spaced Repetition System.
 * Handles term reviews, progress tracking, and due term management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from './useSupabaseAuth';
import { error as logError } from '../utils/logger';

export interface TermProgress {
  id: string;
  termId: string;
  spanishTerm: string;
  englishTerm: string;
  imageUrl?: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  masteryLevel: number;
  timesCorrect: number;
  timesIncorrect: number;
}

export interface UserStats {
  totalTerms: number;
  mastered: number;
  learning: number;
  dueForReview: number;
  averageMastery: number;
  streak: number;
}

export interface ReviewResult {
  termId: string;
  quality: number; // 0-5
  responseTimeMs?: number;
}

const API_URL = import.meta.env.VITE_API_URL || '';

// Query keys for SRS
export const srsQueryKeys = {
  all: ['srs'] as const,
  dueTerms: (userId: string) => [...srsQueryKeys.all, 'due', userId] as const,
  userStats: (userId: string) => [...srsQueryKeys.all, 'stats', userId] as const,
  termProgress: (userId: string, termId: string) => [...srsQueryKeys.all, 'term', userId, termId] as const,
};

/**
 * Hook: Get terms due for review
 */
export const useDueTerms = (limit: number = 20) => {
  const { user } = useSupabaseAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: srsQueryKeys.dueTerms(userId || ''),
    queryFn: async (): Promise<TermProgress[]> => {
      if (!userId) return [];

      try {
        const response = await fetch(`${API_URL}/api/srs/due?limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${await user?.getIdToken?.() || ''}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch due terms');
        const data = await response.json();
        return data.data || [];
      } catch (err) {
        logError('Error fetching due terms', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - SRS data should be fresh
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

/**
 * Hook: Get user's SRS statistics
 */
export const useUserSRSStats = () => {
  const { user } = useSupabaseAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: srsQueryKeys.userStats(userId || ''),
    queryFn: async (): Promise<UserStats> => {
      if (!userId) {
        return {
          totalTerms: 0,
          mastered: 0,
          learning: 0,
          dueForReview: 0,
          averageMastery: 0,
          streak: 0,
        };
      }

      try {
        const response = await fetch(`${API_URL}/api/srs/stats`, {
          headers: {
            'Authorization': `Bearer ${await user?.getIdToken?.() || ''}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        return data.data;
      } catch (err) {
        logError('Error fetching SRS stats', err instanceof Error ? err : new Error(String(err)));
        return {
          totalTerms: 0,
          mastered: 0,
          learning: 0,
          dueForReview: 0,
          averageMastery: 0,
          streak: 0,
        };
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook: Record a review result
 */
export const useRecordReview = () => {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (result: ReviewResult): Promise<TermProgress | null> => {
      if (!user?.id) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/api/srs/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken?.() || ''}`,
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) throw new Error('Failed to record review');
      const data = await response.json();
      return data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate due terms and stats after recording a review
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: srsQueryKeys.dueTerms(user.id) });
        queryClient.invalidateQueries({ queryKey: srsQueryKeys.userStats(user.id) });
        queryClient.invalidateQueries({ queryKey: srsQueryKeys.termProgress(user.id, variables.termId) });
      }
    },
    onError: (error) => {
      logError('Error recording review', error instanceof Error ? error : new Error(String(error)));
    },
  });
};

/**
 * Hook: Mark term as discovered (first exposure)
 */
export const useMarkTermDiscovered = () => {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (termId: string): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/api/srs/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken?.() || ''}`,
        },
        body: JSON.stringify({ termId }),
      });

      if (!response.ok) throw new Error('Failed to mark term discovered');
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: srsQueryKeys.userStats(user.id) });
      }
    },
  });
};

/**
 * Hook: Calculate quality score from answer
 * Quality: 0-5 based on correctness and response time
 */
export const useCalculateQuality = () => {
  return (correct: boolean, responseTimeMs?: number): number => {
    if (!correct) {
      // Incorrect answers: 0-2 based on how close they were
      return responseTimeMs && responseTimeMs < 2000 ? 1 : 0;
    }

    // Correct answers: 3-5 based on response time
    if (!responseTimeMs) return 4; // Default good recall

    if (responseTimeMs < 1500) return 5; // Perfect - fast recall
    if (responseTimeMs < 3000) return 4; // Good - normal recall
    return 3; // Correct but hesitant
  };
};

/**
 * Hook: Combined SRS functionality for practice page
 */
export const useSpacedRepetition = () => {
  const { data: dueTerms = [], isLoading: loadingDue, refetch: refetchDue } = useDueTerms();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useUserSRSStats();
  const recordReview = useRecordReview();
  const markDiscovered = useMarkTermDiscovered();
  const calculateQuality = useCalculateQuality();

  return {
    // Data
    dueTerms,
    stats,
    dueCount: dueTerms.length,

    // Loading states
    isLoading: loadingDue || loadingStats,

    // Actions
    recordReview: recordReview.mutateAsync,
    markDiscovered: markDiscovered.mutateAsync,
    calculateQuality,

    // Refresh
    refresh: () => {
      refetchDue();
      refetchStats();
    },

    // Status
    isRecording: recordReview.isPending,
    recordError: recordReview.error,
  };
};

export default useSpacedRepetition;
