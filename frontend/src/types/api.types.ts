// API-related type definitions for HTTP requests and responses

import { SpeciesFilter } from './index';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: ApiResponseMeta;
  error?: ApiError;
}

/**
 * API response metadata
 */
export interface ApiResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
  timestamp?: string;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  method: HttpMethod;
  url: string;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Exercise answer submission
 */
export interface ExerciseAnswerSubmission {
  exerciseId: string;
  answer: ExerciseAnswer;
  timeTaken?: number;
  sessionId?: string;
}

/**
 * Valid exercise answer types based on exercise type
 */
export type ExerciseAnswer =
  | string                           // For visual_identification, contextual_fill
  | number                           // For cultural_context (index)
  | string[]                         // For sentence_building, term_matching
  | { [key: string]: string }        // For term_matching pairs
  | { x: number; y: number };        // For visual_identification coordinates

/**
 * Exercise result from API
 */
export interface ExerciseResult {
  exerciseId: string;
  answer: ExerciseAnswer;
  correct: boolean;
  timestamp: Date;
  feedback?: string;
  explanation?: string;
  sessionId?: string;
}

/**
 * User progress data
 */
export interface UserProgress {
  sessionId: string;
  exercisesCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  lastExerciseAt?: Date;
  startedAt: Date;
  lastUpdated: Date;
}

/**
 * Query parameters for species filtering
 */
export type SpeciesQueryParams = SpeciesFilter & {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'family' | 'order';
  sortOrder?: 'asc' | 'desc';
};

/**
 * Query parameters for annotation filtering
 */
export interface AnnotationQueryParams {
  imageId?: string;
  type?: string;
  difficultyLevel?: number;
  isVisible?: boolean;
}

/**
 * Query parameters for exercise filtering
 */
export interface ExerciseQueryParams {
  type?: string;
  difficulty?: number;
  limit?: number;
}
