/**
 * Admin Image Management Routes
 *
 * CONCEPT: Admin API endpoints for managing image collection and annotation workflows
 * WHY: Provides programmatic access to image collection from Unsplash and batch annotation
 * PATTERN: Async job processing with status tracking, admin authentication required
 *
 * Endpoints:
 * - GET /api/admin/images - Get paginated list of images with species info
 * - POST /api/admin/images/collect - Trigger image collection from Unsplash
 * - POST /api/admin/images/annotate - Trigger batch annotation
 * - GET /api/admin/images/jobs - List all jobs (active and recent)
 * - GET /api/admin/images/jobs/:jobId - Get job status
 * - GET /api/admin/images/stats - Get image/annotation statistics
 * - GET /api/admin/images/sources - List available image sources
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { pool } from '../database/connection';
import { VisionAIService } from '../services/VisionAIService';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../middleware/optionalSupabaseAuth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { error as logError, info } from '../utils/logger';

const router = Router();

// Debug middleware to log all requests to this router
router.use((req: Request, res: Response, next) => {
  info('🖼️ Admin Image Management Router Request', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  next();
});

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
  max: 1000, // Increased to 1000 - admin routes are auth-protected
  message: { error: 'Too many admin requests. Please try again later.' },
  // Disable trust proxy validation for development
  // In production with proper proxy setup, this should be configured appropriately
  validate: { trustProxy: false }
});

// ============================================================================
// Upload Configuration
// ============================================================================

// Upload directories
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const UPLOAD_IMAGES_DIR = path.join(UPLOAD_BASE_DIR, 'images');
const UPLOAD_THUMBNAILS_DIR = path.join(UPLOAD_BASE_DIR, 'thumbnails');

// Ensure upload directories exist
const ensureUploadDirs = (): void => {
  [UPLOAD_BASE_DIR, UPLOAD_IMAGES_DIR, UPLOAD_THUMBNAILS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      info('Created upload directory', { dir });
    }
  });
};

// Initialize upload directories
ensureUploadDirs();

// Image processing constants
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 900;
const JPEG_QUALITY = 85;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

// Multer configuration for memory storage (we process with sharp before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 20, // Max 20 files per request
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP are allowed.`));
    }
  },
});

/**
 * Process and save uploaded image with sharp
 * Returns paths to the processed image and thumbnail
 */
async function processAndSaveImage(
  buffer: Buffer,
  originalName: string
): Promise<{ imagePath: string; thumbnailPath: string; width: number; height: number }> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const baseName = path.basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  const filename = `${timestamp}_${randomStr}_${baseName}.jpg`;

  const imagePath = path.join(UPLOAD_IMAGES_DIR, filename);
  const thumbnailPath = path.join(UPLOAD_THUMBNAILS_DIR, filename);

  // Process main image - resize and optimize
  const mainImage = await sharp(buffer)
    .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(imagePath);

  // Create thumbnail
  await sharp(buffer)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  info('Image processed and saved', {
    filename,
    originalSize: buffer.length,
    processedSize: mainImage.size,
    dimensions: { width: mainImage.width, height: mainImage.height },
  });

  return {
    imagePath: `/uploads/images/${filename}`,
    thumbnailPath: `/uploads/thumbnails/${filename}`,
    width: mainImage.width,
    height: mainImage.height,
  };
}

// ============================================================================
// Validation Schemas
// ============================================================================

const CollectImagesSchema = z.object({
  speciesIds: z.array(z.string().uuid()).optional(), // Accept UUIDs from frontend
  count: z.number().int().min(1).max(10).optional().default(2)
});

const AnnotateImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional().default(false)
});

const JobIdParamSchema = z.object({
  jobId: z.string().min(1)
});

const BulkDeleteSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, 'At least one image ID required').max(100, 'Maximum 100 images per request')
});

const BulkAnnotateSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, 'At least one image ID required').max(50, 'Maximum 50 images per request')
});

const ImageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  speciesId: z.string().uuid().optional(),
  annotationStatus: z.enum(['annotated', 'unannotated', 'all']).optional().default('all'),
  qualityFilter: z.enum(['high', 'medium', 'low', 'unscored', 'all']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'speciesName', 'annotationCount', 'qualityScore']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
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
 *   "speciesIds": ["uuid1", "uuid2"],  // Optional: array of species UUIDs from database
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
      const { speciesIds, count } = req.body;

      // Validate Unsplash configuration
      if (!UNSPLASH_ACCESS_KEY) {
        res.status(503).json({
          error: 'Unsplash API not configured',
          message: 'UNSPLASH_ACCESS_KEY environment variable is not set'
        });
        return;
      }

      // Get species data from database using the provided IDs
      let speciesToCollect: Array<{
        id: string;
        scientificName: string;
        englishName: string;
        spanishName: string;
        searchTerms?: string;
      }> = [];

      if (speciesIds && speciesIds.length > 0) {
        // Fetch species from database by their IDs
        const speciesResult = await pool.query(
          `SELECT
            id,
            scientific_name as "scientificName",
            english_name as "englishName",
            spanish_name as "spanishName"
          FROM species
          WHERE id = ANY($1)`,
          [speciesIds]
        );

        if (speciesResult.rows.length === 0) {
          res.status(400).json({
            error: 'No matching species found',
            message: 'The provided species IDs do not exist in the database'
          });
          return;
        }

        // Map database results to collection format
        speciesToCollect = speciesResult.rows.map((row: any) => ({
          id: row.id,
          scientificName: row.scientificName,
          englishName: row.englishName,
          spanishName: row.spanishName,
          searchTerms: `${row.englishName} bird` // Generate search terms for Unsplash
        }));
      } else {
        // If no species specified, use DEFAULT_BIRD_SPECIES (for backward compatibility)
        // First, insert them into the database if they don't exist
        for (const defaultSpecies of DEFAULT_BIRD_SPECIES) {
          try {
            const existingSpecies = await pool.query(
              'SELECT id FROM species WHERE scientific_name = $1',
              [defaultSpecies.scientificName]
            );

            let speciesId: string;
            if (existingSpecies.rows.length === 0) {
              speciesId = await insertSpecies(defaultSpecies);
            } else {
              speciesId = existingSpecies.rows[0].id;
            }

            speciesToCollect.push({
              id: speciesId,
              scientificName: defaultSpecies.scientificName,
              englishName: defaultSpecies.englishName,
              spanishName: defaultSpecies.spanishName,
              searchTerms: defaultSpecies.searchTerms
            });
          } catch (err) {
            logError('Error processing default species', err as Error);
          }
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
              // Use the species ID directly (already exists in database)
              const speciesId = speciesData.id;

              // Search for images using searchTerms or fallback to english name
              const searchQuery = speciesData.searchTerms || `${speciesData.englishName} bird`;
              const photos = await searchUnsplash(searchQuery, count);

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
 * POST /api/admin/images/upload
 * Upload local images with processing and optimization
 *
 * @auth Admin only
 * @rate-limited 30 requests/hour
 *
 * Form data:
 * - files: Multiple image files (JPEG, PNG, WebP) - max 20 files, 10MB each
 * - speciesId: UUID of the species these images belong to (required)
 *
 * Response:
 * {
 *   "message": "Successfully uploaded 5 images",
 *   "uploaded": [
 *     { "id": "uuid", "url": "/uploads/images/...", "thumbnailUrl": "/uploads/thumbnails/..." }
 *   ],
 *   "failed": [],
 *   "summary": { "total": 5, "successful": 5, "failed": 0 }
 * }
 */
router.post(
  '/admin/images/upload',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  upload.array('files', 20),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const { speciesId } = req.body;

      // Validate speciesId
      if (!speciesId) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'speciesId is required'
        });
        return;
      }

      // Validate species exists
      const speciesResult = await pool.query(
        'SELECT id, english_name, spanish_name FROM species WHERE id = $1',
        [speciesId]
      );

      if (speciesResult.rows.length === 0) {
        res.status(400).json({
          error: 'Invalid species',
          message: 'The specified speciesId does not exist'
        });
        return;
      }

      const speciesRow = speciesResult.rows[0];
      const speciesName = speciesRow.english_name;

      if (!files || files.length === 0) {
        res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select at least one image file to upload'
        });
        return;
      }

      info('Starting image upload', {
        fileCount: files.length,
        speciesId,
        speciesName,
        userId: req.user?.userId
      });

      const uploaded: Array<{
        id: string;
        url: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        originalName: string;
      }> = [];
      const failed: Array<{ filename: string; error: string }> = [];

      // Process each file
      for (const file of files) {
        try {
          // Process and save the image
          const processed = await processAndSaveImage(file.buffer, file.originalname);

          // Insert into database
          const insertResult = await pool.query(
            `INSERT INTO images (
              species_id, url, thumbnail_url, width, height,
              description, source_type, original_filename
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
              speciesId,
              processed.imagePath,
              processed.thumbnailPath,
              processed.width,
              processed.height,
              `${speciesName} - uploaded image`,
              'local_upload',
              file.originalname
            ]
          );

          uploaded.push({
            id: insertResult.rows[0].id,
            url: processed.imagePath,
            thumbnailUrl: processed.thumbnailPath,
            width: processed.width,
            height: processed.height,
            originalName: file.originalname
          });

        } catch (fileError) {
          logError('Failed to process uploaded file', fileError as Error, {
            filename: file.originalname
          });
          failed.push({
            filename: file.originalname,
            error: (fileError as Error).message
          });
        }
      }

      info('Image upload completed', {
        uploaded: uploaded.length,
        failed: failed.length,
        speciesId,
        userId: req.user?.userId
      });

      res.status(uploaded.length > 0 ? 201 : 400).json({
        message: uploaded.length > 0
          ? `Successfully uploaded ${uploaded.length} image${uploaded.length !== 1 ? 's' : ''}`
          : 'Failed to upload any images',
        uploaded,
        failed: failed.length > 0 ? failed : undefined,
        summary: {
          total: files.length,
          successful: uploaded.length,
          failed: failed.length
        }
      });

    } catch (err) {
      logError('Error uploading images', err as Error);
      res.status(500).json({ error: 'Failed to upload images' });
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

      // Get images by species - return species ID as key for proper frontend lookup
      const imagesBySpeciesQuery = `
        SELECT
          s.id as species,
          COUNT(i.id) as count
        FROM images i
        JOIN species s ON i.species_id = s.id
        GROUP BY s.id
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

      // Return in format expected by frontend (wrapped in data, with totalImages etc)
      res.json({
        data: {
          totalImages: parseInt(imageStats.rows[0].total_images) || 0,
          pendingAnnotation: parseInt(coverageRow.unannotated) || 0,
          annotated: parseInt(coverageRow.annotated) || 0,
          failed: failedJobs,
          bySpecies,
          // Additional details for extended stats views
          uniqueSpecies: parseInt(imageStats.rows[0].unique_species) || 0,
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
 * GET /api/admin/images
 * Get paginated list of images with species info
 *
 * @auth Admin only
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - speciesId: Filter by species UUID
 * - annotationStatus: 'annotated' | 'unannotated' | 'all' (default: 'all')
 * - sortBy: 'createdAt' | 'speciesName' | 'annotationCount' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 *
 * Response:
 * {
 *   "data": {
 *     "images": [
 *       {
 *         "id": "uuid",
 *         "url": "https://...",
 *         "speciesId": "uuid",
 *         "speciesName": "Northern Cardinal",
 *         "annotationCount": 5,
 *         "createdAt": "2025-11-21T12:00:00Z",
 *         "width": 1920,
 *         "height": 1080
 *       }
 *     ],
 *     "pagination": {
 *       "total": 150,
 *       "page": 1,
 *       "pageSize": 20,
 *       "totalPages": 8
 *     }
 *   }
 * }
 */
router.get(
  '/admin/images',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateQuery(ImageListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page,
        pageSize,
        speciesId,
        annotationStatus,
        qualityFilter,
        sortBy,
        sortOrder
      } = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 20,
        speciesId: req.query.speciesId as string | undefined,
        annotationStatus: (req.query.annotationStatus as 'annotated' | 'unannotated' | 'all') || 'all',
        qualityFilter: (req.query.qualityFilter as 'high' | 'medium' | 'low' | 'unscored' | 'all') || 'all',
        sortBy: (req.query.sortBy as 'createdAt' | 'speciesName' | 'annotationCount' | 'qualityScore') || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      // Build WHERE clauses
      const whereConditions: string[] = [];
      const queryParams: (string | number)[] = [];
      let paramIndex = 1;

      // Filter by speciesId
      if (speciesId) {
        whereConditions.push(`i.species_id = $${paramIndex}`);
        queryParams.push(speciesId);
        paramIndex++;
      }

      // Filter by annotation status (use COALESCE to handle NULL values)
      if (annotationStatus === 'annotated') {
        whereConditions.push('COALESCE(i.annotation_count, 0) > 0');
      } else if (annotationStatus === 'unannotated') {
        whereConditions.push('COALESCE(i.annotation_count, 0) = 0');
      }
      // 'all' = no filter

      // Filter by quality score
      // High: 80-100, Medium: 60-79, Low: 0-59, Unscored: NULL
      if (qualityFilter === 'high') {
        whereConditions.push('i.quality_score >= 80');
      } else if (qualityFilter === 'medium') {
        whereConditions.push('i.quality_score >= 60 AND i.quality_score < 80');
      } else if (qualityFilter === 'low') {
        whereConditions.push('i.quality_score < 60');
      } else if (qualityFilter === 'unscored') {
        whereConditions.push('i.quality_score IS NULL');
      }
      // 'all' = no filter

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Build ORDER BY clause
      let orderByColumn: string;
      switch (sortBy) {
        case 'speciesName':
          orderByColumn = 's.english_name';
          break;
        case 'annotationCount':
          orderByColumn = 'i.annotation_count';
          break;
        case 'qualityScore':
          orderByColumn = 'COALESCE(i.quality_score, -1)';
          break;
        case 'createdAt':
        default:
          orderByColumn = 'i.created_at';
          break;
      }
      const orderByClause = `ORDER BY ${orderByColumn} ${sortOrder.toUpperCase()}`;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM images i
        JOIN species s ON i.species_id = s.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // Calculate pagination
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;

      // Get paginated images with quality score and derived fields
      const imagesQuery = `
        SELECT
          i.id,
          i.url,
          i.description,
          i.species_id as "speciesId",
          s.english_name as "speciesName",
          s.scientific_name as "scientificName",
          COALESCE(i.annotation_count, 0) as "annotationCount",
          (COALESCE(i.annotation_count, 0) > 0) as "hasAnnotations",
          i.quality_score as "qualityScore",
          i.created_at as "createdAt",
          i.width,
          i.height
        FROM images i
        JOIN species s ON i.species_id = s.id
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const imagesResult = await pool.query(imagesQuery, [
        ...queryParams,
        pageSize,
        offset
      ]);

      info('Admin images list fetched', {
        page,
        pageSize,
        total,
        filters: { speciesId, annotationStatus, qualityFilter },
        sorting: { sortBy, sortOrder }
      });

      res.json({
        data: {
          images: imagesResult.rows,
          pagination: {
            total,
            page,
            pageSize,
            totalPages
          }
        }
      });

    } catch (err) {
      logError('Error fetching admin images list', err as Error);
      res.status(500).json({ error: 'Failed to fetch images list' });
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
      // Map backend status to frontend expected status
      const mapStatus = (status: string): string => {
        switch (status) {
          case 'processing': return 'running';
          default: return status;
        }
      };

      // Map backend type to frontend expected type
      const mapType = (type: string): string => {
        switch (type) {
          case 'collect': return 'collection';
          case 'annotate': return 'annotation';
          default: return type;
        }
      };

      const jobs: Array<{
        id: string;
        type: string;
        status: string;
        progress: number;
        total: number;
        startedAt: string;
        completedAt?: string;
        speciesIds?: string[];
        results?: { collected?: number; annotated?: number; failed?: number };
        error?: string;
      }> = [];

      for (const job of jobStore.values()) {
        jobs.push({
          id: job.jobId,
          type: mapType(job.type),
          status: mapStatus(job.status),
          progress: job.processedItems,
          total: job.totalItems,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          speciesIds: job.metadata?.speciesIds || [],
          results: {
            collected: job.type === 'collect' ? job.successfulItems : undefined,
            annotated: job.type === 'annotate' ? job.successfulItems : undefined,
            failed: job.failedItems > 0 ? job.failedItems : undefined
          },
          error: job.errors.length > 0 ? job.errors[job.errors.length - 1].error : undefined
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

// ============================================================================
// Pending Images Endpoint
// ============================================================================

/**
 * GET /api/admin/images/pending
 * Get unannotated images for the annotation tab
 *
 * @auth Admin only
 *
 * Response:
 * {
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "speciesId": "uuid",
 *       "url": "https://...",
 *       "createdAt": "2025-11-21T12:00:00Z"
 *     }
 *   ]
 * }
 */
router.get(
  '/admin/images/pending',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(`
        SELECT
          i.id,
          i.species_id as "speciesId",
          i.url,
          i.created_at as "createdAt",
          s.english_name as "speciesName"
        FROM images i
        LEFT JOIN species s ON i.species_id = s.id
        WHERE NOT EXISTS (
          SELECT 1 FROM ai_annotation_items ai WHERE ai.image_id::text = i.id::text
        )
        ORDER BY i.created_at DESC
        LIMIT 100
      `);

      info('Fetched pending images', { count: result.rows.length });

      res.json({
        data: result.rows
      });

    } catch (err) {
      logError('Error fetching pending images', err as Error);
      res.status(500).json({ error: 'Failed to fetch pending images' });
    }
  }
);

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * POST /api/admin/images/bulk/delete
 * Delete multiple images by their IDs
 *
 * @auth Admin only
 * @rate-limited 30 requests/hour
 *
 * Request body:
 * {
 *   "imageIds": ["uuid1", "uuid2", ...]
 * }
 *
 * Response:
 * {
 *   "message": "Successfully deleted 5 images",
 *   "deleted": 5,
 *   "failed": 0,
 *   "errors": []
 * }
 */
router.post(
  '/admin/images/bulk/delete',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  validateBody(BulkDeleteSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageIds } = req.body as { imageIds: string[] };

      info('Starting bulk image deletion', {
        imageCount: imageIds.length,
        userId: req.user?.userId
      });

      let deleted = 0;
      let failed = 0;
      const errors: Array<{ imageId: string; error: string }> = [];

      // Use a transaction for atomic deletion
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const imageId of imageIds) {
          try {
            // First delete related annotation items
            await client.query(
              'DELETE FROM ai_annotation_items WHERE image_id::text = $1',
              [imageId]
            );

            // Delete related annotations
            await client.query(
              'DELETE FROM ai_annotations WHERE image_id::text = $1',
              [imageId]
            );

            // Delete the image
            const result = await client.query(
              'DELETE FROM images WHERE id = $1 RETURNING id',
              [imageId]
            );

            if (result.rowCount && result.rowCount > 0) {
              deleted++;
            } else {
              errors.push({ imageId, error: 'Image not found' });
              failed++;
            }
          } catch (deleteError) {
            errors.push({
              imageId,
              error: (deleteError as Error).message
            });
            failed++;
          }
        }

        await client.query('COMMIT');
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

      info('Bulk image deletion completed', {
        deleted,
        failed,
        userId: req.user?.userId
      });

      res.json({
        message: `Successfully deleted ${deleted} image${deleted !== 1 ? 's' : ''}`,
        deleted,
        failed,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (err) {
      logError('Error in bulk image deletion', err as Error);
      res.status(500).json({ error: 'Failed to delete images' });
    }
  }
);

/**
 * POST /api/admin/images/bulk/annotate
 * Trigger annotation for multiple specific images
 *
 * @auth Admin only
 * @rate-limited 30 requests/hour
 *
 * Request body:
 * {
 *   "imageIds": ["uuid1", "uuid2", ...]
 * }
 *
 * Response:
 * {
 *   "jobId": "bulk_annotate_1234567890_abc123",
 *   "status": "processing",
 *   "message": "Batch annotation started for 5 images",
 *   "totalImages": 5
 * }
 */
router.post(
  '/admin/images/bulk/annotate',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  validateBody(BulkAnnotateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageIds } = req.body as { imageIds: string[] };

      // Initialize Vision AI service
      const visionService = new VisionAIService();

      if (!visionService.isConfigured()) {
        res.status(503).json({
          error: 'Claude API not configured',
          message: 'ANTHROPIC_API_KEY environment variable is not set'
        });
        return;
      }

      // Get image details for the specified IDs
      const result = await pool.query(
        `SELECT
          i.id, i.url, i.species_id,
          s.english_name || ' - ' || s.spanish_name as species_name
        FROM images i
        JOIN species s ON i.species_id = s.id
        WHERE i.id = ANY($1)`,
        [imageIds]
      );

      if (result.rows.length === 0) {
        res.status(400).json({
          error: 'No valid images found',
          message: 'None of the provided image IDs exist in the database'
        });
        return;
      }

      const imagesToAnnotate = result.rows.map((row: ImageRow) => ({
        id: row.id,
        url: row.url,
        speciesName: row.species_name,
        speciesId: row.species_id
      }));

      // Generate job ID and initialize tracking
      const jobId = generateJobId('bulk_annotate');

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
          mode: 'bulk_selected',
          requestedBy: req.user?.userId || 'anonymous',
          requestedImageIds: imageIds.length,
          foundImages: imagesToAnnotate.length
        }
      };

      jobStore.set(jobId, jobProgress);

      info('Starting bulk annotation job', {
        jobId,
        imageCount: imagesToAnnotate.length,
        userId: req.user?.userId
      });

      // Start async annotation process
      (async () => {
        const job = jobStore.get(jobId)!;
        const DELAY_BETWEEN_IMAGES = 2000;

        try {
          for (const image of imagesToAnnotate) {
            if ((job.status as JobStatus) === 'cancelled') {
              info('Bulk annotation job cancelled', { jobId });
              break;
            }

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
              const annotationJobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

          // Mark job as completed
          job.status = job.failedItems > 0 && job.successfulItems === 0 ? 'failed' : 'completed';
          job.completedAt = new Date().toISOString();

          info('Bulk annotation job completed', {
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
          logError('Bulk annotation job failed', error as Error, { jobId });
        }
      })();

      // Return immediately with job ID
      res.status(202).json({
        jobId,
        status: 'processing',
        message: `Batch annotation started for ${imagesToAnnotate.length} image${imagesToAnnotate.length !== 1 ? 's' : ''}`,
        totalImages: imagesToAnnotate.length
      });

    } catch (err) {
      logError('Error starting bulk annotation', err as Error);
      res.status(500).json({ error: 'Failed to start bulk annotation' });
    }
  }
);

// ============================================================================
// Single Image Endpoints
// ============================================================================

const SingleImageParamSchema = z.object({
  imageId: z.string().uuid()
});

/**
 * GET /api/admin/images/:imageId
 * Get single image with full details and annotations
 */
router.get(
  '/admin/images/:imageId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      const imageQuery = `
        SELECT
          i.id, i.species_id as "speciesId", i.unsplash_id as "unsplashId",
          i.url, i.width, i.height, i.description,
          i.photographer, i.photographer_username as "photographerUsername",
          i.quality_score as "qualityScore",
          i.created_at as "createdAt",
          s.english_name as "englishName", s.spanish_name as "spanishName",
          s.scientific_name as "scientificName"
        FROM images i
        LEFT JOIN species s ON i.species_id = s.id
        WHERE i.id = $1
      `;
      const imageResult = await pool.query(imageQuery, [imageId]);

      if (imageResult.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      const imageRow = imageResult.rows[0];

      const annotationsQuery = `
        SELECT
          id, job_id as "jobId", spanish_term as "spanishTerm",
          english_term as "englishTerm", bounding_box as "boundingBox",
          annotation_type as "annotationType", difficulty_level as "difficultyLevel",
          pronunciation, confidence, status, created_at as "createdAt"
        FROM ai_annotation_items
        WHERE image_id::text = $1
        ORDER BY created_at DESC
      `;
      const annotationsResult = await pool.query(annotationsQuery, [imageId]);

      res.json({
        data: {
          ...imageRow,
          species: {
            englishName: imageRow.englishName,
            spanishName: imageRow.spanishName,
            scientificName: imageRow.scientificName
          },
          annotations: annotationsResult.rows
        }
      });

    } catch (err) {
      logError('Error fetching image details', err as Error);
      res.status(500).json({ error: 'Failed to fetch image details' });
    }
  }
);

/**
 * DELETE /api/admin/images/:imageId
 * Delete an image and its associated annotations
 */
router.delete(
  '/admin/images/:imageId',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      const checkResult = await pool.query('SELECT id FROM images WHERE id = $1', [imageId]);
      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      // Delete annotations first (foreign key constraint)
      await pool.query('DELETE FROM ai_annotation_items WHERE image_id::text = $1', [imageId]);
      await pool.query('DELETE FROM ai_annotations WHERE image_id::text = $1', [imageId]);
      await pool.query('DELETE FROM images WHERE id = $1', [imageId]);

      info('Image deleted', { imageId, userId: req.user?.userId });

      res.json({ message: 'Image deleted successfully', imageId });

    } catch (err) {
      logError('Error deleting image', err as Error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }
);

/**
 * POST /api/admin/images/:imageId/annotate
 * Trigger annotation for a single image
 */
router.post(
  '/admin/images/:imageId/annotate',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  validateParams(SingleImageParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageId } = req.params;

      const imageQuery = `
        SELECT i.id, i.url, s.english_name as species_name
        FROM images i
        LEFT JOIN species s ON i.species_id = s.id
        WHERE i.id = $1
      `;
      const imageResult = await pool.query(imageQuery, [imageId]);

      if (imageResult.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      const image = imageResult.rows[0];
      const visionService = new VisionAIService();

      if (!visionService.isConfigured()) {
        res.status(503).json({
          error: 'Claude API not configured',
          message: 'ANTHROPIC_API_KEY environment variable is not set'
        });
        return;
      }

      const annotations = await visionService.generateAnnotations(
        image.url,
        image.id,
        { species: image.species_name || 'Unknown species', enablePatternLearning: true }
      );

      if (!annotations || annotations.length === 0) {
        res.status(500).json({ error: 'No annotations generated' });
        return;
      }

      const annotationJobId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const avgConfidence = annotations.reduce((sum, a) => sum + (a.confidence || 0.8), 0) / annotations.length;

      await pool.query(
        `INSERT INTO ai_annotations (job_id, image_id, annotation_data, status, confidence_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [annotationJobId, imageId, JSON.stringify(annotations), 'pending', avgConfidence]
      );

      for (const annotation of annotations) {
        await pool.query(
          `INSERT INTO ai_annotation_items (
            job_id, image_id, spanish_term, english_term, bounding_box,
            annotation_type, difficulty_level, pronunciation, confidence, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            annotationJobId, imageId, annotation.spanishTerm, annotation.englishTerm,
            JSON.stringify(annotation.boundingBox), annotation.type, annotation.difficultyLevel,
            annotation.pronunciation || null, annotation.confidence || 0.8, 'pending'
          ]
        );
      }

      info('Image annotated via gallery', { imageId, annotationCount: annotations.length });

      res.json({
        message: 'Image annotated successfully',
        imageId,
        annotationCount: annotations.length,
        jobId: annotationJobId
      });

    } catch (err) {
      logError('Error annotating image', err as Error);
      res.status(500).json({ error: 'Failed to annotate image' });
    }
  }
);

/**
 * GET /api/admin/dashboard
 * Combined endpoint for initial dashboard load - fetches stats, quota, and jobs in one call
 * Optimized for faster initial page load by reducing API round trips
 */
router.get(
  '/admin/dashboard',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Execute all queries in parallel for faster response
      const [imageStats, imagesBySpecies, annotationStats, annotationCoverage, unsplashQuota] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(DISTINCT i.id) as total_images,
            COUNT(DISTINCT i.species_id) as unique_species
          FROM images i
        `),
        pool.query(`
          SELECT
            s.id as species,
            COUNT(i.id) as count
          FROM images i
          JOIN species s ON i.species_id = s.id
          GROUP BY s.id
          ORDER BY count DESC
        `),
        pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE status = 'edited') as edited,
            AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence
          FROM ai_annotation_items
        `),
        pool.query(`
          SELECT
            COUNT(DISTINCT i.id) FILTER (WHERE ai.id IS NOT NULL) as annotated,
            COUNT(DISTINCT i.id) FILTER (WHERE ai.id IS NULL) as unannotated
          FROM images i
          LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
        `),
        getUnsplashQuotaStatus().catch(() => ({ remaining: 50, limit: 50, resetTime: null }))
      ]);

      // Process results
      const bySpecies: Record<string, number> = {};
      for (const row of imagesBySpecies.rows as ImageBySpeciesRow[]) {
        bySpecies[row.species] = parseInt(row.count);
      }

      const annoRow = annotationStats.rows[0];
      const coverageRow = annotationCoverage.rows[0];

      // Get job statistics from in-memory store
      const jobs: Array<{
        id: string;
        type: string;
        status: string;
        progress: number;
        total: number;
        startedAt: string;
        completedAt?: string;
        error?: string;
        results?: Record<string, number>;
      }> = [];
      let activeJobs = 0;
      let completedJobs = 0;
      let failedJobs = 0;

      for (const job of jobStore.values()) {
        // Map type to frontend expected values
        const mappedType = job.type === 'collect' ? 'collection' :
                          job.type === 'annotate' ? 'annotation' : job.type;

        jobs.push({
          id: job.jobId,
          type: mappedType,
          status: job.status === 'processing' ? 'running' : job.status,
          progress: job.processedItems,
          total: job.totalItems,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          error: job.errors.length > 0 ? job.errors[job.errors.length - 1].error : undefined,
          results: {
            collected: job.type === 'collect' ? job.successfulItems : undefined,
            annotated: job.type === 'annotate' ? job.successfulItems : undefined,
            failed: job.failedItems > 0 ? job.failedItems : undefined
          }
        });

        if (job.status === 'processing' || job.status === 'pending') {
          activeJobs++;
        } else if (job.status === 'completed') {
          completedJobs++;
        } else if (job.status === 'failed') {
          failedJobs++;
        }
      }

      // Sort jobs by startedAt descending
      jobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      res.json({
        data: {
          stats: {
            totalImages: parseInt(imageStats.rows[0].total_images) || 0,
            pendingAnnotation: parseInt(coverageRow.unannotated) || 0,
            annotated: parseInt(coverageRow.annotated) || 0,
            failed: failedJobs,
            bySpecies,
            uniqueSpecies: parseInt(imageStats.rows[0].unique_species) || 0,
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
          },
          quota: {
            unsplash: unsplashQuota,
            anthropic: { remaining: 1000, limit: 1000, resetTime: null }
          },
          jobs: jobs.slice(0, 20), // Return last 20 jobs
          hasActiveJobs: activeJobs > 0
        }
      });

    } catch (err) {
      logError('Error fetching dashboard data', err as Error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

export default router;
