# Quick Start: AI Configuration

## 5-Minute Setup

### 1. Get Your API Keys (2 minutes)

**OpenAI (GPT-4o):**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key (starts with `sk-`)

**Unsplash:**
1. Go to https://unsplash.com/oauth/applications
2. Create new application
3. Copy Access Key and Secret Key

### 2. Configure Environment (1 minute)

**Backend `.env` file:**
```bash
# Copy from backend/.env.example
cp backend/.env.example backend/.env

# Add your keys
OPENAI_API_KEY=sk-your-actual-key-here
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
UNSPLASH_SECRET_KEY=your-unsplash-secret-key
```

### 3. Enable Features (1 minute)

```bash
# Start with vision AI disabled (default)
ENABLE_VISION_AI=false

# Enable when ready to test
ENABLE_VISION_AI=true
ENABLE_IMAGE_ANALYSIS=true
```

### 4. Verify Setup (1 minute)

```typescript
import { getAIConfig, validateAIConfig } from './config';

const config = getAIConfig();
const validation = validateAIConfig(config);

console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);
```

## Essential Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
UNSPLASH_ACCESS_KEY=...
UNSPLASH_SECRET_KEY=...

# Optional (good defaults)
OPENAI_MODEL=gpt-4o
ENABLE_VISION_AI=false
ENABLE_COST_TRACKING=true
COST_ALERT_THRESHOLD=10.00
```

## Quick Usage Example

```typescript
import { getAIConfig } from './config';
import OpenAI from 'openai';

const config = getAIConfig();
const openai = new OpenAI({ apiKey: config.openai.apiKey });

// Use GPT-4o
const response = await openai.chat.completions.create({
  model: config.openai.model,
  messages: [{ role: 'user', content: 'Analyze this bird image' }],
});
```

## Cost Monitoring

| Model | Input (1K tokens) | Output (1K tokens) |
|-------|------------------|-------------------|
| GPT-4o | $0.005 | $0.015 |
| GPT-4o-mini | $0.00015 | $0.0006 |

**Tip:** Use `gpt-4o-mini` for lower costs during development!

## Rate Limits

- **OpenAI:** 20 requests/min, 150K tokens/min
- **Unsplash:** 50 requests/hour (demo), 5K/hour (production)

## Troubleshooting

### "OPENAI_API_KEY is required"
→ Add key to `backend/.env` file

### "Rate limit exceeded"
→ Wait 1 minute or reduce `VISION_RATE_LIMIT_PER_MINUTE`

### "Request timeout"
→ Increase `VISION_API_TIMEOUT` (default: 30000ms)

## Next Steps

1. ✅ Get API keys
2. ✅ Configure `.env`
3. ✅ Validate configuration
4. 📖 Read full docs: `docs/API_KEYS_SETUP.md`
5. 🚀 Start building!

## Full Documentation

- **Complete Setup:** `docs/API_KEYS_SETUP.md`
- **Configuration Summary:** `docs/ENV_CONFIGURATION_SUMMARY.md`
- **Configuration Code:** `backend/src/config/aiConfig.ts`
