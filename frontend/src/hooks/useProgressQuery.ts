// CONCEPT: React Query hooks for user progress tracking with optimistic updates
// WHY: Leverages React Query mutations for instant UI updates and background sync
// PATTERN: useQuery for reads, useMutation for writes with optimistic updates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiAdapter';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';
import { UserProgress } from '../../../shared/types/vocabulary.types';

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('aves-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('aves-session-id', sessionId);
  }
  return sessionId;
};

// Hook: Fetch user progress
export const useProgress = () => {
  const sessionId = getSessionId();

  return useQuery({
    queryKey: queryKeys.progress.session(sessionId),
    queryFn: async () => {
      try {
        const savedProgress = await api.progress.get(sessionId);

        if (savedProgress) {
          return {
            ...savedProgress,
            lastActivity: new Date(savedProgress.lastActivity),
            startedAt: new Date(savedProgress.startedAt)
          };
        }

        // Create new progress
        const newProgress: UserProgress = {
          sessionId,
          termsDiscovered: [],
          exercisesCompleted: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          totalAnswers: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivity: new Date(),
          startedAt: new Date(),
          lastUpdated: new Date(),
          vocabularyMastery: {},
          accuracy: 0
        };

        await api.progress.save(newProgress);
        return newProgress;
      } catch (err) {
        logError('Error initializing progress', err instanceof Error ? err : new Error(String(err)));
        // Return default progress on error
        return {
          sessionId,
          termsDiscovered: [],
          exercisesCompleted: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          totalAnswers: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivity: new Date(),
          startedAt: new Date(),
          lastUpdated: new Date(),
          vocabularyMastery: {},
          accuracy: 0
        };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - progress is dynamic
    gcTime: 5 * 60 * 1000,
  });
};

// Hook: Get progress statistics
export const useProgressStats = () => {
  const { data: progress } = useProgress();

  return useQuery({
    queryKey: queryKeys.progress.stats(progress?.sessionId || ''),
    queryFn: () => {
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
    },
    enabled: !!progress,
    staleTime: 1 * 60 * 1000,
  });
};

// Mutation: Record term discovery
export const useRecordTermDiscovery = () => {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  return useMutation({
    mutationFn: async (term: string) => {
      const currentProgress = queryClient.getQueryData<UserProgress>(
        queryKeys.progress.session(sessionId)
      );

      if (!currentProgress || currentProgress.termsDiscovered.includes(term)) {
        return currentProgress;
      }

      const updatedProgress = {
        ...currentProgress,
        termsDiscovered: [...currentProgress.termsDiscovered, term],
        lastActivity: new Date()
      };

      await api.progress.save(updatedProgress);
      return updatedProgress;
    },
    onMutate: async (term) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.progress.session(sessionId) });
      const previousProgress = queryClient.getQueryData<UserProgress>(
        queryKeys.progress.session(sessionId)
      );

      if (previousProgress && !previousProgress.termsDiscovered.includes(term)) {
        queryClient.setQueryData<UserProgress>(
          queryKeys.progress.session(sessionId),
          {
            ...previousProgress,
            termsDiscovered: [...previousProgress.termsDiscovered, term],
            lastActivity: new Date()
          }
        );
      }

      return { previousProgress };
    },
    onError: (err, _term, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(
          queryKeys.progress.session(sessionId),
          context.previousProgress
        );
      }
      logError('Error recording term discovery', err instanceof Error ? err : new Error(String(err)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.stats(sessionId) });
    },
  });
};

