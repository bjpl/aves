import { pool } from '../database/connection';
import { RateLimiter, createRateLimiter } from './rateLimiter';
import {
  BatchJob,
  BatchJobStatus,
  BatchImageResult,
  BatchJobProgress,
  BatchJobError
} from '../types/batch.types';
import { info, warn, error as logError } from '../utils/logger';

interface ProcessingContext {
  jobId: string;
  rateLimiter: RateLimiter;
  concurrency: number;
  abortSignal?: AbortController;
}

/**
 * BatchProcessor handles batch processing of images for AI annotation generation
 *
 * Features:
 * - Concurrent processing with configurable parallelism
 * - Token bucket rate limiting
 * - Automatic retry with exponential backoff
 * - Progress tracking
 * - Graceful error handling
 */
export class BatchProcessor {
  private activeJobs: Map<string, AbortController> = new Map();
  private rateLimiter: RateLimiter;

  constructor(tier: 'free' | 'paid' = 'paid') {
    this.rateLimiter = createRateLimiter(tier);
  }

  /**
   * Start a new batch processing job
   */
  async startBatch(
    imageIds: string[],
    concurrency: number = 5,
    rateLimitPerMinute?: number
  ): Promise<string> {
    // Create job record
    const jobId = await this.createJobRecord(imageIds, concurrency, rateLimitPerMinute);

    info('Batch job started', {
      jobId,
      imageCount: imageIds.length,
      concurrency
    });

    // Start processing asynchronously (don't await)
    this.processBatch(jobId, imageIds, concurrency).catch(err => {
      logError('Batch processing failed', err);
      this.updateJobStatus(jobId, 'failed');
    });

    return jobId;
  }

  /**
   * Process a batch of images with concurrency control
   */
  private async processBatch(
    jobId: string,
    imageIds: string[],
    concurrency: number
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);

    const context: ProcessingContext = {
      jobId,
      rateLimiter: this.rateLimiter,
      concurrency,
      abortSignal: abortController
    };

    try {
      await this.updateJobStatus(jobId, 'processing');

      // Process images in parallel batches
      const results: BatchImageResult[] = [];

      for (let i = 0; i < imageIds.length; i += concurrency) {
        if (abortController.signal.aborted) {
          info('Batch job cancelled', { jobId });
          await this.updateJobStatus(jobId, 'cancelled');
          return;
        }

        const batch = imageIds.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(imageId => this.processImage(imageId, context))
        );

        results.push(...batchResults);

        // Update progress
        await this.updateProgress(jobId, results);
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'completed');

