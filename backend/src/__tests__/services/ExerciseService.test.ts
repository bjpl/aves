import { Pool } from 'pg';
import { ExerciseService, ExerciseResult } from '../../services/ExerciseService';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('ExerciseService', () => {
  let service: ExerciseService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new ExerciseService(mockPool);

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with generated ID', async () => {
      const mockSession = {
        id: 1,
        session_id: 'session_123',
        started_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockSession],
      });

      const result = await service.createSession();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_sessions'),
        [expect.stringMatching(/^session_\d+$/)]
      );
      expect(result).toEqual(mockSession);
    });

    it('should create a session with provided ID', async () => {
      const customSessionId = 'custom_session_456';
      const mockSession = {
        id: 2,
        session_id: customSessionId,
        started_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockSession],
      });

      const result = await service.createSession(customSessionId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_sessions'),
        [customSessionId]
      );
      expect(result.session_id).toBe(customSessionId);
    });

    it('should handle database errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.createSession()).rejects.toThrow('Database error');
    });
  });

  describe('recordResult', () => {
    it('should record a correct answer and update session stats', async () => {
      const resultData: ExerciseResult = {
        sessionId: 'session_123',
        exerciseType: 'multiple_choice',
        annotationId: 1,
        spanishTerm: 'pájaro',
        userAnswer: 'bird',
        isCorrect: true,
        timeTaken: 5000,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT result
        .mockResolvedValueOnce({}) // UPDATE session
        .mockResolvedValueOnce({}); // COMMIT

      await service.recordResult(resultData);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_results'),
        [
          resultData.sessionId,
          resultData.exerciseType,
          resultData.annotationId,
          resultData.spanishTerm,
          JSON.stringify(resultData.userAnswer),
          resultData.isCorrect,
          resultData.timeTaken,
        ]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exercise_sessions'),
        [resultData.sessionId, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should record an incorrect answer', async () => {
      const resultData: ExerciseResult = {
        sessionId: 'session_123',
        exerciseType: 'multiple_choice',
        spanishTerm: 'pájaro',
        userAnswer: 'dog',
        isCorrect: false,
        timeTaken: 3000,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await service.recordResult(resultData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exercise_sessions'),
        [resultData.sessionId, 0]
      );
    });

    it('should rollback on error', async () => {
      const resultData: ExerciseResult = {
        sessionId: 'session_123',
        exerciseType: 'multiple_choice',
        spanishTerm: 'pájaro',
        userAnswer: 'bird',
        isCorrect: true,
        timeTaken: 5000,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed'));

      await expect(service.recordResult(resultData)).rejects.toThrow('Insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getSessionProgress', () => {
    it('should return progress for a session with exercises', async () => {
      const sessionId = 'session_123';
      const mockStats = {
        totalExercises: 10,
        correctAnswers: 8,
        avgTimePerExercise: 4500,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockStats],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sessionId]
      );
      expect(result).toEqual({
        sessionId,
        totalExercises: 10,
        correctAnswers: 8,
        avgTimePerExercise: 4500,
        accuracy: '80.0',
      });
    });

    it('should return zero stats for empty session', async () => {
      const sessionId = 'session_empty';
      const mockStats = {
        totalExercises: 0,
        correctAnswers: 0,
        avgTimePerExercise: null,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockStats],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(result).toEqual({
        sessionId,
        totalExercises: 0,
        correctAnswers: 0,
        avgTimePerExercise: 0,
        accuracy: '0',
      });
    });

    it('should handle string values from database (type conversion)', async () => {
      const sessionId = 'session_456';
      const mockStats = {
        totalExercises: '15',
        correctAnswers: '12',
        avgTimePerExercise: '3200.5',
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockStats],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(result).toEqual({
        sessionId,
        totalExercises: 15,
        correctAnswers: 12,
        avgTimePerExercise: 3200.5,
        accuracy: '80.0',
      });
    });

    it('should handle empty result set', async () => {
      const sessionId = 'session_nonexistent';

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(result).toEqual({
        sessionId,
        totalExercises: 0,
        correctAnswers: 0,
        avgTimePerExercise: 0,
        accuracy: '0',
      });
    });
  });

  describe('getDifficultTerms', () => {
    it('should return terms with low success rates', async () => {
      const mockTerms = [
        {
          spanish_term: 'difícil',
          attempts: '10',
          correct: '3',
          success_rate: '30.0',
        },
        {
          spanish_term: 'complejo',
          attempts: '8',
          correct: '2',
          success_rate: '25.0',
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockTerms,
      });

      const result = await service.getDifficultTerms();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY spanish_term')
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        spanish_term: 'difícil',
        attempts: 10,
        correct: 3,
        success_rate: 30.0,
      });
    });

    it('should return empty array if no difficult terms', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await service.getDifficultTerms();

      expect(result).toEqual([]);
    });
  });
});
