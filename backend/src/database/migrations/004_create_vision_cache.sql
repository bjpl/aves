-- Vision API Cache for Performance Optimization
-- Migration: 004_create_vision_cache

-- Vision API Cache table
-- Caches vision API responses to reduce costs and improve performance
CREATE TABLE IF NOT EXISTS vision_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hash of the image URL for quick lookups
  image_url_hash VARCHAR(64) NOT NULL,

  -- Original image URL for reference
  image_url VARCHAR(500) NOT NULL,

  -- Vision API provider
  provider ai_provider NOT NULL,

  -- Request data (parameters, model version, etc.)
  request_data JSONB NOT NULL,

  -- Cached response data
  response_data JSONB NOT NULL,

  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1,

  -- Response metadata
  response_time_ms INTEGER,
  response_size_bytes INTEGER,

  -- Ensure expires_at is in the future
  CONSTRAINT check_expires_at CHECK (expires_at > created_at)
);

-- Unique constraint on image URL hash and provider for cache lookups
-- This prevents duplicate cache entries for the same image/provider combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_url_hash_provider
  ON vision_api_cache(image_url_hash, provider);

-- Index on expiration for cleanup queries
CREATE INDEX IF NOT EXISTS idx_cache_expires_at
  ON vision_api_cache(expires_at);

-- Index on provider for statistics
CREATE INDEX IF NOT EXISTS idx_cache_provider
  ON vision_api_cache(provider);

-- Index on last accessed for LRU eviction
CREATE INDEX IF NOT EXISTS idx_cache_last_accessed
  ON vision_api_cache(last_accessed_at);

-- Composite index for finding valid cache entries
CREATE INDEX IF NOT EXISTS idx_cache_lookup
  ON vision_api_cache(image_url_hash, provider, expires_at)
  WHERE expires_at > CURRENT_TIMESTAMP;

-- Partial index for active cache entries
CREATE INDEX IF NOT EXISTS idx_cache_active
  ON vision_api_cache(created_at DESC)
  WHERE expires_at > CURRENT_TIMESTAMP;

-- Create trigger to update last_accessed_at and increment access_count
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is a SELECT operation (detected via application layer)
  -- In practice, this will be called via an UPDATE statement from the application
  NEW.last_accessed_at = CURRENT_TIMESTAMP;
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: The trigger is commented out as it requires application-level updates
-- CREATE TRIGGER update_cache_access_trigger
--   BEFORE UPDATE ON vision_api_cache
--   FOR EACH ROW
--   WHEN (NEW.last_accessed_at IS DISTINCT FROM OLD.last_accessed_at)
--   EXECUTE FUNCTION update_cache_access();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vision_api_cache
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Function to evict least recently used cache entries when storage is full
-- Call this when you need to make room for new cache entries
CREATE OR REPLACE FUNCTION evict_lru_cache(max_entries INTEGER DEFAULT 10000)
RETURNS INTEGER AS $$
DECLARE
  evicted_count INTEGER;
  current_count INTEGER;
BEGIN
  -- Get current cache entry count
  SELECT COUNT(*) INTO current_count
  FROM vision_api_cache
  WHERE expires_at > CURRENT_TIMESTAMP;

  -- If we're under the limit, nothing to do
  IF current_count <= max_entries THEN
    RETURN 0;
  END IF;

  -- Delete least recently used entries
  WITH entries_to_delete AS (
    SELECT id
    FROM vision_api_cache
    ORDER BY last_accessed_at ASC
    LIMIT (current_count - max_entries)
  )
  DELETE FROM vision_api_cache
  WHERE id IN (SELECT id FROM entries_to_delete);

  GET DIAGNOSTICS evicted_count = ROW_COUNT;
  RETURN evicted_count;
END;
$$ language 'plpgsql';

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  provider ai_provider,
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  total_size_mb NUMERIC,
  avg_response_time_ms NUMERIC,
  total_accesses BIGINT,
  cache_hit_potential NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.provider,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as expired_entries,
    ROUND(SUM(COALESCE(response_size_bytes, 0))::NUMERIC / 1024 / 1024, 2) as total_size_mb,
    ROUND(AVG(response_time_ms)::NUMERIC, 2) as avg_response_time_ms,
    SUM(access_count) as total_accesses,
    ROUND((SUM(access_count) - COUNT(*))::NUMERIC / NULLIF(SUM(access_count), 0) * 100, 2) as cache_hit_potential
  FROM vision_api_cache v
  GROUP BY v.provider;
END;
$$ language 'plpgsql';

-- Create view for cache statistics
CREATE OR REPLACE VIEW cache_stats AS
SELECT * FROM get_cache_stats();

-- Create view for cache entries needing cleanup
CREATE OR REPLACE VIEW expired_cache_entries AS
SELECT
  id,
  provider,
  image_url_hash,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - expires_at)) as expired_seconds_ago,
  access_count,
  response_size_bytes
FROM vision_api_cache
WHERE expires_at < CURRENT_TIMESTAMP
ORDER BY expires_at ASC;

-- Create a materialized view for cache performance metrics (optional, for analytics)
-- Refresh this periodically for better performance on dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS cache_performance_metrics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  provider,
  COUNT(*) as entries_created,
  SUM(access_count) as total_accesses,
  AVG(response_time_ms) as avg_response_time_ms,
  SUM(response_size_bytes) as total_bytes,
  AVG(access_count) as avg_accesses_per_entry
FROM vision_api_cache
GROUP BY DATE_TRUNC('day', created_at), provider
ORDER BY date DESC, provider;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_cache_perf_date
  ON cache_performance_metrics(date DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_cache_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY cache_performance_metrics;
END;
$$ language 'plpgsql';

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, DELETE ON vision_api_cache TO app_user;
-- GRANT SELECT ON cache_stats TO app_user;
-- GRANT SELECT ON expired_cache_entries TO app_user;
-- GRANT SELECT ON cache_performance_metrics TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_cache() TO app_user;
-- GRANT EXECUTE ON FUNCTION evict_lru_cache(INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION get_cache_stats() TO app_user;

-- Schedule cleanup job (using pg_cron extension if available)
-- Uncomment and adjust if you have pg_cron installed:
-- SELECT cron.schedule('cleanup-expired-cache', '0 2 * * *', 'SELECT cleanup_expired_cache();');
-- SELECT cron.schedule('refresh-cache-metrics', '0 3 * * *', 'SELECT refresh_cache_metrics();');
