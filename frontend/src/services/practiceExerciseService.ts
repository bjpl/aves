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
  termId?: string; // For SRS tracking
  translation?: string;
  explanation?: string;
}

class PracticeExerciseService {
  private speciesCache: Species[] = [];
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a name appears to be Spanish (vs English)
   * Spanish bird names typically have accents, specific patterns, or Spanish articles
   */
  private isLikelySpanish(name: string): boolean {
    if (!name) return false;

    // Spanish-specific characters and patterns
    const spanishPatterns = [
      /[áéíóúüñ]/i,                    // Spanish accents
      /^(el|la|los|las)\s/i,          // Spanish articles
      /(illo|illa|ito|ita|ón|ado|ido|ero|era|oso|osa)$/i, // Spanish suffixes
      /\s(de|del|común|real|grande|pequeño|azul|rojo|negro|blanco|pardo|gris)/i, // Spanish descriptors
    ];

    // Common English-only patterns (suggests it's NOT Spanish)
    const englishPatterns = [
      /\b(owl|hawk|eagle|duck|goose|sparrow|robin|crow|jay|finch|warbler|wren|thrush|swallow|heron|egret|ibis|pelican|gull|tern|dove|pigeon|woodpecker|kingfisher|hummingbird)\b/i,
      /^[A-Z][a-z]+\s[A-Z][a-z]+$/,   // "Word Word" without accents (likely English common name)
    ];

    // Check for Spanish patterns
    for (const pattern of spanishPatterns) {
      if (pattern.test(name)) return true;
    }

    // Check for English patterns (if matched, likely NOT Spanish)
    for (const pattern of englishPatterns) {
      if (pattern.test(name)) return false;
    }

    // Default: assume it could be Spanish if short or unknown
    return name.length > 3;
  }

  /**
   * Get the best Spanish name for a species, with fallback
   */
  private getDisplayName(species: Species): string {
    // If spanishName looks Spanish, use it
    if (this.isLikelySpanish(species.spanishName)) {
      return species.spanishName;
    }

    // Otherwise, use englishName with a note that Spanish name is unavailable
    // Or return the spanishName anyway (it might just be a proper noun)
    return species.spanishName || species.englishName;
  }

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
    const allSpecies = await this.getRandomSpecies(count * 4); // Need extras for options

    if (allSpecies.length < 4) {
      console.warn(`Not enough species for visual match exercises. Found ${allSpecies.length}, need at least 4.`);
      return []; // Not enough species with images
    }

    // Filter to only species with valid images
    const speciesWithImages = allSpecies.filter(s =>
      s.primaryImageUrl || s.annotationCount && s.annotationCount > 0
    );

    if (speciesWithImages.length < 4) {
      console.warn(`Not enough species WITH IMAGES for visual match. Found ${speciesWithImages.length}`);
      // Fall back to all species
    }

    const species = speciesWithImages.length >= 4 ? speciesWithImages : allSpecies;

