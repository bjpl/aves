# API Keys Setup Guide

This guide explains how to obtain and configure the required API keys for the Aves application.

## Required API Keys

### 1. OpenAI API Key (GPT-4o)

**Purpose:** Powers AI vision features, image analysis, and annotation generation.

**How to obtain:**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (it will only be shown once!)
6. Add to your `.env` file:
   ```bash
   OPENAI_API_KEY=sk-...your-key-here
   ```

**Pricing:**
- GPT-4o: $0.005 per 1K input tokens, $0.015 per 1K output tokens
- GPT-4o-mini: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens

**Rate Limits:**
- 20 requests per minute (configurable)
- 150,000 tokens per minute
- 10,000 requests per day

### 2. Unsplash API Keys

**Purpose:** Image sourcing for bird species from Unsplash's free photo library.

**How to obtain:**
1. Visit [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in
3. Create a new application
4. Copy both Access Key and Secret Key
5. Add to your `.env` file:
   ```bash
   UNSPLASH_ACCESS_KEY=your-access-key-here
   UNSPLASH_SECRET_KEY=your-secret-key-here
   ```

**Rate Limits:**
- Demo: 50 requests per hour
- Production: 5,000 requests per hour (requires approval)

**Important Guidelines:**
- Always provide photographer attribution
- Track downloads using the API
- Use UTM parameters in attribution links

## Environment Variables

### Root `.env` File

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# External APIs
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
UNSPLASH_SECRET_KEY=your_unsplash_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AI Feature Flags
ENABLE_VISION_AI=false
VISION_PROVIDER=openai

# Session Secret
SESSION_SECRET=your_session_secret_here

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Backend `.env` File

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Authentication
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

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

## Feature Flags

### ENABLE_VISION_AI
Enable/disable GPT-4o vision capabilities for image analysis.
- `true`: Vision AI features enabled
- `false`: Vision AI features disabled (default)

### VISION_PROVIDER
Choose the AI provider for vision tasks.
- `openai`: Use GPT-4o (default)
- `anthropic`: Use Claude (future support)
- `google`: Use Gemini (future support)

### ENABLE_IMAGE_GENERATION
Enable/disable AI-generated image prompts.
- `true`: Generate Midjourney prompts for missing species images
- `false`: Disable image generation (default)

### ENABLE_IMAGE_ANALYSIS
Enable/disable automatic image analysis and annotation.
- `true`: Analyze images for bird features
- `false`: Manual annotation only (default)

## Configuration Structure

The AI configuration is managed in `backend/src/config/aiConfig.ts`:

```typescript
import { getAIConfig } from './config';

// Get configuration
const config = getAIConfig();

// Access specific settings
const apiKey = config.openai.apiKey;
const model = config.openai.model;
const timeout = config.vision.timeout;
```

### Key Configuration Objects

**OpenAI Config:**
- `apiKey`: Your OpenAI API key
- `model`: Default model (gpt-4o)
- `visionModel`: Vision-specific model (gpt-4o)
- `maxTokens`: Maximum tokens per request (4096)
- `temperature`: Randomness (0.7)
- `timeout`: Request timeout in ms (30000)
- `maxRetries`: Retry attempts (3)
- `retryDelay`: Delay between retries in ms (1000)

**Unsplash Config:**
- `accessKey`: Unsplash access key
- `secretKey`: Unsplash secret key
- `apiUrl`: API base URL
- `timeout`: Request timeout (10000ms)
- `rateLimitPerHour`: Request limit (50)

**Vision API Config:**
- `provider`: AI provider ('openai')
- `timeout`: Request timeout (30000ms)
- `maxRetries`: Retry attempts (3)
- `retryDelay`: Retry delay (1000ms)
- `rateLimitPerMinute`: Rate limit (20)

**Cost Tracking:**
- `enabled`: Track API costs (true)
- `alertThreshold`: Alert when costs exceed ($10.00)
- `logLevel`: Logging detail ('summary')

## Cost Tracking

The application tracks AI API costs automatically when `ENABLE_COST_TRACKING=true`.

### GPT-4o Pricing

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-4o | $0.005 | $0.015 |
| GPT-4o-mini | $0.00015 | $0.0006 |

### Cost Alerts

Set `COST_ALERT_THRESHOLD` to receive warnings when costs exceed a certain amount:

```bash
COST_ALERT_THRESHOLD=10.00  # Alert at $10
```

## Rate Limiting

### OpenAI Rate Limits
- **Requests:** 20 per minute (configurable via `VISION_RATE_LIMIT_PER_MINUTE`)
- **Tokens:** 150,000 per minute
- **Daily:** 10,000 requests

### Unsplash Rate Limits
- **Demo:** 50 requests per hour
- **Production:** 5,000 requests per hour

### Custom Rate Limit Configuration

Adjust rate limits in your `.env` file:

```bash
# Vision API rate limiting
VISION_RATE_LIMIT_PER_MINUTE=20

# API timeouts
VISION_API_TIMEOUT=30000
VISION_API_MAX_RETRIES=3
VISION_API_RETRY_DELAY=1000
```

## Security Best Practices

1. **Never commit API keys to Git**
   - Keep `.env` files in `.gitignore`
   - Use `.env.example` for templates

2. **Use environment-specific keys**
   - Development keys for local testing
   - Production keys for live deployment
   - Separate keys per environment

3. **Rotate keys regularly**
   - Change keys every 90 days
   - Immediately rotate if compromised

4. **Monitor usage**
   - Enable cost tracking
   - Set up alerts for unusual activity
   - Review usage reports monthly

5. **Use minimal permissions**
   - Only grant necessary API access
   - Restrict by IP when possible
   - Use separate keys for different services

## Testing Configuration

To test your configuration:

```typescript
import { getAIConfig, validateAIConfig } from './config';

const config = getAIConfig();
const validation = validateAIConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
} else {
  console.log('Configuration is valid');
}
```

## Troubleshooting

### "OPENAI_API_KEY is required when vision AI is enabled"
- Ensure `OPENAI_API_KEY` is set in your `.env` file
- Or disable vision AI: `ENABLE_VISION_AI=false`

### "UNSPLASH_ACCESS_KEY is required for image sourcing"
- Add Unsplash credentials to `.env` file
- Get keys from [Unsplash Developers](https://unsplash.com/developers)

### "Rate limit exceeded"
- Wait for rate limit reset
- Adjust `VISION_RATE_LIMIT_PER_MINUTE` to a lower value
- Consider upgrading API tier

### "Request timeout"
- Increase `VISION_API_TIMEOUT` value
- Check network connectivity
- Verify API service status

## Production Deployment

### Checklist
- [ ] All API keys configured
- [ ] Environment-specific keys used
- [ ] `.env` files in `.gitignore`
- [ ] Cost tracking enabled
- [ ] Alert thresholds configured
- [ ] Rate limits appropriate for usage
- [ ] Security best practices followed
- [ ] Backup API keys stored securely

### Environment Variables (Production)
Set these in your hosting platform's environment configuration:

```bash
OPENAI_API_KEY=sk-prod-...
UNSPLASH_ACCESS_KEY=prod-access-key
UNSPLASH_SECRET_KEY=prod-secret-key
ENABLE_VISION_AI=true
ENABLE_COST_TRACKING=true
COST_ALERT_THRESHOLD=100.00
NODE_ENV=production
```

## Support

For issues with:
- **OpenAI API:** [OpenAI Support](https://help.openai.com/)
- **Unsplash API:** [Unsplash Help](https://help.unsplash.com/)
- **Configuration:** Check `backend/src/config/aiConfig.ts`
