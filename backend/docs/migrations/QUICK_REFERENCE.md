# Production Migration Quick Reference

**Status:** DRY-RUN - NOT EXECUTED
**Created:** 2025-10-17

---

## Migration 1: Bounding Box Normalization

### Quick Execute (After Review)

```bash
# From /backend/scripts/ directory
./run-bounding-box-migration.sh
# Type "yes" when prompted
```

### What It Does
Converts bounding boxes from flat to nested format in:
- `annotations` table
- `ai_annotation_items` table

### Safety Features
- Automatic backup tables created
- Idempotent (safe to re-run)
- Rollback capability
- Transaction-based

### Pre-Flight Check Query
```sql
-- Run this BEFORE migration to see impact
SELECT
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) AS needs_conversion,
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') AS already_converted,
  COUNT(*) AS total
FROM annotations;
```

### Validation Query
```sql
-- Run this AFTER migration to verify
SELECT COUNT(*) FROM annotations
WHERE NOT (bounding_box ? 'topLeft' AND bounding_box ? 'bottomRight');
-- Expected: 0
```

### Rollback (If Needed)
```sql
UPDATE annotations a
SET bounding_box = b.bounding_box, updated_at = b.updated_at
FROM annotations_bounding_box_backup b
WHERE a.id = b.id;
```

---

## Migration 2: Admin User Setup

### Quick Execute (Supabase SQL Editor)

```sql
-- REPLACE EMAIL BEFORE RUNNING
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-actual-email@example.com';
```

### Verification
```sql
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'your-actual-email@example.com';
-- Expected: role = 'admin'
```

### Remove Admin (If Needed)
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'user@example.com';
```

---

## Execution Checklist

### Before Migration 1 (Bounding Box)
- [ ] Database backup completed
- [ ] Reviewed SQL migration file
- [ ] Verified .env credentials
- [ ] Checked disk space
- [ ] Off-peak hours scheduled

### Before Migration 2 (Admin)
- [ ] User account exists
- [ ] Correct email verified
- [ ] Supabase dashboard access confirmed

### After Both Migrations
- [ ] Application testing completed
- [ ] No errors in logs
- [ ] User access verified
- [ ] Backup cleanup scheduled (24-48h)

---

## Emergency Rollback Commands

### Bounding Box Rollback
```sql
BEGIN;
UPDATE annotations a SET bounding_box = b.bounding_box FROM annotations_bounding_box_backup b WHERE a.id = b.id;
UPDATE ai_annotation_items a SET bounding_box = b.bounding_box FROM ai_annotation_items_bounding_box_backup b WHERE a.id = b.id;
COMMIT;
```

### Admin Rollback
```sql
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'role' WHERE email = 'user@example.com';
```

---

## Cleanup (After 24-48h Validation)

```sql
DROP TABLE annotations_bounding_box_backup;
DROP TABLE ai_annotation_items_bounding_box_backup;
```

---

**For full details, see:** `PRODUCTION_MIGRATION_PLAN.md`
