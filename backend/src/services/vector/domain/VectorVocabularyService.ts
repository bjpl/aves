/**
 * VectorVocabularyService - Vocabulary Enhancement with RuVector Semantic Search
 *
 * Extends the existing VocabularyService with semantic search capabilities using:
 * - EmbeddingService to generate vocabulary embeddings
 * - RuVectorService for storage and similarity search
 *
 * Features:
 * - Index vocabulary terms with definitions, categories, and usage examples
 * - Search for semantically similar terms
 * - Find related concepts (synonyms, antonyms, hypernyms, hyponyms)
 * - Generate semantic context for term groups
 *
 * @module VectorVocabularyService
 */

import { Pool } from 'pg';
import { VocabularyService, Enrichment } from '../../VocabularyService';
import { getEmbeddingService } from '../core/EmbeddingService';
import { getRuVectorService } from '../core/RuVectorService';
import {
  SimilarTerm,
  RelatedConcept,
  VectorDocument,
  SearchOptions,
  VectorOperation,
} from '../../../types/vector.types';
import { info, warn, error as logError, debug } from '../../../utils/logger';

/**
 * Options for indexing a vocabulary term
 */
export interface IndexTermOptions {
  /** Term category (e.g., 'ornithology', 'anatomy', 'behavior') */
  category?: string;

  /** Usage examples for the term */
  usageExamples?: string[];

  /** Related terms from enrichment */
  relatedTerms?: string[];

  /** Update existing term if already indexed */
  upsert?: boolean;
}

/**
 * Options for searching similar terms
 */
export interface SearchSimilarOptions {
  /** Number of results to return (default: 10) */
  limit?: number;

  /** Filter by term category */
  category?: string;

  /** Minimum similarity score (0-1, default: 0.5) */
  minScore?: number;

  /** Exclude specific term IDs from results */
  excludeIds?: string[];
}

/**
 * VectorVocabularyService class
 *
 * Provides semantic search capabilities for vocabulary terms using vector embeddings.
 */
