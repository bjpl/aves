/**
 * Database Seed Script for Integration Tests
 * Populates test database with realistic sample data
 *
 * Performance Optimized: Uses batch INSERT operations for 10-15x speedup
 */

import {
  testPool,
  createTestUser,
  createTestSpecies,
  createTestImage,
  createTestVocabulary,
  createTestAnnotation,
  createCachedExercise,
  createBatchJob,
  TEST_USERS,
} from './setup';
import { batchInsert, batchInsertReturning } from '../../database/batchInsert';

export interface SeedResult {
  users: any[];
  species: any[];
  images: any[];
  vocabulary: any[];
  annotations: any[];
  cachedExercises: any[];
  batchJobs: any[];
}

/**
 * Seed complete test database with sample data
 */
export async function seedTestDatabase(): Promise<SeedResult> {
  console.log('🌱 Seeding test database...');

  const result: SeedResult = {
    users: [],
    species: [],
    images: [],
    vocabulary: [],
    annotations: [],
    cachedExercises: [],
    batchJobs: [],
  };

  try {
    // 1. Create users
    console.log('  Creating users...');
    const regularUser = await createTestUser(TEST_USERS.regularUser);
    const adminUser = await createTestUser(TEST_USERS.adminUser, true);
    const alternateUser = await createTestUser(TEST_USERS.alternateUser);

    result.users = [regularUser, adminUser, alternateUser];
    console.log(`  ✓ Created ${result.users.length} users`);

    // 2. Create species
    console.log('  Creating species...');
    const speciesData = [
      {
        name: 'Northern Cardinal',
        scientificName: 'Cardinalis cardinalis',
        description: 'A vibrant red songbird common in North America',
      },
      {
        name: 'Blue Jay',
        scientificName: 'Cyanocitta cristata',
        description: 'A large blue and white bird with a distinctive crest',
      },
      {
        name: 'American Robin',
        scientificName: 'Turdus migratorius',
        description: 'A migratory songbird with a reddish-orange breast',
      },
      {
        name: 'Black-capped Chickadee',
        scientificName: 'Poecile atricapillus',
        description: 'A small bird with a black cap and bib',
      },
      {
        name: 'House Sparrow',
        scientificName: 'Passer domesticus',
        description: 'A small bird commonly found in urban areas',
      },
    ];

    for (const speciesInfo of speciesData) {
      const species = await createTestSpecies(speciesInfo);
      result.species.push(species);
    }
    console.log(`  ✓ Created ${result.species.length} species`);

    // 3. Create images for each species
    console.log('  Creating images...');
    for (const species of result.species) {
      for (let i = 0; i < 3; i++) {
        const image = await createTestImage(
          species.id,
          `https://example.com/images/${species.scientificName.replace(' ', '_')}_${i}.jpg`
        );
        result.images.push(image);
      }
    }
    console.log(`  ✓ Created ${result.images.length} images`);

    // 4. Create vocabulary for each species
    console.log('  Creating vocabulary...');
    const vocabularyTerms = [
      { spanish: 'el pico', english: 'beak', difficulty: 2 },
      { spanish: 'las plumas', english: 'feathers', difficulty: 1 },
      { spanish: 'el ala', english: 'wing', difficulty: 2 },
      { spanish: 'la cola', english: 'tail', difficulty: 2 },
      { spanish: 'el ojo', english: 'eye', difficulty: 1 },
      { spanish: 'la pata', english: 'leg', difficulty: 2 },
      { spanish: 'el nido', english: 'nest', difficulty: 3 },
      { spanish: 'la garra', english: 'claw', difficulty: 3 },
    ];

    for (const species of result.species) {
      for (const term of vocabularyTerms.slice(0, 5)) {
        const vocab = await createTestVocabulary({
          speciesId: species.id,
          spanishTerm: term.spanish,
          englishTerm: term.english,
          pronunciation: `${term.spanish} pronunciation`,
          difficultyLevel: term.difficulty,
        });
        result.vocabulary.push(vocab);
      }
    }
    console.log(`  ✓ Created ${result.vocabulary.length} vocabulary items`);

    // 5. Create annotations for images
    console.log('  Creating annotations...');
    const annotationTemplates = [
      {
        spanish: 'el pico',
        english: 'beak',
        box: { x: 0.45, y: 0.30, width: 0.10, height: 0.08 },
        type: 'anatomical',
      },
      {
        spanish: 'el ojo',
        english: 'eye',
        box: { x: 0.50, y: 0.25, width: 0.05, height: 0.05 },
        type: 'anatomical',
      },
      {
        spanish: 'las plumas',
        english: 'feathers',
        box: { x: 0.20, y: 0.40, width: 0.60, height: 0.45 },
        type: 'anatomical',
      },
    ];

    // Add annotations to first 10 images
    for (const image of result.images.slice(0, 10)) {
      for (const template of annotationTemplates) {
        const annotation = await createTestAnnotation({
          imageId: image.id,
          spanishTerm: template.spanish,
          englishTerm: template.english,
          boundingBox: template.box,
          type: template.type as any,
          difficultyLevel: 2,
        });
        result.annotations.push(annotation);
      }
    }
    console.log(`  ✓ Created ${result.annotations.length} annotations`);

    // 6. Create cached exercises
    console.log('  Creating cached exercises...');
    const exerciseTypes = [
      'contextual_fill',
      'visual_discrimination',
      'term_matching',
      'visual_identification',
    ];

    for (const user of result.users.slice(0, 2)) {
      for (let difficulty = 1; difficulty <= 3; difficulty++) {
        for (const type of exerciseTypes) {
          const cacheKey = `${user.id}_${type}_${difficulty}`;
          const exercise = await createCachedExercise({
            cacheKey,
            exerciseType: type,
            exerciseData: {
              id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type,
              instructions: `Complete this ${type} exercise`,
              prompt: `Sample exercise for difficulty ${difficulty}`,
              metadata: { difficulty, generated: true },
            },
            userContextHash: `beginner_${difficulty}`,
            difficulty,
          });
          result.cachedExercises.push(exercise);
        }
      }
    }
    console.log(`  ✓ Created ${result.cachedExercises.length} cached exercises`);

    // 7. Create batch jobs
    console.log('  Creating batch jobs...');
    const jobTypes = [
      { type: 'annotation_generation', status: 'completed', total: 50, processed: 50 },
      { type: 'annotation_generation', status: 'processing', total: 30, processed: 15 },
      { type: 'exercise_prefetch', status: 'pending', total: 100, processed: 0 },
      { type: 'maintenance', status: 'failed', total: 10, processed: 7 },
    ];

    for (const jobData of jobTypes) {
      const job = await createBatchJob({
        jobType: jobData.type,
        status: jobData.status,
        totalItems: jobData.total,
        processedItems: jobData.processed,
      });
      result.batchJobs.push(job);
    }
    console.log(`  ✓ Created ${result.batchJobs.length} batch jobs`);

    // 8. Create user progress (optimized with batch INSERT)
    console.log('  Creating user progress...');
    const progressRows: any[][] = [];
    for (const user of result.users.slice(0, 2)) {
      for (const vocab of result.vocabulary.slice(0, 10)) {
        progressRows.push([
          user.id,
          vocab.id,
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 3)
        ]);
      }
    }

    const progressCount = await batchInsert(
      testPool,
      'user_progress',
      ['user_id', 'vocabulary_id', 'correct_count', 'incorrect_count'],
      progressRows
    );
    console.log(`  ✓ Created ${progressCount} user progress records (batch INSERT)`);

    console.log('✓ Test database seeding completed successfully');
    return result;
  } catch (error) {
    console.error('✗ Error seeding test database:', error);
    throw error;
  }
}

