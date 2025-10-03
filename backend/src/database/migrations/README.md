# Database Migrations

## Overview

This directory contains database migration files for the Aves application. Migrations are numbered sequentially and should be run in order.

## Migration Files

### 001_create_users_table.sql
- Creates `users` table for authentication
- Adds email index for faster lookups
- Creates `update_updated_at_column()` trigger function

### 008_add_user_roles.sql
- Adds `role` column to `users` table (user, admin, moderator)
- Creates role validation constraint
- Adds index for role-based queries
- Provides `change_user_role()` function for safe role changes
- Provides `has_permission()` function for access control
- Creates `user_roles_summary` view for role statistics

### 003_create_ai_annotations.sql
- Creates `ai_annotation_jobs` table for tracking AI annotation generation jobs
- Adds AI-related columns to `annotations` table:
  - `vision_generated` - Boolean flag for AI-generated annotations
  - `vision_confidence` - Confidence score (0-1) from vision API
  - `vision_provider` - Which AI provider was used (openai, google, anthropic)
  - `review_status` - Review workflow status (pending, approved, rejected)
  - `reviewed_by` - User who reviewed the annotation
  - `reviewed_at` - Timestamp of review
  - `ai_job_id` - Reference to the AI job that generated it
- Creates enum types: `ai_job_status`, `ai_provider`, `review_status`
- Adds validation constraints for bounding boxes
- Creates indexes for performance optimization
- Creates triggers for automatic timestamp updates
- Creates views for analytics and monitoring

### 004_create_vision_cache.sql
- Creates `vision_api_cache` table for caching vision API responses
- Implements cache expiration and LRU eviction strategies
- Provides functions for cache management:
  - `cleanup_expired_cache()` - Remove expired entries
  - `evict_lru_cache(max_entries)` - Evict least recently used entries
  - `get_cache_stats()` - Get cache statistics
- Creates views and materialized views for monitoring
- Optimizes cache lookups with unique constraint on URL hash + provider

### 009_optimize_cache_indexes.sql (NEW - Performance Optimization)
- Adds 7 performance-critical indexes for 10-100x speedup
- Exercise cache lookup index (composite: user_id, exercise_type, difficulty_level, topic, expires_at)
- Exercise cache expiration index (for cleanup jobs)
- AI annotation image lookup index (image_id, confidence)
- AI annotation status index (for review workflow)
- Batch job status index (for admin monitoring)
- Batch job type index (composite: job_type, status, created_at)
- Batch job errors lookup index (job_id, created_at)
- Includes ANALYZE statements to update query planner statistics

## Running Migrations

Migrations should be run in numerical order:

```bash
# Run all migrations in order
psql -U username -d database_name -f 001_create_users_table.sql
psql -U username -d database_name -f 008_add_user_roles.sql
psql -U username -d database_name -f 003_create_ai_annotations.sql
psql -U username -d database_name -f 004_create_vision_cache.sql
psql -U username -d database_name -f 006_batch_jobs.sql
psql -U username -d database_name -f 007_exercise_cache.sql
psql -U username -d database_name -f 009_optimize_cache_indexes.sql
```

Or use your preferred migration tool (e.g., node-pg-migrate, Flyway, Liquibase).

## Schema Design Decisions

### AI Annotation Jobs Table

**Purpose**: Track background jobs for AI vision API processing.

**Key Design Decisions**:
- Uses JSONB for flexible storage of request/response payloads
- Supports multiple AI providers (OpenAI, Google, Anthropic)
- Tracks job lifecycle: pending → processing → completed/failed
- Auto-sets `completed_at` timestamp via trigger
- Cascades on image deletion to prevent orphaned jobs

**Indexes**:
- `idx_ai_jobs_image_id` - Find all jobs for an image
- `idx_ai_jobs_status` - Query jobs by status (pending, processing, etc.)
- `idx_ai_jobs_status_created` - Composite for finding oldest pending jobs
- `idx_ai_jobs_provider` - Provider-specific queries and statistics

### Annotations Table Extensions

**New Columns**:
- `vision_generated` (BOOLEAN) - Distinguishes AI vs manual annotations
- `vision_confidence` (DECIMAL 0-1) - AI confidence score for quality filtering
- `vision_provider` (ENUM) - Track which AI generated the annotation
- `review_status` (ENUM) - Workflow state: pending → approved/rejected
- `reviewed_by` (UUID) - Auditing and workload tracking
- `reviewed_at` (TIMESTAMP) - Review timeline metrics
- `ai_job_id` (UUID) - Link back to generation job for debugging

**Validation Constraints**:
- `check_vision_confidence` - AI annotations must have confidence score
- `check_vision_provider` - AI annotations must have provider set
- `check_review_metadata` - Reviewed annotations must have reviewer + timestamp
- `check_bounding_box_structure` - Validates JSON structure (topLeft, bottomRight, width, height)
- `check_bounding_box_coords` - Ensures valid coordinate ranges and relationships

**Indexes**:
- `idx_annotations_vision_generated` - Filter AI vs manual annotations
- `idx_annotations_review_status` - Find pending reviews
- `idx_annotations_vision_review` - Composite for pending AI annotations
- `idx_annotations_review_status_created` - Reviewer queue (oldest first)
- `idx_annotations_reviewed_by` - Reviewer workload queries
- `idx_annotations_ai_job_id` - Job-to-annotations relationship

### Vision API Cache

**Purpose**: Reduce API costs and improve response times by caching vision API results.

