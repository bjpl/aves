/**
 * AI Exercise Generation Routes
 * Handles AI-powered exercise generation with smart caching
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validateBody, validateParams } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';
import { ExerciseType } from '../types/exercise.types';

const router = Router();

// Rate limiter for AI generation endpoints (100 requests per 15 minutes)
const aiExerciseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many exercise generation requests. Please try again later.' }
});

// ============================================================================
// Validation Schemas
// ============================================================================

const GenerateExerciseSchema = z.object({
  type: z.enum([
    'visual_discrimination',
    'visual_identification',
    'audio_recognition',
    'sentence_building',
    'cultural_context',
    'term_matching',
    'contextual_fill',
    'image_labeling'
  ] as const).optional(),
  userId: z.string().uuid()
});

const PrefetchExercisesSchema = z.object({
  userId: z.string().uuid(),
  count: z.number().int().min(1).max(50).default(10)
});

const UserIdParamSchema = z.object({
  userId: z.string().uuid()
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate cache key based on user context
 */
function generateCacheKey(userId: string, exerciseType: string, difficulty: number): string {
  return `${userId}_${exerciseType}_${difficulty}`;
}

/**
 * Build user context for exercise generation
 * This would normally query user performance data
 */
async function buildUserContext(userId: string): Promise<{
  userId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  difficulty: number;
  weakTopics: string[];
  masteredTopics: string[];
}> {
  // TODO: Implement actual context building based on user performance
  // For now, return default context
  return {
    userId,
    level: 'beginner',
    difficulty: 2,
    weakTopics: [],
    masteredTopics: []
  };
}

/**
 * Mock exercise generator (replace with actual AI service)
 */
