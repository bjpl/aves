/**
 * AI Annotation Pattern Learning Routes
 * Analytics and insights from learned annotation patterns
 */

import { Router, Request, Response } from 'express';
import { visionAIService } from '../../services/VisionAIService';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../middleware/optionalSupabaseAuth';
import { error as logError, info } from '../../utils/logger';

const router = Router();

/**
 * GET /api/ai/annotations/patterns/analytics
 * Get pattern learning analytics and insights
 */
router.get(
  '/analytics',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      info('Pattern learning analytics requested', { userId: req.user?.userId });

      const analytics = await visionAIService.getPatternAnalytics();

      res.json(analytics);

    } catch (err) {
      logError('Error fetching pattern analytics', err as Error);
      res.status(500).json({ error: 'Failed to fetch pattern analytics' });
    }
  }
);

/**
 * GET /api/ai/annotations/patterns/species/:species/recommendations
 * Get recommended features for a specific species based on learned patterns
 */
router.get(
  '/species/:species/recommendations',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { species } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

      info('Recommended features requested', { species, limit });

      const recommendedFeatures = visionAIService.getRecommendedFeatures(species, limit);

      res.json({
        species,
        recommendedFeatures,
        count: recommendedFeatures.length
      });

    } catch (err) {
      logError('Error fetching recommended features', err as Error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
);

/**
 * GET /api/ai/annotations/patterns/export
 * Export all learned patterns for analysis
 */
router.get(
  '/export',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      info('Pattern export requested', { userId: req.user?.userId });

      const exported = visionAIService.exportLearnedPatterns();

      res.json({
        ...exported,
        exportedAt: new Date().toISOString()
      });

    } catch (err) {
      logError('Error exporting patterns', err as Error);
      res.status(500).json({ error: 'Failed to export patterns' });
    }
  }
);

export default router;
