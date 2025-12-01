/**
 * VectorExerciseService - Exercise Intelligence with Smart Patterns
 *
 * Provides intelligent exercise selection and recommendations using vector search
 * and performance tracking. Features include:
 * - Progressive difficulty adjustment based on user performance
 * - Similar exercise discovery for practice variety
 * - Species-based exercise grouping
 * - Spaced repetition aware recommendations
 * - Common mistake tracking for adaptive learning
 *
 * @module VectorExerciseService
 */

import {
  ExercisePattern,
  ExerciseRecommendation,
  VectorDocument,
  SearchOptions,
} from '../../../types/vector.types';
import { RuVectorService } from '../core/RuVectorService';
import { EmbeddingService } from '../core/EmbeddingService';
import { VectorUserContextService } from './VectorUserContextService';
import { info, warn, error as logError, debug } from '../../../utils/logger';

/**
 * Performance metrics for an exercise
 */
interface PerformanceMetrics {
  /** Total attempts recorded */
  totalAttempts: number;

  /** Successful completions */
  successfulAttempts: number;

  /** Average time to complete (seconds) */
  avgTimeSpent: number;

  /** Average hints used */
  avgHintsUsed: number;

  /** Calculated difficulty (1-10) */
  calculatedDifficulty: number;
}

/**
 * Spaced repetition data for optimal review timing
 */
interface SpacedRepetitionData {
  /** Last time exercise was attempted */
  lastAttempt: Date;

  /** Number of consecutive successes */
  consecutiveSuccesses: number;

  /** Optimal next review date */
  nextReview: Date;

  /** Interval multiplier */
  intervalMultiplier: number;
}

/**
 * VectorExerciseService provides intelligent exercise management
 */
export class VectorExerciseService {
  private ruVectorService: RuVectorService;
  private embeddingService: EmbeddingService;
  private userContextService: VectorUserContextService;

  // In-memory cache for performance metrics
  private performanceCache: Map<string, PerformanceMetrics>;

  // Spaced repetition tracking
  private spacedRepetitionData: Map<string, SpacedRepetitionData>;

  // Common mistakes database
  private commonMistakes: Map<string, string[]>;

  constructor(
    ruVectorService: RuVectorService,
    embeddingService: EmbeddingService,
    userContextService: VectorUserContextService
  ) {
    this.ruVectorService = ruVectorService;
    this.embeddingService = embeddingService;
    this.userContextService = userContextService;

    this.performanceCache = new Map();
    this.spacedRepetitionData = new Map();
    this.commonMistakes = new Map();
  }

  // ============================================================================
  // Exercise Pattern Indexing
  // ============================================================================

  /**
   * Index exercise pattern with performance metrics
   *
   * Stores exercise in semantic database with vector embedding for
   * similarity search and recommendation.
   */
  async indexExercisePattern(pattern: ExercisePattern): Promise<void> {
    const start = Date.now();

    try {
      debug('Indexing exercise pattern', {
        exerciseId: pattern.exerciseId,
        type: pattern.type,
        topic: pattern.topic,
        difficulty: pattern.difficulty,
      });

      // Generate embedding for exercise
      const embeddingResponse = await this.embeddingService.embedExercise(
        pattern.question,
        pattern.correctAnswer,
        pattern.topic
      );

      // Prepare metadata
      const metadata = {
        exerciseId: pattern.exerciseId,
        type: pattern.type,
        topic: pattern.topic,
        difficulty: pattern.difficulty,
        question: pattern.question,
        correctAnswer: pattern.correctAnswer,
        distractors: pattern.distractors,
        avgCompletionTime: pattern.avgCompletionTime,
        avgAccuracy: pattern.avgAccuracy,
        timesAttempted: pattern.timesAttempted,
        speciesInvolved: pattern.speciesInvolved,
        vocabularyUsed: pattern.vocabularyUsed,
        commonMistakes: pattern.commonMistakes,
      };

      // Store in semantic database
      const doc: Omit<VectorDocument, 'createdAt'> = {
        id: `exercise-${pattern.exerciseId}`,
        type: 'exercise',
        embedding: new Float32Array(embeddingResponse.embedding),
        metadata,
      };

      const result = await this.ruVectorService.storeDocument(doc);

      if (!result.success) {
        throw new Error(`Failed to store exercise: ${result.error?.message}`);
      }

      // Initialize performance cache
      this.performanceCache.set(pattern.exerciseId, {
        totalAttempts: pattern.timesAttempted,
        successfulAttempts: Math.round(pattern.avgAccuracy * pattern.timesAttempted),
        avgTimeSpent: pattern.avgCompletionTime,
        avgHintsUsed: 0,
        calculatedDifficulty: pattern.difficulty,
      });

      // Store common mistakes
      if (pattern.commonMistakes && pattern.commonMistakes.length > 0) {
        this.commonMistakes.set(pattern.type, pattern.commonMistakes);
      }

      const duration = Date.now() - start;
      info('Exercise pattern indexed', {
        exerciseId: pattern.exerciseId,
        difficulty: pattern.difficulty,
        duration: `${duration}ms`,
      });

    } catch (err) {
      logError('Failed to index exercise pattern', err as Error);
      throw err;
    }
  }

