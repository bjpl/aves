// CONCEPT: User Context Builder for Personalized Exercise Generation
// WHY: Analyze user performance to create intelligent AI prompts
// PATTERN: Service that aggregates user data into actionable context

import { Pool } from 'pg';
import crypto from 'crypto';
import { ExerciseType } from '../types/exercise.types';

/**
 * User skill level classification
 */
export type Level = 'beginner' | 'intermediate' | 'advanced';

/**
 * Difficulty rating from 1 (easiest) to 5 (hardest)
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Exercise result from user history
 */
export interface ExerciseHistoryItem {
  exerciseId: string;
  exerciseType: ExerciseType;
  spanishTerm: string;
  isCorrect: boolean;
  timeTaken: number;
  completedAt: Date;
  topics?: string[];
}

/**
 * Topic performance statistics
 */
export interface TopicStats {
  topic: string;
  accuracy: number;
  count: number;
  avgTime: number;
  lastSeen?: Date;
}

/**
 * User performance metrics
 */
export interface UserPerformance {
  totalExercises: number;
  correctAnswers: number;
  accuracy: number;
  avgTimePerExercise: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Complete user context for AI exercise generation
 */
export interface UserContext {
  userId: string;
  level: Level;
  difficulty: Difficulty;
  weakTopics: string[];        // accuracy < 70%
  masteredTopics: string[];    // accuracy > 90%
  newTopics: string[];         // never seen
  recentErrors: ExerciseHistoryItem[];  // last 5 incorrect
  streak: number;
  performance: UserPerformance;
  hash: string;                // For cache key generation
}

/**
 * Service for building user context from performance data
 */
export class UserContextBuilder {
  constructor(private pool: Pool) {}

  /**
   * Build complete user context for exercise generation
   */
  async buildContext(userId: string): Promise<UserContext> {
    // Fetch user performance data
    const performance = await this.getUserPerformance(userId);
    const history = await this.getExerciseHistory(userId, 20);

    // Calculate level based on overall performance
    const level = this.calculateLevel(performance);

    // Calculate adaptive difficulty
    const difficulty = this.calculateDifficulty(history, performance);

    // Analyze topic performance
    const topicStats = this.analyzeTopics(history);

    // Identify weak topics (< 70% accuracy)
    const weakTopics = topicStats
      .filter(t => t.accuracy < 0.70 && t.count >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)
      .map(t => t.topic);

    // Identify mastered topics (> 90% accuracy)
    const masteredTopics = topicStats
      .filter(t => t.accuracy > 0.90 && t.count >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5)
      .map(t => t.topic);

    // Get unexplored topics
    const newTopics = await this.getUnexploredTopics(userId);

    // Get recent errors for review
    const recentErrors = history
      .filter(h => !h.isCorrect)
      .slice(0, 5);

    // Calculate current streak
    const streak = this.getCurrentStreak(history);

    // Generate hash for cache key
    const hash = this.generateContextHash({
      level,
      difficulty,
      weakTopics,
      masteredTopics,
      newTopics
    });

    return {
      userId,
      level,
      difficulty,
      weakTopics,
      masteredTopics,
      newTopics,
      recentErrors,
      streak,
      performance,
      hash
    };
  }

  /**
   * Get user's overall performance metrics
   */
  async getUserPerformance(userId: string): Promise<UserPerformance> {
    const query = `
      SELECT
        COUNT(*) as total_exercises,
        COUNT(CASE WHEN is_correct THEN 1 END) as correct_answers,
        AVG(time_taken) as avg_time,
        COUNT(CASE WHEN is_correct THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as accuracy
      FROM exercise_results
      WHERE session_id IN (
        SELECT session_id FROM exercise_sessions WHERE session_id LIKE $1
      )
    `;

    const result = await this.pool.query(query, [`${userId}%`]);
    const row = result.rows[0];

    // Calculate streaks from history
    const history = await this.getExerciseHistory(userId, 50);
    const currentStreak = this.getCurrentStreak(history);
    const longestStreak = this.getLongestStreak(history);

    return {
      totalExercises: parseInt(row.total_exercises) || 0,
      correctAnswers: parseInt(row.correct_answers) || 0,
      accuracy: parseFloat(row.accuracy) || 0,
      avgTimePerExercise: parseFloat(row.avg_time) || 0,
      currentStreak,
      longestStreak
    };
  }

