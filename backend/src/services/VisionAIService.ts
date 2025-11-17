/**
 * Vision AI Service
 * Handles AI-powered image annotation using Anthropic Claude Sonnet 4.5 Vision API
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { info, error as logError } from '../utils/logger';
import { patternLearner, QualityMetrics } from './PatternLearner';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIAnnotation {
  spanishTerm: string;
  englishTerm: string;
  boundingBox: BoundingBox;
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyLevel: number;
  pronunciation?: string;
  confidence?: number;
  qualityMetrics?: QualityMetrics;
}

export interface AnnotationJobResult {
  jobId: string;
  imageId: string;
  annotations: AIAnnotation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  processedAt?: Date;
}

/**
 * VisionAI Service for generating bird annotations
 */
export class VisionAIService {
  private client: Anthropic;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      logError('ANTHROPIC_API_KEY not configured. Vision AI features will not work.');
      // Create a dummy client to avoid errors
      this.client = new Anthropic({ apiKey: 'dummy-key' });
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: 5 * 60 * 1000, // 5 minutes timeout for vision requests
        maxRetries: 2
      });
      info('VisionAI Service initialized with Claude Sonnet 4.5');
    }
  }

  /**
   * Generate annotations for a bird image using Claude Sonnet 4.5 Vision
   * @param imageUrl - URL of the bird image to annotate
   * @param imageId - Database ID of the image
   * @param metadata - Optional metadata for pattern learning
   * @returns Promise<AIAnnotation[]>
   */
  async generateAnnotations(
    imageUrl: string,
    imageId: string,
    metadata?: {
      species?: string;
      imageCharacteristics?: string[];
      enablePatternLearning?: boolean;
    }
  ): Promise<AIAnnotation[]> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      info('Starting Vision AI annotation generation with Claude', { imageId, imageUrl });

      // Build base prompt
      let prompt = this.buildAnnotationPrompt();

      // Enhance prompt with learned patterns if enabled
      if (metadata?.enablePatternLearning !== false) {
        const recommendedFeatures = metadata?.species
          ? patternLearner.getRecommendedFeatures(metadata.species)
          : [];

        prompt = await patternLearner.enhancePrompt(prompt, {
          species: metadata?.species,
          targetFeatures: recommendedFeatures,
          imageCharacteristics: metadata?.imageCharacteristics
        });

        info('Prompt enhanced with learned patterns', {
          species: metadata?.species,
          recommendedFeatures: recommendedFeatures.length
        });
      }

      // Fetch image and convert to base64
      const imageData = await this.fetchImageAsBase64(imageUrl);

      // Determine model and appropriate token limits
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

      // Model-specific token limits
      const modelLimits: Record<string, number> = {
        'claude-sonnet-4-5-20250929': 8192,
        'claude-3-5-sonnet-20241022': 8192,
        'claude-3-opus-20240229': 4096,
        'claude-3-sonnet-20240229': 4096,
        'claude-3-haiku-20240307': 4096
      };

      const maxTokens = modelLimits[model] || 4096;
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);

      if (estimatedPromptTokens > maxTokens * 0.5) {
        logError(`Prompt too long: estimated ${estimatedPromptTokens} tokens, max input should be <${maxTokens * 0.5}`, new Error('Token limit warning'));
      }

      info(`Using model: ${model} with max_tokens: ${maxTokens}`);

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
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

      // Parse the JSON response
      const annotations = this.parseAnnotationResponse(content.text);

      // Evaluate annotation quality using learned patterns
      if (metadata?.enablePatternLearning !== false) {
        for (const annotation of annotations) {
          const qualityMetrics = await patternLearner.evaluateAnnotationQuality(
            annotation,
            metadata?.species
          );
          annotation.qualityMetrics = qualityMetrics;
        }
      }

      // Learn from high-quality annotations
      if (metadata?.enablePatternLearning !== false) {
        await patternLearner.learnFromAnnotations(annotations, {
          species: metadata?.species,
          imageCharacteristics: metadata?.imageCharacteristics,
          prompt
        });

        info('Learned from new annotations', {
          imageId,
          species: metadata?.species,
          annotationCount: annotations.length
        });
      }

      info('Claude Vision AI annotations generated successfully', {
        imageId,
        annotationCount: annotations.length
      });

      return annotations;

    } catch (error) {
      logError('Failed to generate annotations with Claude Vision AI', error as Error);
      throw error;
    }
  }

  /**
   * Fetch image from URL and convert to base64 using axios
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> {
    try {
      info('Fetching image from URL', { imageUrl });

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Aves-Bird-Learning/1.0',
        }
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(response.data, 'binary').toString('base64');

      // Map content type to supported Anthropic types
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

      info('Image fetched and encoded successfully', {
        imageUrl,
        mediaType,
        sizeBytes: response.data.length
      });

      return { base64, mediaType };
    } catch (error) {
      logError('Failed to fetch and encode image', error as Error);
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
  }

  /**
   * Build the annotation prompt for Claude Vision
   */
  private buildAnnotationPrompt(): string {
    return `
Analyze this bird image and identify visible anatomical features for Spanish language learning.

STEP-BY-STEP PROCESS:
1. LOCATE THE BIRD: First identify where the bird is positioned in the image
2. IDENTIFY FEATURES: Find visible anatomical parts within the bird's body
3. MEASURE COORDINATES: Calculate precise bounding box positions for each feature
4. VALIDATE: Ensure all coordinates fall within the bird's location

COORDINATE SYSTEM (CRITICAL):
- Origin (0,0) is at the TOP-LEFT corner of the image
- X-axis: 0 (left edge) to 1.0 (right edge) - increases LEFT to RIGHT
- Y-axis: 0 (top edge) to 1.0 (bottom edge) - increases TOP to BOTTOM
- All coordinates are NORMALIZED (0.0 to 1.0 range)

BOUNDING BOX FORMAT:
- "x": horizontal position of TOP-LEFT corner (0.0 = far left, 1.0 = far right)
- "y": vertical position of TOP-LEFT corner (0.0 = top of image, 1.0 = bottom)
- "width": horizontal span (e.g., 0.10 = 10% of image width)
- "height": vertical span (e.g., 0.08 = 8% of image height)

COORDINATE EXAMPLES WITH VISUAL DESCRIPTIONS:
{
  "beak at top-center": {"x": 0.45, "y": 0.15, "width": 0.08, "height": 0.06},
  "eye near top-right": {"x": 0.60, "y": 0.20, "width": 0.05, "height": 0.05},
  "wing at middle-left": {"x": 0.25, "y": 0.50, "width": 0.20, "height": 0.25},
  "tail at bottom-center": {"x": 0.40, "y": 0.75, "width": 0.15, "height": 0.15},
  "legs near bottom": {"x": 0.45, "y": 0.85, "width": 0.08, "height": 0.10}
}

RETURN FORMAT (valid JSON only, no markdown):
[{
  "spanishTerm": "el pico",
  "englishTerm": "beak",
  "boundingBox": {"x": 0.45, "y": 0.30, "width": 0.10, "height": 0.08},
  "type": "anatomical",
  "difficultyLevel": 1,
  "pronunciation": "el PEE-koh",
  "confidence": 0.95
}]

ANNOTATION GUIDELINES:
- PRIORITY FEATURES: pico (beak), alas (wings), cola (tail), patas (legs), plumas (feathers),
  ojos (eyes), cuello (neck), pecho (breast), cabeza (head), cresta (crest)
- Only annotate features CLEARLY VISIBLE in the image
- Bounding boxes MUST be positioned AT the actual feature location
- Each box should TIGHTLY contain the feature (not too large, not too small)
- All coordinates MUST be within bird's body region
- Difficulty: 1 (basic parts), 2-3 (common features), 4-5 (advanced/subtle features)
- Pronunciation: Simple phonetic guide (CAPS = stressed syllable)
- Confidence: 0.0-1.0 (higher = more certain the feature is correctly identified)
- Type: "anatomical" (body parts), "behavioral" (actions), "color" (plumage colors), "pattern" (markings)
- Provide 3-8 high-quality annotations per image

VALIDATION CHECKS:
✓ Is the bird located first before annotating?
✓ Do all bounding boxes fall within the bird's body?
✓ Are coordinates in 0.0-1.0 normalized range?
✓ Does each box tightly fit the actual feature location?
✓ Are y-coordinates larger for features lower in the image?

IMPORTANT: Return ONLY the JSON array, nothing else. No explanatory text.
`.trim();
  }

  /**
   * Parse annotation response from Claude Vision
   * Handles both pure JSON and markdown-wrapped JSON
   */
  private parseAnnotationResponse(content: string): AIAnnotation[] {
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();

      // Remove ```json and ``` markers
      jsonString = jsonString.replace(/^```json\s*\n?/i, '');
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and normalize each annotation
      const annotations: AIAnnotation[] = parsed.map((item, index) => {
        this.validateAnnotation(item, index);
        return {
          spanishTerm: item.spanishTerm,
          englishTerm: item.englishTerm,
          boundingBox: {
            x: Number(item.boundingBox.x),
            y: Number(item.boundingBox.y),
            width: Number(item.boundingBox.width),
            height: Number(item.boundingBox.height)
          },
          type: item.type,
          difficultyLevel: Number(item.difficultyLevel),
          pronunciation: item.pronunciation,
          confidence: item.confidence ? Number(item.confidence) : 0.8
        };
      });

      return annotations;

    } catch (error) {
      logError('Failed to parse annotation response', error as Error);
      logError('Raw content:', new Error(content));
      throw new Error('Failed to parse Vision AI response');
    }
  }

  /**
   * Validate a single annotation object
   */
  private validateAnnotation(item: any, index: number): void {
    const requiredFields = ['spanishTerm', 'englishTerm', 'boundingBox', 'type', 'difficultyLevel'];

    for (const field of requiredFields) {
      if (!item[field]) {
        throw new Error(`Annotation ${index}: missing required field '${field}'`);
      }
    }

    // Validate bounding box
    const bbox = item.boundingBox;
    if (!bbox.x || !bbox.y || !bbox.width || !bbox.height) {
      throw new Error(`Annotation ${index}: invalid bounding box structure`);
    }

    // Validate coordinates are in 0-1 range
    if (bbox.x < 0 || bbox.x > 1 || bbox.y < 0 || bbox.y > 1) {
      throw new Error(`Annotation ${index}: bounding box coordinates must be 0-1`);
    }

    // Validate type
    const validTypes = ['anatomical', 'behavioral', 'color', 'pattern'];
    if (!validTypes.includes(item.type)) {
      throw new Error(`Annotation ${index}: invalid type '${item.type}'`);
    }

    // Validate difficulty level
    if (item.difficultyLevel < 1 || item.difficultyLevel > 5) {
      throw new Error(`Annotation ${index}: difficulty level must be 1-5`);
    }
  }

  /**
   * Generate annotations for multiple images (batch processing)
   * @param imageUrls - Array of {imageId, url} objects
   * @returns Promise with results for each image
   */
  async generateBatchAnnotations(
    images: Array<{ imageId: string; url: string }>
  ): Promise<AnnotationJobResult[]> {
    const results: AnnotationJobResult[] = [];

    for (const image of images) {
      try {
        const annotations = await this.generateAnnotations(image.url, image.imageId);

        results.push({
          jobId: this.generateJobId(),
          imageId: image.imageId,
          annotations,
          status: 'completed',
          processedAt: new Date()
        });

        // Rate limiting: wait 1 second between requests to avoid API limits
        await this.sleep(1000);

      } catch (error) {
        results.push({
          jobId: this.generateJobId(),
          imageId: image.imageId,
          annotations: [],
          status: 'failed',
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if the service is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get pattern learning analytics
   */
  async getPatternAnalytics(): Promise<{
    totalPatterns: number;
    speciesTracked: number;
    topFeatures: Array<{ feature: string; observations: number; confidence: number }>;
    speciesBreakdown: Array<{ species: string; annotations: number; features: number }>;
  }> {
    return patternLearner.getAnalytics();
  }

  /**
   * Get recommended features for a species
   */
  getRecommendedFeatures(species: string, limit?: number): string[] {
    return patternLearner.getRecommendedFeatures(species, limit);
  }

  /**
   * Export learned patterns for analysis
   */
  exportLearnedPatterns() {
    return patternLearner.exportPatterns();
  }
}

// Export singleton instance
export const visionAIService = new VisionAIService();
