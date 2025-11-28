import { pool } from '../database/connection';

async function analyzePerformance() {
  try {
    console.log('Database Performance Analysis');
    console.log('============================\n');

    const client = await pool.connect();

    // 1. Check database size
    console.log('1. Database Size:');
    console.log('------------------');
    const sizeResult = await client.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as db_size;
    `);
    console.log(`Total database size: ${sizeResult.rows[0].db_size}\n`);

    // 2. Table sizes
    console.log('2. Table Sizes (Top 10):');
    console.log('------------------------');
    const tableSizesResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 10;
    `);
    tableSizesResult.rows.forEach((row: any) => {
      console.log(`  ${row.tablename.padEnd(30)} - ${row.size}`);
    });
    console.log('');

    // 3. Index usage
    console.log('3. Index Usage Analysis:');
    console.log('------------------------');
    const indexUsageResult = await client.query(`
      SELECT
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10;
    `);
    console.log('Most Used Indexes:');
    indexUsageResult.rows.forEach((row: any) => {
      console.log(`  ${row.indexname.padEnd(40)} - ${row.index_scans.toString().padStart(8)} scans (${row.index_size})`);
    });
    console.log('');

    // 4. Unused indexes
    const unusedIndexesResult = await client.query(`
      SELECT
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);
    if (unusedIndexesResult.rows.length > 0) {
      console.log('Unused Indexes (consider removing):');
      unusedIndexesResult.rows.forEach((row: any) => {
        console.log(`  ⚠️  ${row.indexname.padEnd(40)} - ${row.index_size} (on ${row.tablename})`);
      });
      console.log('');
    }

    // 5. Connection pool stats
    console.log('4. Connection Pool Configuration:');
    console.log('----------------------------------');
    console.log(`  Max connections: ${process.env.DB_POOL_MAX || '20'}`);
    console.log(`  Min connections: ${process.env.DB_POOL_MIN || '5'}`);
    console.log(`  Statement timeout: ${process.env.DB_STATEMENT_TIMEOUT || '10000'}ms`);
    console.log(`  Query timeout: ${process.env.DB_QUERY_TIMEOUT || '10000'}ms`);
    console.log(`  Current pool size: ${pool.totalCount}`);
    console.log(`  Idle connections: ${pool.idleCount}`);
    console.log(`  Waiting clients: ${pool.waitingCount}\n`);

    // 6. Active connections
    const connectionsResult = await client.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database();
    `);
    console.log('5. Database Connections:');
    console.log('------------------------');
    console.log(`  Total: ${connectionsResult.rows[0].total}`);
    console.log(`  Active: ${connectionsResult.rows[0].active}`);
    console.log(`  Idle: ${connectionsResult.rows[0].idle}\n`);

    // 7. Cache hit ratio
    const cacheHitResult = await client.query(`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as cache_hit_ratio
      FROM pg_statio_user_tables;
    `);
    console.log('6. Cache Performance:');
    console.log('---------------------');
    if (cacheHitResult.rows[0].cache_hit_ratio) {
      console.log(`  Cache hit ratio: ${parseFloat(cacheHitResult.rows[0].cache_hit_ratio).toFixed(2)}%`);
      if (parseFloat(cacheHitResult.rows[0].cache_hit_ratio) < 90) {
        console.log('  ⚠️  Cache hit ratio is below 90%. Consider increasing shared_buffers.');
      } else {
        console.log('  ✓ Cache hit ratio is healthy.');
      }
    } else {
      console.log('  No cache statistics available yet.');
    }
    console.log('');

    // 8. Table bloat check
    console.log('7. Table Maintenance:');
    console.log('---------------------');
    const bloatResult = await client.query(`
      SELECT
        schemaname,
        relname as tablename,
        n_dead_tup as dead_tuples,
        n_live_tup as live_tuples,
        CASE
          WHEN n_live_tup > 0
          THEN round(n_dead_tup::numeric / n_live_tup::numeric * 100, 2)
          ELSE 0
        END as dead_tuple_percentage,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_dead_tup DESC
      LIMIT 10;
    `);
    console.log('Tables with dead tuples:');
    bloatResult.rows.forEach((row: any) => {
      if (row.dead_tuples > 0) {
        const needsVacuum = row.dead_tuple_percentage > 10;
        const indicator = needsVacuum ? '⚠️ ' : '  ';
        console.log(`  ${indicator}${row.tablename.padEnd(30)} - ${row.dead_tuples} dead tuples (${row.dead_tuple_percentage}%)`);
      }
    });
    console.log('');

    // 9. Recommendations
    console.log('8. Recommendations:');
    console.log('-------------------');
    const recommendations: string[] = [];

    // Check for missing indexes on foreign keys
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = tc.table_name
            AND indexdef LIKE '%' || kcu.column_name || '%'
        );
    `);
    if (fkResult.rows.length > 0) {
      recommendations.push(`⚠️  Consider adding indexes on foreign key columns: ${fkResult.rows.map((r: any) => `${r.table_name}.${r.column_name}`).join(', ')}`);
    }

    // Check for tables without primary keys
    const noPkResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN (
          SELECT tablename
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexdef LIKE '%PRIMARY KEY%'
        );
    `);
    if (noPkResult.rows.length > 0) {
      recommendations.push(`⚠️  Tables without primary keys: ${noPkResult.rows.map((r: any) => r.tablename).join(', ')}`);
    }

    if (unusedIndexesResult.rows.length > 0) {
      recommendations.push(`ℹ️  ${unusedIndexesResult.rows.length} unused indexes detected. Review and remove if not needed.`);
    }

    if (recommendations.length === 0) {
      console.log('  ✓ No critical issues detected. Database is well-optimized.');
    } else {
      recommendations.forEach(rec => console.log(`  ${rec}`));
    }

    console.log('\n✓ Performance analysis complete\n');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Performance analysis failed:', error);
    process.exit(1);
  }
}

analyzePerformance();
