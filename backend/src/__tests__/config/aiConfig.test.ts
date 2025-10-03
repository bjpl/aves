import {
  loadAIConfig,
  validateAIConfig,
  getAIConfig,
  resetAIConfig,
  DEFAULT_AI_CONFIG,
  OPENAI_ENDPOINTS,
  OPENAI_PRICING,
  RATE_LIMITS
} from '../../config/aiConfig';

describe('AI Configuration', () => {
  beforeEach(() => {
    // Reset configuration before each test
    resetAIConfig();

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.UNSPLASH_ACCESS_KEY;
    delete process.env.ENABLE_VISION_AI;
  });

  describe('loadAIConfig', () => {
    it('should load default configuration when no env vars are set', () => {
      const config = loadAIConfig();

      expect(config.openai.model).toBe('gpt-4o');
      expect(config.openai.maxTokens).toBe(4096);
      expect(config.vision.provider).toBe('openai');
      expect(config.features.enableVisionAI).toBe(false);
    });

    it('should load configuration from environment variables', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'gpt-4o-mini';
      process.env.OPENAI_MAX_TOKENS = '8192';
      process.env.ENABLE_VISION_AI = 'true';

      const config = loadAIConfig();

      expect(config.openai.apiKey).toBe('test-key');
      expect(config.openai.model).toBe('gpt-4o-mini');
      expect(config.openai.maxTokens).toBe(8192);
      expect(config.features.enableVisionAI).toBe(true);
    });

    it('should parse numeric values correctly', () => {
      process.env.OPENAI_TEMPERATURE = '0.5';
      process.env.VISION_API_TIMEOUT = '60000';
      process.env.VISION_RATE_LIMIT_PER_MINUTE = '10';

      const config = loadAIConfig();

      expect(config.openai.temperature).toBe(0.5);
      expect(config.vision.timeout).toBe(60000);
      expect(config.vision.rateLimitPerMinute).toBe(10);
    });

    it('should handle Unsplash configuration', () => {
      process.env.UNSPLASH_ACCESS_KEY = 'unsplash-access';
      process.env.UNSPLASH_SECRET_KEY = 'unsplash-secret';
      process.env.UNSPLASH_RATE_LIMIT = '100';

      const config = loadAIConfig();

      expect(config.unsplash.accessKey).toBe('unsplash-access');
      expect(config.unsplash.secretKey).toBe('unsplash-secret');
      expect(config.unsplash.rateLimitPerHour).toBe(100);
    });

    it('should handle cost tracking configuration', () => {
      process.env.ENABLE_COST_TRACKING = 'true';
      process.env.COST_ALERT_THRESHOLD = '25.50';

      const config = loadAIConfig();

      expect(config.costTracking.enabled).toBe(true);
      expect(config.costTracking.alertThreshold).toBe(25.50);
    });
  });

  describe('validateAIConfig', () => {
    it('should validate configuration successfully with all required keys', () => {
      const config = {
        ...DEFAULT_AI_CONFIG,
        openai: {
          ...DEFAULT_AI_CONFIG.openai,
          apiKey: 'test-key',
        },
        unsplash: {
          ...DEFAULT_AI_CONFIG.unsplash,
          accessKey: 'test-access-key',
        },
      };

      const result = validateAIConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require OpenAI API key when vision AI is enabled', () => {
      const config = {
        ...DEFAULT_AI_CONFIG,
        features: {
          ...DEFAULT_AI_CONFIG.features,
          enableVisionAI: true,
        },
        unsplash: {
          ...DEFAULT_AI_CONFIG.unsplash,
          accessKey: 'test-access-key',
        },
      };

      const result = validateAIConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENAI_API_KEY is required when vision AI is enabled');
    });

    it('should require Unsplash access key', () => {
      const config = {
        ...DEFAULT_AI_CONFIG,
        openai: {
          ...DEFAULT_AI_CONFIG.openai,
          apiKey: 'test-key',
        },
      };

      const result = validateAIConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('UNSPLASH_ACCESS_KEY is required for image sourcing');
    });

    it('should validate rate limit bounds', () => {
      const config = {
        ...DEFAULT_AI_CONFIG,
        openai: {
          ...DEFAULT_AI_CONFIG.openai,
          apiKey: 'test-key',
        },
        unsplash: {
          ...DEFAULT_AI_CONFIG.unsplash,
          accessKey: 'test-access-key',
        },
        vision: {
          ...DEFAULT_AI_CONFIG.vision,
          rateLimitPerMinute: 150, // Too high
        },
      };

      const result = validateAIConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VISION_RATE_LIMIT_PER_MINUTE must be between 1 and 100');
    });

    it('should validate timeout bounds', () => {
      const config = {
        ...DEFAULT_AI_CONFIG,
        openai: {
          ...DEFAULT_AI_CONFIG.openai,
          apiKey: 'test-key',
          timeout: 100000, // Too high
        },
        unsplash: {
          ...DEFAULT_AI_CONFIG.unsplash,
          accessKey: 'test-access-key',
        },
      };

      const result = validateAIConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VISION_API_TIMEOUT must be between 1000 and 60000 milliseconds');
    });
  });

  describe('getAIConfig', () => {
    it('should return singleton instance', () => {
      const config1 = getAIConfig();
      const config2 = getAIConfig();

      expect(config1).toBe(config2);
    });

    it('should create new instance after reset', () => {
      const config1 = getAIConfig();
      resetAIConfig();
      const config2 = getAIConfig();

      expect(config1).not.toBe(config2);
    });
  });

  describe('Constants', () => {
    it('should export OpenAI endpoints', () => {
      expect(OPENAI_ENDPOINTS.CHAT).toBe('https://api.openai.com/v1/chat/completions');
      expect(OPENAI_ENDPOINTS.EMBEDDINGS).toBe('https://api.openai.com/v1/embeddings');
      expect(OPENAI_ENDPOINTS.IMAGES).toBe('https://api.openai.com/v1/images/generations');
      expect(OPENAI_ENDPOINTS.VISION).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should export OpenAI pricing', () => {
      expect(OPENAI_PRICING['gpt-4o'].input).toBe(0.005);
      expect(OPENAI_PRICING['gpt-4o'].output).toBe(0.015);
      expect(OPENAI_PRICING['gpt-4o-mini'].input).toBe(0.00015);
      expect(OPENAI_PRICING['gpt-4o-mini'].output).toBe(0.0006);
    });

    it('should export rate limits', () => {
      expect(RATE_LIMITS.openai.requestsPerMinute).toBe(20);
      expect(RATE_LIMITS.openai.tokensPerMinute).toBe(150000);
      expect(RATE_LIMITS.unsplash.requestsPerHour).toBe(50);
    });
  });

  describe('Feature Flags', () => {
    it('should handle all feature flags', () => {
      process.env.ENABLE_VISION_AI = 'true';
      process.env.ENABLE_IMAGE_GENERATION = 'true';
      process.env.ENABLE_IMAGE_ANALYSIS = 'true';
      process.env.ENABLE_ANNOTATION_AI = 'true';

      const config = loadAIConfig();

      expect(config.features.enableVisionAI).toBe(true);
      expect(config.features.enableImageGeneration).toBe(true);
      expect(config.features.enableImageAnalysis).toBe(true);
      expect(config.features.enableAnnotationAI).toBe(true);
    });

    it('should default feature flags to false', () => {
      const config = loadAIConfig();

      expect(config.features.enableVisionAI).toBe(false);
      expect(config.features.enableImageGeneration).toBe(false);
      expect(config.features.enableImageAnalysis).toBe(false);
      expect(config.features.enableAnnotationAI).toBe(false);
    });
  });

  describe('Vision Provider', () => {
    it('should support different vision providers', () => {
      process.env.VISION_PROVIDER = 'anthropic';

      const config = loadAIConfig();

      expect(config.vision.provider).toBe('anthropic');
    });

    it('should default to openai provider', () => {
      const config = loadAIConfig();

      expect(config.vision.provider).toBe('openai');
    });
  });
});
