import { ExerciseBase, ExerciseType } from './exercise.types';

// Enhanced exercise types extending the base
export interface EnhancedExercise extends ExerciseBase {
  pedagogicalLevel: 'recognition' | 'comprehension' | 'application' | 'analysis' | 'synthesis';
  learningObjective: string;
  preTeaching?: string;
  scaffolding?: string[];
  culturalNote?: string;
  prompt: string;
  instructions: string;
  metadata?: Record<string, unknown>;
}

// EnhancedExerciseType is now the same as ExerciseType since all types are included
export type EnhancedExerciseType = ExerciseType;