  /**
   * Get user's exercise history
   */
  async getExerciseHistory(userId: string, limit: number = 20): Promise<ExerciseHistoryItem[]> {
    const query = `
      SELECT
        er.id as exercise_id,
        er.exercise_type,
        er.spanish_term,
        er.is_correct,
        er.time_taken,
        er.created_at as completed_at,
        er.annotation_id
      FROM exercise_results er
      WHERE er.session_id IN (
        SELECT session_id FROM exercise_sessions WHERE session_id LIKE $1
      )
      ORDER BY er.created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [`${userId}%`, limit]);

    return result.rows.map(row => ({
      exerciseId: row.exercise_id,
      exerciseType: row.exercise_type as ExerciseType,
      spanishTerm: row.spanish_term,
      isCorrect: row.is_correct,
      timeTaken: row.time_taken,
      completedAt: new Date(row.completed_at),
      topics: this.extractTopicsFromTerm(row.spanish_term)
    }));
  }

  /**
   * Calculate user skill level
   */
  calculateLevel(performance: UserPerformance): Level {
    const { totalExercises, accuracy } = performance;

    // Beginner: < 20 exercises OR < 60% accuracy
    if (totalExercises < 20 || accuracy < 60) {
      return 'beginner';
    }

    // Advanced: > 50 exercises AND > 85% accuracy
    if (totalExercises > 50 && accuracy > 85) {
      return 'advanced';
    }

    // Intermediate: everything else
    return 'intermediate';
  }

  /**
   * Calculate adaptive difficulty (1-5)
   * Adjusts based on recent performance and streaks
   */
  calculateDifficulty(history: ExerciseHistoryItem[], performance: UserPerformance): Difficulty {
    // Get recent performance (last 10 exercises)
    const recent = history.slice(0, 10);
    const recentAccuracy = recent.length > 0
      ? recent.filter(r => r.isCorrect).length / recent.length
      : 0.5;

    const streak = this.getCurrentStreak(history);

    // Start with base difficulty from level
    let baseDifficulty = 3; // Default: medium

    if (performance.totalExercises < 10) {
      baseDifficulty = 1; // Start easy for new users
    } else if (performance.accuracy > 85) {
      baseDifficulty = 4;
    } else if (performance.accuracy < 60) {
      baseDifficulty = 2;
    }

    // Adjust based on recent performance
    let adjustedDifficulty = baseDifficulty;

    // Increase difficulty if succeeding
    if (recentAccuracy > 0.85 && streak > 5) {
      adjustedDifficulty = Math.min(5, baseDifficulty + 1);
    }

    // Decrease difficulty if struggling
    if (recentAccuracy < 0.60) {
      adjustedDifficulty = Math.max(1, baseDifficulty - 1);
    }

    // Gradually increase for consistent performers
    if (recentAccuracy >= 0.75 && recentAccuracy <= 0.85 && streak > 10) {
      adjustedDifficulty = Math.min(5, baseDifficulty + 0.5);
    }

    return Math.round(adjustedDifficulty) as Difficulty;
  }

  /**
   * Analyze performance by topic
   */
  analyzeTopics(history: ExerciseHistoryItem[]): TopicStats[] {
    const topicMap = new Map<string, {
      correct: number;
      total: number;
      totalTime: number;
      lastSeen?: Date;
    }>();

    history.forEach(exercise => {
      const topics = exercise.topics || [exercise.spanishTerm];

      topics.forEach(topic => {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, { correct: 0, total: 0, totalTime: 0 });
        }

        const stats = topicMap.get(topic)!;
        stats.total++;
        stats.totalTime += exercise.timeTaken;
        if (exercise.isCorrect) stats.correct++;

        // Track last seen
        if (!stats.lastSeen || exercise.completedAt > stats.lastSeen) {
          stats.lastSeen = exercise.completedAt;
        }
      });
    });

    return Array.from(topicMap.entries())
      .map(([topic, stats]) => ({
        topic,
        accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
        count: stats.total,
        avgTime: stats.total > 0 ? stats.totalTime / stats.total : 0,
        lastSeen: stats.lastSeen
      }))
      .sort((a, b) => b.count - a.count); // Sort by frequency
  }

  /**
   * Get topics user hasn't seen yet
   */
  async getUnexploredTopics(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT a.label_spanish as topic
      FROM annotations a
      WHERE a.label_spanish NOT IN (
        SELECT DISTINCT spanish_term
        FROM exercise_results er
        WHERE er.session_id IN (
          SELECT session_id FROM exercise_sessions WHERE session_id LIKE $1
        )
      )
      LIMIT 10
    `;

    const result = await this.pool.query(query, [`${userId}%`]);
    return result.rows.map(row => row.topic).filter(Boolean);
  }

  /**
   * Calculate current success streak
   */
  getCurrentStreak(history: ExerciseHistoryItem[]): number {
    let streak = 0;

    for (const exercise of history) {
      if (exercise.isCorrect) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate longest streak in history
   */
  private getLongestStreak(history: ExerciseHistoryItem[]): number {
    let longestStreak = 0;
    let currentStreak = 0;

    for (const exercise of history) {
      if (exercise.isCorrect) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return longestStreak;
  }

  /**
   * Extract topics from term name
   * Simple implementation - can be enhanced with taxonomy later
   */
  private extractTopicsFromTerm(term: string): string[] {
    // For now, just return the term itself
    // Future: parse into categories like "colors", "parts", "behaviors", etc.
    return [term];
  }

  /**
   * Generate cache key hash from context
   */
  private generateContextHash(context: Partial<UserContext>): string {
    const key = JSON.stringify({
      level: context.level,
      difficulty: context.difficulty,
      weakTopics: context.weakTopics?.sort(),
      masteredTopics: context.masteredTopics?.sort(),
      newTopics: context.newTopics?.sort()
    });

    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get context summary for logging/debugging
   */
  getContextSummary(context: UserContext): string {
    return [
      `User: ${context.userId}`,
      `Level: ${context.level}`,
      `Difficulty: ${context.difficulty}/5`,
      `Accuracy: ${context.performance.accuracy.toFixed(1)}%`,
      `Streak: ${context.streak}`,
      `Weak Topics: ${context.weakTopics.join(', ') || 'none'}`,
      `Mastered: ${context.masteredTopics.join(', ') || 'none'}`,
      `New Topics: ${context.newTopics.slice(0, 3).join(', ') || 'none'}`
    ].join(' | ');
  }
}
