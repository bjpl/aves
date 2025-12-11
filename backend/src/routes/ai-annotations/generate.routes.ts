/**
 * AI Annotation Generation Routes
 * Handles AI-powered annotation generation for images
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../database/connection';
import { visionAIService, AIAnnotation } from '../../services/VisionAIService';
import { birdDetectionService } from '../../services/BirdDetectionService';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../middleware/optionalSupabaseAuth';
import { validateBody, validateParams } from '../../middleware/validate';
import { error as logError, info } from '../../utils/logger';
import { getAIConfig } from '../../config';
import {
  GenerateAnnotationsSchema,
  ImageIdParamSchema,
  JobIdParamSchema,
  aiGenerationLimiter
} from './helpers';

const router = Router();

/**
 * @openapi
 * /api/ai/annotations/generate/{imageId}:
 *   post:
 *     tags:
 *       - AI Annotations
 *     summary: Generate AI annotations for an image
 *     description: |
 *       Triggers AI-powered annotation generation using Claude Vision API.
 *       Creates anatomical annotations with bounding boxes, difficulty levels, and confidence scores.
 *
 *       **Rate Limited**: 500 requests per hour
 *       **Admin Only**: Requires admin authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the image to annotate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Public URL of the image to analyze
 *     responses:
 *       202:
 *         description: Annotation generation started (async job)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post(
  '/generate/:imageId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  aiGenerationLimiter,
  validateParams(ImageIdParamSchema),
  validateBody(GenerateAnnotationsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { imageId } = req.params;
      const { imageUrl } = req.body;

      info('Starting AI annotation generation', { imageId, userId: req.user?.userId });

      // Generate job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create job record with 'processing' status
      await client.query(
        `INSERT INTO ai_annotations (job_id, image_id, annotation_data, status)
         VALUES ($1, $2, $3, $4)`,
        [jobId, imageId, JSON.stringify([]), 'processing']
      );

      // Start async annotation generation
      (async () => {
        const MAX_RETRIES = 3;
        const BASE_DELAY_MS = 1000;
        let retryCount = 0;

        const updateJobStatus = async (
          status: string,
          data: Record<string, unknown> | AIAnnotation[],
          confidenceScore?: number,
          errorMessage?: string
        ): Promise<void> => {
          const maxStatusUpdateRetries = 3;
          let statusUpdateAttempt = 0;

          while (statusUpdateAttempt < maxStatusUpdateRetries) {
            try {
              await pool.query(
                `UPDATE ai_annotations
                 SET status = $1, annotation_data = $2, confidence_score = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE job_id = $4`,
                [status, JSON.stringify(data), confidenceScore || null, jobId]
              );
              info('Job status updated successfully', { jobId, status, attempt: statusUpdateAttempt + 1 });
              return;
            } catch (updateError) {
              statusUpdateAttempt++;
              logError(`Failed to update job status (attempt ${statusUpdateAttempt}/${maxStatusUpdateRetries})`,
                updateError as Error, { jobId, status });

              if (statusUpdateAttempt >= maxStatusUpdateRetries) {
                logError('CRITICAL: Failed to update job status after all retries',
                  updateError as Error, { jobId, status });
                break;
              }

              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, statusUpdateAttempt)));
            }
          }
        };

        const generateWithRetry = async (): Promise<AIAnnotation[]> => {
          // Step 1: Quality check and bird detection
          const aiConfig = getAIConfig();
          let validationResult = null;

          if (aiConfig.features.enableBirdDetection) {
            info('Bird detection enabled - validating image quality', { jobId, imageId });
            try {
              validationResult = await birdDetectionService.validateImage(imageUrl);

              info('Image validation completed', {
                jobId,
                imageId,
                valid: validationResult.valid,
                detected: validationResult.detection.detected,
                suitable: validationResult.quality.suitable,
                skipReason: validationResult.skipReason
              });

              if (!validationResult.valid) {
                info('Image failed quality check - skipping annotation generation', {
                  jobId,
                  imageId,
                  skipReason: validationResult.skipReason
                });

                await updateJobStatus('failed', {
                  skipped: true,
                  skipReason: validationResult.skipReason,
                  detection: validationResult.detection,
                  quality: validationResult.quality
                }, undefined, validationResult.skipReason);

                throw new Error(`Image skipped: ${validationResult.skipReason}`);
              }
            } catch (validationError) {
              logError('Image validation failed - proceeding with annotation generation anyway',
                validationError as Error, { jobId, imageId });
              validationResult = null;
            }
          } else {
            info('Bird detection disabled via feature flag', { jobId, imageId });
          }

          // Step 2: Fetch species information
          let speciesName: string | undefined;
          try {
            const speciesResult = await pool.query(
              `SELECT s.english_name
               FROM images i
               JOIN species s ON i.species_id = s.id
               WHERE i.id::text = $1`,
              [imageId]
            );
            if (speciesResult.rows.length > 0) {
              speciesName = speciesResult.rows[0].english_name;
              info('Species information retrieved for ML enhancement', { imageId, species: speciesName });
            }
          } catch (speciesError) {
            logError('Failed to fetch species information',
              speciesError as Error, { imageId });
          }

          // Step 3: Generate annotations with retry
          while (retryCount < MAX_RETRIES) {
            try {
              info('Attempting AI annotation generation', {
                jobId,
                attempt: retryCount + 1,
                maxRetries: MAX_RETRIES,
                species: speciesName
              });

              const annotations = await visionAIService.generateAnnotations(imageUrl, imageId, {
                species: speciesName,
                enablePatternLearning: true
              });

              if (!annotations || annotations.length === 0) {
                throw new Error('AI service returned no annotations');
              }

              return annotations;
            } catch (error) {
              retryCount++;
              const isLastRetry = retryCount >= MAX_RETRIES;

              logError(`AI annotation generation attempt ${retryCount}/${MAX_RETRIES} failed`,
                error as Error, { jobId, imageId, isLastRetry });

              if (isLastRetry) {
                throw error;
              }

              const delayMs = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
              info('Retrying AI annotation generation after delay', {
                jobId,
                nextAttempt: retryCount + 1,
                delayMs
              });
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }

          throw new Error('Max retries exceeded');
        };

        try {
          const annotations = await generateWithRetry();
          const avgConfidence = annotations.reduce((sum, a) => sum + (a.confidence || 0), 0) / annotations.length;

          await updateJobStatus('pending', annotations, parseFloat(avgConfidence.toFixed(2)));

          // Insert individual annotation items
          for (const annotation of annotations) {
            try {
              await pool.query(
                `INSERT INTO ai_annotation_items (
                  job_id, image_id, spanish_term, english_term, bounding_box,
                  annotation_type, difficulty_level, pronunciation, confidence,
                  quality_score, bird_detected, bird_confidence, bird_size_percentage,
                  image_clarity, image_lighting, image_focus
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [
                  jobId,
                  imageId,
                  annotation.spanishTerm,
                  annotation.englishTerm,
                  JSON.stringify(annotation.boundingBox),
                  annotation.type,
                  annotation.difficultyLevel,
                  annotation.pronunciation || null,
                  annotation.confidence || 0.8,
                  null, null, null, null, null, null, null
                ]
              );
            } catch (insertError) {
              logError('Failed to insert annotation item', insertError as Error, {
                jobId,
                annotationTerm: annotation.spanishTerm
              });
            }
          }

          info('AI annotation generation completed successfully', {
            jobId,
            annotationCount: annotations.length,
            retriesUsed: retryCount,
            avgConfidence: avgConfidence.toFixed(2)
          });

        } catch (error) {
          const errorMessage = (error as Error).message;
          const errorDetails = {
            message: errorMessage,
            retriesAttempted: retryCount,
            timestamp: new Date().toISOString()
          };

          logError('AI annotation generation failed after all retries', error as Error, {
            jobId,
            imageId,
            retriesAttempted: retryCount
          });

          await updateJobStatus('failed', errorDetails, undefined, errorMessage);
        }
      })();

      // Set up job timeout (5 minutes)
      setTimeout(async () => {
        try {
          const checkResult = await pool.query(
            'SELECT status FROM ai_annotations WHERE job_id = $1',
            [jobId]
          );

          if (checkResult.rows.length > 0 && checkResult.rows[0].status === 'processing') {
            logError('Job timeout - marking as failed', new Error('Processing timeout'), { jobId });

            await pool.query(
              `UPDATE ai_annotations
               SET status = 'failed',
                   error_message = 'Processing timeout after 5 minutes',
                   annotation_data = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE job_id = $2`,
              [JSON.stringify({ error: 'Processing timeout after 5 minutes', timeout: true }), jobId]
            );

            info('Job marked as failed due to timeout', { jobId });
          }
        } catch (timeoutError) {
          logError('Failed to check/update job timeout status', timeoutError as Error, { jobId });
        }
      }, 5 * 60 * 1000);

      res.status(202).json({
        jobId,
        status: 'processing',
        imageId,
        message: 'Annotation generation started. Check job status for results.'
      });

    } catch (err) {
      logError('Error starting AI annotation generation', err as Error);
      res.status(500).json({ error: 'Failed to start annotation generation' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/ai/annotations/:jobId
 * Get specific annotation job status and details
 */
