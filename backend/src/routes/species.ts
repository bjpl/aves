import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { error as logError } from '../utils/logger';

const router = Router();

/**
 * @openapi
 * /api/species:
 *   get:
 *     tags:
 *       - Species
 *     summary: List all bird species
 *     description: Retrieve a complete list of bird species with annotation counts
 *     responses:
 *       200:
 *         description: List of species retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 species:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Species'
 *                       - type: object
 *                         properties:
 *                           annotationCount:
 *                             type: integer
 *                             description: Number of annotations for this species
 *             example:
 *               species:
 *                 - id: 1
 *                   scientificName: Anas platyrhynchos
 *                   spanishName: Ánade Real
 *                   englishName: Mallard
 *                   orderName: Anseriformes
 *                   familyName: Anatidae
 *                   annotationCount: 42
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/species', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        s.id,
        s.scientific_name as "scientificName",
        s.spanish_name as "spanishName",
        s.english_name as "englishName",
        s.order_name as "orderName",
        s.family_name as "familyName",
        s.genus,
        s.size_category as "sizeCategory",
        s.primary_colors as "primaryColors",
        s.habitats,
        s.conservation_status as "conservationStatus",
        s.description_spanish as "descriptionSpanish",
        s.description_english as "descriptionEnglish",
        s.fun_fact as "funFact",
        COUNT(DISTINCT i.id) as "annotationCount"
      FROM species s
      LEFT JOIN images i ON i.species_id = s.id
      GROUP BY s.id
      ORDER BY s.spanish_name ASC
    `;

    const result = await pool.query(query);

    res.json({
      species: result.rows
    });
  } catch (err) {
    logError('Error fetching species', err as Error);
    res.status(500).json({ error: 'Failed to fetch species' });
  }
});

// GET /api/species/:id
router.get('/species/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const speciesQuery = `
      SELECT
        s.id,
        s.scientific_name as "scientificName",
        s.spanish_name as "spanishName",
        s.english_name as "englishName",
        s.order_name as "orderName",
        s.family_name as "familyName",
        s.genus,
        s.size_category as "sizeCategory",
        s.primary_colors as "primaryColors",
        s.habitats,
        s.conservation_status as "conservationStatus",
        s.description_spanish as "descriptionSpanish",
        s.description_english as "descriptionEnglish",
        s.fun_fact as "funFact"
      FROM species s
      WHERE s.id = $1
    `;

    const speciesResult = await pool.query(speciesQuery, [id]);

    if (speciesResult.rows.length === 0) {
      res.status(404).json({ error: 'Species not found' });
      return;
    }

    // Get associated images and annotations
    const imagesQuery = `
      SELECT
        i.id,
        i.url,
        i.thumbnail_url as "thumbnailUrl",
        COUNT(a.id) as "annotationCount"
      FROM images i
      LEFT JOIN annotations a ON a.image_id = i.id
      WHERE i.species_id = $1
      GROUP BY i.id
    `;

    const imagesResult = await pool.query(imagesQuery, [id]);

    res.json({
      ...speciesResult.rows[0],
      images: imagesResult.rows
    });
  } catch (err) {
    logError('Error fetching species details', err as Error);
    res.status(500).json({ error: 'Failed to fetch species details' });
  }
});

// GET /api/species/search
router.get('/species/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.json({ results: [] });
      return;
    }

    const searchTerm = `%${q.toLowerCase()}%`;

    const query = `
      SELECT
        s.id,
        s.scientific_name as "scientificName",
        s.spanish_name as "spanishName",
        s.english_name as "englishName",
        s.order_name as "orderName",
        s.family_name as "familyName",
        s.size_category as "sizeCategory"
      FROM species s
      WHERE
        LOWER(s.spanish_name) LIKE $1 OR
        LOWER(s.english_name) LIKE $1 OR
        LOWER(s.scientific_name) LIKE $1
      ORDER BY
        CASE
          WHEN LOWER(s.spanish_name) LIKE $1 THEN 1
          WHEN LOWER(s.english_name) LIKE $1 THEN 2
          ELSE 3
        END,
        s.spanish_name
      LIMIT 20
    `;

    const result = await pool.query(query, [searchTerm]);

    res.json({
      results: result.rows
    });
  } catch (err) {
    logError('Error searching species', err as Error);
    res.status(500).json({ error: 'Failed to search species' });
  }
});

// GET /api/species/stats
router.get('/species/stats', async (_req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(DISTINCT s.id) as "totalSpecies",
        COUNT(DISTINCT i.id) as "totalImages",
        COUNT(DISTINCT a.id) as "totalAnnotations"
      FROM species s
      LEFT JOIN images i ON i.species_id = s.id
      LEFT JOIN annotations a ON a.image_id = i.id
    `;

    const statsResult = await pool.query(statsQuery);

    const byOrderQuery = `
      SELECT order_name, COUNT(*) as count
      FROM species
      GROUP BY order_name
      ORDER BY count DESC
    `;

    const byOrderResult = await pool.query(byOrderQuery);

    const byHabitatQuery = `
      SELECT habitat, COUNT(*) as count
      FROM species, unnest(habitats) as habitat
      GROUP BY habitat
      ORDER BY count DESC
    `;

    const byHabitatResult = await pool.query(byHabitatQuery);

    const bySizeQuery = `
      SELECT size_category, COUNT(*) as count
      FROM species
      WHERE size_category IS NOT NULL
      GROUP BY size_category
    `;

    const bySizeResult = await pool.query(bySizeQuery);

    res.json({
      ...statsResult.rows[0],
      byOrder: byOrderResult.rows.reduce((acc, row) => ({
        ...acc,
        [row.order_name]: parseInt(row.count)
      }), {}),
      byHabitat: byHabitatResult.rows.reduce((acc, row) => ({
        ...acc,
        [row.habitat]: parseInt(row.count)
      }), {}),
      bySize: bySizeResult.rows.reduce((acc, row) => ({
        ...acc,
        [row.size_category]: parseInt(row.count)
      }), {})
    });
  } catch (err) {
    logError('Error fetching species stats', err as Error);
    res.status(500).json({ error: 'Failed to fetch species statistics' });
  }
});

// POST /api/species
router.post('/species', async (req: Request, res: Response) => {
  try {
    const {
      scientificName,
      spanishName,
      englishName,
      orderName,
      familyName,
      genus,
      sizeCategory,
      primaryColors,
      habitats,
      conservationStatus,
      descriptionSpanish,
      descriptionEnglish,
      funFact
    } = req.body;

    const query = `
      INSERT INTO species (
        scientific_name, spanish_name, english_name,
        order_name, family_name, genus,
        size_category, primary_colors, habitats,
        conservation_status, description_spanish, description_english,
        fun_fact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      scientificName,
      spanishName,
      englishName,
      orderName,
      familyName,
      genus,
      sizeCategory,
      primaryColors,
      habitats,
      conservationStatus,
      descriptionSpanish,
      descriptionEnglish,
      funFact
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      species: result.rows[0]
    });
  } catch (err) {
    logError('Error creating species', err as Error);
    res.status(500).json({ error: 'Failed to create species' });
  }
});

export default router;