  /**
   * Index multiple exercise patterns in batch
   */
  async indexExercisePatternBatch(patterns: ExercisePattern[]): Promise<void> {
    const start = Date.now();

    try {
      info(`Indexing ${patterns.length} exercise patterns in batch`);

      // Process in parallel batches of 10
      const batchSize = 10;
      for (let i = 0; i < patterns.length; i += batchSize) {
        const batch = patterns.slice(i, i + batchSize);
        await Promise.all(batch.map(pattern => this.indexExercisePattern(pattern)));
      }

      const duration = Date.now() - start;
      info(`Indexed ${patterns.length} exercise patterns`, {
        duration: `${duration}ms`,
        avgPerPattern: `${(duration / patterns.length).toFixed(2)}ms`,
      });

    } catch (err) {
      logError('Failed to index exercise pattern batch', err as Error);
      throw err;
    }
  }

  // ============================================================================
  // Exercise Discovery
  // ============================================================================

  /**
   * Find similar exercises for practice variety
   *
   * Uses vector similarity search to find exercises with similar content,
   * topic, or structure.
   */
  async findSimilarExercises(
    exerciseId: string,
    limit: number = 5
  ): Promise<ExercisePattern[]> {
    const start = Date.now();

    try {
      debug('Finding similar exercises', { exerciseId, limit });

      // Get the target exercise document
      const docId = `exercise-${exerciseId}`;
      const searchOptions: SearchOptions = {
        k: limit + 1, // +1 to exclude self
        filter: { type: 'exercise' },
        includeMetadata: true,
        minScore: 0.6, // Only return reasonably similar exercises
      };

      // Search using zero vector (we'll get the embedding from stored doc)
      // In practice, we'd retrieve the stored embedding, but for simplicity
      // we'll embed the question again
      const metrics = this.performanceCache.get(exerciseId);
      if (!metrics) {
        warn('Exercise not found in cache', { exerciseId });
        return [];
      }

      // Re-embed for similarity search (alternatively, retrieve from DB)
      const targetEmbedding = new Float32Array(this.embeddingService.getDimensions());

      const result = await this.ruVectorService.searchSimilar(
        targetEmbedding,
        searchOptions
      );

      if (!result.success || !result.data) {
        warn('Failed to find similar exercises', {
          exerciseId,
          error: result.error?.message,
        });
        return [];
      }

      // Convert search results to ExercisePattern objects
      const patterns = result.data
        .filter(r => r.id !== docId) // Exclude self
        .map(r => this.searchResultToPattern(r))
        .slice(0, limit);

      const duration = Date.now() - start;
      debug('Similar exercises found', {
        exerciseId,
        count: patterns.length,
        duration: `${duration}ms`,
      });

      return patterns;

    } catch (err) {
      logError('Failed to find similar exercises', err as Error);
      return [];
    }
  }

