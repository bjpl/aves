import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { ExerciseService, ExerciseResult } from '../services';
import { validateBody, validateParams } from '../middleware/validate';
import {
  exerciseSessionStartSchema,
  exerciseResultSchema,
  exerciseSessionProgressSchema
} from '../validation/schemas';
import { error as logError } from '../utils/logger';

const router = Router();
const exerciseService = new ExerciseService(pool);

// POST /api/exercises/session/start
router.post(
  '/exercises/session/start',
  validateBody(exerciseSessionStartSchema),
  async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    const session = await exerciseService.createSession(sessionId);

    res.json({
      session
    });
  } catch (err) {
    logError('Error starting exercise session', err as Error);
    res.status(500).json({ error: 'Failed to start exercise session' });
  }
});

// POST /api/exercises/result
router.post(
  '/exercises/result',
  validateBody(exerciseResultSchema),
  async (req: Request, res: Response) => {
  try {
    const { sessionId, exerciseType, annotationId, spanishTerm, userAnswer, isCorrect, timeTaken } = req.body;

    const resultData: ExerciseResult = {
      sessionId,
      exerciseType,
      annotationId,
      spanishTerm,
      userAnswer,
      isCorrect,
      timeTaken
    };

    await exerciseService.recordResult(resultData);

    res.json({ success: true });
  } catch (err) {
    logError('Error recording exercise result', err as Error);
    res.status(500).json({ error: 'Failed to record exercise result' });
  }
});

// GET /api/exercises/session/:sessionId/progress
router.get(
  '/exercises/session/:sessionId/progress',
  validateParams(exerciseSessionProgressSchema),
  async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const progress = await exerciseService.getSessionProgress(sessionId);

    res.json(progress);
  } catch (err) {
    logError('Error fetching session progress', err as Error);
    res.status(500).json({ error: 'Failed to fetch session progress' });
  }
});

// GET /api/exercises/difficult-terms
router.get('/exercises/difficult-terms', async (_req: Request, res: Response) => {
  try {
    const difficultTerms = await exerciseService.getDifficultTerms();

    res.json({
      difficultTerms
    });
  } catch (err) {
    logError('Error fetching difficult terms', err as Error);
    res.status(500).json({ error: 'Failed to fetch difficult terms' });
  }
});

export default router;