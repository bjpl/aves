/**
 * Integration tests for validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams } from '../middleware/validate';

// Mock Express objects
const createMockRequest = (data: any, source: 'body' | 'query' | 'params' = 'body'): Partial<Request> => ({
  [source]: data
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Validation Middleware', () => {
  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().int().positive()
    });

    it('should pass valid data through', async () => {
      const req = createMockRequest({ name: 'John', age: 30 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid data', async () => {
      const req = createMockRequest({ name: 'Jo', age: -5 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Object)
        })
      );
    });

    it('should sanitize input by default', async () => {
      const req = createMockRequest({ name: '  John  ', age: 30 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).body.name).toBe('John'); // Trimmed
    });

    it('should strip unknown fields by default', async () => {
      const req = createMockRequest({ name: 'John', age: 30, unknown: 'field' });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).body).not.toHaveProperty('unknown');
    });
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      email: z.string().email()
    });

    it('should validate request body', async () => {
      const req = createMockRequest({ email: 'test@example.com' }, 'body');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateBody(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      const req = createMockRequest({ email: 'not-an-email' }, 'body');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateBody(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    const testSchema = z.object({
      page: z.string().transform(Number).pipe(z.number().int().positive())
    });

    it('should validate query parameters', async () => {
      const req = createMockRequest({ page: '1' }, 'query');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateQuery(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).query.page).toBe(1); // Transformed
    });

    it('should reject invalid query parameters', async () => {
      const req = createMockRequest({ page: 'abc' }, 'query');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateQuery(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateParams', () => {
    const testSchema = z.object({
      id: z.string().uuid()
    });

    it('should validate route parameters', async () => {
      const req = createMockRequest({ id: '123e4567-e89b-12d3-a456-426614174000' }, 'params');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateParams(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid UUID', async () => {
      const req = createMockRequest({ id: 'not-a-uuid' }, 'params');
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateParams(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error message formatting', () => {
    it('should provide clear error messages', async () => {
      const testSchema = z.object({
        password: z.string().min(8, 'Password must be at least 8 characters')
      });

      const req = createMockRequest({ password: 'short' });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: expect.stringContaining('Password must be at least 8 characters')
        })
      );
    });

    it('should include field paths in error details', async () => {
      const testSchema = z.object({
        user: z.object({
          name: z.string().min(3)
        })
      });

      const req = createMockRequest({ user: { name: 'ab' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            'user.name': expect.any(Array)
          })
        })
      );
    });
  });

  describe('Complex validation scenarios', () => {
    it('should handle nested objects', async () => {
      const testSchema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
            zip: z.string()
          })
        })
      });

      const validData = {
        user: {
          name: 'John',
          address: {
            city: 'New York',
            zip: '10001'
          }
        }
      };

      const req = createMockRequest(validData);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays', async () => {
      const testSchema = z.object({
        tags: z.array(z.string().min(1))
      });

      const validData = {
        tags: ['tag1', 'tag2', 'tag3']
      };

      const req = createMockRequest(validData);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      const testSchema = z.object({
        required: z.string(),
        optional: z.string().optional()
      });

      const validData = {
        required: 'value'
        // optional field omitted
      };

      const req = createMockRequest(validData);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle transformations', async () => {
      const testSchema = z.object({
        price: z.string().transform(val => parseFloat(val))
      });

      const req = createMockRequest({ price: '19.99' });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).body.price).toBe(19.99);
    });

    it('should handle refinements', async () => {
      const testSchema = z.object({
        password: z.string(),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: 'Passwords must match'
      });

      const invalidData = {
        password: 'password123',
        confirmPassword: 'different'
      };

      const req = createMockRequest(invalidData);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validate(testSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Passwords must match')
        })
      );
    });
  });
});
