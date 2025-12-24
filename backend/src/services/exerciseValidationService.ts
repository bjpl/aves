/**
 * Exercise Validation Service
 *
 * Validates exercise results before recording them to ensure data integrity
 * and provide accurate scoring for different exercise types.
 *
 * @example
 * ```typescript
 * const validator = new ExerciseValidationService();
 *
 * const result = validator.validateExerciseResult({
 *   exerciseType: 'spatial_identification',
 *   userAnswer: { x: 0.45, y: 0.62 },
 *   exercise: spatialExercise
 * });
 *
 * if (result.isValid) {
 *   console.log(`Score: ${result.score}, Feedback: ${result.feedback}`);
 * }
 * ```
 */

import {
  TermMatchingExercise,
  ExerciseType
} from '../types/exercise.types';
import {
  SpatialIdentificationExercise,
  CategorySortingExercise,
  ComparativeAnalysisExercise
} from '../../../shared/types/enhanced-exercise.types';
import * as logger from '../utils/logger';

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1 (1 = 100% correct)
  feedback: string;
  errors?: string[];
  metadata?: {
    clickDistance?: number;
    matchedPairs?: number;
    correctSequence?: boolean;
    categoriesCorrect?: number;
    playCount?: number;
  };
}

export interface ExerciseValidationRequest {
  exerciseType: ExerciseType;
  userAnswer: any;
  exercise: any; // Specific exercise type will be validated internally
  timeTaken?: number;
  attemptsCount?: number;
  hintsUsed?: number;
}

// ============================================================================
// ANSWER TYPE INTERFACES
// ============================================================================

interface TermMatchingAnswer {
  pairs: Array<{ spanish: string; english: string }>;
}

interface AudioRecognitionAnswer {
  selectedOptionId: string;
  playCount?: number;
}

interface SentenceBuildingAnswer {
  words: string[];
}

interface CategorySortingAnswer {
  assignments: Record<string, string>; // termId -> categoryId
}

interface SpatialIdentificationAnswer {
  x: number; // 0-1 normalized coordinates
  y: number; // 0-1 normalized coordinates
}

interface ComparativeAnalysisAnswer {
  selectedImageId: string;
}

// ============================================================================
// VALIDATION SERVICE
// ============================================================================

