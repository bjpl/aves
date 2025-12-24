/**
 * Run Migration 017: Fix annotation count trigger
 */

import { pool } from '../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Running Migration 017: Fix annotation count trigger');
    console.log('='.repeat(60));

    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../src/database/migrations/017_fix_annotation_count_trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the migration
    await pool.query(sql);

    console.log('\n✓ Migration completed successfully!');
    console.log('\nChanges made:');
    console.log('  - Fixed trigger to handle DELETE operations correctly');
    console.log('  - Updated all existing annotation counts');
    console.log('  - Added index on ai_annotation_items(image_id)');

    // Verify the fix
    console.log('\nVerifying annotation counts...');
    const verifyQuery = `
      SELECT
        i.id,
        s.english_name,
        i.annotation_count as stored_count,
        COUNT(ai.id) as actual_count,
        (i.annotation_count = COUNT(ai.id)) as is_correct
      FROM images i
      LEFT JOIN species s ON i.species_id = s.id
      LEFT JOIN ai_annotation_items ai ON ai.image_id::text = i.id::text
      GROUP BY i.id, s.english_name, i.annotation_count
      ORDER BY i.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(verifyQuery);

    console.log('\nLatest 10 images:');
    console.log('-'.repeat(80));
    console.log('Species                     | Stored | Actual | Status');
    console.log('-'.repeat(80));

    for (const row of result.rows) {
      const species = (row.english_name || 'Unknown').padEnd(27);
      const stored = String(row.stored_count || 0).padStart(6);
      const actual = String(row.actual_count).padStart(6);
      const status = row.is_correct ? '✓' : '✗';
      console.log(`${species} | ${stored} | ${actual} | ${status}`);
    }

    // Get summary
    const summaryQuery = `
      SELECT
        COUNT(*) as total_images,
        SUM(CASE WHEN annotation_count > 0 THEN 1 ELSE 0 END) as with_annotations,
        SUM(CASE WHEN annotation_count = 0 OR annotation_count IS NULL THEN 1 ELSE 0 END) as without_annotations,
        SUM(annotation_count) as total_annotations
      FROM images
    `;

    const summary = await pool.query(summaryQuery);
    const stats = summary.rows[0];

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('  Total images:', stats.total_images);
    console.log('  With annotations:', stats.with_annotations);
    console.log('  Without annotations:', stats.without_annotations);
    console.log('  Total annotations:', stats.total_annotations);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
