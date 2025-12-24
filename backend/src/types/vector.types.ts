/**
 * Vector Types for RuVector Integration
 *
 * Type definitions for vector embeddings, semantic search, and agentic memory
 * in the Aves ornithology learning platform.
 *
 * @module vector.types
 */

// ============================================================================
// Type Aliases
// ============================================================================

/** Embedding provider options */
export type EmbeddingProvider = 'anthropic' | 'openai' | 'local';

/** Vector quantization types for compression */
export type QuantizationType = 'none' | 'scalar' | 'product' | 'binary';

/** Document types for vector storage */
export type VectorDocumentType = 'vocabulary' | 'annotation' | 'exercise' | 'species';

/** Content types for embedding requests */
export type EmbeddingContentType = 'vocabulary' | 'annotation' | 'exercise' | 'user_context' | 'query' | 'context' | 'text';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for RuVector semantic search and embedding services
 */
export interface VectorConfig {
  /** Vector dimension size (768 for most embedding models) */
  dimensions: number;

  /** Embedding provider to use */
  embeddingProvider: 'anthropic' | 'openai' | 'local';

  /** Specific model name (e.g., 'voyage-3-lite') */
  embeddingModel?: string;

  /** Path to semantic knowledge vector database */
  semanticStoragePath: string;

  /** Path to agentic memory vector database */
  agenticStoragePath: string;

  /** Vector quantization method for compression */
  quantization: 'none' | 'scalar' | 'product' | 'binary';

  /** HNSW index configuration for vector search */
  hnsw: {
    /** Max number of connections per node */
    m: number;

    /** Construction-time search depth */
    efConstruction: number;

    /** Search-time search depth */
    efSearch: number;
  };

  /** Use PostgreSQL pgvector as fallback if RuVector fails */
  fallbackToPostgres: boolean;

  /** Interval for health check monitoring (milliseconds) */
  healthCheckIntervalMs: number;
}

/**
 * Health status of vector databases
 */
export interface VectorHealth {
  /** Overall health status */
  isHealthy: boolean;

  /** Semantic knowledge database connection status */
  semanticDbConnected: boolean;

  /** Agentic memory database connection status */
  agenticDbConnected: boolean;

  /** Timestamp of last health check */
  lastChecked: Date;

  /** Error message if unhealthy */
  errorMessage?: string;
}

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * Request to generate vector embeddings for text
 */
export interface EmbeddingRequest {
  /** Text content to embed */
  text: string;

  /** Type of content being embedded */
  type: 'vocabulary' | 'annotation' | 'exercise' | 'user_context' | 'query';

  /** Optional metadata to store with embedding */
  metadata?: Record<string, unknown>;
}

/**
 * Response containing generated vector embedding
 */
export interface EmbeddingResponse {
  /** Vector embedding (as number array or Float32Array) */
  embedding: number[] | Float32Array;

  /** Number of dimensions in embedding */
  dimensions: number;

  /** Embedding provider used */
  provider: string;

  /** Content type that was embedded */
  type: EmbeddingContentType;

  /** Additional metadata about embedding generation */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Document stored in vector database with embedding
 */
export interface VectorDocument {
  /** Unique document identifier */
  id: string;

  /** Type of document */
  type: 'vocabulary' | 'annotation' | 'exercise' | 'species';

  /** Vector embedding of document content */
  embedding: Float32Array;

  /** Document metadata and content */
  metadata: Record<string, unknown>;

  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Options for vector similarity search
 */
export interface SearchOptions {
  /** Number of results to return (default: 10) */
  k?: number;

  /** Metadata filters to apply */
  filter?: Record<string, unknown>;

  /** Minimum similarity score threshold (0-1) */
  minScore?: number;

  /** Include full metadata in results */
  includeMetadata?: boolean;
}

/**
 * Single result from vector similarity search
 */
export interface SearchResult {
  /** Document identifier */
  id: string;

  /** Similarity score (0-1, higher is more similar) */
  score: number;

  /** Document type */
  type: string;

  /** Document metadata */
  metadata: Record<string, unknown>;

  /** Full document object if requested */
  document?: unknown;
}

/**
 * Options for hybrid text + vector search
 */
export interface HybridSearchOptions extends SearchOptions {
  /** Text query for keyword matching */
  textQuery: string;

  /** Weight for text relevance (0-1, default: 0.3) */
  textWeight?: number;

