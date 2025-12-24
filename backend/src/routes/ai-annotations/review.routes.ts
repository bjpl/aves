/**
 * AI Annotation Review Routes
 * Handles approval, rejection, and editing of AI-generated annotations
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../database/connection';
import { reinforcementLearningEngine, extractRejectionCategory } from '../../services/ReinforcementLearningEngine';
import { patternLearner } from '../../services/PatternLearner';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../middleware/optionalSupabaseAuth';
import { validateBody, validateParams } from '../../middleware/validate';
import { error as logError, info } from '../../utils/logger';
import {
  ApproveAnnotationSchema,
  RejectAnnotationSchema,
  EditAnnotationSchema,
  AnnotationIdParamSchema
} from './helpers';

const router = Router();

/**
 * POST /api/ai/annotations/:annotationId/approve
 * Approve a specific AI annotation and move to main annotations table
 */
router.post(
  '/:annotationId/approve',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
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

      // Get species name for reinforcement learning
      let speciesName: string | undefined;
      try {
        const speciesResult = await client.query(
          `SELECT s.english_name
           FROM images i
           JOIN species s ON i.species_id = s.id
           WHERE i.id = $1`,
          [item.image_id]
        );
        if (speciesResult.rows.length > 0) {
          speciesName = speciesResult.rows[0].english_name;
        }
      } catch (speciesError) {
        logError('Failed to fetch species for feedback', speciesError as Error);
      }

      // Capture positive feedback for reinforcement learning
      try {
        await reinforcementLearningEngine.captureFeedback({
          type: 'approve',
          annotationId,
          originalData: item,
          userId: userId,
          metadata: {
            species: speciesName,
            imageId: item.image_id,
            feature: item.spanish_term
          }
        });

        // Learn from approval using pattern learner
        await patternLearner.learnFromAnnotations([{
          spanishTerm: item.spanish_term,
          englishTerm: item.english_term,
          boundingBox: typeof item.bounding_box === 'string' ? JSON.parse(item.bounding_box) : item.bounding_box,
          type: item.annotation_type,
          difficultyLevel: item.difficulty_level,
          pronunciation: item.pronunciation,
          confidence: 0.9
        }], {
          species: speciesName,
          imageCharacteristics: []
        });
      } catch (feedbackError) {
        logError('Failed to capture approval feedback', feedbackError as Error);
      }

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
 */
router.post(
  '/:annotationId/reject',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(RejectAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const { category, notes, reason } = req.body;
      const userId = req.user!.userId;

      const rejectionMessage = category
        ? `[${category}] ${notes || ''}`.trim()
        : (reason || notes || 'No reason provided');

      // Get annotation item and species info
      const itemQuery = `
        SELECT ai.job_id, ai.spanish_term, ai.english_term, ai.bounding_box,
               ai.annotation_type, ai.difficulty_level, ai.pronunciation,
               ai.confidence, ai.image_id,
               s.english_name as species_name
        FROM ai_annotation_items ai
        LEFT JOIN images i ON ai.image_id = i.id
        LEFT JOIN species s ON i.species_id = s.id
        WHERE ai.id = $1
      `;
      const itemResult = await client.query(itemQuery, [annotationId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      const item = itemResult.rows[0];
      const jobId = item.job_id;
      const speciesName = item.species_name;

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
        [jobId, userId, rejectionMessage]
      );

      // Extract rejection category for reinforcement learning
      const rejectionCategory = extractRejectionCategory(rejectionMessage);

      // Capture negative feedback for reinforcement learning
      try {
        await reinforcementLearningEngine.captureFeedback({
          type: 'reject',
          annotationId,
          originalData: item,
          rejectionReason: rejectionCategory,
          userId: userId,
          metadata: {
            species: speciesName,
            imageId: item.image_id,
            feature: item.spanish_term
          }
        });

        // Learn from rejection using pattern learner
        await patternLearner.learnFromRejection({
          spanishTerm: item.spanish_term,
          englishTerm: item.english_term,
          boundingBox: typeof item.bounding_box === 'string' ? JSON.parse(item.bounding_box) : item.bounding_box,
          type: item.annotation_type,
          difficultyLevel: item.difficulty_level,
          pronunciation: item.pronunciation,
          confidence: item.confidence || 0.8
        }, rejectionCategory, {
          species: speciesName,
          imageId: item.image_id
        });
      } catch (feedbackError) {
        logError('Failed to capture rejection feedback', feedbackError as Error);
      }

      await client.query('COMMIT');

      info('AI annotation rejected', { annotationId, userId, reason: rejectionCategory });

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
 */
router.patch(
  '/:annotationId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(EditAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const updates = req.body;

      info('PATCH /ai/annotations - Received update request', {
        annotationId,
        updates,
        hasUser: !!req.user
      });

      // Update ai_annotation_items WITHOUT changing status
      const updateFields: string[] = [];
      const updateValues: (string | number | null)[] = [];
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

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        logError('Annotation not found or already processed', new Error(`ID: ${annotationId}`));
        res.status(404).json({ error: 'Annotation not found or already processed' });
        return;
      }

      await client.query('COMMIT');

      info('PATCH /ai/annotations - Update successful', {
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
 */
router.post(
  '/:annotationId/edit',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(AnnotationIdParamSchema),
  validateBody(EditAnnotationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { annotationId } = req.params;
      const updates = req.body;
      const userId = req.user!.userId;

      // Get the original annotation with species info
      const itemQuery = `
        SELECT
          ai.job_id, ai.image_id, ai.spanish_term, ai.english_term, ai.bounding_box,
          ai.annotation_type, ai.difficulty_level, ai.pronunciation, ai.confidence,
          s.english_name as species_name
        FROM ai_annotation_items ai
        LEFT JOIN images i ON ai.image_id = i.id
        LEFT JOIN species s ON i.species_id = s.id
        WHERE ai.id = $1 AND ai.status = 'pending'
      `;

      const itemResult = await client.query(itemQuery, [annotationId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Annotation not found or already processed' });
        return;
      }

      const original = itemResult.rows[0];
      const speciesName = original.species_name;

      const originalBoundingBox = typeof original.bounding_box === 'string'
        ? JSON.parse(original.bounding_box)
        : original.bounding_box;

      // Merge updates with original values
      const finalData = {
        spanishTerm: updates.spanishTerm || original.spanish_term,
        englishTerm: updates.englishTerm || original.english_term,
        boundingBox: updates.boundingBox ? JSON.stringify(updates.boundingBox) : original.bounding_box,
        type: updates.type || original.annotation_type,
        difficultyLevel: updates.difficultyLevel || original.difficulty_level,
        pronunciation: updates.pronunciation !== undefined ? updates.pronunciation : original.pronunciation
      };

      // Insert into main annotations table
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

      // Capture position correction for reinforcement learning
      if (updates.boundingBox && originalBoundingBox) {
        try {
          const correctedBoundingBox = updates.boundingBox;

          await reinforcementLearningEngine.captureFeedback({
            type: 'position_fix',
            annotationId,
            originalData: {
              ...original,
              bounding_box: originalBoundingBox
            },
            correctedData: {
              ...finalData,
              bounding_box: correctedBoundingBox
            },
            userId: userId,
            metadata: {
              species: speciesName,
              imageId: original.image_id,
              feature: original.spanish_term
            }
          });

          // Learn from correction using pattern learner
          await patternLearner.learnFromCorrection(
            {
              spanishTerm: original.spanish_term,
              englishTerm: original.english_term,
              boundingBox: originalBoundingBox,
              type: original.annotation_type,
              difficultyLevel: original.difficulty_level,
              pronunciation: original.pronunciation,
              confidence: original.confidence || 0.8
            },
            {
              spanishTerm: finalData.spanishTerm,
              englishTerm: finalData.englishTerm,
              boundingBox: correctedBoundingBox,
              type: finalData.type,
              difficultyLevel: finalData.difficultyLevel,
              pronunciation: finalData.pronunciation,
              confidence: 0.95
            },
            {
              species: speciesName,
              imageId: original.image_id,
              reviewerId: userId
            }
          );
        } catch (feedbackError) {
          logError('Failed to capture correction feedback', feedbackError as Error);
        }
      }

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

export default router;
