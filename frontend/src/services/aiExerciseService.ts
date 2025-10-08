// CONCEPT: AI Exercise Generation Service
// WHY: Provides API client for AI-generated exercises with proper typing and error handling
// PATTERN: Service layer with typed API calls following apiAdapter patterns

import { apiAdapter } from './apiAdapter';
import { NetworkError } from '../types/error.types';
import { error as logError } from '../utils/logger';
import type { Exercise } from '../types';

// API Response Types
export interface AIExerciseResponse {
  exercise: Exercise;
  metadata: {
    generated: boolean;      // true = AI generated, false = cached
    cacheKey: string;
    cost: number;            // Estimated API cost in USD
    difficulty: number;      // 1-5 difficulty level
    generationTime?: number; // Time taken in ms
  };
}

export interface AIExerciseStats {
  totalGenerated: number;
  cached: number;
  cacheHitRate: number;
  totalCost: number;
  avgGenerationTime: number;
  costPerExercise: number;
}

export interface PrefetchResponse {
  prefetched: number;
  cached: number;
  totalCost: number;
}

// Exercise generation parameters
export interface GenerateExerciseParams {
  userId: string;
  type?: 'fill_in_blank' | 'multiple_choice' | 'translation' | 'contextual' | 'adaptive';
  difficulty?: 1 | 2 | 3 | 4 | 5;
  topics?: string[];
}

class AIExerciseService {
  private readonly baseUrl: string;
  private readonly sessionId: string;

  constructor() {
    // Use backend API URL - AI exercise generation requires backend
    const env = import.meta.env as Record<string, unknown> | undefined;
    const apiUrl = env?.VITE_API_URL as string | undefined;
    this.baseUrl = apiUrl || 'http://localhost:3001';
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Generate AI exercise based on user context
   */
  async generateExercise(params: GenerateExerciseParams): Promise<AIExerciseResponse> {
    // Check if we're in client-only mode (GitHub Pages)
    if (apiAdapter.isUsingClientStorage()) {
      throw new NetworkError(
        'AI exercise generation requires backend API. Feature not available in static mode.',
        503
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/exercises/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new NetworkError(
          error.error || `Failed to generate exercise (${response.status})`,
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logError('AI exercise generation failed:', error instanceof Error ? error : new Error(String(error)));
      throw error instanceof NetworkError ? error : new NetworkError(
        'Failed to generate AI exercise. Please try again.',
        500
      );
    }
  }

  /**
   * Get AI exercise generation statistics
   */
  async getStats(): Promise<AIExerciseStats> {
    if (apiAdapter.isUsingClientStorage()) {
      // Return mock stats for client-only mode
      return {
        totalGenerated: 0,
        cached: 0,
        cacheHitRate: 0,
        totalCost: 0,
        avgGenerationTime: 0,
        costPerExercise: 0,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/exercises/stats`, {
        headers: {
          'X-Session-Id': this.sessionId,
        },
      });

      if (!response.ok) {
        throw new NetworkError('Failed to fetch AI exercise stats', response.status);
      }

      return response.json();
    } catch (error) {
      logError('Failed to fetch AI stats:', error instanceof Error ? error : new Error(String(error)));
      throw error instanceof NetworkError ? error : new NetworkError(
        'Failed to fetch statistics',
        500
      );
    }
  }

  /**
   * Prefetch multiple exercises for performance
   * Useful for preloading exercises before practice session
   */
  async prefetchExercises(userId: string, count: number = 5): Promise<PrefetchResponse> {
    if (apiAdapter.isUsingClientStorage()) {
      throw new NetworkError('Prefetch not available in static mode', 503);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/exercises/prefetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify({ userId, count }),
      });

      if (!response.ok) {
        throw new NetworkError('Failed to prefetch exercises', response.status);
      }

      return response.json();
    } catch (error) {
      logError('Prefetch failed:', error instanceof Error ? error : new Error(String(error)));
      throw error instanceof NetworkError ? error : new NetworkError(
        'Failed to prefetch exercises',
        500
      );
    }
  }

  /**
   * Clear cached exercises for a user (admin/testing)
   */
  async clearCache(userId: string): Promise<void> {
    if (apiAdapter.isUsingClientStorage()) {
      throw new NetworkError('Cache management not available in static mode', 503);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/exercises/cache/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': this.sessionId,
        },
      });

      if (!response.ok) {
        throw new NetworkError('Failed to clear cache', response.status);
      }
    } catch (error) {
      logError('Clear cache failed:', error instanceof Error ? error : new Error(String(error)));
      throw error instanceof NetworkError ? error : new NetworkError(
        'Failed to clear cache',
        500
      );
    }
  }

  /**
   * Check if AI exercise generation is available
   */
  isAvailable(): boolean {
    return !apiAdapter.isUsingClientStorage();
  }

  /**
   * Get or create session ID for tracking
   */
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('aves-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('aves-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Reset session ID (for testing purposes)
   * @internal
   */
  __resetSessionId(): void {
    (this as { -readonly [K in keyof this]: this[K] }).sessionId = this.getOrCreateSessionId();
  }
}

// Export singleton instance
export const aiExerciseService = new AIExerciseService();
