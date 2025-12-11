/**
 * AI Annotation Statistics and Analytics Routes
 * Provides comprehensive analytics for the annotation review workflow
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../database/connection';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../middleware/optionalSupabaseAuth';
import { error as logError, info } from '../../utils/logger';

const router = Router();

/**
 * GET /api/ai/annotations/stats
 * Get review statistics
 */
router.get(
  '/stats',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    info('Stats endpoint handler EXECUTING', {
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl,
      user: (req as any).user?.id
    });

    try {
      // Get counts by status from ai_annotation_items
      const countsQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM ai_annotation_items
        GROUP BY status
      `;

      const countsResult = await pool.query(countsQuery);

      const stats: Record<string, number> = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        edited: 0
      };

      for (const row of countsResult.rows) {
        stats[row.status] = parseInt(row.count);
        stats.total += parseInt(row.count);
      }

      // Get average confidence
      const confidenceQuery = `
        SELECT AVG(confidence) as avg_confidence
        FROM ai_annotation_items
        WHERE confidence IS NOT NULL
      `;

      const confidenceResult = await pool.query(confidenceQuery);
      const avgConfidence = confidenceResult.rows[0]?.avg_confidence;
      stats.avgConfidence = avgConfidence ? parseFloat(parseFloat(avgConfidence).toFixed(2)) : 0;

      // Get recent activity
      const activityQuery = `
        SELECT
          r.action,
          r.affected_items as "affectedItems",
          r.created_at as "createdAt",
          u.email as "reviewerEmail"
        FROM ai_annotation_reviews r
        LEFT JOIN users u ON r.reviewer_id = u.id
        ORDER BY r.created_at DESC
        LIMIT 10
      `;

      const activityResult = await pool.query(activityQuery);
      (stats as any).recentActivity = activityResult.rows;

      res.json({ data: stats });

    } catch (err) {
      logError('Error fetching annotation stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

/**
 * GET /api/ai/annotations/analytics
 * Get comprehensive analytics for annotation review workflow
 */
router.get(
  '/analytics',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    info('Analytics endpoint called', {
      path: req.path,
      user: (req as any).user?.id
    });

    try {
      // OVERVIEW: Total counts and status breakdown
      const overviewQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence
        FROM ai_annotation_items
      `;
      const overviewResult = await pool.query(overviewQuery);
      const overview = {
        total: parseInt(overviewResult.rows[0].total || '0'),
        pending: parseInt(overviewResult.rows[0].pending || '0'),
        approved: parseInt(overviewResult.rows[0].approved || '0'),
        rejected: parseInt(overviewResult.rows[0].rejected || '0'),
        avgConfidence: parseFloat(overviewResult.rows[0].avg_confidence || '0').toFixed(2)
      };

      // BY SPECIES: Count ALL annotations per species
      const speciesQuery = `
        SELECT
          s.english_name as species,
          COUNT(ai.id) as count
        FROM ai_annotation_items ai
        JOIN images img ON ai.image_id::uuid = img.id
        JOIN species s ON img.species_id = s.id
        GROUP BY s.english_name
        ORDER BY count DESC
      `;
      const speciesResult = await pool.query(speciesQuery);
      const bySpecies: Record<string, number> = {};
      for (const row of speciesResult.rows) {
        if (row.species) {
          bySpecies[row.species] = parseInt(row.count);
        }
      }

      // BY TYPE: Count ALL annotations by type
      const typeQuery = `
        SELECT
          annotation_type as type,
          COUNT(*) as count
        FROM ai_annotation_items
        GROUP BY annotation_type
        ORDER BY count DESC
      `;
      const typeResult = await pool.query(typeQuery);
      const byType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        if (row.type) {
          byType[row.type] = parseInt(row.count);
        }
      }

      // REJECTIONS BY CATEGORY
      const rejectionsQuery = `
        SELECT notes
        FROM ai_annotation_reviews
        WHERE action = 'reject' AND notes IS NOT NULL
      `;
      const rejectionsResult = await pool.query(rejectionsQuery);
      const rejectionsByCategory: Record<string, number> = {};

      for (const row of rejectionsResult.rows) {
        const match = row.notes?.match(/^\[([A-Z_]+)\]/);
        if (match) {
          const category = match[1];
          rejectionsByCategory[category] = (rejectionsByCategory[category] || 0) + 1;
        }
      }

      // QUALITY FLAGS
      const qualityQuery = `
        SELECT
          id,
          bounding_box,
          confidence
        FROM ai_annotation_items
        WHERE status = 'pending'
      `;
      const qualityResult = await pool.query(qualityQuery);

      let tooSmallCount = 0;
      let lowConfidenceCount = 0;

      for (const row of qualityResult.rows) {
        const bbox = typeof row.bounding_box === 'string'
          ? JSON.parse(row.bounding_box)
          : row.bounding_box;

        const area = (bbox.width || 0) * (bbox.height || 0);
        if (area < 0.02) {
          tooSmallCount++;
        }

        if (row.confidence && row.confidence < 0.70) {
          lowConfidenceCount++;
        }
      }

      const analytics = {
        overview,
        bySpecies,
        byType,
        rejectionsByCategory,
        qualityFlags: {
          tooSmall: tooSmallCount,
          lowConfidence: lowConfidenceCount
        }
      };

      info('Analytics generated successfully', {
        total: overview.total,
        pending: overview.pending,
        qualityIssues: tooSmallCount + lowConfidenceCount
      });

      res.json(analytics);

    } catch (err) {
      logError('Error generating analytics', err as Error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  }
);

export default router;
