// CONCEPT: Generate diverse exercise types from annotation data
// WHY: Creates varied practice exercises balancing Spanish and bird learning
// PATTERN: Factory pattern for exercise generation with randomization

import type { Annotation } from '../../types';

export type ExerciseType =
  | 'visual_identification'
  | 'visual_discrimination'
  | 'term_matching'
  | 'contextual_fill'
  | 'audio_recognition'
  | 'sentence_building'
  | 'category_sorting'
  | 'spatial_identification'
  | 'comparative_analysis';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface VisualIdentificationExercise extends BaseExercise {
  type: 'visual_identification';
  imageUrl: string;
  correctAnswer: { spanish: string; english: string };
  options: Array<{ spanish: string; english: string }>;
  prompt: string;
}

export interface TermMatchingExercise extends BaseExercise {
  type: 'term_matching';
  pairs: Array<{
    id: string;
    spanish: string;
    english: string;
    pronunciation?: string;
  }>;
}

export interface AudioRecognitionExercise extends BaseExercise {
  type: 'audio_recognition';
  correctAnswer: {
    id: string;
    spanish: string;
    english: string;
    pronunciation?: string;
  };
  options: Array<{
    id: string;
    spanish: string;
    english: string;
  }>;
}

export interface SentenceBuildingExercise extends BaseExercise {
  type: 'sentence_building';
  targetSentence: string;
  englishTranslation: string;
  words: string[];
  hint?: string;
}

export interface CategorySortingExercise extends BaseExercise {
  type: 'category_sorting';
  categories: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
  }>;
  items: Array<{
    id: string;
    spanish: string;
    english: string;
    categoryId: string;
  }>;
}

export interface SpatialIdentificationExercise extends BaseExercise {
  type: 'spatial_identification';
  imageUrl: string;
  targetPoint: {
    id: string;
    spanish: string;
    english: string;
    x: number;
    y: number;
    pronunciation?: string;
  };
  allPoints: Array<{
    id: string;
    spanish: string;
    english: string;
    x: number;
    y: number;
  }>;
}

export interface ComparativeAnalysisExercise extends BaseExercise {
  type: 'comparative_analysis';
  birdA: {
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
  };
  birdB: {
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
  };
  questions: Array<{
    id: string;
    spanishQuestion: string;
    englishQuestion: string;
    correctBirdId: string;
    characteristic: 'size' | 'color' | 'beak' | 'habitat';
  }>;
}

export type Exercise =
  | VisualIdentificationExercise
  | TermMatchingExercise
  | AudioRecognitionExercise
  | SentenceBuildingExercise
  | CategorySortingExercise
  | SpatialIdentificationExercise
  | ComparativeAnalysisExercise;

// Spanish sentence templates for bird vocabulary
const sentenceTemplates = [
  { spanish: 'El {term} es una parte del pájaro.', english: 'The {term} is a part of the bird.' },
  { spanish: 'Puedo ver el {term} del ave.', english: 'I can see the {term} of the bird.' },
  { spanish: 'El {term} tiene colores brillantes.', english: 'The {term} has bright colors.' },
  { spanish: 'Mira el {term} de este pájaro.', english: 'Look at the {term} of this bird.' },
  { spanish: 'Este pájaro tiene un {term} grande.', english: 'This bird has a large {term}.' },
];

// Anatomical categories for sorting exercises
const anatomyCategories = [
  { id: 'head', name: 'Cabeza', description: 'Head parts', color: 'blue' },
  { id: 'body', name: 'Cuerpo', description: 'Body parts', color: 'green' },
  { id: 'wings', name: 'Alas', description: 'Wing parts', color: 'purple' },
  { id: 'tail', name: 'Cola', description: 'Tail parts', color: 'orange' },
];

// Term to category mapping
const termCategoryMap: Record<string, string> = {
  pico: 'head', beak: 'head',
  ojo: 'head', eye: 'head',
  corona: 'head', crown: 'head',
  nuca: 'head', nape: 'head',
  garganta: 'head', throat: 'head',
  pecho: 'body', breast: 'body',
  vientre: 'body', belly: 'body',
  espalda: 'body', back: 'body',
  flanco: 'body', flank: 'body',
  ala: 'wings', wing: 'wings',
  pluma: 'wings', feather: 'wings',
  cola: 'tail', tail: 'tail',
  cobertoras: 'tail', coverts: 'tail',
};

