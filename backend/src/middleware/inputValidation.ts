/**
 * Input Validation and Sanitization Middleware
 * Provides comprehensive input validation using Zod schemas
 * and sanitization to prevent XSS, SQL injection, and other attacks
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { warn, info } from '../utils/logger';

/**
 * Validation error response
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * HTML tag pattern for XSS detection
 */
const HTML_TAG_PATTERN = /<[^>]*>/g;
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const SQL_INJECTION_PATTERN =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)|(')|(--)|(;)|(\/\*)|(\*\/)/gi;

/**
 * Sanitize string to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  if (process.env.ENABLE_HTML_SANITIZATION !== 'false') {
    // Remove script tags
    let sanitized = input.replace(SCRIPT_PATTERN, '');

    // Escape HTML special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  return input;
}

/**
 * Detect potential SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERN.test(input);
}

/**
 * Detect potential XSS attempts
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return SCRIPT_PATTERN.test(input) || HTML_TAG_PATTERN.test(input);
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate request against a Zod schema
 */
export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.ENABLE_INPUT_VALIDATION === 'false') {
      return next();
    }

    const errors: ValidationError[] = [];

    try {
      // Validate body
      if (schema.body && req.body) {
        try {
          req.body = await schema.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((err) => ({
                field: `body.${err.path.join('.')}`,
                message: err.message,
                code: err.code,
              }))
            );
          }
        }
      }

      // Validate query
      if (schema.query && req.query) {
        try {
          req.query = await schema.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((err) => ({
                field: `query.${err.path.join('.')}`,
                message: err.message,
                code: err.code,
              }))
            );
          }
        }
      }

      // Validate params
      if (schema.params && req.params) {
        try {
          req.params = await schema.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((err) => ({
                field: `params.${err.path.join('.')}`,
                message: err.message,
                code: err.code,
              }))
            );
          }
        }
      }

      if (errors.length > 0) {
        warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
        });

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Sanitize request middleware
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  if (process.env.ENABLE_INPUT_SANITIZATION === 'false') {
    return next();
  }

  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Detect malicious input middleware
 */
export function detectMaliciousInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const checkInput = (input: unknown, path: string = ''): boolean => {
    if (typeof input === 'string') {
      if (detectSQLInjection(input)) {
        warn('Potential SQL injection detected', {
          path: req.path,
          field: path,
          ip: req.ip,
        });
        return true;
      }

      if (detectXSS(input)) {
        warn('Potential XSS attack detected', {
          path: req.path,
          field: path,
          ip: req.ip,
        });
        return true;
      }
    } else if (typeof input === 'object' && input !== null) {
      for (const [key, value] of Object.entries(input)) {
        if (checkInput(value, `${path}.${key}`)) {
          return true;
        }
      }
    }

    return false;
  };

  let maliciousDetected = false;

  if (req.body) {
    maliciousDetected = checkInput(req.body, 'body') || maliciousDetected;
  }

  if (req.query) {
    maliciousDetected = checkInput(req.query, 'query') || maliciousDetected;
  }

  if (req.params) {
    maliciousDetected = checkInput(req.params, 'params') || maliciousDetected;
  }

  if (maliciousDetected && process.env.BLOCK_MALICIOUS_INPUT === 'true') {
    res.status(400).json({
      error: 'Invalid input',
      message: 'Your request contains potentially malicious content and has been blocked.',
    });
    return;
  }

  next();
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  id: z.string().uuid('Invalid ID format'),
  positiveInteger: z.number().int().positive('Must be a positive integer'),
  url: z.string().url('Invalid URL format'),
  date: z.string().datetime('Invalid date format'),
};

/**
 * Create a pagination schema
 */
export function createPaginationSchema() {
  return z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  });
}

/**
 * Initialize validation middleware
 */
export function initializeValidation(): void {
  const config = {
    inputValidation: process.env.ENABLE_INPUT_VALIDATION !== 'false',
    inputSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false',
    htmlSanitization: process.env.ENABLE_HTML_SANITIZATION !== 'false',
    blockMaliciousInput: process.env.BLOCK_MALICIOUS_INPUT === 'true',
  };

  info('Input validation middleware initialized:', config);
}

export default {
  validateRequest,
  sanitizeRequest,
  detectMaliciousInput,
  sanitizeString,
  sanitizeObject,
  detectSQLInjection,
  detectXSS,
  commonSchemas,
  createPaginationSchema,
  initializeValidation,
};
