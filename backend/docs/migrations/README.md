# Production Database Migrations - Documentation

**Status:** DRY-RUN DOCUMENTATION - NO MIGRATIONS EXECUTED
**Created:** 2025-10-17
**Last Updated:** 2025-10-17

---

## Overview

This directory contains comprehensive documentation for production database migrations that are ready to execute but have NOT been run yet. All analysis is based on dry-run review of migration scripts.

### Available Migrations

1. **Bounding Box Format Normalization** (Migration 012)
   - Converts bounding boxes from flat to nested format
   - Affects: `annotations` and `ai_annotation_items` tables
   - Risk: MEDIUM | Reversibility: HIGH

2. **Admin User Setup**
   - Grants admin role to specified users
   - Affects: `auth.users` table
   - Risk: LOW | Reversibility: HIGH

---

## Documentation Files

### 1. PRODUCTION_MIGRATION_PLAN.md (19KB)
**Full comprehensive migration plan**

Contains:
- Detailed overview of both migrations
- Complete SQL analysis
- Pre-flight checklists
- Execution procedures
- Validation steps
- Rollback procedures
- Security considerations
- Approval process

**When to use:** Before scheduling migration execution, for stakeholder review, for audit trail

### 2. EXECUTION_REPORT.md (20KB)
**Dry-run analysis and execution tracking**

Contains:
- Script safety review
- SQL commands that will execute
- Estimated impact analysis
- Risk assessment
- Execution log templates
- Post-execution validation checklists

**When to use:** During execution for step-by-step guidance, for documenting actual execution

### 3. QUICK_REFERENCE.md (3KB)
**Quick commands and checklists**

Contains:
- Quick execute commands
- Essential validation queries
- Emergency rollback commands
- Minimal checklists

**When to use:** During execution for quick reference, for experienced operators

---

## Quick Start

### For First-Time Reviewers

1. Read **EXECUTION_REPORT.md** first (script safety analysis)
2. Review **PRODUCTION_MIGRATION_PLAN.md** (full procedures)
3. Run impact analysis queries against production database
4. Review and approve execution

### For Migration Executors

1. Complete pre-flight checklist from **PRODUCTION_MIGRATION_PLAN.md**
2. Have **QUICK_REFERENCE.md** open during execution
3. Document results in **EXECUTION_REPORT.md**

---

## Pre-Execution Requirements

### Must Complete Before Execution

#### For Migration 1 (Bounding Box)

1. **Impact Analysis** - Run these queries against production:
   ```sql
   -- See how many rows need conversion
   SELECT
     COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) AS needs_conversion
   FROM annotations;
   ```

2. **External Backup** - Create full database backup outside migration process

3. **Disk Space Check** - Ensure sufficient space for backup tables

4. **Staging Test** - Execute migration in staging environment first

5. **Schedule Window** - Determine if off-peak execution needed

#### For Migration 2 (Admin)

1. **User Verification** - Confirm target user exists and email is correct

2. **Access Check** - Verify Supabase SQL Editor access

3. **Application Test** - Ensure admin features are implemented

---

## Execution Status

### Migration 1: Bounding Box Normalization
- [ ] Impact analysis completed
- [ ] External backup created
- [ ] Staging test successful
- [ ] Approvals obtained
- [ ] Scheduled
- [ ] Executed
- [ ] Validated
- [ ] Backup cleanup completed

### Migration 2: Admin User Setup
- [ ] Target user(s) identified
- [ ] Supabase access confirmed
- [ ] Application ready for admin users
- [ ] Executed
- [ ] Validated

---

## Critical Safety Notes

### DO NOT Execute If:
- ❌ Pre-flight checklist not completed
- ❌ External database backup not created
- ❌ Impact analysis not run
- ❌ Approvals not obtained
- ❌ Rollback procedure not understood
- ❌ Staging environment not tested

### MUST Have Ready:
- ✅ Database backup location documented
- ✅ Rollback SQL commands ready to paste
- ✅ Emergency contact information
- ✅ Monitoring dashboards open
- ✅ Communication plan prepared

---

## Risk Summary

| Migration | Data Loss Risk | Downtime | Rollback Time | Overall Risk |
|-----------|----------------|----------|---------------|--------------|
| Bounding Box | LOW (backups) | None | <1 min | LOW-MEDIUM |
| Admin Setup | None | None | <10 sec | LOW |

---

## Emergency Contacts

**During Migration Execution:**
- Database Administrator: ________________
- Backend Team Lead: ________________
- On-Call Engineer: ________________

**Supabase Support:**
- Email: support@supabase.com
- Dashboard: https://supabase.com/dashboard

---

## Post-Execution Checklist

After executing migrations:

1. **Immediate (5 minutes)**
   - [ ] Run validation queries
   - [ ] Test application functionality
   - [ ] Check error logs
   - [ ] Verify user access

2. **Short-term (24 hours)**
   - [ ] Monitor application behavior
   - [ ] Collect user feedback
   - [ ] Review performance metrics
   - [ ] Document any issues

3. **Long-term (48 hours)**
   - [ ] Comprehensive testing complete
   - [ ] Performance validated
   - [ ] Backup cleanup scheduled
   - [ ] Update documentation

---

## Rollback Procedures

### Migration 1: Bounding Box
```sql
-- Restore from backup tables (run in Supabase SQL Editor)
BEGIN;
UPDATE annotations a
SET bounding_box = b.bounding_box, updated_at = b.updated_at
FROM annotations_bounding_box_backup b
WHERE a.id = b.id;

UPDATE ai_annotation_items a
SET bounding_box = b.bounding_box, updated_at = b.updated_at
FROM ai_annotation_items_bounding_box_backup b
WHERE a.id = b.id;
COMMIT;
```

### Migration 2: Admin
```sql
-- Remove admin role
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'user@example.com';
```

---

## Files Reference

### Migration Scripts (Source)
- `/backend/scripts/run-bounding-box-migration.sh` - Bounding box migration executor
- `/backend/src/database/migrations/012_normalize_bounding_box_format.sql` - Bounding box SQL
- `/backend/scripts/set-admin.sql` - Admin setup SQL template

### Documentation (This Directory)
- `README.md` - This file
- `PRODUCTION_MIGRATION_PLAN.md` - Comprehensive plan
- `EXECUTION_REPORT.md` - Dry-run analysis and tracking
- `QUICK_REFERENCE.md` - Quick commands and checklists

---

## Approval Status

### Technical Approvals
- [ ] Database Administrator - Name: _____________ Date: _______
- [ ] Backend Team Lead - Name: _____________ Date: _______
- [ ] DevOps Engineer - Name: _____________ Date: _______

### Business Approvals
- [ ] Product Owner - Name: _____________ Date: _______

**All approvals required before execution**

---

## Execution Schedule

### Planned Execution
- **Migration 1:** Date: _______ Time: _______ (UTC)
- **Migration 2:** Date: _______ Time: _______ (UTC)

### Actual Execution
- **Migration 1:** Date: _______ Time: _______ Status: _______
- **Migration 2:** Date: _______ Time: _______ Status: _______

---

## Notes

### Version History
- v1.0 (2025-10-17) - Initial dry-run documentation created

### Future Migrations
Document future migrations in this directory following the same pattern:
1. Create comprehensive plan
2. Perform dry-run analysis
3. Document execution steps
4. Track execution and validation

---

## Contact

For questions about these migrations:
- Review documentation in this directory
- Contact Database Administrator
- Contact Backend Team Lead

---

**REMEMBER:** This is production data. Take all precautions seriously.

**Last Updated:** 2025-10-17
**Next Review:** After migration execution
