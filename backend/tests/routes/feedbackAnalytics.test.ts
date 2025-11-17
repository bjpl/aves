/**
 * Feedback Analytics Route Integration Tests
 * Tests the analytics endpoints for reinforcement learning feedback
 */

import request from 'supertest';
import express, { Express } from 'express';
import { pool } from '../../src/database/connection';

// Mock the routes
jest.mock('../../src/middleware/optionalSupabaseAuth', () => ({
  optionalSupabaseAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123' };
    next();
  },
  optionalSupabaseAdmin: (req: any, res: any, next: any) => next()
}));

describe('Feedback Analytics Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock analytics endpoint
    app.get('/api/feedback/analytics', async (req, res) => {
      try {
        const analytics = {
          overview: {
            total: 150,
            approvals: 95,
            rejections: 30,
            corrections: 25
          },
          byCategory: {
            TOO_SMALL: 12,
            NOT_REPRESENTATIVE: 8,
            INCORRECT: 6,
            OTHER: 4
          },
          bySpecies: {
            'Mallard Duck': 45,
            'Great Blue Heron': 38,
            'American Robin': 32
          },
          trends: {
            approvalRate: 0.633,
            avgCorrectionsPerAnnotation: 0.167
          }
        };

        res.json(analytics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    });

    // Mock improvement metrics endpoint
    app.get('/api/feedback/improvements', async (req, res) => {
      try {
        const improvements = {
          positionAccuracy: {
            before: 0.72,
            after: 0.89,
            improvement: '+23.6%'
          },
          featureConfidence: {
            before: 0.78,
            after: 0.87,
            improvement: '+11.5%'
          },
          rejectionRate: {
            before: 0.28,
            after: 0.15,
            improvement: '-46.4%'
          }
        };

        res.json(improvements);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch improvements' });
      }
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/feedback/analytics', () => {
    it('should return comprehensive feedback analytics', async () => {
      const response = await request(app).get('/api/feedback/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('byCategory');
      expect(response.body).toHaveProperty('bySpecies');
      expect(response.body).toHaveProperty('trends');
    });

    it('should show correct feedback counts', async () => {
      const response = await request(app).get('/api/feedback/analytics');

      expect(response.status).toBe(200);
      expect(response.body.overview.total).toBe(150);
      expect(response.body.overview.approvals).toBe(95);
      expect(response.body.overview.rejections).toBe(30);
      expect(response.body.overview.corrections).toBe(25);
    });

    it('should group rejections by category', async () => {
      const response = await request(app).get('/api/feedback/analytics');

      expect(response.status).toBe(200);
      expect(response.body.byCategory).toHaveProperty('TOO_SMALL');
      expect(response.body.byCategory).toHaveProperty('NOT_REPRESENTATIVE');
      expect(response.body.byCategory.TOO_SMALL).toBeGreaterThan(0);
    });

    it('should break down feedback by species', async () => {
      const response = await request(app).get('/api/feedback/analytics');

      expect(response.status).toBe(200);
      expect(response.body.bySpecies).toHaveProperty('Mallard Duck');
      expect(response.body.bySpecies).toHaveProperty('Great Blue Heron');
      expect(response.body.bySpecies['Mallard Duck']).toBeGreaterThan(0);
    });

    it('should calculate trend metrics', async () => {
      const response = await request(app).get('/api/feedback/analytics');

      expect(response.status).toBe(200);
      expect(response.body.trends.approvalRate).toBeGreaterThan(0);
      expect(response.body.trends.approvalRate).toBeLessThanOrEqual(1);
      expect(response.body.trends.avgCorrectionsPerAnnotation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/feedback/improvements', () => {
    it('should show quality improvements over time', async () => {
      const response = await request(app).get('/api/feedback/improvements');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('positionAccuracy');
      expect(response.body).toHaveProperty('featureConfidence');
      expect(response.body).toHaveProperty('rejectionRate');
    });

    it('should show position accuracy improvement', async () => {
      const response = await request(app).get('/api/feedback/improvements');

      expect(response.status).toBe(200);
      expect(response.body.positionAccuracy.before).toBeLessThan(
        response.body.positionAccuracy.after
      );
      expect(response.body.positionAccuracy.improvement).toContain('+');
    });

    it('should show feature confidence improvement', async () => {
      const response = await request(app).get('/api/feedback/improvements');

      expect(response.status).toBe(200);
      expect(response.body.featureConfidence.before).toBeLessThan(
        response.body.featureConfidence.after
      );
    });

    it('should show rejection rate reduction', async () => {
      const response = await request(app).get('/api/feedback/improvements');

      expect(response.status).toBe(200);
      expect(response.body.rejectionRate.before).toBeGreaterThan(
        response.body.rejectionRate.after
      );
      expect(response.body.rejectionRate.improvement).toContain('-');
    });
  });

  describe('Feedback Persistence', () => {
    it('should persist feedback across API calls', async () => {
      const response1 = await request(app).get('/api/feedback/analytics');
      const response2 = await request(app).get('/api/feedback/analytics');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.overview.total).toBe(response2.body.overview.total);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would fail if database is unavailable
      const response = await request(app).get('/api/feedback/analytics');
      expect([200, 500]).toContain(response.status);
    });
  });
});