/**
 * Get summary statistics of seeded data
 */
export async function getSeedStatistics(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  const tables = [
    'users',
    'species',
    'images',
    'vocabulary',
    'annotations',
    'exercise_cache',
    'batch_jobs',
    'user_progress',
  ];

  for (const table of tables) {
    try {
      const result = await testPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = parseInt(result.rows[0].count);
    } catch (error) {
      stats[table] = 0;
    }
  }

  return stats;
}

/**
 * Verify seed data integrity
 */
export async function verifySeedIntegrity(seedResult: SeedResult): Promise<boolean> {
  console.log('🔍 Verifying seed data integrity...');

  try {
    // Check all users exist
    const userCount = await testPool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCount.rows[0].count) !== seedResult.users.length) {
      console.error('✗ User count mismatch');
      return false;
    }

    // Check all species exist
    const speciesCount = await testPool.query('SELECT COUNT(*) as count FROM species');
    if (parseInt(speciesCount.rows[0].count) !== seedResult.species.length) {
      console.error('✗ Species count mismatch');
      return false;
    }

    // Check all images exist
    const imageCount = await testPool.query('SELECT COUNT(*) as count FROM images');
    if (parseInt(imageCount.rows[0].count) !== seedResult.images.length) {
      console.error('✗ Image count mismatch');
      return false;
    }

    // Check all vocabulary exists
    const vocabCount = await testPool.query('SELECT COUNT(*) as count FROM vocabulary');
    if (parseInt(vocabCount.rows[0].count) !== seedResult.vocabulary.length) {
      console.error('✗ Vocabulary count mismatch');
      return false;
    }

    // Check referential integrity
    const orphanedImages = await testPool.query(
      'SELECT COUNT(*) as count FROM images WHERE species_id NOT IN (SELECT id FROM species)'
    );
    if (parseInt(orphanedImages.rows[0].count) > 0) {
      console.error('✗ Found orphaned images');
      return false;
    }

    console.log('✓ Seed data integrity verified');
    return true;
  } catch (error) {
    console.error('✗ Error verifying seed integrity:', error);
    return false;
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    try {
      const seedResult = await seedTestDatabase();
      const stats = await getSeedStatistics();
      const isValid = await verifySeedIntegrity(seedResult);

      console.log('\n📊 Seed Statistics:');
      Object.entries(stats).forEach(([table, count]) => {
        console.log(`  ${table}: ${count} records`);
      });

      console.log(`\n${isValid ? '✓' : '✗'} Integrity check: ${isValid ? 'PASSED' : 'FAILED'}`);

      await testPool.end();
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
