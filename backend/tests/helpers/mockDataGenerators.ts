/**
 * Mock Data Generators for Reinforcement Learning Tests
 * Provides realistic test data for feedback, corrections, and annotations
 */

import { AIAnnotation } from '../../src/services/VisionAIService';
import { PositionCorrection, RejectionPattern } from '../../src/services/PatternLearner';

/**
 * Generate realistic AI annotation mock data
 */
export function createMockAnnotation(overrides?: Partial<AIAnnotation>): AIAnnotation {
  const defaults: AIAnnotation = {
    spanishTerm: 'el pico',
    englishTerm: 'beak',
    boundingBox: {
      x: 0.45,
      y: 0.30,
      width: 0.12,
      height: 0.10
    },
    type: 'anatomical',
    difficultyLevel: 2,
    pronunciation: 'el PEE-koh',
    confidence: 0.85
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate batch of annotations with varying quality
 */
export function createAnnotationBatch(count: number, species: string): AIAnnotation[] {
  const features = [
    { spanish: 'el pico', english: 'beak', confidence: 0.88 },
    { spanish: 'las alas', english: 'wings', confidence: 0.92 },
    { spanish: 'la cola', english: 'tail', confidence: 0.85 },
    { spanish: 'el ojo', english: 'eye', confidence: 0.90 },
    { spanish: 'las patas', english: 'legs', confidence: 0.82 },
    { spanish: 'el plumaje', english: 'plumage', confidence: 0.87 }
  ];

  return Array.from({ length: count }, (_, i) => {
    const feature = features[i % features.length];
    return createMockAnnotation({
      spanishTerm: feature.spanish,
      englishTerm: feature.english,
      confidence: feature.confidence,
      boundingBox: {
        x: 0.2 + (i * 0.1) % 0.6,
        y: 0.2 + (i * 0.15) % 0.6,
        width: 0.1 + (i * 0.02) % 0.08,
        height: 0.08 + (i * 0.02) % 0.06
      }
    });
  });
}

/**
 * Generate realistic position correction
 */
export function createPositionCorrection(
  feature: string,
  species: string,
  deltaX: number = 0.05,
  deltaY: number = 0.03
): PositionCorrection {
  const original = {
    x: 0.45,
    y: 0.30,
    width: 0.12,
    height: 0.10
  };

  const corrected = {
    x: original.x + deltaX,
    y: original.y + deltaY,
    width: original.width + 0.02,
    height: original.height + 0.015
  };

  return {
    feature,
    species,
    originalBox: original,
    correctedBox: corrected,
    delta: {
      dx: deltaX,
      dy: deltaY,
      dwidth: 0.02,
      dheight: 0.015
    },
    timestamp: new Date(),
    reviewerId: 'test-reviewer-123'
  };
}

/**
 * Generate batch of position corrections with consistent bias
 */
export function createCorrectionBatch(
  count: number,
  feature: string,
  species: string,
  avgDeltaX: number = 0.05,
  avgDeltaY: number = 0.03
): PositionCorrection[] {
  return Array.from({ length: count }, (_, i) => {
    // Add small random variance around average delta
    const variance = 0.01;
    const deltaX = avgDeltaX + (Math.random() - 0.5) * variance;
    const deltaY = avgDeltaY + (Math.random() - 0.5) * variance;

    return createPositionCorrection(feature, species, deltaX, deltaY);
  });
}

/**
 * Generate rejection pattern with category
 */
export function createRejectionPattern(
  feature: string,
  species: string,
  reason: string,
  count: number = 1
): RejectionPattern {
  return {
    feature,
    species,
    reason,
    boundingBox: {
      x: 0.45,
      y: 0.30,
      width: 0.12,
      height: 0.10
    },
    timestamp: new Date(),
    count
  };
}

/**
 * Generate common rejection scenarios
 */
export function createRejectionScenarios(species: string): RejectionPattern[] {
  return [
    createRejectionPattern('el pico', species, 'Bounding box too small', 3),
    createRejectionPattern('las alas', species, 'Incorrect feature identification', 2),
    createRejectionPattern('la cola', species, 'Poor image quality - tail obscured', 2),
    createRejectionPattern('el ojo', species, 'Annotation not representative', 1),
    createRejectionPattern('las patas', species, 'Bounding box includes background', 2)
  ];
}

/**
 * Generate dataset for ML training
 */
export function createTrainingDataset(size: number = 100): {
  annotations: AIAnnotation[];
  corrections: PositionCorrection[];
  species: string;
} {
  const species = 'Mallard Duck';
  const annotations = createAnnotationBatch(size, species);

  // Generate corrections for 20% of annotations
  const correctionCount = Math.floor(size * 0.2);
  const corrections: PositionCorrection[] = [];

  for (let i = 0; i < correctionCount; i++) {
    const annotation = annotations[i];
    corrections.push(createPositionCorrection(
      annotation.spanishTerm,
      species,
      0.05 + (Math.random() - 0.5) * 0.02,
      0.03 + (Math.random() - 0.5) * 0.015
    ));
  }

  return { annotations, corrections, species };
}

/**
 * Generate concurrent feedback events for stress testing
 */
export function createConcurrentFeedbackEvents(count: number): Array<{
  type: 'approve' | 'reject' | 'correct';
  annotation: AIAnnotation;
  context: { species: string; imageId: string; reviewerId: string };
  correction?: PositionCorrection;
  reason?: string;
}> {
  const species = 'Great Blue Heron';
  const events: Array<any> = [];

  for (let i = 0; i < count; i++) {
    const annotation = createMockAnnotation({
      spanishTerm: `feature_${i}`,
      englishTerm: `feature_${i}_en`,
      confidence: 0.8 + Math.random() * 0.15
    });

    const context = {
      species,
      imageId: `image_${i}`,
      reviewerId: `reviewer_${i % 3}` // Simulate 3 reviewers
    };

    const eventType = Math.random();

    if (eventType < 0.5) {
      // 50% approvals
      events.push({ type: 'approve', annotation, context });
    } else if (eventType < 0.8) {
      // 30% corrections
      const correction = createPositionCorrection(annotation.spanishTerm, species);
      events.push({ type: 'correct', annotation, context, correction });
    } else {
      // 20% rejections
      const reason = 'Quality issue';
      events.push({ type: 'reject', annotation, context, reason });
    }
  }

  return events;
}

/**
 * Generate cross-species test data for generalization tests
 */
export function createCrossSpeciesDataset(): Array<{
  species: string;
  annotations: AIAnnotation[];
  corrections: PositionCorrection[];
}> {
  const species = [
    'Mallard Duck',
    'Great Blue Heron',
    'American Robin',
    'Northern Cardinal',
    'Red-tailed Hawk'
  ];

  return species.map(sp => ({
    species: sp,
    annotations: createAnnotationBatch(20, sp),
    corrections: createCorrectionBatch(5, 'el pico', sp, 0.05, 0.03)
  }));
}

/**
 * Generate time-series data for trend analysis
 */
export function createTimeSeriesData(days: number = 30): Array<{
  date: Date;
  annotations: AIAnnotation[];
  avgConfidence: number;
}> {
  const data: Array<any> = [];
  const baseConfidence = 0.75;
  const improvementRate = 0.005; // 0.5% improvement per day

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    const avgConfidence = baseConfidence + (improvementRate * i) + (Math.random() - 0.5) * 0.02;
    const annotations = createAnnotationBatch(10, 'Test Species').map(ann => ({
      ...ann,
      confidence: avgConfidence + (Math.random() - 0.5) * 0.05
    }));

    data.push({ date, annotations, avgConfidence });
  }

  return data;
}

/**
 * Generate edge case scenarios
 */
export function createEdgeCases(): {
  emptyBatch: AIAnnotation[];
  lowConfidenceBatch: AIAnnotation[];
  invalidBoundingBoxes: AIAnnotation[];
  extremeCorrections: PositionCorrection[];
} {
  return {
    emptyBatch: [],
    lowConfidenceBatch: createAnnotationBatch(5, 'Test Species').map(ann => ({
      ...ann,
      confidence: 0.3 + Math.random() * 0.1
    })),
    invalidBoundingBoxes: [
      createMockAnnotation({ boundingBox: { x: 1.5, y: 0.5, width: 0.1, height: 0.1 } }),
      createMockAnnotation({ boundingBox: { x: 0.5, y: -0.2, width: 0.1, height: 0.1 } }),
      createMockAnnotation({ boundingBox: { x: 0.5, y: 0.5, width: 0, height: 0 } })
    ],
    extremeCorrections: [
      createPositionCorrection('el pico', 'Test Species', 0.5, 0.4), // Massive shift
      createPositionCorrection('las alas', 'Test Species', -0.3, -0.25), // Negative shift
      createPositionCorrection('la cola', 'Test Species', 0.001, 0.001) // Tiny shift
    ]
  };
}
