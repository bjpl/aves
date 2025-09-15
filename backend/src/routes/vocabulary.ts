import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';

const router = Router();

// GET /api/vocabulary/enrichment/:term
router.get('/vocabulary/enrichment/:term', async (req: Request, res: Response) => {
  try {
    const { term } = req.params;

    // Check cache first
    const cacheQuery = `
      SELECT
        etymology,
        mnemonic,
        related_terms as "relatedTerms",
        common_phrases as "commonPhrases",
        usage_examples as "usageExamples"
      FROM vocabulary_enrichment
      WHERE spanish_term = $1
    `;

    const cacheResult = await pool.query(cacheQuery, [term]);

    if (cacheResult.rows.length > 0) {
      return res.json(cacheResult.rows[0]);
    }

    // Generate enrichment data (in production, this would call external APIs)
    const enrichment = await generateEnrichment(term);

    // Cache the result
    const insertQuery = `
      INSERT INTO vocabulary_enrichment (
        spanish_term, etymology, mnemonic, related_terms, common_phrases, usage_examples
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (spanish_term) DO UPDATE SET
        etymology = EXCLUDED.etymology,
        mnemonic = EXCLUDED.mnemonic,
        related_terms = EXCLUDED.related_terms,
        common_phrases = EXCLUDED.common_phrases,
        usage_examples = EXCLUDED.usage_examples,
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(insertQuery, [
      term,
      enrichment.etymology,
      enrichment.mnemonic,
      JSON.stringify(enrichment.relatedTerms),
      JSON.stringify(enrichment.commonPhrases),
      JSON.stringify(enrichment.usageExamples)
    ]);

    res.json(enrichment);
  } catch (error) {
    console.error('Error fetching enrichment:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary enrichment' });
  }
});

// POST /api/vocabulary/learning-event
router.post('/vocabulary/learning-event', async (req: Request, res: Response) => {
  try {
    const { userId, annotationId, eventType, disclosureLevel, interactionDuration, correctResponse, metadata } = req.body;

    const query = `
      INSERT INTO learning_events (
        user_id, annotation_id, event_type, disclosure_level,
        interaction_duration, correct_response, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at as timestamp
    `;

    const values = [
      userId || null,
      annotationId,
      eventType,
      disclosureLevel,
      interactionDuration,
      correctResponse || null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      eventId: result.rows[0].id,
      timestamp: result.rows[0].timestamp
    });
  } catch (error) {
    console.error('Error recording learning event:', error);
    res.status(500).json({ error: 'Failed to record learning event' });
  }
});

// GET /api/vocabulary/mastery/:userId/:annotationId
router.get('/vocabulary/mastery/:userId/:annotationId', async (req: Request, res: Response) => {
  try {
    const { userId, annotationId } = req.params;

    const query = `
      SELECT
        disclosure_level as "disclosureLevel",
        view_count as "viewCount",
        total_time_spent as "totalTimeSpent",
        mastery_score as "masteryScore",
        next_review_date as "nextReviewDate",
        review_interval as "reviewInterval",
        ease_factor as "easeFactor",
        repetition_number as "repetitionNumber"
      FROM vocabulary_mastery
      WHERE user_id = $1 AND annotation_id = $2
    `;

    const result = await pool.query(query, [userId, annotationId]);

    if (result.rows.length === 0) {
      return res.json({
        disclosureLevel: 0,
        viewCount: 0,
        totalTimeSpent: 0,
        masteryScore: 0,
        nextReviewDate: null,
        reviewInterval: 1,
        easeFactor: 2.5,
        repetitionNumber: 0
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching mastery:', error);
    res.status(500).json({ error: 'Failed to fetch mastery data' });
  }
});

// POST /api/vocabulary/review
router.post('/vocabulary/review', async (req: Request, res: Response) => {
  try {
    const { userId, annotationId, quality } = req.body;

    // Get current schedule
    const getQuery = `
      SELECT ease_factor, review_interval, repetition_number
      FROM vocabulary_mastery
      WHERE user_id = $1 AND annotation_id = $2
    `;

    const current = await pool.query(getQuery, [userId, annotationId]);

    let easeFactor = 2.5;
    let interval = 1;
    let repetition = 0;

    if (current.rows.length > 0) {
      easeFactor = parseFloat(current.rows[0].ease_factor);
      interval = current.rows[0].review_interval;
      repetition = current.rows[0].repetition_number;
    }

    // Calculate next review using SM-2 algorithm
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    if (quality < 3) {
      interval = 1;
      repetition = 0;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition++;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // Update or insert mastery record
    const upsertQuery = `
      INSERT INTO vocabulary_mastery (
        user_id, annotation_id, spanish_term, ease_factor,
        review_interval, repetition_number, next_review_date
      )
      SELECT $1, $2, a.spanish_term, $3, $4, $5, $6
      FROM annotations a WHERE a.id = $2
      ON CONFLICT (user_id, annotation_id) DO UPDATE SET
        ease_factor = $3,
        review_interval = $4,
        repetition_number = $5,
        next_review_date = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await pool.query(upsertQuery, [
      userId, annotationId, easeFactor, interval, repetition, nextReviewDate
    ]);

    // Record review event
    await pool.query(
      `INSERT INTO learning_events (user_id, annotation_id, event_type, correct_response)
       VALUES ($1, $2, 'review', $3)`,
      [userId, annotationId, quality >= 3]
    );

    res.json({
      success: true,
      nextReviewDate,
      interval,
      easeFactor,
      repetition
    });
  } catch (error) {
    console.error('Error processing review:', error);
    res.status(500).json({ error: 'Failed to process review' });
  }
});

// GET /api/vocabulary/review-queue/:userId
router.get('/vocabulary/review-queue/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
        vm.annotation_id as "annotationId",
        vm.spanish_term as "spanishTerm",
        a.english_term as "englishTerm",
        vm.next_review_date as "nextReviewDate",
        vm.review_interval as "interval",
        vm.repetition_number as "repetition"
      FROM vocabulary_mastery vm
      JOIN annotations a ON a.id = vm.annotation_id
      WHERE vm.user_id = $1 AND vm.next_review_date <= CURRENT_DATE
      ORDER BY vm.next_review_date ASC
      LIMIT 20
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      queue: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

// Helper function to generate enrichment data
async function generateEnrichment(term: string) {
  // In production, this would call etymology APIs, generate mnemonics, etc.
  return {
    etymology: `The word "${term}" has interesting origins...`,
    mnemonic: `Remember "${term}" by thinking of...`,
    relatedTerms: [
      { term: 'related1', relationship: 'synonym', definition: 'Similar meaning' },
      { term: 'related2', relationship: 'related', definition: 'Contextually related' }
    ],
    commonPhrases: [
      { spanish: `${term} común`, english: 'Common phrase', literal: 'Literal translation' }
    ],
    usageExamples: [
      `El ${term} es muy importante.`,
      `¿Dónde está el ${term}?`
    ]
  };
}

export default router;