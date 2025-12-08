/**
 * Feedback Analytics Routes
 * Provides comprehensive analytics for ML model feedback, corrections, and learning metrics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../middleware/optionalSupabaseAuth';
import { validateBody } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const RetrainRequestSchema = z.object({
  minSampleSize: z.number().int().min(1).optional().default(5),
  species: z.string().optional(),
  featureType: z.string().optional()
});

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * GET /api/feedback/analytics
 * Get comprehensive feedback analytics including approval rates, rejection patterns, and correction statistics
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "overview": {
 *     "totalFeedback": 142,
 *     "approvalRate": 0.65,
 *     "correctionRate": 0.28,
 *     "rejectionRate": 0.07
 *   },
 *   "bySpecies": {
 *     "Mallard Duck": { "total": 45, "approved": 30, "corrected": 12, "rejected": 3 },
 *     ...
 *   },
 *   "byFeatureType": {
 *     "anatomical": { "total": 80, "approved": 55, "corrected": 20, "rejected": 5 },
 *     ...
 *   },
 *   "rejectionPatterns": {
 *     "poor_localization": 15,
 *     "incorrect_feature": 8,
 *     ...
 *   },
 *   "correctionStats": {
 *     "avgDeltaX": 0.05,
 *     "avgDeltaY": 0.03,
 *     "avgDeltaWidth": 0.12,
 *     "avgDeltaHeight": 0.08,
 *     "totalCorrections": 40
 *   }
 * }
 */
router.get(
  '/feedback/analytics',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      info('📊 Feedback analytics requested', { userId: req.user?.userId });

      // 1. OVERVIEW - Overall feedback statistics
      const overviewQuery = `
        SELECT
          COUNT(*) as total_feedback,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'edited') as corrected_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
        FROM ai_annotation_items
        WHERE status IN ('approved', 'edited', 'rejected')
      `;

      const overviewResult = await pool.query(overviewQuery);
      const overview = overviewResult.rows[0];

      const totalFeedback = parseInt(overview.total_feedback || '0');
      const approvalRate = totalFeedback > 0
        ? parseFloat((parseInt(overview.approved_count) / totalFeedback).toFixed(4))
        : 0;
      const correctionRate = totalFeedback > 0
        ? parseFloat((parseInt(overview.corrected_count) / totalFeedback).toFixed(4))
        : 0;
      const rejectionRate = totalFeedback > 0
        ? parseFloat((parseInt(overview.rejected_count) / totalFeedback).toFixed(4))
        : 0;

      // 2. BY SPECIES - Breakdown by species
      const speciesQuery = `
        SELECT
          s.english_name as species,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE ai.status = 'approved') as approved,
          COUNT(*) FILTER (WHERE ai.status = 'edited') as corrected,
          COUNT(*) FILTER (WHERE ai.status = 'rejected') as rejected,
          AVG(ai.confidence) as avg_confidence
        FROM ai_annotation_items ai
        JOIN images img ON ai.image_id = img.id
        JOIN species s ON img.species_id = s.id
        WHERE ai.status IN ('approved', 'edited', 'rejected')
        GROUP BY s.english_name
        ORDER BY total DESC
      `;

      const speciesResult = await pool.query(speciesQuery);
      const bySpecies: Record<string, any> = {};

      for (const row of speciesResult.rows) {
        bySpecies[row.species] = {
          total: parseInt(row.total),
          approved: parseInt(row.approved),
          corrected: parseInt(row.corrected),
          rejected: parseInt(row.rejected),
          avgConfidence: parseFloat(parseFloat(row.avg_confidence || '0').toFixed(4))
        };
      }

      // 3. BY FEATURE TYPE - Breakdown by annotation type
      const featureQuery = `
        SELECT
          annotation_type as feature_type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'edited') as corrected,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          AVG(confidence) as avg_confidence
        FROM ai_annotation_items
        WHERE status IN ('approved', 'edited', 'rejected')
        GROUP BY annotation_type
        ORDER BY total DESC
      `;

      const featureResult = await pool.query(featureQuery);
      const byFeatureType: Record<string, any> = {};

      for (const row of featureResult.rows) {
        byFeatureType[row.feature_type] = {
          total: parseInt(row.total),
          approved: parseInt(row.approved),
          corrected: parseInt(row.corrected),
          rejected: parseInt(row.rejected),
          avgConfidence: parseFloat(parseFloat(row.avg_confidence || '0').toFixed(4))
        };
      }

      // 4. REJECTION PATTERNS - Breakdown by rejection category
      const rejectionQuery = `
        SELECT
          rejection_category,
          COUNT(*) as count
        FROM rejection_patterns
        GROUP BY rejection_category
        ORDER BY count DESC
      `;

      const rejectionResult = await pool.query(rejectionQuery);
      const rejectionPatterns: Record<string, number> = {};

      for (const row of rejectionResult.rows) {
        rejectionPatterns[row.rejection_category] = parseInt(row.count);
      }

      // 5. CORRECTION STATISTICS - Average deltas from corrections
      const correctionStatsQuery = `
        SELECT
          COUNT(*) as total_corrections,
          AVG(delta_x) as avg_delta_x,
          AVG(delta_y) as avg_delta_y,
          AVG(delta_width) as avg_delta_width,
          AVG(delta_height) as avg_delta_height,
          STDDEV(delta_x) as std_delta_x,
          STDDEV(delta_y) as std_delta_y,
          STDDEV(delta_width) as std_delta_width,
          STDDEV(delta_height) as std_delta_height
        FROM annotation_corrections
      `;

      const correctionStatsResult = await pool.query(correctionStatsQuery);
      const correctionStats = correctionStatsResult.rows[0];

      const analytics = {
        overview: {
          totalFeedback,
          approvalRate,
          correctionRate,
          rejectionRate
        },
        bySpecies,
        byFeatureType,
        rejectionPatterns,
        correctionStats: {
          totalCorrections: parseInt(correctionStats.total_corrections || '0'),
          avgDeltaX: parseFloat(parseFloat(correctionStats.avg_delta_x || '0').toFixed(4)),
          avgDeltaY: parseFloat(parseFloat(correctionStats.avg_delta_y || '0').toFixed(4)),
          avgDeltaWidth: parseFloat(parseFloat(correctionStats.avg_delta_width || '0').toFixed(4)),
          avgDeltaHeight: parseFloat(parseFloat(correctionStats.avg_delta_height || '0').toFixed(4)),
          stdDeltaX: parseFloat(parseFloat(correctionStats.std_delta_x || '0').toFixed(4)),
          stdDeltaY: parseFloat(parseFloat(correctionStats.std_delta_y || '0').toFixed(4)),
          stdDeltaWidth: parseFloat(parseFloat(correctionStats.std_delta_width || '0').toFixed(4)),
          stdDeltaHeight: parseFloat(parseFloat(correctionStats.std_delta_height || '0').toFixed(4))
        }
      };

      info('Feedback analytics generated successfully', {
        totalFeedback,
        approvalRate,
        correctionRate,
        rejectionRate
      });

      res.json(analytics);

    } catch (err) {
      logError('Error generating feedback analytics', err as Error);
      res.status(500).json({ error: 'Failed to generate feedback analytics' });
    }
  }
);

