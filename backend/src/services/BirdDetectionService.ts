/**
 * Bird Detection Service
 * Validates images before annotation by detecting birds and assessing image quality
 * Uses Claude Vision API for quick bird detection and quality assessment
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { info, error as logError } from '../utils/logger';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BirdDetectionResult {
  detected: boolean;
  boundingBox?: BoundingBox;
  confidence: number;
  percentageOfImage: number;
  species?: string;
}

export interface ImageQualityAssessment {
  suitable: boolean;
  reason?: string;
  birdSize: number;
  clarity: number;
  lighting: number;
  focus: number;
  partialBird: boolean;
}

export interface ValidationResult {
  valid: boolean;
  detection: BirdDetectionResult;
  quality: ImageQualityAssessment;
  skipReason?: string;
}

/**
 * Bird Detection Service for image validation
 */
export class BirdDetectionService {
  private client: Anthropic;
  private apiKey: string;

  // Simple in-memory cache for validation results
  private validationCache: Map<string, { result: ValidationResult; timestamp: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
  private static readonly MAX_CACHE_SIZE = 1000; // Maximum cached validations

  // Thresholds for quality assessment
  private static readonly MIN_BIRD_SIZE = 0.05; // 5% of image
  private static readonly MIN_CONFIDENCE = 0.6;
  private static readonly MIN_CLARITY = 0.6;
  private static readonly MIN_LIGHTING = 0.5;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      logError('ANTHROPIC_API_KEY not configured. Bird detection will not work.');
      this.client = new Anthropic({ apiKey: 'dummy-key' });
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: 2 * 60 * 1000, // 2 minutes timeout for quick detection
        maxRetries: 2
      });
      info('Bird Detection Service initialized with Claude Vision');
    }
  }

  /**
   * Validate image before annotation processing
   * @param imageUrl - URL of the bird image to validate
   * @returns ValidationResult with detection and quality assessment
   */
  async validateImage(imageUrl: string): Promise<ValidationResult> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Check cache first
    const cached = this.getCachedValidation(imageUrl);
    if (cached) {
      info('Returning cached bird detection result', { imageUrl });
      return cached;
    }

    try {
      info('Starting bird detection and quality assessment', { imageUrl });

      // Fetch image and convert to base64
      const imageData = await this.fetchImageAsBase64(imageUrl);

      // Run combined detection and quality assessment
      const prompt = this.buildDetectionPrompt();

      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

      const response = await this.client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0.2,
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

      const content = response.content[0];

      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      if (!content.text) {
        throw new Error('No content returned from Claude Vision API');
      }

      // Parse the detection and quality response
      const result = this.parseDetectionResponse(content.text);

      // Determine if image is valid for annotation
      const validationResult = this.evaluateValidation(result);

      // Cache the result
      this.cacheValidation(imageUrl, validationResult);

      info('Bird detection and quality assessment completed', {
        imageUrl,
        detected: validationResult.detection.detected,
        suitable: validationResult.quality.suitable,
        valid: validationResult.valid
      });

      return validationResult;

    } catch (error) {
      logError('Failed to validate image with bird detection', error as Error);
      throw error;
    }
  }

  /**
   * Quick bird detection without full quality assessment
   * @param imageUrl - URL of the bird image
   * @returns BirdDetectionResult
   */
  async detectBird(imageUrl: string): Promise<BirdDetectionResult> {
    const validation = await this.validateImage(imageUrl);
    return validation.detection;
  }

  /**
   * Assess image quality for annotation suitability
   * @param imageUrl - URL of the bird image
   * @returns ImageQualityAssessment
   */
  async assessImageQuality(imageUrl: string): Promise<ImageQualityAssessment> {
    const validation = await this.validateImage(imageUrl);
    return validation.quality;
  }

  /**
   * Batch validate multiple images
   * @param imageUrls - Array of image URLs to validate
   * @returns Array of validation results
   */
  async validateBatch(imageUrls: string[]): Promise<Array<{ url: string; result: ValidationResult }>> {
    const results: Array<{ url: string; result: ValidationResult }> = [];

    for (const url of imageUrls) {
      try {
        const result = await this.validateImage(url);
        results.push({ url, result });

        // Rate limiting: wait 1 second between requests
        await this.sleep(1000);

      } catch (error) {
        logError(`Failed to validate image: ${url}`, error as Error);
        results.push({
          url,
          result: {
            valid: false,
            detection: {
              detected: false,
              confidence: 0,
              percentageOfImage: 0
            },
            quality: {
              suitable: false,
              reason: 'Validation failed',
              birdSize: 0,
              clarity: 0,
              lighting: 0,
              focus: 0,
              partialBird: false
            },
            skipReason: (error as Error).message
          }
        });
      }
    }

    return results;
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{
    base64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }> {
    try {
      info('Fetching image from URL for detection', { imageUrl });

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
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

      info('Image fetched and encoded for detection', {
        imageUrl,
        mediaType,
        sizeBytes: response.data.length
      });

      return { base64, mediaType };
    } catch (error) {
      logError('Failed to fetch and encode image for detection', error as Error);
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
  }

  /**
   * Build the detection and quality assessment prompt
   */
  private buildDetectionPrompt(): string {
    return `
Analyze this image to detect if it contains a bird and assess its quality for annotation purposes.
Return a JSON object with this EXACT structure (valid JSON only, no markdown):

{
  "detection": {
    "detected": true,
    "boundingBox": {"x": 0.2, "y": 0.3, "width": 0.5, "height": 0.6},
    "confidence": 0.95,
    "percentageOfImage": 0.30,
    "species": "robin"
  },
  "quality": {
    "suitable": true,
    "reason": "Clear, well-lit bird occupies significant portion of image",
    "birdSize": 0.30,
    "clarity": 0.90,
    "lighting": 0.85,
    "focus": 0.95,
    "partialBird": false
  }
}

DETECTION CRITERIA:
- detected: true if a bird is clearly visible in the image
- boundingBox: normalized coordinates (0-1 range) of the tightest box around the bird
- confidence: 0.0-1.0 score for bird detection certainty
- percentageOfImage: what percentage of the total image area the bird occupies (0.0-1.0)
- species: common name of the bird species (lowercase, or "unknown" if uncertain)

QUALITY CRITERIA:
- suitable: true if image is good for creating educational annotations
- reason: brief explanation of suitability or why it's unsuitable
- birdSize: percentage of image occupied by bird (0.0-1.0)
- clarity: image sharpness and detail visibility (0.0-1.0)
- lighting: lighting quality - neither too dark nor overexposed (0.0-1.0)
- focus: is the bird in focus (0.0-1.0)
- partialBird: true if significant bird parts are cut off or obscured

UNSUITABLE IMAGE REASONS:
- Bird too small (less than 5% of image)
- Bird partially cut off by image edge
- Too blurry or out of focus (clarity < 0.6)
- Poor lighting (too dark or overexposed, lighting < 0.5)
- Multiple birds making it confusing
- Bird obscured by objects
- No bird detected in image

Return ONLY the JSON object, nothing else.
`.trim();
  }

  /**
   * Parse detection and quality response from Claude Vision
   */
  private parseDetectionResponse(content: string): {
    detection: BirdDetectionResult;
    quality: ImageQualityAssessment;
  } {
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/i, '');
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString);

      // Validate structure
      if (!parsed.detection || !parsed.quality) {
        throw new Error('Response missing detection or quality fields');
      }

      // Normalize detection result
      const detection: BirdDetectionResult = {
        detected: Boolean(parsed.detection.detected),
        confidence: Number(parsed.detection.confidence),
        percentageOfImage: Number(parsed.detection.percentageOfImage),
        species: parsed.detection.species || 'unknown'
      };

      if (parsed.detection.boundingBox) {
        detection.boundingBox = {
          x: Number(parsed.detection.boundingBox.x),
          y: Number(parsed.detection.boundingBox.y),
          width: Number(parsed.detection.boundingBox.width),
          height: Number(parsed.detection.boundingBox.height)
        };
      }

      // Normalize quality assessment
      const quality: ImageQualityAssessment = {
        suitable: Boolean(parsed.quality.suitable),
        reason: parsed.quality.reason,
        birdSize: Number(parsed.quality.birdSize),
        clarity: Number(parsed.quality.clarity),
        lighting: Number(parsed.quality.lighting),
        focus: Number(parsed.quality.focus),
        partialBird: Boolean(parsed.quality.partialBird)
      };

      return { detection, quality };

    } catch (error) {
      logError('Failed to parse detection response', error as Error);
      logError('Raw content:', new Error(content));
      throw new Error('Failed to parse bird detection response');
    }
  }

  /**
   * Evaluate validation result based on detection and quality
   */
  private evaluateValidation(result: {
    detection: BirdDetectionResult;
    quality: ImageQualityAssessment;
  }): ValidationResult {
    const { detection, quality } = result;

    // Check if bird is detected
    if (!detection.detected) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: 'No bird detected in image'
      };
    }

    // Check detection confidence
    if (detection.confidence < BirdDetectionService.MIN_CONFIDENCE) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: `Low detection confidence: ${detection.confidence.toFixed(2)}`
      };
    }

    // Check bird size
    if (detection.percentageOfImage < BirdDetectionService.MIN_BIRD_SIZE) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: `Bird too small: ${(detection.percentageOfImage * 100).toFixed(1)}% of image`
      };
    }

    // Check if quality assessment marked as unsuitable
    if (!quality.suitable) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: quality.reason || 'Image quality unsuitable for annotation'
      };
    }

    // Check clarity threshold
    if (quality.clarity < BirdDetectionService.MIN_CLARITY) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: `Image too blurry: clarity ${quality.clarity.toFixed(2)}`
      };
    }

    // Check lighting threshold
    if (quality.lighting < BirdDetectionService.MIN_LIGHTING) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: `Poor lighting: ${quality.lighting.toFixed(2)}`
      };
    }

    // Check for partial bird
    if (quality.partialBird) {
      return {
        valid: false,
        detection,
        quality,
        skipReason: 'Bird is partially cut off or obscured'
      };
    }

    // All checks passed
    return {
      valid: true,
      detection,
      quality
    };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cache validation result for performance
   */
  private cacheValidation(imageUrl: string, result: ValidationResult): void {
    // Enforce max cache size (LRU-like eviction)
    if (this.validationCache.size >= BirdDetectionService.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey) {
        this.validationCache.delete(oldestKey);
      }
    }

    this.validationCache.set(imageUrl, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached validation result if still valid
   */
  private getCachedValidation(imageUrl: string): ValidationResult | null {
    const cached = this.validationCache.get(imageUrl);
    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid (not expired)
    const age = Date.now() - cached.timestamp;
    if (age > BirdDetectionService.CACHE_TTL_MS) {
      this.validationCache.delete(imageUrl);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear the validation cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.validationCache.clear();
    info('Bird detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, cached] of this.validationCache) {
      const age = now - cached.timestamp;
      if (age <= BirdDetectionService.CACHE_TTL_MS) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.validationCache.size,
      validEntries,
      expiredEntries,
      maxSize: BirdDetectionService.MAX_CACHE_SIZE,
      cacheTTL: BirdDetectionService.CACHE_TTL_MS
    };
  }

  /**
   * Check if the service is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get current configuration thresholds
   */
  getThresholds() {
    return {
      minBirdSize: BirdDetectionService.MIN_BIRD_SIZE,
      minConfidence: BirdDetectionService.MIN_CONFIDENCE,
      minClarity: BirdDetectionService.MIN_CLARITY,
      minLighting: BirdDetectionService.MIN_LIGHTING
    };
  }
}

// Export singleton instance
export const birdDetectionService = new BirdDetectionService();
