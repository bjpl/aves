-- Migration 026: Remove Duplicate Species
-- Created: 2025-12-14
-- Purpose: Identify and merge duplicate species entries, preserving data integrity
-- CRITICAL: This migration handles cases where the same species exists multiple times
--          with different IDs, which can cause confusion and data fragmentation.

-- ============================================================================
-- STEP 1: Create temporary logging table
-- ============================================================================

CREATE TEMPORARY TABLE duplicate_species_log (
  operation_id SERIAL PRIMARY KEY,
  duplicate_id UUID NOT NULL,
  kept_id UUID NOT NULL,
  english_name VARCHAR(255),
  scientific_name VARCHAR(255),
  duplicate_image_count BIGINT,
  kept_image_count BIGINT,
  images_reassigned BIGINT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE duplicate_species_log IS 'Temporary log of duplicate species merge operations';

-- ============================================================================
-- STEP 2: Create function to merge duplicate species
-- ============================================================================

CREATE OR REPLACE FUNCTION merge_duplicate_species()
RETURNS TABLE(
  english_name VARCHAR(255),
  kept_id UUID,
  duplicate_ids UUID[],
  total_images_reassigned BIGINT
) AS $$
DECLARE
  duplicate_record RECORD;
  kept_record RECORD;
  reassigned_count BIGINT;
BEGIN
  -- Find duplicates by english_name (case-insensitive)
  FOR duplicate_record IN
    SELECT
      LOWER(s.english_name) as name_lower,
      array_agg(s.id ORDER BY
        -- Prioritization: most images > most annotations > oldest record
        (SELECT COUNT(*) FROM images WHERE species_id = s.id) DESC,
        (SELECT COALESCE(SUM(annotation_count), 0) FROM images WHERE species_id = s.id) DESC,
        s.created_at ASC
      ) as species_ids,
      array_agg(s.english_name ORDER BY s.id) as names
    FROM species s
    GROUP BY LOWER(s.english_name)
    HAVING COUNT(*) > 1
  LOOP
    -- The first ID in the sorted array is the one we keep
    kept_record := (
      SELECT id, english_name, scientific_name,
             (SELECT COUNT(*) FROM images WHERE species_id = species.id) as image_count
      FROM species
      WHERE id = duplicate_record.species_ids[1]
    );

    -- Process each duplicate (skip the first one, which we're keeping)
    FOR i IN 2..array_length(duplicate_record.species_ids, 1) LOOP
      DECLARE
        dup_id UUID := duplicate_record.species_ids[i];
        dup_info RECORD;
      BEGIN
        -- Get duplicate info
        SELECT id, english_name, scientific_name,
               (SELECT COUNT(*) FROM images WHERE species_id = species.id) as image_count
        INTO dup_info
        FROM species
        WHERE id = dup_id;

        -- Reassign all images from duplicate to kept species
        UPDATE images
        SET species_id = kept_record.id,
            updated_at = CURRENT_TIMESTAMP
        WHERE species_id = dup_id;

        GET DIAGNOSTICS reassigned_count = ROW_COUNT;

        -- Log the merge operation
        INSERT INTO duplicate_species_log (
          duplicate_id, kept_id, english_name, scientific_name,
          duplicate_image_count, kept_image_count, images_reassigned
        ) VALUES (
          dup_id, kept_record.id, dup_info.english_name, dup_info.scientific_name,
          dup_info.image_count, kept_record.image_count, reassigned_count
        );

        -- Delete the duplicate species
        DELETE FROM species WHERE id = dup_id;

        RAISE NOTICE 'Merged duplicate species: % (ID: %) into % (ID: %). Reassigned % images.',
          dup_info.english_name, dup_id, kept_record.english_name, kept_record.id, reassigned_count;
      END;
    END LOOP;

    -- Return summary for this group
    RETURN QUERY
    SELECT
      kept_record.english_name::VARCHAR(255),
      kept_record.id,
      duplicate_record.species_ids[2:array_length(duplicate_record.species_ids, 1)],
      (SELECT SUM(images_reassigned) FROM duplicate_species_log WHERE kept_id = kept_record.id)::BIGINT;
  END LOOP;

  -- Also check for duplicates by scientific_name
  FOR duplicate_record IN
    SELECT
      LOWER(s.scientific_name) as sci_name_lower,
      array_agg(s.id ORDER BY
        (SELECT COUNT(*) FROM images WHERE species_id = s.id) DESC,
        (SELECT COALESCE(SUM(annotation_count), 0) FROM images WHERE species_id = s.id) DESC,
        s.created_at ASC
      ) as species_ids,
      array_agg(s.english_name ORDER BY s.id) as names
    FROM species s
    WHERE NOT EXISTS (
      -- Skip if already processed by english_name
      SELECT 1 FROM duplicate_species_log WHERE duplicate_id = s.id OR kept_id = s.id
    )
    GROUP BY LOWER(s.scientific_name)
    HAVING COUNT(*) > 1
  LOOP
    kept_record := (
      SELECT id, english_name, scientific_name,
             (SELECT COUNT(*) FROM images WHERE species_id = species.id) as image_count
      FROM species
      WHERE id = duplicate_record.species_ids[1]
    );

    FOR i IN 2..array_length(duplicate_record.species_ids, 1) LOOP
      DECLARE
        dup_id UUID := duplicate_record.species_ids[i];
        dup_info RECORD;
      BEGIN
        SELECT id, english_name, scientific_name,
               (SELECT COUNT(*) FROM images WHERE species_id = species.id) as image_count
        INTO dup_info
        FROM species
        WHERE id = dup_id;

        UPDATE images
        SET species_id = kept_record.id,
            updated_at = CURRENT_TIMESTAMP
        WHERE species_id = dup_id;

        GET DIAGNOSTICS reassigned_count = ROW_COUNT;

        INSERT INTO duplicate_species_log (
          duplicate_id, kept_id, english_name, scientific_name,
          duplicate_image_count, kept_image_count, images_reassigned
        ) VALUES (
          dup_id, kept_record.id, dup_info.english_name, dup_info.scientific_name,
          dup_info.image_count, kept_record.image_count, reassigned_count
        );

        DELETE FROM species WHERE id = dup_id;

        RAISE NOTICE 'Merged duplicate species by scientific name: % (ID: %) into % (ID: %). Reassigned % images.',
          dup_info.scientific_name, dup_id, kept_record.scientific_name, kept_record.id, reassigned_count;
      END;
    END LOOP;

    RETURN QUERY
    SELECT
      kept_record.english_name::VARCHAR(255),
      kept_record.id,
      duplicate_record.species_ids[2:array_length(duplicate_record.species_ids, 1)],
      (SELECT SUM(images_reassigned) FROM duplicate_species_log WHERE kept_id = kept_record.id)::BIGINT;
  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Execute the merge operation
-- ============================================================================

DO $$
DECLARE
  merge_result RECORD;
  total_duplicates INTEGER := 0;
  total_images_moved BIGINT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting duplicate species cleanup';
  RAISE NOTICE '========================================';

  -- Execute merge and collect results
  FOR merge_result IN SELECT * FROM merge_duplicate_species() LOOP
    total_duplicates := total_duplicates + array_length(merge_result.duplicate_ids, 1);
    total_images_moved := total_images_moved + COALESCE(merge_result.total_images_reassigned, 0);
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Duplicate cleanup complete';
  RAISE NOTICE 'Total duplicate species removed: %', total_duplicates;
  RAISE NOTICE 'Total images reassigned: %', total_images_moved;
  RAISE NOTICE '========================================';

  -- Display detailed log
  IF total_duplicates > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Detailed merge log:';
    FOR merge_result IN
      SELECT
        english_name,
        scientific_name,
        duplicate_id,
        kept_id,
        images_reassigned,
        timestamp
      FROM duplicate_species_log
      ORDER BY timestamp
    LOOP
      RAISE NOTICE '  • Merged "%" (%) - % images moved from % to %',
        merge_result.english_name,
        merge_result.scientific_name,
        merge_result.images_reassigned,
        merge_result.duplicate_id,
        merge_result.kept_id;
    END LOOP;
  ELSE
    RAISE NOTICE 'No duplicate species found - database is clean!';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Cleanup
-- ============================================================================

-- Drop the temporary function (no longer needed)
DROP FUNCTION IF EXISTS merge_duplicate_species();

-- Note: duplicate_species_log table will be automatically dropped at end of transaction
-- since it's a TEMPORARY table

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify no duplicates remain by english_name
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(english_name) as name_lower
    FROM species
    GROUP BY LOWER(english_name)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'WARNING: % duplicate english_name entries still exist!', duplicate_count;
  ELSE
    RAISE NOTICE '✓ Verification passed: No duplicate english_name entries';
  END IF;
END $$;

-- Verify no duplicates remain by scientific_name
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(scientific_name) as name_lower
    FROM species
    GROUP BY LOWER(scientific_name)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'WARNING: % duplicate scientific_name entries still exist!', duplicate_count;
  ELSE
    RAISE NOTICE '✓ Verification passed: No duplicate scientific_name entries';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK NOTES
-- ============================================================================

-- IMPORTANT: This migration is NOT easily reversible because:
-- 1. Duplicate species records are permanently deleted
-- 2. Images are reassigned to the "kept" species
-- 3. The original duplicate IDs are lost
--
-- However, if you need to rollback:
-- 1. Restore from a database backup taken before this migration
-- 2. The duplicate_species_log table (if exported) contains details of what was merged
--
-- To prevent future duplicates, consider adding a unique constraint:
-- ALTER TABLE species ADD CONSTRAINT unique_english_name_lower
--   EXCLUDE USING btree (LOWER(english_name) WITH =);
