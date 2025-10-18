-- Migration 012: Normalize Bounding Box Format
-- Created: 2025-10-17
-- Purpose: Convert all bounding boxes to canonical nested format
--
-- CANONICAL FORMAT:
-- { topLeft: {x, y}, bottomRight: {x, y}, width: number, height: number }
--
-- OLD FLAT FORMAT:
-- { x: number, y: number, width: number, height: number }

-- ============================================================================
-- BACKUP ORIGINAL DATA (Safety measure)
-- ============================================================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS annotations_bounding_box_backup AS
SELECT id, bounding_box, updated_at
FROM annotations;

CREATE TABLE IF NOT EXISTS ai_annotation_items_bounding_box_backup AS
SELECT id, bounding_box, updated_at
FROM ai_annotation_items;

-- ============================================================================
-- FUNCTION: Convert flat format to nested format
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_bounding_box(bbox JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    x_val NUMERIC;
    y_val NUMERIC;
    width_val NUMERIC;
    height_val NUMERIC;
BEGIN
    -- If already in nested format (has topLeft key), return as-is
    IF bbox ? 'topLeft' THEN
        RETURN bbox;
    END IF;

    -- If in flat format (has x, y, width, height), convert to nested
    IF bbox ? 'x' AND bbox ? 'y' AND bbox ? 'width' AND bbox ? 'height' THEN
        -- Extract values
        x_val := (bbox->>'x')::NUMERIC;
        y_val := (bbox->>'y')::NUMERIC;
        width_val := (bbox->>'width')::NUMERIC;
        height_val := (bbox->>'height')::NUMERIC;

        -- Build nested format
        result := jsonb_build_object(
            'topLeft', jsonb_build_object('x', x_val, 'y', y_val),
            'bottomRight', jsonb_build_object('x', x_val + width_val, 'y', y_val + height_val),
            'width', width_val,
            'height', height_val
        );

        RETURN result;
    END IF;

    -- If neither format matches, raise error
    RAISE EXCEPTION 'Invalid bounding box format: %', bbox;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- ANALYZE CURRENT DATA
-- ============================================================================

-- Check how many rows need conversion (for logging)
DO $$
DECLARE
    annotations_flat_count INTEGER;
    ai_items_flat_count INTEGER;
    annotations_nested_count INTEGER;
    ai_items_nested_count INTEGER;
    annotations_total INTEGER;
    ai_items_total INTEGER;
BEGIN
    -- Count annotations with flat format (has 'x' key but not 'topLeft')
    SELECT COUNT(*) INTO annotations_flat_count
    FROM annotations
    WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');

    -- Count annotations with nested format (has 'topLeft' key)
    SELECT COUNT(*) INTO annotations_nested_count
    FROM annotations
    WHERE bounding_box ? 'topLeft';

    -- Count total annotations
    SELECT COUNT(*) INTO annotations_total FROM annotations;

    -- Count ai_annotation_items with flat format
    SELECT COUNT(*) INTO ai_items_flat_count
    FROM ai_annotation_items
    WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');

    -- Count ai_annotation_items with nested format
    SELECT COUNT(*) INTO ai_items_nested_count
    FROM ai_annotation_items
    WHERE bounding_box ? 'topLeft';

    -- Count total ai_annotation_items
    SELECT COUNT(*) INTO ai_items_total FROM ai_annotation_items;

    RAISE NOTICE '=== BOUNDING BOX MIGRATION ANALYSIS ===';
    RAISE NOTICE 'annotations table:';
    RAISE NOTICE '  Total rows: %', annotations_total;
    RAISE NOTICE '  Flat format (needs conversion): %', annotations_flat_count;
    RAISE NOTICE '  Nested format (already correct): %', annotations_nested_count;
    RAISE NOTICE '';
    RAISE NOTICE 'ai_annotation_items table:';
    RAISE NOTICE '  Total rows: %', ai_items_total;
    RAISE NOTICE '  Flat format (needs conversion): %', ai_items_flat_count;
    RAISE NOTICE '  Nested format (already correct): %', ai_items_nested_count;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- NORMALIZE ANNOTATIONS TABLE
-- ============================================================================

-- Update all bounding boxes to nested format
UPDATE annotations
SET bounding_box = normalize_bounding_box(bounding_box),
    updated_at = CURRENT_TIMESTAMP
WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');

-- Log results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM annotations
    WHERE bounding_box ? 'topLeft';

    RAISE NOTICE 'annotations: Normalized % rows to nested format', updated_count;
END $$;

-- ============================================================================
-- NORMALIZE AI_ANNOTATION_ITEMS TABLE
-- ============================================================================

-- Update all bounding boxes to nested format
UPDATE ai_annotation_items
SET bounding_box = normalize_bounding_box(bounding_box),
    updated_at = CURRENT_TIMESTAMP
WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');

-- Log results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM ai_annotation_items
    WHERE bounding_box ? 'topLeft';

    RAISE NOTICE 'ai_annotation_items: Normalized % rows to nested format', updated_count;
END $$;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify all bounding boxes are now in nested format
DO $$
DECLARE
    annotations_invalid_count INTEGER;
    ai_items_invalid_count INTEGER;
BEGIN
    -- Check for any remaining flat format
    SELECT COUNT(*) INTO annotations_invalid_count
    FROM annotations
    WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');

    SELECT COUNT(*) INTO ai_items_invalid_count
    FROM ai_annotation_items
    WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');

    IF annotations_invalid_count > 0 THEN
        RAISE WARNING 'annotations: % rows still have invalid format!', annotations_invalid_count;
    ELSE
        RAISE NOTICE 'annotations: ✓ All rows validated - nested format confirmed';
    END IF;

    IF ai_items_invalid_count > 0 THEN
        RAISE WARNING 'ai_annotation_items: % rows still have invalid format!', ai_items_invalid_count;
    ELSE
        RAISE NOTICE 'ai_annotation_items: ✓ All rows validated - nested format confirmed';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'All bounding boxes normalized to canonical format:';
    RAISE NOTICE '{ topLeft: {x, y}, bottomRight: {x, y}, width, height }';
    RAISE NOTICE '';
    RAISE NOTICE 'Backup tables created:';
    RAISE NOTICE '  - annotations_bounding_box_backup';
    RAISE NOTICE '  - ai_annotation_items_bounding_box_backup';
END $$;

-- ============================================================================
-- CLEANUP FUNCTION (Optional - run separately after validation)
-- ============================================================================

-- To drop backup tables after confirming migration success:
-- DROP TABLE IF EXISTS annotations_bounding_box_backup;
-- DROP TABLE IF EXISTS ai_annotation_items_bounding_box_backup;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION normalize_bounding_box(JSONB) IS
'Converts flat bounding box format {x, y, width, height} to nested format {topLeft: {x, y}, bottomRight: {x, y}, width, height}. Idempotent - returns nested format unchanged.';

COMMENT ON TABLE annotations_bounding_box_backup IS
'Backup of original bounding_box values before normalization (Migration 012). Drop after validation.';

COMMENT ON TABLE ai_annotation_items_bounding_box_backup IS
'Backup of original bounding_box values before normalization (Migration 012). Drop after validation.';
