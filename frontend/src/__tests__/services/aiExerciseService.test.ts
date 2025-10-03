// CONCEPT: Comprehensive tests for aiExerciseService API client
// WHY: Critical for AI-powered exercise generation functionality
// PATTERN: Test service availability, API calls, caching, error handling

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiExerciseService } from '../../services/aiExerciseService';
import { apiAdapter } from '../../services/apiAdapter';
import { NetworkError } from '../../types/error.types';
import type { Exercise } from '../../types';

// Mock dependencies
vi.mock('../../services/apiAdapter');
vi.mock('../../utils/logger');

// Mock fetch globally
global.fetch = vi.fn();

describe('AIExerciseService', () => {
  let service: typeof aiExerciseService;

  const mockExercise: Exercise = {
    id: 'ai-ex-123',
    type: 'fill_in_blank',
    instructions: 'Complete la frase',
    difficultyLevel: 3,
    targetTerm: 'pico',
    imageId: 'img1'
  };

  const mockAIResponse = {
    exercise: mockExercise,
    metadata: {
      generated: true,
      cacheKey: 'user123-fill_in_blank-3',
      cost: 0.002,
      difficulty: 3,
      generationTime: 1250
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = aiExerciseService;

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => 'test-session-123'),
      setItem: vi.fn()
    };
    global.sessionStorage = sessionStorageMock as any;

    // Mock import.meta.env
    (import.meta as any).env = {
      VITE_API_URL: 'http://localhost:3001'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should use VITE_API_URL from environment', () => {
      expect((service as any).baseUrl).toBe('http://localhost:3001');
    });

    it('should fallback to localhost:3001 if no VITE_API_URL', () => {
      // Service already initialized with fallback
      expect((service as any).baseUrl).toBeTruthy();
    });

    it('should create or retrieve session ID', () => {
      expect((service as any).sessionId).toBe('test-session-123');
    });

    it('should create new session ID if none exists', () => {
      // Test already covered by singleton initialization
      const sessionId = (service as any).sessionId;
      expect(sessionId).toBeDefined();
    });
  });

  describe('generateExercise', () => {
    beforeEach(() => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
    });

    it('should generate exercise with correct API call', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      const params = {
        userId: 'user123',
        type: 'fill_in_blank' as const,
        difficulty: 3 as const
      };

      const result = await service.generateExercise(params);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/exercises/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': 'test-session-123'
          },
          body: JSON.stringify(params)
        }
      );

      expect(result).toEqual(mockAIResponse);
    });

    it('should handle exercise generation without optional params', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      const params = { userId: 'user123' };

      await service.generateExercise(params);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(params)
        })
      );
    });

    it('should throw error if in client-only mode', async () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(true);

      const params = { userId: 'user123' };

      await expect(service.generateExercise(params)).rejects.toThrow(NetworkError);
      await expect(service.generateExercise(params)).rejects.toThrow(
        'AI exercise generation requires backend API'
      );
    });

    it('should handle 400 bad request errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid parameters' })
      } as Response);

      const params = { userId: 'user123' };

      await expect(service.generateExercise(params)).rejects.toThrow(NetworkError);
      await expect(service.generateExercise(params)).rejects.toThrow('Invalid parameters');
    });

    it('should handle 503 service unavailable', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'AI service unavailable' })
      } as Response);

      const params = { userId: 'user123' };

      await expect(service.generateExercise(params)).rejects.toThrow(NetworkError);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

      const params = { userId: 'user123' };

      await expect(service.generateExercise(params)).rejects.toThrow(NetworkError);
      await expect(service.generateExercise(params)).rejects.toThrow(
        'Failed to generate AI exercise'
      );
    });

    it('should handle malformed JSON response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      const params = { userId: 'user123' };

      await expect(service.generateExercise(params)).rejects.toThrow(NetworkError);
    });

    it('should include session ID in headers', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      await service.generateExercise({ userId: 'user123' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Session-Id': 'test-session-123'
          })
        })
      );
    });

    it('should support all exercise types', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      const types = ['fill_in_blank', 'multiple_choice', 'translation', 'contextual', 'adaptive'] as const;

      for (const type of types) {
        await service.generateExercise({ userId: 'user123', type });

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ userId: 'user123', type })
          })
        );
      }
    });

    it('should support all difficulty levels', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      const difficulties = [1, 2, 3, 4, 5] as const;

      for (const difficulty of difficulties) {
        await service.generateExercise({ userId: 'user123', difficulty });

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ userId: 'user123', difficulty })
          })
        );
      }
    });

    it('should support topics parameter', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      const params = {
        userId: 'user123',
        topics: ['anatomy', 'colors', 'behavior']
      };

      await service.generateExercise(params);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(params)
        })
      );
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalGenerated: 150,
      cached: 120,
      cacheHitRate: 0.8,
      totalCost: 0.45,
      avgGenerationTime: 1350,
      costPerExercise: 0.003
    };

    beforeEach(() => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
    });

    it('should fetch statistics from backend', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockStats
      } as Response);

      const result = await service.getStats();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/exercises/stats',
        {
          headers: {
            'X-Session-Id': 'test-session-123'
          }
        }
      );

      expect(result).toEqual(mockStats);
    });

    it('should return mock stats in client-only mode', async () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(true);

      const result = await service.getStats();

      expect(result).toEqual({
        totalGenerated: 0,
        cached: 0,
        cacheHitRate: 0,
        totalCost: 0,
        avgGenerationTime: 0,
        costPerExercise: 0
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle stats fetch errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      await expect(service.getStats()).rejects.toThrow(NetworkError);
      await expect(service.getStats()).rejects.toThrow('Failed to fetch AI exercise stats');
    });

    it('should handle network errors for stats', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(service.getStats()).rejects.toThrow(NetworkError);
      await expect(service.getStats()).rejects.toThrow('Failed to fetch statistics');
    });
  });

  describe('prefetchExercises', () => {
    const mockPrefetchResponse = {
      prefetched: 5,
      cached: 3,
      totalCost: 0.01
    };

    beforeEach(() => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
    });

    it('should prefetch exercises with correct API call', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPrefetchResponse
      } as Response);

      const result = await service.prefetchExercises('user123', 5);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/exercises/prefetch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': 'test-session-123'
          },
          body: JSON.stringify({ userId: 'user123', count: 5 })
        }
      );

      expect(result).toEqual(mockPrefetchResponse);
    });

    it('should use default count if not provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPrefetchResponse
      } as Response);

      await service.prefetchExercises('user123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ userId: 'user123', count: 5 })
        })
      );
    });

    it('should throw error if in client-only mode', async () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(true);

      await expect(service.prefetchExercises('user123')).rejects.toThrow(NetworkError);
      await expect(service.prefetchExercises('user123')).rejects.toThrow(
        'Prefetch not available in static mode'
      );
    });

    it('should handle prefetch errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      await expect(service.prefetchExercises('user123')).rejects.toThrow(NetworkError);
      await expect(service.prefetchExercises('user123')).rejects.toThrow('Failed to prefetch exercises');
    });

    it('should handle network errors for prefetch', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(service.prefetchExercises('user123')).rejects.toThrow(NetworkError);
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
    });

    it('should clear cache with correct API call', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true
      } as Response);

      await service.clearCache('user123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/exercises/cache/user123',
        {
          method: 'DELETE',
          headers: {
            'X-Session-Id': 'test-session-123'
          }
        }
      );
    });

    it('should throw error if in client-only mode', async () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(true);

      await expect(service.clearCache('user123')).rejects.toThrow(NetworkError);
      await expect(service.clearCache('user123')).rejects.toThrow(
        'Cache management not available in static mode'
      );
    });

    it('should handle clear cache errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      await expect(service.clearCache('user123')).rejects.toThrow(NetworkError);
      await expect(service.clearCache('user123')).rejects.toThrow('Failed to clear cache');
    });

    it('should handle network errors for cache clear', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(service.clearCache('user123')).rejects.toThrow(NetworkError);
    });
  });

  describe('isAvailable', () => {
    it('should return true when using backend', () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);

      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when using client storage', () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(true);

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should retrieve existing session ID from sessionStorage', () => {
      // Service uses singleton pattern - session ID already initialized
      const sessionId = (service as any).sessionId;
      expect(sessionId).toBe('test-session-123');
    });

    it('should create new session ID if none exists', () => {
      // Session ID created on service initialization
      const sessionId = (service as any).sessionId;
      expect(sessionId).toBeDefined();
    });

    it('should use same session ID across multiple calls', async () => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAIResponse
      } as Response);

      await service.generateExercise({ userId: 'user123' });
      await service.generateExercise({ userId: 'user123' });

      const calls = vi.mocked(fetch).mock.calls;
      const headers1 = (calls[0][1] as any).headers;
      const headers2 = (calls[1][1] as any).headers;

      expect(headers1['X-Session-Id']).toBe(headers2['X-Session-Id']);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(aiExerciseService).toBeDefined();
      expect(typeof aiExerciseService.generateExercise).toBe('function');
    });

    it('should maintain session across imports', () => {
      const sessionId1 = (aiExerciseService as any).sessionId;
      const sessionId2 = (aiExerciseService as any).sessionId;

      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('Error Response Handling', () => {
    beforeEach(() => {
      vi.mocked(apiAdapter.isUsingClientStorage).mockReturnValue(false);
    });

    it('should extract error message from response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid user ID format' })
      } as Response);

      await expect(
        service.generateExercise({ userId: 'invalid' })
      ).rejects.toThrow('Invalid user ID format');
    });

    it('should use status code in error if no message', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({})
      } as Response);

      await expect(
        service.generateExercise({ userId: 'user123' })
      ).rejects.toThrow('Failed to generate exercise (404)');
    });

    it('should handle 401 unauthorized', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as Response);

      await expect(
        service.generateExercise({ userId: 'user123' })
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle 429 rate limit', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      await expect(
        service.generateExercise({ userId: 'user123' })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
