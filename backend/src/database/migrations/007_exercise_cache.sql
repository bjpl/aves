-- Exercise Cache for AI-Generated Content Optimization
-- Migration: 007_exercise_cache
-- Goal: Achieve 80%+ cache hit rate to reduce API costs to $2/month

-- Exercise Cache table
-- Caches AI-generated exercises to minimize API costs and improve performance
CREATE TABLE IF NOT EXISTS exercise_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique cache key (SHA-256 hash of exercise context)
  cache_key VARCHAR(255) UNIQUE NOT NULL,

  -- Exercise type and metadata
  exercise_type VARCHAR(50) NOT NULL,

  -- Complete exercise data in JSONB format
  exercise_data JSONB NOT NULL,

  -- User context hash for context-aware caching
  -- Hash of: exercise_type + difficulty + topics (sorted)
  user_context_hash VARCHAR(64) NOT NULL,

  -- Difficulty level (1-5) for filtering
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),

  -- Topics covered (for filtering and analytics)
  topics TEXT[] DEFAULT '{}',

  -- Cache usage metrics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Cache lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Cache metadata
  generation_cost DECIMAL(10, 6) DEFAULT 0.003, -- $0.003 per generation
  generation_time_ms INTEGER,

  -- Ensure expires_at is in the future
  CONSTRAINT check_expires_at CHECK (expires_at > created_at)
);

-- Indexes for high-performance cache lookups

-- Primary lookup index: Find cache entry by key
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_cache_key
  ON exercise_cache(cache_key);

-- Type and difficulty filtering
CREATE INDEX IF NOT EXISTS idx_exercise_type_difficulty
  ON exercise_cache(exercise_type, difficulty);

-- Expiration index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_exercise_expires_at
  ON exercise_cache(expires_at);

-- LRU eviction index: Find least recently used entries
CREATE INDEX IF NOT EXISTS idx_exercise_last_used
  ON exercise_cache(last_used_at ASC);

-- Usage analytics index
CREATE INDEX IF NOT EXISTS idx_exercise_usage_count
  ON exercise_cache(usage_count DESC);

