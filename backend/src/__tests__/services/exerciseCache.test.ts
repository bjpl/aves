/**
 * Exercise Cache Tests
 *
 * Comprehensive test suite for LRU cache with TTL
 * Target: >80% code coverage
 */

import { ExerciseCache, GeneratedExercise } from '../../services/exerciseCache';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('ExerciseCache', () => {
  let cache: ExerciseCache;

  const mockExercise: GeneratedExercise = {
    type: 'contextual_fill',
    instructions: 'Complete the sentence',
    prompt: 'El pájaro tiene plumas ___.',
    correctAnswer: 'rojas',
    options: ['rojas', 'azules', 'verdes', 'amarillas'],
    metadata: {
      difficulty: 3,
      topic: 'colors',
      spanishGrammar: true,
      costTokens: 100
    }
  };

  beforeEach(() => {
    cache = new ExerciseCache(100, 1000); // 100 max size, 1 second TTL
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultCache = new ExerciseCache();
      const stats = defaultCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should initialize with custom values', () => {
      const customCache = new ExerciseCache(50, 500);
      const stats = customCache.getStats();

      expect(stats.maxSize).toBe(50);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = cache.generateKey('contextual_fill', 3, ['anatomy', 'colors'], 'birds');
      const key2 = cache.generateKey('contextual_fill', 3, ['anatomy', 'colors'], 'birds');

      expect(key1).toBe(key2);
    });

    it('should generate same key regardless of weakTopics order', () => {
      const key1 = cache.generateKey('contextual_fill', 3, ['anatomy', 'colors']);
      const key2 = cache.generateKey('contextual_fill', 3, ['colors', 'anatomy']);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = cache.generateKey('contextual_fill', 3, ['anatomy']);
      const key2 = cache.generateKey('contextual_fill', 4, ['anatomy']);
      const key3 = cache.generateKey('term_matching', 3, ['anatomy']);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should handle empty weakTopics', () => {
      const key = cache.generateKey('contextual_fill', 3, []);
      expect(key).toBeTruthy();
    });

    it('should handle missing topic parameter', () => {
      const key1 = cache.generateKey('contextual_fill', 3, ['anatomy']);
      const key2 = cache.generateKey('contextual_fill', 3, ['anatomy'], undefined);

      expect(key1).toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve exercises', () => {
      const key = 'test_key';
      const exercises = [mockExercise];

      cache.set(key, exercises);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(exercises);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non_existent');
      expect(result).toBeNull();
    });

    it('should update access metadata on get', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      cache.get(key);
      cache.get(key);
      cache.get(key);

      const usageCount = cache.getUsageCount(key);
      expect(usageCount).toBe(3);
    });

    it('should track cache hits', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      cache.get(key);
      cache.get(key);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', () => {
      cache.get('non_existent_1');
      cache.get('non_existent_2');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      cache.get(key); // hit
      cache.get(key); // hit
      cache.get('miss_1'); // miss
      cache.get('miss_2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should return null for expired entries', async () => {
      const key = 'test_key';
      cache.set(key, [mockExercise], 100); // 100ms TTL

      // Immediately should work
      expect(cache.get(key)).toEqual([mockExercise]);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be null after TTL
      const result = cache.get(key);
      expect(result).toBeNull();
    });

    it('should use default TTL if not specified', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      const result = cache.get(key);
      expect(result).toEqual([mockExercise]);
    });

    it('should handle custom TTL per entry', async () => {
      const key1 = 'short_ttl';
      const key2 = 'long_ttl';

      // Use longer TTL values for reliable timing in WSL/CI environments
      cache.set(key1, [mockExercise], 100);
      cache.set(key2, [mockExercise], 2000);

      // Wait long enough for short TTL to expire with generous buffer
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(cache.get(key1)).toBeNull(); // Expired
      expect(cache.get(key2)).toEqual([mockExercise]); // Still valid
    });

    it('should clean expired entries', async () => {
      // Use longer TTL values for more reliable timing in CI/WSL environments
      // WSL2/Windows timer precision can be imprecise, so use generous margins
      cache.set('key1', [mockExercise], 50);
      cache.set('key2', [mockExercise], 50);
      cache.set('key3', [mockExercise], 5000);

      // Wait significantly longer than short TTL to ensure expiration
      // 500ms wait for 50ms TTL gives 10x buffer for timer imprecision
      await new Promise(resolve => setTimeout(resolve, 500));

      const cleaned = cache.cleanExpired();

      expect(cleaned).toBe(2); // key1 and key2 expired
      expect(cache.get('key3')).toEqual([mockExercise]); // Still valid
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used when cache is full', () => {
      const smallCache = new ExerciseCache(3, 10000);

      smallCache.set('key1', [mockExercise]);
      smallCache.set('key2', [mockExercise]);
      smallCache.set('key3', [mockExercise]);

      // Access key1 to make it recently used
      smallCache.get('key1');

      // Add new key, should evict key2 (least recently used)
      smallCache.set('key4', [mockExercise]);

      expect(smallCache.get('key1')).toEqual([mockExercise]);
      expect(smallCache.get('key2')).toBeNull(); // Evicted
      expect(smallCache.get('key3')).toEqual([mockExercise]);
      expect(smallCache.get('key4')).toEqual([mockExercise]);
    });

    it('should track evictions in stats', () => {
      const smallCache = new ExerciseCache(2, 10000);

      smallCache.set('key1', [mockExercise]);
      smallCache.set('key2', [mockExercise]);
      smallCache.set('key3', [mockExercise]); // Should evict key1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
      expect(stats.size).toBe(2);
    });

    it('should update LRU order on access', () => {
      const smallCache = new ExerciseCache(3, 10000);

      smallCache.set('key1', [mockExercise]);
      smallCache.set('key2', [mockExercise]);
      smallCache.set('key3', [mockExercise]);

      // Access key1 (oldest) to make it most recent
      smallCache.get('key1');

      // Add key4, should evict key2 (new oldest)
      smallCache.set('key4', [mockExercise]);

      expect(smallCache.get('key1')).toEqual([mockExercise]); // Not evicted
      expect(smallCache.get('key2')).toBeNull(); // Evicted
    });

    it('should not evict when updating existing key', () => {
      const smallCache = new ExerciseCache(2, 10000);

      smallCache.set('key1', [mockExercise]);
      smallCache.set('key2', [mockExercise]);

      const statsBefore = smallCache.getStats();

      // Update existing key
      smallCache.set('key1', [{ ...mockExercise, correctAnswer: 'updated' }]);

      const statsAfter = smallCache.getStats();

      expect(statsAfter.size).toBe(2);
      expect(statsAfter.evictions).toBe(statsBefore.evictions);
    });
  });

  describe('has', () => {
    it('should return true for existing valid entries', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      expect(cache.has(key)).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cache.has('non_existent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      const key = 'test_key';
      cache.set(key, [mockExercise], 50);

      expect(cache.has(key)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.has(key)).toBe(false);
    });

    it('should not update access metadata', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      cache.has(key);
      cache.has(key);

      expect(cache.getUsageCount(key)).toBe(0); // No access via has()
    });
  });

  describe('delete', () => {
    it('should delete existing entries', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      const deleted = cache.delete(key);

      expect(deleted).toBe(true);
      expect(cache.get(key)).toBeNull();
    });

    it('should return false for non-existent entries', () => {
      const deleted = cache.delete('non_existent');
      expect(deleted).toBe(false);
    });

    it('should update cache size after deletion', () => {
      cache.set('key1', [mockExercise]);
      cache.set('key2', [mockExercise]);

      cache.delete('key1');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', [mockExercise]);
      cache.set('key2', [mockExercise]);
      cache.set('key3', [mockExercise]);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should reset all tracking arrays', () => {
      cache.set('key1', [mockExercise]);
      cache.set('key2', [mockExercise]);

      cache.clear();

      const keys = cache.getKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('getUsageCount', () => {
    it('should return usage count for existing key', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      cache.get(key);
      cache.get(key);
      cache.get(key);

      expect(cache.getUsageCount(key)).toBe(3);
    });

    it('should return 0 for non-existent key', () => {
      expect(cache.getUsageCount('non_existent')).toBe(0);
    });
  });

  describe('getKeys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', [mockExercise]);
      cache.set('key2', [mockExercise]);
      cache.set('key3', [mockExercise]);

      const keys = cache.getKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      const keys = cache.getKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should track cache size', () => {
      cache.set('key1', [mockExercise]);
      cache.set('key2', [mockExercise]);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should track max size', () => {
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(100);
    });

    it('should reset statistics', () => {
      cache.set('key1', [mockExercise]);
      cache.get('key1');
      cache.get('key1');
      cache.get('non_existent');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(1); // Size should remain
    });

    it('should calculate hit rate as 0 when no accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate hit rate as 100 when all hits', () => {
      cache.set('key1', [mockExercise]);
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(100);
    });

    it('should provide complete statistics', () => {
      cache.set('key1', [mockExercise]);
      cache.get('key1'); // hit
      cache.get('miss'); // miss

      const stats = cache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive accesses', () => {
      const key = 'test_key';
      cache.set(key, [mockExercise]);

      for (let i = 0; i < 100; i++) {
        cache.get(key);
      }

      expect(cache.getUsageCount(key)).toBe(100);
    });

    it('should handle storing multiple exercises', () => {
      const key = 'test_key';
      const exercises = [
        mockExercise,
        { ...mockExercise, correctAnswer: 'azules' },
        { ...mockExercise, correctAnswer: 'verdes' }
      ];

      cache.set(key, exercises);
      const retrieved = cache.get(key);

      expect(retrieved).toHaveLength(3);
      expect(retrieved).toEqual(exercises);
    });

    it('should handle empty exercise array', () => {
      const key = 'test_key';
      cache.set(key, []);

      const retrieved = cache.get(key);
      expect(retrieved).toEqual([]);
    });

    it('should maintain cache integrity after multiple operations', () => {
      for (let i = 0; i < 50; i++) {
        cache.set(`key${i}`, [mockExercise]);
      }

      for (let i = 0; i < 25; i++) {
        cache.get(`key${i}`);
      }

      for (let i = 0; i < 10; i++) {
        cache.delete(`key${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(40); // 50 - 10 deleted
      expect(stats.hits).toBe(25);
    });
  });

  describe('Performance', () => {
    it('should handle large number of entries efficiently', () => {
      const largeCache = new ExerciseCache(1000, 10000);
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, [mockExercise]);
      }

      const insertTime = Date.now() - startTime;
      expect(insertTime).toBeLessThan(1000); // Should complete in < 1 second

      const accessStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        largeCache.get(`key${i}`);
      }

      const accessTime = Date.now() - accessStart;
      expect(accessTime).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
});
