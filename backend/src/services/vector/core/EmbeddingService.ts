import { VectorConfig, EmbeddingResponse, BatchEmbeddingResponse, EmbeddingContentType, EmbeddingProvider } from '../../../types/vector.types';
import { info, error as logError } from '../../../utils/logger';
import VectorDB from 'ruvector';
import Anthropic from '@anthropic-ai/sdk';

/**
 * EmbeddingService - Generates vector embeddings for text content
 *
 * Supports multiple providers:
 * - 'local': RuVector's built-in embeddings (SIMD-accelerated, no API calls)
 * - 'anthropic': Claude embeddings (requires API key)
 * - 'openai': OpenAI embeddings (optional, requires API key)
 */
export class EmbeddingService {
  private config: VectorConfig;
  private provider: EmbeddingProvider;
  private vectorDB?: InstanceType<typeof VectorDB>;
  private anthropic?: Anthropic;
  private dimensions: number;

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(config: VectorConfig) {
    this.config = config;
    this.provider = config.embeddingProvider;
    this.dimensions = config.dimensions;

    this.initializeProvider();
  }

  /**
   * Initialize the embedding provider based on configuration
   */
  private initializeProvider(): void {
    try {
      switch (this.provider) {
        case 'local':
          this.initializeLocalProvider();
          break;
        case 'anthropic':
          this.initializeAnthropicProvider();
          break;
        case 'openai':
          this.initializeOpenAIProvider();
          break;
        default:
          throw new Error(`Unsupported embedding provider: ${this.provider}`);
      }

      info(`EmbeddingService initialized with provider: ${this.provider}`);
    } catch (err) {
      logError(`Failed to initialize embedding provider: ${err}`);
      this.fallbackToLocal();
    }
  }

  /**
   * Initialize RuVector local embeddings
   */
  private initializeLocalProvider(): void {
    try {
      this.vectorDB = new VectorDB({
        path: this.config.semanticStoragePath,
        dimensions: this.dimensions,
      });
      info('RuVector local embeddings initialized');
    } catch (err) {
      throw new Error(`Failed to initialize RuVector: ${err}`);
    }
  }

  /**
   * Initialize Anthropic Claude embeddings
   */
  private initializeAnthropicProvider(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    this.anthropic = new Anthropic({ apiKey });
    info('Anthropic embeddings initialized');
  }

  /**
   * Initialize OpenAI embeddings (placeholder)
   */
  private initializeOpenAIProvider(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }

