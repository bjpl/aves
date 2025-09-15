import { Router, Request, Response } from 'express';
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

    // Generate basic enrichment data
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
        usage_examples = EXCLUDED.usage_examples
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

// POST /api/vocabulary/track-interaction
router.post('/vocabulary/track-interaction', async (req: Request, res: Response) => {
  try {
    const { sessionId, annotationId, spanishTerm, disclosureLevel } = req.body;

    // Simple interaction tracking
    const query = `
      INSERT INTO vocabulary_interactions (
        user_session_id, annotation_id, spanish_term, disclosure_level
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `;

    await pool.query(query, [sessionId, annotationId, spanishTerm, disclosureLevel]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// GET /api/vocabulary/session-progress/:sessionId
router.get('/vocabulary/session-progress/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const query = `
      SELECT
        COUNT(DISTINCT annotation_id) as "termsViewed",
        MAX(disclosure_level) as "maxLevel",
        COUNT(*) as "totalInteractions"
      FROM vocabulary_interactions
      WHERE user_session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    res.json(result.rows[0] || {
      termsViewed: 0,
      maxLevel: 0,
      totalInteractions: 0
    });
  } catch (error) {
    console.error('Error fetching session progress:', error);
    res.status(500).json({ error: 'Failed to fetch session progress' });
  }
});

// Helper function to generate basic enrichment data
async function generateEnrichment(term: string) {
  // In production, this would call etymology APIs, etc.
  // For now, return placeholder data
  return {
    etymology: `The word "${term}" comes from Latin roots...`,
    mnemonic: `Remember "${term}" by associating it with...`,
    relatedTerms: [
      { term: 'palabra relacionada', relationship: 'related', definition: 'Related word' }
    ],
    commonPhrases: [
      { spanish: `${term} común`, english: 'Common phrase', literal: 'Literal translation' }
    ],
    usageExamples: [
      `El ${term} es muy hermoso.`,
      `¿Dónde está el ${term}?`
    ]
  };
}

export default router;