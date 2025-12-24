/**
 * Request Logging Middleware
 * Comprehensive request/response logging with sensitive data sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { info, warn, error as logError } from '../utils/logger';
import pinoHttp from 'pino-http';
import pino from 'pino';

/**
 * Sensitive field patterns to sanitize in logs
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /auth/i,
  /bearer/i,
  /cookie/i,
  /session/i,
  /credit.*card/i,
  /card.*number/i,
  /cvv/i,
  /ssn/i,
  /social.*security/i,
];

/**
 * Headers to sanitize from logs
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-refresh-token',
];

/**
 * Check if a key contains sensitive information
 */
function isSensitiveKey(key: string): boolean {
  const keyLower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(keyLower));
}

/**
 * Recursively sanitize an object by replacing sensitive values
 */
function sanitizeObject(obj: unknown, redactedValue: string = '[REDACTED]'): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, redactedValue));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = redactedValue;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, redactedValue);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize request headers
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...headers };

  for (const header of SENSITIVE_HEADERS) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize request body
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  return sanitizeObject(body);
}

/**
 * Get request size in bytes
 */
function getRequestSize(req: Request): number {
  const contentLength = req.headers['content-length'];
  return contentLength ? parseInt(contentLength, 10) : 0;
}

/**
 * Get response size from response headers
 */
function getResponseSize(res: Response): number {
  const contentLength = res.getHeader('content-length');
  return contentLength ? parseInt(contentLength.toString(), 10) : 0;
}

/**
 * Create Pino HTTP logger with sanitization
 */
export function createPinoHttpLogger() {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
  });

  return pinoHttp({
    logger,
    autoLogging: process.env.LOG_REQUESTS !== 'false',
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    serializers: {
      req: (req: Request) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        path: req.path,
        headers:
          process.env.LOG_SANITIZE === 'true'
            ? sanitizeHeaders(req.headers)
            : req.headers,
        query: req.query,
        body:
          process.env.LOG_SANITIZE === 'true' ? sanitizeBody(req.body) : req.body,
        ip: req.ip,
        remoteAddress: req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        size: getRequestSize(req),
      }),
      res: (res: Response) => ({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        size: getResponseSize(res),
      }),
      err: pino.stdSerializers.err,
    },
  });
}

/**
 * Request logging middleware (manual implementation)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.LOG_REQUESTS === 'false') {
    return next();
  }

  const startTime = Date.now();

  // Log request
  const requestData = {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers:
      process.env.LOG_SANITIZE === 'true' ? sanitizeHeaders(req.headers) : req.headers,
    body: process.env.LOG_SANITIZE === 'true' ? sanitizeBody(req.body) : req.body,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    size: getRequestSize(req),
    timestamp: new Date().toISOString(),
  };

  info('Incoming request', requestData);

  // Intercept response
  const originalSend = res.send;

  res.send = function (data): Response {
    return originalSend.call(this, data);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      size: getResponseSize(res),
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode >= 500) {
      logError('Request failed with server error', responseData);
    } else if (res.statusCode >= 400) {
      warn('Request failed with client error', responseData);
    } else {
      info('Request completed successfully', responseData);
    }
  });

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Type guard for error objects
  const error = err as Error & {
    code?: string;
    status?: number;
    statusCode?: number;
  };
  const errorData = {
    error: {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status || error.statusCode || 500,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      headers:
        process.env.LOG_SANITIZE === 'true' ? sanitizeHeaders(req.headers) : req.headers,
      body: process.env.LOG_SANITIZE === 'true' ? sanitizeBody(req.body) : req.body,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
    timestamp: new Date().toISOString(),
  };

  logError('Request error', errorData);

  next(err);
}

/**
 * Performance monitoring middleware
 */
export function performanceLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    // Log slow requests (over 1 second)
    if (duration > 1000) {
      warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      });
    }

    // Add performance header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
}

/**
 * Initialize logging middleware
 */
export function initializeLogging(): void {
  info('Request logging middleware initialized', {
    logLevel: process.env.LOG_LEVEL || 'info',
    logRequests: process.env.LOG_REQUESTS !== 'false',
    logSanitize: process.env.LOG_SANITIZE === 'true',
    logFile: process.env.LOG_FILE,
  });
}

export default {
  requestLogger,
  errorLogger,
  performanceLogger,
  createPinoHttpLogger,
  sanitizeObject,
  sanitizeHeaders,
  sanitizeBody,
  initializeLogging,
};
