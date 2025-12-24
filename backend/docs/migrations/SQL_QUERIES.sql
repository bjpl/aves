-- ============================================================================
-- PRODUCTION MIGRATION SQL QUERIES
-- Status: READY FOR EXECUTION (After Review & Approval)
-- Created: 2025-10-17
-- ============================================================================

-- ============================================================================
-- PRE-EXECUTION IMPACT ANALYSIS
-- Run these queries BEFORE executing migrations to understand impact
-- ============================================================================

-- QUERY 1: Check bounding box format distribution
-- Purpose: See how many rows need conversion
SELECT
  'annotations' as table_name,
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) AS flat_format_needs_conversion,
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') AS already_nested_format,
  COUNT(*) AS total_rows,
  pg_size_pretty(pg_relation_size('annotations')) AS table_size
FROM annotations
UNION ALL
SELECT
  'ai_annotation_items',
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')),
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft'),
  COUNT(*),
  pg_size_pretty(pg_relation_size('ai_annotation_items'))
FROM ai_annotation_items;

-- QUERY 2: Check disk space needed for backup tables
-- Purpose: Ensure sufficient disk space available
SELECT
  pg_size_pretty(
    pg_relation_size('annotations') +
    pg_relation_size('ai_annotation_items')
  ) AS backup_disk_space_needed,
  pg_size_pretty(pg_database_size(current_database())) AS current_db_size;

-- QUERY 3: Sample current bounding box formats
-- Purpose: Review actual data before migration
SELECT
  'annotations' as source,
  id,
  bounding_box,
  CASE
    WHEN bounding_box ? 'topLeft' THEN 'nested (correct)'
    WHEN bounding_box ? 'x' THEN 'flat (needs conversion)'
    ELSE 'unknown format'
  END as format_status
FROM annotations
LIMIT 5;

-- QUERY 4: Verify admin user exists
-- Purpose: Check if target user is ready for admin role
-- NOTE: Replace 'your-email@example.com' with actual email before running
SELECT
  id,
  email,
  created_at,
  confirmed_at,
  raw_user_meta_data,
  raw_app_metadata
FROM auth.users
WHERE email = 'your-email@example.com';
-- Expected: 1 row returned, confirmed_at should not be NULL

-- QUERY 5: Check current admin users
-- Purpose: See who already has admin role
SELECT
  email,
  raw_user_meta_data->>'role' as user_meta_role,
  raw_app_metadata->>'role' as app_meta_role,
  created_at
FROM auth.users
WHERE
  raw_user_meta_data->>'role' = 'admin'
  OR raw_app_metadata->>'role' = 'admin'
ORDER BY created_at;

-- ============================================================================
-- MIGRATION 1: BOUNDING BOX NORMALIZATION
-- Execution: Run via shell script (./run-bounding-box-migration.sh)
-- NOTE: This SQL is in /backend/src/database/migrations/012_normalize_bounding_box_format.sql
-- ============================================================================

-- The script automatically executes:
-- 1. Creates backup tables
-- 2. Defines normalize_bounding_box() function
-- 3. Analyzes current data
-- 4. Updates both tables
-- 5. Validates results

-- DO NOT run this SQL directly - use the shell script instead:
-- cd /backend/scripts/
-- ./run-bounding-box-migration.sh

-- ============================================================================
-- MIGRATION 2: ADMIN USER SETUP
-- Execution: Run manually in Supabase SQL Editor
-- ============================================================================

-- OPTION 1: Set admin role via user metadata (RECOMMENDED)
-- Replace 'your-email@example.com' with actual admin user email
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-email@example.com';
-- Expected output: UPDATE 1

-- OPTION 2: Set admin role via app metadata (ALTERNATIVE)
-- Uncomment and use if your application reads from app_metadata instead
/*
UPDATE auth.users
SET raw_app_metadata = jsonb_set(
  COALESCE(raw_app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-email@example.com';
*/

-- OPTION 3: Grant admin to multiple users at once
-- Uncomment and modify email list as needed
/*
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email IN (
  'admin1@yourcompany.com',
  'admin2@yourcompany.com',
  'admin3@yourcompany.com'
);
*/

-- ============================================================================
-- POST-EXECUTION VALIDATION QUERIES
-- Run these AFTER executing migrations to verify success
-- ============================================================================

-- VALIDATION 1: Verify bounding box migration success
-- Expected result: 0 invalid rows for both tables
SELECT
  'annotations' as table_name,
  COUNT(*) as invalid_rows_remaining
FROM annotations
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight')
UNION ALL
SELECT
  'ai_annotation_items',
  COUNT(*)
FROM ai_annotation_items
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');
-- Expected: Both counts should be 0

-- VALIDATION 2: Verify backup tables were created
-- Expected result: Row counts should match original tables
SELECT
  'annotations' as table_name,
  (SELECT COUNT(*) FROM annotations) as current_count,
  (SELECT COUNT(*) FROM annotations_bounding_box_backup) as backup_count
UNION ALL
SELECT
  'ai_annotation_items',
  (SELECT COUNT(*) FROM ai_annotation_items),
  (SELECT COUNT(*) FROM ai_annotation_items_bounding_box_backup);
-- Expected: current_count = backup_count for both tables

-- VALIDATION 3: Sample comparison old vs new format
-- Purpose: Verify conversion correctness
SELECT
  a.id,
  b.bounding_box as old_flat_format,
  a.bounding_box as new_nested_format,
  -- Verify calculation correctness
  (b.bounding_box->>'x')::numeric + (b.bounding_box->>'width')::numeric as expected_bottomRight_x,
  (a.bounding_box->'bottomRight'->>'x')::numeric as actual_bottomRight_x
