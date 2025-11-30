/**
 * Unit Tests: ImageQualityValidator
 * Comprehensive tests for image quality filtering
 */

import { ImageQualityValidator } from '../../services/ImageQualityValidator';
import * as fixtures from '../fixtures/imageMetadata';

describe('ImageQualityValidator', () => {
  let validator: ImageQualityValidator;

  beforeEach(() => {
    validator = new ImageQualityValidator();
  });

  describe('Good Images - Should PASS', () => {
    it('should pass for well-composed large bird (45% of frame)', () => {
      const result = validator.validateImage(fixtures.goodImageLargeWell);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reasons).toHaveLength(0);
      expect(result.metrics.birdSize).toBe(0.45 * 0.50); // 22.5%
      expect(result.metrics.isMainSubject).toBe(true);
      expect(result.metrics.resolution).toBe(1920 * 1080);
    });

    it('should pass for medium bird (30% of frame)', () => {
      const result = validator.validateImage(fixtures.goodImageMediumBird);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reasons).toHaveLength(0);
      expect(result.metrics.birdSize).toBe(0.30 * 0.40); // 12%
      expect(result.metrics.brightness).toBe(120);
      expect(result.metrics.occlusionRatio).toBe(0.85);
    });

    it('should pass for minimal acceptable bird size (20% of frame)', () => {
      const result = validator.validateImage(fixtures.goodImageMinimalSize);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.metrics.birdSize).toBe(0.20 * 0.25); // 5% - above minimum
    });

    it('should pass for well-lit image', () => {
      const result = validator.validateImage(fixtures.goodImageWellLit);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.metrics.brightness).toBe(180);
      expect(result.metrics.isMainSubject).toBe(true);
    });
  });

  describe('Bad Images - Should REJECT', () => {
    it('should reject bird that is too small (<15% of frame)', () => {
      const result = validator.validateImage(fixtures.badImageTooSmall);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('Bird too small')
      );
      expect(result.reasons).toContain(
        expect.stringContaining('not the main subject')
      );
      expect(result.metrics.birdSize).toBe(0.08 * 0.10); // 0.8%
      expect(result.metrics.isMainSubject).toBe(false);
    });

    it('should reject bird that is too large (>80% of frame)', () => {
      const result = validator.validateImage(fixtures.badImageTooLarge);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('Bird too large')
      );
      expect(result.metrics.birdSize).toBe(0.85 * 0.88);
      expect(result.metrics.isMainSubject).toBe(false);
    });

    it('should reject heavily occluded bird (<60% visible)', () => {
      const result = validator.validateImage(fixtures.badImageOccluded);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('heavily occluded')
      );
      expect(result.metrics.occlusionRatio).toBe(0.45);
    });

    it('should reject image that is too dark', () => {
      const result = validator.validateImage(fixtures.badImageTooDark);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('too dark')
      );
      expect(result.metrics.brightness).toBe(20);
    });

    it('should reject image that is too bright', () => {
      const result = validator.validateImage(fixtures.badImageTooBright);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('too bright')
      );
      expect(result.metrics.brightness).toBe(250);
    });

    it('should reject low resolution image', () => {
      const result = validator.validateImage(fixtures.badImageLowResolution);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.reasons).toContain(
        expect.stringContaining('Low resolution')
      );
      expect(result.metrics.resolution).toBe(300 * 200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple birds by choosing largest', () => {
      const result = validator.validateImage(fixtures.edgeCaseMultipleBirds);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.metrics.birdSize).toBe(0.30 * 0.40);
    });

    it('should detect bird at left edge of frame', () => {
      const isAtEdge = validator.isBirdAtEdge(
        fixtures.edgeCaseBirdAtLeftEdge.birdBoundingBox!
      );

      expect(isAtEdge).toBe(true);
    });

    it('should detect bird at right edge of frame', () => {
      const isAtEdge = validator.isBirdAtEdge(
        fixtures.edgeCaseBirdAtRightEdge.birdBoundingBox!
      );

      expect(isAtEdge).toBe(true);
    });

    it('should handle partial visibility (just above threshold)', () => {
      const result = validator.validateImage(fixtures.edgeCasePartialVisibility);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.metrics.occlusionRatio).toBe(0.62);
    });

    it('should accept bird at exactly minimum size threshold', () => {
      const result = validator.validateImage(fixtures.edgeCaseExactlyMinimumSize);

      expect(result.passed).toBe(true);
      expect(result.metrics.birdSize).toBe(0.15 * 0.15);
      expect(result.metrics.isMainSubject).toBe(true);
    });

    it('should accept bird at exactly maximum size threshold', () => {
      const result = validator.validateImage(fixtures.edgeCaseExactlyMaximumSize);

      expect(result.passed).toBe(true);
      expect(result.metrics.birdSize).toBe(0.80 * 0.80);
      expect(result.metrics.isMainSubject).toBe(true);
    });
  });

  describe('getLargestBird', () => {
    it('should return largest bounding box from multiple birds', () => {
      const largest = validator.getLargestBird(fixtures.multipleBirdBoundingBoxes);

      expect(largest).toBeDefined();
      expect(largest!.width).toBe(0.35);
      expect(largest!.height).toBe(0.45);
      expect(largest!.width * largest!.height).toBe(0.35 * 0.45);
    });

    it('should return null for empty array', () => {
      const largest = validator.getLargestBird([]);

      expect(largest).toBeNull();
    });

    it('should return single bird when only one provided', () => {
      const singleBird = [{ x: 0.25, y: 0.25, width: 0.30, height: 0.40 }];
      const largest = validator.getLargestBird(singleBird);

      expect(largest).toEqual(singleBird[0]);
    });
  });

  describe('isBirdAtEdge', () => {
    it('should detect bird at left edge', () => {
      const bbox = { x: 0.02, y: 0.30, width: 0.25, height: 0.35 };
      expect(validator.isBirdAtEdge(bbox)).toBe(true);
    });

    it('should detect bird at top edge', () => {
      const bbox = { x: 0.30, y: 0.01, width: 0.25, height: 0.35 };
      expect(validator.isBirdAtEdge(bbox)).toBe(true);
    });

    it('should detect bird at right edge', () => {
      const bbox = { x: 0.70, y: 0.30, width: 0.28, height: 0.35 }; // extends to 0.98
      expect(validator.isBirdAtEdge(bbox)).toBe(true);
    });

    it('should detect bird at bottom edge', () => {
      const bbox = { x: 0.30, y: 0.70, width: 0.25, height: 0.28 }; // extends to 0.98
      expect(validator.isBirdAtEdge(bbox)).toBe(true);
    });

    it('should not detect bird in center', () => {
      const bbox = { x: 0.30, y: 0.30, width: 0.30, height: 0.35 };
      expect(validator.isBirdAtEdge(bbox)).toBe(false);
    });

    it('should respect custom edge threshold', () => {
      const bbox = { x: 0.08, y: 0.30, width: 0.25, height: 0.35 };
      expect(validator.isBirdAtEdge(bbox, 0.05)).toBe(false);
      expect(validator.isBirdAtEdge(bbox, 0.10)).toBe(true);
    });
  });

  describe('Custom Thresholds', () => {
    it('should allow custom thresholds via constructor', () => {
      const customValidator = new ImageQualityValidator({
        minBirdSize: 0.25, // More strict: 25% minimum
        minBrightness: 50
      });

      const thresholds = customValidator.getThresholds();
      expect(thresholds.minBirdSize).toBe(0.25);
      expect(thresholds.minBrightness).toBe(50);
      expect(thresholds.maxBirdSize).toBe(0.80); // Default unchanged
    });

    it('should allow updating thresholds after creation', () => {
      validator.updateThresholds({
        minOcclusionRatio: 0.75 // More strict
      });

      const thresholds = validator.getThresholds();
      expect(thresholds.minOcclusionRatio).toBe(0.75);
    });

    it('should apply custom thresholds to validation', () => {
      const customValidator = new ImageQualityValidator({
        minBirdSize: 0.25 // Require 25% minimum
      });

      // This image has 20% bird size - would pass with default, fail with custom
      const result = customValidator.validateImage(fixtures.goodImageMinimalSize);

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain(
        expect.stringContaining('Bird too small')
      );
    });
  });

  describe('Score Calculation', () => {
    it('should calculate cumulative score for multiple issues', () => {
      const badImage = {
        width: 1200,
        height: 900,
        birdBoundingBox: {
          x: 0.40,
          y: 0.40,
          width: 0.10, // Too small (-40)
          height: 0.12
        },
        averageBrightness: 25, // Too dark (-25)
        occlusionRatio: 0.50, // Too occluded (-35)
        hasMultipleBirds: false
      };

      const result = validator.validateImage(badImage);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(20); // Lost 100+ points
      expect(result.reasons.length).toBeGreaterThan(2);
    });

    it('should not allow negative scores', () => {
      const terribleImage = {
        width: 200, // Low res (-30)
        height: 150,
        birdBoundingBox: {
          x: 0.45,
          y: 0.45,
          width: 0.05, // Tiny bird (-40)
          height: 0.06
        },
        averageBrightness: 10, // Very dark (-25)
        occlusionRatio: 0.30, // Heavily occluded (-35)
        hasMultipleBirds: false
      };

      const result = validator.validateImage(terribleImage);

      expect(result.score).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should maintain 100 score for perfect images', () => {
      const result = validator.validateImage(fixtures.goodImageLargeWell);

      expect(result.score).toBe(100);
    });
  });

  describe('Missing Metadata', () => {
    it('should handle missing bounding box gracefully', () => {
      const metadata = {
        width: 1600,
        height: 1200,
        averageBrightness: 150,
        hasMultipleBirds: false
      };

      const result = validator.validateImage(metadata);

      expect(result.passed).toBe(true);
      expect(result.metrics.birdSize).toBeUndefined();
      expect(result.metrics.brightness).toBe(150);
    });

    it('should handle missing brightness gracefully', () => {
      const metadata = {
        width: 1600,
        height: 1200,
        birdBoundingBox: {
          x: 0.25,
          y: 0.25,
          width: 0.35,
          height: 0.45
        },
        occlusionRatio: 0.85,
        hasMultipleBirds: false
      };

      const result = validator.validateImage(metadata);

      expect(result.passed).toBe(true);
      expect(result.metrics.brightness).toBeUndefined();
      expect(result.metrics.birdSize).toBeDefined();
    });

    it('should handle missing occlusion ratio gracefully', () => {
      const metadata = {
        width: 1600,
        height: 1200,
        birdBoundingBox: {
          x: 0.25,
          y: 0.25,
          width: 0.35,
          height: 0.45
        },
        averageBrightness: 150,
        hasMultipleBirds: false
      };

      const result = validator.validateImage(metadata);

      expect(result.passed).toBe(true);
      expect(result.metrics.occlusionRatio).toBeUndefined();
    });
  });
});