router.get(
  '/:jobId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(JobIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      const query = `
        SELECT
          job_id as "jobId",
          image_id as "imageId",
          annotation_data as "annotationData",
          status,
          confidence_score as "confidenceScore",
          reviewed_by as "reviewedBy",
          reviewed_at as "reviewedAt",
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ai_annotations
        WHERE job_id = $1
      `;

      const result = await pool.query(query, [jobId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Annotation job not found' });
        return;
      }

      const job = {
        ...result.rows[0],
        annotationData: result.rows[0].annotationData
      };

      // Get individual items
      const itemsQuery = `
        SELECT
          id,
          spanish_term as "spanishTerm",
          english_term as "englishTerm",
          bounding_box as "boundingBox",
          annotation_type as "type",
          difficulty_level as "difficultyLevel",
          pronunciation,
          confidence,
          status
        FROM ai_annotation_items
        WHERE job_id = $1
        ORDER BY confidence DESC
      `;

      const itemsResult = await pool.query(itemsQuery, [jobId]);

      const items = itemsResult.rows.map(row => ({
        ...row,
        boundingBox: row.boundingBox
      }));

      res.json({
        ...job,
        items
      });

    } catch (err) {
      logError('Error fetching annotation job', err as Error);
      res.status(500).json({ error: 'Failed to fetch annotation job' });
    }
  }
);

/**
 * GET /api/ai/annotations/pending
 * List all pending AI annotations awaiting review
 */
router.get(
  '/pending',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status || 'pending';

      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM ai_annotation_items WHERE status = $1',
        [status]
      );
      const total = parseInt(countResult.rows[0].total);

      const query = `
        SELECT
          ai.id,
          ai.image_id as "imageId",
          ai.spanish_term as "spanishTerm",
          ai.english_term as "englishTerm",
          ai.bounding_box as "boundingBox",
          ai.annotation_type as "type",
          ai.difficulty_level as "difficultyLevel",
          ai.pronunciation,
          ai.confidence as "confidenceScore",
          ai.status,
          ai.created_at as "createdAt",
          ai.updated_at as "updatedAt",
          img.url as "imageUrl"
        FROM ai_annotation_items ai
        LEFT JOIN images img ON ai.image_id = img.id
        WHERE ai.status = $1
        ORDER BY ai.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [status, limit, offset]);

      const annotations = result.rows.map(row => {
        const boundingBox = row.boundingBox && row.boundingBox.topLeft ? {
          x: row.boundingBox.topLeft.x,
          y: row.boundingBox.topLeft.y,
          width: row.boundingBox.bottomRight.x - row.boundingBox.topLeft.x,
          height: row.boundingBox.bottomRight.y - row.boundingBox.topLeft.y
        } : row.boundingBox;

        return {
          id: row.id,
          imageId: row.imageId,
          spanishTerm: row.spanishTerm,
          englishTerm: row.englishTerm,
          boundingBox,
          type: row.type,
          difficultyLevel: row.difficultyLevel,
          pronunciation: row.pronunciation,
          confidenceScore: row.confidenceScore,
          status: row.status,
          aiGenerated: true,
          imageUrl: row.imageUrl,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      });

      res.json({
        annotations,
        total,
        limit,
        offset,
        status
      });

    } catch (err) {
      logError('Error fetching pending annotations', err as Error);
      res.status(500).json({ error: 'Failed to fetch pending annotations' });
    }
  }
);

export default router;
