# Batch Processing System for AI Annotation Generation

## Overview

The batch processing system enables efficient generation of AI-powered annotations for multiple images at once. It handles concurrency control, rate limiting, progress tracking, and error recovery.

## Architecture

### Components

1. **BatchProcessor Service** (`backend/src/services/batchProcessor.ts`)
   - Manages batch job lifecycle
   - Implements concurrency control
   - Handles retry logic with exponential backoff
   - Tracks progress and errors

2. **RateLimiter Service** (`backend/src/services/rateLimiter.ts`)
   - Token bucket algorithm implementation
   - Configurable rate limits (500 req/min paid, 10 req/min free)
   - Prevents API throttling
   - Automatic token refill

3. **Batch Routes** (`backend/src/routes/batch.ts`)
   - REST API endpoints for batch operations
   - Request validation with Zod
   - Job management (start, cancel, status)

4. **Database Schema** (`backend/src/database/migrations/006_batch_jobs.sql`)
   - `batch_jobs` table - Job metadata and progress
   - `batch_job_errors` table - Error tracking with retry counts

### Data Flow

```
Client Request
    ↓
Batch API Endpoint
    ↓
BatchProcessor.startBatch()
    ↓
Create Job Record (DB)
    ↓
Process Images (Async)
    ↓
┌─────────────────────────┐
│  For Each Image Batch   │
│  (Concurrent)           │
├─────────────────────────┤
│ 1. Wait for Rate Token  │
│ 2. Call Vision AI       │
│ 3. Handle Success/Error │
│ 4. Update Progress      │
│ 5. Retry on Failure     │
└─────────────────────────┘
    ↓
Update Job Status (DB)
    ↓
Return Results
```

## API Endpoints

### 1. Start Batch Job

**POST** `/api/batch/annotations/start`

Start a new batch annotation generation job.

**Request Body:**
```json
{
  "imageIds": ["uuid1", "uuid2", "uuid3"],
  "concurrency": 5,
  "rateLimitPerMinute": 500
}
```

**Response:**
```json
{
  "jobId": "job-uuid",
  "status": "pending",
  "totalItems": 3,
  "estimatedDuration": 6000,
  "message": "Batch job started successfully"
}
```

**Parameters:**
- `imageIds` (required): Array of image UUIDs (1-1000 images)
- `concurrency` (optional): Number of parallel requests (1-10, default: 5)
- `rateLimitPerMinute` (optional): Custom rate limit (10-500, default: tier-based)

### 2. Get Job Status

**GET** `/api/batch/annotations/:jobId/status`

Get the current status and progress of a batch job.

**Response:**
```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "progress": {
    "total": 100,
    "processed": 45,
    "successful": 42,
    "failed": 3,
    "percentage": 45
  },
  "currentImage": "image-uuid",
  "estimatedTimeRemaining": 15000,
  "errors": [
    {
      "itemId": "image-uuid",
      "error": "Vision AI timeout",
      "timestamp": "2025-10-02T10:30:00Z",
      "attemptNumber": 2
    }
  ]
}
```

### 3. Cancel Job

**POST** `/api/batch/annotations/:jobId/cancel`

Cancel a running batch job.

**Response:**
```json
{
  "message": "Job cancelled successfully",
  "jobId": "job-uuid"
}
```

### 4. List Active Jobs

**GET** `/api/batch/annotations/active`

List all currently active batch jobs.

**Response:**
```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "jobType": "annotation_generation",
      "status": "processing",
      "totalItems": 100,
      "processedItems": 45,
      "successfulItems": 42,
      "failedItems": 3,
      "startedAt": "2025-10-02T10:00:00Z",
      "metadata": {
        "imageIds": ["..."],
        "concurrency": 5
      }
    }
  ],
  "count": 1
}
```

### 5. Get Statistics

**GET** `/api/batch/annotations/stats`

Get aggregate statistics for batch processing.

**Response:**
```json
{
  "activeJobs": 2,
  "totalProcessing": 150,
  "totalSuccessful": 120,
  "totalFailed": 8
}
```

## Rate Limiting Strategy

### Token Bucket Algorithm

