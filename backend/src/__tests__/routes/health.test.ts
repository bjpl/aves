import request from 'supertest';
import express from 'express';
import healthRouter from '../../routes/health';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/health', healthRouter);

describe('Health API Routes', () => {
  // Store original env vars to restore after tests
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env vars before each test for isolation
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('GET /api/health/', () => {
    it('should return 200 status code', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect('Content-Type', /json/);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should contain status field with value "ok"', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should contain timestamp field (ISO date string)', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toBeTruthy();

      // Verify it's a valid ISO date string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should contain services object', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(typeof response.body.services).toBe('object');
    });

    it('should contain environment field', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body).toHaveProperty('environment');
      expect(typeof response.body.environment).toBe('string');
    });
  });

  describe('Services Object', () => {
    beforeEach(() => {
      // Clear all env vars before each test
      delete process.env.DATABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should contain database boolean', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services).toHaveProperty('database');
      expect(typeof response.body.services.database).toBe('boolean');
    });

    it('should contain supabase boolean', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services).toHaveProperty('supabase');
      expect(typeof response.body.services.supabase).toBe('boolean');
    });

    it('should contain anthropic boolean', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services).toHaveProperty('anthropic');
      expect(typeof response.body.services.anthropic).toBe('boolean');
    });

    it('should contain anthropicKeyLength number', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services).toHaveProperty('anthropicKeyLength');
      expect(typeof response.body.services.anthropicKeyLength).toBe('number');
    });

    it('should contain anthropicKeyPreview string', async () => {
      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services).toHaveProperty('anthropicKeyPreview');
      expect(typeof response.body.services.anthropicKeyPreview).toBe('string');
    });

    it('should return false for database when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.database).toBe(false);
    });

    it('should return true for database when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.database).toBe(true);
    });

    it('should return false for supabase when SUPABASE_URL is not set', async () => {
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.supabase).toBe(false);
    });

    it('should return false for supabase when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.supabase).toBe(false);
    });

    it('should return true for supabase when both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.supabase).toBe(true);
    });

    it('should return false for anthropic when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.anthropic).toBe(false);
    });

    it('should return true for anthropic when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-1234567890abcdef';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.anthropic).toBe(true);
    });

    it('should return 0 for anthropicKeyLength when key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.anthropicKeyLength).toBe(0);
    });

    it('should return correct length for anthropicKeyLength when key is set', async () => {
      const testKey = 'sk-ant-test-key-1234567890abcdef';
      process.env.ANTHROPIC_API_KEY = testKey;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.anthropicKeyLength).toBe(testKey.length);
    });

    it('should return "NOT_SET" for anthropicKeyPreview when key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.services.anthropicKeyPreview).toBe('NOT_SET');
    });

    it('should return correct preview for anthropicKeyPreview when key is set', async () => {
      const testKey = 'sk-ant-test-key-1234567890abcdef';
      process.env.ANTHROPIC_API_KEY = testKey;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      const expectedPreview = `${testKey.substring(0, 8)}...${testKey.substring(testKey.length - 4)}`;
      expect(response.body.services.anthropicKeyPreview).toBe(expectedPreview);
      expect(response.body.services.anthropicKeyPreview).toBe('sk-ant-t...cdef');
    });

    it('should handle short API keys correctly in preview', async () => {
      // Test with a key shorter than 12 characters (edge case)
      const shortKey = 'short';
      process.env.ANTHROPIC_API_KEY = shortKey;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      const expectedPreview = `${shortKey.substring(0, 8)}...${shortKey.substring(shortKey.length - 4)}`;
      expect(response.body.services.anthropicKeyPreview).toBe(expectedPreview);
    });
  });

  describe('Environment Field', () => {
    it('should return "development" when NODE_ENV is not set', async () => {
      delete process.env.NODE_ENV;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.environment).toBe('development');
    });

    it('should return correct environment when NODE_ENV is set to production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.environment).toBe('production');
    });

    it('should return correct environment when NODE_ENV is set to test', async () => {
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body.environment).toBe('test');
    });
  });

  describe('Response Timing', () => {
    it('should respond in under 100ms (performance check)', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/health/')
        .expect(200);

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should respond quickly even with multiple requests', async () => {
      const promises = Array(10).fill(null).map(async () => {
        const start = Date.now();
        await request(app)
          .get('/api/health/')
          .expect(200);
        return Date.now() - start;
      });

      const durations = await Promise.all(promises);

      // Use 500ms threshold to account for WSL2/CI environment variability
      durations.forEach(duration => {
        expect(duration).toBeLessThan(500);
      });
    });
  });

  describe('Complete Response Structure', () => {
    it('should return complete health response with all fields', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-1234567890abcdef';
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      // Verify complete structure
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          database: true,
          supabase: true,
          anthropic: true,
          anthropicKeyLength: 32, // 'sk-ant-test-key-1234567890abcdef'.length = 32
          anthropicKeyPreview: 'sk-ant-t...cdef'
        },
        environment: 'test'
      });

      // Verify timestamp is valid ISO date
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should return complete health response with no services configured', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.NODE_ENV;

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          database: false,
          supabase: false,
          anthropic: false,
          anthropicKeyLength: 0,
          anthropicKeyPreview: 'NOT_SET'
        },
        environment: 'development'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string environment variables', async () => {
      process.env.DATABASE_URL = '';
      process.env.SUPABASE_URL = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';
      process.env.ANTHROPIC_API_KEY = '';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      // Empty strings should be falsy
      expect(response.body.services.database).toBe(false);
      expect(response.body.services.supabase).toBe(false);
      expect(response.body.services.anthropic).toBe(false);
      expect(response.body.services.anthropicKeyLength).toBe(0);
      expect(response.body.services.anthropicKeyPreview).toBe('NOT_SET');
    });

    it('should handle whitespace-only environment variables', async () => {
      process.env.DATABASE_URL = '   ';
      process.env.SUPABASE_URL = '   ';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '   ';
      process.env.ANTHROPIC_API_KEY = '   ';

      const response = await request(app)
        .get('/api/health/')
        .expect(200);

      // Whitespace strings should be truthy (as per current implementation)
      expect(response.body.services.database).toBe(true);
      expect(response.body.services.supabase).toBe(true);
      expect(response.body.services.anthropic).toBe(true);
      expect(response.body.services.anthropicKeyLength).toBe(3);
      // Preview format: first 8 chars + '...' + last 4 chars
      // For a 3-char string: '   '.substring(0, 8) = '   ', '   '.substring(-1) = '   '
      expect(response.body.services.anthropicKeyPreview).toBe('   ...   ');
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = Array(50).fill(null).map(() =>
        request(app)
          .get('/api/health/')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('services');
        expect(response.body).toHaveProperty('environment');
      });
    });
  });
});
