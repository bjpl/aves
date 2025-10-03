# Environment Configuration Summary

## Overview
This document summarizes the environment configuration setup for GPT-4o and Unsplash integration in the Aves application.

## Files Created/Modified

### 1. Configuration Files

#### Created: `backend/src/config/aiConfig.ts`
- **Purpose:** Centralized AI configuration management
- **Features:**
  - Type-safe configuration interfaces
  - Environment variable loading
  - Configuration validation
  - Singleton pattern for config access
  - OpenAI pricing constants
  - Rate limiting constants
  - API endpoint definitions

**Key Exports:**
- `getAIConfig()` - Get singleton configuration instance
- `loadAIConfig()` - Load config from environment variables
- `validateAIConfig()` - Validate configuration completeness
- `OPENAI_ENDPOINTS` - API endpoint constants
- `OPENAI_PRICING` - Pricing information for cost tracking
- `RATE_LIMITS` - Default rate limits

#### Created: `backend/src/config/index.ts`
- **Purpose:** Central export point for configuration modules
- **Features:** Re-exports all configuration utilities

### 2. Environment Files

#### Modified: `.env.example` (Root)
**Added Variables:**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AI Feature Flags
ENABLE_VISION_AI=false
VISION_PROVIDER=openai
```

#### Modified: `backend/.env.example`
**Added Variables:**
```bash
# External APIs
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
UNSPLASH_SECRET_KEY=your_unsplash_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# AI Feature Flags
ENABLE_VISION_AI=false
VISION_PROVIDER=openai
ENABLE_IMAGE_GENERATION=false
ENABLE_IMAGE_ANALYSIS=false

# AI Rate Limiting
VISION_API_TIMEOUT=30000
VISION_API_MAX_RETRIES=3
VISION_API_RETRY_DELAY=1000
VISION_RATE_LIMIT_PER_MINUTE=20

# Cost Tracking
ENABLE_COST_TRACKING=true
COST_ALERT_THRESHOLD=10.00
```

### 3. Documentation

#### Created: `docs/API_KEYS_SETUP.md`
- **Purpose:** Complete guide for obtaining and configuring API keys
- **Sections:**
  - How to obtain OpenAI API keys
  - How to obtain Unsplash API keys
  - Environment variable reference
  - Feature flags documentation
  - Configuration structure
  - Cost tracking setup
  - Rate limiting configuration
  - Security best practices
  - Troubleshooting guide
  - Production deployment checklist

#### Created: `docs/ENV_CONFIGURATION_SUMMARY.md`
- **Purpose:** This document - summarizes the configuration setup
- **Sections:**
  - Files created/modified
  - Environment variables
  - Configuration structure
  - Usage examples
  - Validation and testing

### 4. Test Files

#### Created: `backend/src/__tests__/config/aiConfig.test.ts`
- **Purpose:** Comprehensive test suite for AI configuration
- **Coverage:**
  - Configuration loading from environment variables
  - Default value handling
  - Validation logic
  - Singleton pattern
  - Feature flags
  - Constants verification
  - Edge cases and error handling

## Environment Variables Reference

### OpenAI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required for vision features) |
| `OPENAI_MODEL` | gpt-4o | Default model for text generation |
| `OPENAI_VISION_MODEL` | gpt-4o | Model for vision tasks |
| `OPENAI_MAX_TOKENS` | 4096 | Maximum tokens per request |
| `OPENAI_TEMPERATURE` | 0.7 | Response randomness (0.0-1.0) |

### Unsplash Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `UNSPLASH_ACCESS_KEY` | - | Unsplash access key (required) |
| `UNSPLASH_SECRET_KEY` | - | Unsplash secret key |
| `UNSPLASH_API_URL` | https://api.unsplash.com | API base URL |
| `UNSPLASH_TIMEOUT` | 10000 | Request timeout in milliseconds |
| `UNSPLASH_RATE_LIMIT` | 50 | Requests per hour |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_VISION_AI` | false | Enable GPT-4o vision capabilities |
| `VISION_PROVIDER` | openai | AI provider (openai/anthropic/google) |
| `ENABLE_IMAGE_GENERATION` | false | Enable AI image prompt generation |
| `ENABLE_IMAGE_ANALYSIS` | false | Enable automatic image analysis |
| `ENABLE_ANNOTATION_AI` | false | Enable AI-assisted annotations |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `VISION_API_TIMEOUT` | 30000 | API request timeout (ms) |
| `VISION_API_MAX_RETRIES` | 3 | Maximum retry attempts |
| `VISION_API_RETRY_DELAY` | 1000 | Delay between retries (ms) |
| `VISION_RATE_LIMIT_PER_MINUTE` | 20 | Max requests per minute |

### Cost Tracking

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_COST_TRACKING` | true | Track API costs |
| `COST_ALERT_THRESHOLD` | 10.00 | Alert threshold in USD |
| `COST_LOG_LEVEL` | summary | Logging detail (none/summary/detailed) |

## Configuration Structure

### TypeScript Interfaces

```typescript
interface OpenAIConfig {
  apiKey: string;
  model: string;
  visionModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

interface UnsplashConfig {
  accessKey: string;
  secretKey: string;
  apiUrl: string;
  timeout: number;
  rateLimitPerHour: number;
}

interface VisionAPIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitPerMinute: number;
}

interface CostTrackingConfig {
  enabled: boolean;
  alertThreshold: number;
  logLevel: 'none' | 'summary' | 'detailed';
}

