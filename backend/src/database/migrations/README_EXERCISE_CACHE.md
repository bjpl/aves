# Exercise Cache Migration Guide

## Overview

Migration `007_exercise_cache.sql` implements a high-performance database caching system for AI-generated exercises.

**Goals:**
- 80%+ cache hit rate
- $2/month operational cost (down from $9/month)
- <100ms cache retrieval time
- Automatic LRU eviction at 10,000 entries

## Running the Migration

### Option 1: Using npm script (Recommended)

```bash
# From backend directory
npm run migrate
```

### Option 2: Direct SQL

```bash
# Using psql
psql -U your_user -d your_database -f backend/src/database/migrations/007_exercise_cache.sql

# Or using database connection string
psql $DATABASE_URL -f backend/src/database/migrations/007_exercise_cache.sql
```

### Option 3: Using migration tool

```bash
# From backend directory
tsx src/database/migrate.ts
```

## What Gets Created

### Tables

1. **exercise_cache** - Main cache table
   - `id`: UUID primary key
   - `cache_key`: SHA-256 hash (unique)
   - `exercise_type`: Type of exercise
   - `exercise_data`: Full exercise JSONB
   - `user_context_hash`: For similarity matching
   - `difficulty`: 1-5 scale
   - `topics`: Array of topics
   - `usage_count`: Cache hit counter
   - `last_used_at`: For LRU eviction
   - `created_at`, `expires_at`: Lifecycle timestamps
   - `generation_cost`, `generation_time_ms`: Metrics

### Indexes

1. `idx_exercise_cache_key` - Primary lookup (UNIQUE)
2. `idx_exercise_type_difficulty` - Filtering by type/difficulty
3. `idx_exercise_expires_at` - Expiration cleanup
4. `idx_exercise_last_used` - LRU eviction
5. `idx_exercise_usage_count` - Popular exercises
6. `idx_exercise_lookup` - Composite cache lookup
7. `idx_exercise_active` - Active entries
8. `idx_exercise_topics` - GIN index for topic search
9. `idx_exercise_context_hash` - Similarity matching

### Functions

1. **cleanup_expired_exercises()** - Delete expired entries
2. **evict_lru_exercises(max_entries)** - LRU eviction
3. **get_exercise_cache_stats()** - Stats by type
4. **get_overall_cache_stats()** - Overall stats
5. **get_popular_exercises(limit)** - Most used
6. **get_lru_exercises(limit)** - Least used

### Views

1. **exercise_cache_stats** - Statistics by exercise type
2. **exercise_cache_overview** - Overall statistics
3. **expired_exercises** - Entries needing cleanup

### Materialized View

1. **exercise_cache_daily_metrics** - Daily performance metrics

## Verification

After running the migration, verify it worked:

```sql
-- Check table exists
\dt exercise_cache

-- Check indexes
\di exercise_cache*

-- Check functions
\df *exercise*

-- Check views
\dv exercise_cache*

-- Test cleanup function
SELECT cleanup_expired_exercises();

-- Test eviction function
SELECT evict_lru_exercises(10000);

-- View stats
SELECT * FROM exercise_cache_overview;
```

## Usage Example

```typescript
import { createExerciseCacheDB } from './services/exerciseCacheDB';
import { pool } from './database/connection';

const cache = createExerciseCacheDB(pool);

// 1. Try cache
const context = {
  type: 'contextual_fill',
  difficulty: 3,
  topics: ['colors', 'anatomy']
};

let exercise = await cache.get(context);

// 2. On cache miss, generate
if (!exercise) {
  exercise = await aiGenerator.generate(context);
  await cache.set(context, exercise);
}

// 3. Return to user
return exercise;
```

## Scheduled Maintenance

Set up these cron jobs for optimal performance:

```bash
# Daily at 3 AM - Clean expired entries
0 3 * * * psql $DATABASE_URL -c "SELECT cleanup_expired_exercises();"

# Daily at 4 AM - Evict LRU entries (keep max 10k)
0 4 * * * psql $DATABASE_URL -c "SELECT evict_lru_exercises(10000);"

# Daily at 5 AM - Refresh metrics view
0 5 * * * psql $DATABASE_URL -c "SELECT refresh_exercise_cache_metrics();"
```

