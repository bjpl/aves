/**
 * Admin Image Collection Routes
 *
 * CONCEPT: API endpoints for viewing and searching the image collection
 * WHY: Provides paginated, filterable access to images with search/sort capabilities
 * PATTERN: RESTful GET endpoints with query parameter validation
 *
 * Endpoints:
 * - GET /admin/images - Paginated image list with filters
 * - GET /admin/images/sources - Available image sources and configuration
 * - GET /admin/images/pending - Images without annotations
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../../database/connection';
import { VisionAIService } from '../../../services/VisionAIService';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../../middleware/optionalSupabaseAuth';
import { validateQuery } from '../../../middleware/validate';
import { error as logError, info } from '../../../utils/logger';
import { ImageListQuerySchema, DEFAULT_BIRD_SPECIES, UNSPLASH_API_URL, UNSPLASH_ACCESS_KEY } from './shared';
import { getUnsplashQuotaStatus, SpeciesRow } from './helpers';

const router = Router();

/**
 * GET /admin/images
 * Get paginated list of images with species info
 *
 * @auth Admin only
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - speciesId: Filter by species UUID
 * - annotationStatus: 'annotated' | 'unannotated' | 'all' (default: 'all')
 * - qualityFilter: 'high' | 'medium' | 'low' | 'unscored' | 'all'
 * - sortBy: 'createdAt' | 'speciesName' | 'annotationCount' | 'qualityScore'
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
router.get(
  '/',
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

      // Filter by quality score
      if (qualityFilter === 'high') {
        whereConditions.push('i.quality_score >= 80');
      } else if (qualityFilter === 'medium') {
        whereConditions.push('i.quality_score >= 60 AND i.quality_score < 80');
      } else if (qualityFilter === 'low') {
        whereConditions.push('i.quality_score < 60');
      } else if (qualityFilter === 'unscored') {
        whereConditions.push('i.quality_score IS NULL');
      }

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
 * GET /admin/images/sources
 * List available image sources and configuration status
 *
 * @auth Admin only
 */
router.get(
  '/sources',
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
 * GET /admin/images/pending
 * Get images without annotations (pending annotation)
 *
 * @auth Admin only
 */
router.get(
  '/pending',
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

export default router;
