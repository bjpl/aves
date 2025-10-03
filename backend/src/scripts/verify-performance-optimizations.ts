#!/usr/bin/env ts-node
/**
 * Performance Optimization Verification Script
 *
 * Verifies that all performance optimizations are working correctly:
 * 1. Database indexes are created and being used
 * 2. Batch INSERT operations are faster than individual INSERTs
 * 3. Connection pool is properly configured
 */

import { pool } from '../database/connection';
import { batchInsert } from '../database/batchInsert';
import { info, error as logError } from '../utils/logger';

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  metric?: string;
}

const results: VerificationResult[] = [];

/**
 * Verify database indexes exist
 */
async function verifyIndexes(): Promise<void> {
  console.log('\n🔍 Verifying Database Indexes...\n');

  const expectedIndexes = [
    { name: 'idx_exercise_cache_lookup', table: 'exercise_cache' },
    { name: 'idx_exercise_cache_expires', table: 'exercise_cache' },
    { name: 'idx_ai_annotations_image', table: 'ai_annotation_items' },
    { name: 'idx_ai_annotations_status', table: 'ai_annotation_items' },
    { name: 'idx_batch_jobs_status', table: 'batch_jobs' },
    { name: 'idx_batch_jobs_type', table: 'batch_jobs' },
    { name: 'idx_batch_job_errors_job', table: 'batch_job_errors' }
  ];

  for (const { name, table } of expectedIndexes) {
    try {
      const query = `
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE indexname = $1 AND tablename = $2
      `;

      const result = await pool.query(query, [name, table]);

      if (result.rows.length > 0) {
        results.push({
          test: `Index: ${name}`,
          status: 'PASS',
          details: `Index exists on ${table}`
        });
        console.log(`✅ ${name} - EXISTS`);
      } else {
        results.push({
          test: `Index: ${name}`,
          status: 'FAIL',
          details: `Index missing on ${table}`
        });
        console.log(`❌ ${name} - MISSING`);
      }
    } catch (error) {
      results.push({
        test: `Index: ${name}`,
        status: 'FAIL',
        details: `Error checking index: ${(error as Error).message}`
      });
      console.log(`❌ ${name} - ERROR`);
    }
  }
}

/**
 * Verify index usage with EXPLAIN
 */
