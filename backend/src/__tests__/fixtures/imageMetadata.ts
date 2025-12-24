/**
 * Test Fixtures: Image Metadata
 * Mock image metadata for testing quality validation
 */

import { ImageMetadata } from '../../services/ImageQualityValidator';

/**
 * Good Images - Should PASS quality validation
 */

export const goodImageLargeWell: ImageMetadata = {
  width: 1920,
  height: 1080,
  birdBoundingBox: {
    x: 0.25,
    y: 0.20,
    width: 0.45, // 45% of frame - optimal size
    height: 0.50
  },
  averageBrightness: 150,
  occlusionRatio: 0.95, // 95% visible
  hasMultipleBirds: false
};

export const goodImageMediumBird: ImageMetadata = {
  width: 1200,
  height: 800,
  birdBoundingBox: {
    x: 0.30,
    y: 0.25,
    width: 0.30, // 30% of frame
    height: 0.40
  },
  averageBrightness: 120,
  occlusionRatio: 0.85,
  hasMultipleBirds: false
};

export const goodImageMinimalSize: ImageMetadata = {
  width: 800,
  height: 600,
  birdBoundingBox: {
    x: 0.35,
    y: 0.30,
    width: 0.20, // 20% of frame - just above minimum
    height: 0.25
  },
  averageBrightness: 140,
  occlusionRatio: 0.80,
  hasMultipleBirds: false
};

export const goodImageWellLit: ImageMetadata = {
  width: 1600,
  height: 1200,
  birdBoundingBox: {
    x: 0.20,
    y: 0.15,
    width: 0.40,
    height: 0.50
  },
  averageBrightness: 180, // Well lit but not overexposed
  occlusionRatio: 0.90,
  hasMultipleBirds: false
};

/**
 * Bad Images - Should FAIL quality validation
 */

export const badImageTooSmall: ImageMetadata = {
  width: 1920,
  height: 1080,
  birdBoundingBox: {
    x: 0.40,
    y: 0.40,
    width: 0.08, // 8% of frame - too small
    height: 0.10
  },
  averageBrightness: 150,
  occlusionRatio: 0.95,
  hasMultipleBirds: false
};

export const badImageTooLarge: ImageMetadata = {
  width: 800,
  height: 600,
  birdBoundingBox: {
    x: 0.05,
    y: 0.05,
    width: 0.85, // 85% of frame - too large (close-up)
    height: 0.88
  },
  averageBrightness: 140,
  occlusionRatio: 0.90,
  hasMultipleBirds: false
};

export const badImageOccluded: ImageMetadata = {
  width: 1200,
  height: 900,
  birdBoundingBox: {
    x: 0.25,
    y: 0.25,
    width: 0.35,
    height: 0.40
  },
  averageBrightness: 150,
  occlusionRatio: 0.45, // Only 45% visible - heavily occluded
  hasMultipleBirds: false
};

export const badImageTooDark: ImageMetadata = {
  width: 1600,
  height: 1200,
  birdBoundingBox: {
    x: 0.30,
    y: 0.25,
    width: 0.35,
    height: 0.45
  },
  averageBrightness: 20, // Very dark
  occlusionRatio: 0.85,
  hasMultipleBirds: false
};

export const badImageTooBright: ImageMetadata = {
  width: 1600,
  height: 1200,
  birdBoundingBox: {
    x: 0.30,
    y: 0.25,
    width: 0.35,
    height: 0.45
  },
  averageBrightness: 250, // Overexposed
  occlusionRatio: 0.85,
  hasMultipleBirds: false
};

export const badImageLowResolution: ImageMetadata = {
  width: 300,
  height: 200, // 60,000 pixels - below 120,000 minimum
  birdBoundingBox: {
    x: 0.25,
    y: 0.20,
    width: 0.40,
    height: 0.50
  },
  averageBrightness: 150,
  occlusionRatio: 0.90,
  hasMultipleBirds: false
};

/**
 * Edge Cases
 */

export const edgeCaseMultipleBirds: ImageMetadata = {
  width: 1920,
  height: 1080,
  birdBoundingBox: {
    x: 0.25,
    y: 0.25,
    width: 0.30, // Largest bird
    height: 0.40
  },
  averageBrightness: 150,
  occlusionRatio: 0.85,
  hasMultipleBirds: true
};

export const edgeCaseBirdAtLeftEdge: ImageMetadata = {
  width: 1600,
  height: 1200,
  birdBoundingBox: {
    x: 0.02, // Very close to left edge
    y: 0.25,
    width: 0.35,
    height: 0.45
  },
  averageBrightness: 150,
  occlusionRatio: 0.75, // Partially out of frame
  hasMultipleBirds: false
};

export const edgeCaseBirdAtRightEdge: ImageMetadata = {
  width: 1600,
  height: 1200,
  birdBoundingBox: {
    x: 0.65,
    y: 0.25,
    width: 0.33, // Extends to x=0.98
    height: 0.45
  },
  averageBrightness: 150,
  occlusionRatio: 0.75,
  hasMultipleBirds: false
};

export const edgeCasePartialVisibility: ImageMetadata = {
  width: 1200,
  height: 900,
  birdBoundingBox: {
    x: 0.30,
    y: 0.25,
    width: 0.35,
    height: 0.40
  },
  averageBrightness: 150,
  occlusionRatio: 0.62, // Just above minimum
  hasMultipleBirds: false
};

export const edgeCaseExactlyMinimumSize: ImageMetadata = {
  width: 1000,
  height: 800,
  birdBoundingBox: {
    x: 0.30,
    y: 0.30,
    width: 0.15, // Exactly 15% - at threshold
    height: 0.15
  },
  averageBrightness: 150,
  occlusionRatio: 0.85,
  hasMultipleBirds: false
};

export const edgeCaseExactlyMaximumSize: ImageMetadata = {
  width: 1000,
  height: 800,
  birdBoundingBox: {
    x: 0.10,
    y: 0.10,
    width: 0.80, // Exactly 80% - at threshold
    height: 0.80
  },
  averageBrightness: 150,
  occlusionRatio: 0.85,
  hasMultipleBirds: false
};

/**
 * Multiple bird bounding boxes for testing getLargestBird
 */
export const multipleBirdBoundingBoxes = [
  { x: 0.10, y: 0.20, width: 0.15, height: 0.20 }, // Small bird
  { x: 0.40, y: 0.30, width: 0.35, height: 0.45 }, // Largest bird
  { x: 0.70, y: 0.50, width: 0.12, height: 0.18 }  // Tiny bird
];
