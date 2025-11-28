-- Migration 016: Add Local Upload Support to Images Table
-- Created: 2025-11-27
-- Purpose: Enable local image uploads in addition to Unsplash images

-- ============================================================================
-- MODIFY UNSPLASH_ID CONSTRAINT
-- ============================================================================

-- Make unsplash_id nullable for local uploads
ALTER TABLE images ALTER COLUMN unsplash_id DROP NOT NULL;

-- ============================================================================
-- ADD LOCAL UPLOAD COLUMNS
-- ============================================================================

-- Add thumbnail URL for locally uploaded images
ALTER TABLE images ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add source type to distinguish between unsplash and local uploads
ALTER TABLE images ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'unsplash';

-- Add original filename for local uploads
ALTER TABLE images ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500);

-- ============================================================================
-- ADD CHECK CONSTRAINT FOR SOURCE TYPE
-- ============================================================================

-- Ensure source_type is valid
ALTER TABLE images ADD CONSTRAINT check_image_source_type
CHECK (source_type IN ('unsplash', 'local_upload', 'url'));

-- ============================================================================
-- UPDATE INDEXES
-- ============================================================================

-- Index for filtering by source type
CREATE INDEX IF NOT EXISTS idx_images_source_type ON images(source_type);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN images.thumbnail_url IS 'URL/path to thumbnail image for gallery display';
COMMENT ON COLUMN images.source_type IS 'Image source: unsplash, local_upload, or url';
COMMENT ON COLUMN images.original_filename IS 'Original filename for locally uploaded images';