**Key Design Decisions**:
- Uses SHA-256 hash of image URL for deduplication
- Supports TTL-based expiration
- Tracks access patterns for LRU eviction
- Stores response metadata (size, time) for analytics
- Unique constraint on (url_hash, provider) prevents duplicates

**Cache Strategy**:
1. **Lookup**: Check cache by URL hash + provider
2. **Hit**: Return cached response, update access stats
3. **Miss**: Call API, cache response with TTL
4. **Eviction**: Automatic (expired) or manual (LRU when full)

**Indexes**:
- `idx_cache_url_hash_provider` (UNIQUE) - Primary cache lookup
- `idx_cache_expires_at` - Cleanup expired entries
- `idx_cache_last_accessed` - LRU eviction queries
- `idx_cache_lookup` - Composite for valid cache entries
- `idx_cache_active` - Partial index for active entries only

**Maintenance Functions**:
- `cleanup_expired_cache()` - Should be run daily via cron
- `evict_lru_cache(max_entries)` - Call when storage threshold reached
- `refresh_cache_metrics()` - Update materialized view for dashboards

## Views and Analytics

### Monitoring Views

1. **pending_ai_annotations**
   - Lists AI annotations awaiting review
   - Sorted by confidence (lowest first) for quality review
   - Includes image context and job metadata

2. **ai_job_stats**
   - Aggregated statistics per provider and status
   - Average job duration for performance monitoring
   - Job count and timeline data

3. **reviewer_stats**
   - Per-reviewer metrics (approved/rejected counts)
   - Average review time for workload balancing
   - Review timeline and activity tracking

4. **cache_stats**
   - Real-time cache performance metrics
   - Hit potential calculation (reuse rate)
   - Storage and response time analytics

5. **cache_performance_metrics** (Materialized)
   - Daily aggregated cache metrics
   - Requires periodic refresh for up-to-date data
   - Optimized for dashboard queries

### Query Examples

```sql
-- Find pending AI annotations with low confidence
SELECT * FROM pending_ai_annotations
WHERE vision_confidence < 0.8
LIMIT 10;

-- Get cache hit rate by provider
SELECT
  provider,
  cache_hit_potential as hit_rate_percent
FROM cache_stats;

-- Find most productive reviewers
SELECT * FROM reviewer_stats
ORDER BY total_reviews DESC
LIMIT 10;

-- Check for stale pending jobs
SELECT * FROM ai_annotation_jobs
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '1 hour';
```

## Performance Considerations

### Bounding Box Validation
- Constraints validate JSON structure but add overhead
- Consider disabling constraints in development for faster imports
- Re-enable before production deployment

### Cache Size Management
- Default LRU eviction at 10,000 entries (adjust as needed)
- Monitor `cache_stats.total_size_mb` for storage usage
- Schedule cleanup jobs during low-traffic periods

### Index Maintenance
- Composite indexes improve specific query patterns
- Monitor query performance with EXPLAIN ANALYZE
- Consider additional indexes based on access patterns

### Materialized View Refresh
- `cache_performance_metrics` requires manual refresh
- Schedule refresh during low-traffic periods
- Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locks

## Security Considerations

### Permissions
- Grant statements are commented out (customize for your app)
- Separate read/write permissions for different roles
- Restrict function execution to authorized users

### Data Privacy
- `request_payload` and `response_data` may contain sensitive image data
- Consider encryption at rest for vision API cache
- Implement data retention policies for GDPR compliance

### Audit Trail
- `reviewed_by` and `reviewed_at` provide audit trail
- Consider additional logging for security events
- Track who ran cleanup/eviction functions

## Maintenance Tasks

### Daily
- Run `cleanup_expired_cache()` to remove expired entries
- Monitor `ai_job_stats` for failed jobs
- Check `pending_ai_annotations` queue depth

### Weekly
- Review `reviewer_stats` for workload balancing
- Analyze `cache_stats` for optimization opportunities
- Check `ai_annotation_jobs` for stuck jobs

### Monthly
- Refresh `cache_performance_metrics` for trend analysis
- Review index usage with pg_stat_user_indexes
- Analyze query performance and optimize as needed

## Future Enhancements

Potential improvements to consider:

1. **Versioning**: Track annotation history with version table
2. **Batch Processing**: Add batch job support for multiple images
3. **Quality Metrics**: Store per-annotation quality scores
4. **Provider Comparison**: A/B test different AI providers
5. **Cost Tracking**: Monitor API usage and costs per provider
6. **Confidence Calibration**: Track accuracy vs confidence scores
7. **Review Workflow**: Add review stages (L1, L2, final approval)
8. **Cache Warming**: Pre-populate cache for common images

## Troubleshooting

### Common Issues

**Q: Migration fails with "relation already exists"**
A: Use `IF NOT EXISTS` clauses (already included in migrations)

**Q: Bounding box constraints too strict**
A: Adjust constraint logic or disable during development

**Q: Cache growing too large**
A: Lower `max_entries` in `evict_lru_cache()` or reduce TTL

**Q: Slow queries on pending annotations**
A: Ensure composite indexes are created and analyze query plans

**Q: Trigger not firing for completed_at**
A: Verify status transition is from non-terminal to terminal state

## Related Files

- `/backend/src/database/schemas/001_create_tables.sql` - Base schema with images/annotations
- `/shared/types/annotation.types.ts` - TypeScript interfaces matching schema
- `/backend/src/routes/annotations.ts` - API endpoints using this schema
- `/backend/src/services/visionService.ts` - AI annotation generation logic (to be created)
