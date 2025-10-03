# AI Annotations Database Schema

## Overview

The database schema for AI-generated annotations and review workflow consists of several migration files that work together to provide a comprehensive annotation management system.

## Migration Files

### 001_create_users_table.sql
**Status**: ✅ Existing
- Creates base `users` table for authentication
- Includes auto-update trigger for `updated_at` timestamp
- Foundation for reviewer tracking

### 002_create_ai_annotations_table.sql
**Status**: ✅ Existing
- Creates separate tables for AI annotation workflow:
  - `ai_annotations` - Batch job tracking
  - `ai_annotation_items` - Individual AI-generated annotations
  - `ai_annotation_reviews` - Review history and audit trail
- Adds `role` column to users table (user, admin, moderator)

### 003_create_ai_annotations.sql
**Status**: ✅ Created (Alternative Approach)
- Extends existing `annotations` table with AI capabilities
- Creates `ai_annotation_jobs` table for background job tracking
- Adds validation constraints for bounding boxes
- Provides analytics views for monitoring

### 004_create_vision_cache.sql
**Status**: ✅ Created
- Implements vision API response caching
- Reduces API costs through intelligent caching
- Provides LRU eviction and TTL expiration
- Includes cache performance analytics

### 006_batch_jobs.sql
**Status**: ✅ Existing
- Generic batch job tracking system
- Error tracking and retry logic
- Supports multiple job types including annotation generation

## Schema Approaches

### Approach 1: Separate Tables (Files 002 & 006)
**Files**: `002_create_ai_annotations_table.sql`, `006_batch_jobs.sql`

**Pros**:
- Clean separation of AI vs manual annotations
- Easier to query AI-specific data
- Simpler to bulk approve/reject AI annotations
- Better support for batch operations

**Cons**:
- Data duplication when AI annotations are approved
- More complex joins to get complete annotation data
- Need to sync between `ai_annotation_items` and `annotations` tables

**Tables**:
```sql
ai_annotations (job_id, status, confidence_score, ...)
ai_annotation_items (job_id, spanish_term, english_term, bounding_box, ...)
ai_annotation_reviews (job_id, reviewer_id, action, ...)
batch_jobs (job_type, status, total_items, ...)
batch_job_errors (job_id, error_message, ...)
```

### Approach 2: Extended Annotations Table (File 003)
**File**: `003_create_ai_annotations.sql`

**Pros**:
- Single source of truth for all annotations
- No data duplication
- Simpler queries for combined datasets
- Easier to maintain consistency

**Cons**:
- Larger `annotations` table
- More complex filtering logic
- Nullable columns for manual annotations

**Schema Changes**:
```sql
annotations (
  -- Existing columns
  id, image_id, bounding_box, annotation_type, ...

  -- New AI columns
  vision_generated BOOLEAN,
  vision_confidence DECIMAL(5,4),
  vision_provider ai_provider,
  review_status review_status,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  ai_job_id UUID
)

ai_annotation_jobs (
  id, image_id, status, provider,
  request_payload JSONB, response_data JSONB, ...
)
```

## Recommended Approach

### For New Implementation: Use Approach 1 (Separate Tables)
The existing schema with separate tables (`002_create_ai_annotations_table.sql`) is better suited for:

1. **Review Workflow**
   - Batch approval/rejection
   - Track review history
   - Maintain AI annotations separate until approved

2. **Data Integrity**
   - AI annotations don't pollute main annotations table
   - Easy to revert or modify AI suggestions
   - Clear separation of concerns

3. **Performance**
   - Faster queries on production annotations
   - AI review queries don't slow down main application
   - Better indexing strategies

### Migration Strategy

If you want to consolidate to Approach 2 later:

```sql
-- Step 1: Migrate approved AI annotations to main table
INSERT INTO annotations (
  image_id, bounding_box, annotation_type,
  spanish_term, english_term, pronunciation,
  difficulty_level, vision_generated,
  vision_confidence, vision_provider
)
SELECT
  image_id, bounding_box, annotation_type,
  spanish_term, english_term, pronunciation,
  difficulty_level, true,
  confidence, 'openai'
FROM ai_annotation_items
WHERE status = 'approved'
  AND approved_annotation_id IS NULL;

-- Step 2: Update references
UPDATE ai_annotation_items
SET approved_annotation_id = annotations.id
FROM annotations
WHERE ai_annotation_items.image_id = annotations.image_id
  AND ai_annotation_items.spanish_term = annotations.spanish_term;
```

