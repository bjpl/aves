import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { BatchProcessor } from '../services/batchProcessor';
import { error as logError, info } from '../utils/logger';

const router = Router();

// Initialize batch processor (use 'paid' tier for production, 'free' for testing)
const batchProcessor = new BatchProcessor(
  process.env.OPENAI_TIER === 'free' ? 'free' : 'paid'
);

// Validation schemas
const CreateBatchJobSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(1000),
  concurrency: z.number().int().min(1).max(10).optional().default(5),
  rateLimitPerMinute: z.number().int().min(10).max(500).optional()
});

/**
 * POST /api/batch/annotations/start
 * Start a new batch annotation generation job
 */
router.post('/batch/annotations/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = CreateBatchJobSchema.parse(req.body);

    info('Starting batch job', {
      imageCount: validatedData.imageIds.length,
      concurrency: validatedData.concurrency
    });

    const jobId = await batchProcessor.startBatch(
      validatedData.imageIds,
      validatedData.concurrency,
      validatedData.rateLimitPerMinute
    );

    // Calculate estimated duration
    const estimatedDuration = Math.ceil(
      (validatedData.imageIds.length / validatedData.concurrency) * 2000
    );

    res.status(201).json({
      jobId,
      status: 'pending',
      totalItems: validatedData.imageIds.length,
      estimatedDuration,
      message: 'Batch job started successfully'
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request data',
        details: err.errors
      });
    } else {
      logError('Error starting batch job', err as Error);
      res.status(500).json({
        error: 'Failed to start batch job'
      });
    }
  }
});

/**
 * GET /api/batch/annotations/:jobId/status
 * Get the status and progress of a batch job
 */
router.get('/batch/annotations/:jobId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const progress = await batchProcessor.getJobProgress(jobId);

    if (!progress) {
      res.status(404).json({
        error: 'Job not found'
      });
      return;
    }

    res.json(progress);

  } catch (err) {
    logError('Error fetching job status', err as Error);
    res.status(500).json({
      error: 'Failed to fetch job status'
    });
  }
});

/**
 * POST /api/batch/annotations/:jobId/cancel
 * Cancel a running batch job
 */
router.post('/batch/annotations/:jobId/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const cancelled = await batchProcessor.cancelJob(jobId);

    if (!cancelled) {
      res.status(404).json({
        error: 'Job not found or already completed'
      });
      return;
    }

    info('Batch job cancelled', { jobId });

    res.json({
      message: 'Job cancelled successfully',
      jobId
    });

  } catch (err) {
    logError('Error cancelling job', err as Error);
    res.status(500).json({
      error: 'Failed to cancel job'
    });
  }
});

/**
 * GET /api/batch/annotations/active
 * List all active batch jobs
 */
router.get('/batch/annotations/active', async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeJobs = await batchProcessor.listActiveJobs();

    res.json({
      jobs: activeJobs,
      count: activeJobs.length
    });

  } catch (err) {
    logError('Error fetching active jobs', err as Error);
    res.status(500).json({
      error: 'Failed to fetch active jobs'
    });
  }
});

/**
 * GET /api/batch/annotations/stats
 * Get batch processing statistics
 */
router.get('/batch/annotations/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeJobs = await batchProcessor.listActiveJobs();

    const stats = {
      activeJobs: activeJobs.length,
      totalProcessing: activeJobs.reduce((sum, job) => sum + job.processedItems, 0),
      totalSuccessful: activeJobs.reduce((sum, job) => sum + job.successfulItems, 0),
      totalFailed: activeJobs.reduce((sum, job) => sum + job.failedItems, 0)
    };

    res.json(stats);

  } catch (err) {
    logError('Error fetching batch stats', err as Error);
    res.status(500).json({
      error: 'Failed to fetch batch statistics'
    });
  }
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  info('Shutting down batch processor');
  batchProcessor.destroy();
});

process.on('SIGINT', () => {
  info('Shutting down batch processor');
  batchProcessor.destroy();
});

/**
 * Cleanup function for batch processor
 * Exported for use in test teardown
 */
export function cleanupBatchProcessor(): void {
  if (batchProcessor) {
    batchProcessor.destroy();
  }
}

export default router;
