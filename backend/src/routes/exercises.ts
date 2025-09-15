import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// POST /api/exercises/session/start
router.post('/exercises/session/start', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    const query = `
      INSERT INTO exercise_sessions (session_id)
      VALUES ($1)
      RETURNING id, session_id, started_at
    `;

    const result = await pool.query(query, [sessionId || `session_${Date.now()}`]);

    res.json({
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error starting exercise session:', error);
    res.status(500).json({ error: 'Failed to start exercise session' });
  }
});

// POST /api/exercises/result
router.post('/exercises/result', async (req: Request, res: Response) => {
  try {
    const { sessionId, exerciseType, annotationId, spanishTerm, userAnswer, isCorrect, timeTaken } = req.body;

    const query = `
      INSERT INTO exercise_results (
        session_id, exercise_type, annotation_id, spanish_term,
        user_answer, is_correct, time_taken
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    await pool.query(query, [
      sessionId,
      exerciseType,
      annotationId || null,
      spanishTerm,
      JSON.stringify(userAnswer),
      isCorrect,
      timeTaken
    ]);

    // Update session stats
    const updateQuery = `
      UPDATE exercise_sessions
      SET
        exercises_completed = exercises_completed + 1,
        correct_answers = correct_answers + $2
      WHERE session_id = $1
    `;

    await pool.query(updateQuery, [sessionId, isCorrect ? 1 : 0]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording exercise result:', error);
    res.status(500).json({ error: 'Failed to record exercise result' });
  }
});

// GET /api/exercises/session/:sessionId/progress
router.get('/exercises/session/:sessionId/progress', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const query = `
      SELECT
        COUNT(*) as "totalExercises",
        COUNT(CASE WHEN is_correct THEN 1 END) as "correctAnswers",
        AVG(time_taken) as "avgTimePerExercise"
      FROM exercise_results
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    const stats = result.rows[0] || {
      totalExercises: 0,
      correctAnswers: 0,
      avgTimePerExercise: 0
    };

    res.json({
      sessionId,
      ...stats,
      accuracy: stats.totalExercises > 0
        ? (stats.correctAnswers / stats.totalExercises * 100).toFixed(1)
        : 0
    });
  } catch (error) {
    console.error('Error fetching session progress:', error);
    res.status(500).json({ error: 'Failed to fetch session progress' });
  }
});

// GET /api/exercises/difficult-terms
router.get('/exercises/difficult-terms', async (req: Request, res: Response) => {
  try {
    // Find terms that are frequently answered incorrectly
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

    const result = await pool.query(query);

    res.json({
      difficultTerms: result.rows
    });
  } catch (error) {
    console.error('Error fetching difficult terms:', error);
    res.status(500).json({ error: 'Failed to fetch difficult terms' });
  }
});

export default router;