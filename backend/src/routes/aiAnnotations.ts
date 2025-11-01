/**
 * AI Annotations Routes
 * Handles AI-powered annotation generation and review workflow
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../database/connection';
import { visionAIService, AIAnnotation } from '../services/VisionAIService';
import { authenticateSupabaseToken, requireSupabaseAdmin } from '../middleware/supabaseAuth';
import { validateBody, validateParams } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';

const router = Router();

// Debug middleware to log all requests to this router
router.use((req: Request, res: Response, next) => {
  info('🔍 AI Annotations Router Request', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  next();
});

// Rate limiter for AI generation endpoints (expensive operations)
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  message: { error: 'Too many AI generation requests. Please try again later.' }
});

// ============================================================================
// Validation Schemas
// ============================================================================

const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1)
});

const AnnotationItemSchema = z.object({
  spanishTerm: z.string().min(1).max(200),
  englishTerm: z.string().min(1).max(200),
  boundingBox: BoundingBoxSchema,
  type: z.enum(['anatomical', 'behavioral', 'color', 'pattern']),
  difficultyLevel: z.number().int().min(1).max(5),
  pronunciation: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

const GenerateAnnotationsSchema = z.object({
  imageUrl: z.string().url()
});

const ApproveAnnotationSchema = z.object({
  notes: z.string().optional()
});

const RejectAnnotationSchema = z.object({
  category: z.string().optional(), // Rejection category (technical, pedagogical, etc.)
  notes: z.string().max(500).optional(), // Additional notes
  reason: z.string().min(1).max(500).optional() // Legacy field for backwards compatibility
}).refine(
  (data) => data.category || data.reason || data.notes,
  { message: "At least one of category, reason, or notes must be provided" }
);

const EditAnnotationSchema = z.object({
  spanishTerm: z.string().min(1).max(200).optional(),
  englishTerm: z.string().min(1).max(200).optional(),
  boundingBox: BoundingBoxSchema.optional(),
  type: z.enum(['anatomical', 'behavioral', 'color', 'pattern']).optional(),
  difficultyLevel: z.number().int().min(1).max(5).optional(),
  pronunciation: z.string().optional(),
  notes: z.string().optional()
});

const BulkApproveSchema = z.object({
  jobIds: z.array(z.string()),
  notes: z.string().optional()
});

const ImageIdParamSchema = z.object({
  imageId: z.string().uuid()
});

const JobIdParamSchema = z.object({
  jobId: z.string()
});

const AnnotationIdParamSchema = z.object({
  annotationId: z.string().uuid()
});

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * POST /api/ai/annotations/generate/:imageId
 * Trigger AI annotation generation for a specific image
 *
 * @auth Admin only
 * @rate-limited 50 requests/hour
 *
 * Request body:
 * {
 *   "imageUrl": "https://example.com/image.jpg"
 * }
 *
 * Response:
 * {
 *   "jobId": "job_1234567890_abc123",
 *   "status": "processing",
 *   "imageId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
router.post(
  '/ai/annotations/generate/:imageId',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
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

      // Start async annotation generation with retry mechanism and proper error handling
      // In production, this should use a job queue like Bull or BullMQ
      (async () => {
        const MAX_RETRIES = 3;
        const BASE_DELAY_MS = 1000; // 1 second
        let retryCount = 0;

        /**
         * Updates job status with proper error handling
         * Ensures status is ALWAYS updated, never stuck in processing
         */
        const updateJobStatus = async (
          status: string,
          data: any,
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
                     error_message = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE job_id = $5`,
                [status, JSON.stringify(data), confidenceScore || null, errorMessage || null, jobId]
              );
              info('Job status updated successfully', { jobId, status, attempt: statusUpdateAttempt + 1 });
              return; // Success - exit function
            } catch (updateError) {
              statusUpdateAttempt++;
              logError(`Failed to update job status (attempt ${statusUpdateAttempt}/${maxStatusUpdateRetries})`,
                updateError as Error, { jobId, status });

              if (statusUpdateAttempt >= maxStatusUpdateRetries) {
                // CRITICAL: All retries exhausted - log to monitoring system
                logError('CRITICAL: Failed to update job status after all retries - job may be stuck',
                  updateError as Error, { jobId, status });
                // In production, send alert to monitoring system (e.g., Sentry, PagerDuty)
                break;
              }

              // Exponential backoff for status update retries
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, statusUpdateAttempt)));
            }
          }
        };

        /**
         * Generate annotations with exponential backoff retry
         */
        const generateWithRetry = async (): Promise<AIAnnotation[]> => {
          while (retryCount < MAX_RETRIES) {
            try {
              info('Attempting AI annotation generation', { jobId, attempt: retryCount + 1, maxRetries: MAX_RETRIES });
              const annotations = await visionAIService.generateAnnotations(imageUrl, imageId);

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
                throw error; // Final attempt failed - throw to outer catch
              }

              // Exponential backoff: 1s, 2s, 4s
              const delayMs = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
              info('Retrying AI annotation generation after delay', {
                jobId,
                nextAttempt: retryCount + 1,
                delayMs
              });
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }

          throw new Error('Max retries exceeded'); // Should never reach here
        };

        // Main processing logic
        try {
          // Generate annotations with retry
          const annotations = await generateWithRetry();

          // Calculate overall confidence
          const avgConfidence = annotations.reduce((sum, a) => sum + (a.confidence || 0), 0) / annotations.length;

          // Update job with results
          await updateJobStatus('pending', annotations, parseFloat(avgConfidence.toFixed(2)));

          // Insert individual annotation items
          for (const annotation of annotations) {
            try {
              await pool.query(
                `INSERT INTO ai_annotation_items (
                  job_id, image_id, spanish_term, english_term, bounding_box,
                  annotation_type, difficulty_level, pronunciation, confidence
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  jobId,
                  imageId,
                  annotation.spanishTerm,
                  annotation.englishTerm,
                  JSON.stringify(annotation.boundingBox),
                  annotation.type,
                  annotation.difficultyLevel,
                  annotation.pronunciation || null,
                  annotation.confidence || 0.8
                ]
              );
            } catch (insertError) {
              logError('Failed to insert annotation item', insertError as Error, {
                jobId,
                annotationTerm: annotation.spanishTerm
              });
              // Continue with other annotations even if one fails
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

          // Update job status to failed with comprehensive error handling
          await updateJobStatus('failed', errorDetails, undefined, errorMessage);
        }
      })();

      // Set up job timeout (5 minutes) to prevent stuck jobs
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
      }, 5 * 60 * 1000); // 5 minutes

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
 * GET /api/ai/annotations/pending
 * List all pending AI annotations awaiting review
 *
 * @auth Admin only
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - status: 'pending' | 'approved' | 'rejected' | 'processing' | 'failed'
 *
 * Response:
 * {
 *   "annotations": [...],
 *   "total": 42,
 *   "limit": 50,
 *   "offset": 0
 * }
 */
