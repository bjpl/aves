/**
 * Vision AI Service
 * Handles AI-powered image annotation using OpenAI GPT-4 Vision API
 */

import { info, error as logError } from '../utils/logger';

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
  private apiKey: string;
  private apiEndpoint = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      logError('OPENAI_API_KEY not configured. Vision AI features will not work.');
    }
  }

  /**
   * Generate annotations for a bird image using GPT-4 Vision
   * @param imageUrl - URL of the bird image to annotate
   * @param imageId - Database ID of the image
   * @returns Promise<AIAnnotation[]>
   */
  async generateAnnotations(imageUrl: string, imageId: string): Promise<AIAnnotation[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      info('Starting Vision AI annotation generation', { imageId, imageUrl });

      const prompt = this.buildAnnotationPrompt();

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert ornithologist and Spanish language teacher. Your task is to identify anatomical features in bird images and provide accurate Spanish-English vocabulary with bounding boxes.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.3 // Lower temperature for more consistent results
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from Vision API');
      }

      // Parse the JSON response
      const annotations = this.parseAnnotationResponse(content);

      info('Vision AI annotations generated successfully', {
        imageId,
        annotationCount: annotations.length
      });

      return annotations;

    } catch (error) {
      logError('Failed to generate annotations with Vision AI', error as Error);
      throw error;
    }
  }

  /**
   * Build the annotation prompt for GPT-4 Vision
   */
  private buildAnnotationPrompt(): string {
    return `
Analyze this bird image and identify visible anatomical features that would be useful for Spanish language learning.
Return a JSON array with this EXACT structure (valid JSON only, no markdown):

[{
  "spanishTerm": "el pico",
  "englishTerm": "beak",
  "boundingBox": {"x": 0.45, "y": 0.30, "width": 0.10, "height": 0.08},
  "type": "anatomical",
  "difficultyLevel": 1,
  "pronunciation": "el PEE-koh",
  "confidence": 0.95
}]

GUIDELINES:
- Focus on these anatomical features: pico (beak), alas (wings), cola (tail), patas (legs),
  plumas (feathers), ojos (eyes), cuello (neck), pecho (breast), cabeza (head)
- Use normalized coordinates (0-1 range) for bounding boxes
- Bounding box coordinates: x and y are top-left corner, width and height are dimensions
- Only include features that are clearly visible in the image
- Difficulty levels: 1 (basic body parts), 2-3 (common features), 4-5 (advanced features)
- Pronunciation: Use simple phonetic guide (capital letters for stressed syllables)
- Confidence: 0.0-1.0 score for how confident you are in the annotation
- Type must be one of: anatomical, behavioral, color, pattern
- Provide 3-8 annotations per image
- Return ONLY valid JSON, no explanatory text

IMPORTANT: Return only the JSON array, nothing else.
`.trim();
  }

  /**
   * Parse annotation response from GPT-4 Vision
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
}

// Export singleton instance
export const visionAIService = new VisionAIService();
