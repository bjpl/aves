/**
 * Authentication Routes
 * Handles user registration, login, and token verification
 */

import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { CreateUserInput, LoginInput, AuthResponse } from '../models/User';
import { error as logError } from '../utils/logger';

const router = Router();

// Auth-specific rate limiter: 5 attempts per 15 minutes per IP
// Prevents brute force attacks on authentication endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use IP address for rate limiting (works with trust proxy setting)
  keyGenerator: (req) => {
    // Get real IP from proxy headers (Railway, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    }
    return req.ip || 'unknown';
  },
  // Skip successful authentications from counting against the limit
  skipSuccessfulRequests: false, // Count all attempts
  skipFailedRequests: false // Count failed attempts
});

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const SALT_ROUNDS = 10;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user account
 *     description: Creates a new user account with email and password. Password must meet complexity requirements.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, and number
 *                 example: SecurePass123
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Email already registered
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
      return;
    }

    const { email, password } = validationResult.data as CreateUserInput;

    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUser = await pool.query(existingUserQuery, [email.toLowerCase()]);

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const insertQuery = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `;
    const result = await pool.query(insertQuery, [email.toLowerCase(), passwordHash]);
    const user = result.rows[0];

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Return response
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    };

    res.status(201).json(response);
  } catch (err) {
    logError('Registration error', err as Error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate with email and password to receive a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               user:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 email: user@example.com
 *                 created_at: 2025-01-15T10:30:00Z
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
      return;
    }

    const { email, password } = validationResult.data as LoginInput;

    // Find user
    const userQuery = `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(userQuery, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Return response
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    };

    res.status(200).json(response);
  } catch (err) {
    logError('Login error', err as Error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @openapi
 * /api/auth/verify:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify JWT token
 *     description: Verify the JWT token and return current user session information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid, user session returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             example:
 *               user:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 email: user@example.com
 *                 created_at: 2025-01-15T10:30:00Z
 *       401:
 *         description: Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/auth/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Fetch user details
    const userQuery = `
      SELECT id, email, created_at
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(userQuery, [req.user.userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    logError('Verification error', err as Error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
