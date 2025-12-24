/**
 * Helper functions for admin image management
 *
 * CONCEPT: Reusable utility functions for image collection and database operations
 * WHY: Centralize business logic to improve maintainability and testability
 * PATTERN: Pure functions and async operations with proper error handling
 */

import axios from 'axios';
import { pool } from '../../../database/connection';
import { error as logError, info } from '../../../utils/logger';
import { UNSPLASH_ACCESS_KEY, UNSPLASH_API_URL, DEFAULT_BIRD_SPECIES, UnsplashPhoto } from './shared';

// ============================================================================
// Types
// ============================================================================

export interface SpeciesRow {
  id: string;
  englishName: string;
  scientificName: string;
  spanishName: string;
}

export interface ImageBySpeciesRow {
  species: string;
  count: string;
}

// ============================================================================
// Unsplash API Functions
// ============================================================================

/**
 * Search Unsplash for bird images
 */
export async function searchUnsplash(query: string, perPage: number = 2): Promise<UnsplashPhoto[]> {
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
export async function getUnsplashQuotaStatus(): Promise<{
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

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Insert species into database
 */
export async function insertSpecies(species: typeof DEFAULT_BIRD_SPECIES[0]): Promise<string> {
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
export async function insertImage(
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique job ID
 */
export function generateJobId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
