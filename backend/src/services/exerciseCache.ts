/**
 * Exercise Cache Service
 *
 * LRU cache with TTL for generated exercises
 * Reduces GPT-4 API calls and improves response time
 */

import { info, warn } from '../utils/logger';
import { ExerciseType } from '../../../shared/types/exercise.types';

export interface GeneratedExercise {
  type: ExerciseType;
  instructions: string;
  prompt: string;
  correctAnswer: string | string[];
  options?: string[];
  metadata: {
    difficulty: number;
    topic: string;
    spanishGrammar: boolean;
    costTokens: number;
  };
}

export interface CacheEntry {
  exercises: GeneratedExercise[];
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class ExerciseCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[]; // For LRU tracking
  private stats: CacheStats;

  constructor(
    private maxSize: number = 1000,
    private defaultTTL: number = 3600000 // 1 hour default
  ) {
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = {
      size: 0,
      maxSize,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };
  }

  /**
   * Generate cache key from context
   * Same context should produce same key
   */
  generateKey(
    type: string,
    level: number,
    weakTopics: string[],
    topic?: string
  ): string {
    const sortedTopics = [...weakTopics].sort().join(',');
    return `${type}:${level}:${sortedTopics}:${topic || 'general'}`;
  }

  /**
   * Get exercises from cache
   */
  get(key: string): GeneratedExercise[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL
    const now = Date.now();
    const age = now - entry.createdAt.getTime();

    if (age > entry.ttl) {
      // Expired, remove from cache
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      warn(`Cache entry expired: ${key}`);
      return null;
    }

    // Update access metadata
    entry.lastAccessed = new Date();
    entry.accessCount++;

    // Update LRU order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    this.stats.hits++;
    this.updateHitRate();

    info(`Cache hit: ${key} (accessed ${entry.accessCount} times)`);
    return entry.exercises;
  }

  /**
   * Store exercises in cache
   */
  set(
    key: string,
    exercises: GeneratedExercise[],
    ttl?: number
  ): void {
    // Check if we need to evict (LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      exercises,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);

    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    this.stats.size = this.cache.size;
    info(`Cache set: ${key} (${exercises.length} exercises, TTL: ${entry.ttl}ms)`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
      info(`LRU eviction: ${lruKey}`);
    }
  }

  /**
   * Check if key exists in cache (without updating access)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    const age = Date.now() - entry.createdAt.getTime();
    return age <= entry.ttl;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.size = this.cache.size;
      info(`Cache delete: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
    info(`Cache cleared (${size} entries removed)`);
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.createdAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        cleaned++;
      }
    }

    this.stats.size = this.cache.size;

    if (cleaned > 0) {
      info(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get usage count for a specific key
   */
  getUsageCount(key: string): number {
    return this.cache.get(key)?.accessCount || 0;
  }

  /**
   * Get all cache keys (for testing/debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };
  }
}
