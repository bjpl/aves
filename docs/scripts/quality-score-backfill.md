# Quality Score Backfill Script Documentation

## Overview

The quality score backfill script is a production-ready background job designed to calculate and populate quality scores for all existing images in the database that don't have scores yet.

## Location

- **Script**: `/backend/scripts/backfill-quality-scores.ts`
- **Documentation**:
  - `/backend/scripts/README-backfill.md` (comprehensive)
  - `/backend/scripts/BACKFILL_USAGE.md` (quick start)

## Architecture

### Components

1. **ImageQualityValidator Service** (`/backend/src/services/ImageQualityValidator.ts`)
   - Analyzes images using 5 quality checks
   - Returns score 0-100 with category (high/medium/low)
   - Uses Sharp library for image processing

2. **Batch Processing Engine**
   - Configurable batch size (1-50 images)
   - Processes images sequentially within batches
   - Automatic checkpoint saving after each batch

3. **Progress Tracking**
   - Real-time progress display
   - ETA calculation
   - Checkpoint file (`.backfill-progress.json`)

4. **Error Handling**
   - Continue on failures
   - Track failed images
   - Detailed error logging

### Quality Assessment

Images are evaluated on 5 criteria:

1. **Bird Size** (25% weight)
   - Bird must be 15-80% of image area
   - Not too small (hard to annotate)
   - Not too large (cropped/missing context)

2. **Positioning** (20% weight)
   - Bird must be >60% visible
   - Not heavily obscured
   - Not cut off at edges

3. **Resolution** (20% weight)
   - Minimum 120k pixels (e.g., 400x300)
   - Sufficient detail for annotation
   - High enough quality for display

4. **Contrast** (15% weight)
   - Brightness between 40-220
   - Not too dark or overexposed
   - Good visibility of features

5. **Primary Subject** (20% weight)
   - Bird is clearly the main subject
   - Not multiple birds (confusing)
   - Appropriate framing

**Score Categories:**
- **High** (80-100): Excellent for annotation
- **Medium** (60-79): Acceptable for annotation
- **Low** (0-59): May need review/exclusion

## Features

### 1. Batch Processing

```typescript
interface BackfillOptions {
  batchSize: number;     // 1-50 images per batch
  delayMs: number;       // Delay between batches (ms)
  dryRun: boolean;       // Test without DB updates
  resume: boolean;       // Resume from checkpoint
  verbose: boolean;      // Detailed logging
}
```

**Benefits:**
- Memory efficient (process small chunks)
- Faster processing (optimized batch size)
- Better error isolation

### 2. Rate Limiting

Configurable delay between batches prevents:
- API rate limit violations
- Database connection exhaustion
- Network congestion
- Service overload

**Recommended Delays:**
- Production: 3000ms (3 seconds)
- Development: 2000ms (2 seconds)
- Testing: 1000ms (1 second)

### 3. Progress Tracking

Real-time display includes:
- Total images to process
- Current progress (count and percentage)
- Success/failure counts
- Elapsed time
- Average time per image
- Estimated time remaining

**Example Output:**
```
📊 Progress Summary
═══════════════════════════════════════════════════════════════════
Total:         1234 images
Processed:     250 (20.3%)
Succeeded:     248
Failed:        2
Elapsed:       8m 32s
Avg per image: 2048ms
ETA:           33m 54s
═══════════════════════════════════════════════════════════════════
```

### 4. Resumability

Checkpoint file (`.backfill-progress.json`) stores:
```typescript
interface BackfillProgress {
  total: number;              // Total images to process
  processed: number;          // Images processed so far
  succeeded: number;          // Successfully scored
  failed: number;             // Failed with errors
  startTime: Date;            // Start timestamp
  lastProcessedId?: string;   // Resume from this ID
  estimatedTimeRemaining: string;
  failedImages: Array<{       // Error tracking
    id: string;
    url: string;
    error: string;
  }>;
}
```

**Resume after interruption:**
```bash
npx ts-node scripts/backfill-quality-scores.ts --resume
```

### 5. Error Handling

**Error Strategy:**
- Continue processing on failures
- Log errors with context (image ID, URL, error message)
- Track all failed images
- Save progress regardless of errors
- Display failed images in final summary

**Error Types:**
- Network failures (fetch timeouts)
- Invalid image data
- Database update errors
- Image processing errors

### 6. Dry Run Mode

Test the script without making database changes:

```bash
npx ts-node scripts/backfill-quality-scores.ts --dry-run
```

**Benefits:**
- Verify image access
- Test quality analyzer
- Check batch processing
- Estimate total runtime
- Identify potential issues

## Usage

### Basic Commands

```bash
# Quick dry run
npx ts-node scripts/backfill-quality-scores.ts --dry-run

# Standard run
npx ts-node scripts/backfill-quality-scores.ts

# Resume from interruption
npx ts-node scripts/backfill-quality-scores.ts --resume

# Custom configuration
npx ts-node scripts/backfill-quality-scores.ts \
  --batch-size 15 \
  --delay 3000 \
  --verbose

# Show help
npx ts-node scripts/backfill-quality-scores.ts --help
```

### Production Workflow

```bash
# Step 1: Test with dry run
npx ts-node scripts/backfill-quality-scores.ts --dry-run

# Step 2: Run with recommended settings
npx ts-node scripts/backfill-quality-scores.ts \
  --batch-size 10 \
  --delay 3000

# Step 3: If interrupted, resume
npx ts-node scripts/backfill-quality-scores.ts --resume

# Step 4: Check results
# - Review final summary
# - Check .backfill-progress.json for any failures
# - Verify database updates
```

