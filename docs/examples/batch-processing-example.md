# Batch Processing System - Usage Examples

## Quick Start

### 1. Basic Batch Processing

Process a small batch of 10 images with default settings:

```typescript
// Client-side TypeScript
import { CreateBatchJobRequest } from '@/types/batch.types';

async function processBatch(imageIds: string[]) {
  const request: CreateBatchJobRequest = {
    imageIds,
    concurrency: 5  // Default
  };

  const response = await fetch('/api/batch/annotations/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const { jobId } = await response.json();
  console.log(`Batch job started: ${jobId}`);

  return jobId;
}

// Usage
const imageIds = [
  '123e4567-e89b-12d3-a456-426614174001',
  '123e4567-e89b-12d3-a456-426614174002',
  // ... more image IDs
];

const jobId = await processBatch(imageIds);
```

### 2. Monitor Progress with Polling

```typescript
async function monitorBatchJob(jobId: string) {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/batch/annotations/${jobId}/status`);
    const progress = await response.json();

    console.log(`Progress: ${progress.progress.percentage}%`);
    console.log(`Processed: ${progress.progress.processed}/${progress.progress.total}`);
    console.log(`Successful: ${progress.progress.successful}, Failed: ${progress.progress.failed}`);

    if (progress.status === 'completed') {
      clearInterval(pollInterval);
      console.log('✅ Batch processing complete!');
      console.log(`Final stats: ${progress.progress.successful} successful, ${progress.progress.failed} failed`);

      if (progress.errors.length > 0) {
        console.warn('Errors encountered:');
        progress.errors.forEach(err => {
          console.warn(`  - Image ${err.itemId}: ${err.error}`);
        });
      }
    } else if (progress.status === 'failed' || progress.status === 'cancelled') {
      clearInterval(pollInterval);
      console.error(`❌ Batch job ${progress.status}`);
    }
  }, 2000); // Poll every 2 seconds
}

// Usage
await monitorBatchJob(jobId);
```

### 3. React Hook for Batch Processing

```typescript
// useBatchProcessor.ts
import { useState, useEffect } from 'react';
import { BatchJobProgress } from '@/types/batch.types';

