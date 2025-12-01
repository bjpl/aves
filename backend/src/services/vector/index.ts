/**
 * Vector Services - Main Entry Point
 *
 * Unified export for RuVector integration in the Aves ornithology learning platform.
 * Provides semantic search, agentic memory, and intelligent learning features.
 *
 * Architecture:
 * - Core: EmbeddingService, RuVectorService (dual-database)
 * - Domain: VectorVocabularyService, VectorAnnotationService,
 *           VectorUserContextService, VectorExerciseService
 *
 * @module vector
 */

// Core Services
export {
  EmbeddingService,
  createEmbeddingService,
  getEmbeddingService,
  cleanupEmbeddingService,
} from './core/EmbeddingService';

export {
  RuVectorService,
  createRuVectorService,
  getRuVectorService,
  cleanupRuVectorService,
} from './core/RuVectorService';

// Domain Services
export {
  // Vocabulary Enhancement
  VectorVocabularyService,
  createVectorVocabularyService,
  IndexTermOptions,
  SearchSimilarOptions,
  // Annotation Learning
  VectorAnnotationService,
  createVectorAnnotationService,
  getVectorAnnotationService,
  cleanupVectorAnnotationService,
  // User Context Memory
  VectorUserContextService,
  createVectorUserContextService,
  getVectorUserContextService,
  cleanupVectorUserContextService,
  // Exercise Intelligence
  VectorExerciseService,
  createVectorExerciseService,
  getVectorExerciseService,
  cleanupVectorExerciseService,
} from './domain';

// Types (re-export for convenience)
export type {
  VectorConfig,
  VectorHealth,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  VectorDocument,
  SearchOptions,
  SearchResult,
  HybridSearchOptions,
  ReflexionEpisode,
  SkillEntry,
  LearningEpisode,
  EnhancedUserContext,
  ExperienceQuery,
  SimilarTerm,
  RelatedConcept,
  AnnotationPattern,
  SimilarAnnotation,
  ExercisePattern,
  ExerciseRecommendation,
  VectorStats,
  VectorOperation,
  VectorError,
  IndexOptions,
  EmbeddingProvider,
  QuantizationType,
  VectorDocumentType,
  EmbeddingContentType,
} from '../../types/vector.types';

// Configuration
export {
  defaultVectorConfig,
  createVectorConfig,
  validateVectorConfig,
  getVectorConfig,
  resetVectorConfig,
  getConfigSummary,
} from '../../config/vector.config';

/**
 * Initialize all vector services
 *
 * @param configOverrides - Optional configuration overrides
 * @returns Initialized service instances
 */
export async function initializeVectorServices(configOverrides?: Partial<import('../../types/vector.types').VectorConfig>) {
  const { createVectorConfig } = await import('../../config/vector.config');
  const { createEmbeddingService } = await import('./core/EmbeddingService');
  const { createRuVectorService } = await import('./core/RuVectorService');

  // Create configuration
  const config = createVectorConfig(configOverrides);

  // Initialize core services
  const embeddingService = createEmbeddingService(config);
  const ruVectorService = createRuVectorService(config, embeddingService);

  // Initialize dual databases
  await ruVectorService.initialize();

  return {
    config,
    embeddingService,
    ruVectorService,
  };
}

/**
 * Cleanup all vector services
 */
export async function cleanupAllVectorServices(): Promise<void> {
  const { cleanupEmbeddingService } = await import('./core/EmbeddingService');
  const { cleanupRuVectorService } = await import('./core/RuVectorService');
  const { cleanupVectorAnnotationService } = await import('./domain/VectorAnnotationService');
  const { cleanupVectorUserContextService } = await import('./domain/VectorUserContextService');
  const { cleanupVectorExerciseService } = await import('./domain/VectorExerciseService');

  await Promise.all([
    cleanupRuVectorService(),
    cleanupEmbeddingService(),
    cleanupVectorAnnotationService(),
    cleanupVectorUserContextService(),
    cleanupVectorExerciseService(),
  ]);
}
