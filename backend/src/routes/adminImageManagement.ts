/**
 * Admin Image Management Routes
 *
 * CONCEPT: Admin API endpoints for managing image collection and annotation workflows
 * WHY: Provides programmatic access to image collection from Unsplash and batch annotation
 * PATTERN: Async job processing with status tracking, admin authentication required
 *
 * Endpoints:
 * - POST /api/admin/images/collect - Trigger image collection from Unsplash
 * - POST /api/admin/images/annotate - Trigger batch annotation
 * - GET /api/admin/images/jobs/:jobId - Get job status
 * - GET /api/admin/images/stats - Get image/annotation statistics
 * - GET /api/admin/images/sources - List available image sources
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { pool } from '../database/connection';
import { VisionAIService } from '../services/VisionAIService';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../middleware/optionalSupabaseAuth';
import { validateBody, validateParams } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Default bird species for collection
const DEFAULT_BIRD_SPECIES = [
  {
    scientificName: 'Cardinalis cardinalis',
    englishName: 'Northern Cardinal',
    spanishName: 'Cardenal Norteno',
    order: 'Passeriformes',
    family: 'Cardinalidae',
    searchTerms: 'northern cardinal red bird',
    habitats: ['forest', 'urban', 'garden'],
    sizeCategory: 'small',
    primaryColors: ['red', 'black'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Cyanocitta cristata',
    englishName: 'Blue Jay',
    spanishName: 'Arrendajo Azul',
    order: 'Passeriformes',
    family: 'Corvidae',
    searchTerms: 'blue jay bird',
    habitats: ['forest', 'urban'],
    sizeCategory: 'small',
    primaryColors: ['blue', 'white', 'black'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Turdus migratorius',
    englishName: 'American Robin',
    spanishName: 'Petirrojo Americano',
    order: 'Passeriformes',
    family: 'Turdidae',
    searchTerms: 'american robin bird',
    habitats: ['forest', 'urban', 'garden'],
    sizeCategory: 'small',
    primaryColors: ['red', 'brown', 'gray'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Zenaida macroura',
    englishName: 'Mourning Dove',
    spanishName: 'Paloma Huilota',
    order: 'Columbiformes',
    family: 'Columbidae',
    searchTerms: 'mourning dove bird',
    habitats: ['urban', 'grassland'],
    sizeCategory: 'small',
    primaryColors: ['brown', 'gray'],
    conservationStatus: 'LC'
  },
  {
    scientificName: 'Passer domesticus',
    englishName: 'House Sparrow',
    spanishName: 'Gorrion Comun',
    order: 'Passeriformes',
    family: 'Passeridae',
    searchTerms: 'house sparrow bird',
    habitats: ['urban'],
    sizeCategory: 'small',
    primaryColors: ['brown', 'gray'],
    conservationStatus: 'LC'
  }
];

// ============================================================================
// Job Tracking Store (In-Memory)
// ============================================================================

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface JobProgress {
  jobId: string;
  type: 'collect' | 'annotate';
  status: JobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors: Array<{ item: string; error: string; timestamp: string }>;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

const jobStore = new Map<string, JobProgress>();

// Cleanup old jobs after 24 hours
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000;

function cleanupOldJobs(): void {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [jobId, job] of jobStore.entries()) {
    const jobTime = new Date(job.startedAt).getTime();
    if (jobTime < cutoff) {
      jobStore.delete(jobId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldJobs, 60 * 60 * 1000);

// ============================================================================
// Rate Limiting
// ============================================================================

const adminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour for admin operations
  message: { error: 'Too many admin requests. Please try again later.' }
});

// ============================================================================
// Validation Schemas
// ============================================================================

const CollectImagesSchema = z.object({
  species: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(10).optional().default(2)
});

const AnnotateImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional().default(false)
});

const JobIdParamSchema = z.object({
  jobId: z.string().min(1)
});

// ============================================================================
// Helper Functions
// ============================================================================

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  color: string;
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
}

interface ImageRow {
  id: string;
  url: string;
  species_id: string;
  species_name: string;
}

interface SpeciesRow {
  englishName: string;
  scientificName: string;
  spanishName: string;
}

interface ImageBySpeciesRow {
  species: string;
  count: string;
}

/**
 * Search Unsplash for bird images
 */