async function verifyIndexUsage(): Promise<void> {
  console.log('\n🔍 Verifying Index Usage (EXPLAIN ANALYZE)...\n');

  // Test 1: Exercise cache lookup should use idx_exercise_cache_lookup
  try {
    const query = `
      EXPLAIN (FORMAT JSON)
      SELECT * FROM exercise_cache
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND exercise_type = 'visual_discrimination'
        AND difficulty_level = 2
        AND expires_at > NOW()
      LIMIT 1
    `;

    const result = await pool.query(query);
    const plan = JSON.stringify(result.rows[0]);
    const usesIndex = plan.includes('idx_exercise_cache_lookup');

    if (usesIndex) {
      results.push({
        test: 'Exercise cache query uses index',
        status: 'PASS',
        details: 'Query uses idx_exercise_cache_lookup'
      });
      console.log('✅ Exercise cache query - USES INDEX');
    } else {
      results.push({
        test: 'Exercise cache query uses index',
        status: 'WARN',
        details: 'Query may not be using index (table might be empty)'
      });
      console.log('⚠️  Exercise cache query - NO INDEX (table empty?)');
    }
  } catch (error) {
    results.push({
      test: 'Exercise cache query uses index',
      status: 'FAIL',
      details: `Error: ${(error as Error).message}`
    });
    console.log('❌ Exercise cache query - ERROR');
  }

  // Test 2: Batch jobs query should use idx_batch_jobs_status
  try {
    const query = `
      EXPLAIN (FORMAT JSON)
      SELECT * FROM batch_jobs
      WHERE status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query);
    const plan = JSON.stringify(result.rows[0]);
    const usesIndex = plan.includes('idx_batch_jobs_status');

    if (usesIndex) {
      results.push({
        test: 'Batch jobs query uses index',
        status: 'PASS',
        details: 'Query uses idx_batch_jobs_status'
      });
      console.log('✅ Batch jobs query - USES INDEX');
    } else {
      results.push({
        test: 'Batch jobs query uses index',
        status: 'WARN',
        details: 'Query may not be using index (table might be empty)'
      });
      console.log('⚠️  Batch jobs query - NO INDEX (table empty?)');
    }
  } catch (error) {
    results.push({
      test: 'Batch jobs query uses index',
      status: 'FAIL',
      details: `Error: ${(error as Error).message}`
    });
    console.log('❌ Batch jobs query - ERROR');
  }
}

/**
 * Benchmark batch INSERT vs individual INSERTs
 */
async function benchmarkBatchInsert(): Promise<void> {
  console.log('\n🔍 Benchmarking Batch INSERT Performance...\n');

  const testTableName = 'perf_test_temp';
  const rowCount = 100;

  try {
    // Create temporary test table
    await pool.query(`
      CREATE TEMP TABLE ${testTableName} (
        id SERIAL PRIMARY KEY,
        email TEXT,
        name TEXT
      )
    `);

    // Generate test data
    const testData = Array.from({ length: rowCount }, (_, i) => [
      `test${i}@example.com`,
      `Test User ${i}`
    ]);

    // Test 1: Individual INSERTs
    console.log(`Testing ${rowCount} individual INSERTs...`);
    const startIndividual = Date.now();
    for (const [email, name] of testData) {
      await pool.query(
        `INSERT INTO ${testTableName} (email, name) VALUES ($1, $2)`,
        [email, name]
      );
    }
    const durationIndividual = Date.now() - startIndividual;
    console.log(`⏱️  Individual INSERTs: ${durationIndividual}ms`);

    // Clear table
    await pool.query(`TRUNCATE ${testTableName}`);

    // Test 2: Batch INSERT
    console.log(`Testing batch INSERT of ${rowCount} rows...`);
    const startBatch = Date.now();
    await batchInsert(pool, testTableName, ['email', 'name'], testData);
    const durationBatch = Date.now() - startBatch;
    console.log(`⏱️  Batch INSERT: ${durationBatch}ms`);

    // Calculate speedup
    const speedup = (durationIndividual / durationBatch).toFixed(1);
    console.log(`\n📊 Speedup: ${speedup}x faster`);

    if (parseFloat(speedup) >= 5) {
      results.push({
        test: 'Batch INSERT performance',
        status: 'PASS',
        details: `${speedup}x faster than individual INSERTs`,
        metric: `${durationBatch}ms for ${rowCount} rows`
      });
      console.log(`✅ Batch INSERT is ${speedup}x faster`);
    } else {
      results.push({
        test: 'Batch INSERT performance',
        status: 'WARN',
        details: `Only ${speedup}x faster (expected 5x+)`,
        metric: `${durationBatch}ms for ${rowCount} rows`
      });
      console.log(`⚠️  Batch INSERT only ${speedup}x faster (expected 5x+)`);
    }

    // Drop temp table
    await pool.query(`DROP TABLE ${testTableName}`);

  } catch (error) {
    results.push({
      test: 'Batch INSERT performance',
      status: 'FAIL',
      details: `Error: ${(error as Error).message}`
    });
    console.log('❌ Batch INSERT benchmark failed');
  }
}

/**
 * Verify connection pool configuration
 */
async function verifyConnectionPool(): Promise<void> {
  console.log('\n🔍 Verifying Connection Pool Configuration...\n');

  const expectedConfig = {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5')
  };

  console.log(`Expected max connections: ${expectedConfig.max}`);
  console.log(`Expected min connections: ${expectedConfig.min}`);

  // Check pool configuration
  if (pool.options.max === expectedConfig.max) {
    results.push({
      test: 'Connection pool max size',
      status: 'PASS',
      details: `Pool max set to ${pool.options.max}`
    });
    console.log(`✅ Pool max: ${pool.options.max}`);
  } else {
    results.push({
      test: 'Connection pool max size',
      status: 'WARN',
      details: `Pool max is ${pool.options.max}, expected ${expectedConfig.max}`
    });
    console.log(`⚠️  Pool max: ${pool.options.max} (expected ${expectedConfig.max})`);
  }

  // Check if pool is working
  try {
    const result = await pool.query('SELECT NOW()');
    results.push({
      test: 'Connection pool health',
      status: 'PASS',
      details: 'Pool can execute queries'
    });
    console.log('✅ Pool is healthy');
  } catch (error) {
    results.push({
      test: 'Connection pool health',
      status: 'FAIL',
      details: `Pool error: ${(error as Error).message}`
    });
    console.log('❌ Pool health check failed');
  }

  // Check pool statistics
  console.log(`\n📊 Pool Statistics:`);
  console.log(`   Total connections: ${pool.totalCount}`);
  console.log(`   Idle connections: ${pool.idleCount}`);
  console.log(`   Waiting requests: ${pool.waitingCount}`);
}

/**
 * Print summary report
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 PERFORMANCE OPTIMIZATION VERIFICATION SUMMARY');
  console.log('='.repeat(70) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}\n`);

  // Print details for each result
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️ ' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.details}`);
    if (result.metric) {
      console.log(`   Metric: ${result.metric}`);
    }
    console.log();
  }

  // Overall verdict
  if (failed === 0 && warned === 0) {
    console.log('🎉 ALL OPTIMIZATIONS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } else if (failed === 0) {
    console.log('⚠️  OPTIMIZATIONS VERIFIED WITH WARNINGS\n');
    console.log('Some tests produced warnings. Review the details above.\n');
    process.exit(0);
  } else {
    console.log('❌ OPTIMIZATION VERIFICATION FAILED\n');
    console.log('Some tests failed. Review the details above and fix issues.\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('🚀 PERFORMANCE OPTIMIZATION VERIFICATION');
  console.log('='.repeat(70));

  try {
    await verifyIndexes();
    await verifyIndexUsage();
    await benchmarkBatchInsert();
    await verifyConnectionPool();

    printSummary();

  } catch (error) {
    logError('Verification script failed', error as Error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
