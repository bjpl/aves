// Logger available for future debugging
// import logger from '../utils/logger';
import { Pool } from 'pg';

/**
 * Exercise session data
 */
export interface Session {
  id: number;
  session_id: string;
  started_at: Date;
}

/**
 * Result data for a completed exercise
 */
export interface ExerciseResult {
  sessionId: string;
  exerciseType: string;
  annotationId?: number;
  spanishTerm: string;
  userAnswer: string | number | boolean | Record<string, unknown>;
  isCorrect: boolean;
  timeTaken: number; // milliseconds
}

/**
 * Session progress statistics
 */
export interface Progress {
  sessionId: string;
  totalExercises: number;
  correctAnswers: number;
  avgTimePerExercise: number; // milliseconds
  accuracy: string; // percentage as string (e.g., "75.5")
}

/**
 * Term difficulty statistics
 */
export interface DifficultTerm {
  spanish_term: string;
  attempts: number;
  correct: number;
  success_rate: number; // 0-100
}

/**
 * Exercise Service
 *
 * Manages exercise sessions, result tracking, and performance analytics.
 * Provides session-based progress tracking and identifies difficult vocabulary terms.
 *
 * @example
 * ```typescript
 * const exerciseService = new ExerciseService(pool);
 *
 * // Start a session
 * const session = await exerciseService.createSession();
 *
 * // Record results
 * await exerciseService.recordResult({
 *   sessionId: session.session_id,
 *   exerciseType: 'visual_discrimination',
 *   spanishTerm: 'plumas',
 *   userAnswer: 'correct_id',
 *   isCorrect: true,
 *   timeTaken: 3500
 * });
 *
 * // Get progress
 * const progress = await exerciseService.getSessionProgress(session.session_id);
 * logger.info(`Accuracy: ${progress.accuracy}%`);
 * ```
 */
export class ExerciseService {
  constructor(private pool: Pool) {}

  /**
   * Creates a new exercise session
   *
   * Initializes a new learning session for tracking user progress.
   * Session ID can be provided or will be auto-generated.
   *
   * @param sessionId - Optional custom session identifier. Auto-generated if not provided.
   * @returns Session data including ID and start time
   *
   * @example
   * ```typescript
   * // Auto-generated session ID
   * const session = await exerciseService.createSession();
   *
   * // Custom session ID
   * const session = await exerciseService.createSession('user_123_session');
   * ```
   */
  async createSession(sessionId?: string): Promise<Session> {
    const query = `
      INSERT INTO exercise_sessions (session_id)
      VALUES ($1)
      RETURNING id, session_id, started_at
    `;

    const generatedSessionId = sessionId || `session_${Date.now()}`;
    const result = await this.pool.query(query, [generatedSessionId]);

    return result.rows[0];
  }

  /**
   * Records an exercise result and updates session statistics
   *
   * Stores individual exercise results and automatically updates session-level
   * statistics including total exercises completed and correct answers count.
   * Uses a database transaction to ensure data consistency.
   *
   * @param data - Exercise result data including answer, correctness, and time taken
   * @throws {Error} If database transaction fails
   *
   * @example
   * ```typescript
   * await exerciseService.recordResult({
   *   sessionId: 'session_123',
   *   exerciseType: 'visual_discrimination',
   *   spanishTerm: 'plumas',
   *   userAnswer: 'option_id_456',
   *   isCorrect: true,
   *   timeTaken: 3500
   * });
   * ```
   *
   * @remarks
   * - Uses database transaction for atomicity
   * - Automatically updates session statistics
   * - Stores user_answer as JSON
   * - Annotation ID is optional
   */
  async recordResult(data: ExerciseResult): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert exercise result
      const insertQuery = `
        INSERT INTO exercise_results (
          session_id, exercise_type, annotation_id, spanish_term,
          user_answer, is_correct, time_taken
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      await client.query(insertQuery, [
        data.sessionId,
        data.exerciseType,
        data.annotationId || null,
        data.spanishTerm,
        JSON.stringify(data.userAnswer),
        data.isCorrect,
        data.timeTaken
      ]);

      // Update session stats
      const updateQuery = `
        UPDATE exercise_sessions
        SET
          exercises_completed = exercises_completed + 1,
          correct_answers = correct_answers + $2
        WHERE session_id = $1
      `;

      await client.query(updateQuery, [data.sessionId, data.isCorrect ? 1 : 0]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves progress statistics for a session
   *
   * Calculates comprehensive session statistics including total exercises,
   * correct answers, average time per exercise, and accuracy percentage.
   *
   * @param sessionId - Session identifier to retrieve progress for
   * @returns Progress statistics with accuracy as percentage string
   *
   * @example
   * ```typescript
   * const progress = await exerciseService.getSessionProgress('session_123');
   * logger.info(`Completed ${progress.totalExercises} exercises`);
   * logger.info(`Accuracy: ${progress.accuracy}%`);
   * logger.info(`Avg time: ${progress.avgTimePerExercise}ms`);
   * ```
   *
   * @remarks
   * - Returns default values if no exercises completed
   * - Accuracy is calculated as (correctAnswers / totalExercises * 100)
   * - Average time is in milliseconds
   */
  async getSessionProgress(sessionId: string): Promise<Progress> {
    const query = `
      SELECT
        COUNT(*) as "totalExercises",
        COUNT(CASE WHEN is_correct THEN 1 END) as "correctAnswers",
        AVG(time_taken) as "avgTimePerExercise"
      FROM exercise_results
      WHERE session_id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);

    const stats = result.rows[0] || {
      totalExercises: 0,
      correctAnswers: 0,
      avgTimePerExercise: 0
    };

    const accuracy = stats.totalExercises > 0
      ? (stats.correctAnswers / stats.totalExercises * 100).toFixed(1)
      : '0';

    return {
      sessionId,
      totalExercises: parseInt(stats.totalExercises),
      correctAnswers: parseInt(stats.correctAnswers),
      avgTimePerExercise: parseFloat(stats.avgTimePerExercise) || 0,
      accuracy
    };
  }

  /**
   * Identifies vocabulary terms that users find difficult
   *
   * Analyzes exercise results to find Spanish terms with low success rates.
   * Returns top 10 most difficult terms based on historical performance.
   *
   * @returns Array of difficult terms sorted by success rate (lowest first)
   *
   * @example
   * ```typescript
   * const difficultTerms = await exerciseService.getDifficultTerms();
   * difficultTerms.forEach(term => {
   *   logger.info(`${term.spanish_term}: ${term.success_rate}% success rate`);
   *   logger.info(`Attempts: ${term.attempts}, Correct: ${term.correct}`);
   * });
   * ```
   *
   * @remarks
   * - Requires minimum 3 attempts per term for inclusion
   * - Returns top 10 most difficult terms
   * - Success rate calculated as (correct / attempts * 100)
   * - Ordered by success rate ascending (most difficult first)
   */
  async getDifficultTerms(): Promise<DifficultTerm[]> {
    const query = `
      SELECT
        spanish_term,
        COUNT(*) as attempts,
        COUNT(CASE WHEN is_correct THEN 1 END) as correct,
        ROUND(COUNT(CASE WHEN is_correct THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as success_rate
      FROM exercise_results
      WHERE spanish_term IS NOT NULL
      GROUP BY spanish_term
      HAVING COUNT(*) >= 3
      ORDER BY success_rate ASC
      LIMIT 10
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => ({
      spanish_term: row.spanish_term,
      attempts: parseInt(row.attempts),
      correct: parseInt(row.correct),
      success_rate: parseFloat(row.success_rate)
    }));
  }
}
