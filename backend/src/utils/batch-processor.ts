/**
 * Parallel Batch Processor with Performance Tracking
 * Optimized for high-throughput annotation generation with Claude Vision API
 */

import { info, error as logError } from './logger';

export interface BatchTask<T, R> {
  id: string;
  data: T;
  priority?: number;
}

export interface BatchResult<R> {
  taskId: string;
  result?: R;
  error?: Error;
  duration: number;
  retries: number;
  timestamp: Date;
}

export interface BatchMetrics {
  totalTasks: number;
  completed: number;
  failed: number;
  inProgress: number;
  averageDuration: number;
  totalDuration: number;
  throughput: number; // tasks per second
  successRate: number;
  retryRate: number;
}

export interface ProcessorConfig {
  concurrency: number; // Number of parallel requests (3-5 recommended)
  retryAttempts: number; // Max retry attempts per task
  retryDelay: number; // Base delay in ms (exponential backoff)
  taskTimeout: number; // Max time per task in ms
  rateLimitDelay: number; // Delay between batches in ms
  progressCallback?: (metrics: BatchMetrics) => void;
}

export class ParallelBatchProcessor<T, R> {
  private config: ProcessorConfig;
  private queue: BatchTask<T, R>[] = [];
  private processing: Set<string> = new Set();
  private results: BatchResult<R>[] = [];
  private startTime: number = 0;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = {
      concurrency: config.concurrency || 4,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      taskTimeout: config.taskTimeout || 60000,
      rateLimitDelay: config.rateLimitDelay || 200,
      progressCallback: config.progressCallback
    };
  }

  /**
   * Process tasks in parallel batches
   */
  async processBatch(
    tasks: BatchTask<T, R>[],
    processor: (data: T) => Promise<R>
  ): Promise<BatchResult<R>[]> {
    this.queue = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.results = [];
    this.processing.clear();
    this.startTime = Date.now();

    info('Starting parallel batch processing', {
      totalTasks: tasks.length,
      concurrency: this.config.concurrency,
      retryAttempts: this.config.retryAttempts
    });

    // Create worker pool
    const workers = Array(this.config.concurrency)
      .fill(null)
      .map((_, index) => this.worker(index, processor));

    // Wait for all workers to complete
    await Promise.all(workers);

    const totalDuration = Date.now() - this.startTime;
    const metrics = this.getMetrics();

    info('Batch processing completed', {
      ...metrics,
      totalDuration: `${(totalDuration / 1000).toFixed(2)}s`
    });

    return this.results;
  }

  /**
   * Worker function that processes tasks from the queue
   */
  private async worker(
    workerId: number,
    processor: (data: T) => Promise<R>
  ): Promise<void> {
    while (this.queue.length > 0 || this.processing.size > 0) {
      // Get next task
      const task = this.queue.shift();
      if (!task) {
        // No more tasks, but wait for other workers
        if (this.processing.size === 0) break;
        await this.sleep(100);
        continue;
      }

      this.processing.add(task.id);

      try {
        const result = await this.processTaskWithRetry(task, processor);
        this.results.push(result);
        this.notifyProgress();
      } catch (error) {
        logError(`Worker ${workerId} failed to process task ${task.id}`, error as Error);
        this.results.push({
          taskId: task.id,
          error: error as Error,
          duration: 0,
          retries: this.config.retryAttempts,
          timestamp: new Date()
        });
      } finally {
        this.processing.delete(task.id);
      }

      // Rate limiting between tasks
      if (this.queue.length > 0) {
        await this.sleep(this.config.rateLimitDelay);
      }
    }
  }

  /**
   * Process a single task with retry logic
   */
  private async processTaskWithRetry(
    task: BatchTask<T, R>,
    processor: (data: T) => Promise<R>
  ): Promise<BatchResult<R>> {
    let lastError: Error | undefined;
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      const startTime = Date.now();

      try {
        // Execute with timeout
        const result = await this.withTimeout(
          processor(task.data),
          this.config.taskTimeout,
          `Task ${task.id} timeout after ${this.config.taskTimeout}ms`
        );

        const duration = Date.now() - startTime;

        return {
          taskId: task.id,
          result,
          duration,
          retries,
          timestamp: new Date()
        };

      } catch (error) {
        lastError = error as Error;
        retries++;

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          info(`Retrying task ${task.id} after ${delay}ms (attempt ${attempt + 1}/${this.config.retryAttempts})`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw lastError || new Error(`Task ${task.id} failed after ${this.config.retryAttempts} retries`);
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    );

    return Promise.race([promise, timeout]);
  }

  /**
   * Calculate current metrics
   */
  getMetrics(): BatchMetrics {
    const completed = this.results.filter(r => !r.error).length;
    const failed = this.results.filter(r => r.error).length;
    const total = this.queue.length + this.processing.size + this.results.length;
    const inProgress = this.processing.size;

    const durations = this.results
      .filter(r => !r.error)
      .map(r => r.duration);

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const totalDuration = Date.now() - this.startTime;
    const throughput = totalDuration > 0 ? (completed / (totalDuration / 1000)) : 0;

    const totalRetries = this.results.reduce((sum, r) => sum + r.retries, 0);
    const retryRate = this.results.length > 0 ? totalRetries / this.results.length : 0;

    return {
      totalTasks: total,
      completed,
      failed,
      inProgress,
      averageDuration,
      totalDuration,
      throughput,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      retryRate
    };
  }

  /**
   * Notify progress callback if configured
   */
  private notifyProgress(): void {
    if (this.config.progressCallback) {
      this.config.progressCallback(this.getMetrics());
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
