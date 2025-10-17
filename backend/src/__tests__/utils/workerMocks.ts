/**
 * Worker Process Mocks
 * Mock implementations for batch processors and async workers
 */

import { RateLimiter } from '../../services/rateLimiter';
import { BatchProcessor } from '../../services/batchProcessor';

/**
 * Mock RateLimiter that doesn't use real timers
 * Useful for testing without timer side effects
 */
export class MockRateLimiter {
  private tokens: number;
  private maxTokens: number;

  constructor(maxTokens: number = 10) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
  }

  async tryAcquire(): Promise<boolean> {
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  async waitForToken(): Promise<void> {
    // In mock, immediately acquire if available, else reject
    if (this.tokens <= 0) {
      throw new Error('No tokens available in mock rate limiter');
    }
    this.tokens--;
  }

  refill(count: number = 1): void {
    this.tokens = Math.min(this.tokens + count, this.maxTokens);
  }

  getAvailableTokens(): number {
    return this.tokens;
  }

  stop(): void {
    // No-op for mock
  }

  reset(): void {
    this.tokens = this.maxTokens;
  }
}

/**
 * Mock BatchProcessor for testing without real async processing
 */
export class MockBatchProcessor {
  private activeJobs: Map<string, any> = new Map();
  private jobResults: Map<string, any[]> = new Map();

  async startBatch(
    imageIds: string[],
    concurrency: number = 5
  ): Promise<string> {
    const jobId = `mock-job-${Date.now()}`;

    this.activeJobs.set(jobId, {
      imageIds,
      concurrency,
      status: 'pending',
      startedAt: new Date()
    });

    // Simulate async processing without actually doing it
    setTimeout(() => {
      this.completeJob(jobId, imageIds);
    }, 10);

    return jobId;
  }

  private completeJob(jobId: string, imageIds: string[]): void {
    const results = imageIds.map(imageId => ({
      imageId,
      status: 'success' as const,
      annotationsCreated: 3,
      processingTime: 100
    }));

    this.jobResults.set(jobId, results);

    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (job && job.status !== 'completed') {
      job.status = 'cancelled';
      return true;
    }
    return false;
  }

  async getJobProgress(jobId: string): Promise<any> {
    const job = this.activeJobs.get(jobId);
    const results = this.jobResults.get(jobId) || [];

    if (!job) {
      return null;
    }

    return {
      jobId,
      status: job.status,
      progress: {
        total: job.imageIds.length,
        processed: results.length,
        successful: results.filter((r: any) => r.status === 'success').length,
        failed: results.filter((r: any) => r.status === 'failed').length,
        percentage: Math.round((results.length / job.imageIds.length) * 100)
      }
    };
  }

  async listActiveJobs(): Promise<any[]> {
    return Array.from(this.activeJobs.values()).filter(
      job => job.status === 'pending' || job.status === 'processing'
    );
  }

  destroy(): void {
    this.activeJobs.clear();
    this.jobResults.clear();
  }
}

/**
 * Helper to mock batch processor routes
 */
export function mockBatchProcessor(): jest.MockedObject<BatchProcessor> {
  return {
    startBatch: jest.fn().mockResolvedValue('mock-job-id'),
    cancelJob: jest.fn().mockResolvedValue(true),
    getJobProgress: jest.fn().mockResolvedValue({
      jobId: 'mock-job-id',
      status: 'completed',
      progress: {
        total: 10,
        processed: 10,
        successful: 10,
        failed: 0,
        percentage: 100
      }
    }),
    listActiveJobs: jest.fn().mockResolvedValue([]),
    destroy: jest.fn()
  } as any;
}

/**
 * Helper to mock VisionAI service
 */
export function mockVisionAIService() {
  return {
    generateAnnotations: jest.fn().mockResolvedValue([
      {
        spanishTerm: 'pico',
        englishTerm: 'beak',
        boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        type: 'anatomical',
        difficultyLevel: 2,
        confidence: 0.95
      }
    ]),
    annotateImage: jest.fn().mockResolvedValue([]),
    getCachedAnnotations: jest.fn().mockResolvedValue(null),
    cacheAnnotations: jest.fn().mockResolvedValue(undefined)
  };
}

/**
 * Helper to wait for batch job completion in tests
 */
export async function waitForBatchJobCompletion(
  processor: BatchProcessor | MockBatchProcessor,
  jobId: string,
  maxWaitMs: number = 5000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const progress = await processor.getJobProgress(jobId);

    if (!progress) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
      return progress;
    }

    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Batch job ${jobId} did not complete within ${maxWaitMs}ms`);
}

/**
 * Create a controlled async worker that can be manually advanced
 */
export class ControlledWorker {
  private pendingTasks: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;

  async addTask(task: () => Promise<void>): Promise<void> {
    this.pendingTasks.push(task);
  }

  async processNext(): Promise<boolean> {
    const task = this.pendingTasks.shift();
    if (!task) {
      return false;
    }

    this.isProcessing = true;
    try {
      await task();
      return true;
    } finally {
      this.isProcessing = false;
    }
  }

  async processAll(): Promise<number> {
    let processed = 0;
    while (this.pendingTasks.length > 0) {
      await this.processNext();
      processed++;
    }
    return processed;
  }

  getPendingCount(): number {
    return this.pendingTasks.length;
  }

  clear(): void {
    this.pendingTasks = [];
  }
}
