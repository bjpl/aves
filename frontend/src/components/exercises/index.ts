// CONCEPT: Exercise component exports
// WHY: Centralized export point for all exercise-related components
// PATTERN: Barrel exports for cleaner imports

// Container components
export { ExerciseContainer } from './ExerciseContainer';
export { AIExerciseContainer } from './AIExerciseContainer';
export type { AIExerciseContainerProps } from './AIExerciseContainer';

// Core exercise components
export { VisualDiscrimination } from './VisualDiscrimination';
export { VisualIdentification } from './VisualIdentification';
export { ContextualFill } from './ContextualFill';

// New exercise types with Spanish/bird vocabulary focus
export { TermMatchingExercise } from './TermMatchingExercise';
export { AudioRecognitionExercise } from './AudioRecognitionExercise';
export { SentenceBuildingExercise } from './SentenceBuildingExercise';
export { CategorySortingExercise } from './CategorySortingExercise';
export { SpatialIdentificationExercise } from './SpatialIdentificationExercise';
export { ComparativeAnalysisExercise } from './ComparativeAnalysisExercise';

// Exercise generator
export { EnhancedExerciseGenerator } from './EnhancedExerciseGenerator';
export type {
  Exercise,
  ExerciseType,
  BaseExercise,
  TermMatchingExercise as TermMatchingExerciseType,
  AudioRecognitionExercise as AudioRecognitionExerciseType,
  SentenceBuildingExercise as SentenceBuildingExerciseType,
  CategorySortingExercise as CategorySortingExerciseType,
  SpatialIdentificationExercise as SpatialIdentificationExerciseType,
  ComparativeAnalysisExercise as ComparativeAnalysisExerciseType,
} from './EnhancedExerciseGenerator';