## Monitoring Queries

### Check Cache Hit Rate

```sql
SELECT
  cache_hit_rate,
  total_entries,
  active_entries,
  total_cost_saved
FROM exercise_cache_overview;
```

### Top Performing Exercise Types

```sql
SELECT
  exercise_type,
  cache_hit_rate,
  estimated_cost_saved,
  active_entries
FROM exercise_cache_stats
ORDER BY cache_hit_rate DESC;
```

### Most Popular Exercises

```sql
SELECT * FROM get_popular_exercises(10);
```

### Eviction Candidates

```sql
SELECT * FROM get_lru_exercises(10);
```

### Daily Metrics

```sql
SELECT
  date,
  exercise_type,
  entries_created,
  cost_saved
FROM exercise_cache_daily_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, cost_saved DESC;
```

## Rollback

If you need to remove the cache system:

```sql
-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS exercise_cache_daily_metrics;

-- Drop views
DROP VIEW IF EXISTS exercise_cache_stats;
DROP VIEW IF EXISTS exercise_cache_overview;
DROP VIEW IF EXISTS expired_exercises;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_exercises();
DROP FUNCTION IF EXISTS evict_lru_exercises(INTEGER);
DROP FUNCTION IF EXISTS get_exercise_cache_stats();
DROP FUNCTION IF EXISTS get_overall_cache_stats();
DROP FUNCTION IF EXISTS get_popular_exercises(INTEGER);
DROP FUNCTION IF EXISTS get_lru_exercises(INTEGER);
DROP FUNCTION IF EXISTS refresh_exercise_cache_metrics();

-- Drop table (this will delete all cached exercises!)
DROP TABLE IF EXISTS exercise_cache;
```

## Troubleshooting

### Migration fails with "table already exists"

The migration uses `IF NOT EXISTS` so it's safe to run multiple times. If you see this error, the table already exists.

### Cache hit rate is low (<50%)

1. Check if cache is being populated:
   ```sql
   SELECT COUNT(*) FROM exercise_cache WHERE expires_at > CURRENT_TIMESTAMP;
   ```

2. Verify cache key generation is consistent

3. Check TTL (default 24 hours may be too short)

### Slow cache retrieval (>100ms)

1. Verify indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'exercise_cache';
   ```

2. Check database performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT exercise_data FROM exercise_cache
   WHERE cache_key = 'test_key' AND expires_at > CURRENT_TIMESTAMP;
   ```

3. Consider increasing `shared_buffers` in PostgreSQL config

### Cache growing too large

1. Check current size:
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('exercise_cache'));
   ```

2. Manually evict LRU entries:
   ```sql
   SELECT evict_lru_exercises(5000); -- Keep max 5000
   ```

3. Lower TTL to reduce cache size

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Typical |
|--------|--------|---------|
| Cache Hit | <100ms | 50-80ms |
| Cache Miss | <10ms | 5-8ms |
| Cache Write | <50ms | 20-40ms |
| Eviction | <500ms | 200-400ms |
| Cleanup | <1s | 300-800ms |

## Cost Analysis

### Without Caching
- 100 exercises/day × $0.003 × 30 days = **$9.00/month**

### With Caching (80% hit rate)
- 20 API calls/day × $0.003 × 30 days = **$1.80/month**
- **Savings: $7.20/month (80% reduction)**

### Scaling
- 500 exercises/day @ 80% = $9/month ($36 saved)
- 1000 exercises/day @ 85% = $13.50/month ($76.50 saved)

## Next Steps

1. ✅ Run migration: `npm run migrate`
2. ✅ Verify tables/functions created
3. ✅ Integrate `ExerciseCacheDB` service
4. ✅ Set up cron jobs for maintenance
5. ✅ Monitor cache hit rate
6. ✅ Optimize based on metrics

## Support

For issues or questions:
- See: `docs/EXERCISE_CACHE_STRATEGY.md`
- Service: `backend/src/services/exerciseCacheDB.ts`
- Migration: `backend/src/database/migrations/007_exercise_cache.sql`
