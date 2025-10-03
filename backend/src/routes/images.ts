import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { error as logError } from '../utils/logger';

const router = Router();

// GET /api/images/search
router.post('/images/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    // Check rate limit
    const rateLimitQuery = `
      SELECT requests_made, requests_limit, reset_time
      FROM api_rate_limits
      WHERE api_name = 'unsplash'
    `;
    const rateLimit = await pool.query(rateLimitQuery);

    if (rateLimit.rows.length > 0) {
      const { requests_made, requests_limit, reset_time } = rateLimit.rows[0];

      // Check if we need to reset
      if (new Date() > new Date(reset_time)) {
        await pool.query(`
          UPDATE api_rate_limits
          SET requests_made = 0, reset_time = CURRENT_TIMESTAMP + INTERVAL '1 hour'
          WHERE api_name = 'unsplash'
        `);
      } else if (requests_made >= requests_limit) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: reset_time
        });
        return;
      }
    }

    // Increment rate limit counter
    await pool.query(`
      UPDATE api_rate_limits
      SET requests_made = requests_made + 1, last_request_at = CURRENT_TIMESTAMP
      WHERE api_name = 'unsplash'
    `);

    // In production, this would call actual Unsplash API
    // For now, return mock data
    const mockResults = {
      query,
      results: [],
      total: 0
    };

    res.json(mockResults);
  } catch (err) {
    logError('Error searching images', err as Error);
    res.status(500).json({ error: 'Failed to search images' });
  }
});

// POST /api/images/import
router.post('/images/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { speciesId, imageUrl, sourceType, sourceId, photographer } = req.body;

    // Check if already imported
    const existingQuery = `
      SELECT id FROM image_sources
      WHERE species_id = $1 AND source_id = $2
    `;
    const existing = await pool.query(existingQuery, [speciesId, sourceId]);

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Image already imported' });
      return;
    }

    // Process and save image
    const imageData = await processImage(imageUrl);

    const insertQuery = `
      INSERT INTO image_sources (
        species_id, source_type, source_id, original_url,
        local_path, thumbnail_path, width, height,
        photographer_name, photographer_url, downloaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      speciesId,
      sourceType,
      sourceId,
      imageUrl,
      imageData.localPath,
      imageData.thumbnailPath,
      imageData.width,
      imageData.height,
      photographer?.name,
      photographer?.url
    ];

    const result = await pool.query(insertQuery, values);

    res.json({
      image: result.rows[0]
    });
  } catch (err) {
    logError('Error importing image', err as Error);
    res.status(500).json({ error: 'Failed to import image' });
  }
});

// POST /api/images/generate-prompts
router.post('/images/generate-prompts', async (_req: Request, res: Response) => {
  try {
    // Find species without sufficient images
    const query = `
      SELECT
        s.id,
        s.english_name,
        s.spanish_name,
        s.primary_colors,
        s.habitats,
        s.size_category,
        COUNT(i.id) as image_count
      FROM species s
      LEFT JOIN image_sources i ON i.species_id = s.id
      GROUP BY s.id
      HAVING COUNT(i.id) < 3
      ORDER BY COUNT(i.id) ASC
      LIMIT 10
    `;

    const speciesNeedingImages = await pool.query(query);

    const prompts = [];

    for (const species of speciesNeedingImages.rows) {
      const prompt = generatePrompt(species);

      // Save to prompt queue
      const insertQuery = `
        INSERT INTO prompt_queue (species_id, prompt, prompt_type)
        VALUES ($1, $2, 'midjourney')
        ON CONFLICT (species_id, prompt_type) DO UPDATE
        SET prompt = EXCLUDED.prompt, status = 'pending'
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [species.id, prompt]);
      prompts.push(result.rows[0]);
    }

    res.json({
      generated: prompts.length,
      prompts
    });
  } catch (err) {
    logError('Error generating prompts', err as Error);
    res.status(500).json({ error: 'Failed to generate prompts' });
  }
});

// GET /api/images/prompts
router.get('/images/prompts', async (req: Request, res: Response) => {
  try {
    const { status = 'pending' } = req.query;

    const query = `
      SELECT
        p.*,
        s.english_name,
        s.spanish_name
      FROM prompt_queue p
      JOIN species s ON s.id = p.species_id
      WHERE p.status = $1
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [status]);

    res.json({
      prompts: result.rows
    });
  } catch (err) {
    logError('Error fetching prompts', err as Error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// GET /api/images/stats
router.get('/images/stats', async (_req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(DISTINCT species_id) FROM image_sources) as species_with_images,
        (SELECT COUNT(*) FROM species) as total_species,
        (SELECT COUNT(*) FROM image_sources) as total_images,
        (SELECT COUNT(*) FROM image_sources WHERE source_type = 'unsplash') as unsplash_images,
        (SELECT COUNT(*) FROM prompt_queue WHERE status = 'pending') as pending_prompts
    `;

    const result = await pool.query(statsQuery);

    res.json(result.rows[0]);
  } catch (err) {
    logError('Error fetching image stats', err as Error);
    res.status(500).json({ error: 'Failed to fetch image statistics' });
  }
});

// Helper function to process and save images locally
async function processImage(imageUrl: string) {
  // Create directories if they don't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(thumbnailsDir, { recursive: true });

  // Download image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  // Generate unique filename
  const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
  const imagePath = path.join(imagesDir, filename);
  const thumbnailPath = path.join(thumbnailsDir, filename);

  // Get image metadata
  const metadata = await sharp(buffer).metadata();

  // Save optimized version
  await sharp(buffer)
    .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(imagePath);

  // Create thumbnail
  await sharp(buffer)
    .resize(400, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  return {
    localPath: `/uploads/images/${filename}`,
    thumbnailPath: `/uploads/thumbnails/${filename}`,
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

// Helper function to generate prompts
function generatePrompt(species: any): string {
  const parts = ['professional wildlife photography'];

  parts.push(species.english_name);

  if (species.primary_colors?.length > 0) {
    parts.push(`${species.primary_colors.join(' and ')} plumage`);
  }

  if (species.habitats?.length > 0) {
    parts.push(`in ${species.habitats[0]} habitat`);
  }

  parts.push('sharp focus, natural lighting, high detail, 4k quality');

  return parts.join(', ');
}

export default router;