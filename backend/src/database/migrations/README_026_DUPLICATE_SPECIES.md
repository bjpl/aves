# Migration 026: Remove Duplicate Species

## Overview

This migration identifies and merges duplicate species entries in the database, ensuring data integrity by:
- Keeping the species entry with the most images/annotations
- Reassigning all images from duplicates to the kept species
- Safely deleting duplicate entries

## Problem

The database contained duplicate species entries (e.g., "Ruby-throated Hummingbird" appearing twice), causing:
- User confusion (some species appear to have no images)
- Data fragmentation (images split across duplicate entries)
- Inconsistent application behavior

## Solution

The migration uses a safe, logged approach:

1. **Identification**: Finds duplicates by both `english_name` and `scientific_name` (case-insensitive)
2. **Prioritization**: Keeps the species with the most images, then most annotations, then oldest record
3. **Reassignment**: Moves all images from duplicates to the kept species
4. **Logging**: Records every merge operation with detailed metadata
5. **Cleanup**: Deletes duplicate species entries
6. **Verification**: Confirms no duplicates remain

## Usage

### Check for Duplicates (Non-Destructive)

```bash
# Check what duplicates exist
psql $DATABASE_URL -f src/scripts/check-duplicate-species.sql
```

### Test the Migration (Rollback)

```bash
# Test in a transaction that will be rolled back
./src/scripts/test-duplicate-migration.sh
```

### Run the Migration

```bash
# Apply the migration to your database
npm run migrate
```

Or manually:

```bash
psql $DATABASE_URL -f src/database/migrations/026_remove_duplicate_species.sql
```

## What the Migration Does

### Example: Ruby-throated Hummingbird

**Before Migration:**
```
Species A: "Ruby-throated Hummingbird" (ID: xxx) - 5 images, 10 annotations
Species B: "Ruby-throated Hummingbird" (ID: yyy) - 0 images, 0 annotations
```

**After Migration:**
```
Species A: "Ruby-throated Hummingbird" (ID: xxx) - 5 images, 10 annotations
Species B: DELETED
```

All images remain accessible under Species A.

## Migration Output

The migration produces detailed console output:

```
NOTICE:  ========================================
NOTICE:  Starting duplicate species cleanup
NOTICE:  ========================================
NOTICE:  Merged duplicate species: Ruby-throated Hummingbird (ID: yyy) into Ruby-throated Hummingbird (ID: xxx). Reassigned 0 images.
NOTICE:  ========================================
NOTICE:  Duplicate cleanup complete
NOTICE:  Total duplicate species removed: 1
NOTICE:  Total images reassigned: 0
NOTICE:  ========================================
NOTICE:  Detailed merge log:
NOTICE:    • Merged "Ruby-throated Hummingbird" (Archilochus colubris) - 0 images moved from yyy to xxx
NOTICE:  ✓ Verification passed: No duplicate english_name entries
NOTICE:  ✓ Verification passed: No duplicate scientific_name entries
```

## Safety Features

1. **Temporary Logging Table**: All operations are logged before deletion
2. **Foreign Key Handling**: Images are reassigned before species deletion
3. **Verification Queries**: Confirms cleanup was successful
4. **Detailed Notices**: Every action is logged with NOTICE statements
5. **Prioritization Logic**: Always keeps the most valuable species entry

## Rollback

⚠️ **This migration is NOT easily reversible** because:
- Duplicate species records are permanently deleted
- The original duplicate IDs are lost
- Images have been reassigned

**Rollback Options:**
1. **Restore from backup** taken before migration
2. **Manual recreation** using the logged data (if exported)

**Prevention:** Consider adding a unique constraint after migration:

```sql
ALTER TABLE species ADD CONSTRAINT unique_english_name_lower
  EXCLUDE USING btree (LOWER(english_name) WITH =);
```

## Testing

The migration has been tested with:
- Species with no duplicates (no-op)
- Species with duplicates but no images
- Species with duplicates and images on both
- Species with duplicates by scientific name only

## Files Created

- `026_remove_duplicate_species.sql` - The migration itself
- `check-duplicate-species.sql` - Detection script (non-destructive)
- `test-duplicate-migration.sh` - Test script (rollback transaction)
- `README_026_DUPLICATE_SPECIES.md` - This documentation

## Expected Impact

- **Data Loss**: None (images and valid species preserved)
- **Downtime**: None (migration runs quickly, <1 second for typical datasets)
- **Breaking Changes**: None (species IDs that are kept remain unchanged)
- **Benefits**: Cleaner data, better UX, no more "image unavailable" confusion

## Questions?

Contact the development team or check the migration source code for detailed comments.
