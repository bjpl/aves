import { Exercise, ExerciseType } from '../../../../shared/types/exercise.types';
import { createMockAnnotation } from './annotations';

export const createMockExercise = (
  type: ExerciseType = 'visual_discrimination',
  overrides: Partial<Exercise> = {}
): Exercise => {
  const baseExercise = {
    id: `ex-${Date.now()}`,
    type,
    instructions: 'Test instructions',
    difficultyLevel: 2,
    createdAt: new Date(),
  };

  switch (type) {
    case 'visual_discrimination':
      return {
        ...baseExercise,
        targetTerm: 'pico',
        options: [
          { id: 'opt-1', imageUrl: '/img1.jpg', label: 'Option 1' },
          { id: 'opt-2', imageUrl: '/img2.jpg', label: 'Option 2' },
          { id: 'opt-3', imageUrl: '/img3.jpg', label: 'Option 3' },
          { id: 'opt-4', imageUrl: '/img4.jpg', label: 'Option 4' },
        ],
        correctOptionId: 'opt-1',
        annotation: createMockAnnotation(),
        ...overrides,
      } as Exercise;

    case 'term_matching':
      return {
        ...baseExercise,
        spanishTerms: ['pico', 'ala', 'cola'],
        englishTerms: ['beak', 'wing', 'tail'],
        correctPairs: [
          { spanish: 'pico', english: 'beak' },
          { spanish: 'ala', english: 'wing' },
          { spanish: 'cola', english: 'tail' },
        ],
        annotation: createMockAnnotation(),
        ...overrides,
      } as Exercise;

    case 'contextual_fill':
      return {
        ...baseExercise,
        sentence: 'El pájaro tiene un ___ amarillo.',
        correctAnswer: 'pico',
        options: ['pico', 'ala', 'cola', 'pata'],
        annotation: createMockAnnotation(),
        ...overrides,
      } as Exercise;

    case 'visual_identification':
      return {
        ...baseExercise,
        imageUrl: '/bird.jpg',
        options: ['pico', 'ala', 'cola', 'pata'],
        correctAnswer: 'pico',
        annotation: createMockAnnotation(),
        ...overrides,
      } as Exercise;

    default:
      return baseExercise as Exercise;
  }
};
