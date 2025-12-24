/**
 * Core Vector Services
 *
 * Foundation services for vector operations:
 * - EmbeddingService: Multi-provider embedding generation
 * - RuVectorService: Dual-database vector storage and search
 *
 * @module core
 */

export {
  EmbeddingService,
  createEmbeddingService,
  getEmbeddingService,
  cleanupEmbeddingService,
} from './EmbeddingService';

export {
  RuVectorService,
  createRuVectorService,
  getRuVectorService,
  cleanupRuVectorService,
} from './RuVectorService';
