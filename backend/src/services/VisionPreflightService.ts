/**
 * Vision Preflight Service
 * Lightweight bird detection for pre-checking images before full annotation
 * Optimized for minimal token usage: 500-1000 tokens vs 8000 for full annotation
 *
 * Cost Optimization:
 * - Input tokens: ~500-700 (image + short prompt)
 * - Output tokens: ~100-200 (concise response)
 * - Total: ~600-900 tokens vs 8000 for full annotation
 * - Savings: 87.5% on images that fail pre-check
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { info, error as logError } from '../utils/logger';

export interface BirdDetectionResult {
  birdDetected: boolean;
  confidence: number; // 0-1 score
  approximateSize: number; // percentage of image, 0-100
  position: { x: number; y: number }; // normalized 0-1
  occlusion: number; // percentage obscured, 0-100
  quickAssessment?: string; // Brief quality note
}

export interface PreflightStats {
  totalChecks: number;
  birdDetected: number;
  birdRejected: number;
  avgConfidence: number;
  avgTokensUsed: number;
  cacheHits: number;
}

/**
 * VisionPreflightService for lightweight bird detection
 * Fast pre-check to avoid wasting API calls on unsuitable images
 */
export class VisionPreflightService {
  private client: Anthropic;
  private apiKey: string;