export class VectorVocabularyService extends VocabularyService {
  /**
   * Index a vocabulary term in the vector database
   *
   * @param termId - Unique identifier for the term
   * @param term - The vocabulary term text
   * @param definition - Definition of the term
   * @param options - Additional indexing options
   * @returns Promise resolving when indexing is complete
   */
  async indexTerm(
    termId: string,
    term: string,
    definition: string,
    options: IndexTermOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const embeddingService = getEmbeddingService();
      const vectorService = getRuVectorService();

      // Generate embedding for term + definition
      const text = `${term}: ${definition}`;
      const embeddingResponse = await embeddingService.embedVocabulary(
        term,
        definition
      );

      // Prepare metadata
      const metadata = {
        termId,
        term,
        definition,
        category: options.category,
        usageExamples: options.usageExamples || [],
        relatedTerms: options.relatedTerms || [],
        indexedAt: new Date().toISOString(),
      };

      // Create vector document
      const document: Omit<VectorDocument, 'createdAt'> = {
        id: `vocab-${termId}`,
        type: 'vocabulary',
        embedding: new Float32Array(embeddingResponse.embedding),
        metadata,
      };

      // Store in vector database
      const result = await vectorService.storeDocument(document);

      if (!result.success) {
        throw new Error(
          `Failed to store vocabulary term: ${result.error?.message}`
        );
      }

      const duration = Date.now() - startTime;
      debug(`Indexed vocabulary term: ${term}`, {
        termId,
        category: options.category,
        duration: `${duration}ms`,
      });
    } catch (err) {
      logError(`Failed to index vocabulary term: ${term}`, err as Error);
      throw err;
    }
  }

  /**
   * Search for semantically similar terms
   *
   * @param query - Natural language search query
   * @param options - Search options
   * @returns Array of similar terms with similarity scores
   */
  async searchSimilarTerms(
    query: string,
    options: SearchSimilarOptions = {}
  ): Promise<SimilarTerm[]> {
    const startTime = Date.now();

    try {
      const embeddingService = getEmbeddingService();
      const vectorService = getRuVectorService();

      // Generate embedding for query
      const queryEmbedding = await embeddingService.embedText(query, 'query');

      // Prepare search options
      const searchOptions: SearchOptions = {
        k: options.limit || 10,
        minScore: options.minScore || 0.5,
        filter: {
          type: 'vocabulary',
          ...(options.category && { category: options.category }),
        },
        includeMetadata: true,
      };

      // Perform similarity search
      const searchResult = await vectorService.searchSimilar(
        new Float32Array(queryEmbedding.embedding),
        searchOptions
      );

      if (!searchResult.success || !searchResult.data) {
        throw new Error(
          `Similarity search failed: ${searchResult.error?.message}`
        );
      }

      // Transform results to SimilarTerm format
      const similarTerms: SimilarTerm[] = searchResult.data
        .filter(result => {
          // Exclude specified IDs
          if (
            options.excludeIds &&
            options.excludeIds.includes(result.metadata.termId as string)
          ) {
            return false;
          }
          return true;
        })
        .map(result => ({
          termId: result.metadata.termId as string,
          term: result.metadata.term as string,
          definition: result.metadata.definition as string,
          similarity: result.score,
          category: result.metadata.category as string | undefined,
        }));

      const duration = Date.now() - startTime;
      info(`Found ${similarTerms.length} similar terms for query: "${query}"`, {
        duration: `${duration}ms`,
        topScore: similarTerms[0]?.similarity,
      });

      return similarTerms;
    } catch (err) {
      logError(`Failed to search similar terms for: ${query}`, err as Error);
      throw err;
    }
  }

  /**
   * Find related concepts for a given term
   *
   * Uses semantic search and enrichment data to identify:
   * - Synonyms (highly similar terms)
   * - Antonyms (from enrichment data)
   * - Related terms (moderate similarity)
   * - Hypernyms and hyponyms (from hierarchical relationships)
   *
   * @param termId - Identifier of the term
   * @returns Array of related concepts with relationship types
   */
  async findRelatedConcepts(termId: string): Promise<RelatedConcept[]> {
    const startTime = Date.now();

    try {
      const vectorService = getRuVectorService();

      // Get the term's vector document from database
      const searchResult = await vectorService.searchSimilar(
        new Float32Array(vectorService.getConfig().dimensions).fill(0),
        {
          k: 1000,
          filter: {
            type: 'vocabulary',
            termId,
          },
        }
      );

      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        warn(`Term not found in vector database: ${termId}`);
        return [];
      }

      const termDoc = searchResult.data[0];
      const term = termDoc.metadata.term as string;

      // Perform similarity search for related terms
      const similarTerms = await this.searchSimilarTerms(term, {
        limit: 20,
        minScore: 0.3,
        excludeIds: [termId],
      });

      // Get enrichment data for additional relationships
      const enrichment = await this.getEnrichment(term);

      // Build related concepts list
      const relatedConcepts: RelatedConcept[] = [];

      // Add similar terms with relationship classification
      for (const similarTerm of similarTerms) {
        let relationship: RelatedConcept['relationship'] = 'related';

        // Classify relationship based on similarity score
        if (similarTerm.similarity > 0.9) {
          relationship = 'synonym';
        } else if (similarTerm.similarity > 0.7) {
          relationship = 'related';
        }

        // Check if it's mentioned in enrichment related terms
        const enrichmentRelated = enrichment.relatedTerms.find(
          rt => rt.term.toLowerCase() === similarTerm.term.toLowerCase()
        );

        if (enrichmentRelated) {
          // Use enrichment relationship if available
          if (enrichmentRelated.relationship === 'antonym') {
            relationship = 'antonym';
          } else if (enrichmentRelated.relationship === 'hypernym') {
            relationship = 'hypernym';
          } else if (enrichmentRelated.relationship === 'hyponym') {
            relationship = 'hyponym';
          }
        }

        relatedConcepts.push({
          conceptId: similarTerm.termId,
          concept: similarTerm.term,
          relationship,
          similarity: similarTerm.similarity,
        });
      }

      // Add explicit relationships from enrichment not already in results
      for (const relatedTerm of enrichment.relatedTerms) {
        if (
          !relatedConcepts.some(
            rc => rc.concept.toLowerCase() === relatedTerm.term.toLowerCase()
          )
        ) {
          let relationship: RelatedConcept['relationship'] = 'related';

          if (relatedTerm.relationship === 'antonym') {
            relationship = 'antonym';
          } else if (relatedTerm.relationship === 'hypernym') {
            relationship = 'hypernym';
          } else if (relatedTerm.relationship === 'hyponym') {
            relationship = 'hyponym';
          }

          relatedConcepts.push({
            conceptId: `enrichment-${relatedTerm.term}`,
            concept: relatedTerm.term,
            relationship,
            similarity: 0.6, // Default similarity for enrichment terms
          });
        }
      }

      const duration = Date.now() - startTime;
      info(`Found ${relatedConcepts.length} related concepts for term: ${term}`, {
        termId,
        duration: `${duration}ms`,
        relationships: {
          synonyms: relatedConcepts.filter(rc => rc.relationship === 'synonym').length,
          antonyms: relatedConcepts.filter(rc => rc.relationship === 'antonym').length,
          related: relatedConcepts.filter(rc => rc.relationship === 'related').length,
          hypernyms: relatedConcepts.filter(rc => rc.relationship === 'hypernym').length,
          hyponyms: relatedConcepts.filter(rc => rc.relationship === 'hyponym').length,
        },
      });

      return relatedConcepts;
    } catch (err) {
      logError(`Failed to find related concepts for: ${termId}`, err as Error);
      throw err;
    }
  }

  /**
   * Generate semantic context summary for a group of terms
   *
   * Analyzes the semantic relationships between multiple terms to provide
   * a contextual understanding of how they relate to each other.
   *
   * @param terms - Array of vocabulary terms
   * @returns Natural language context summary
   */
  async getSemanticContext(terms: string[]): Promise<string> {
    const startTime = Date.now();

    try {
      if (terms.length === 0) {
        return 'No terms provided for context generation.';
      }

      if (terms.length === 1) {
        return `The term "${terms[0]}" represents a single concept.`;
      }

      const embeddingService = getEmbeddingService();

      // Generate embeddings for all terms
      const embeddings = await Promise.all(
        terms.map(term => embeddingService.embedText(term, 'vocabulary'))
      );

      // Calculate pairwise similarities
      const similarities: { term1: string; term2: string; score: number }[] = [];

      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          const similarity = this.cosineSimilarity(
            Array.from(embeddings[i].embedding),
            Array.from(embeddings[j].embedding)
          );

          similarities.push({
            term1: terms[i],
            term2: terms[j],
            score: similarity,
          });
        }
      }

      // Sort by similarity score
      similarities.sort((a, b) => b.score - a.score);

      // Generate context summary
      const avgSimilarity =
        similarities.reduce((sum, s) => sum + s.score, 0) / similarities.length;

      let context = `Analysis of ${terms.length} terms:\n\n`;

      // Overall cohesion assessment
      if (avgSimilarity > 0.8) {
        context += `These terms are highly related, forming a tightly cohesive semantic group. `;
      } else if (avgSimilarity > 0.6) {
        context += `These terms share moderate semantic relationships. `;
      } else if (avgSimilarity > 0.4) {
        context += `These terms have some semantic overlap but represent distinct concepts. `;
      } else {
        context += `These terms are semantically diverse with limited overlap. `;
      }

      // Highlight strongest relationships
      const topPairs = similarities.slice(0, Math.min(3, similarities.length));
      if (topPairs.length > 0) {
        context += `\n\nStrongest relationships:\n`;
        for (const pair of topPairs) {
          const strength =
            pair.score > 0.8 ? 'very strong' : pair.score > 0.6 ? 'strong' : 'moderate';
          context += `- "${pair.term1}" and "${pair.term2}" have a ${strength} semantic connection (${(pair.score * 100).toFixed(1)}%).\n`;
        }
      }

      // Identify outliers (if any)
      const outliers = terms.filter(term => {
        const avgScoreForTerm =
          similarities
            .filter(s => s.term1 === term || s.term2 === term)
            .reduce((sum, s) => sum + s.score, 0) /
          (terms.length - 1);
        return avgScoreForTerm < 0.4;
      });

      if (outliers.length > 0) {
        context += `\n\nTerms with weaker connections to the group: ${outliers.join(', ')}.`;
      }

      const duration = Date.now() - startTime;
      debug(`Generated semantic context for ${terms.length} terms`, {
        duration: `${duration}ms`,
        avgSimilarity: avgSimilarity.toFixed(3),
      });

      return context;
    } catch (err) {
      logError('Failed to generate semantic context', err as Error);
      throw err;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Similarity score (0-1)
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Batch index multiple vocabulary terms
   *
   * More efficient than indexing terms one at a time.
   *
   * @param terms - Array of term data to index
   * @returns Promise resolving when all terms are indexed
   */
  async batchIndexTerms(
    terms: Array<{
      termId: string;
      term: string;
      definition: string;
      options?: IndexTermOptions;
    }>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const embeddingService = getEmbeddingService();
      const vectorService = getRuVectorService();

      info(`Starting batch indexing of ${terms.length} vocabulary terms`);

      // Generate embeddings in batch
      const texts = terms.map(t => `${t.term}: ${t.definition}`);
      const embeddingsResponse = await embeddingService.embedBatch(
        texts,
        'vocabulary'
      );

      // Create vector documents
      const documents: Array<Omit<VectorDocument, 'createdAt'>> = terms.map(
        (termData, index) => ({
          id: `vocab-${termData.termId}`,
          type: 'vocabulary',
          embedding: new Float32Array(embeddingsResponse.embeddings[index]),
          metadata: {
            termId: termData.termId,
            term: termData.term,
            definition: termData.definition,
            category: termData.options?.category,
            usageExamples: termData.options?.usageExamples || [],
            relatedTerms: termData.options?.relatedTerms || [],
            indexedAt: new Date().toISOString(),
          },
        })
      );

      // Store in batch
      const result = await vectorService.storeBatch(documents);

      if (!result.success) {
        throw new Error(`Batch indexing failed: ${result.error?.message}`);
      }

      const duration = Date.now() - startTime;
      info(`Successfully indexed ${terms.length} vocabulary terms`, {
        duration: `${duration}ms`,
        avgPerTerm: `${(duration / terms.length).toFixed(2)}ms`,
      });
    } catch (err) {
      logError(`Failed to batch index ${terms.length} terms`, err as Error);
      throw err;
    }
  }
}

/**
 * Factory function to create VectorVocabularyService
 *
 * @param pool - PostgreSQL connection pool
 * @returns VectorVocabularyService instance
 */
export function createVectorVocabularyService(
  pool: Pool
): VectorVocabularyService {
  return new VectorVocabularyService(pool);
}
