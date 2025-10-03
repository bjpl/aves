/**
 * AI Exercise Generator Service - GPT-4 Integration for Dynamic Exercise Generation
 *
 * Leverages OpenAI's GPT-4 Turbo to generate context-aware, personalized exercises
 * for Spanish bird vocabulary learning with intelligent caching and cost optimization.
 */

import OpenAI from 'openai';
import { Pool } from 'pg';
import {
  Exercise,
  ExerciseType,
  VisualDiscriminationExercise,
  TermMatchingExercise,
  ContextualFillExercise,
  ImageLabelingExercise,
  VisualIdentificationExercise
} from '../../../shared/types/exercise.types';
import { UserContext } from './userContextBuilder';
import * as logger from '../utils/logger';

/**
 * Configuration options for AI Exercise Generator
 */
interface AIExerciseConfig {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  modelVersion?: string;
  maxTokens?: number;
  temperature?: number;
  costTrackingEnabled?: boolean;
}

/**
 * Generation statistics for cost tracking
 */
interface GenerationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
}

/**
 * Raw response structures from GPT-4
 */
interface GPTContextualFillResponse {
  sentence: string;
  correctAnswer: string;
  options: string[];
  context?: string;
  culturalNote?: string;
  difficulty: number;
}

interface GPTTermMatchingResponse {
  spanishTerms: string[];
  englishTerms: string[];
  correctPairs: { spanish: string; english: string }[];
  category: string;
  difficulty: number;
}

interface GPTImageLabelingResponse {
  imageUrl: string;
  labels: {
    term: string;
    correctPosition: { x: number; y: number };
  }[];
  difficulty: number;
}

/**
 * AI Exercise Generator Class
 *
 * Generates dynamic, context-aware exercises using GPT-4 Turbo
 */
export class AIExerciseGenerator {
  private client: OpenAI;
  private config: Required<AIExerciseConfig>;
  private stats: GenerationStats;

  // GPT-4 Turbo pricing (as of 2024)
  private readonly PRICING = {
    inputTokenCost: 0.01 / 1000,   // $0.01 per 1K input tokens
    outputTokenCost: 0.03 / 1000   // $0.03 per 1K output tokens
  };

