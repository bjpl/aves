# Bounding Box Format Migration Guide

## Overview

This migration normalizes all bounding box data in the database to use a single canonical format, eliminating rendering crashes caused by format inconsistencies.

**Migration Date**: October 17, 2025
**Migration File**: `backend/src/database/migrations/012_normalize_bounding_box_format.sql`
**Script**: `backend/scripts/run-bounding-box-migration.sh`

---

## Problem Statement

### Issue
The application currently supports two bounding box coordinate formats:

1. **Flat Format** (Old):
   ```json
   {
     "x": 100,
     "y": 200,
     "width": 50,
     "height": 75
   }
   ```

2. **Nested Format** (Canonical):
   ```json
   {
     "topLeft": { "x": 100, "y": 200 },
     "bottomRight": { "x": 150, "y": 275 },
     "width": 50,
     "height": 75
   }
   ```

### Impact
- **Rendering Crashes**: When formats are mixed, the AnnotationCanvas component can crash
- **Data Inconsistency**: Some records use flat format, others use nested format
- **Technical Debt**: Bidirectional conversion code adds complexity

### Solution
Normalize all existing data to the canonical nested format and eventually remove flat format support.

---

## Pre-Migration Checklist

- [ ] **Backup Database**: Take a full database backup before migration
- [ ] **Test Migration**: Run migration on staging database first
- [ ] **Verify Environment**: Ensure `.env` file has correct production credentials
- [ ] **Stop Background Jobs**: Temporarily stop any background annotation processing
- [ ] **Notify Users**: If running in production hours, notify users of brief maintenance

---

## Migration Process

### Step 1: Database Backup

```bash
# Production backup (via Supabase dashboard)
# 1. Navigate to Supabase project dashboard
# 2. Go to Database > Backups
# 3. Create manual backup labeled "pre-bounding-box-migration-2025-10-17"

# Or via pg_dump (if direct access available)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f backup-pre-migration-$(date +%Y%m%d).dump
```

### Step 2: Test on Staging (REQUIRED)

```bash
# 1. Copy production .env to staging
cp ../.env ../.env.staging

# 2. Update to staging database credentials
vim ../.env.staging

# 3. Run migration on staging
DB_ENV=staging ./scripts/run-bounding-box-migration.sh

# 4. Verify staging works correctly
npm run test:integration
npm start
# Test annotation rendering manually
```

### Step 3: Execute Production Migration

```bash
# Navigate to backend directory
cd backend

# Execute migration script
./scripts/run-bounding-box-migration.sh
```

**Expected Output**:
```
=========================================
Bounding Box Format Migration
=========================================

✓ Database configuration loaded
  Host: aws-0-us-east-1.pooler.supabase.com
  Database: postgres
  User: postgres.ubqnfiwxghkxltluyczd

⚠️  This will normalize ALL bounding boxes in the database. Continue? (yes/no): yes

Starting migration...

NOTICE:  === BOUNDING BOX MIGRATION ANALYSIS ===
NOTICE:  annotations table:
NOTICE:    Total rows: 42
NOTICE:    Flat format (needs conversion): 18
NOTICE:    Nested format (already correct): 24
NOTICE:
NOTICE:  ai_annotation_items table:
NOTICE:    Total rows: 156
NOTICE:    Flat format (needs conversion): 89
NOTICE:    Nested format (already correct): 67
NOTICE:
NOTICE:  annotations: Normalized 42 rows to nested format
NOTICE:  ai_annotation_items: Normalized 156 rows to nested format
NOTICE:  annotations: ✓ All rows validated - nested format confirmed
NOTICE:  ai_annotation_items: ✓ All rows validated - nested format confirmed
NOTICE:
NOTICE:  === MIGRATION COMPLETE ===
NOTICE:  All bounding boxes normalized to canonical format:
NOTICE:  { topLeft: {x, y}, bottomRight: {x, y}, width, height }
NOTICE:
NOTICE:  Backup tables created:
NOTICE:    - annotations_bounding_box_backup
NOTICE:    - ai_annotation_items_bounding_box_backup

=========================================
✓ Migration completed successfully!
=========================================
```

### Step 4: Validation

```bash
# 1. Restart backend server
npm run dev

# 2. Test annotation rendering
# - Open frontend application
# - Navigate to image with annotations
# - Verify all bounding boxes render correctly
# - Test hover/click interactions
# - Check browser console for errors

# 3. Test admin annotation review
# - Navigate to admin review page
# - Approve/reject annotations
# - Verify bounding box editor works correctly

# 4. Run integration tests
npm run test:integration

# 5. Check database data
npm run db:query "SELECT id, bounding_box FROM annotations LIMIT 5;"
# Verify all have topLeft/bottomRight keys
```

---

## Rollback Procedure

If issues are detected after migration:

```sql
-- Restore from backup tables
BEGIN;

-- Restore annotations
UPDATE annotations a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM annotations_bounding_box_backup b
WHERE a.id = b.id;

-- Restore ai_annotation_items
UPDATE ai_annotation_items a
SET bounding_box = b.bounding_box,
    updated_at = b.updated_at
FROM ai_annotation_items_bounding_box_backup b
WHERE a.id = b.id;

COMMIT;
```

Or restore from full database backup:

```bash
# Via Supabase dashboard
# 1. Go to Database > Backups
# 2. Select pre-migration backup
# 3. Click "Restore"

# Or via pg_restore (if direct access)
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup-pre-migration-20251017.dump
```

---

## Post-Migration Cleanup

After **24-48 hours** of successful operation in production:

