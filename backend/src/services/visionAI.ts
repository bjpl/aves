/**
 * Vision AI Service - Claude Sonnet 4.5 Integration for Bird Anatomy Annotation
 *
 * Leverages Anthropic's Claude Sonnet 4.5 Vision model to automatically generate
 * anatomical annotations for bird images with Spanish/English terms
 * and bounding boxes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { Annotation, BoundingBox, AnnotationType } from '../types/annotation.types';
import * as logger from '../utils/logger';

/**
 * Raw annotation response from Claude
 */
interface ClaudeAnnotationResponse {
  spanishTerm: string;
  englishTerm: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: AnnotationType;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  pronunciation?: string;
}

/**
 * Configuration options for VisionAI service
 */
interface VisionAIConfig {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  cacheEnabled?: boolean;
  cacheDurationDays?: number;
  modelVersion?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * VisionAI Service Class
 *
 * Handles Claude Sonnet 4.5 Vision API integration for automatic bird anatomy annotation
 */
export class VisionAI {
  private client: Anthropic;
  private pool: Pool;
  private config: Required<VisionAIConfig>;

  // Structured prompt for Claude bird anatomy annotation
  private readonly ANNOTATION_PROMPT = `Analyze this bird image and identify visible anatomical features with precision.

You are an expert ornithologist and Spanish language instructor. Your task is to identify bird anatomical features that are clearly visible in the image.

IMPORTANT INSTRUCTIONS:
1. Only annotate features that are CLEARLY VISIBLE in the image
2. Use precise bounding boxes with normalized coordinates (0-1 range)
3. Provide accurate Spanish terms with proper articles (el/la)
4. Include phonetic pronunciation for Spanish learners
5. Classify difficulty based on vocabulary complexity
6. Focus on anatomical features, not behaviors or environment

ANATOMICAL FEATURES TO IDENTIFY (if visible):
- el pico (beak/bill)
- las alas (wings)
- la cola (tail)
- las patas (legs/feet)
- las plumas (feathers)
- los ojos (eyes)
- el cuello (neck)
- el pecho (breast/chest)
- la cabeza (head)
- el vientre (belly)
- las garras (talons/claws)
- la cresta (crest)
- el plumaje (plumage)

COORDINATE SYSTEM:
- x: Distance from left edge (0.0 = left, 1.0 = right)
- y: Distance from top edge (0.0 = top, 1.0 = bottom)
- width: Horizontal span (0-1)
- height: Vertical span (0-1)

DIFFICULTY LEVELS:
1: Basic (pico, alas, cola, patas)
2: Common (plumas, ojos, cuello, pecho)
3: Intermediate (cabeza, vientre, garras)
4: Advanced (cresta, plumaje, specific patterns)
5: Expert (technical terms, rare features)

RESPONSE FORMAT (JSON array):
[
  {
    "spanishTerm": "el pico",
    "englishTerm": "beak",
    "boundingBox": {
      "x": 0.45,
      "y": 0.30,
      "width": 0.10,
      "height": 0.08
    },
    "type": "anatomical",
    "difficultyLevel": 1,
    "pronunciation": "el PEE-koh"
  }
]

TYPES:
- anatomical: Physical body parts
- behavioral: Actions or behaviors (only if clearly visible, e.g., feeding)
- color: Distinctive color patterns
- pattern: Unique markings or patterns

Return ONLY the JSON array with 3-8 annotations depending on what's clearly visible. Do not include explanations or additional text.`;

  constructor(pool: Pool, config?: VisionAIConfig) {
    this.pool = pool;

    // Merge default config with provided config
    this.config = {
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 2000,
      cacheEnabled: config?.cacheEnabled ?? true,
      cacheDurationDays: config?.cacheDurationDays ?? 30,
      modelVersion: config?.modelVersion ?? 'claude-sonnet-4-20250514',
      maxTokens: config?.maxTokens ?? 4096,
      temperature: config?.temperature ?? 0.3 // Lower temperature for more consistent results
    };

    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey
    });

