/**
 * Integration Tests: AI Annotations Quality Filtering
 * Tests quality filtering integration in the annotation generation endpoint
 */

import request from 'supertest';
import express, { Express } from 'express';
import { pool } from '../../src/database/connection';
import aiAnnotationsRouter from '../../src/routes/aiAnnotations';
import { imageQualityValidator } from '../../src/services/ImageQualityValidator';

// Mock the VisionAI service
jest.mock('../../src/services/VisionAIService', () => ({
  visionAIService: {
    generateAnnotations: jest.fn(),
    getPatternAnalytics: jest.fn(),
    getRecommendedFeatures: jest.fn(),
    exportLearnedPatterns: jest.fn()
  },
  AIAnnotation: {}
}));

describe('AI Annotations Quality Filtering Integration', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', aiAnnotationsRouter);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/ai/annotations/generate/:imageId - Quality Skip Logic', () => {
    const imageId = '550e8400-e29b-41d4-a716-446655440000';
    const goodImageUrl = 'https://example.com/good-bird.jpg';
    const badImageUrl = 'https://example.com/bad-bird.jpg';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should skip annotation generation for low-quality images', async () => {
      // Mock quality check to return failure
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue({
        passed: false,
        score: 45,
        reasons: ['Bird too small: 8.0% of frame (minimum: 15.0%)'],
        metrics: {
          birdSize: 0.08,
          resolution: 1920 * 1080,
          isMainSubject: false
        }
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: badImageUrl });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quality');
      expect(response.body).toHaveProperty('qualityCheck');
      expect(response.body.qualityCheck.passed).toBe(false);
      expect(response.body.qualityCheck.reasons).toContain(
        expect.stringContaining('too small')
      );
    });

    it('should proceed with annotation generation for high-quality images', async () => {
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue({
        passed: true,
        score: 100,
        reasons: [],
        metrics: {
          birdSize: 0.45,
          brightness: 150,
          occlusionRatio: 0.95,
          resolution: 1920 * 1080,
          isMainSubject: true
        }
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: goodImageUrl });

      expect(response.status).toBe(202); // Accepted - processing started
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should store quality metrics in database', async () => {
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      const qualityMetrics = {
        passed: true,
        score: 92,
        reasons: [],
        metrics: {
          birdSize: 0.35,
          brightness: 165,
          occlusionRatio: 0.88,
          resolution: 1920 * 1080,
          isMainSubject: true
        }
      };
      mockQualityCheck.mockReturnValue(qualityMetrics);

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: goodImageUrl });

      expect(response.status).toBe(202);

      // Query database to verify quality metrics were stored
      const result = await pool.query(
        'SELECT quality_score, quality_metrics FROM ai_annotations WHERE job_id = $1',
        [response.body.jobId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].quality_score).toBe(92);
      expect(result.rows[0].quality_metrics).toEqual(
        expect.objectContaining({
          birdSize: 0.35,
          brightness: 165,
          isMainSubject: true
        })
      );
    });

    it('should not create job record for rejected images', async () => {
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue({
        passed: false,
        score: 30,
        reasons: ['Bird too small', 'Image too dark'],
        metrics: {
          birdSize: 0.08,
          brightness: 25,
          resolution: 1920 * 1080
        }
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: badImageUrl });

      expect(response.status).toBe(400);

      // Verify no job record was created
      const result = await pool.query(
        'SELECT COUNT(*) FROM ai_annotations WHERE image_id = $1',
        [imageId]
      );

      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('GET /api/ai/annotations/analytics - Quality Filtering', () => {
    it('should exclude skipped images from analytics', async () => {
      // Create test data: 2 approved, 1 rejected (quality), 2 pending
      await pool.query(`
        INSERT INTO ai_annotation_items (
          job_id, image_id, spanish_term, english_term,
          bounding_box, annotation_type, difficulty_level,
          status, confidence
        ) VALUES
        ('job_1', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'el pico', 'beak',
         '{"x":0.3,"y":0.3,"width":0.2,"height":0.2}', 'anatomical', 2, 'approved', 0.92),
        ('job_2', '550e8400-e29b-41d4-a716-446655440002'::uuid, 'las alas', 'wings',
         '{"x":0.25,"y":0.25,"width":0.3,"height":0.3}', 'anatomical', 2, 'approved', 0.88),
        ('job_3', '550e8400-e29b-41d4-a716-446655440003'::uuid, 'la cola', 'tail',
         '{"x":0.4,"y":0.5,"width":0.15,"height":0.15}', 'anatomical', 2, 'pending', 0.85),
        ('job_4', '550e8400-e29b-41d4-a716-446655440004'::uuid, 'el ojo', 'eye',
         '{"x":0.35,"y":0.25,"width":0.1,"height":0.1}', 'anatomical', 3, 'pending', 0.90)
      `);

      // Mark one as quality-rejected (add to separate table)
      await pool.query(`
        INSERT INTO image_quality_rejections (image_id, reason, quality_score)
        VALUES ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Bird too small', 45)
      `);

      const response = await request(app).get('/api/ai/annotations/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overview');
      expect(response.body.overview.total).toBe(4); // Should not include quality-rejected
      expect(response.body.overview.pending).toBe(2);
      expect(response.body.overview.approved).toBe(2);

      // Cleanup
      await pool.query('DELETE FROM ai_annotation_items WHERE job_id LIKE \'job_%\'');
      await pool.query('DELETE FROM image_quality_rejections WHERE quality_score = 45');
    });

    it('should include quality rejection statistics', async () => {
      // Add quality rejection data
      await pool.query(`
        INSERT INTO image_quality_rejections (image_id, reason, quality_score)
        VALUES
        ('550e8400-e29b-41d4-a716-446655440011'::uuid, 'Bird too small', 42),
        ('550e8400-e29b-41d4-a716-446655440012'::uuid, 'Image too dark', 38),
        ('550e8400-e29b-41d4-a716-446655440013'::uuid, 'Low resolution', 35)
      `);

      const response = await request(app).get('/api/ai/annotations/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('qualityRejections');
      expect(response.body.qualityRejections.total).toBeGreaterThanOrEqual(3);
      expect(response.body.qualityRejections).toHaveProperty('reasons');

      // Cleanup
      await pool.query('DELETE FROM image_quality_rejections WHERE quality_score < 50');
    });
  });

  describe('Quality Metrics Storage', () => {
    it('should store comprehensive quality metrics for each annotation job', async () => {
      const imageId = '550e8400-e29b-41d4-a716-446655440020';
      const mockQualityMetrics = {
        passed: true,
        score: 95,
        reasons: [],
        metrics: {
          birdSize: 0.42,
          brightness: 155,
          occlusionRatio: 0.92,
          resolution: 1920 * 1080,
          isMainSubject: true
        }
      };

      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue(mockQualityMetrics);

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: 'https://example.com/high-quality.jpg' });

      expect(response.status).toBe(202);

      // Verify metrics stored correctly
      const result = await pool.query(
        `SELECT quality_score, quality_metrics, quality_passed
         FROM ai_annotations
         WHERE job_id = $1`,
        [response.body.jobId]
      );

      expect(result.rows[0].quality_score).toBe(95);
      expect(result.rows[0].quality_passed).toBe(true);
      expect(result.rows[0].quality_metrics).toMatchObject({
        birdSize: 0.42,
        brightness: 155,
        occlusionRatio: 0.92,
        isMainSubject: true
      });

      // Cleanup
      await pool.query('DELETE FROM ai_annotations WHERE job_id = $1', [response.body.jobId]);
    });

    it('should track quality rejection reasons', async () => {
      const imageId = '550e8400-e29b-41d4-a716-446655440021';
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue({
        passed: false,
        score: 35,
        reasons: [
          'Bird too small: 8.5% of frame (minimum: 15.0%)',
          'Image too dark: brightness 22 (minimum: 30)'
        ],
        metrics: {
          birdSize: 0.085,
          brightness: 22,
          resolution: 1920 * 1080
        }
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: 'https://example.com/low-quality.jpg' });

      expect(response.status).toBe(400);
      expect(response.body.qualityCheck.reasons).toHaveLength(2);
      expect(response.body.qualityCheck.reasons[0]).toContain('too small');
      expect(response.body.qualityCheck.reasons[1]).toContain('too dark');

      // Verify rejection was logged
      const result = await pool.query(
        'SELECT * FROM image_quality_rejections WHERE image_id = $1',
        [imageId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].quality_score).toBe(35);
      expect(result.rows[0].reason).toContain('too small');
      expect(result.rows[0].reason).toContain('too dark');

      // Cleanup
      await pool.query('DELETE FROM image_quality_rejections WHERE image_id = $1', [imageId]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing image metadata gracefully', async () => {
      const imageId = '550e8400-e29b-41d4-a716-446655440030';

      // Mock quality check with minimal metadata
      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockReturnValue({
        passed: true,
        score: 100,
        reasons: [],
        metrics: {
          resolution: 1920 * 1080
        }
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: 'https://example.com/bird.jpg' });

      expect(response.status).toBe(202);

      // Cleanup
      if (response.body.jobId) {
        await pool.query('DELETE FROM ai_annotations WHERE job_id = $1', [response.body.jobId]);
      }
    });

    it('should not fail annotation pipeline if quality check throws error', async () => {
      const imageId = '550e8400-e29b-41d4-a716-446655440031';

      const mockQualityCheck = jest.spyOn(imageQualityValidator, 'validateImage');
      mockQualityCheck.mockImplementation(() => {
        throw new Error('Quality check service unavailable');
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${imageId}`)
        .send({ imageUrl: 'https://example.com/bird.jpg' });

      // Should proceed with annotation despite quality check failure
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('qualityCheckFailed', true);

      // Cleanup
      if (response.body.jobId) {
        await pool.query('DELETE FROM ai_annotations WHERE job_id = $1', [response.body.jobId]);
      }
    });
  });
});
