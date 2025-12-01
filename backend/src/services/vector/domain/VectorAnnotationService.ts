/**
 * VectorAnnotationService - Phase 3: Annotation Learning with Pattern Storage
 *
 * This service indexes approved annotations as learning patterns, enabling the system
 * to learn from past decisions and provide similar annotation recommendations.
 *
 * Features:
 * - Index approved/rejected annotations as learning patterns
 * - Find similar annotations based on visual features and reasoning
 * - Track common mistakes and rejection patterns
 * - Support species-specific annotation learning
 *
 * @module VectorAnnotationService
 */

import {
  AnnotationPattern,
  SimilarAnnotation,
  SearchOptions,
  VectorOperation,
  VectorDocument,
} from '../../../types/vector.types';
import { EmbeddingService } from '../core/EmbeddingService';
import { RuVectorService } from '../core/RuVectorService';
import { info, warn, error as logError, debug } from '../../../utils/logger';

/**
 * Annotation feedback record for learning
 */
interface AnnotationFeedback {
  annotationId: string;
  approved: boolean;
  feedback?: string;
  timestamp: Date;
}

/**
 * VectorAnnotationService class for annotation pattern learning
 */
export class VectorAnnotationService {
  private embeddingService: EmbeddingService;
  private vectorService: RuVectorService;

  // Feedback cache for pattern analysis
  private feedbackCache: Map<string, AnnotationFeedback> = new Map();

  constructor(
    embeddingService: EmbeddingService,
    vectorService: RuVectorService
  ) {
    this.embeddingService = embeddingService;
    this.vectorService = vectorService;
    info('VectorAnnotationService initialized');
  }

  // ============================================================================
  // Pattern Indexing
  // ============================================================================

