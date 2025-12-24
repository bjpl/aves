// CONCEPT: Centralized type exports for cleaner imports
// WHY: Single import point reduces complexity and improves maintainability
// PATTERN: Barrel export pattern for TypeScript modules

// Re-export all shared types
export * from '../../../shared/types/annotation.types';
export * from '../../../shared/types/vocabulary.types';
export type {
  ExerciseType,
  ExerciseBase,
  VisualDiscriminationExercise,
  TermMatchingExercise,
  ContextualFillExercise,
  ImageLabelingExercise,
  VisualIdentificationExercise,
  Exercise,
  ExerciseResult,
  SessionProgress
} from '../../../shared/types/exercise.types';
export * from '../../../shared/types/species.types';
export * from '../../../shared/types/image.types';
export * from '../../../shared/types/enhanced-exercise.types';

// Re-export type utilities
export * from './guards';
export * from './api.types';
export * from './error.types';
export * from './storage.types';
export * from './exercise-result.types';

// Local frontend-specific types
export interface AppConfig {
  apiUrl: string;
  unsplashKey?: string;
  environment: 'development' | 'production' | 'test';
}

export interface UserSession {
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
}

export interface ErrorState {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}