The system implements a token bucket algorithm for smooth rate limiting:

1. **Bucket Capacity**: Maximum burst size
   - Paid tier: 50 tokens
   - Free tier: 5 tokens

2. **Refill Rate**: Tokens added per minute
   - Paid tier: 500 tokens/minute (8.3/second)
   - Free tier: 10 tokens/minute (0.16/second)

3. **Token Consumption**: Each API request consumes 1 token

### Benefits

- **Burst Handling**: Allows short bursts of requests
- **Smooth Distribution**: Prevents API throttling
- **Fair Queuing**: Processes requests in order when limited
- **Adaptive**: Automatically adjusts to API availability

### Configuration

```typescript
// In BatchProcessor constructor
const rateLimiter = createRateLimiter('paid'); // or 'free'

// Custom configuration
const customLimiter = new RateLimiter({
  requestsPerMinute: 500,
  burstSize: 50,
  tier: 'paid'
});
```

## Error Handling & Retry Logic

### Retry Strategy

1. **Automatic Retry**: Failed requests automatically retry up to 3 times
2. **Exponential Backoff**: Wait time doubles after each failure
   - Attempt 1: Immediate
   - Attempt 2: Wait 2 seconds
   - Attempt 3: Wait 4 seconds
   - Attempt 4: Wait 8 seconds

3. **Error Recording**: All errors logged with context
   - Image ID
   - Error message
   - Attempt number
   - Timestamp

### Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Vision AI timeout | Retry with backoff |
| Rate limit exceeded | Wait for token, then retry |
| Invalid image | Skip after 3 attempts, continue batch |
| Network error | Retry with backoff |
| Job cancelled | Stop immediately, no retries |

### Error Recovery

```typescript
// Example error in batch_job_errors table
{
  "jobId": "job-uuid",
  "itemId": "image-uuid",
  "error": "Vision AI error: timeout",
  "attemptNumber": 2,
  "timestamp": "2025-10-02T10:30:00Z"
}
```

## Progress Tracking

### Real-time Updates

The system tracks and updates progress continuously:

1. **Job Creation**: Record initial state
2. **Processing**: Update after each image
3. **Completion**: Final status and statistics

### Progress Metrics

- **Total Items**: Number of images to process
- **Processed Items**: Images completed (success or failure)
- **Successful Items**: Successfully generated annotations
- **Failed Items**: Failed after all retry attempts
- **Percentage**: (Processed / Total) × 100
- **Estimated Time**: Based on average processing time

### Example Progress Flow

```
Initial State:
  total: 100, processed: 0, successful: 0, failed: 0

After 10 Images:
  total: 100, processed: 10, successful: 9, failed: 1, percentage: 10%

After 50 Images:
  total: 100, processed: 50, successful: 47, failed: 3, percentage: 50%

Completed:
  total: 100, processed: 100, successful: 95, failed: 5, percentage: 100%
```

## Database Schema

### batch_jobs Table

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY,
  job_type VARCHAR(50) DEFAULT 'annotation_generation',
  status VARCHAR(20) DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  metadata JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status Values:**
- `pending`: Job created, not yet started
- `processing`: Currently processing images
- `completed`: All images processed successfully
- `failed`: Job failed catastrophically
- `cancelled`: User cancelled the job

### batch_job_errors Table

```sql
CREATE TABLE batch_job_errors (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES batch_jobs(id),
  item_id VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Basic Batch Processing

```typescript
// Client-side example
const response = await fetch('/api/batch/annotations/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageIds: ['id1', 'id2', 'id3'],
    concurrency: 5
  })
});

const { jobId } = await response.json();

// Poll for progress
const interval = setInterval(async () => {
  const status = await fetch(`/api/batch/annotations/${jobId}/status`);
  const progress = await status.json();

  console.log(`Progress: ${progress.progress.percentage}%`);

  if (progress.status === 'completed') {
    clearInterval(interval);
    console.log('Batch completed!');
  }
}, 2000);
```

### Advanced Configuration

```typescript
// High-volume processing with custom rate limit
const response = await fetch('/api/batch/annotations/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageIds: largeImageArray, // 1000 images
    concurrency: 10, // Maximum parallelism
    rateLimitPerMinute: 500 // Paid tier limit
  })
});
```

### Monitoring and Cancellation

```typescript
// Monitor active jobs
const activeJobs = await fetch('/api/batch/annotations/active');
const { jobs } = await activeJobs.json();

