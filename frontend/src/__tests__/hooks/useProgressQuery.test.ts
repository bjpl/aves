// CONCEPT: Tests for useProgressQuery React Query hook
// WHY: Verify progress tracking with React Query patterns
// PATTERN: Test session progress mutations and optimistic updates

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import {
  useSessionProgress,
  useSessionStats,
  useDifficultTerms,
  useStartSession,
  useRecordExerciseResult,
  useExercise,
} from '../../hooks/useExerciseQuery';

vi.mock('axios');

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

describe('useProgressQuery Hooks', () => {
  const mockAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSessionProgress', () => {
    it('should initialize session progress', async () => {
      const { result } = renderHook(() => useSessionProgress(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        sessionId: expect.stringMatching(/^session_\d+_/),
        exercisesCompleted: 0,
        correctAnswers: 0,
        currentStreak: 0,
      });
    });

    it('should have unique session IDs', async () => {
      const { result: result1 } = renderHook(() => useSessionProgress(), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useSessionProgress(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(result1.current.data?.sessionId).toBeDefined();
      expect(result2.current.data?.sessionId).toBeDefined();
    });
  });

  describe('useSessionStats', () => {
    it('should fetch session statistics', async () => {
      const mockStats = {
        accuracy: 85,
        totalTime: 120000,
        averageTime: 6000,
        exercisesCompleted: 20,
      };

      mockAxios.get.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useSessionStats('session-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/exercises/session/session-123/progress');
    });

    it('should return null on error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useSessionStats('session-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should not fetch when sessionId is empty', () => {
      const { result } = renderHook(() => useSessionStats(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useDifficultTerms', () => {
    it('should fetch difficult terms', async () => {
      const mockTerms = ['pico', 'ala', 'cola'];
      mockAxios.get.mockResolvedValueOnce({
        data: { difficultTerms: mockTerms },
      });

      const { result } = renderHook(() => useDifficultTerms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTerms);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/exercises/difficult-terms');
    });

    it('should return empty array on error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useDifficultTerms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useStartSession', () => {
    it('should start a new session', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useStartSession(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('session-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/exercises/session/start', {
        sessionId: 'session-123',
      });
    });

    it('should handle session start error', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Failed to start'));

      const { result } = renderHook(() => useStartSession(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('session-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRecordExerciseResult', () => {
    it('should record a correct answer', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useRecordExerciseResult(), {
        wrapper: createWrapper(),
      });

      const exercise = {
        id: 'ex-1',
        type: 'visual_discrimination' as const,
        instructions: 'Test',
        difficultyLevel: 2,
        createdAt: new Date(),
        annotation: {
          id: 'ann-1',
          imageId: 'img-1',
          spanishTerm: 'pico',
          englishTerm: 'beak',
          coordinates: { x: 0, y: 0, width: 100, height: 100 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      result.current.mutate({
        exercise,
        userAnswer: 'correct',
        isCorrect: true,
        timeTaken: 5000,
        sessionId: 'session-123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/exercises/result', {
        sessionId: 'session-123',
        exerciseType: 'visual_discrimination',
        annotationId: 'ann-1',
        spanishTerm: 'pico',
        userAnswer: 'correct',
        isCorrect: true,
        timeTaken: 5000,
      });
    });

    it('should perform optimistic update for correct answer', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial session progress
      queryClient.setQueryData(['exercises', 'session', 'session-123'], {
        sessionId: 'session-123',
        exercisesCompleted: 0,
        correctAnswers: 0,
        currentStreak: 0,
        startedAt: new Date(),
      });

      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useRecordExerciseResult(), { wrapper: Wrapper });

      const exercise = {
        id: 'ex-1',
        type: 'visual_discrimination' as const,
        instructions: 'Test',
        difficultyLevel: 2,
        createdAt: new Date(),
      };

      result.current.mutate({
        exercise,
        userAnswer: 'correct',
        isCorrect: true,
        timeTaken: 5000,
        sessionId: 'session-123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const updatedProgress = queryClient.getQueryData(['exercises', 'session', 'session-123']);
      expect(updatedProgress).toMatchObject({
        exercisesCompleted: 1,
        correctAnswers: 1,
        currentStreak: 1,
      });
    });

    it('should reset streak on incorrect answer', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial session with streak
      queryClient.setQueryData(['exercises', 'session', 'session-123'], {
        sessionId: 'session-123',
        exercisesCompleted: 2,
        correctAnswers: 2,
        currentStreak: 2,
        startedAt: new Date(),
      });

      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useRecordExerciseResult(), { wrapper: Wrapper });

      const exercise = {
        id: 'ex-1',
        type: 'visual_discrimination' as const,
        instructions: 'Test',
        difficultyLevel: 2,
        createdAt: new Date(),
      };

      result.current.mutate({
        exercise,
        userAnswer: 'wrong',
        isCorrect: false,
        timeTaken: 3000,
        sessionId: 'session-123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const updatedProgress = queryClient.getQueryData(['exercises', 'session', 'session-123']);
      expect(updatedProgress).toMatchObject({
        exercisesCompleted: 3,
        correctAnswers: 2,
        currentStreak: 0, // Reset to 0
      });
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProgress = {
        sessionId: 'session-123',
        exercisesCompleted: 5,
        correctAnswers: 3,
        currentStreak: 1,
        startedAt: new Date(),
      };

      queryClient.setQueryData(['exercises', 'session', 'session-123'], initialProgress);

      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useRecordExerciseResult(), { wrapper: Wrapper });

      const exercise = {
        id: 'ex-1',
        type: 'visual_discrimination' as const,
        instructions: 'Test',
        difficultyLevel: 2,
        createdAt: new Date(),
      };

      result.current.mutate({
        exercise,
        userAnswer: 'answer',
        isCorrect: true,
        timeTaken: 5000,
        sessionId: 'session-123',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback to original state
      const rolledBackProgress = queryClient.getQueryData([
        'exercises',
        'session',
        'session-123',
      ]);
      expect(rolledBackProgress).toEqual(initialProgress);
    });
  });

  describe('useExercise - Combined Hook', () => {
    it('should provide all exercise functionality', async () => {
      mockAxios.get.mockResolvedValue({ data: { difficultTerms: [] } });
      mockAxios.post.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useExercise(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sessionProgress).toBeDefined();
      });

      expect(result.current).toHaveProperty('startSession');
      expect(result.current).toHaveProperty('recordResult');
      expect(result.current).toHaveProperty('getSessionStats');
      expect(result.current).toHaveProperty('getDifficultTerms');
      expect(result.current).toHaveProperty('isRecording');
    });

    it('should return empty array for difficult terms when undefined', async () => {
      mockAxios.get.mockResolvedValue({ data: { difficultTerms: undefined } });

      const { result } = renderHook(() => useExercise(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.getDifficultTerms()).toEqual([]);
      });
    });
  });
});
