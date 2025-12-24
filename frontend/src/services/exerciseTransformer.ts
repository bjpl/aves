// CONCEPT: Transform AI annotation data into exercise-specific formats
// WHY: Converts backend annotation data into prop structures for each exercise type
// PATTERN: Type-safe transformer functions for each exercise component

import { Annotation } from '../../../shared/types/annotation.types';

// ============================================================================
// TYPE DEFINITIONS (matching exercise component props)
// ============================================================================

export interface TermMatchingPair {
  id: string;
  spanish: string;
  english: string;
  pronunciation?: string;
}

export interface AudioRecognitionOption {
  id: string;
  spanish: string;
  english: string;
  pronunciation?: string;
}

export interface AudioRecognitionData {
  correctAnswer: AudioRecognitionOption;
  options: AudioRecognitionOption[];
}

export interface SentenceBuildingData {
  targetSentence: string;
  englishTranslation: string;
  words: string[];
  hint?: string;
}

export interface CategorySortingItem {
  id: string;
  spanish: string;
  english: string;
  categoryId: string;
}

export interface CategorySortingCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface CategorySortingData {
  categories: CategorySortingCategory[];
  items: CategorySortingItem[];
}

export interface SpatialIdentificationPoint {
  id: string;
  spanish: string;
  english: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  pronunciation?: string;
}

export interface SpatialIdentificationData {
  imageUrl: string;
  imageAlt: string;
  targetPoint: SpatialIdentificationPoint;
  allPoints: SpatialIdentificationPoint[];
}

export interface BirdComparison {
  id: string;
  spanish: string;
  english: string;
  imageUrl: string;
  characteristics: {
    size: string;
    color: string;
    beak: string;
    habitat: string;
  };
}

export interface ComparisonQuestion {
  id: string;
  spanishQuestion: string;
  englishQuestion: string;
  correctBirdId: string;
  characteristic: keyof BirdComparison['characteristics'];
}