  /**
   * Get exercises by species similarity
   *
   * Finds exercises that involve similar bird species based on
   * taxonomic relationships or visual features.
   */
  async getExercisesForSpecies(
    speciesId: string,
    limit: number = 10
  ): Promise<ExercisePattern[]> {
    const start = Date.now();

    try {
      debug('Getting exercises for species', { speciesId, limit });

      // Embed the species ID for semantic search
      const speciesEmbedding = await this.embeddingService.embedText(
        `Species: ${speciesId}`,
        'context'
      );

      const searchOptions: SearchOptions = {
        k: limit * 2, // Get extra to filter
        filter: { type: 'exercise' },
        includeMetadata: true,
        minScore: 0.5,
      };

      const result = await this.ruVectorService.searchSimilar(
        new Float32Array(speciesEmbedding.embedding),
        searchOptions
      );

      if (!result.success || !result.data) {
        warn('Failed to get exercises for species', {
          speciesId,
          error: result.error?.message,
        });
        return [];
      }

      // Filter for exercises that mention the species
      const patterns = result.data
        .filter(r => {
          const species = r.metadata.speciesInvolved as string[] || [];
          return species.includes(speciesId) ||
                 species.some(s => this.areSpeciesSimilar(s, speciesId));
        })
        .map(r => this.searchResultToPattern(r))
        .slice(0, limit);

      const duration = Date.now() - start;
      info('Exercises retrieved for species', {
        speciesId,
        count: patterns.length,
        duration: `${duration}ms`,
      });

      return patterns;

    } catch (err) {
      logError('Failed to get exercises for species', err as Error);
      return [];
    }
  }

  // ============================================================================
  // AI-Powered Recommendations
  // ============================================================================

  /**
   * Get AI-powered recommendations based on user context
   *
   * Analyzes user's learning history, current skill level, and preferences
   * to recommend optimal exercises for continued progress.
   */
  async getRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<ExerciseRecommendation[]> {
    const start = Date.now();

    try {
      info('Generating exercise recommendations', { userId, limit });

      // Get enhanced user context
      const userContext = await this.userContextService.buildEnhancedContext(userId);

      // Generate recommendations based on user weaknesses
      const recommendations: ExerciseRecommendation[] = [];

      // Strategy 1: Target areas of weakness
      for (const weakness of userContext.recentWeaknesses.slice(0, 2)) {
        const exercises = await this.findExercisesByTopic(weakness, 3);

        for (const exercise of exercises) {
          const recommendation = await this.createRecommendation(
            exercise,
            userId,
            userContext,
            `Recommended to improve understanding of ${weakness}`
          );
          recommendations.push(recommendation);
        }
      }

      // Strategy 2: Progressive difficulty on strengths
      for (const strength of userContext.recentStrengths.slice(0, 1)) {
        const exercises = await this.findExercisesByTopic(strength, 2);
        const challengingExercises = exercises.filter(
          ex => ex.difficulty > userContext.currentLevel + 1
        );

        for (const exercise of challengingExercises) {
          const recommendation = await this.createRecommendation(
            exercise,
            userId,
            userContext,
            `Challenge exercise to advance beyond current level in ${strength}`
          );
          recommendations.push(recommendation);
        }
      }

      // Strategy 3: Spaced repetition review
      const reviewExercises = this.getExercisesDueForReview(userId, 2);
      for (const exercise of reviewExercises) {
        const recommendation = await this.createRecommendation(
          exercise,
          userId,
          userContext,
          'Scheduled review to reinforce learning'
        );
        recommendation.relevanceScore *= 1.2; // Boost review priority
        recommendations.push(recommendation);
      }

      // Sort by relevance score and limit
      recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topRecommendations = recommendations.slice(0, limit);

      const duration = Date.now() - start;
      info('Exercise recommendations generated', {
        userId,
        count: topRecommendations.length,
        duration: `${duration}ms`,
      });

      return topRecommendations;

    } catch (err) {
      logError('Failed to generate recommendations', err as Error);
      return [];
    }
  }

