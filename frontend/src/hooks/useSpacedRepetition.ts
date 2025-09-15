import { useState, useCallback } from 'react';
import { SpacedRepetitionSchedule } from '../../../shared/types/vocabulary.types';

// SuperMemo 2 (SM-2) algorithm implementation
interface ReviewResult {
  quality: number; // 0-5 (0: complete failure, 5: perfect recall)
}

export const useSpacedRepetition = () => {
  const [schedules, setSchedules] = useState<Map<string, SpacedRepetitionSchedule>>(new Map());

  const calculateNextReview = useCallback((
    schedule: SpacedRepetitionSchedule,
    quality: number
  ): SpacedRepetitionSchedule => {
    let { currentInterval, easeFactor, repetitionNumber } = schedule;

    // Update ease factor based on quality
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Calculate next interval
    let nextInterval: number;
    if (quality < 3) {
      // Failed recall - reset to beginning
      nextInterval = 1;
      repetitionNumber = 0;
    } else {
      if (repetitionNumber === 0) {
        nextInterval = 1;
      } else if (repetitionNumber === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(currentInterval * easeFactor);
      }
      repetitionNumber++;
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

    return {
      ...schedule,
      currentInterval: nextInterval,
      easeFactor,
      nextReviewDate,
      repetitionNumber,
    };
  }, []);

  const initializeSchedule = useCallback((annotationId: string): SpacedRepetitionSchedule => {
    const initialSchedule: SpacedRepetitionSchedule = {
      annotationId,
      currentInterval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      repetitionNumber: 0,
    };

    setSchedules(prev => new Map(prev).set(annotationId, initialSchedule));
    return initialSchedule;
  }, []);

  const reviewTerm = useCallback((annotationId: string, quality: number) => {
    let schedule = schedules.get(annotationId);

    if (!schedule) {
      schedule = initializeSchedule(annotationId);
    }

    const updatedSchedule = calculateNextReview(schedule, quality);
    setSchedules(prev => new Map(prev).set(annotationId, updatedSchedule));

    return updatedSchedule;
  }, [schedules, initializeSchedule, calculateNextReview]);

  const getReviewQueue = useCallback((): string[] => {
    const today = new Date();
    const dueForReview: string[] = [];

    schedules.forEach((schedule, annotationId) => {
      if (schedule.nextReviewDate <= today) {
        dueForReview.push(annotationId);
      }
    });

    return dueForReview;
  }, [schedules]);

  const getSchedule = useCallback((annotationId: string) => {
    return schedules.get(annotationId);
  }, [schedules]);

  const getDaysUntilReview = useCallback((annotationId: string): number | null => {
    const schedule = schedules.get(annotationId);
    if (!schedule) return null;

    const today = new Date();
    const diffTime = schedule.nextReviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [schedules]);

  const getRetentionStatistics = useCallback(() => {
    let totalReviews = 0;
    let averageEaseFactor = 0;
    let overdue = 0;
    const today = new Date();

    schedules.forEach(schedule => {
      totalReviews += schedule.repetitionNumber;
      averageEaseFactor += schedule.easeFactor;
      if (schedule.nextReviewDate < today) {
        overdue++;
      }
    });

    const count = schedules.size;
    return {
      totalTerms: count,
      totalReviews,
      averageEaseFactor: count > 0 ? averageEaseFactor / count : 2.5,
      overdueReviews: overdue,
      retentionRate: count > 0 ? ((count - overdue) / count) * 100 : 100,
    };
  }, [schedules]);

  return {
    reviewTerm,
    getReviewQueue,
    getSchedule,
    getDaysUntilReview,
    getRetentionStatistics,
    initializeSchedule,
  };
};