import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { ExerciseService, ExerciseResult } from '../services';
import { ExerciseValidationService } from '../services/exerciseValidationService';
import { validateBody, validateParams } from '../middleware/validate';
import {
  exerciseSessionStartSchema,
  exerciseResultSchema,
  exerciseSessionProgressSchema
} from '../validation/schemas';
import { error as logError, info as logInfo } from '../utils/logger';

const router = Router();
const exerciseService = new ExerciseService(pool);
const validationService = new ExerciseValidationService();

/**
 * @openapi
 * /api/exercises/session/start:
 *   post:
 *     tags:
 *       - Exercises
 *     summary: Start a new exercise session
 *     description: Creates a new learning session for tracking exercise progress
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Optional custom session ID
 *                 example: session_1234567890
 *     responses:
 *       200:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               session:
 *                 id: session_1234567890
 *                 createdAt: 2025-01-15T10:30:00Z
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/exercises/result:
 *   post:
 *     tags:
 *       - Exercises
 *     summary: Record exercise result with validation
 *     description: Validates and records user's exercise result, calculating accurate scores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - exerciseType
 *               - userAnswer
 *               - exercise
 *             properties:
 *               sessionId:
 *                 type: string
 *               exerciseType:
 *                 type: string
 *               annotationId:
 *                 type: number
 *               spanishTerm:
 *                 type: string
 *               userAnswer:
 *                 type: object
 *               exercise:
 *                 type: object
 *                 description: Complete exercise object for validation
 *               timeTaken:
 *                 type: number
 *               attemptsCount:
 *                 type: number
 *               hintsUsed:
 *                 type: number
 *     responses:
 *       200:
 *         description: Result validated and recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 validation:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     score:
 *                       type: number
 *                     feedback:
 *                       type: string
 *                     accuracy:
 *                       type: number
 *       400:
 *         description: Validation failed
 */
router.post(
  '/exercises/result',
  validateBody(exerciseResultSchema),
  async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      exerciseType,
      annotationId,
      spanishTerm,
      userAnswer,
      exercise,
      timeTaken,
      attemptsCount,
      hintsUsed
    } = req.body;

    // Validate the exercise result
    const validationResult = validationService.validateExerciseResult({
      exerciseType,
      userAnswer,
      exercise,
      timeTaken,
      attemptsCount,
      hintsUsed
    });

    logInfo('Exercise validation completed', {
      exerciseType,
      isValid: validationResult.isValid,
      score: validationResult.score
    });

    // Record result with validation data
    const resultData: ExerciseResult = {
      sessionId,
      exerciseType,
      annotationId,
      spanishTerm,
      userAnswer,
      isCorrect: validationResult.isValid,
      timeTaken: timeTaken || 0
    };

    await exerciseService.recordResult(resultData);

    res.json({
      success: true,
      validation: {
        isValid: validationResult.isValid,
        score: validationResult.score,
        feedback: validationResult.feedback,
        accuracy: validationService.calculateAccuracy(validationResult),
        metadata: validationResult.metadata
      }
    });
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

/**
 * @openapi
 * /api/exercises/difficult-terms:
 *   get:
 *     tags:
 *       - Exercises
 *     summary: Get vocabulary terms with low accuracy
 *     description: Returns terms that learners find most challenging based on exercise performance
 *     responses:
 *       200:
 *         description: Difficult terms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 difficultTerms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       spanishTerm:
 *                         type: string
 *                       englishTerm:
 *                         type: string
 *                       accuracy:
 *                         type: number
 *                         format: float
 *                         description: Success rate (0-1)
 *                       attempts:
 *                         type: integer
 *             example:
 *               difficultTerms:
 *                 - spanishTerm: el pico
 *                   englishTerm: beak
 *                   accuracy: 0.45
 *                   attempts: 20
 *       500:
 *         description: Server error
 */
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