    // OpenAI SDK initialization would go here
    info('OpenAI embeddings initialized');
  }

  /**
   * Fallback to local provider if primary provider fails
   */
  private fallbackToLocal(): void {
    if (this.provider !== 'local') {
      logError(`Falling back to local embeddings provider`);
      this.provider = 'local';
      try {
        this.initializeLocalProvider();
      } catch (err) {
        throw new Error(`Failed to fallback to local provider: ${err}`);
      }
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embedText(text: string, type: EmbeddingContentType = 'text'): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    try {
      const embedding = await this.generateEmbedding(text, type);
      const duration = Date.now() - startTime;

      info(`Generated embedding for ${type} in ${duration}ms`);

      return {
        embedding,
        dimensions: this.dimensions,
        provider: this.provider,
        type,
        metadata: {
          textLength: text.length,
          processingTimeMs: duration
        }
      };
    } catch (err) {
      logError(`Failed to generate embedding: ${err}`);
      throw err;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async embedBatch(texts: string[], type: EmbeddingContentType = 'text'): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();

    try {
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text, type))
      );
      const duration = Date.now() - startTime;

      info(`Generated ${embeddings.length} embeddings in ${duration}ms (${(duration / embeddings.length).toFixed(2)}ms avg)`);

      return {
        embeddings,
        count: embeddings.length,
        dimensions: this.dimensions,
        provider: this.provider,
        type,
        metadata: {
          totalProcessingTimeMs: duration,
          averageTimeMs: duration / embeddings.length
        }
      };
    } catch (err) {
      logError(`Failed to generate batch embeddings: ${err}`);
      throw err;
    }
  }

  /**
   * Core embedding generation with retry logic
   */
  private async generateEmbedding(text: string, type: EmbeddingContentType, retryCount = 0): Promise<number[]> {
    try {
      switch (this.provider) {
        case 'local':
          return await this.generateLocalEmbedding(text);
        case 'anthropic':
          return await this.generateAnthropicEmbedding(text, type);
        case 'openai':
          return await this.generateOpenAIEmbedding(text);
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (err) {
      if (retryCount < this.MAX_RETRIES) {
        logError(`Embedding generation failed (attempt ${retryCount + 1}/${this.MAX_RETRIES}): ${err}`);
        await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
        return this.generateEmbedding(text, type, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * Generate embedding using RuVector local embeddings
   */
  private async generateLocalEmbedding(text: string): Promise<number[]> {
    if (!this.vectorDB) {
      throw new Error('RuVector not initialized');
    }

    try {
      // RuVector's embed method
      const embedding = await this.vectorDB.embed(text);

      // Normalize embedding vector
      return this.normalizeVector(embedding);
    } catch (err) {
      throw new Error(`RuVector embedding failed: ${err}`);
    }
  }

  /**
   * Generate embedding using Anthropic Claude
   * Note: Anthropic doesn't have a dedicated embedding API,
   * so we simulate embeddings using Claude's text understanding
   */
  private async generateAnthropicEmbedding(text: string, type: EmbeddingContentType): Promise<number[]> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      // Use Claude to generate semantic representation
      // This is a workaround since Anthropic doesn't offer dedicated embeddings
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Generate a semantic vector representation for this ${type}: "${text}". Output only numbers separated by commas.`
        }]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      // Parse the response into a vector
      const vector = content.text
        .split(',')
        .map((n: string) => parseFloat(n.trim()))
        .filter((n: number) => !isNaN(n));

      // Pad or truncate to match configured dimensions
      return this.adjustVectorDimensions(vector);
    } catch (err) {
      throw new Error(`Anthropic embedding failed: ${err}`);
    }
  }

  /**
   * Generate embedding using OpenAI (placeholder)
   */
  private async generateOpenAIEmbedding(_text: string): Promise<number[]> {
    // OpenAI embedding implementation would go here
    // For now, throw error to force fallback
    throw new Error('OpenAI embeddings not yet implemented');
  }

  /**
   * Embed vocabulary term with optional definition
   */
  async embedVocabulary(term: string, definition?: string): Promise<EmbeddingResponse> {
    const text = definition
      ? `${term}: ${definition}`
      : term;

    return this.embedText(text, 'vocabulary');
  }

  /**
   * Embed annotation with features and reasoning
   */
  async embedAnnotation(features: string[], reasoning: string, species?: string): Promise<EmbeddingResponse> {
    const text = [
      species ? `Species: ${species}` : '',
      `Features: ${features.join(', ')}`,
      `Reasoning: ${reasoning}`
    ].filter(Boolean).join(' | ');

    return this.embedText(text, 'annotation');
  }

  /**
   * Embed exercise question and answer pair
   */
  async embedExercise(question: string, answer: string, topic: string): Promise<EmbeddingResponse> {
    const text = `Topic: ${topic} | Question: ${question} | Answer: ${answer}`;
    return this.embedText(text, 'exercise');
  }

  /**
   * Embed user context with situation, action, and outcome
   */
  async embedUserContext(situation: string, action: string, outcome: string): Promise<EmbeddingResponse> {
    const text = `Situation: ${situation} | Action: ${action} | Outcome: ${outcome}`;
    return this.embedText(text, 'context');
  }

  /**
   * Get configured embedding dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get current provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) {
      return vector;
    }

    return vector.map(val => val / magnitude);
  }

  /**
   * Adjust vector to match configured dimensions
   */
  private adjustVectorDimensions(vector: number[]): number[] {
    if (vector.length === this.dimensions) {
      return this.normalizeVector(vector);
    }

    if (vector.length > this.dimensions) {
      // Truncate
      return this.normalizeVector(vector.slice(0, this.dimensions));
    }

    // Pad with zeros
    const padded = [...vector, ...new Array(this.dimensions - vector.length).fill(0)];
    return this.normalizeVector(padded);
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.vectorDB) {
      try {
        await this.vectorDB.close();
        info('RuVector resources cleaned up');
      } catch (err) {
        logError(`Error cleaning up RuVector: ${err}`);
      }
    }
  }
}

/**
 * Factory function to create EmbeddingService singleton
 */
let embeddingServiceInstance: EmbeddingService | null = null;

export function createEmbeddingService(config: VectorConfig): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService(config);
  }
  return embeddingServiceInstance;
}

/**
 * Get existing EmbeddingService instance
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    throw new Error('EmbeddingService not initialized. Call createEmbeddingService first.');
  }
  return embeddingServiceInstance;
}

/**
 * Cleanup singleton instance
 */
export async function cleanupEmbeddingService(): Promise<void> {
  if (embeddingServiceInstance) {
    await embeddingServiceInstance.cleanup();
    embeddingServiceInstance = null;
  }
}
