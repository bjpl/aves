# Security Integration Guide

This guide shows how to integrate and use all security features in the AVES application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Security Middleware Setup](#security-middleware-setup)
3. [Rate Limiting Configuration](#rate-limiting-configuration)
4. [Input Validation Examples](#input-validation-examples)
5. [API Key Authentication](#api-key-authentication)
6. [Request Logging](#request-logging)
7. [Testing Security Features](#testing-security-features)

---

## Quick Start

### 1. Install Dependencies

All required security packages are already in package.json:

```bash
npm install
```

Dependencies include:
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `zod` - Input validation
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `pino` & `pino-http` - Logging

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

**CRITICAL**: Generate strong secrets:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate API key secret
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Update `.env` with generated values:

```env
JWT_SECRET=<generated-jwt-secret>
SESSION_SECRET=<generated-session-secret>
API_KEY_SECRET=<generated-api-key-secret>
NODE_ENV=production
```

### 3. Update Server Configuration

Replace your existing server setup with the enhanced security configuration:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import security middleware
import { applySecurityMiddleware } from './middleware/security';
import { createApiRateLimiter, createAuthRateLimiter } from './middleware/rateLimiting';
import { createPinoHttpLogger, errorLogger } from './middleware/requestLogger';
import { sanitizeRequest, detectMaliciousInput } from './middleware/inputValidation';

dotenv.config();

const app = express();

// 1. Apply all security middleware (headers, HTTPS, etc.)
applySecurityMiddleware(app);

// 2. CORS configuration
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS !== 'false',
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
}));

// 3. Body parsing with size limits
app.use(express.json({ limit: process.env.MAX_REQUEST_BODY_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Request logging
app.use(createPinoHttpLogger());

// 5. Input sanitization
app.use(sanitizeRequest);
app.use(detectMaliciousInput);

// 6. General API rate limiting
app.use('/api/', createApiRateLimiter());

// 7. Your routes here
app.use('/api/auth', createAuthRateLimiter(), authRouter);
// ... other routes

// 8. Error logging
app.use(errorLogger);

// 9. Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Security Middleware Setup

### Complete Middleware Stack

```typescript
import { applySecurityMiddleware } from './middleware/security';
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
  createAIRateLimiter
} from './middleware/rateLimiting';
import {
  requestLogger,
  errorLogger,
  performanceLogger
} from './middleware/requestLogger';
import {
  sanitizeRequest,
  detectMaliciousInput,
  validateRequest
} from './middleware/inputValidation';
import { requireApiKey } from './middleware/apiKeyAuth';

// Apply in this order:
app.use(applySecurityMiddleware(app));         // Security headers
app.use(requestLogger);                        // Request logging
app.use(performanceLogger);                    // Performance monitoring
app.use(sanitizeRequest);                      // Input sanitization
app.use(detectMaliciousInput);                 // Malicious input detection
app.use('/api/', createApiRateLimiter());      // Rate limiting
```

### Individual Security Headers

```typescript
import {
  getHelmetMiddleware,
  additionalSecurityHeaders,
  forceHttps
} from './middleware/security';

// Only HTTPS redirect
app.use(forceHttps);

// Only helmet headers
app.use(getHelmetMiddleware());

// Only additional headers
app.use(additionalSecurityHeaders);
```

---

## Rate Limiting Configuration

### Different Rate Limits for Different Endpoints

```typescript
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
  createAIRateLimiter,
  createCustomRateLimiter
} from './middleware/rateLimiting';

// General API endpoints (100 req/15min)
app.use('/api/', createApiRateLimiter());

// Authentication endpoints (5 req/15min)
app.use('/api/auth/login', createAuthRateLimiter(), loginHandler);
app.use('/api/auth/register', createAuthRateLimiter(), registerHandler);
app.use('/api/auth/reset-password', createAuthRateLimiter(), resetHandler);

// File upload endpoints (10 req/min)
app.use('/api/upload', createUploadRateLimiter(), uploadHandler);

// AI/ML endpoints (20 req/min)
app.use('/api/ai/', createAIRateLimiter(), aiRouter);

// Custom rate limit (50 req/10min)
app.use('/api/custom', createCustomRateLimiter(600000, 50), customHandler);
```

### Environment Configuration

```env
# General API
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Authentication
RATE_LIMIT_STRICT_WINDOW_MS=900000
RATE_LIMIT_STRICT_MAX_REQUESTS=5

# Whitelist IPs (bypass rate limiting)
RATE_LIMIT_WHITELIST_IPS=192.168.1.1,10.0.0.1
```

---

## Input Validation Examples

### Using Zod Schemas

```typescript
import { validateRequest, commonSchemas } from './middleware/inputValidation';
import { z } from 'zod';

// 1. User registration validation
const registerSchema = {
  body: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    username: commonSchemas.username,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
  }),
};

app.post('/api/auth/register', validateRequest(registerSchema), registerHandler);

// 2. Pagination validation
const paginationSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};

app.get('/api/users', validateRequest(paginationSchema), getUsersHandler);

// 3. ID parameter validation
const idSchema = {
  params: z.object({
    id: commonSchemas.id, // UUID validation
  }),
};

app.get('/api/users/:id', validateRequest(idSchema), getUserHandler);

// 4. Complex nested validation
const createPostSchema = {
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().min(10).max(10000),
    tags: z.array(z.string()).max(10).optional(),
    published: z.boolean().default(false),
    metadata: z.object({
      author: z.string(),
      category: z.string(),
      imageUrl: commonSchemas.url.optional(),
    }).optional(),
  }),
};

app.post('/api/posts', validateRequest(createPostSchema), createPostHandler);
```

### Manual Sanitization

```typescript
import { sanitizeString, sanitizeObject } from './middleware/inputValidation';

// Sanitize individual strings
const userInput = req.body.comment;
const safeComment = sanitizeString(userInput);

// Sanitize entire objects
const userData = req.body;
const safeData = sanitizeObject(userData);
```

### Detect Malicious Input

```typescript
import { detectSQLInjection, detectXSS } from './middleware/inputValidation';

const searchQuery = req.query.q;

if (detectSQLInjection(searchQuery)) {
  return res.status(400).json({ error: 'Invalid search query' });
}

if (detectXSS(searchQuery)) {
  return res.status(400).json({ error: 'Invalid input detected' });
}
```

---

## API Key Authentication

### Setup

```typescript
import {
  requireApiKey,
  createApiKey,
  initializeApiKeyAuth
} from './middleware/apiKeyAuth';

// Initialize on server start
initializeApiKeyAuth();

// Create API keys programmatically
const devKey = createApiKey({
  name: 'Development Key',
  environment: 'dev',
  permissions: ['read', 'write'],
  rateLimit: 1000,
});

const prodKey = createApiKey({
  name: 'Production Key',
  environment: 'prod',
  permissions: ['read'],
  rateLimit: 100,
});

console.log('Dev API Key:', devKey);
console.log('Prod API Key:', prodKey);
```

### Usage in Routes

```typescript
// Require API key (any valid key)
app.get('/api/public-data',
  requireApiKey({ required: true }),
  publicDataHandler
);

// Require API key with specific permissions
app.post('/api/admin/users',
  requireApiKey({
    required: true,
    permissions: ['admin', 'users:write']
  }),
  createUserHandler
);

// Optional API key (track usage but don't require)
app.get('/api/optional',
  requireApiKey({ required: false }),
  optionalHandler
);

// Access API key info in handlers
function myHandler(req: Request, res: Response) {
  const apiKey = (req as ApiKeyRequest).apiKey;

  if (apiKey) {
    console.log('API Key:', apiKey.key);
    console.log('Environment:', apiKey.environment);
    console.log('Permissions:', apiKey.permissions);
  }

  res.json({ success: true });
}
```

### Client Usage

```bash
# Using header (recommended)
curl -H "X-API-Key: aves_prod_a1b2c3d4..." https://api.example.com/data

# Using Authorization header
curl -H "Authorization: Bearer aves_prod_a1b2c3d4..." https://api.example.com/data

# Using query parameter (not recommended, only if enabled)
curl "https://api.example.com/data?api_key=aves_prod_a1b2c3d4..."
```

---

## Request Logging

### Automatic Logging

All requests are automatically logged with:
- Timestamp
- HTTP method and path
- Status code
- Response time
- Request/response size
- IP address
- User agent

Sensitive data is automatically sanitized.

### Custom Logging

```typescript
import { info, warn, error } from './utils/logger';

// Log information
info('User logged in', { userId: user.id, ip: req.ip });

// Log warnings
warn('Failed login attempt', { email: req.body.email, ip: req.ip });

// Log errors
error('Database connection failed', { error: err.message });
```

### Log Configuration

```env
LOG_LEVEL=info                    # trace, debug, info, warn, error, fatal
LOG_FILE=./logs/app.log          # Optional log file
LOG_REQUESTS=true                # Enable request logging
LOG_SANITIZE=true                # Sanitize sensitive data
```

### View Logs

```bash
# In development (pretty printed)
npm run dev

# In production (JSON format)
tail -f logs/app.log

# Filter by level
tail -f logs/app.log | grep '"level":"error"'
```

---

## Testing Security Features

### 1. Test Security Headers

```bash
# Install httpie or use curl
http GET http://localhost:3001/health

# Check headers
curl -I http://localhost:3001/health
```

Expected headers:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Content-Security-Policy`

### 2. Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl http://localhost:3001/api/health
done

# Expected: After limit, receive 429 Too Many Requests
```

### 3. Test Input Validation

```bash
# Valid input
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ss123",
    "username": "testuser"
  }'

# Invalid email
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "SecureP@ss123",
    "username": "testuser"
  }'
# Expected: 400 Bad Request with validation errors

# Weak password
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "username": "testuser"
  }'
# Expected: 400 Bad Request with password requirements
```

### 4. Test XSS Protection

```bash
curl -X POST http://localhost:3001/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "<script>alert(\"XSS\")</script>"
  }'

# Expected: Script tags should be escaped or removed
```

### 5. Test API Key Authentication

```bash
# Without API key
curl http://localhost:3001/api/protected

# Expected: 401 Unauthorized

# With valid API key
curl -H "X-API-Key: aves_dev_abc123..." \
  http://localhost:3001/api/protected

# Expected: 200 OK
```

---

## Production Checklist

Before deploying to production, ensure:

- [ ] All environment variables are set
- [ ] Strong secrets generated (32+ characters)
- [ ] `NODE_ENV=production`
- [ ] `FORCE_HTTPS=true`
- [ ] `SECURE_COOKIES=true`
- [ ] `DB_SSL_ENABLED=true`
- [ ] `DEV_AUTH_BYPASS=false`
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Logging configured
- [ ] SSL certificate installed
- [ ] Security headers verified
- [ ] Dependencies updated (`npm audit`)

---

## Troubleshooting

### Common Issues

**1. Server won't start with weak JWT secret**

```
Error: JWT_SECRET must be at least 32 characters long in production
```

**Solution**: Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. CORS errors**

```
Access to fetch at 'http://api.example.com' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Solution**: Add origin to `CORS_ALLOWED_ORIGINS`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**3. Rate limit exceeded during development**

**Solution**: Add your IP to whitelist:
```env
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1
```

**4. Input validation rejecting valid data**

Check validation schema and adjust as needed. Example:
```typescript
// Too strict
password: z.string().min(20)

// More reasonable
password: z.string().min(8)
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Zod Documentation](https://zod.dev/)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Pino Logger](https://getpino.io/)

---

## Support

For security-related questions or to report vulnerabilities:
- Email: security@aves.example.com
- Do not create public issues for security vulnerabilities
