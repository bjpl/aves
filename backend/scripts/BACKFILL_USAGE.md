# Quick Start Guide - Quality Score Backfill

## TL;DR

```bash
# 1. Test first (no database changes)
npx ts-node scripts/backfill-quality-scores.ts --dry-run

# 2. Run the backfill
npx ts-node scripts/backfill-quality-scores.ts

# 3. If interrupted, resume
npx ts-node scripts/backfill-quality-scores.ts --resume
```

## What This Script Does

Calculates quality scores for all images in the database that don't have them yet. The quality score (0-100) evaluates:
- Bird size and positioning
- Image resolution and clarity
- Proper exposure/lighting
- Whether bird is the main subject

## Common Use Cases

### Standard Production Run
```bash
npx ts-node scripts/backfill-quality-scores.ts \
  --batch-size 10 \
  --delay 3000
```

### Fast Development Run
```bash
npx ts-node scripts/backfill-quality-scores.ts \
  --batch-size 20 \
  --delay 1000
```

### Debugging Mode
```bash
npx ts-node scripts/backfill-quality-scores.ts \
  --verbose \
  --batch-size 5 \
  --delay 5000
```

## Understanding the Output

```
📊 Progress Summary
═══════════════════════════════════════════════════════════════════
Total:         1234 images      ← Total images to process
Processed:     250 (20.3%)      ← Current progress
Succeeded:     248              ← Successfully scored
Failed:        2                ← Errors (processing continues)
Elapsed:       8m 32s           ← Time spent
Avg per image: 2048ms           ← Speed
ETA:           33m 54s          ← Estimated completion
═══════════════════════════════════════════════════════════════════
```

## Key Options Explained

| Option | What It Does | When To Use |
|--------|-------------|-------------|
| `--dry-run` | Simulates run without changes | Always test first |
| `--resume` | Continue from interruption | After Ctrl+C or crash |
| `--batch-size N` | Process N images at once | Adjust for speed/stability |
| `--delay N` | Wait N ms between batches | Prevent rate limiting |
| `--verbose` | Show detailed logs | Debugging issues |

## Interrupting Safely

Press `Ctrl+C` anytime. The script will:
1. Save progress to checkpoint file
2. Show resume command
3. Exit cleanly

**Resume with:**
```bash
npx ts-node scripts/backfill-quality-scores.ts --resume
```

## Coordination Hooks (Claude Flow)

```bash
# Before
npx claude-flow@alpha hooks pre-task --description "Backfill quality scores"

# After
npx claude-flow@alpha hooks post-task --task-id "backfill-job"
```

## Troubleshooting

**"No images need backfill"**
→ All images already have scores. Success!

**Process too slow**
→ Try: `--batch-size 20 --delay 1000`

**Hitting rate limits**
→ Try: `--batch-size 5 --delay 5000`

**Failed images**
→ Check `.backfill-progress.json` for details

## Files Created

- `.backfill-progress.json` - Checkpoint file (deleted on success)

## Expected Performance

- ~2-3 seconds per image
- ~1000 images in 45-60 minutes (with 2s delay)
- Automatic checkpointing after each batch

## Full Documentation

See `README-backfill.md` for complete details.