export function useBatchProcessor(jobId: string | null) {
  const [progress, setProgress] = useState<BatchJobProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch/annotations/${jobId}/status`);
        const data = await response.json();
        setProgress(data);

        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          setIsPolling(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to fetch batch progress:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return { progress, isPolling };
}

// Usage in component
function BatchProcessingComponent() {
  const [jobId, setJobId] = useState<string | null>(null);
  const { progress, isPolling } = useBatchProcessor(jobId);

  const startBatch = async (imageIds: string[]) => {
    const response = await fetch('/api/batch/annotations/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds })
    });
    const { jobId } = await response.json();
    setJobId(jobId);
  };

  return (
    <div>
      {isPolling && progress && (
        <div>
          <h3>Processing: {progress.progress.percentage}%</h3>
          <progress value={progress.progress.processed} max={progress.progress.total} />
          <p>
            {progress.progress.successful} successful,
            {progress.progress.failed} failed
          </p>
        </div>
      )}
    </div>
  );
}
```

## Advanced Examples

### 4. High-Volume Processing

Process 1000 images with maximum performance:

```typescript
async function processLargeBatch(imageIds: string[]) {
  // Split into chunks of 100 for better management
  const chunkSize = 100;
  const chunks = [];

  for (let i = 0; i < imageIds.length; i += chunkSize) {
    chunks.push(imageIds.slice(i, i + chunkSize));
  }

  const jobIds = [];

  for (const chunk of chunks) {
    const response = await fetch('/api/batch/annotations/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageIds: chunk,
        concurrency: 10, // Max concurrency for paid tier
        rateLimitPerMinute: 500
      })
    });

    const { jobId } = await response.json();
    jobIds.push(jobId);

    // Wait a bit between starting jobs to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return jobIds;
}

// Monitor multiple jobs
async function monitorMultipleJobs(jobIds: string[]) {
  const results = await Promise.all(
    jobIds.map(async (jobId) => {
      // Poll until complete
      while (true) {
        const response = await fetch(`/api/batch/annotations/${jobId}/status`);
        const progress = await response.json();

        if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
          return progress;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    })
  );

  const totalSuccessful = results.reduce((sum, r) => sum + r.progress.successful, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.progress.failed, 0);

  console.log(`All jobs complete: ${totalSuccessful} successful, ${totalFailed} failed`);
  return results;
}
```

### 5. Error Recovery and Retry

Automatically retry failed images:

```typescript
async function processBatchWithRetry(imageIds: string[], maxRetries = 2) {
  let attempt = 0;
  let failedImages: string[] = [];

  while (attempt <= maxRetries) {
    const imagesToProcess = attempt === 0 ? imageIds : failedImages;

    if (imagesToProcess.length === 0) break;

    console.log(`Attempt ${attempt + 1}: Processing ${imagesToProcess.length} images`);

    // Start batch
    const startResponse = await fetch('/api/batch/annotations/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds: imagesToProcess })
    });

    const { jobId } = await startResponse.json();

    // Wait for completion
    let progress;
    while (true) {
      const statusResponse = await fetch(`/api/batch/annotations/${jobId}/status`);
      progress = await statusResponse.json();

      if (['completed', 'failed'].includes(progress.status)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Collect failed images
    failedImages = progress.errors.map((e: any) => e.itemId);

    console.log(`Attempt ${attempt + 1} complete: ${progress.progress.successful} successful, ${failedImages.length} failed`);

    if (failedImages.length === 0) {
      console.log('✅ All images processed successfully!');
      break;
    }

    attempt++;
  }

  if (failedImages.length > 0) {
    console.warn(`⚠️ ${failedImages.length} images failed after ${maxRetries + 1} attempts`);
    return { success: false, failedImages };
  }

  return { success: true, failedImages: [] };
}
```

### 6. Cancel Long-Running Jobs

```typescript
async function cancelBatchJob(jobId: string) {
  const response = await fetch(`/api/batch/annotations/${jobId}/cancel`, {
    method: 'POST'
  });

  const result = await response.json();
  console.log(result.message);
}

// Cancel with confirmation
async function cancelBatchWithConfirmation(jobId: string) {
  const statusResponse = await fetch(`/api/batch/annotations/${jobId}/status`);
  const progress = await statusResponse.json();

  const confirmed = confirm(
    `Cancel batch job?\n` +
    `Processed: ${progress.progress.processed}/${progress.progress.total}\n` +
    `Progress will be lost.`
  );

  if (confirmed) {
    await cancelBatchJob(jobId);
  }
}
```

### 7. Real-time UI Updates

```typescript
// BatchProgressDisplay.tsx
import React from 'react';
import { BatchJobProgress } from '@/types/batch.types';

interface Props {
  progress: BatchJobProgress;
}

export function BatchProgressDisplay({ progress }: Props) {
  const { status, progress: stats, errors, estimatedTimeRemaining } = progress;

  return (
    <div className="batch-progress">
      <div className="status-header">
        <h3>Batch Processing</h3>
        <span className={`status-badge ${status}`}>{status}</span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${stats.percentage}%` }}
        />
      </div>

      <div className="stats-grid">
        <div className="stat">
          <label>Total</label>
          <value>{stats.total}</value>
        </div>
        <div className="stat">
          <label>Processed</label>
          <value>{stats.processed}</value>
        </div>
        <div className="stat success">
          <label>Successful</label>
          <value>{stats.successful}</value>
        </div>
        <div className="stat failed">
          <label>Failed</label>
          <value>{stats.failed}</value>
        </div>
      </div>

      {estimatedTimeRemaining && (
        <div className="eta">
          Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 1000)}s
        </div>
      )}

      {errors.length > 0 && (
        <details className="errors-section">
          <summary>Errors ({errors.length})</summary>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>
                <strong>Image {error.itemId}:</strong> {error.error}
                <span className="attempt-count">Attempt {error.attemptNumber}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
```

### 8. Admin Dashboard

```typescript
// AdminBatchDashboard.tsx
import React, { useState, useEffect } from 'react';
import { BatchJob } from '@/types/batch.types';

export function AdminBatchDashboard() {
  const [activeJobs, setActiveJobs] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch active jobs
      const jobsResponse = await fetch('/api/batch/annotations/active');
      const jobsData = await jobsResponse.json();
      setActiveJobs(jobsData.jobs);

      // Fetch stats
      const statsResponse = await fetch('/api/batch/annotations/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  const cancelJob = async (jobId: string) => {
    await fetch(`/api/batch/annotations/${jobId}/cancel`, {
      method: 'POST'
    });
  };

  return (
    <div className="admin-dashboard">
      <h2>Batch Processing Dashboard</h2>

      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <h3>Active Jobs</h3>
            <p className="stat-value">{stats.activeJobs}</p>
          </div>
          <div className="stat-card">
            <h3>Total Processing</h3>
            <p className="stat-value">{stats.totalProcessing}</p>
          </div>
          <div className="stat-card">
            <h3>Total Successful</h3>
            <p className="stat-value">{stats.totalSuccessful}</p>
          </div>
          <div className="stat-card">
            <h3>Total Failed</h3>
            <p className="stat-value">{stats.totalFailed}</p>
          </div>
        </div>
      )}

      <div className="jobs-table">
        <h3>Active Jobs</h3>
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeJobs.map(job => (
              <tr key={job.id}>
                <td>{job.id.slice(0, 8)}...</td>
                <td>
                  <span className={`status-badge ${job.status}`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  {job.processedItems}/{job.totalItems}
                  ({Math.round((job.processedItems / job.totalItems) * 100)}%)
                </td>
                <td>{new Date(job.startedAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => cancelJob(job.id)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Testing Examples

### 9. Unit Test Example

```typescript
// batchProcessor.test.ts
import { BatchProcessor } from '../services/batchProcessor';
import { createRateLimiter } from '../services/rateLimiter';

describe('BatchProcessor', () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    processor = new BatchProcessor('free');
  });

  afterEach(() => {
    processor.destroy();
  });

  it('should start a batch job', async () => {
    const imageIds = ['img1', 'img2', 'img3'];
    const jobId = await processor.startBatch(imageIds, 2);

    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
  });

  it('should track job progress', async () => {
    const imageIds = ['img1', 'img2'];
    const jobId = await processor.startBatch(imageIds, 1);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    const progress = await processor.getJobProgress(jobId);

    expect(progress).toBeDefined();
    expect(progress?.progress.total).toBe(2);
    expect(progress?.status).toMatch(/pending|processing|completed/);
  });

  it('should cancel a running job', async () => {
    const imageIds = Array.from({ length: 100 }, (_, i) => `img${i}`);
    const jobId = await processor.startBatch(imageIds, 5);

    // Cancel immediately
    const cancelled = await processor.cancelJob(jobId);

    expect(cancelled).toBe(true);

    const progress = await processor.getJobProgress(jobId);
    expect(progress?.status).toBe('cancelled');
  });
});
```

### 10. Integration Test Example

```typescript
// batch.integration.test.ts
import request from 'supertest';
import app from '../index';

describe('Batch API Integration Tests', () => {
  let jobId: string;

  it('should start a batch job via API', async () => {
    const response = await request(app)
      .post('/api/batch/annotations/start')
      .send({
        imageIds: ['uuid1', 'uuid2', 'uuid3'],
        concurrency: 2
      });

    expect(response.status).toBe(201);
    expect(response.body.jobId).toBeDefined();

    jobId = response.body.jobId;
  });

  it('should get job status via API', async () => {
    const response = await request(app)
      .get(`/api/batch/annotations/${jobId}/status`);

    expect(response.status).toBe(200);
    expect(response.body.progress).toBeDefined();
    expect(response.body.progress.total).toBe(3);
  });

  it('should list active jobs via API', async () => {
    const response = await request(app)
      .get('/api/batch/annotations/active');

    expect(response.status).toBe(200);
    expect(response.body.jobs).toBeDefined();
    expect(Array.isArray(response.body.jobs)).toBe(true);
  });

  it('should cancel a job via API', async () => {
    const response = await request(app)
      .post(`/api/batch/annotations/${jobId}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('cancelled');
  });
});
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
async function safeBatchProcessing(imageIds: string[]) {
  try {
    const jobId = await processBatch(imageIds);
    const result = await monitorBatchJob(jobId);
    return { success: true, result };
  } catch (error) {
    console.error('Batch processing failed:', error);
    return { success: false, error };
  }
}
```

### 2. Rate Limit Awareness

Check tier limits before starting large batches:

```typescript
function calculateBatchDuration(imageCount: number, tier: 'free' | 'paid') {
  const rateLimit = tier === 'paid' ? 500 : 10;
  const concurrency = tier === 'paid' ? 10 : 2;

  const estimatedMinutes = Math.ceil(imageCount / rateLimit);

  console.log(`Estimated duration for ${imageCount} images:`);
  console.log(`  - ${estimatedMinutes} minutes`);
  console.log(`  - Using ${tier} tier (${rateLimit} req/min)`);

  return estimatedMinutes;
}
```

### 3. Progress Notifications

Notify users at key milestones:

```typescript
async function processBatchWithNotifications(imageIds: string[]) {
  const jobId = await processBatch(imageIds);

  const interval = setInterval(async () => {
    const progress = await getJobProgress(jobId);

    // Notify at 25%, 50%, 75%, 100%
    const milestones = [25, 50, 75, 100];
    const percentage = progress.progress.percentage;

    if (milestones.includes(percentage)) {
      notifyUser(`Batch processing ${percentage}% complete`);
    }

    if (['completed', 'failed'].includes(progress.status)) {
      clearInterval(interval);
      notifyUser(`Batch processing ${progress.status}`);
    }
  }, 2000);
}
```

## Troubleshooting

### Common Issues

**Issue 1: Jobs stuck in "processing"**

```typescript
// Check job status
const response = await fetch(`/api/batch/annotations/${jobId}/status`);
const progress = await response.json();

if (progress.status === 'processing') {
  const elapsedTime = Date.now() - new Date(progress.startedAt).getTime();

  if (elapsedTime > 3600000) { // 1 hour
    console.warn('Job may be stuck, consider cancelling and restarting');
    await cancelBatchJob(jobId);
  }
}
```

**Issue 2: High failure rate**

```typescript
// Analyze errors
const progress = await getJobProgress(jobId);
const errorTypes = progress.errors.reduce((acc, err) => {
  acc[err.error] = (acc[err.error] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Error distribution:', errorTypes);
// Example output: { "Vision AI timeout": 5, "Invalid image": 2 }
```

This comprehensive guide should help you implement and use the batch processing system effectively!
