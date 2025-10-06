export type BatchJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface BatchJob {
    id: string;
    jobType: 'annotation_generation';
    status: BatchJobStatus;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    errors: BatchJobError[];
    metadata: {
        imageIds: string[];
        concurrency: number;
        rateLimitPerMinute: number;
    };
    startedAt: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface BatchJobError {
    itemId: string;
    error: string;
    timestamp: Date;
    attemptNumber: number;
}
export interface BatchImageResult {
    imageId: string;
    status: 'success' | 'failed' | 'skipped';
    annotationsCreated?: number;
    error?: string;
    processingTime?: number;
}
export interface BatchJobProgress {
    jobId: string;
    status: BatchJobStatus;
    progress: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
        percentage: number;
    };
    currentImage?: string;
    estimatedTimeRemaining?: number;
    errors: BatchJobError[];
}
export interface CreateBatchJobRequest {
    imageIds: string[];
    concurrency?: number;
    rateLimitPerMinute?: number;
}
export interface CreateBatchJobResponse {
    jobId: string;
    status: BatchJobStatus;
    totalItems: number;
    estimatedDuration?: number;
}
export interface RateLimitConfig {
    requestsPerMinute: number;
    burstSize: number;
    tier: 'free' | 'paid';
}
export interface RateLimiterState {
    tokens: number;
    lastRefill: Date;
    requestQueue: Array<{
        id: string;
        enqueueTime: Date;
    }>;
}
//# sourceMappingURL=batch.types.d.ts.map