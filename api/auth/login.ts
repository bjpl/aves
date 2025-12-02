import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

// PATTERN: Stateless Authentication Service
// WHY: No session management needed in serverless
// CONCEPT: JWT-based authentication for distributed systems

// SECURITY: JWT_SECRET is required - no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Cannot start without secure secret.');
}
const DATABASE_URL = process.env.DATABASE_URL;

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { emailOrUsername, password } = validatedData;

    // Find user
    const findUserQuery = `
      SELECT
        u.id,
        u.email,
        u.username,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.is_active,
        u.last_login,
        up.skill_level,
        up.preferred_language,
        up.total_points,
        up.streak_days
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.email = $1 OR u.username = $1
    `;

    const userResult = await pool.query(findUserQuery, [emailOrUsername]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is disabled. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update last login
    const updateLastLoginQuery = `
      UPDATE users
      SET last_login = NOW()
      WHERE id = $1
    `;
    await pool.query(updateLastLoginQuery, [user.id]);

    // Generate JWT token with more claims
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        skillLevel: user.skill_level,
        preferredLanguage: user.preferred_language,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Generate refresh token for long-term auth
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        skillLevel: user.skill_level,
        preferredLanguage: user.preferred_language,
        totalPoints: user.total_points,
        streakDays: user.streak_days,
        lastLogin: user.last_login,
      },
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}