  /** Weight for vector similarity (0-1, default: 0.7) */
  vectorWeight?: number;
}

// ============================================================================
// Agentic Memory Types (Reflexion-based)
// ============================================================================

/**
 * Learning episode stored using Reflexion pattern
 * Based on: "Reflexion: Language Agents with Verbal Reinforcement Learning"
 */
export interface ReflexionEpisode {
  /** User who experienced this episode */
  userId: string;

  /** Session identifier */
  sessionId: string;

  /** When episode occurred */
  timestamp: Date;

  /** Situation/context description */
  situation: string;

  /** Action taken by user */
  action: string;

  /** Outcome/result of action */
  outcome: string;

  /** Agent's reflection on episode */
  reflection: string;

  /** Type of exercise if applicable */
  exerciseType?: string;

  /** Species ID if applicable */
  speciesId?: string;

  /** Difficulty level (1-10) */
  difficulty?: number;

  /** Whether action was successful */
  success: boolean;

  /** Vector embedding of situation */
  situationEmbedding?: Float32Array;

  /** Vector embedding of action */
  actionEmbedding?: Float32Array;

  /** Vector embedding of outcome */
  outcomeEmbedding?: Float32Array;
}

/**
 * User skill level tracking
 */
export interface SkillEntry {
  /** User identifier */
  userId: string;

  /** Name of skill */
  skillName: string;

  /** Current proficiency level (1-10) */
  level: number;

  /** Last practice timestamp */
  lastPracticed: Date;

  /** Total exercises completed for this skill */
  exercisesCompleted: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Vector embedding of skill */
  embedding?: Float32Array;
}

/**
 * Query for finding relevant past experiences
 */
export interface ExperienceQuery {
  /** User to query experiences for */
  userId: string;

  /** Natural language query describing situation */
  query: string;

  /** Maximum results to return */
  limit?: number;

  /** Filter by time range */
  timeRange?: { start: Date; end: Date };
}

// ============================================================================
// Domain-Specific Types - Vocabulary
// ============================================================================

/**
 * Similar term found through semantic search
 */
export interface SimilarTerm {
  /** Term identifier */
  termId: string;

  /** Term text */
  term: string;

  /** Term definition */
  definition: string;

  /** Semantic similarity score (0-1) */
  similarity: number;

  /** Term category */
  category?: string;
}

/**
 * Related concept with relationship type
 */
export interface RelatedConcept {
  /** Concept identifier */
  conceptId: string;

  /** Concept text */
  concept: string;

  /** Type of relationship */
  relationship: 'synonym' | 'antonym' | 'related' | 'hypernym' | 'hyponym';

  /** Semantic similarity score (0-1) */
  similarity: number;
}

// ============================================================================
// Domain-Specific Types - Annotations
// ============================================================================

/**
 * Pattern from approved annotation for learning
 */
export interface AnnotationPattern {
  /** Annotation identifier */
  annotationId: string;

  /** Associated image ID */
  imageId: string;

  /** Species identified (if applicable) */
  speciesId?: string;

  /** Visual features noted */
  features: string[];

  /** Reasoning/explanation */
  reasoning: string;

  /** Confidence level (0-1) */
  confidence: number;

  /** Whether annotation was approved */
  approved: boolean;

  /** Reason for rejection if not approved */
  rejectionReason?: string;

  /** User feedback text */
  userFeedback?: string;

  /** Difficulty rating (1-10) */
  difficulty?: number;

  /** Annotation timestamp */
  timestamp: Date;
}

/**
 * Similar annotation from semantic search
 */
export interface SimilarAnnotation {
  /** Annotation identifier */
  annotationId: string;

  /** Associated image ID */
  imageId: string;

  /** Similarity score (0-1) */
  similarity: number;

  /** Visual features */
  features: string[];

  /** Reasoning text */
  reasoning: string;

  /** Approval status */
  approved: boolean;
}

// ============================================================================
// Domain-Specific Types - User Context
// ============================================================================

/**
 * Single learning interaction episode
 */
export interface LearningEpisode {
  /** User identifier */
  userId: string;

  /** Session identifier */
  sessionId: string;

  /** Episode timestamp */
  timestamp: Date;

  /** Learning topic */
  topic: string;

  /** Activity type */
  activity: string;

  /** Performance metrics */
  performance: {
    /** Score achieved (0-100) */
    score: number;

    /** Time spent in seconds */
    timeSpent: number;

    /** Number of attempts */
    attemptsUsed: number;

    /** Number of hints requested */
    hintsUsed: number;
  };

  /** Concepts user struggled with */
  struggledWith?: string[];