/**
 * GET /api/feedback/positioning-model
 * Get current positioning model state with confidence scores and training metrics
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "trained": true,
 *   "totalModels": 15,
 *   "models": [
 *     {
 *       "species": "Mallard Duck",
 *       "featureType": "anatomical",
 *       "adjustments": {
 *         "x": 0.05,
 *         "y": 0.03,
 *         "width": 0.12,
 *         "height": 0.08
 *       },
 *       "standardDeviations": {
 *         "x": 0.02,
 *         "y": 0.015,
 *         "width": 0.04,
 *         "height": 0.03
 *       },
 *       "sampleCount": 45,
 *       "confidence": 0.92,
 *       "lastTrained": "2025-11-17T12:00:00Z"
 *     },
 *     ...
 *   ],
 *   "summary": {
 *     "avgConfidence": 0.87,
 *     "totalSamples": 250,
 *     "speciesCoverage": 8,
 *     "featureTypesCovered": ["anatomical", "behavioral", "color", "pattern"]
 *   }
 * }
 */
router.get(
  '/feedback/positioning-model',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      info('🧠 Positioning model state requested', { userId: req.user?.userId });

      // Get all positioning models
      const modelsQuery = `
        SELECT
          species,
          feature_type,
          avg_delta_x,
          avg_delta_y,
          avg_delta_width,
          avg_delta_height,
          std_dev_x,
          std_dev_y,
          std_dev_width,
          std_dev_height,
          sample_count,
          confidence,
          last_trained
        FROM positioning_model
        ORDER BY confidence DESC, sample_count DESC
      `;

      const modelsResult = await pool.query(modelsQuery);

      const models = modelsResult.rows.map(row => ({
        species: row.species,
        featureType: row.feature_type,
        adjustments: {
          x: parseFloat(parseFloat(row.avg_delta_x).toFixed(4)),
          y: parseFloat(parseFloat(row.avg_delta_y).toFixed(4)),
          width: parseFloat(parseFloat(row.avg_delta_width).toFixed(4)),
          height: parseFloat(parseFloat(row.avg_delta_height).toFixed(4))
        },
        standardDeviations: {
          x: parseFloat(parseFloat(row.std_dev_x || '0').toFixed(4)),
          y: parseFloat(parseFloat(row.std_dev_y || '0').toFixed(4)),
          width: parseFloat(parseFloat(row.std_dev_width || '0').toFixed(4)),
          height: parseFloat(parseFloat(row.std_dev_height || '0').toFixed(4))
        },
        sampleCount: parseInt(row.sample_count),
        confidence: parseFloat(parseFloat(row.confidence).toFixed(4)),
        lastTrained: row.last_trained
      }));

      // Calculate summary statistics
      const totalSamples = models.reduce((sum, m) => sum + m.sampleCount, 0);
      const avgConfidence = models.length > 0
        ? models.reduce((sum, m) => sum + m.confidence, 0) / models.length
        : 0;
      const speciesCoverage = new Set(models.map(m => m.species)).size;
      const featureTypesCovered = Array.from(new Set(models.map(m => m.featureType)));

      const response = {
        trained: models.length > 0,
        totalModels: models.length,
        models,
        summary: {
          avgConfidence: parseFloat(avgConfidence.toFixed(4)),
          totalSamples,
          speciesCoverage,
          featureTypesCovered
        }
      };

      info('Positioning model state retrieved', {
        totalModels: models.length,
        avgConfidence: avgConfidence.toFixed(4),
        totalSamples
      });

      res.json(response);

    } catch (err) {
      logError('Error fetching positioning model state', err as Error);
      res.status(500).json({ error: 'Failed to fetch positioning model state' });
    }
  }
);