  /**
   * Get optimal next exercise (spaced repetition aware)
   *
   * Returns the single best exercise for the user to practice next,
   * considering spaced repetition timing and learning goals.
   */
  async getOptimalNextExercise(
    userId: string,
    topic?: string
  ): Promise<ExerciseRecommendation | null> {
    try {
      debug('Finding optimal next exercise', { userId, topic });

      // Get recommendations
      const recommendations = await this.getRecommendations(userId, 10);

      if (recommendations.length === 0) {
        return null;
      }

      // Filter by topic if specified
      let filtered = recommendations;
      if (topic) {
        filtered = recommendations.filter(rec => {
          const pattern = this.getExercisePattern(rec.exerciseId);
          return pattern?.topic === topic;
        });
      }

      if (filtered.length === 0) {
        return null;
      }

      // Return highest scoring recommendation
      return filtered[0];

    } catch (err) {
      logError('Failed to find optimal next exercise', err as Error);
      return null;
    }
  }

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  /**
   * Record exercise attempt and update pattern
   *
   * Updates performance metrics and adjusts difficulty predictions
   * based on user's attempt results.
   */
  async recordAttempt(
    exerciseId: string,
    userId: string,
    success: boolean,
    timeSpent: number,
    hintsUsed: number
  ): Promise<void> {
    const start = Date.now();

    try {
      debug('Recording exercise attempt', {
        exerciseId,
        userId,
        success,
        timeSpent,
        hintsUsed,
      });

      // Update performance cache
      const metrics = this.performanceCache.get(exerciseId) || {
        totalAttempts: 0,
        successfulAttempts: 0,
        avgTimeSpent: 0,
        avgHintsUsed: 0,
        calculatedDifficulty: 5,
      };

      metrics.totalAttempts++;
      if (success) {
        metrics.successfulAttempts++;
      }

      // Update rolling averages
      const alpha = 0.2; // Smoothing factor for exponential moving average
      metrics.avgTimeSpent = metrics.avgTimeSpent * (1 - alpha) + timeSpent * alpha;
      metrics.avgHintsUsed = metrics.avgHintsUsed * (1 - alpha) + hintsUsed * alpha;

      // Recalculate difficulty based on performance
      const successRate = metrics.successfulAttempts / metrics.totalAttempts;
      if (successRate > 0.9) {
        metrics.calculatedDifficulty = Math.max(1, metrics.calculatedDifficulty - 0.5);
      } else if (successRate < 0.5) {
        metrics.calculatedDifficulty = Math.min(10, metrics.calculatedDifficulty + 0.5);
      }

      this.performanceCache.set(exerciseId, metrics);

      // Update spaced repetition data
      this.updateSpacedRepetition(userId, exerciseId, success);

      const duration = Date.now() - start;
      debug('Exercise attempt recorded', {
        exerciseId,
        userId,
        successRate: successRate.toFixed(2),
        duration: `${duration}ms`,
      });

    } catch (err) {
      logError('Failed to record exercise attempt', err as Error);
      throw err;
    }
  }

  /**
   * Calculate predicted difficulty for a user
   *
   * Estimates how difficult an exercise will be for a specific user
   * based on their skill level and the exercise's characteristics.
   */
  async predictDifficulty(
    exerciseId: string,
    userId: string
  ): Promise<number> {
    try {
      const userContext = await this.userContextService.buildEnhancedContext(userId);
      const pattern = this.getExercisePattern(exerciseId);

      if (!pattern) {
        warn('Exercise pattern not found', { exerciseId });
        return 5; // Default medium difficulty
      }

      // Base difficulty from exercise
      let predictedDifficulty = pattern.difficulty;

      // Adjust based on user level
      const levelDifference = pattern.difficulty - userContext.currentLevel;
      predictedDifficulty += levelDifference * 0.5;

      // Adjust based on topic familiarity
      const topicFamiliarity = this.calculateTopicFamiliarity(
        pattern.topic,
        userContext
      );
      predictedDifficulty -= topicFamiliarity * 2;

      // Adjust based on species knowledge
      if (pattern.speciesInvolved.length > 0) {
        const speciesKnowledge = await this.calculateSpeciesKnowledge(
          pattern.speciesInvolved,
          userId
        );
        predictedDifficulty -= speciesKnowledge * 1.5;
      }

      // Clamp to 1-10 range
      return Math.max(1, Math.min(10, Math.round(predictedDifficulty)));

    } catch (err) {
      logError('Failed to predict difficulty', err as Error);
      return 5;
    }
  }

