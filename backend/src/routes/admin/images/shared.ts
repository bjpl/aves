/**
 * Shared types, schemas, and utilities for admin image management routes
 *
 * CONCEPT: Centralized configuration and helpers for image management
 * WHY: Reduce duplication and maintain consistency across route modules
 * PATTERN: Export reusable types, schemas, constants, and utility functions
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { info } from '../../../utils/logger';

// ============================================================================
// Configuration
// ============================================================================

export const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
export const UNSPLASH_API_URL = 'https://api.unsplash.com';

// ============================================================================
// Default Species Data
// ============================================================================

export const DEFAULT_BIRD_SPECIES = [
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
// Job Tracking Types and Store
// ============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobProgress {
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
  metadata?: Record<string, unknown>;
}

export const jobStore = new Map<string, JobProgress>();

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

// Run cleanup every hour - store reference for test teardown
let cleanupIntervalId: NodeJS.Timeout | null = null;

// Only start cleanup interval in non-test environments
if (process.env.NODE_ENV !== 'test') {
  cleanupIntervalId = setInterval(cleanupOldJobs, 60 * 60 * 1000);
}

/**
 * Cleanup function for test teardown
 * Clears the cleanup interval to prevent open handles
 */
export function cleanupAdminImageManagement(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Increased to 1000 - admin routes are auth-protected
  message: { error: 'Too many admin requests. Please try again later.' },
  validate: { trustProxy: false }
});

// ============================================================================
// Upload Configuration
// ============================================================================

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
export const UPLOAD_IMAGES_DIR = path.join(UPLOAD_BASE_DIR, 'images');
export const UPLOAD_THUMBNAILS_DIR = path.join(UPLOAD_BASE_DIR, 'thumbnails');

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
export const upload = multer({
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
export async function processAndSaveImage(
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

export const CollectImagesSchema = z.object({
  speciesIds: z.array(z.string().uuid()).optional(),
  count: z.number().int().min(1).max(10).optional().default(2)
});

export const AnnotateImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional().default(false)
});

export const JobIdParamSchema = z.object({
  jobId: z.string().min(1)
});

export const BulkDeleteSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, 'At least one image ID required').max(100, 'Maximum 100 images per request')
});

export const BulkAnnotateSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, 'At least one image ID required').max(50, 'Maximum 50 images per request')
});

export const ImageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  speciesId: z.string().uuid().optional(),
  annotationStatus: z.enum(['annotated', 'unannotated', 'all']).optional().default('all'),
  qualityFilter: z.enum(['high', 'medium', 'low', 'unscored', 'all']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'speciesName', 'annotationCount', 'qualityScore']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const SingleImageParamSchema = z.object({
  imageId: z.string().uuid()
});

// ============================================================================
// Types
// ============================================================================

export interface UnsplashPhoto {
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

export interface ImageRow {
  id: string;
  url: string;
  species_id: string;
  species_name: string;
}
