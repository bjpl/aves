-- Migration 015: Add Quality Score to Images Table
-- Created: 2025-11-22
-- Purpose: Store image quality assessment scores for filtering and display in gallery

-- ============================================================================
-- ADD QUALITY SCORE COLUMN
-- ============================================================================

ALTER TABLE images
ADD COLUMN IF NOT EXISTS quality_score INTEGER;

-- Add check constraint to ensure valid score range (0-100)
ALTER TABLE images
ADD CONSTRAINT check_image_quality_score_range
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

-- Add index for filtering by quality
CREATE INDEX IF NOT EXISTS idx_images_quality_score ON images(quality_score DESC)
WHERE quality_score IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN images.quality_score IS 'Image quality score (0-100) from AI assessment: 80-100=High, 60-79=Medium, <60=Low';

-- ============================================================================
-- UPDATE FUNCTIONS
-- ============================================================================

-- Function to categorize quality scores for filtering
-- High: 80-100, Medium: 60-79, Low: 0-59
CREATE OR REPLACE FUNCTION get_quality_category(score INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
  IF score IS NULL THEN
    RETURN NULL;
  ELSIF score >= 80 THEN
    RETURN 'high';
  ELSIF score >= 60 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_quality_category(INTEGER) IS 'Categorizes quality scores: high (80-100), medium (60-79), low (0-59)';
