/**
 * Admin Single Image Management Routes
 *
 * CONCEPT: API endpoints for individual image operations
 * WHY: Provides granular control over single images (view, delete, annotate)
 * PATTERN: RESTful CRUD operations on single image resources
 *
 * Endpoints:
 * - GET /admin/images/:imageId - Get single image with full details
 * - DELETE /admin/images/:imageId - Delete image and annotations
 * - POST /admin/images/:imageId/annotate - Trigger annotation for one image
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../../database/connection';
import { VisionAIService } from '../../../services/VisionAIService';
import { ImageQualityValidator } from '../../../services/ImageQualityValidator';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../../middleware/optionalSupabaseAuth';
import { validateParams } from '../../../middleware/validate';
import { error as logError, info } from '../../../utils/logger';
import { SingleImageParamSchema } from './shared';

const router = Router();

/**
 * GET /admin/images/:imageId
 * Get single image with full details and annotations
 *
 * @auth Admin only
 */
router.get(
  '/:imageId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      const imageQuery = `
        SELECT
          i.id, i.species_id as "speciesId", i.unsplash_id as "unsplashId",
          i.url, i.width, i.height, i.description,
          i.photographer, i.photographer_username as "photographerUsername",
          i.quality_score as "qualityScore",
          i.created_at as "createdAt",
          s.english_name as "englishName", s.spanish_name as "spanishName",
          s.scientific_name as "scientificName"
        FROM images i
        LEFT JOIN species s ON i.species_id = s.id
        WHERE i.id = $1
      `;
      const imageResult = await pool.query(imageQuery, [imageId]);

      if (imageResult.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      const imageRow = imageResult.rows[0];

      const annotationsQuery = `
        SELECT
          id, job_id as "jobId", spanish_term as "spanishTerm",
          english_term as "englishTerm", bounding_box as "boundingBox",
          annotation_type as "annotationType", difficulty_level as "difficultyLevel",
          pronunciation, confidence, status, created_at as "createdAt"
        FROM ai_annotation_items
        WHERE image_id::text = $1
        ORDER BY created_at DESC
      `;
      const annotationsResult = await pool.query(annotationsQuery, [imageId]);

      res.json({
        data: {
          ...imageRow,
          species: {
            englishName: imageRow.englishName,
            spanishName: imageRow.spanishName,
            scientificName: imageRow.scientificName
          },
          annotations: annotationsResult.rows
        }
      });

    } catch (err) {
      logError('Error fetching image details', err as Error);
      res.status(500).json({ error: 'Failed to fetch image details' });
    }
  }
);

/**
 * DELETE /admin/images/:imageId
 * Delete an image and its associated annotations
 *
 * @auth Admin only
 */
router.delete(
  '/:imageId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      const checkResult = await pool.query('SELECT id FROM images WHERE id = $1', [imageId]);
      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      // Delete annotations first (foreign key constraint)
      await pool.query('DELETE FROM ai_annotation_items WHERE image_id::text = $1', [imageId]);
      await pool.query('DELETE FROM ai_annotations WHERE image_id::text = $1', [imageId]);
      await pool.query('DELETE FROM images WHERE id = $1', [imageId]);

      info('Image deleted', { imageId, userId: req.user?.userId });

      res.json({ message: 'Image deleted successfully', imageId });

    } catch (err) {
      logError('Error deleting image', err as Error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }
);

/**
 * POST /admin/images/:imageId/annotate
 * Trigger annotation for a single image
 *
 * @auth Admin only
 */
router.post(
  '/:imageId/annotate',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      info('Starting single image annotation', { imageId, userId: req.user?.userId });

      const imageQuery = `
        SELECT i.id, i.url, i.width, i.height, s.english_name as species_name
        FROM images i
        LEFT JOIN species s ON i.species_id = s.id
        WHERE i.id = $1
      `;
      const imageResult = await pool.query(imageQuery, [imageId]);

      if (imageResult.rows.length === 0) {
        res.status(404).json({
          error: 'Image not found',
          message: `No image exists with ID: ${imageId}`
        });
        return;
      }

      const image = imageResult.rows[0];

      // Validate image URL is accessible
      if (!image.url) {
        res.status(400).json({
          error: 'Invalid image',
          message: 'Image does not have a valid URL'
        });
        return;
      }

      // Check quality score first
      const qualityValidator = new ImageQualityValidator();
      let qualityScore: number | null = null;

      const qualityCheck = await pool.query(
        'SELECT quality_score FROM images WHERE id = $1',
        [imageId]
      );

      if (qualityCheck.rows.length > 0) {
        qualityScore = qualityCheck.rows[0].quality_score;
      }

      // If no quality score exists, assess it now
      if (qualityScore === null && qualityValidator.isConfigured()) {
        try {
          const analysis = await qualityValidator.analyzeImage(image.url);
          qualityScore = analysis.overallScore;

          // Update quality_score in database
          await pool.query(
            `UPDATE images SET quality_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [qualityScore, imageId]
          );

          info('Image quality assessed for single annotation', {
            imageId,
            qualityScore,
            passed: analysis.passed,
            category: analysis.category
          });
        } catch (qualityError) {
          logError('Failed to assess image quality', qualityError as Error, {
            imageId
          });
        }
      }

      // Block annotation if quality is too low
      if (qualityScore !== null && qualityScore < 60) {
        res.status(422).json({
          error: 'Image quality too low for annotation',
          message: `Image quality score (${qualityScore}) is below the annotation threshold (60)`,
          qualityScore
        });
        return;
      }

      // Initialize Vision AI service
      const visionService = new VisionAIService();

      if (!visionService.isConfigured()) {
        res.status(503).json({
          error: 'Claude API not configured',
          message: 'ANTHROPIC_API_KEY environment variable is not set'
        });
        return;
      }

      // Check if image already has annotations
      const existingCheck = await pool.query(
        'SELECT COUNT(*) as count FROM ai_annotation_items WHERE image_id::text = $1',
        [imageId]
      );

      if (parseInt(existingCheck.rows[0].count) > 0) {
        res.status(409).json({
          error: 'Image already annotated',
          message: 'This image already has annotations. Delete existing annotations first if you want to re-annotate.'
        });
        return;
      }

      // Generate annotations
      try {
        const annotations = await visionService.generateAnnotations(
          image.url,
          imageId,
          { species: image.species_name || 'bird' }
        );

        // Generate a job ID for tracking
        const jobId = `job_${imageId}_${Date.now()}`;

        info('Single image annotation completed', {
          imageId,
          annotationCount: annotations.length,
          jobId
        });

        res.status(201).json({
          message: 'Annotation completed successfully',
          jobId,
          annotationCount: annotations.length,
          imageId
        });

      } catch (annotationError) {
        logError('Failed to generate annotation', annotationError as Error, { imageId });
        res.status(500).json({
          error: 'Annotation failed',
          message: (annotationError as Error).message
        });
      }

    } catch (err) {
      logError('Error in single image annotation', err as Error);
      res.status(500).json({ error: 'Failed to annotate image' });
    }
  }
);

export default router;