      info('Batch job completed', {
        jobId,
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      });

    } catch (err) {
      logError('Batch processing error', err as Error);
      await this.updateJobStatus(jobId, 'failed');
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Process a single image with retry logic
   */
  async processImage(
    imageId: string,
    context: ProcessingContext,
    attempt: number = 1
  ): Promise<BatchImageResult> {
    const maxAttempts = 3;
    const startTime = Date.now();

    try {
      // Wait for rate limit token
      await context.rateLimiter.waitForToken();

      // Check if job was cancelled
      if (context.abortSignal?.signal.aborted) {
        return {
          imageId,
          status: 'skipped',
          processingTime: Date.now() - startTime
        };
      }

      // TODO: Replace with actual Vision AI service call
      // For now, simulate processing
      await this.simulateVisionAICall(imageId);

      info('Image processed successfully', { imageId, attempt });

      return {
        imageId,
        status: 'success',
        annotationsCreated: Math.floor(Math.random() * 5) + 1, // Mock data
        processingTime: Date.now() - startTime
      };

    } catch (err) {
      const error = err as Error;
      warn('Image processing failed', {
        imageId,
        attempt,
        error: error.message
      });

      // Record error
      await this.recordError(context.jobId, imageId, error.message, attempt);

      // Retry with exponential backoff
      if (attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        info('Retrying image processing', {
          imageId,
          attempt: attempt + 1,
          backoffMs
        });

        await this.sleep(backoffMs);
        return this.processImage(imageId, context, attempt + 1);
      }

      return {
        imageId,
        status: 'failed',
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Cancel a running batch job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const abortController = this.activeJobs.get(jobId);

    if (!abortController) {
      warn('Cannot cancel job - not found or already completed', { jobId });
      return false;
    }

    abortController.abort();
    await this.updateJobStatus(jobId, 'cancelled');

    info('Job cancelled', { jobId });
    return true;
  }

  /**
   * Get job progress and status
   */
  async getJobProgress(jobId: string): Promise<BatchJobProgress | null> {
    const query = `
      SELECT
        id,
        status,
        total_items as "totalItems",
        processed_items as "processedItems",
        successful_items as "successfulItems",
        failed_items as "failedItems",
        metadata,
        started_at as "startedAt",
        updated_at as "updatedAt"
      FROM batch_jobs
      WHERE id = $1
    `;

    const result = await pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const job = result.rows[0];
    const errors = await this.getJobErrors(jobId);

    const percentage = job.totalItems > 0
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (job.status === 'processing' && job.processedItems > 0) {
      const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
      const avgTimePerItem = elapsedMs / job.processedItems;
      const remainingItems = job.totalItems - job.processedItems;
      estimatedTimeRemaining = Math.ceil(avgTimePerItem * remainingItems);
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: {
        total: job.totalItems,
        processed: job.processedItems,
        successful: job.successfulItems,
        failed: job.failedItems,
        percentage
      },
      estimatedTimeRemaining,
      errors
    };
  }

  /**
   * List all active batch jobs
   */
  async listActiveJobs(): Promise<BatchJob[]> {
    const query = `
      SELECT
        id,
        job_type as "jobType",
        status,
        total_items as "totalItems",
        processed_items as "processedItems",
        successful_items as "successfulItems",
        failed_items as "failedItems",
        metadata,
        started_at as "startedAt",
        completed_at as "completedAt",
        cancelled_at as "cancelledAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM batch_jobs
      WHERE status IN ('pending', 'processing')
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    return Promise.all(
      result.rows.map(async (job) => ({
        ...job,
        errors: await this.getJobErrors(job.id)
      }))
    );
  }

  // Private helper methods

  private async createJobRecord(
    imageIds: string[],
    concurrency: number,
    rateLimitPerMinute?: number
  ): Promise<string> {
    const query = `
      INSERT INTO batch_jobs (
        job_type,
        status,
        total_items,
        processed_items,
        successful_items,
        failed_items,
        metadata,
        started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const metadata = {
      imageIds,
      concurrency,
      rateLimitPerMinute: rateLimitPerMinute || this.rateLimiter.getAvailableTokens()
    };

    const result = await pool.query(query, [
      'annotation_generation',
      'pending',
      imageIds.length,
      0,
      0,
      0,
      JSON.stringify(metadata)
    ]);

    return result.rows[0].id;
  }

  private async updateJobStatus(jobId: string, status: BatchJobStatus): Promise<void> {
    const query = `
      UPDATE batch_jobs
      SET
        status = $1,
        ${status === 'completed' || status === 'failed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
        ${status === 'cancelled' ? 'cancelled_at = CURRENT_TIMESTAMP,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await pool.query(query, [status, jobId]);
  }

  private async updateProgress(jobId: string, results: BatchImageResult[]): Promise<void> {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const processed = results.length;

    const query = `
      UPDATE batch_jobs
      SET
        processed_items = $1,
        successful_items = $2,
        failed_items = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `;

    await pool.query(query, [processed, successful, failed, jobId]);
  }

  private async recordError(
    jobId: string,
    imageId: string,
    errorMessage: string,
    attempt: number
  ): Promise<void> {
    const query = `
      INSERT INTO batch_job_errors (
        job_id,
        item_id,
        error_message,
        attempt_number
      ) VALUES ($1, $2, $3, $4)
    `;

    await pool.query(query, [jobId, imageId, errorMessage, attempt]);
  }

  private async getJobErrors(jobId: string): Promise<BatchJobError[]> {
    const query = `
      SELECT
        item_id as "itemId",
        error_message as "error",
        attempt_number as "attemptNumber",
        created_at as "timestamp"
      FROM batch_job_errors
      WHERE job_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query, [jobId]);
    return result.rows;
  }

  private async simulateVisionAICall(imageId: string): Promise<void> {
    // Simulate API call delay
    await this.sleep(Math.random() * 1000 + 500);

    // Simulate 5% failure rate for testing
    if (Math.random() < 0.05) {
      throw new Error(`Vision AI error for image ${imageId}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup - stop rate limiter
   */
  destroy(): void {
    this.rateLimiter.stop();
  }
}
