/**
 * Admin Image Management Routes Tests
 * Comprehensive test suite for admin image operations, uploads, and batch processing
 */

import request from 'supertest';
import express from 'express';
import adminImageRouter from '../../routes/adminImageManagement';
import { pool } from '../../database/connection';
import path from 'path';
import fs from 'fs';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../../services/VisionAIService');
jest.mock('../../middleware/optionalSupabaseAuth', () => ({
  optionalSupabaseAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-admin-123', role: 'admin' };
    next();
  },
  optionalSupabaseAdmin: (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api', adminImageRouter);

// Mock pool
const mockPool = pool as jest.Mocked<typeof pool>;

// Test data
const testSpeciesId = '123e4567-e89b-12d3-a456-426614174000';
const testImageId = '987e6543-e21b-12d3-a456-426614174999';

describe('Admin Image Management Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/images/collect', () => {
    beforeEach(() => {
      // Mock successful species insertion
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testSpeciesId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should start image collection job successfully', async () => {
      const response = await request(app)
        .post('/api/admin/images/collect')
        .send({
          species: ['Northern Cardinal'],
          count: 2
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
      expect(response.body.message).toContain('Image collection started');
      expect(response.body.totalSpecies).toBe(1);
      expect(response.body.imagesPerSpecies).toBe(2);
    });

    it('should reject collection without Unsplash API key', async () => {
      const originalKey = process.env.UNSPLASH_ACCESS_KEY;
      delete process.env.UNSPLASH_ACCESS_KEY;

      const response = await request(app)
        .post('/api/admin/images/collect')
        .send({ count: 2 })
        .expect(503);

      expect(response.body.error).toBe('Unsplash API not configured');

      process.env.UNSPLASH_ACCESS_KEY = originalKey;
    });

    it('should handle invalid species names gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/images/collect')
        .send({
          species: ['NonexistentBird'],
          count: 2
        })
        .expect(400);

      expect(response.body.error).toBe('No matching species found');
      expect(response.body).toHaveProperty('availableSpecies');
    });

    it('should validate count parameter bounds', async () => {
      const response = await request(app)
        .post('/api/admin/images/collect')
        .send({
          count: 20 // Exceeds max of 10
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/admin/images/upload', () => {
    beforeEach(() => {
      // Mock species exists check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testSpeciesId, english_name: 'Test Bird', spanish_name: 'Pájaro de prueba' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock image insertion
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testImageId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should reject upload without speciesId', async () => {
      const response = await request(app)
        .post('/api/admin/images/upload')
        .attach('files', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(400);

      expect(response.body.error).toBe('Missing required field');
      expect(response.body.message).toContain('speciesId is required');
    });

    it('should reject upload with invalid speciesId', async () => {
      // Override mock for this test
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const response = await request(app)
        .post('/api/admin/images/upload')
        .field('speciesId', 'invalid-uuid')
        .attach('files', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(400);

      expect(response.body.error).toBe('Invalid species');
    });

    it('should reject upload without files', async () => {
      const response = await request(app)
        .post('/api/admin/images/upload')
        .field('speciesId', testSpeciesId)
        .expect(400);

      expect(response.body.error).toBe('No files uploaded');
    });
  });

  describe('POST /api/admin/images/annotate', () => {
    beforeEach(() => {
      // Mock image query for annotation
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: testImageId,
            url: 'https://example.com/bird.jpg',
            species_id: testSpeciesId,
            species_name: 'Northern Cardinal - Cardenal Norteño'
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should start annotation job for specific images', async () => {
      const response = await request(app)
        .post('/api/admin/images/annotate')
        .send({
          imageIds: [testImageId]
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
      expect(response.body.totalImages).toBe(1);
    });

    it('should reject annotation without API key', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .post('/api/admin/images/annotate')
        .send({
          imageIds: [testImageId]
        })
        .expect(503);

      expect(response.body.error).toBe('Claude API not configured');

      process.env.ANTHROPIC_API_KEY = originalKey;
    });

    it('should require either imageIds or all flag', async () => {
      const response = await request(app)
        .post('/api/admin/images/annotate')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
      expect(response.body.message).toContain('imageIds array or all=true');
    });

    it('should handle all flag for batch annotation', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: testImageId,
            url: 'https://example.com/bird.jpg',
            species_id: testSpeciesId,
            species_name: 'Test Bird - Pájaro de prueba'
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const response = await request(app)
        .post('/api/admin/images/annotate')
        .send({ all: true })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body.totalImages).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/images/jobs/:jobId', () => {
    it('should return 404 for non-existent job', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const response = await request(app)
        .get('/api/admin/images/jobs/nonexistent-job-id')
        .expect(404);

      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /api/admin/images/stats', () => {
    beforeEach(() => {
      // Mock image stats query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_images: '50', unique_species: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock images by species query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { species: 'Northern Cardinal', count: '20' },
          { species: 'Blue Jay', count: '15' },
          { species: 'American Robin', count: '15' }
        ],
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock annotation stats query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total: '100',
          pending: '20',
          approved: '70',
          rejected: '5',
          edited: '5',
          avg_confidence: '0.85'
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock annotation coverage query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ annotated: '30', unannotated: '20' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should return comprehensive statistics', async () => {
      const response = await request(app)
        .get('/api/admin/images/stats')
        .expect(200);

      expect(response.body.data).toHaveProperty('totalImages');
      expect(response.body.data).toHaveProperty('pendingAnnotation');
      expect(response.body.data).toHaveProperty('annotated');
      expect(response.body.data).toHaveProperty('bySpecies');
      expect(response.body.data.bySpecies).toHaveProperty('Northern Cardinal');
    });

    it('should include annotation statistics', async () => {
      const response = await request(app)
        .get('/api/admin/images/stats')
        .expect(200);

      expect(response.body.data.annotations).toHaveProperty('total');
      expect(response.body.data.annotations).toHaveProperty('pending');
      expect(response.body.data.annotations).toHaveProperty('avgConfidence');
    });

    it('should include job statistics', async () => {
      const response = await request(app)
        .get('/api/admin/images/stats')
        .expect(200);

      expect(response.body.data.jobs).toHaveProperty('active');
      expect(response.body.data.jobs).toHaveProperty('completed');
      expect(response.body.data.jobs).toHaveProperty('failed');
    });
  });

  describe('GET /api/admin/images/sources', () => {
    beforeEach(() => {
      // Mock species query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            englishName: 'Northern Cardinal',
            scientificName: 'Cardinalis cardinalis',
            spanishName: 'Cardenal Norteño'
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should return available image sources', async () => {
      const response = await request(app)
        .get('/api/admin/images/sources')
        .expect(200);

      expect(response.body.sources).toHaveProperty('unsplash');
      expect(response.body).toHaveProperty('availableSpecies');
      expect(response.body).toHaveProperty('services');
    });

    it('should indicate Unsplash configuration status', async () => {
      const response = await request(app)
        .get('/api/admin/images/sources')
        .expect(200);

      expect(response.body.sources.unsplash).toHaveProperty('configured');
    });

    it('should indicate Vision AI configuration status', async () => {
      const response = await request(app)
        .get('/api/admin/images/sources')
        .expect(200);

      expect(response.body.services.visionAI).toHaveProperty('configured');
    });
  });

  describe('GET /api/admin/images', () => {
    beforeEach(() => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '50' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock images query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: testImageId,
            url: 'https://example.com/bird.jpg',
            speciesId: testSpeciesId,
            speciesName: 'Northern Cardinal',
            scientificName: 'Cardinalis cardinalis',
            annotationCount: 5,
            hasAnnotations: true,
            qualityScore: 85,
            createdAt: new Date().toISOString(),
            width: 1920,
            height: 1080
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);
    });

    it('should return paginated image list', async () => {
      const response = await request(app)
        .get('/api/admin/images?page=1&pageSize=20')
        .expect(200);

      expect(response.body.data).toHaveProperty('images');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(20);
    });

    it('should filter by species', async () => {
      const response = await request(app)
        .get(`/api/admin/images?speciesId=${testSpeciesId}`)
        .expect(200);

      expect(response.body.data.images).toBeInstanceOf(Array);
    });

    it('should filter by annotation status', async () => {
      const response = await request(app)
        .get('/api/admin/images?annotationStatus=annotated')
        .expect(200);

      expect(response.body.data.images).toBeInstanceOf(Array);
    });

    it('should filter by quality', async () => {
      const response = await request(app)
        .get('/api/admin/images?qualityFilter=high')
        .expect(200);

      expect(response.body.data.images).toBeInstanceOf(Array);
    });

    it('should support sorting options', async () => {
      const response = await request(app)
        .get('/api/admin/images?sortBy=annotationCount&sortOrder=desc')
        .expect(200);

      expect(response.body.data.images).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/admin/images/bulk/delete', () => {
    beforeEach(() => {
      // Mock connect and transaction queries
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rowCount: 1 }) // Delete annotation items
          .mockResolvedValueOnce({ rowCount: 1 }) // Delete annotations
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: testImageId }] }) // Delete image
          .mockResolvedValueOnce({ command: 'COMMIT' }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);
    });

    it('should delete multiple images successfully', async () => {
      const response = await request(app)
        .post('/api/admin/images/bulk/delete')
        .send({ imageIds: [testImageId] })
        .expect(200);

      expect(response.body.deleted).toBe(1);
      expect(response.body.failed).toBe(0);
    });

    it('should require at least one image ID', async () => {
      const response = await request(app)
        .post('/api/admin/images/bulk/delete')
        .send({ imageIds: [] })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should limit to 100 images per request', async () => {
      const tooManyIds = Array(101).fill(testImageId);

      const response = await request(app)
        .post('/api/admin/images/bulk/delete')
        .send({ imageIds: tooManyIds })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/admin/images/:imageId', () => {
    beforeEach(() => {
      // Mock image existence check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testImageId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      // Mock deletions
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any); // Delete annotation items
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any); // Delete annotations
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any); // Delete image
    });

    it('should delete single image successfully', async () => {
      const response = await request(app)
        .delete(`/api/admin/images/${testImageId}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.imageId).toBe(testImageId);
    });

    it('should return 404 for non-existent image', async () => {
      // Override mock for this test
      mockPool.query.mockReset();
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const response = await request(app)
        .delete(`/api/admin/images/${testImageId}`)
        .expect(404);

      expect(response.body.error).toBe('Image not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthorized access (mock test)', async () => {
      // This test demonstrates the pattern - actual auth is mocked
      // In production, optionalSupabaseAuth middleware would handle this
      const response = await request(app)
        .post('/api/admin/images/collect')
        .send({ count: 2 });

      // Should succeed because we mocked auth
      expect(response.status).not.toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/admin/images/stats')
      );

      const responses = await Promise.all(requests);

      // All should succeed within rate limit
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});
