/**
 * Test Schema Verification Script
 * Quickly verify that test schema has all required tables
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { runTestMigrations } from './run-test-migrations';

// Load test environment
dotenv.config({ path: join(__dirname, '../../../.env.test') });

async function verifyTestSchema() {
  console.log('Test Schema Verification');
  console.log('========================\n');

  // Create test pool
  const pool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'postgres',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : undefined,
  });

  const schema = process.env.TEST_SCHEMA || 'aves_test';

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('   ✓ Database connected\n');

    // Run migrations
    console.log('2. Running test migrations...');
    const result = await runTestMigrations(pool, schema);

    if (result.success) {
      console.log('   ✓ All migrations successful\n');
    } else {
      console.log('   ⚠ Some migrations had issues:\n');
      result.errors.forEach(err => console.log(`     - ${err}`));
      console.log('');
    }

    // Verify tables
    console.log('3. Verifying table existence...');
    const requiredTables = [
      'users',
      'species',
      'images',
      'vocabulary',
      'annotations',
      'ai_annotations',
      'ai_annotation_items',
      'ai_annotation_reviews',
      'batch_jobs',
      'batch_job_errors',
      'exercise_cache',
      'user_progress',
    ];

    let allTablesExist = true;

    for (const table of requiredTables) {
      const { rows } = await pool.query(
        `SELECT to_regclass($1) as exists`,
        [`${schema}.${table}`]
      );

      if (rows[0].exists) {
        console.log(`   ✓ ${table}`);
      } else {
        console.log(`   ✗ ${table} - MISSING!`);
        allTablesExist = false;
      }
    }

    console.log('');

    // Test batch_jobs table specifically
    console.log('4. Testing batch_jobs table access...');
    try {
      const { rows } = await pool.query(`
        SELECT COUNT(*) as count
        FROM ${schema}.batch_jobs
      `);
      console.log(`   ✓ batch_jobs table accessible (${rows[0].count} rows)\n`);
    } catch (err) {
      console.error(`   ✗ batch_jobs table error:`, (err as Error).message, '\n');
      allTablesExist = false;
    }

    // Summary
    console.log('========================');
    if (allTablesExist) {
      console.log('✓ ALL TABLES READY FOR TESTING');
      console.log('\nYou can now run: npm test');
      process.exit(0);
    } else {
      console.log('✗ SCHEMA VERIFICATION FAILED');
      console.log('\nSome tables are missing. Check errors above.');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n✗ Verification failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyTestSchema();
