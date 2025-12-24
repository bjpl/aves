// CONCEPT: React Query hooks for AI exercise generation
// WHY: Provides type-safe, cacheable AI exercise operations with React Query
// PATTERN: useQuery for stats, useMutation for generation/prefetch

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiExerciseService,
  type GenerateExerciseParams,
  type AIExerciseResponse,
  type AIExerciseStats,
  type PrefetchResponse
} from '../services/aiExerciseService';
import { error as logError, info } from '../utils/logger';

// Extend queryKeys with AI exercise keys
const aiExerciseKeys = {
  all: ['ai-exercises'] as const,
  generation: (userId: string) => [...aiExerciseKeys.all, 'generate', userId] as const,
  stats: () => [...aiExerciseKeys.all, 'stats'] as const,
  prefetch: (userId: string) => [...aiExerciseKeys.all, 'prefetch', userId] as const,
};

/**
 * Hook: Generate AI exercise with context-aware prompts
 * Uses mutation pattern for generation (non-idempotent)
 */
export const useGenerateAIExercise = () => {
  const queryClient = useQueryClient();

  return useMutation<AIExerciseResponse, Error, GenerateExerciseParams>({
    mutationFn: async (params: GenerateExerciseParams) => {
      info('Generating AI exercise', { params });
      return aiExerciseService.generateExercise(params);
    },
    onSuccess: (data, variables) => {
      info('AI exercise generated successfully', {
        type: data.exercise.type,
        generated: data.metadata.generated,
        cost: data.metadata.cost,
        difficulty: data.metadata.difficulty,
      });

      // Track analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('ai_exercise_generated', {
          userId: variables.userId,
          exerciseType: data.exercise.type,
          wasGenerated: data.metadata.generated,
          wasCached: !data.metadata.generated,
          difficulty: data.metadata.difficulty,
          cost: data.metadata.cost,
          generationTime: data.metadata.generationTime,
        });
      }

      // Invalidate stats to reflect new generation
      queryClient.invalidateQueries({ queryKey: aiExerciseKeys.stats() });
    },
    onError: (error) => {
      logError('AI exercise generation failed', error);
    },
  });
};

/**
 * Hook: Fetch AI exercise generation statistics
 * Uses query pattern for read-only operations
 */
export const useAIExerciseStats = () => {
  return useQuery<AIExerciseStats, Error>({
    queryKey: aiExerciseKeys.stats(),
    queryFn: async () => {
      return aiExerciseService.getStats();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change rapidly
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: aiExerciseService.isAvailable(), // Only fetch if backend available
  });
};

/**
 * Hook: Prefetch multiple exercises for better UX
 * Preloads exercises before practice session starts
 */
export const usePrefetchExercises = () => {
  const queryClient = useQueryClient();

  return useMutation<PrefetchResponse, Error, { userId: string; count: number }>({
    mutationFn: async ({ userId, count }) => {
      info('Prefetching AI exercises', { userId, count });
      return aiExerciseService.prefetchExercises(userId, count);
    },
    onSuccess: (data, variables) => {
      info('Exercises prefetched successfully', {
        prefetched: data.prefetched,
        cached: data.cached,
        totalCost: data.totalCost,
      });

      // Track analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('exercises_prefetched', {
          userId: variables.userId,
          count: variables.count,
          prefetched: data.prefetched,
          cached: data.cached,
          totalCost: data.totalCost,
        });
      }

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: aiExerciseKeys.stats() });
    },
    onError: (error) => {
      logError('Exercise prefetch failed', error);
    },
  });
};

/**
 * Hook: Clear cached exercises (admin/testing)
 */
export const useClearExerciseCache = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (userId: string) => {
      info('Clearing exercise cache', { userId });
      return aiExerciseService.clearCache(userId);
    },
    onSuccess: (_data, userId) => {
      info('Exercise cache cleared', { userId });

      // Invalidate all AI exercise queries
      queryClient.invalidateQueries({ queryKey: aiExerciseKeys.all });

      // Track analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('exercise_cache_cleared', { userId });
      }
    },
    onError: (error) => {
      logError('Failed to clear exercise cache', error);
    },
  });
};

/**
 * Hook: Check if AI exercises are available
 * Useful for conditional rendering
 */
export const useAIExerciseAvailability = () => {
  return {
    isAvailable: aiExerciseService.isAvailable(),
    reason: aiExerciseService.isAvailable()
      ? 'Backend API connected'
      : 'Running in static mode (GitHub Pages)',
  };
};

/**
 * Hook: Generate exercise with optimistic updates
 * Provides instant feedback by showing loading state
 */
export const useGenerateAIExerciseOptimistic = (userId: string) => {
  const queryClient = useQueryClient();
  const generateMutation = useGenerateAIExercise();

  const generateWithOptimisticUpdate = async (params: Omit<GenerateExerciseParams, 'userId'>) => {
    // Optimistically update UI state
    const optimisticExercise = {
      id: `temp-${Date.now()}`,
      type: params.type || 'adaptive',
      loading: true,
    };

    // Store optimistic state
    queryClient.setQueryData(aiExerciseKeys.generation(userId), optimisticExercise);

    try {
      // Perform actual generation
      const result = await generateMutation.mutateAsync({ ...params, userId });

      // Update with real data
      queryClient.setQueryData(aiExerciseKeys.generation(userId), result);

      return result;
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(aiExerciseKeys.generation(userId), null);
      throw error;
    }
  };

  return {
    generate: generateWithOptimisticUpdate,
    isLoading: generateMutation.isPending,
    error: generateMutation.error,
    data: generateMutation.data,
  };
};

/**
 * Hook: Batch generate exercises for entire practice session
 * Generates multiple exercises at once for smoother experience
 */
export const useBatchGenerateExercises = () => {
  const queryClient = useQueryClient();

  return useMutation<AIExerciseResponse[], Error, { userId: string; count: number; types?: string[] }>({
    mutationFn: async ({ userId, count, types }) => {
      const exercises: AIExerciseResponse[] = [];

      // Generate exercises sequentially to avoid rate limits
      for (let i = 0; i < count; i++) {
        const type = types && types.length > 0 ? types[i % types.length] : 'adaptive';
        const params: GenerateExerciseParams = {
          userId,
          type: type as any,
        };

        try {
          const exercise = await aiExerciseService.generateExercise(params);
          exercises.push(exercise);

          // Small delay to avoid rate limiting
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          logError(`Failed to generate exercise ${i + 1}/${count}`, error instanceof Error ? error : new Error(String(error)));
          // Continue generating even if one fails
        }
      }

      return exercises;
    },
    onSuccess: (exercises, variables) => {
      info('Batch exercise generation complete', {
        requested: variables.count,
        generated: exercises.length,
        userId: variables.userId,
      });

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: aiExerciseKeys.stats() });

      // Track analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('exercises_batch_generated', {
          userId: variables.userId,
          requested: variables.count,
          generated: exercises.length,
          types: variables.types,
        });
      }
    },
    onError: (error) => {
      logError('Batch exercise generation failed', error);
    },
  });
};
