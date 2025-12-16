/**
 * Rate Limiting Middleware Tests
 * Tests for advanced rate limiting strategies across different endpoints
 */

import { Request, Response } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createAuthenticatedApiRateLimiter,
  createUploadRateLimiter,
  createAIRateLimiter,
  createCustomRateLimiter,
  createSlidingWindowRateLimiter,
  initializeRateLimiting,
} from '../../middleware/rateLimiting';
import * as logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    // Return a middleware function that simulates rate limit behavior
    const middleware = jest.fn((req: Request, res: Response, next: () => void) => {
      // Simulate skip logic
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Simulate key generation
      if (options.keyGenerator) {
        options.keyGenerator(req);
      }

      // Simulate normal flow (not rate limited)
      next();
    });

    // Attach options for testing
    (middleware as any).options = options;
    return middleware;
  });
});

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_MESSAGE;
    delete process.env.RATE_LIMIT_STRICT_WINDOW_MS;
    delete process.env.RATE_LIMIT_STRICT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_API_WINDOW_MS;
    delete process.env.RATE_LIMIT_API_MAX_REQUESTS;
    delete process.env.VISION_API_TIMEOUT;
    delete process.env.VISION_RATE_LIMIT_PER_MINUTE;
    delete process.env.RATE_LIMIT_WHITELIST_IPS;
    delete process.env.RATE_LIMIT_UNLIMITED_KEYS;

    mockRequest = {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      headers: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('createApiRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createApiRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use default configuration values', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(900000); // 15 minutes
      expect(options.max).toBe(100);
      expect(options.standardHeaders).toBe(true);
      expect(options.legacyHeaders).toBe(false);
    });

    it('should use environment variables when set', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '300000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '50';
      process.env.RATE_LIMIT_MESSAGE = 'Custom message';

      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(300000);
      expect(options.max).toBe(50);
      expect(options.message).toBe('Custom message');
    });

    it('should skip rate limiting for /health endpoint', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.path = '/health';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });

    it('should skip rate limiting for /api/health endpoint', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.path = '/api/health';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1,10.0.0.1';
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });

    it('should not skip rate limiting for non-whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '10.0.0.1,172.16.0.1';
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/api/test';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(false);
    });

    it('should skip rate limiting for unlimited API keys', () => {
      process.env.RATE_LIMIT_UNLIMITED_KEYS = 'key1,key2';
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.headers = { 'x-api-key': 'key1' };
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });

    it('should generate rate limit key with IP and user ID', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      (mockRequest as any).user = { id: 'user123' };

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toBe('192.168.1.1-user123');
    });

    it('should generate rate limit key with IP for anonymous users', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toBe('192.168.1.1-anonymous');
    });

    it('should call handler and log when rate limit is exceeded', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/api/test';
      mockResponse.getHeader = jest.fn().mockReturnValue('60');

      options.handler(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith('Rate limit reached', expect.any(Object));
      expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded', expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
        })
      );
    });

    it('should call next when not rate limited', () => {
      const limiter = createApiRateLimiter();
      limiter(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('createAuthRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createAuthRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use strict default configuration', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(900000); // 15 minutes
      expect(options.max).toBe(5); // Only 5 attempts
      expect(options.skipSuccessfulRequests).toBe(false);
      expect(options.skipFailedRequests).toBe(false);
    });

    it('should use environment variables when set', () => {
      process.env.RATE_LIMIT_STRICT_WINDOW_MS = '600000';
      process.env.RATE_LIMIT_STRICT_MAX_REQUESTS = '3';

      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(600000);
      expect(options.max).toBe(3);
    });

    it('should generate key with IP and email from request body', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.body = { email: 'test@example.com' };

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toBe('192.168.1.1-test@example.com');
    });

    it('should generate key with IP and username from request body', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.body = { username: 'testuser' };

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toBe('192.168.1.1-testuser');
    });

    it('should generate key with IP when no email or username', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.body = {};

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toBe('192.168.1.1-');
    });

    it('should log warning for potential brute force attack', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/auth/login';
      mockRequest.method = 'POST';
      mockRequest.headers = { 'user-agent': 'Test Agent' };
      mockResponse.getHeader = jest.fn().mockReturnValue('900');

      options.handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(
        'Auth rate limit exceeded - potential brute force attack',
        expect.objectContaining({
          ip: '192.168.1.1',
          path: '/auth/login',
          method: 'POST',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many authentication attempts',
        })
      );
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('createAuthenticatedApiRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createAuthenticatedApiRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use higher limits than auth limiter', () => {
      const limiter = createAuthenticatedApiRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(60000); // 1 minute
      expect(options.max).toBe(60); // 60 per minute
    });

    it('should use environment variables when set', () => {
      process.env.RATE_LIMIT_API_WINDOW_MS = '120000';
      process.env.RATE_LIMIT_API_MAX_REQUESTS = '100';

      const limiter = createAuthenticatedApiRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(120000);
      expect(options.max).toBe(100);
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createAuthenticatedApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('createUploadRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createUploadRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use strict upload limits', () => {
      const limiter = createUploadRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(60000); // 1 minute
      expect(options.max).toBe(10); // 10 uploads per minute
    });

    it('should log warning when upload limit exceeded', () => {
      const limiter = createUploadRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/api/upload';
      mockResponse.getHeader = jest.fn().mockReturnValue('60');

      options.handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(
        'Upload rate limit exceeded',
        expect.objectContaining({
          ip: '192.168.1.1',
          path: '/api/upload',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upload rate limit exceeded',
        })
      );
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createUploadRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('createAIRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createAIRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use strict AI service limits', () => {
      const limiter = createAIRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(60000); // 1 minute
      expect(options.max).toBe(20); // 20 per minute
    });

    it('should use environment variables when set', () => {
      process.env.VISION_API_TIMEOUT = '120000';
      process.env.VISION_RATE_LIMIT_PER_MINUTE = '30';

      const limiter = createAIRateLimiter();
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(120000);
      expect(options.max).toBe(30);
    });

    it('should log warning with user ID when AI limit exceeded', () => {
      const limiter = createAIRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/api/ai/vision';
      (mockRequest as any).user = { id: 'user123' };
      mockResponse.getHeader = jest.fn().mockReturnValue('60');

      options.handler(mockRequest as Request, mockResponse as Response);

      expect(logger.warn).toHaveBeenCalledWith(
        'AI rate limit exceeded',
        expect.objectContaining({
          ip: '192.168.1.1',
          path: '/api/ai/vision',
          userId: 'user123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AI service rate limit exceeded',
        })
      );
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createAIRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('createCustomRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createCustomRateLimiter(30000, 50);
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should accept custom windowMs and maxRequests', () => {
      const limiter = createCustomRateLimiter(30000, 50);
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(30000);
      expect(options.max).toBe(50);
    });

    it('should use default message when not provided', () => {
      const limiter = createCustomRateLimiter(30000, 50);
      const options = (limiter as any).options;

      expect(options.message).toBe('Rate limit exceeded');
    });

    it('should accept custom message', () => {
      const limiter = createCustomRateLimiter(30000, 50, 'Custom limit message');
      const options = (limiter as any).options;

      expect(options.message).toBe('Custom limit message');
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createCustomRateLimiter(30000, 50);
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('createSlidingWindowRateLimiter', () => {
    it('should return a middleware function', () => {
      const limiter = createSlidingWindowRateLimiter(60000, 100);
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should accept custom windowMs and maxRequests', () => {
      const limiter = createSlidingWindowRateLimiter(60000, 100);
      const options = (limiter as any).options;

      expect(options.windowMs).toBe(60000);
      expect(options.max).toBe(100);
    });

    it('should skip rate limiting for whitelisted IPs', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';
      const limiter = createSlidingWindowRateLimiter(60000, 100);
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(true);
    });
  });

  describe('initializeRateLimiting', () => {
    it('should log configuration without errors', () => {
      expect(() => initializeRateLimiting()).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith(
        'Rate limiting middleware initialized',
        expect.any(Object)
      );
    });

    it('should log default configuration values', () => {
      initializeRateLimiting();

      expect(logger.info).toHaveBeenCalledWith(
        'Rate limiting middleware initialized',
        expect.objectContaining({
          generalWindow: '900s', // 900000ms / 1000 = 900s
          generalMax: '100',
          authWindow: '900s',
          authMax: '5',
          aiWindow: '60s',
          aiMax: '20',
        })
      );
    });

    it('should log custom configuration from environment variables', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '300000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '50';
      process.env.RATE_LIMIT_STRICT_WINDOW_MS = '600000';
      process.env.RATE_LIMIT_STRICT_MAX_REQUESTS = '3';
      process.env.VISION_API_TIMEOUT = '120000';
      process.env.VISION_RATE_LIMIT_PER_MINUTE = '30';

      initializeRateLimiting();

      expect(logger.info).toHaveBeenCalledWith(
        'Rate limiting middleware initialized',
        expect.objectContaining({
          generalWindow: '300s',
          generalMax: '50',
          authWindow: '600s',
          authMax: '3',
          aiWindow: '120s',
          aiMax: '30',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      delete mockRequest.ip;

      const key = options.keyGenerator(mockRequest as Request);
      expect(key).toContain('unknown');
    });

    it('should handle requests with both email and username', () => {
      const limiter = createAuthRateLimiter();
      const options = (limiter as any).options;

      mockRequest.body = { email: 'test@example.com', username: 'testuser' };

      const key = options.keyGenerator(mockRequest as Request);
      // Should prefer email over username
      expect(key).toContain('test@example.com');
    });

    it('should handle empty whitelist configuration', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '';
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.ip = '192.168.1.1';
      mockRequest.path = '/api/test';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(false);
    });

    it('should handle empty unlimited keys configuration', () => {
      process.env.RATE_LIMIT_UNLIMITED_KEYS = '';
      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      mockRequest.headers = { 'x-api-key': 'somekey' };
      mockRequest.path = '/api/test';
      const shouldSkip = options.skip(mockRequest as Request);
      expect(shouldSkip).toBe(false);
    });

    it('should handle invalid environment variable values', () => {
      process.env.RATE_LIMIT_WINDOW_MS = 'invalid';
      process.env.RATE_LIMIT_MAX_REQUESTS = 'invalid';

      const limiter = createApiRateLimiter();
      const options = (limiter as any).options;

      // Should use NaN or 0 for invalid values, which is handled by parseInt
      expect(typeof options.windowMs).toBe('number');
      expect(typeof options.max).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should allow whitelisted IPs to bypass all limiters', () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1';

      const limiters = [
        createApiRateLimiter(),
        createAuthRateLimiter(),
        createAuthenticatedApiRateLimiter(),
        createUploadRateLimiter(),
        createAIRateLimiter(),
        createCustomRateLimiter(30000, 50),
      ];

      mockRequest.ip = '192.168.1.1';

      limiters.forEach((limiter) => {
        const options = (limiter as any).options;
        const shouldSkip = options.skip(mockRequest as Request);
        expect(shouldSkip).toBe(true);
      });
    });

    it('should allow unlimited API keys to bypass all limiters', () => {
      process.env.RATE_LIMIT_UNLIMITED_KEYS = 'master-key';

      const limiters = [
        createApiRateLimiter(),
        createAuthRateLimiter(),
        createAuthenticatedApiRateLimiter(),
        createUploadRateLimiter(),
        createAIRateLimiter(),
      ];

      mockRequest.headers = { 'x-api-key': 'master-key' };

      limiters.forEach((limiter) => {
        const options = (limiter as any).options;
        const shouldSkip = options.skip(mockRequest as Request);
        expect(shouldSkip).toBe(true);
      });
    });

    it('should always skip health endpoints for all limiters', () => {
      const limiters = [
        createApiRateLimiter(),
        createAuthRateLimiter(),
        createAuthenticatedApiRateLimiter(),
        createUploadRateLimiter(),
        createAIRateLimiter(),
      ];

      mockRequest.path = '/health';

      limiters.forEach((limiter) => {
        const options = (limiter as any).options;
        const shouldSkip = options.skip(mockRequest as Request);
        expect(shouldSkip).toBe(true);
      });
    });
  });
});