// Mutation: Record exercise completion
export const useRecordExerciseCompletion = () => {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  return useMutation({
    mutationFn: async (correct: boolean) => {
      const currentProgress = queryClient.getQueryData<UserProgress>(
        queryKeys.progress.session(sessionId)
      );

      if (!currentProgress) return null;

      const newCorrectAnswers = correct ? currentProgress.correctAnswers + 1 : currentProgress.correctAnswers;
      const newIncorrectAnswers = correct ? currentProgress.incorrectAnswers : currentProgress.incorrectAnswers + 1;
      const newTotalAnswers = currentProgress.totalAnswers + 1;
      const newAccuracy = newTotalAnswers > 0 ? Math.round((newCorrectAnswers / newTotalAnswers) * 100) : 0;

      const updatedProgress = {
        ...currentProgress,
        exercisesCompleted: currentProgress.exercisesCompleted + 1,
        correctAnswers: newCorrectAnswers,
        incorrectAnswers: newIncorrectAnswers,
        totalAnswers: newTotalAnswers,
        accuracy: newAccuracy,
        currentStreak: correct ? currentProgress.currentStreak + 1 : 0,
        longestStreak: correct && currentProgress.currentStreak + 1 > currentProgress.longestStreak
          ? currentProgress.currentStreak + 1
          : currentProgress.longestStreak,
        lastActivity: new Date()
      };

      await api.progress.save(updatedProgress);
      return updatedProgress;
    },
    onMutate: async (correct) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.progress.session(sessionId) });
      const previousProgress = queryClient.getQueryData<UserProgress>(
        queryKeys.progress.session(sessionId)
      );

      if (previousProgress) {
        const newCorrectAnswers = correct ? previousProgress.correctAnswers + 1 : previousProgress.correctAnswers;
        const newIncorrectAnswers = correct ? previousProgress.incorrectAnswers : previousProgress.incorrectAnswers + 1;
        const newTotalAnswers = previousProgress.totalAnswers + 1;
        const newAccuracy = newTotalAnswers > 0 ? Math.round((newCorrectAnswers / newTotalAnswers) * 100) : 0;

        queryClient.setQueryData<UserProgress>(
          queryKeys.progress.session(sessionId),
          {
            ...previousProgress,
            exercisesCompleted: previousProgress.exercisesCompleted + 1,
            correctAnswers: newCorrectAnswers,
            incorrectAnswers: newIncorrectAnswers,
            totalAnswers: newTotalAnswers,
            accuracy: newAccuracy,
            currentStreak: correct ? previousProgress.currentStreak + 1 : 0,
            longestStreak: correct && previousProgress.currentStreak + 1 > previousProgress.longestStreak
              ? previousProgress.currentStreak + 1
              : previousProgress.longestStreak,
            lastActivity: new Date()
          }
        );
      }

      return { previousProgress };
    },
    onError: (err, _variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(
          queryKeys.progress.session(sessionId),
          context.previousProgress
        );
      }
      logError('Error recording exercise completion', err instanceof Error ? err : new Error(String(err)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.stats(sessionId) });
    },
  });
};

// Mutation: Update vocabulary mastery
export const useUpdateVocabularyMastery = () => {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  return useMutation({
    mutationFn: async ({ term, correct }: { term: string; correct: boolean }) => {
      const currentProgress = queryClient.getQueryData<UserProgress>(
        queryKeys.progress.session(sessionId)
      );

      if (!currentProgress) return null;

      const currentMastery = currentProgress.vocabularyMastery[term] || 0;
      const adjustment = correct ? 10 : -5;
      const newMastery = Math.max(0, Math.min(100, currentMastery + adjustment));

      const updatedProgress = {
        ...currentProgress,
        vocabularyMastery: {
          ...currentProgress.vocabularyMastery,
          [term]: newMastery
        },
        lastActivity: new Date()
      };

      await api.progress.save(updatedProgress);
      return updatedProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.stats(sessionId) });
    },
  });
};

// Mutation: Reset progress
export const useResetProgress = () => {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  return useMutation({
    mutationFn: async () => {
      const newProgress: UserProgress = {
        sessionId,
        termsDiscovered: [],
        exercisesCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        totalAnswers: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: new Date(),
        startedAt: new Date(),
        lastUpdated: new Date(),
        vocabularyMastery: {},
        accuracy: 0
      };

      await api.progress.save(newProgress);
      return newProgress;
    },
    onSuccess: (newProgress) => {
      queryClient.setQueryData(queryKeys.progress.session(sessionId), newProgress);
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.stats(sessionId) });
    },
  });
};
