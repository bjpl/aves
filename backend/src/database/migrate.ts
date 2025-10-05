import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { info, error as logError } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined
});

async function runMigrations() {
  info('Starting database migrations');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    info('Migrations table ready');

    // List of migration files in order
    const migrations = [
      '001_create_users_table.sql',
      '002_create_ai_annotations_table.sql',
      '003_create_vision_ai_cache.sql',
      '006_batch_jobs.sql',
      '007_exercise_cache.sql',
      '008_add_user_roles.sql',
      '009_optimize_cache_indexes.sql'
    ];

    for (const migration of migrations) {
      // Check if migration already ran
      const result = await pool.query(
        'SELECT * FROM migrations WHERE name = $1',
        [migration]
      );

      if (result.rows.length > 0) {
        info(`Skipping migration (already executed)`, { migration });
        continue;
      }

      // Read and execute migration
      info(`Running migration`, { migration });
      const migrationPath = join(__dirname, 'migrations', migration);
      const sql = readFileSync(migrationPath, 'utf-8');

      await pool.query(sql);

      // Record migration
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration]
      );

      info(`Completed migration`, { migration });
    }

    info('All migrations completed successfully');
  } catch (err) {
    logError('Migration failed', err as Error);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };
