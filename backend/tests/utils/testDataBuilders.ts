/**
 * Test Data Builders
 * Factory functions for creating test data with realistic characteristics
 */

import { ImageMetadata } from '../../src/services/ImageQualityValidator';

export class ImageMetadataBuilder {
  private metadata: ImageMetadata;

  constructor() {
    // Default to a good quality image
    this.metadata = {
      width: 1920,
      height: 1080,
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
  }

  withResolution(width: number, height: number): this {
    this.metadata.width = width;
    this.metadata.height = height;
    return this;
  }

  withBirdSize(widthPercent: number, heightPercent: number): this {
    if (!this.metadata.birdBoundingBox) {
      this.metadata.birdBoundingBox = { x: 0.25, y: 0.25, width: widthPercent, height: heightPercent };
    } else {
      this.metadata.birdBoundingBox.width = widthPercent;
      this.metadata.birdBoundingBox.height = heightPercent;
    }
    return this;
  }

  withBirdPosition(x: number, y: number): this {
    if (!this.metadata.birdBoundingBox) {
      this.metadata.birdBoundingBox = { x, y, width: 0.30, height: 0.40 };
    } else {
      this.metadata.birdBoundingBox.x = x;
      this.metadata.birdBoundingBox.y = y;
    }
    return this;
  }

  withBrightness(brightness: number): this {
    this.metadata.averageBrightness = brightness;
    return this;
  }

  withOcclusionRatio(ratio: number): this {
    this.metadata.occlusionRatio = ratio;
    return this;
  }

  withMultipleBirds(hasMultiple: boolean): this {
    this.metadata.hasMultipleBirds = hasMultiple;
    return this;
  }

  // Preset configurations
  asLowQuality(): this {
    return this
      .withBirdSize(0.08, 0.10) // Too small
      .withBrightness(25) // Too dark
      .withOcclusionRatio(0.45); // Too occluded
  }

  asHighQuality(): this {
    return this
      .withResolution(1920, 1080)
      .withBirdSize(0.40, 0.50)
      .withBrightness(150)
      .withOcclusionRatio(0.95);
  }

  asEdgeCase(): this {
    return this
      .withBirdPosition(0.02, 0.25) // At left edge
      .withOcclusionRatio(0.75);
  }

  asMinimalQuality(): this {
    return this
      .withBirdSize(0.15, 0.15) // Exactly at minimum threshold
      .withBrightness(30) // Exactly at minimum
      .withOcclusionRatio(0.60); // Exactly at minimum
  }

  build(): ImageMetadata {
    return { ...this.metadata };
  }
}

export interface MockAnnotation {
  spanishTerm: string;
  englishTerm: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyLevel: number;
  pronunciation?: string;
  confidence?: number;
}

export class AnnotationBuilder {
  private annotation: MockAnnotation;

  constructor() {
    this.annotation = {
      spanishTerm: 'el pico',
      englishTerm: 'beak',
      boundingBox: {
        x: 0.40,
        y: 0.30,
        width: 0.15,
        height: 0.12
      },
      type: 'anatomical',
      difficultyLevel: 2,
      pronunciation: 'el PEE-koh',
      confidence: 0.92
    };
  }

  withTerms(spanish: string, english: string): this {
    this.annotation.spanishTerm = spanish;
    this.annotation.englishTerm = english;
    return this;
  }

  withBoundingBox(x: number, y: number, width: number, height: number): this {
    this.annotation.boundingBox = { x, y, width, height };
    return this;
  }

  withType(type: 'anatomical' | 'behavioral' | 'color' | 'pattern'): this {
    this.annotation.type = type;
    return this;
  }

  withDifficulty(level: number): this {
    this.annotation.difficultyLevel = level;
    return this;
  }

  withConfidence(confidence: number): this {
    this.annotation.confidence = confidence;
    return this;
  }

  asLowConfidence(): this {
    return this.withConfidence(0.65);
  }

  asHighConfidence(): this {
    return this.withConfidence(0.95);
  }

  build(): MockAnnotation {
    return { ...this.annotation };
  }
}

/**
 * Create a set of realistic annotations for a bird image
 */
export function createMockAnnotationSet(count: number = 5): MockAnnotation[] {
  const templates = [
    { spanish: 'el pico', english: 'beak', bbox: { x: 0.40, y: 0.25, width: 0.12, height: 0.10 } },
    { spanish: 'el ojo', english: 'eye', bbox: { x: 0.45, y: 0.28, width: 0.05, height: 0.05 } },
    { spanish: 'las alas', english: 'wings', bbox: { x: 0.25, y: 0.40, width: 0.30, height: 0.35 } },
    { spanish: 'la cola', english: 'tail', bbox: { x: 0.15, y: 0.50, width: 0.20, height: 0.25 } },
    { spanish: 'las patas', english: 'legs', bbox: { x: 0.35, y: 0.70, width: 0.15, height: 0.20 } },
    { spanish: 'el plumaje', english: 'plumage', bbox: { x: 0.30, y: 0.35, width: 0.25, height: 0.30 } },
    { spanish: 'la cresta', english: 'crest', bbox: { x: 0.42, y: 0.20, width: 0.08, height: 0.08 } },
    { spanish: 'el pecho', english: 'breast', bbox: { x: 0.35, y: 0.45, width: 0.18, height: 0.20 } }
  ];

  return templates.slice(0, count).map((template, index) =>
    new AnnotationBuilder()
      .withTerms(template.spanish, template.english)
      .withBoundingBox(template.bbox.x, template.bbox.y, template.bbox.width, template.bbox.height)
      .withType('anatomical')
      .withDifficulty(Math.floor(Math.random() * 3) + 1)
      .withConfidence(0.80 + Math.random() * 0.15)
      .build()
  );
}

/**
 * Create mock image data with quality issues
 */
export function createMockImageWithIssues(issues: string[]): ImageMetadata {
  const builder = new ImageMetadataBuilder();

  issues.forEach(issue => {
    switch (issue) {
      case 'too_small':
        builder.withBirdSize(0.08, 0.10);
        break;
      case 'too_large':
        builder.withBirdSize(0.85, 0.88);
        break;
      case 'too_dark':
        builder.withBrightness(20);
        break;
      case 'too_bright':
        builder.withBrightness(250);
        break;
      case 'occluded':
        builder.withOcclusionRatio(0.45);
        break;
      case 'low_res':
        builder.withResolution(300, 200);
        break;
      case 'at_edge':
        builder.withBirdPosition(0.02, 0.25);
        break;
    }
  });

  return builder.build();
}