router.get(
  '/ai/annotations/pending',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status || 'pending';

      // Get total count from ai_annotation_items
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM ai_annotation_items WHERE status = $1',
        [status]
      );
      const total = parseInt(countResult.rows[0].total);

      // Get individual annotation items (not jobs)
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
        // Convert database format to standardized format
        let boundingBox = row.boundingBox;

        // If database has old {topLeft, bottomRight} format, convert to {x, y, width, height}
        if (boundingBox && boundingBox.topLeft) {
          boundingBox = {
            x: boundingBox.topLeft.x,
            y: boundingBox.topLeft.y,
            width: boundingBox.bottomRight.x - boundingBox.topLeft.x,
            height: boundingBox.bottomRight.y - boundingBox.topLeft.y
          };
        }

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

/**
 * GET /api/ai/annotations/:jobId
 * Get specific annotation job status and details
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "jobId": "job_1234567890_abc123",
 *   "imageId": "550e8400-e29b-41d4-a716-446655440000",
 *   "status": "pending",
 *   "annotations": [...],
 *   "confidenceScore": 0.87,
 *   "createdAt": "2025-10-02T12:00:00Z"
 * }
 */
router.get(
  '/ai/annotations/:jobId',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
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
        annotationData: result.rows[0].annotationData // Already parsed by pg client
      };

      // Also get individual items
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
        boundingBox: row.boundingBox // Already parsed by pg client
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
 * POST /api/ai/annotations/:annotationId/approve
 * Approve a specific AI annotation and move to main annotations table
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "notes": "Looks good!" (optional)
 * }
 *
 * Response:
 * {
 *   "message": "Annotation approved successfully",
 *   "annotationId": "550e8400-e29b-41d4-a716-446655440000",
 *   "approvedAnnotationId": "660e8400-e29b-41d4-a716-446655440001"
 * }
 */
