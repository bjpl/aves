#!/usr/bin/env tsx
/**
 * Run database migrations on test schema
 * This script creates all tables in the aves_test schema for testing
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: join(__dirname, '..', 'backend', '.env.test') });

const schema = process.env.TEST_SCHEMA || 'aves_test';

const pool = new Pool({
  host: process.env.TEST_DB_HOST || process.env.DB_HOST,
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'postgres',
  user: process.env.TEST_DB_USER || process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined,
});

async function runTestMigrations() {
  console.log(`\n🔧 Running migrations on schema: ${schema}\n`);

  try {
    // Ensure test schema exists
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    console.log(`✓ Schema ${schema} ready`);

    // Set search path to test schema
    await pool.query(`SET search_path TO ${schema}, public`);

    // Create migrations table in test schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(`✓ Migrations table ready`);

    // List of migration files (use simplified test versions where available)
    const migrations = [
      { file: '001_create_users_table.sql', isTest: false },
      { file: '002_create_ai_annotations_table.sql', isTest: false },
      { file: '003_create_vision_ai_cache.sql', isTest: false },
      { file: '006_batch_jobs.sql', isTest: false },
      { file: '007_exercise_cache.sql', isTest: false },
      { file: '008_add_user_roles.sql', isTest: false },
      { file: '009_optimize_cache_indexes.sql', isTest: false },
      { file: '010_create_species_and_images.sql', isTest: true },
      { file: '011_create_annotations_table.sql', isTest: false }
    ];

    for (const migration of migrations) {
      // Check if migration already ran
      const result = await pool.query(
        `SELECT * FROM ${schema}.migrations WHERE name = $1`,
        [migration.file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${migration.file} (already executed)`);
        continue;
      }

      // Read migration file (use test version if available)
      console.log(`▶️  Running ${migration.file}`);
      const basePath = join(__dirname, '..', 'backend', 'src', 'database', 'migrations');
      const testPath = join(basePath, 'test', migration.file);
      const prodPath = join(basePath, migration.file);

      let migrationPath = prodPath;
      if (migration.isTest) {
        try {
          readFileSync(testPath);
          migrationPath = testPath;
          console.log(`   Using simplified test migration`);
        } catch {
          console.log(`   Using production migration`);
        }
      }

      let sql = readFileSync(migrationPath, 'utf-8');

      // Replace table references to use schema prefix
      // This ensures tables are created in the test schema
      sql = sql.replace(/CREATE TABLE (?!IF NOT EXISTS )/gi, `CREATE TABLE IF NOT EXISTS ${schema}.`);
      sql = sql.replace(/CREATE TABLE IF NOT EXISTS (?!${schema}\.)/gi, `CREATE TABLE IF NOT EXISTS ${schema}.`);

      // Execute migration
      await pool.query(sql);

      // Record migration
      await pool.query(
        `INSERT INTO ${schema}.migrations (name) VALUES ($1)`,
        [migration.file]
      );

      console.log(`✅ Completed ${migration.file}`);
    }

    console.log(`\n✨ All migrations completed successfully in ${schema} schema!\n`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migrations
runTestMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
