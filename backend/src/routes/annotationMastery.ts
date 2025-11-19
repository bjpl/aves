/**
 * Annotation Mastery API Routes
 *
 * Endpoints for tracking and retrieving user mastery data for annotations
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { AnnotationMasteryService } from '../services/AnnotationMasteryService';
import { error as logError } from '../utils/logger';

export function createAnnotationMasteryRouter(pool: Pool): Router {
  const router = Router();
  const masteryService = new AnnotationMasteryService(pool);

  // ============================================================================
  // VALIDATION SCHEMAS
  // ============================================================================

  const UpdateMasterySchema = z.object({
    userId: z.string().min(1),
    annotationId: z.string().uuid(),
    correct: z.boolean(),
    responseTimeMs: z.number().int().positive(),
    sessionId: z.string().optional()
  });

  const GetRecommendationsSchema = z.object({
    userId: z.string().min(1),
    count: z.number().int().positive().max(20).optional(),
    focusType: z.enum(['anatomical', 'behavioral', 'color', 'pattern']).optional(),
    difficultyMin: z.number().int().min(1).max(5).optional(),
    difficultyMax: z.number().int().min(1).max(5).optional(),
    includeNew: z.boolean().optional()
  });

  // ============================================================================
  // ROUTES
  // ============================================================================

  /**
   * POST /api/mastery/update
   * Update mastery record after exercise completion
   */
  router.post('/update', async (req: Request, res: Response) => {
    try {
      const data = UpdateMasterySchema.parse(req.body);

      const masteryRecord = await masteryService.updateMastery(
        data.userId,
        data.annotationId,
        data.correct,
        data.responseTimeMs,
        data.sessionId
      );

      res.json({
        success: true,
        mastery: {
          annotationId: masteryRecord.annotationId,
          masteryScore: masteryRecord.masteryScore,
          confidenceLevel: masteryRecord.confidenceLevel,
          exposureCount: masteryRecord.exposureCount,
          correctCount: masteryRecord.correctCount,
          nextReviewAt: masteryRecord.nextReviewAt
        }
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: err.errors
        });
      }

      logError('Error updating annotation mastery', err as Error);
      res.status(500).json({ error: 'Failed to update mastery' });
    }
  });

  /**
   * GET /api/mastery/weak/:userId
   * Get user's weak annotations
   */
  router.get('/weak/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const annotationType = req.query.type as string | undefined;

      const weakAnnotations = await masteryService.getWeakAnnotations(
        userId,
        limit,
        annotationType
      );

      res.json({
        success: true,
        count: weakAnnotations.length,
        annotations: weakAnnotations
      });

    } catch (err) {
      logError('Error fetching weak annotations', err as Error);
      res.status(500).json({ error: 'Failed to fetch weak annotations' });
    }
  });

  /**
   * GET /api/mastery/due/:userId
   * Get annotations due for spaced repetition review
   */
  router.get('/due/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const dueAnnotations = await masteryService.getAnnotationsDueForReview(
        userId,
        limit
      );

      res.json({
        success: true,
        count: dueAnnotations.length,
        annotations: dueAnnotations
      });

    } catch (err) {
      logError('Error fetching due annotations', err as Error);
      res.status(500).json({ error: 'Failed to fetch due annotations' });
    }
  });

  /**
   * GET /api/mastery/new/:userId
   * Get new annotations user hasn't seen
   */
  router.get('/new/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const difficultyMin = req.query.difficultyMin ? parseInt(req.query.difficultyMin as string) : undefined;
      const difficultyMax = req.query.difficultyMax ? parseInt(req.query.difficultyMax as string) : undefined;

      const difficultyRange: [number, number] | undefined =
        difficultyMin && difficultyMax ? [difficultyMin, difficultyMax] : undefined;

      const newAnnotations = await masteryService.getNewAnnotations(
        userId,
        limit,
        difficultyRange
      );

      res.json({
        success: true,
        count: newAnnotations.length,
        annotations: newAnnotations
      });

    } catch (err) {
      logError('Error fetching new annotations', err as Error);
      res.status(500).json({ error: 'Failed to fetch new annotations' });
    }
  });

  /**
   * GET /api/mastery/recommended/:userId
   * Get intelligent annotation recommendations for practice
   */
  router.get('/recommended/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const queryData = GetRecommendationsSchema.parse({
        userId,
        count: req.query.count ? parseInt(req.query.count as string) : 5,
        focusType: req.query.focusType as string | undefined,
        difficultyMin: req.query.difficultyMin ? parseInt(req.query.difficultyMin as string) : undefined,
        difficultyMax: req.query.difficultyMax ? parseInt(req.query.difficultyMax as string) : undefined,
        includeNew: req.query.includeNew === 'false' ? false : true
      });

      const difficultyRange: [number, number] | undefined =
        queryData.difficultyMin && queryData.difficultyMax
          ? [queryData.difficultyMin, queryData.difficultyMax]
          : undefined;

      const recommendations = await masteryService.getRecommendedAnnotations(
        userId,
        queryData.count,
        {
          focusType: queryData.focusType,
          difficultyRange,
          includeNew: queryData.includeNew
        }
      );

      res.json({
        success: true,
        count: recommendations.length,
        recommendations: recommendations.map(rec => ({
          annotation: rec.annotation,
          masteryData: rec.masteryData,
          reason: rec.reason,
          priority: rec.priority
        }))
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: err.errors
        });
      }

      logError('Error fetching recommended annotations', err as Error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  /**
   * GET /api/mastery/score/:userId/:annotationId
   * Get mastery score for specific annotation
   */
  router.get('/score/:userId/:annotationId', async (req: Request, res: Response) => {
    try {
      const { userId, annotationId } = req.params;

      const masteryScore = await masteryService.getMasteryScore(userId, annotationId);

      res.json({
        success: true,
        userId,
        annotationId,
        masteryScore
      });

    } catch (err) {
      logError('Error fetching mastery score', err as Error);
      res.status(500).json({ error: 'Failed to fetch mastery score' });
    }
  });

  /**
   * GET /api/mastery/stats/:userId
   * Get overall user mastery statistics
   */
  router.get('/stats/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const stats = await masteryService.getUserMasteryStats(userId);

      res.json({
        success: true,
        userId,
        stats
      });

    } catch (err) {
      logError('Error fetching user mastery stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  return router;
}

export default createAnnotationMasteryRouter;