FROM annotations a
JOIN annotations_bounding_box_backup b ON a.id = b.id
LIMIT 10;
-- Expected: expected_bottomRight_x should equal actual_bottomRight_x

-- VALIDATION 4: Verify admin role was set
-- Replace 'your-email@example.com' with actual email
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as user_meta_role,
  raw_app_metadata->>'role' as app_meta_role
FROM auth.users
WHERE email = 'your-email@example.com';
-- Expected: user_meta_role = 'admin' (or app_meta_role if you used option 2)

-- VALIDATION 5: List all admin users after migration
SELECT
  email,
  raw_user_meta_data->>'role' as role,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE
  raw_user_meta_data->>'role' = 'admin'
  OR raw_app_metadata->>'role' = 'admin'
ORDER BY created_at;

-- ============================================================================
-- ROLLBACK PROCEDURES
-- Use these if issues are detected after migration
-- ============================================================================

-- ROLLBACK 1: Restore bounding boxes from backup tables
-- WARNING: Only run if migration failed or caused issues
BEGIN;

-- Restore annotations table
UPDATE annotations a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM annotations_bounding_box_backup b
WHERE a.id = b.id;

-- Verify restore
SELECT COUNT(*) FROM annotations WHERE bounding_box ? 'x';
-- Should show rows back in flat format

-- Restore ai_annotation_items table
UPDATE ai_annotation_items a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM ai_annotation_items_bounding_box_backup b
WHERE a.id = b.id;

-- Verify restore
SELECT COUNT(*) FROM ai_annotation_items WHERE bounding_box ? 'x';

-- COMMIT only if verification passes
COMMIT;
-- If issues detected, run: ROLLBACK;

-- ROLLBACK 2: Remove admin role from user
-- Replace email with user to remove admin from
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'user@example.com';

-- Verify removal
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'user@example.com';
-- Expected: role should be NULL

-- ROLLBACK 3: Remove admin role from multiple users
-- Uncomment if you need to remove admin from multiple users
/*
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email IN (
  'user1@example.com',
  'user2@example.com'
);
*/

-- ============================================================================
-- CLEANUP PROCEDURES
-- Run these 24-48 hours after successful migration validation
-- ============================================================================

-- CLEANUP 1: Drop backup tables (after 24-48h validation period)
-- WARNING: Only run after confirming migration success
-- IMPORTANT: Cannot undo this operation - backups will be permanently deleted
DROP TABLE IF EXISTS annotations_bounding_box_backup;
DROP TABLE IF EXISTS ai_annotation_items_bounding_box_backup;

-- Verify cleanup
SELECT tablename
FROM pg_tables
WHERE tablename LIKE '%bounding_box_backup%';
-- Expected: No rows returned

-- CLEANUP 2: Optional - Drop migration function
-- Only if you don't plan to use it again
-- DROP FUNCTION IF EXISTS normalize_bounding_box(JSONB);

-- ============================================================================
-- MONITORING QUERIES
-- Use these during and after migration to monitor system health
-- ============================================================================

-- MONITOR 1: Check active database connections
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_queries
FROM pg_stat_activity
WHERE datname = current_database();

-- MONITOR 2: Check for blocking locks
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- MONITOR 3: Check table sizes before and after
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename IN (
  'annotations',
  'ai_annotation_items',
  'annotations_bounding_box_backup',
  'ai_annotation_items_bounding_box_backup'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- MONITOR 4: Check database statistics
SELECT
  numbackends as connections,
  xact_commit as committed_transactions,
  xact_rollback as rolled_back_transactions,
  blks_read as disk_blocks_read,
  blks_hit as cache_blocks_hit,
  tup_returned as rows_returned,
  tup_fetched as rows_fetched,
  tup_inserted as rows_inserted,
  tup_updated as rows_updated,
  tup_deleted as rows_deleted
FROM pg_stat_database
WHERE datname = current_database();

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- TROUBLESHOOT 1: Find rows with unexpected bounding box formats
SELECT
  'annotations' as table_name,
  id,
  bounding_box,
  jsonb_typeof(bounding_box) as bbox_type,
  jsonb_object_keys(bounding_box) as bbox_keys
FROM annotations
WHERE
  NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight')
  AND NOT (bounding_box ? 'x' AND bounding_box ? 'y')
LIMIT 10;

-- TROUBLESHOOT 2: Check for NULL or missing bounding boxes
SELECT
  'annotations' as table_name,
  COUNT(*) as null_or_empty_bbox
FROM annotations
WHERE bounding_box IS NULL OR bounding_box = '{}'::jsonb
UNION ALL
SELECT
  'ai_annotation_items',
  COUNT(*)
FROM ai_annotation_items
WHERE bounding_box IS NULL OR bounding_box = '{}'::jsonb;

-- TROUBLESHOOT 3: Verify function exists and is accessible
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'normalize_bounding_box';
-- Expected: 1 row showing function with jsonb return type

-- TROUBLESHOOT 4: Check for users without email (edge case)
SELECT
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE email IS NULL OR email = '';

-- ============================================================================
-- END OF SQL QUERIES
-- ============================================================================

-- IMPORTANT REMINDERS:
-- 1. Always run impact analysis queries FIRST
-- 2. Create external database backup before execution
-- 3. Test in staging environment first
-- 4. Obtain all required approvals
-- 5. Have rollback queries ready before execution
-- 6. Monitor system during migration
-- 7. Validate thoroughly after migration
-- 8. Wait 24-48 hours before cleanup

-- For complete procedures and safety guidelines, see:
-- - /backend/docs/migrations/PRODUCTION_MIGRATION_PLAN.md
-- - /backend/docs/migrations/EXECUTION_REPORT.md
-- - /backend/docs/migrations/QUICK_REFERENCE.md