    logger.info('VisionAI service initialized with Claude', {
      modelVersion: this.config.modelVersion,
      cacheEnabled: this.config.cacheEnabled
    });
  }

  /**
   * Generate annotations for a bird image using Claude Sonnet 4.5 Vision
   *
   * @param imageUrl - Public URL of the bird image
   * @param imageId - Database ID for the image
   * @returns Array of generated annotations
   */
  async annotateImage(imageUrl: string, imageId: string): Promise<Annotation[]> {
    logger.info('Starting image annotation with Claude', { imageUrl, imageId });

    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedAnnotations(imageUrl);
        if (cached) {
          logger.info('Returning cached annotations', { imageUrl, count: cached.length });
          return cached.map(ann => ({ ...ann, imageId }));
        }
      }

      // Generate annotations with retry logic
      const claudeResponse = await this.callClaudeWithRetry(imageUrl);

      // Parse and validate response
      const rawAnnotations = this.parseAnnotations(claudeResponse);

      // Validate each annotation
      const validAnnotations = rawAnnotations.filter(ann => this.validateAnnotation(ann));

      if (validAnnotations.length === 0) {
        throw new Error('No valid annotations generated by Claude');
      }

      // Convert to full Annotation objects
      const annotations = this.convertToAnnotations(validAnnotations, imageId);

      // Cache the results if enabled
      if (this.config.cacheEnabled) {
        await this.cacheAnnotations(imageUrl, annotations);
      }

      logger.info('Successfully generated annotations with Claude', {
        imageUrl,
        count: annotations.length,
        cached: this.config.cacheEnabled
      });

      return annotations;

    } catch (error) {
      logger.error('Failed to annotate image with Claude', error instanceof Error ? error : { error });
      throw error;
    }
  }

  /**
   * Call Claude Vision API with retry logic
   *
   * @param imageUrl - URL of the image to analyze
   * @returns Raw JSON string response from Claude
   */
  private async callClaudeWithRetry(imageUrl: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug(`Claude API call attempt ${attempt}/${this.config.maxRetries}`, { imageUrl });

        // Fetch image and convert to base64
        const imageData = await this.fetchImageAsBase64(imageUrl);

        const response = await this.client.messages.create({
          model: this.config.modelVersion,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
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
                  text: this.ANNOTATION_PROMPT
                }
              ]
            }
          ]
        });

        const content = response.content[0];

        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        const textContent = content.text;

        if (!textContent) {
          throw new Error('Empty response from Claude');
        }

        logger.debug('Claude API call successful', {
          imageUrl,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
          attempt
        });

        return textContent;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Claude API call failed (attempt ${attempt}/${this.config.maxRetries})`, {
          error: lastError.message,
          imageUrl
        });

        // Don't retry on certain errors
        if (error instanceof Error && (
          error.message.includes('Invalid image') ||
          error.message.includes('API key') ||
          error.message.includes('authentication')
        )) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to call Claude after all retries');
  }

  /**
   * Fetch image from URL and convert to base64
   *
   * @param imageUrl - URL of the image
   * @returns Base64 encoded image data with media type
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Map content type to supported Anthropic types
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      if (contentType.includes('png')) {
        mediaType = 'image/png';
      } else if (contentType.includes('gif')) {
        mediaType = 'image/gif';
      } else if (contentType.includes('webp')) {
        mediaType = 'image/webp';
      } else {
        mediaType = 'image/jpeg'; // Default to JPEG
      }

      return {
        base64,
        mediaType
      };
    } catch (error) {
      logger.error('Failed to fetch and encode image', {
        error: error instanceof Error ? error : { error },
        imageUrl
      });
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
  }

  /**
   * Parse JSON response from Claude
   *
   * @param response - Raw JSON string from Claude
   * @returns Array of parsed annotation objects
   */
  private parseAnnotations(response: string): ClaudeAnnotationResponse[] {
    try {
      // Claude might return text with JSON embedded, extract it
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      const parsed = JSON.parse(jsonString);

      // Handle different response formats
      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed.annotations && Array.isArray(parsed.annotations)) {
        return parsed.annotations;
      }

      // If it's a single object, wrap it in array
      if (typeof parsed === 'object' && parsed.spanishTerm) {
        return [parsed];
      }

      throw new Error('Unexpected response format from Claude');

    } catch (error) {
      logger.error('Failed to parse Claude response', {
        error: error instanceof Error ? error : { error },
        response: response.substring(0, 500) // Log truncated response
      });
      throw new Error('Invalid JSON response from Claude');
    }
  }

  /**
   * Validate a single annotation response
   *
   * @param annotation - Annotation to validate
   * @returns True if valid, false otherwise
   */
  private validateAnnotation(annotation: ClaudeAnnotationResponse): boolean {
    try {
      // Required fields
      if (!annotation.spanishTerm || !annotation.englishTerm) {
        logger.debug('Annotation missing required terms', { annotation });
        return false;
      }

      // Validate bounding box
      if (!this.validateBoundingBox(annotation.boundingBox)) {
        logger.debug('Invalid bounding box', { annotation });
        return false;
      }

      // Validate type
      const validTypes: AnnotationType[] = ['anatomical', 'behavioral', 'color', 'pattern', 'habitat'];
      if (!validTypes.includes(annotation.type)) {
        logger.debug('Invalid annotation type', { annotation });
        return false;
      }

      // Validate difficulty level
      if (!annotation.difficultyLevel || annotation.difficultyLevel < 1 || annotation.difficultyLevel > 5) {
        logger.debug('Invalid difficulty level', { annotation });
        return false;
      }

      return true;

    } catch (error) {
      logger.debug('Annotation validation error', { error, annotation });
      return false;
    }
  }

  /**
   * Validate bounding box coordinates
   *
   * @param box - Bounding box to validate
   * @returns True if valid, false otherwise
   */
  private validateBoundingBox(box: any): boolean {
    if (!box || typeof box !== 'object') {
      return false;
    }

    const { x, y, width, height } = box;

    // All values must be numbers
    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number') {
      return false;
    }

    // All values must be in 0-1 range
    if (x < 0 || x > 1 || y < 0 || y > 1 ||
        width < 0 || width > 1 || height < 0 || height > 1) {
      return false;
    }

    // Box must not extend beyond image bounds
    if (x + width > 1 || y + height > 1) {
      return false;
    }

    // Box must have some size
    if (width < 0.01 || height < 0.01) {
      return false;
    }

    return true;
  }

  /**
   * Convert Claude responses to full Annotation objects
   *
   * @param responses - Array of validated Claude responses
   * @param imageId - Database ID for the image
   * @returns Array of complete Annotation objects
   */
  private convertToAnnotations(responses: ClaudeAnnotationResponse[], imageId: string): Annotation[] {
    const now = new Date();

    return responses.map((resp, index) => {
      const { x, y, width, height } = resp.boundingBox;

      const boundingBox: BoundingBox = {
        topLeft: { x, y },
        bottomRight: { x: x + width, y: y + height },
        width,
        height
      };

      return {
        id: `${imageId}_ann_${index}_${Date.now()}`,
        imageId,
        boundingBox,
        type: resp.type,
        spanishTerm: resp.spanishTerm,
        englishTerm: resp.englishTerm,
        pronunciation: resp.pronunciation,
        difficultyLevel: resp.difficultyLevel,
        isVisible: false, // Annotations start hidden
        createdAt: now,
        updatedAt: now
      };
    });
  }

  /**
   * Get cached annotations for an image
   *
   * @param imageUrl - URL of the image
   * @returns Cached annotations or null if not found/expired
   */
  private async getCachedAnnotations(imageUrl: string): Promise<Annotation[] | null> {
    try {
      const query = `
        SELECT annotations, created_at, model_version
        FROM vision_ai_cache
        WHERE image_url = $1
          AND created_at > NOW() - INTERVAL '${this.config.cacheDurationDays} days'
          AND model_version = $2
        LIMIT 1
      `;

      const result = await this.pool.query(query, [imageUrl, this.config.modelVersion]);

      if (result.rows.length === 0) {
        return null;
      }

      const cached = result.rows[0];
      const annotations = typeof cached.annotations === 'string'
        ? JSON.parse(cached.annotations)
        : cached.annotations;

      return annotations;

    } catch (error) {
      logger.warn('Failed to retrieve cached annotations', {
        error: error instanceof Error ? error : { error },
        imageUrl
      });
      return null;
    }
  }

  /**
   * Cache annotations for future use
   *
   * @param imageUrl - URL of the image
   * @param annotations - Annotations to cache
   */
  private async cacheAnnotations(imageUrl: string, annotations: Annotation[]): Promise<void> {
    try {
      const query = `
        INSERT INTO vision_ai_cache (image_url, annotations, model_version)
        VALUES ($1, $2, $3)
        ON CONFLICT (image_url, model_version)
        DO UPDATE SET
          annotations = EXCLUDED.annotations,
          created_at = NOW()
      `;

      await this.pool.query(query, [
        imageUrl,
        JSON.stringify(annotations),
        this.config.modelVersion
      ]);

      logger.debug('Cached annotations successfully', { imageUrl, count: annotations.length });

    } catch (error) {
      // Don't throw on cache errors - just log them
      logger.warn('Failed to cache annotations', {
        error: error instanceof Error ? error : { error },
        imageUrl
      });
    }
  }

  /**
   * Validate the entire response structure
   *
   * @param response - Response to validate
   * @returns True if response is valid
   */
  public validateResponse(response: any): boolean {
    try {
      if (!Array.isArray(response) && !response.annotations) {
        return false;
      }

      const annotations = Array.isArray(response) ? response : response.annotations;

      if (annotations.length === 0) {
        return false;
      }

      // All annotations must be valid
      return annotations.every((ann: any) => this.validateAnnotation(ann));

    } catch (error) {
      return false;
    }
  }

  /**
   * Get service statistics
   *
   * @returns Service usage statistics
   */
  async getStatistics(): Promise<{
    totalCached: number;
    cacheHitRate: number;
    averageAnnotationsPerImage: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_cached,
          AVG(jsonb_array_length(annotations::jsonb)) as avg_annotations
        FROM vision_ai_cache
        WHERE model_version = $1
          AND created_at > NOW() - INTERVAL '30 days'
      `;

      const result = await this.pool.query(query, [this.config.modelVersion]);
      const stats = result.rows[0];

      return {
        totalCached: parseInt(stats.total_cached) || 0,
        cacheHitRate: 0, // Would need to track API calls vs cache hits
        averageAnnotationsPerImage: parseFloat(stats.avg_annotations) || 0
      };

    } catch (error) {
      logger.error('Failed to get statistics', error instanceof Error ? error : { error });
      return {
        totalCached: 0,
        cacheHitRate: 0,
        averageAnnotationsPerImage: 0
      };
    }
  }
}

export default VisionAI;
