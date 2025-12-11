/**
 * Integration Tests: Species & Vocabulary Flow
 * Tests the complete user learning flow including species browsing,
 * vocabulary retrieval, and progress tracking
 */

import request from 'supertest';
import express from 'express';
import speciesRouter from '../../routes/species';
import vocabularyRouter from '../../routes/vocabulary';
import authRouter from '../../routes/auth';
import {
  testPool,
  createTestUser,
  createTestSpecies,
  createTestVocabulary,
  TEST_USERS,
} from './setup';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', authRouter);
app.use('/api', speciesRouter);
app.use('/api', vocabularyRouter);

// NOTE: Integration tests require a real database connection.
// Skip when running in CI/local environments without database.
// Set RUN_INTEGRATION_TESTS=true to run these tests.
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegrationTests ? describe : describe.skip)('Integration: Species & Vocabulary Flow', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser(TEST_USERS.regularUser);
    userToken = user.token;
    userId = user.id;
  });

  describe('Species Browsing Flow', () => {
    let species1: any;
    let species2: any;
    let species3: any;

    beforeEach(async () => {
      // Create multiple test species
      species1 = await createTestSpecies({
        name: 'Northern Cardinal',
        scientificName: 'Cardinalis cardinalis',
        description: 'A bright red songbird',
      });

      species2 = await createTestSpecies({
        name: 'Blue Jay',
        scientificName: 'Cyanocitta cristata',
        description: 'A blue and white bird',
      });

      species3 = await createTestSpecies({
        name: 'American Robin',
        scientificName: 'Turdus migratorius',
        description: 'A common migratory bird',
      });
    });

    it('should retrieve list of all species', async () => {
      const response = await request(app)
        .get('/api/species')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      // Verify species data structure
      response.body.forEach((species: any) => {
        expect(species).toHaveProperty('id');
        expect(species).toHaveProperty('name');
        expect(species).toHaveProperty('scientificName');
        expect(species).toHaveProperty('description');
      });
    });

    it('should retrieve specific species by ID', async () => {
      const response = await request(app)
        .get(`/api/species/${species1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(species1.id);
      expect(response.body.name).toBe('Northern Cardinal');
      expect(response.body.scientificName).toBe('Cardinalis cardinalis');
    });

    it('should return 404 for non-existent species', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/species/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should support pagination for species list', async () => {
      // Add more species
      for (let i = 4; i <= 15; i++) {
        await createTestSpecies({
          name: `Test Bird ${i}`,
          scientificName: `Species testus ${i}`,
        });
      }

      // Request first page
      const page1Response = await request(app)
        .get('/api/species?limit=5&offset=0')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page1Response.body.length).toBe(5);

      // Request second page
      const page2Response = await request(app)
        .get('/api/species?limit=5&offset=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page2Response.body.length).toBe(5);

      // Verify different results
      expect(page1Response.body[0].id).not.toBe(page2Response.body[0].id);
    });
  });

  describe('Vocabulary Retrieval Flow', () => {
    let testSpecies: any;
    let vocabulary: any[];

    beforeEach(async () => {
      testSpecies = await createTestSpecies();

      // Create multiple vocabulary items
      vocabulary = [];
      const terms = [
        { spanish: 'el pico', english: 'beak', difficulty: 2 },
        { spanish: 'las plumas', english: 'feathers', difficulty: 1 },
        { spanish: 'el ala', english: 'wing', difficulty: 2 },
        { spanish: 'la cola', english: 'tail', difficulty: 2 },
        { spanish: 'el nido', english: 'nest', difficulty: 3 },
      ];

      for (const term of terms) {
        const vocab = await createTestVocabulary({
          speciesId: testSpecies.id,
          spanishTerm: term.spanish,
          englishTerm: term.english,
          pronunciation: `${term.spanish} pronunciation`,
          difficultyLevel: term.difficulty,
        });
        vocabulary.push(vocab);
      }
    });

    it('should retrieve vocabulary for specific species', async () => {
      const response = await request(app)
        .get(`/api/vocabulary/species/${testSpecies.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(5);

      // Verify vocabulary structure
      response.body.forEach((vocab: any) => {
        expect(vocab).toHaveProperty('id');
        expect(vocab).toHaveProperty('spanishTerm');
        expect(vocab).toHaveProperty('englishTerm');
        expect(vocab).toHaveProperty('pronunciation');
        expect(vocab).toHaveProperty('difficultyLevel');
      });
    });

    it('should filter vocabulary by difficulty level', async () => {
      const response = await request(app)
        .get(`/api/vocabulary/species/${testSpecies.id}?difficulty=2`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3); // 3 terms with difficulty 2

      response.body.forEach((vocab: any) => {
        expect(vocab.difficultyLevel).toBe(2);
      });
    });

    it('should return empty array for species with no vocabulary', async () => {
      const emptySpecies = await createTestSpecies({
        name: 'Empty Species',
      });

      const response = await request(app)
        .get(`/api/vocabulary/species/${emptySpecies.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should retrieve specific vocabulary term by ID', async () => {
      const vocab = vocabulary[0];

      const response = await request(app)
        .get(`/api/vocabulary/${vocab.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(vocab.id);
      expect(response.body.spanishTerm).toBe(vocab.spanishTerm);
      expect(response.body.englishTerm).toBe(vocab.englishTerm);
    });
  });

  describe('User Progress Tracking Flow', () => {
    let testSpecies: any;
    let vocabulary: any[];

    beforeEach(async () => {
      testSpecies = await createTestSpecies();

      vocabulary = [];
      for (let i = 0; i < 3; i++) {
        const vocab = await createTestVocabulary({
          speciesId: testSpecies.id,
          spanishTerm: `término ${i}`,
          englishTerm: `term ${i}`,
          difficultyLevel: 2,
        });
        vocabulary.push(vocab);
      }
    });

    it('should record user progress for vocabulary', async () => {
      const progressData = {
        userId,
        vocabularyId: vocabulary[0].id,
        correctCount: 3,
        incorrectCount: 1,
        lastPracticed: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${userToken}`)
        .send(progressData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.correctCount).toBe(3);
      expect(response.body.incorrectCount).toBe(1);

      // Verify progress was saved in database
      const dbResult = await testPool.query(
        'SELECT * FROM user_progress WHERE user_id = $1 AND vocabulary_id = $2',
        [userId, vocabulary[0].id]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].correct_count).toBe(3);
    });

    it('should retrieve user progress for all vocabulary', async () => {
      // Create progress for multiple terms
      for (const vocab of vocabulary) {
        await testPool.query(
          `INSERT INTO user_progress (user_id, vocabulary_id, correct_count, incorrect_count)
           VALUES ($1, $2, $3, $4)`,
          [userId, vocab.id, Math.floor(Math.random() * 10), Math.floor(Math.random() * 5)]
        );
      }

      const response = await request(app)
        .get(`/api/progress/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((progress: any) => {
        expect(progress).toHaveProperty('vocabularyId');
        expect(progress).toHaveProperty('correctCount');
        expect(progress).toHaveProperty('incorrectCount');
      });
    });

    it('should update existing progress on subsequent practice', async () => {
      // Initial progress
      await testPool.query(
        `INSERT INTO user_progress (user_id, vocabulary_id, correct_count, incorrect_count)
         VALUES ($1, $2, 5, 2)`,
        [userId, vocabulary[0].id]
      );

      // Update progress
      const updateData = {
        userId,
        vocabularyId: vocabulary[0].id,
        correctCount: 8,
        incorrectCount: 3,
      };

      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(201);

      expect(response.body.correctCount).toBe(8);
      expect(response.body.incorrectCount).toBe(3);

      // Verify database was updated, not duplicated
      const dbResult = await testPool.query(
        'SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1 AND vocabulary_id = $2',
        [userId, vocabulary[0].id]
      );

      expect(parseInt(dbResult.rows[0].count)).toBe(1);
    });

    it('should calculate mastery percentage based on progress', async () => {
      // Create progress with good performance
      await testPool.query(
        `INSERT INTO user_progress (user_id, vocabulary_id, correct_count, incorrect_count)
         VALUES ($1, $2, 20, 2)`,
        [userId, vocabulary[0].id]
      );

      const response = await request(app)
        .get(`/api/progress/user/${userId}/vocabulary/${vocabulary[0].id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('masteryPercentage');
      expect(response.body.masteryPercentage).toBeGreaterThan(80);
    });
  });

  describe('Complete Learning Flow Integration', () => {
    it('should complete full learning cycle: browse → select → practice → track', async () => {
      // Step 1: Browse available species
      const speciesListResponse = await request(app)
        .get('/api/species')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(speciesListResponse.body.length).toBeGreaterThan(0);

      // Step 2: Create test species and vocabulary
      const species = await createTestSpecies({
        name: 'Learning Test Bird',
      });

      const vocab1 = await createTestVocabulary({
        speciesId: species.id,
        spanishTerm: 'el pico',
        englishTerm: 'beak',
        difficultyLevel: 1,
      });

      const vocab2 = await createTestVocabulary({
        speciesId: species.id,
        spanishTerm: 'las plumas',
        englishTerm: 'feathers',
        difficultyLevel: 2,
      });

      // Step 3: Retrieve species vocabulary
      const vocabularyResponse = await request(app)
        .get(`/api/vocabulary/species/${species.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(vocabularyResponse.body.length).toBe(2);

      // Step 4: Practice first term and record progress
      const progress1Response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          vocabularyId: vocab1.id,
          correctCount: 5,
          incorrectCount: 0,
        })
        .expect(201);

      expect(progress1Response.body.correctCount).toBe(5);

      // Step 5: Practice second term
      const progress2Response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          vocabularyId: vocab2.id,
          correctCount: 3,
          incorrectCount: 2,
        })
        .expect(201);

      expect(progress2Response.body.correctCount).toBe(3);

      // Step 6: Retrieve overall user progress
      const overallProgressResponse = await request(app)
        .get(`/api/progress/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(overallProgressResponse.body.length).toBe(2);

      // Step 7: Verify progress stats
      const totalCorrect = overallProgressResponse.body.reduce(
        (sum: number, p: any) => sum + p.correctCount,
        0
      );
      const totalIncorrect = overallProgressResponse.body.reduce(
        (sum: number, p: any) => sum + p.incorrectCount,
        0
      );

      expect(totalCorrect).toBe(8);
      expect(totalIncorrect).toBe(2);

      // Step 8: Verify database consistency
      const dbProgressResult = await testPool.query(
        'SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1',
        [userId]
      );

      expect(parseInt(dbProgressResult.rows[0].count)).toBe(2);
    });

    it('should handle multi-species learning session', async () => {
      // Create multiple species with vocabulary
      const species = [];
      const allVocabulary = [];

      for (let i = 0; i < 3; i++) {
        const sp = await createTestSpecies({
          name: `Bird Species ${i}`,
        });
        species.push(sp);

        for (let j = 0; j < 2; j++) {
          const vocab = await createTestVocabulary({
            speciesId: sp.id,
            spanishTerm: `término ${i}-${j}`,
            englishTerm: `term ${i}-${j}`,
            difficultyLevel: j + 1,
          });
          allVocabulary.push(vocab);
        }
      }

      // Practice vocabulary from different species
      for (const vocab of allVocabulary) {
        await request(app)
          .post('/api/progress')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            userId,
            vocabularyId: vocab.id,
            correctCount: Math.floor(Math.random() * 5) + 1,
            incorrectCount: Math.floor(Math.random() * 2),
          })
          .expect(201);
      }

      // Verify all progress was recorded
      const progressResponse = await request(app)
        .get(`/api/progress/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(progressResponse.body.length).toBe(6); // 3 species × 2 vocabulary each

      // Verify vocabulary can be retrieved for each species
      for (const sp of species) {
        const vocabResponse = await request(app)
          .get(`/api/vocabulary/species/${sp.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(vocabResponse.body.length).toBe(2);
      }
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent species retrieval requests', async () => {
      // Create multiple species
      for (let i = 0; i < 5; i++) {
        await createTestSpecies({ name: `Concurrent Bird ${i}` });
      }

      // Make concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/species')
            .set('Authorization', `Bearer ${userToken}`)
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(5);
      });
    });

    it('should handle concurrent progress updates', async () => {
      const species = await createTestSpecies();
      const vocab = await createTestVocabulary({
        speciesId: species.id,
        spanishTerm: 'test',
        englishTerm: 'test',
      });

      // Make concurrent progress updates
      const requests = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post('/api/progress')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              userId,
              vocabularyId: vocab.id,
              correctCount: index + 1,
              incorrectCount: 0,
            })
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify final state
      const finalProgress = await testPool.query(
        'SELECT correct_count FROM user_progress WHERE user_id = $1 AND vocabulary_id = $2',
        [userId, vocab.id]
      );

      // Should have the last update
      expect(finalProgress.rows.length).toBe(1);
      expect(finalProgress.rows[0].correct_count).toBeGreaterThan(0);
    });
  });
});
