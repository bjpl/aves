/**
 * Integration Test Setup
 * Database utilities and test data helpers for integration tests
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Test database connection (separate from main pool)
// For Supabase: Uses same database but different schema ('aves_test')
// For local: Can use separate database
export const testPool = new Pool({
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'postgres',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined,
  // Use test schema for Supabase
  options: process.env.TEST_SCHEMA ? `-c search_path=${process.env.TEST_SCHEMA},public` : undefined,
  // CRITICAL: Allow pool to exit when idle to prevent hanging
  allowExitOnIdle: true,
});

export const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

/**
 * Test user data templates
 */
export const TEST_USERS = {
  regularUser: {
    email: 'testuser@example.com',
    password: 'TestPassword123',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPassword123',
  },
  alternateUser: {
    email: 'alternate@example.com',
    password: 'AlternatePass123',
  },
};

/**
 * Clean database tables before tests
 */
export async function cleanDatabase(): Promise<void> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const tables = [
    'ai_annotation_reviews',
    'ai_annotation_items',
    'ai_annotations',
    'annotations',
    'exercise_cache',
    'batch_jobs',
    'user_progress',
    'vocabulary',
    'images',
    'species',
    'users',
  ];

  for (const table of tables) {
    try {
      await testPool.query(`DELETE FROM ${schema}.${table}`);
    } catch (err) {
      // Table might not exist, that's okay
      console.warn(`Could not clean table ${schema}.${table}:`, (err as Error).message);
    }
  }
}

/**
 * Create a test user and return credentials
 */
export async function createTestUser(
  userData: { email: string; password: string },
  isAdmin = false
): Promise<{
  id: string;
  email: string;
  token: string;
  passwordHash: string;
}> {
  const passwordHash = await bcrypt.hash(userData.password, 10);
  const schema = process.env.TEST_SCHEMA || 'public';

  const result = await testPool.query(
    `INSERT INTO ${schema}.users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
    [userData.email.toLowerCase(), passwordHash]
  );

  const user = result.rows[0];

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    id: user.id,
    email: user.email,
    token,
    passwordHash,
  };
}

/**
 * Create test species
 */
export async function createTestSpecies(data?: {
  name?: string;
  scientificName?: string;
  description?: string;
}): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const speciesData = {
    name: data?.name || 'Test Cardinal',
    scientificName: data?.scientificName || 'Cardinalis cardinalis',
    description: data?.description || 'A test bird species',
  };

  const result = await testPool.query(
    `INSERT INTO ${schema}.species (name, scientific_name, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, scientific_name as "scientificName", description, created_at as "createdAt"`,
    [speciesData.name, speciesData.scientificName, speciesData.description]
  );

  return result.rows[0];
}

/**
 * Create test image
 */
export async function createTestImage(speciesId: string, url?: string): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const imageUrl = url || `https://example.com/images/${randomUUID()}.jpg`;

  const result = await testPool.query(
    `INSERT INTO ${schema}.images (species_id, url)
     VALUES ($1, $2)
     RETURNING id, species_id as "speciesId", url, created_at as "createdAt"`,
    [speciesId, imageUrl]
  );

  return result.rows[0];
}

/**
 * Create test vocabulary item
 */
export async function createTestVocabulary(data: {
  speciesId: string;
  spanishTerm: string;
  englishTerm: string;
  pronunciation?: string;
  difficultyLevel?: number;
}): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const result = await testPool.query(
    `INSERT INTO ${schema}.vocabulary (species_id, spanish_term, english_term, pronunciation, difficulty_level)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, species_id as "speciesId", spanish_term as "spanishTerm",
               english_term as "englishTerm", pronunciation, difficulty_level as "difficultyLevel"`,
    [
      data.speciesId,
      data.spanishTerm,
      data.englishTerm,
      data.pronunciation || null,
      data.difficultyLevel || 2,
    ]
  );

  return result.rows[0];
}

/**
 * Create test annotation
 */
export async function createTestAnnotation(data: {
  imageId: string;
  spanishTerm: string;
  englishTerm: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  type?: string;
  difficultyLevel?: number;
}): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const result = await testPool.query(
    `INSERT INTO ${schema}.annotations (image_id, spanish_term, english_term, bounding_box, annotation_type, difficulty_level)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, image_id as "imageId", spanish_term as "spanishTerm",
               english_term as "englishTerm", bounding_box as "boundingBox",
               annotation_type as "type", difficulty_level as "difficultyLevel"`,
    [
      data.imageId,
      data.spanishTerm,
      data.englishTerm,
      JSON.stringify(data.boundingBox),
      data.type || 'anatomical',
      data.difficultyLevel || 2,
    ]
  );

  const annotation = result.rows[0];
  // Parse bounding box if it's a string, otherwise it's already an object
  if (typeof annotation.boundingBox === 'string') {
    annotation.boundingBox = JSON.parse(annotation.boundingBox);
  }
  return annotation;
}

