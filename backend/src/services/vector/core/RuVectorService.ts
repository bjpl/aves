/**
 * RuVectorService - Vector Database Service with Dual-Database Architecture
 *
 * Wraps RuVector's native Rust implementation to provide:
 * - Semantic Database: Vocabulary, annotations, exercises, species knowledge
 * - Agentic Database: User learning episodes, reflexion memory, skill tracking
 *
 * This service provides a unified interface for all vector operations while
 * maintaining separation between content knowledge and user learning data.
 *
 * @module RuVectorService
 */

import VectorDB from 'ruvector';
import {
  VectorConfig,
  VectorHealth,
  VectorDocument,
  SearchOptions,
  SearchResult,
  HybridSearchOptions,
  VectorStats,
  VectorOperation,
  VectorError,
  ReflexionEpisode,
  SkillEntry,
  ExperienceQuery,
  VectorDocumentType,
} from '../../../types/vector.types';
import { EmbeddingService } from './EmbeddingService';
import { info, warn, error as logError, debug } from '../../../utils/logger';

/**
 * RuVectorService class providing dual-database vector operations
 */
export class RuVectorService {
  private config: VectorConfig;
  private embeddingService: EmbeddingService;

  // Dual VectorDB instances
  private semanticDb: InstanceType<typeof VectorDB> | null = null;
  private agenticDb: InstanceType<typeof VectorDB> | null = null;

  // Health tracking
  private health: VectorHealth = {
    isHealthy: false,
    semanticDbConnected: false,
    agenticDbConnected: false,
    lastChecked: new Date(),
  };

