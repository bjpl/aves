import logger from '../utils/logger';
import { pool } from '../database/connection';

async function analyzePerformance() {
  try {
    logger.info('Database Performance Analysis');
    logger.info('============================\n');

    const client = await pool.connect();

    // 1. Check database size
    logger.info('1. Database Size:');
    logger.info('------------------');
    const sizeResult = await client.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as db_size;
    `);
    logger.info(`Total database size: ${sizeResult.rows[0].db_size}\n`);

    // 2. Table sizes
    logger.info('2. Table Sizes (Top 10):');
    logger.info('------------------------');
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
      logger.info(`  ${row.tablename.padEnd(30)} - ${row.size}`);
    });
    logger.info('');

    // 3. Index usage
    logger.info('3. Index Usage Analysis:');
    logger.info('------------------------');
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
    logger.info('Most Used Indexes:');
    indexUsageResult.rows.forEach((row: any) => {
      logger.info(`  ${row.indexname.padEnd(40)} - ${row.index_scans.toString().padStart(8)} scans (${row.index_size})`);
    });
    logger.info('');

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
      logger.info('Unused Indexes (consider removing):');
      unusedIndexesResult.rows.forEach((row: any) => {
        logger.info(`  ⚠️  ${row.indexname.padEnd(40)} - ${row.index_size} (on ${row.tablename})`);
      });
      logger.info('');
    }

    // 5. Connection pool stats
    logger.info('4. Connection Pool Configuration:');
    logger.info('----------------------------------');
    logger.info(`  Max connections: ${process.env.DB_POOL_MAX || '20'}`);
    logger.info(`  Min connections: ${process.env.DB_POOL_MIN || '5'}`);
    logger.info(`  Statement timeout: ${process.env.DB_STATEMENT_TIMEOUT || '10000'}ms`);
    logger.info(`  Query timeout: ${process.env.DB_QUERY_TIMEOUT || '10000'}ms`);
    logger.info(`  Current pool size: ${pool.totalCount}`);
    logger.info(`  Idle connections: ${pool.idleCount}`);
    logger.info(`  Waiting clients: ${pool.waitingCount}\n`);

    // 6. Active connections
    const connectionsResult = await client.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database();
    `);
    logger.info('5. Database Connections:');
    logger.info('------------------------');
    logger.info(`  Total: ${connectionsResult.rows[0].total}`);
    logger.info(`  Active: ${connectionsResult.rows[0].active}`);
    logger.info(`  Idle: ${connectionsResult.rows[0].idle}\n`);

    // 7. Cache hit ratio
    const cacheHitResult = await client.query(`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as cache_hit_ratio
      FROM pg_statio_user_tables;
    `);
    logger.info('6. Cache Performance:');
    logger.info('---------------------');
    if (cacheHitResult.rows[0].cache_hit_ratio) {
      logger.info(`  Cache hit ratio: ${parseFloat(cacheHitResult.rows[0].cache_hit_ratio).toFixed(2)}%`);
      if (parseFloat(cacheHitResult.rows[0].cache_hit_ratio) < 90) {
        logger.info('  ⚠️  Cache hit ratio is below 90%. Consider increasing shared_buffers.');
      } else {
        logger.info('  ✓ Cache hit ratio is healthy.');
      }
    } else {
      logger.info('  No cache statistics available yet.');
    }
    logger.info('');

    // 8. Table bloat check
    logger.info('7. Table Maintenance:');
    logger.info('---------------------');
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
    logger.info('Tables with dead tuples:');
    bloatResult.rows.forEach((row: any) => {
      if (row.dead_tuples > 0) {
        const needsVacuum = row.dead_tuple_percentage > 10;
        const indicator = needsVacuum ? '⚠️ ' : '  ';
        logger.info(`  ${indicator}${row.tablename.padEnd(30)} - ${row.dead_tuples} dead tuples (${row.dead_tuple_percentage}%)`);
      }
    });
    logger.info('');

    // 9. Recommendations
    logger.info('8. Recommendations:');
    logger.info('-------------------');
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
      logger.info('  ✓ No critical issues detected. Database is well-optimized.');
    } else {
      recommendations.forEach(rec => logger.info(`  ${rec}`));
    }

    logger.info('\n✓ Performance analysis complete\n');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Performance analysis failed:', error);
    process.exit(1);
  }
}

analyzePerformance();
