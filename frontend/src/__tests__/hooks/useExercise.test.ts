import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExercise } from '../../hooks/useExercise';
import axios from 'axios';
import { createMockExercise } from '../../test/mocks/exercises';

vi.mock('axios');

describe('useExercise', () => {
  const mockAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxios.post.mockResolvedValue({ data: {} });
    mockAxios.get.mockResolvedValue({ data: {} });
  });

  describe('Session Management', () => {
    it('should initialize with a unique session ID', () => {
      const { result } = renderHook(() => useExercise());

      expect(result.current.sessionProgress.sessionId).toMatch(/^session_\d+_/);
      expect(result.current.sessionProgress.exercisesCompleted).toBe(0);
      expect(result.current.sessionProgress.correctAnswers).toBe(0);
      expect(result.current.sessionProgress.currentStreak).toBe(0);
    });

    it('should start a new session', async () => {
      const { result } = renderHook(() => useExercise());

      await result.current.startSession();

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          '/api/exercises/session/start',
          expect.objectContaining({
            sessionId: expect.stringMatching(/^session_\d+_/),
          })
        );
      });
    });

    it('should handle session start errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useExercise());

      await expect(result.current.startSession()).resolves.not.toThrow();
    });
  });

  describe('Recording Results', () => {
    it('should record a correct answer and update progress', async () => {
      const { result } = renderHook(() => useExercise());
      const exercise = createMockExercise('visual_discrimination');

      await result.current.recordResult(exercise, 'opt-1', true, 5000);

      await waitFor(() => {
        expect(result.current.sessionProgress.exercisesCompleted).toBe(1);
        expect(result.current.sessionProgress.correctAnswers).toBe(1);
        expect(result.current.sessionProgress.currentStreak).toBe(1);
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/api/exercises/result',
        expect.objectContaining({
          isCorrect: true,
          userAnswer: 'opt-1',
          timeTaken: 5000,
        })
      );
    });

    it('should record an incorrect answer and reset streak', async () => {
      const { result } = renderHook(() => useExercise());
      const exercise = createMockExercise('visual_discrimination');

      // First, get a streak going
      await result.current.recordResult(exercise, 'opt-1', true, 5000);
      await result.current.recordResult(exercise, 'opt-1', true, 5000);

      await waitFor(() => {
        expect(result.current.sessionProgress.currentStreak).toBe(2);
      });

      // Now record an incorrect answer
      await result.current.recordResult(exercise, 'opt-2', false, 3000);

      await waitFor(() => {
        expect(result.current.sessionProgress.exercisesCompleted).toBe(3);
        expect(result.current.sessionProgress.correctAnswers).toBe(2);
        expect(result.current.sessionProgress.currentStreak).toBe(0);
      });
    });

    it('should handle result recording errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('API error'));
      const { result } = renderHook(() => useExercise());
      const exercise = createMockExercise('visual_discrimination');

      const recordResult = result.current.recordResult(exercise, 'opt-1', true, 5000);

      await expect(recordResult).resolves.not.toThrow();
      await waitFor(() => {
        expect(result.current.sessionProgress.exercisesCompleted).toBe(1);
      });
    });
  });

  describe('Session Statistics', () => {
    it('should fetch session stats', async () => {
      const mockStats = {
        accuracy: 75,
        totalTime: 60000,
        averageTime: 6000,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useExercise());
      const stats = await result.current.getSessionStats();

      expect(stats).toEqual(mockStats);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/exercises/session/')
      );
    });

    it('should return null on stats fetch error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useExercise());

      const stats = await result.current.getSessionStats();

      expect(stats).toBeNull();
    });
  });

  describe('Difficult Terms', () => {
    it('should fetch difficult terms', async () => {
      const mockTerms = ['pico', 'ala', 'cola'];
      mockAxios.get.mockResolvedValueOnce({ data: { difficultTerms: mockTerms } });

      const { result } = renderHook(() => useExercise());
      const terms = await result.current.getDifficultTerms();

      expect(terms).toEqual(mockTerms);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/exercises/difficult-terms');
    });

    it('should return empty array on error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('API error'));
      const { result } = renderHook(() => useExercise());

      const terms = await result.current.getDifficultTerms();

      expect(terms).toEqual([]);
    });
  });
});