/**
 * Enhanced exercise generator that creates varied exercise types
 * from bird annotation data, balancing Spanish learning with ornithology
 */
export class EnhancedExerciseGenerator {
  private annotations: Annotation[];
  private usedIds = new Set<string>();

  constructor(annotations: Annotation[]) {
    this.annotations = annotations;
  }

  private generateId(): string {
    return `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getRandomAnnotations(count: number): Annotation[] {
    const available = this.annotations.filter(a => !this.usedIds.has(a.id));
    const shuffled = this.shuffle(available);
    const selected = shuffled.slice(0, count);
    selected.forEach(a => this.usedIds.add(a.id));
    return selected;
  }

  /**
   * Generate term matching exercise (4-6 pairs)
   */
  generateTermMatchingExercise(pairCount = 4): TermMatchingExercise | null {
    const annotations = this.getRandomAnnotations(pairCount);
    if (annotations.length < 3) return null;

    return {
      id: this.generateId(),
      type: 'term_matching',
      difficulty: Math.min(5, Math.ceil(annotations.length / 2)) as 1 | 2 | 3 | 4 | 5,
      pairs: annotations.map(a => ({
        id: a.id,
        spanish: a.spanishTerm || 'término',
        english: a.englishTerm || 'term',
        pronunciation: a.pronunciation,
      })),
    };
  }

  /**
   * Generate audio recognition exercise
   */
  generateAudioRecognitionExercise(): AudioRecognitionExercise | null {
    const annotations = this.getRandomAnnotations(4);
    if (annotations.length < 4) return null;

    const correct = annotations[0];
    return {
      id: this.generateId(),
      type: 'audio_recognition',
      difficulty: 2,
      correctAnswer: {
        id: correct.id,
        spanish: correct.spanishTerm || 'término',
        english: correct.englishTerm || 'term',
        pronunciation: correct.pronunciation,
      },
      options: annotations.map(a => ({
        id: a.id,
        spanish: a.spanishTerm || 'término',
        english: a.englishTerm || 'term',
      })),
    };
  }

  /**
   * Generate sentence building exercise
   */
  generateSentenceBuildingExercise(): SentenceBuildingExercise | null {
    const annotations = this.getRandomAnnotations(1);
    if (annotations.length < 1) return null;

    const annotation = annotations[0];
    const template = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];

    const targetSentence = template.spanish.replace('{term}', annotation.spanishTerm || 'término');
    const englishTranslation = template.english.replace('{term}', annotation.englishTerm || 'term');

    // Shuffle words
    const words = this.shuffle(targetSentence.replace(/[.,]/g, '').split(' '));

    return {
      id: this.generateId(),
      type: 'sentence_building',
      difficulty: 3,
      targetSentence,
      englishTranslation,
      words,
      hint: `Vocabulary: ${annotation.spanishTerm} = ${annotation.englishTerm}`,
    };
  }

  /**
   * Generate category sorting exercise
   */
  generateCategorySortingExercise(): CategorySortingExercise | null {
    const annotations = this.getRandomAnnotations(8);
    if (annotations.length < 4) return null;

    const items = annotations
      .map(a => {
        const term = (a.spanishTerm || '').toLowerCase();
        const categoryId = Object.entries(termCategoryMap).find(([key]) =>
          term.includes(key)
        )?.[1] || 'body';

        return {
          id: a.id,
          spanish: a.spanishTerm || 'término',
          english: a.englishTerm || 'term',
          categoryId,
        };
      })
      .filter(item => item.spanish);

    // Ensure we have items in at least 2 categories
    const categoriesUsed = new Set(items.map(i => i.categoryId));
    const activeCategories = anatomyCategories.filter(c => categoriesUsed.has(c.id));

    if (activeCategories.length < 2) return null;

    return {
      id: this.generateId(),
      type: 'category_sorting',
      difficulty: 3,
      categories: activeCategories,
      items,
    };
  }

  /**
   * Generate spatial identification exercise
   */
  generateSpatialIdentificationExercise(imageUrl: string): SpatialIdentificationExercise | null {
    // Get annotations that have bounding box data
    const annotationsWithPosition = this.annotations.filter(a =>
      a.boundingBox && (a.boundingBox.x !== undefined || (a.boundingBox as { topLeft?: { x: number } }).topLeft)
    );

    if (annotationsWithPosition.length < 2) return null;

    const shuffled = this.shuffle(annotationsWithPosition);
    const target = shuffled[0];
    const bbox = target.boundingBox as { x?: number; y?: number; width: number; height: number; topLeft?: { x: number; y: number } };

    // Calculate center position
    let x: number, y: number;
    if (bbox.topLeft) {
      x = (bbox.topLeft.x + bbox.width / 2) * 100;
      y = (bbox.topLeft.y + bbox.height / 2) * 100;
    } else {
      x = ((bbox.x ?? 0) + bbox.width / 2) * 100;
      y = ((bbox.y ?? 0) + bbox.height / 2) * 100;
    }

    this.usedIds.add(target.id);

    return {
      id: this.generateId(),
      type: 'spatial_identification',
      difficulty: 2,
      imageUrl,
      targetPoint: {
        id: target.id,
        spanish: target.spanishTerm || 'término',
        english: target.englishTerm || 'term',
        x: Math.min(95, Math.max(5, x)),
        y: Math.min(95, Math.max(5, y)),
        pronunciation: target.pronunciation,
      },
      allPoints: shuffled.slice(0, 5).map(a => {
        const aBbox = a.boundingBox as { x?: number; y?: number; width: number; height: number; topLeft?: { x: number; y: number } };
        let px: number, py: number;
        if (aBbox.topLeft) {
          px = (aBbox.topLeft.x + aBbox.width / 2) * 100;
          py = (aBbox.topLeft.y + aBbox.height / 2) * 100;
        } else {
          px = ((aBbox.x ?? 0) + aBbox.width / 2) * 100;
          py = ((aBbox.y ?? 0) + aBbox.height / 2) * 100;
        }

        return {
          id: a.id,
          spanish: a.spanishTerm || 'término',
          english: a.englishTerm || 'term',
          x: Math.min(95, Math.max(5, px)),
          y: Math.min(95, Math.max(5, py)),
        };
      }),
    };
  }

  /**
   * Generate a random exercise of any type
   */
  generateRandomExercise(imageUrl?: string): Exercise | null {
    const types: ExerciseType[] = [
      'term_matching',
      'audio_recognition',
      'sentence_building',
      'category_sorting',
    ];

    if (imageUrl) {
      types.push('spatial_identification');
    }

    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
      case 'term_matching':
        return this.generateTermMatchingExercise();
      case 'audio_recognition':
        return this.generateAudioRecognitionExercise();
      case 'sentence_building':
        return this.generateSentenceBuildingExercise();
      case 'category_sorting':
        return this.generateCategorySortingExercise();
      case 'spatial_identification':
        return this.generateSpatialIdentificationExercise(imageUrl!);
      default:
        return null;
    }
  }

  /**
   * Generate a balanced set of exercises
   */
  generateExerciseSet(count = 5, imageUrl?: string): Exercise[] {
    const exercises: Exercise[] = [];
    this.usedIds.clear();

    // Ensure variety by generating each type at least once
    const generators: Array<() => Exercise | null> = [
      () => this.generateTermMatchingExercise(),
      () => this.generateAudioRecognitionExercise(),
      () => this.generateSentenceBuildingExercise(),
      () => this.generateCategorySortingExercise(),
    ];

    if (imageUrl) {
      generators.push(() => this.generateSpatialIdentificationExercise(imageUrl));
    }

    // Generate one of each type first
    for (const generator of generators) {
      const exercise = generator();
      if (exercise) exercises.push(exercise);
      if (exercises.length >= count) break;
    }

    // Fill remaining with random exercises
    while (exercises.length < count) {
      const exercise = this.generateRandomExercise(imageUrl);
      if (exercise) {
        exercises.push(exercise);
      } else {
        break; // No more annotations available
      }
    }

    return this.shuffle(exercises);
  }

  /**
   * Reset used IDs to allow re-generation
   */
  reset(): void {
    this.usedIds.clear();
  }
}

export default EnhancedExerciseGenerator;
