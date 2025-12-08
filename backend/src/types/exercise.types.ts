import { Annotation } from './annotation.types';

export type ExerciseType =
  | 'visual_discrimination'
  | 'visual_identification'
  | 'audio_recognition'
  | 'sentence_building'
  | 'cultural_context'
  | 'term_matching'
  | 'contextual_fill'
  | 'image_labeling'
  | 'spatial_identification'
  | 'bounding_box_drawing'
  | 'comparative_analysis'
  | 'annotation_sequencing'
  | 'category_sorting';

export interface ExerciseBase {
  id: string;
  type: ExerciseType;
  instructions: string;
  annotation?: Annotation;
  prompt?: string;
  metadata?: Record<string, unknown>;
}

export interface VisualDiscriminationExercise extends ExerciseBase {
  type: 'visual_discrimination';
  targetTerm: string;
  options: {
    id: string;
    imageUrl: string;
    species: string;
  }[];
  correctOptionId: string;
}

export interface TermMatchingExercise extends ExerciseBase {
  type: 'term_matching';
  spanishTerms: string[];
  englishTerms: string[];
  correctPairs: { spanish: string; english: string }[];
}

export interface ContextualFillExercise extends ExerciseBase {
  type: 'contextual_fill';
  sentence: string; // Contains ___ for blank
  correctAnswer: string;
  options: string[];
}

export interface ImageLabelingExercise extends ExerciseBase {
  type: 'image_labeling';
  imageUrl: string;
  labels: {
    id: string;
    term: string;
    correctPosition: { x: number; y: number };
  }[];
}

export interface VisualIdentificationExercise extends ExerciseBase {
  type: 'visual_identification';
  prompt: string;
  instructions: string;
  metadata?: {
    bird?: string;
    targetPart?: string;
    pronunciation?: string;
    tip?: string;
  };
}

export type Exercise =
  | VisualDiscriminationExercise
  | TermMatchingExercise
  | ContextualFillExercise
  | ImageLabelingExercise
  | VisualIdentificationExercise;

export interface ExerciseResult {
  exerciseId: string;
  exerciseType: ExerciseType;
  userAnswer: unknown;
  isCorrect: boolean;
  timeTaken: number;
  feedback?: string;
}

export interface SessionProgress {
  sessionId: string;
  exercisesCompleted: number;
  correctAnswers: number;
  currentStreak: number;
  startedAt: Date;
}