## Vision API Cache (File 004)

The cache is independent and works with both approaches:

### Cache Flow
1. **Before API Call**: Check `vision_api_cache` for existing response
2. **Cache Hit**: Return cached data, update `last_accessed_at`
3. **Cache Miss**: Call API, store response with TTL
4. **Maintenance**: Run cleanup and eviction periodically

### Key Features
- **Deduplication**: SHA-256 hash of image URL + provider
- **TTL Expiration**: Automatic expiry based on `expires_at`
- **LRU Eviction**: Remove least recently used when storage is full
- **Analytics**: Track hit rates, response times, cost savings

### Maintenance Functions
```sql
-- Daily cleanup (remove expired entries)
SELECT cleanup_expired_cache();

-- When storage threshold reached
SELECT evict_lru_cache(10000); -- Keep max 10k entries

-- Get cache statistics
SELECT * FROM cache_stats;
```

## Index Strategy

### AI Annotations Approach (File 002)
```sql
-- Job lookup and status tracking
idx_ai_annotations_job_id (job_id)
idx_ai_annotations_status (status)
idx_ai_annotations_image_id (image_id)

-- Individual items
idx_ai_annotation_items_job_id (job_id)
idx_ai_annotation_items_status (status)

-- Review history
idx_ai_annotation_reviews_job_id (job_id)
idx_ai_annotation_reviews_reviewer_id (reviewer_id)
```

### Extended Annotations Approach (File 003)
```sql
-- AI filtering
idx_annotations_vision_generated (vision_generated)
idx_annotations_review_status (review_status)

-- Composite indexes for common queries
idx_annotations_vision_review (vision_generated, review_status)
idx_annotations_review_status_created (review_status, created_at DESC)
  WHERE vision_generated = true
```

### Vision Cache (File 004)
```sql
-- Primary cache lookup
idx_cache_url_hash_provider (image_url_hash, provider) UNIQUE

-- Maintenance queries
idx_cache_expires_at (expires_at)
idx_cache_last_accessed (last_accessed_at)

-- Active cache entries (partial index)
idx_cache_active (created_at DESC)
  WHERE expires_at > CURRENT_TIMESTAMP
```

## Validation Constraints

### Bounding Box Validation (File 003)
```sql
-- Structure validation
CHECK (
  jsonb_typeof(bounding_box) = 'object' AND
  bounding_box ? 'topLeft' AND
  bounding_box ? 'bottomRight' AND
  bounding_box ? 'width' AND
  bounding_box ? 'height'
)

-- Coordinate validation
CHECK (
  (bounding_box->'topLeft'->>'x')::numeric >= 0 AND
  (bounding_box->'bottomRight'->>'x')::numeric >
    (bounding_box->'topLeft'->>'x')::numeric
)
```

### AI Metadata Validation (File 003)
```sql
-- AI annotations must have confidence and provider
CHECK (
  (vision_generated = true AND vision_confidence IS NOT NULL) OR
  (vision_generated = false)
)

-- Reviewed annotations must have reviewer metadata
CHECK (
  (review_status IN ('approved', 'rejected') AND
   reviewed_by IS NOT NULL AND
   reviewed_at IS NOT NULL) OR
  (review_status = 'pending')
)
```

## Analytics Views

### File 003 Views

**pending_ai_annotations**
- Lists AI annotations awaiting review
- Sorted by confidence (lowest first for quality review)
- Includes image context and job metadata

**ai_job_stats**
- Aggregated statistics per provider and status
- Average job duration for performance monitoring
- Job count and timeline data

**reviewer_stats**
- Per-reviewer metrics (approved/rejected counts)
- Average review time for workload balancing
- Review timeline and activity tracking

### File 004 Views

**cache_stats**
- Real-time cache performance metrics
- Hit potential calculation (reuse rate)
- Storage and response time analytics

