import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  VectorConfig,
  EmbeddingProvider,
  QuantizationType,
} from '../types/vector.types';

// Load environment variables
dotenv.config();

/**
 * Parse environment variable as number with fallback
 */
function parseEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean with fallback
 */
function parseEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Resolve and ensure directory exists for database path
 */
function resolveDatabasePath(envPath: string, defaultPath: string): string {
  const dbPath = process.env[envPath] || defaultPath;
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return resolvedPath;
}

/**
 * Default vector service configuration
 */
export const defaultVectorConfig: VectorConfig = {
  // Vector dimensions
  dimensions: parseEnvNumber('VECTOR_DIMENSIONS', 768),

  // Embedding provider configuration
  embeddingProvider: (process.env.VECTOR_EMBEDDING_PROVIDER ||
    'local') as EmbeddingProvider,
  embeddingModel: process.env.VECTOR_EMBEDDING_MODEL,

  // Database paths
  semanticStoragePath: resolveDatabasePath(
    'VECTOR_SEMANTIC_DB_PATH',
    './data/vectors.db'
  ),
  agenticStoragePath: resolveDatabasePath(
    'VECTOR_AGENTIC_DB_PATH',
    './data/agentic.db'
  ),

  // Quantization configuration
  quantization: (process.env.VECTOR_QUANTIZATION ||
    'scalar') as QuantizationType,

  // HNSW (Hierarchical Navigable Small World) index parameters
  hnsw: {
    m: parseEnvNumber('VECTOR_HNSW_M', 16),
    efConstruction: parseEnvNumber('VECTOR_HNSW_EF_CONSTRUCTION', 200),
    efSearch: parseEnvNumber('VECTOR_HNSW_EF_SEARCH', 50),
  },

  // Fallback and health check configuration
  fallbackToPostgres: parseEnvBoolean('VECTOR_FALLBACK_TO_POSTGRES', true),
  healthCheckIntervalMs: parseEnvNumber(
    'VECTOR_HEALTH_CHECK_INTERVAL_MS',
    30000
  ),
};

/**
 * Validates vector configuration parameters
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateVectorConfig(config: VectorConfig): void {
  const errors: string[] = [];

  // Validate embedding dimensions (typical range: 1-4096)
  if (
    config.dimensions < 1 ||
    config.dimensions > 4096
  ) {
    errors.push(
      `dimensions must be between 1 and 4096, got ${config.dimensions}`
    );
  }

  // Validate embedding provider
  const validProviders: EmbeddingProvider[] = ['anthropic', 'openai', 'local'];
  if (!validProviders.includes(config.embeddingProvider)) {
    errors.push(
      `embeddingProvider must be one of ${validProviders.join(', ')}, got ${config.embeddingProvider}`
    );
  }

  // Validate quantization type
  const validQuantizations: QuantizationType[] = [
    'none',
    'scalar',
    'product',
    'binary',
  ];
  if (!validQuantizations.includes(config.quantization)) {
    errors.push(
      `quantization must be one of ${validQuantizations.join(', ')}, got ${config.quantization}`
    );
  }

  // Validate HNSW parameters
  if (config.hnsw.m < 2 || config.hnsw.m > 100) {
    errors.push(`HNSW m parameter must be between 2 and 100, got ${config.hnsw.m}`);
  }

  if (config.hnsw.efConstruction < 1) {
    errors.push(
      `HNSW efConstruction must be positive, got ${config.hnsw.efConstruction}`
    );
  }

  if (config.hnsw.efSearch < 1) {
    errors.push(`HNSW efSearch must be positive, got ${config.hnsw.efSearch}`);
  }

  // Validate efSearch <= efConstruction (common best practice)
  if (config.hnsw.efSearch > config.hnsw.efConstruction) {
    errors.push(
      `HNSW efSearch (${config.hnsw.efSearch}) should not exceed efConstruction (${config.hnsw.efConstruction})`
    );
  }

  // Validate database paths
  if (!config.semanticStoragePath || config.semanticStoragePath.trim() === '') {
    errors.push('semanticStoragePath cannot be empty');
  }

  if (!config.agenticStoragePath || config.agenticStoragePath.trim() === '') {
    errors.push('agenticStoragePath cannot be empty');
  }

  // Validate paths are different
  if (config.semanticStoragePath === config.agenticStoragePath) {
    errors.push(
      'semanticStoragePath and agenticStoragePath must be different to avoid database conflicts'
    );
  }

  // Validate health check interval
  if (config.healthCheckIntervalMs < 1000) {
    errors.push(
      `healthCheckIntervalMs must be at least 1000ms, got ${config.healthCheckIntervalMs}`
    );
  }

  // Throw if any errors
  if (errors.length > 0) {
    throw new Error(
      `Vector configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Creates a validated vector configuration with optional overrides
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Validated vector configuration
 * @throws Error if resulting configuration is invalid
 *
 * @example
 * ```typescript
 * // Use defaults
 * const config = createVectorConfig();
 *
 * // Override specific settings
 * const customConfig = createVectorConfig({
 *   embeddingDimensions: 1024,
 *   quantization: 'product'
 * });
 *
 * // Use in-memory testing configuration
 * const testConfig = createVectorConfig({
 *   semanticDbPath: ':memory:',
 *   agenticDbPath: ':memory:',
 *   fallbackToPostgres: false
 * });
 * ```
 */
export function createVectorConfig(
  overrides?: Partial<VectorConfig>
): VectorConfig {
  const config: VectorConfig = {
    ...defaultVectorConfig,
    ...overrides,
    // Merge HNSW parameters properly
    hnsw: {
      ...defaultVectorConfig.hnsw,
      ...(overrides?.hnsw || {}),
    },
  };

  validateVectorConfig(config);
  return config;
}

/**
 * Get current vector configuration summary for logging/debugging
 */
export function getConfigSummary(config: VectorConfig): Record<string, unknown> {
  return {
    embeddingProvider: config.embeddingProvider,
    embeddingModel: config.embeddingModel || 'default',
    dimensions: config.dimensions,
    quantization: config.quantization,
    hnsw: config.hnsw,
    fallbackToPostgres: config.fallbackToPostgres,
    healthCheckIntervalMs: config.healthCheckIntervalMs,
    databases: {
      semantic: path.basename(config.semanticStoragePath),
      agentic: path.basename(config.agenticStoragePath),
    },
  };
}

/**
 * Singleton configuration instance
 */
let configInstance: VectorConfig | null = null;

/**
 * Get or create the singleton vector configuration
 *
 * @returns Singleton vector configuration instance
 */
export function getVectorConfig(): VectorConfig {
  if (!configInstance) {
    configInstance = createVectorConfig();
  }
  return configInstance;
}

/**
 * Reset configuration instance (primarily for testing)
 */
export function resetVectorConfig(): void {
  configInstance = null;
}