  // In-memory cache for preflight results
  private preflightCache: Map<string, { result: BirdDetectionResult; timestamp: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
  private static readonly MAX_CACHE_SIZE = 500; // Smaller cache for preflight checks

  // Performance tracking
  private stats: PreflightStats = {
    totalChecks: 0,
    birdDetected: 0,
    birdRejected: 0,
    avgConfidence: 0,
    avgTokensUsed: 0,
    cacheHits: 0
  };

  // Quality thresholds
  private static readonly MIN_CONFIDENCE = 0.6;
  private static readonly MIN_SIZE = 5; // 5% of image
  private static readonly MAX_OCCLUSION = 40; // 40% obscured

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      logError('ANTHROPIC_API_KEY not configured. Preflight checks will not work.');
      this.client = new Anthropic({ apiKey: 'dummy-key' });
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: 60 * 1000, // 1 minute timeout for quick check
        maxRetries: 1 // Single retry for speed
      });
      info('VisionPreflightService initialized for lightweight bird detection');
    }
  }

  /**
   * Detect bird presence in image with minimal token usage
   * @param imageUrl - URL of the bird image to check
   * @returns BirdDetectionResult with lightweight detection info
   */
  async detectBird(imageUrl: string): Promise<BirdDetectionResult> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Check cache first
    const cached = this.getCachedResult(imageUrl);
    if (cached) {
      this.stats.cacheHits++;
      info('Returning cached preflight result', { imageUrl });
      return cached;
    }

    try {
      this.stats.totalChecks++;
      info('Starting lightweight bird detection preflight', { imageUrl });

      // Fetch image and convert to base64
      const imageData = await this.fetchImageAsBase64(imageUrl);

      // Build lightweight prompt (target: ~100-150 tokens)
      const prompt = this.buildLightweightPrompt();

      // Use same model as full annotation for consistency
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

      const startTime = Date.now();
      const response = await this.client.messages.create({
        model,
        max_tokens: 200, // Minimal output for quick response
        temperature: 0.2, // Lower temperature for consistent detection
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.base64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      });

      const requestTime = Date.now() - startTime;

      const content = response.content[0];

      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      if (!content.text) {
        throw new Error('No content returned from Claude Vision API');
      }

      // Parse the lightweight response
      const result = this.parseResponse(content.text);

      // Track statistics
      this.updateStats(result, response.usage?.input_tokens || 0, response.usage?.output_tokens || 0);

      // Cache the result
      this.cacheResult(imageUrl, result);

      info('Preflight bird detection completed', {
        imageUrl,
        detected: result.birdDetected,
        confidence: result.confidence,
        size: result.approximateSize,
        requestTime,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      });

      return result;

    } catch (error) {
      logError('Failed to perform preflight bird detection', error as Error);
      throw error;
    }
  }

  /**
   * Check if image should be processed for annotation
   * @param imageUrl - URL of the bird image
   * @returns boolean - true if image passes preflight checks
   */
  async shouldProcess(imageUrl: string): Promise<boolean> {
    try {
      const result = await this.detectBird(imageUrl);

      // Check if bird is detected with sufficient confidence
      if (!result.birdDetected || result.confidence < VisionPreflightService.MIN_CONFIDENCE) {
        return false;
      }

      // Check if bird is large enough
      if (result.approximateSize < VisionPreflightService.MIN_SIZE) {
        return false;
      }

      // Check if occlusion is acceptable
      if (result.occlusion > VisionPreflightService.MAX_OCCLUSION) {
        return false;
      }

      return true;

    } catch (error) {
      logError('Preflight check failed, defaulting to process', error as Error);
      return true; // Default to processing on error to avoid blocking
    }
  }

  /**
   * Batch preflight check for multiple images
   * @param imageUrls - Array of image URLs to check
   * @returns Array of results with URLs and detection info
   */
  async batchCheck(imageUrls: string[]): Promise<Array<{ url: string; result: BirdDetectionResult; shouldProcess: boolean }>> {
    const results: Array<{ url: string; result: BirdDetectionResult; shouldProcess: boolean }> = [];

    for (const url of imageUrls) {
      try {
        const result = await this.detectBird(url);
        const shouldProcess = await this.shouldProcess(url);

        results.push({ url, result, shouldProcess });

        // Rate limiting: wait 0.5 seconds between requests
        await this.sleep(500);

      } catch (error) {
        logError(`Preflight check failed for ${url}`, error as Error);
        results.push({
          url,
          result: {
            birdDetected: false,
            confidence: 0,
            approximateSize: 0,
            position: { x: 0, y: 0 },
            occlusion: 100,
            quickAssessment: 'Preflight check failed'
          },
          shouldProcess: true // Default to process on error
        });
      }
    }

    return results;
  }

  /**
   * Build lightweight prompt for quick bird detection
   * Target: ~100-150 tokens for minimal API cost
   */
  private buildLightweightPrompt(): string {
    return `Is there a bird in this image? Respond with JSON only:
{
  "detected": true/false,
  "confidence": 0.0-1.0,
  "size": 0-100 (% of image),
  "position": {"x": 0.0-1.0, "y": 0.0-1.0},
  "occlusion": 0-100 (% obscured),
  "note": "brief quality assessment"
}

Quick check:
- Bird present? Size? Position?
- Any issues: too small, cut off, blurry?
JSON only.`.trim();
  }

  /**
   * Parse lightweight response from Claude Vision
   * Expected format: Simple JSON with minimal fields
   */
  private parseResponse(content: string): BirdDetectionResult {
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/i, '');
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString);

      // Validate and normalize response
      const result: BirdDetectionResult = {
        birdDetected: Boolean(parsed.detected),
        confidence: this.normalizeValue(parsed.confidence, 0, 1),
        approximateSize: this.normalizeValue(parsed.size, 0, 100),
        position: {
          x: this.normalizeValue(parsed.position?.x || 0.5, 0, 1),
          y: this.normalizeValue(parsed.position?.y || 0.5, 0, 1)
        },
        occlusion: this.normalizeValue(parsed.occlusion, 0, 100),
        quickAssessment: parsed.note || undefined
      };

      return result;

    } catch (error) {
      logError('Failed to parse preflight response', error as Error);
      logError('Raw content:', new Error(content));

      // Return safe default for failed parsing
      return {
        birdDetected: false,
        confidence: 0,
        approximateSize: 0,
        position: { x: 0.5, y: 0.5 },
        occlusion: 100,
        quickAssessment: 'Parse failed'
      };
    }
  }

  /**
   * Normalize numeric value to expected range
   */
  private normalizeValue(value: any, min: number, max: number): number {
    const num = Number(value) || 0;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{
    base64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 20000, // 20 second timeout for preflight
        headers: {
          'User-Agent': 'Aves-Bird-Learning/1.0',
        }
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(response.data, 'binary').toString('base64');

      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      if (contentType.includes('png')) {
        mediaType = 'image/png';
      } else if (contentType.includes('gif')) {
        mediaType = 'image/gif';
      } else if (contentType.includes('webp')) {
        mediaType = 'image/webp';
      } else {
        mediaType = 'image/jpeg';
      }

      return { base64, mediaType };
    } catch (error) {
      logError('Failed to fetch image for preflight', error as Error);
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(result: BirdDetectionResult, inputTokens: number, outputTokens: number): void {
    if (result.birdDetected) {
      this.stats.birdDetected++;
    } else {
      this.stats.birdRejected++;
    }

    // Update running average for confidence
    const totalChecks = this.stats.totalChecks;
    this.stats.avgConfidence = (
      (this.stats.avgConfidence * (totalChecks - 1) + result.confidence) / totalChecks
    );

    // Update running average for tokens
    const totalTokens = inputTokens + outputTokens;
    this.stats.avgTokensUsed = (
      (this.stats.avgTokensUsed * (totalChecks - 1) + totalTokens) / totalChecks
    );
  }

  /**
   * Cache preflight result for performance
   */
  private cacheResult(imageUrl: string, result: BirdDetectionResult): void {
    // Enforce max cache size (LRU-like eviction)
    if (this.preflightCache.size >= VisionPreflightService.MAX_CACHE_SIZE) {
      const oldestKey = this.preflightCache.keys().next().value;
      if (oldestKey) {
        this.preflightCache.delete(oldestKey);
      }
    }

    this.preflightCache.set(imageUrl, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached preflight result if still valid
   */
  private getCachedResult(imageUrl: string): BirdDetectionResult | null {
    const cached = this.preflightCache.get(imageUrl);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > VisionPreflightService.CACHE_TTL_MS) {
      this.preflightCache.delete(imageUrl);
      return null;
    }

    return cached.result;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance statistics
   */
  getStats(): PreflightStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      birdDetected: 0,
      birdRejected: 0,
      avgConfidence: 0,
      avgTokensUsed: 0,
      cacheHits: 0
    };
    info('Preflight statistics reset');
  }

  /**
   * Clear the preflight cache
   */
  clearCache(): void {
    this.preflightCache.clear();
    info('Preflight cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, cached] of this.preflightCache) {
      const age = now - cached.timestamp;
      if (age <= VisionPreflightService.CACHE_TTL_MS) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.preflightCache.size,
      validEntries,
      expiredEntries,
      maxSize: VisionPreflightService.MAX_CACHE_SIZE,
      cacheTTL: VisionPreflightService.CACHE_TTL_MS
    };
  }

  /**
   * Get current quality thresholds
   */
  getThresholds() {
    return {
      minConfidence: VisionPreflightService.MIN_CONFIDENCE,
      minSize: VisionPreflightService.MIN_SIZE,
      maxOcclusion: VisionPreflightService.MAX_OCCLUSION
    };
  }

  /**
   * Check if the service is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Calculate cost savings from preflight checks
   * @returns Estimated cost savings metrics
   */
  getCostSavings() {
    const fullAnnotationTokens = 8000; // Average tokens for full annotation
    const preflightTokens = this.stats.avgTokensUsed || 700; // Average preflight tokens

    const rejectedImages = this.stats.birdRejected;
    const tokensSaved = rejectedImages * (fullAnnotationTokens - preflightTokens);
    const savingsPercentage = ((fullAnnotationTokens - preflightTokens) / fullAnnotationTokens) * 100;

    return {
      totalPreflightChecks: this.stats.totalChecks,
      imagesRejected: rejectedImages,
      tokensSaved,
      savingsPercentage: savingsPercentage.toFixed(1),
      avgTokensPerPreflight: this.stats.avgTokensUsed.toFixed(0),
      fullAnnotationTokens
    };
  }
}

// Export singleton instance
export const visionPreflightService = new VisionPreflightService();
