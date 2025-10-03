import { Pool } from 'pg';

export interface Session {
  id: number;
  session_id: string;
  started_at: Date;
}

export interface ExerciseResult {
  sessionId: string;
  exerciseType: string;
  annotationId?: number;
  spanishTerm: string;
  userAnswer: any;
  isCorrect: boolean;
  timeTaken: number;
}

export interface Progress {
  sessionId: string;
  totalExercises: number;
  correctAnswers: number;
  avgTimePerExercise: number;
  accuracy: string;
}

export interface DifficultTerm {
  spanish_term: string;
  attempts: number;
  correct: number;
  success_rate: number;
}

export class ExerciseService {
  constructor(private pool: Pool) {}

  /**
   * Create a new exercise session
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
   * Record an exercise result and update session stats
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
   * Get progress for a specific session
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
   * Get terms that users find difficult (low success rate)
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
