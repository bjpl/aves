import { ExerciseBase, ExerciseType } from './exercise.types';
import { Annotation, BoundingBox } from './annotation.types';

// ============================================================================
// ENHANCED PEDAGOGICAL EXERCISE BASE
// ============================================================================

export interface EnhancedExercise extends ExerciseBase {
  pedagogicalLevel: 'recognition' | 'comprehension' | 'application' | 'analysis' | 'synthesis';
  learningObjective: string;
  preTeaching?: string;
  scaffolding?: string[];
  culturalNote?: string;
  prompt: string;
  instructions: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// NEW SPATIAL & INTERACTIVE EXERCISE TYPES
// ============================================================================

/**
 * Spatial Identification Exercise
 * User clicks on image where feature is located (uses bounding box validation)
 */
export interface SpatialIdentificationExercise extends ExerciseBase {
  type: 'spatial_identification';
  imageUrl: string;
  imageId: string;
  prompt: string;
  targetAnnotation: Annotation;
  tolerance: number; // Click tolerance (0.0-1.0)
  hints?: {
    after5Seconds?: string;
    boundingBoxHint?: boolean;
  };
  metadata: {
    targetFeature: string;
    difficulty: number;
    annotationType: string;
  };
}

/**
 * Bounding Box Drawing Exercise
 * User draws box around feature (validated using IoU)
 */
export interface BoundingBoxDrawingExercise extends ExerciseBase {
  type: 'bounding_box_drawing';
  imageUrl: string;
  imageId: string;
  prompt: string;
  targetFeature: string;
  correctBoundingBox: BoundingBox;
  minOverlap: number; // Minimum IoU required
  difficulty: number;
  metadata: {
    targetAnnotation: Annotation;
    showGuides?: boolean;
  };
}

/**
 * Comparative Analysis Exercise
 * Compare features across multiple bird images
 */
export interface ComparativeAnalysisExercise extends ExerciseBase {
  type: 'comparative_analysis';
  prompt: string;
  compareFeature: 'color' | 'size' | 'pattern' | 'anatomical';
  images: {
    id: string;
    url: string;
    speciesName: string;
    relevantAnnotations: Annotation[];
  }[];
  correctAnswerId: string;
  explanation?: string;
  metadata: {
    difficulty: number;
    annotationsUsed: string[];
  };
}

/**
 * Annotation Sequencing Exercise
 * Order annotations by position, difficulty, or category
 */
export interface AnnotationSequencingExercise extends ExerciseBase {
  type: 'annotation_sequencing';
  imageUrl: string;
  prompt: string;
  annotations: Annotation[];
  sequenceType: 'spatial_vertical' | 'spatial_horizontal' | 'difficulty' | 'category';
  correctOrder: string[];
  metadata: {
    difficulty: number;
    hints?: string[];
  };
}

/**
 * Category Sorting Exercise
 * Sort annotation terms into categories
 */
export interface CategorySortingExercise extends ExerciseBase {
  type: 'category_sorting';
  prompt: string;
  terms: {
    id: string;
    term: string;
    annotation?: Annotation;
  }[];
  categories: {
    id: string;
    name: string;
    label: string;
    acceptedTermIds: string[];
  }[];
  allowMultipleCategories?: boolean;
  metadata: {
    difficulty: number;
    annotationsUsed: string[];
  };
}

// ============================================================================
// EXERCISE SELECTION & MASTERY TRACKING
// ============================================================================

export interface ExerciseSelectionStrategy {
  prioritizeWeakAnnotations: boolean;
  focusTypes?: ('anatomical' | 'behavioral' | 'color' | 'pattern')[];
  difficultyRange: [number, number];
  exerciseTypeWeights?: Partial<Record<string, number>>;
  includeNewAnnotations: boolean;
  maxRepetitionsPerSession?: number;
  useSpacedRepetition: boolean;
}

export interface AnnotationMastery {
  annotationId: string;
  userId: string;
  exposureCount: number;
  correctCount: number;
  incorrectCount: number;
  masteryScore: number; // 0.0 to 1.0
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  lastSeenAt: Date;
  nextReviewAt?: Date;
}

export interface EnhancedExerciseResult {
  exerciseId: string;
  exerciseType: string;
  userId: string;
  sessionId: string;
  annotationsUsed: {
    annotationId: string;
    role: 'target' | 'distractor' | 'context';
    wasCorrect?: boolean;
  }[];
  userAnswer: any;
  isCorrect: boolean;
  partialCredit?: number;
  timeTaken: number;
  attemptsCount: number;
  hintsUsed: number;
  clickAccuracy?: number;
  boundingBoxIoU?: number;
  feedback?: string;
  explanation?: string;
  timestamp: Date;
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type EnhancedExerciseType = ExerciseType |
  'spatial_identification' |
  'bounding_box_drawing' |
  'comparative_analysis' |
  'annotation_sequencing' |
  'category_sorting';

export type AllExerciseTypes =
  | EnhancedExercise
  | SpatialIdentificationExercise
  | BoundingBoxDrawingExercise
  | ComparativeAnalysisExercise
  | AnnotationSequencingExercise
  | CategorySortingExercise;