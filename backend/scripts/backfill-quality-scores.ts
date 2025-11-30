#!/usr/bin/env ts-node

/**
 * Backfill Quality Scores for Existing Images
 *
 * Processes all images where quality_score IS NULL and calculates their quality scores
 * using the ImageQualityValidator service. Supports batch processing, rate limiting,
 * progress tracking, and resumability.
 *
 * Usage:
 *   npx ts-node scripts/backfill-quality-scores.ts --dry-run
 *   npx ts-node scripts/backfill-quality-scores.ts
 *   npx ts-node scripts/backfill-quality-scores.ts --batch-size 15 --delay 3000
 *   npx ts-node scripts/backfill-quality-scores.ts --resume
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { imageQualityValidator } from '../src/services/ImageQualityValidator';
import { info, error as logError } from '../src/utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Progress tracking data structure
 */
interface BackfillProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  startTime: Date;
  lastProcessedId?: string;
  estimatedTimeRemaining: string;
  failedImages: Array<{
    id: string;
    url: string;
    error: string;
  }>;
}

/**
 * Image record from database
 */
interface ImageRecord {
  id: string;
  url: string;
  width: number;
  height: number;
  quality_score: number | null;
}

/**
 * CLI options
 */
interface BackfillOptions {
  batchSize: number;
  delayMs: number;
  dryRun: boolean;
  resume: boolean;
  verbose: boolean;
}

/**
 * Progress file path
 */
const PROGRESS_FILE = path.resolve(__dirname, '.backfill-progress.json');

/**
 * Parse CLI arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    batchSize: 10,
    delayMs: 2000,
    dryRun: false,
    resume: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10);
        if (isNaN(options.batchSize) || options.batchSize < 1 || options.batchSize > 50) {
          console.error('❌ Invalid batch size. Must be between 1 and 50.');
          process.exit(1);
        }
        break;
      case '--delay':
        options.delayMs = parseInt(args[++i], 10);
        if (isNaN(options.delayMs) || options.delayMs < 0 || options.delayMs > 30000) {
          console.error('❌ Invalid delay. Must be between 0 and 30000 milliseconds.');
          process.exit(1);
        }
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`❌ Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Backfill Quality Scores for Existing Images

Usage:
  npx ts-node scripts/backfill-quality-scores.ts [options]

Options:
  --dry-run          Run without actually updating the database
  --resume           Resume from last checkpoint (if available)
  --batch-size N     Number of images to process per batch (default: 10, max: 50)
  --delay N          Delay in milliseconds between batches (default: 2000)
  --verbose          Enable verbose logging
  --help             Show this help message

Examples:
  # Dry run to see what would be processed
  npx ts-node scripts/backfill-quality-scores.ts --dry-run

  # Run with default settings
  npx ts-node scripts/backfill-quality-scores.ts

  # Custom batch size and delay
  npx ts-node scripts/backfill-quality-scores.ts --batch-size 15 --delay 3000

  # Resume from last checkpoint
  npx ts-node scripts/backfill-quality-scores.ts --resume
  `);
}

/**
 * Load progress from checkpoint file
 */
function loadProgress(): BackfillProgress | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const progress = JSON.parse(data);
      progress.startTime = new Date(progress.startTime);
      console.log('📂 Loaded progress from checkpoint file');
      return progress;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load progress file:', (error as Error).message);
  }
  return null;
}

/**
 * Save progress to checkpoint file
 */
function saveProgress(progress: BackfillProgress): void {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️  Failed to save progress:', (error as Error).message);
  }
}

/**
 * Delete progress file
 */