export interface ComparativeAnalysisData {
  birdA: BirdComparison;
  birdB: BirdComparison;
  questions: ComparisonQuestion[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that an annotation has all required fields
 */
function validateAnnotation(annotation: Annotation): boolean {
  return Boolean(
    annotation.id &&
    annotation.spanishTerm &&
    annotation.englishTerm &&
    annotation.boundingBox
  );
}

/**
 * Validates an array of annotations
 */
function validateAnnotations(annotations: Annotation[]): void {
  if (!Array.isArray(annotations) || annotations.length === 0) {
    throw new Error('Annotations array cannot be empty');
  }

  const invalidAnnotations = annotations.filter(ann => !validateAnnotation(ann));
  if (invalidAnnotations.length > 0) {
    throw new Error(
      `Invalid annotations found: ${invalidAnnotations.map(a => a.id).join(', ')}`
    );
  }
}

// ============================================================================
// BOUNDING BOX HELPERS
// ============================================================================

/**
 * Convert normalized bounding box (0-1) to percentage (0-100)
 * Handles both formats: {x, y} and {topLeft: {x, y}}
 */
function getBoundingBoxCenter(annotation: Annotation): { x: number; y: number } {
  const box = annotation.boundingBox;

  // Calculate center point
  const centerX = box.x + (box.width / 2);
  const centerY = box.y + (box.height / 2);

  // Convert to percentage (0-100)
  return {
    x: centerX * 100,
    y: centerY * 100,
  };
}

// ============================================================================
// TRANSFORMER FUNCTIONS
// ============================================================================

/**
 * Transform annotations into term matching pairs
 * Used by TermMatchingExercise component
 */
export function transformToTermMatching(annotations: Annotation[]): TermMatchingPair[] {
  validateAnnotations(annotations);

  return annotations.map(annotation => ({
    id: annotation.id,
    spanish: annotation.spanishTerm,
    english: annotation.englishTerm,
    pronunciation: annotation.pronunciation,
  }));
}

/**
 * Transform annotations into audio recognition data
 * Selects one correct answer and provides 3-4 distractor options
 */
export function transformToAudioRecognition(
  annotations: Annotation[],
  targetIndex: number = 0,
  optionCount: number = 4
): AudioRecognitionData {
  validateAnnotations(annotations);

  if (targetIndex < 0 || targetIndex >= annotations.length) {
    throw new Error(`Invalid target index: ${targetIndex}`);
  }

  if (optionCount < 2 || optionCount > annotations.length) {
    throw new Error(`Invalid option count: ${optionCount}`);
  }

  const targetAnnotation = annotations[targetIndex];
  const correctAnswer: AudioRecognitionOption = {
    id: targetAnnotation.id,
    spanish: targetAnnotation.spanishTerm,
    english: targetAnnotation.englishTerm,
    pronunciation: targetAnnotation.pronunciation,
  };

  // Shuffle and select distractor options
  const otherAnnotations = annotations.filter((_, i) => i !== targetIndex);
  const shuffled = [...otherAnnotations].sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, optionCount - 1);

  // Create options array and shuffle
  const options: AudioRecognitionOption[] = [
    correctAnswer,
    ...distractors.map(ann => ({
      id: ann.id,
      spanish: ann.spanishTerm,
      english: ann.englishTerm,
      pronunciation: ann.pronunciation,
    })),
  ].sort(() => Math.random() - 0.5);

  return {
    correctAnswer,
    options,
  };
}

/**
 * Transform single annotation into sentence building data
 * Generates a simple sentence and provides shuffled words
 */
export function transformToSentenceBuilding(
  annotation: Annotation,
  sentenceTemplate?: string
): SentenceBuildingData {
  if (!validateAnnotation(annotation)) {
    throw new Error('Invalid annotation for sentence building');
  }

  // Generate default sentence if no template provided
  const targetSentence = sentenceTemplate ||
    `El pájaro tiene un ${annotation.spanishTerm}`;
  const englishTranslation = `The bird has a ${annotation.englishTerm}`;

  // Extract words and shuffle
  const words = targetSentence.split(' ');
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  // Generate hint based on annotation type
  const hint = annotation.type === 'anatomical'
    ? `This is a body part of the bird`
    : `Think about ${annotation.englishTerm}`;

  return {
    targetSentence,
    englishTranslation,
    words: shuffledWords,
    hint,
  };
}

/**
 * Transform annotations into category sorting data
 * Groups annotations by their type (anatomical, behavioral, etc.)
 */
export function transformToCategorySorting(annotations: Annotation[]): CategorySortingData {
  validateAnnotations(annotations);

  // Define categories with colors
  const categoryDefinitions: Record<string, CategorySortingCategory> = {
    anatomical: {
      id: 'anatomical',
      name: 'Anatomía (Anatomy)',
      description: 'Body parts and physical features',
      color: 'blue',
    },
    behavioral: {
      id: 'behavioral',
      name: 'Comportamiento (Behavior)',
      description: 'Actions and behaviors',
      color: 'green',
    },
    color: {
      id: 'color',
      name: 'Color',
      description: 'Colors and patterns',
      color: 'purple',
    },
    pattern: {
      id: 'pattern',
      name: 'Patrón (Pattern)',
      description: 'Visual patterns and markings',
      color: 'orange',
    },
    habitat: {
      id: 'habitat',
      name: 'Hábitat (Habitat)',
      description: 'Living environment',
      color: 'pink',
    },
  };

  // Get unique categories from annotations
  const usedTypes = new Set(annotations.map(ann => ann.type));
  const categories = Array.from(usedTypes).map(
    type => categoryDefinitions[type] || {
      id: type,
      name: type,
      description: '',
      color: 'blue',
    }
  );

  // Create sortable items
  const items: CategorySortingItem[] = annotations.map(annotation => ({
    id: annotation.id,
    spanish: annotation.spanishTerm,
    english: annotation.englishTerm,
    categoryId: annotation.type,
  }));

  return {
    categories,
    items,
  };
}

/**
 * Transform annotations into spatial identification data
 * Requires image URL and converts bounding boxes to clickable points
 */
export function transformToSpatialIdentification(
  annotations: Annotation[],
  imageUrl: string,
  targetIndex: number = 0
): SpatialIdentificationData {
  validateAnnotations(annotations);

  if (!imageUrl) {
    throw new Error('Image URL is required for spatial identification');
  }

  if (targetIndex < 0 || targetIndex >= annotations.length) {
    throw new Error(`Invalid target index: ${targetIndex}`);
  }

  const targetAnnotation = annotations[targetIndex];
  const targetCenter = getBoundingBoxCenter(targetAnnotation);

  // Convert all annotations to spatial points
  const allPoints: SpatialIdentificationPoint[] = annotations.map(annotation => {
    const center = getBoundingBoxCenter(annotation);
    return {
      id: annotation.id,
      spanish: annotation.spanishTerm,
      english: annotation.englishTerm,
      x: center.x,
      y: center.y,
      pronunciation: annotation.pronunciation,
    };
  });

  const targetPoint: SpatialIdentificationPoint = {
    id: targetAnnotation.id,
    spanish: targetAnnotation.spanishTerm,
    english: targetAnnotation.englishTerm,
    x: targetCenter.x,
    y: targetCenter.y,
    pronunciation: targetAnnotation.pronunciation,
  };

  return {
    imageUrl,
    imageAlt: `Bird with ${targetAnnotation.englishTerm} highlighted`,
    targetPoint,
    allPoints,
  };
}

/**
 * Transform two sets of annotations into comparative analysis data
 * Requires image URLs for each bird and generates comparison questions
 */
export function transformToComparativeAnalysis(
  annotationsA: Annotation[],
  annotationsB: Annotation[],
  imageUrlA: string,
  imageUrlB: string,
  birdNameA: string = 'Bird A',
  birdNameB: string = 'Bird B'
): ComparativeAnalysisData {
  validateAnnotations(annotationsA);
  validateAnnotations(annotationsB);

  if (!imageUrlA || !imageUrlB) {
    throw new Error('Image URLs are required for both birds');
  }

  // Extract characteristics from annotations
  const getCharacteristics = (annotations: Annotation[]) => {
    const anatomical = annotations.filter(a => a.type === 'anatomical');
    const colors = annotations.filter(a => a.type === 'color');
    // patterns can be used for extended characteristics in the future

    return {
      size: anatomical.length > 2 ? 'grande (large)' : 'pequeño (small)',
      color: colors.length > 0 ? colors[0].spanishTerm : 'variado (varied)',
      beak: anatomical.find(a => a.englishTerm.toLowerCase().includes('beak'))?.spanishTerm || 'normal',
      habitat: annotations.find(a => a.type === 'habitat')?.spanishTerm || 'bosque (forest)',
    };
  };

  const birdA: BirdComparison = {
    id: 'bird-a',
    spanish: birdNameA,
    english: birdNameA,
    imageUrl: imageUrlA,
    characteristics: getCharacteristics(annotationsA),
  };

  const birdB: BirdComparison = {
    id: 'bird-b',
    spanish: birdNameB,
    english: birdNameB,
    imageUrl: imageUrlB,
    characteristics: getCharacteristics(annotationsB),
  };

  // Generate comparison questions
  const questions: ComparisonQuestion[] = [
    {
      id: 'q1',
      spanishQuestion: '¿Qué pájaro es más grande?',
      englishQuestion: 'Which bird is larger?',
      correctBirdId: birdA.characteristics.size.includes('grande') ? 'bird-a' : 'bird-b',
      characteristic: 'size',
    },
    {
      id: 'q2',
      spanishQuestion: '¿Qué pájaro tiene este color?',
      englishQuestion: 'Which bird has this color?',
      correctBirdId: 'bird-a',
      characteristic: 'color',
    },
    {
      id: 'q3',
      spanishQuestion: '¿Qué pájaro tiene este tipo de pico?',
      englishQuestion: 'Which bird has this type of beak?',
      correctBirdId: 'bird-a',
      characteristic: 'beak',
    },
  ];

  return {
    birdA,
    birdB,
    questions,
  };
}

// ============================================================================
// BATCH TRANSFORMERS
// ============================================================================

/**
 * Generate multiple exercise data objects from a single annotation set
 * Useful for creating varied exercises from the same source data
 */
export function generateMultipleExercises(
  annotations: Annotation[],
  imageUrl?: string
): {
  termMatching: TermMatchingPair[];
  audioRecognition: AudioRecognitionData[];
  sentenceBuilding: SentenceBuildingData[];
  categorySorting: CategorySortingData;
  spatialIdentification?: SpatialIdentificationData[];
} {
  validateAnnotations(annotations);

  const result = {
    termMatching: transformToTermMatching(annotations),
    audioRecognition: annotations.map((_, index) =>
      transformToAudioRecognition(annotations, index)
    ),
    sentenceBuilding: annotations.map(ann => transformToSentenceBuilding(ann)),
    categorySorting: transformToCategorySorting(annotations),
    spatialIdentification: imageUrl
      ? annotations.map((_, index) =>
          transformToSpatialIdentification(annotations, imageUrl, index)
        )
      : undefined,
  };

  return result;
}

/**
 * Shuffle array utility (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select random subset from array
 */
export function selectRandomSubset<T>(array: T[], count: number): T[] {
  if (count >= array.length) {
    return [...array];
  }
  return shuffleArray(array).slice(0, count);
}