// Cancel a job if needed
if (jobs.length > 0) {
  await fetch(`/api/batch/annotations/${jobs[0].id}/cancel`, {
    method: 'POST'
  });
}
```

## Performance Considerations

### Concurrency Tuning

| Concurrency | Use Case | Pros | Cons |
|-------------|----------|------|------|
| 1-2 | Free tier, testing | Conservative, safe | Slow |
| 3-5 | Default, balanced | Good throughput | Moderate resource use |
| 6-10 | Paid tier, high-volume | Fast processing | Higher API costs |

### Rate Limit Optimization

**Paid Tier (500 req/min):**
- Recommended concurrency: 5-8
- Expected throughput: ~8 images/second
- 1000 images: ~2 minutes

**Free Tier (10 req/min):**
- Recommended concurrency: 1-2
- Expected throughput: ~0.16 images/second
- 1000 images: ~100 minutes

### Memory Management

- In-memory job tracking (limited to active jobs)
- Automatic cleanup after completion
- Database persistence for historical data

## Integration with Vision AI

The batch processor is designed to integrate with Vision AI services. To add actual AI annotation generation:

```typescript
// In batchProcessor.ts, replace simulateVisionAICall()
private async callVisionAI(imageId: string): Promise<Annotation[]> {
  const image = await getImageById(imageId);

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Generate anatomical annotations for this bird image..."
          },
          {
            type: "image_url",
            image_url: { url: image.url }
          }
        ]
      }
    ]
  });

  return parseAnnotationsFromResponse(response);
}
```

## Monitoring & Observability

### Logging

The system logs important events:

```typescript
info('Batch job started', { jobId, imageCount, concurrency });
info('Image processed successfully', { imageId, attempt });
warn('Image processing failed', { imageId, attempt, error });
error('Batch processing error', err);
```

### Metrics to Track

- Average processing time per image
- Success/failure rates
- Rate limiter token utilization
- Concurrent job count
- API error rates

## Future Enhancements

1. **Email Notifications**: Send email when batch completes
2. **Webhook Support**: POST results to custom endpoint
3. **Priority Queues**: Process high-priority images first
4. **Scheduled Batches**: Cron-like batch scheduling
5. **Result Export**: Download batch results as CSV/JSON
6. **Cost Estimation**: Calculate API costs before starting
7. **Partial Resume**: Resume failed batches from checkpoint

## Troubleshooting

### Job Stuck in "processing"

**Cause**: Server restart or crash during processing

**Solution**:
```sql
UPDATE batch_jobs
SET status = 'failed',
    completed_at = CURRENT_TIMESTAMP
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '1 hour';
```

### High Failure Rate

**Cause**: Vision AI service issues or invalid images

**Solution**: Check `batch_job_errors` table for patterns

```sql
SELECT error_message, COUNT(*)
FROM batch_job_errors
GROUP BY error_message
ORDER BY COUNT(*) DESC;
```

### Rate Limit Exceeded

**Cause**: Multiple concurrent batches exceeding tier limit

**Solution**:
- Reduce concurrency
- Stagger batch starts
- Upgrade to paid tier

## Security Considerations

1. **Input Validation**: All requests validated with Zod schemas
2. **UUID Validation**: Only valid image UUIDs accepted
3. **Rate Limiting**: Per-IP rate limiting on batch endpoints
4. **Resource Limits**: Maximum 1000 images per batch
5. **Timeout Protection**: Jobs timeout after reasonable period

## References

- Token Bucket Algorithm: [Wikipedia](https://en.wikipedia.org/wiki/Token_bucket)
- OpenAI Rate Limits: [OpenAI Docs](https://platform.openai.com/docs/guides/rate-limits)
- Exponential Backoff: [AWS Best Practices](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
