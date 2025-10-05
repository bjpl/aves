/**
 * Batch Annotation Script
 *
 * CONCEPT: Generate Claude Sonnet 4.5 annotations for all collected bird images
 * WHY: Automate annotation generation for entire dataset with human review workflow
 * PATTERN: Batch processing with rate limiting, caching, and error recovery
 *
 * Usage: npx tsx src/scripts/batch-annotate.ts
 */

import dotenv from 'dotenv';
import { pool } from '../database/connection';
import { VisionAIService } from '../services/VisionAIService';
import { info, error as logError } from '../utils/logger';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 5; // Process 5 images at a time
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds between batches
const DELAY_BETWEEN_IMAGES = 2000; // 2 seconds between individual images

// ============================================================================
// Interfaces
// ============================================================================

interface ImageRecord {
  id: string;
  species_id: string;
  url: string;
  unsplash_id: string;
  species_name: string;
  annotation_count: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch all images that need annotations
 */
async function fetchImagesToAnnotate(): Promise<ImageRecord[]> {
  try {
    info('Fetching images from database');

    const result = await pool.query(`
      SELECT
        i.id,
        i.species_id,
        i.url,
        i.unsplash_id,
        i.annotation_count,
        s.english_name || ' - ' || s.spanish_name as species_name
      FROM images i
      JOIN species s ON i.species_id = s.id
      ORDER BY s.english_name, i.created_at
    `);

    info('Images fetched', { count: result.rows.length });
    return result.rows as ImageRecord[];

  } catch (error) {
    logError('Failed to fetch images', error as Error);
    throw error;
  }
}

/**
 * Check if image already has annotations
 */
async function hasAnnotations(imageId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM ai_annotation_items WHERE image_id = $1',
      [imageId]
    );

    return parseInt(result.rows[0].count) > 0;

  } catch (error) {
    logError('Failed to check annotations', error as Error);
    return false;
  }
}

/**
 * Generate and store annotations for an image
 */
async function annotateImage(
  visionService: VisionAIService,
  image: ImageRecord
): Promise<{ success: boolean; annotationCount: number; error?: string }> {
  try {
    console.log(`   📸 Annotating: ${image.species_name}`);
    console.log(`      Image ID: ${image.id}`);
    console.log(`      URL: ${image.url.substring(0, 60)}...`);

    // Check if already annotated
    const alreadyAnnotated = await hasAnnotations(image.id);
    if (alreadyAnnotated) {
      console.log(`      ⏭️  Skipping (already has annotations)`);
      return { success: true, annotationCount: 0 };
    }

    // Generate annotations with Claude
    const annotations = await visionService.generateAnnotations(image.url, image.id);

    // Store annotations in database
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job record
    await pool.query(
      `INSERT INTO ai_annotations (job_id, image_id, annotation_data, status, confidence_score)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        jobId,
        image.id,
        JSON.stringify(annotations),
        'pending',
        annotations.reduce((sum, a) => sum + (a.confidence || 0.8), 0) / annotations.length
      ]
    );

    // Insert individual annotation items
    for (const annotation of annotations) {
      await pool.query(
        `INSERT INTO ai_annotation_items (
          job_id, image_id, spanish_term, english_term, bounding_box,
          annotation_type, difficulty_level, pronunciation, confidence, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          jobId,
          image.id,
          annotation.spanishTerm,
          annotation.englishTerm,
          JSON.stringify(annotation.boundingBox),
          annotation.type,
          annotation.difficultyLevel,
          annotation.pronunciation || null,
          annotation.confidence || 0.8,
          'pending'
        ]
      );
    }

    console.log(`      ✅ Generated ${annotations.length} annotations (Job: ${jobId})`);

    return { success: true, annotationCount: annotations.length };

  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`      ❌ Error: ${errorMessage}`);
    logError('Annotation generation failed', error as Error);

    return { success: false, annotationCount: 0, error: errorMessage };
  }
}

/**
 * Main batch annotation workflow
 */
async function batchAnnotate() {
  console.log('\n🤖 AVES Batch Annotation with Claude Sonnet 4.5');
  console.log('================================================\n');

  // Initialize Vision AI service
  const visionService = new VisionAIService();

  if (!visionService.isConfigured()) {
    console.error('❌ Claude API not configured. Set ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }

  console.log('✅ Claude Sonnet 4.5 Vision initialized');

  // Fetch images to process
  const images = await fetchImagesToAnnotate();

  if (images.length === 0) {
    console.log('\n⚠️  No images found. Run: npx tsx src/scripts/collect-images.ts first\n');
    process.exit(0);
  }

  console.log(`📊 Found ${images.length} images to process\n`);

  const results = {
    processed: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    totalAnnotations: 0
  };

  // Process images in batches
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(images.length / BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)`);
    console.log('─'.repeat(60));

    for (const image of batch) {
      results.processed++;

      const result = await annotateImage(visionService, image);

      if (result.success) {
        if (result.annotationCount > 0) {
          results.successful++;
          results.totalAnnotations += result.annotationCount;
        } else {
          results.skipped++;
        }
      } else {
        results.failed++;
      }

      // Rate limiting between images
      if (results.processed < images.length) {
        await sleep(DELAY_BETWEEN_IMAGES);
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < images.length) {
      console.log(`\n   ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Summary
  console.log('\n\n📊 Batch Annotation Summary');
  console.log('===========================');
  console.log(`📷 Images processed: ${results.processed}`);
  console.log(`✅ Successfully annotated: ${results.successful}`);
  console.log(`⏭️  Skipped (already done): ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`🏷️  Total annotations: ${results.totalAnnotations}`);

  if (results.totalAnnotations > 0) {
    console.log(`📈 Avg annotations/image: ${(results.totalAnnotations / results.successful).toFixed(1)}`);
  }

  console.log('\n🎉 Batch annotation complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Login to admin panel: http://localhost:5173/admin/annotations');
  console.log('   2. Review pending annotations');
  console.log('   3. Approve/edit annotations for learning content\n');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Execute
// ============================================================================

batchAnnotate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError('Fatal error in batch annotation', error);
    console.error('\n❌ Batch annotation failed:', error.message);
    process.exit(1);
  });