function deleteProgress(): void {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    console.error('⚠️  Failed to delete progress file:', (error as Error).message);
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate estimated time remaining
 */
function calculateETA(progress: BackfillProgress): string {
  const elapsed = Date.now() - progress.startTime.getTime();
  const avgTimePerImage = elapsed / progress.processed;
  const remaining = progress.total - progress.processed;
  const estimatedMs = avgTimePerImage * remaining;

  if (!isFinite(estimatedMs) || estimatedMs <= 0) {
    return 'calculating...';
  }

  return formatDuration(estimatedMs);
}

/**
 * Print progress summary
 */
function printProgress(progress: BackfillProgress): void {
  const percentage = ((progress.processed / progress.total) * 100).toFixed(1);
  const elapsed = Date.now() - progress.startTime.getTime();
  const avgTimePerImage = progress.processed > 0 ? (elapsed / progress.processed) : 0;

  console.log('\n' + '═'.repeat(70));
  console.log('📊 Progress Summary');
  console.log('═'.repeat(70));
  console.log(`Total:         ${progress.total} images`);
  console.log(`Processed:     ${progress.processed} (${percentage}%)`);
  console.log(`Succeeded:     ${progress.succeeded}`);
  console.log(`Failed:        ${progress.failed}`);
  console.log(`Elapsed:       ${formatDuration(elapsed)}`);
  console.log(`Avg per image: ${avgTimePerImage.toFixed(0)}ms`);
  console.log(`ETA:           ${progress.estimatedTimeRemaining}`);
  console.log('═'.repeat(70) + '\n');
}

/**
 * Get images without quality scores
 */
async function getImagesWithoutScores(lastProcessedId?: string): Promise<ImageRecord[]> {
  let query = supabase
    .from('images')
    .select('id, url, width, height, quality_score')
    .is('quality_score', null)
    .order('id', { ascending: true });

  // Resume from last processed ID
  if (lastProcessedId) {
    query = query.gt('id', lastProcessedId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }

  return data || [];
}

/**
 * Process a single image
 */
async function processImage(image: ImageRecord, options: BackfillOptions): Promise<{
  success: boolean;
  score?: number;
  error?: string;
}> {
  try {
    if (options.verbose) {
      console.log(`  🔍 Processing image: ${image.id}`);
    }

    // Analyze image quality
    const analysis = await imageQualityValidator.analyzeImage(image.url);

    if (options.verbose) {
      console.log(`    ✓ Quality score: ${analysis.overallScore} (${analysis.category})`);
    }

    // Update database if not dry run
    if (!options.dryRun) {
      const { error: updateError } = await supabase
        .from('images')
        .update({ quality_score: analysis.overallScore })
        .eq('id', image.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
    }

    return {
      success: true,
      score: analysis.overallScore
    };

  } catch (error) {
    const errorMessage = (error as Error).message;
    if (options.verbose) {
      console.error(`    ❌ Error: ${errorMessage}`);
    }
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Process a batch of images
 */
async function processBatch(
  images: ImageRecord[],
  options: BackfillOptions,
  progress: BackfillProgress
): Promise<void> {
  console.log(`\n📦 Processing batch of ${images.length} images...`);

  for (const image of images) {
    const result = await processImage(image, options);

    progress.processed++;
    progress.lastProcessedId = image.id;

    if (result.success) {
      progress.succeeded++;
      if (options.verbose) {
        console.log(`  ✅ ${image.id}: score ${result.score}`);
      }
    } else {
      progress.failed++;
      progress.failedImages.push({
        id: image.id,
        url: image.url,
        error: result.error || 'Unknown error'
      });
      console.error(`  ❌ ${image.id}: ${result.error}`);
    }

    // Update ETA
    progress.estimatedTimeRemaining = calculateETA(progress);
  }

  // Save checkpoint after each batch
  saveProgress(progress);
}

/**
 * Main backfill function
 */
async function backfillQualityScores(options: BackfillOptions): Promise<BackfillProgress> {
  console.log('🚀 Starting quality score backfill...\n');
  console.log('Configuration:');
  console.log(`  Batch size:    ${options.batchSize}`);
  console.log(`  Delay:         ${options.delayMs}ms`);
  console.log(`  Dry run:       ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`  Resume:        ${options.resume ? 'YES' : 'NO'}`);
  console.log(`  Verbose:       ${options.verbose ? 'YES' : 'NO'}`);

  // Load or initialize progress
  let progress: BackfillProgress;

  if (options.resume) {
    const savedProgress = loadProgress();
    if (savedProgress) {
      progress = savedProgress;
      console.log(`\n📂 Resuming from checkpoint (${progress.processed}/${progress.total} processed)`);
    } else {
      console.log('\n⚠️  No checkpoint found. Starting from beginning.');
      options.resume = false;
    }
  }

  if (!options.resume) {
    // Count total images
    const { count, error: countError } = await supabase
      .from('images')
      .select('id', { count: 'exact', head: true })
      .is('quality_score', null);

    if (countError) {
      throw new Error(`Failed to count images: ${countError.message}`);
    }

    const total = count || 0;

    if (total === 0) {
      console.log('\n✅ No images need quality score backfill!');
      deleteProgress();
      return {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        startTime: new Date(),
        estimatedTimeRemaining: '0s',
        failedImages: []
      };
    }

    progress = {
      total,
      processed: 0,
      succeeded: 0,
      failed: 0,
      startTime: new Date(),
      estimatedTimeRemaining: 'calculating...',
      failedImages: []
    };

    console.log(`\n📊 Found ${total} images without quality scores`);
  }

  // Process in batches
  let hasMoreImages = true;

  while (hasMoreImages) {
    // Fetch next batch
    const images = await getImagesWithoutScores(progress.lastProcessedId);

    if (images.length === 0) {
      hasMoreImages = false;
      break;
    }

    // Process batch (limited to batch size)
    const batch = images.slice(0, options.batchSize);
    await processBatch(batch, options, progress);

    // Print progress every batch
    printProgress(progress);

    // Rate limiting: wait between batches
    if (images.length > options.batchSize && options.delayMs > 0) {
      console.log(`⏳ Waiting ${options.delayMs}ms before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 Backfill Complete!');
  console.log('═'.repeat(70));
  console.log(`Total processed: ${progress.processed}`);
  console.log(`Succeeded:       ${progress.succeeded}`);
  console.log(`Failed:          ${progress.failed}`);
  console.log(`Total time:      ${formatDuration(Date.now() - progress.startTime.getTime())}`);

  if (progress.failed > 0) {
    console.log('\n❌ Failed images:');
    progress.failedImages.forEach(img => {
      console.log(`  - ${img.id}: ${img.error}`);
    });
    console.log(`\nFailed images saved to: ${PROGRESS_FILE}`);
  } else {
    deleteProgress();
  }

  console.log('═'.repeat(70) + '\n');

  return progress;
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made to the database\n');
    }

    await backfillQualityScores(options);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', (error as Error).message);
    logError('Backfill failed', error as Error);
    process.exit(1);
  }
}

// Handle interruption (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted. Progress saved to checkpoint file.');
  console.log('Resume with: npx ts-node scripts/backfill-quality-scores.ts --resume\n');
  process.exit(130);
});

// Run main function
if (require.main === module) {
  main();
}

// Export for testing
export { backfillQualityScores, BackfillOptions, BackfillProgress };
