// Type guard utilities for runtime type validation
// These ensure type safety when dealing with external data (API responses, IndexedDB, etc.)

import {
  Annotation,
  Exercise,
  Species,
  VocabularyInteraction,
  EnhancedExercise,
  ExerciseType
} from './index';

/**
 * Type guard to check if a value is an Annotation
 */
export function isAnnotation(value: unknown): value is Annotation {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.imageId === 'string' &&
    typeof obj.boundingBox === 'object' &&
    typeof obj.type === 'string' &&
    typeof obj.spanishTerm === 'string' &&
    typeof obj.englishTerm === 'string' &&
    typeof obj.difficultyLevel === 'number' &&
    typeof obj.isVisible === 'boolean'
  );
}

/**
 * Type guard to check if a value is an Exercise
 */
export function isExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.instructions === 'string'
  );
}

/**
 * Type guard to check if a value is an EnhancedExercise
 */
export function isEnhancedExercise(value: unknown): value is EnhancedExercise {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.instructions === 'string' &&
    typeof obj.pedagogicalLevel === 'string' &&
    typeof obj.learningObjective === 'string' &&
    typeof obj.prompt === 'string'
  );
}

/**
 * Type guard to check if a value is a Species
 */
export function isSpecies(value: unknown): value is Species {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.scientificName === 'string' &&
    typeof obj.spanishName === 'string' &&
    typeof obj.englishName === 'string' &&
    typeof obj.sizeCategory === 'string' &&
    Array.isArray(obj.primaryColors) &&
    Array.isArray(obj.habitats)
  );
}

/**
 * Type guard to check if a value is a VocabularyInteraction
 */
export function isVocabularyInteraction(value: unknown): value is VocabularyInteraction {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.annotationId === 'string' &&
    typeof obj.interactionType === 'string'
  );
}

/**
 * Type guard to check if a value is a valid ExerciseType
 */
export function isExerciseType(value: unknown): value is ExerciseType {
  return (
    typeof value === 'string' &&
    ['visual_discrimination', 'term_matching', 'contextual_fill', 'image_labeling'].includes(value)
  );
}

/**
 * Type guard array validator
 */
export function isArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(err: unknown): err is Error {
  return err instanceof Error;
}

/**
 * Type guard to check if a value is a Record<string, unknown>
 */
export function isRecordError(err: unknown): err is Record<string, unknown> {
  return typeof err === 'object' && err !== null && !isError(err);
}

/**
 * Convert unknown error to Error or Record for logging
 */
export function toLoggableError(err: unknown): Error | Record<string, unknown> {
  if (isError(err)) {
    return err;
  }
  if (isRecordError(err)) {
    return err;
  }
  // Convert primitives and other types to a loggable object
  return { error: String(err), type: typeof err };
}
