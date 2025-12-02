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
        COALESCE(s.primary_colors, '{}') as "primaryColors",
        COALESCE(s.habitats, '{}') as "habitats",
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

    // Return data in standard API response format for frontend compatibility
    res.json({
      data: result.rows
    });
  } catch (err) {
    logError('Error fetching species', err as Error);
    res.status(500).json({ error: 'Failed to fetch species' });
  }
});

/**
 * @openapi
 * /api/species/{id}/image:
 *   get:
 *     tags:
 *       - Species
 *     summary: Get primary image for a species
 *     description: Retrieve the primary image URL for a specific bird species (highest annotation count)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Species ID
 *         schema:
 *           type: integer
 *     responses:
 *       302:
 *         description: Redirect to image URL
 *       404:
 *         description: No image found for species
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.get('/species/:id/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get the first image for this species with highest annotation count
    const query = `
      SELECT url, thumbnail_url
      FROM images
      WHERE species_id = $1
      ORDER BY annotation_count DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No image found for this species' });
      return;
    }

    const image = result.rows[0];
    const imageUrl = image.url || image.thumbnail_url;

    // If URL is external, redirect
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      res.redirect(imageUrl);
      return;
    }

    // If it's a local path, serve the file
    res.status(404).json({ error: 'Image URL not available' });
  } catch (err) {
    logError('Error fetching species image', err as Error);
    res.status(500).json({ error: 'Failed to fetch species image' });
  }
});

/**
 * @openapi
 * /api/species/{id}:
 *   get:
 *     tags:
 *       - Species
 *     summary: Get species details by ID
 *     description: Retrieve detailed information about a specific bird species including images and annotations
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Species ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Species details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Species'
 *                 - type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           url:
 *                             type: string
 *                           thumbnailUrl:
 *                             type: string
 *                           annotationCount:
 *                             type: integer
 *       404:
 *         description: Species not found
 *       500:
 *         description: Server error
 */
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
        COALESCE(s.primary_colors, '{}') as "primaryColors",
        COALESCE(s.habitats, '{}') as "habitats",
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

/**
 * @openapi
 * /api/species/search:
 *   get:
 *     tags:
 *       - Species
 *     summary: Search for bird species
 *     description: Search species by Spanish name, English name, or scientific name (case-insensitive, partial match)
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query string
 *         schema:
 *           type: string
 *         example: mallard
 *     responses:
 *       200:
 *         description: Search results (limited to 20 results)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Species'
 *             example:
 *               results:
 *                 - id: 1
 *                   scientificName: Anas platyrhynchos
 *                   spanishName: Ánade Real
 *                   englishName: Mallard
 *                   orderName: Anseriformes
 *                   familyName: Anatidae
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/species/stats:
 *   get:
 *     tags:
 *       - Species
 *     summary: Get species statistics
 *     description: Retrieve aggregated statistics about species, including totals and breakdowns by order, habitat, and size
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSpecies:
 *                   type: integer
 *                   description: Total number of species in database
 *                 totalImages:
 *                   type: integer
 *                   description: Total number of images
 *                 totalAnnotations:
 *                   type: integer
 *                   description: Total number of annotations
 *                 byOrder:
 *                   type: object
 *                   description: Species count grouped by taxonomic order
 *                   additionalProperties:
 *                     type: integer
 *                 byHabitat:
 *                   type: object
 *                   description: Species count grouped by habitat type
 *                   additionalProperties:
 *                     type: integer
 *                 bySize:
 *                   type: object
 *                   description: Species count grouped by size category
 *                   additionalProperties:
 *                     type: integer
 *             example:
 *               totalSpecies: 150
 *               totalImages: 450
 *               totalAnnotations: 1200
 *               byOrder:
 *                 Anseriformes: 12
 *                 Passeriformes: 45
 *               byHabitat:
 *                 wetland: 30
 *                 forest: 55
 *               bySize:
 *                 small: 60
 *                 medium: 50
 *                 large: 40
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/species:
 *   post:
 *     tags:
 *       - Species
 *     summary: Create a new bird species
 *     description: Add a new bird species to the database (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scientificName
 *               - spanishName
 *               - englishName
 *               - orderName
 *               - familyName
 *             properties:
 *               scientificName:
 *                 type: string
 *                 example: Anas platyrhynchos
 *               spanishName:
 *                 type: string
 *                 example: Ánade Real
 *               englishName:
 *                 type: string
 *                 example: Mallard
 *               orderName:
 *                 type: string
 *                 example: Anseriformes
 *               familyName:
 *                 type: string
 *                 example: Anatidae
 *               genus:
 *                 type: string
 *                 example: Anas
 *               sizeCategory:
 *                 type: string
 *                 enum: [small, medium, large]
 *               primaryColors:
 *                 type: array
 *                 items:
 *                   type: string
 *               habitats:
 *                 type: array
 *                 items:
 *                   type: string
 *               conservationStatus:
 *                 type: string
 *                 enum: [LC, NT, VU, EN, CR, EW, EX]
 *               descriptionSpanish:
 *                 type: string
 *               descriptionEnglish:
 *                 type: string
 *               funFact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Species created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 species:
 *                   $ref: '#/components/schemas/Species'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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