    for (let i = 0; i < Math.min(count, Math.floor(species.length / 4)); i++) {
      const targetSpecies = species[i * 4];
      const distractors = species.slice(i * 4 + 1, i * 4 + 4);

      // Use display names that handle English/Spanish detection
      const targetName = this.getDisplayName(targetSpecies);
      const options = [
        targetName,
        ...distractors.map(s => this.getDisplayName(s))
      ].sort(() => Math.random() - 0.5);

      const imageUrl = this.getImageUrl(targetSpecies);

      exercises.push({
        id: `visual_match_${i}_${Date.now()}`,
        type: 'visual_match',
        question: '¿Qué pájaro es este? (What bird is this?)',
        correctAnswer: targetName,
        options,
        imageUrl,
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
      console.warn(`Not enough species for fill-blank exercises. Found ${species.length}, need at least 4.`);
      return [];
    }

    // Templates use {BLANK} for user answer and {CONTEXT} for the given context
    const templates = [
      {
        es: 'El {BLANK} vive en {CONTEXT}.',
        en: 'The {BLANK} lives in {CONTEXT}.',
        getBlank: (s: Species) => this.getDisplayName(s).toLowerCase(),
        getContext: (s: Species) => s.habitats?.[0] || 'bosques'
      },
      {
        es: 'El {BLANK} es de color {CONTEXT}.',
        en: 'The {BLANK} is {CONTEXT} colored.',
        getBlank: (s: Species) => this.getDisplayName(s).toLowerCase(),
        getContext: (s: Species) => s.primaryColors?.[0] || 'variado'
      },
      {
        es: 'El {BLANK} pertenece a la familia {CONTEXT}.',
        en: 'The {BLANK} belongs to the {CONTEXT} family.',
        getBlank: (s: Species) => this.getDisplayName(s).toLowerCase(),
        getContext: (s: Species) => s.familyName || 'desconocida'
      }
    ];

    for (let i = 0; i < Math.min(count, Math.floor(species.length / 4)); i++) {
      const targetSpecies = species[i * 4];
      const template = templates[i % templates.length];
      const distractors = species.slice(i * 4 + 1, i * 4 + 4);

      // Replace {CONTEXT} with the context value, leave {BLANK} as ___ for user to fill
      const sentence = template.es
        .replace('{CONTEXT}', template.getContext(targetSpecies))
        .replace('{BLANK}', '___');
      const translation = template.en
        .replace('{CONTEXT}', template.getContext(targetSpecies))
        .replace('{BLANK}', '___');

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
      console.warn(`Not enough species for multiple choice exercises. Found ${species.length}, need at least 4.`);
      return [];
    }

    const questionTemplates = [
      {
        question: (s: Species) => `¿Dónde vive el ${this.getDisplayName(s)}?`,
        getCorrect: (s: Species) => s.habitats?.[0] || 'bosques',
        getOptions: (correct: string, others: Species[]) => [
          correct,
          others[0]?.habitats?.[0] || 'montañas',
          others[1]?.habitats?.[0] || 'ríos',
          others[2]?.habitats?.[0] || 'costas'
        ],
        explanation: (s: Species) => `El ${this.getDisplayName(s)} vive en ${s.habitats?.[0] || 'varios hábitats'}`
      },
      {
        question: (s: Species) => `¿De qué color es el ${this.getDisplayName(s)}?`,
        getCorrect: (s: Species) => s.primaryColors?.[0] || 'variado',
        getOptions: (correct: string, others: Species[]) => [
          correct,
          others[0]?.primaryColors?.[0] || 'rojo',
          others[1]?.primaryColors?.[0] || 'azul',
          others[2]?.primaryColors?.[0] || 'verde'
        ],
        explanation: (s: Species) => `El ${this.getDisplayName(s)} tiene plumaje ${s.primaryColors?.join(' y ') || 'variado'}`
      },
      {
        question: (s: Species) => `¿A qué familia pertenece el ${this.getDisplayName(s)}?`,
        getCorrect: (s: Species) => s.familyName,
        getOptions: (correct: string, others: Species[]) => [
          correct,
          ...others.map(o => o.familyName).filter(f => f !== correct).slice(0, 3)
        ],
        explanation: (s: Species) => `El ${this.getDisplayName(s)} es de la familia ${s.familyName}`
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

    if (allExercises.length === 0) {
      console.warn('No exercises could be generated. Species data may be missing or insufficient.');
    }

    return allExercises.sort(() => Math.random() - 0.5).slice(0, totalCount);
  }

  /**
   * Get image URL for a species
   * Tries multiple sources: primaryImageUrl, API endpoint, fallback
   */
  private getImageUrl(species: Species): string {
    // Use primaryImageUrl if available and valid
    if (species.primaryImageUrl && species.primaryImageUrl.startsWith('http')) {
      return species.primaryImageUrl;
    }

    // Check if species has images array with valid URLs
    if (species.images && species.images.length > 0) {
      const firstImage = species.images[0];
      if (firstImage.url && firstImage.url.startsWith('http')) {
        return firstImage.url;
      }
    }

    // Construct API endpoint URL for species images
    // The backend will redirect to the actual image
    if (species.id) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${apiUrl}/api/species/${species.id}/image`;
    }

    // Fallback to a real bird image from Unsplash (better UX than placeholder)
    const birdImages = [
      'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1480044965905-02098d419e96?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    ];
    return birdImages[Math.floor(Math.random() * birdImages.length)];
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