  /** Concepts user mastered */
  masteredConcepts?: string[];

  /** User's emotional state */
  emotionalState?: 'frustrated' | 'confident' | 'neutral' | 'engaged';

  /** Species involved in episode */
  speciesInvolved?: string[];

  /** Vocabulary terms used */
  vocabularyUsed?: string[];
}

/**
 * Enhanced user context with AI-driven insights
 */
export interface EnhancedUserContext {
  /** User identifier */
  userId: string;

  /** Current proficiency level */
  currentLevel: number;

  /** Total exercises completed */
  totalExercises: number;

  /** Overall accuracy rate (0-1) */
  overallAccuracy: number;

  /** Recent areas of strength */
  recentStrengths: string[];

  /** Recent areas of weakness */
  recentWeaknesses: string[];

  /** Relevant past experiences */
  relevantExperiences: LearningEpisode[];

  /** AI-suggested focus areas */
  suggestedFocus: string[];

  /** Learning velocity metric */
  learningVelocity: number;
}

// ============================================================================
// Domain-Specific Types - Exercises
// ============================================================================

/**
 * Exercise pattern for similarity matching
 */
export interface ExercisePattern {
  /** Exercise identifier */
  exerciseId: string;

  /** Exercise type */
  type: string;

  /** Topic covered */
  topic: string;

  /** Difficulty level (1-10) */
  difficulty: number;

  /** Question text */
  question: string;

  /** Correct answer */
  correctAnswer: string;

  /** Incorrect answer options */
  distractors?: string[];

  /** Average completion time (seconds) */
  avgCompletionTime: number;

  /** Average accuracy rate (0-1) */
  avgAccuracy: number;

  /** Number of times attempted */
  timesAttempted: number;

  /** Species involved in question */
  speciesInvolved: string[];

  /** Vocabulary terms used */
  vocabularyUsed: string[];

  /** Common mistakes made */
  commonMistakes?: string[];
}

/**
 * AI-generated exercise recommendation
 */
export interface ExerciseRecommendation {
  /** Exercise identifier */
  exerciseId: string;

  /** Relevance score (0-1) */
  relevanceScore: number;

  /** Explanation of recommendation */
  reasoning: string;

  /** Predicted difficulty for user (1-10) */
  predictedDifficulty: number;

  /** Estimated success rate (0-1) */
  estimatedSuccessRate: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Vector operation error with fallback information
 */
export interface VectorError extends Error {
  /** Error code */
  code: 'EMBEDDING_FAILED' | 'SEARCH_FAILED' | 'INDEX_FAILED' | 'CONNECTION_ERROR';

  /** Original underlying error */
  originalError?: Error;

  /** Whether fallback was used */
  fallbackUsed: boolean;
}

/**
 * Result wrapper for vector operations
 */
export type VectorOperation<T> = {
  /** Whether operation succeeded */
  success: boolean;

  /** Result data if successful */
  data?: T;

  /** Error information if failed */
  error?: VectorError;

  /** Whether PostgreSQL fallback was used */
  usedFallback: boolean;

  /** Operation duration in milliseconds */
  duration: number;
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Batch embedding request
 */
export interface BatchEmbeddingRequest {
  /** Multiple texts to embed */
  texts: string[];

  /** Content type */
  type: EmbeddingRequest['type'];

  /** Shared metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Batch embedding response
 */
export interface BatchEmbeddingResponse {
  /** Array of embeddings matching input texts */
  embeddings: (number[] | Float32Array)[];

  /** Number of embeddings in batch */
  count: number;

  /** Number of dimensions */
  dimensions: number;

  /** Embedding provider used */
  provider: string;

  /** Content type that was embedded */
  type: EmbeddingContentType;

  /** Additional metadata about batch embedding */
  metadata?: Record<string, unknown>;
}

/**
 * Indexing options for vector storage
 */
export interface IndexOptions {
  /** Update existing document if ID exists */
  upsert?: boolean;

  /** Skip validation checks */
  skipValidation?: boolean;

  /** Batch size for bulk operations */
  batchSize?: number;
}

/**
 * Statistics about vector database
 */
export interface VectorStats {
  /** Total documents indexed */
  totalDocuments: number;

  /** Documents by type */
  documentsByType: Record<string, number>;

  /** Database size in bytes */
  sizeBytes: number;

  /** Average search latency (milliseconds) */
  avgSearchLatency: number;

  /** Index build time (milliseconds) */
  indexBuildTime: number;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

// All types are exported via named exports above
// No default export to avoid TypeScript errors
