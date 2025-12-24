/**
 * Run Migration 021: Seed Production Annotations
 *
 * This script populates the annotations table with vocabulary annotations
 * linked to the images seeded in migration 020.
 *
 * Usage: npx tsx scripts/run-migration-021.ts
 */

import { pool } from '../src/database/connection';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('\n📝 Running Migration 021: Seed Production Annotations\n');
  console.log('=' .repeat(60));

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../src/database/migrations/021_seed_production_annotations.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file');
    console.log('🚀 Executing migration...\n');

    // Execute the migration
    await pool.query(sql);

    // Verify the results
    const annotationResult = await pool.query('SELECT COUNT(*) as count FROM annotations WHERE is_visible = true');

    const bySpeciesResult = await pool.query(`
      SELECT
        s.english_name as species,
        COUNT(a.id) as annotation_count
      FROM species s
      JOIN images i ON i.species_id = s.id
      JOIN annotations a ON a.image_id = i.id
      WHERE a.is_visible = true
      GROUP BY s.english_name
      ORDER BY annotation_count DESC
    `);

    const byTypeResult = await pool.query(`
      SELECT
        annotation_type as type,
        COUNT(*) as count
      FROM annotations
      WHERE is_visible = true
      GROUP BY annotation_type
      ORDER BY count DESC
    `);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Annotation Statistics:');
    console.log(`   - Total Visible Annotations: ${annotationResult.rows[0].count}`);

    console.log('\n📷 Annotations by Species:');
    for (const row of bySpeciesResult.rows) {
      console.log(`   ✅ ${row.species}: ${row.annotation_count} annotations`);
    }

    console.log('\n📑 Annotations by Type:');
    for (const row of byTypeResult.rows) {
      console.log(`   • ${row.type}: ${row.count}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Production annotations seeded successfully!');
    console.log('\nLearn and Practice pages should now display:');
    console.log('  • Bird images with interactive vocabulary hotspots');
    console.log('  • Spanish terms with pronunciations');
    console.log('  • Difficulty levels from 1-3');
    console.log('\nNext steps:');
    console.log('  1. Restart the backend server');
    console.log('  2. Refresh the frontend');
    console.log('  3. Visit /learn to see interactive annotations');
    console.log('  4. Visit /practice to test vocabulary exercises\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
