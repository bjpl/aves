/**
 * Spaced Repetition System (SRS) Routes
 *
 * Exposes API endpoints for the SM-2 based spaced repetition system.
 * Manages vocabulary learning progression, review scheduling, and mastery tracking.
 *
 * @module routes/srs
 */

import { Router, Request, Response } from 'express';
import { spacedRepetitionService } from '../services/SpacedRepetitionService';
import { authenticateToken } from '../middleware/auth';
import { error as logError, info } from '../utils/logger';

const router = Router();

// Apply authentication to all SRS routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/srs/due:
 * @description Routes are mounted at /api/srs, so the full path is /api/srs/due
 *   get:
 *     summary: Get terms due for review
 *     description: Returns vocabulary terms that are scheduled for review based on SM-2 algorithm
 *     tags: [SRS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of due terms to return
 *     responses:
 *       200:
 *         description: List of terms due for review
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   termId:
 *                     type: string
 *                   spanishTerm:
 *                     type: string
 *                   englishTerm:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *                   repetitions:
 *                     type: integer
 *                   easeFactor:
 *                     type: number
 *                   intervalDays:
 *                     type: integer
 *                   nextReviewAt:
 *                     type: string
 *                     format: date-time
 *                   lastReviewedAt:
 *                     type: string
 *                     format: date-time
 *                   masteryLevel:
 *                     type: integer
 *                   timesCorrect:
 *                     type: integer
 *                   timesIncorrect:
 *                     type: integer
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/due', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit as string) || 20),
      100
    );

    const dueTerms = await spacedRepetitionService.getDueTerms(userId, limit);

    info('Fetched due terms', { userId, count: dueTerms.length, limit });
    res.json(dueTerms);
  } catch (err) {
    logError('Error fetching due terms', err as Error);
    res.status(500).json({ error: 'Failed to fetch due terms' });
  }
});

/**
 * @swagger
 * /api/srs/stats:
 *   get:
 *     summary: Get user's SRS statistics
 *     description: Returns overall progress statistics including mastery levels and review streak
 *     tags: [SRS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's SRS statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTerms:
 *                   type: integer
 *                   description: Total number of terms tracked
 *                 mastered:
 *                   type: integer
 *                   description: Terms with mastery level >= 80
 *                 learning:
 *                   type: integer
 *                   description: Terms with mastery level between 1 and 79
 *                 dueForReview:
 *                   type: integer
 *                   description: Terms scheduled for review now
 *                 averageMastery:
 *                   type: number
 *                   description: Average mastery level across all terms
 *                 streak:
 *                   type: integer
 *                   description: Consecutive days with reviews
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const stats = await spacedRepetitionService.getUserStats(userId);

    info('Fetched user stats', { userId, stats });
    res.json(stats);
  } catch (err) {
    logError('Error fetching user stats', err as Error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

/**
 * @swagger
 * /api/srs/review:
 *   post:
 *     summary: Record a review result
 *     description: Records user's response quality and updates the SM-2 algorithm scheduling
 *     tags: [SRS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termId
 *               - quality
 *             properties:
 *               termId:
 *                 type: string
 *                 description: ID of the vocabulary term
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Response quality (0=complete failure, 5=perfect recall)
 *               responseTimeMs:
 *                 type: integer
 *                 description: Optional response time in milliseconds
 *     responses:
 *       200:
 *         description: Review recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: object
 *                   description: Updated term progress (same as GET /srs/term/:termId)
 *       400:
 *         description: Invalid input (missing fields or quality out of range)
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/review', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { termId, quality, responseTimeMs } = req.body;

    // Validate required fields
    if (!termId) {
      res.status(400).json({ error: 'termId is required' });
      return;
    }

    if (quality === undefined || quality === null) {
      res.status(400).json({ error: 'quality is required' });
      return;
    }

    // Validate quality range
    const qualityNum = parseInt(quality);
    if (isNaN(qualityNum) || qualityNum < 0 || qualityNum > 5) {
      res.status(400).json({ error: 'quality must be between 0 and 5' });
      return;
    }

    const progress = await spacedRepetitionService.recordReview({
      userId,
      termId,
      quality: qualityNum,
      responseTimeMs: responseTimeMs ? parseInt(responseTimeMs) : undefined
    });

    if (!progress) {
      res.status(500).json({ error: 'Failed to record review' });
      return;
    }

    info('Review recorded', { userId, termId, quality: qualityNum });
    res.json({ success: true, progress });
  } catch (err) {
    logError('Error recording review', err as Error);
    res.status(500).json({ error: 'Failed to record review' });
  }
});

/**
 * @swagger
 * /api/srs/discover:
 *   post:
 *     summary: Mark term as discovered
 *     description: Records first exposure to a term and schedules initial review
 *     tags: [SRS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termId
 *             properties:
 *               termId:
 *                 type: string
 *                 description: ID of the vocabulary term discovered
 *     responses:
 *       200:
 *         description: Term marked as discovered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input (missing termId)
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { termId } = req.body;

    if (!termId) {
      res.status(400).json({ error: 'termId is required' });
      return;
    }

    await spacedRepetitionService.markTermDiscovered(userId, termId);

    info('Term marked as discovered', { userId, termId });
    res.json({ success: true, message: 'Term marked as discovered' });
  } catch (err) {
    logError('Error marking term discovered', err as Error);
    res.status(500).json({ error: 'Failed to mark term as discovered' });
  }
});

/**
 * @swagger
 * /api/srs/term/{termId}:
 *   get:
 *     summary: Get progress for specific term
 *     description: Returns detailed progress information for a single vocabulary term
 *     tags: [SRS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: termId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the vocabulary term
 *     responses:
 *       200:
 *         description: Term progress information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 termId:
 *                   type: string
 *                 spanishTerm:
 *                   type: string
 *                 englishTerm:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *                 repetitions:
 *                   type: integer
 *                 easeFactor:
 *                   type: number
 *                 intervalDays:
 *                   type: integer
 *                 nextReviewAt:
 *                   type: string
 *                   format: date-time
 *                 lastReviewedAt:
 *                   type: string
 *                   format: date-time
 *                 masteryLevel:
 *                   type: integer
 *                 timesCorrect:
 *                   type: integer
 *                 timesIncorrect:
 *                   type: integer
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Term not found or not yet discovered
 *       500:
 *         description: Server error
 */
router.get('/term/:termId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { termId } = req.params;

    const progress = await spacedRepetitionService.getTermProgress(userId, termId);

    if (!progress) {
      res.status(404).json({ error: 'Term progress not found' });
      return;
    }

    info('Fetched term progress', { userId, termId });
    res.json(progress);
  } catch (err) {
    logError('Error fetching term progress', err as Error);
    res.status(500).json({ error: 'Failed to fetch term progress' });
  }
});

export default router;
