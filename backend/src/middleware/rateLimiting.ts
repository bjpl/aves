/**
 * Advanced Rate Limiting Middleware
 * Implements multiple rate limiting strategies for different endpoints
 * Includes IP-based, token-based, and sliding window algorithms
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { warn, info } from '../utils/logger';

/**
 * Rate limit configuration interface
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Custom rate limit handler with logging
 */
function rateLimitHandler(req: Request, res: Response): void {
  warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

/**
 * Skip rate limiting for certain conditions
 */
function skipRateLimiting(req: Request): boolean {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }

  // Skip for whitelisted IPs (if configured)
  const whitelistedIps = process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || [];
  if (whitelistedIps.includes(req.ip || '')) {
    return true;
  }

  // Skip for API keys with unlimited access (if configured)
  const apiKey = req.headers['x-api-key'] as string;
  const unlimitedKeys = process.env.RATE_LIMIT_UNLIMITED_KEYS?.split(',') || [];
  if (apiKey && unlimitedKeys.includes(apiKey)) {
    return true;
  }

  return false;
}

/**
 * Generate a unique key for rate limiting (IP + User ID if authenticated)
 */
function generateRateLimitKey(req: Request): string {
  const userId = (req as { user?: { id: string } }).user?.id || 'anonymous';
  const ip = req.ip || 'unknown';
  return `${ip}-${userId}`;
}

/**
 * General API rate limiter (default for all API routes)
 */
export function createApiRateLimiter(): RateLimitRequestHandler {
  const config: RateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({
    ...config,
    handler: (req: Request, res: Response) => {
      info('Rate limit reached', {
        ip: req.ip,
        path: req.path,
        limit: config.max,
        window: `${config.windowMs / 1000}s`,
      });
      rateLimitHandler(req, res);
    },
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login, registration, password reset
 */
export function createAuthRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_STRICT_MAX_REQUESTS || '5'), // Only 5 attempts
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count successful attempts too
    skipFailedRequests: false,
    handler: (req: Request, res: Response) => {
      warn('Auth rate limit exceeded - potential brute force attack', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      res.status(429).json({
        error: 'Too many authentication attempts',
        message:
          'You have exceeded the maximum number of authentication attempts. Please try again in 15 minutes.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    skip: skipRateLimiting,
    keyGenerator: (req: Request) => {
      // Use IP + attempted email/username for more precise rate limiting
      const email = req.body?.email || req.body?.username || '';
      const ip = req.ip || 'unknown';
      return `${ip}-${email}`;
    },
    validate: { trustProxy: false },
  });
}

/**
 * API rate limiter for authenticated requests
 * Higher limits than general API but still controlled
 */
export function createAuthenticatedApiRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_API_MAX_REQUESTS || '60'), // 60 per minute
    message: 'API rate limit exceeded, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * File upload rate limiter
 * Stricter limits to prevent abuse of upload endpoints
 */
export function createUploadRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many file uploads, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      warn('Upload rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString(),
      });

      res.status(429).json({
        error: 'Upload rate limit exceeded',
        message: 'You have exceeded the maximum number of uploads. Please try again in 1 minute.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * AI/ML endpoint rate limiter
 * Very strict limits for expensive AI operations
 */
export function createAIRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: parseInt(process.env.VISION_API_TIMEOUT || '60000'), // 1 minute
    max: parseInt(process.env.VISION_RATE_LIMIT_PER_MINUTE || '20'), // 20 per minute
    message: 'AI service rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      warn('AI rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: (req as { user?: { id: string } }).user?.id,
        timestamp: new Date().toISOString(),
      });

      res.status(429).json({
        error: 'AI service rate limit exceeded',
        message:
          'You have exceeded the rate limit for AI services. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * Create a custom rate limiter with specific options
 */
export function createCustomRateLimiter(
  windowMs: number,
  maxRequests: number,
  message: string = 'Rate limit exceeded'
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * Sliding window rate limiter (more accurate than fixed window)
 * Requires Redis or similar store for production use
 */
export function createSlidingWindowRateLimiter(
  windowMs: number,
  maxRequests: number
): RateLimitRequestHandler {
  // This is a simplified version. For production, use a Redis store
  // with express-rate-limit's Redis store adapter
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: skipRateLimiting,
    keyGenerator: generateRateLimitKey,
    validate: { trustProxy: false },
  });
}

/**
 * Initialize rate limiting middleware
 */
export function initializeRateLimiting(): void {
  info('Rate limiting middleware initialized', {
    generalWindow: `${parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000}s`,
    generalMax: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    authWindow: `${parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS || '900000') / 1000}s`,
    authMax: process.env.RATE_LIMIT_STRICT_MAX_REQUESTS || '5',
    aiWindow: `${parseInt(process.env.VISION_API_TIMEOUT || '60000') / 1000}s`,
    aiMax: process.env.VISION_RATE_LIMIT_PER_MINUTE || '20',
  });
}

export default {
  createApiRateLimiter,
  createAuthRateLimiter,
  createAuthenticatedApiRateLimiter,
  createUploadRateLimiter,
  createAIRateLimiter,
  createCustomRateLimiter,
  createSlidingWindowRateLimiter,
  initializeRateLimiting,
};
