import { Pool } from 'pg';

export interface Enrichment {
  etymology: string;
  mnemonic: string;
  relatedTerms: Array<{
    term: string;
    relationship: string;
    definition: string;
  }>;
  commonPhrases: Array<{
    spanish: string;
    english: string;
    literal: string;
  }>;
  usageExamples: string[];
}

export interface Interaction {
  sessionId: string;
  annotationId: number;
  spanishTerm: string;
  disclosureLevel: number;
}

export interface VocabProgress {
  termsViewed: number;
  maxLevel: number;
  totalInteractions: number;
}

export class VocabularyService {
  constructor(private pool: Pool) {}

  /**
   * Get enrichment data for a term (cached or generated)
   */
  async getEnrichment(term: string): Promise<Enrichment> {
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

    const cacheResult = await this.pool.query(cacheQuery, [term]);

    if (cacheResult.rows.length > 0) {
      const row = cacheResult.rows[0];
      return {
        etymology: row.etymology,
        mnemonic: row.mnemonic,
        relatedTerms: typeof row.relatedTerms === 'string'
          ? JSON.parse(row.relatedTerms)
          : row.relatedTerms,
        commonPhrases: typeof row.commonPhrases === 'string'
          ? JSON.parse(row.commonPhrases)
          : row.commonPhrases,
        usageExamples: typeof row.usageExamples === 'string'
          ? JSON.parse(row.usageExamples)
          : row.usageExamples
      };
    }

    // Generate enrichment data
    const enrichment = this.generateEnrichment(term);

    // Cache the result
    await this.cacheEnrichment(term, enrichment);

    return enrichment;
  }

  /**
   * Track a vocabulary interaction
   */
  async trackInteraction(data: Interaction): Promise<void> {
    const query = `
      INSERT INTO vocabulary_interactions (
        user_session_id, annotation_id, spanish_term, disclosure_level
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `;

    await this.pool.query(query, [
      data.sessionId,
      data.annotationId,
      data.spanishTerm,
      data.disclosureLevel
    ]);
  }

  /**
   * Get vocabulary progress for a session
   */
  async getSessionProgress(sessionId: string): Promise<VocabProgress> {
    const query = `
      SELECT
        COUNT(DISTINCT annotation_id) as "termsViewed",
        MAX(disclosure_level) as "maxLevel",
        COUNT(*) as "totalInteractions"
      FROM vocabulary_interactions
      WHERE user_session_id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);

    const stats = result.rows[0] || {
      termsViewed: 0,
      maxLevel: 0,
      totalInteractions: 0
    };

    return {
      termsViewed: parseInt(stats.termsViewed) || 0,
      maxLevel: parseInt(stats.maxLevel) || 0,
      totalInteractions: parseInt(stats.totalInteractions) || 0
    };
  }

  /**
   * Cache enrichment data for a term
   */
  private async cacheEnrichment(term: string, enrichment: Enrichment): Promise<void> {
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

    await this.pool.query(insertQuery, [
      term,
      enrichment.etymology,
      enrichment.mnemonic,
      JSON.stringify(enrichment.relatedTerms),
      JSON.stringify(enrichment.commonPhrases),
      JSON.stringify(enrichment.usageExamples)
    ]);
  }

  /**
   * Generate enrichment data for a term
   * In production, this would call etymology APIs, etc.
   */
  private generateEnrichment(term: string): Enrichment {
    return {
      etymology: `The word "${term}" comes from Latin roots...`,
      mnemonic: `Remember "${term}" by associating it with...`,
      relatedTerms: [
        {
          term: 'palabra relacionada',
          relationship: 'related',
          definition: 'Related word'
        }
      ],
      commonPhrases: [
        {
          spanish: `${term} común`,
          english: 'Common phrase',
          literal: 'Literal translation'
        }
      ],
      usageExamples: [
        `El ${term} es muy hermoso.`,
        `¿Dónde está el ${term}?`
      ]
    };
  }
}
