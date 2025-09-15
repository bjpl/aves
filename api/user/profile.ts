import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

// PATTERN: RESTful Profile Management
// WHY: User data persistence and customization
// CONCEPT: CRUD operations on user profiles

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// Update profile schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  preferredLanguage: z.enum(['es', 'en', 'ca']).optional(),
  learningGoals: z.object({
    dailyMinutes: z.number().min(5).max(120).optional(),
    weeklyBirds: z.number().min(1).max(20).optional(),
    focusAreas: z.array(z.string()).optional(),
  }).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    darkMode: z.boolean().optional(),
  }).optional(),
});

// Middleware to extract and verify JWT
async function verifyToken(authHeader: string | undefined): Promise<any> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decoded = await verifyToken(req.headers.authorization);
    const userId = decoded.userId;

    if (req.method === 'GET') {
      // Get user profile
      const profileQuery = `
        SELECT
          u.id,
          u.email,
          u.username,
          u.first_name,
          u.last_name,
          u.created_at,
          u.last_login,
          up.skill_level,
          up.preferred_language,
          up.learning_goals,
          up.preferences,
          up.total_points,
          up.streak_days,
          up.badges,
          up.achievements,
          up.updated_at,
          (
            SELECT COUNT(*)
            FROM user_progress
            WHERE user_id = u.id
          ) as completed_lessons,
          (
            SELECT AVG(score)
            FROM user_progress
            WHERE user_id = u.id AND score IS NOT NULL
          ) as average_score
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = $1
      `;

      const result = await pool.query(profileQuery, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = result.rows[0];

      return res.status(200).json({
        success: true,
        profile: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          firstName: profile.first_name,
          lastName: profile.last_name,
          skillLevel: profile.skill_level,
          preferredLanguage: profile.preferred_language,
          learningGoals: profile.learning_goals || {},
          preferences: profile.preferences || {},
          stats: {
            totalPoints: profile.total_points || 0,
            streakDays: profile.streak_days || 0,
            completedLessons: parseInt(profile.completed_lessons) || 0,
            averageScore: parseFloat(profile.average_score) || 0,
            badges: profile.badges || [],
            achievements: profile.achievements || [],
          },
          createdAt: profile.created_at,
          lastLogin: profile.last_login,
          updatedAt: profile.updated_at,
        },
      });

    } else if (req.method === 'PUT') {
      // Update user profile
      const validatedData = updateProfileSchema.parse(req.body);

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Update users table fields
      if (validatedData.firstName !== undefined) {
        updates.push(`first_name = $${paramCount}`);
        values.push(validatedData.firstName);
        paramCount++;
      }

      if (validatedData.lastName !== undefined) {
        updates.push(`last_name = $${paramCount}`);
        values.push(validatedData.lastName);
        paramCount++;
      }

      if (updates.length > 0) {
        const updateUserQuery = `
          UPDATE users
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
        `;
        values.push(userId);
        await pool.query(updateUserQuery, values);
      }

      // Update user_profiles table
      const profileUpdates: string[] = [];
      const profileValues: any[] = [];
      paramCount = 1;

      if (validatedData.skillLevel !== undefined) {
        profileUpdates.push(`skill_level = $${paramCount}`);
        profileValues.push(validatedData.skillLevel);
        paramCount++;
      }

      if (validatedData.preferredLanguage !== undefined) {
        profileUpdates.push(`preferred_language = $${paramCount}`);
        profileValues.push(validatedData.preferredLanguage);
        paramCount++;
      }

      if (validatedData.learningGoals !== undefined) {
        profileUpdates.push(`learning_goals = $${paramCount}`);
        profileValues.push(JSON.stringify(validatedData.learningGoals));
        paramCount++;
      }

      if (validatedData.preferences !== undefined) {
        profileUpdates.push(`preferences = $${paramCount}`);
        profileValues.push(JSON.stringify(validatedData.preferences));
        paramCount++;
      }

      if (profileUpdates.length > 0) {
        const updateProfileQuery = `
          UPDATE user_profiles
          SET ${profileUpdates.join(', ')}, updated_at = NOW()
          WHERE user_id = $${paramCount}
        `;
        profileValues.push(userId);
        await pool.query(updateProfileQuery, profileValues);
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Profile error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}