/**
 * GET /api/feedback/improvement-trends
 * Get accuracy improvement trends over time
 *
 * @auth Admin only
 *
 * Query params:
 * - window: 7d | 30d | 90d (default: 30d)
 *
 * Response:
 * {
 *   "timeWindow": "30d",
 *   "trends": [
 *     {
 *       "date": "2025-11-10",
 *       "approvalRate": 0.55,
 *       "correctionRate": 0.35,
 *       "rejectionRate": 0.10,
 *       "avgConfidence": 0.82
 *     },
 *     ...
 *   ],
 *   "improvements": {
 *     "approvalRateChange": 0.15,
 *     "correctionRateChange": -0.08,
 *     "rejectionRateChange": -0.07,
 *     "avgConfidenceChange": 0.10
 *   },
 *   "correctionMagnitudeReduction": {
 *     "deltaXReduction": 0.03,
 *     "deltaYReduction": 0.02,
 *     "deltaWidthReduction": 0.05,
 *     "deltaHeightReduction": 0.04
 *   }
 * }
 */
router.get(
  '/feedback/improvement-trends',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const timeWindow = req.query.window as string || '30d';
      const windowDays = timeWindow === '7d' ? 7 : timeWindow === '90d' ? 90 : 30;

      info('📈 Improvement trends requested', {
        userId: req.user?.userId,
        timeWindow
      });

      // Get daily trends
      const trendsQuery = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'edited') as corrected,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          AVG(confidence) as avg_confidence
        FROM ai_annotation_items
        WHERE status IN ('approved', 'edited', 'rejected')
          AND created_at >= CURRENT_DATE - INTERVAL '${windowDays} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const trendsResult = await pool.query(trendsQuery);

      const trends = trendsResult.rows.map(row => {
        const total = parseInt(row.total);
        return {
          date: row.date,
          approvalRate: total > 0 ? parseFloat((parseInt(row.approved) / total).toFixed(4)) : 0,
          correctionRate: total > 0 ? parseFloat((parseInt(row.corrected) / total).toFixed(4)) : 0,
          rejectionRate: total > 0 ? parseFloat((parseInt(row.rejected) / total).toFixed(4)) : 0,
          avgConfidence: parseFloat(parseFloat(row.avg_confidence || '0').toFixed(4)),
          totalFeedback: total
        };
      });

      // Calculate improvements (compare first week vs last week)
      const improvements = {
        approvalRateChange: 0,
        correctionRateChange: 0,
        rejectionRateChange: 0,
        avgConfidenceChange: 0
      };

      if (trends.length >= 14) {
        const firstWeek = trends.slice(0, 7);
        const lastWeek = trends.slice(-7);

        const firstWeekAvg = {
          approval: firstWeek.reduce((sum, t) => sum + t.approvalRate, 0) / 7,
          correction: firstWeek.reduce((sum, t) => sum + t.correctionRate, 0) / 7,
          rejection: firstWeek.reduce((sum, t) => sum + t.rejectionRate, 0) / 7,
          confidence: firstWeek.reduce((sum, t) => sum + t.avgConfidence, 0) / 7
        };

        const lastWeekAvg = {
          approval: lastWeek.reduce((sum, t) => sum + t.approvalRate, 0) / 7,
          correction: lastWeek.reduce((sum, t) => sum + t.correctionRate, 0) / 7,
          rejection: lastWeek.reduce((sum, t) => sum + t.rejectionRate, 0) / 7,
          confidence: lastWeek.reduce((sum, t) => sum + t.avgConfidence, 0) / 7
        };

        improvements.approvalRateChange = parseFloat((lastWeekAvg.approval - firstWeekAvg.approval).toFixed(4));
        improvements.correctionRateChange = parseFloat((lastWeekAvg.correction - firstWeekAvg.correction).toFixed(4));
        improvements.rejectionRateChange = parseFloat((lastWeekAvg.rejection - firstWeekAvg.rejection).toFixed(4));
        improvements.avgConfidenceChange = parseFloat((lastWeekAvg.confidence - firstWeekAvg.confidence).toFixed(4));
      }

      // Get correction magnitude reduction trends
      const correctionTrendsQuery = `
        SELECT
          DATE_TRUNC('week', created_at) as week,
          AVG(ABS(delta_x)) as avg_abs_delta_x,
          AVG(ABS(delta_y)) as avg_abs_delta_y,
          AVG(ABS(delta_width)) as avg_abs_delta_width,
          AVG(ABS(delta_height)) as avg_abs_delta_height
        FROM annotation_corrections
        WHERE created_at >= CURRENT_DATE - INTERVAL '${windowDays} days'
        GROUP BY week
        ORDER BY week ASC
      `;

      const correctionTrendsResult = await pool.query(correctionTrendsQuery);

      const correctionMagnitudeReduction = {
        deltaXReduction: 0,
        deltaYReduction: 0,
        deltaWidthReduction: 0,
        deltaHeightReduction: 0
      };

      if (correctionTrendsResult.rows.length >= 2) {
        const firstWeek = correctionTrendsResult.rows[0];
        const lastWeek = correctionTrendsResult.rows[correctionTrendsResult.rows.length - 1];

        correctionMagnitudeReduction.deltaXReduction = parseFloat(
          (parseFloat(firstWeek.avg_abs_delta_x || '0') - parseFloat(lastWeek.avg_abs_delta_x || '0')).toFixed(4)
        );
        correctionMagnitudeReduction.deltaYReduction = parseFloat(
          (parseFloat(firstWeek.avg_abs_delta_y || '0') - parseFloat(lastWeek.avg_abs_delta_y || '0')).toFixed(4)
        );
        correctionMagnitudeReduction.deltaWidthReduction = parseFloat(
          (parseFloat(firstWeek.avg_abs_delta_width || '0') - parseFloat(lastWeek.avg_abs_delta_width || '0')).toFixed(4)
        );
        correctionMagnitudeReduction.deltaHeightReduction = parseFloat(
          (parseFloat(firstWeek.avg_abs_delta_height || '0') - parseFloat(lastWeek.avg_abs_delta_height || '0')).toFixed(4)
        );
      }

      const response = {
        timeWindow,
        trends,
        improvements,
        correctionMagnitudeReduction
      };

      info('Improvement trends generated successfully', {
        timeWindow,
        trendCount: trends.length,
        approvalImprovement: improvements.approvalRateChange
      });

      res.json(response);

    } catch (err) {
      logError('Error generating improvement trends', err as Error);
      res.status(500).json({ error: 'Failed to generate improvement trends' });
    }
  }
);

