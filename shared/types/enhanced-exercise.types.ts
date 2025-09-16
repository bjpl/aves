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
  metadata?: Record<string, any>;
}

export type EnhancedExerciseType = ExerciseType | 'visual_identification' | 'audio_recognition' | 'sentence_building' | 'cultural_context';