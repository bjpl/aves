/**
 * Image Quality Validator Service
 * Validates image quality for annotation generation using Claude Sonnet 4.5 Vision API
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { info, error as logError } from '../utils/logger';

export interface QualityAssessment {
  suitable: boolean;
  score: number; // 0-100
  skipReason?: string;
  issues: string[];
  recommendations: string[];
}

/**
 * ImageQualityValidator Service
 * Assesses image quality before annotation generation
 */
export class ImageQualityValidator {
  private client: Anthropic;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      logError('ANTHROPIC_API_KEY not configured. Image quality validation will not work.');
      this.client = new Anthropic({ apiKey: 'dummy-key' });
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: 2 * 60 * 1000, // 2 minutes timeout
        maxRetries: 2
      });
      info('ImageQualityValidator initialized with Claude Sonnet 4.5');
    }
  }

  /**
   * Assess image quality for annotation generation
   * @param imageUrl - URL of the image to assess
   * @returns Promise<QualityAssessment>
   */
  async assessQuality(imageUrl: string): Promise<QualityAssessment> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      info('Starting image quality assessment', { imageUrl });

      // Fetch image and convert to base64
      const imageData = await this.fetchImageAsBase64(imageUrl);

      const prompt = this.buildQualityPrompt();

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

      // Parse the JSON response
      const assessment = this.parseQualityResponse(content.text);

      info('Image quality assessment completed', {
        imageUrl,
        suitable: assessment.suitable,
        score: assessment.score,
        skipReason: assessment.skipReason
      });

      return assessment;

    } catch (error) {
      logError('Failed to assess image quality', error as Error);
      throw error;
    }
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> {
    try {
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

      return { base64, mediaType };
    } catch (error) {
      logError('Failed to fetch and encode image', error as Error);
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
  }

  /**
   * Build the quality assessment prompt
   */
  private buildQualityPrompt(): string {
    return `
Assess the quality of this bird image for educational annotation generation.

QUALITY CRITERIA:
1. Bird Visibility (40 points):
   - Is there a clearly visible bird in the image? (Required)
   - Is the bird large enough to annotate features? (minimum 20% of image)
   - Is the bird in focus? (not blurred or motion-blurred)
   - Is the bird well-lit? (not too dark or overexposed)

2. Anatomical Feature Clarity (30 points):
   - Are key features (beak, wings, eyes, tail) visible?
   - Are features clear enough to draw bounding boxes around?
   - Is the bird's orientation suitable? (side profile or 3/4 view preferred)
   - Are features distinct and not obscured?

3. Image Technical Quality (20 points):
   - Resolution adequate? (minimum 400x400 pixels effective bird size)
   - Proper exposure and contrast?
   - Minimal noise or artifacts?
   - No significant obstructions?

4. Educational Value (10 points):
   - Multiple annotatable features visible?
   - Good representation of the species?
   - Suitable for language learning context?

UNSUITABLE IMAGE TYPES (auto-reject):
- No bird visible in the image
- Bird too small (less than 15% of image area)
- Extremely blurred or out of focus
- Severe overexposure or underexposure
- Bird completely obscured by objects
- Multiple overlapping birds (confusing for annotation)
- Silhouette only (no features visible)
- Artistic/stylized images (not photographic)

SCORING:
- 80-100: Excellent - ideal for annotation
- 60-79: Good - suitable for annotation
- 40-59: Fair - usable but not ideal
- 0-39: Poor - unsuitable for annotation

RETURN FORMAT (valid JSON only, no markdown):
{
  "suitable": true/false,
  "score": 0-100,
  "skipReason": "Brief reason if unsuitable (e.g., 'No bird visible', 'Bird too small', 'Severely blurred')",
  "issues": ["List of quality issues found"],
  "recommendations": ["Suggestions for improvement if applicable"]
}

IMPORTANT:
- Return ONLY the JSON object, nothing else
- Set "suitable" to false if score < 60
- Provide skipReason only if unsuitable
- Be objective and consistent in scoring
`.trim();
  }

  /**
   * Parse quality assessment response
   */
  private parseQualityResponse(content: string): QualityAssessment {
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/i, '');
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString);

      // Validate required fields
      if (typeof parsed.suitable !== 'boolean') {
        throw new Error('Missing or invalid "suitable" field');
      }
      if (typeof parsed.score !== 'number') {
        throw new Error('Missing or invalid "score" field');
      }

      // Normalize the assessment
      const assessment: QualityAssessment = {
        suitable: parsed.suitable && parsed.score >= 60,
        score: Math.max(0, Math.min(100, parsed.score)),
        skipReason: !parsed.suitable ? (parsed.skipReason || 'Image quality below threshold') : undefined,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };

      return assessment;

    } catch (error) {
      logError('Failed to parse quality assessment response', error as Error);
      logError('Raw content:', new Error(content));
      throw new Error('Failed to parse quality assessment response');
    }
  }

  /**
   * Check if the service is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const imageQualityValidator = new ImageQualityValidator();