  // Health check interval
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: VectorConfig, embeddingService: EmbeddingService) {
    this.config = config;
    this.embeddingService = embeddingService;
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Initialize both semantic and agentic vector databases
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    info('Initializing RuVectorService with dual-database architecture');

    try {
      // Initialize semantic database (content knowledge)
      await this.initializeSemanticDb();

      // Initialize agentic database (learning memory)
      await this.initializeAgenticDb();

      // Update health status
      await this.performHealthCheck();

      // Start periodic health checks
      this.startHealthCheckMonitoring();

      const duration = Date.now() - startTime;
      info(`RuVectorService initialized successfully in ${duration}ms`, {
        semanticDbPath: this.config.semanticStoragePath,
        agenticDbPath: this.config.agenticStoragePath,
        dimensions: this.config.dimensions,
      });
    } catch (err) {
      logError('Failed to initialize RuVectorService', err as Error);
      throw this.createVectorError('CONNECTION_ERROR', err);
    }
  }

  /**
   * Initialize semantic database for content knowledge
   */
  private async initializeSemanticDb(): Promise<void> {
    try {
      this.semanticDb = new VectorDB({
        path: this.config.semanticStoragePath,
        dimensions: this.config.dimensions,
      });

      this.health.semanticDbConnected = true;
      debug('Semantic database initialized', {
        path: this.config.semanticStoragePath,
      });
    } catch (err) {
      this.health.semanticDbConnected = false;
      throw new Error(`Failed to initialize semantic database: ${err}`);
    }
  }

  /**
   * Initialize agentic database for learning memory
   */
  private async initializeAgenticDb(): Promise<void> {
    try {
      this.agenticDb = new VectorDB({
        path: this.config.agenticStoragePath,
        dimensions: this.config.dimensions,
      });

      this.health.agenticDbConnected = true;
      debug('Agentic database initialized', {
        path: this.config.agenticStoragePath,
      });
    } catch (err) {
      this.health.agenticDbConnected = false;
      throw new Error(`Failed to initialize agentic database: ${err}`);
    }
  }

  /**
   * Close database connections and cleanup resources
   */
  async close(): Promise<void> {
    info('Closing RuVectorService connections');

    // Stop health check monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close semantic database
    if (this.semanticDb) {
      try {
        await this.semanticDb.close();
        this.health.semanticDbConnected = false;
        debug('Semantic database closed');
      } catch (err) {
        warn('Error closing semantic database', { error: String(err) });
      }
    }

    // Close agentic database
    if (this.agenticDb) {
      try {
        await this.agenticDb.close();
        this.health.agenticDbConnected = false;
        debug('Agentic database closed');
      } catch (err) {
        warn('Error closing agentic database', { error: String(err) });
      }
    }

    this.health.isHealthy = false;
    info('RuVectorService closed successfully');
  }

  /**
   * Perform health check on both databases
   */
  async healthCheck(): Promise<VectorHealth> {
    await this.performHealthCheck();
    return { ...this.health };
  }

  /**
   * Internal health check implementation
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check semantic database
      if (this.semanticDb) {
        // Try a simple operation to verify connectivity
        this.health.semanticDbConnected = true;
      } else {
        this.health.semanticDbConnected = false;
      }

      // Check agentic database
      if (this.agenticDb) {
        this.health.agenticDbConnected = true;
      } else {
        this.health.agenticDbConnected = false;
      }

      // Update overall health
      this.health.isHealthy =
        this.health.semanticDbConnected &&
        this.health.agenticDbConnected;

      this.health.lastChecked = new Date();

      if (!this.health.isHealthy) {
        this.health.errorMessage = 'One or more databases are not connected';
      } else {
        delete this.health.errorMessage;
      }
    } catch (err) {
      this.health.isHealthy = false;
      this.health.errorMessage = String(err);
      logError('Health check failed', err as Error);
    }
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    debug('Health check monitoring started', {
      intervalMs: this.config.healthCheckIntervalMs,
    });
  }

  // ============================================================================
  // Semantic Operations (Content Knowledge)
  // ============================================================================

  /**
   * Store a single document in semantic database
   */
  async storeDocument(
    doc: Omit<VectorDocument, 'createdAt'>
  ): Promise<VectorOperation<string>> {
    const start = Date.now();

    try {
      this.ensureSemanticDbConnected();

      // Insert vector into semantic database
      await this.semanticDb!.insert({
        id: doc.id,
        vector: Array.from(doc.embedding),
        metadata: {
          type: doc.type,
          ...doc.metadata,
        },
      });

      const duration = Date.now() - start;
      debug(`Stored document ${doc.id}`, {
        type: doc.type,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: doc.id,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to store document ${doc.id}`, err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeBatch(
    docs: Omit<VectorDocument, 'createdAt'>[]
  ): Promise<VectorOperation<string[]>> {
    const start = Date.now();

    try {
      this.ensureSemanticDbConnected();

      // Insert all vectors in batch
      const ids: string[] = [];
      for (const doc of docs) {
        await this.semanticDb!.insert({
          id: doc.id,
          vector: Array.from(doc.embedding),
          metadata: {
            type: doc.type,
            ...doc.metadata,
          },
        });
        ids.push(doc.id);
      }

      const duration = Date.now() - start;
      info(`Stored ${docs.length} documents in batch`, {
        duration: `${duration}ms`,
        avgPerDoc: `${(duration / docs.length).toFixed(2)}ms`,
      });

      return {
        success: true,
        data: ids,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to store batch of ${docs.length} documents`, err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Search for similar vectors in semantic database
   */
  async searchSimilar(
    embedding: Float32Array,
    options: SearchOptions = {}
  ): Promise<VectorOperation<SearchResult[]>> {
    const start = Date.now();
    const k = options.k || 10;

    try {
      this.ensureSemanticDbConnected();

      // Perform vector search
      const results = await this.semanticDb!.search({
        vector: Array.from(embedding),
        k,
        filter: options.filter,
      });

      // Transform results to SearchResult format
      const searchResults: SearchResult[] = results.map((result: any) => ({
        id: result.id,
        score: result.score,
        type: result.metadata?.type || 'unknown',
        metadata: result.metadata || {},
      }));

      // Filter by minimum score if specified
      const filteredResults = options.minScore
        ? searchResults.filter(r => r.score >= options.minScore!)
        : searchResults;

      const duration = Date.now() - start;
      debug(`Similarity search completed`, {
        resultsFound: filteredResults.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: filteredResults,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Similarity search failed', err as Error);

      return {
        success: false,
        error: this.createVectorError('SEARCH_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Hybrid search combining vector similarity and text matching
   */
  async hybridSearch(
    embedding: Float32Array,
    options: HybridSearchOptions
  ): Promise<VectorOperation<SearchResult[]>> {
    const start = Date.now();

    try {
      // Perform vector search first
      const vectorResults = await this.searchSimilar(embedding, options);

      if (!vectorResults.success || !vectorResults.data) {
        return vectorResults;
      }

      // Calculate text relevance scores (simple keyword matching)
      const textWeight = options.textWeight || 0.3;
      const vectorWeight = options.vectorWeight || 0.7;
      const textQuery = options.textQuery.toLowerCase();

      const hybridResults = vectorResults.data.map(result => {
        // Calculate text relevance
        let textScore = 0;
        const metadataStr = JSON.stringify(result.metadata).toLowerCase();

        if (metadataStr.includes(textQuery)) {
          textScore = 1.0;
        } else {
          // Partial matching
          const words = textQuery.split(' ');
          const matches = words.filter(word => metadataStr.includes(word));
          textScore = matches.length / words.length;
        }

        // Combine scores
        const hybridScore = (result.score * vectorWeight) + (textScore * textWeight);

        return {
          ...result,
          score: hybridScore,
        };
      });

      // Sort by combined score
      hybridResults.sort((a, b) => b.score - a.score);

      const duration = Date.now() - start;
      debug('Hybrid search completed', {
        resultsFound: hybridResults.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: hybridResults,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Hybrid search failed', err as Error);

      return {
        success: false,
        error: this.createVectorError('SEARCH_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Delete a document from semantic database
   */
  async deleteDocument(id: string): Promise<VectorOperation<boolean>> {
    const start = Date.now();

    try {
      this.ensureSemanticDbConnected();

      await this.semanticDb!.delete(id);

      const duration = Date.now() - start;
      debug(`Deleted document ${id}`, { duration: `${duration}ms` });

      return {
        success: true,
        data: true,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to delete document ${id}`, err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Get statistics about semantic database
   */
  async getStats(): Promise<VectorOperation<VectorStats>> {
    const start = Date.now();

    try {
      this.ensureSemanticDbConnected();

      // Get stats from RuVector
      const stats = await this.semanticDb!.stats();

      const vectorStats: VectorStats = {
        totalDocuments: stats.count || 0,
        documentsByType: {},
        sizeBytes: stats.size || 0,
        avgSearchLatency: 0,
        indexBuildTime: 0,
      };

      const duration = Date.now() - start;

      return {
        success: true,
        data: vectorStats,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to retrieve stats', err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  // ============================================================================
  // Agentic Operations (Learning Memory)
  // ============================================================================

  /**
   * Record a learning episode using Reflexion pattern
   */
  async recordReflexion(
    episode: ReflexionEpisode
  ): Promise<VectorOperation<void>> {
    const start = Date.now();

    try {
      this.ensureAgenticDbConnected();

      // Generate embeddings for situation, action, and outcome if not provided
      const situationEmbedding = episode.situationEmbedding ||
        (await this.embeddingService.embedText(episode.situation, 'context')).embedding;

      const actionEmbedding = episode.actionEmbedding ||
        (await this.embeddingService.embedText(episode.action, 'context')).embedding;

      const outcomeEmbedding = episode.outcomeEmbedding ||
        (await this.embeddingService.embedText(episode.outcome, 'context')).embedding;

      // Store in agentic database with composite embedding
      const episodeId = `${episode.userId}-${episode.sessionId}-${episode.timestamp.getTime()}`;

      await this.agenticDb!.insert({
        id: episodeId,
        vector: Array.from(situationEmbedding),
        metadata: {
          type: 'reflexion_episode',
          userId: episode.userId,
          sessionId: episode.sessionId,
          timestamp: episode.timestamp.toISOString(),
          situation: episode.situation,
          action: episode.action,
          outcome: episode.outcome,
          reflection: episode.reflection,
          success: episode.success,
          exerciseType: episode.exerciseType,
          speciesId: episode.speciesId,
          difficulty: episode.difficulty,
        },
      });

      const duration = Date.now() - start;
      debug('Recorded reflexion episode', {
        userId: episode.userId,
        success: episode.success,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to record reflexion episode', err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Record a skill level update
   */
  async recordSkill(skill: SkillEntry): Promise<VectorOperation<void>> {
    const start = Date.now();

    try {
      this.ensureAgenticDbConnected();

      // Generate embedding for skill if not provided
      const embedding = skill.embedding ||
        (await this.embeddingService.embedText(skill.skillName, 'context')).embedding;

      const skillId = `skill-${skill.userId}-${skill.skillName}`;

      await this.agenticDb!.insert({
        id: skillId,
        vector: Array.from(embedding),
        metadata: {
          type: 'skill_entry',
          userId: skill.userId,
          skillName: skill.skillName,
          level: skill.level,
          lastPracticed: skill.lastPracticed.toISOString(),
          exercisesCompleted: skill.exercisesCompleted,
          successRate: skill.successRate,
        },
      });

      const duration = Date.now() - start;
      debug('Recorded skill entry', {
        userId: skill.userId,
        skillName: skill.skillName,
        level: skill.level,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to record skill entry', err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Query for relevant past experiences
   */
  async queryExperiences(
    query: ExperienceQuery
  ): Promise<VectorOperation<ReflexionEpisode[]>> {
    const start = Date.now();

    try {
      this.ensureAgenticDbConnected();

      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.embedText(query.query, 'query');

      // Search in agentic database
      const results = await this.agenticDb!.search({
        vector: Array.from(queryEmbedding.embedding),
        k: query.limit || 10,
        filter: {
          type: 'reflexion_episode',
          userId: query.userId,
        },
      });

      // Transform results to ReflexionEpisode objects
      const episodes: ReflexionEpisode[] = results.map((result: any) => ({
        userId: result.metadata.userId,
        sessionId: result.metadata.sessionId,
        timestamp: new Date(result.metadata.timestamp),
        situation: result.metadata.situation,
        action: result.metadata.action,
        outcome: result.metadata.outcome,
        reflection: result.metadata.reflection,
        success: result.metadata.success,
        exerciseType: result.metadata.exerciseType,
        speciesId: result.metadata.speciesId,
        difficulty: result.metadata.difficulty,
      }));

      const duration = Date.now() - start;
      debug('Queried experiences', {
        userId: query.userId,
        resultsFound: episodes.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: episodes,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to query experiences', err as Error);

      return {
        success: false,
        error: this.createVectorError('SEARCH_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Get all skills for a user
   */
  async getUserSkills(userId: string): Promise<VectorOperation<SkillEntry[]>> {
    const start = Date.now();

    try {
      this.ensureAgenticDbConnected();

      // Search for all skill entries for this user
      // Since we can't filter directly, we'll need to search and filter results
      const results = await this.agenticDb!.search({
        vector: new Array(this.config.dimensions).fill(0),
        k: 1000, // Get a large number
        filter: {
          type: 'skill_entry',
          userId,
        },
      });

      // Transform results to SkillEntry objects
      const skills: SkillEntry[] = results
        .filter((r: any) => r.metadata.userId === userId)
        .map((result: any) => ({
          userId: result.metadata.userId,
          skillName: result.metadata.skillName,
          level: result.metadata.level,
          lastPracticed: new Date(result.metadata.lastPracticed),
          exercisesCompleted: result.metadata.exercisesCompleted,
          successRate: result.metadata.successRate,
        }));

      const duration = Date.now() - start;
      debug('Retrieved user skills', {
        userId,
        skillCount: skills.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: skills,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to retrieve user skills', err as Error);

      return {
        success: false,
        error: this.createVectorError('SEARCH_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Update skill level for a user
   */
  async updateSkillLevel(
    userId: string,
    skillName: string,
    newLevel: number
  ): Promise<VectorOperation<void>> {
    const start = Date.now();

    try {
      this.ensureAgenticDbConnected();

      // Delete old entry
      const skillId = `skill-${userId}-${skillName}`;
      await this.agenticDb!.delete(skillId);

      // Insert updated entry
      const embedding = await this.embeddingService.embedText(skillName, 'context');

      await this.agenticDb!.insert({
        id: skillId,
        vector: Array.from(embedding.embedding),
        metadata: {
          type: 'skill_entry',
          userId,
          skillName,
          level: newLevel,
          lastPracticed: new Date().toISOString(),
        },
      });

      const duration = Date.now() - start;
      debug('Updated skill level', {
        userId,
        skillName,
        newLevel,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError('Failed to update skill level', err as Error);

      return {
        success: false,
        error: this.createVectorError('INDEX_FAILED', err),
        usedFallback: false,
        duration,
      };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.health.isHealthy;
  }

  /**
   * Get current configuration
   */
  getConfig(): VectorConfig {
    return { ...this.config };
  }

  /**
   * Ensure semantic database is connected
   */
  private ensureSemanticDbConnected(): void {
    if (!this.semanticDb || !this.health.semanticDbConnected) {
      throw new Error('Semantic database not connected');
    }
  }

  /**
   * Ensure agentic database is connected
   */
  private ensureAgenticDbConnected(): void {
    if (!this.agenticDb || !this.health.agenticDbConnected) {
      throw new Error('Agentic database not connected');
    }
  }

  /**
   * Create a standardized VectorError
   */
  private createVectorError(
    code: VectorError['code'],
    originalError: unknown
  ): VectorError {
    const error = new Error(
      `Vector operation failed: ${String(originalError)}`
    ) as VectorError;

    error.code = code;
    error.originalError = originalError instanceof Error ? originalError : undefined;
    error.fallbackUsed = false;

    return error;
  }
}

/**
 * Factory function to create RuVectorService singleton
 */
let vectorServiceInstance: RuVectorService | null = null;

export function createRuVectorService(
  config: VectorConfig,
  embeddingService: EmbeddingService
): RuVectorService {
  if (!vectorServiceInstance) {
    vectorServiceInstance = new RuVectorService(config, embeddingService);
  }
  return vectorServiceInstance;
}

/**
 * Get existing RuVectorService instance
 */
export function getRuVectorService(): RuVectorService {
  if (!vectorServiceInstance) {
    throw new Error('RuVectorService not initialized. Call createRuVectorService first.');
  }
  return vectorServiceInstance;
}

/**
 * Cleanup singleton instance
 */
export async function cleanupRuVectorService(): Promise<void> {
  if (vectorServiceInstance) {
    await vectorServiceInstance.close();
    vectorServiceInstance = null;
  }
}
