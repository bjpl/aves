import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProgress } from '../../hooks/useProgress';
import { api } from '../../services/apiAdapter';
import { createMockProgress } from '../../test/mocks/progress';

vi.mock('../../services/apiAdapter');

describe('useProgress', () => {
  const mockProgress = createMockProgress();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (api.progress.get as any).mockResolvedValue(null);
    (api.progress.save as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with new progress when none exists', async () => {
      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.progress).toBeTruthy();
      expect(result.current.progress?.exercisesCompleted).toBe(0);
      expect(result.current.progress?.correctAnswers).toBe(0);
      expect(api.progress.save).toHaveBeenCalled();
    });

    it('should load existing progress', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.progress).toBeTruthy();
      expect(result.current.progress?.exercisesCompleted).toBe(10);
      expect(result.current.progress?.correctAnswers).toBe(7);
    });

    it('should create session ID if none exists', async () => {
      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const sessionId = sessionStorage.getItem('aves-session-id');
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session-\d+-/);
    });

    it('should reuse existing session ID', async () => {
      sessionStorage.setItem('aves-session-id', 'existing-session-123');

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessionId).toBe('existing-session-123');
    });

    it('should handle initialization errors gracefully', async () => {
      (api.progress.get as any).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.progress).toBeTruthy();
      expect(result.current.progress?.exercisesCompleted).toBe(0);
    });
  });

  describe('Recording Term Discovery', () => {
    it('should record new term discovery', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      await act(async () => {
        await result.current.recordTermDiscovery('pata');
      });

      await waitFor(() => {
        expect(result.current.progress?.termsDiscovered).toContain('pata');
      });
      expect(api.progress.save).toHaveBeenCalled();
    });

    it('should not duplicate term discoveries', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const initialLength = result.current.progress?.termsDiscovered.length || 0;

      await act(async () => {
        await result.current.recordTermDiscovery('pico'); // Already exists
      });

      expect(result.current.progress?.termsDiscovered.length).toBe(initialLength);
    });
  });

  describe('Recording Exercise Completion', () => {
    it('should record correct answer', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const initialCorrect = result.current.progress?.correctAnswers || 0;
      const initialStreak = result.current.progress?.currentStreak || 0;

      await act(async () => {
        await result.current.recordExerciseCompletion(true);
      });

      await waitFor(() => {
        expect(result.current.progress?.correctAnswers).toBe(initialCorrect + 1);
        expect(result.current.progress?.currentStreak).toBe(initialStreak + 1);
      });
    });

    it('should record incorrect answer and reset streak', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const initialIncorrect = result.current.progress?.incorrectAnswers || 0;

      await act(async () => {
        await result.current.recordExerciseCompletion(false);
      });

      await waitFor(() => {
        expect(result.current.progress?.incorrectAnswers).toBe(initialIncorrect + 1);
        expect(result.current.progress?.currentStreak).toBe(0);
      });
    });

    it('should update longest streak when current exceeds it', async () => {
      const progressWithLowStreak = createMockProgress({
        currentStreak: 8,
        longestStreak: 5,
      });
      (api.progress.get as any).mockResolvedValue(progressWithLowStreak);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      await act(async () => {
        await result.current.recordExerciseCompletion(true);
      });

      await waitFor(() => {
        expect(result.current.progress?.longestStreak).toBe(9);
      });
    });

    it('should calculate accuracy correctly', async () => {
      const newProgress = createMockProgress({
        correctAnswers: 0,
        incorrectAnswers: 0,
        totalAnswers: 0,
      });
      (api.progress.get as any).mockResolvedValue(newProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      // Record 7 correct and 3 incorrect
      for (let i = 0; i < 7; i++) {
        await act(async () => {
          await result.current.recordExerciseCompletion(true);
        });
      }

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.recordExerciseCompletion(false);
        });
      }

      await waitFor(() => {
        expect(result.current.progress?.accuracy).toBe(70);
      });
    });
  });

  describe('Vocabulary Mastery', () => {
    it('should increase mastery on correct answer', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const initialMastery = result.current.progress?.vocabularyMastery['pico'] || 0;

      await act(async () => {
        await result.current.updateVocabularyMastery('pico', true);
      });

      await waitFor(() => {
        expect(result.current.progress?.vocabularyMastery['pico']).toBe(initialMastery + 10);
      });
    });

    it('should decrease mastery on incorrect answer', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const initialMastery = result.current.progress?.vocabularyMastery['pico'] || 0;

      await act(async () => {
        await result.current.updateVocabularyMastery('pico', false);
      });

      await waitFor(() => {
        expect(result.current.progress?.vocabularyMastery['pico']).toBe(initialMastery - 5);
      });
    });

    it('should not allow mastery below 0', async () => {
      const progressWithLowMastery = createMockProgress({
        vocabularyMastery: { pico: 2 },
      });
      (api.progress.get as any).mockResolvedValue(progressWithLowMastery);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      await act(async () => {
        await result.current.updateVocabularyMastery('pico', false);
      });

      await waitFor(() => {
        expect(result.current.progress?.vocabularyMastery['pico']).toBe(0);
      });
    });

    it('should not allow mastery above 100', async () => {
      const progressWithHighMastery = createMockProgress({
        vocabularyMastery: { pico: 96 },
      });
      (api.progress.get as any).mockResolvedValue(progressWithHighMastery);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      await act(async () => {
        await result.current.updateVocabularyMastery('pico', true);
      });

      await waitFor(() => {
        expect(result.current.progress?.vocabularyMastery['pico']).toBe(100);
      });
    });
  });

  describe('Statistics', () => {
    it('should calculate stats correctly', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const stats = result.current.getStats();

      expect(stats.termsLearned).toBe(3);
      expect(stats.exercisesCompleted).toBe(10);
      expect(stats.accuracy).toBe(70);
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(5);
      expect(stats.masteredTerms).toBe(1); // Only 'pico' has mastery >= 80
    });

    it('should return zero stats when no progress', () => {
      (api.progress.get as any).mockResolvedValue(null);

      const { result } = renderHook(() => useProgress());

      const stats = result.current.getStats();

      expect(stats.termsLearned).toBe(0);
      expect(stats.exercisesCompleted).toBe(0);
      expect(stats.accuracy).toBe(0);
    });
  });

  describe('Reset Progress', () => {
    it('should reset all progress', async () => {
      (api.progress.get as any).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        expect(result.current.progress?.exercisesCompleted).toBe(10);
      });

      await act(async () => {
        await result.current.resetProgress();
      });

      await waitFor(() => {
        expect(result.current.progress?.exercisesCompleted).toBe(0);
        expect(result.current.progress?.correctAnswers).toBe(0);
        expect(result.current.progress?.termsDiscovered).toEqual([]);
      });
    });
  });
});
