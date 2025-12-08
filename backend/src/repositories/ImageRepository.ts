/**
 * Image Repository
 *
 * CONCEPT: Data access layer for image and species database operations
 * WHY: Separates database logic from business logic, improves testability
 * PATTERN: Repository pattern with typed queries and error handling
 *
 * Features:
 * - Species CRUD operations
 * - Image CRUD operations
 * - Annotation tracking
 * - Statistics and aggregations
 * - Bulk operations support
 */

import { Pool, QueryResult } from 'pg';
import { pool as defaultPool } from '../database/connection';
import { error as logError, info } from '../utils/logger';
import { UnsplashPhoto } from '../services/admin/UnsplashService';

// ============================================================================
// Types
// ============================================================================

export interface SpeciesData {
  scientificName: string;
  englishName: string;
  spanishName: string;
  order?: string;
  family?: string;
  habitats?: string[];
  sizeCategory?: string;
  primaryColors?: string[];
  conservationStatus?: string;
}

export interface SpeciesRow {
  id: string;
  scientificName: string;
  englishName: string;
  spanishName: string;
  order?: string;
  family?: string;
  habitats?: string[];
  sizeCategory?: string;
  primaryColors?: string[];
  conservationStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageData {
  speciesId: string;
  unsplashId?: string;
  url: string;
  width: number;
  height: number;
  description?: string;
  photographer?: string;
  photographerUsername?: string;
  thumbnailUrl?: string;
  qualityScore?: number;
}

export interface ImageRow {
  id: string;
  speciesId: string;
  unsplashId?: string;
  url: string;
  width: number;
  height: number;
  description?: string;
  photographer?: string;
  photographerUsername?: string;
  thumbnailUrl?: string;
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImageWithSpecies extends ImageRow {
  speciesScientificName: string;
  speciesEnglishName: string;
  speciesSpanishName: string;
  annotationStatus?: string;
  annotationData?: Record<string, unknown>;
  confidenceScore?: number;
}

export interface ImageStats {
  totalImages: number;
  uniqueSpecies: number;
  annotated: number;
  unannotated: number;
  averageQuality?: number;
}

export interface SpeciesImageCount {
  speciesId: string;
  scientificName: string;
  englishName: string;
  imageCount: number;
}

// ============================================================================
// Repository Implementation
// ============================================================================

export class ImageRepository {
  private pool: Pool;

  constructor(pool: Pool = defaultPool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Species Operations
  // ==========================================================================

  /**
   * Insert or update a species
   *
   * @param species - Species data
   * @returns Species ID
   */
  async upsertSpecies(species: SpeciesData): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO species (
          scientific_name, english_name, spanish_name,
          order_name, family_name, habitats, size_category,
          primary_colors, conservation_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (scientific_name) DO UPDATE SET
          english_name = EXCLUDED.english_name,
          spanish_name = EXCLUDED.spanish_name,
          order_name = EXCLUDED.order_name,
          family_name = EXCLUDED.family_name,
          habitats = EXCLUDED.habitats,
          size_category = EXCLUDED.size_category,
          primary_colors = EXCLUDED.primary_colors,
          conservation_status = EXCLUDED.conservation_status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          species.scientificName,
          species.englishName,
          species.spanishName,
          species.order || null,
          species.family || null,
          species.habitats || null,
          species.sizeCategory || null,
          species.primaryColors || null,
          species.conservationStatus || 'LC'
        ]
      );

      const speciesId = result.rows[0].id;
      info('Species upserted', { speciesId, scientificName: species.scientificName });
      return speciesId;

    } catch (err) {
      const error = err as Error;
      logError('Failed to upsert species', error, { species });
      throw new Error(`Failed to upsert species: ${error.message}`);
    }
  }

