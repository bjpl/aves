/**
 * useExerciseSRS Hook
 *
 * Integrates exercise completion with the Spaced Repetition System.
 * Converts exercise results into SRS quality scores (0-5) and records reviews.
 *
 * Quality Score Mapping:
 * - 5: Perfect - fast, correct, no hints
 * - 4: Good - correct, normal speed
 * - 3: Correct but hesitant - slow or hints used
 * - 2: Partially correct - some errors
 * - 1: Wrong but close - quick attempt
 * - 0: Wrong - incorrect with slow response
 */

import { useCallback } from 'react';
import { useRecordReview } from './useSpacedRepetition';
import { debug, error as logError } from '../utils/logger';
import type { ExerciseResult } from '../types/exercise-result.types';
import type { ReviewResult } from './useSpacedRepetition';

/**
 * Configuration for quality score calculation
 */
const QUALITY_THRESHOLDS = {
  FAST_TIME_MS: 1500,       // < 1.5s = fast recall
  NORMAL_TIME_MS: 3000,     // < 3s = normal recall
  SLOW_TIME_MS: 5000,       // < 5s = slow but correct
  PARTIAL_THRESHOLD: 0.7,   // 70% score threshold
  GOOD_SCORE: 0.85,         // 85% = good performance
};

/**
 * Hook for integrating exercise results with SRS
 */
