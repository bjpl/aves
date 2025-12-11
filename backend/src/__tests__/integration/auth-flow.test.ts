/**
 * Integration Tests: Authentication Flow
 * Tests the complete user authentication workflow including registration,
 * login, token verification, and protected route access
 */

import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth';
import {
  testPool,
  TEST_USERS,
  createTestUser,
  verifyTokenStructure,
} from './setup';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', authRouter);

// NOTE: Integration tests require a real database connection.
// Skip when running in CI/local environments without database.
// Set TEST_DB_HOST environment variable to run these tests.
const shouldRunIntegrationTests = process.env.TEST_DB_HOST !== undefined;

(shouldRunIntegrationTests ? describe : describe.skip)('Integration: Authentication Flow', () => {
  describe('Complete User Registration Flow', () => {
    it('should successfully register a new user and return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(TEST_USERS.regularUser)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(TEST_USERS.regularUser.email.toLowerCase());
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Verify token format
      expect(verifyTokenStructure(response.body.token)).toBe(true);

      // Verify user was created in database
      const dbResult = await testPool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [TEST_USERS.regularUser.email.toLowerCase()]
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].id).toBe(response.body.user.id);
    });

    it('should prevent duplicate user registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(TEST_USERS.regularUser)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(TEST_USERS.regularUser)
        .expect(409);

      expect(response.body.error).toContain('already registered');

      // Verify only one user exists in database
      const dbResult = await testPool.query(
        'SELECT COUNT(*) as count FROM users WHERE email = $1',
        [TEST_USERS.regularUser.email.toLowerCase()]
      );
      expect(parseInt(dbResult.rows[0].count)).toBe(1);
    });

    it('should enforce password strength requirements', async () => {
      const weakPasswords = [
        { password: 'short', reason: 'too short' },
        { password: 'nouppercase123', reason: 'no uppercase' },
        { password: 'NOLOWERCASE123', reason: 'no lowercase' },
        { password: 'NoNumbers', reason: 'no numbers' },
      ];

      for (const testCase of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password: testCase.password,
          })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body).toHaveProperty('details');
      }

      // Verify no users were created
      const dbResult = await testPool.query('SELECT COUNT(*) as count FROM users');
      expect(parseInt(dbResult.rows[0].count)).toBe(0);
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await createTestUser(TEST_USERS.regularUser);
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(TEST_USERS.regularUser)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(TEST_USERS.regularUser.email.toLowerCase());
      expect(verifyTokenStructure(response.body.token)).toBe(true);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.regularUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.regularUser.email.toUpperCase(),
          password: TEST_USERS.regularUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(TEST_USERS.regularUser.email.toLowerCase());
    });
  });

  describe('Token Verification Flow', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await createTestUser(TEST_USERS.regularUser);
      validToken = user.token;
      userId = user.id;
    });

    it('should verify valid JWT token and return user data', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe(TEST_USERS.regularUser.email.toLowerCase());
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Complete Registration-Login-Verify Flow', () => {
    it('should complete full authentication cycle successfully', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(TEST_USERS.regularUser)
        .expect(201);

      const registrationToken = registerResponse.body.token;
      const registeredUserId = registerResponse.body.user.id;

      // Step 2: Verify token from registration
      const verifyRegisterResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(200);

      expect(verifyRegisterResponse.body.user.id).toBe(registeredUserId);

      // Step 3: Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(TEST_USERS.regularUser)
        .expect(200);

      const loginToken = loginResponse.body.token;

      // Step 4: Verify token from login
      const verifyLoginResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(verifyLoginResponse.body.user.id).toBe(registeredUserId);

      // Verify both tokens are different but valid
      expect(registrationToken).not.toBe(loginToken);
      expect(verifyTokenStructure(registrationToken)).toBe(true);
      expect(verifyTokenStructure(loginToken)).toBe(true);
    });

    it('should maintain session integrity across multiple requests', async () => {
      // Register and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(TEST_USERS.regularUser)
        .expect(201);

      const token = registerResponse.body.token;
      const userId = registerResponse.body.user.id;

      // Make multiple verify requests with same token
      for (let i = 0; i < 3; i++) {
        const verifyResponse = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(verifyResponse.body.user.id).toBe(userId);
      }

      // Verify user still exists with correct data
      const dbResult = await testPool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].email).toBe(TEST_USERS.regularUser.email.toLowerCase());
    });
  });

  describe('Concurrent User Operations', () => {
    it('should handle multiple simultaneous user registrations', async () => {
      const users = [
        { email: 'user1@example.com', password: 'Password123' },
        { email: 'user2@example.com', password: 'Password123' },
        { email: 'user3@example.com', password: 'Password123' },
      ];

      // Register all users concurrently
      const responses = await Promise.all(
        users.map((user) =>
          request(app)
            .post('/api/auth/register')
            .send(user)
        )
      );

      // Verify all succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
      });

      // Verify all users exist in database
      const dbResult = await testPool.query('SELECT COUNT(*) as count FROM users');
      expect(parseInt(dbResult.rows[0].count)).toBe(3);
    });

    it('should handle concurrent login attempts for same user', async () => {
      // Create user
      await createTestUser(TEST_USERS.regularUser);

      // Attempt multiple concurrent logins
      const loginAttempts = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(TEST_USERS.regularUser)
      );

      const responses = await Promise.all(loginAttempts);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });

      // All tokens should be valid but different
      const tokens = responses.map((r) => r.body.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });
});
