# Database Index Optimization - Pattern Counts Query

## Overview

This document describes the implementation of database index optimization for the ML Analytics pattern counts query, which filters by approval status and groups by Spanish terms.

## Problem Statement

The ML Analytics endpoint `/api/ml/analytics` performs frequent queries like:

```sql
SELECT spanish_term, COUNT(*) as count
FROM ai_annotation_items
WHERE status = 'approved'
GROUP BY spanish_term
ORDER BY count DESC;
```

**Performance Issue:**
- Without proper indexing, this query performs a sequential scan of all rows
- Time complexity: O(n) where n = total rows in table
- Large datasets (10,000+ annotations) result in slow response times (>500ms)

## Solution

### Composite Index Implementation

**Migration:** `019_add_pattern_counts_index.sql`

```sql
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_status_spanish_term
ON ai_annotation_items(status, spanish_term);
```

**Why Composite Index?**

1. **Existing Index Limitation:**
   - Current: `idx_ai_annotation_items_status` on `(status)` alone
   - Problem: After filtering by status, still needs full sort/group operation

2. **Composite Index Benefits:**
   - Supports both WHERE clause filtering AND GROUP BY operation
   - Enables index-only scans (no table access needed)
   - PostgreSQL can read grouped values directly from index

### Performance Improvement

**Expected Results:**

| Dataset Size | Before (ms) | After (ms) | Improvement |
|--------------|-------------|------------|-------------|
| 1,000 rows   | ~50         | ~5-10      | 5-10x       |
| 10,000 rows  | ~500        | ~50-100    | 5-10x       |
| 100,000 rows | ~5,000      | ~500-1000  | 5-10x       |

**Time Complexity:**
- Before: O(n) - Sequential scan + sort
- After: O(log n + k) - Index scan where k = matching rows

## Implementation Files

### 1. Migration File
**Location:** `backend/src/database/migrations/019_add_pattern_counts_index.sql`

Creates the composite index and includes documentation comments for future maintainers.

### 2. Migration Runner
**Location:** `backend/scripts/run-migration-019.ts`

Automated script that:
- Executes the migration SQL
- Verifies index creation
- Reports index size
- Updates table statistics (ANALYZE)
- Provides next steps

**Usage:**
```bash
npx ts-node backend/scripts/run-migration-019.ts
```

### 3. Performance Test
**Location:** `backend/scripts/test-pattern-counts-performance.ts`

Comprehensive performance testing script that:
- Runs EXPLAIN ANALYZE on the query
- Reports execution metrics (planning time, execution time)
- Validates index usage
- Provides performance recommendations

**Usage:**
```bash
npx ts-node backend/scripts/test-pattern-counts-performance.ts
```

## Additional Recommended Indexes

The migration file includes commented-out recommendations for related query patterns:

### 1. Image Quality Filtering
```sql
CREATE INDEX IF NOT EXISTS idx_images_quality_score
ON images(quality_score) WHERE quality_score IS NOT NULL;
```

**Use Case:** Pre-filtering images by quality before annotation
**Benefit:** Faster image selection for annotation pipelines

### 2. Annotation Type + Status Queries
```sql
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_type_status
ON ai_annotation_items(annotation_type, status);
```

**Use Case:** Analytics breakdown by annotation type
**Benefit:** Optimizes queries like "count approved anatomical annotations"

### 3. Confidence-Based Filtering
```sql
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_confidence
ON ai_annotation_items(confidence) WHERE status = 'approved';
```

**Use Case:** ML training data selection (high-confidence only)
**Benefit:** Partial index (smaller size), faster confidence filtering

## Testing & Validation

### Pre-Migration Testing

1. **Capture Baseline Performance:**
   ```bash
   npx ts-node scripts/test-pattern-counts-performance.ts
   ```
   - Record execution time
   - Note scan type (Sequential Scan expected)
   - Document current index usage

### Migration Execution

2. **Run Migration:**
   ```bash
   npx ts-node scripts/run-migration-019.ts
   ```
   - Verify successful index creation
   - Check index size (should be reasonable, <10% of table size)
   - Confirm ANALYZE runs successfully

### Post-Migration Validation

3. **Verify Performance Improvement:**
   ```bash
   npx ts-node scripts/test-pattern-counts-performance.ts
   ```
   - Confirm Index Scan is used
   - Validate 5-10x speedup
   - Document new execution time

4. **Integration Testing:**
   - Test ML Analytics endpoint: `GET /api/ml/analytics`
   - Verify response times are acceptable (<200ms)
   - Check no regressions in other queries

## Monitoring & Maintenance

### Query Performance Monitoring

**PostgreSQL Query Stats:**
```sql
SELECT
  query,
  calls,
  total_exec_time / calls as avg_time_ms,
  min_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ai_annotation_items%'
  AND query LIKE '%status%'
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Index Health Checks

**Index Usage Statistics:**
```sql
SELECT
  indexrelname as index_name,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'ai_annotation_items'
ORDER BY idx_scan DESC;
```

**Unused Indexes:**
If `idx_scan = 0` for extended period, consider removing the index.

### Maintenance Tasks

**Periodic ANALYZE:**
```sql
ANALYZE ai_annotation_items;
```
Run after bulk inserts/updates to update query planner statistics.

**REINDEX (if needed):**
```sql
REINDEX INDEX CONCURRENTLY idx_ai_annotation_items_status_spanish_term;
```
Only needed if index becomes bloated (rare).

## Rollback Plan

If the index causes issues:

**Drop Index:**
```sql
DROP INDEX IF EXISTS idx_ai_annotation_items_status_spanish_term;
```

**Fallback:** Existing `idx_ai_annotation_items_status` will still provide partial optimization.

## Impact Analysis

### Storage Impact
- **Index Size:** ~2-5% of table size (varies with data cardinality)
- **Write Performance:** Minimal impact (<5% slower inserts/updates)
- **Read Performance:** 5-10x faster for pattern counts queries

### Cost-Benefit Analysis

**Benefits:**
- Significantly faster analytics queries
- Better user experience on admin dashboard
- Enables real-time analytics without caching

**Costs:**
- Additional storage (~5MB per 100k rows)
- Slightly slower write operations
- Maintenance overhead (ANALYZE)

**Verdict:** Benefits far outweigh costs for this use case.

## Future Considerations

### Index Strategy Evolution

As the application scales, consider:

1. **Partial Indexes:** For frequently filtered subsets
2. **Covering Indexes:** Include additional columns for index-only scans
3. **Materialized Views:** For complex aggregations updated periodically
4. **Partitioning:** Split large tables by date/status for faster queries

### Query Optimization Opportunities

1. **Caching Layer:** Redis cache for frequently accessed analytics
2. **Batch Processing:** Pre-compute aggregations during off-peak hours
3. **Incremental Updates:** Track deltas instead of full re-computation

## References

- PostgreSQL Documentation: [Indexes and GROUP BY](https://www.postgresql.org/docs/current/indexes-ordering.html)
- Migration Pattern: [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- Performance Testing: [EXPLAIN ANALYZE](https://www.postgresql.org/docs/current/sql-explain.html)

---

**Created:** November 29, 2025
**Last Updated:** November 29, 2025
**Author:** Backend API Developer Agent
**Status:** Implementation Complete, Testing Pending
