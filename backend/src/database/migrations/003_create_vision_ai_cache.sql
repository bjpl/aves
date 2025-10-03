-- Migration: Create vision_ai_cache table for caching GPT-4o Vision responses
-- Created: 2025-10-02
-- Purpose: Cache AI-generated annotations to reduce API costs and improve performance

CREATE TABLE IF NOT EXISTS vision_ai_cache (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  annotations JSONB NOT NULL,
  model_version VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one cache entry per image URL and model version
  CONSTRAINT unique_image_model UNIQUE (image_url, model_version)
);

-- Index for fast lookups by image URL
CREATE INDEX idx_vision_cache_image_url ON vision_ai_cache(image_url);

-- Index for model version filtering
CREATE INDEX idx_vision_cache_model ON vision_ai_cache(model_version);

-- Index for cache expiration cleanup
CREATE INDEX idx_vision_cache_created_at ON vision_ai_cache(created_at);

-- Add comment for documentation
COMMENT ON TABLE vision_ai_cache IS 'Caches GPT-4o Vision API responses for bird image annotations';
COMMENT ON COLUMN vision_ai_cache.image_url IS 'Public URL of the annotated image';
COMMENT ON COLUMN vision_ai_cache.annotations IS 'JSON array of generated annotations';
COMMENT ON COLUMN vision_ai_cache.model_version IS 'OpenAI model version used (e.g., gpt-4o)';
COMMENT ON COLUMN vision_ai_cache.created_at IS 'Timestamp when annotations were generated';
