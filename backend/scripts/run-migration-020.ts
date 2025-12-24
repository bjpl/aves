/**
 * Run Migration 020: Seed Production Bird Data
 *
 * This script populates the database with 10 bird species and 20 images.
 * Run this after all other migrations to populate production data.
 *
 * Usage: npx tsx scripts/run-migration-020.ts
 */

import { pool } from '../src/database/connection';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('\n🐦 Running Migration 020: Seed Production Bird Data\n');
  console.log('=' .repeat(60));

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../src/database/migrations/020_seed_production_bird_data.sql'
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
    const speciesResult = await pool.query('SELECT COUNT(*) as count FROM species');
    const imageResult = await pool.query('SELECT COUNT(*) as count FROM images');
    const linkedResult = await pool.query(`
      SELECT s.english_name, COUNT(i.id) as image_count
      FROM species s
      LEFT JOIN images i ON i.species_id = s.id
      GROUP BY s.id, s.english_name
      ORDER BY s.english_name
    `);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Database Statistics:');
    console.log(`   - Total Species: ${speciesResult.rows[0].count}`);
    console.log(`   - Total Images: ${imageResult.rows[0].count}`);
    console.log('\n📷 Images per Species:');

    for (const row of linkedResult.rows) {
      const status = row.image_count > 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.english_name}: ${row.image_count} images`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Production data seeded successfully!');
    console.log('\nNext steps:');
    console.log('  1. Restart the backend server');
    console.log('  2. Refresh the frontend');
    console.log('  3. Visit /species to see bird images');
    console.log('  4. Visit /learn to test the learning page');
    console.log('  5. Visit /practice to test exercises\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