-- Composite index for efficient cache lookup with expiration check
-- Note: WHERE clause removed for Supabase compatibility (CURRENT_TIMESTAMP not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_exercise_lookup
  ON exercise_cache(cache_key, expires_at);

-- Index for active (non-expired) cache entries sorted by creation
-- Note: WHERE clause removed for Supabase compatibility (CURRENT_TIMESTAMP not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_exercise_active
  ON exercise_cache(created_at DESC, expires_at);

-- Topics search index (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_exercise_topics
  ON exercise_cache USING GIN(topics);

-- Context hash for finding similar exercises
CREATE INDEX IF NOT EXISTS idx_exercise_context_hash
  ON exercise_cache(user_context_hash);

-- Function: Update cache access statistics
-- Updates last_used_at and increments usage_count when cache is accessed
CREATE OR REPLACE FUNCTION update_exercise_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = CURRENT_TIMESTAMP;
  NEW.usage_count = OLD.usage_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update access statistics (disabled by default, app handles this)
-- Uncomment if you want database-level tracking:
-- CREATE TRIGGER update_exercise_cache_access_trigger
--   BEFORE UPDATE ON exercise_cache
--   FOR EACH ROW
--   WHEN (NEW.last_used_at IS DISTINCT FROM OLD.last_used_at)
--   EXECUTE FUNCTION update_exercise_cache_access();

-- Function: Clean up expired cache entries
-- Returns: Number of deleted entries
CREATE OR REPLACE FUNCTION cleanup_expired_exercises()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM exercise_cache
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Evict least recently used (LRU) cache entries
-- Maintains cache size at or below max_entries limit
-- Returns: Number of evicted entries
CREATE OR REPLACE FUNCTION evict_lru_exercises(max_entries INTEGER DEFAULT 10000)
RETURNS INTEGER AS $$
DECLARE
  evicted_count INTEGER;
  current_count INTEGER;
  entries_to_evict INTEGER;
BEGIN
  -- Get current active cache entry count
  SELECT COUNT(*) INTO current_count
  FROM exercise_cache
  WHERE expires_at > CURRENT_TIMESTAMP;

  -- If we're under the limit, nothing to do
  IF current_count <= max_entries THEN
    RETURN 0;
  END IF;

  entries_to_evict := current_count - max_entries;

  -- Delete least recently used entries
  WITH entries_to_delete AS (
    SELECT id
    FROM exercise_cache
    WHERE expires_at > CURRENT_TIMESTAMP
    ORDER BY last_used_at ASC, usage_count ASC
    LIMIT entries_to_evict
  )
  DELETE FROM exercise_cache
  WHERE id IN (SELECT id FROM entries_to_delete);

  GET DIAGNOSTICS evicted_count = ROW_COUNT;
  RETURN evicted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get cache statistics by exercise type
CREATE OR REPLACE FUNCTION get_exercise_cache_stats()
RETURNS TABLE (
  exercise_type VARCHAR(50),
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  total_usage BIGINT,
  avg_usage_per_entry NUMERIC,
  estimated_cost_saved NUMERIC,
  cache_hit_rate NUMERIC,
  oldest_entry TIMESTAMP WITH TIME ZONE,
  newest_entry TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.exercise_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE ec.expires_at > CURRENT_TIMESTAMP) as active_entries,
    COUNT(*) FILTER (WHERE ec.expires_at <= CURRENT_TIMESTAMP) as expired_entries,
    SUM(ec.usage_count) as total_usage,
    ROUND(AVG(ec.usage_count)::NUMERIC, 2) as avg_usage_per_entry,
    -- Cost saved = (total_usage - total_entries) * $0.003
    ROUND((SUM(ec.usage_count) - COUNT(*))::NUMERIC * 0.003, 2) as estimated_cost_saved,
    -- Hit rate = (total_usage - unique_entries) / total_usage
    ROUND((SUM(ec.usage_count) - COUNT(*))::NUMERIC / NULLIF(SUM(ec.usage_count), 0) * 100, 2) as cache_hit_rate,
    MIN(ec.created_at) as oldest_entry,
    MAX(ec.created_at) as newest_entry
  FROM exercise_cache ec
  GROUP BY ec.exercise_type;
END;
$$ LANGUAGE plpgsql;

-- Function: Get overall cache statistics
CREATE OR REPLACE FUNCTION get_overall_cache_stats()
RETURNS TABLE (
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  total_usage BIGINT,
  cache_hit_rate NUMERIC,
  total_cost_saved NUMERIC,
  avg_generation_time_ms NUMERIC,
  cache_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as expired_entries,
    SUM(usage_count) as total_usage,
    ROUND((SUM(usage_count) - COUNT(*))::NUMERIC / NULLIF(SUM(usage_count), 0) * 100, 2) as cache_hit_rate,
    ROUND((SUM(usage_count) - COUNT(*))::NUMERIC * 0.003, 2) as total_cost_saved,
    ROUND(AVG(generation_time_ms)::NUMERIC, 2) as avg_generation_time_ms,
    ROUND(pg_total_relation_size('exercise_cache')::NUMERIC / 1024 / 1024, 2) as cache_size_mb
  FROM exercise_cache;
END;
$$ LANGUAGE plpgsql;

-- Function: Get most popular cached exercises
CREATE OR REPLACE FUNCTION get_popular_exercises(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  exercise_type VARCHAR(50),
  difficulty INTEGER,
  usage_count INTEGER,
  topics TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.exercise_type,
    ec.difficulty,
    ec.usage_count,
    ec.topics,
    ec.created_at,
    ec.last_used_at
  FROM exercise_cache ec
  WHERE ec.expires_at > CURRENT_TIMESTAMP
  ORDER BY ec.usage_count DESC, ec.last_used_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get least used exercises (candidates for eviction)
CREATE OR REPLACE FUNCTION get_lru_exercises(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  exercise_type VARCHAR(50),
  difficulty INTEGER,
  usage_count INTEGER,
  last_used_at TIMESTAMP WITH TIME ZONE,
  age_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.exercise_type,
    ec.difficulty,
    ec.usage_count,
    ec.last_used_at,
    EXTRACT(DAY FROM CURRENT_TIMESTAMP - ec.created_at)::INTEGER as age_days
  FROM exercise_cache ec
  WHERE ec.expires_at > CURRENT_TIMESTAMP
  ORDER BY ec.last_used_at ASC, ec.usage_count ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for cache statistics (real-time)
CREATE OR REPLACE VIEW exercise_cache_stats AS
SELECT * FROM get_exercise_cache_stats();

-- Create view for overall statistics
CREATE OR REPLACE VIEW exercise_cache_overview AS
SELECT * FROM get_overall_cache_stats();

-- Create view for expired entries needing cleanup
CREATE OR REPLACE VIEW expired_exercises AS
SELECT
  id,
  exercise_type,
  difficulty,
  topics,
  cache_key,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - expires_at))::INTEGER as expired_seconds_ago,
  usage_count,
  generation_cost
FROM exercise_cache
WHERE expires_at < CURRENT_TIMESTAMP
ORDER BY expires_at ASC;

-- Create materialized view for cache performance metrics
-- Refresh periodically for dashboard analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS exercise_cache_daily_metrics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  exercise_type,
  difficulty,
  COUNT(*) as entries_created,
  SUM(usage_count) as total_accesses,
  AVG(usage_count) as avg_accesses_per_entry,
  SUM(generation_cost) as total_cost,
  SUM(CASE WHEN usage_count > 1 THEN (usage_count - 1) * generation_cost ELSE 0 END) as cost_saved,
  AVG(generation_time_ms) as avg_generation_time_ms
FROM exercise_cache
GROUP BY DATE_TRUNC('day', created_at), exercise_type, difficulty
ORDER BY date DESC, exercise_type, difficulty;

-- Create index on materialized view for fast queries
CREATE INDEX IF NOT EXISTS idx_exercise_cache_daily_metrics_date
  ON exercise_cache_daily_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_cache_daily_metrics_type
  ON exercise_cache_daily_metrics(exercise_type, difficulty);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_exercise_cache_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY exercise_cache_daily_metrics;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE exercise_cache IS 'Caches AI-generated exercises to reduce API costs and improve performance. Target: 80%+ hit rate for $2/month operational cost.';
COMMENT ON COLUMN exercise_cache.cache_key IS 'SHA-256 hash of exercise context (type + difficulty + sorted topics)';
COMMENT ON COLUMN exercise_cache.user_context_hash IS 'Hash of user context for similar exercise recommendations';
COMMENT ON COLUMN exercise_cache.exercise_data IS 'Complete exercise object in JSONB format';
COMMENT ON COLUMN exercise_cache.usage_count IS 'Number of times this cached exercise has been served';
COMMENT ON COLUMN exercise_cache.generation_cost IS 'Estimated API cost for generating this exercise ($0.003 default)';

COMMENT ON FUNCTION cleanup_expired_exercises() IS 'Deletes expired cache entries, returns count of deleted entries';
COMMENT ON FUNCTION evict_lru_exercises(INTEGER) IS 'Evicts least recently used entries when cache exceeds max_entries limit';
COMMENT ON FUNCTION get_exercise_cache_stats() IS 'Returns cache statistics grouped by exercise type';
COMMENT ON FUNCTION get_overall_cache_stats() IS 'Returns overall cache performance metrics';
COMMENT ON FUNCTION get_popular_exercises(INTEGER) IS 'Returns most frequently used cached exercises';
COMMENT ON FUNCTION get_lru_exercises(INTEGER) IS 'Returns least recently used exercises (eviction candidates)';

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON exercise_cache TO app_user;
-- GRANT SELECT ON exercise_cache_stats TO app_user;
-- GRANT SELECT ON exercise_cache_overview TO app_user;
-- GRANT SELECT ON expired_exercises TO app_user;
-- GRANT SELECT ON exercise_cache_daily_metrics TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_exercises() TO app_user;
-- GRANT EXECUTE ON FUNCTION evict_lru_exercises(INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION get_exercise_cache_stats() TO app_user;
-- GRANT EXECUTE ON FUNCTION get_overall_cache_stats() TO app_user;
-- GRANT EXECUTE ON FUNCTION refresh_exercise_cache_metrics() TO app_user;

-- Schedule cleanup jobs (using pg_cron extension if available)
-- Uncomment and adjust if you have pg_cron installed:
-- SELECT cron.schedule('cleanup-expired-exercises', '0 3 * * *', 'SELECT cleanup_expired_exercises();');
-- SELECT cron.schedule('evict-lru-exercises', '0 4 * * *', 'SELECT evict_lru_exercises(10000);');
-- SELECT cron.schedule('refresh-exercise-metrics', '0 5 * * *', 'SELECT refresh_exercise_cache_metrics();');

-- Example queries for monitoring:

-- Check cache hit rate:
-- SELECT * FROM exercise_cache_overview;

-- View statistics by type:
-- SELECT * FROM exercise_cache_stats;

-- Find expired entries:
-- SELECT COUNT(*) FROM expired_exercises;

-- Manual cleanup:
-- SELECT cleanup_expired_exercises();

-- Manual LRU eviction (keep max 10,000 entries):
-- SELECT evict_lru_exercises(10000);

-- View daily metrics:
-- SELECT * FROM exercise_cache_daily_metrics WHERE date >= CURRENT_DATE - INTERVAL '7 days';
