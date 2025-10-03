import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { Annotation, AnnotationType } from '../../../shared/types/annotation.types';
import { error as logError } from '../utils/logger';

const router = Router();

const BoundingBoxSchema = z.object({
  topLeft: z.object({ x: z.number(), y: z.number() }),
  bottomRight: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number()
});

const CreateAnnotationSchema = z.object({
  imageId: z.string().uuid(),
  boundingBox: BoundingBoxSchema,
  type: z.enum(['anatomical', 'behavioral', 'color', 'pattern']),
  spanishTerm: z.string().min(1).max(200),
  englishTerm: z.string().min(1).max(200),
  pronunciation: z.string().optional(),
  difficultyLevel: z.number().int().min(1).max(5)
});

// GET /api/annotations/:imageId
router.get('/annotations/:imageId', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    const query = `
      SELECT
        id,
        image_id as "imageId",
        bounding_box as "boundingBox",
        annotation_type as "type",
        spanish_term as "spanishTerm",
        english_term as "englishTerm",
        pronunciation,
        difficulty_level as "difficultyLevel",
        is_visible as "isVisible",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM annotations
      WHERE image_id = $1 AND is_visible = true
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [imageId]);

    const annotations = result.rows.map(row => ({
      ...row,
      boundingBox: JSON.parse(row.boundingBox)
    }));

    res.json({ annotations });
  } catch (err) {
    logError('Error fetching annotations', err as Error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// POST /api/annotations
router.post('/annotations', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateAnnotationSchema.parse(req.body);

    const query = `
      INSERT INTO annotations (
        image_id,
        bounding_box,
        annotation_type,
        spanish_term,
        english_term,
        pronunciation,
        difficulty_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        image_id as "imageId",
        bounding_box as "boundingBox",
        annotation_type as "type",
        spanish_term as "spanishTerm",
        english_term as "englishTerm",
        pronunciation,
        difficulty_level as "difficultyLevel",
        is_visible as "isVisible",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      validatedData.imageId,
      JSON.stringify(validatedData.boundingBox),
      validatedData.type,
      validatedData.spanishTerm,
      validatedData.englishTerm,
      validatedData.pronunciation || null,
      validatedData.difficultyLevel
    ];

    const result = await pool.query(query, values);
    const annotation = {
      ...result.rows[0],
      boundingBox: JSON.parse(result.rows[0].boundingBox)
    };

    res.status(201).json({ annotation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid data', details: err.errors });
    } else {
      logError('Error creating annotation', err as Error);
      res.status(500).json({ error: 'Failed to create annotation' });
    }
  }
});

// PUT /api/annotations/:id
router.put('/annotations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'bounding_box',
      'annotation_type',
      'spanish_term',
      'english_term',
      'pronunciation',
      'difficulty_level',
      'is_visible'
    ];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        setClause.push(`${dbField} = $${paramCount}`);
        values.push(key === 'boundingBox' ? JSON.stringify(value) : value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const query = `
      UPDATE annotations
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING
        id,
        image_id as "imageId",
        bounding_box as "boundingBox",
        annotation_type as "type",
        spanish_term as "spanishTerm",
        english_term as "englishTerm",
        pronunciation,
        difficulty_level as "difficultyLevel",
        is_visible as "isVisible",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    const annotation = {
      ...result.rows[0],
      boundingBox: JSON.parse(result.rows[0].boundingBox)
    };

    res.json({ annotation });
  } catch (err) {
    logError('Error updating annotation', err as Error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// DELETE /api/annotations/:id
router.delete('/annotations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM annotations WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.json({ message: 'Annotation deleted successfully', id });
  } catch (err) {
    logError('Error deleting annotation', err as Error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

// POST /api/annotations/:id/interaction
router.post('/annotations/:id/interaction', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { interactionType, revealed, userId } = req.body;

    const query = `
      INSERT INTO annotation_interactions (
        annotation_id,
        user_id,
        interaction_type,
        revealed
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, timestamp
    `;

    const values = [id, userId || null, interactionType, revealed];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Interaction recorded',
      interactionId: result.rows[0].id,
      timestamp: result.rows[0].timestamp
    });
  } catch (err) {
    logError('Error recording interaction', err as Error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

export default router;