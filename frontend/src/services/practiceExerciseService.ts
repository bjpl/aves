// CONCEPT: Generate practice exercises from real species data with images
// WHY: Practice exercises need actual bird images from the database
// PATTERN: Service layer that transforms species data into exercise format

import { api } from './apiAdapter';
import { Species } from '../types';

export interface PracticeExercise {
  id: string;
  type: 'visual_match' | 'fill_blank' | 'multiple_choice';
  question: string;
  correctAnswer: string;
  options: string[];
  imageUrl?: string;
  imageId?: string;
  speciesId?: string;
  translation?: string;
  explanation?: string;
}

class PracticeExerciseService {
  private speciesCache: Species[] = [];
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  /**
   * Get species with images from the API/cache
   */
  private async getSpeciesWithImages(): Promise<Species[]> {
    // Use cache if recent
    const now = Date.now();
    if (this.speciesCache.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.speciesCache;
    }

    try {
      // Fetch all species from API
      const allSpecies = await api.species.list();

      // Filter to only species that have images (annotationCount > 0)
      // Note: annotationCount indicates images with annotations
      this.speciesCache = allSpecies.filter(s =>
        (s.annotationCount && s.annotationCount > 0) || s.primaryImageUrl
      );

      this.lastFetch = now;
      return this.speciesCache;
    } catch (error) {
      console.error('Failed to fetch species:', error);
      // Return cached data if available, otherwise empty array
      return this.speciesCache;
    }
  }

