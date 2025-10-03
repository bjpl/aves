import { useState, useCallback } from 'react';
import { Exercise, SessionProgress, ExerciseResult } from '../../../shared/types/exercise.types';
import axios from 'axios';
import { error as logError } from '../utils/logger';

const API_BASE_URL = '/api';

export const useExercise = () => {
  const [sessionProgress, setSessionProgress] = useState<SessionProgress>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    exercisesCompleted: 0,
    correctAnswers: 0,
    currentStreak: 0,
    startedAt: new Date()
  });

  const startSession = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/exercises/session/start`, {
        sessionId: sessionProgress.sessionId
      });
    } catch (error) {
      logError('Failed to start exercise session:', error instanceof Error ? error : new Error(String(error)));
    }
  }, [sessionProgress.sessionId]);

  const recordResult = useCallback(async (
    exercise: Exercise,
    userAnswer: any,
    isCorrect: boolean,
    timeTaken: number
  ) => {
    const result: ExerciseResult = {
      exerciseId: exercise.id,
      exerciseType: exercise.type,
      userAnswer,
      isCorrect,
      timeTaken
    };

    // Update local progress
    setSessionProgress(prev => ({
      ...prev,
      exercisesCompleted: prev.exercisesCompleted + 1,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      currentStreak: isCorrect ? prev.currentStreak + 1 : 0
    }));

    // Send to backend
    try {
      await axios.post(`${API_BASE_URL}/exercises/result`, {
        sessionId: sessionProgress.sessionId,
        exerciseType: exercise.type,
        annotationId: exercise.annotation?.id,
        spanishTerm: exercise.annotation?.spanishTerm,
        userAnswer,
        isCorrect,
        timeTaken
      });
    } catch (error) {
      logError('Failed to record exercise result:', error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }, [sessionProgress.sessionId]);

  const getSessionStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/exercises/session/${sessionProgress.sessionId}/progress`
      );
      return response.data;
    } catch (error) {
      logError('Failed to fetch session stats:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [sessionProgress.sessionId]);

  const getDifficultTerms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/exercises/difficult-terms`);
      return response.data.difficultTerms;
    } catch (error) {
      logError('Failed to fetch difficult terms:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }, []);

  return {
    sessionProgress,
    startSession,
    recordResult,
    getSessionStats,
    getDifficultTerms
  };
};