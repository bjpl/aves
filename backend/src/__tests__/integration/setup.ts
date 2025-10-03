/**
 * Integration Test Setup
 * Database utilities and test data helpers for integration tests
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Test database connection (separate from main pool)
export const testPool = new Pool({
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'aves_test',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
      await testPool.query(`DELETE FROM ${table}`);
    } catch (err) {
      // Table might not exist, that's okay
      console.warn(`Could not clean table ${table}:`, (err as Error).message);
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

  const result = await testPool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
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
  const speciesData = {
    name: data?.name || 'Test Cardinal',
    scientificName: data?.scientificName || 'Cardinalis cardinalis',
    description: data?.description || 'A test bird species',
  };

  const result = await testPool.query(
    `INSERT INTO species (name, scientific_name, description)
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
  const imageUrl = url || `https://example.com/images/${randomUUID()}.jpg`;

  const result = await testPool.query(
    `INSERT INTO images (species_id, url)
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
  const result = await testPool.query(
    `INSERT INTO vocabulary (species_id, spanish_term, english_term, pronunciation, difficulty_level)
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
  const result = await testPool.query(
    `INSERT INTO annotations (image_id, spanish_term, english_term, bounding_box, annotation_type, difficulty_level)
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
  annotation.boundingBox = JSON.parse(annotation.boundingBox);
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
  const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const result = await testPool.query(
    `INSERT INTO exercise_cache (cache_key, exercise_type, exercise_data, user_context_hash, difficulty, expires_at)
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
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const result = await testPool.query(
    `INSERT INTO batch_jobs (job_id, job_type, status, total_items, processed_items, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING job_id as "jobId", job_type as "jobType", status, total_items as "totalItems",
               processed_items as "processedItems", created_at as "createdAt"`,
    [
      jobId,
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
 * Global test setup
 */
beforeAll(async () => {
  // Ensure test database connection
  try {
    await testPool.query('SELECT NOW()');
    console.log('✓ Test database connected');
  } catch (err) {
    console.error('✗ Test database connection failed:', (err as Error).message);
    throw err;
  }
});

/**
 * Clean database before each test
 */
beforeEach(async () => {
  await cleanDatabase();
});

/**
 * Global test teardown
 */
afterAll(async () => {
  await cleanDatabase();
  await testPool.end();
  console.log('✓ Test database connection closed');
});
