/**
 * Test Database Migration Runner
 * Runs all test schema migrations in the aves_test schema
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
}

/**
 * Run all test migrations in the test schema
 * @param pool - PostgreSQL pool connected to test database
 * @param schema - Schema name (default: aves_test)
 * @returns Migration result
 */
export async function runTestMigrations(
  pool: Pool,
  schema: string = 'aves_test'
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrationsRun: [],
    errors: [],
  };

  try {
    // Create schema if it doesn't exist
    console.log(`Creating schema ${schema} if not exists...`);
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // Set search path to test schema
    await pool.query(`SET search_path TO ${schema}, public`);
    console.log(`Set search path to ${schema}, public`);

    // List of migration files to run (in order)
    const migrationFiles = [
      '001_create_all_test_tables.sql',
      // Add more migration files here as needed
    ];

    const migrationsPath = join(__dirname, '../../database/migrations/test');

    // Run each migration
    for (const file of migrationFiles) {
      const filePath = join(migrationsPath, file);

      try {
        console.log(`Running migration: ${file}`);
        const sql = readFileSync(filePath, 'utf-8');

        // Execute the migration SQL
        await pool.query(sql);

        result.migrationsRun.push(file);
        console.log(`✓ Migration ${file} completed`);
      } catch (err) {
        const error = err as Error;
        console.error(`✗ Migration ${file} failed:`, error.message);
        result.errors.push(`${file}: ${error.message}`);
        result.success = false;

        // Continue with other migrations even if one fails
        // Some failures might be expected (e.g., table already exists)
      }
    }

    // Verify critical tables exist
    const criticalTables = [
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

    console.log('\nVerifying critical tables...');
    for (const table of criticalTables) {
      try {
        const { rows } = await pool.query(
          `SELECT to_regclass($1) as exists`,
          [`${schema}.${table}`]
        );

        if (rows[0].exists) {
          console.log(`✓ Table ${schema}.${table} exists`);
        } else {
          console.warn(`⚠ Table ${schema}.${table} does not exist`);
          result.success = false;
          result.errors.push(`Missing table: ${table}`);
        }
      } catch (err) {
        const error = err as Error;
        console.error(`✗ Error checking table ${table}:`, error.message);
        result.errors.push(`Table check failed for ${table}: ${error.message}`);
        result.success = false;
      }
    }

    console.log(`\nMigration summary:`);
    console.log(`- Migrations run: ${result.migrationsRun.length}`);
    console.log(`- Errors: ${result.errors.length}`);

    if (result.success) {
      console.log(`✓ All test migrations completed successfully`);
    } else {
      console.warn(`⚠ Some migrations had issues (see errors above)`);
    }

  } catch (err) {
    const error = err as Error;
    console.error('Fatal migration error:', error.message);
    result.success = false;
    result.errors.push(`Fatal error: ${error.message}`);
  }

  return result;
}

/**
 * Drop and recreate test schema (clean slate)
 * WARNING: This will delete ALL data in the test schema
 */
export async function resetTestSchema(
  pool: Pool,
  schema: string = 'aves_test'
): Promise<void> {
  console.log(`\nResetting test schema ${schema}...`);

  try {
    // Drop schema cascade to remove all objects
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    console.log(`✓ Dropped schema ${schema}`);

    // Create fresh schema
    await pool.query(`CREATE SCHEMA ${schema}`);
    console.log(`✓ Created fresh schema ${schema}`);
  } catch (err) {
    const error = err as Error;
    console.error(`✗ Error resetting schema:`, error.message);
    throw error;
  }
}