### Coordination with Claude Flow

```bash
# Before starting
npx claude-flow@alpha hooks pre-task \
  --description "Backfill quality scores for existing images"

# During processing (handled automatically by script)
npx claude-flow@alpha hooks post-edit \
  --file "scripts/backfill-quality-scores.ts" \
  --memory-key "implementation/backfill-job"

# After completion
npx claude-flow@alpha hooks post-task \
  --task-id "backfill-job"
```

## Performance

### Expected Metrics

- **Processing Speed**: 2-3 seconds per image
- **Batch of 10**: ~20-30 seconds
- **1000 Images**: 45-60 minutes (with 2s delay)
- **Memory Usage**: <100 MB (batch processing)
- **Network Usage**: Depends on image sizes

### Optimization Tips

**Faster Processing:**
- Increase batch size (`--batch-size 20`)
- Reduce delay (`--delay 1000`)
- Use faster network connection
- Run during off-peak hours

**Safer Processing:**
- Decrease batch size (`--batch-size 5`)
- Increase delay (`--delay 5000`)
- Use verbose logging (`--verbose`)
- Monitor for rate limits

### Factors Affecting Speed

1. **Image Size**: Larger images take longer to download and process
2. **Network Latency**: Slow network = slower processing
3. **API Response Time**: ImageQualityValidator service speed
4. **Batch Size**: Larger batches = less overhead
5. **Delay Setting**: Higher delay = slower overall speed

## Monitoring

### Real-Time Monitoring

The script provides continuous feedback:
- Progress after each batch
- Success/failure counts
- ETA updates
- Error messages

### Checkpoint File

Monitor progress by reading `.backfill-progress.json`:

```bash
cat .backfill-progress.json | jq '.'
```

### Logs

The script uses the logger service:
- Info logs: Progress and success messages
- Error logs: Failures and exceptions

### Database Monitoring

Check progress directly in database:

```sql
-- Count images without scores
SELECT COUNT(*) FROM images WHERE quality_score IS NULL;

-- Check score distribution
SELECT
  CASE
    WHEN quality_score >= 80 THEN 'high'
    WHEN quality_score >= 60 THEN 'medium'
    ELSE 'low'
  END as category,
  COUNT(*) as count
FROM images
WHERE quality_score IS NOT NULL
GROUP BY category;
```

## Troubleshooting

### Common Issues

**1. "No images need quality score backfill"**
- All images already have scores
- Success state
- Delete checkpoint file if stale

**2. "Failed to fetch image"**
- Network connectivity issues
- Invalid image URLs
- Access denied (check permissions)
- URL expired (Unsplash, etc.)

**3. Process is too slow**
- Increase batch size
- Reduce delay
- Check network speed
- Run during off-peak hours

**4. Hitting rate limits**
- Decrease batch size
- Increase delay
- Check API quotas
- Contact API provider

**5. Out of memory**
- Decrease batch size
- Check image sizes
- Monitor system resources
- Restart and resume

### Debugging

```bash
# Enable verbose logging
npx ts-node scripts/backfill-quality-scores.ts \
  --verbose \
  --batch-size 3 \
  --delay 5000

# Check failed images
cat .backfill-progress.json | jq '.failedImages'

# Test single image
# Use ImageQualityValidator directly in node REPL
```

## Safety Features

1. **Dry Run Mode**: Test without changes
2. **Checkpointing**: Save progress after each batch
3. **Error Isolation**: Failed images don't stop processing
4. **Input Validation**: Validate all CLI arguments
5. **Rate Limiting**: Configurable delays
6. **Interrupt Handling**: Safe Ctrl+C handling
7. **Transaction Safety**: Each update is atomic
8. **Progress Persistence**: Resume from interruption

## Database Schema

```sql
-- Quality score column (added by migration 015)
ALTER TABLE images
ADD COLUMN quality_score INTEGER
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

-- Index for filtering and sorting
CREATE INDEX idx_images_quality_score ON images(quality_score DESC)
WHERE quality_score IS NOT NULL;

-- Helper function for categorization
CREATE OR REPLACE FUNCTION get_quality_category(score INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
  IF score IS NULL THEN RETURN NULL;
  ELSIF score >= 80 THEN RETURN 'high';
  ELSIF score >= 60 THEN RETURN 'medium';
  ELSE RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## Integration Points

### Services
- **ImageQualityValidator**: Core quality assessment
- **Logger**: Error and info logging
- **Supabase Client**: Database operations

### Database Tables
- **images**: Primary table with quality_score column

### External Systems
- **Unsplash API**: Image source
- **Claude Flow**: Coordination and hooks
- **Sharp Library**: Image processing

## Future Enhancements

Potential improvements:
1. **Parallel Processing**: Process multiple images simultaneously
2. **Smart Retry**: Retry failed images with exponential backoff
3. **Quality Trend Analysis**: Track quality score trends over time
4. **Scheduled Jobs**: Run automatically on new images
5. **Webhook Integration**: Notify on completion
6. **Dashboard**: Web UI for monitoring
7. **Priority Queue**: Process high-priority images first
8. **Caching**: Cache quality scores for faster re-processing

## Related Documentation

- `/backend/scripts/README.md` - All scripts overview
- `/backend/src/services/ImageQualityValidator.ts` - Service implementation
- `/backend/src/database/migrations/015_add_quality_score_to_images.sql` - Database schema

## Support

For issues:
1. Check troubleshooting section
2. Review verbose logs
3. Examine checkpoint file
4. Check database state
5. Review related documentation