/**
 * Create cached exercise
 */
export async function createCachedExercise(data: {
  cacheKey: string;
  exerciseType: string;
  exerciseData: any;
  userContextHash: string;
  difficulty: number;
  expiresAt?: Date;
}): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';
  const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const result = await testPool.query(
    `INSERT INTO ${schema}.exercise_cache (cache_key, exercise_type, exercise_data, user_context_hash, difficulty, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, cache_key as "cacheKey", exercise_type as "exerciseType",
               exercise_data as "exerciseData", difficulty, usage_count as "usageCount",
               created_at as "createdAt", expires_at as "expiresAt"`,
    [
      data.cacheKey,
      data.exerciseType,
      JSON.stringify(data.exerciseData),
      data.userContextHash,
      data.difficulty,
      expiresAt,
    ]
  );

  const exercise = result.rows[0];
  exercise.exerciseData = JSON.parse(exercise.exerciseData);
  return exercise;
}

/**
 * Create batch job
 */
export async function createBatchJob(data: {
  jobType: string;
  status?: string;
  totalItems?: number;
  processedItems?: number;
}): Promise<any> {
  const schema = process.env.TEST_SCHEMA || 'public';

  const result = await testPool.query(
    `INSERT INTO ${schema}.batch_jobs (id, job_type, status, total_items, processed_items, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
     RETURNING id as "jobId", job_type as "jobType", status, total_items as "totalItems",
               processed_items as "processedItems", created_at as "createdAt"`,
    [
      data.jobType,
      data.status || 'pending',
      data.totalItems || 10,
      data.processedItems || 0,
      JSON.stringify({}),
    ]
  );

  return result.rows[0];
}

/**
 * Wait for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify JWT token structure
 */
export function verifyTokenStructure(token: string): boolean {
  return /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(token);
}

/**
 * Global test setup - run once before all integration tests
 */
beforeAll(async () => {
  console.log('Integration test setup started...');

  // Step 1: Ensure test database connection
  try {
    await testPool.query('SELECT NOW()');
    console.log('✓ Test database connected');
  } catch (err) {
    console.error('✗ Test database connection failed:', (err as Error).message);
    throw err;
  }

  // Step 2: Run test migrations to ensure schema is up to date
  try {
    const { runTestMigrations } = await import('../utils/run-test-migrations');
    const schema = process.env.TEST_SCHEMA || 'aves_test';

    console.log(`Running test migrations for schema: ${schema}`);
    const migrationResult = await runTestMigrations(testPool, schema);

    if (!migrationResult.success) {
      console.warn('⚠ Some migrations had issues:');
      migrationResult.errors.forEach(err => console.warn(`  - ${err}`));
      // Continue anyway - some errors might be expected (table already exists)
    } else {
      console.log('✓ All test migrations completed successfully');
    }

    console.log(`✓ Migrations run: ${migrationResult.migrationsRun.join(', ')}`);
  } catch (err) {
    console.error('✗ Migration setup failed:', (err as Error).message);
    // Don't throw - allow tests to run even if migrations partially fail
    console.warn('Continuing with existing schema...');
  }

  console.log('✓ Integration test setup complete');
});

/**
 * Clean database before each test
 */
beforeEach(async () => {
  await cleanDatabase();
});

/**
 * Global test teardown - cleanup after all integration tests
 */
afterAll(async () => {
  console.log('Integration test teardown started...');

  // Step 1: Cleanup batch processor first (stops rate limiter and timers)
  try {
    const { cleanupBatchProcessor } = await import('../../routes/batch');
    if (typeof cleanupBatchProcessor === 'function') {
      cleanupBatchProcessor();
      console.log('✓ Batch processor cleanup complete');
    }
  } catch (err) {
    console.warn('Batch processor cleanup skipped:', (err as Error).message);
  }

  // Step 2: Force clear all timers before database cleanup
  if (typeof jest !== 'undefined') {
    jest.clearAllTimers();
    jest.clearAllMocks();
  }

  // Step 3: Clean database before closing connections
  try {
    await cleanDatabase();
    console.log('✓ Database cleaned');
  } catch (err) {
    console.warn('Database cleanup warning:', (err as Error).message);
  }

  // Step 4: Close test pool connection immediately (no delay needed with allowExitOnIdle)
  try {
    await testPool.end();
    console.log('✓ Test database connection closed');
  } catch (err) {
    console.warn('Test pool cleanup warning:', (err as Error).message);
  }

  console.log('✓ Integration test teardown complete');
});
