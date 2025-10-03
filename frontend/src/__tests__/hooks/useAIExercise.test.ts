// CONCEPT: Tests for useAIExercise React Query hooks
// WHY: Verify AI exercise generation, caching, prefetching, and analytics
// PATTERN: renderHook with mutations, test service availability checks

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGenerateAIExercise,
  useAIExerciseStats,
  usePrefetchExercises,
  useClearExerciseCache,
  useAIExerciseAvailability,
  useGenerateAIExerciseOptimistic,
  useBatchGenerateExercises,
} from '../../hooks/useAIExercise';
import * as aiExerciseService from '../../services/aiExerciseService';

vi.mock('../../services/aiExerciseService');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('useAIExercise Hooks', () => {
  let mockAnalytics: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.analytics
    mockAnalytics = {
      track: vi.fn(),
    };
    (window as any).analytics = mockAnalytics;
  });

  afterEach(() => {
    delete (window as any).analytics;
  });

  describe('useGenerateAIExercise', () => {
    it('should generate an AI exercise', async () => {
      const mockResponse = {
        exercise: {
          id: 'ex-1',
          type: 'visual_discrimination' as const,
          instructions: 'Test instructions',
          difficultyLevel: 2,
          createdAt: new Date(),
        },
        metadata: {
          generated: true,
          cached: false,
          cost: 0.002,
          generationTime: 1200,
          difficulty: 'medium' as const,
        },
      };

      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useGenerateAIExercise(), {
        wrapper: createWrapper(),
      });

      const params = {
        userId: 'user-1',
        type: 'visual_discrimination' as const,
      };

      result.current.mutate(params);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(aiExerciseService.aiExerciseService.generateExercise).toHaveBeenCalledWith(params);
    });

    it('should track analytics on successful generation', async () => {
      const mockResponse = {
        exercise: {
          id: 'ex-1',
          type: 'adaptive' as const,
          instructions: 'Test',
          difficultyLevel: 3,
          createdAt: new Date(),
        },
        metadata: {
          generated: true,
          cached: false,
          cost: 0.003,
          generationTime: 1500,
          difficulty: 'hard' as const,
        },
      };

      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useGenerateAIExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        type: 'adaptive',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAnalytics.track).toHaveBeenCalledWith('ai_exercise_generated', {
        userId: 'user-1',
        exerciseType: 'adaptive',
        wasGenerated: true,
        wasCached: false,
        difficulty: 'hard',
        cost: 0.003,
        generationTime: 1500,
      });
    });

    it('should handle generation errors', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockRejectedValueOnce(
        new Error('Generation failed')
      );

      const { result } = renderHook(() => useGenerateAIExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        type: 'visual_discrimination',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAIExerciseStats', () => {
    it('should fetch exercise statistics', async () => {
      const mockStats = {
        totalGenerated: 150,
        cacheHitRate: 0.65,
        avgGenerationTime: 1250,
        totalCost: 0.45,
        byType: {
          visual_discrimination: 60,
          term_matching: 40,
          contextual_fill: 30,
          visual_identification: 20,
        },
      };

      vi.mocked(aiExerciseService.aiExerciseService.getStats).mockResolvedValueOnce(mockStats);
      vi.mocked(aiExerciseService.aiExerciseService.isAvailable).mockReturnValueOnce(true);

      const { result } = renderHook(() => useAIExerciseStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });

    it('should not fetch stats when backend unavailable', () => {
      vi.mocked(aiExerciseService.aiExerciseService.isAvailable).mockReturnValueOnce(false);

      const { result } = renderHook(() => useAIExerciseStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle stats fetch errors', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.getStats).mockRejectedValueOnce(
        new Error('Stats unavailable')
      );
      vi.mocked(aiExerciseService.aiExerciseService.isAvailable).mockReturnValueOnce(true);

      const { result } = renderHook(() => useAIExerciseStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('usePrefetchExercises', () => {
    it('should prefetch multiple exercises', async () => {
      const mockPrefetchResponse = {
        prefetched: 5,
        cached: 2,
        totalCost: 0.015,
      };

      vi.mocked(aiExerciseService.aiExerciseService.prefetchExercises).mockResolvedValueOnce(
        mockPrefetchResponse
      );

      const { result } = renderHook(() => usePrefetchExercises(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        count: 5,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPrefetchResponse);
      expect(aiExerciseService.aiExerciseService.prefetchExercises).toHaveBeenCalledWith(
        'user-1',
        5
      );
    });

    it('should track prefetch analytics', async () => {
      const mockPrefetchResponse = {
        prefetched: 3,
        cached: 1,
        totalCost: 0.009,
      };

      vi.mocked(aiExerciseService.aiExerciseService.prefetchExercises).mockResolvedValueOnce(
        mockPrefetchResponse
      );

      const { result } = renderHook(() => usePrefetchExercises(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        count: 3,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAnalytics.track).toHaveBeenCalledWith('exercises_prefetched', {
        userId: 'user-1',
        count: 3,
        prefetched: 3,
        cached: 1,
        totalCost: 0.009,
      });
    });
  });

  describe('useClearExerciseCache', () => {
    it('should clear exercise cache', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.clearCache).mockResolvedValueOnce();

      const { result } = renderHook(() => useClearExerciseCache(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('user-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiExerciseService.aiExerciseService.clearCache).toHaveBeenCalledWith('user-1');
    });

    it('should track cache clear analytics', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.clearCache).mockResolvedValueOnce();

      const { result } = renderHook(() => useClearExerciseCache(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('user-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAnalytics.track).toHaveBeenCalledWith('exercise_cache_cleared', {
        userId: 'user-1',
      });
    });
  });

  describe('useAIExerciseAvailability', () => {
    it('should return available when backend is connected', () => {
      vi.mocked(aiExerciseService.aiExerciseService.isAvailable).mockReturnValueOnce(true);

      const { result } = renderHook(() => useAIExerciseAvailability());

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.reason).toBe('Backend API connected');
    });

    it('should return unavailable in static mode', () => {
      vi.mocked(aiExerciseService.aiExerciseService.isAvailable).mockReturnValueOnce(false);

      const { result } = renderHook(() => useAIExerciseAvailability());

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.reason).toBe('Running in static mode (GitHub Pages)');
    });
  });

  describe('useGenerateAIExerciseOptimistic', () => {
    it('should perform optimistic update during generation', async () => {
      const mockResponse = {
        exercise: {
          id: 'ex-1',
          type: 'adaptive' as const,
          instructions: 'Test',
          difficultyLevel: 2,
          createdAt: new Date(),
        },
        metadata: {
          generated: true,
          cached: false,
          cost: 0.002,
          generationTime: 1000,
          difficulty: 'medium' as const,
        },
      };

      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useGenerateAIExerciseOptimistic('user-1'), {
        wrapper: createWrapper(),
      });

      const generatePromise = result.current.generate({ type: 'adaptive' });

      expect(result.current.isLoading).toBe(true);

      await waitFor(async () => {
        const response = await generatePromise;
        expect(response).toEqual(mockResponse);
      });
    });

    it('should revert optimistic update on error', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockRejectedValueOnce(
        new Error('Generation failed')
      );

      const { result } = renderHook(() => useGenerateAIExerciseOptimistic('user-1'), {
        wrapper: createWrapper(),
      });

      await expect(result.current.generate({ type: 'adaptive' })).rejects.toThrow(
        'Generation failed'
      );

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useBatchGenerateExercises', () => {
    it('should generate multiple exercises sequentially', async () => {
      const mockExercises = [
        {
          exercise: { id: 'ex-1', type: 'adaptive' as const, instructions: 'Test 1', difficultyLevel: 1, createdAt: new Date() },
          metadata: { generated: true, cached: false, cost: 0.002, generationTime: 1000, difficulty: 'easy' as const },
        },
        {
          exercise: { id: 'ex-2', type: 'adaptive' as const, instructions: 'Test 2', difficultyLevel: 2, createdAt: new Date() },
          metadata: { generated: true, cached: false, cost: 0.002, generationTime: 1100, difficulty: 'medium' as const },
        },
      ];

      vi.mocked(aiExerciseService.aiExerciseService.generateExercise)
        .mockResolvedValueOnce(mockExercises[0])
        .mockResolvedValueOnce(mockExercises[1]);

      const { result } = renderHook(() => useBatchGenerateExercises(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        count: 2,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(aiExerciseService.aiExerciseService.generateExercise).toHaveBeenCalledTimes(2);
    });

    it('should continue generating even if one fails', async () => {
      vi.mocked(aiExerciseService.aiExerciseService.generateExercise)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          exercise: { id: 'ex-2', type: 'adaptive' as const, instructions: 'Test', difficultyLevel: 1, createdAt: new Date() },
          metadata: { generated: true, cached: false, cost: 0.002, generationTime: 1000, difficulty: 'easy' as const },
        });

      const { result } = renderHook(() => useBatchGenerateExercises(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        count: 2,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
    });

    it('should track batch generation analytics', async () => {
      const mockExercise = {
        exercise: { id: 'ex-1', type: 'adaptive' as const, instructions: 'Test', difficultyLevel: 1, createdAt: new Date() },
        metadata: { generated: true, cached: false, cost: 0.002, generationTime: 1000, difficulty: 'easy' as const },
      };

      vi.mocked(aiExerciseService.aiExerciseService.generateExercise).mockResolvedValue(
        mockExercise
      );

      const { result } = renderHook(() => useBatchGenerateExercises(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        count: 3,
        types: ['visual_discrimination', 'term_matching'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAnalytics.track).toHaveBeenCalledWith('exercises_batch_generated', {
        userId: 'user-1',
        requested: 3,
        generated: 3,
        types: ['visual_discrimination', 'term_matching'],
      });
    });
  });
});
