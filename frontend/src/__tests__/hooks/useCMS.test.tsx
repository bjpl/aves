// CONCEPT: Tests for useCMS React Query hooks
// WHY: Verify Strapi CMS integration for birds, lessons, and quizzes
// PATTERN: Test useQuery and useMutation hooks with CMSService

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBirds,
  useBird,
  useBirdByName,
  useLessons,
  useLesson,
  useLessonsByDifficulty,
  useQuizzesByLesson,
  useQuizSubmission,
  useBirdSearch,
  useProgressTracking,
  usePrefetchBird,
  usePrefetchLesson,
} from '../../hooks/useCMS';
import * as CMSService from '../../services/cms.service';

vi.mock('../../services/cms.service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('useCMS Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useBirds', () => {
    it('should fetch birds without params', async () => {
      const mockBirds = [
        { id: 1, commonName: 'Robin', scientificName: 'Turdus migratorius' },
        { id: 2, commonName: 'Sparrow', scientificName: 'Passer domesticus' },
      ];

      vi.mocked(CMSService.CMSService.getBirds).mockResolvedValueOnce(mockBirds);

      const { result } = renderHook(() => useBirds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBirds);
      expect(CMSService.CMSService.getBirds).toHaveBeenCalledWith(undefined);
    });

    it('should fetch birds with filter params', async () => {
      const params = { family: 'Turdidae', habitat: 'forest' };
      vi.mocked(CMSService.CMSService.getBirds).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useBirds(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(CMSService.CMSService.getBirds).toHaveBeenCalledWith(params);
    });

    it('should cache birds data', async () => {
      const mockBirds = [{ id: 1, commonName: 'Robin' }];
      vi.mocked(CMSService.CMSService.getBirds).mockResolvedValueOnce(mockBirds);

      const { result, rerender } = renderHook(() => useBirds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Rerender should use cached data
      rerender();
      expect(CMSService.CMSService.getBirds).toHaveBeenCalledTimes(1);
    });
  });

  describe('useBird', () => {
    it('should fetch a bird by ID', async () => {
      const mockBird = { id: 1, commonName: 'Robin', scientificName: 'Turdus migratorius' };
      vi.mocked(CMSService.CMSService.getBirdById).mockResolvedValueOnce(mockBird);

      const { result } = renderHook(() => useBird(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBird);
      expect(CMSService.CMSService.getBirdById).toHaveBeenCalledWith(1);
    });

    it('should not fetch when ID is falsy', () => {
      const { result } = renderHook(() => useBird(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(CMSService.CMSService.getBirdById).not.toHaveBeenCalled();
    });
  });

  describe('useBirdByName', () => {
    it('should fetch a bird by Spanish name', async () => {
      const mockBird = { id: 1, spanishName: 'Petirrojo', commonName: 'Robin' };
      vi.mocked(CMSService.CMSService.getBirdBySpanishName).mockResolvedValueOnce(mockBird);

      const { result } = renderHook(() => useBirdByName('Petirrojo'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBird);
      expect(CMSService.CMSService.getBirdBySpanishName).toHaveBeenCalledWith('Petirrojo');
    });

    it('should not fetch when name is empty', () => {
      const { result } = renderHook(() => useBirdByName(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useLessons', () => {
    it('should fetch lessons', async () => {
      const mockLessons = [
        { id: 1, title: 'Lesson 1', difficulty: 'beginner' },
        { id: 2, title: 'Lesson 2', difficulty: 'intermediate' },
      ];

      vi.mocked(CMSService.CMSService.getLessons).mockResolvedValueOnce(mockLessons);

      const { result } = renderHook(() => useLessons(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLessons);
    });
  });

  describe('useLesson', () => {
    it('should fetch a lesson by ID', async () => {
      const mockLesson = { id: 1, title: 'Lesson 1', content: 'Content' };
      vi.mocked(CMSService.CMSService.getLessonById).mockResolvedValueOnce(mockLesson);

      const { result } = renderHook(() => useLesson(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLesson);
    });
  });

  describe('useLessonsByDifficulty', () => {
    it('should fetch lessons by difficulty level', async () => {
      const mockLessons = [{ id: 1, title: 'Beginner Lesson', difficulty: 'beginner' }];
      vi.mocked(CMSService.CMSService.getLessonsByDifficulty).mockResolvedValueOnce(mockLessons);

      const { result } = renderHook(() => useLessonsByDifficulty('beginner'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLessons);
      expect(CMSService.CMSService.getLessonsByDifficulty).toHaveBeenCalledWith('beginner');
    });
  });

  describe('useQuizzesByLesson', () => {
    it('should fetch quizzes for a lesson', async () => {
      const mockQuizzes = [
        { id: 1, question: 'Question 1', lessonId: 1 },
        { id: 2, question: 'Question 2', lessonId: 1 },
      ];

      vi.mocked(CMSService.CMSService.getQuizzesByLessonId).mockResolvedValueOnce(mockQuizzes);

      const { result } = renderHook(() => useQuizzesByLesson(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockQuizzes);
    });

    it('should not fetch when lessonId is falsy', () => {
      const { result } = renderHook(() => useQuizzesByLesson(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useQuizSubmission', () => {
    it('should submit a quiz answer', async () => {
      const mockResponse = { correct: true, score: 100 };
      vi.mocked(CMSService.CMSService.submitQuizAnswer).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useQuizSubmission(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        quizId: 1,
        answer: 'Option A',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(CMSService.CMSService.submitQuizAnswer).toHaveBeenCalledWith(1, 'Option A');
    });

    it('should invalidate userProgress on success', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(CMSService.CMSService.submitQuizAnswer).mockResolvedValueOnce({ correct: true });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useQuizSubmission(), { wrapper: Wrapper });

      result.current.mutate({ quizId: 1, answer: 'A' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['userProgress']);
    });
  });

  describe('useBirdSearch', () => {
    it('should search birds with term', async () => {
      const mockResults = [{ id: 1, commonName: 'Robin' }];
      vi.mocked(CMSService.CMSService.searchBirds).mockResolvedValueOnce(mockResults);

      const { result } = renderHook(() => useBirdSearch('robin'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResults);
      expect(CMSService.CMSService.searchBirds).toHaveBeenCalledWith('robin');
    });

    it('should not search with short term', () => {
      const { result } = renderHook(() => useBirdSearch('ro'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should respect enabled flag', () => {
      const { result } = renderHook(() => useBirdSearch('robin', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useProgressTracking', () => {
    it('should track user progress', async () => {
      vi.mocked(CMSService.CMSService.trackProgress).mockResolvedValueOnce();

      const { result } = renderHook(() => useProgressTracking(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-1',
        lessonId: 1,
        progress: 75,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(CMSService.CMSService.trackProgress).toHaveBeenCalledWith('user-1', 1, 75);
    });

    it('should invalidate userProgress on success', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(CMSService.CMSService.trackProgress).mockResolvedValueOnce();

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useProgressTracking(), { wrapper: Wrapper });

      result.current.mutate({ userId: 'user-1', lessonId: 1, progress: 50 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['userProgress']);
    });
  });

  describe('usePrefetchBird', () => {
    it('should prefetch bird data', () => {
      const queryClient = new QueryClient();
      const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => usePrefetchBird(), { wrapper: Wrapper });

      result.current(1);

      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  describe('usePrefetchLesson', () => {
    it('should prefetch lesson data', () => {
      const queryClient = new QueryClient();
      const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => usePrefetchLesson(), { wrapper: Wrapper });

      result.current(1);

      expect(prefetchSpy).toHaveBeenCalled();
    });
  });
});
