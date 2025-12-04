/**
 * Integration Tests: Annotation Workflow
 * Tests the complete annotation lifecycle including manual annotations,
 * AI-powered generation, review workflow, and batch operations
 */

import request from 'supertest';
import express from 'express';
import annotationsRouter from '../../routes/annotations';
import aiAnnotationsRouter from '../../routes/aiAnnotations';
import authRouter from '../../routes/auth';
import {
  testPool,
  createTestUser,
  createTestSpecies,
  createTestImage,
  createTestAnnotation,
  TEST_USERS,
  delay,
} from './setup';

// Skip integration tests if SUPABASE_URL is not configured (CI environment)
const skipIntegrationTests = !process.env.SUPABASE_URL && !process.env.TEST_DB_HOST;
const describeOrSkip = skipIntegrationTests ? describe.skip : describe;

// Create test app
const app = express();
app.use(express.json());
app.use('/api', authRouter);
app.use('/api', annotationsRouter);
app.use('/api', aiAnnotationsRouter);

// Mock Vision AI Service
jest.mock('../../services/VisionAIService', () => ({
  visionAIService: {
    generateAnnotations: jest.fn().mockResolvedValue([
      {
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        boundingBox: { x: 0.45, y: 0.30, width: 0.10, height: 0.08 },
        type: 'anatomical',
        difficultyLevel: 2,
        pronunciation: 'el PEE-koh',
        confidence: 0.92,
      },
      {
        spanishTerm: 'las plumas',
        englishTerm: 'feathers',
        boundingBox: { x: 0.20, y: 0.40, width: 0.60, height: 0.45 },
        type: 'anatomical',
        difficultyLevel: 1,
        pronunciation: 'lahs PLOO-mahs',
        confidence: 0.88,
      },
    ]),
  },
}));

