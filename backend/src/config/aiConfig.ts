import logger from '../utils/logger';
/**
 * AI Configuration
 * Centralized configuration for OpenAI GPT-4o and other AI services
 */

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  visionModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface UnsplashConfig {
  accessKey: string;
  secretKey: string;
  apiUrl: string;
  timeout: number;
  rateLimitPerHour: number;
}

export interface VisionAPIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitPerMinute: number;
}

export interface CostTrackingConfig {
  enabled: boolean;
  alertThreshold: number;
  logLevel: 'none' | 'summary' | 'detailed';
}

export interface AIFeatureFlags {
  enableVisionAI: boolean;
  enableImageGeneration: boolean;
  enableImageAnalysis: boolean;
  enableAnnotationAI: boolean;
  enableBirdDetection: boolean;
}

export interface AIConfig {
  openai: OpenAIConfig;
  unsplash: UnsplashConfig;
  vision: VisionAPIConfig;
  costTracking: CostTrackingConfig;
  features: AIFeatureFlags;
}

/**
 * Load configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.VISION_API_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.VISION_API_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.VISION_API_RETRY_DELAY || '1000', 10),
    },
    unsplash: {
      accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
      secretKey: process.env.UNSPLASH_SECRET_KEY || '',
      apiUrl: process.env.UNSPLASH_API_URL || 'https://api.unsplash.com',
      timeout: parseInt(process.env.UNSPLASH_TIMEOUT || '10000', 10),
      rateLimitPerHour: parseInt(process.env.UNSPLASH_RATE_LIMIT || '50', 10),
    },
    vision: {
      provider: (process.env.VISION_PROVIDER as 'openai' | 'anthropic' | 'google') || 'openai',
      timeout: parseInt(process.env.VISION_API_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.VISION_API_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.VISION_API_RETRY_DELAY || '1000', 10),
      rateLimitPerMinute: parseInt(process.env.VISION_RATE_LIMIT_PER_MINUTE || '20', 10),
    },
    costTracking: {
      enabled: process.env.ENABLE_COST_TRACKING === 'true',
      alertThreshold: parseFloat(process.env.COST_ALERT_THRESHOLD || '10.00'),
      logLevel: (process.env.COST_LOG_LEVEL as 'none' | 'summary' | 'detailed') || 'summary',
    },
    features: {
      enableVisionAI: process.env.ENABLE_VISION_AI === 'true',
      enableImageGeneration: process.env.ENABLE_IMAGE_GENERATION === 'true',
      enableImageAnalysis: process.env.ENABLE_IMAGE_ANALYSIS === 'true',
      enableAnnotationAI: process.env.ENABLE_ANNOTATION_AI === 'true',
      enableBirdDetection: process.env.ENABLE_BIRD_DETECTION === 'true',
    },
  };
}

/**
 * Validate configuration
 */
export function validateAIConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate OpenAI configuration
  if (config.features.enableVisionAI || config.features.enableImageAnalysis) {
    if (!config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required when vision AI is enabled');
    }
    if (!config.openai.model) {
      errors.push('OPENAI_MODEL must be specified');
    }
  }

  // Validate Unsplash configuration
  if (!config.unsplash.accessKey) {
    errors.push('UNSPLASH_ACCESS_KEY is required for image sourcing');
  }

  // Validate rate limits
  if (config.vision.rateLimitPerMinute < 1 || config.vision.rateLimitPerMinute > 100) {
    errors.push('VISION_RATE_LIMIT_PER_MINUTE must be between 1 and 100');
  }

  // Validate timeout values
  if (config.openai.timeout < 1000 || config.openai.timeout > 60000) {
    errors.push('VISION_API_TIMEOUT must be between 1000 and 60000 milliseconds');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * OpenAI API endpoints
 */
export const OPENAI_ENDPOINTS = {
  CHAT: 'https://api.openai.com/v1/chat/completions',
  EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
  IMAGES: 'https://api.openai.com/v1/images/generations',
  VISION: 'https://api.openai.com/v1/chat/completions', // Same as chat but with image input
} as const;

/**
 * OpenAI pricing (per 1K tokens) - Updated for GPT-4o
 */
export const OPENAI_PRICING = {
  'gpt-4o': {
    input: 0.005,  // $0.005 per 1K input tokens
    output: 0.015, // $0.015 per 1K output tokens
  },
  'gpt-4o-mini': {
    input: 0.00015,  // $0.00015 per 1K input tokens
    output: 0.0006,  // $0.0006 per 1K output tokens
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
  },
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  openai: {
    requestsPerMinute: 20,
    tokensPerMinute: 150000,
    requestsPerDay: 10000,
  },
  unsplash: {
    requestsPerHour: 50,
    requestsPerDay: 5000,
  },
} as const;

/**
 * Default configuration (for development/testing)
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  openai: {
    apiKey: '',
    model: 'gpt-4o',
    visionModel: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },
  unsplash: {
    accessKey: '',
    secretKey: '',
    apiUrl: 'https://api.unsplash.com',
    timeout: 10000,
    rateLimitPerHour: 50,
  },
  vision: {
    provider: 'openai',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    rateLimitPerMinute: 20,
  },
  costTracking: {
    enabled: true,
    alertThreshold: 10.0,
    logLevel: 'summary',
  },
  features: {
    enableVisionAI: false,
    enableImageGeneration: false,
    enableImageAnalysis: false,
    enableAnnotationAI: false,
    enableBirdDetection: false,
  },
};

// Export singleton instance
let aiConfigInstance: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (!aiConfigInstance) {
    aiConfigInstance = loadAIConfig();

    // Validate configuration
    const validation = validateAIConfig(aiConfigInstance);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors }, 'AI Configuration validation warnings');
    }
  }

  return aiConfigInstance;
}

// Export for testing purposes
export function resetAIConfig(): void {
  aiConfigInstance = null;
}
