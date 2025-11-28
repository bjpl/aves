# Security Quick Reference

Quick reference for implementing security features in AVES.

## Environment Setup (1 Minute)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('API_KEY_SECRET=' + require('crypto').randomBytes(24).toString('hex'))"

# 3. Update .env with generated values
# 4. Set NODE_ENV=production for production
```

## Essential Middleware Stack

```typescript
import { applySecurityMiddleware } from './middleware/security';
import { createApiRateLimiter } from './middleware/rateLimiting';
import { createPinoHttpLogger, errorLogger } from './middleware/requestLogger';
import { sanitizeRequest, detectMaliciousInput } from './middleware/inputValidation';

app.use(applySecurityMiddleware(app));
app.use(createPinoHttpLogger());
app.use(sanitizeRequest);
app.use(detectMaliciousInput);
app.use('/api/', createApiRateLimiter());
app.use(errorLogger);
```

## Input Validation (Most Common)

```typescript
import { validateRequest, commonSchemas } from './middleware/inputValidation';
import { z } from 'zod';

// Email + Password
const loginSchema = {
  body: z.object({
    email: commonSchemas.email,
    password: z.string().min(1),
  }),
};

// Pagination
const paginationSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
};

// UUID Parameter
const idSchema = {
  params: z.object({
    id: commonSchemas.id,
  }),
};

// Usage
app.post('/api/login', validateRequest(loginSchema), handler);
```

## Rate Limiting Presets

```typescript
import {
  createApiRateLimiter,      // 100 req/15min - General API
  createAuthRateLimiter,     // 5 req/15min - Auth endpoints
  createUploadRateLimiter,   // 10 req/min - File uploads
  createAIRateLimiter,       // 20 req/min - AI endpoints
} from './middleware/rateLimiting';

app.use('/api/', createApiRateLimiter());
app.post('/api/auth/login', createAuthRateLimiter(), handler);
app.post('/api/upload', createUploadRateLimiter(), handler);
app.post('/api/ai/analyze', createAIRateLimiter(), handler);
```

## API Key Auth

```typescript
import { requireApiKey, createApiKey } from './middleware/apiKeyAuth';

// Create key
const apiKey = createApiKey({
  name: 'My Service',
  environment: 'prod',
  permissions: ['read', 'write'],
});

// Protect route
app.get('/api/data',
  requireApiKey({ required: true }),
  handler
);

// With permissions
app.post('/api/admin',
  requireApiKey({
    required: true,
    permissions: ['admin']
  }),
  handler
);
```

## Common Validation Schemas

```typescript
import { commonSchemas } from './middleware/inputValidation';

commonSchemas.email         // Email validation
commonSchemas.password      // Strong password (8+ chars, uppercase, lowercase, number, special)
commonSchemas.username      // Username (3-30 chars, alphanumeric + _ -)
commonSchemas.id            // UUID validation
commonSchemas.positiveInteger // Positive integer
commonSchemas.url           // URL validation
commonSchemas.date          // ISO date string
```

## Security Headers (Automatic)

All applied by `applySecurityMiddleware(app)`:

- ✅ HSTS (Strict-Transport-Security)
- ✅ CSP (Content-Security-Policy)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ Cross-Origin Policies

## Critical Environment Variables

```env
# Required for production
NODE_ENV=production
JWT_SECRET=<32+ chars>
DB_SSL_ENABLED=true
FORCE_HTTPS=true
SECURE_COOKIES=true

# Recommended
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_SANITIZE=true
ENABLE_INPUT_VALIDATION=true
```

## Testing Commands

```bash
# Test security headers
curl -I http://localhost:3001/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/api/health; done

# Test input validation
curl -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid"}'

# Test with API key
curl -H "X-API-Key: aves_dev_..." http://localhost:3001/api/data
```

## Common Issues & Quick Fixes

**Issue**: Server won't start - weak JWT secret
```bash
# Fix: Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Issue**: CORS errors
```env
# Fix: Add origin to .env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Issue**: Rate limited during development
```env
# Fix: Whitelist your IP
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1
```

**Issue**: Validation too strict
```typescript
// Fix: Adjust schema
z.string().min(8) // Instead of .min(20)
```

## Production Pre-Launch Checklist

```bash
# 1. Check secrets
[ ] JWT_SECRET is 32+ characters
[ ] SESSION_SECRET is 32+ characters
[ ] No default/weak secrets

# 2. Check environment
[ ] NODE_ENV=production
[ ] FORCE_HTTPS=true
[ ] SECURE_COOKIES=true
[ ] DB_SSL_ENABLED=true
[ ] DEV_AUTH_BYPASS=false

# 3. Check security features
[ ] Rate limiting enabled
[ ] Input validation enabled
[ ] CORS configured correctly
[ ] Logging enabled

# 4. Run security audit
npm audit
npm audit fix

# 5. Test security headers
curl -I https://your-domain.com
```

## File Locations

```
backend/
├── src/
│   ├── middleware/
│   │   ├── security.ts           # Security headers
│   │   ├── rateLimiting.ts       # Rate limiting
│   │   ├── inputValidation.ts    # Input validation
│   │   ├── requestLogger.ts      # Logging
│   │   └── apiKeyAuth.ts         # API key auth
│   ├── config/
│   │   └── security.ts           # Security config
│   └── index.ts                  # Main server file
├── .env.example                  # Environment template
└── docs/
    ├── SECURITY.md               # Full documentation
    ├── SECURITY_INTEGRATION_GUIDE.md  # Integration guide
    └── SECURITY_QUICK_REFERENCE.md    # This file
```

## Emergency Contacts

**Security Issues**: security@aves.example.com
**Documentation**: See `docs/SECURITY.md` for full details

---

**Remember**: Security is not optional. Always use HTTPS in production, never commit secrets, and keep dependencies updated.
