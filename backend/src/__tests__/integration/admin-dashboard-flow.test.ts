/**
 * Integration Tests: Admin Dashboard Flow
 * Tests admin-specific operations including batch job management,
 * system monitoring, and administrative controls
 */

import request from 'supertest';
import express from 'express';
import batchRouter from '../../routes/batch';
import aiAnnotationsRouter from '../../routes/aiAnnotations';
import aiExercisesRouter from '../../routes/aiExercises';
import authRouter from '../../routes/auth';
import {
  testPool,
  createTestUser,
  createBatchJob,
  createTestSpecies,
  createTestImage,
  TEST_USERS,
  delay,
} from './setup';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', authRouter);
app.use('/api', batchRouter);
app.use('/api', aiAnnotationsRouter);
app.use('/api', aiExercisesRouter);

describe('Integration: Admin Dashboard Flow', () => {
  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const admin = await createTestUser(TEST_USERS.adminUser, true);
    const user = await createTestUser(TEST_USERS.regularUser);
    adminToken = admin.token;
    adminId = admin.id;
    userToken = user.token;
    userId = user.id;
  });

  describe('Batch Job Management', () => {
    it('should create a new batch job', async () => {
      const jobData = {
        jobType: 'annotation_generation',
        totalItems: 50,
        metadata: {
          description: 'Generate annotations for new images',
        },
      };

      const response = await request(app)
        .post('/api/batch/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('jobType');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('pending');
      expect(response.body.totalItems).toBe(50);

      // Verify job in database
      const dbResult = await testPool.query(
        'SELECT * FROM batch_jobs WHERE job_id = $1',
        [response.body.jobId]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].job_type).toBe('annotation_generation');
    });

    it('should require admin privileges to create batch jobs', async () => {
      const jobData = {
        jobType: 'test_job',
        totalItems: 10,
      };

      const response = await request(app)
        .post('/api/batch/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(jobData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should list all batch jobs', async () => {
      // Create multiple jobs
      for (let i = 0; i < 3; i++) {
        await createBatchJob({
          jobType: 'test_job',
          totalItems: 10 * (i + 1),
        });
      }

      const response = await request(app)
        .get('/api/batch/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((job: any) => {
        expect(job).toHaveProperty('jobId');
        expect(job).toHaveProperty('jobType');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('totalItems');
      });
    });

    it('should filter batch jobs by status', async () => {
      // Create jobs with different statuses
      await createBatchJob({ jobType: 'job1', status: 'pending' });
      await createBatchJob({ jobType: 'job2', status: 'processing' });
      await createBatchJob({ jobType: 'job3', status: 'completed' });

      const response = await request(app)
        .get('/api/batch/jobs?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('pending');
    });

    it('should retrieve specific batch job details', async () => {
      const job = await createBatchJob({
        jobType: 'annotation_generation',
        totalItems: 25,
        processedItems: 10,
      });

      const response = await request(app)
        .get(`/api/batch/jobs/${job.jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.jobId).toBe(job.jobId);
      expect(response.body.totalItems).toBe(25);
      expect(response.body.processedItems).toBe(10);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should update batch job status', async () => {
      const job = await createBatchJob({
        jobType: 'test_job',
        status: 'pending',
      });

      const updateResponse = await request(app)
        .patch(`/api/batch/jobs/${job.jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'processing',
          processedItems: 5,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe('processing');
      expect(updateResponse.body.processedItems).toBe(5);

      // Verify database update
      const dbResult = await testPool.query(
        'SELECT status, processed_items FROM batch_jobs WHERE job_id = $1',
        [job.jobId]
      );

      expect(dbResult.rows[0].status).toBe('processing');
      expect(dbResult.rows[0].processed_items).toBe(5);
    });

    it('should track batch job progress percentage', async () => {
      const job = await createBatchJob({
        jobType: 'test_job',
        totalItems: 100,
        processedItems: 25,
      });

      const response = await request(app)
        .get(`/api/batch/jobs/${job.jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('progressPercentage');
      expect(response.body.progressPercentage).toBe(25);
    });

    it('should cancel a batch job', async () => {
      const job = await createBatchJob({
        jobType: 'test_job',
        status: 'processing',
      });

      const response = await request(app)
        .post(`/api/batch/jobs/${job.jobId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('cancelled');

      // Verify database update
      const dbResult = await testPool.query(
        'SELECT status FROM batch_jobs WHERE job_id = $1',
        [job.jobId]
      );

      expect(dbResult.rows[0].status).toBe('cancelled');
    });
  });

  describe('System Monitoring and Statistics', () => {
    beforeEach(async () => {
      // Set up test data for statistics
      const species = await createTestSpecies();
      const image = await createTestImage(species.id);

      // Generate some AI annotations
      await request(app)
        .post(`/api/ai/annotations/generate/${image.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ imageUrl: image.url })
        .expect(202);

      await delay(1500);

      // Generate some exercises
      await request(app)
        .post('/api/ai/exercises/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, type: 'contextual_fill' })
        .expect(200);
    });

    it('should retrieve AI annotation statistics', async () => {
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

      expect(typeof response.body.total).toBe('number');
      expect(Array.isArray(response.body.recentActivity)).toBe(true);
    });

    it('should retrieve AI exercise statistics', async () => {
      const response = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGenerated');
      expect(response.body).toHaveProperty('cached');
      expect(response.body).toHaveProperty('cacheHitRate');
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body).toHaveProperty('avgGenerationTime');

      expect(typeof response.body.totalGenerated).toBe('number');
      expect(typeof response.body.cacheHitRate).toBe('number');
    });

    it('should require admin access for statistics endpoints', async () => {
      const endpoints = [
        '/api/ai/annotations/stats',
        '/api/ai/exercises/stats',
        '/api/batch/jobs',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should track batch job statistics', async () => {
      // Create jobs with different statuses
      await createBatchJob({ jobType: 'job1', status: 'pending' });
      await createBatchJob({ jobType: 'job2', status: 'processing' });
      await createBatchJob({ jobType: 'job3', status: 'completed' });
      await createBatchJob({ jobType: 'job4', status: 'failed' });

      const response = await request(app)
        .get('/api/batch/jobs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('processing');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('failed');

      expect(response.body.total).toBe(4);
      expect(response.body.pending).toBe(1);
      expect(response.body.completed).toBe(1);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      // Generate some cached exercises
      await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, count: 5 })
        .expect(200);
    });

    it('should clear exercise cache for specific user', async () => {
      // Verify cache exists
      const beforeClear = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );
      expect(parseInt(beforeClear.rows[0].count)).toBeGreaterThan(0);

      // Clear cache
      const response = await request(app)
        .delete(`/api/ai/exercises/cache/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body.deletedCount).toBeGreaterThan(0);

      // Verify cache was cleared
      const afterClear = await testPool.query(
        'SELECT COUNT(*) as count FROM exercise_cache WHERE cache_key LIKE $1',
        [`${userId}%`]
      );
      expect(parseInt(afterClear.rows[0].count)).toBe(0);
    });

    it('should require admin access for cache clearing', async () => {
      const response = await request(app)
        .delete(`/api/ai/exercises/cache/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should view cache statistics', async () => {
      const response = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGenerated');
      expect(response.body).toHaveProperty('cached');
      expect(response.body).toHaveProperty('cacheHitRate');

      expect(response.body.totalGenerated).toBeGreaterThan(0);
    });
  });

  describe('Complete Admin Dashboard Workflow', () => {
    it('should complete full admin workflow: create job → monitor → manage', async () => {
      // Step 1: Create batch annotation job
      const species = await createTestSpecies();
      const images = [];
      for (let i = 0; i < 3; i++) {
        images.push(await createTestImage(species.id));
      }

      const jobResponse = await request(app)
        .post('/api/batch/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobType: 'annotation_generation',
          totalItems: images.length,
          metadata: { speciesId: species.id },
        })
        .expect(201);

      const jobId = jobResponse.body.jobId;

      // Step 2: Start processing (trigger AI generations)
      for (const image of images) {
        await request(app)
          .post(`/api/ai/annotations/generate/${image.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ imageUrl: image.url })
          .expect(202);
      }

      // Step 3: Update job progress
      await request(app)
        .patch(`/api/batch/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'processing',
          processedItems: images.length,
        })
        .expect(200);

      // Step 4: Wait for processing
      await delay(2000);

      // Step 5: Check pending annotations
      const pendingResponse = await request(app)
        .get('/api/ai/annotations/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(pendingResponse.body.annotations.length).toBeGreaterThan(0);

      // Step 6: Approve annotations in batch
      const jobIds = pendingResponse.body.annotations
        .slice(0, 2)
        .map((a: any) => a.jobId);

      const batchApproveResponse = await request(app)
        .post('/api/ai/annotations/batch/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds,
          notes: 'Batch approval via admin dashboard',
        })
        .expect(200);

      expect(batchApproveResponse.body.approved).toBeGreaterThan(0);

      // Step 7: Update batch job to completed
      await request(app)
        .patch(`/api/batch/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          processedItems: images.length,
        })
        .expect(200);

      // Step 8: Verify final statistics
      const statsResponse = await request(app)
        .get('/api/ai/annotations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statsResponse.body.total).toBeGreaterThan(0);
      expect(statsResponse.body.approved).toBeGreaterThan(0);

      // Step 9: Verify batch job completed
      const jobDetailsResponse = await request(app)
        .get(`/api/batch/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(jobDetailsResponse.body.status).toBe('completed');
      expect(jobDetailsResponse.body.progressPercentage).toBe(100);
    });

    it('should monitor system health across all components', async () => {
      // Create activity across different components
      const species = await createTestSpecies();
      const image = await createTestImage(species.id);

      // Generate AI annotations
      await request(app)
        .post(`/api/ai/annotations/generate/${image.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ imageUrl: image.url })
        .expect(202);

      // Generate AI exercises
      await request(app)
        .post('/api/ai/exercises/prefetch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, count: 3 })
        .expect(200);

      // Create batch job
      await request(app)
        .post('/api/batch/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jobType: 'maintenance', totalItems: 1 })
        .expect(201);

      await delay(1500);

      // Collect all statistics
      const annotationStats = await request(app)
        .get('/api/ai/annotations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const exerciseStats = await request(app)
        .get('/api/ai/exercises/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const jobStats = await request(app)
        .get('/api/batch/jobs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify all components are tracked
      expect(annotationStats.body.total).toBeGreaterThan(0);
      expect(exerciseStats.body.totalGenerated).toBeGreaterThan(0);
      expect(jobStats.body.total).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid batch job IDs gracefully', async () => {
      const response = await request(app)
        .get('/api/batch/jobs/invalid-job-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent cancellation of completed jobs', async () => {
      const job = await createBatchJob({
        jobType: 'test_job',
        status: 'completed',
      });

      const response = await request(app)
        .post(`/api/batch/jobs/${job.jobId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent batch job updates', async () => {
      const job = await createBatchJob({
        jobType: 'concurrent_test',
        totalItems: 100,
      });

      // Make concurrent updates
      const updates = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app)
            .patch(`/api/batch/jobs/${job.jobId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ processedItems: (index + 1) * 20 })
        );

      const responses = await Promise.all(updates);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const finalState = await testPool.query(
        'SELECT processed_items FROM batch_jobs WHERE job_id = $1',
        [job.jobId]
      );

      expect(finalState.rows.length).toBe(1);
      expect(finalState.rows[0].processed_items).toBeGreaterThan(0);
    });
  });
});
