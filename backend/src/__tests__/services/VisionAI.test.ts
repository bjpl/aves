/**
 * VisionAI Service Tests
 *
 * Tests for GPT-4o Vision integration and annotation generation
 */

import { Pool } from 'pg';
import { VisionAI } from '../../services/visionAI';
import { AnnotationType } from '../../../../shared/types/annotation.types';

// Mock Anthropic SDK (not OpenAI!)
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('VisionAI Service', () => {
  let pool: Pool;
  let visionAI: VisionAI;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Create mock pool
    pool = {
      query: jest.fn()
    } as any;

    // Setup Anthropic mock
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockCreate = jest.fn();
    Anthropic.mockImplementation(() => ({
      messages: {
        create: mockCreate
      }
    }));

    // Mock global fetch for image fetching
    // Create a fake JPEG image (minimal valid JPEG header)
    const fakeImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('image/jpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(fakeImageBuffer)
    } as any);

    // Create VisionAI instance
    visionAI = new VisionAI(pool, {
      apiKey: 'test-api-key',
      cacheEnabled: false, // Disable cache for most tests
      retryDelay: 100 // Faster retries for tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseAnnotations', () => {
    it('should parse valid JSON array response', () => {
      const response = JSON.stringify([
        {
          spanishTerm: 'el pico',
          englishTerm: 'beak',
          boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
          type: 'anatomical',
          difficultyLevel: 1,
          pronunciation: 'el PEE-koh'
        }
      ]);

      const result = (visionAI as any).parseAnnotations(response);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('el pico');
      expect(result[0].englishTerm).toBe('beak');
    });

    it('should parse wrapped response with annotations key', () => {
      const response = JSON.stringify({
        annotations: [
          {
            spanishTerm: 'las alas',
            englishTerm: 'wings',
            boundingBox: { x: 0.2, y: 0.4, width: 0.6, height: 0.3 },
            type: 'anatomical',
            difficultyLevel: 1
          }
        ]
      });

      const result = (visionAI as any).parseAnnotations(response);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('las alas');
    });

    it('should handle single object response', () => {
      const response = JSON.stringify({
        spanishTerm: 'la cola',
        englishTerm: 'tail',
        boundingBox: { x: 0.5, y: 0.6, width: 0.3, height: 0.2 },
        type: 'anatomical',
        difficultyLevel: 1
      });

      const result = (visionAI as any).parseAnnotations(response);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('la cola');
    });

    it('should throw error on invalid JSON', () => {
      expect(() => {
        (visionAI as any).parseAnnotations('invalid json');
      }).toThrow('Invalid JSON response');
    });
  });

  describe('validateBoundingBox', () => {
    it('should validate correct bounding box', () => {
      const box = { x: 0.4, y: 0.3, width: 0.2, height: 0.15 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(true);
    });

    it('should reject box with negative coordinates', () => {
      const box = { x: -0.1, y: 0.3, width: 0.2, height: 0.15 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(false);
    });

    it('should reject box exceeding bounds (> 1.0)', () => {
      const box = { x: 0.8, y: 0.3, width: 0.3, height: 0.15 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(false);
    });

    it('should reject box that is too small', () => {
      const box = { x: 0.4, y: 0.3, width: 0.005, height: 0.15 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const box = { x: '0.4', y: 0.3, width: 0.2, height: 0.15 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(false);
    });

    it('should reject missing fields', () => {
      const box = { x: 0.4, y: 0.3, width: 0.2 };
      expect((visionAI as any).validateBoundingBox(box)).toBe(false);
    });
  });

  describe('validateAnnotation', () => {
    const validAnnotation = {
      spanishTerm: 'el pico',
      englishTerm: 'beak',
      boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
      type: 'anatomical' as AnnotationType,
      difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5,
      pronunciation: 'el PEE-koh'
    };

    it('should validate correct annotation', () => {
      expect((visionAI as any).validateAnnotation(validAnnotation)).toBe(true);
    });

    it('should reject annotation without Spanish term', () => {
      const invalid = { ...validAnnotation, spanishTerm: '' };
      expect((visionAI as any).validateAnnotation(invalid)).toBe(false);
    });

    it('should reject annotation without English term', () => {
      const invalid = { ...validAnnotation, englishTerm: '' };
      expect((visionAI as any).validateAnnotation(invalid)).toBe(false);
    });

    it('should reject annotation with invalid type', () => {
      const invalid = { ...validAnnotation, type: 'invalid' };
      expect((visionAI as any).validateAnnotation(invalid)).toBe(false);
    });

    it('should reject annotation with invalid difficulty', () => {
      const invalid = { ...validAnnotation, difficultyLevel: 6 };
      expect((visionAI as any).validateAnnotation(invalid)).toBe(false);
    });

    it('should reject annotation with invalid bounding box', () => {
      const invalid = {
        ...validAnnotation,
        boundingBox: { x: 1.5, y: 0.3, width: 0.1, height: 0.08 }
      };
      expect((visionAI as any).validateAnnotation(invalid)).toBe(false);
    });
  });

  describe('validateResponse', () => {
    it('should validate array of annotations', () => {
      const response = [
        {
          spanishTerm: 'el pico',
          englishTerm: 'beak',
          boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
          type: 'anatomical',
          difficultyLevel: 1
        }
      ];

      expect(visionAI.validateResponse(response)).toBe(true);
    });

    it('should validate wrapped annotations', () => {
      const response = {
        annotations: [
          {
            spanishTerm: 'el pico',
            englishTerm: 'beak',
            boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
            type: 'anatomical',
            difficultyLevel: 1
          }
        ]
      };

      expect(visionAI.validateResponse(response)).toBe(true);
    });

    it('should reject empty response', () => {
      expect(visionAI.validateResponse([])).toBe(false);
    });

    it('should reject response with invalid annotation', () => {
      const response = [
        {
          spanishTerm: 'el pico',
          englishTerm: '', // Invalid: empty
          boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
          type: 'anatomical',
          difficultyLevel: 1
        }
      ];

      expect(visionAI.validateResponse(response)).toBe(false);
    });
  });

  describe('convertToAnnotations', () => {
    it('should convert GPT responses to full annotations', () => {
      const responses = [
        {
          spanishTerm: 'el pico',
          englishTerm: 'beak',
          boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
          type: 'anatomical' as AnnotationType,
          difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5,
          pronunciation: 'el PEE-koh'
        }
      ];

      const result = (visionAI as any).convertToAnnotations(responses, 'img_123');

      expect(result).toHaveLength(1);
      expect(result[0].imageId).toBe('img_123');
      expect(result[0].spanishTerm).toBe('el pico');
      expect(result[0].englishTerm).toBe('beak');
      expect(result[0].boundingBox.topLeft).toEqual({ x: 0.4, y: 0.3 });
      expect(result[0].boundingBox.bottomRight).toEqual({ x: 0.5, y: 0.38 });
      expect(result[0].isVisible).toBe(false);
      expect(result[0].id).toContain('img_123');
    });

    it('should generate unique IDs for each annotation', () => {
      const responses = [
        {
          spanishTerm: 'el pico',
          englishTerm: 'beak',
          boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
          type: 'anatomical' as AnnotationType,
          difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5
        },
        {
          spanishTerm: 'las alas',
          englishTerm: 'wings',
          boundingBox: { x: 0.2, y: 0.4, width: 0.6, height: 0.3 },
          type: 'anatomical' as AnnotationType,
          difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5
        }
      ];

      const result = (visionAI as any).convertToAnnotations(responses, 'img_123');

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe(result[1].id);
    });
  });

  describe('annotateImage', () => {
    beforeEach(() => {
      // Mock successful Claude response (Anthropic format)
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify([
            {
              spanishTerm: 'el pico',
              englishTerm: 'beak',
              boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
              type: 'anatomical',
              difficultyLevel: 1,
              pronunciation: 'el PEE-koh'
            }
          ])
        }],
        usage: { input_tokens: 100, output_tokens: 400 }
      });
    });

    it('should successfully annotate an image', async () => {
      const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('el pico');
      expect(result[0].imageId).toBe('img_123');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          content: [{
            type: 'text',
            text: JSON.stringify([
              {
                spanishTerm: 'el pico',
                englishTerm: 'beak',
                boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
                type: 'anatomical',
                difficultyLevel: 1
              }
            ])
          }],
          usage: { input_tokens: 100, output_tokens: 400 }
        });

      const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');

      expect(result).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should filter out invalid annotations', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify([
            {
              spanishTerm: 'el pico',
              englishTerm: 'beak',
              boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
              type: 'anatomical',
              difficultyLevel: 1
            },
            {
              spanishTerm: '', // Invalid
              englishTerm: 'invalid',
              boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
              type: 'anatomical',
              difficultyLevel: 1
            }
          ])
        }],
        usage: { input_tokens: 100, output_tokens: 400 }
      });

      const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');

      expect(result).toHaveLength(1); // Only valid annotation
      expect(result[0].spanishTerm).toBe('el pico');
    });

    it('should throw error if all annotations are invalid', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify([
            {
              spanishTerm: '', // Invalid
              englishTerm: 'invalid',
              boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
              type: 'anatomical',
              difficultyLevel: 1
            }
          ])
        }],
        usage: { input_tokens: 100, output_tokens: 400 }
      });

      await expect(
        visionAI.annotateImage('https://example.com/bird.jpg', 'img_123')
      ).rejects.toThrow('No valid annotations');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      mockCreate = jest.fn();
      Anthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      visionAI = new VisionAI(pool, {
        apiKey: 'test-api-key',
        cacheEnabled: true,
        retryDelay: 100
      });

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify([
            {
              spanishTerm: 'el pico',
              englishTerm: 'beak',
              boundingBox: { x: 0.4, y: 0.3, width: 0.1, height: 0.08 },
              type: 'anatomical',
              difficultyLevel: 1
            }
          ])
        }],
        usage: { input_tokens: 100, output_tokens: 400 }
      });
    });

    it('should return cached annotations if available', async () => {
      const cachedAnnotations = [{
        id: 'cached_1',
        imageId: 'img_old',
        boundingBox: {
          topLeft: { x: 0.4, y: 0.3 },
          bottomRight: { x: 0.5, y: 0.38 },
          width: 0.1,
          height: 0.08
        },
        type: 'anatomical' as AnnotationType,
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5,
        isVisible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          annotations: JSON.stringify(cachedAnnotations),
          created_at: new Date(),
          model_version: 'gpt-4o'
        }]
      });

      const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');

      expect(result).toHaveLength(1);
      expect(result[0].imageId).toBe('img_123'); // Updated to new image ID
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should call GPT if cache miss', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Cache insert

      const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');

      expect(result).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});
