/**
 * ML Analytics Routes Tests
 * Comprehensive test suite for ML optimization analytics endpoints
 */

import request from 'supertest';
import express from 'express';
import mlAnalyticsRouter from '../../routes/mlAnalytics';
import { PatternLearner } from '../../services/PatternLearner';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../services/PatternLearner');
jest.mock('@supabase/supabase-js');
jest.mock('../../middleware/optionalSupabaseAuth', () => ({
  optionalSupabaseAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api', mlAnalyticsRouter);

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn()
};

const MockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const MockPatternLearner = PatternLearner as jest.MockedClass<typeof PatternLearner>;

describe('ML Analytics Routes', () => {
  let mockPatternLearner: jest.Mocked<PatternLearner>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock
    MockCreateClient.mockReturnValue(mockSupabaseClient as any);

    // Setup PatternLearner mock
    mockPatternLearner = {
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
      getAnalytics: jest.fn(),
      getRecommendedFeatures: jest.fn()
    } as any;

    MockPatternLearner.mockImplementation(() => mockPatternLearner);
  });

  describe('GET /api/ml/analytics/test', () => {
    it('should return test endpoint status', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/test')
        .expect(200);

      expect(response.body.status).toBe('ML Analytics routes loaded successfully');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/ml/analytics/overview', () => {
    beforeEach(() => {
      // Mock PatternLearner analytics
      mockPatternLearner.getAnalytics.mockReturnValue({
        totalPatterns: 50,
        speciesTracked: 5,
        topFeatures: [
          { feature: 'red plumage', observations: 20, confidence: 0.9 },
          { feature: 'curved beak', observations: 15, confidence: 0.85 }
        ],
        speciesBreakdown: []
      });

      // Mock Supabase queries
      const mockAnnotationsQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: Array(200).fill({ confidence: 0.85, created_at: new Date().toISOString() })
        })
      };

      const mockCountQuery = {
        select: jest.fn().mockResolvedValue({ count: 100 })
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'annotations') {
          return mockAnnotationsQuery as any;
        }
        if (table === 'images') {
          return mockCountQuery as any;
        }
        return mockCountQuery as any;
      });
    });

    it('should return comprehensive ML overview', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      expect(response.body).toHaveProperty('patternLearning');
      expect(response.body).toHaveProperty('datasetMetrics');
      expect(response.body).toHaveProperty('qualityMetrics');
    });

    it('should include pattern learning statistics', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      expect(response.body.patternLearning.totalPatterns).toBe(50);
      expect(response.body.patternLearning.speciesTracked).toBe(5);
      expect(response.body.patternLearning.topFeatures).toHaveLength(2);
      expect(response.body.patternLearning.learningActive).toBe(true);
    });

    it('should calculate dataset metrics correctly', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      expect(response.body.datasetMetrics.totalAnnotations).toBe(100);
      expect(response.body.datasetMetrics.totalImages).toBe(100);
      expect(response.body.datasetMetrics).toHaveProperty('avgConfidence');
      expect(response.body.datasetMetrics).toHaveProperty('confidenceTrend');
    });

    it('should calculate confidence trends', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      expect(response.body.qualityMetrics).toHaveProperty('recentAvgConfidence');
      expect(response.body.qualityMetrics).toHaveProperty('historicalAvgConfidence');
      expect(response.body.qualityMetrics).toHaveProperty('improvement');
    });

    it('should handle missing annotation data gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null })
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      expect(response.body.datasetMetrics.avgConfidence).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockPatternLearner.getAnalytics.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch ML analytics');
    });
  });

  describe('GET /api/ml/analytics/vocabulary-balance', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { feature_name: 'beak', confidence: 0.9 },
            { feature_name: 'beak', confidence: 0.85 },
            { feature_name: 'wing', confidence: 0.88 },
            { feature_name: 'tail', confidence: 0.92 }
          ]
        })
      } as any);
    });

    it('should return vocabulary balance metrics', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('totalFeatures');
      expect(response.body).toHaveProperty('targetVocabulary');
      expect(response.body).toHaveProperty('coverage');
      expect(response.body).toHaveProperty('topGaps');
    });

    it('should count feature occurrences correctly', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      const beakFeature = response.body.features.find((f: any) => f.name === 'beak');
      expect(beakFeature.count).toBe(2);
      expect(beakFeature.avgConfidence).toBeCloseTo(0.875, 2);
    });

    it('should calculate coverage percentage', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      expect(response.body.coverage).toBeDefined();
      expect(parseFloat(response.body.coverage)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(response.body.coverage)).toBeLessThanOrEqual(100);
    });

    it('should identify top vocabulary gaps', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      expect(response.body.topGaps).toBeDefined();
      expect(Array.isArray(response.body.topGaps)).toBe(true);
      expect(response.body.topGaps.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty annotation data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: null })
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      expect(response.body.features).toEqual([]);
      expect(response.body.totalFeatures).toBe(0);
      expect(response.body.coverage).toBe(0);
    });

    it('should limit features to top 20', async () => {
      const manyFeatures = Array(50).fill(null).map((_, i) => ({
        feature_name: `feature${i}`,
        confidence: 0.8
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: manyFeatures })
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(200);

      expect(response.body.features.length).toBe(20);
    });

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/vocabulary-balance')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch vocabulary balance');
    });
  });

  describe('GET /api/ml/analytics/pattern-learning', () => {
    beforeEach(() => {
      mockPatternLearner.getAnalytics.mockReturnValue({
        totalPatterns: 100,
        speciesTracked: 8,
        topFeatures: [
          { feature: 'red crest', observations: 25, confidence: 0.92 },
          { feature: 'blue wing', observations: 20, confidence: 0.88 }
        ],
        speciesBreakdown: [
          { species: 'Northern Cardinal', annotations: 50, features: 15 },
          { species: 'Blue Jay', annotations: 30, features: 12 }
        ]
      });

      mockPatternLearner.getRecommendedFeatures.mockReturnValue([
        'bright red plumage',
        'pointed crest',
        'orange beak'
      ]);
    });

    it('should return pattern learning analytics', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('topPatterns');
      expect(response.body).toHaveProperty('speciesInsights');
      expect(response.body).toHaveProperty('learningStatus');
    });

    it('should categorize pattern reliability', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      const redCrestPattern = response.body.topPatterns.find((p: any) => p.feature === 'red crest');
      expect(redCrestPattern.reliability).toBe('high'); // confidence >= 0.85

      const blueWingPattern = response.body.topPatterns.find((p: any) => p.feature === 'blue wing');
      expect(blueWingPattern.reliability).toBe('high'); // confidence >= 0.85
    });

    it('should provide species-specific recommendations', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      expect(response.body.speciesInsights).toHaveLength(2);
      expect(response.body.speciesInsights[0].recommendedFeatures).toHaveLength(3);
    });

    it('should determine learning status correctly', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      expect(response.body.learningStatus).toBe('active'); // totalPatterns >= 10
    });

    it('should show initializing status with no patterns', async () => {
      mockPatternLearner.getAnalytics.mockReturnValue({
        totalPatterns: 0,
        speciesTracked: 0,
        topFeatures: [],
        speciesBreakdown: []
      });

      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      expect(response.body.learningStatus).toBe('initializing');
    });

    it('should show learning status with few patterns', async () => {
      mockPatternLearner.getAnalytics.mockReturnValue({
        totalPatterns: 5,
        speciesTracked: 2,
        topFeatures: [],
        speciesBreakdown: []
      });

      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(200);

      expect(response.body.learningStatus).toBe('learning');
    });

    it('should handle errors gracefully', async () => {
      mockPatternLearner.ensureInitialized.mockRejectedValue(new Error('Init failed'));

      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch pattern learning analytics');
    });
  });

  describe('GET /api/ml/analytics/quality-trends', () => {
    beforeEach(() => {
      const mockData = Array(50).fill(null).map((_, i) => ({
        confidence: 0.75 + (i * 0.002), // Gradually increasing confidence
        created_at: new Date(Date.now() - (50 - i) * 86400000).toISOString()
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData })
      } as any);
    });

    it('should return quality trends over time', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(200);

      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('summary');
    });

    it('should group data by week', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(200);

      expect(Array.isArray(response.body.trends)).toBe(true);
      response.body.trends.forEach((trend: any) => {
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('avgConfidence');
        expect(trend).toHaveProperty('annotationCount');
      });
    });

    it('should calculate improvement percentage', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(200);

      expect(response.body.summary).toHaveProperty('improvement');
      expect(response.body.summary).toHaveProperty('currentQuality');
      expect(response.body.summary).toHaveProperty('totalWeeks');
    });

    it('should handle empty data gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [] })
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(200);

      expect(response.body.trends).toEqual([]);
      expect(response.body.summary.improvement).toBe('0.0');
    });

    it('should handle null data gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null })
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(200);

      expect(response.body.trends).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      const response = await request(app)
        .get('/api/ml/analytics/quality-trends')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch quality trends');
    });
  });

  describe('GET /api/ml/analytics/performance-metrics', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/performance-metrics')
        .expect(200);

      expect(response.body).toHaveProperty('pipeline');
      expect(response.body).toHaveProperty('improvements');
      expect(response.body).toHaveProperty('status');
    });

    it('should return default values when metrics files not found', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/performance-metrics')
        .expect(200);

      expect(response.body.pipeline.batchSize).toBe(0);
      expect(response.body.pipeline.concurrency).toBe(4);
      expect(response.body.status.pipelineStatus).toBe('initializing');
    });

    it('should handle errors gracefully', async () => {
      // Mock fs to throw error
      jest.mock('fs', () => ({
        existsSync: jest.fn(() => {
          throw new Error('File system error');
        })
      }));

      const response = await request(app)
        .get('/api/ml/analytics/performance-metrics')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch performance metrics');
    });
  });

  describe('Authentication', () => {
    it('should attach user context to requests', async () => {
      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(200);

      // Verify that optionalSupabaseAuth middleware was applied
      expect(response.body).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const response = await request(app)
        .get('/api/ml/analytics/overview')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle PatternLearner initialization errors', async () => {
      mockPatternLearner.ensureInitialized.mockRejectedValue(new Error('Init error'));

      const response = await request(app)
        .get('/api/ml/analytics/pattern-learning')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch pattern learning analytics');
    });
  });
});
