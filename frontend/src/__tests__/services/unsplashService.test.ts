// CONCEPT: Comprehensive tests for unsplashService image API client
// WHY: Critical for image search functionality in admin interface
// PATTERN: Test API calls, rate limiting, error handling, attribution

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { UnsplashService, unsplashService } from '../../services/unsplashService';
import type { UnsplashPhoto } from '../../../../shared/types/image.types';

// Mock axios
vi.mock('axios');

// Mock logger
vi.mock('../../utils/logger');

describe('UnsplashService', () => {
  let service: UnsplashService;

  const mockPhoto: UnsplashPhoto = {
    id: 'photo-123',
    urls: {
      raw: 'https://images.unsplash.com/photo-123?raw',
      full: 'https://images.unsplash.com/photo-123?full',
      regular: 'https://images.unsplash.com/photo-123?regular',
      small: 'https://images.unsplash.com/photo-123?small',
      thumb: 'https://images.unsplash.com/photo-123?thumb'
    },
    alt_description: 'A beautiful cardinal bird',
    description: 'Northern Cardinal perched on branch',
    user: {
      name: 'Test Photographer',
      links: {
        html: 'https://unsplash.com/@testphotographer'
      }
    },
    links: {
      html: 'https://unsplash.com/photos/photo-123'
    },
    tags: [
      { title: 'bird' },
      { title: 'cardinal' },
      { title: 'wildlife' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Use Vitest's proper env mocking
    vi.stubEnv('REACT_APP_UNSPLASH_ACCESS_KEY', 'test-api-key');

    service = new UnsplashService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('searchPhotos', () => {
    it('should search photos with correct API call', async () => {
      const mockResponse = {
        data: {
          results: [mockPhoto],
          total: 100,
          total_pages: 10
        },
        headers: {
          'x-ratelimit-remaining': '45',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const result = await service.searchPhotos('cardinal', 1, 10);

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.unsplash.com/search/photos',
        {
          headers: {
            Authorization: 'Client-ID test-api-key'
          },
          params: {
            query: 'cardinal',
            page: 1,
            per_page: 10,
            orientation: 'landscape'
          }
        }
      );

      expect(result).toEqual({
        query: 'cardinal',
        results: [mockPhoto],
        total: 100,
        totalPages: 10
      });
    });

    it('should use default pagination parameters', async () => {
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {}
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('cardinal');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            page: 1,
            per_page: 10
          })
        })
      );
    });

    it('should update rate limit info from response headers', async () => {
      const resetTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {
          'x-ratelimit-remaining': '30',
          'x-ratelimit-reset': String(resetTimestamp)
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('test');

      const status = service.getRateLimitStatus();
      expect(status.remaining).toBe(30);
      expect(status.resetTime).toBeInstanceOf(Date);
    });

    it('should return empty results if no API key configured', async () => {
      vi.stubEnv('REACT_APP_UNSPLASH_ACCESS_KEY', '');
      const newService = new UnsplashService();

      const result = await newService.searchPhotos('cardinal');

      expect(result).toEqual({
        query: 'cardinal',
        results: [],
        total: 0,
        totalPages: 0
      });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('API Error'));

      await expect(service.searchPhotos('cardinal')).rejects.toThrow('API Error');
    });

    it('should handle 403 forbidden errors', async () => {
      const error = {
        response: {
          status: 403,
          data: { errors: ['Rate limit exceeded'] }
        }
      };

      vi.mocked(axios.get).mockRejectedValue(error);

      await expect(service.searchPhotos('cardinal')).rejects.toBeTruthy();
    });

    it('should request landscape orientation', async () => {
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {}
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('bird');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            orientation: 'landscape'
          })
        })
      );
    });
  });

  describe('getPhoto', () => {
    it('should fetch individual photo by ID', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockPhoto });

      const result = await service.getPhoto('photo-123');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/photo-123',
        {
          headers: {
            Authorization: 'Client-ID test-api-key'
          }
        }
      );
      expect(result).toEqual(mockPhoto);
    });

    it('should return null if no API key configured', async () => {
      vi.stubEnv('REACT_APP_UNSPLASH_ACCESS_KEY', '');
      const newService = new UnsplashService();

      const result = await newService.getPhoto('photo-123');

      expect(result).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle fetch errors and return null', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Not found'));

      const result = await service.getPhoto('invalid-id');

      expect(result).toBeNull();
    });

    it('should handle 404 not found errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { errors: ['Photo not found'] }
        }
      };

      vi.mocked(axios.get).mockRejectedValue(error);

      const result = await service.getPhoto('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('downloadPhoto', () => {
    it('should trigger download tracking', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} });

      await service.downloadPhoto(mockPhoto);

      expect(axios.get).toHaveBeenCalledWith(
        `https://api.unsplash.com/photos/${mockPhoto.id}/download`,
        {
          headers: {
            Authorization: 'Client-ID test-api-key'
          }
        }
      );
    });

    it('should handle tracking errors silently', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Tracking failed'));

      // Should not throw
      await expect(service.downloadPhoto(mockPhoto)).resolves.toBeUndefined();
    });

    it('should not track if photo has no link', async () => {
      const photoWithoutLink = { ...mockPhoto, links: undefined };

      await service.downloadPhoto(photoWithoutLink);

      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Status', () => {
    it('should return default rate limit status', () => {
      const status = service.getRateLimitStatus();

      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(status).toHaveProperty('isLimited');
      expect(typeof status.isLimited).toBe('boolean');
    });

    it('should indicate limited status when remaining < 5', async () => {
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {
          'x-ratelimit-remaining': '3'
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('test');

      const status = service.getRateLimitStatus();
      expect(status.isLimited).toBe(true);
    });

    it('should not indicate limited when remaining >= 5', async () => {
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {
          'x-ratelimit-remaining': '25'
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('test');

      const status = service.getRateLimitStatus();
      expect(status.isLimited).toBe(false);
    });

    it('should parse reset time correctly', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {
          'x-ratelimit-remaining': '40',
          'x-ratelimit-reset': String(futureTimestamp)
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await service.searchPhotos('test');

      const status = service.getRateLimitStatus();
      expect(status.resetTime).toBeInstanceOf(Date);
      expect(status.resetTime!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Attribution Methods', () => {
    it('should generate plain text attribution', () => {
      const attribution = service.generateAttribution(mockPhoto);

      expect(attribution).toBe('Photo by Test Photographer on Unsplash');
    });

    it('should generate HTML attribution with links', () => {
      const html = service.generateAttributionHtml(mockPhoto);

      expect(html).toContain('Test Photographer');
      expect(html).toContain('Unsplash');
      expect(html).toContain('href=');
      expect(html).toContain('utm_source=aves');
      expect(html).toContain('utm_medium=referral');
    });

    it('should include photographer link in HTML attribution', () => {
      const html = service.generateAttributionHtml(mockPhoto);

      expect(html).toContain(mockPhoto.user.links.html);
    });

    it('should include Unsplash link in HTML attribution', () => {
      const html = service.generateAttributionHtml(mockPhoto);

      expect(html).toContain('https://unsplash.com?utm_source=aves');
    });
  });

  describe('isRelevantPhoto', () => {
    it('should identify relevant photo by species name in description', () => {
      const isRelevant = service.isRelevantPhoto(mockPhoto, 'cardinal');

      expect(isRelevant).toBe(true);
    });

    it('should identify relevant photo by bird tag', () => {
      const isRelevant = service.isRelevantPhoto(mockPhoto, 'unknown species');

      expect(isRelevant).toBe(true); // Has 'bird' tag
    });

    it('should identify relevant photo by wildlife tag', () => {
      const photoWithWildlife: UnsplashPhoto = {
        ...mockPhoto,
        tags: [{ title: 'wildlife' }, { title: 'nature' }]
      };

      const isRelevant = service.isRelevantPhoto(photoWithWildlife, 'unknown');

      expect(isRelevant).toBe(true);
    });

    it('should reject irrelevant photo', () => {
      const irrelevantPhoto: UnsplashPhoto = {
        ...mockPhoto,
        description: 'A car on the road',
        alt_description: 'Red sports car',
        tags: [{ title: 'car' }, { title: 'vehicle' }]
      };

      const isRelevant = service.isRelevantPhoto(irrelevantPhoto, 'cardinal');

      expect(isRelevant).toBe(false);
    });

    it('should handle photo with no tags', () => {
      const photoNoTags: UnsplashPhoto = {
        ...mockPhoto,
        tags: []
      };

      const isRelevant = service.isRelevantPhoto(photoNoTags, 'cardinal');

      expect(isRelevant).toBe(true); // Matches description
    });

    it('should handle photo with no description', () => {
      const photoNoDesc: UnsplashPhoto = {
        ...mockPhoto,
        description: null,
        alt_description: null,
        tags: [{ title: 'bird' }]
      };

      const isRelevant = service.isRelevantPhoto(photoNoDesc, 'anything');

      expect(isRelevant).toBe(true); // Has bird tag
    });

    it('should be case insensitive for species name matching', () => {
      const photoUppercase: UnsplashPhoto = {
        ...mockPhoto,
        description: 'NORTHERN CARDINAL in winter'
      };

      const isRelevant = service.isRelevantPhoto(photoUppercase, 'northern cardinal');

      expect(isRelevant).toBe(true);
    });

    it('should match partial species names', () => {
      const isRelevant = service.isRelevantPhoto(mockPhoto, 'northern');

      expect(isRelevant).toBe(true);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(unsplashService).toBeInstanceOf(UnsplashService);
    });

    it('should maintain state across imports', async () => {
      const mockResponse = {
        data: { results: [], total: 0, total_pages: 0 },
        headers: {
          'x-ratelimit-remaining': '15'
        }
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      await unsplashService.searchPhotos('test');

      const status = unsplashService.getRateLimitStatus();
      expect(status.remaining).toBe(15);
    });
  });
});