**cache_performance_metrics** (Materialized)
- Daily aggregated cache metrics
- Requires periodic refresh for dashboard data

## Automated Triggers

### Timestamp Management
```sql
-- Auto-update updated_at (all tables)
CREATE TRIGGER update_{table}_updated_at
  BEFORE UPDATE ON {table}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set completed_at on job completion
CREATE TRIGGER update_ai_job_completed_at
  BEFORE UPDATE ON ai_annotation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_completed_at();

-- Auto-set reviewed_at on review
CREATE TRIGGER update_annotation_reviewed_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_reviewed_at();
```

## Query Examples

### Get Pending Reviews (Approach 1)
```sql
SELECT
  ai.job_id,
  ai.image_id,
  ai.annotation_data,
  ai.confidence_score,
  COUNT(aii.id) as item_count,
  AVG(aii.confidence) as avg_item_confidence
FROM ai_annotations ai
JOIN ai_annotation_items aii ON ai.job_id = aii.job_id
WHERE ai.status = 'pending'
GROUP BY ai.job_id, ai.image_id, ai.annotation_data, ai.confidence_score
ORDER BY ai.confidence_score ASC;
```

### Get Pending Reviews (Approach 2)
```sql
SELECT * FROM pending_ai_annotations
WHERE vision_confidence < 0.8
LIMIT 10;
```

### Approve AI Annotations (Approach 1)
```sql
-- Update individual items
UPDATE ai_annotation_items
SET status = 'approved'
WHERE job_id = 'job-123'
  AND id IN ('item-1', 'item-2', ...);

-- Copy to main annotations table
INSERT INTO annotations (...)
SELECT ... FROM ai_annotation_items
WHERE status = 'approved' AND approved_annotation_id IS NULL;

-- Record review
INSERT INTO ai_annotation_reviews (job_id, reviewer_id, action, affected_items)
VALUES ('job-123', 'user-456', 'bulk_approve', 5);
```

### Approve AI Annotations (Approach 2)
```sql
UPDATE annotations
SET review_status = 'approved',
    reviewed_by = 'user-456',
    reviewed_at = CURRENT_TIMESTAMP
WHERE id IN ('ann-1', 'ann-2', ...)
  AND vision_generated = true
  AND review_status = 'pending';
```

### Check Cache Before API Call
```sql
SELECT response_data
FROM vision_api_cache
WHERE image_url_hash = encode(sha256('image-url'::bytea), 'hex')
  AND provider = 'openai'
  AND expires_at > CURRENT_TIMESTAMP;
```

## Performance Optimization

### Batch Operations
```sql
-- Bulk approve (Approach 1)
WITH approved_items AS (
  UPDATE ai_annotation_items
  SET status = 'approved'
  WHERE job_id = 'job-123'
  RETURNING *
)
INSERT INTO annotations (...)
SELECT ... FROM approved_items;

-- Bulk approve (Approach 2)
UPDATE annotations
SET review_status = 'approved',
    reviewed_by = 'user-456'
WHERE image_id = 'img-789'
  AND vision_generated = true
  AND review_status = 'pending';
```

### Cache Warming
```sql
-- Pre-populate cache for common images
INSERT INTO vision_api_cache (
  image_url_hash, image_url, provider,
  request_data, response_data, expires_at
) VALUES (
  encode(sha256('image-url'::bytea), 'hex'),
  'image-url',
  'openai',
  '{"model": "gpt-4-vision-preview"}'::jsonb,
  '{...}'::jsonb,
  CURRENT_TIMESTAMP + INTERVAL '7 days'
) ON CONFLICT (image_url_hash, provider)
  DO UPDATE SET
    last_accessed_at = CURRENT_TIMESTAMP,
    access_count = vision_api_cache.access_count + 1;
```

### Maintenance Automation
```sql
-- Using pg_cron (if available)
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT cleanup_expired_cache();'
);

SELECT cron.schedule(
  'evict-lru-cache',
  '0 3 * * *', -- Daily at 3 AM
  'SELECT evict_lru_cache(10000);'
);

SELECT cron.schedule(
  'refresh-cache-metrics',
  '*/30 * * * *', -- Every 30 minutes
  'SELECT refresh_cache_metrics();'
);
```

## Security Considerations

