/**
 * Exercise Cache Service (Database-backed)
 *
 * Implements intelligent caching for AI-generated exercises to achieve:
 * - 80%+ cache hit rate
 * - $2/month operational cost (from $9/month without caching)
 * - <100ms cache retrieval time
 * - Automatic LRU eviction when cache exceeds 10,000 entries
 *
 * Cache Strategy:
 * - Cache key: SHA-256 hash of (type + difficulty + sorted topics)
 * - TTL: 24 hours (86400 seconds)
 * - Max size: 10,000 entries
 * - Eviction: LRU (Least Recently Used)
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { Exercise, ExerciseType } from '../types/exercise.types';
import * as logger from '../utils/logger';

// User context for cache key generation
export interface UserContext {
  userId?: string;
  type: ExerciseType;
  difficulty: number; // 1-5
  topics: string[]; // e.g., ['colors', 'anatomy', 'habitat']
  level?: 'beginner' | 'intermediate' | 'advanced';
  weakTopics?: string[];
  masteredTopics?: string[];
}

// Cache statistics interface
export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  totalUsage: number;
  cacheHitRate: number; // Percentage
  totalCostSaved: number; // USD
  avgGenerationTimeMs: number;
  cacheSizeMb: number;
}

// Exercise type specific statistics
export interface ExerciseCacheStats {
  exerciseType: ExerciseType;
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  totalUsage: number;
  avgUsagePerEntry: number;
  estimatedCostSaved: number;
  cacheHitRate: number;
  oldestEntry: Date;
  newestEntry: Date;
}

// Popular exercise entry
export interface PopularExercise {
  exerciseType: ExerciseType;
  difficulty: number;
  usageCount: number;
  topics: string[];
  createdAt: Date;
  lastUsedAt: Date;
}

// LRU candidate for eviction
export interface LRUExercise {
  id: string;
  exerciseType: ExerciseType;
  difficulty: number;
  usageCount: number;
  lastUsedAt: Date;
  ageDays: number;
}

export class ExerciseCacheDB {
  private pool: Pool;
  private readonly DEFAULT_TTL = 86400; // 24 hours in seconds
  private readonly MAX_CACHE_SIZE = 10000; // Maximum cache entries
  private readonly GENERATION_COST = 0.003; // $0.003 per exercise

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate cache key from user context
   * Uses SHA-256 hash of: type + difficulty + sorted topics
   *
   * Example:
   * Context: { type: 'contextual_fill', difficulty: 3, topics: ['colors', 'anatomy'] }
   * Key: sha256('contextual_fill_3_anatomy_colors')
   */
  public generateCacheKey(context: UserContext): string {
    // Sort topics for consistent hashing
    const sortedTopics = [...context.topics].sort().join('_');

    // Create key string: type_difficulty_topics
    const keyString = `${context.type}_${context.difficulty}_${sortedTopics}`;

    // Generate SHA-256 hash
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Generate user context hash for finding similar exercises
   * Includes difficulty and topics, useful for recommendations
   */
  private generateContextHash(context: UserContext): string {
    const contextString = `${context.difficulty}_${context.topics.sort().join('_')}`;
    return crypto.createHash('sha256').update(contextString).digest('hex').substring(0, 64);
  }

  /**
   * Retrieve cached exercise
   * Updates usage statistics on cache hit
   *
   * Returns null if:
   * - No cache entry exists
   * - Cache entry has expired
   */
  async get(context: UserContext): Promise<Exercise | null> {
    const cacheKey = this.generateCacheKey(context);

    try {
      const startTime = Date.now();

      // Query for valid (non-expired) cache entry
      const result = await this.pool.query(
        `SELECT
          exercise_data,
          usage_count,
          created_at
         FROM exercise_cache
         WHERE cache_key = $1
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
        [cacheKey]
      );

      if (result.rows.length === 0) {
        logger.debug('Cache miss', {
          cacheKey: cacheKey.substring(0, 16) + '...',
          type: context.type,
          difficulty: context.difficulty
        });
        return null;
      }

      // Cache hit! Update usage statistics
      await this.pool.query(
        `UPDATE exercise_cache
         SET usage_count = usage_count + 1,
             last_used_at = CURRENT_TIMESTAMP
         WHERE cache_key = $1`,
        [cacheKey]
      );

      const retrievalTime = Date.now() - startTime;

      logger.info('Cache hit', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        type: context.type,
        difficulty: context.difficulty,
        usageCount: result.rows[0].usage_count + 1,
        retrievalTimeMs: retrievalTime
      });

      return result.rows[0].exercise_data as Exercise;

    } catch (error) {
      logger.error('Cache retrieval error', { error, cacheKey: cacheKey.substring(0, 16) + '...' });
      return null;
    }
  }

  /**
   * Store exercise in cache
   *
   * On conflict (duplicate cache_key):
   * - Updates exercise_data with new content
   * - Increments usage_count
   * - Updates last_used_at timestamp
   *
   * @param context - User context for cache key generation
   * @param exercise - Exercise object to cache
   * @param ttl - Time to live in seconds (default: 24 hours)
   * @param generationTimeMs - Time taken to generate exercise (optional)
   */
  async set(
    context: UserContext,
    exercise: Exercise,
    ttl: number = this.DEFAULT_TTL,
    generationTimeMs?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(context);
    const contextHash = this.generateContextHash(context);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    try {
      await this.pool.query(
        `INSERT INTO exercise_cache (
          cache_key,
          exercise_type,
          exercise_data,
          user_context_hash,
          difficulty,
          topics,
          expires_at,
          generation_cost,
          generation_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (cache_key) DO UPDATE SET
          exercise_data = EXCLUDED.exercise_data,
          usage_count = exercise_cache.usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP,
          expires_at = EXCLUDED.expires_at`,
        [
          cacheKey,
          context.type,
          JSON.stringify(exercise),
          contextHash,
          context.difficulty,
          context.topics,
          expiresAt,
          this.GENERATION_COST,
          generationTimeMs || null
        ]
      );

      logger.info('Exercise cached', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        type: context.type,
        difficulty: context.difficulty,
        topics: context.topics,
        expiresAt,
        generationTimeMs
      });

      // Check if we need to evict LRU entries
      await this.checkAndEvict();

    } catch (error) {
      logger.error('Cache storage error', { error, cacheKey: cacheKey.substring(0, 16) + '...' });
      throw error;
    }
  }

  /**
   * Check cache size and evict LRU entries if needed
   * Maintains cache at or below MAX_CACHE_SIZE
   */
  private async checkAndEvict(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM exercise_cache
         WHERE expires_at > CURRENT_TIMESTAMP`
      );

      const currentSize = parseInt(result.rows[0].count, 10);

      if (currentSize > this.MAX_CACHE_SIZE) {
        const evicted = await this.evictLRU(this.MAX_CACHE_SIZE);
        logger.info('Auto-eviction triggered', {
          currentSize,
          maxSize: this.MAX_CACHE_SIZE,
          evicted
        });
      }
    } catch (error) {
      logger.error('Auto-eviction check failed', { error });
    }
  }

  /**
   * Evict least recently used (LRU) cache entries
   * Keeps cache size at or below maxSize
   *
   * Strategy:
   * 1. Count active (non-expired) entries
   * 2. If count > maxSize, delete oldest entries
   * 3. Sort by: last_used_at ASC, usage_count ASC
   *
   * @param maxSize - Maximum number of cache entries to keep
   * @returns Number of evicted entries
   */
  async evictLRU(maxSize: number = this.MAX_CACHE_SIZE): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT evict_lru_exercises($1) as evicted',
        [maxSize]
      );

      const evicted = result.rows[0].evicted;

      if (evicted > 0) {
        logger.info('LRU eviction completed', { evicted, maxSize });
      }

      return evicted;

    } catch (error) {
      logger.error('LRU eviction failed', { error, maxSize });
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   * Should be run periodically (e.g., daily cron job)
   *
   * @returns Number of deleted entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT cleanup_expired_exercises() as deleted'
      );

      const deleted = result.rows[0].deleted;

      logger.info('Expired cache cleanup completed', { deleted });

      return deleted;

    } catch (error) {
      logger.error('Cleanup failed', { error });
      throw error;
    }
  }

  /**
   * Get overall cache statistics
   *
   * Metrics include:
   * - Total and active entries
   * - Cache hit rate
   * - Cost saved by caching
   * - Average generation time
   * - Cache size in MB
   */
  async getStats(): Promise<CacheStats> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM exercise_cache_overview'
      );

      if (result.rows.length === 0) {
        return {
          totalEntries: 0,
          activeEntries: 0,
          expiredEntries: 0,
          totalUsage: 0,
          cacheHitRate: 0,
          totalCostSaved: 0,
          avgGenerationTimeMs: 0,
          cacheSizeMb: 0
        };
      }

      const row = result.rows[0];

      return {
        totalEntries: parseInt(row.total_entries, 10),
        activeEntries: parseInt(row.active_entries, 10),
        expiredEntries: parseInt(row.expired_entries, 10),
        totalUsage: parseInt(row.total_usage, 10),
        cacheHitRate: parseFloat(row.cache_hit_rate) || 0,
        totalCostSaved: parseFloat(row.total_cost_saved) || 0,
        avgGenerationTimeMs: parseFloat(row.avg_generation_time_ms) || 0,
        cacheSizeMb: parseFloat(row.cache_size_mb) || 0
      };

    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics by exercise type
   */
  async getStatsByType(): Promise<ExerciseCacheStats[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM exercise_cache_stats'
      );

      return result.rows.map(row => ({
        exerciseType: row.exercise_type as ExerciseType,
        totalEntries: parseInt(row.total_entries, 10),
        activeEntries: parseInt(row.active_entries, 10),
        expiredEntries: parseInt(row.expired_entries, 10),
        totalUsage: parseInt(row.total_usage, 10),
        avgUsagePerEntry: parseFloat(row.avg_usage_per_entry) || 0,
        estimatedCostSaved: parseFloat(row.estimated_cost_saved) || 0,
        cacheHitRate: parseFloat(row.cache_hit_rate) || 0,
        oldestEntry: new Date(row.oldest_entry),
        newestEntry: new Date(row.newest_entry)
      }));

    } catch (error) {
      logger.error('Failed to get cache stats by type', { error });
      throw error;
    }
  }

  /**
   * Get most popular cached exercises
   */
  async getPopularExercises(limit: number = 10): Promise<PopularExercise[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM get_popular_exercises($1)',
        [limit]
      );

      return result.rows.map(row => ({
        exerciseType: row.exercise_type as ExerciseType,
        difficulty: row.difficulty,
        usageCount: row.usage_count,
        topics: row.topics,
        createdAt: new Date(row.created_at),
        lastUsedAt: new Date(row.last_used_at)
      }));

    } catch (error) {
      logger.error('Failed to get popular exercises', { error });
      throw error;
    }
  }

  /**
   * Get least recently used exercises (eviction candidates)
   */
  async getLRUExercises(limit: number = 10): Promise<LRUExercise[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM get_lru_exercises($1)',
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        exerciseType: row.exercise_type as ExerciseType,
        difficulty: row.difficulty,
        usageCount: row.usage_count,
        lastUsedAt: new Date(row.last_used_at),
        ageDays: row.age_days
      }));

    } catch (error) {
      logger.error('Failed to get LRU exercises', { error });
      throw error;
    }
  }

  /**
   * Clear all cache entries (useful for testing)
   * WARNING: This will delete all cached exercises!
   */
  async clearAll(): Promise<number> {
    try {
      const result = await this.pool.query(
        'DELETE FROM exercise_cache'
      );

      const deleted = result.rowCount || 0;

      logger.warn('Cache cleared', { deleted });

      return deleted;

    } catch (error) {
      logger.error('Failed to clear cache', { error });
      throw error;
    }
  }

  /**
   * Clear cache entries for a specific user (by context)
   * Useful for invalidating cache when user preferences change
   */
  async clearUserCache(userId: string): Promise<number> {
    try {
      // Delete all entries where exercise_data contains the userId
      const result = await this.pool.query(
        `DELETE FROM exercise_cache
         WHERE exercise_data @> $1::jsonb`,
        [JSON.stringify({ userId })]
      );

      const deleted = result.rowCount || 0;

      logger.info('User cache cleared', { userId, deleted });

      return deleted;

    } catch (error) {
      logger.error('Failed to clear user cache', { error, userId });
      throw error;
    }
  }

  /**
   * Refresh cache metrics materialized view
   * Should be run periodically (e.g., daily) for analytics dashboard
   */
  async refreshMetrics(): Promise<void> {
    try {
      await this.pool.query('SELECT refresh_exercise_cache_metrics()');
      logger.info('Cache metrics refreshed');
    } catch (error) {
      logger.error('Failed to refresh cache metrics', { error });
      throw error;
    }
  }

  /**
   * Find similar exercises based on context hash
   * Useful for recommendations when exact cache miss
   */
  async findSimilar(context: UserContext, limit: number = 5): Promise<Exercise[]> {
    const contextHash = this.generateContextHash(context);

    try {
      const result = await this.pool.query(
        `SELECT exercise_data
         FROM exercise_cache
         WHERE user_context_hash = $1
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY usage_count DESC
         LIMIT $2`,
        [contextHash, limit]
      );

      return result.rows.map(row => row.exercise_data as Exercise);

    } catch (error) {
      logger.error('Failed to find similar exercises', { error, contextHash });
      return [];
    }
  }
}

// Export singleton instance factory
export const createExerciseCacheDB = (pool: Pool): ExerciseCacheDB => {
  return new ExerciseCacheDB(pool);
};
