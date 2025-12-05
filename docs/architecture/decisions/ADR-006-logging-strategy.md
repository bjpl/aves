# ADR-006: Logging Strategy - Pino Structured Logging

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** DevOps Team, Backend Team
**Tags:** #logging #observability #monitoring #pino #production

---

## Context

AVES requires comprehensive logging for:

- **Production Debugging:** Trace errors and performance issues
- **Security Auditing:** Track authentication and authorization events
- **Performance Monitoring:** Identify slow queries and API calls
- **User Behavior Analytics:** Understand usage patterns
- **Compliance:** Maintain audit trails for educational platform

**Problem Statement:** What logging strategy should we use to provide production observability while maintaining performance and cost efficiency?

**Constraints:**
- Must support structured logging (JSON format)
- Must work in both development and production
- Must integrate with cloud platforms (Railway, Render)
- Must have minimal performance overhead
- Should support log aggregation and analysis
- Must redact sensitive information (passwords, API keys)

---

## Decision

We will use **Pino** for structured JSON logging with request correlation.

**Core Components:**

1. **Logger:** Pino (high-performance JSON logger)
2. **HTTP Middleware:** Pino-HTTP (automatic request/response logging)
3. **Format:** JSON (machine-readable, structured)
4. **Log Levels:** trace, debug, info, warn, error, fatal
5. **Correlation:** Request ID tracking across services
6. **Redaction:** Automatic PII/secret removal

**Architecture:**

```
┌──────────────────────────────────────────────┐
│           Express Application                │
│  ┌────────────────────────────────────────┐  │
│  │     Pino-HTTP Middleware               │  │
│  │  - Generate request ID                 │  │
│  │  - Log incoming requests               │  │
│  │  - Log responses with duration         │  │
│  └────────────┬───────────────────────────┘  │
│               │                               │
│               ▼                               │
│  ┌────────────────────────────────────────┐  │
│  │        Pino Logger                     │  │
│  │  - Structured JSON logs                │  │
│  │  - Automatic field serialization       │  │
│  │  - Redact sensitive data               │  │
│  └────────────┬───────────────────────────┘  │
└───────────────┼───────────────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │      Log Destination      │
    │                           │
    │  Development: stdout      │
    │  Production: JSON files   │
    │  Cloud: Railway logs      │
    └───────────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │   Log Aggregation         │
    │  (Future: Datadog/Sentry) │
    └───────────────────────────┘
```

---

## Consequences

### Positive

✅ **High Performance**
- Pino is 5-10x faster than Winston
- Asynchronous logging (non-blocking)
- Minimal memory overhead
- ~2ms per log statement

✅ **Structured Logging (JSON)**
- Machine-readable format
- Easy to parse and analyze
- Supports complex objects
- Integrates with log aggregation tools

Example:
```json
{
  "level": 30,
  "time": 1701388800000,
  "pid": 12345,
  "hostname": "aves-backend",
  "reqId": "req-abc123",
  "req": {
    "method": "POST",
    "url": "/api/annotations",
    "headers": { "user-agent": "..." }
  },
  "responseTime": 152,
  "statusCode": 201,
  "msg": "request completed"
}
```

✅ **Request Correlation**
- Unique request ID for each API call
- Trace requests across middleware/services
- Correlate logs for same request

✅ **Automatic Redaction**
- Removes passwords, API keys, tokens
- Configurable redaction rules
- Prevents accidental secret logging

✅ **Development Experience**
- Pretty-printed logs in development
- JSON logs in production
- Clear error stack traces
- Helpful debugging information

### Negative

⚠️ **JSON Readability**
- JSON logs harder to read than plain text
- Requires tooling for human consumption
- Mitigated by pino-pretty in development

⚠️ **Learning Curve**
- Developers must learn structured logging
- Child logger concept requires training
- Redaction configuration can be tricky

⚠️ **Log Volume**
- Structured logs larger than plain text
- Can increase storage costs
- Requires log rotation strategy

### Mitigations

1. **Development Pretty Printing:**
```bash
# package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts | pino-pretty"
  }
}
```

2. **Log Rotation:**
```typescript
// Use pino-roll or log rotation at platform level
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/app.log',
      mkdir: true,
    },
  },
});
```

3. **Log Level Configuration:**
```typescript
// Reduce production log volume
const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // 'debug' in dev, 'info' in prod
});
```

---

## Alternatives Considered

### Alternative 1: Winston

**Pros:**
- Most popular Node.js logger
- Large ecosystem of transports
- Familiar to many developers

**Cons:**
- Slower than Pino (10x performance difference)
- Synchronous by default
- More complex configuration
- **Rejected because:** Performance overhead unacceptable for high-traffic API

### Alternative 2: Bunyan

**Pros:**
- Structured JSON logging
- Good performance
- Similar to Pino

**Cons:**
- Less active development
- Smaller community
- Fewer integrations
- **Rejected because:** Pino is faster and more actively maintained

### Alternative 3: console.log

**Pros:**
- Built into Node.js
- Zero dependencies
- Familiar to all developers

**Cons:**
- No structured logging
- No log levels
- No request correlation
- **Rejected because:** Insufficient for production observability

---

## Implementation Details

### Logger Configuration

**Backend Logger Setup:**
```typescript
// backend/src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'apiKey',
      'token',
      'secret',
      '*.password',
      '*.apiKey',
    ],
    remove: true, // Remove instead of replacing with '[Redacted]'
  },

  // Serializers for consistent formatting
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },

  // Development pretty printing
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Convenience methods
export const info = logger.info.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const debug = logger.debug.bind(logger);
```