  /**
   * Index an annotation pattern for learning
   *
   * This method stores an annotation (approved or rejected) as a learning pattern
   * in the semantic database. The pattern can later be retrieved for similar
   * annotation recommendations or mistake analysis.
   *
   * @param pattern - The annotation pattern to index
   * @returns Operation result with success status
   */
  async indexAnnotationPattern(
    pattern: AnnotationPattern
  ): Promise<VectorOperation<string>> {
    const start = Date.now();

    try {
      // Generate embedding for annotation using features and reasoning
      const embeddingResult = await this.embeddingService.embedAnnotation(
        pattern.features,
        pattern.reasoning,
        pattern.speciesId
      );

      // Create vector document
      const document: Omit<VectorDocument, 'createdAt'> = {
        id: `annotation-${pattern.annotationId}`,
        type: 'annotation',
        embedding: new Float32Array(embeddingResult.embedding),
        metadata: {
          annotationId: pattern.annotationId,
          imageId: pattern.imageId,
          speciesId: pattern.speciesId,
          features: pattern.features,
          reasoning: pattern.reasoning,
          confidence: pattern.confidence,
          approved: pattern.approved,
          rejectionReason: pattern.rejectionReason,
          userFeedback: pattern.userFeedback,
          difficulty: pattern.difficulty,
          timestamp: pattern.timestamp.toISOString(),
          // Additional indexing fields
          featureCount: pattern.features.length,
          hasSpecies: !!pattern.speciesId,
          isRejection: !pattern.approved,
        },
      };

      // Store in semantic database
      const result = await this.vectorService.storeDocument(document);

      if (result.success) {
        const duration = Date.now() - start;
        info('Indexed annotation pattern', {
          annotationId: pattern.annotationId,
          approved: pattern.approved,
          speciesId: pattern.speciesId,
          featureCount: pattern.features.length,
          duration: `${duration}ms`,
        });

        return {
          success: true,
          data: pattern.annotationId,
          usedFallback: false,
          duration,
        };
      }

      return result;
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to index annotation pattern: ${err}`);

      return {
        success: false,
        error: {
          code: 'INDEX_FAILED',
          message: String(err),
          name: 'AnnotationIndexError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Index multiple annotation patterns in batch
   *
   * @param patterns - Array of annotation patterns to index
   * @returns Operation result with indexed annotation IDs
   */
  async indexAnnotationPatterns(
    patterns: AnnotationPattern[]
  ): Promise<VectorOperation<string[]>> {
    const start = Date.now();

    try {
      const documents: Omit<VectorDocument, 'createdAt'>[] = [];

      // Generate embeddings for all patterns
      for (const pattern of patterns) {
        const embeddingResult = await this.embeddingService.embedAnnotation(
          pattern.features,
          pattern.reasoning,
          pattern.speciesId
        );

        documents.push({
          id: `annotation-${pattern.annotationId}`,
          type: 'annotation',
          embedding: new Float32Array(embeddingResult.embedding),
          metadata: {
            annotationId: pattern.annotationId,
            imageId: pattern.imageId,
            speciesId: pattern.speciesId,
            features: pattern.features,
            reasoning: pattern.reasoning,
            confidence: pattern.confidence,
            approved: pattern.approved,
            rejectionReason: pattern.rejectionReason,
            userFeedback: pattern.userFeedback,
            difficulty: pattern.difficulty,
            timestamp: pattern.timestamp.toISOString(),
            featureCount: pattern.features.length,
            hasSpecies: !!pattern.speciesId,
            isRejection: !pattern.approved,
          },
        });
      }

      // Store all documents in batch
      const result = await this.vectorService.storeBatch(documents);

      if (result.success) {
        const duration = Date.now() - start;
        info(`Indexed ${patterns.length} annotation patterns in batch`, {
          duration: `${duration}ms`,
          avgPerPattern: `${(duration / patterns.length).toFixed(2)}ms`,
        });

        return {
          success: true,
          data: patterns.map(p => p.annotationId),
          usedFallback: false,
          duration,
        };
      }

      return result;
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to index annotation patterns in batch: ${err}`);

      return {
        success: false,
        error: {
          code: 'INDEX_FAILED',
          message: String(err),
          name: 'AnnotationBatchIndexError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  // ============================================================================
  // Pattern Retrieval
  // ============================================================================

  /**
   * Find similar annotations for a given image/features
   *
   * This method searches for annotations with similar visual features and reasoning,
   * allowing the system to learn from past annotation decisions.
   *
   * @param features - Visual features of the current annotation
   * @param reasoning - Reasoning/explanation text
   * @param limit - Maximum number of results (default: 10)
   * @returns Operation result with similar annotations
   */
  async findSimilarAnnotations(
    features: string[],
    reasoning: string,
    limit: number = 10
  ): Promise<VectorOperation<SimilarAnnotation[]>> {
    const start = Date.now();

    try {
      // Generate embedding for the query
      const embeddingResult = await this.embeddingService.embedAnnotation(
        features,
        reasoning
      );

      // Search for similar annotations
      const searchOptions: SearchOptions = {
        k: limit,
        minScore: 0.7, // Only return reasonably similar annotations
        filter: {
          type: 'annotation',
        },
      };

      const searchResult = await this.vectorService.searchSimilar(
        new Float32Array(embeddingResult.embedding),
        searchOptions
      );

      if (!searchResult.success || !searchResult.data) {
        return {
          success: false,
          error: searchResult.error,
          usedFallback: searchResult.usedFallback,
          duration: searchResult.duration,
        };
      }

      // Transform search results to SimilarAnnotation format
      const similarAnnotations: SimilarAnnotation[] = searchResult.data.map(result => ({
        annotationId: result.metadata.annotationId,
        imageId: result.metadata.imageId,
        similarity: result.score,
        features: result.metadata.features || [],
        reasoning: result.metadata.reasoning || '',
        approved: result.metadata.approved || false,
      }));

      const duration = Date.now() - start;
      debug('Found similar annotations', {
        queryFeatureCount: features.length,
        resultsFound: similarAnnotations.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: similarAnnotations,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to find similar annotations: ${err}`);

      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: String(err),
          name: 'AnnotationSearchError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Get approved patterns for a specific species
   *
   * This method retrieves all approved annotation patterns for learning
   * species-specific identification characteristics.
   *
   * @param speciesId - Species identifier
   * @returns Operation result with approved patterns
   */
  async getApprovedPatternsForSpecies(
    speciesId: string
  ): Promise<VectorOperation<AnnotationPattern[]>> {
    const start = Date.now();

    try {
      // Generate a generic embedding for species search
      const embeddingResult = await this.embeddingService.embedText(
        `Species: ${speciesId}`,
        'annotation'
      );

      // Search with species filter
      const searchOptions: SearchOptions = {
        k: 100, // Get many results for comprehensive learning
        filter: {
          type: 'annotation',
          speciesId,
          approved: true,
        },
      };

      const searchResult = await this.vectorService.searchSimilar(
        new Float32Array(embeddingResult.embedding),
        searchOptions
      );

      if (!searchResult.success || !searchResult.data) {
        return {
          success: false,
          error: searchResult.error,
          usedFallback: searchResult.usedFallback,
          duration: searchResult.duration,
        };
      }

      // Transform search results to AnnotationPattern format
      const patterns: AnnotationPattern[] = searchResult.data.map(result => ({
        annotationId: result.metadata.annotationId,
        imageId: result.metadata.imageId,
        speciesId: result.metadata.speciesId,
        features: result.metadata.features || [],
        reasoning: result.metadata.reasoning || '',
        confidence: result.metadata.confidence || 0,
        approved: result.metadata.approved || false,
        rejectionReason: result.metadata.rejectionReason,
        userFeedback: result.metadata.userFeedback,
        difficulty: result.metadata.difficulty,
        timestamp: new Date(result.metadata.timestamp),
      }));

      const duration = Date.now() - start;
      info('Retrieved approved patterns for species', {
        speciesId,
        patternCount: patterns.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: patterns,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to get approved patterns for species: ${err}`);

      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: String(err),
          name: 'SpeciesPatternsError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  // ============================================================================
  // Feedback Learning
  // ============================================================================

  /**
   * Record annotation feedback for learning
   *
   * This method records whether an annotation was approved or rejected,
   * along with optional feedback explaining the decision. This helps the
   * system learn from corrections.
   *
   * @param annotationId - Annotation identifier
   * @param approved - Whether annotation was approved
   * @param feedback - Optional explanation of the decision
   * @returns Operation result
   */
  async recordAnnotationFeedback(
    annotationId: string,
    approved: boolean,
    feedback?: string
  ): Promise<VectorOperation<void>> {
    const start = Date.now();

    try {
      // Store feedback in cache for pattern analysis
      const feedbackRecord: AnnotationFeedback = {
        annotationId,
        approved,
        feedback,
        timestamp: new Date(),
      };

      this.feedbackCache.set(annotationId, feedbackRecord);

      debug('Recorded annotation feedback', {
        annotationId,
        approved,
        hasFeedback: !!feedback,
      });

      const duration = Date.now() - start;

      return {
        success: true,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to record annotation feedback: ${err}`);

      return {
        success: false,
        error: {
          code: 'INDEX_FAILED',
          message: String(err),
          name: 'FeedbackRecordError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Get common mistakes for learning (rejected annotations)
   *
   * This method retrieves rejected annotation patterns to help the system
   * learn what NOT to do. Optionally filtered by species.
   *
   * @param speciesId - Optional species filter
   * @returns Operation result with common mistake patterns
   */
  async getCommonMistakes(
    speciesId?: string
  ): Promise<VectorOperation<AnnotationPattern[]>> {
    const start = Date.now();

    try {
      // Generate a generic embedding for mistake search
      const searchText = speciesId
        ? `Common mistakes for species: ${speciesId}`
        : 'Common annotation mistakes';

      const embeddingResult = await this.embeddingService.embedText(
        searchText,
        'annotation'
      );

      // Search with rejection filter
      const searchOptions: SearchOptions = {
        k: 50, // Get many rejected patterns
        filter: {
          type: 'annotation',
          approved: false,
          ...(speciesId ? { speciesId } : {}),
        },
      };

      const searchResult = await this.vectorService.searchSimilar(
        new Float32Array(embeddingResult.embedding),
        searchOptions
      );

      if (!searchResult.success || !searchResult.data) {
        return {
          success: false,
          error: searchResult.error,
          usedFallback: searchResult.usedFallback,
          duration: searchResult.duration,
        };
      }

      // Transform search results to AnnotationPattern format
      const mistakes: AnnotationPattern[] = searchResult.data.map(result => ({
        annotationId: result.metadata.annotationId,
        imageId: result.metadata.imageId,
        speciesId: result.metadata.speciesId,
        features: result.metadata.features || [],
        reasoning: result.metadata.reasoning || '',
        confidence: result.metadata.confidence || 0,
        approved: false,
        rejectionReason: result.metadata.rejectionReason,
        userFeedback: result.metadata.userFeedback,
        difficulty: result.metadata.difficulty,
        timestamp: new Date(result.metadata.timestamp),
      }));

      const duration = Date.now() - start;
      info('Retrieved common mistakes', {
        speciesId: speciesId || 'all',
        mistakeCount: mistakes.length,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        data: mistakes,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to get common mistakes: ${err}`);

      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: String(err),
          name: 'CommonMistakesError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  // ============================================================================
  // Analytics & Insights
  // ============================================================================

  /**
   * Get feedback statistics for analysis
   *
   * @returns Feedback statistics
   */
  getFeedbackStats(): {
    totalFeedback: number;
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number;
  } {
    const feedbackArray = Array.from(this.feedbackCache.values());
    const approvedCount = feedbackArray.filter(f => f.approved).length;
    const rejectedCount = feedbackArray.filter(f => !f.approved).length;

    return {
      totalFeedback: feedbackArray.length,
      approvedCount,
      rejectedCount,
      approvalRate: feedbackArray.length > 0
        ? approvedCount / feedbackArray.length
        : 0,
    };
  }

  /**
   * Get annotation pattern by ID
   *
   * @param annotationId - Annotation identifier
   * @returns Operation result with pattern if found
   */
  async getAnnotationPattern(
    annotationId: string
  ): Promise<VectorOperation<AnnotationPattern | null>> {
    const start = Date.now();

    try {
      // Search for the specific annotation
      const embeddingResult = await this.embeddingService.embedText(
        annotationId,
        'query'
      );

      const searchOptions: SearchOptions = {
        k: 1,
        filter: {
          type: 'annotation',
          annotationId,
        },
      };

      const searchResult = await this.vectorService.searchSimilar(
        new Float32Array(embeddingResult.embedding),
        searchOptions
      );

      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        return {
          success: true,
          data: null,
          usedFallback: false,
          duration: Date.now() - start,
        };
      }

      const result = searchResult.data[0];
      const pattern: AnnotationPattern = {
        annotationId: result.metadata.annotationId,
        imageId: result.metadata.imageId,
        speciesId: result.metadata.speciesId,
        features: result.metadata.features || [],
        reasoning: result.metadata.reasoning || '',
        confidence: result.metadata.confidence || 0,
        approved: result.metadata.approved || false,
        rejectionReason: result.metadata.rejectionReason,
        userFeedback: result.metadata.userFeedback,
        difficulty: result.metadata.difficulty,
        timestamp: new Date(result.metadata.timestamp),
      };

      const duration = Date.now() - start;

      return {
        success: true,
        data: pattern,
        usedFallback: false,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      logError(`Failed to get annotation pattern: ${err}`);

      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: String(err),
          name: 'GetPatternError',
          fallbackUsed: false,
        },
        usedFallback: false,
        duration,
      };
    }
  }

  /**
   * Clear feedback cache
   */
  clearFeedbackCache(): void {
    this.feedbackCache.clear();
    debug('Feedback cache cleared');
  }
}

/**
 * Factory function to create VectorAnnotationService singleton
 */
let annotationServiceInstance: VectorAnnotationService | null = null;

export function createVectorAnnotationService(
  embeddingService: EmbeddingService,
  vectorService: RuVectorService
): VectorAnnotationService {
  if (!annotationServiceInstance) {
    annotationServiceInstance = new VectorAnnotationService(
      embeddingService,
      vectorService
    );
  }
  return annotationServiceInstance;
}

/**
 * Get existing VectorAnnotationService instance
 */
export function getVectorAnnotationService(): VectorAnnotationService {
  if (!annotationServiceInstance) {
    throw new Error(
      'VectorAnnotationService not initialized. Call createVectorAnnotationService first.'
    );
  }
  return annotationServiceInstance;
}

/**
 * Cleanup singleton instance
 */
export function cleanupVectorAnnotationService(): void {
  if (annotationServiceInstance) {
    annotationServiceInstance.clearFeedbackCache();
    annotationServiceInstance = null;
  }
}
