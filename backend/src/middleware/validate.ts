import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { sanitizeObject } from '../validation/sanitize';
import { error as logError } from '../utils/logger';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 */

export type ValidationSource = 'body' | 'query' | 'params';

interface ValidationOptions {
  source?: ValidationSource;
  sanitize?: boolean;
  stripUnknown?: boolean;
}

/**
 * Create validation middleware for a Zod schema
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 */
export function validate(
  schema: ZodSchema,
  options: ValidationOptions = {}
) {
  const {
    source = 'body',
    sanitize = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get data from the specified source
      let data = req[source];

      // Sanitize input if enabled
      if (sanitize && typeof data === 'object' && data !== null) {
        data = sanitizeObject(data);
      }

      // Parse and validate with Zod
      // Note: stripUnknown is not a standard Zod option, we'll filter manually if needed
      const validated = await schema.parseAsync(data);

      // Replace request data with validated data
      req[source] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const formattedErrors = formatZodErrors(error);

        res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
          message: getFirstErrorMessage(error)
        });
      } else {
        // Unexpected error during validation
        logError('Validation middleware error', error as Error);
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema, options?: Omit<ValidationOptions, 'source'>) {
  return validate(schema, { ...options, source: 'body' });
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema, options?: Omit<ValidationOptions, 'source'>) {
  return validate(schema, { ...options, source: 'query' });
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema, options?: Omit<ValidationOptions, 'source'>) {
  return validate(schema, { ...options, source: 'params' });
}

/**
 * Format Zod errors into a more readable structure
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';

    if (!formatted[path]) {
      formatted[path] = [];
    }

    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Get the first error message from a ZodError
 */
function getFirstErrorMessage(error: ZodError): string {
  if (error.issues.length > 0) {
    const firstIssue = error.issues[0];
    const path = firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
    return `${path}${firstIssue.message}`;
  }
  return 'Validation failed';
}

/**
 * Combine multiple validation middlewares
 * Useful when you need to validate multiple sources (e.g., body and query)
 */
export function validateMultiple(
  validations: Array<{
    schema: ZodSchema;
    options?: ValidationOptions;
  }>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const { schema, options } of validations) {
        const middleware = validate(schema, options);
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      next();
    } catch (error) {
      // Error already handled by validate middleware
      // This is just to prevent unhandled promise rejection
    }
  };
}

/**
 * Optional validation - validates if data exists, but allows undefined
 */
export function validateOptional(
  schema: ZodSchema,
  options: ValidationOptions = {}
) {
  const { source = 'body' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];

    // If no data, skip validation
    if (data === undefined || data === null || (typeof data === 'object' && Object.keys(data).length === 0)) {
      next();
      return;
    }

    // Otherwise, apply normal validation
    return validate(schema, options)(req, res, next);
  };
}

/**
 * Create a custom validation middleware with a validator function
 */
export function customValidate(
  validator: (data: unknown) => { valid: boolean; error?: string }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator(req.body);

    if (!result.valid) {
      res.status(400).json({
        error: 'Validation failed',
        message: result.error || 'Invalid input'
      });
      return;
    }

    next();
  };
}