  /**
   * Get random species for exercises
   */
  private async getRandomSpecies(count: number): Promise<Species[]> {
    const allSpecies = await this.getSpeciesWithImages();

    if (allSpecies.length === 0) {
      return [];
    }

    // Shuffle and take first N
    const shuffled = [...allSpecies].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Generate visual match exercises (identify bird by image)
   */
  async generateVisualMatchExercises(count: number = 10): Promise<PracticeExercise[]> {
    const exercises: PracticeExercise[] = [];
    const species = await this.getRandomSpecies(count * 4); // Need extras for options

    if (species.length < 4) {
      return []; // Not enough species with images
    }

    for (let i = 0; i < Math.min(count, Math.floor(species.length / 4)); i++) {
      const targetSpecies = species[i * 4];
      const distractors = species.slice(i * 4 + 1, i * 4 + 4);

      const options = [
        targetSpecies.spanishName,
        ...distractors.map(s => s.spanishName)
      ].sort(() => Math.random() - 0.5);

      exercises.push({
        id: `visual_match_${i}_${Date.now()}`,
        type: 'visual_match',
        question: '¿Qué pájaro es este? (What bird is this?)',
        correctAnswer: targetSpecies.spanishName,
        options,
        imageUrl: this.getImageUrl(targetSpecies),
        speciesId: targetSpecies.id,
        explanation: `${targetSpecies.spanishName} - ${targetSpecies.englishName}`
      });
    }

    return exercises;
  }

  /**
   * Generate fill-in-the-blank exercises using species facts
   */
  async generateFillBlankExercises(count: number = 10): Promise<PracticeExercise[]> {
    const exercises: PracticeExercise[] = [];
    const species = await this.getRandomSpecies(count * 4);

    if (species.length < 4) {
      return [];
    }

    const templates = [
      {
        es: 'El ___ vive en ___.',
        en: 'The ___ lives in ___.',
        getBlank: (s: Species) => s.spanishName.toLowerCase(),
        getContext: (s: Species) => s.habitats?.[0] || 'bosques'
      },
      {
        es: 'El ___ es de color ___.',
        en: 'The ___ is ___ colored.',
        getBlank: (s: Species) => s.spanishName.toLowerCase(),
        getContext: (s: Species) => s.primaryColors?.[0] || 'variado'
      },
      {
        es: 'El ___ pertenece a la familia ___.',
        en: 'The ___ belongs to the ___ family.',
        getBlank: (s: Species) => s.spanishName.toLowerCase(),
        getContext: (s: Species) => s.familyName
      }
    ];

    for (let i = 0; i < Math.min(count, Math.floor(species.length / 4)); i++) {
      const targetSpecies = species[i * 4];
      const template = templates[i % templates.length];
      const distractors = species.slice(i * 4 + 1, i * 4 + 4);

      const sentence = template.es.replace('___', '___').replace('___', template.getContext(targetSpecies));
      const translation = template.en.replace('___', '___').replace('___', template.getContext(targetSpecies));

      const options = [
        template.getBlank(targetSpecies),
        ...distractors.map(s => template.getBlank(s))
      ].sort(() => Math.random() - 0.5);

      exercises.push({
        id: `fill_blank_${i}_${Date.now()}`,
        type: 'fill_blank',
        question: sentence,
        correctAnswer: template.getBlank(targetSpecies),
        options,
        translation,
        speciesId: targetSpecies.id,
        imageUrl: this.getImageUrl(targetSpecies)
      });
    }

    return exercises;
  }

  /**
   * Generate multiple choice exercises about species characteristics
   */
  async generateMultipleChoiceExercises(count: number = 10): Promise<PracticeExercise[]> {
    const exercises: PracticeExercise[] = [];
    const species = await this.getRandomSpecies(count * 4);

    if (species.length < 4) {
      return [];
    }

    const questionTemplates = [
      {
        question: (s: Species) => `¿Dónde vive el ${s.spanishName}?`,
        getCorrect: (s: Species) => s.habitats?.[0] || 'bosques',
        getOptions: (correct: string, others: Species[]) => [
          correct,
          others[0]?.habitats?.[0] || 'montañas',
          others[1]?.habitats?.[0] || 'ríos',
          others[2]?.habitats?.[0] || 'costas'
        ],
        explanation: (s: Species) => `El ${s.spanishName} vive en ${s.habitats?.[0] || 'varios hábitats'}`
      },
      {
        question: (s: Species) => `¿De qué color es el ${s.spanishName}?`,
        getCorrect: (s: Species) => s.primaryColors?.[0] || 'variado',
        getOptions: (correct: string, others: Species[]) => [
          correct,
          others[0]?.primaryColors?.[0] || 'rojo',
          others[1]?.primaryColors?.[0] || 'azul',
          others[2]?.primaryColors?.[0] || 'verde'
        ],
        explanation: (s: Species) => `El ${s.spanishName} tiene plumaje ${s.primaryColors?.join(' y ') || 'variado'}`
      },
      {
        question: (s: Species) => `¿A qué familia pertenece el ${s.spanishName}?`,
        getCorrect: (s: Species) => s.familyName,
        getOptions: (correct: string, others: Species[]) => [
          correct,
          ...others.map(o => o.familyName).filter(f => f !== correct).slice(0, 3)
        ],
        explanation: (s: Species) => `El ${s.spanishName} es de la familia ${s.familyName}`
      }
    ];

    for (let i = 0; i < Math.min(count, Math.floor(species.length / 4)); i++) {
      const targetSpecies = species[i * 4];
      const others = species.slice(i * 4 + 1, i * 4 + 4);
      const template = questionTemplates[i % questionTemplates.length];

      const correctAnswer = template.getCorrect(targetSpecies);
      const options = template.getOptions(correctAnswer, others)
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .slice(0, 4) // Ensure max 4 options
        .sort(() => Math.random() - 0.5);

      exercises.push({
        id: `multiple_choice_${i}_${Date.now()}`,
        type: 'multiple_choice',
        question: template.question(targetSpecies),
        correctAnswer,
        options,
        explanation: template.explanation(targetSpecies),
        speciesId: targetSpecies.id,
        imageUrl: this.getImageUrl(targetSpecies)
      });
    }

    return exercises;
  }

  /**
   * Generate a mixed set of practice exercises
   */
  async generateMixedExercises(totalCount: number = 30): Promise<PracticeExercise[]> {
    const perType = Math.ceil(totalCount / 3);

    const [visualMatch, fillBlank, multipleChoice] = await Promise.all([
      this.generateVisualMatchExercises(perType),
      this.generateFillBlankExercises(perType),
      this.generateMultipleChoiceExercises(perType)
    ]);

    // Combine and shuffle
    const allExercises = [...visualMatch, ...fillBlank, ...multipleChoice];
    return allExercises.sort(() => Math.random() - 0.5).slice(0, totalCount);
  }

  /**
   * Get image URL for a species
   * Tries multiple sources: primaryImageUrl, API endpoint, fallback
   */
  private getImageUrl(species: Species): string {
    // Use primaryImageUrl if available
    if (species.primaryImageUrl) {
      return species.primaryImageUrl;
    }

    // Construct API endpoint URL for species images
    // The backend will redirect to the actual image
    if (species.id) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${apiUrl}/api/species/${species.id}/image`;
    }

    // Fallback to placeholder
    return `https://via.placeholder.com/400x300?text=${encodeURIComponent(species.spanishName)}`;
  }

  /**
   * Clear the species cache to force refresh
   */
  clearCache(): void {
    this.speciesCache = [];
    this.lastFetch = 0;
  }
}

// Export singleton instance
export const practiceExerciseService = new PracticeExerciseService();
