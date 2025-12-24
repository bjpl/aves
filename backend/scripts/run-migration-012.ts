/**
 * Run Migration 012: Reinforcement Learning Feedback Tables
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
  console.log('\n🔧 Running Migration 012: Reinforcement Learning Feedback');
  console.log('='.repeat(80));

  try {
    const migrationPath = join(__dirname, '../src/database/migrations/012_reinforcement_learning_feedback.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('\n📄 Migration SQL loaded');
    await pool.query(migrationSQL);
    console.log('   ✅ Migration completed successfully');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('annotation_corrections', 'rejection_patterns',
                          'positioning_model', 'feedback_metrics')
      ORDER BY table_name
    `);

    console.log(`   Found ${result.rows.length} new tables:`);
    result.rows.forEach(row => console.log(`      - ${row.table_name}`));

    console.log('\n✨ Migration 012 complete!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('   ℹ️  Tables may already exist - this is OK');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
