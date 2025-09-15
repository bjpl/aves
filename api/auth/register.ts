import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// PATTERN: Edge Function with Input Validation
// WHY: Serverless architecture for scalability
// CONCEPT: Stateless authentication endpoints

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;

// Input validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  username: z.string().min(3).max(30),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

// PATTERN: Database Connection Pooling
// WHY: Serverless functions need efficient DB connections
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1, // Serverless functions should use minimal connections
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers for browser requests
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
    const validatedData = registerSchema.parse(req.body);
    const { email, password, username, firstName, lastName } = validatedData;

    // Check if user already exists
    const existingUserQuery = `
      SELECT id FROM users
      WHERE email = $1 OR username = $2
    `;
    const existingUser = await pool.query(existingUserQuery, [email, username]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const createUserQuery = `
      INSERT INTO users (
        email,
        username,
        password_hash,
        first_name,
        last_name,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, username, first_name, last_name, created_at
    `;

    const newUser = await pool.query(createUserQuery, [
      email,
      username,
      hashedPassword,
      firstName || null,
      lastName || null,
    ]);

    const user = newUser.rows[0];

    // Create initial user profile
    const createProfileQuery = `
      INSERT INTO user_profiles (
        user_id,
        skill_level,
        preferred_language,
        learning_goals,
        created_at,
        updated_at
      )
      VALUES ($1, 'beginner', 'es', '{}', NOW(), NOW())
    `;

    await pool.query(createProfileQuery, [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);

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