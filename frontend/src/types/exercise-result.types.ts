// CONCEPT: Standardized exercise result callback types for frontend components
// WHY: Ensures consistent result tracking across all exercise types
// PATTERN: Type-safe callback with rich metadata for analytics

import type { ExerciseType } from '../../../shared/types/exercise.types';

/**
 * Standardized exercise result interface used by all exercise components
 * This provides a consistent contract for reporting exercise outcomes
 */
export interface ExerciseResult {
  exerciseId: string;
  exerciseType: ExerciseType;
  correct: boolean;
  score: number;        // 0-1 for partial credit (1 = full credit)
  timeTaken: number;    // milliseconds
  attemptsCount?: number;
  hintsUsed?: number;
  metadata?: {
    // Spatial identification specific
    clickDistance?: number;

    // Term matching specific
    matchedPairs?: number;
    totalPairs?: number;

    // Sentence building specific
    correctSequence?: boolean;

    // Category sorting specific
    categoriesCorrect?: number;
    totalCategories?: number;

    // Audio recognition specific
    playCount?: number;

    // Comparative analysis specific
    questionsAnswered?: number;
    totalQuestions?: number;
  };
}

/**
 * Type-safe callback function for exercise completion
 */
export type ExerciseResultCallback = (result: ExerciseResult) => void;

/**
 * Helper to create a basic exercise result
 */
export function createExerciseResult(
  exerciseId: string,
  exerciseType: ExerciseType,
  correct: boolean,
  timeTaken: number = 0
): ExerciseResult {
  return {
    exerciseId,
    exerciseType,
    correct,
    score: correct ? 1 : 0,
    timeTaken,
  };
}

/**
 * Helper to create a partial credit exercise result
 */
export function createPartialCreditResult(
  exerciseId: string,
  exerciseType: ExerciseType,
  correctCount: number,
  totalCount: number,
  timeTaken: number = 0
): ExerciseResult {
  const score = totalCount > 0 ? correctCount / totalCount : 0;
  return {
    exerciseId,
    exerciseType,
    correct: score >= 0.7, // 70% threshold for "correct"
    score,
    timeTaken,
  };
}
