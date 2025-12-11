/**
 * AI Annotation Batch Operations Routes
 * Handles bulk approval and batch processing of AI annotations
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../database/connection';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../middleware/optionalSupabaseAuth';
import { validateBody } from '../../middleware/validate';
import { error as logError, info } from '../../utils/logger';
import { BulkApproveSchema } from './helpers';

const router = Router();

/**
 * POST /api/ai/annotations/batch/approve
 * Bulk approve multiple annotation jobs
 */
router.post(
  '/approve',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateBody(BulkApproveSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { jobIds, notes } = req.body;
      const userId = req.user!.userId;

      let approved = 0;
      let failed = 0;
      const details: Array<{ jobId: string; status: string; error?: string }> = [];

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
            status: 'success'
          } as any);

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

export default router;