/**
 * POST /api/feedback/retrain
 * Trigger neural model retraining using latest correction data
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "minSampleSize": 5,       // Minimum corrections needed to train (optional)
 *   "species": "Mallard Duck", // Train specific species only (optional)
 *   "featureType": "anatomical" // Train specific feature type only (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "trained": 12,
 *   "skipped": 3,
 *   "results": [
 *     {
 *       "species": "Mallard Duck",
 *       "featureType": "anatomical",
 *       "sampleCount": 45,
 *       "confidence": 0.92,
 *       "adjustments": { "x": 0.05, "y": 0.03, "width": 0.12, "height": 0.08 }
 *     },
 *     ...
 *   ],
 *   "trainedAt": "2025-11-17T12:00:00Z"
 * }
 */
router.post(
  '/feedback/retrain',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateBody(RetrainRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { minSampleSize, species, featureType } = req.body;
      const userId = req.user?.userId;

      info('🤖 Neural model retraining triggered', {
        userId,
        minSampleSize,
        species,
        featureType
      });

      await client.query('BEGIN');

      // Build WHERE clause for filtering
      const filters: string[] = [];
      const params: (string | number)[] = [];

      if (species) {
        params.push(species);
        filters.push(`species = $${params.length}`);
      }

      if (featureType) {
        params.push(featureType);
        filters.push(`feature_type = $${params.length}`);
      }

      const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

      // Get correction data grouped by species and feature type
      const correctionsQuery = `
        SELECT
          species,
          feature_type,
          COUNT(*) as sample_count,
          AVG(delta_x) as avg_delta_x,
          AVG(delta_y) as avg_delta_y,
          AVG(delta_width) as avg_delta_width,
          AVG(delta_height) as avg_delta_height,
          STDDEV(delta_x) as std_dev_x,
          STDDEV(delta_y) as std_dev_y,
          STDDEV(delta_width) as std_dev_width,
          STDDEV(delta_height) as std_dev_height
        FROM annotation_corrections
        ${whereClause}
        GROUP BY species, feature_type
        HAVING COUNT(*) >= $${params.length + 1}
      `;

      params.push(minSampleSize);
      const correctionsResult = await client.query(correctionsQuery, params);

      const results = [];
      let trained = 0;
      let skipped = 0;

      for (const row of correctionsResult.rows) {
        const sampleCount = parseInt(row.sample_count);

        // Calculate confidence based on sample size and consistency (low std dev)
        // Confidence = min(sampleCount / 50, 1.0) * (1 - avg(std_devs))
        const avgStdDev = (
          parseFloat(row.std_dev_x || '0') +
          parseFloat(row.std_dev_y || '0') +
          parseFloat(row.std_dev_width || '0') +
          parseFloat(row.std_dev_height || '0')
        ) / 4;

        const sampleConfidence = Math.min(sampleCount / 50, 1.0);
        const consistencyConfidence = Math.max(0, 1 - avgStdDev);
        const confidence = parseFloat((sampleConfidence * 0.6 + consistencyConfidence * 0.4).toFixed(4));

        // Upsert into positioning_model
        const upsertQuery = `
          INSERT INTO positioning_model (
            species, feature_type,
            avg_delta_x, avg_delta_y, avg_delta_width, avg_delta_height,
            std_dev_x, std_dev_y, std_dev_width, std_dev_height,
            sample_count, confidence, last_trained
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
          ON CONFLICT (species, feature_type)
          DO UPDATE SET
            avg_delta_x = EXCLUDED.avg_delta_x,
            avg_delta_y = EXCLUDED.avg_delta_y,
            avg_delta_width = EXCLUDED.avg_delta_width,
            avg_delta_height = EXCLUDED.avg_delta_height,
            std_dev_x = EXCLUDED.std_dev_x,
            std_dev_y = EXCLUDED.std_dev_y,
            std_dev_width = EXCLUDED.std_dev_width,
            std_dev_height = EXCLUDED.std_dev_height,
            sample_count = EXCLUDED.sample_count,
            confidence = EXCLUDED.confidence,
            last_trained = CURRENT_TIMESTAMP
        `;

        await client.query(upsertQuery, [
          row.species,
          row.feature_type,
          row.avg_delta_x,
          row.avg_delta_y,
          row.avg_delta_width,
          row.avg_delta_height,
          row.std_dev_x || 0,
          row.std_dev_y || 0,
          row.std_dev_width || 0,
          row.std_dev_height || 0,
          sampleCount,
          confidence
        ]);

        trained++;
        results.push({
          species: row.species,
          featureType: row.feature_type,
          sampleCount,
          confidence,
          adjustments: {
            x: parseFloat(parseFloat(row.avg_delta_x).toFixed(4)),
            y: parseFloat(parseFloat(row.avg_delta_y).toFixed(4)),
            width: parseFloat(parseFloat(row.avg_delta_width).toFixed(4)),
            height: parseFloat(parseFloat(row.avg_delta_height).toFixed(4))
          }
        });
      }

      await client.query('COMMIT');

      const response = {
        success: true,
        trained,
        skipped,
        results,
        trainedAt: new Date().toISOString()
      };

      info('Neural model retraining completed', {
        trained,
        skipped,
        userId
      });

      res.json(response);

    } catch (err) {
      await client.query('ROLLBACK');
      logError('Error during model retraining', err as Error);
      res.status(500).json({ error: 'Failed to retrain model' });
    } finally {
      client.release();
    }
  }
);

export default router;
