import logger from '../utils/logger';
import { pool } from '../database/connection';

async function verifyDatabase() {
  try {
    logger.info('Testing database connection...');

    // Test connection
    const client = await pool.connect();
    logger.info('✓ Database connection successful\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    logger.info('Tables in database:');
    logger.info('===================');
    tablesResult.rows.forEach((row: any) => {
      logger.info(`  - ${row.table_name}`);
    });
    logger.info('');

    // Get migrations
    const migrationsResult = await client.query(`
      SELECT name, executed_at
      FROM migrations
      ORDER BY executed_at;
    `);

    logger.info('Executed migrations:');
    logger.info('====================');
    migrationsResult.rows.forEach((row: any) => {
      logger.info(`  - ${row.name} (${row.executed_at})`);
    });
    logger.info('');

    // Check key tables
    const keyTables = ['users', 'species', 'images', 'annotations', 'ai_annotation_items'];

    logger.info('Key table row counts:');
    logger.info('=====================');
    for (const table of keyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        logger.info(`  - ${table}: ${result.rows[0].count} rows`);
      } catch (error: any) {
        logger.info(`  - ${table}: [ERROR - ${error.message}]`);
      }
    }
    logger.info('');

    // Check indexes
    const indexResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    logger.info('Indexes:');
    logger.info('========');
    let currentTable = '';
    indexResult.rows.forEach((row: any) => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        logger.info(`\n  ${row.tablename}:`);
      }
      logger.info(`    - ${row.indexname}`);
    });

    client.release();
    await pool.end();

    logger.info('\n✓ Database verification complete');
    process.exit(0);
  } catch (error) {
    logger.error('Database verification failed:', error);
    process.exit(1);
  }
}

verifyDatabase();
