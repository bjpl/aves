-- Script to Check for Duplicate Species
-- Purpose: Identify duplicate species before running the migration
-- Usage: psql -d aves -f check-duplicate-species.sql

\echo '========================================'
\echo 'Duplicate Species Detection Report'
\echo '========================================'
\echo ''

-- Check duplicates by english_name
\echo '1. Duplicates by English Name:'
\echo '--------------------------------'
SELECT
  english_name,
  COUNT(*) as count,
  array_agg(id ORDER BY id) as species_ids,
  array_agg(
    (SELECT COUNT(*) FROM images WHERE species_id = s.id)
    ORDER BY id
  ) as image_counts,
  array_agg(
    (SELECT COALESCE(SUM(annotation_count), 0) FROM images WHERE species_id = s.id)
    ORDER BY id
  ) as annotation_counts,
  array_agg(created_at ORDER BY id) as created_dates
FROM species s
GROUP BY english_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

\echo ''
\echo '2. Duplicates by Scientific Name:'
\echo '----------------------------------'
SELECT
  scientific_name,
  COUNT(*) as count,
  array_agg(english_name ORDER BY id) as english_names,
  array_agg(id ORDER BY id) as species_ids,
  array_agg(
    (SELECT COUNT(*) FROM images WHERE species_id = s.id)
    ORDER BY id
  ) as image_counts
FROM species s
GROUP BY scientific_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

\echo ''
\echo '3. Total Species Count:'
\echo '------------------------'
SELECT COUNT(*) as total_species FROM species;

\echo ''
\echo '4. Total Images Count:'
\echo '----------------------'
SELECT COUNT(*) as total_images FROM images;

\echo ''
\echo '5. Orphaned Images (species not found):'
\echo '----------------------------------------'
SELECT COUNT(*) as orphaned_images
FROM images i
WHERE NOT EXISTS (SELECT 1 FROM species s WHERE s.id = i.species_id);

\echo ''
\echo '========================================'
