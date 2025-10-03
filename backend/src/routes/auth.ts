/**
 * Authentication Routes
 * Handles user registration, login, and token verification
 */

import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { CreateUserInput, LoginInput, AuthResponse } from '../models/User';
import { error as logError } from '../utils/logger';

const router = Router();

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
 * POST /api/auth/register
 * Register a new user
 */
router.post('/auth/register', async (req: Request, res: Response) => {
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
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/auth/login', async (req: Request, res: Response) => {
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
 * GET /api/auth/verify
 * Verify JWT token and return user session
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