export const useExerciseSRS = () => {
  const recordReview = useRecordReview();

  /**
   * Calculate SRS quality score (0-5) from exercise result
   */
  const calculateQualityFromExercise = useCallback((result: ExerciseResult): number => {
    const { correct, score, timeTaken, hintsUsed } = result;

    // Handle incorrect answers (0-2)
    if (!correct) {
      // Partially correct (some points earned)
      if (score > 0 && score < 1) {
        return 2; // Partially correct - shows some understanding
      }

      // Fast incorrect attempt might indicate confusion vs. slow might indicate learning
      if (timeTaken && timeTaken < QUALITY_THRESHOLDS.FAST_TIME_MS) {
        return 1; // Wrong but attempted quickly - might have been close
      }

      return 0; // Incorrect with slow response - needs more practice
    }

    // Handle correct answers (3-5) based on performance quality

    // Penalize hint usage
    if (hintsUsed && hintsUsed > 0) {
      return 3; // Correct but needed help
    }

    // Consider partial scores for multi-part exercises
    if (score < 1) {
      // Correct overall but not perfect score
      if (score >= QUALITY_THRESHOLDS.GOOD_SCORE) {
        return 4; // Good but not perfect
      }
      return 3; // Correct but hesitant
    }

    // Perfect score (score === 1) - check response time
    if (!timeTaken) {
      return 4; // Correct with no timing data - assume good
    }

    // Time-based quality for perfect answers
    if (timeTaken < QUALITY_THRESHOLDS.FAST_TIME_MS) {
      return 5; // Perfect - fast recall
    }

    if (timeTaken < QUALITY_THRESHOLDS.NORMAL_TIME_MS) {
      return 4; // Good - normal recall
    }

    if (timeTaken < QUALITY_THRESHOLDS.SLOW_TIME_MS) {
      return 3; // Correct but hesitant
    }

    return 3; // Very slow but correct
  }, []);

  /**
   * Extract term IDs from exercise result
   * Handles both single-term and multi-term exercises
   */
  const extractTermIds = useCallback((result: ExerciseResult): string[] => {
    const termIds: string[] = [];

    // Primary term ID (always present)
    if (result.exerciseId) {
      termIds.push(result.exerciseId);
    }

    // Extract additional term IDs from metadata for multi-term exercises
    const { metadata } = result;
    if (!metadata) {
      return termIds;
    }

    // Term matching exercises involve multiple terms
    if (result.exerciseType === 'term_matching' && metadata.matchedPairs && metadata.totalPairs) {
      // For term matching, the exerciseId might be a composite
      // We could parse it or rely on the exercise component to track individual terms
      // For now, we'll record the primary ID with adjusted quality based on partial matches
    }

    // Category sorting might involve multiple terms
    if (result.exerciseType === 'category_sorting' && metadata.categoriesCorrect && metadata.totalCategories) {
      // Similar to term matching, adjust quality based on partial success
    }

    // Comparative analysis with multiple questions
    if (result.exerciseType === 'comparative_analysis' && metadata.questionsAnswered && metadata.totalQuestions) {
      // Multiple questions about terms - might want to track separately
    }

    return termIds;
  }, []);

  /**
   * Adjust quality score for multi-term exercises based on partial success
   */
  const adjustQualityForPartialSuccess = useCallback((
    baseQuality: number,
    result: ExerciseResult
  ): number => {
    const { metadata } = result;
    if (!metadata) {
      return baseQuality;
    }

    // For term matching, adjust based on match percentage
    if (result.exerciseType === 'term_matching' && metadata.matchedPairs && metadata.totalPairs) {
      const matchRate = metadata.matchedPairs / metadata.totalPairs;

      if (matchRate === 1) {
        return baseQuality; // Perfect - use base quality
      }

      if (matchRate >= 0.75) {
        return Math.min(baseQuality, 4); // Good but not perfect
      }

      if (matchRate >= 0.5) {
        return 3; // Partial success
      }

      return 2; // Less than half correct
    }

    // For category sorting
    if (result.exerciseType === 'category_sorting' && metadata.categoriesCorrect && metadata.totalCategories) {
      const correctRate = metadata.categoriesCorrect / metadata.totalCategories;

      if (correctRate === 1) {
        return baseQuality;
      }

      if (correctRate >= 0.75) {
        return Math.min(baseQuality, 4);
      }

      if (correctRate >= 0.5) {
        return 3;
      }

      return 2;
    }

    // For comparative analysis
    if (result.exerciseType === 'comparative_analysis' && metadata.questionsAnswered && metadata.totalQuestions) {
      const answerRate = metadata.questionsAnswered / metadata.totalQuestions;

      if (answerRate === 1) {
        return baseQuality;
      }

      if (answerRate >= 0.75) {
        return Math.min(baseQuality, 4);
      }

      if (answerRate >= 0.5) {
        return 3;
      }

      return 2;
    }

    return baseQuality;
  }, []);

  /**
   * Record exercise completion in SRS
   * Handles both single and multi-term exercises
   */
  const recordExerciseReview = useCallback(async (
    result: ExerciseResult
  ): Promise<void> => {
    try {
      // Calculate base quality from exercise result
      const baseQuality = calculateQualityFromExercise(result);

      // Adjust quality for partial success in multi-term exercises
      const quality = adjustQualityForPartialSuccess(baseQuality, result);

      // Extract term IDs to review
      const termIds = extractTermIds(result);

      if (termIds.length === 0) {
        debug('No term IDs found in exercise result', { result });
        return;
      }

      // Record review for each term
      const reviewPromises = termIds.map(async (termId) => {
        const reviewResult: ReviewResult = {
          termId,
          quality,
          responseTimeMs: result.timeTaken,
        };

        debug('Recording SRS review', {
          termId,
          quality,
          exerciseType: result.exerciseType,
          score: result.score,
          timeTaken: result.timeTaken,
        });

        return recordReview.mutateAsync(reviewResult);
      });

      await Promise.all(reviewPromises);

      debug('Successfully recorded SRS reviews', {
        termCount: termIds.length,
        quality,
        exerciseType: result.exerciseType,
      });
    } catch (error) {
      logError('Failed to record exercise SRS review',
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't throw - SRS recording is non-critical for exercise completion
    }
  }, [calculateQualityFromExercise, adjustQualityForPartialSuccess, extractTermIds, recordReview]);

  /**
   * Get human-readable quality description
   */
  const getQualityDescription = useCallback((quality: number): string => {
    switch (quality) {
      case 5:
        return 'Perfect - Fast recall';
      case 4:
        return 'Good - Normal recall';
      case 3:
        return 'Correct - Hesitant';
      case 2:
        return 'Partially correct';
      case 1:
        return 'Incorrect - Close attempt';
      case 0:
        return 'Incorrect - Needs practice';
      default:
        return 'Unknown quality';
    }
  }, []);

  return {
    recordExerciseReview,
    calculateQualityFromExercise,
    extractTermIds,
    getQualityDescription,
    isRecording: recordReview.isPending,
  };
};

export default useExerciseSRS;