### Row Level Security (Optional)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reviews
CREATE POLICY user_reviews ON ai_annotation_reviews
  FOR SELECT
  USING (reviewer_id = current_user_id());

-- Policy: Only admins can approve annotations
CREATE POLICY admin_approve ON annotations
  FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'moderator')
  );
```

### Data Encryption
```sql
-- Encrypt sensitive request payloads (using pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted payloads
INSERT INTO ai_annotation_jobs (request_payload, ...)
VALUES (
  pgp_sym_encrypt(
    '{"api_key": "secret"}'::text,
    current_setting('app.encryption_key')
  )::jsonb,
  ...
);
```

### Audit Logging
```sql
-- Track who approved/rejected annotations
CREATE TABLE annotation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to log changes
CREATE TRIGGER audit_annotation_changes
  AFTER UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION log_annotation_change();
```

## Migration Plan

### Phase 1: Setup (Current)
1. Run `001_create_users_table.sql` (if not already run)
2. Run `002_create_ai_annotations_table.sql` for AI workflow
3. Run `006_batch_jobs.sql` for batch processing
4. Run `004_create_vision_cache.sql` for API caching

### Phase 2: Testing
1. Test AI annotation generation workflow
2. Verify cache hit/miss rates
3. Test batch approval/rejection
4. Monitor performance metrics

### Phase 3: Optimization
1. Analyze query performance
2. Add additional indexes based on usage patterns
3. Tune cache eviction policies
4. Optimize batch processing

### Phase 4: Optional Migration to Approach 2
1. Create migration script to consolidate tables
2. Copy approved annotations to main table
3. Update application code
4. Drop old AI-specific tables

## Maintenance Checklist

### Daily
- [ ] Run `cleanup_expired_cache()` to remove expired cache entries
- [ ] Monitor `ai_job_stats` for failed jobs
- [ ] Check `ai_annotations` queue depth for pending reviews

### Weekly
- [ ] Review reviewer statistics for workload balancing
- [ ] Analyze cache hit rates and adjust TTL if needed
- [ ] Check for stuck jobs (processing > 1 hour)
- [ ] Review batch job error patterns

### Monthly
- [ ] Refresh `cache_performance_metrics` for trend analysis
- [ ] Review index usage and optimize
- [ ] Analyze provider performance and costs
- [ ] Archive old AI annotations if needed

## Troubleshooting

### Common Issues

**Q: AI annotations not appearing in review queue**
```sql
-- Check job status
SELECT * FROM ai_annotations WHERE status = 'pending';
SELECT * FROM batch_jobs WHERE status = 'processing';

-- Check for errors
SELECT * FROM batch_job_errors ORDER BY created_at DESC LIMIT 10;
```

**Q: Cache not being used**
```sql
-- Verify cache entries
SELECT * FROM cache_stats;

-- Check for expired entries
SELECT COUNT(*) FROM vision_api_cache
WHERE expires_at < CURRENT_TIMESTAMP;

-- Test cache lookup
SELECT * FROM vision_api_cache
WHERE image_url_hash = encode(sha256('test-url'::bytea), 'hex');
```

**Q: Review workflow stuck**
```sql
-- Find pending reviews
SELECT
  ai.job_id,
  ai.created_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ai.created_at))/3600 as hours_pending
FROM ai_annotations ai
WHERE ai.status = 'pending'
ORDER BY ai.created_at ASC;

-- Check reviewer activity
SELECT * FROM reviewer_stats
ORDER BY total_reviews DESC;
```

## Related Documentation

- `/backend/src/database/migrations/README.md` - Migration file documentation
- `/shared/types/annotation.types.ts` - TypeScript interfaces
- `/backend/src/routes/annotations.ts` - API endpoints
- `/backend/src/services/visionService.ts` - AI annotation generation (to be created)

## Next Steps

1. **Create Vision Service**: Implement API integration for OpenAI/Google/Anthropic
2. **Build Review UI**: Admin interface for reviewing AI annotations
3. **Implement Batch Processing**: Queue system for generating annotations
4. **Add Monitoring**: Dashboards for cache performance and review metrics
5. **Cost Tracking**: Monitor API usage and optimize cache strategy
