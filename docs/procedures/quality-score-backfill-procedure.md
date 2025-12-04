# Quality Score Backfill Procedure

**Created:** 2025-12-04
**Status:** Production Ready
**Script:** `backend/scripts/backfill-quality-scores.ts`

---

## Overview

This procedure documents how to generate quality scores for existing images that were created before the quality scoring system was implemented (migration 015).

## Why Backfill is Needed

Images created before the quality scoring system have `quality_score = NULL`, which:
- Displays as "N/A" in the frontend (poor UX)
- Breaks quality filtering functionality
- Makes sorting by quality score inconsistent
- Creates data fragmentation

## Prerequisites

1. **Environment Variables Required:**
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Backend Dependencies:**
   - tsx (TypeScript executor)
   - Sharp library (image quality analysis)
   - Supabase client

## Script Execution

### Method 1: Using npm (Recommended)

**Note:** If you encounter npm cache errors (`cb.apply is not a function`), use Method 2.

```bash
cd backend
npx tsx scripts/backfill-quality-scores.ts --dry-run
npx tsx scripts/backfill-quality-scores.ts
```

### Method 2: Using Local tsx Installation

If npx fails with cache errors:

```bash
cd backend
node_modules/.bin/tsx scripts/backfill-quality-scores.ts --dry-run
node_modules/.bin/tsx scripts/backfill-quality-scores.ts
```

### Method 3: Using Node Directly

If tsx is not available locally:

```bash
cd backend
npm install tsx
npm run migrate  # Ensure database is up to date
node --loader tsx/esm scripts/backfill-quality-scores.ts --dry-run
```

## Execution Steps

### Step 1: Dry Run (Test)

Always run dry-run first to verify:
- Connection to Supabase
- Number of images to process
- No destructive operations

```bash
npx tsx scripts/backfill-quality-scores.ts --dry-run
```

**Expected Output:**
```
🔍 DRY RUN MODE - No database changes will be made
📊 Found XX images without quality scores
✅ Dry run complete - no changes made
```

### Step 2: Execute Backfill

If dry-run succeeds, execute the actual backfill:

```bash
npx tsx scripts/backfill-quality-scores.ts
```

**Options:**
```bash
# Adjust batch size and delay
npx tsx scripts/backfill-quality-scores.ts --batch-size 10 --delay 2000

# Enable verbose logging
npx tsx scripts/backfill-quality-scores.ts --verbose

# Resume from checkpoint (if interrupted)
npx tsx scripts/backfill-quality-scores.ts --resume
```

### Step 3: Monitor Progress

The script provides real-time progress updates:
```
⏳ Processing batch 1/5...
✅ Batch 1/5 complete: 10 succeeded, 0 failed
📊 Progress: 20% complete (10/50 images)
⏱️  Estimated time remaining: 8 minutes
```

### Step 4: Verify Results

**Frontend Verification:**
1. Navigate to Image Management Gallery
2. Check that images show quality scores instead of "N/A"
3. Test quality filters (High/Medium/Low)
4. Test sorting by quality score

**Database Verification:**
```sql
SELECT
  COUNT(*) as total_images,
  COUNT(quality_score) as images_with_scores,
  COUNT(*) - COUNT(quality_score) as images_without_scores,
  ROUND(AVG(quality_score), 2) as avg_quality_score
FROM images;
```

**Expected Result:**
- `images_without_scores` should be 0 or very low
- `avg_quality_score` should be between 0-100

## Safety Features

The backfill script includes:

1. **Dry-Run Mode:** Test without making changes
2. **Progress Checkpointing:** Resume if interrupted
3. **Batch Processing:** Prevents memory issues
4. **Rate Limiting:** Prevents API overload (2000ms default delay)
5. **Error Logging:** Detailed error reports for failed images
6. **Resumability:** Can restart from last checkpoint

## Troubleshooting

### Error: "Missing required environment variables"

**Solution:** Ensure `.env` file exists in `backend/` directory with:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "cb.apply is not a function"

**Cause:** npm cache corruption

**Solutions:**
1. Use local tsx: `node_modules/.bin/tsx scripts/backfill-quality-scores.ts`
2. Clear npm cache: `npm cache clean --force`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Error: "tsx not found"

**Solution:** Install tsx locally:
```bash
cd backend
npm install tsx
```

### Script Hangs or Takes Too Long

**Solutions:**
1. Reduce batch size: `--batch-size 5`
2. Increase delay: `--delay 3000`
3. Check network connection to Supabase
4. Verify image URLs are accessible

### Some Images Failed Processing

**Review the error log:**
```bash
cat backend/backfill-errors.log
```

**Common causes:**
- Invalid/broken image URLs
- Network timeouts
- Image format not supported by Sharp

**Solution:** Re-run with `--resume` to retry failed images.

## Performance Expectations

| Image Count | Batch Size | Delay (ms) | Estimated Time |
|-------------|------------|------------|----------------|
| 50          | 10         | 2000       | 5-10 minutes   |
| 100         | 10         | 2000       | 10-20 minutes  |
| 500         | 15         | 1500       | 30-45 minutes  |
| 1000+       | 20         | 1000       | 1-2 hours      |

## Post-Backfill Tasks

1. **Verify Data Consistency:**
   - Check that all images have quality scores
   - Verify quality distribution is reasonable (not all 100 or all 0)

2. **Test UI Functionality:**
   - Quality filtering works correctly
   - Sorting by quality score functions
   - "Unscored" filter shows only intentionally unscored images

3. **Monitor for Issues:**
   - Check application logs for quality score errors
   - Verify new images automatically get scores

4. **Document Completion:**
   - Update this document with actual results
   - Note any issues encountered and resolutions

## Integration with CI/CD

**Do NOT run backfill in CI/CD pipelines.**

This is a one-time maintenance operation for production databases only. Running in CI would:
- Slow down build times significantly
- Create unnecessary API calls
- Potentially interfere with test isolation

## Related Documentation

- Quality Score Investigation: `docs/investigation-quality-scores-not-generated.md`
- Image Quality Validator: `backend/src/services/ImageQualityValidator.ts`
- Database Migration: `backend/src/database/migrations/015_add_quality_score_to_images.sql`

---

**Last Updated:** 2025-12-04
**Procedure Status:** ✅ Verified and Ready for Production Use
