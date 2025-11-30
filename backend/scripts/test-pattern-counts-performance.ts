/**
 * Performance Testing Script for Pattern Counts Query Optimization
 *
 * Tests the impact of adding composite index on (status, spanish_term)
 * for the ML Analytics pattern counts query.
 *
 * Usage:
 *   npx ts-node backend/scripts/test-pattern-counts-performance.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueryMetrics {
  executionTime: number;
  planningTime: number;
  totalTime: number;
  rowsReturned: number;
  indexUsed: string | null;
  scanType: string;
}

/**
 * Run EXPLAIN ANALYZE on the pattern counts query
 */
async function analyzeQuery(): Promise<QueryMetrics> {
  const query = `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT spanish_term, COUNT(*) as count
    FROM ai_annotation_items
    WHERE status = 'approved'
    GROUP BY spanish_term
    ORDER BY count DESC;
  `;

  const start = performance.now();
  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  const end = performance.now();

  if (error) {
    throw new Error(`Query analysis failed: ${error.message}`);
  }

  const plan = data[0]['QUERY PLAN'][0];

  return {
    executionTime: plan['Execution Time'],
    planningTime: plan['Planning Time'],
    totalTime: plan['Execution Time'] + plan['Planning Time'],
    rowsReturned: plan['Plan']['Actual Rows'],
    indexUsed: extractIndexName(plan),
    scanType: plan['Plan']['Node Type']
  };
}

/**
 * Extract index name from query plan
 */
function extractIndexName(plan: any): string | null {
  const planStr = JSON.stringify(plan);

  // Look for index names in the plan
  const indexMatch = planStr.match(/idx_ai_annotation_items_\w+/);
  return indexMatch ? indexMatch[0] : null;
}

/**
 * Check if index exists
 */
async function checkIndexExists(indexName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = '${indexName}'
      ) as exists;
    `
  });

  if (error) {
    console.error('Error checking index:', error);
    return false;
  }

  return data[0].exists;
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<{
  totalAnnotations: number;
  approvedAnnotations: number;
  uniqueSpanishTerms: number;
}> {
  const { data: totalCount } = await supabase
    .from('ai_annotation_items')
    .select('id', { count: 'exact', head: true });

  const { data: approvedCount } = await supabase
    .from('ai_annotation_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { data: uniqueTerms } = await supabase
    .from('ai_annotation_items')
    .select('spanish_term')
    .eq('status', 'approved');

  const uniqueCount = new Set(uniqueTerms?.map(t => t.spanish_term) || []).size;

  return {
    totalAnnotations: totalCount || 0,
    approvedAnnotations: approvedCount || 0,
    uniqueSpanishTerms: uniqueCount
  };
}

/**
 * Main test execution
 */
async function main() {
  console.log('\n=== Pattern Counts Query Performance Test ===\n');

  try {
    // Get database statistics
    console.log('📊 Database Statistics:');
    const stats = await getDatabaseStats();
    console.log(`   Total annotations: ${stats.totalAnnotations}`);
    console.log(`   Approved annotations: ${stats.approvedAnnotations}`);
    console.log(`   Unique Spanish terms: ${stats.uniqueSpanishTerms}`);
    console.log();

    // Check if new index exists
    const indexName = 'idx_ai_annotation_items_status_spanish_term';
    const indexExists = await checkIndexExists(indexName);
    console.log(`📋 Index Status:`);
    console.log(`   ${indexName}: ${indexExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log();

    // Run query analysis
    console.log('🔍 Query Analysis:');
    console.log('   Running EXPLAIN ANALYZE...\n');

    const metrics = await analyzeQuery();

    console.log('⏱️  Performance Metrics:');
    console.log(`   Planning Time: ${metrics.planningTime.toFixed(2)} ms`);
    console.log(`   Execution Time: ${metrics.executionTime.toFixed(2)} ms`);
    console.log(`   Total Time: ${metrics.totalTime.toFixed(2)} ms`);
    console.log(`   Rows Returned: ${metrics.rowsReturned}`);
    console.log(`   Scan Type: ${metrics.scanType}`);
    console.log(`   Index Used: ${metrics.indexUsed || 'None (Sequential Scan)'}`);
    console.log();

    // Performance recommendations
    console.log('💡 Recommendations:');
    if (!indexExists) {
      console.log('   ⚠️  Composite index not found!');
      console.log('   → Run migration 018_add_pattern_counts_index.sql');
      console.log('   → Expected improvement: 5-10x faster');
    } else if (metrics.indexUsed !== indexName) {
      console.log('   ⚠️  Query is not using the optimal index!');
      console.log('   → Current: ' + (metrics.indexUsed || 'Sequential Scan'));
      console.log('   → Expected: ' + indexName);
      console.log('   → Consider running ANALYZE on ai_annotation_items');
    } else {
      console.log('   ✅ Query is optimally indexed!');
      console.log('   ✅ Using composite index for filtering and grouping');
    }

    // Performance baseline
    console.log();
    console.log('📈 Performance Baseline:');
    if (metrics.totalTime < 50) {
      console.log('   ✅ Excellent (<50ms)');
    } else if (metrics.totalTime < 200) {
      console.log('   ✅ Good (<200ms)');
    } else if (metrics.totalTime < 1000) {
      console.log('   ⚠️  Acceptable (<1s) - Consider optimization');
    } else {
      console.log('   ❌ Slow (>1s) - Optimization recommended');
    }

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('\n❌ Error during performance test:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
