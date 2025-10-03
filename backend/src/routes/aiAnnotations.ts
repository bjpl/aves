/**
 * AI Annotations Routes
 * Handles AI-powered annotation generation and review workflow
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../database/connection';
import { visionAIService, AIAnnotation } from '../services/VisionAIService';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validateBody, validateParams } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';

const router = Router();

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
  reason: z.string().min(1).max(500)
});

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
  authenticateToken,
  requireAdmin,
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

      // Start async annotation generation (fire and forget)
      // In production, this should use a job queue like Bull or BullMQ
      (async () => {
        try {
          const annotations = await visionAIService.generateAnnotations(imageUrl, imageId);

          // Calculate overall confidence
          const avgConfidence = annotations.reduce((sum, a) => sum + (a.confidence || 0), 0) / annotations.length;

          // Update job with results
          await pool.query(
            `UPDATE ai_annotations
             SET annotation_data = $1, status = $2, confidence_score = $3, updated_at = CURRENT_TIMESTAMP
             WHERE job_id = $4`,
            [JSON.stringify(annotations), 'pending', avgConfidence.toFixed(2), jobId]
          );

          // Insert individual annotation items
          for (const annotation of annotations) {
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
          }

          info('AI annotation generation completed', { jobId, annotationCount: annotations.length });

        } catch (error) {
          logError('AI annotation generation failed', error as Error);

          // Update job status to failed
          await pool.query(
            `UPDATE ai_annotations
             SET status = $1, annotation_data = $2, updated_at = CURRENT_TIMESTAMP
             WHERE job_id = $3`,
            ['failed', JSON.stringify({ error: (error as Error).message }), jobId]
          );
        }
      })();

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
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status || 'pending';

      // Get total count
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM ai_annotations WHERE status = $1',
        [status]
      );
      const total = parseInt(countResult.rows[0].total);

      // Get annotations
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
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [status, limit, offset]);

      const annotations = result.rows.map(row => ({
        ...row,
        annotationData: JSON.parse(row.annotationData)
      }));

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
  authenticateToken,
  requireAdmin,
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
        annotationData: JSON.parse(result.rows[0].annotationData)
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
        boundingBox: JSON.parse(row.boundingBox)
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
  authenticateToken,
  requireAdmin,
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
  authenticateToken,
  requireAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(RejectAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const { reason } = req.body;
      const userId = req.user!.userId;

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

      // Record review action
      await client.query(
        `INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items, notes)
         VALUES ($1, $2, 'reject', 1, $3)`,
        [jobId, userId, reason]
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
  authenticateToken,
  requireAdmin,
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
  authenticateToken,
  requireAdmin,
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
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Get counts by status
      const countsQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM ai_annotations
        GROUP BY status
      `;

      const countsResult = await pool.query(countsQuery);

      const stats: any = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        processing: 0,
        failed: 0
      };

      for (const row of countsResult.rows) {
        stats[row.status] = parseInt(row.count);
        stats.total += parseInt(row.count);
      }

      // Get average confidence
      const confidenceQuery = `
        SELECT AVG(confidence_score) as avg_confidence
        FROM ai_annotations
        WHERE confidence_score IS NOT NULL
      `;

      const confidenceResult = await pool.query(confidenceQuery);
      stats.avgConfidence = parseFloat(confidenceResult.rows[0].avg_confidence || '0').toFixed(2);

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
      stats.recentActivity = activityResult.rows;

      res.json(stats);

    } catch (err) {
      logError('Error fetching annotation stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

export default router;