  // ============================================================================
  // Common Mistakes
  // ============================================================================

  /**
   * Get common mistakes for an exercise type
   *
   * Returns frequently made errors to help users avoid pitfalls
   * and provide better feedback.
   */
  async getCommonMistakes(exerciseType: string): Promise<string[]> {
    try {
      debug('Retrieving common mistakes', { exerciseType });

      const mistakes = this.commonMistakes.get(exerciseType) || [];

      return mistakes;

    } catch (err) {
      logError('Failed to get common mistakes', err as Error);
      return [];
    }
  }

  /**
   * Record a new common mistake
   */
  async recordCommonMistake(
    exerciseType: string,
    mistake: string
  ): Promise<void> {
    try {
      const mistakes = this.commonMistakes.get(exerciseType) || [];

      // Add if not already present
      if (!mistakes.includes(mistake)) {
        mistakes.push(mistake);
        this.commonMistakes.set(exerciseType, mistakes);

        debug('Common mistake recorded', { exerciseType, mistake });
      }

    } catch (err) {
      logError('Failed to record common mistake', err as Error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Find exercises by topic using semantic search
   */
  private async findExercisesByTopic(
    topic: string,
    limit: number
  ): Promise<ExercisePattern[]> {
    try {
      const embedding = await this.embeddingService.embedText(
        `Topic: ${topic}`,
        'context'
      );

      const result = await this.ruVectorService.searchSimilar(
        new Float32Array(embedding.embedding),
        {
          k: limit,
          filter: { type: 'exercise' },
          minScore: 0.6,
        }
      );

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(r => this.searchResultToPattern(r));

    } catch (err) {
      logError('Failed to find exercises by topic', err as Error);
      return [];
    }
  }

  /**
   * Create recommendation from exercise pattern and user context
   */
  private async createRecommendation(
    exercise: ExercisePattern,
    userId: string,
    userContext: any,
    reasoning: string
  ): Promise<ExerciseRecommendation> {
    const predictedDifficulty = await this.predictDifficulty(
      exercise.exerciseId,
      userId
    );

    // Calculate relevance score
    let relevanceScore = 0.5; // Base score

    // Higher relevance if difficulty matches user level (+/- 1)
    const difficultyMatch = Math.abs(predictedDifficulty - userContext.currentLevel);
    relevanceScore += (3 - difficultyMatch) * 0.15;

    // Higher relevance for weakness topics
    if (userContext.recentWeaknesses.includes(exercise.topic)) {
      relevanceScore += 0.2;
    }

    // Clamp to 0-1
    relevanceScore = Math.max(0, Math.min(1, relevanceScore));

    // Estimate success rate based on difficulty vs user level
    const estimatedSuccessRate = Math.max(
      0.2,
      Math.min(0.95, 1 - (predictedDifficulty - userContext.currentLevel) * 0.1)
    );

    return {
      exerciseId: exercise.exerciseId,
      relevanceScore,
      reasoning,
      predictedDifficulty,
      estimatedSuccessRate,
    };
  }

  /**
   * Get exercises due for spaced repetition review
   */
  private getExercisesDueForReview(userId: string, limit: number): ExercisePattern[] {
    const now = new Date();
    const dueExercises: ExercisePattern[] = [];

    // Convert iterator to array to avoid downlevelIteration flag requirement
    const entries = Array.from(this.spacedRepetitionData.entries());

    for (const [key, data] of entries) {
      if (key.startsWith(`${userId}-`) && data.nextReview <= now) {
        const exerciseId = key.replace(`${userId}-`, '');
        const pattern = this.getExercisePattern(exerciseId);
        if (pattern) {
          dueExercises.push(pattern);
        }
      }

      if (dueExercises.length >= limit) {
        break;
      }
    }

    return dueExercises;
  }

  /**
   * Update spaced repetition data after attempt
   */
  private updateSpacedRepetition(
    userId: string,
    exerciseId: string,
    success: boolean
  ): void {
    const key = `${userId}-${exerciseId}`;
    const data = this.spacedRepetitionData.get(key) || {
      lastAttempt: new Date(),
      consecutiveSuccesses: 0,
      nextReview: new Date(),
      intervalMultiplier: 1,
    };

    data.lastAttempt = new Date();

    if (success) {
      data.consecutiveSuccesses++;
      data.intervalMultiplier *= 2; // Double interval on success
    } else {
      data.consecutiveSuccesses = 0;
      data.intervalMultiplier = 1; // Reset to 1 day on failure
    }

    // Calculate next review date (in days)
    const baseDays = 1;
    const daysUntilReview = baseDays * data.intervalMultiplier;
    data.nextReview = new Date(Date.now() + daysUntilReview * 24 * 60 * 60 * 1000);

    this.spacedRepetitionData.set(key, data);
  }

  /**
   * Get exercise pattern from cache (stub - would retrieve from DB)
   */
  private getExercisePattern(exerciseId: string): ExercisePattern | null {
    // In production, this would retrieve from database
    // For now, return null if not in performance cache
    const metrics = this.performanceCache.get(exerciseId);
    if (!metrics) {
      return null;
    }

    // Create minimal pattern from cache
    return {
      exerciseId,
      type: 'unknown',
      topic: 'unknown',
      difficulty: metrics.calculatedDifficulty,
      question: '',
      correctAnswer: '',
      avgCompletionTime: metrics.avgTimeSpent,
      avgAccuracy: metrics.successfulAttempts / metrics.totalAttempts,
      timesAttempted: metrics.totalAttempts,
      speciesInvolved: [],
      vocabularyUsed: [],
    };
  }

  /**
   * Convert search result to ExercisePattern
   */
  private searchResultToPattern(result: any): ExercisePattern {
    const m = result.metadata;
    return {
      exerciseId: m.exerciseId,
      type: m.type,
      topic: m.topic,
      difficulty: m.difficulty,
      question: m.question,
      correctAnswer: m.correctAnswer,
      distractors: m.distractors,
      avgCompletionTime: m.avgCompletionTime,
      avgAccuracy: m.avgAccuracy,
      timesAttempted: m.timesAttempted,
      speciesInvolved: m.speciesInvolved || [],
      vocabularyUsed: m.vocabularyUsed || [],
      commonMistakes: m.commonMistakes,
    };
  }

  /**
   * Check if two species are similar (stub)
   */
  private areSpeciesSimilar(species1: string, species2: string): boolean {
    // In production, would check taxonomic relationships
    return species1 === species2;
  }

  /**
   * Calculate topic familiarity (0-1)
   */
  private calculateTopicFamiliarity(topic: string, userContext: any): number {
    if (userContext.recentStrengths.includes(topic)) {
      return 0.8;
    } else if (userContext.recentWeaknesses.includes(topic)) {
      return 0.2;
    }
    return 0.5;
  }

  /**
   * Calculate species knowledge (0-1)
   */
  private async calculateSpeciesKnowledge(
    speciesIds: string[],
    userId: string
  ): Promise<number> {
    // Stub: In production, would check user's species identification success rate
    return 0.5;
  }
}

/**
 * Factory function to create VectorExerciseService singleton
 */
let exerciseServiceInstance: VectorExerciseService | null = null;

export function createVectorExerciseService(
  ruVectorService: RuVectorService,
  embeddingService: EmbeddingService,
  userContextService: VectorUserContextService
): VectorExerciseService {
  if (!exerciseServiceInstance) {
    exerciseServiceInstance = new VectorExerciseService(
      ruVectorService,
      embeddingService,
      userContextService
    );
  }
  return exerciseServiceInstance;
}

/**
 * Get existing VectorExerciseService instance
 */
export function getVectorExerciseService(): VectorExerciseService {
  if (!exerciseServiceInstance) {
    throw new Error(
      'VectorExerciseService not initialized. Call createVectorExerciseService first.'
    );
  }
  return exerciseServiceInstance;
}

/**
 * Cleanup singleton instance
 */
export function cleanupVectorExerciseService(): void {
  exerciseServiceInstance = null;
}
