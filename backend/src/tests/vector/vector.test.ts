/**
 * Vector Services Unit Tests
 *
 * Tests for EmbeddingService and RuVectorService foundation
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { VectorConfig, EmbeddingContentType, VectorDocument, SearchOptions } from '../../types/vector.types';
import { createVectorConfig } from '../../config/vector.config';

// Mock RuVector module
jest.mock('ruvector', () => {
  return jest.fn().mockImplementation(() => ({
    embed: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
    insert: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([
      { id: 'test-1', score: 0.95, metadata: { type: 'vocabulary' } },
      { id: 'test-2', score: 0.85, metadata: { type: 'vocabulary' } },
    ]),
    delete: jest.fn().mockResolvedValue(undefined),
    stats: jest.fn().mockResolvedValue({ count: 100, size: 1024 }),
    close: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: new Array(768).fill(0.1).join(',') }],
      }),
    },
  }));
});

describe('Vector Services Foundation', () => {
  let testConfig: VectorConfig;

  beforeAll(() => {
    // Set test environment
    process.env.VECTOR_DIMENSIONS = '768';
    process.env.VECTOR_EMBEDDING_PROVIDER = 'local';
    process.env.VECTOR_SEMANTIC_DB_PATH = ':memory:';
    process.env.VECTOR_AGENTIC_DB_PATH = ':memory:';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testConfig = createVectorConfig({
      semanticStoragePath: ':memory:',
      agenticStoragePath: ':memory:',
      fallbackToPostgres: false,
    });
  });

  describe('VectorConfig', () => {
    it('should create valid default configuration', () => {
      const config = createVectorConfig();

      expect(config.dimensions).toBe(768);
      expect(config.embeddingProvider).toBe('local');
      expect(config.quantization).toBe('scalar');
      expect(config.hnsw.m).toBe(16);
      expect(config.hnsw.efConstruction).toBe(200);
      expect(config.hnsw.efSearch).toBe(50);
    });

    it('should allow configuration overrides', () => {
      const config = createVectorConfig({
        dimensions: 1024,
        quantization: 'product',
        hnsw: { m: 32, efConstruction: 400, efSearch: 100 },
      });

      expect(config.dimensions).toBe(1024);
      expect(config.quantization).toBe('product');
      expect(config.hnsw.m).toBe(32);
    });

    it('should throw on invalid configuration', () => {
      expect(() => createVectorConfig({ dimensions: 0 }))
        .toThrow('dimensions must be between 1 and 4096');

      expect(() => createVectorConfig({ hnsw: { m: 1, efConstruction: 200, efSearch: 50 } }))
        .toThrow('HNSW m parameter must be between 2 and 100');
    });
  });

  describe('EmbeddingService', () => {
    // Dynamic import to work with mocks
    let EmbeddingService: any;
    let createEmbeddingService: any;
    let cleanupEmbeddingService: any;

    beforeAll(async () => {
      const module = await import('../../services/vector/core/EmbeddingService');
      EmbeddingService = module.EmbeddingService;
      createEmbeddingService = module.createEmbeddingService;
      cleanupEmbeddingService = module.cleanupEmbeddingService;
    });

    afterEach(async () => {
      await cleanupEmbeddingService();
    });

    it('should initialize with local provider', () => {
      const service = new EmbeddingService(testConfig);

      expect(service.getProvider()).toBe('local');
      expect(service.getDimensions()).toBe(768);
    });

    it('should generate embeddings for text', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedText('test text', 'vocabulary');

      expect(result.embedding).toBeDefined();
      expect(result.dimensions).toBe(768);
      expect(result.provider).toBe('local');
      expect(result.type).toBe('vocabulary');
    });

    it('should generate batch embeddings', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedBatch(['text1', 'text2', 'text3'], 'vocabulary');

      expect(result.embeddings).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.dimensions).toBe(768);
    });

    it('should embed vocabulary terms', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedVocabulary('pájaro', 'bird');

      expect(result.type).toBe('vocabulary');
      expect(result.embedding).toBeDefined();
    });

    it('should embed annotations', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedAnnotation(
        ['red head', 'black wings'],
        'This appears to be a woodpecker based on features',
        'woodpecker'
      );

      expect(result.type).toBe('annotation');
      expect(result.embedding).toBeDefined();
    });

    it('should embed exercises', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedExercise(
        'What is the Spanish word for bird?',
        'pájaro',
        'vocabulary'
      );

      expect(result.type).toBe('exercise');
      expect(result.embedding).toBeDefined();
    });

    it('should embed user context', async () => {
      const service = new EmbeddingService(testConfig);

      const result = await service.embedUserContext(
        'User identified woodpecker image',
        'Submitted correct answer',
        'Success - correct identification'
      );

      expect(result.type).toBe('context');
      expect(result.embedding).toBeDefined();
    });

    it('should create singleton instance', () => {
      const service1 = createEmbeddingService(testConfig);
      const service2 = createEmbeddingService(testConfig);

      expect(service1).toBe(service2);
    });
  });

  describe('RuVectorService', () => {
    let RuVectorService: any;
    let createRuVectorService: any;
    let cleanupRuVectorService: any;
    let EmbeddingService: any;

    beforeAll(async () => {
      const vectorModule = await import('../../services/vector/core/RuVectorService');
      const embeddingModule = await import('../../services/vector/core/EmbeddingService');

      RuVectorService = vectorModule.RuVectorService;
      createRuVectorService = vectorModule.createRuVectorService;
      cleanupRuVectorService = vectorModule.cleanupRuVectorService;
      EmbeddingService = embeddingModule.EmbeddingService;
    });

    afterEach(async () => {
      await cleanupRuVectorService();
    });

    it('should initialize dual databases', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);

      await service.initialize();

      const health = await service.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.semanticDbConnected).toBe(true);
      expect(health.agenticDbConnected).toBe(true);

      await service.close();
    });

    it('should store and retrieve documents', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const doc = {
        id: 'vocab-1',
        type: 'vocabulary' as const,
        embedding: new Float32Array(768).fill(0.1),
        metadata: { term: 'pájaro', definition: 'bird' },
      };

      const storeResult = await service.storeDocument(doc);
      expect(storeResult.success).toBe(true);
      expect(storeResult.data).toBe('vocab-1');

      await service.close();
    });

    it('should perform similarity search', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const queryEmbedding = new Float32Array(768).fill(0.1);
      const searchResult = await service.searchSimilar(queryEmbedding, { k: 5 });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toBeDefined();
      expect(Array.isArray(searchResult.data)).toBe(true);

      await service.close();
    });

    it('should perform hybrid search', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const queryEmbedding = new Float32Array(768).fill(0.1);
      const searchResult = await service.hybridSearch(queryEmbedding, {
        textQuery: 'bird',
        k: 5,
        textWeight: 0.3,
        vectorWeight: 0.7,
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toBeDefined();

      await service.close();
    });

    it('should record reflexion episodes', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const result = await service.recordReflexion({
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date(),
        situation: 'User attempted to identify a woodpecker',
        action: 'Selected correct answer',
        outcome: 'Success',
        reflection: 'User shows good pattern recognition',
        success: true,
      });

      expect(result.success).toBe(true);

      await service.close();
    });

    it('should record and retrieve skills', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const recordResult = await service.recordSkill({
        userId: 'user-1',
        skillName: 'species-identification',
        level: 5,
        lastPracticed: new Date(),
        exercisesCompleted: 20,
        successRate: 0.85,
      });

      expect(recordResult.success).toBe(true);

      await service.close();
    });

    it('should query past experiences', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const result = await service.queryExperiences({
        userId: 'user-1',
        query: 'woodpecker identification',
        limit: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      await service.close();
    });

    it('should get database statistics', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      const result = await service.getStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalDocuments).toBeDefined();

      await service.close();
    });

    it('should clean up resources on close', async () => {
      const embeddingService = new EmbeddingService(testConfig);
      const service = new RuVectorService(testConfig, embeddingService);
      await service.initialize();

      await service.close();

      expect(service.isHealthy()).toBe(false);
    });
  });
});
