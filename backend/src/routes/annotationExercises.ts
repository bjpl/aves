import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AnnotationExercisePipeline } from '../services/AnnotationExercisePipeline';
import { logger } from '../utils/logger';
import { Database } from '../types/supabase';

const router = Router();

// Initialize Supabase client only if environment variables are available
let pipeline: AnnotationExercisePipeline | null = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  pipeline = new AnnotationExercisePipeline(supabase);
} else {
  logger.warn('Annotation exercise pipeline disabled: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

/**
 * GET /api/annotation-exercises/learn
 * Get annotation-based exercises for the Learn tab
 *
 * Query params:
 * - userId: string (required)
 * - limit: number (optional, default 10)
 *
 * Response:
 * {
 *   "exercises": [...],
 *   "total": 10,
 *   "source": "pipeline" | "cache" | "generated"
 * }
 */
router.get('/learn', async (req: Request, res: Response) => {
  try {
    if (!pipeline) {
      return res.status(503).json({ error: 'Exercise pipeline not available' });
    }

    const { userId, limit = 10 } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const limitNum = parseInt(limit as string) || 10;

    // Get exercises from pipeline
    const exercises = await pipeline.getExercisesForUser(userId, 'learn', limitNum);

    res.json({
      exercises,
      total: exercises.length,
      source: exercises.length > 0 ? 'pipeline' : 'empty'
    });

  } catch (error) {
    logger.error('Error fetching learn exercises:', error);
    res.status(500).json({ error: 'Failed to fetch learn exercises' });
  }
});

/**
 * GET /api/annotation-exercises/practice
 * Get annotation-based exercises for the Practice tab
 *
 * Query params:
 * - userId: string (required)
 * - limit: number (optional, default 10)
 *
 * Response:
 * {
 *   "exercises": [...],
 *   "total": 10,
 *   "source": "pipeline" | "cache" | "generated"
 * }
 */
router.get('/practice', async (req: Request, res: Response) => {
  try {
    if (!pipeline) {
      return res.status(503).json({ error: 'Exercise pipeline not available' });
    }

    const { userId, limit = 10 } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const limitNum = parseInt(limit as string) || 10;

    // Get exercises from pipeline
    const exercises = await pipeline.getExercisesForUser(userId, 'practice', limitNum);

    res.json({
      exercises,
      total: exercises.length,
      source: exercises.length > 0 ? 'pipeline' : 'empty'
    });

  } catch (error) {
    logger.error('Error fetching practice exercises:', error);
    res.status(500).json({ error: 'Failed to fetch practice exercises' });
  }
});

/**
 * POST /api/annotation-exercises/prefetch
 * Pre-generate exercises for a user based on their weak areas
 *
 * Request body:
 * {
 *   "userId": "user-123",
 *   "count": 20
 * }
 *
 * Response:
 * {
 *   "message": "Prefetch initiated",
 *   "userId": "user-123",
 *   "count": 20
 * }
 */
router.post('/prefetch', async (req: Request, res: Response) => {
  try {
    if (!pipeline) {
      return res.status(503).json({ error: 'Exercise pipeline not available' });
    }

    const { userId, count = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Start prefetch asynchronously
    pipeline.prefetchExercises(userId, count).catch(error => {
      logger.error(`Prefetch failed for user ${userId}:`, error);
    });

    res.json({
      message: 'Prefetch initiated',
      userId,
      count
    });

  } catch (error) {
    logger.error('Error initiating prefetch:', error);
    res.status(500).json({ error: 'Failed to initiate prefetch' });
  }
});

/**
 * POST /api/annotation-exercises/batch-generate
 * Generate exercises for multiple annotations (admin only)
 *
 * Request body:
 * {
 *   "annotationIds": ["ann-1", "ann-2", "ann-3"]
 * }
 *
 * Response:
 * {
 *   "message": "Batch generation started",
 *   "count": 3
 * }
 */
router.post('/batch-generate', async (req: Request, res: Response) => {
  try {
    if (!pipeline) {
      return res.status(503).json({ error: 'Exercise pipeline not available' });
    }

    const { annotationIds } = req.body;

    if (!Array.isArray(annotationIds) || annotationIds.length === 0) {
      return res.status(400).json({ error: 'annotationIds array is required' });
    }

    // Start batch generation asynchronously
    pipeline.generateForBatch(annotationIds).catch(error => {
      logger.error('Batch generation failed:', error);
    });

    res.json({
      message: 'Batch generation started',
      count: annotationIds.length
    });

  } catch (error) {
    logger.error('Error starting batch generation:', error);
    res.status(500).json({ error: 'Failed to start batch generation' });
  }
});

/**
 * GET /api/annotation-exercises/pipeline-stats
 * Get pipeline statistics (admin only)
 *
 * Response:
 * {
 *   "activeJobs": 2,
 *   "jobsByStatus": [...],
 *   "cacheSize": 150,
 *   "timestamp": "2025-11-29T..."
 * }
 */
router.get('/pipeline-stats', async (req: Request, res: Response) => {
  try {
    if (!pipeline) {
      return res.status(503).json({ error: 'Exercise pipeline not available' });
    }

    const stats = await pipeline.getPipelineStats();

    res.json(stats);

  } catch (error) {
    logger.error('Error fetching pipeline stats:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline statistics' });
  }
});

export default router;