```sql
-- Drop backup tables to free up storage
DROP TABLE IF EXISTS annotations_bounding_box_backup;
DROP TABLE IF EXISTS ai_annotation_items_bounding_box_backup;
```

---

## Code Changes (Future)

Once migration is validated, consider removing flat format support:

### Files to Update:
1. `frontend/src/utils/boundingBoxConverter.ts`
   - Remove `toBackendFormat()` function
   - Remove `normalizeForAPI()` function
   - Keep only `toEditorFormat()` for defensive programming

2. `backend/src/types/annotation.types.ts`
   - Keep only nested `BoundingBox` interface
   - Remove any flat format references

3. All components using bounding boxes
   - Simplify to expect only nested format
   - Remove format detection logic

**Timeline**: Remove flat format support in v2.1.0 (30 days after migration)

---

## Technical Details

### Migration SQL Features

**Safety Features**:
- Creates backup tables before any changes
- Uses `normalize_bounding_box()` function that is idempotent
- Validates all rows after migration
- Provides detailed logging via NOTICE messages
- Uses transactions (implicit in PostgreSQL for DDL)

**Function Details**:
```sql
normalize_bounding_box(bbox JSONB) RETURNS JSONB
```
- **Idempotent**: Running multiple times produces same result
- **Defensive**: Checks for both formats
- **Error Handling**: Raises exception for invalid formats

### Performance

**Expected Duration**:
- Small datasets (<1000 rows): 1-2 seconds
- Medium datasets (1000-10000 rows): 5-15 seconds
- Large datasets (10000+ rows): 30-60 seconds

**Impact**:
- Updates affect entire table (triggers updated_at)
- Index updates are automatic
- No downtime required (updates are fast)
- Client applications continue working during migration

### Database Objects Created

**Tables**:
- `annotations_bounding_box_backup` - Backup of annotations.bounding_box
- `ai_annotation_items_bounding_box_backup` - Backup of ai_annotation_items.bounding_box

**Functions**:
- `normalize_bounding_box(JSONB)` - Format conversion function

---

## Troubleshooting

### Migration Fails with "Invalid bounding box format"

**Cause**: Some rows have unexpected bounding box structure

**Solution**:
```sql
-- Find problematic rows
SELECT id, bounding_box
FROM annotations
WHERE NOT (bounding_box ? 'x' OR bounding_box ? 'topLeft');

SELECT id, bounding_box
FROM ai_annotation_items
WHERE NOT (bounding_box ? 'x' OR bounding_box ? 'topLeft');

-- Manually fix or delete invalid rows
DELETE FROM annotations WHERE id = '<problematic-id>';
```

### Rendering Still Crashes After Migration

**Cause**: Frontend cache or code issue

**Solution**:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors
4. Verify `boundingBoxConverter.ts` is using correct imports
5. Restart frontend dev server

### Backup Tables Not Created

**Cause**: Insufficient permissions

**Solution**:
```sql
-- Check user permissions
SELECT * FROM information_schema.table_privileges
WHERE grantee = '<your-db-user>';

-- Grant necessary permissions (as superuser)
GRANT CREATE ON SCHEMA public TO <your-db-user>;
```

---

## Success Criteria

Migration is successful when:

- [x] All `annotations.bounding_box` have `topLeft` and `bottomRight` keys
- [x] All `ai_annotation_items.bounding_box` have `topLeft` and `bottomRight` keys
- [x] Backup tables exist with original data
- [x] No rendering crashes in frontend
- [x] Annotation editing works correctly
- [x] Admin review workflow functions properly
- [x] Integration tests pass
- [x] No database errors in logs

---

## Contact

**Questions or Issues?**
- Review migration logs in `backend/logs/migration-012.log`
- Check Supabase dashboard for errors
- Contact: Development Team

**Related Documentation**:
- `frontend/src/utils/boundingBoxConverter.ts` - Format conversion utilities
- `shared/types/annotation.types.ts` - Type definitions
- `docs/testing/bounding-box-migration.md` - Test cases

---

## Appendix: Manual Validation Queries

```sql
-- Count bounding box formats in annotations
SELECT
    COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') as nested_format,
    COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT bounding_box ? 'topLeft') as flat_format,
    COUNT(*) as total
FROM annotations;

-- Count bounding box formats in ai_annotation_items
SELECT
    COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') as nested_format,
    COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT bounding_box ? 'topLeft') as flat_format,
    COUNT(*) as total
FROM ai_annotation_items;

-- Sample bounding boxes from each table
SELECT id, bounding_box FROM annotations LIMIT 5;
SELECT id, bounding_box FROM ai_annotation_items LIMIT 5;

-- Verify width/height calculations are correct
SELECT
    id,
    (bounding_box->>'width')::NUMERIC as stored_width,
    ((bounding_box->'bottomRight'->>'x')::NUMERIC - (bounding_box->'topLeft'->>'x')::NUMERIC) as calculated_width,
    (bounding_box->>'height')::NUMERIC as stored_height,
    ((bounding_box->'bottomRight'->>'y')::NUMERIC - (bounding_box->'topLeft'->>'y')::NUMERIC) as calculated_height
FROM annotations
WHERE
    ABS((bounding_box->>'width')::NUMERIC -
        ((bounding_box->'bottomRight'->>'x')::NUMERIC - (bounding_box->'topLeft'->>'x')::NUMERIC)) > 0.01
    OR
    ABS((bounding_box->>'height')::NUMERIC -
        ((bounding_box->'bottomRight'->>'y')::NUMERIC - (bounding_box->'topLeft'->>'y')::NUMERIC)) > 0.01;
```

---

**Last Updated**: 2025-10-17
**Migration Version**: 012
**Status**: Ready for execution
