import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AnnotationExercise {
  id: string;
  type: 'anatomical_identification' | 'interactive_annotation' | 'vocabulary_matching' | 'feature_recognition';
  annotationId: string;
  imageUrl: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: {
    englishTerm?: string;
    spanishTerm?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

interface ExerciseResponse {
  exercises: AnnotationExercise[];
  total: number;
  source: 'pipeline' | 'cache' | 'generated' | 'empty';
}

interface PipelineStats {
  activeJobs: number;
  jobsByStatus: Array<{ status: string; count: number }>;
  cacheSize: number;
  timestamp: string;
}

/**
 * Hook to fetch Learn tab exercises from the annotation pipeline
 */
export function useLearnExercises(limit: number = 10) {
  const user = useAuthStore((state) => state.user);

  return useQuery<ExerciseResponse>({
    queryKey: ['annotation-exercises', 'learn', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) {
        return { exercises: [], total: 0, source: 'empty' as const };
      }

      const response = await axios.get(`${API_URL}/api/annotation-exercises/learn`, {
        params: {
          userId: user.id,
          limit
        }
      });

      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

/**
 * Hook to fetch Practice tab exercises from the annotation pipeline
 */
export function usePracticeExercises(limit: number = 10) {
  const user = useAuthStore((state) => state.user);

  return useQuery<ExerciseResponse>({
    queryKey: ['annotation-exercises', 'practice', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) {
        return { exercises: [], total: 0, source: 'empty' as const };
      }

      const response = await axios.get(`${API_URL}/api/annotation-exercises/practice`, {
        params: {
          userId: user.id,
          limit
        }
      });

      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/**
 * Hook to prefetch exercises for a user based on their weak areas
 */
export function usePrefetchExercises() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (count: number = 20) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(`${API_URL}/api/annotation-exercises/prefetch`, {
        userId: user.id,
        count
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate exercise queries to refetch with new cached data
      queryClient.invalidateQueries({ queryKey: ['annotation-exercises'] });
    }
  });
}

/**
 * Hook to trigger batch exercise generation for multiple annotations (admin only)
 */
export function useBatchGeneration() {
  return useMutation({
    mutationFn: async (annotationIds: string[]) => {
      const response = await axios.post(`${API_URL}/api/annotation-exercises/batch-generate`, {
        annotationIds
      });

      return response.data;
    }
  });
}

/**
 * Hook to fetch pipeline statistics (admin only)
 */
export function usePipelineStats() {
  return useQuery<PipelineStats>({
    queryKey: ['annotation-exercises', 'pipeline-stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/annotation-exercises/pipeline-stats`);
      return response.data;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

/**
 * Hook to provide a unified interface for fetching exercises
 */
export function useAnnotationExercises(type: 'learn' | 'practice', limit: number = 10) {
  const learnQuery = useLearnExercises(type === 'learn' ? limit : 0);
  const practiceQuery = usePracticeExercises(type === 'practice' ? limit : 0);
  const prefetchMutation = usePrefetchExercises();

  const activeQuery = type === 'learn' ? learnQuery : practiceQuery;

  // Prefetch exercises when data is empty or low
  const prefetchIfNeeded = useCallback(() => {
    if (activeQuery.data && activeQuery.data.total < 5 && !prefetchMutation.isPending) {
      prefetchMutation.mutate(20);
    }
  }, [activeQuery.data, prefetchMutation]);

  return {
    exercises: activeQuery.data?.exercises || [],
    total: activeQuery.data?.total || 0,
    source: activeQuery.data?.source || 'empty',
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    refetch: activeQuery.refetch,
    prefetch: prefetchMutation.mutate,
    isPrefetching: prefetchMutation.isPending,
    prefetchIfNeeded
  };
}