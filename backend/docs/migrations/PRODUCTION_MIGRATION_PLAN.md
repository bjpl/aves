# Production Database Migration Plan

**Document Version:** 1.0
**Created:** 2025-10-17
**Status:** DRY-RUN DOCUMENTATION - NOT EXECUTED
**Author:** Backend API Developer Agent

---

## Executive Summary

This document provides a comprehensive execution plan for two critical production database operations:

1. **Bounding Box Format Migration** - Normalizes all bounding box data to canonical nested format
2. **Admin User Setup** - Grants administrative privileges to specified users

**CRITICAL:** This is a DRY-RUN documentation. No migrations have been executed. Manual review and approval required before production execution.

---

## Migration 1: Bounding Box Format Normalization

### Overview

**Purpose:** Convert all bounding boxes from flat format to canonical nested format
**Script Location:** `/backend/scripts/run-bounding-box-migration.sh`
**SQL Migration:** `/backend/src/database/migrations/012_normalize_bounding_box_format.sql`
**Risk Level:** MEDIUM (Data transformation with automatic backup)
**Reversibility:** HIGH (Backup tables created automatically)

### Current Format vs Target Format

**OLD (Flat) Format:**
```json
{
  "x": 100,
  "y": 50,
  "width": 200,
  "height": 150
}
```

**NEW (Nested) Format:**
```json
{
  "topLeft": { "x": 100, "y": 50 },
  "bottomRight": { "x": 300, "y": 200 },
  "width": 200,
  "height": 150
}
```

### Database Impact Assessment

#### Tables Affected

1. **annotations**
   - Column: `bounding_box` (JSONB)
   - Query to check current format distribution:
     ```sql
     SELECT
       COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) AS flat_format,
       COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') AS nested_format,
       COUNT(*) AS total
     FROM annotations;
     ```

2. **ai_annotation_items**
   - Column: `bounding_box` (JSONB)
   - Query to check current format distribution:
     ```sql
     SELECT
       COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) AS flat_format,
       COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') AS nested_format,
       COUNT(*) AS total
     FROM ai_annotation_items;
     ```

#### Backup Tables Created

The migration creates two backup tables automatically:

1. **annotations_bounding_box_backup**
   - Stores: `id`, `bounding_box`, `updated_at`
   - Purpose: Rollback capability for annotations table
   - Retention: Drop after 24-48 hours of validation

2. **ai_annotation_items_bounding_box_backup**
   - Stores: `id`, `bounding_box`, `updated_at`
   - Purpose: Rollback capability for ai_annotation_items table
   - Retention: Drop after 24-48 hours of validation

### SQL Operations Executed

The migration performs the following operations in sequence:

#### 1. Create Backup Tables
```sql
CREATE TABLE IF NOT EXISTS annotations_bounding_box_backup AS
SELECT id, bounding_box, updated_at
FROM annotations;

CREATE TABLE IF NOT EXISTS ai_annotation_items_bounding_box_backup AS
SELECT id, bounding_box, updated_at
FROM ai_annotation_items;
```

