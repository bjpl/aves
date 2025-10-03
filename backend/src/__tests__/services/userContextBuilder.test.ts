// CONCEPT: Tests for User Context Builder
// WHY: Ensure accurate performance analysis and context generation
// PATTERN: Unit tests with mocked database

import { Pool } from 'pg';
import {
  UserContextBuilder,
  UserPerformance,
  ExerciseHistoryItem,
  Level,
  Difficulty
} from '../../services/userContextBuilder';

// Mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn()
} as unknown as Pool;

describe('UserContextBuilder', () => {
  let builder: UserContextBuilder;

  beforeEach(() => {
    builder = new UserContextBuilder(mockPool);
    jest.clearAllMocks();
  });

  describe('calculateLevel', () => {
    it('should classify as beginner with < 20 exercises', () => {
      const performance: UserPerformance = {
        totalExercises: 15,
        correctAnswers: 12,
        accuracy: 80,
        avgTimePerExercise: 5,
        currentStreak: 3,
        longestStreak: 5
      };

      const level = builder.calculateLevel(performance);
      expect(level).toBe('beginner');
    });

    it('should classify as beginner with low accuracy', () => {
      const performance: UserPerformance = {
        totalExercises: 50,
        correctAnswers: 25,
        accuracy: 50,
        avgTimePerExercise: 5,
        currentStreak: 0,
        longestStreak: 3
      };

      const level = builder.calculateLevel(performance);
      expect(level).toBe('beginner');
    });

    it('should classify as advanced with > 50 exercises and > 85% accuracy', () => {
      const performance: UserPerformance = {
        totalExercises: 60,
        correctAnswers: 54,
        accuracy: 90,
        avgTimePerExercise: 4,
        currentStreak: 10,
        longestStreak: 15
      };

      const level = builder.calculateLevel(performance);
      expect(level).toBe('advanced');
    });

    it('should classify as intermediate for moderate performers', () => {
      const performance: UserPerformance = {
        totalExercises: 35,
        correctAnswers: 25,
        accuracy: 71,
        avgTimePerExercise: 5,
        currentStreak: 4,
        longestStreak: 8
      };

      const level = builder.calculateLevel(performance);
      expect(level).toBe('intermediate');
    });
  });

  describe('calculateDifficulty', () => {
    it('should start at difficulty 1 for new users', () => {
      const performance: UserPerformance = {
        totalExercises: 5,
        correctAnswers: 3,
        accuracy: 60,
        avgTimePerExercise: 6,
        currentStreak: 2,
        longestStreak: 2
      };

      const history: ExerciseHistoryItem[] = [];
      const difficulty = builder.calculateDifficulty(history, performance);

      expect(difficulty).toBe(1);
    });

    it('should increase difficulty for high performers with streaks', () => {
      const performance: UserPerformance = {
        totalExercises: 40,
        correctAnswers: 36,
        accuracy: 90,
        avgTimePerExercise: 4,
        currentStreak: 8,
        longestStreak: 10
      };

      const history: ExerciseHistoryItem[] = Array(10).fill(null).map((_, i) => ({
        exerciseId: `ex-${i}`,
        exerciseType: 'visual_discrimination' as const,
        spanishTerm: 'pico',
        isCorrect: true,
        timeTaken: 4,
        completedAt: new Date()
      }));

      const difficulty = builder.calculateDifficulty(history, performance);
      expect(difficulty).toBeGreaterThanOrEqual(4);
    });

    it('should decrease difficulty for struggling users', () => {
      const performance: UserPerformance = {
        totalExercises: 30,
        correctAnswers: 15,
        accuracy: 50,
        avgTimePerExercise: 8,
        currentStreak: 0,
        longestStreak: 2
      };

      const history: ExerciseHistoryItem[] = Array(10).fill(null).map((_, i) => ({
        exerciseId: `ex-${i}`,
        exerciseType: 'visual_discrimination' as const,
        spanishTerm: 'plumas',
        isCorrect: i % 3 === 0, // 33% accuracy
        timeTaken: 8,
        completedAt: new Date()
      }));

      const difficulty = builder.calculateDifficulty(history, performance);
      expect(difficulty).toBeLessThanOrEqual(2);
    });

    it('should maintain difficulty for consistent performers', () => {
      const performance: UserPerformance = {
        totalExercises: 30,
        correctAnswers: 23,
        accuracy: 77,
        avgTimePerExercise: 5,
        currentStreak: 3,
        longestStreak: 5
      };

      const history: ExerciseHistoryItem[] = Array(10).fill(null).map((_, i) => ({
        exerciseId: `ex-${i}`,
        exerciseType: 'visual_discrimination' as const,
        spanishTerm: 'alas',
        isCorrect: i % 4 !== 0, // 75% accuracy
        timeTaken: 5,
        completedAt: new Date()
      }));

      const difficulty = builder.calculateDifficulty(history, performance);
      expect(difficulty).toBeGreaterThanOrEqual(2);
      expect(difficulty).toBeLessThanOrEqual(4);
    });
  });

  describe('analyzeTopics', () => {
    it('should calculate topic accuracy correctly', () => {
      const history: ExerciseHistoryItem[] = [
        {
          exerciseId: '1',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'pico',
          isCorrect: true,
          timeTaken: 4,
          completedAt: new Date(),
          topics: ['pico']
        },
        {
          exerciseId: '2',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'pico',
          isCorrect: true,
          timeTaken: 3,
          completedAt: new Date(),
          topics: ['pico']
        },
        {
          exerciseId: '3',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'pico',
          isCorrect: false,
          timeTaken: 6,
          completedAt: new Date(),
          topics: ['pico']
        },
        {
          exerciseId: '4',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'plumas',
          isCorrect: true,
          timeTaken: 5,
          completedAt: new Date(),
          topics: ['plumas']
        }
      ];

      const stats = builder.analyzeTopics(history);

      const picoStats = stats.find(s => s.topic === 'pico');
      const plumasStats = stats.find(s => s.topic === 'plumas');

      expect(picoStats).toBeDefined();
      expect(picoStats?.accuracy).toBeCloseTo(0.667, 2); // 2/3 correct
      expect(picoStats?.count).toBe(3);

      expect(plumasStats).toBeDefined();
      expect(plumasStats?.accuracy).toBe(1); // 1/1 correct
      expect(plumasStats?.count).toBe(1);
    });

    it('should calculate average time per topic', () => {
      const history: ExerciseHistoryItem[] = [
        {
          exerciseId: '1',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'alas',
          isCorrect: true,
          timeTaken: 4,
          completedAt: new Date(),
          topics: ['alas']
        },
        {
          exerciseId: '2',
          exerciseType: 'visual_discrimination',
          spanishTerm: 'alas',
          isCorrect: true,
          timeTaken: 6,
          completedAt: new Date(),
          topics: ['alas']
        }
      ];

      const stats = builder.analyzeTopics(history);
      const alasStats = stats.find(s => s.topic === 'alas');

      expect(alasStats?.avgTime).toBe(5); // (4 + 6) / 2
    });

    it('should sort topics by frequency', () => {
      const history: ExerciseHistoryItem[] = [
        ...Array(5).fill(null).map((_, i) => ({
          exerciseId: `pico-${i}`,
          exerciseType: 'visual_discrimination' as const,
          spanishTerm: 'pico',
          isCorrect: true,
          timeTaken: 4,
          completedAt: new Date(),
          topics: ['pico']
        })),
        ...Array(2).fill(null).map((_, i) => ({
          exerciseId: `alas-${i}`,
          exerciseType: 'visual_discrimination' as const,
          spanishTerm: 'alas',
          isCorrect: true,
          timeTaken: 4,
          completedAt: new Date(),
          topics: ['alas']
        }))
      ];

      const stats = builder.analyzeTopics(history);

      expect(stats[0].topic).toBe('pico'); // Most frequent first
      expect(stats[0].count).toBe(5);
      expect(stats[1].topic).toBe('alas');
      expect(stats[1].count).toBe(2);
    });
  });

  describe('getCurrentStreak', () => {
    it('should calculate current streak correctly', () => {
      const history: ExerciseHistoryItem[] = [
        { exerciseId: '1', exerciseType: 'visual_discrimination', spanishTerm: 'pico', isCorrect: true, timeTaken: 4, completedAt: new Date() },
        { exerciseId: '2', exerciseType: 'visual_discrimination', spanishTerm: 'alas', isCorrect: true, timeTaken: 4, completedAt: new Date() },
        { exerciseId: '3', exerciseType: 'visual_discrimination', spanishTerm: 'plumas', isCorrect: true, timeTaken: 4, completedAt: new Date() },
        { exerciseId: '4', exerciseType: 'visual_discrimination', spanishTerm: 'cola', isCorrect: false, timeTaken: 4, completedAt: new Date() },
        { exerciseId: '5', exerciseType: 'visual_discrimination', spanishTerm: 'patas', isCorrect: true, timeTaken: 4, completedAt: new Date() }
      ];

      const streak = builder.getCurrentStreak(history);
      expect(streak).toBe(3); // First 3 are correct
    });

    it('should return 0 for broken streak', () => {
      const history: ExerciseHistoryItem[] = [
        { exerciseId: '1', exerciseType: 'visual_discrimination', spanishTerm: 'pico', isCorrect: false, timeTaken: 4, completedAt: new Date() },
        { exerciseId: '2', exerciseType: 'visual_discrimination', spanishTerm: 'alas', isCorrect: true, timeTaken: 4, completedAt: new Date() }
      ];

      const streak = builder.getCurrentStreak(history);
      expect(streak).toBe(0);
    });

    it('should return 0 for empty history', () => {
      const streak = builder.getCurrentStreak([]);
      expect(streak).toBe(0);
    });
  });

  describe('buildContext', () => {
    it('should build complete context from user data', async () => {
      const userId = 'user-123';

      // Mock getUserPerformance
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          total_exercises: 30,
          correct_answers: 24,
          avg_time: 5,
          accuracy: 80
        }]
      });

      // Mock getExerciseHistory (first call for performance)
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: Array(20).fill(null).map((_, i) => ({
          exercise_id: `ex-${i}`,
          exercise_type: 'visual_discrimination',
          spanish_term: i % 2 === 0 ? 'pico' : 'alas',
          is_correct: i < 16, // 80% accuracy
          time_taken: 5,
          created_at: new Date(),
          annotation_id: i
        }))
      });

      // Mock getExerciseHistory (second call for context)
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: Array(20).fill(null).map((_, i) => ({
          exercise_id: `ex-${i}`,
          exercise_type: 'visual_discrimination',
          spanish_term: i % 2 === 0 ? 'pico' : 'alas',
          is_correct: i < 16, // 80% accuracy
          time_taken: 5,
          created_at: new Date(),
          annotation_id: i
        }))
      });

      // Mock getUnexploredTopics
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { topic: 'plumas' },
          { topic: 'cola' },
          { topic: 'patas' }
        ]
      });

      const context = await builder.buildContext(userId);

      expect(context.userId).toBe(userId);
      expect(context.level).toBeDefined();
      expect(context.difficulty).toBeGreaterThanOrEqual(1);
      expect(context.difficulty).toBeLessThanOrEqual(5);
      expect(context.performance.accuracy).toBe(80);
      expect(context.hash).toBeDefined();
      expect(context.hash.length).toBe(16);
    });
  });

  describe('getContextSummary', () => {
    it('should generate readable summary', () => {
      const mockContext = {
        userId: 'user-123',
        level: 'intermediate' as Level,
        difficulty: 3 as Difficulty,
        weakTopics: ['pico', 'alas'],
        masteredTopics: ['plumas'],
        newTopics: ['cola', 'patas', 'garras'],
        recentErrors: [],
        streak: 5,
        performance: {
          totalExercises: 30,
          correctAnswers: 24,
          accuracy: 80,
          avgTimePerExercise: 5,
          currentStreak: 5,
          longestStreak: 8
        },
        hash: 'abc123def456'
      };

      const summary = builder.getContextSummary(mockContext);

      expect(summary).toContain('user-123');
      expect(summary).toContain('intermediate');
      expect(summary).toContain('3/5');
      expect(summary).toContain('80.0%');
      expect(summary).toContain('Streak: 5');
      expect(summary).toContain('pico, alas');
      expect(summary).toContain('plumas');
    });
  });
});
