-- ============================================================================
-- Script to check and fix annotation count issues
-- ============================================================================

-- Step 1: Check current annotation counts
SELECT
  'Current State' as step,
  i.id,
  s.english_name,
  i.annotation_count as stored_count,
  COUNT(ai.id) as actual_count,
  (i.annotation_count IS NULL OR i.annotation_count != COUNT(ai.id)) as has_mismatch
FROM images i
LEFT JOIN species s ON i.species_id = s.id
LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
  AND ai.status = 'approved'  -- Only count approved annotations
GROUP BY i.id, s.english_name, i.annotation_count
ORDER BY i.created_at DESC
LIMIT 20;

-- Step 2: Check if trigger exists
SELECT
  'Trigger Check' as step,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_annotation_count'
  AND event_object_table = 'ai_annotation_items';

-- Step 3: Fix the trigger to handle both INSERT and DELETE correctly
DROP TRIGGER IF EXISTS trigger_update_annotation_count ON ai_annotation_items;

CREATE OR REPLACE FUNCTION update_image_annotation_count()
RETURNS TRIGGER AS $$
DECLARE
  target_image_id TEXT;
BEGIN
  -- Get the image_id from either NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    target_image_id := OLD.image_id;
  ELSE
    target_image_id := NEW.image_id;
  END IF;

  -- Update the annotation count for this image
  -- Only count APPROVED annotations
  UPDATE images
  SET annotation_count = (
    SELECT COUNT(*)
    FROM ai_annotation_items
    WHERE image_id = target_image_id
      AND status = 'approved'
  )
  WHERE id::text = target_image_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER trigger_update_annotation_count
  AFTER INSERT OR UPDATE OR DELETE ON ai_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_image_annotation_count();

-- Step 4: Manually update all annotation counts to fix existing data
UPDATE images i
SET annotation_count = (
  SELECT COUNT(*)
  FROM ai_annotation_items ai
  WHERE ai.image_id::text = i.id::text
    AND ai.status = 'approved'
);

-- Step 5: Verify the fix
SELECT
  'After Fix' as step,
  i.id,
  s.english_name,
  i.annotation_count as stored_count,
  COUNT(ai.id) as actual_count,
  (i.annotation_count IS NULL OR i.annotation_count != COUNT(ai.id)) as has_mismatch
FROM images i
LEFT JOIN species s ON i.species_id = s.id
LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
  AND ai.status = 'approved'
GROUP BY i.id, s.english_name, i.annotation_count
ORDER BY i.created_at DESC
LIMIT 20;

-- Step 6: Show summary statistics
SELECT
  'Summary' as step,
  COUNT(*) as total_images,
  SUM(CASE WHEN annotation_count > 0 THEN 1 ELSE 0 END) as images_with_annotations,
  SUM(CASE WHEN annotation_count = 0 OR annotation_count IS NULL THEN 1 ELSE 0 END) as images_without_annotations,
  SUM(annotation_count) as total_annotations
FROM images;
