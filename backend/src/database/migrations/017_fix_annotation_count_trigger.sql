-- Migration 017: Fix annotation count trigger and update existing counts
-- Created: 2025-11-29
-- Purpose: Fix bug in annotation count trigger (DELETE operations) and ensure counts are accurate

-- ============================================================================
-- FIX THE TRIGGER
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_annotation_count ON ai_annotation_items;

-- Recreate the function with proper handling for INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION update_image_annotation_count()
RETURNS TRIGGER AS $$
DECLARE
  target_image_id TEXT;
BEGIN
  -- Get the image_id from either NEW or OLD record
  -- For DELETE: use OLD (NEW doesn't exist)
  -- For INSERT/UPDATE: use NEW
  IF TG_OP = 'DELETE' THEN
    target_image_id := OLD.image_id;
  ELSE
    target_image_id := NEW.image_id;
  END IF;

  -- Update the annotation count for this image
  -- Count ALL annotation items (not just approved) for admin visibility
  UPDATE images
  SET annotation_count = (
    SELECT COUNT(*)
    FROM ai_annotation_items
    WHERE image_id = target_image_id
  )
  WHERE id::text = target_image_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, and DELETE operations
CREATE TRIGGER trigger_update_annotation_count
  AFTER INSERT OR UPDATE OR DELETE ON ai_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_image_annotation_count();

-- ============================================================================
-- UPDATE EXISTING COUNTS
-- ============================================================================

-- Manually update all existing annotation counts to fix any discrepancies
UPDATE images i
SET annotation_count = COALESCE((
  SELECT COUNT(*)
  FROM ai_annotation_items ai
  WHERE ai.image_id::text = i.id::text
), 0);

-- ============================================================================
-- ADD INDEX FOR BETTER PERFORMANCE
-- ============================================================================

-- Ensure we have an index on image_id for faster counts
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_image_id
  ON ai_annotation_items(image_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_image_annotation_count() IS 'Automatically updates images.annotation_count when annotations are added, modified, or removed';
COMMENT ON TRIGGER trigger_update_annotation_count ON ai_annotation_items IS 'Maintains accurate annotation counts in images table';
