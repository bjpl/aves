import axios from 'axios';
import { UnsplashPhoto, ImageSearchResult } from '../../../shared/types/image.types';
import { error as logError, warn } from '../utils/logger';

// Note: In production, these should be environment variables
const UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

export class UnsplashService {
  private rateLimitRemaining: number = 50;
  private rateLimitResetTime: Date | null = null;

  async searchPhotos(query: string, page: number = 1, perPage: number = 10): Promise<ImageSearchResult> {
    if (!UNSPLASH_ACCESS_KEY) {
      warn('Unsplash API key not configured');
      return { query, results: [], total: 0, totalPages: 0 };
    }

    try {
      const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        },
        params: {
          query,
          page,
          per_page: perPage,
          orientation: 'landscape'
        }
      });

      // Update rate limit info from headers
      this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '50');
      const resetTime = response.headers['x-ratelimit-reset'];
      if (resetTime) {
        this.rateLimitResetTime = new Date(parseInt(resetTime) * 1000);
      }

      return {
        query,
        results: response.data.results,
        total: response.data.total,
        totalPages: response.data.total_pages
      };
    } catch (error) {
      logError('Unsplash API error:', error);
      throw error;
    }
  }

  async getPhoto(photoId: string): Promise<UnsplashPhoto | null> {
    if (!UNSPLASH_ACCESS_KEY) {
      return null;
    }

    try {
      const response = await axios.get(`${UNSPLASH_API_URL}/photos/${photoId}`, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });

      return response.data;
    } catch (error) {
      logError('Failed to fetch photo:', error);
      return null;
    }
  }

  async downloadPhoto(photo: UnsplashPhoto): Promise<void> {
    // Trigger download tracking as per Unsplash guidelines
    if (photo.links?.html) {
      try {
        await axios.get(`${UNSPLASH_API_URL}/photos/${photo.id}/download`, {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        });
      } catch (error) {
        logError('Failed to track download:', error);
      }
    }
  }

  getRateLimitStatus() {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: this.rateLimitResetTime,
      isLimited: this.rateLimitRemaining < 5
    };
  }

  generateAttribution(photo: UnsplashPhoto): string {
    return `Photo by ${photo.user.name} on Unsplash`;
  }

  generateAttributionHtml(photo: UnsplashPhoto): string {
    return `Photo by <a href="${photo.user.links.html}?utm_source=aves&utm_medium=referral">${photo.user.name}</a> on <a href="https://unsplash.com?utm_source=aves&utm_medium=referral">Unsplash</a>`;
  }

  // Check if photo is relevant to bird species
  isRelevantPhoto(photo: UnsplashPhoto, speciesName: string): boolean {
    const relevantTags = ['bird', 'ave', 'wildlife', 'nature', 'animal'];
    const photoTags = photo.tags?.map(t => t.title.toLowerCase()) || [];

    // Check description
    const description = (photo.description || photo.alt_description || '').toLowerCase();
    const hasSpeciesName = description.includes(speciesName.toLowerCase());

    // Check tags
    const hasRelevantTag = photoTags.some(tag =>
      relevantTags.some(relevant => tag.includes(relevant))
    );

    return hasSpeciesName || hasRelevantTag;
  }
}

export const unsplashService = new UnsplashService();