  constructor(_pool?: Pool, config?: AIExerciseConfig) {
    // _pool parameter kept for future cache integration (unused for now)
    // Merge default config with provided config
    this.config = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 2000,
      modelVersion: config?.modelVersion ?? 'gpt-4-turbo',
      maxTokens: config?.maxTokens ?? 800,
      temperature: config?.temperature ?? 0.7,
      costTrackingEnabled: config?.costTrackingEnabled ?? true
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey
    });

    // Initialize statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0
    };

    logger.info('AI Exercise Generator initialized', {
      modelVersion: this.config.modelVersion,
      costTracking: this.config.costTrackingEnabled
    });
  }

  /**
   * Main method: Generate an exercise based on type and user context
   *
   * @param type - Type of exercise to generate
   * @param context - User context for personalization
   * @returns Generated exercise
   */
  async generateExercise(type: ExerciseType, context: UserContext): Promise<Exercise> {
    logger.info('Generating AI exercise', { type, userId: context.userId });

    try {
      let exercise: Exercise;

      switch (type) {
        case 'contextual_fill':
          exercise = await this.generateContextualFill(context);
          break;
        case 'term_matching':
          exercise = await this.generateTermMatching(context);
          break;
        case 'visual_discrimination':
          exercise = await this.generateVisualDiscrimination(context);
          break;
        case 'image_labeling':
          exercise = await this.generateImageLabeling(context);
          break;
        case 'visual_identification':
          exercise = await this.generateVisualIdentification(context);
          break;
        default:
          // Default to contextual fill for unknown types
          exercise = await this.generateContextualFill(context);
      }

      logger.info('Successfully generated AI exercise', {
        type,
        userId: context.userId,
        exerciseId: exercise.id
      });

      return exercise;

    } catch (error) {
      logger.error('Failed to generate AI exercise', {
        error: error instanceof Error ? error : { error },
        type,
        userId: context.userId
      });
      throw error;
    }
  }

  /**
   * Generate a contextual fill-in-the-blank exercise
   *
   * @param context - User context
   * @returns Contextual fill exercise
   */
  async generateContextualFill(context: UserContext): Promise<ContextualFillExercise> {
    const prompt = this.buildContextualFillPrompt(context);
    const response = await this.callGPTWithRetry(prompt);
    const parsed = this.parseResponse<GPTContextualFillResponse>(response);

    if (!this.validateContextualFillResponse(parsed)) {
      throw new Error('Invalid contextual fill response from GPT-4');
    }

    const exerciseId = this.generateExerciseId('contextual_fill');

    return {
      id: exerciseId,
      type: 'contextual_fill',
      sentence: parsed.sentence,
      correctAnswer: parsed.correctAnswer,
      options: parsed.options,
      instructions: 'Complete the sentence by selecting the correct Spanish word.',
      prompt: parsed.context || parsed.sentence,
      metadata: {
        difficulty: parsed.difficulty,
        culturalNote: parsed.culturalNote,
        generatedAt: new Date().toISOString(),
        userLevel: context.level
      }
    };
  }

  /**
   * Generate a term matching exercise
   *
   * @param context - User context
   * @returns Term matching exercise
   */
  async generateTermMatching(context: UserContext): Promise<TermMatchingExercise> {
    const prompt = this.buildTermMatchingPrompt(context);
    const response = await this.callGPTWithRetry(prompt);
    const parsed = this.parseResponse<GPTTermMatchingResponse>(response);

    if (!this.validateTermMatchingResponse(parsed)) {
      throw new Error('Invalid term matching response from GPT-4');
    }

    const exerciseId = this.generateExerciseId('term_matching');

    return {
      id: exerciseId,
      type: 'term_matching',
      spanishTerms: parsed.spanishTerms,
      englishTerms: parsed.englishTerms,
      correctPairs: parsed.correctPairs,
      instructions: 'Match each Spanish term with its English translation.',
      metadata: {
        difficulty: parsed.difficulty,
        category: parsed.category,
        generatedAt: new Date().toISOString(),
        userLevel: context.level
      }
    };
  }

  /**
   * Generate a visual discrimination exercise
   *
   * @param context - User context
   * @returns Visual discrimination exercise
   */
  async generateVisualDiscrimination(context: UserContext): Promise<VisualDiscriminationExercise> {
    // For visual discrimination, we need actual bird images from the database
    // This method would typically query the database for suitable images
    // For now, we'll generate the structure with placeholder data

    const exerciseId = this.generateExerciseId('visual_discrimination');

    // TODO: Query database for bird species images based on context
    // For demonstration, using placeholder structure
    return {
      id: exerciseId,
      type: 'visual_discrimination',
      targetTerm: 'cardenal',
      options: [
        { id: 'opt1', imageUrl: '/images/cardinal.jpg', species: 'cardinal' },
        { id: 'opt2', imageUrl: '/images/bluebird.jpg', species: 'bluebird' },
        { id: 'opt3', imageUrl: '/images/robin.jpg', species: 'robin' },
        { id: 'opt4', imageUrl: '/images/sparrow.jpg', species: 'sparrow' }
      ],
      correctOptionId: 'opt1',
      instructions: 'Select the image that matches the Spanish term: cardenal',
      metadata: {
        difficulty: context.difficulty,
        generatedAt: new Date().toISOString(),
        userLevel: context.level
      }
    };
  }

  /**
   * Generate an image labeling exercise
   *
   * @param context - User context
   * @returns Image labeling exercise
   */
  async generateImageLabeling(context: UserContext): Promise<ImageLabelingExercise> {
    const prompt = this.buildImageLabelingPrompt(context);
    const response = await this.callGPTWithRetry(prompt);
    const parsed = this.parseResponse<GPTImageLabelingResponse>(response);

    if (!this.validateImageLabelingResponse(parsed)) {
      throw new Error('Invalid image labeling response from GPT-4');
    }

    const exerciseId = this.generateExerciseId('image_labeling');

    return {
      id: exerciseId,
      type: 'image_labeling',
      imageUrl: parsed.imageUrl,
      labels: parsed.labels.map((label, index) => ({
        id: `label_${index}`,
        term: label.term,
        correctPosition: label.correctPosition
      })),
      instructions: 'Drag and drop the Spanish terms to label the bird anatomy correctly.',
      metadata: {
        difficulty: parsed.difficulty,
        generatedAt: new Date().toISOString(),
        userLevel: context.level
      }
    };
  }

  /**
   * Generate a visual identification exercise
   *
   * @param context - User context
   * @returns Visual identification exercise
   */
  async generateVisualIdentification(context: UserContext): Promise<VisualIdentificationExercise> {
    const exerciseId = this.generateExerciseId('visual_identification');

    // Visual identification exercises use existing annotations
    // This is a simpler generation that focuses on the prompt
    const birdParts = ['pico', 'alas', 'cola', 'patas', 'plumas', 'ojos'];
    const targetPart = context.weakTopics[0] || birdParts[Math.floor(Math.random() * birdParts.length)];

    return {
      id: exerciseId,
      type: 'visual_identification',
      prompt: `Identifique el ${targetPart} del pájaro`,
      instructions: 'Click on the bird image to identify the requested anatomical feature.',
      metadata: {
        bird: 'cardinal',
        targetPart,
        pronunciation: this.getPronunciation(targetPart),
        tip: `Look for the ${targetPart} in the image`
      }
    };
  }

  /**
   * Build prompt for contextual fill exercise
   */
  private buildContextualFillPrompt(context: UserContext): string {
    return `You are an expert Spanish language tutor specializing in bird vocabulary.

User Profile:
- Level: ${context.level}
- Current difficulty: ${context.difficulty}/5
- Struggling with: ${context.weakTopics.length > 0 ? context.weakTopics.join(', ') : 'none'}
- Mastered: ${context.masteredTopics.length > 0 ? context.masteredTopics.join(', ') : 'basic terms'}
- Current streak: ${context.streak}

Create a fill-in-the-blank exercise that:
1. Uses bird vocabulary in a natural, conversational context
2. Reviews mastered content while focusing on weaker topics
3. Matches difficulty level ${context.difficulty}/5
4. Creates a memorable sentence that helps vocabulary retention
5. Includes 4 plausible Spanish word options (1 correct, 3 distractors)

Requirements:
- Sentence must have one blank marked with ___
- Include cultural context when relevant
- Use proper Spanish grammar with accents
- Difficulty should match user level (${context.level})

Return ONLY valid JSON (no markdown, no code blocks):
{
  "sentence": "El cardenal tiene plumas _____ brillantes.",
  "correctAnswer": "rojas",
  "options": ["rojas", "azules", "verdes", "amarillas"],
  "context": "Cardinals are known for their bright red plumage.",
  "culturalNote": "In Spanish, color adjectives agree in gender with the noun.",
  "difficulty": ${context.difficulty}
}`;
  }

  /**
   * Build prompt for term matching exercise
   */
  private buildTermMatchingPrompt(context: UserContext): string {
    return `You are an expert Spanish language tutor specializing in bird vocabulary.

User Profile:
- Level: ${context.level}
- Current difficulty: ${context.difficulty}/5
- Struggling with: ${context.weakTopics.length > 0 ? context.weakTopics.join(', ') : 'none'}
- Mastered: ${context.masteredTopics.length > 0 ? context.masteredTopics.join(', ') : 'basic terms'}
- Current streak: ${context.streak}

Create a term matching exercise with 5-8 Spanish-English pairs related to birds.

Requirements:
- Focus on bird anatomy, behavior, or habitat vocabulary
- Include at least one term from weak topics if available
- Mix difficulty: include some mastered terms for confidence
- Use proper Spanish grammar with articles (el/la)
- Terms should be thematically related

Return ONLY valid JSON (no markdown, no code blocks):
{
  "spanishTerms": ["el pico", "las alas", "la cola", "las patas", "las plumas"],
  "englishTerms": ["beak", "wings", "tail", "legs", "feathers"],
  "correctPairs": [
    {"spanish": "el pico", "english": "beak"},
    {"spanish": "las alas", "english": "wings"},
    {"spanish": "la cola", "english": "tail"},
    {"spanish": "las patas", "english": "legs"},
    {"spanish": "las plumas", "english": "feathers"}
  ],
  "category": "Bird Anatomy",
  "difficulty": ${context.difficulty}
}`;
  }

  /**
   * Build prompt for image labeling exercise
   */
  private buildImageLabelingPrompt(context: UserContext): string {
    return `You are an expert Spanish language tutor specializing in bird vocabulary.

User Profile:
- Level: ${context.level}
- Current difficulty: ${context.difficulty}/5
- Focus areas: ${context.weakTopics.length > 0 ? context.weakTopics.join(', ') : 'general anatomy'}

Create an image labeling exercise for bird anatomy.

Requirements:
- Provide 4-6 anatomical terms to label
- Include normalized coordinates (0-1 range) for label positions
- Focus on clearly visible features
- Mix familiar and challenging terms

Return ONLY valid JSON (no markdown, no code blocks):
{
  "imageUrl": "/images/birds/cardinal-anatomy.jpg",
  "labels": [
    {"term": "el pico", "correctPosition": {"x": 0.45, "y": 0.30}},
    {"term": "las alas", "correctPosition": {"x": 0.35, "y": 0.50}},
    {"term": "la cola", "correctPosition": {"x": 0.70, "y": 0.60}},
    {"term": "las patas", "correctPosition": {"x": 0.50, "y": 0.80}}
  ],
  "difficulty": ${context.difficulty}
}`;
  }

  /**
   * Call GPT-4 API with retry logic
   */
  private async callGPTWithRetry(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug(`GPT-4 API call attempt ${attempt}/${this.config.maxRetries}`);

        const startTime = Date.now();

        const response = await this.client.chat.completions.create({
          model: this.config.modelVersion,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Spanish language tutor. Always respond with valid JSON only, no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from GPT-4');
        }

        const duration = Date.now() - startTime;

        // Track statistics
        if (this.config.costTrackingEnabled && response.usage) {
          this.updateStatistics(response.usage, true);
        }

        logger.debug('GPT-4 API call successful', {
          tokensUsed: response.usage?.total_tokens,
          duration,
          attempt
        });

        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`GPT-4 API call failed (attempt ${attempt}/${this.config.maxRetries})`, {
          error: lastError.message
        });

        // Track failed request
        if (this.config.costTrackingEnabled) {
          this.updateStatistics(null, false);
        }

        // Don't retry on certain errors
        if (error instanceof Error && (
          error.message.includes('API key') ||
          error.message.includes('rate limit')
        )) {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to call GPT-4 after all retries');
  }

  /**
   * Parse JSON response from GPT-4
   */
  private parseResponse<T>(response: string): T {
    try {
      // Remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanResponse);
      return parsed as T;

    } catch (error) {
      logger.error('Failed to parse GPT-4 response', {
        error: error instanceof Error ? error : { error },
        response: response.substring(0, 500)
      });
      throw new Error('Invalid JSON response from GPT-4');
    }
  }

  /**
   * Validate contextual fill response
   */
  private validateContextualFillResponse(response: GPTContextualFillResponse): boolean {
    if (!response.sentence || !response.correctAnswer || !Array.isArray(response.options)) {
      return false;
    }

    if (!response.sentence.includes('___')) {
      return false;
    }

    if (response.options.length < 2) {
      return false;
    }

    if (!response.options.includes(response.correctAnswer)) {
      return false;
    }

    if (response.difficulty && (response.difficulty < 1 || response.difficulty > 5)) {
      return false;
    }

    return true;
  }

  /**
   * Validate term matching response
   */
  private validateTermMatchingResponse(response: GPTTermMatchingResponse): boolean {
    if (!Array.isArray(response.spanishTerms) || !Array.isArray(response.englishTerms)) {
      return false;
    }

    if (!Array.isArray(response.correctPairs)) {
      return false;
    }

    if (response.spanishTerms.length !== response.englishTerms.length) {
      return false;
    }

    if (response.spanishTerms.length < 3) {
      return false;
    }

    // Verify all pairs reference valid terms
    for (const pair of response.correctPairs) {
      if (!response.spanishTerms.includes(pair.spanish) ||
          !response.englishTerms.includes(pair.english)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate image labeling response
   */
  private validateImageLabelingResponse(response: GPTImageLabelingResponse): boolean {
    if (!response.imageUrl || !Array.isArray(response.labels)) {
      return false;
    }

    if (response.labels.length < 3) {
      return false;
    }

    // Validate each label has required fields and valid coordinates
    for (const label of response.labels) {
      if (!label.term || !label.correctPosition) {
        return false;
      }

      const { x, y } = label.correctPosition;
      if (typeof x !== 'number' || typeof y !== 'number') {
        return false;
      }

      if (x < 0 || x > 1 || y < 0 || y > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update generation statistics
   */
  private updateStatistics(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null, success: boolean): void {
    this.stats.totalRequests++;

    if (success && usage) {
      this.stats.successfulRequests++;
      this.stats.totalTokensUsed += usage.total_tokens;

      // Calculate cost
      const inputCost = usage.prompt_tokens * this.PRICING.inputTokenCost;
      const outputCost = usage.completion_tokens * this.PRICING.outputTokenCost;
      const requestCost = inputCost + outputCost;

      this.stats.totalCost += requestCost;
      this.stats.averageTokensPerRequest = this.stats.totalTokensUsed / this.stats.successfulRequests;
      this.stats.averageCostPerRequest = this.stats.totalCost / this.stats.successfulRequests;

    } else {
      this.stats.failedRequests++;
    }
  }

  /**
   * Get generation statistics
   */
  getStatistics(): GenerationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0
    };
  }

  /**
   * Generate unique exercise ID
   */
  private generateExerciseId(type: string): string {
    return `ai_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get pronunciation for Spanish term (simplified)
   */
  private getPronunciation(term: string): string {
    const pronunciations: Record<string, string> = {
      'pico': 'PEE-koh',
      'alas': 'AH-lahs',
      'cola': 'KOH-lah',
      'patas': 'PAH-tahs',
      'plumas': 'PLOO-mahs',
      'ojos': 'OH-hohs',
      'cuello': 'KWAY-yoh',
      'pecho': 'PEH-choh',
      'cabeza': 'kah-BEH-sah',
      'vientre': 'vee-EN-treh'
    };

    return pronunciations[term] || term;
  }

  /**
   * Calculate estimated cost for a single exercise generation
   */
  estimateCost(): number {
    // Estimate based on typical token usage
    const avgInputTokens = 200;
    const avgOutputTokens = 100;

    const inputCost = avgInputTokens * this.PRICING.inputTokenCost;
    const outputCost = avgOutputTokens * this.PRICING.outputTokenCost;

    return inputCost + outputCost;
  }
}

export default AIExerciseGenerator;