interface AIFeatureFlags {
  enableVisionAI: boolean;
  enableImageGeneration: boolean;
  enableImageAnalysis: boolean;
  enableAnnotationAI: boolean;
}

interface AIConfig {
  openai: OpenAIConfig;
  unsplash: UnsplashConfig;
  vision: VisionAPIConfig;
  costTracking: CostTrackingConfig;
  features: AIFeatureFlags;
}
```

### Constants

```typescript
// API Endpoints
OPENAI_ENDPOINTS = {
  CHAT: 'https://api.openai.com/v1/chat/completions',
  EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
  IMAGES: 'https://api.openai.com/v1/images/generations',
  VISION: 'https://api.openai.com/v1/chat/completions',
}

// Pricing (per 1K tokens)
OPENAI_PRICING = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
}

// Rate Limits
RATE_LIMITS = {
  openai: {
    requestsPerMinute: 20,
    tokensPerMinute: 150000,
    requestsPerDay: 10000,
  },
  unsplash: {
    requestsPerHour: 50,
    requestsPerDay: 5000,
  },
}
```

## Usage Examples

### Basic Configuration Access

```typescript
import { getAIConfig } from './config';

// Get configuration
const config = getAIConfig();

// Access OpenAI settings
const apiKey = config.openai.apiKey;
const model = config.openai.model;

// Check feature flags
if (config.features.enableVisionAI) {
  // Vision AI is enabled
}

// Get rate limits
const timeout = config.vision.timeout;
const maxRetries = config.openai.maxRetries;
```

### Configuration Validation

```typescript
import { getAIConfig, validateAIConfig } from './config';

const config = getAIConfig();
const validation = validateAIConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('Configuration is valid');
```

### Using with OpenAI SDK

```typescript
import OpenAI from 'openai';
import { getAIConfig, OPENAI_ENDPOINTS } from './config';

const config = getAIConfig();

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  timeout: config.openai.timeout,
  maxRetries: config.openai.maxRetries,
});

// Make a request
const response = await openai.chat.completions.create({
  model: config.openai.model,
  max_tokens: config.openai.maxTokens,
  temperature: config.openai.temperature,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Cost Tracking Example

```typescript
import { getAIConfig, OPENAI_PRICING } from './config';

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

// Example usage
const cost = calculateCost('gpt-4o', 1500, 500);
console.log(`Request cost: $${cost.toFixed(4)}`);

const config = getAIConfig();
if (config.costTracking.enabled && cost > config.costTracking.alertThreshold) {
  console.warn(`Cost alert: Request exceeded threshold!`);
}
```

## Validation Rules

The configuration validator checks:

1. **OpenAI API Key**: Required when any vision feature is enabled
2. **Unsplash API Key**: Required for image sourcing
3. **Rate Limits**: Must be between 1-100 requests per minute
4. **Timeout**: Must be between 1,000-60,000 milliseconds
5. **Model Names**: Should be valid OpenAI model identifiers
6. **Temperature**: Should be between 0.0-1.0
7. **Max Tokens**: Should be positive integer

## Testing

### Running Tests

```bash
cd backend
npm test -- src/__tests__/config/aiConfig.test.ts
```

### Test Coverage

- ✅ Environment variable loading
- ✅ Default value fallbacks
- ✅ Type conversions (string to number, boolean)
- ✅ Configuration validation
- ✅ Singleton pattern
- ✅ Feature flag handling
- ✅ Constants verification
- ✅ Edge cases and boundaries

## Next Steps

1. **Get API Keys**
   - Sign up for OpenAI API access
   - Register Unsplash developer account
   - Copy keys to `.env` file

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your API keys
   - Adjust feature flags as needed
   - Set appropriate rate limits

3. **Validate Configuration**
   - Run configuration tests
   - Check for validation errors
   - Verify API connectivity

4. **Enable Features**
   - Start with vision AI disabled
   - Test with small requests
   - Monitor costs and rate limits
   - Enable features incrementally

5. **Production Setup**
   - Use environment-specific keys
   - Enable cost tracking
   - Set up monitoring
   - Configure alerts

## Security Recommendations

1. **Never commit `.env` files**
   - Keep in `.gitignore`
   - Use secret management in production

2. **Rotate API keys regularly**
   - Every 90 days minimum
   - Immediately if compromised

3. **Monitor API usage**
   - Enable cost tracking
   - Set alert thresholds
   - Review logs regularly

4. **Use minimal permissions**
   - Separate dev/prod keys
   - Restrict by IP when possible
   - Use separate keys per service

5. **Secure key storage**
   - Use environment variables
   - Encrypt at rest
   - Use secret management systems (AWS Secrets Manager, etc.)

## Troubleshooting

### Configuration Not Loading
- Check `.env` file exists in correct directory
- Verify environment variables are set
- Run validation to see specific errors

### API Key Errors
- Verify key format (should start with `sk-`)
- Check key hasn't expired
- Ensure key has required permissions

### Rate Limit Issues
- Reduce `VISION_RATE_LIMIT_PER_MINUTE`
- Increase `VISION_API_RETRY_DELAY`
- Check API tier limits

### Cost Alerts Triggering
- Review `COST_ALERT_THRESHOLD` setting
- Monitor actual API usage
- Consider using gpt-4o-mini for lower costs

## Support Resources

- **Configuration Issues**: See `backend/src/config/aiConfig.ts`
- **API Keys**: See `docs/API_KEYS_SETUP.md`
- **OpenAI Docs**: https://platform.openai.com/docs
- **Unsplash Docs**: https://unsplash.com/documentation
