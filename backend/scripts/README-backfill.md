# Quality Score Backfill Script

## Overview

The `backfill-quality-scores.ts` script processes all images in the database that don't have quality scores and calculates them using the ImageQualityValidator service. It's designed for safe, resumable, and efficient batch processing.

## Features

- **Batch Processing**: Process images in configurable batches (1-50 images)
- **Rate Limiting**: Configurable delays between batches to respect API quotas
- **Progress Tracking**: Real-time progress display with ETA calculations
- **Resumability**: Save checkpoints and resume from interruption
- **Error Handling**: Continue processing on failures, track errors
- **Dry Run Mode**: Test without making database changes
- **Verbose Logging**: Optional detailed logging for debugging

## Prerequisites

```bash
# Ensure environment variables are set
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Usage

### Basic Usage

```bash
# Run with default settings (batch size: 10, delay: 2000ms)
npx ts-node scripts/backfill-quality-scores.ts
```

### Dry Run (Recommended First)

```bash
# Test without making database changes
npx ts-node scripts/backfill-quality-scores.ts --dry-run
```

### Custom Configuration

```bash
# Custom batch size and delay
npx ts-node scripts/backfill-quality-scores.ts --batch-size 15 --delay 3000

# Verbose logging for debugging
npx ts-node scripts/backfill-quality-scores.ts --verbose

# Combine options
npx ts-node scripts/backfill-quality-scores.ts --batch-size 20 --delay 5000 --verbose
```

### Resume from Interruption

```bash
# Resume from last checkpoint (if process was interrupted)
npx ts-node scripts/backfill-quality-scores.ts --resume
```

### Help

```bash
# Show all available options
npx ts-node scripts/backfill-quality-scores.ts --help
```

## Options

| Option | Description | Default | Range |
|--------|-------------|---------|-------|
| `--dry-run` | Run without updating database | false | - |
| `--resume` | Resume from last checkpoint | false | - |
| `--batch-size N` | Images per batch | 10 | 1-50 |
| `--delay N` | Milliseconds between batches | 2000 | 0-30000 |
| `--verbose` | Enable detailed logging | false | - |
| `--help` | Show help message | - | - |

## Quality Score Calculation

The script uses the `ImageQualityValidator` service which evaluates:

1. **Bird Size** (25% weight): Bird must be 15-80% of image area
2. **Positioning** (20% weight): Bird must not be heavily obscured
3. **Resolution** (20% weight): Minimum 120k pixels (e.g., 400x300)
4. **Contrast** (15% weight): Proper exposure (brightness 40-220)
5. **Primary Subject** (20% weight): Bird is clearly the main subject

**Score Categories:**
- High: 80-100
- Medium: 60-79
- Low: 0-59

## Progress Tracking

The script displays real-time progress:

```
═══════════════════════════════════════════════════════════════════
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

## Checkpointing

The script automatically saves progress to `.backfill-progress.json` after each batch. This file contains:

- Total images to process
- Number processed
- Success/failure counts
- Last processed image ID
- Failed image details

**Resume after interruption:**
```bash
npx ts-node scripts/backfill-quality-scores.ts --resume
```

The checkpoint file is automatically deleted upon successful completion.

## Error Handling

- **Failed images are tracked** but don't stop processing
- **Errors are logged** with image ID and error message
- **Progress is saved** after each batch
- **Continue from failures**: The script will skip already-processed images

Failed images are listed in the final summary:

```
❌ Failed images:
  - abc123: Failed to fetch image from URL
  - def456: Image analysis timeout
```

## Rate Limiting

To avoid overwhelming APIs or hitting rate limits:

```bash
# Process 10 images per batch with 5-second pauses
npx ts-node scripts/backfill-quality-scores.ts --batch-size 10 --delay 5000
```

**Recommended settings:**
- Production: `--batch-size 10 --delay 3000`
- Development: `--batch-size 5 --delay 2000`
- Testing: `--batch-size 3 --delay 1000`

## Interrupting the Process

Press `Ctrl+C` to safely interrupt. The script will:
1. Save current progress to checkpoint file
2. Display resume instructions
3. Exit cleanly

## Coordination Hooks

For integration with Claude Flow coordination:

```bash
# Before running
npx claude-flow@alpha hooks pre-task --description "Backfill quality scores"

# During processing (the script handles this internally)
npx claude-flow@alpha hooks post-edit --memory-key "implementation/backfill-job"

# After completion
npx claude-flow@alpha hooks post-task --task-id "backfill-job"
```

## Examples

### Standard Production Run

```bash
# 1. Test first with dry run
npx ts-node scripts/backfill-quality-scores.ts --dry-run

# 2. Run actual backfill
npx ts-node scripts/backfill-quality-scores.ts --batch-size 10 --delay 3000

# 3. If interrupted, resume
npx ts-node scripts/backfill-quality-scores.ts --resume
```

### Debugging Issues

```bash
# Verbose logging with small batches
npx ts-node scripts/backfill-quality-scores.ts \
  --verbose \
  --batch-size 3 \
  --delay 5000
```

### Fast Processing (Development)

```bash
# Larger batches, shorter delay (be careful with rate limits)
npx ts-node scripts/backfill-quality-scores.ts \
  --batch-size 20 \
  --delay 1000
```

## Performance Considerations

**Expected Performance:**
- Average processing time: 2-3 seconds per image
- Batch of 10 images: ~20-30 seconds
- 1000 images: ~45-60 minutes (with 2s delay)

**Factors affecting speed:**
- Image size and complexity
- Network latency
- API response times
- Batch size and delay settings

## Troubleshooting

### "No images need quality score backfill"

All images already have quality scores. Check with:

```sql
SELECT COUNT(*) FROM images WHERE quality_score IS NULL;
```

### "Failed to fetch image"

- Check network connectivity
- Verify image URLs are accessible
- Review failed image URLs in progress file

### Process is too slow

Reduce delay or increase batch size:

```bash
npx ts-node scripts/backfill-quality-scores.ts --batch-size 20 --delay 1000
```

### Process is hitting rate limits

Increase delay or reduce batch size:

```bash
npx ts-node scripts/backfill-quality-scores.ts --batch-size 5 --delay 5000
```

## Database Schema

The script updates the `images` table:

```sql
-- Quality score column
ALTER TABLE images
ADD COLUMN quality_score INTEGER
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

-- Index for filtering
CREATE INDEX idx_images_quality_score ON images(quality_score DESC)
WHERE quality_score IS NOT NULL;
```

## Safety Features

1. **Dry run mode**: Test without changes
2. **Checkpointing**: Resume from interruption
3. **Error isolation**: Failed images don't stop processing
4. **Validation**: Input validation for all parameters
5. **Rate limiting**: Configurable delays to prevent overload

## Integration

This script is designed to work with:

- ImageQualityValidator service
- Supabase database
- Claude Flow coordination system
- Production monitoring tools

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the verbose logs (`--verbose`)
3. Check the progress file (`.backfill-progress.json`)
4. Review the main README in `/backend/scripts/README.md`
