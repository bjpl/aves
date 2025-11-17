/**
 * Regenerate All Annotations with ML Enhancement
 *
 * This script:
 * 1. Deletes existing low-quality annotations
 * 2. Triggers regeneration with ML features enabled
 */

import 'dotenv/config';
import { Pool } from 'pg';
import axios from 'axios';

const DATABASE_URL = process.env.DATABASE_URL;
const API_URL = process.env.API_URL || 'http://localhost:3001';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function regenerateAnnotations() {
  console.log('\n🔄 REGENERATING ANNOTATIONS WITH ML FEATURES');
  console.log('='.repeat(80));

  try {
    // Step 1: Delete existing annotations (will be regenerated with ML features)
    console.log('\n🗑️  Deleting existing annotations...');
    const deleteResult = await pool.query(
      `DELETE FROM ai_annotation_items
       RETURNING id`
    );
    console.log(`   ✅ Deleted ${deleteResult.rowCount} annotations`);

    // Step 2: Get all images with species information
    console.log('\n📸 Fetching images...');
    const imagesResult = await pool.query(
      `SELECT i.id, i.url, s.english_name as species
       FROM images i
       JOIN species s ON i.species_id = s.id
       ORDER BY i.created_at DESC
       LIMIT 20`
    );

    const images = imagesResult.rows;
    console.log(`   Found ${images.length} images to annotate`);

    if (images.length === 0) {
      console.log('\n⚠️  No images found');
      return;
    }

    // Step 3: Trigger annotation generation for each image
    console.log('\n🤖 Generating ML-enhanced annotations...');
    let successCount = 0;
    let failCount = 0;

    for (const image of images) {
      try {
        console.log(`\n   Processing: ${image.species} (${image.id})`);

        const response = await axios.post(
          `${API_URL}/api/ai/annotations/generate/${image.id}`,
          { imageUrl: image.url },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
          }
        );

        if (response.data.jobId) {
          console.log(`      ✅ Job created: ${response.data.jobId}`);
          successCount++;

          // Wait a bit between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`      ⚠️  No job ID returned`);
          failCount++;
        }
      } catch (error: any) {
        console.log(`      ❌ Error: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 REGENERATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Success: ${successCount} images`);
    console.log(`❌ Failed: ${failCount} images`);
    console.log(`\n⏳ Annotations are being generated asynchronously.`);
    console.log(`   Check /api/ai/annotations/pending to see results.`);
    console.log('\n💡 The new annotations will use:');
    console.log(`   • Pattern Learning from 22 learned patterns`);
    console.log(`   • Species-specific features`);
    console.log(`   • ML-enhanced quality scores`);
    console.log(`   • Contextual recommendations`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

regenerateAnnotations().catch(console.error);
