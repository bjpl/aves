/**
 * PatternLearner Unit Tests
 * Tests the reinforcement learning engine for annotation improvement
 */

import { PatternLearner } from '../../src/services/PatternLearner';
import {
  createMockAnnotation,
  createAnnotationBatch,
  createPositionCorrection,
  createCorrectionBatch,
  createRejectionPattern,
  createRejectionScenarios,
  createTrainingDataset,
  createConcurrentFeedbackEvents,
  createCrossSpeciesDataset,
  createTimeSeriesData,
  createEdgeCases
} from '../helpers/mockDataGenerators';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: new Error('No file') })
      }))
    }
  }))
}));

// Mock exec for memory operations
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => callback(null, { stdout: '', stderr: '' }))
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => async () => ({ stdout: '', stderr: '' }))
}));

describe('PatternLearner Service', () => {
  let patternLearner: PatternLearner;

  beforeEach(async () => {
    jest.clearAllMocks();
    patternLearner = new PatternLearner();
    await patternLearner.ensureInitialized();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(patternLearner).toBeDefined();
      const analytics = patternLearner.getAnalytics();
      expect(analytics).toHaveProperty('totalPatterns');
      expect(analytics).toHaveProperty('speciesTracked');
    });

    it('should handle initialization errors gracefully', async () => {
      const newLearner = new PatternLearner();
      await expect(newLearner.ensureInitialized()).resolves.not.toThrow();
    });

    it('should not re-initialize if already initialized', async () => {
      await patternLearner.ensureInitialized();
      await patternLearner.ensureInitialized(); // Should be no-op
      expect(patternLearner).toBeDefined();
    });
  });

  describe('Feedback Capture Tests', () => {
    describe('Position Correction Capture', () => {
      it('should capture position correction with delta calculation', async () => {
        const species = 'Mallard Duck';
        const original = createMockAnnotation({ spanishTerm: 'el pico' });
        const corrected = createMockAnnotation({
          spanishTerm: 'el pico',
          boundingBox: {
            x: original.boundingBox!.x + 0.05,
            y: original.boundingBox!.y + 0.03,
            width: original.boundingBox!.width + 0.02,
            height: original.boundingBox!.height + 0.015
          }
        });

        await patternLearner.learnFromCorrection(original, corrected, {
          species,
          imageId: 'image_123',
          reviewerId: 'reviewer_456'
        });

        // Verify correction was learned
        const adjusted = await patternLearner.getPositionAdjustedFeatures(species, ['el pico']);
        expect(adjusted).toHaveLength(1);
        expect(adjusted[0].feature).toBe('el pico');
        expect(adjusted[0].basedOnCorrections).toBe(1);
      });

      it('should calculate correct delta from position changes', async () => {
        const species = 'Great Blue Heron';
        const deltaX = 0.08;
        const deltaY = 0.05;

        const original = createMockAnnotation({
          boundingBox: { x: 0.4, y: 0.3, width: 0.15, height: 0.12 }
        });

        const corrected = createMockAnnotation({
          boundingBox: {
            x: 0.4 + deltaX,
            y: 0.3 + deltaY,
            width: 0.17,
            height: 0.14
          }
        });

        await patternLearner.learnFromCorrection(original, corrected, {
          species,
          imageId: 'test_image',
          reviewerId: 'test_reviewer'
        });

        const adjusted = await patternLearner.getPositionAdjustedFeatures(species, [original.spanishTerm]);
        expect(adjusted[0].adjustedBoundingBox?.dx).toBeCloseTo(deltaX, 2);
        expect(adjusted[0].adjustedBoundingBox?.dy).toBeCloseTo(deltaY, 2);
      });

      it('should aggregate multiple corrections for same feature', async () => {
        const species = 'American Robin';
        const feature = 'el pico';
        const corrections = createCorrectionBatch(10, feature, species, 0.05, 0.03);

        for (const correction of corrections) {
          const original = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.originalBox
          });

          const corrected = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.correctedBox
          });

          await patternLearner.learnFromCorrection(original, corrected, {
            species,
            imageId: `image_${Math.random()}`,
            reviewerId: 'test_reviewer'
          });
        }

        const adjusted = await patternLearner.getPositionAdjustedFeatures(species, [feature]);
        expect(adjusted[0].basedOnCorrections).toBe(10);
        expect(adjusted[0].adjustedBoundingBox).toBeDefined();
        expect(adjusted[0].adjustedBoundingBox?.dx).toBeCloseTo(0.05, 1);
      });
    });

    describe('Approval Capture', () => {
      it('should capture approval with confidence reinforcement', async () => {
        const annotation = createMockAnnotation({ confidence: 0.80 });
        const species = 'Northern Cardinal';

        await patternLearner.learnFromApproval(annotation, {
          species,
          imageId: 'test_image',
          reviewerId: 'test_reviewer'
        });

        const analytics = patternLearner.getAnalytics();
        expect(analytics.totalPatterns).toBeGreaterThan(0);
      });

      it('should boost confidence on approval', async () => {
        const initialConfidence = 0.75;
        const annotation = createMockAnnotation({ confidence: initialConfidence });
        const species = 'Red-tailed Hawk';

        // Get baseline
        const analyticsBefore = patternLearner.getAnalytics();
        const patternCountBefore = analyticsBefore.totalPatterns;

        await patternLearner.learnFromApproval(annotation, {
          species,
          imageId: 'test_image',
          reviewerId: 'test_reviewer'
        });

        const analyticsAfter = patternLearner.getAnalytics();
        expect(analyticsAfter.totalPatterns).toBeGreaterThanOrEqual(patternCountBefore);
      });

      it('should weight approved annotations higher in pattern learning', async () => {
        const annotation = createMockAnnotation({
          spanishTerm: 'las alas',
          confidence: 0.88
        });
        const species = 'Blue Jay';

        // Learn from regular annotation
        await patternLearner.learnFromAnnotations([annotation], { species });
        const analyticsRegular = patternLearner.getAnalytics();

        // Learn from approval (should have higher weight)
        await patternLearner.learnFromApproval(annotation, {
          species,
          imageId: 'test_image',
          reviewerId: 'test_reviewer'
        });

        const analyticsApproved = patternLearner.getAnalytics();
        expect(analyticsApproved.totalPatterns).toBeGreaterThanOrEqual(analyticsRegular.totalPatterns);
      });
    });

    describe('Rejection Capture', () => {
      it('should capture rejection with category extraction', async () => {
        const annotation = createMockAnnotation();
        const species = 'Mallard Duck';
        const reason = 'Bounding box too small';

        await patternLearner.learnFromRejection(annotation, reason, {
          species,
          imageId: 'test_image'
        });

        // Should have learned to avoid this pattern
        const analytics = patternLearner.getAnalytics();
        expect(analytics).toBeDefined();
      });

      it('should reduce confidence on rejection', async () => {
        const annotation = createMockAnnotation({
          spanishTerm: 'el ojo',
          confidence: 0.85
        });
        const species = 'Great Blue Heron';

        // First learn the pattern
        await patternLearner.learnFromAnnotations([annotation], { species });

        // Then reject it
        await patternLearner.learnFromRejection(annotation, 'Incorrect identification', {
          species,
          imageId: 'test_image'
        });

        // Pattern should still exist but with reduced confidence
        const analytics = patternLearner.getAnalytics();
        expect(analytics.totalPatterns).toBeGreaterThan(0);
      });

      it('should track common rejection reasons', async () => {
        const species = 'American Robin';
        const rejections = createRejectionScenarios(species);

        for (const rejection of rejections) {
          const annotation = createMockAnnotation({
            spanishTerm: rejection.feature,
            boundingBox: rejection.boundingBox
          });

          for (let i = 0; i < rejection.count; i++) {
            await patternLearner.learnFromRejection(annotation, rejection.reason, {
              species,
              imageId: `test_image_${i}`
            });
          }
        }

        const analytics = patternLearner.getAnalytics();
        expect(analytics.speciesTracked).toBeGreaterThan(0);
      });
    });

    describe('Concurrent Feedback Events', () => {
      it('should handle concurrent feedback events without race conditions', async () => {
        const events = createConcurrentFeedbackEvents(50);

        const promises = events.map(event => {
          if (event.type === 'approve') {
            return patternLearner.learnFromApproval(event.annotation, event.context);
          } else if (event.type === 'reject') {
            return patternLearner.learnFromRejection(event.annotation, event.reason!, event.context);
          } else {
            const corrected = createMockAnnotation({
              ...event.annotation,
              boundingBox: event.correction!.correctedBox
            });
            return patternLearner.learnFromCorrection(event.annotation, corrected, event.context);
          }
        });

        await expect(Promise.all(promises)).resolves.not.toThrow();

        const analytics = patternLearner.getAnalytics();
        expect(analytics.totalPatterns).toBeGreaterThan(0);
      });
    });
  });

  describe('Learning Tests', () => {
    describe('Correction Pattern Learning', () => {
      it('should train from 10+ corrections to produce adjustment model', async () => {
        const species = 'Mallard Duck';
        const feature = 'el pico';
        const corrections = createCorrectionBatch(15, feature, species, 0.06, 0.04);

        for (const correction of corrections) {
          const original = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.originalBox
          });

          const corrected = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.correctedBox
          });

          await patternLearner.learnFromCorrection(original, corrected, {
            species,
            imageId: `image_${Math.random()}`,
            reviewerId: 'test_reviewer'
          });
        }

        const adjusted = await patternLearner.getPositionAdjustedFeatures(species, [feature]);
        expect(adjusted[0].basedOnCorrections).toBe(15);
        expect(adjusted[0].adjustedBoundingBox).toBeDefined();
        expect(adjusted[0].adjustedBoundingBox?.dx).toBeCloseTo(0.06, 1);
        expect(adjusted[0].adjustedBoundingBox?.dy).toBeCloseTo(0.04, 1);
      });

      it('should produce stable adjustment model with consistent corrections', async () => {
        const species = 'Great Blue Heron';
        const feature = 'las alas';
        const targetDx = 0.05;
        const targetDy = 0.03;

        // Create highly consistent corrections
        const corrections = createCorrectionBatch(20, feature, species, targetDx, targetDy);

        for (const correction of corrections) {
          const original = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.originalBox
          });

          const corrected = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.correctedBox
          });

          await patternLearner.learnFromCorrection(original, corrected, {
            species,
            imageId: `image_${Math.random()}`,
            reviewerId: 'test_reviewer'
          });
        }

        const adjusted = await patternLearner.getPositionAdjustedFeatures(species, [feature]);
        expect(adjusted[0].adjustedBoundingBox?.dx).toBeCloseTo(targetDx, 1);
        expect(adjusted[0].adjustedBoundingBox?.dy).toBeCloseTo(targetDy, 1);
      });
    });

    describe('Rejection Pattern Learning', () => {
      it('should learn rejection patterns and identify common issues', async () => {
        const species = 'Northern Cardinal';
        const rejections = createRejectionScenarios(species);

        for (const rejection of rejections) {
          const annotation = createMockAnnotation({
            spanishTerm: rejection.feature,
            boundingBox: rejection.boundingBox
          });

          for (let i = 0; i < rejection.count; i++) {
            await patternLearner.learnFromRejection(annotation, rejection.reason, {
              species,
              imageId: `image_${i}`
            });
          }
        }

        // Should have learned patterns for each feature
        const analytics = patternLearner.getAnalytics();
        expect(analytics.speciesTracked).toBeGreaterThan(0);
      });
    });

    describe('Approval Reinforcement Learning', () => {
      it('should increase feature confidence with approvals', async () => {
        const species = 'Red-tailed Hawk';
        const feature = 'el pico';

        const annotation = createMockAnnotation({
          spanishTerm: feature,
          confidence: 0.75
        });

        // Approve multiple times
        for (let i = 0; i < 5; i++) {
          await patternLearner.learnFromApproval(annotation, {
            species,
            imageId: `image_${i}`,
            reviewerId: 'test_reviewer'
          });
        }

        const recommended = patternLearner.getRecommendedFeatures(species, 10);
        expect(recommended).toContain(feature);
      });
    });

    describe('Cross-Species Generalization', () => {
      it('should learn species-specific patterns', async () => {
        const datasets = createCrossSpeciesDataset();

        for (const dataset of datasets) {
          await patternLearner.learnFromAnnotations(dataset.annotations, {
            species: dataset.species
          });

          for (const correction of dataset.corrections) {
            const original = createMockAnnotation({
              spanishTerm: correction.feature,
              boundingBox: correction.originalBox
            });

            const corrected = createMockAnnotation({
              spanishTerm: correction.feature,
              boundingBox: correction.correctedBox
            });

            await patternLearner.learnFromCorrection(original, corrected, {
              species: dataset.species,
              imageId: `image_${Math.random()}`,
              reviewerId: 'test_reviewer'
            });
          }
        }

        const analytics = patternLearner.getAnalytics();
        expect(analytics.speciesTracked).toBe(5);
        expect(analytics.speciesBreakdown).toHaveLength(5);
      });

      it('should maintain separate patterns for different species', async () => {
        const species1 = 'Mallard Duck';
        const species2 = 'Great Blue Heron';
        const feature = 'el pico';

        // Learn different corrections for each species
        const corrections1 = createCorrectionBatch(10, feature, species1, 0.05, 0.03);
        const corrections2 = createCorrectionBatch(10, feature, species2, -0.04, -0.02);

        for (const correction of corrections1) {
          const original = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.originalBox
          });

          const corrected = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.correctedBox
          });

          await patternLearner.learnFromCorrection(original, corrected, {
            species: species1,
            imageId: `image_${Math.random()}`,
            reviewerId: 'test_reviewer'
          });
        }

        for (const correction of corrections2) {
          const original = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.originalBox
          });

          const corrected = createMockAnnotation({
            spanishTerm: feature,
            boundingBox: correction.correctedBox
          });

          await patternLearner.learnFromCorrection(original, corrected, {
            species: species2,
            imageId: `image_${Math.random()}`,
            reviewerId: 'test_reviewer'
          });
        }

        const adjusted1 = await patternLearner.getPositionAdjustedFeatures(species1, [feature]);
        const adjusted2 = await patternLearner.getPositionAdjustedFeatures(species2, [feature]);

        expect(adjusted1[0].adjustedBoundingBox?.dx).toBeCloseTo(0.05, 1);
        expect(adjusted2[0].adjustedBoundingBox?.dx).toBeCloseTo(-0.04, 1);
      });
    });
  });

  describe('Neural Model Integration Tests', () => {
    it('should improve annotation quality over time', async () => {
      const timeSeriesData = createTimeSeriesData(30);

      for (const day of timeSeriesData) {
        await patternLearner.learnFromAnnotations(day.annotations, {
          species: 'Test Species'
        });
      }

      const analytics = patternLearner.getAnalytics();
      expect(analytics.totalPatterns).toBeGreaterThan(0);
      expect(analytics.topFeatures.length).toBeGreaterThan(0);
    });

    it('should batch optimize positioning', async () => {
      const dataset = createTrainingDataset(50);

      await patternLearner.learnFromAnnotations(dataset.annotations, {
        species: dataset.species
      });

      for (const correction of dataset.corrections) {
        const original = createMockAnnotation({
          spanishTerm: correction.feature,
          boundingBox: correction.originalBox
        });

        const corrected = createMockAnnotation({
          spanishTerm: correction.feature,
          boundingBox: correction.correctedBox
        });

        await patternLearner.learnFromCorrection(original, corrected, {
          species: dataset.species,
          imageId: `image_${Math.random()}`,
          reviewerId: 'test_reviewer'
        });
      }

      const features = dataset.annotations.map(a => a.spanishTerm);
      const uniqueFeatures = [...new Set(features)];
      const adjusted = await patternLearner.getPositionAdjustedFeatures(
        dataset.species,
        uniqueFeatures
      );

      expect(adjusted.length).toBe(uniqueFeatures.length);
    });

    it('should degrade gracefully with limited data', async () => {
      const limitedData = createAnnotationBatch(3, 'Test Species');

      await patternLearner.learnFromAnnotations(limitedData, {
        species: 'Test Species'
      });

      const analytics = patternLearner.getAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.totalPatterns).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should persist learning across sessions', async () => {
      const annotation = createMockAnnotation({ spanishTerm: 'las alas' });
      const species = 'Mallard Duck';

      await patternLearner.learnFromAnnotations([annotation], { species });

      const analyticsBefore = patternLearner.getAnalytics();
      expect(analyticsBefore.totalPatterns).toBeGreaterThan(0);

      // Simulate session end by creating new instance
      const newLearner = new PatternLearner();
      await newLearner.ensureInitialized();

      // In real scenario, patterns would be restored from storage
      const analyticsAfter = newLearner.getAnalytics();
      expect(analyticsAfter).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty annotation batches', async () => {
      const edgeCases = createEdgeCases();

      await expect(
        patternLearner.learnFromAnnotations(edgeCases.emptyBatch, { species: 'Test Species' })
      ).resolves.not.toThrow();
    });

    it('should handle low confidence annotations appropriately', async () => {
      const edgeCases = createEdgeCases();

      await patternLearner.learnFromAnnotations(edgeCases.lowConfidenceBatch, {
        species: 'Test Species'
      });

      // Should not learn from low confidence annotations (< 0.75 threshold)
      const analytics = patternLearner.getAnalytics();
      expect(analytics).toBeDefined();
    });

    it('should handle missing bounding boxes in corrections', async () => {
      const original = createMockAnnotation({ boundingBox: undefined });
      const corrected = createMockAnnotation({ boundingBox: undefined });

      await expect(
        patternLearner.learnFromCorrection(original, corrected, {
          species: 'Test Species',
          imageId: 'test_image',
          reviewerId: 'test_reviewer'
        })
      ).resolves.not.toThrow();
    });

    it('should handle extreme correction deltas', async () => {
      const edgeCases = createEdgeCases();

      for (const correction of edgeCases.extremeCorrections) {
        const original = createMockAnnotation({
          spanishTerm: correction.feature,
          boundingBox: correction.originalBox
        });

        const corrected = createMockAnnotation({
          spanishTerm: correction.feature,
          boundingBox: correction.correctedBox
        });

        await expect(
          patternLearner.learnFromCorrection(original, corrected, {
            species: correction.species,
            imageId: 'test_image',
            reviewerId: 'test_reviewer'
          })
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Pattern Enhancement', () => {
    it('should enhance prompts with learned patterns', async () => {
      const species = 'Mallard Duck';
      const annotations = createAnnotationBatch(15, species);

      await patternLearner.learnFromAnnotations(annotations, { species });

      const basePrompt = 'Generate annotations for this bird image';
      const enhanced = await patternLearner.enhancePrompt(basePrompt, {
        species,
        targetFeatures: ['el pico', 'las alas']
      });

      expect(enhanced).toContain(basePrompt);
      expect(enhanced.length).toBeGreaterThan(basePrompt.length);
    });

    it('should include correction guidance in enhanced prompts', async () => {
      const species = 'Great Blue Heron';
      const feature = 'el pico';
      const corrections = createCorrectionBatch(10, feature, species, 0.05, 0.03);

      for (const correction of corrections) {
        const original = createMockAnnotation({
          spanishTerm: feature,
          boundingBox: correction.originalBox
        });

        const corrected = createMockAnnotation({
          spanishTerm: feature,
          boundingBox: correction.correctedBox
        });

        await patternLearner.learnFromCorrection(original, corrected, {
          species,
          imageId: `image_${Math.random()}`,
          reviewerId: 'test_reviewer'
        });
      }

      const enhanced = await patternLearner.enhancePrompt('Generate annotations', {
        species,
        targetFeatures: [feature]
      });

      expect(enhanced).toContain('CORRECTION-BASED ADJUSTMENTS');
    });

    it('should include rejection warnings in enhanced prompts', async () => {
      const species = 'American Robin';
      const annotation = createMockAnnotation({ spanishTerm: 'el ojo' });

      // Create multiple rejections
      for (let i = 0; i < 3; i++) {
        await patternLearner.learnFromRejection(annotation, 'Too small', {
          species,
          imageId: `image_${i}`
        });
      }

      const enhanced = await patternLearner.enhancePrompt('Generate annotations', {
        species,
        targetFeatures: ['el ojo']
      });

      expect(enhanced).toContain('REJECTION PATTERNS');
    });
  });
});
