// CONCEPT: React Query hooks for exercise management with session tracking
// WHY: Leverages React Query for exercise state and result submission
// PATTERN: useQuery for session state, useMutation for result recording

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exercise, SessionProgress, ExerciseResult } from '../../../shared/types/exercise.types';
import axios from 'axios';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';

const API_BASE_URL = '/api';

// Generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Hook: Get current session progress
export const useSessionProgress = () => {
  return useQuery({
    queryKey: queryKeys.exercises.session(generateSessionId()),
    queryFn: () => {
      // Initialize session progress
      return {
        sessionId: generateSessionId(),
        exercisesCompleted: 0,
        correctAnswers: 0,
        currentStreak: 0,
        startedAt: new Date()
      } as SessionProgress;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};

// Hook: Get session stats from backend
export const useSessionStats = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.exercises.stats(sessionId),
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/exercises/session/${sessionId}/progress`
        );
        return response.data;
      } catch (error) {
        logError('Failed to fetch session stats:', error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    },
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000,
  });
};

// Hook: Get difficult terms
export const useDifficultTerms = () => {
  return useQuery({
    queryKey: queryKeys.exercises.difficultTerms(),
    queryFn: async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/exercises/difficult-terms`);
        return response.data.difficultTerms;
      } catch (error) {
        logError('Failed to fetch difficult terms:', error instanceof Error ? error : new Error(String(error)));
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Mutation: Start exercise session
export const useStartSession = () => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await axios.post(`${API_BASE_URL}/exercises/session/start`, {
        sessionId
      });
      return sessionId;
    },
    onError: (error) => {
      logError('Failed to start exercise session:', error instanceof Error ? error : new Error(String(error)));
    },
  });
};

// Mutation: Record exercise result with optimistic update
export const useRecordExerciseResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exercise,
      userAnswer,
      isCorrect,
      timeTaken,
      sessionId
    }: {
      exercise: Exercise;
      userAnswer: any;
      isCorrect: boolean;
      timeTaken: number;
      sessionId: string;
    }) => {
      const result: ExerciseResult = {
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        userAnswer,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
        timeTaken
      };

      // Send to backend
      await axios.post(`${API_BASE_URL}/exercises/result`, {
        sessionId,
        exerciseType: exercise.type,
        annotationId: exercise.annotation?.id,
        spanishTerm: exercise.annotation?.spanishTerm,
        userAnswer,
        isCorrect,
        timeTaken
      });

      return result;
    },
    onMutate: async ({ sessionId, isCorrect }) => {
      // Optimistic update of session progress
      await queryClient.cancelQueries({
        queryKey: queryKeys.exercises.session(sessionId)
      });

      const previousProgress = queryClient.getQueryData<SessionProgress>(
        queryKeys.exercises.session(sessionId)
      );

      if (previousProgress) {
        queryClient.setQueryData<SessionProgress>(
          queryKeys.exercises.session(sessionId),
          {
            ...previousProgress,
            exercisesCompleted: previousProgress.exercisesCompleted + 1,
            correctAnswers: previousProgress.correctAnswers + (isCorrect ? 1 : 0),
            currentStreak: isCorrect ? previousProgress.currentStreak + 1 : 0
          }
        );
      }

      return { previousProgress };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(
          queryKeys.exercises.session(variables.sessionId),
          context.previousProgress
        );
      }
      logError('Failed to record exercise result:', err instanceof Error ? err : new Error(String(err)));
    },
    onSuccess: (_data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.exercises.stats(variables.sessionId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.exercises.difficultTerms()
      });
    },
  });
};

// Combined hook for easier usage (similar to original API)
export const useExercise = () => {
  const { data: sessionProgress } = useSessionProgress();
  const startSession = useStartSession();
  const recordResult = useRecordExerciseResult();
  const { data: stats } = useSessionStats(sessionProgress?.sessionId || '');
  const { data: difficultTerms } = useDifficultTerms();

  return {
    sessionProgress,
    startSession: startSession.mutate,
    recordResult: recordResult.mutate,
    getSessionStats: () => stats,
    getDifficultTerms: () => difficultTerms || [],
    isRecording: recordResult.isPending,
  };
};
