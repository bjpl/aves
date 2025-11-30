/**
 * Migration Runner for 019_add_pattern_counts_index
 *
 * Runs the pattern counts index optimization migration and validates results.
 *
 * Usage:
 *   npx ts-node backend/scripts/run-migration-019.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Execute SQL migration file
 */
async function runMigration(migrationFile: string): Promise<void> {
  const migrationPath = path.join(
    __dirname,
    '../src/database/migrations',
    migrationFile
  );

  console.log(`📂 Reading migration: ${migrationFile}`);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by statements (simple approach - may need refinement for complex SQL)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);

    // Show first 100 chars of statement
    const preview = statement.substring(0, 100).replace(/\n/g, ' ');
    console.log(`   ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        throw error;
      }

      console.log('   ✅ Success');
    } catch (error: any) {
      console.error('   ❌ Failed:', error.message);
      throw error;
    }
  }
}

/**
 * Verify index was created
 */
async function verifyIndex(indexName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        indexname,
        indexdef,
        tablename
      FROM pg_indexes
      WHERE indexname = '${indexName}';
    `
  });

  if (error) {
    console.error('❌ Error verifying index:', error);
    return false;
  }

  if (!data || data.length === 0) {
    console.error('❌ Index not found');
    return false;
  }

  console.log('\n✅ Index verified:');
  console.log(`   Name: ${data[0].indexname}`);
  console.log(`   Table: ${data[0].tablename}`);
  console.log(`   Definition: ${data[0].indexdef}`);

  return true;
}

/**
 * Get index size
 */
async function getIndexSize(indexName: string): Promise<string> {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT pg_size_pretty(pg_relation_size('${indexName}')) as size;
    `
  });

  if (error || !data || data.length === 0) {
    return 'Unknown';
  }

  return data[0].size;
}

/**
 * Analyze table statistics
 */
async function analyzeTable(tableName: string): Promise<void> {
  console.log(`\n📊 Analyzing table: ${tableName}`);

  const { error } = await supabase.rpc('exec_sql', {
    sql: `ANALYZE ${tableName};`
  });

  if (error) {
    console.error('   ⚠️  Warning: Could not analyze table:', error.message);
  } else {
    console.log('   ✅ Table statistics updated');
  }
}

/**
 * Main migration execution
 */
async function main() {
  console.log('\n=== Migration 019: Pattern Counts Index ===\n');

  try {
    // Run the migration
    console.log('🚀 Starting migration...\n');
    await runMigration('019_add_pattern_counts_index.sql');

    console.log('\n✅ Migration completed successfully!');

    // Verify the index
    console.log('\n🔍 Verifying index creation...');
    const indexName = 'idx_ai_annotation_items_status_spanish_term';
    const verified = await verifyIndex(indexName);

    if (!verified) {
      throw new Error('Index verification failed');
    }

    // Get index size
    const indexSize = await getIndexSize(indexName);
    console.log(`   Size: ${indexSize}`);

    // Analyze table for query planner
    await analyzeTable('ai_annotation_items');

    console.log('\n✅ All checks passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run performance test:');
    console.log('      npx ts-node scripts/test-pattern-counts-performance.ts');
    console.log('   2. Monitor query performance in production');
    console.log('   3. Consider additional indexes if needed (see migration comments)');

    console.log('\n=== Migration Complete ===\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
