// CONCEPT: Hook for user progress tracking with persistent storage
// WHY: Tracks learning progress across sessions using IndexedDB
// PATTERN: State management hook with automatic persistence

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/apiAdapter';

interface UserProgress {
  sessionId: string;
  termsDiscovered: string[];
  exercisesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  startedAt: Date;
  vocabularyMastery: Record<string, number>; // term -> mastery level (0-100)
}

export const useProgress = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(false);

  // Get or create session ID
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('aves-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('aves-session-id', sessionId);
    }
    return sessionId;
  }, []);

  // Initialize progress
  const initializeProgress = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();

    try {
      // Try to load existing progress
      const savedProgress = await api.progress.get(sessionId);

      if (savedProgress) {
        setProgress({
          ...savedProgress,
          lastActivity: new Date(savedProgress.lastActivity),
          startedAt: new Date(savedProgress.startedAt)
        });
      } else {
        // Create new progress
        const newProgress: UserProgress = {
          sessionId,
          termsDiscovered: [],
          exercisesCompleted: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivity: new Date(),
          startedAt: new Date(),
          vocabularyMastery: {}
        };
        setProgress(newProgress);
        await api.progress.save(newProgress);
      }
    } catch (error) {
      console.error('Error initializing progress:', error);
      // Create local progress if storage fails
      setProgress({
        sessionId,
        termsDiscovered: [],
        exercisesCompleted: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: new Date(),
        startedAt: new Date(),
        vocabularyMastery: {}
      });
    } finally {
      setLoading(false);
    }
  }, [getSessionId]);

  // Record term discovery
  const recordTermDiscovery = useCallback(async (term: string) => {
    if (!progress) return;

    if (!progress.termsDiscovered.includes(term)) {
      const updatedProgress = {
        ...progress,
        termsDiscovered: [...progress.termsDiscovered, term],
        lastActivity: new Date()
      };

      setProgress(updatedProgress);
      await api.progress.save(updatedProgress);
    }
  }, [progress]);

  // Record exercise completion
  const recordExerciseCompletion = useCallback(async (correct: boolean) => {
    if (!progress) return;

    const updatedProgress = {
      ...progress,
      exercisesCompleted: progress.exercisesCompleted + 1,
      correctAnswers: correct ? progress.correctAnswers + 1 : progress.correctAnswers,
      totalAnswers: progress.totalAnswers + 1,
      currentStreak: correct ? progress.currentStreak + 1 : 0,
      longestStreak: correct && progress.currentStreak + 1 > progress.longestStreak
        ? progress.currentStreak + 1
        : progress.longestStreak,
      lastActivity: new Date()
    };

    setProgress(updatedProgress);
    await api.progress.save(updatedProgress);
  }, [progress]);

  // Update vocabulary mastery
  const updateVocabularyMastery = useCallback(async (term: string, correct: boolean) => {
    if (!progress) return;

    const currentMastery = progress.vocabularyMastery[term] || 0;
    const adjustment = correct ? 10 : -5;
    const newMastery = Math.max(0, Math.min(100, currentMastery + adjustment));

    const updatedProgress = {
      ...progress,
      vocabularyMastery: {
        ...progress.vocabularyMastery,
        [term]: newMastery
      },
      lastActivity: new Date()
    };

    setProgress(updatedProgress);
    await api.progress.save(updatedProgress);
  }, [progress]);

  // Get progress statistics
  const getStats = useCallback(() => {
    if (!progress) {
      return {
        termsLearned: 0,
        exercisesCompleted: 0,
        accuracy: 0,
        currentStreak: 0,
        longestStreak: 0,
        sessionDuration: 0,
        masteredTerms: 0
      };
    }

    const accuracy = progress.totalAnswers > 0
      ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
      : 0;

    const sessionDuration = Math.round(
      (new Date().getTime() - new Date(progress.startedAt).getTime()) / 1000 / 60
    );

    const masteredTerms = Object.values(progress.vocabularyMastery)
      .filter(mastery => mastery >= 80).length;

    return {
      termsLearned: progress.termsDiscovered.length,
      exercisesCompleted: progress.exercisesCompleted,
      accuracy,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      sessionDuration,
      masteredTerms
    };
  }, [progress]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    const sessionId = getSessionId();
    const newProgress: UserProgress = {
      sessionId,
      termsDiscovered: [],
      exercisesCompleted: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: new Date(),
      startedAt: new Date(),
      vocabularyMastery: {}
    };

    setProgress(newProgress);
    await api.progress.save(newProgress);
  }, [getSessionId]);

  // Initialize on mount
  useEffect(() => {
    initializeProgress();
  }, []);

  return {
    progress,
    loading,
    recordTermDiscovery,
    recordExerciseCompletion,
    updateVocabularyMastery,
    getStats,
    resetProgress,
    sessionId: progress?.sessionId || getSessionId()
  };
};