async function searchUnsplash(query: string, perPage: number = 2): Promise<UnsplashPhoto[]> {
  try {
    info('Searching Unsplash', { query, perPage });

    const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
      params: {
        query,
        per_page: perPage,
        orientation: 'landscape',
        content_filter: 'high',
      },
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    info('Unsplash search successful', { query, resultsCount: response.data.results.length });
    return response.data.results;

  } catch (error) {
    logError('Unsplash search failed', error as Error);
    return [];
  }
}

/**
 * Get Unsplash rate limit status
 */
async function getUnsplashQuotaStatus(): Promise<{
  remaining: number;
  limit: number;
  resetAt: string;
} | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    return null;
  }

  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/me`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      },
      validateStatus: () => true // Accept any status to read headers
    });

    return {
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
      limit: parseInt(response.headers['x-ratelimit-limit'] || '50'),
      resetAt: new Date(Date.now() + 3600000).toISOString() // Unsplash resets hourly
    };
  } catch (error) {
    logError('Failed to get Unsplash quota', error as Error);
    return null;
  }
}

/**
 * Insert species into database
 */
async function insertSpecies(species: typeof DEFAULT_BIRD_SPECIES[0]): Promise<string> {
  const result = await pool.query(
    `INSERT INTO species (
      scientific_name, english_name, spanish_name,
      order_name, family_name, habitats, size_category,
      primary_colors, conservation_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (scientific_name) DO UPDATE SET
      english_name = EXCLUDED.english_name,
      spanish_name = EXCLUDED.spanish_name
    RETURNING id`,
    [
      species.scientificName,
      species.englishName,
      species.spanishName,
      species.order,
      species.family,
      species.habitats,
      species.sizeCategory,
      species.primaryColors,
      species.conservationStatus
    ]
  );

  return result.rows[0].id;
}

/**
 * Insert image metadata into database
 */
async function insertImage(
  speciesId: string,
  photo: UnsplashPhoto,
  speciesName: string
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO images (
      species_id, unsplash_id, url, width, height,
      description, photographer, photographer_username
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (unsplash_id) DO UPDATE SET
      url = EXCLUDED.url
    RETURNING id`,
    [
      speciesId,
      photo.id,
      photo.urls.regular,
      photo.width,
      photo.height,
      photo.description || photo.alt_description || `${speciesName} photograph`,
      photo.user.name,
      photo.user.username
    ]
  );

  return result.rows[0].id;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique job ID
 */
function generateJobId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * POST /api/admin/images/collect
 * Trigger image collection from Unsplash
 *
 * @auth Admin only
 * @rate-limited 30 requests/hour
 *
 * Request body:
 * {
 *   "species": ["Northern Cardinal", "Blue Jay"],  // Optional: filter by species names
 *   "count": 2  // Optional: images per species (1-10, default 2)
 * }
 *
 * Response:
 * {
 *   "jobId": "collect_1234567890_abc123",
 *   "status": "processing",
 *   "message": "Image collection started",
 *   "totalSpecies": 5,
 *   "imagesPerSpecies": 2
 * }
 */
