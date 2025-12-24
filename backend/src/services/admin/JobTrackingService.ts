/**
 * Job Tracking Service
 *
 * CONCEPT: Centralized service for tracking async job progress
 * WHY: Separates job state management from business logic
 * PATTERN: In-memory store with automatic cleanup and status tracking
 *
 * Features:
 * - Job creation and status updates
 * - Progress tracking with success/failure counts
 * - Error logging per job
 * - Automatic cleanup of old jobs
 * - Thread-safe job updates
 */

import { info } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'collect' | 'annotate' | 'upload' | 'delete';

export interface JobError {
  item: string;
  error: string;
  timestamp: string;
}

export interface JobProgress {
  jobId: string;
  type: JobType;
  status: JobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors: JobError[];
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface JobSummary {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  total: number;
  successful: number;
  failed: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface JobStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class JobTrackingService {
  private jobStore: Map<string, JobProgress>;
  private retentionMs: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(retentionHours: number = 24) {
    this.jobStore = new Map();
    this.retentionMs = retentionHours * 60 * 60 * 1000;

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Generate a unique job ID with type prefix
   */
  private generateJobId(type: JobType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Start automatic cleanup of old jobs
   */
  private startCleanup(): void {
    if (this.cleanupIntervalId) {
      return; // Already running
    }

    // Run cleanup every hour
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupOldJobs();
    }, 60 * 60 * 1000);

    info('Job cleanup scheduler started', { retentionHours: this.retentionMs / (60 * 60 * 1000) });
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      info('Job cleanup scheduler stopped');
    }
  }

  /**
   * Remove jobs older than retention period
   */
  private cleanupOldJobs(): void {
    const cutoff = Date.now() - this.retentionMs;
    let removedCount = 0;

    for (const [jobId, job] of this.jobStore.entries()) {
      const jobTime = new Date(job.startedAt).getTime();
      if (jobTime < cutoff && job.status !== 'processing' && job.status !== 'pending') {
        this.jobStore.delete(jobId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      info('Cleaned up old jobs', { removedCount, remainingJobs: this.jobStore.size });
    }
  }

  /**
   * Create a new job
   *
   * @param type - Type of job
   * @param totalItems - Total number of items to process
   * @param metadata - Optional metadata
   * @returns Job ID
   */
  createJob(
    type: JobType,
    totalItems: number,
    metadata?: Record<string, unknown>
  ): string {
    const jobId = this.generateJobId(type);

    const job: JobProgress = {
      jobId,
      type,
      status: 'processing',
      totalItems,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: [],
      startedAt: new Date().toISOString(),
      metadata
    };

    this.jobStore.set(jobId, job);

    info('Job created', {
      jobId,
      type,
      totalItems,
      metadata
    });

    return jobId;
  }

  /**
   * Get job by ID
   *
   * @param jobId - Job identifier
   * @returns Job progress or undefined if not found
   */
  getJob(jobId: string): JobProgress | undefined {
    return this.jobStore.get(jobId);
  }

  /**
   * Get all jobs
   *
   * @returns Array of all jobs
   */
  getAllJobs(): JobProgress[] {
    return Array.from(this.jobStore.values());
  }

  /**
   * Get jobs by type
   *
   * @param type - Job type filter
   * @returns Array of jobs matching the type
   */
  getJobsByType(type: JobType): JobProgress[] {
    return Array.from(this.jobStore.values()).filter(job => job.type === type);
  }

  /**
   * Get jobs by status
   *
   * @param status - Job status filter
   * @returns Array of jobs matching the status
   */
  getJobsByStatus(status: JobStatus): JobProgress[] {
    return Array.from(this.jobStore.values()).filter(job => job.status === status);
  }

  /**
   * Update job status
   *
   * @param jobId - Job identifier
   * @param status - New status
   * @returns true if update was successful
   */
  updateStatus(jobId: string, status: JobStatus): boolean {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return false;
    }

    job.status = status;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      job.completedAt = new Date().toISOString();
    }

    info('Job status updated', { jobId, status });
    return true;
  }

  /**
   * Increment processed items
   *
   * @param jobId - Job identifier
   * @param success - Whether the item was processed successfully
   * @returns true if update was successful
   */
  incrementProgress(jobId: string, success: boolean): boolean {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return false;
    }

    job.processedItems++;
    if (success) {
      job.successfulItems++;
    } else {
      job.failedItems++;
    }

    return true;
  }

  /**
   * Add an error to the job
   *
   * @param jobId - Job identifier
   * @param item - Item that failed
   * @param error - Error message
   * @returns true if error was added
   */
  addError(jobId: string, item: string, error: string): boolean {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return false;
    }

    job.errors.push({
      item,
      error,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Complete a job (automatically determine status based on results)
   *
   * @param jobId - Job identifier
   * @returns true if job was completed
   */
  completeJob(jobId: string): boolean {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return false;
    }

    // Determine final status
    if (job.failedItems > 0 && job.successfulItems === 0) {
      job.status = 'failed';
    } else {
      job.status = 'completed';
    }

    job.completedAt = new Date().toISOString();

    info('Job completed', {
      jobId,
      status: job.status,
      successful: job.successfulItems,
      failed: job.failedItems,
      total: job.totalItems
    });

    return true;
  }

  /**
   * Cancel a job
   *
   * @param jobId - Job identifier
   * @returns true if job was cancelled
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'processing' || job.status === 'pending') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();

      info('Job cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Get job summary (simplified view)
   *
   * @param jobId - Job identifier
   * @returns Job summary or undefined if not found
   */
  getJobSummary(jobId: string): JobSummary | undefined {
    const job = this.jobStore.get(jobId);
    if (!job) {
      return undefined;
    }

    return {
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      progress: job.processedItems,
      total: job.totalItems,
      successful: job.successfulItems,
      failed: job.failedItems,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.errors.length > 0 ? job.errors[job.errors.length - 1].error : undefined
    };
  }

  /**
   * Get overall job statistics
   *
   * @returns Statistics about all jobs
   */
  getStats(): JobStats {
    const jobs = this.getAllJobs();

    return {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length
    };
  }

  /**
   * Clear all jobs (useful for testing)
   */
  clearAllJobs(): void {
    const count = this.jobStore.size;
    this.jobStore.clear();
    info('Cleared all jobs', { count });
  }

  /**
   * Get job count
   */
  getJobCount(): number {
    return this.jobStore.size;
  }
}

// ============================================================================
// Singleton Instance (for backward compatibility)
// ============================================================================

export const jobTrackingService = new JobTrackingService();
