import { pool } from '../database/connection';

async function verifyDatabase() {
  try {
    console.log('Testing database connection...');

    // Test connection
    const client = await pool.connect();
    console.log('✓ Database connection successful\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables in database:');
    console.log('===================');
    tablesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Get migrations
    const migrationsResult = await client.query(`
      SELECT name, executed_at
      FROM migrations
      ORDER BY executed_at;
    `);

    console.log('Executed migrations:');
    console.log('====================');
    migrationsResult.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (${row.executed_at})`);
    });
    console.log('');

    // Check key tables
    const keyTables = ['users', 'species', 'images', 'annotations', 'ai_annotation_items'];

    console.log('Key table row counts:');
    console.log('=====================');
    for (const table of keyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} rows`);
      } catch (error: any) {
        console.log(`  - ${table}: [ERROR - ${error.message}]`);
      }
    }
    console.log('');

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

    console.log('Indexes:');
    console.log('========');
    let currentTable = '';
    indexResult.rows.forEach((row: any) => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n  ${row.tablename}:`);
      }
      console.log(`    - ${row.indexname}`);
    });

    client.release();
    await pool.end();

    console.log('\n✓ Database verification complete');
    process.exit(0);
  } catch (error) {
    console.error('Database verification failed:', error);
    process.exit(1);
  }
}

verifyDatabase();