router.post(
  '/admin/images/collect',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  validateBody(CollectImagesSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { species, count } = req.body;

      // Validate Unsplash configuration
      if (!UNSPLASH_ACCESS_KEY) {
        res.status(503).json({
          error: 'Unsplash API not configured',
          message: 'UNSPLASH_ACCESS_KEY environment variable is not set'
        });
        return;
      }

      // Filter species if specified
      let speciesToCollect = DEFAULT_BIRD_SPECIES;
      if (species && species.length > 0) {
        speciesToCollect = DEFAULT_BIRD_SPECIES.filter(s =>
          species.some((name: string) =>
            s.englishName.toLowerCase().includes(name.toLowerCase()) ||
            s.spanishName.toLowerCase().includes(name.toLowerCase()) ||
            s.scientificName.toLowerCase().includes(name.toLowerCase())
          )
        );

        if (speciesToCollect.length === 0) {
          res.status(400).json({
            error: 'No matching species found',
            availableSpecies: DEFAULT_BIRD_SPECIES.map(s => s.englishName)
          });
          return;
        }
      }

      // Generate job ID and initialize tracking
      const jobId = generateJobId('collect');
      const totalItems = speciesToCollect.length * count;

      const jobProgress: JobProgress = {
        jobId,
        type: 'collect',
        status: 'processing',
        totalItems,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: [],
        startedAt: new Date().toISOString(),
        metadata: {
          speciesCount: speciesToCollect.length,
          imagesPerSpecies: count,
          requestedBy: req.user?.userId || 'anonymous'
        }
      };

      jobStore.set(jobId, jobProgress);

      info('Starting image collection job', {
        jobId,
        speciesCount: speciesToCollect.length,
        imagesPerSpecies: count,
        userId: req.user?.userId
      });

      // Start async collection process
      (async () => {
        const job = jobStore.get(jobId)!;

        try {
          for (const speciesData of speciesToCollect) {
            // Check if job was cancelled
            if ((job.status as JobStatus) === 'cancelled') {
              info('Job cancelled', { jobId });
              break;
            }

            try {
              // Insert/update species record
              const speciesId = await insertSpecies(speciesData);

              // Search for images
              const photos = await searchUnsplash(speciesData.searchTerms, count);

              if (photos.length === 0) {
                job.errors.push({
                  item: speciesData.englishName,
                  error: 'No images found on Unsplash',
                  timestamp: new Date().toISOString()
                });
                job.failedItems++;
                job.processedItems++;
                continue;
              }

              // Insert each image
              for (const photo of photos) {
                try {
                  await insertImage(speciesId, photo, speciesData.englishName);
                  job.successfulItems++;
                } catch (imageError) {
                  job.errors.push({
                    item: `${speciesData.englishName}:${photo.id}`,
                    error: (imageError as Error).message,
                    timestamp: new Date().toISOString()
                  });
                  job.failedItems++;
                }
                job.processedItems++;

                // Rate limiting between image insertions
                await sleep(500);
              }

              // Rate limiting between species
              await sleep(1000);

            } catch (speciesError) {
              job.errors.push({
                item: speciesData.englishName,
                error: (speciesError as Error).message,
                timestamp: new Date().toISOString()
              });
              job.failedItems += count;
              job.processedItems += count;
            }
          }

          // Mark job as completed
          job.status = job.failedItems > 0 && job.successfulItems === 0 ? 'failed' : 'completed';
          job.completedAt = new Date().toISOString();

          info('Image collection job completed', {
            jobId,
            status: job.status,
            successful: job.successfulItems,
            failed: job.failedItems
          });

        } catch (error) {
          job.status = 'failed';
          job.completedAt = new Date().toISOString();
          job.errors.push({
            item: 'job',
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          });
          logError('Image collection job failed', error as Error, { jobId });
        }
      })();

      // Return immediately with job ID
      res.status(202).json({
        jobId,
        status: 'processing',
        message: 'Image collection started. Check job status for progress.',
        totalSpecies: speciesToCollect.length,
        imagesPerSpecies: count,
        estimatedImages: totalItems
      });

    } catch (err) {
      logError('Error starting image collection', err as Error);
      res.status(500).json({ error: 'Failed to start image collection' });
    }
  }
);

/**
 * POST /api/admin/images/annotate
 * Trigger batch annotation generation
 *
 * @auth Admin only
 * @rate-limited 30 requests/hour
 *
 * Request body:
 * {
 *   "imageIds": ["uuid1", "uuid2"],  // Optional: specific images to annotate
 *   "all": true  // Optional: annotate all unannotated images
 * }
 *
 * Response:
 * {
 *   "jobId": "annotate_1234567890_abc123",
 *   "status": "processing",
 *   "message": "Batch annotation started",
 *   "totalImages": 10
 * }
 */
