import request from 'supertest';
import express from 'express';
import exercisesRouter from '../../routes/exercises';
import { pool } from '../../database/connection';

// Mock the database pool with transaction support
jest.mock('../../database/connection', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  return {
    pool: {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    },
    // Export mockClient so tests can access it
    __mockClient: mockClient
  };
});

// Get mockClient reference from the mocked module
const mockClient = (require('../../database/connection') as any).__mockClient;

const app = express();
app.use(express.json());
app.use('/api', exercisesRouter);

describe('Exercise API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock client for each test
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  describe('POST /api/exercises/session/start', () => {
    it('should create new exercise session with provided sessionId', async () => {
      const mockSession = {
        id: 1,
        session_id: 'test-session-123',
        started_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession]
      });

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({ sessionId: 'test-session-123' })
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body.session.session_id).toBe('test-session-123');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_sessions'),
        ['test-session-123']
      );
    });

    it('should auto-generate sessionId if not provided', async () => {
      const mockSession = {
        id: 1,
        session_id: 'session_1234567890',
        started_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession]
      });

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({})
        .expect(200);

      expect(response.body.session.session_id).toMatch(/^session_\d+$/);
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({ sessionId: 'test-session' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to start exercise session');
    });
  });

  describe('POST /api/exercises/result', () => {
    it('should record exercise result successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT result
        .mockResolvedValueOnce({ rows: [] }) // UPDATE session
        .mockResolvedValueOnce(undefined); // COMMIT

      const resultData = {
        sessionId: 'test-session',
        exerciseType: 'visual_discrimination',
        annotationId: 123,
        spanishTerm: 'pico',
        userAnswer: 'ann-123',
        isCorrect: true,
        timeTaken: 5200
      };

      const response = await request(app)
        .post('/api/exercises/result')
        .send(resultData)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Response may include validation data
      if (response.body.validation) {
        expect(response.body.validation).toHaveProperty('isValid');
      }
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle incorrect answers', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined); // COMMIT

      const resultData = {
        sessionId: 'test-session',
        exerciseType: 'contextual_fill',
        spanishTerm: 'ala',
        userAnswer: 'pico',
        isCorrect: false,
        timeTaken: 3.5
      };

      await request(app)
        .post('/api/exercises/result')
        .send(resultData)
        .expect(200);

      // Verify UPDATE query increments exercises_completed but not correct_answers
      const updateCall = mockClient.query.mock.calls[2]; // After BEGIN and INSERT
      expect(updateCall[1]).toEqual(['test-session', 0]);
    });

    it('should stringify userAnswer as JSON', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined); // COMMIT

      const resultData = {
        sessionId: 'test-session',
        exerciseType: 'term_matching',
        spanishTerm: 'multiple',
        userAnswer: [
          { spanish: 'pico', english: 'beak' },
          { spanish: 'ala', english: 'wing' }
        ],
        isCorrect: true,
        timeTaken: 12.3
      };

      await request(app)
        .post('/api/exercises/result')
        .send(resultData)
        .expect(200);

      const insertCall = mockClient.query.mock.calls[1]; // After BEGIN
      const userAnswerParam = insertCall[1][4];
      expect(typeof userAnswerParam).toBe('string');
      expect(JSON.parse(userAnswerParam)).toEqual(resultData.userAnswer);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT fails

      const response = await request(app)
        .post('/api/exercises/result')
        .send({
          sessionId: 'test-session',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'pico',
          userAnswer: 'test',
          isCorrect: true,
          timeTaken: 5.0
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to record exercise result');
    });
  });

  describe('GET /api/exercises/session/:sessionId/progress', () => {
    it('should return session progress stats', async () => {
      const mockStats = {
        totalExercises: '10',
        correctAnswers: '8',
        avgTimePerExercise: '4.5'
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockStats]
      });

      const response = await request(app)
        .get('/api/exercises/session/test-session-123/progress')
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: 'test-session-123',
        totalExercises: 10,
        correctAnswers: 8,
        avgTimePerExercise: 4.5,
        accuracy: '80.0'
      });
    });

    it('should calculate accuracy correctly', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          totalExercises: '15',
          correctAnswers: '12',
          avgTimePerExercise: '6.2'
        }]
      });

      const response = await request(app)
        .get('/api/exercises/session/test-session/progress')
        .expect(200);

      expect(response.body.accuracy).toBe('80.0');
    });

    it('should handle empty sessions', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/exercises/session/empty-session/progress')
        .expect(200);

      expect(response.body).toMatchObject({
        totalExercises: 0,
        correctAnswers: 0,
        avgTimePerExercise: 0,
        accuracy: '0'
      });
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app)
        .get('/api/exercises/session/test-session/progress')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch session progress');
    });
  });

  describe('GET /api/exercises/difficult-terms', () => {
    it('should return terms with low success rates', async () => {
      const mockDifficultTerms = [
        { spanish_term: 'pico', attempts: '5', correct: '2', success_rate: '40.0' },
        { spanish_term: 'ala', attempts: '4', correct: '1', success_rate: '25.0' }
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockDifficultTerms
      });

      const response = await request(app)
        .get('/api/exercises/difficult-terms')
        .expect(200);

      expect(response.body.difficultTerms).toHaveLength(2);
      expect(response.body.difficultTerms[0].spanish_term).toBe('pico');
      expect(response.body.difficultTerms[0].success_rate).toBe(40);
    });

    it('should only return terms with 3+ attempts', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/exercises/difficult-terms')
        .expect(200);

      expect(response.body.difficultTerms).toEqual([]);

      const queryCall = (pool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('HAVING COUNT(*) >= 3');
    });

    it('should limit results to 10 terms', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: Array(10).fill({ spanish_term: 'term', attempts: '5', correct: '2', success_rate: '40.0' })
      });

      await request(app)
        .get('/api/exercises/difficult-terms')
        .expect(200);

      const queryCall = (pool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('LIMIT 10');
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Query error'));

      const response = await request(app)
        .get('/api/exercises/difficult-terms')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch difficult terms');
    });
  });
});
