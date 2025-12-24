/**
 * Run Migration 011: Add Quality Metrics
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function runMigration() {
  console.log('\n🔧 Running Migration 011: Add Quality Metrics to Annotations');
  console.log('='.repeat(80));

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../src/database/migrations/011_add_quality_metrics_to_annotations.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('\n📄 Migration SQL loaded');
    console.log(`   File: ${migrationPath}`);

    // Run migration
    console.log('\n⚡ Executing migration...');
    await pool.query(migrationSQL);

    console.log('   ✅ Migration completed successfully');

    // Verify columns were added
    console.log('\n🔍 Verifying columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ai_annotation_items'
      AND column_name IN ('quality_score', 'bird_detected', 'bird_confidence',
                           'bird_size_percentage', 'image_clarity', 'image_lighting',
                           'image_focus', 'skip_reason')
      ORDER BY column_name
    `);

    console.log(`   Found ${result.rows.length} new columns:`);
    result.rows.forEach(row => {
      console.log(`      - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✨ Migration 011 complete!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('   ℹ️  Columns may already exist - this is OK');
    } else {
      console.error(error.stack);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
