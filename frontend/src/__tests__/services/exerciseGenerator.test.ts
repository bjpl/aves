import { describe, it, expect, beforeEach } from 'vitest';
import { ExerciseGenerator } from '../../services/exerciseGenerator';
import { Annotation } from '../../../../shared/types/annotation.types';

describe('ExerciseGenerator', () => {
  let mockAnnotations: Annotation[];
  let generator: ExerciseGenerator;

  beforeEach(() => {
    mockAnnotations = [
      {
        id: '1',
        imageId: 'img1',
        spanishTerm: 'pico',
        englishTerm: 'beak',
        type: 'anatomical',
        boundingBox: {
          topLeft: { x: 100, y: 100 },
          bottomRight: { x: 150, y: 150 },
          width: 50,
          height: 50
        },
        difficultyLevel: 2,
        isVisible: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: '2',
        imageId: 'img1',
        spanishTerm: 'ala',
        englishTerm: 'wing',
        type: 'anatomical',
        boundingBox: {
          topLeft: { x: 200, y: 200 },
          bottomRight: { x: 300, y: 280 },
          width: 100,
          height: 80
        },
        difficultyLevel: 2,
        isVisible: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: '3',
        imageId: 'img1',
        spanishTerm: 'cola',
        englishTerm: 'tail',
        type: 'anatomical',
        boundingBox: {
          topLeft: { x: 300, y: 300 },
          bottomRight: { x: 360, y: 390 },
          width: 60,
          height: 90
        },
        difficultyLevel: 3,
        isVisible: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: '4',
        imageId: 'img1',
        spanishTerm: 'pata',
        englishTerm: 'leg',
        type: 'anatomical',
        boundingBox: {
          topLeft: { x: 150, y: 350 },
          bottomRight: { x: 190, y: 450 },
          width: 40,
          height: 100
        },
        difficultyLevel: 2,
        isVisible: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];
    generator = new ExerciseGenerator(mockAnnotations);
  });

  describe('generateExercise', () => {
    it('should generate visual discrimination exercise', () => {
      const exercise = generator.generateExercise('visual_discrimination');

      expect(exercise).not.toBeNull();
      expect(exercise?.type).toBe('visual_discrimination');
      expect(exercise).toHaveProperty('targetTerm');
      expect(exercise).toHaveProperty('options');
      expect(exercise).toHaveProperty('correctOptionId');
    });

    it('should generate term matching exercise', () => {
      const exercise = generator.generateExercise('term_matching');

      expect(exercise).not.toBeNull();
      expect(exercise?.type).toBe('term_matching');
      expect(exercise).toHaveProperty('spanishTerms');
      expect(exercise).toHaveProperty('englishTerms');
      expect(exercise).toHaveProperty('correctPairs');
    });

    it('should generate contextual fill exercise', () => {
      const exercise = generator.generateExercise('contextual_fill');

      expect(exercise).not.toBeNull();
      expect(exercise?.type).toBe('contextual_fill');
      expect(exercise).toHaveProperty('sentence');
      expect(exercise).toHaveProperty('correctAnswer');
      expect(exercise).toHaveProperty('options');
    });

    it('should return null for unknown exercise type', () => {
      const exercise = generator.generateExercise('invalid_type' as any);
      expect(exercise).toBeNull();
    });
  });

  describe('generateVisualDiscrimination', () => {
    it('should return null if less than 4 annotations', () => {
      const smallGenerator = new ExerciseGenerator(mockAnnotations.slice(0, 3));
      const exercise = smallGenerator.generateExercise('visual_discrimination');
      expect(exercise).toBeNull();
    });

    it('should include correct number of options', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      if (exercise && exercise.type === 'visual_discrimination') {
        expect(exercise.options).toHaveLength(4);
      }
    });

    it('should have correctOptionId matching one of the options', () => {
      const exercise = generator.generateExercise('visual_discrimination') as any;
      const optionIds = exercise.options.map((opt: any) => opt.id);
      expect(optionIds).toContain(exercise.correctOptionId);
    });

    it('should have Spanish instructions', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      expect(exercise?.instructions).toMatch(/¿Cuál imagen muestra:/);
    });
  });

  describe('generateTermMatching', () => {
    it('should return null if less than 4 annotations', () => {
      const smallGenerator = new ExerciseGenerator(mockAnnotations.slice(0, 2));
      const exercise = smallGenerator.generateExercise('term_matching');
      expect(exercise).toBeNull();
    });

    it('should have equal number of Spanish and English terms', () => {
      const exercise = generator.generateExercise('term_matching') as any;
      expect(exercise.spanishTerms).toHaveLength(exercise.englishTerms.length);
    });

    it('should have correct pairs matching selected terms', () => {
      const exercise = generator.generateExercise('term_matching') as any;

      exercise.correctPairs.forEach((pair: any) => {
        expect(exercise.spanishTerms).toContain(pair.spanish);
        expect(exercise.englishTerms).toContain(pair.english);
      });
    });
  });

  describe('generateContextualFill', () => {
    it('should return null if less than 4 annotations', () => {
      const smallGenerator = new ExerciseGenerator(mockAnnotations.slice(0, 1));
      const exercise = smallGenerator.generateExercise('contextual_fill');
      expect(exercise).toBeNull();
    });

    it('should have sentence with blank (___)', () => {
      const exercise = generator.generateExercise('contextual_fill') as any;
      expect(exercise.sentence).toMatch(/___/);
    });

    it('should have options including the correct answer', () => {
      const exercise = generator.generateExercise('contextual_fill') as any;
      expect(exercise.options).toContain(exercise.correctAnswer);
    });

    it('should have at least 2 options', () => {
      const exercise = generator.generateExercise('contextual_fill') as any;
      expect(exercise.options.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('checkAnswer - static method', () => {
    it('should validate visual discrimination answers correctly', () => {
      const exercise: any = {
        type: 'visual_discrimination',
        correctOptionId: '1'
      };

      expect(ExerciseGenerator.checkAnswer(exercise, '1')).toBe(true);
      expect(ExerciseGenerator.checkAnswer(exercise, '2')).toBe(false);
    });

    it('should validate term matching answers correctly', () => {
      const exercise: any = {
        type: 'term_matching',
        correctPairs: [
          { spanish: 'pico', english: 'beak' },
          { spanish: 'ala', english: 'wing' }
        ]
      };

      const correctAnswer = [
        { spanish: 'pico', english: 'beak' },
        { spanish: 'ala', english: 'wing' }
      ];

      const incorrectAnswer = [
        { spanish: 'pico', english: 'wing' },
        { spanish: 'ala', english: 'beak' }
      ];

      expect(ExerciseGenerator.checkAnswer(exercise, correctAnswer)).toBe(true);
      expect(ExerciseGenerator.checkAnswer(exercise, incorrectAnswer)).toBe(false);
    });

    it('should validate contextual fill answers correctly', () => {
      const exercise: any = {
        type: 'contextual_fill',
        correctAnswer: 'pico'
      };

      expect(ExerciseGenerator.checkAnswer(exercise, 'pico')).toBe(true);
      expect(ExerciseGenerator.checkAnswer(exercise, 'ala')).toBe(false);
    });

    it('should return false for unknown exercise types', () => {
      const exercise: any = {
        type: 'unknown_type'
      };

      expect(ExerciseGenerator.checkAnswer(exercise, 'anything')).toBe(false);
    });
  });

  describe('generateFeedback - static method', () => {
    it('should return positive Spanish feedback for correct answers', () => {
      const exercise: any = { type: 'visual_discrimination' };
      const feedback = ExerciseGenerator.generateFeedback(true, exercise);

      const positives = ['¡Excelente!', '¡Muy bien!', '¡Correcto!', '¡Perfecto!'];
      expect(positives).toContain(feedback);
    });

    it('should return target term for incorrect visual discrimination', () => {
      const exercise: any = {
        type: 'visual_discrimination',
        targetTerm: 'pico'
      };
      const feedback = ExerciseGenerator.generateFeedback(false, exercise);

      expect(feedback).toContain('pico');
    });

    it('should return correct answer for incorrect contextual fill', () => {
      const exercise: any = {
        type: 'contextual_fill',
        correctAnswer: 'ala'
      };
      const feedback = ExerciseGenerator.generateFeedback(false, exercise);

      expect(feedback).toContain('ala');
    });

    it('should return generic message for other incorrect types', () => {
      const exercise: any = {
        type: 'term_matching'
      };
      const feedback = ExerciseGenerator.generateFeedback(false, exercise);

      expect(feedback).toBe('Incorrect. Try again!');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty annotations array', () => {
      const emptyGenerator = new ExerciseGenerator([]);

      expect(emptyGenerator.generateExercise('visual_discrimination')).toBeNull();
      expect(emptyGenerator.generateExercise('term_matching')).toBeNull();
      expect(emptyGenerator.generateExercise('contextual_fill')).toBeNull();
    });

    it('should generate unique exercise IDs', async () => {
      const exercise1 = generator.generateExercise('visual_discrimination');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const exercise2 = generator.generateExercise('visual_discrimination');

      expect(exercise1).not.toBeNull();
      expect(exercise2).not.toBeNull();
      expect(exercise1?.id).not.toBe(exercise2?.id);
    });

    it('should randomize option order', () => {
      const exercises = Array.from({ length: 10 }, () =>
        generator.generateExercise('visual_discrimination') as any
      );

      const firstOptions = exercises.map(ex => ex.options[0].id);
      const uniqueFirstOptions = new Set(firstOptions);

      // With 10 exercises, we should have some variation in first option
      expect(uniqueFirstOptions.size).toBeGreaterThan(1);
    });
  });
});
