// CONCEPT: Centralized type exports for cleaner imports
// WHY: Single import point reduces complexity and improves maintainability
// PATTERN: Barrel export pattern for TypeScript modules

// Re-export all shared types
export * from '../../../shared/types/annotation.types';
export * from '../../../shared/types/vocabulary.types';
export * from '../../../shared/types/exercise.types';
export * from '../../../shared/types/species.types';
export * from '../../../shared/types/image.types';

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
  details?: any;
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