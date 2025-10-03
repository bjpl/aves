/**
 * AI Exercise Generator Tests
 *
 * Comprehensive test suite for GPT-4 exercise generation
 * Target: >80% code coverage
 */

import { Pool } from 'pg';
import { AIExerciseGenerator } from '../../services/aiExerciseGenerator';
import { UserContext } from '../../services/userContextBuilder';
import { ExerciseType } from '../../../../shared/types/exercise.types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
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

describe('AIExerciseGenerator', () => {
  let generator: AIExerciseGenerator;
  let mockCreate: jest.Mock;
  let pool: Pool;

  const mockContext: UserContext = {
    userId: 'user_123',
    level: 'intermediate',
    difficulty: 3,
    weakTopics: ['bird anatomy', 'colors'],
    masteredTopics: ['basic greetings'],
    newTopics: ['bird behavior'],
    recentErrors: [],
    streak: 5,
    performance: {
      totalExercises: 50,
      correctAnswers: 38,
      accuracy: 76,
      avgTimePerExercise: 15000,
      currentStreak: 5,
      longestStreak: 10
    },
    hash: 'abc123'
  };

  beforeEach(() => {
    // Create mock pool
    pool = { query: jest.fn() } as any;

    // Setup OpenAI mock
    const OpenAI = require('openai').default;
    mockCreate = jest.fn();
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));

    // Create generator instance
    generator = new AIExerciseGenerator(pool, {
      apiKey: 'test-api-key',
      maxRetries: 2,
      retryDelay: 100,
      modelVersion: 'gpt-4-turbo',
      temperature: 0.7
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const gen = new AIExerciseGenerator(pool, { apiKey: 'test-key' });
      expect(gen).toBeInstanceOf(AIExerciseGenerator);
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new AIExerciseGenerator(pool, { apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should use environment variable for API key', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const gen = new AIExerciseGenerator(pool);
      expect(gen).toBeInstanceOf(AIExerciseGenerator);
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('generateExercise', () => {
    it('should generate contextual fill exercise', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              sentence: 'El cardenal tiene plumas ___ brillantes.',
              correctAnswer: 'rojas',
              options: ['rojas', 'azules', 'verdes', 'amarillas'],
              context: 'Cardinals are known for their bright red plumage.',
              difficulty: 3
            })
          }
        }],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300
        }
      });

      const exercise = await generator.generateExercise('contextual_fill', mockContext);

      expect(exercise.type).toBe('contextual_fill');
      expect(exercise.id).toContain('ai_contextual_fill');
      expect((exercise as any).sentence).toContain('___');
      expect((exercise as any).correctAnswer).toBe('rojas');
      expect((exercise as any).options).toHaveLength(4);
    });

    it('should generate term matching exercise', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              spanishTerms: ['el pico', 'las alas', 'la cola'],
              englishTerms: ['beak', 'wings', 'tail'],
              correctPairs: [
                { spanish: 'el pico', english: 'beak' },
                { spanish: 'las alas', english: 'wings' },
                { spanish: 'la cola', english: 'tail' }
              ],
              category: 'Bird Anatomy',
              difficulty: 3
            })
          }
        }],
        usage: { prompt_tokens: 150, completion_tokens: 80, total_tokens: 230 }
      });

      const exercise = await generator.generateExercise('term_matching', mockContext);

      expect(exercise.type).toBe('term_matching');
      expect((exercise as any).spanishTerms).toHaveLength(3);
      expect((exercise as any).englishTerms).toHaveLength(3);
      expect((exercise as any).correctPairs).toHaveLength(3);
    });

    it('should generate visual identification exercise', async () => {
      const exercise = await generator.generateExercise('visual_identification', mockContext);

      expect(exercise.type).toBe('visual_identification');
      expect(exercise.prompt).toBeTruthy();
      expect(exercise.instructions).toBeTruthy();
      expect((exercise as any).metadata.bird).toBeTruthy();
    });

    it('should generate image labeling exercise', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              imageUrl: '/images/birds/cardinal.jpg',
              labels: [
                { term: 'el pico', correctPosition: { x: 0.45, y: 0.30 } },
                { term: 'las alas', correctPosition: { x: 0.35, y: 0.50 } },
                { term: 'la cola', correctPosition: { x: 0.70, y: 0.60 } }
              ],
              difficulty: 3
            })
          }
        }],
        usage: { prompt_tokens: 180, completion_tokens: 90, total_tokens: 270 }
      });

      const exercise = await generator.generateExercise('image_labeling', mockContext);

      expect(exercise.type).toBe('image_labeling');
      expect((exercise as any).imageUrl).toBeTruthy();
      expect((exercise as any).labels).toHaveLength(3);
      expect((exercise as any).labels[0].id).toBeTruthy();
    });

    it('should handle unknown exercise type', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              sentence: 'Test sentence ___.',
              correctAnswer: 'test',
              options: ['test', 'other'],
              difficulty: 3
            })
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      const exercise = await generator.generateExercise('unknown_type' as ExerciseType, mockContext);

      expect(exercise.type).toBe('contextual_fill'); // Falls back to contextual fill
    });
  });

  describe('buildContextualFillPrompt', () => {
    it('should build prompt with user context', () => {
      const prompt = (generator as any).buildContextualFillPrompt(mockContext);

      expect(prompt).toContain('Level: intermediate');
      expect(prompt).toContain('Current difficulty: 3/5');
      expect(prompt).toContain('bird anatomy');
      expect(prompt).toContain('colors');
      expect(prompt).toContain('Current streak: 5');
    });

    it('should handle empty weak topics', () => {
      const context = { ...mockContext, weakTopics: [], masteredTopics: [] };
      const prompt = (generator as any).buildContextualFillPrompt(context);

      expect(prompt).toContain('Struggling with: none');
      expect(prompt).toContain('Mastered: basic terms');
    });
  });

  describe('buildTermMatchingPrompt', () => {
    it('should build prompt for term matching', () => {
      const prompt = (generator as any).buildTermMatchingPrompt(mockContext);

      expect(prompt).toContain('5-8 Spanish-English pairs');
      expect(prompt).toContain('bird anatomy');
      expect(prompt).toContain('difficulty: 3');
    });
  });

  describe('callGPTWithRetry', () => {
    it('should successfully call GPT-4 on first attempt', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"test": "data"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      const result = await (generator as any).callGPTWithRetry('test prompt', 1);

      expect(result).toBe('{"test": "data"}');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"test": "data"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        });

      const result = await (generator as any).callGPTWithRetry('test prompt', 1);

      expect(result).toBe('{"test": "data"}');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      await expect(
        (generator as any).callGPTWithRetry('test prompt', 1)
      ).rejects.toThrow('Network error');

      expect(mockCreate).toHaveBeenCalledTimes(2); // maxRetries = 2
    });

    it('should not retry on API key error', async () => {
      mockCreate.mockRejectedValue(new Error('Invalid API key'));

      await expect(
        (generator as any).callGPTWithRetry('test prompt', 1)
      ).rejects.toThrow('Invalid API key');

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should throw error if response is empty', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 100, completion_tokens: 0, total_tokens: 100 }
      });

      await expect(
        (generator as any).callGPTWithRetry('test prompt', 1)
      ).rejects.toThrow('Empty response from GPT-4');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid JSON', () => {
      const response = '{"test": "data", "value": 123}';
      const parsed = (generator as any).parseResponse(response);

      expect(parsed.test).toBe('data');
      expect(parsed.value).toBe(123);
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"test": "data"}\n```';
      const parsed = (generator as any).parseResponse(response);

      expect(parsed.test).toBe('data');
    });

    it('should parse JSON wrapped in plain code blocks', () => {
      const response = '```\n{"test": "data"}\n```';
      const parsed = (generator as any).parseResponse(response);

      expect(parsed.test).toBe('data');
    });

    it('should throw error on invalid JSON', () => {
      const response = 'invalid json';

      expect(() => {
        (generator as any).parseResponse(response);
      }).toThrow('Invalid JSON response from GPT-4');
    });
  });

  describe('validateContextualFillResponse', () => {
    it('should validate correct response', () => {
      const response = {
        sentence: 'El pájaro tiene plumas ___.',
        correctAnswer: 'rojas',
        options: ['rojas', 'azules', 'verdes'],
        difficulty: 3
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(true);
    });

    it('should reject response without sentence', () => {
      const response = {
        sentence: '',
        correctAnswer: 'rojas',
        options: ['rojas', 'azules']
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(false);
    });

    it('should reject response without blank marker', () => {
      const response = {
        sentence: 'El pájaro tiene plumas rojas.',
        correctAnswer: 'rojas',
        options: ['rojas', 'azules']
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(false);
    });

    it('should reject response with invalid options array', () => {
      const response = {
        sentence: 'El pájaro tiene plumas ___.',
        correctAnswer: 'rojas',
        options: []
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(false);
    });

    it('should reject response where correctAnswer is not in options', () => {
      const response = {
        sentence: 'El pájaro tiene plumas ___.',
        correctAnswer: 'rojas',
        options: ['azules', 'verdes']
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(false);
    });

    it('should reject response with invalid difficulty', () => {
      const response = {
        sentence: 'El pájaro tiene plumas ___.',
        correctAnswer: 'rojas',
        options: ['rojas', 'azules'],
        difficulty: 6
      };

      expect((generator as any).validateContextualFillResponse(response)).toBe(false);
    });
  });

  describe('validateTermMatchingResponse', () => {
    it('should validate correct response', () => {
      const response = {
        spanishTerms: ['el pico', 'las alas', 'la cola'],
        englishTerms: ['beak', 'wings', 'tail'],
        correctPairs: [
          { spanish: 'el pico', english: 'beak' },
          { spanish: 'las alas', english: 'wings' },
          { spanish: 'la cola', english: 'tail' }
        ],
        category: 'Anatomy',
        difficulty: 3
      };

      expect((generator as any).validateTermMatchingResponse(response)).toBe(true);
    });

    it('should reject response with mismatched array lengths', () => {
      const response = {
        spanishTerms: ['el pico', 'las alas'],
        englishTerms: ['beak'],
        correctPairs: []
      };

      expect((generator as any).validateTermMatchingResponse(response)).toBe(false);
    });

    it('should reject response with too few terms', () => {
      const response = {
        spanishTerms: ['el pico'],
        englishTerms: ['beak'],
        correctPairs: [{ spanish: 'el pico', english: 'beak' }]
      };

      expect((generator as any).validateTermMatchingResponse(response)).toBe(false);
    });

    it('should reject response with invalid pair references', () => {
      const response = {
        spanishTerms: ['el pico', 'las alas', 'la cola'],
        englishTerms: ['beak', 'wings', 'tail'],
        correctPairs: [
          { spanish: 'invalid term', english: 'beak' }
        ]
      };

      expect((generator as any).validateTermMatchingResponse(response)).toBe(false);
    });
  });

  describe('validateImageLabelingResponse', () => {
    it('should validate correct response', () => {
      const response = {
        imageUrl: '/images/bird.jpg',
        labels: [
          { term: 'el pico', correctPosition: { x: 0.5, y: 0.3 } },
          { term: 'las alas', correctPosition: { x: 0.4, y: 0.5 } },
          { term: 'la cola', correctPosition: { x: 0.7, y: 0.6 } }
        ],
        difficulty: 3
      };

      expect((generator as any).validateImageLabelingResponse(response)).toBe(true);
    });

    it('should reject response without imageUrl', () => {
      const response = {
        imageUrl: '',
        labels: [{ term: 'el pico', correctPosition: { x: 0.5, y: 0.3 } }]
      };

      expect((generator as any).validateImageLabelingResponse(response)).toBe(false);
    });

    it('should reject response with too few labels', () => {
      const response = {
        imageUrl: '/images/bird.jpg',
        labels: [
          { term: 'el pico', correctPosition: { x: 0.5, y: 0.3 } }
        ]
      };

      expect((generator as any).validateImageLabelingResponse(response)).toBe(false);
    });

    it('should reject response with invalid coordinates', () => {
      const response = {
        imageUrl: '/images/bird.jpg',
        labels: [
          { term: 'el pico', correctPosition: { x: 1.5, y: 0.3 } },
          { term: 'las alas', correctPosition: { x: 0.4, y: 0.5 } },
          { term: 'la cola', correctPosition: { x: 0.7, y: 0.6 } }
        ]
      };

      expect((generator as any).validateImageLabelingResponse(response)).toBe(false);
    });

    it('should reject response with missing position fields', () => {
      const response = {
        imageUrl: '/images/bird.jpg',
        labels: [
          { term: 'el pico', correctPosition: { x: 0.5 } },
          { term: 'las alas', correctPosition: { x: 0.4, y: 0.5 } },
          { term: 'la cola', correctPosition: { x: 0.7, y: 0.6 } }
        ]
      };

      expect((generator as any).validateImageLabelingResponse(response)).toBe(false);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track successful request statistics', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              sentence: 'Test ___.',
              correctAnswer: 'test',
              options: ['test', 'other'],
              difficulty: 3
            })
          }
        }],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300
        }
      });

      await generator.generateExercise('contextual_fill', mockContext);

      const stats = generator.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.totalTokensUsed).toBe(300);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should track failed requests', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        generator.generateExercise('contextual_fill', mockContext)
      ).rejects.toThrow();

      const stats = generator.getStatistics();
      expect(stats.failedRequests).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              sentence: 'Test ___.',
              correctAnswer: 'test',
              options: ['test', 'other'],
              difficulty: 3
            })
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      await generator.generateExercise('contextual_fill', mockContext);
      generator.resetStatistics();

      const stats = generator.getStatistics();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokensUsed).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate exercise generation cost', () => {
      const cost = generator.estimateCost();
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.1); // Should be a few cents
    });
  });

  describe('Exercise ID Generation', () => {
    it('should generate unique exercise IDs', () => {
      const id1 = (generator as any).generateExerciseId('test');
      const id2 = (generator as any).generateExerciseId('test');

      expect(id1).toContain('ai_test_');
      expect(id2).toContain('ai_test_');
      expect(id1).not.toBe(id2);
    });
  });

  describe('Pronunciation Helper', () => {
    it('should return pronunciations for known terms', () => {
      expect((generator as any).getPronunciation('pico')).toBe('PEE-koh');
      expect((generator as any).getPronunciation('alas')).toBe('AH-lahs');
      expect((generator as any).getPronunciation('cola')).toBe('KOH-lah');
    });

    it('should return term itself for unknown pronunciations', () => {
      expect((generator as any).getPronunciation('unknown')).toBe('unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('Generation failed'));

      await expect(
        generator.generateExercise('contextual_fill', mockContext)
      ).rejects.toThrow('Generation failed');
    });

    it('should handle invalid response format', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              sentence: 'Invalid exercise without required fields'
            })
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      await expect(
        generator.generateExercise('contextual_fill', mockContext)
      ).rejects.toThrow('Invalid contextual fill response');
    });
  });
});