#### 2. Create Normalization Function
```sql
CREATE OR REPLACE FUNCTION normalize_bounding_box(bbox JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    x_val NUMERIC;
    y_val NUMERIC;
    width_val NUMERIC;
    height_val NUMERIC;
BEGIN
    -- If already in nested format, return as-is (idempotent)
    IF bbox ? 'topLeft' THEN
        RETURN bbox;
    END IF;

    -- Convert flat format to nested
    IF bbox ? 'x' AND bbox ? 'y' AND bbox ? 'width' AND bbox ? 'height' THEN
        x_val := (bbox->>'x')::NUMERIC;
        y_val := (bbox->>'y')::NUMERIC;
        width_val := (bbox->>'width')::NUMERIC;
        height_val := (bbox->>'height')::NUMERIC;

        result := jsonb_build_object(
            'topLeft', jsonb_build_object('x', x_val, 'y', y_val),
            'bottomRight', jsonb_build_object('x', x_val + width_val, 'y', y_val + height_val),
            'width', width_val,
            'height', height_val
        );
        RETURN result;
    END IF;

    RAISE EXCEPTION 'Invalid bounding box format: %', bbox;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Function Properties:**
- Idempotent: Can be run multiple times safely
- Immutable: Pure function with no side effects
- Error handling: Raises exception for invalid formats

#### 3. Pre-Migration Analysis
```sql
-- Analysis query executed during migration (outputs via RAISE NOTICE)
SELECT
  (SELECT COUNT(*) FROM annotations WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as annotations_flat,
  (SELECT COUNT(*) FROM annotations WHERE bounding_box ? 'topLeft') as annotations_nested,
  (SELECT COUNT(*) FROM annotations) as annotations_total,
  (SELECT COUNT(*) FROM ai_annotation_items WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as ai_items_flat,
  (SELECT COUNT(*) FROM ai_annotation_items WHERE bounding_box ? 'topLeft') as ai_items_nested,
  (SELECT COUNT(*) FROM ai_annotation_items) as ai_items_total;
```

#### 4. Data Transformation
```sql
-- Update annotations table
UPDATE annotations
SET bounding_box = normalize_bounding_box(bounding_box),
    updated_at = CURRENT_TIMESTAMP
WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');

-- Update ai_annotation_items table
UPDATE ai_annotation_items
SET bounding_box = normalize_bounding_box(bounding_box),
    updated_at = CURRENT_TIMESTAMP
WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft');
```

**Update Characteristics:**
- Selective: Only updates rows in flat format
- Timestamp tracking: Updates `updated_at` for audit trail
- Idempotent: Safe to run multiple times

#### 5. Post-Migration Validation
```sql
-- Verify all rows are in nested format
SELECT COUNT(*)
FROM annotations
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');

SELECT COUNT(*)
FROM ai_annotation_items
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');
```

**Expected Result:** Both queries should return 0

### Estimated Impact

**Query to estimate rows affected:**
```sql
SELECT
  'annotations' as table_name,
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as rows_to_update,
  pg_size_pretty(pg_relation_size('annotations')) as current_size
FROM annotations
UNION ALL
SELECT
  'ai_annotation_items' as table_name,
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as rows_to_update,
  pg_size_pretty(pg_relation_size('ai_annotation_items')) as current_size
FROM ai_annotation_items;
```

**Expected Duration:**
- Small dataset (<1000 rows): < 1 second
- Medium dataset (1000-10000 rows): 1-5 seconds
- Large dataset (>10000 rows): 5-30 seconds

**Database Locks:**
- Row-level locks during UPDATE operations
- Brief table-level lock during backup table creation
- No downtime required (online migration)

### Pre-Flight Checklist

Before executing this migration, verify:

- [ ] Database backup completed (external to this migration)
- [ ] Database connection credentials are correct
- [ ] Current user has UPDATE and CREATE TABLE privileges
- [ ] Sufficient disk space for backup tables (approximately 2x current table size)
- [ ] Application can handle both formats during transition (backward compatibility)
- [ ] Peak traffic hours avoided (recommended: off-peak execution)
- [ ] Database monitoring enabled to track performance
- [ ] Rollback procedure reviewed and understood

### Safety Features

1. **Automatic Backups:** Creates backup tables before any modifications
2. **Idempotent Function:** Safe to run multiple times without data corruption
3. **Error Handling:** Transaction will rollback on any errors (ON_ERROR_STOP=1)
4. **Validation:** Automatic post-migration validation checks
5. **Selective Updates:** Only updates rows that need conversion
6. **User Confirmation:** Script requires "yes" confirmation before execution

### Execution Procedure

**From:** `/backend/scripts/` directory

```bash
# Step 1: Navigate to scripts directory
cd /path/to/backend/scripts/

# Step 2: Review the script one more time
cat run-bounding-box-migration.sh

# Step 3: Execute migration script
./run-bounding-box-migration.sh

# Step 4: Confirm when prompted
# Enter: yes
```

**Script will:**
1. Load environment variables from `../.env`
2. Validate database credentials
3. Display connection information
4. Request user confirmation
5. Execute SQL migration file
6. Display results and next steps

### Environment Variables Required

The script requires these variables in `/backend/.env`:

```env
DB_HOST=your-supabase-project.supabase.co
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-database-password
DB_PORT=5432  # Optional, defaults to 5432
```

### Post-Migration Validation

After migration execution, perform these validations:

#### 1. Database Validation
```sql
-- Verify no rows remain in flat format
SELECT
  'annotations' as table_name,
  COUNT(*) as invalid_rows
FROM annotations
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight')
UNION ALL
SELECT
  'ai_annotation_items' as table_name,
  COUNT(*) as invalid_rows
FROM ai_annotation_items
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');
-- Expected: 0 invalid_rows for both tables

-- Verify backup tables exist and have data
SELECT
  'annotations_bounding_box_backup' as backup_table,
  COUNT(*) as rows_backed_up
FROM annotations_bounding_box_backup
UNION ALL
SELECT
  'ai_annotation_items_bounding_box_backup' as backup_table,
  COUNT(*) as rows_backed_up
FROM ai_annotation_items_bounding_box_backup;

-- Sample check: Verify transformation correctness
SELECT
  a.id,
  b.bounding_box as old_format,
  a.bounding_box as new_format
FROM annotations a
JOIN annotations_bounding_box_backup b ON a.id = b.id
LIMIT 5;
```

#### 2. Application Validation
- [ ] Load existing annotations in the application UI
- [ ] Verify bounding boxes render correctly
- [ ] Test annotation creation workflow
- [ ] Test annotation editing workflow
- [ ] Test AI annotation generation
- [ ] Check for JavaScript console errors
- [ ] Verify API responses contain correct format

#### 3. Performance Validation
```sql
-- Check for any performance impact
EXPLAIN ANALYZE
SELECT * FROM annotations
WHERE bounding_box ? 'topLeft'
LIMIT 100;
```

### Rollback Procedure

If issues are detected after migration:

#### Option 1: Restore from Backup Tables (Recommended)
```sql
-- Restore annotations table
BEGIN;

UPDATE annotations a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM annotations_bounding_box_backup b
WHERE a.id = b.id;

-- Verify rollback
SELECT COUNT(*) FROM annotations WHERE bounding_box ? 'x';
-- Should match original flat format count

COMMIT;  -- Only if verification passes

-- Restore ai_annotation_items table
BEGIN;

UPDATE ai_annotation_items a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM ai_annotation_items_bounding_box_backup b
WHERE a.id = b.id;

COMMIT;
```

#### Option 2: Restore from External Backup
If backup tables are unavailable, restore from your external database backup.

### Cleanup Procedure

After 24-48 hours of successful validation:

```sql
-- Drop backup tables
DROP TABLE IF EXISTS annotations_bounding_box_backup;
DROP TABLE IF EXISTS ai_annotation_items_bounding_box_backup;

-- Drop migration function (optional, can be kept for future use)
-- DROP FUNCTION IF EXISTS normalize_bounding_box(JSONB);
```

---

## Migration 2: Admin User Setup

### Overview

**Purpose:** Grant administrative privileges to specified users
**Script Location:** `/backend/scripts/set-admin.sql`
**Execution Method:** Manual execution in Supabase SQL Editor
**Risk Level:** LOW (Single user update)
**Reversibility:** HIGH (Simple UPDATE to remove role)

### SQL Commands

The migration provides two approaches for setting admin role:

#### Option 1: User Metadata (Recommended for Development)
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-email@example.com';
```

#### Option 2: Application Metadata (Alternative)
```sql
UPDATE auth.users
SET raw_app_metadata = jsonb_set(
  COALESCE(raw_app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-email@example.com';
```

#### Verification Query
```sql
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as user_role,
  raw_app_metadata->>'role' as app_role
FROM auth.users
WHERE email = 'your-email@example.com';
```

### Execution Procedure

**IMPORTANT:** This must be executed manually in the Supabase SQL Editor for security reasons.

#### Step-by-Step Instructions

1. **Log into Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Prepare the Query**
   - Copy the desired option from above (Option 1 recommended)
   - Replace `'your-email@example.com'` with the actual admin user email
   - Example:
     ```sql
     UPDATE auth.users
     SET raw_user_meta_data = jsonb_set(
       COALESCE(raw_user_meta_data, '{}'::jsonb),
       '{role}',
       '"admin"'::jsonb
     )
     WHERE email = 'admin@yourcompany.com';
     ```

4. **Execute the Query**
   - Click "Run" or press Ctrl+Enter
   - Verify: "Success. 1 rows affected." message

5. **Verify the Update**
   - Run the verification query:
     ```sql
     SELECT
       id,
       email,
       raw_user_meta_data->>'role' as user_role,
       raw_app_metadata->>'role' as app_role
     FROM auth.users
     WHERE email = 'admin@yourcompany.com';
     ```
   - Expected result: `user_role` column shows "admin"

6. **Test in Application**
   - Log out if currently logged in
   - Log in with the admin user
   - Verify admin features are accessible

### Database Impact

- **Table:** `auth.users`
- **Rows Affected:** 1 (per execution)
- **Columns Modified:** `raw_user_meta_data` or `raw_app_metadata`
- **Lock Type:** Row-level lock (brief)
- **Downtime:** None

### Pre-Flight Checklist

- [ ] User account exists in `auth.users` table
- [ ] User email is verified and correct
- [ ] Application code checks for admin role in user metadata
- [ ] You have SUPERUSER or table UPDATE privileges
- [ ] Backup of auth.users table completed (optional but recommended)

### Granting Admin to Multiple Users

To grant admin role to multiple users at once:

```sql
-- Option 1: Update multiple specific emails
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

-- Verify
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email IN (
  'admin1@yourcompany.com',
  'admin2@yourcompany.com',
  'admin3@yourcompany.com'
);
```

### Removing Admin Role

To revoke admin privileges:

```sql
-- Remove admin role from user metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'user@example.com';

-- Verify removal
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'user@example.com';
-- Expected: role column is NULL or empty
```

### Security Considerations

1. **Never execute via automated scripts:** This prevents accidental privilege escalation
2. **Audit trail:** Document who was granted admin and when
3. **Principle of least privilege:** Only grant admin to users who absolutely need it
4. **Regular review:** Periodically audit admin users and remove unnecessary access
5. **Two-factor authentication:** Ensure admin users have 2FA enabled

### Troubleshooting

#### User Not Found
```sql
-- Check if user exists
SELECT id, email, created_at
FROM auth.users
WHERE email = 'your-email@example.com';
```

If no results: User needs to sign up first through the application.

#### Role Not Applied
```sql
-- Check current metadata
SELECT
  email,
  raw_user_meta_data,
  raw_app_metadata
FROM auth.users
WHERE email = 'your-email@example.com';
```

Verify the JSONB structure is correct. The role should be a top-level key.

#### Application Not Recognizing Admin Role

Check your application code:
- Ensure it reads from the correct metadata field (user vs app)
- Verify JWT token includes the role claim
- Check for case-sensitivity issues ("admin" vs "Admin")

---

## General Recommendations

### Execution Order

1. **First:** Execute Bounding Box Migration (data integrity)
2. **Second:** Execute Admin Setup (access control)

### Timing

- **Bounding Box Migration:** Off-peak hours recommended (low user traffic)
- **Admin Setup:** Any time (minimal impact)

### Monitoring

During and after migrations, monitor:

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('annotations', 'ai_annotation_items',
                    'annotations_bounding_box_backup',
                    'ai_annotation_items_bounding_box_backup')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Recent errors
SELECT * FROM pg_stat_database WHERE datname = current_database();
```

### Communication Plan

**Before Migration:**
- Notify team of scheduled migration window
- Document expected downtime (if any)
- Prepare rollback communication

**During Migration:**
- Monitor progress in real-time
- Keep stakeholders updated

**After Migration:**
- Confirm successful completion
- Document any issues encountered
- Schedule backup cleanup

---

## Approval Required

Before executing these migrations in production, obtain approval from:

- [ ] Database Administrator
- [ ] Backend Team Lead
- [ ] DevOps Engineer
- [ ] Product Owner (for potential user impact)

**Approved By:** ________________
**Date:** ________________
**Execution Scheduled:** ________________

---

## Execution Log

**To be filled out during execution:**

### Bounding Box Migration

- **Executed By:** ________________
- **Execution Date/Time:** ________________
- **Rows Affected (annotations):** ________________
- **Rows Affected (ai_annotation_items):** ________________
- **Duration:** ________________
- **Issues Encountered:** ________________
- **Validation Status:** ________________

### Admin Setup

- **Executed By:** ________________
- **Execution Date/Time:** ________________
- **Admin Users Added:** ________________
- **Verification Status:** ________________

---

## Appendix A: Emergency Contacts

- **Database Administrator:** ________________
- **Backend Team Lead:** ________________
- **On-Call Engineer:** ________________
- **Supabase Support:** support@supabase.com

## Appendix B: Related Documentation

- Database schema documentation: `/backend/docs/database/`
- API documentation: `/backend/docs/api/`
- Backup and recovery procedures: `/backend/docs/operations/`

---

**END OF DOCUMENT**
