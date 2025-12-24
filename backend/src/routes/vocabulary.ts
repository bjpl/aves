import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { VocabularyService, Interaction } from '../services';
import { validateBody, validateParams } from '../middleware/validate';
import {
  vocabularyEnrichmentSchema,
  vocabularyInteractionSchema,
  vocabularySessionProgressSchema
} from '../validation/schemas';
import { error as logError } from '../utils/logger';

const router = Router();
const vocabularyService = new VocabularyService(pool);

// GET /api/vocabulary/enrichment/:term
router.get(
  '/vocabulary/enrichment/:term',
  validateParams(vocabularyEnrichmentSchema),
  async (req: Request, res: Response) => {
  try {
    const { term } = req.params;

    const enrichment = await vocabularyService.getEnrichment(term);

    res.json(enrichment);
  } catch (err) {
    logError('Error fetching enrichment', err as Error);
    res.status(500).json({ error: 'Failed to fetch vocabulary enrichment' });
  }
});

// POST /api/vocabulary/track-interaction
router.post(
  '/vocabulary/track-interaction',
  validateBody(vocabularyInteractionSchema),
  async (req: Request, res: Response) => {
  try {
    const { sessionId, annotationId, spanishTerm, disclosureLevel } = req.body;

    const interactionData: Interaction = {
      sessionId,
      annotationId,
      spanishTerm,
      disclosureLevel
    };

    await vocabularyService.trackInteraction(interactionData);

    res.json({ success: true });
  } catch (err) {
    logError('Error tracking interaction', err as Error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// GET /api/vocabulary/session-progress/:sessionId
router.get(
  '/vocabulary/session-progress/:sessionId',
  validateParams(vocabularySessionProgressSchema),
  async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const progress = await vocabularyService.getSessionProgress(sessionId);

    res.json(progress);
  } catch (err) {
    logError('Error fetching session progress', err as Error);
    res.status(500).json({ error: 'Failed to fetch session progress' });
  }
});

export default router;