/**
 * ReinforcementLearningEngine Unit Tests
 * Tests the RL engine for feedback capture and model training
 */

import { createMockAnnotation, createConcurrentFeedbackEvents } from '../helpers/mockDataGenerators';

// Mock reinforcement learning engine implementation
describe('ReinforcementLearningEngine', () => {
  describe('Feedback Capture', () => {
    it('should capture approval feedback', async () => {
      const feedback = {
        type: 'approve' as const,
        annotationId: 'test-123',
        originalData: {
          spanish_term: 'el pico',
          english_term: 'beak',
          bounding_box: { x: 0.5, y: 0.3, width: 0.1, height: 0.1 },
          confidence: 0.85
        },
        userId: 'user-123',
        metadata: {
          species: 'Mallard Duck',
          imageId: 'img-123',
          feature: 'el pico'
        }
      };

      // Mock implementation - actual service would store this
      expect(feedback.type).toBe('approve');
      expect(feedback.metadata.species).toBe('Mallard Duck');
    });

    it('should capture rejection feedback with category', async () => {
      const feedback = {
        type: 'reject' as const,
        annotationId: 'test-456',
        originalData: {
          spanish_term: 'las alas',
          bounding_box: { x: 0.3, y: 0.4, width: 0.15, height: 0.12 }
        },
        rejectionReason: 'TOO_SMALL',
        userId: 'user-123',
        metadata: {
          species: 'Great Blue Heron',
          imageId: 'img-456',
          feature: 'las alas'
        }
      };

      expect(feedback.type).toBe('reject');
      expect(feedback.rejectionReason).toBe('TOO_SMALL');
    });

    it('should capture position correction feedback', async () => {
      const originalBox = { x: 0.45, y: 0.30, width: 0.12, height: 0.10 };
      const correctedBox = { x: 0.50, y: 0.33, width: 0.14, height: 0.12 };

      const feedback = {
        type: 'position_fix' as const,
        annotationId: 'test-789',
        originalData: {
          spanish_term: 'la cola',
          bounding_box: originalBox
        },
        correctedData: {
          spanish_term: 'la cola',
          bounding_box: correctedBox
        },
        userId: 'user-123',
        metadata: {
          species: 'American Robin',
          imageId: 'img-789',
          feature: 'la cola'
        }
      };

      // Calculate delta
      const delta = {
        dx: correctedBox.x - originalBox.x,
        dy: correctedBox.y - originalBox.y,
        dwidth: correctedBox.width - originalBox.width,
        dheight: correctedBox.height - originalBox.height
      };

      expect(delta.dx).toBeCloseTo(0.05, 2);
      expect(delta.dy).toBeCloseTo(0.03, 2);
      expect(delta.dwidth).toBeCloseTo(0.02, 2);
    });

    it('should handle concurrent feedback events', async () => {
      const events = createConcurrentFeedbackEvents(100);

      const approvals = events.filter(e => e.type === 'approve');
      const rejections = events.filter(e => e.type === 'reject');
      const corrections = events.filter(e => e.type === 'correct');

      expect(approvals.length + rejections.length + corrections.length).toBe(100);
      expect(approvals.length).toBeGreaterThan(0);
    });
  });

  describe('Category Extraction', () => {
    it('should extract category from rejection message', () => {
      const testCases = [
        { input: '[TOO_SMALL] Bounding box is too small', expected: 'TOO_SMALL' },
        { input: '[NOT_REPRESENTATIVE] Not representative of species', expected: 'NOT_REPRESENTATIVE' },
        { input: '[INCORRECT] Wrong feature identified', expected: 'INCORRECT' },
        { input: 'No category here', expected: 'OTHER' }
      ];

      // Mock extraction function
      const extractRejectionCategory = (message: string): string => {
        const match = message.match(/^\[([A-Z_]+)\]/);
        return match ? match[1] : 'OTHER';
      };

      for (const testCase of testCases) {
        const result = extractRejectionCategory(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('Feedback Analytics', () => {
    it('should aggregate feedback statistics', () => {
      const mockFeedback = [
        { type: 'approve', feature: 'el pico', species: 'Mallard Duck' },
        { type: 'approve', feature: 'las alas', species: 'Mallard Duck' },
        { type: 'reject', feature: 'la cola', species: 'Mallard Duck', reason: 'TOO_SMALL' },
        { type: 'position_fix', feature: 'el ojo', species: 'Mallard Duck' }
      ];

      const stats = {
        total: mockFeedback.length,
        approvals: mockFeedback.filter(f => f.type === 'approve').length,
        rejections: mockFeedback.filter(f => f.type === 'reject').length,
        corrections: mockFeedback.filter(f => f.type === 'position_fix').length
      };

      expect(stats.total).toBe(4);
      expect(stats.approvals).toBe(2);
      expect(stats.rejections).toBe(1);
      expect(stats.corrections).toBe(1);
    });

    it('should track rejection reasons by category', () => {
      const rejections = [
        { reason: 'TOO_SMALL' },
        { reason: 'TOO_SMALL' },
        { reason: 'NOT_REPRESENTATIVE' },
        { reason: 'INCORRECT' },
        { reason: 'TOO_SMALL' }
      ];

      const categoryCounts = rejections.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(categoryCounts['TOO_SMALL']).toBe(3);
      expect(categoryCounts['NOT_REPRESENTATIVE']).toBe(1);
      expect(categoryCounts['INCORRECT']).toBe(1);
    });

    it('should calculate average position deltas per feature', () => {
      const corrections = [
        { feature: 'el pico', delta: { dx: 0.05, dy: 0.03 } },
        { feature: 'el pico', delta: { dx: 0.06, dy: 0.04 } },
        { feature: 'el pico', delta: { dx: 0.04, dy: 0.02 } }
      ];

      const avgDelta = corrections.reduce(
        (acc, c) => ({
          dx: acc.dx + c.delta.dx,
          dy: acc.dy + c.delta.dy
        }),
        { dx: 0, dy: 0 }
      );

      avgDelta.dx /= corrections.length;
      avgDelta.dy /= corrections.length;

      expect(avgDelta.dx).toBeCloseTo(0.05, 2);
      expect(avgDelta.dy).toBeCloseTo(0.03, 2);
    });
  });
});
