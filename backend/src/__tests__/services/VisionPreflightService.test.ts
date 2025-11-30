/**
 * VisionPreflightService Tests
 * Test suite for lightweight bird detection preflight checks
 */

import { VisionPreflightService, BirdDetectionResult } from '../../services/VisionPreflightService';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

// Mock dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('VisionPreflightService', () => {
  let service: VisionPreflightService;
  let mockCreate: jest.Mock;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    // Clear environment and mocks
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

    // Create mock for messages.create
    mockCreate = jest.fn();

    // Mock Anthropic constructor
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: {
        create: mockCreate
      }
    } as any));

    // Mock axios
    mockAxios = axios as jest.Mocked<typeof axios>;

    // Create fresh service instance
    service = new VisionPreflightService();
    service.clearCache();
    service.resetStats();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectBird', () => {
    it('should detect bird successfully with minimal tokens', async () => {
      // Mock image fetch
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      // Mock Claude API response
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.92,
              size: 35,
              position: { x: 0.45, y: 0.30 },
              occlusion: 10,
              note: 'Clear bird, good size'
            })
          }
        ],
        usage: {
          input_tokens: 650,
          output_tokens: 120
        }
      } as any);

      const result = await service.detectBird('https://example.com/bird.jpg');

      expect(result.birdDetected).toBe(true);
      expect(result.confidence).toBe(0.92);
      expect(result.approximateSize).toBe(35);
      expect(result.position.x).toBe(0.45);
      expect(result.position.y).toBe(0.30);
      expect(result.occlusion).toBe(10);
      expect(result.quickAssessment).toBe('Clear bird, good size');

      // Verify API was called with lightweight settings
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 200, // Minimal for preflight
          temperature: 0.2
        })
      );
    });

    it('should handle no bird detected', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: false,
              confidence: 0.15,
              size: 0,
              position: { x: 0.5, y: 0.5 },
              occlusion: 100,
              note: 'No bird visible'
            })
          }
        ],
        usage: {
          input_tokens: 620,
          output_tokens: 80
        }
      } as any);

      const result = await service.detectBird('https://example.com/landscape.jpg');

      expect(result.birdDetected).toBe(false);
      expect(result.confidence).toBe(0.15);
      expect(result.approximateSize).toBe(0);
    });

    it('should use cache for repeated requests', async () => {
      // First request
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.88,
              size: 25,
              position: { x: 0.5, y: 0.4 },
              occlusion: 5,
              note: 'Good'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 100 }
      } as any);

      const result1 = await service.detectBird('https://example.com/bird.jpg');
      expect(result1.birdDetected).toBe(true);

      // Second request should use cache
      const result2 = await service.detectBird('https://example.com/bird.jpg');
      expect(result2).toEqual(result1);

      // API should only be called once
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Cache stats should show hit
      const cacheStats = service.getCacheStats();
      expect(cacheStats.validEntries).toBe(1);
    });

    it('should handle markdown-wrapped JSON response', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify({
              detected: true,
              confidence: 0.85,
              size: 30,
              position: { x: 0.6, y: 0.3 },
              occlusion: 15,
              note: 'Good'
            }) + '\n```'
          }
        ],
        usage: { input_tokens: 680, output_tokens: 110 }
      } as any);

      const result = await service.detectBird('https://example.com/bird.jpg');

      expect(result.birdDetected).toBe(true);
      expect(result.confidence).toBe(0.85);
    });

    it('should handle parse errors gracefully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response'
          }
        ],
        usage: { input_tokens: 650, output_tokens: 50 }
      } as any);

      const result = await service.detectBird('https://example.com/bird.jpg');

      // Should return safe defaults
      expect(result.birdDetected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.approximateSize).toBe(0);
      expect(result.quickAssessment).toBe('Parse failed');
    });

    it('should throw error if API key not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const unconfiguredService = new VisionPreflightService();

      await expect(
        unconfiguredService.detectBird('https://example.com/bird.jpg')
      ).rejects.toThrow('Anthropic API key not configured');
    });
  });

  describe('shouldProcess', () => {
    it('should return true for suitable images', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.92, // Above threshold (0.6)
              size: 35, // Above threshold (5%)
              position: { x: 0.45, y: 0.30 },
              occlusion: 10, // Below threshold (40%)
              note: 'Perfect for annotation'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 120 }
      } as any);

      const shouldProcess = await service.shouldProcess('https://example.com/bird.jpg');

      expect(shouldProcess).toBe(true);
    });

    it('should return false for low confidence', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.45, // Below threshold (0.6)
              size: 30,
              position: { x: 0.5, y: 0.4 },
              occlusion: 15,
              note: 'Uncertain detection'
            })
          }
        ],
        usage: { input_tokens: 680, output_tokens: 100 }
      } as any);

      const shouldProcess = await service.shouldProcess('https://example.com/bird.jpg');

      expect(shouldProcess).toBe(false);
    });

    it('should return false for too small bird', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.85,
              size: 3, // Below threshold (5%)
              position: { x: 0.7, y: 0.2 },
              occlusion: 5,
              note: 'Bird too small'
            })
          }
        ],
        usage: { input_tokens: 690, output_tokens: 110 }
      } as any);

      const shouldProcess = await service.shouldProcess('https://example.com/bird.jpg');

      expect(shouldProcess).toBe(false);
    });

    it('should return false for high occlusion', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.80,
              size: 25,
              position: { x: 0.5, y: 0.4 },
              occlusion: 65, // Above threshold (40%)
              note: 'Heavily obscured'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 115 }
      } as any);

      const shouldProcess = await service.shouldProcess('https://example.com/bird.jpg');

      expect(shouldProcess).toBe(false);
    });

    it('should return true on error to avoid blocking', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const shouldProcess = await service.shouldProcess('https://example.com/bird.jpg');

      expect(shouldProcess).toBe(true);
    });
  });

  describe('batchCheck', () => {
    it('should process multiple images', async () => {
      const imageUrls = [
        'https://example.com/bird1.jpg',
        'https://example.com/bird2.jpg',
        'https://example.com/bird3.jpg'
      ];

      // Mock responses for each image
      for (let i = 0; i < imageUrls.length; i++) {
        mockAxios.get.mockResolvedValueOnce({
          data: Buffer.from('fake-image-data'),
          headers: { 'content-type': 'image/jpeg' }
        } as any);

        mockCreate.mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                detected: i < 2, // First two have birds
                confidence: i < 2 ? 0.85 : 0.30,
                size: i < 2 ? 30 : 2,
                position: { x: 0.5, y: 0.4 },
                occlusion: i < 2 ? 10 : 80,
                note: i < 2 ? 'Good' : 'Poor quality'
              })
            }
          ],
          usage: { input_tokens: 700, output_tokens: 110 }
        } as any);
      }

      const results = await service.batchCheck(imageUrls);

      expect(results).toHaveLength(3);
      expect(results[0].result.birdDetected).toBe(true);
      expect(results[0].shouldProcess).toBe(true);
      expect(results[1].result.birdDetected).toBe(true);
      expect(results[1].shouldProcess).toBe(true);
      expect(results[2].result.birdDetected).toBe(false);
      expect(results[2].shouldProcess).toBe(false);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track performance statistics', async () => {
      mockAxios.get.mockResolvedValue({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      // Mock bird detected
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.90,
              size: 30,
              position: { x: 0.5, y: 0.4 },
              occlusion: 10,
              note: 'Good'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 100 }
      } as any);

      // Mock bird rejected
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: false,
              confidence: 0.20,
              size: 0,
              position: { x: 0.5, y: 0.5 },
              occlusion: 100,
              note: 'No bird'
            })
          }
        ],
        usage: { input_tokens: 650, output_tokens: 80 }
      } as any);

      await service.detectBird('https://example.com/bird1.jpg');
      await service.detectBird('https://example.com/bird2.jpg');

      const stats = service.getStats();

      expect(stats.totalChecks).toBe(2);
      expect(stats.birdDetected).toBe(1);
      expect(stats.birdRejected).toBe(1);
      expect(stats.avgConfidence).toBeCloseTo(0.55);
      expect(stats.avgTokensUsed).toBeCloseTo(765);
    });

    it('should calculate cost savings', async () => {
      mockAxios.get.mockResolvedValue({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      // Reject 3 images
      for (let i = 0; i < 3; i++) {
        mockCreate.mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                detected: false,
                confidence: 0.20,
                size: 0,
                position: { x: 0.5, y: 0.5 },
                occlusion: 100,
                note: 'No bird'
              })
            }
          ],
          usage: { input_tokens: 700, output_tokens: 100 }
        } as any);

        await service.detectBird(`https://example.com/bird${i}.jpg`);
      }

      const savings = service.getCostSavings();

      expect(savings.totalPreflightChecks).toBe(3);
      expect(savings.imagesRejected).toBe(3);
      expect(savings.tokensSaved).toBeGreaterThan(0);
      expect(parseFloat(savings.savingsPercentage)).toBeGreaterThan(85);
    });

    it('should provide cache statistics', () => {
      const cacheStats = service.getCacheStats();

      expect(cacheStats).toHaveProperty('totalEntries');
      expect(cacheStats).toHaveProperty('validEntries');
      expect(cacheStats).toHaveProperty('expiredEntries');
      expect(cacheStats).toHaveProperty('maxSize');
      expect(cacheStats).toHaveProperty('cacheTTL');
    });

    it('should provide quality thresholds', () => {
      const thresholds = service.getThresholds();

      expect(thresholds.minConfidence).toBe(0.6);
      expect(thresholds.minSize).toBe(5);
      expect(thresholds.maxOcclusion).toBe(40);
    });
  });

  describe('configuration', () => {
    it('should report configured state', () => {
      expect(service.isConfigured()).toBe(true);

      delete process.env.ANTHROPIC_API_KEY;
      const unconfiguredService = new VisionPreflightService();
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should clear cache on demand', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.85,
              size: 30,
              position: { x: 0.5, y: 0.4 },
              occlusion: 10,
              note: 'Good'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 100 }
      } as any);

      await service.detectBird('https://example.com/bird.jpg');

      let cacheStats = service.getCacheStats();
      expect(cacheStats.totalEntries).toBe(1);

      service.clearCache();

      cacheStats = service.getCacheStats();
      expect(cacheStats.totalEntries).toBe(0);
    });

    it('should reset statistics on demand', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' }
      } as any);

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              detected: true,
              confidence: 0.85,
              size: 30,
              position: { x: 0.5, y: 0.4 },
              occlusion: 10,
              note: 'Good'
            })
          }
        ],
        usage: { input_tokens: 700, output_tokens: 100 }
      } as any);

      await service.detectBird('https://example.com/bird.jpg');

      let stats = service.getStats();
      expect(stats.totalChecks).toBe(1);

      service.resetStats();

      stats = service.getStats();
      expect(stats.totalChecks).toBe(0);
    });
  });
});
