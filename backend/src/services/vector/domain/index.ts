/**
 * Domain-Specific Vector Services
 *
 * Barrel export for domain-specific vector services built on top of
 * the core EmbeddingService and RuVectorService.
 *
 * @module domain
 */

// Vocabulary Enhancement
export {
  VectorVocabularyService,
  createVectorVocabularyService,
  IndexTermOptions,
  SearchSimilarOptions,
} from './VectorVocabularyService';

// Annotation Learning
export {
  VectorAnnotationService,
  createVectorAnnotationService,
  getVectorAnnotationService,
  cleanupVectorAnnotationService,
} from './VectorAnnotationService';

// User Context Memory
export {
  VectorUserContextService,
  createVectorUserContextService,
  getVectorUserContextService,
  cleanupVectorUserContextService,
} from './VectorUserContextService';

// Exercise Intelligence
export {
  VectorExerciseService,
  createVectorExerciseService,
  getVectorExerciseService,
  cleanupVectorExerciseService,
} from './VectorExerciseService';
