/**
 * Script to check and fix annotation counts in images table
 */

import { pool } from '../src/database/connection';

async function checkAnnotationCounts() {
  try {
    console.log('Checking annotation counts...\n');

    // Get images with their current annotation_count and actual annotation count
    const result = await pool.query(`
      SELECT
        i.id,
        i.url,
        s.english_name,
        i.annotation_count as stored_count,
        COUNT(ai.id) as actual_count
      FROM images i
      LEFT JOIN species s ON i.species_id = s.id
      LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
      GROUP BY i.id, i.url, s.english_name, i.annotation_count
      ORDER BY i.created_at DESC
      LIMIT 20
    `);

    console.log('Latest 20 images:');
    console.log('================');

    let mismatchCount = 0;

    for (const row of result.rows) {
      const match = (row.stored_count || 0) === parseInt(row.actual_count);
      if (!match) mismatchCount++;

      console.log(`${row.english_name || 'Unknown'}`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Stored count: ${row.stored_count || 0}`);
      console.log(`  Actual count: ${row.actual_count}`);
      console.log(`  Status: ${match ? '✓ CORRECT' : '✗ MISMATCH'}`);
      console.log('');
    }

    console.log(`\nSummary: ${mismatchCount} mismatches found out of ${result.rows.length} images checked`);

    // Check if trigger exists
    const triggerCheck = await pool.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_update_annotation_count'
        AND event_object_table = 'ai_annotation_items'
    `);

    console.log('\nTrigger status:');
    if (triggerCheck.rows.length > 0) {
      console.log('✓ Trigger exists');
      for (const trig of triggerCheck.rows) {
        console.log(`  - ${trig.action_timing} ${trig.event_manipulation}`);
      }
    } else {
      console.log('✗ Trigger NOT found - this is the problem!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAnnotationCounts();