router.post(
  '/ai/annotations/:annotationId/approve',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(ApproveAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const { notes } = req.body;
      const userId = req.user!.userId;

      // Get the annotation item
      const itemQuery = `
        SELECT
          job_id,
          image_id,
          spanish_term,
          english_term,
          bounding_box,
          annotation_type,
          difficulty_level,
          pronunciation
        FROM ai_annotation_items
        WHERE id = $1 AND status = 'pending'
      `;

      const itemResult = await client.query(itemQuery, [annotationId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Annotation not found or already processed' });
        return;
      }

      const item = itemResult.rows[0];

      // Insert into main annotations table
      const insertQuery = `
        INSERT INTO annotations (
          image_id, bounding_box, annotation_type,
          spanish_term, english_term, pronunciation, difficulty_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const insertResult = await client.query(insertQuery, [
        item.image_id,
        item.bounding_box,
        item.annotation_type,
        item.spanish_term,
        item.english_term,
        item.pronunciation,
        item.difficulty_level
      ]);

      const approvedAnnotationId = insertResult.rows[0].id;

      // Update AI annotation item status
      await client.query(
        `UPDATE ai_annotation_items
         SET status = 'approved', approved_annotation_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approvedAnnotationId, annotationId]
      );

      // Record review action
      await client.query(
        `INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items, notes)
         VALUES ($1, $2, 'approve', 1, $3)`,
        [item.job_id, userId, notes]
      );

      await client.query('COMMIT');

      info('AI annotation approved', { annotationId, approvedAnnotationId, userId });

      res.json({
        message: 'Annotation approved successfully',
        annotationId,
        approvedAnnotationId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      logError('Error approving annotation', err as Error);
      res.status(500).json({ error: 'Failed to approve annotation' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/ai/annotations/:annotationId/reject
 * Reject a specific AI annotation
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "reason": "Incorrect bounding box"
 * }
 *
 * Response:
 * {
 *   "message": "Annotation rejected successfully",
 *   "annotationId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
router.post(
  '/ai/annotations/:annotationId/reject',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(RejectAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const { category, notes, reason } = req.body;
      const userId = req.user!.userId;

      // Combine category and notes for storage (backwards compatible with reason)
      const rejectionMessage = category
        ? `[${category}] ${notes || ''}`.trim()
        : (reason || notes || 'No reason provided');

      // Get job_id for review record
      const itemQuery = 'SELECT job_id FROM ai_annotation_items WHERE id = $1';
      const itemResult = await client.query(itemQuery, [annotationId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      const jobId = itemResult.rows[0].job_id;

      // Update annotation status
      await client.query(
        `UPDATE ai_annotation_items
         SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [annotationId]
      );

      // Record review action with category embedded in notes
      // Format: "[category] notes" or just "notes" if no category
      await client.query(
        `INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items, notes)
         VALUES ($1, $2, 'reject', 1, $3)`,
        [jobId, userId, rejectionMessage]
      );

      await client.query('COMMIT');

      info('AI annotation rejected', { annotationId, userId, reason });

      res.json({
        message: 'Annotation rejected successfully',
        annotationId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      logError('Error rejecting annotation', err as Error);
      res.status(500).json({ error: 'Failed to reject annotation' });
    } finally {
      client.release();
    }
  }
);

/**
 * PATCH /api/ai/annotations/:annotationId
 * Update AI annotation WITHOUT approving (keeps it in review queue)
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "boundingBox": { "topLeft": {...}, "bottomRight": {...}, "width": ..., "height": ... }
 * }
 *
 * Response:
 * {
 *   "message": "Annotation updated successfully",
 *   "annotationId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
router.patch(
  '/ai/annotations/:annotationId',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(EditAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const updates = req.body;

      info('🔧 PATCH /ai/annotations - Received update request', {
        annotationId,
        updates,
        hasUser: !!req.user
      });

      // Update ai_annotation_items WITHOUT changing status
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.spanishTerm) {
        updateFields.push(`spanish_term = $${paramIndex++}`);
        updateValues.push(updates.spanishTerm);
      }
      if (updates.englishTerm) {
        updateFields.push(`english_term = $${paramIndex++}`);
        updateValues.push(updates.englishTerm);
      }
      if (updates.boundingBox) {
        updateFields.push(`bounding_box = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.boundingBox));
      }
      if (updates.pronunciation !== undefined) {
        updateFields.push(`pronunciation = $${paramIndex++}`);
        updateValues.push(updates.pronunciation);
      }
      if (updates.difficultyLevel) {
        updateFields.push(`difficulty_level = $${paramIndex++}`);
        updateValues.push(updates.difficultyLevel);
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No valid updates provided' });
        return;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(annotationId);

      const updateQuery = `
        UPDATE ai_annotation_items
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND status = 'pending'
        RETURNING id
      `;

      info('🔧 PATCH /ai/annotations - Executing query', {
        query: updateQuery,
        values: updateValues
      });

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        logError('Annotation not found or already processed', new Error(`ID: ${annotationId}`));
        res.status(404).json({ error: 'Annotation not found or already processed' });
        return;
      }

      await client.query('COMMIT');

      info('🔧 PATCH /ai/annotations - Update successful', {
        annotationId,
        updatedFields: updateFields
      });

      res.json({
        message: 'Annotation updated successfully',
        annotationId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      logError('Error updating annotation', err as Error);
      res.status(500).json({ error: 'Failed to update annotation' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/ai/annotations/:annotationId/edit
 * Edit and approve an AI annotation
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "spanishTerm": "el pico",
 *   "englishTerm": "beak",
 *   "boundingBox": { "x": 0.45, "y": 0.30, "width": 0.10, "height": 0.08 },
 *   "type": "anatomical",
 *   "difficultyLevel": 2,
 *   "pronunciation": "el PEE-koh",
 *   "notes": "Adjusted bounding box"
 * }
 *
 * Response:
 * {
 *   "message": "Annotation edited and approved successfully",
 *   "annotationId": "550e8400-e29b-41d4-a716-446655440000",
 *   "approvedAnnotationId": "660e8400-e29b-41d4-a716-446655440001"
 * }
 */
router.post(
  '/ai/annotations/:annotationId/edit',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(EditAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const updates = req.body;
      const userId = req.user!.userId;

      // Get the original annotation
      const itemQuery = `
        SELECT
          job_id, image_id, spanish_term, english_term, bounding_box,
          annotation_type, difficulty_level, pronunciation
        FROM ai_annotation_items
        WHERE id = $1 AND status = 'pending'
      `;

      const itemResult = await client.query(itemQuery, [annotationId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Annotation not found or already processed' });
        return;
      }

      const original = itemResult.rows[0];

      // Merge updates with original values
      const finalData = {
        spanishTerm: updates.spanishTerm || original.spanish_term,
        englishTerm: updates.englishTerm || original.english_term,
        boundingBox: updates.boundingBox ? JSON.stringify(updates.boundingBox) : original.bounding_box,
        type: updates.type || original.annotation_type,
        difficultyLevel: updates.difficultyLevel || original.difficulty_level,
        pronunciation: updates.pronunciation !== undefined ? updates.pronunciation : original.pronunciation
      };

      // Insert into main annotations table with edited values
      const insertQuery = `
        INSERT INTO annotations (
          image_id, bounding_box, annotation_type,
          spanish_term, english_term, pronunciation, difficulty_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const insertResult = await client.query(insertQuery, [
        original.image_id,
        finalData.boundingBox,
        finalData.type,
        finalData.spanishTerm,
        finalData.englishTerm,
        finalData.pronunciation,
        finalData.difficultyLevel
      ]);

      const approvedAnnotationId = insertResult.rows[0].id;

      // Update AI annotation item
      await client.query(
        `UPDATE ai_annotation_items
         SET status = 'edited', approved_annotation_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approvedAnnotationId, annotationId]
      );

      // Record review action
      await client.query(
        `INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items, notes)
         VALUES ($1, $2, 'edit', 1, $3)`,
        [original.job_id, userId, updates.notes || 'Annotation edited']
      );

      await client.query('COMMIT');

      info('AI annotation edited and approved', { annotationId, approvedAnnotationId, userId });

      res.json({
        message: 'Annotation edited and approved successfully',
        annotationId,
        approvedAnnotationId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      logError('Error editing annotation', err as Error);
      res.status(500).json({ error: 'Failed to edit annotation' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/ai/annotations/batch/approve
 * Bulk approve multiple annotation jobs
 *
 * @auth Admin only
 *
 * Request body:
 * {
 *   "jobIds": ["job_1234567890_abc123", "job_0987654321_xyz789"],
 *   "notes": "Bulk approval of high-confidence annotations"
 * }
 *
 * Response:
 * {
 *   "message": "Batch approval completed",
 *   "approved": 47,
 *   "failed": 3,
 *   "details": [...]
 * }
 */
router.post(
  '/ai/annotations/batch/approve',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  validateBody(BulkApproveSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { jobIds, notes } = req.body;
      const userId = req.user!.userId;

      let approved = 0;
      let failed = 0;
      const details: any[] = [];

      for (const jobId of jobIds) {
        try {
          await client.query('BEGIN');

          // Get all pending items for this job
          const itemsQuery = `
            SELECT
              id, image_id, spanish_term, english_term, bounding_box,
              annotation_type, difficulty_level, pronunciation
            FROM ai_annotation_items
            WHERE job_id = $1 AND status = 'pending'
          `;

          const itemsResult = await client.query(itemsQuery, [jobId]);

          for (const item of itemsResult.rows) {
            // Insert into main annotations table
            const insertQuery = `
              INSERT INTO annotations (
                image_id, bounding_box, annotation_type,
                spanish_term, english_term, pronunciation, difficulty_level
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
              item.image_id,
              item.bounding_box,
              item.annotation_type,
              item.spanish_term,
              item.english_term,
              item.pronunciation,
              item.difficulty_level
            ]);

            // Update item status
            await client.query(
              `UPDATE ai_annotation_items
               SET status = 'approved', approved_annotation_id = $1
               WHERE id = $2`,
              [insertResult.rows[0].id, item.id]
            );

            approved++;
          }

          // Update job status
          await client.query(
            `UPDATE ai_annotations
             SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
             WHERE job_id = $2`,
            [userId, jobId]
          );

          // Record review action
          await client.query(
            `INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items, notes)
             VALUES ($1, $2, 'bulk_approve', $3, $4)`,
            [jobId, userId, itemsResult.rows.length, notes]
          );

          await client.query('COMMIT');

          details.push({
            jobId,
            status: 'success',
            itemsApproved: itemsResult.rows.length
          });

        } catch (err) {
          await client.query('ROLLBACK');
          failed++;
          details.push({
            jobId,
            status: 'error',
            error: (err as Error).message
          });
        }
      }

      info('Batch approval completed', { approved, failed, userId });

      res.json({
        message: 'Batch approval completed',
        approved,
        failed,
        details
      });

    } catch (err) {
      logError('Error in batch approval', err as Error);
      res.status(500).json({ error: 'Batch approval failed' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/ai/annotations/stats
 * Get review statistics
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "total": 150,
 *   "pending": 42,
 *   "approved": 95,
 *   "rejected": 13,
 *   "avgConfidence": 0.87,
 *   "recentActivity": [...]
 * }
 */
router.get(
  '/ai/annotations/stats',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    info('📊 Stats endpoint handler EXECUTING', {
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl,
      user: (req as any).user?.id
    });

    try {
      info('📊 Inside try block - about to query database');
      // Get counts by status from ai_annotation_items (not ai_annotations jobs table)
      const countsQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM ai_annotation_items
        GROUP BY status
      `;

      info('📊 Executing counts query');
      const countsResult = await pool.query(countsQuery);
      info('📊 Counts query result', { rows: countsResult.rows.length });

      const stats: any = {
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

      // Get average confidence from ai_annotation_items
      const confidenceQuery = `
        SELECT AVG(confidence) as avg_confidence
        FROM ai_annotation_items
        WHERE confidence IS NOT NULL
      `;

      info('📊 Executing confidence query');
      const confidenceResult = await pool.query(confidenceQuery);

      // Handle null result when no data exists
      const avgConfidence = confidenceResult.rows[0]?.avg_confidence;
      stats.avgConfidence = avgConfidence ? parseFloat(avgConfidence).toFixed(2) : '0.00';
      info('📊 Confidence query result', { avgConfidence: stats.avgConfidence });

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

      info('📊 Executing activity query');
      const activityResult = await pool.query(activityQuery);
      stats.recentActivity = activityResult.rows;
      info('📊 Activity query result', { rows: activityResult.rows.length });

      // Wrap in data property to match frontend expectation
      info('📊 Sending stats response', { stats });
      res.json({ data: stats });

    } catch (err) {
      logError('Error fetching annotation stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

/**
 * GET /api/annotations/analytics
 * Get comprehensive analytics for annotation review workflow
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "overview": {
 *     "total": 68,
 *     "pending": 68,
 *     "approved": 0,
 *     "rejected": 0,
 *     "avgConfidence": 0.87
 *   },
 *   "bySpecies": { "Mallard Duck": 12, ... },
 *   "byType": { "anatomical": 45, "behavioral": 12, ... },
 *   "rejectionsByCategory": { "TOO_SMALL": 5, "NOT_REPRESENTATIVE": 3, ... },
 *   "qualityFlags": {
 *     "tooSmall": 8,
 *     "lowConfidence": 3
 *   }
 * }
 */
router.get(
  '/ai/annotations/analytics',
  authenticateSupabaseToken,
  requireSupabaseAdmin,
  async (req: Request, res: Response): Promise<void> => {
    info('📈 Analytics endpoint called', {
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

      // BY SPECIES: Count annotations per species
      const speciesQuery = `
        SELECT
          i.common_name as species,
          COUNT(ai.id) as count
        FROM ai_annotation_items ai
        JOIN images img ON ai.image_id = img.id
        JOIN species i ON img.species_id = i.id
        WHERE ai.status = 'pending'
        GROUP BY i.common_name
        ORDER BY count DESC
      `;
      const speciesResult = await pool.query(speciesQuery);
      const bySpecies: Record<string, number> = {};
      for (const row of speciesResult.rows) {
        bySpecies[row.species] = parseInt(row.count);
      }

      // BY TYPE: Count annotations by type (anatomical, behavioral, etc.)
      const typeQuery = `
        SELECT
          annotation_type as type,
          COUNT(*) as count
        FROM ai_annotation_items
        WHERE status = 'pending'
        GROUP BY annotation_type
        ORDER BY count DESC
      `;
      const typeResult = await pool.query(typeQuery);
      const byType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        byType[row.type] = parseInt(row.count);
      }

      // REJECTIONS BY CATEGORY: Parse category from notes field
      const rejectionsQuery = `
        SELECT notes
        FROM ai_annotation_reviews
        WHERE action = 'reject' AND notes IS NOT NULL
      `;
      const rejectionsResult = await pool.query(rejectionsQuery);
      const rejectionsByCategory: Record<string, number> = {};

      for (const row of rejectionsResult.rows) {
        // Extract category from "[CATEGORY] notes" format
        const match = row.notes?.match(/^\[([A-Z_]+)\]/);
        if (match) {
          const category = match[1];
          rejectionsByCategory[category] = (rejectionsByCategory[category] || 0) + 1;
        }
      }

      // QUALITY FLAGS: Calculate programmatically from pending annotations
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

        // Check if bounding box is too small (<2% of image)
        const area = (bbox.width || 0) * (bbox.height || 0);
        if (area < 0.02) {
          tooSmallCount++;
        }

        // Check if confidence is too low (<70%)
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