  /**
   * Get species by ID
   *
   * @param speciesId - Species UUID
   * @returns Species data or null if not found
   */
  async getSpeciesById(speciesId: string): Promise<SpeciesRow | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        WHERE id = $1`,
        [speciesId]
      );

      return result.rows[0] || null;

    } catch (err) {
      const error = err as Error;
      logError('Failed to get species by ID', error, { speciesId });
      throw new Error(`Failed to get species: ${error.message}`);
    }
  }

  /**
   * Get species by scientific name
   *
   * @param scientificName - Scientific name
   * @returns Species data or null if not found
   */
  async getSpeciesByScientificName(scientificName: string): Promise<SpeciesRow | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        WHERE scientific_name = $1`,
        [scientificName]
      );

      return result.rows[0] || null;

    } catch (err) {
      const error = err as Error;
      logError('Failed to get species by scientific name', error, { scientificName });
      throw new Error(`Failed to get species: ${error.message}`);
    }
  }

  /**
   * Get multiple species by IDs
   *
   * @param speciesIds - Array of species UUIDs
   * @returns Array of species data
   */
  async getSpeciesByIds(speciesIds: string[]): Promise<SpeciesRow[]> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        WHERE id = ANY($1)
        ORDER BY english_name`,
        [speciesIds]
      );

      return result.rows;

    } catch (err) {
      const error = err as Error;
      logError('Failed to get species by IDs', error, { count: speciesIds.length });
      throw new Error(`Failed to get species: ${error.message}`);
    }
  }

  // ==========================================================================
  // Image Operations
  // ==========================================================================

  /**
   * Insert or update an image from Unsplash
   *
   * @param speciesId - Species UUID
   * @param photo - Unsplash photo data
   * @param speciesName - Species name (for description fallback)
   * @returns Image ID
   */
  async upsertImageFromUnsplash(
    speciesId: string,
    photo: UnsplashPhoto,
    speciesName: string
  ): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO images (
          species_id, unsplash_id, url, width, height,
          description, photographer, photographer_username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (unsplash_id) DO UPDATE SET
          url = EXCLUDED.url,
          width = EXCLUDED.width,
          height = EXCLUDED.height,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
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

      const imageId = result.rows[0].id;
      info('Image upserted from Unsplash', { imageId, unsplashId: photo.id, speciesId });
      return imageId;

    } catch (err) {
      const error = err as Error;
      logError('Failed to upsert image from Unsplash', error, { unsplashId: photo.id });
      throw new Error(`Failed to upsert image: ${error.message}`);
    }
  }

  /**
   * Insert an uploaded image
   *
   * @param imageData - Image data
   * @returns Image ID
   */
  async insertImage(imageData: ImageData): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO images (
          species_id, unsplash_id, url, width, height,
          description, photographer, photographer_username,
          thumbnail_url, quality_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          imageData.speciesId,
          imageData.unsplashId || null,
          imageData.url,
          imageData.width,
          imageData.height,
          imageData.description || null,
          imageData.photographer || null,
          imageData.photographerUsername || null,
          imageData.thumbnailUrl || null,
          imageData.qualityScore || null
        ]
      );

      const imageId = result.rows[0].id;
      info('Image inserted', { imageId, speciesId: imageData.speciesId });
      return imageId;

    } catch (err) {
      const error = err as Error;
      logError('Failed to insert image', error, { imageData });
      throw new Error(`Failed to insert image: ${error.message}`);
    }
  }

  /**
   * Update image quality score
   *
   * @param imageId - Image UUID
   * @param qualityScore - Quality score (0-100)
   */
  async updateImageQuality(imageId: string, qualityScore: number): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE images
        SET quality_score = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        [qualityScore, imageId]
      );

      info('Image quality updated', { imageId, qualityScore });

    } catch (err) {
      const error = err as Error;
      logError('Failed to update image quality', error, { imageId });
      throw new Error(`Failed to update image quality: ${error.message}`);
    }
  }

  /**
   * Get images with pagination and filters
   *
   * @param options - Query options
   * @returns Paginated image results
   */
  async getImages(options: {
    page?: number;
    limit?: number;
    speciesId?: string;
    annotationStatus?: string;
  }): Promise<{ images: ImageWithSpecies[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: (string | number)[] = [];
      let paramCount = 0;

      if (options.speciesId) {
        paramCount++;
        whereClause += ` AND i.species_id = $${paramCount}`;
        params.push(options.speciesId);
      }

      if (options.annotationStatus) {
        paramCount++;
        whereClause += ` AND COALESCE(a.status, 'unannotated') = $${paramCount}`;
        params.push(options.annotationStatus);
      }

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total
        FROM images i
        LEFT JOIN ai_annotations a ON i.id = a.image_id
        ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataResult = await this.pool.query(
        `SELECT
          i.id, i.species_id as "speciesId", i.unsplash_id as "unsplashId",
          i.url, i.width, i.height, i.description,
          i.photographer, i.photographer_username as "photographerUsername",
          i.thumbnail_url as "thumbnailUrl", i.quality_score as "qualityScore",
          i.created_at as "createdAt", i.updated_at as "updatedAt",
          s.scientific_name as "speciesScientificName",
          s.english_name as "speciesEnglishName",
          s.spanish_name as "speciesSpanishName",
          a.status as "annotationStatus",
          a.annotation_data as "annotationData",
          a.confidence_score as "confidenceScore"
        FROM images i
        JOIN species s ON i.species_id = s.id
        LEFT JOIN ai_annotations a ON i.id = a.image_id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      return {
        images: dataResult.rows,
        total
      };

    } catch (err) {
      const error = err as Error;
      logError('Failed to get images', error, { options });
      throw new Error(`Failed to get images: ${error.message}`);
    }
  }

  /**
   * Delete an image
   *
   * @param imageId - Image UUID
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM images WHERE id = $1', [imageId]);
      info('Image deleted', { imageId });

    } catch (err) {
      const error = err as Error;
      logError('Failed to delete image', error, { imageId });
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Bulk delete images
   *
   * @param imageIds - Array of image UUIDs
   * @returns Number of deleted images
   */
  async bulkDeleteImages(imageIds: string[]): Promise<number> {
    try {
      const result = await this.pool.query(
        'DELETE FROM images WHERE id = ANY($1)',
        [imageIds]
      );

      const deletedCount = result.rowCount || 0;
      info('Bulk delete images', { deletedCount, requestedCount: imageIds.length });
      return deletedCount;

    } catch (err) {
      const error = err as Error;
      logError('Failed to bulk delete images', error, { count: imageIds.length });
      throw new Error(`Failed to bulk delete images: ${error.message}`);
    }
  }

  // ==========================================================================
  // Statistics Operations
  // ==========================================================================

  /**
   * Get image statistics
   *
   * @returns Image statistics
   */
  async getImageStats(): Promise<ImageStats> {
    try {
      const statsResult = await this.pool.query(`
        SELECT
          COUNT(DISTINCT i.id) as total_images,
          COUNT(DISTINCT i.species_id) as unique_species,
          AVG(i.quality_score) as avg_quality
        FROM images i
      `);

      const annotationResult = await this.pool.query(`
        SELECT
          COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as annotated,
          COUNT(CASE WHEN a.id IS NULL THEN 1 END) as unannotated
        FROM images i
        LEFT JOIN ai_annotations a ON i.id = a.image_id
      `);

      const stats = statsResult.rows[0];
      const annotations = annotationResult.rows[0];

      return {
        totalImages: parseInt(stats.total_images) || 0,
        uniqueSpecies: parseInt(stats.unique_species) || 0,
        annotated: parseInt(annotations.annotated) || 0,
        unannotated: parseInt(annotations.unannotated) || 0,
        averageQuality: stats.avg_quality ? parseFloat(stats.avg_quality) : undefined
      };

    } catch (err) {
      const error = err as Error;
      logError('Failed to get image stats', error);
      throw new Error(`Failed to get image stats: ${error.message}`);
    }
  }

  /**
   * Get image count per species
   *
   * @returns Array of species with image counts
   */
  async getImageCountBySpecies(): Promise<SpeciesImageCount[]> {
    try {
      const result = await this.pool.query(`
        SELECT
          s.id as "speciesId",
          s.scientific_name as "scientificName",
          s.english_name as "englishName",
          COUNT(i.id) as "imageCount"
        FROM species s
        LEFT JOIN images i ON s.id = i.species_id
        GROUP BY s.id, s.scientific_name, s.english_name
        HAVING COUNT(i.id) > 0
        ORDER BY "imageCount" DESC, s.english_name
      `);

      return result.rows;

    } catch (err) {
      const error = err as Error;
      logError('Failed to get image count by species', error);
      throw new Error(`Failed to get image count by species: ${error.message}`);
    }
  }
}

// ============================================================================
// Singleton Instance (for backward compatibility)
// ============================================================================

export const imageRepository = new ImageRepository();
