/**
 * Learning Module Type Definitions
 * SPARC Specification: Learning content and progress tracking
 */

import { Annotation, AnnotationType } from './annotation.types';

// ============================================
// Learning Module Types
// ============================================

export interface LearningModule {
  id: string;
  title: string;
  titleSpanish: string;
  description?: string;
  descriptionSpanish?: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  speciesIds: string[];
  prerequisiteModuleId?: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  annotations?: Annotation[];
}

export interface ModuleProgress {
  moduleId: string;
  userId: string;
  completed: boolean;
  termsLearned: number;
  totalTerms: number;
  masteryLevel: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  titleSpanish: string;
  orderIndex: number;
  annotations: Annotation[];
  estimatedMinutes: number;
}

export interface LessonResults {
  lessonId: string;
  moduleId: string;
  completedAt: Date;
  timeSpent: number; // seconds
  termsLearned: string[]; // annotation IDs
  termsAlreadyKnown: string[];
  quizScore?: number; // 0-100
}

// ============================================
// Spaced Repetition Types (SM-2 Algorithm)
// ============================================

export interface UserTermProgress {
  id: string;
  userId: string;
  annotationId: string;

  // SM-2 Algorithm Fields
  repetitions: number;
  easeFactor: number; // 1.3 - 2.5+
  intervalDays: number;

  // Scheduling
  nextReviewAt: Date;
  lastReviewedAt?: Date;

  // Performance Tracking
  timesCorrect: number;
  timesIncorrect: number;
  currentStreak: number;
  longestStreak: number;

  // Mastery Level
  masteryLevel: number; // 0-100

  // Metadata
  firstSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SRSState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

/**
 * SM-2 Algorithm Quality Rating
 *
 * 0 - Complete blackout (no recall)
 * 1 - Incorrect, but recognized answer
 * 2 - Incorrect, but seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct with hesitation
 * 5 - Perfect recall
 */
export type SRSQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewResult {
  annotationId: string;
  correct: boolean;
  quality: SRSQuality;
  timeTaken: number; // milliseconds
  previousState: SRSState;
  newState: SRSState;
  masteryChange: number; // delta in mastery level
}

export interface ProgressStats {
  totalTerms: number;
  masteredTerms: number; // mastery >= 80
  learningTerms: number;
  dueTerms: number;
  overdueTerms: number;
  averageMastery: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  accuracy: number; // 0-100
}

// ============================================
// Content Publishing Types
// ============================================

export interface PublishedAnnotation extends Annotation {
  publishedAt: Date;
  learningModuleId?: string;
  module?: LearningModule;
}

export interface ContentFilters {
  difficulty?: 1 | 2 | 3 | 4 | 5;
  type?: AnnotationType;
  species?: string;
  moduleId?: string;
  limit?: number;
  offset?: number;
}

export interface LearnContentResponse {
  modules: (LearningModule & {
    annotations: PublishedAnnotation[];
    userProgress?: ModuleProgress;
  })[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExercisesQuery {
  exerciseType?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  species?: string;
  mode?: 'practice' | 'review';
  limit?: number;
}

export interface ExercisesResponse {
  exercises: any[]; // Exercise type from exercise.types.ts
  dueCount?: number;
  userProgress?: ProgressStats;
  total: number;
}

// ============================================
// Admin Publishing Types
// ============================================

export interface PublishContentRequest {
  annotationIds: string[];
  moduleId?: string;
  generateExercises?: boolean;
}

export interface PublishContentResponse {
  published: number;
  failed: number;
  exercisesGenerated?: number;
  details: {
    annotationId: string;
    status: 'success' | 'failed';
    error?: string;
    exercisesCreated?: number;
  }[];
}

export interface ContentDashboardStats {
  pending: number;
  approved: number;
  published: number;
  totalExercises: number;
  speciesWithContent: number;
  speciesWithoutContent: number;
  contentGaps: {
    species: string;
    scientificName: string;
    annotationCount: number;
  }[];
}

// ============================================
// Component Props Interfaces
// ============================================

export interface LearningPathSelectorProps {
  modules: LearningModule[];
  selectedModuleId?: string;
  progress: Record<string, ModuleProgress>;
  onSelectModule: (moduleId: string) => void;
  mode?: 'grid' | 'list';
  showRecommendations?: boolean;
}

export interface LessonViewProps {
  lesson: Lesson;
  currentIndex: number;
  totalAnnotations: number;
  onMarkKnown: (annotationId: string) => void;
  onMarkLearning: (annotationId: string) => void;
  onComplete: (results: LessonResults) => void;
  previousProgress?: Record<string, UserTermProgress>;
}

export interface MasteryIndicatorProps {
  level: number; // 0-100
  streak?: number;
  variant?: 'compact' | 'detailed' | 'minimal';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface PracticeModePickerProps {
  dueCount: number;
  onSelectMode: (mode: PracticeMode) => void;
  userStats: ProgressStats;
}

export type PracticeMode =
  | 'quick-quiz'
  | 'review-due'
  | 'by-species'
  | 'by-difficulty'
  | 'by-type';

// ============================================
// Service Interfaces
// ============================================

/**
 * Spaced Repetition Service Interface
 * Implements SM-2 algorithm for optimal review scheduling
 */
export interface ISpacedRepetitionService {
  /**
   * Calculate next review schedule using SM-2 algorithm
   * @param quality - Response quality (0-5)
   * @param currentState - Current SRS state
   * @returns Updated SRS state with new interval
   */
  calculateNextReview(
    quality: SRSQuality,
    currentState: SRSState
  ): SRSState;

  /**
   * Get terms due for review for a user
   * @param userId - User ID
   * @param limit - Maximum terms to return
   * @returns Terms due for review
   */
  getDueTerms(
    userId: string,
    limit?: number
  ): Promise<TermWithProgress[]>;

  /**
   * Record a review result and update SRS state
   * @param userId - User ID
   * @param annotationId - Annotation ID
   * @param correct - Whether answer was correct
   * @param quality - Quality rating (0-5)
   */
  recordReview(
    userId: string,
    annotationId: string,
    correct: boolean,
    quality: SRSQuality
  ): Promise<ReviewResult>;

  /**
   * Get user's overall progress statistics
   * @param userId - User ID
   */
  getProgressStats(userId: string): Promise<ProgressStats>;

  /**
   * Initialize a new term for SRS tracking
   * @param userId - User ID
   * @param annotationId - Annotation ID
   */
  initializeTerm(
    userId: string,
    annotationId: string
  ): Promise<UserTermProgress>;
}

export interface TermWithProgress extends Annotation {
  progress: UserTermProgress;
  daysOverdue?: number;
}

/**
 * Content Publishing Service Interface
 */
export interface IContentPublishingService {
  /**
   * Publish annotations to learning content
   * @param annotationIds - IDs of annotations to publish
   * @param moduleId - Optional module to assign to
   * @param generateExercises - Whether to generate exercises
   */
  publishAnnotations(
    annotationIds: string[],
    moduleId?: string,
    generateExercises?: boolean
  ): Promise<PublishContentResponse>;

  /**
   * Get published content with filters
   * @param filters - Content filters
   */
  getPublishedContent(
    filters: ContentFilters
  ): Promise<LearnContentResponse>;

  /**
   * Generate exercises from annotations
   * @param annotationIds - Annotation IDs
   */
  generateExercisesFromAnnotations(
    annotationIds: string[]
  ): Promise<number>;
}
