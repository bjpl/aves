# Exercise Cache - Quick Start Guide

## TL;DR

**Goal**: 80% cache hit rate to reduce AI costs from $9 to $2/month

**What it does**:
- Caches AI-generated exercises in PostgreSQL
- SHA-256 cache keys based on exercise context
- 24-hour TTL with automatic LRU eviction
- Real-time statistics and monitoring

**Status**: ✅ Ready for deployment (PostgreSQL required)

---

## Quick Deploy (5 Steps)

### 1. Run Migration

```bash
# From backend directory
npm run migrate

# Or direct SQL
psql $DATABASE_URL -f backend/src/database/migrations/007_exercise_cache.sql
```

### 2. Verify Tables Created

```sql
-- Should see: exercise_cache table, 9 indexes, 6 functions, 3 views
\dt exercise_cache
\di exercise_cache*
\df *exercise*
```

### 3. Integrate Service

```typescript
import { createExerciseCacheDB } from './services/exerciseCacheDB';
import { pool } from './database/connection';

const cache = createExerciseCacheDB(pool);

// In your route
const context = { type: 'contextual_fill', difficulty: 3, topics: ['colors'] };
let exercise = await cache.get(context);

if (!exercise) {
  exercise = await aiGenerator.generate(context);
  await cache.set(context, exercise);
}
```

### 4. Setup Cron Jobs

```bash
# Add to crontab
0 3 * * * psql $DATABASE_URL -c "SELECT cleanup_expired_exercises();"
0 4 * * * psql $DATABASE_URL -c "SELECT evict_lru_exercises(10000);"
```

### 5. Monitor Performance

```sql
-- Check hit rate (target: 80%+)
SELECT cache_hit_rate FROM exercise_cache_overview;

-- Check cost savings (target: $7+/month)
SELECT total_cost_saved FROM exercise_cache_overview;
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/src/database/migrations/007_exercise_cache.sql` | Database schema |
| `backend/src/services/exerciseCacheDB.ts` | Cache service |
| `docs/EXERCISE_CACHE_STRATEGY.md` | Complete strategy guide |
| `docs/EXERCISE_CACHE_IMPLEMENTATION_SUMMARY.md` | Implementation summary |
| `backend/src/database/migrations/README_EXERCISE_CACHE.md` | Migration guide |

---

## Essential Commands

### Cache Operations

```typescript
// Get from cache
const exercise = await cache.get(context);

// Set to cache
await cache.set(context, exercise, 86400); // 24h TTL

// Get statistics
const stats = await cache.getStats();
console.log(`Hit rate: ${stats.cacheHitRate}%`);

// Find similar exercises
const similar = await cache.findSimilar(context, 5);

// Clear user cache
await cache.clearUserCache(userId);
```

### Monitoring Queries

```sql
-- Overall stats
SELECT * FROM exercise_cache_overview;

-- Stats by type
SELECT * FROM exercise_cache_stats;

-- Top 10 popular
SELECT * FROM get_popular_exercises(10);

-- LRU candidates
SELECT * FROM get_lru_exercises(10);

-- Cache size
SELECT pg_size_pretty(pg_total_relation_size('exercise_cache'));
```

### Maintenance

```sql
-- Clean expired
SELECT cleanup_expired_exercises();

-- Evict LRU (keep max 10k)
SELECT evict_lru_exercises(10000);

-- Refresh metrics
SELECT refresh_exercise_cache_metrics();
```

---

## How It Works

### Cache Key Generation

```
Input: { type: 'contextual_fill', difficulty: 3, topics: ['colors', 'anatomy'] }
       ↓
Key String: 'contextual_fill_3_anatomy_colors' (topics sorted)
       ↓
SHA-256 Hash: 'a3f5b2c1d4e6f7a8b9c0d1e2f3...' (64 chars)
       ↓
Cache Lookup: SELECT FROM exercise_cache WHERE cache_key = $1
```

### Cache Flow

```
Request Exercise
      ↓
Generate Cache Key
      ↓
  Check Cache ──→ HIT  ──→ Update Stats ──→ Return Exercise (50-80ms)
      ↓
     MISS
      ↓
Generate with AI (2000ms)
      ↓
  Store in Cache
      ↓
Check Size > 10k? ──→ YES ──→ Evict LRU
      ↓
Return Exercise
```

---

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Hit Rate | 80%+ | `SELECT cache_hit_rate FROM exercise_cache_overview` |
| Cost | $2/month | `SELECT total_cost_saved FROM exercise_cache_overview` |
| Retrieval | <100ms | Monitor logs: `logger.info('Cache hit', { retrievalTimeMs })` |
| Cache Size | <100MB | `SELECT pg_size_pretty(pg_total_relation_size('exercise_cache'))` |

---

## Troubleshooting

### Low Hit Rate (<50%)

```sql
-- Check if cache is being populated
SELECT COUNT(*) FROM exercise_cache WHERE expires_at > CURRENT_TIMESTAMP;

-- Verify cache key generation is consistent
SELECT cache_key, COUNT(*) FROM exercise_cache GROUP BY cache_key HAVING COUNT(*) > 1;
```

**Fix**: Ensure same context generates same cache key (topics must be sorted)

### Cache Too Large

```sql
-- Check current size
SELECT pg_size_pretty(pg_total_relation_size('exercise_cache'));

-- Manually evict
SELECT evict_lru_exercises(5000); -- Keep max 5000
```

**Fix**: Lower TTL or increase eviction frequency

### Slow Retrieval (>100ms)

```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT exercise_data FROM exercise_cache
WHERE cache_key = 'test' AND expires_at > CURRENT_TIMESTAMP;
```

**Fix**: Ensure indexes exist, vacuum/analyze table

---

## Cost Breakdown

### Without Cache
```
100 exercises/day × $0.003 × 30 days = $9.00/month
```

### With 80% Hit Rate
```
Cache Hits:  80 requests × $0.00      = $0.00
Cache Miss:  20 requests × $0.003     = $0.06/day
Monthly:     $0.06 × 30 days          = $1.80/month
Savings:     $9.00 - $1.80            = $7.20/month (80%)
```

### Scaling
- 500 exercises/day @ 80% = $9/month ($36 saved)
- 1000 exercises/day @ 85% = $13.50/month ($76.50 saved)

---

## Next Steps

1. ✅ Deploy migration when PostgreSQL is available
2. ✅ Integrate `ExerciseCacheDB` service
3. ✅ Set up cron jobs for maintenance
4. ✅ Monitor hit rate and optimize TTL
5. ✅ Track cost savings monthly

---

## Support

- **Full Strategy**: `docs/EXERCISE_CACHE_STRATEGY.md`
- **Implementation Details**: `docs/EXERCISE_CACHE_IMPLEMENTATION_SUMMARY.md`
- **Migration Guide**: `backend/src/database/migrations/README_EXERCISE_CACHE.md`
- **Service Code**: `backend/src/services/exerciseCacheDB.ts`

---

**Ready to deploy!** 🚀

Run `npm run migrate` when PostgreSQL is available.