async function generateExerciseWithAI(
  type: ExerciseType,
  context: any
): Promise<any> {
  // TODO: Implement actual GPT-4 exercise generation
  // This is a placeholder that returns a mock exercise

  const mockExercise = {
    id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    instructions: 'Complete this exercise',
    prompt: 'Sample AI-generated exercise',
    metadata: {
      difficulty: context.difficulty,
      generated: true,
      timestamp: new Date().toISOString()
    }
  };

  return mockExercise;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * POST /api/ai/exercises/generate
 * Generate an AI-powered exercise with caching
 *
 * @auth Required (JWT token)
 * @rate-limited 100 requests/15 minutes
 *
 * Request body:
 * {
 *   "type": "visual_discrimination" | "contextual_fill" | ... (optional),
 *   "userId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 *
 * Response:
 * {
 *   "exercise": {...},
 *   "metadata": {
 *     "generated": true,
 *     "cacheKey": "user123_contextual_fill_2",
 *     "cost": 0.003,
 *     "difficulty": 2
 *   }
 * }
 */
router.post(
  '/ai/exercises/generate',
  authenticateToken,
  aiExerciseLimiter,
  validateBody(GenerateExerciseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { type, userId } = req.body;

      // Build user context
      const context = await buildUserContext(userId);

      // Determine exercise type (adaptive if not specified)
      const exerciseType: ExerciseType = type || 'contextual_fill';

      // Generate cache key
      const cacheKey = generateCacheKey(userId, exerciseType, context.difficulty);

      info('Exercise generation requested', { userId, type: exerciseType, cacheKey });

      // Check cache first
      const cacheQuery = `
        SELECT exercise_data, created_at
        FROM exercise_cache
        WHERE cache_key = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const cacheResult = await client.query(cacheQuery, [cacheKey]);

      let exercise;
      let generated = false;
      let cost = 0;

      if (cacheResult.rows.length > 0) {
        // Cache HIT
        exercise = cacheResult.rows[0].exercise_data;

        // Update usage stats
        await client.query(
          `UPDATE exercise_cache
           SET usage_count = usage_count + 1, last_used_at = NOW()
           WHERE cache_key = $1`,
          [cacheKey]
        );

        info('Exercise served from cache', { cacheKey, userId });

      } else {
        // Cache MISS - Generate with AI
        exercise = await generateExerciseWithAI(exerciseType, context);
        generated = true;
        cost = 0.003; // Estimated cost per generation

        // Store in cache
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const userContextHash = `${context.level}_${context.difficulty}`;

        await client.query(
          `INSERT INTO exercise_cache (
            cache_key, exercise_type, exercise_data, user_context_hash, difficulty, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (cache_key) DO UPDATE SET
            exercise_data = $3,
            usage_count = exercise_cache.usage_count + 1,
            last_used_at = NOW()`,
          [cacheKey, exerciseType, JSON.stringify(exercise), userContextHash, context.difficulty, expiresAt]
        );

        info('Exercise generated and cached', { cacheKey, userId, cost });
      }

      res.json({
        exercise,
        metadata: {
          generated,
          cacheKey,
          cost,
          difficulty: context.difficulty
        }
      });

    } catch (err) {
      logError('Exercise generation failed', err as Error);
      res.status(500).json({ error: 'Failed to generate exercise' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/ai/exercises/stats
 * Get aggregate statistics for AI exercise generation
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "totalGenerated": 1250,
 *   "cached": 1000,
 *   "cacheHitRate": 0.80,
 *   "totalCost": 3.75,
 *   "avgGenerationTime": 1850
 * }
 */
router.get(
  '/ai/exercises/stats',
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Get cache statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total_generated,
          SUM(usage_count) as total_retrievals,
          AVG(usage_count) as avg_usage,
          COUNT(CASE WHEN usage_count > 1 THEN 1 END) as cached_exercises
        FROM exercise_cache
      `;

      const statsResult = await pool.query(statsQuery);
      const stats = statsResult.rows[0];

      const totalGenerated = parseInt(stats.total_generated) || 0;
      const totalRetrievals = parseInt(stats.total_retrievals) || 0;
      const cachedExercises = parseInt(stats.cached_exercises) || 0;

      // Calculate cache hit rate
      const cacheHitRate = totalRetrievals > 0
        ? ((totalRetrievals - totalGenerated) / totalRetrievals).toFixed(2)
        : '0.00';

      // Estimate total cost ($0.003 per generation)
      const totalCost = (totalGenerated * 0.003).toFixed(2);

      res.json({
        totalGenerated,
        cached: cachedExercises,
        cacheHitRate: parseFloat(cacheHitRate),
        totalCost: parseFloat(totalCost),
        avgGenerationTime: 2000 // Placeholder - would need actual timing data
      });

    } catch (err) {
      logError('Error fetching exercise stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

/**
 * POST /api/ai/exercises/prefetch
 * Pre-generate exercises for a user to improve response time
 *
 * @auth Required (JWT token)
 *
 * Request body:
 * {
 *   "userId": "550e8400-e29b-41d4-a716-446655440000",
 *   "count": 10
 * }
 *
 * Response:
 * {
 *   "message": "Exercises prefetched successfully",
 *   "prefetched": 10,
 *   "cached": 10
 * }
 */
router.post(
  '/ai/exercises/prefetch',
  authenticateToken,
  validateBody(PrefetchExercisesSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { userId, count } = req.body;

      // Build user context
      const context = await buildUserContext(userId);

      const exerciseTypes: ExerciseType[] = [
        'contextual_fill',
        'visual_discrimination',
        'term_matching',
        'visual_identification'
      ];

      let prefetched = 0;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Generate exercises for different types
      for (let i = 0; i < count && i < exerciseTypes.length * 3; i++) {
        const exerciseType = exerciseTypes[i % exerciseTypes.length];
        const cacheKey = `${generateCacheKey(userId, exerciseType, context.difficulty)}_${i}`;

        // Check if already cached
        const existingCache = await client.query(
          'SELECT id FROM exercise_cache WHERE cache_key = $1 AND expires_at > NOW()',
          [cacheKey]
        );

        if (existingCache.rows.length === 0) {
          // Generate new exercise
          const exercise = await generateExerciseWithAI(exerciseType, context);
          const userContextHash = `${context.level}_${context.difficulty}`;

          await client.query(
            `INSERT INTO exercise_cache (
              cache_key, exercise_type, exercise_data, user_context_hash, difficulty, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [cacheKey, exerciseType, JSON.stringify(exercise), userContextHash, context.difficulty, expiresAt]
          );

          prefetched++;
        }
      }

      info('Exercises prefetched', { userId, count: prefetched });

      res.json({
        message: 'Exercises prefetched successfully',
        prefetched,
        cached: prefetched
      });

    } catch (err) {
      logError('Exercise prefetch failed', err as Error);
      res.status(500).json({ error: 'Failed to prefetch exercises' });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /api/ai/exercises/cache/:userId
 * Clear cached exercises for a specific user (for testing/debugging)
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "message": "Cache cleared successfully",
 *   "deletedCount": 15
 * }
 */
router.delete(
  '/ai/exercises/cache/:userId',
  authenticateToken,
  requireAdmin,
  validateParams(UserIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Delete cache entries for this user
      const deleteQuery = `
        DELETE FROM exercise_cache
        WHERE cache_key LIKE $1
        RETURNING id
      `;

      const result = await pool.query(deleteQuery, [`${userId}_%`]);
      const deletedCount = result.rows.length;

      info('User exercise cache cleared', { userId, deletedCount });

      res.json({
        message: 'Cache cleared successfully',
        deletedCount
      });

    } catch (err) {
      logError('Error clearing exercise cache', err as Error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }
);

export default router;
