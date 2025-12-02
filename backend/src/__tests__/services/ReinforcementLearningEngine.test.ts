/**
 * Tests for Reinforcement Learning Engine
 * Covers feedback capture, position corrections, and rejection analytics
 */

import {
  ReinforcementLearningEngine,
  FeedbackData,
  extractRejectionCategory
} from '../../services/ReinforcementLearningEngine';
import { pool } from '../../database/connection';

// Mock dependencies
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../services/PatternLearner', () => ({
  patternLearner: {
    learnFromApproval: jest.fn(),
    learnFromRejection: jest.fn(),
    learnFromCorrection: jest.fn()
  }
}));

describe('ReinforcementLearningEngine', () => {
  let rlEngine: ReinforcementLearningEngine;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    rlEngine = new ReinforcementLearningEngine();
    mockQuery = pool.query as jest.Mock;
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('captureFeedback', () => {
    it('should capture approval feedback', async () => {
      const feedback: FeedbackData = {
        type: 'approve',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          confidence: 0.9
        },
        userId: 'user-456',
        metadata: {
          species: 'Cardenal Rojo',
          imageId: 'img-789',
          feature: 'el pico'
        }
      };

      await rlEngine.captureFeedback(feedback);

      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls.find(call =>
        call[0].includes('feedback_metrics')
      );
      expect(queryCall).toBeDefined();
    });

    it('should capture rejection feedback', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          confidence: 0.7,
          bounding_box: { x: 100, y: 150, width: 50, height: 40 }
        },
        rejectionReason: 'Incorrect species identification',
        userId: 'user-456',
        metadata: {
          species: 'Cardenal Rojo',
          imageId: 'img-789'
        }
      };

      await rlEngine.captureFeedback(feedback);

      expect(mockQuery).toHaveBeenCalled();

      // Should insert rejection pattern
      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );
      expect(rejectionCall).toBeDefined();

      // Should update metrics
      const metricsCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_rate')
      );
      expect(metricsCall).toBeDefined();
    });

    it('should capture position correction feedback', async () => {
      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          bounding_box: { x: 100, y: 150, width: 50, height: 40 }
        },
        correctedData: {
          bounding_box: { x: 110, y: 160, width: 55, height: 42 }
        },
        userId: 'user-456',
        metadata: {
          species: 'Cardenal Rojo',
          imageId: 'img-789',
          feature: 'el pico'
        }
      };

      await rlEngine.captureFeedback(feedback);

      expect(mockQuery).toHaveBeenCalled();

      // Should insert correction
      const correctionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('annotation_corrections')
      );
      expect(correctionCall).toBeDefined();

      // Should update positioning model
      const positioningCall = mockQuery.mock.calls.find(call =>
        call[0].includes('positioning_model')
      );
      expect(positioningCall).toBeDefined();
    });

    it('should handle missing metadata gracefully', async () => {
      const feedback: FeedbackData = {
        type: 'approve',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature'
        },
        userId: 'user-456'
        // No metadata
      };

      await expect(rlEngine.captureFeedback(feedback)).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const feedback: FeedbackData = {
        type: 'approve',
        annotationId: 'ann-123',
        originalData: {},
        userId: 'user-456'
      };

      // Should not throw even if database fails
      await expect(rlEngine.captureFeedback(feedback)).resolves.not.toThrow();
    });
  });

  describe('position correction handling', () => {
    it('should calculate position deltas correctly', async () => {
      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          bounding_box: { x: 100, y: 150, width: 50, height: 40 }
        },
        correctedData: {
          bounding_box: { x: 120, y: 170, width: 60, height: 45 }
        },
        userId: 'user-456',
        metadata: {
          species: 'Test Species',
          imageId: 'img-123',
          feature: 'test feature'
        }
      };

      await rlEngine.captureFeedback(feedback);

      const correctionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('annotation_corrections')
      );

      expect(correctionCall).toBeDefined();

      // Verify delta calculations
      const params = correctionCall![1];
      expect(params).toContain(20); // deltaX: 120 - 100
      expect(params).toContain(20); // deltaY: 170 - 150
      expect(params).toContain(10); // deltaWidth: 60 - 50
      expect(params).toContain(5);  // deltaHeight: 45 - 40
    });

    it('should skip correction if bounding boxes missing', async () => {
      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature'
          // No bounding box
        },
        correctedData: {
          // No bounding box
        },
        userId: 'user-456',
        metadata: {
          species: 'Test',
          imageId: 'img-123'
        }
      };

      await rlEngine.captureFeedback(feedback);

      // Should not insert correction
      const correctionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('annotation_corrections')
      );
      expect(correctionCall).toBeUndefined();
    });

    it('should calculate correction magnitude', async () => {
      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          bounding_box: { x: 0, y: 0, width: 10, height: 10 }
        },
        correctedData: {
          bounding_box: { x: 3, y: 4, width: 10, height: 10 }
        },
        userId: 'user-456',
        metadata: {
          species: 'Test',
          imageId: 'img-123'
        }
      };

      await rlEngine.captureFeedback(feedback);

      const magnitudeCall = mockQuery.mock.calls.find(call =>
        call[0].includes('avg_correction_magnitude')
      );

      expect(magnitudeCall).toBeDefined();

      // Magnitude should be sqrt(3^2 + 4^2 + 0 + 0) = 5
      const magnitude = magnitudeCall![1].find((param: number) =>
        typeof param === 'number' && param === 5
      );
      expect(magnitude).toBe(5);
    });
  });

  describe('rejection categorization', () => {
    it('should categorize species-related rejections', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Wrong bird species identified',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall).toBeDefined();
      expect(rejectionCall![1]).toContain('incorrect_species');
    });

    it('should categorize feature-related rejections', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Incorrect feature identified',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('incorrect_feature');
    });

    it('should categorize localization rejections', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Poor bounding box localization',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('poor_localization');
    });

    it('should categorize false positives', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Feature not found in image',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('false_positive');
    });

    it('should categorize duplicates', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Duplicate annotation',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('duplicate');
    });

    it('should categorize quality issues', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Image too blurry',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('low_quality');
    });

    it('should default to "other" for unknown reasons', async () => {
      const feedback: FeedbackData = {
        type: 'reject',
        annotationId: 'ann-123',
        originalData: { annotation_type: 'feature' },
        rejectionReason: 'Some random reason',
        userId: 'user-456',
        metadata: { species: 'Test', imageId: 'img-123' }
      };

      await rlEngine.captureFeedback(feedback);

      const rejectionCall = mockQuery.mock.calls.find(call =>
        call[0].includes('rejection_patterns')
      );

      expect(rejectionCall![1]).toContain('other');
    });
  });

  describe('getPositioningAdjustments', () => {
    it('should return adjustments when sufficient samples exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          avg_delta_x: 10.5,
          avg_delta_y: 15.2,
          avg_delta_width: 5.0,
          avg_delta_height: 3.5,
          confidence: 0.85,
          sample_count: 10
        }]
      });

      const adjustments = await rlEngine.getPositioningAdjustments(
        'Cardenal Rojo',
        'el pico'
      );

      expect(adjustments).not.toBeNull();
      expect(adjustments!.deltaX).toBe(10.5);
      expect(adjustments!.deltaY).toBe(15.2);
      expect(adjustments!.deltaWidth).toBe(5.0);
      expect(adjustments!.deltaHeight).toBe(3.5);
      expect(adjustments!.confidence).toBe(0.85);
    });

    it('should return null when insufficient samples', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const adjustments = await rlEngine.getPositioningAdjustments(
        'Unknown Species',
        'unknown feature'
      );

      expect(adjustments).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const adjustments = await rlEngine.getPositioningAdjustments(
        'Test Species',
        'test feature'
      );

      expect(adjustments).toBeNull();
    });
  });

  describe('getRejectionAnalytics', () => {
    it('should return rejection analytics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            rejection_category: 'poor_localization',
            species: 'Cardenal Rojo',
            feature_type: 'el pico',
            count: '15',
            avg_confidence: '0.72'
          },
          {
            rejection_category: 'incorrect_species',
            species: 'Azulejo',
            feature_type: 'las alas',
            count: '8',
            avg_confidence: '0.65'
          }
        ]
      });

      const analytics = await rlEngine.getRejectionAnalytics('30days');

      expect(Array.isArray(analytics)).toBe(true);
      expect(analytics).toHaveLength(2);
      expect(analytics[0].rejection_category).toBe('poor_localization');
      expect(analytics[0].count).toBe('15');
    });

    it('should return empty array on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const analytics = await rlEngine.getRejectionAnalytics('30days');

      expect(analytics).toEqual([]);
    });

    it('should use default time window', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await rlEngine.getRejectionAnalytics();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'"),
        undefined
      );
    });
  });

  describe('extractRejectionCategory helper', () => {
    it('should extract explicit category tags', () => {
      expect(extractRejectionCategory('[INCORRECT_SPECIES] wrong bird'))
        .toBe('incorrect_species');

      expect(extractRejectionCategory('[POOR_LOCALIZATION] bad box'))
        .toBe('poor_localization');
    });

    it('should infer category from content', () => {
      expect(extractRejectionCategory('This is the wrong bird species'))
        .toBe('incorrect_species');

      expect(extractRejectionCategory('Feature identification is incorrect'))
        .toBe('incorrect_feature');

      expect(extractRejectionCategory('Bounding box position is off'))
        .toBe('poor_localization');

      expect(extractRejectionCategory('This feature does not exist'))
        .toBe('false_positive');

      expect(extractRejectionCategory('Duplicate of another annotation'))
        .toBe('duplicate');

      expect(extractRejectionCategory('Image is too blurry'))
        .toBe('low_quality');
    });

    it('should default to "other" for unclear reasons', () => {
      expect(extractRejectionCategory('Something is wrong'))
        .toBe('other');

      expect(extractRejectionCategory(''))
        .toBe('other');
    });

    it('should handle undefined/null notes', () => {
      expect(extractRejectionCategory(undefined as any))
        .toBe('other');

      expect(extractRejectionCategory(null as any))
        .toBe('other');
    });
  });

  describe('incremental learning', () => {
    it('should update positioning model incrementally', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ sample_count: 5, confidence: 0.5 }]
      });

      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          bounding_box: { x: 100, y: 150, width: 50, height: 40 }
        },
        correctedData: {
          bounding_box: { x: 110, y: 160, width: 55, height: 42 }
        },
        userId: 'user-456',
        metadata: {
          species: 'Test Species',
          imageId: 'img-123'
        }
      };

      await rlEngine.captureFeedback(feedback);

      const positioningCall = mockQuery.mock.calls.find(call =>
        call[0].includes('positioning_model') &&
        call[0].includes('ON CONFLICT')
      );

      expect(positioningCall).toBeDefined();

      // Should use online update formulas
      expect(positioningCall![0]).toContain('sample_count + 1');
      expect(positioningCall![0]).toContain('LEAST(1.0, (positioning_model.sample_count + 1) / 10.0)');
    });

    it('should increase confidence with more samples', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ sample_count: 12, confidence: 1.0 }]
      });

      const feedback: FeedbackData = {
        type: 'position_fix',
        annotationId: 'ann-123',
        originalData: {
          annotation_type: 'feature',
          bounding_box: { x: 100, y: 150, width: 50, height: 40 }
        },
        correctedData: {
          bounding_box: { x: 105, y: 155, width: 52, height: 41 }
        },
        userId: 'user-456',
        metadata: {
          species: 'Test Species',
          imageId: 'img-123'
        }
      };

      await rlEngine.captureFeedback(feedback);

      // Confidence should cap at 1.0 after 10 samples
      const positioningCall = mockQuery.mock.calls.find(call =>
        call[0].includes('LEAST(1.0,')
      );

      expect(positioningCall).toBeDefined();
    });
  });
});
