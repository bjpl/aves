/**
 * Content API Routes
 *
 * Endpoints for fetching published learning content and exercises.
 * Used by Learn and Practice pages to get AI-curated educational content.
 */

import { Router, Request, Response } from 'express';
import { error as logError, info } from '../utils/logger';

const router = Router();

// Log when this module is loaded
info('Content router module loading...');

// Simple test endpoint to verify router is working
router.get('/test', (_req: Request, res: Response) => {
  info('Content test endpoint hit');
  res.json({ status: 'ok', message: 'Content router is working', timestamp: new Date().toISOString() });
});

// Lazy-load ContentPublishingService to avoid import-time issues
let contentPublishingService: any = null;
async function getContentService() {
  if (!contentPublishingService) {
    const module = await import('../services/ContentPublishingService');
    contentPublishingService = module.contentPublishingService;
    info('ContentPublishingService lazy-loaded successfully');
  }
  return contentPublishingService;
}

// Type for ContentFilters
interface ContentFilters {
  difficulty?: number;
  type?: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  speciesId?: string;
  moduleId?: string;
  limit?: number;
  offset?: number;
}

/**
 * @openapi
 * /api/content/learn:
 *   get:
 *     tags:
 *       - Content
 *     summary: Get published learning content
 *     parameters:
 *       - name: difficulty
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [anatomical, behavioral, color, pattern]
 *       - name: speciesId
 *         in: query
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: query
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get('/learn', async (req: Request, res: Response) => {
  try {
    const service = await getContentService();
    const filters: ContentFilters = {
      difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined,
      type: req.query.type as ContentFilters['type'],
      speciesId: req.query.speciesId as string,
      moduleId: req.query.moduleId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const content = await service.getPublishedContent(filters);

    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (err) {
    logError('Error fetching learning content', err as Error);
    res.status(500).json({ error: 'Failed to fetch learning content' });
  }
});

/**
 * @openapi
 * /api/content/modules:
 *   get:
 *     tags:
 *       - Content
 *     summary: Get available learning modules
 */
router.get('/modules', async (_req: Request, res: Response) => {
  try {
    const service = await getContentService();
    const modules = await service.getLearningModules();

    res.json({
      success: true,
      data: modules,
      count: modules.length
    });
  } catch (err) {
    logError('Error fetching learning modules', err as Error);
    res.status(500).json({ error: 'Failed to fetch learning modules' });
  }
});

/**
 * @openapi
 * /api/content/stats:
 *   get:
 *     tags:
 *       - Content
 *     summary: Get content statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const service = await getContentService();
    const stats = await service.getContentStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    logError('Error fetching content stats', err as Error);
    res.status(500).json({ error: 'Failed to fetch content statistics' });
  }
});

/**
 * @openapi
 * /api/content/by-species/{speciesId}:
 *   get:
 *     tags:
 *       - Content
 *     summary: Get learning content for a specific species
 */
router.get('/by-species/:speciesId', async (req: Request, res: Response) => {
  try {
    const service = await getContentService();
    const { speciesId } = req.params;
    const content = await service.getPublishedContent({
      speciesId,
      limit: 100
    });

    res.json({
      success: true,
      data: content,
      speciesId,
      count: content.length
    });
  } catch (err) {
    logError('Error fetching species content', err as Error);
    res.status(500).json({ error: 'Failed to fetch species content' });
  }
});

/**
 * @openapi
 * /api/content/publish:
 *   post:
 *     tags:
 *       - Content
 *       - Admin
 *     summary: Publish approved annotations to make them available in Learn/Practice
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annotationIds
 *             properties:
 *               annotationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               moduleId:
 *                 type: string
 *               generateExercises:
 *                 type: boolean
 *                 default: false
 */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const service = await getContentService();
    const { annotationIds, moduleId, generateExercises } = req.body;

    if (!annotationIds || !Array.isArray(annotationIds) || annotationIds.length === 0) {
      res.status(400).json({ error: 'annotationIds array is required' });
      return;
    }

    const result = await service.publishAnnotations({
      annotationIds,
      moduleId,
      generateExercises
    });

    res.json({
      success: true,
      published: result.published,
      failed: result.failed,
      message: `Published ${result.published} annotations${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (err) {
    logError('Error publishing content', err as Error);
    res.status(500).json({ error: 'Failed to publish content' });
  }
});

export default router;
