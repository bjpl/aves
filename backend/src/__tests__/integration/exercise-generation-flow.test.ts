/**
 * Integration Tests: AI Exercise Generation Flow
 * Tests the complete exercise generation workflow including cache management,
 * prefetching, and AI generation with cost optimization
 */

import request from 'supertest';
import express from 'express';
import aiExercisesRouter from '../../routes/aiExercises';
import authRouter from '../../routes/auth';
import {
  testPool,
  createTestUser,
  createCachedExercise,
  TEST_USERS,
  delay,
} from './setup';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', authRouter);
app.use('/api', aiExercisesRouter);

// Mock OpenAI service to avoid actual API calls
jest.mock('../../services/aiExerciseGenerator', () => ({
  generateExerciseWithAI: jest.fn().mockResolvedValue({
    id: 'ex_mock_123',
    type: 'contextual_fill',
    instructions: 'Complete this exercise',
    prompt: 'AI-generated mock exercise',
    metadata: {
      difficulty: 2,
      generated: true,
      timestamp: new Date().toISOString(),
    },
  }),
}));

describe('Integration: AI Exercise Generation Flow', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser(TEST_USERS.regularUser);
    userToken = user.token;
    userId = user.id;
  });

  describe('Exercise Generation with Cache Miss', () => {
    it('should generate new exercise when cache is empty', async () => {
      const response = await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      expect(response.body).toHaveProperty('exercise');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.generated).toBe(true);
      expect(response.body.metadata).toHaveProperty('cacheKey');
      expect(response.body.metadata).toHaveProperty('cost');
      expect(response.body.metadata).toHaveProperty('difficulty');

      // Verify exercise was cached in database
      const cacheResult = await testPool.query(
        'SELECT * FROM exercise_cache WHERE cache_key = $1',
        [response.body.metadata.cacheKey]
      );

      expect(cacheResult.rows.length).toBe(1);
      expect(cacheResult.rows[0].exercise_type).toBe('contextual_fill');
      expect(cacheResult.rows[0].usage_count).toBe(1);
    });

    it('should generate different exercises for different types', async () => {
      const types = ['contextual_fill', 'visual_discrimination', 'term_matching'];
      const responses = [];

      for (const type of types) {
        const response = await request(app)
          .post('/api/ai/exercises/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            userId,
            type,
          })
          .expect(200);

        responses.push(response);
      }

      // Verify all exercises were generated and cached
      const cacheResult = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );

      expect(parseInt(cacheResult.rows[0].count)).toBe(3);

      // Verify each response has unique cache key
      const cacheKeys = responses.map((r) => r.body.metadata.cacheKey);
      const uniqueKeys = new Set(cacheKeys);
      expect(uniqueKeys.size).toBe(3);
    });

    it('should track generation cost', async () => {
      const response = await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      expect(response.body.metadata.cost).toBeGreaterThan(0);
      expect(response.body.metadata.generated).toBe(true);

      // Verify cost is recorded in database
      const cacheResult = await testPool.query(
        'SELECT generation_cost FROM exercise_cache WHERE cache_key = $1',
        [response.body.metadata.cacheKey]
      );

      expect(parseFloat(cacheResult.rows[0].generation_cost)).toBeGreaterThan(0);
    });
  });

  describe('Exercise Generation with Cache Hit', () => {
    beforeEach(async () => {
      // Pre-populate cache with test exercises
      const cacheKey = `${userId}_contextual_fill_2`;
      await createCachedExercise({
        cacheKey,
        exerciseType: 'contextual_fill',
        exerciseData: {
          id: 'ex_cached_123',
          type: 'contextual_fill',
          instructions: 'Complete this cached exercise',
          prompt: 'Cached exercise data',
        },
        userContextHash: 'beginner_2',
        difficulty: 2,
      });
    });

    it('should return cached exercise on second request', async () => {
      // First request (cache hit)
      const response1 = await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      expect(response1.body.metadata.generated).toBe(false);
      expect(response1.body.metadata.cost).toBe(0);
      expect(response1.body.exercise).toHaveProperty('id');

      // Verify usage count increased
      const cacheResult1 = await testPool.query(
        'SELECT usage_count FROM exercise_cache WHERE cache_key = $1',
        [response1.body.metadata.cacheKey]
      );
      expect(cacheResult1.rows[0].usage_count).toBe(2); // Initial 0 + 1 from setup + 1 from this request

      // Second request (another cache hit)
      const response2 = await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      expect(response2.body.metadata.generated).toBe(false);
      expect(response2.body.metadata.cost).toBe(0);

      // Verify usage count increased again
      const cacheResult2 = await testPool.query(
        'SELECT usage_count FROM exercise_cache WHERE cache_key = $1',
        [response2.body.metadata.cacheKey]
      );
      expect(cacheResult2.rows[0].usage_count).toBe(3);
    });

    it('should update last_used_at timestamp on cache hit', async () => {
      // Get initial timestamp
      const initialResult = await testPool.query(
        'SELECT last_used_at FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}_contextual_fill%`]
      );
      const initialTimestamp = new Date(initialResult.rows[0].last_used_at);

      await delay(100); // Small delay to ensure timestamp difference

      // Request exercise
      await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      // Verify timestamp was updated
      const updatedResult = await testPool.query(
        'SELECT last_used_at FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}_contextual_fill%`]
      );
      const updatedTimestamp = new Date(updatedResult.rows[0].last_used_at);

      expect(updatedTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should not regenerate exercise if valid cache exists', async () => {
      // Request same exercise multiple times
      const responses = await Promise.all([
        request(app)
          .post('/api/ai/exercises/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId, type: 'contextual_fill' }),
        request(app)
          .post('/api/ai/exercises/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId, type: 'contextual_fill' }),
        request(app)
          .post('/api/ai/exercises/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId, type: 'contextual_fill' }),
      ]);

      // All should return cached exercise (generated: false)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.metadata.generated).toBe(false);
        expect(response.body.metadata.cost).toBe(0);
      });

      // Verify only one cache entry exists
      const cacheResult = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}_contextual_fill%`]
      );
      expect(parseInt(cacheResult.rows[0].count)).toBe(1);
    });
  });

  describe('Exercise Prefetching', () => {
    it('should prefetch multiple exercises successfully', async () => {
      const response = await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          count: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('prefetched');
      expect(response.body).toHaveProperty('cached');
      expect(response.body.prefetched).toBe(10);
      expect(response.body.cached).toBe(10);

      // Verify exercises were cached in database
      const cacheResult = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );

      expect(parseInt(cacheResult.rows[0].count)).toBeGreaterThanOrEqual(10);
    });

    it('should not re-prefetch already cached exercises', async () => {
      // First prefetch
      await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          count: 5,
        })
        .expect(200);

      const initialCount = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache'
      );

      // Second prefetch (should skip already cached)
      const response = await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          count: 5,
        })
        .expect(200);

      const finalCount = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache'
      );

      // Count should not significantly increase
      expect(parseInt(finalCount.rows[0].count)).toBeLessThanOrEqual(
        parseInt(initialCount.rows[0].count) + 2
      );
    });

    it('should distribute prefetched exercises across different types', async () => {
      await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          count: 12,
        })
        .expect(200);

      // Check distribution of exercise types
      const typeDistribution = await testPool.query(
        `SELECT exercise_type, COUNT(*) as count
         FROM exercise_cache
         WHERE cache_key LIKE $1
         GROUP BY exercise_type`,
        [`${userId}%`]
      );

      // Should have at least 2 different types
      expect(typeDistribution.rows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cache Expiration and Cleanup', () => {
    it('should not serve expired cache entries', async () => {
      // Create expired cache entry
      const expiredCacheKey = `${userId}_contextual_fill_expired`;
      await createCachedExercise({
        cacheKey: expiredCacheKey,
        exerciseType: 'contextual_fill',
        exerciseData: { id: 'ex_expired_123' },
        userContextHash: 'beginner_2',
        difficulty: 2,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      // Request should generate new exercise (cache miss)
      const response = await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          type: 'contextual_fill',
        })
        .expect(200);

      expect(response.body.metadata.generated).toBe(true);
      expect(response.body.metadata.cost).toBeGreaterThan(0);

      // Verify new cache entry was created (not using expired one)
      const cacheResult = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1 AND expires_at > NOW()',
        [`${userId}%`]
      );

      expect(parseInt(cacheResult.rows[0].count)).toBeGreaterThanOrEqual(1);
    });

    it('should allow cache clearing for specific user', async () => {
      // Create test user with admin privileges
      const adminUser = await createTestUser(TEST_USERS.adminUser, true);

      // Prefetch some exercises for regular user
      await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          count: 5,
        })
        .expect(200);

      // Verify cache exists
      const beforeClear = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );
      expect(parseInt(beforeClear.rows[0].count)).toBeGreaterThan(0);

      // Clear cache (admin only)
      const response = await request(app)
        .delete(`/api/ai/exercises/cache/${userId}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body.deletedCount).toBeGreaterThan(0);

      // Verify cache was cleared
      const afterClear = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );
      expect(parseInt(afterClear.rows[0].count)).toBe(0);
    });
  });

  describe('Exercise Generation Statistics', () => {
    let adminToken: string;

    beforeEach(async () => {
      const adminUser = await createTestUser(TEST_USERS.adminUser, true);
      adminToken = adminUser.token;

      // Generate some exercises to have stats
      await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, type: 'contextual_fill' })
        .expect(200);

      await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, type: 'contextual_fill' })
        .expect(200);
    });

    it('should retrieve aggregate exercise statistics', async () => {
      const response = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGenerated');
      expect(response.body).toHaveProperty('cached');
      expect(response.body).toHaveProperty('cacheHitRate');
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body).toHaveProperty('avgGenerationTime');

      expect(response.body.totalGenerated).toBeGreaterThan(0);
      expect(typeof response.body.cacheHitRate).toBe('number');
    });

    it('should calculate cache hit rate correctly', async () => {
      // Get initial stats
      const statsResponse = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statsResponse.body.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(statsResponse.body.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should require admin access for stats endpoint', async () => {
      const response = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Concurrent Exercise Generation', () => {
    it('should handle multiple simultaneous generation requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post('/api/ai/exercises/generate')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              userId,
              type: index % 2 === 0 ? 'contextual_fill' : 'term_matching',
            })
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('exercise');
        expect(response.body).toHaveProperty('metadata');
      });

      // Verify cache entries were created
      const cacheResult = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );

      expect(parseInt(cacheResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should maintain cache consistency under concurrent access', async () => {
      // Pre-populate cache
      const cacheKey = `${userId}_contextual_fill_2`;
      await createCachedExercise({
        cacheKey,
        exerciseType: 'contextual_fill',
        exerciseData: { id: 'ex_concurrent_123' },
        userContextHash: 'beginner_2',
        difficulty: 2,
      });

      // Make concurrent requests for same exercise
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/ai/exercises/generate')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              userId,
              type: 'contextual_fill',
            })
        );

      const responses = await Promise.all(requests);

      // All should return cached exercise
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.metadata.generated).toBe(false);
      });

      // Verify usage count is correct
      const cacheResult = await testPool.query(
        'SELECT usage_count FROM exercise_cache WHERE cache_key = $1',
        [cacheKey]
      );

      // Should be initial 0 + 10 requests
      expect(cacheResult.rows[0].usage_count).toBeGreaterThanOrEqual(10);
    });
  });
});