export class ExerciseValidationService {
  /**
   * Main validation entry point
   * Routes to specific validator based on exercise type
   */
  validateExerciseResult(request: ExerciseValidationRequest): ValidationResult {
    try {
      logger.info('Validating exercise result', {
        exerciseType: request.exerciseType,
        hasAnswer: !!request.userAnswer
      });

      // Route to specific validator
      switch (request.exerciseType) {
        case 'term_matching':
          return this.validateTermMatchingResult(
            request.userAnswer as TermMatchingAnswer,
            request.exercise as TermMatchingExercise
          );

        case 'audio_recognition':
          return this.validateAudioRecognitionResult(
            request.userAnswer as AudioRecognitionAnswer,
            request.exercise
          );

        case 'sentence_building':
          return this.validateSentenceBuildingResult(
            request.userAnswer as SentenceBuildingAnswer,
            request.exercise
          );

        case 'category_sorting':
          return this.validateCategorySortingResult(
            request.userAnswer as CategorySortingAnswer,
            request.exercise as CategorySortingExercise
          );

        case 'spatial_identification':
          return this.validateSpatialIdentificationResult(
            request.userAnswer as SpatialIdentificationAnswer,
            request.exercise as SpatialIdentificationExercise
          );

        case 'comparative_analysis':
          return this.validateComparativeAnalysisResult(
            request.userAnswer as ComparativeAnalysisAnswer,
            request.exercise as ComparativeAnalysisExercise
          );

        default:
          logger.warn('No specific validator for exercise type, using basic validation', {
            exerciseType: request.exerciseType
          });
          return this.validateBasicExercise(request);
      }
    } catch (error) {
      logger.error('Exercise validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        exerciseType: request.exerciseType
      });

      return {
        isValid: false,
        score: 0,
        feedback: 'Validation error occurred',
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  // ============================================================================
  // SPECIFIC VALIDATORS
  // ============================================================================

  /**
   * Validate term matching exercise
   * Checks if user's Spanish-English pairs match the correct pairs
   */
  validateTermMatchingResult(
    answer: TermMatchingAnswer,
    exercise: TermMatchingExercise
  ): ValidationResult {
    if (!answer?.pairs || !Array.isArray(answer.pairs)) {
      return {
        isValid: false,
        score: 0,
        feedback: 'Invalid answer format',
        errors: ['Answer must contain pairs array']
      };
    }

    const correctPairs = exercise.correctPairs;
    let matchedPairs = 0;

    // Check each user pair against correct pairs
    for (const userPair of answer.pairs) {
      const isCorrect = correctPairs.some(
        (correctPair) =>
          correctPair.spanish === userPair.spanish &&
          correctPair.english === userPair.english
      );

      if (isCorrect) {
        matchedPairs++;
      }
    }

    const score = matchedPairs / correctPairs.length;
    const isValid = score === 1;

    return {
      isValid,
      score,
      feedback: isValid
        ? '¡Perfecto! All pairs matched correctly'
        : `Matched ${matchedPairs}/${correctPairs.length} pairs correctly`,
      metadata: {
        matchedPairs
      }
    };
  }

  /**
   * Validate audio recognition exercise
   * Checks if selected option matches the correct answer
   */
  validateAudioRecognitionResult(
    answer: AudioRecognitionAnswer,
    exercise: { correctOptionId: string }
  ): ValidationResult {
    if (!answer?.selectedOptionId) {
      return {
        isValid: false,
        score: 0,
        feedback: 'No option selected',
        errors: ['Answer must contain selectedOptionId']
      };
    }

    const isCorrect = answer.selectedOptionId === exercise.correctOptionId;

    return {
      isValid: isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? '¡Correcto! You recognized the correct term'
        : 'Incorrect. Try listening again',
      metadata: {
        playCount: answer.playCount
      }
    };
  }

  /**
   * Validate sentence building exercise
   * Checks if word order matches target sentence
   */
  validateSentenceBuildingResult(
    answer: SentenceBuildingAnswer,
    exercise: { targetSentence: string }
  ): ValidationResult {
    if (!answer?.words || !Array.isArray(answer.words)) {
      return {
        isValid: false,
        score: 0,
        feedback: 'Invalid answer format',
        errors: ['Answer must contain words array']
      };
    }

    // Join words and normalize for comparison
    const userSentence = answer.words.join(' ').trim().toLowerCase();
    const targetSentence = exercise.targetSentence.trim().toLowerCase();

    const isCorrect = userSentence === targetSentence;

    // Calculate partial credit based on correct word positions
    const targetWords = targetSentence.split(' ');
    let correctPositions = 0;

    for (let i = 0; i < Math.min(answer.words.length, targetWords.length); i++) {
      if (answer.words[i].toLowerCase() === targetWords[i]) {
        correctPositions++;
      }
    }

    const score = correctPositions / targetWords.length;

    return {
      isValid: isCorrect,
      score: isCorrect ? 1 : score,
      feedback: isCorrect
        ? '¡Excelente! Perfect sentence structure'
        : `${correctPositions}/${targetWords.length} words in correct position`,
      metadata: {
        correctSequence: isCorrect
      }
    };
  }

  /**
   * Validate category sorting exercise
   * Checks if terms are assigned to correct categories
   */
  validateCategorySortingResult(
    answer: CategorySortingAnswer,
    exercise: CategorySortingExercise
  ): ValidationResult {
    if (!answer?.assignments || typeof answer.assignments !== 'object') {
      return {
        isValid: false,
        score: 0,
        feedback: 'Invalid answer format',
        errors: ['Answer must contain assignments object']
      };
    }

    let correctAssignments = 0;
    const totalTerms = exercise.terms.length;

    // Check each term's category assignment
    for (const term of exercise.terms) {
      const userCategoryId = answer.assignments[term.id];

      // Find which category this term should be in
      const correctCategory = exercise.categories.find((cat) =>
        cat.acceptedTermIds.includes(term.id)
      );

      if (correctCategory && userCategoryId === correctCategory.id) {
        correctAssignments++;
      }
    }

    const score = correctAssignments / totalTerms;
    const isValid = score === 1;

    return {
      isValid,
      score,
      feedback: isValid
        ? '¡Perfecto! All terms sorted correctly'
        : `${correctAssignments}/${totalTerms} terms in correct categories`,
      metadata: {
        categoriesCorrect: correctAssignments
      }
    };
  }

  /**
   * Validate spatial identification exercise
   * Checks if click coordinates are within tolerance of target
   */
  validateSpatialIdentificationResult(
    answer: SpatialIdentificationAnswer,
    exercise: SpatialIdentificationExercise
  ): ValidationResult {
    if (
      typeof answer?.x !== 'number' ||
      typeof answer?.y !== 'number' ||
      answer.x < 0 ||
      answer.x > 1 ||
      answer.y < 0 ||
      answer.y > 1
    ) {
      return {
        isValid: false,
        score: 0,
        feedback: 'Invalid coordinates',
        errors: ['Coordinates must be normalized values between 0 and 1']
      };
    }

    const targetBox = exercise.targetAnnotation.boundingBox;
    if (!targetBox) {
      return {
        isValid: false,
        score: 0,
        feedback: 'Exercise missing target bounding box',
        errors: ['Target annotation must have bounding box']
      };
    }

    // Calculate center of target bounding box
    const targetCenterX = targetBox.x + targetBox.width / 2;
    const targetCenterY = targetBox.y + targetBox.height / 2;

    // Calculate Euclidean distance from click to target center
    const distance = Math.sqrt(
      Math.pow(answer.x - targetCenterX, 2) + Math.pow(answer.y - targetCenterY, 2)
    );

    // Check if within tolerance
    const isWithinTolerance = distance <= exercise.tolerance;

    // Calculate score based on distance (closer = higher score)
    // Use exponential decay: score = e^(-distance/tolerance)
    const score = isWithinTolerance
      ? Math.exp(-distance / exercise.tolerance)
      : 0;

    return {
      isValid: isWithinTolerance,
      score,
      feedback: isWithinTolerance
        ? distance < exercise.tolerance / 2
          ? '¡Perfecto! Very accurate!'
          : '¡Bien! Correct location'
        : 'Not quite. Try clicking closer to the feature',
      metadata: {
        clickDistance: distance
      }
    };
  }

  /**
   * Validate comparative analysis exercise
   * Checks if selected image matches correct answer
   */
  validateComparativeAnalysisResult(
    answer: ComparativeAnalysisAnswer,
    exercise: ComparativeAnalysisExercise
  ): ValidationResult {
    if (!answer?.selectedImageId) {
      return {
        isValid: false,
        score: 0,
        feedback: 'No image selected',
        errors: ['Answer must contain selectedImageId']
      };
    }

    const isCorrect = answer.selectedImageId === exercise.correctAnswerId;

    return {
      isValid: isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? '¡Correcto! You identified the correct comparison'
        : 'Incorrect. Look more carefully at the features'
    };
  }

  /**
   * Basic validation for exercise types without specific validators
   * Checks for correctAnswer field in exercise
   */
  private validateBasicExercise(request: ExerciseValidationRequest): ValidationResult {
    const exercise = request.exercise as any;

    if (!exercise.correctAnswer) {
      return {
        isValid: false,
        score: 0,
        feedback: 'Exercise missing correct answer',
        errors: ['Exercise must have correctAnswer field for basic validation']
      };
    }

    // Simple equality check
    const isCorrect = request.userAnswer === exercise.correctAnswer;

    return {
      isValid: isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? '¡Correcto!' : 'Incorrect answer'
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate accuracy percentage from validation result
   */
  calculateAccuracy(result: ValidationResult): number {
    return Math.round(result.score * 100);
  }

  /**
   * Determine if result meets minimum threshold for credit
   */
  meetsThreshold(result: ValidationResult, threshold: number = 0.7): boolean {
    return result.score >= threshold;
  }
}