router.post(
  '/admin/images/annotate',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  validateBody(AnnotateImagesSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageIds, all } = req.body;

      // Initialize Vision AI service
      const visionService = new VisionAIService();

      if (!visionService.isConfigured()) {
        res.status(503).json({
          error: 'Claude API not configured',
          message: 'ANTHROPIC_API_KEY environment variable is not set'
        });
        return;
      }

      // Determine which images to annotate
      let imagesToAnnotate: Array<{
        id: string;
        url: string;
        speciesName: string;
        speciesId: string;
      }> = [];

      if (imageIds && imageIds.length > 0) {
        // Annotate specific images
        const result = await pool.query(
          `SELECT
            i.id, i.url, i.species_id,
            s.english_name || ' - ' || s.spanish_name as species_name
          FROM images i
          JOIN species s ON i.species_id = s.id
          WHERE i.id = ANY($1)`,
          [imageIds]
        );
        imagesToAnnotate = result.rows.map((row: ImageRow) => ({
          id: row.id,
          url: row.url,
          speciesName: row.species_name,
          speciesId: row.species_id
        }));
      } else if (all) {
        // Annotate all images without existing annotations
        const result = await pool.query(
          `SELECT
            i.id, i.url, i.species_id,
            s.english_name || ' - ' || s.spanish_name as species_name
          FROM images i
          JOIN species s ON i.species_id = s.id
          WHERE NOT EXISTS (
            SELECT 1 FROM ai_annotation_items ai
            WHERE ai.image_id::text = i.id::text
          )
          ORDER BY i.created_at
          LIMIT 100`
        );
        imagesToAnnotate = result.rows.map((row: ImageRow) => ({
          id: row.id,
          url: row.url,
          speciesName: row.species_name,
          speciesId: row.species_id
        }));
      } else {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Either imageIds array or all=true must be provided'
        });
        return;
      }

      if (imagesToAnnotate.length === 0) {
        res.status(200).json({
          message: 'No images to annotate',
          details: all ? 'All images already have annotations' : 'No matching images found'
        });
        return;
      }

      // Generate job ID and initialize tracking
      const jobId = generateJobId('annotate');

      const jobProgress: JobProgress = {
        jobId,
        type: 'annotate',
        status: 'processing',
        totalItems: imagesToAnnotate.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: [],
        startedAt: new Date().toISOString(),
        metadata: {
          imageCount: imagesToAnnotate.length,
          mode: imageIds ? 'specific' : 'all',
          requestedBy: req.user?.userId || 'anonymous'
        }
      };

      jobStore.set(jobId, jobProgress);

      info('Starting batch annotation job', {
        jobId,
        imageCount: imagesToAnnotate.length,
        userId: req.user?.userId
      });

      // Start async annotation process
      (async () => {
        const job = jobStore.get(jobId)!;
        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_IMAGES = 2000;
        const DELAY_BETWEEN_BATCHES = 3000;

        try {
          for (let i = 0; i < imagesToAnnotate.length; i += BATCH_SIZE) {
            // Check if job was cancelled
            if ((job.status as JobStatus) === 'cancelled') {
              info('Annotation job cancelled', { jobId });
              break;
            }

            const batch = imagesToAnnotate.slice(i, i + BATCH_SIZE);

            for (const image of batch) {
              if ((job.status as JobStatus) === 'cancelled') break;

              try {
                // Check if already annotated
                const existingCheck = await pool.query(
                  'SELECT COUNT(*) as count FROM ai_annotation_items WHERE image_id::text = $1',
                  [image.id]
                );

                if (parseInt(existingCheck.rows[0].count) > 0) {
                  info('Image already annotated, skipping', { imageId: image.id });
                  job.processedItems++;
                  continue;
                }

                // Generate annotations
                const annotations = await visionService.generateAnnotations(
                  image.url,
                  image.id,
                  { species: image.speciesName.split(' - ')[0], enablePatternLearning: true }
                );

                if (!annotations || annotations.length === 0) {
                  throw new Error('No annotations generated');
                }

                // Create annotation job record
                const annotationJobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const avgConfidence = annotations.reduce((sum, a) => sum + (a.confidence || 0.8), 0) / annotations.length;

                await pool.query(
                  `INSERT INTO ai_annotations (job_id, image_id, annotation_data, status, confidence_score)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [annotationJobId, image.id, JSON.stringify(annotations), 'pending', avgConfidence]
                );

                // Insert individual annotation items
                for (const annotation of annotations) {
                  await pool.query(
                    `INSERT INTO ai_annotation_items (
                      job_id, image_id, spanish_term, english_term, bounding_box,
                      annotation_type, difficulty_level, pronunciation, confidence, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                      annotationJobId,
                      image.id,
                      annotation.spanishTerm,
                      annotation.englishTerm,
                      JSON.stringify(annotation.boundingBox),
                      annotation.type,
                      annotation.difficultyLevel,
                      annotation.pronunciation || null,
                      annotation.confidence || 0.8,
                      'pending'
                    ]
                  );
                }

                job.successfulItems++;
                info('Image annotated successfully', {
                  imageId: image.id,
                  annotationCount: annotations.length
                });

              } catch (annotateError) {
                job.errors.push({
                  item: image.id,
                  error: (annotateError as Error).message,
                  timestamp: new Date().toISOString()
                });
                job.failedItems++;
                logError('Failed to annotate image', annotateError as Error, { imageId: image.id });
              }

              job.processedItems++;
              await sleep(DELAY_BETWEEN_IMAGES);
            }

            // Delay between batches
            if (i + BATCH_SIZE < imagesToAnnotate.length) {
              await sleep(DELAY_BETWEEN_BATCHES);
            }
          }

          // Mark job as completed
          job.status = job.failedItems > 0 && job.successfulItems === 0 ? 'failed' : 'completed';
          job.completedAt = new Date().toISOString();

          info('Batch annotation job completed', {
            jobId,
            status: job.status,
            successful: job.successfulItems,
            failed: job.failedItems,
            totalAnnotations: job.successfulItems
          });

        } catch (error) {
          job.status = 'failed';
          job.completedAt = new Date().toISOString();
          job.errors.push({
            item: 'job',
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          });
          logError('Batch annotation job failed', error as Error, { jobId });
        }
      })();

      // Return immediately with job ID
      res.status(202).json({
        jobId,
        status: 'processing',
        message: 'Batch annotation started. Check job status for progress.',
        totalImages: imagesToAnnotate.length
      });

    } catch (err) {
      logError('Error starting batch annotation', err as Error);
      res.status(500).json({ error: 'Failed to start batch annotation' });
    }
  }
);