### HTTP Request Logging

**Pino-HTTP Middleware:**
```typescript
// backend/src/middleware/requestLogger.ts
import pinoHttp from 'pino-http';
import { logger } from '@/utils/logger';

export const requestLogger = pinoHttp({
  logger,

  // Generate unique request ID
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),

  // Custom request logging
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed in ${res.responseTime}ms`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },

  // Custom request attributes
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Auto-log request and response
  autoLogging: true,
});
```

**Usage in Express:**
```typescript
// backend/src/index.ts
import express from 'express';
import { requestLogger } from '@/middleware/requestLogger';

const app = express();

// Add request logger EARLY in middleware chain
app.use(requestLogger);

// Routes...
```

### Structured Logging in Services

**Service Layer Logging:**
```typescript
// backend/src/services/VisionAIService.ts
import { logger } from '@/utils/logger';

export class VisionAIService {
  async annotateImage(speciesId: string, imageUrl: string) {
    const startTime = Date.now();

    // Create child logger with context
    const log = logger.child({
      service: 'VisionAI',
      speciesId,
      operation: 'annotateImage',
    });

    log.info('Starting AI annotation');

    try {
      const annotations = await this.callAnthropicAPI(imageUrl);

      log.info({
        annotationCount: annotations.length,
        duration: Date.now() - startTime,
      }, 'AI annotation completed');

      return annotations;
    } catch (error) {
      log.error({
        error: error.message,
        duration: Date.now() - startTime,
      }, 'AI annotation failed');

      throw error;
    }
  }
}
```

### Error Logging

**Error Handler Middleware:**
```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error with full context
  logger.error({
    err,
    req: {
      id: req.id,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    },
    statusCode: err.statusCode || 500,
  }, 'Request error');

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

---

## Log Levels and Guidelines

### Level Usage

| Level | When to Use | Example |
|-------|-------------|---------|
| `trace` | Very detailed debugging (rarely used) | SQL queries, low-level operations |
| `debug` | Debugging information | Function entry/exit, variable values |
| `info` | General informational messages | Request completed, service started |
| `warn` | Warning conditions (recoverable) | Deprecated API usage, rate limiting |
| `error` | Error conditions (requires attention) | Database errors, API failures |
| `fatal` | Critical errors (app crashes) | Unrecoverable errors, process exits |

### Logging Best Practices

**✅ Good Logging:**
```typescript
// Include context and structured data
logger.info({
  userId: user.id,
  action: 'login',
  ipAddress: req.ip,
}, 'User logged in successfully');

// Log performance metrics
logger.info({
  operation: 'generateExercises',
  exerciseCount: 10,
  duration: 234,
  cacheHit: true,
}, 'Exercise generation completed');
```

**❌ Bad Logging:**
```typescript
// Avoid string concatenation
logger.info('User ' + userId + ' logged in'); // BAD

// Don't log sensitive data
logger.info({ password: user.password }); // BAD (should be redacted)

// Avoid excessive logging
for (const item of items) {
  logger.debug('Processing item', item); // BAD (creates log spam)
}
```

---

## Performance Monitoring

### Response Time Logging

```typescript
// Automatically logged by pino-http
{
  "level": 30,
  "req": { "method": "GET", "url": "/api/species/123" },
  "res": { "statusCode": 200 },
  "responseTime": 45, // milliseconds
  "msg": "request completed"
}
```

### Database Query Logging

```typescript
// Log slow queries
async function query(sql: string, params: any[]) {
  const startTime = Date.now();
  const result = await pool.query(sql, params);
  const duration = Date.now() - startTime;

  if (duration > 100) {
    logger.warn({
      query: sql.substring(0, 100), // Truncate long queries
      duration,
      rowCount: result.rowCount,
    }, 'Slow database query detected');
  }

  return result;
}
```

### AI API Call Logging

```typescript
// Log AI API usage for cost tracking
logger.info({
  provider: 'anthropic',
  model: 'claude-sonnet-4.5',
  operation: 'annotation',
  inputTokens: 1500,
  outputTokens: 800,
  estimatedCost: 0.012,
  duration: 2300,
}, 'AI API call completed');
```

---

## Log Aggregation (Future)

### Integration with Datadog (Planned)

```typescript
// Install: npm install pino-datadog
import { logger } from '@/utils/logger';

// Add Datadog transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add({
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: 'aves-backend',
      env: 'production',
    },
  });
}
```

### Integration with Sentry (Planned)

```typescript
import * as Sentry from '@sentry/node';

// Log errors to Sentry
logger.error = (obj: any, msg?: string) => {
  const error = obj instanceof Error ? obj : obj.err;
  if (error) {
    Sentry.captureException(error);
  }
  return originalError.call(logger, obj, msg);
};
```

---

## Related Decisions

- **ADR-007:** Authentication Flow (audit logging)
- **ADR-009:** CI/CD Pipeline (log collection)

---

## References

- [Pino Documentation](https://getpino.io/)
- [12-Factor App: Logs](https://12factor.net/logs)
- [Structured Logging Best Practices](https://engineering.grab.com/structured-logging)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | DevOps Team | Accepted | Pino selected |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
**Performance Impact:** <2ms per log statement
**Log Volume:** ~50MB/day (development), ~200MB/day (production estimate)