describeOrSkip('Integration: Annotation Workflow', () => {
  let userToken: string;
  let adminToken: string;
  let testSpecies: any;
  let testImage: any;

  beforeEach(async () => {
    const user = await createTestUser(TEST_USERS.regularUser);
    const admin = await createTestUser(TEST_USERS.adminUser, true);
    userToken = user.token;
    adminToken = admin.token;

    // Create test species and image
    testSpecies = await createTestSpecies();
    testImage = await createTestImage(testSpecies.id);
  });

  describe('Manual Annotation Creation', () => {
    it('should create a new annotation successfully', async () => {
      const annotationData = {
        imageId: testImage.id,
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        boundingBox: { x: 0.45, y: 0.30, width: 0.10, height: 0.08 },
        type: 'anatomical',
        difficultyLevel: 2,
        pronunciation: 'el PEE-koh',
      };

      const response = await request(app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(annotationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.spanishTerm).toBe('el pico');
      expect(response.body.englishTerm).toBe('beak');
      expect(response.body.boundingBox).toEqual(annotationData.boundingBox);

      // Verify annotation in database
      const dbResult = await testPool.query(
        'SELECT * FROM annotations WHERE id = $1',
        [response.body.id]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].spanish_term).toBe('el pico');
    });

    it('should validate annotation data before creation', async () => {
      const invalidAnnotations = [
        {
          // Missing required fields
          imageId: testImage.id,
          spanishTerm: 'test',
        },
        {
          // Invalid bounding box
          imageId: testImage.id,
          spanishTerm: 'test',
          englishTerm: 'test',
          boundingBox: { x: 1.5, y: 0.5, width: 0.2, height: 0.2 }, // x > 1
        },
        {
          // Invalid difficulty level
          imageId: testImage.id,
          spanishTerm: 'test',
          englishTerm: 'test',
          boundingBox: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
          difficultyLevel: 10, // > 5
        },
      ];

      for (const invalidData of invalidAnnotations) {
        const response = await request(app)
          .post('/api/annotations')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }

      // Verify no annotations were created
      const dbResult = await testPool.query('SELECT COUNT(*) as count FROM annotations');
      expect(parseInt(dbResult.rows[0].count)).toBe(0);
    });

    it('should create multiple annotations for same image', async () => {
      const annotations = [
        {
          imageId: testImage.id,
          spanishTerm: 'el pico',
          englishTerm: 'beak',
          boundingBox: { x: 0.45, y: 0.30, width: 0.10, height: 0.08 },
          type: 'anatomical',
        },
        {
          imageId: testImage.id,
          spanishTerm: 'el ojo',
          englishTerm: 'eye',
          boundingBox: { x: 0.50, y: 0.25, width: 0.05, height: 0.05 },
          type: 'anatomical',
        },
        {
          imageId: testImage.id,
          spanishTerm: 'rojo',
          englishTerm: 'red',
          boundingBox: { x: 0.30, y: 0.40, width: 0.40, height: 0.30 },
          type: 'color',
        },
      ];

      for (const annotation of annotations) {
        await request(app)
          .post('/api/annotations')
          .set('Authorization', `Bearer ${userToken}`)
          .send(annotation)
          .expect(201);
      }

      // Verify all annotations were created
      const dbResult = await testPool.query(
        'SELECT COUNT(*) as count FROM annotations WHERE image_id = $1',
        [testImage.id]
      );

      expect(parseInt(dbResult.rows[0].count)).toBe(3);
    });
  });

  describe('AI Annotation Generation', () => {
    it('should trigger AI annotation generation for an image', async () => {
      const response = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('processing');
      expect(response.body.imageId).toBe(testImage.id);

      // Wait for async processing
      await delay(1000);

      // Verify job was created in database
      const jobResult = await testPool.query(
        'SELECT * FROM ai_annotations WHERE job_id = $1',
        [response.body.jobId]
      );

      expect(jobResult.rows.length).toBe(1);
    });

    it('should require admin privileges for AI generation', async () => {
      const response = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should process AI annotations and store results', async () => {
      // Trigger generation
      const generateResponse = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(202);

      const jobId = generateResponse.body.jobId;

      // Wait for processing
      await delay(1500);

      // Check job status
      const statusResponse = await request(app)
        .get(`/api/ai/annotations/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statusResponse.body).toHaveProperty('jobId');
      expect(statusResponse.body).toHaveProperty('status');
      expect(statusResponse.body).toHaveProperty('items');

      // Verify annotation items were created
      const itemsResult = await testPool.query(
        'SELECT COUNT(*) as count FROM ai_annotation_items WHERE job_id = $1',
        [jobId]
      );

      expect(parseInt(itemsResult.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('AI Annotation Review Workflow', () => {
    let jobId: string;
    let annotationItemId: string;

    beforeEach(async () => {
      // Create AI annotation job
      const generateResponse = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(202);

      jobId = generateResponse.body.jobId;

      // Wait for processing
      await delay(1500);

      // Get annotation items
      const itemsResult = await testPool.query(
        'SELECT id FROM ai_annotation_items WHERE job_id = $1 LIMIT 1',
        [jobId]
      );

      annotationItemId = itemsResult.rows[0].id;
    });

    it('should list pending AI annotations for review', async () => {
      const response = await request(app)
        .get('/api/ai/annotations/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('annotations');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.annotations)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should approve an AI annotation and move to main table', async () => {
      const approveResponse = await request(app)
        .post(`/api/ai/annotations/${annotationItemId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Looks good!',
        })
        .expect(200);

      expect(approveResponse.body).toHaveProperty('message');
      expect(approveResponse.body).toHaveProperty('annotationId');
      expect(approveResponse.body).toHaveProperty('approvedAnnotationId');

      // Verify annotation was moved to main table
      const mainTableResult = await testPool.query(
        'SELECT * FROM annotations WHERE id = $1',
        [approveResponse.body.approvedAnnotationId]
      );

      expect(mainTableResult.rows.length).toBe(1);

      // Verify AI item status was updated
      const aiItemResult = await testPool.query(
        'SELECT status FROM ai_annotation_items WHERE id = $1',
        [annotationItemId]
      );

      expect(aiItemResult.rows[0].status).toBe('approved');
    });

    it('should reject an AI annotation with reason', async () => {
      const rejectResponse = await request(app)
        .post(`/api/ai/annotations/${annotationItemId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Incorrect bounding box',
        })
        .expect(200);

      expect(rejectResponse.body).toHaveProperty('message');
      expect(rejectResponse.body).toHaveProperty('annotationId');

      // Verify status was updated
      const aiItemResult = await testPool.query(
        'SELECT status FROM ai_annotation_items WHERE id = $1',
        [annotationItemId]
      );

      expect(aiItemResult.rows[0].status).toBe('rejected');

      // Verify it was not moved to main table
      const mainTableResult = await testPool.query(
        'SELECT COUNT(*) as count FROM annotations WHERE image_id = $1',
        [testImage.id]
      );

      expect(parseInt(mainTableResult.rows[0].count)).toBe(0);
    });

    it('should edit and approve an AI annotation', async () => {
      const editResponse = await request(app)
        .post(`/api/ai/annotations/${annotationItemId}/edit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          spanishTerm: 'el pico corregido',
          englishTerm: 'corrected beak',
          notes: 'Adjusted terminology',
        })
        .expect(200);

      expect(editResponse.body).toHaveProperty('message');
      expect(editResponse.body).toHaveProperty('approvedAnnotationId');

      // Verify edited annotation in main table
      const mainTableResult = await testPool.query(
        'SELECT * FROM annotations WHERE id = $1',
        [editResponse.body.approvedAnnotationId]
      );

      expect(mainTableResult.rows.length).toBe(1);
      expect(mainTableResult.rows[0].spanish_term).toBe('el pico corregido');
      expect(mainTableResult.rows[0].english_term).toBe('corrected beak');

      // Verify AI item status
      const aiItemResult = await testPool.query(
        'SELECT status FROM ai_annotation_items WHERE id = $1',
        [annotationItemId]
      );

      expect(aiItemResult.rows[0].status).toBe('edited');
    });
  });

  describe('Batch Annotation Operations', () => {
    let jobIds: string[];

    beforeEach(async () => {
      // Create multiple AI annotation jobs
      jobIds = [];
      for (let i = 0; i < 3; i++) {
        const image = await createTestImage(testSpecies.id);
        const response = await request(app)
          .post(`/api/ai/annotations/generate/${image.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageUrl: image.url,
          })
          .expect(202);

        jobIds.push(response.body.jobId);
      }

      // Wait for all jobs to process
      await delay(2000);
    });

    it('should bulk approve multiple annotation jobs', async () => {
      const response = await request(app)
        .post('/api/ai/annotations/batch/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds,
          notes: 'Bulk approval of high-confidence annotations',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('details');
      expect(response.body.approved).toBeGreaterThan(0);

      // Verify annotations were moved to main table
      const mainTableResult = await testPool.query(
        'SELECT COUNT(*) as count FROM annotations'
      );

      expect(parseInt(mainTableResult.rows[0].count)).toBeGreaterThan(0);

      // Verify job statuses were updated
      const jobsResult = await testPool.query(
        'SELECT status FROM ai_annotations WHERE job_id = ANY($1)',
        [jobIds]
      );

      jobsResult.rows.forEach((row) => {
        expect(row.status).toBe('approved');
      });
    });

    it('should handle partial failures in batch operations', async () => {
      // Add an invalid job ID
      const invalidJobIds = [...jobIds, 'invalid_job_id'];

      const response = await request(app)
        .post('/api/ai/annotations/batch/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds: invalidJobIds,
          notes: 'Test partial failure',
        })
        .expect(200);

      expect(response.body.approved).toBeGreaterThan(0);
      expect(response.body.failed).toBeGreaterThan(0);
      expect(response.body.details.length).toBe(invalidJobIds.length);

      // Check details for success and failure status
      const successDetails = response.body.details.filter((d: any) => d.status === 'success');
      const errorDetails = response.body.details.filter((d: any) => d.status === 'error');

      expect(successDetails.length).toBeGreaterThan(0);
      expect(errorDetails.length).toBeGreaterThan(0);
    });
  });

  describe('Annotation Statistics and Monitoring', () => {
    beforeEach(async () => {
      // Create some annotations and AI jobs
      await createTestAnnotation({
        imageId: testImage.id,
        spanishTerm: 'test',
        englishTerm: 'test',
        boundingBox: { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
      });

      const response = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(202);

      await delay(1500);
    });

    it('should retrieve annotation statistics', async () => {
      const response = await request(app)
        .get('/api/ai/annotations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('avgConfidence');
      expect(response.body).toHaveProperty('recentActivity');

      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.recentActivity)).toBe(true);
    });

    it('should require admin access for statistics', async () => {
      const response = await request(app)
        .get('/api/ai/annotations/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Complete Annotation Workflow Integration', () => {
    it('should complete full workflow: generate → review → approve → verify', async () => {
      // Step 1: Generate AI annotations
      const generateResponse = await request(app)
        .post(`/api/ai/annotations/generate/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: testImage.url,
        })
        .expect(202);

      const jobId = generateResponse.body.jobId;

      // Step 2: Wait for processing
      await delay(1500);

      // Step 3: Retrieve pending annotations
      const pendingResponse = await request(app)
        .get('/api/ai/annotations/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(pendingResponse.body.annotations.length).toBeGreaterThan(0);

      // Step 4: Get specific job details
      const jobResponse = await request(app)
        .get(`/api/ai/annotations/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(jobResponse.body.items.length).toBeGreaterThan(0);
      const firstItemId = jobResponse.body.items[0].id;

      // Step 5: Approve first annotation
      const approveResponse = await request(app)
        .post(`/api/ai/annotations/${firstItemId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Verified and approved',
        })
        .expect(200);

      const approvedAnnotationId = approveResponse.body.approvedAnnotationId;

      // Step 6: Verify annotation exists in main table
      const finalVerification = await testPool.query(
        'SELECT * FROM annotations WHERE id = $1',
        [approvedAnnotationId]
      );

      expect(finalVerification.rows.length).toBe(1);
      expect(finalVerification.rows[0].image_id).toBe(testImage.id);

      // Step 7: Check statistics reflect the changes
      await request(app)
        .get('/api/ai/annotations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