/**
 * GET /api/admin/images/jobs/:jobId
 * Get job status and progress
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "jobId": "collect_1234567890_abc123",
 *   "type": "collect",
 *   "status": "processing",
 *   "progress": {
 *     "total": 10,
 *     "processed": 5,
 *     "successful": 4,
 *     "failed": 1,
 *     "percentage": 50
 *   },
 *   "errors": [...],
 *   "startedAt": "2025-11-21T12:00:00Z",
 *   "completedAt": null
 * }
 */
router.get(
  '/admin/images/jobs/:jobId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(JobIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      const job = jobStore.get(jobId);

      if (!job) {
        // Check if it's an annotation job in the database
        const dbResult = await pool.query(
          `SELECT
            job_id as "jobId",
            status,
            annotation_data as "annotationData",
            confidence_score as "confidenceScore",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM ai_annotations
          WHERE job_id = $1`,
          [jobId]
        );

        if (dbResult.rows.length > 0) {
          const dbJob = dbResult.rows[0];
          res.json({
            jobId: dbJob.jobId,
            type: 'annotate',
            status: dbJob.status,
            progress: {
              total: 1,
              processed: 1,
              successful: dbJob.status === 'completed' || dbJob.status === 'pending' ? 1 : 0,
              failed: dbJob.status === 'failed' ? 1 : 0,
              percentage: 100
            },
            confidenceScore: dbJob.confidenceScore,
            startedAt: dbJob.createdAt,
            completedAt: dbJob.updatedAt
          });
          return;
        }

        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const percentage = job.totalItems > 0
        ? Math.round((job.processedItems / job.totalItems) * 100)
        : 0;

      res.json({
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        progress: {
          total: job.totalItems,
          processed: job.processedItems,
          successful: job.successfulItems,
          failed: job.failedItems,
          percentage
        },
        errors: job.errors.slice(-10), // Return last 10 errors
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        metadata: job.metadata
      });

    } catch (err) {
      logError('Error fetching job status', err as Error);
      res.status(500).json({ error: 'Failed to fetch job status' });
    }
  }
);

