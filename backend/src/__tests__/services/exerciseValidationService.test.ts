/**
 * Exercise Validation Service Tests
 *
 * Tests validation logic for all exercise types including:
 * - Term matching with partial credit
 * - Spatial identification with distance-based scoring
 * - Category sorting accuracy
 * - Audio recognition and sentence building
 */

import { ExerciseValidationService } from '../../services/exerciseValidationService';
import { TermMatchingExercise } from '../../types/exercise.types';
import {
  SpatialIdentificationExercise,
  CategorySortingExercise,
  ComparativeAnalysisExercise
} from '../../../../shared/types/enhanced-exercise.types';

describe('ExerciseValidationService', () => {
  let validationService: ExerciseValidationService;

  beforeEach(() => {
    validationService = new ExerciseValidationService();
  });

  describe('Term Matching Validation', () => {
    const exercise: TermMatchingExercise = {
      id: 'tm-1',
      type: 'term_matching',
      instructions: 'Match the terms',
      spanishTerms: ['el pico', 'las plumas', 'las alas'],
      englishTerms: ['beak', 'feathers', 'wings'],
      correctPairs: [
        { spanish: 'el pico', english: 'beak' },
        { spanish: 'las plumas', english: 'feathers' },
        { spanish: 'las alas', english: 'wings' }
      ]
    };

    it('should validate all correct pairs', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'term_matching',
        userAnswer: {
          pairs: [
            { spanish: 'el pico', english: 'beak' },
            { spanish: 'las plumas', english: 'feathers' },
            { spanish: 'las alas', english: 'wings' }
          ]
        },
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.feedback).toContain('All pairs matched correctly');
      expect(result.metadata?.matchedPairs).toBe(3);
    });

    it('should give partial credit for some correct pairs', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'term_matching',
        userAnswer: {
          pairs: [
            { spanish: 'el pico', english: 'beak' },
            { spanish: 'las plumas', english: 'wings' }, // Wrong
            { spanish: 'las alas', english: 'feathers' } // Wrong
          ]
        },
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBeCloseTo(1 / 3);
      expect(result.metadata?.matchedPairs).toBe(1);
    });

    it('should handle invalid answer format', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'term_matching',
        userAnswer: null,
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Spatial Identification Validation', () => {
    const exercise: SpatialIdentificationExercise = {
      id: 'si-1',
      type: 'spatial_identification',
      instructions: 'Click on the beak',
      imageUrl: 'https://example.com/bird.jpg',
      imageId: 'img-1',
      prompt: 'Where is el pico?',
      tolerance: 0.15,
      targetAnnotation: {
        id: 'ann-1',
        imageId: 'img-1',
        boundingBox: {
          x: 0.4, // Center at 0.5
          y: 0.3, // Center at 0.4
          width: 0.2,
          height: 0.2
        },
        type: 'anatomical',
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        difficultyLevel: 2,
        isVisible: true
      },
      metadata: {
        targetFeature: 'beak',
        difficulty: 2,
        annotationType: 'anatomical'
      }
    };

    it('should validate click near center of target', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'spatial_identification',
        userAnswer: { x: 0.5, y: 0.4 }, // Exact center
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.feedback).toContain('accurate');
      expect(result.metadata?.clickDistance).toBeDefined();
    });

    it('should validate click within tolerance', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'spatial_identification',
        userAnswer: { x: 0.55, y: 0.45 }, // Within tolerance
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should reject click outside tolerance', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'spatial_identification',
        userAnswer: { x: 0.8, y: 0.8 }, // Far away
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain('Not quite');
    });

    it('should reject invalid coordinates', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'spatial_identification',
        userAnswer: { x: 1.5, y: -0.1 }, // Out of bounds
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Category Sorting Validation', () => {
    const exercise: CategorySortingExercise = {
      id: 'cs-1',
      type: 'category_sorting',
      instructions: 'Sort by type',
      prompt: 'Categorize these features',
      terms: [
        { id: 't1', term: 'el pico' },
        { id: 't2', term: 'rojo' },
        { id: 't3', term: 'las alas' },
        { id: 't4', term: 'azul' }
      ],
      categories: [
        { id: 'c1', name: 'Anatomy', label: 'Anatomical', acceptedTermIds: ['t1', 't3'] },
        { id: 'c2', name: 'Color', label: 'Color', acceptedTermIds: ['t2', 't4'] }
      ],
      metadata: {
        difficulty: 2,
        annotationsUsed: ['ann-1', 'ann-2']
      }
    };

    it('should validate all correct assignments', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'category_sorting',
        userAnswer: {
          assignments: {
            t1: 'c1', // el pico -> Anatomy
            t2: 'c2', // rojo -> Color
            t3: 'c1', // las alas -> Anatomy
            t4: 'c2'  // azul -> Color
          }
        },
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.metadata?.categoriesCorrect).toBe(4);
    });

    it('should give partial credit for some correct', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'category_sorting',
        userAnswer: {
          assignments: {
            t1: 'c1', // Correct
            t2: 'c1', // Wrong
            t3: 'c1', // Correct
            t4: 'c2'  // Correct
          }
        },
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0.75);
      expect(result.metadata?.categoriesCorrect).toBe(3);
    });
  });

  describe('Audio Recognition Validation', () => {
    const exercise = {
      correctOptionId: 'opt-2'
    };

    it('should validate correct option selection', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'audio_recognition',
        userAnswer: {
          selectedOptionId: 'opt-2',
          playCount: 2
        },
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.metadata?.playCount).toBe(2);
    });

    it('should reject incorrect selection', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'audio_recognition',
        userAnswer: {
          selectedOptionId: 'opt-1'
        },
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Sentence Building Validation', () => {
    const exercise = {
      targetSentence: 'El pájaro tiene plumas rojas'
    };

    it('should validate correct word order', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'sentence_building',
        userAnswer: {
          words: ['El', 'pájaro', 'tiene', 'plumas', 'rojas']
        },
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.metadata?.correctSequence).toBe(true);
    });

    it('should give partial credit for partially correct order', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'sentence_building',
        userAnswer: {
          words: ['El', 'pájaro', 'plumas', 'tiene', 'rojas'] // El(✓), pájaro(✓), plumas(✗), tiene(✗), rojas(✓) = 3/5
        },
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBeCloseTo(0.6); // 3/5 - El, pájaro, and rojas are in correct positions
    });

    it('should handle case-insensitive comparison', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'sentence_building',
        userAnswer: {
          words: ['el', 'pájaro', 'tiene', 'plumas', 'rojas']
        },
        exercise
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Comparative Analysis Validation', () => {
    const exercise: ComparativeAnalysisExercise = {
      id: 'ca-1',
      type: 'comparative_analysis',
      instructions: 'Compare the features',
      prompt: 'Which bird has the longest beak?',
      compareFeature: 'anatomical',
      images: [
        {
          id: 'img-1',
          url: 'https://example.com/bird1.jpg',
          speciesName: 'Hummingbird',
          relevantAnnotations: []
        },
        {
          id: 'img-2',
          url: 'https://example.com/bird2.jpg',
          speciesName: 'Toucan',
          relevantAnnotations: []
        }
      ],
      correctAnswerId: 'img-2',
      metadata: {
        difficulty: 3,
        annotationsUsed: ['ann-1', 'ann-2']
      }
    };

    it('should validate correct comparison', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'comparative_analysis',
        userAnswer: {
          selectedImageId: 'img-2'
        },
        exercise
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should reject incorrect comparison', () => {
      const result = validationService.validateExerciseResult({
        exerciseType: 'comparative_analysis',
        userAnswer: {
          selectedImageId: 'img-1'
        },
        exercise
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('should calculate accuracy percentage', () => {
      const result = {
        isValid: true,
        score: 0.857,
        feedback: 'Good'
      };

      const accuracy = validationService.calculateAccuracy(result);
      expect(accuracy).toBe(86);
    });

    it('should check if result meets threshold', () => {
      const passingResult = {
        isValid: true,
        score: 0.75,
        feedback: 'Pass'
      };

      const failingResult = {
        isValid: false,
        score: 0.65,
        feedback: 'Fail'
      };

      expect(validationService.meetsThreshold(passingResult, 0.7)).toBe(true);
      expect(validationService.meetsThreshold(failingResult, 0.7)).toBe(false);
    });
  });
});
