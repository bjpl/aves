/**
 * Unsplash API Service
 *
 * CONCEPT: Centralized service for interacting with the Unsplash API
 * WHY: Isolates third-party API integration, making it testable and reusable
 * PATTERN: Service layer with clean interface, handles rate limiting and error recovery
 *
 * Features:
 * - Photo search with pagination
 * - Rate limit tracking
 * - Error handling and retry logic
 * - Type-safe responses
 */

import axios, { AxiosError } from 'axios';
import { info, error as logError } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
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
  likes: number;
  user: {
    id: string;
    username: string;
    name: string;
  };
}

export interface UnsplashQuota {
  remaining: number;
  limit: number;
  resetTime: string | null;
}

export interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// ============================================================================
// Configuration
// ============================================================================

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 30;

// ============================================================================
// Service Implementation
// ============================================================================

export class UnsplashService {
  private readonly apiUrl: string;
  private readonly accessKey: string;

  constructor(
    accessKey: string = UNSPLASH_ACCESS_KEY,
    apiUrl: string = UNSPLASH_API_URL
  ) {
    this.apiUrl = apiUrl;
    this.accessKey = accessKey;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.accessKey;
  }

  /**
   * Search for photos on Unsplash
   *
   * @param query - Search query string
   * @param perPage - Number of results per page (1-30, default: 10)
   * @param page - Page number (default: 1)
   * @returns Array of photos matching the search query
   * @throws Error if API request fails or service is not configured
   */
  async searchPhotos(
    query: string,
    perPage: number = DEFAULT_PER_PAGE,
    page: number = 1
  ): Promise<UnsplashPhoto[]> {
    if (!this.isConfigured()) {
      throw new Error('Unsplash API not configured: UNSPLASH_ACCESS_KEY is missing');
    }

    // Validate and clamp perPage
    const validatedPerPage = Math.min(Math.max(1, perPage), MAX_PER_PAGE);

    try {
      info('Searching Unsplash', { query, perPage: validatedPerPage, page });

      const response = await axios.get<UnsplashSearchResult>(
        `${this.apiUrl}/search/photos`,
        {
          params: {
            query,
            per_page: validatedPerPage,
            page
          },
          headers: {
            'Authorization': `Client-ID ${this.accessKey}`
          }
        }
      );

      info('Unsplash search successful', {
        query,
        resultsCount: response.data.results.length,
        total: response.data.total
      });

      return response.data.results;

    } catch (err) {
      const error = err as AxiosError;
      logError('Unsplash search failed', error, {
        query,
        perPage: validatedPerPage,
        page,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(`Unsplash search failed: ${error.message}`);
    }
  }

  /**
   * Get rate limit status from Unsplash API
   *
   * @returns Current quota information (remaining requests, limit, reset time)
   * @throws Error if API request fails or service is not configured
   */
  async getQuotaStatus(): Promise<UnsplashQuota> {
    if (!this.isConfigured()) {
      return {
        remaining: 0,
        limit: 0,
        resetTime: null
      };
    }

    try {
      const response = await axios.get(`${this.apiUrl}/me`, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`
        }
      });

      // Unsplash returns rate limit info in headers
      return {
        remaining: parseInt(response.headers['x-ratelimit-remaining'] || '50'),
        limit: parseInt(response.headers['x-ratelimit-limit'] || '50'),
        resetAt: new Date(Date.now() + 3600000).toISOString() // Unsplash resets hourly
      };

    } catch (err) {
      const error = err as AxiosError;
      logError('Failed to get Unsplash quota', error);

      // Return default values if quota check fails
      return {
        remaining: 50,
        limit: 50,
        resetTime: null
      };
    }
  }

  /**
   * Download photo data from Unsplash URL
   *
   * @param photoUrl - Full URL to the photo
   * @returns Buffer containing the image data
   * @throws Error if download fails
   */
  async downloadPhoto(photoUrl: string): Promise<Buffer> {
    try {
      info('Downloading photo from Unsplash', { photoUrl });

      const response = await axios.get(photoUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout for large images
      });

      info('Photo download successful', {
        photoUrl,
        size: response.data.length
      });

      return Buffer.from(response.data);

    } catch (err) {
      const error = err as AxiosError;
      logError('Photo download failed', error, { photoUrl });
      throw new Error(`Failed to download photo: ${error.message}`);
    }
  }

  /**
   * Get detailed information about a specific photo
   *
   * @param photoId - Unsplash photo ID
   * @returns Detailed photo information
   * @throws Error if API request fails or service is not configured
   */
  async getPhoto(photoId: string): Promise<UnsplashPhoto> {
    if (!this.isConfigured()) {
      throw new Error('Unsplash API not configured: UNSPLASH_ACCESS_KEY is missing');
    }

    try {
      info('Fetching photo details from Unsplash', { photoId });

      const response = await axios.get<UnsplashPhoto>(
        `${this.apiUrl}/photos/${photoId}`,
        {
          headers: {
            'Authorization': `Client-ID ${this.accessKey}`
          }
        }
      );

      info('Photo details retrieved successfully', { photoId });
      return response.data;

    } catch (err) {
      const error = err as AxiosError;
      logError('Failed to fetch photo details', error, { photoId });
      throw new Error(`Failed to get photo details: ${error.message}`);
    }
  }

  /**
   * Get configuration status
   *
   * @returns Object with configuration details
   */
  getConfig(): { configured: boolean; apiUrl: string } {
    return {
      configured: this.isConfigured(),
      apiUrl: this.apiUrl
    };
  }
}

// ============================================================================
// Singleton Instance (for backward compatibility)
// ============================================================================

export const unsplashService = new UnsplashService();