/**
 * POST /api/admin/images/jobs/:jobId/cancel
 * Cancel a running job
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "message": "Job cancelled successfully",
 *   "jobId": "collect_1234567890_abc123"
 * }
 */
router.post(
  '/admin/images/jobs/:jobId/cancel',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(JobIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      const job = jobStore.get(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      if (job.status !== 'processing' && job.status !== 'pending') {
        res.status(400).json({
          error: 'Cannot cancel job',
          message: `Job is already ${job.status}`
        });
        return;
      }

      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();

      info('Job cancelled', { jobId, userId: req.user?.userId });

      res.json({
        message: 'Job cancelled successfully',
        jobId
      });

    } catch (err) {
      logError('Error cancelling job', err as Error);
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  }
);

/**
 * GET /api/admin/images/stats
 * Get image and annotation statistics
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "images": {
 *     "total": 50,
 *     "bySpecies": { "Northern Cardinal": 10, ... }
 *   },
 *   "annotations": {
 *     "total": 200,
 *     "pending": 50,
 *     "approved": 140,
 *     "rejected": 10,
 *     "avgConfidence": 0.85
 *   },
 *   "jobs": {
 *     "active": 2,
 *     "completed": 15,
 *     "failed": 1
 *   }
 * }
 */
router.get(
  '/admin/images/stats',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Get image statistics
      const imageStatsQuery = `
        SELECT
          COUNT(DISTINCT i.id) as total_images,
          COUNT(DISTINCT i.species_id) as unique_species
        FROM images i
      `;
      const imageStats = await pool.query(imageStatsQuery);

      // Get images by species
      const imagesBySpeciesQuery = `
        SELECT
          s.english_name as species,
          COUNT(i.id) as count
        FROM images i
        JOIN species s ON i.species_id = s.id
        GROUP BY s.english_name
        ORDER BY count DESC
      `;
      const imagesBySpecies = await pool.query(imagesBySpeciesQuery);
      const bySpecies: Record<string, number> = {};
      for (const row of imagesBySpecies.rows as ImageBySpeciesRow[]) {
        bySpecies[row.species] = parseInt(row.count);
      }

      // Get annotation statistics
      const annotationStatsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'edited') as edited,
          AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence
        FROM ai_annotation_items
      `;
      const annotationStats = await pool.query(annotationStatsQuery);
      const annoRow = annotationStats.rows[0];

      // Get images with/without annotations
      const annotationCoverageQuery = `
        SELECT
          COUNT(DISTINCT i.id) FILTER (WHERE ai.id IS NOT NULL) as annotated,
          COUNT(DISTINCT i.id) FILTER (WHERE ai.id IS NULL) as unannotated
        FROM images i
        LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
      `;
      const annotationCoverage = await pool.query(annotationCoverageQuery);
      const coverageRow = annotationCoverage.rows[0];

      // Get job statistics from in-memory store
      let activeJobs = 0;
      let completedJobs = 0;
      let failedJobs = 0;

      for (const job of jobStore.values()) {
        if (job.status === 'processing' || job.status === 'pending') {
          activeJobs++;
        } else if (job.status === 'completed') {
          completedJobs++;
        } else if (job.status === 'failed') {
          failedJobs++;
        }
      }

      res.json({
        images: {
          total: parseInt(imageStats.rows[0].total_images) || 0,
          uniqueSpecies: parseInt(imageStats.rows[0].unique_species) || 0,
          annotated: parseInt(coverageRow.annotated) || 0,
          unannotated: parseInt(coverageRow.unannotated) || 0,
          bySpecies
        },
        annotations: {
          total: parseInt(annoRow.total) || 0,
          pending: parseInt(annoRow.pending) || 0,
          approved: parseInt(annoRow.approved) || 0,
          rejected: parseInt(annoRow.rejected) || 0,
          edited: parseInt(annoRow.edited) || 0,
          avgConfidence: parseFloat(annoRow.avg_confidence || '0').toFixed(2)
        },
        jobs: {
          active: activeJobs,
          completed: completedJobs,
          failed: failedJobs
        }
      });

    } catch (err) {
      logError('Error fetching image stats', err as Error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

/**
 * GET /api/admin/images/sources
 * List available image sources and configuration status
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "sources": {
 *     "unsplash": {
 *       "configured": true,
 *       "quota": { "remaining": 45, "limit": 50, "resetAt": "..." }
 *     }
 *   },
 *   "availableSpecies": [
 *     { "name": "Northern Cardinal", "scientificName": "Cardinalis cardinalis", "searchTerms": "..." }
 *   ],
 *   "services": {
 *     "visionAI": { "configured": true, "provider": "Claude Sonnet 4.5" }
 *   }
 * }
 */
router.get(
  '/admin/images/sources',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Check Unsplash configuration and quota
      const unsplashConfigured = !!UNSPLASH_ACCESS_KEY;
      let unsplashQuota = null;

      if (unsplashConfigured) {
        unsplashQuota = await getUnsplashQuotaStatus();
      }

      // Check Vision AI configuration
      const visionService = new VisionAIService();
      const visionConfigured = visionService.isConfigured();

      // Get species from database
      const speciesResult = await pool.query(
        `SELECT
          english_name as "englishName",
          scientific_name as "scientificName",
          spanish_name as "spanishName"
        FROM species
        ORDER BY english_name`
      );

      // Combine database species with default species
      const dbSpecies = speciesResult.rows as SpeciesRow[];
      const allSpecies = DEFAULT_BIRD_SPECIES.map(s => ({
        name: s.englishName,
        scientificName: s.scientificName,
        spanishName: s.spanishName,
        searchTerms: s.searchTerms,
        inDatabase: dbSpecies.some((db: SpeciesRow) => db.scientificName === s.scientificName)
      }));

      res.json({
        sources: {
          unsplash: {
            configured: unsplashConfigured,
            quota: unsplashQuota,
            baseUrl: UNSPLASH_API_URL
          }
        },
        availableSpecies: allSpecies,
        speciesInDatabase: dbSpecies.length,
        services: {
          visionAI: {
            configured: visionConfigured,
            provider: visionConfigured ? 'Claude Sonnet 4.5' : 'Not configured'
          }
        }
      });

    } catch (err) {
      logError('Error fetching image sources', err as Error);
      res.status(500).json({ error: 'Failed to fetch image sources' });
    }
  }
);

/**
 * GET /api/admin/images/jobs
 * List all jobs (active and recent)
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "jobs": [...],
 *   "count": 5
 * }
 */
router.get(
  '/admin/images/jobs',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const jobs: Array<{
        jobId: string;
        type: string;
        status: string;
        progress: number;
        startedAt: string;
        completedAt?: string;
      }> = [];

      for (const job of jobStore.values()) {
        const percentage = job.totalItems > 0
          ? Math.round((job.processedItems / job.totalItems) * 100)
          : 0;

        jobs.push({
          jobId: job.jobId,
          type: job.type,
          status: job.status,
          progress: percentage,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        });
      }

      // Sort by startedAt descending
      jobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      res.json({
        jobs,
        count: jobs.length
      });

    } catch (err) {
      logError('Error listing jobs', err as Error);
      res.status(500).json({ error: 'Failed to list jobs' });
    }
  }
);

export default router;
