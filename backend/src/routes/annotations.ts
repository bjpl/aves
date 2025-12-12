import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { error as logError } from '../utils/logger';

const router = Router();

const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1)
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

/**
 * @openapi
 * /api/annotations:
 *   get:
 *     tags:
 *       - Annotations
 *     summary: List all annotations
 *     description: Retrieve all visible annotations, optionally filtered by image ID
 *     parameters:
 *       - name: imageId
 *         in: query
 *         required: false
 *         description: Filter annotations by image ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Annotations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Annotation'
 *             example:
 *               data:
 *                 - id: 550e8400-e29b-41d4-a716-446655440000
 *                   imageId: 650e8400-e29b-41d4-a716-446655440001
 *                   boundingBox:
 *                     x: 0.25
 *                     y: 0.3
 *                     width: 0.4
 *                     height: 0.35
 *                   type: anatomical
 *                   spanishTerm: pico
 *                   englishTerm: beak
 *                   pronunciation: PEE-koh
 *                   difficultyLevel: 1
 *                   isVisible: true
 *                   createdAt: 2025-01-15T10:30:00Z
 *       500:
 *         description: Server error
 */
router.get('/annotations', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.query;

    // Join with images table to get imageUrl for each annotation
    let query = `
      SELECT
        a.id,
        a.image_id as "imageId",
        a.bounding_box as "boundingBox",
        a.annotation_type as "type",
        a.spanish_term as "spanishTerm",
        a.english_term as "englishTerm",
        a.pronunciation,
        a.difficulty_level as "difficultyLevel",
        a.is_visible as "isVisible",
        a.created_at as "createdAt",
        a.updated_at as "updatedAt",
        COALESCE(i.url, i.thumbnail_url) as "imageUrl"
      FROM annotations a
      LEFT JOIN images i ON a.image_id = i.id
      WHERE a.is_visible = true
    `;

    const values: string[] = [];

    if (imageId && typeof imageId === 'string') {
      query += ' AND a.image_id = $1';
      values.push(imageId);
    }

    query += ' ORDER BY a.created_at ASC';

    const result = await pool.query(query, values);

    const annotations = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      boundingBox: typeof row.boundingBox === 'string'
        ? JSON.parse(row.boundingBox)
        : row.boundingBox
    }));

    res.json({ data: annotations });
  } catch (err) {
    const error = err as Error;
    logError('Error fetching annotations', error, {
      message: error.message,
      stack: error.stack?.slice(0, 200)
    });
    res.status(500).json({ error: 'Failed to fetch annotations', details: error.message });
  }
});

/**
 * @openapi
 * /api/annotations/{imageId}:
 *   get:
 *     tags:
 *       - Annotations
 *     summary: Get annotations for a specific image
 *     description: Retrieve all visible annotations associated with a specific image
 *     parameters:
 *       - name: imageId
 *         in: path
 *         required: true
 *         description: Image ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Image annotations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 annotations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Annotation'
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/annotations:
 *   post:
 *     tags:
 *       - Annotations
 *     summary: Create a new annotation
 *     description: Add a new annotation to an image with bounding box, terms, and metadata
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageId
 *               - boundingBox
 *               - type
 *               - spanishTerm
 *               - englishTerm
 *               - difficultyLevel
 *             properties:
 *               imageId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the image to annotate
 *               boundingBox:
 *                 type: object
 *                 required:
 *                   - x
 *                   - y
 *                   - width
 *                   - height
 *                 properties:
 *                   x:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Normalized X coordinate (0-1)
 *                   y:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Normalized Y coordinate (0-1)
 *                   width:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Normalized width (0-1)
 *                   height:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Normalized height (0-1)
 *               type:
 *                 type: string
 *                 enum: [anatomical, behavioral, color, pattern]
 *                 description: Type of annotation
 *               spanishTerm:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Spanish vocabulary term
 *               englishTerm:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: English vocabulary term
 *               pronunciation:
 *                 type: string
 *                 description: Pronunciation guide (optional)
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Difficulty level (1=beginner, 5=advanced)
 *             example:
 *               imageId: 650e8400-e29b-41d4-a716-446655440001
 *               boundingBox:
 *                 x: 0.25
 *                 y: 0.3
 *                 width: 0.4
 *                 height: 0.35
 *               type: anatomical
 *               spanishTerm: pico
 *               englishTerm: beak
 *               pronunciation: PEE-koh
 *               difficultyLevel: 1
 *     responses:
 *       201:
 *         description: Annotation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 annotation:
 *                   $ref: '#/components/schemas/Annotation'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/annotations/{id}:
 *   put:
 *     tags:
 *       - Annotations
 *     summary: Update an annotation
 *     description: Update an existing annotation's properties (partial updates supported)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Annotation ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boundingBox:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *               annotationType:
 *                 type: string
 *                 enum: [anatomical, behavioral, color, pattern]
 *               spanishTerm:
 *                 type: string
 *               englishTerm:
 *                 type: string
 *               pronunciation:
 *                 type: string
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               isVisible:
 *                 type: boolean
 *             example:
 *               spanishTerm: plumaje
 *               englishTerm: plumage
 *               difficultyLevel: 2
 *     responses:
 *       200:
 *         description: Annotation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 annotation:
 *                   $ref: '#/components/schemas/Annotation'
 *       400:
 *         description: No valid fields to update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Annotation not found
 *       500:
 *         description: Server error
 */
router.put('/annotations/:id', async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({ error: 'No valid fields to update' });
      return;
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
      res.status(404).json({ error: 'Annotation not found' });
      return;
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

/**
 * @openapi
 * /api/annotations/{id}:
 *   delete:
 *     tags:
 *       - Annotations
 *     summary: Delete an annotation
 *     description: Permanently delete an annotation from the database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Annotation ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Annotation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Annotation deleted successfully
 *                 id:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Annotation not found
 *       500:
 *         description: Server error
 */
router.delete('/annotations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM annotations WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }

    res.json({ message: 'Annotation deleted successfully', id });
  } catch (err) {
    logError('Error deleting annotation', err as Error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

/**
 * @openapi
 * /api/annotations/{id}/interaction:
 *   post:
 *     tags:
 *       - Annotations
 *     summary: Record an annotation interaction
 *     description: Track user interactions with annotations for analytics (hover, click, reveal)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Annotation ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interactionType
 *               - revealed
 *             properties:
 *               interactionType:
 *                 type: string
 *                 enum: [hover, click, reveal]
 *                 description: Type of interaction
 *               revealed:
 *                 type: boolean
 *                 description: Whether the annotation was revealed to the user
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (optional, for tracking authenticated users)
 *             example:
 *               interactionType: click
 *               revealed: true
 *               userId: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       201:
 *         description: Interaction recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 interactionId:
 *                   type: string
 *                   format: uuid
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               message: Interaction recorded
 *               interactionId: 750e8400-e29b-41d4-a716-446655440002
 *               timestamp: 2025-01-15T10:35:00Z
 *       500:
 *         description: Server error
 */
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