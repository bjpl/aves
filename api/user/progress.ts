import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

// PATTERN: Learning Progress Tracking
// WHY: Gamification and user engagement
// CONCEPT: Track user learning journey

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// Progress tracking schemas
const trackProgressSchema = z.object({
  lessonId: z.number().positive(),
  birdId: z.number().positive().optional(),
  progressPercentage: z.number().min(0).max(100),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).optional(), // in seconds
  quizAnswers: z.array(z.object({
    questionId: z.number(),
    answer: z.any(),
    correct: z.boolean(),
    points: z.number().optional(),
  })).optional(),
});

const achievementSchema = z.object({
  type: z.enum(['lesson_complete', 'bird_identified', 'streak', 'quiz_perfect', 'milestone']),
  data: z.any(),
});

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const decoded = await verifyToken(req.headers.authorization);
    const userId = decoded.userId;

    if (req.method === 'GET') {
      // Get user's learning progress
      const { lessonId, limit = 20, offset = 0 } = req.query;

      let query: string;
      let params: any[];

      if (lessonId) {
        // Get progress for specific lesson
        query = `
          SELECT
            up.*,
            l.title as lesson_title,
            l.difficulty,
            l.category
          FROM user_progress up
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.user_id = $1 AND up.lesson_id = $2
          ORDER BY up.updated_at DESC
          LIMIT 1
        `;
        params = [userId, lessonId];
      } else {
        // Get all progress with pagination
        query = `
          SELECT
            up.*,
            l.title as lesson_title,
            l.difficulty,
            l.category,
            b.spanish_name as bird_name
          FROM user_progress up
          LEFT JOIN lessons l ON up.lesson_id = l.id
          LEFT JOIN birds b ON up.bird_id = b.id
          WHERE up.user_id = $1
          ORDER BY up.updated_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [userId, limit, offset];
      }

      const result = await pool.query(query, params);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_progress
        WHERE user_id = $1
      `;
      const countResult = await pool.query(countQuery, [userId]);

      return res.status(200).json({
        success: true,
        progress: result.rows.map(row => ({
          id: row.id,
          lessonId: row.lesson_id,
          lessonTitle: row.lesson_title,
          birdId: row.bird_id,
          birdName: row.bird_name,
          progressPercentage: row.progress_percentage,
          score: row.score,
          timeSpent: row.time_spent,
          quizAnswers: row.quiz_answers,
          difficulty: row.difficulty,
          category: row.category,
          completedAt: row.completed_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });

    } else if (req.method === 'POST') {
      // Track new progress
      const validatedData = trackProgressSchema.parse(req.body);

      // Check if progress already exists
      const existingQuery = `
        SELECT id, progress_percentage, score
        FROM user_progress
        WHERE user_id = $1 AND lesson_id = $2
      `;
      const existing = await pool.query(existingQuery, [userId, validatedData.lessonId]);

      let progressId: number;
      let pointsEarned = 0;

      if (existing.rows.length > 0) {
        // Update existing progress
        const updateQuery = `
          UPDATE user_progress
          SET
            progress_percentage = GREATEST(progress_percentage, $1),
            score = GREATEST(COALESCE(score, 0), COALESCE($2, 0)),
            time_spent = COALESCE(time_spent, 0) + COALESCE($3, 0),
            quiz_answers = COALESCE($4, quiz_answers),
            completed_at = CASE
              WHEN $1 >= 100 AND completed_at IS NULL THEN NOW()
              ELSE completed_at
            END,
            updated_at = NOW()
          WHERE user_id = $5 AND lesson_id = $6
          RETURNING id, progress_percentage
        `;

        const updateResult = await pool.query(updateQuery, [
          validatedData.progressPercentage,
          validatedData.score,
          validatedData.timeSpent,
          JSON.stringify(validatedData.quizAnswers),
          userId,
          validatedData.lessonId,
        ]);

        progressId = updateResult.rows[0].id;

        // Calculate points earned (only for improvement)
        if (validatedData.score && validatedData.score > (existing.rows[0].score || 0)) {
          pointsEarned = Math.floor((validatedData.score - (existing.rows[0].score || 0)) / 10);
        }
      } else {
        // Insert new progress
        const insertQuery = `
          INSERT INTO user_progress (
            user_id,
            lesson_id,
            bird_id,
            progress_percentage,
            score,
            time_spent,
            quiz_answers,
            completed_at,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id
        `;

        const insertResult = await pool.query(insertQuery, [
          userId,
          validatedData.lessonId,
          validatedData.birdId || null,
          validatedData.progressPercentage,
          validatedData.score || null,
          validatedData.timeSpent || 0,
          JSON.stringify(validatedData.quizAnswers) || null,
          validatedData.progressPercentage >= 100 ? 'NOW()' : null,
        ]);

        progressId = insertResult.rows[0].id;

        // Calculate points for new completion
        if (validatedData.score) {
          pointsEarned = Math.floor(validatedData.score / 10);
        }
      }

      // Update user profile stats
      if (pointsEarned > 0 || validatedData.progressPercentage >= 100) {
        const updateProfileQuery = `
          UPDATE user_profiles
          SET
            total_points = COALESCE(total_points, 0) + $1,
            updated_at = NOW()
          WHERE user_id = $2
        `;
        await pool.query(updateProfileQuery, [pointsEarned, userId]);

        // Check for streak update
        const streakQuery = `
          UPDATE user_profiles
          SET
            streak_days = CASE
              WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
              WHEN last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
              ELSE streak_days
            END,
            last_activity_date = CURRENT_DATE
          WHERE user_id = $1
          RETURNING streak_days
        `;
        const streakResult = await pool.query(streakQuery, [userId]);

        // Check for achievements
        const achievements = [];

        // First lesson completion
        if (validatedData.progressPercentage >= 100) {
          const completionCountQuery = `
            SELECT COUNT(*) as count
            FROM user_progress
            WHERE user_id = $1 AND completed_at IS NOT NULL
          `;
          const completionCount = await pool.query(completionCountQuery, [userId]);

          if (completionCount.rows[0].count === 1) {
            achievements.push({
              type: 'first_lesson',
              title: 'First Flight',
              description: 'Completed your first lesson!',
            });
          }

          // Milestone achievements
          const count = parseInt(completionCount.rows[0].count);
          if (count === 10) {
            achievements.push({
              type: 'milestone',
              title: 'Rising Birder',
              description: 'Completed 10 lessons!',
            });
          } else if (count === 25) {
            achievements.push({
              type: 'milestone',
              title: 'Expert Birder',
              description: 'Completed 25 lessons!',
            });
          }
        }

        // Perfect score achievement
        if (validatedData.score === 100) {
          achievements.push({
            type: 'perfect_score',
            title: 'Perfect!',
            description: 'Achieved a perfect score on a quiz!',
          });
        }

        // Streak achievements
        const streakDays = streakResult.rows[0]?.streak_days || 0;
        if (streakDays === 7) {
          achievements.push({
            type: 'streak',
            title: 'Week Warrior',
            description: '7-day learning streak!',
          });
        } else if (streakDays === 30) {
          achievements.push({
            type: 'streak',
            title: 'Monthly Master',
            description: '30-day learning streak!',
          });
        }

        // Store achievements
        if (achievements.length > 0) {
          const achievementQuery = `
            UPDATE user_profiles
            SET
              achievements = COALESCE(achievements, '[]'::jsonb) || $1::jsonb,
              badges = COALESCE(badges, '[]'::jsonb) || $2::jsonb
            WHERE user_id = $3
          `;
          await pool.query(achievementQuery, [
            JSON.stringify(achievements),
            JSON.stringify(achievements.map(a => a.type)),
            userId,
          ]);
        }

        return res.status(200).json({
          success: true,
          progressId,
          pointsEarned,
          achievements,
          streak: streakDays,
        });
      }

      return res.status(200).json({
        success: true,
        progressId,
        pointsEarned: 0,
        achievements: [],
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Progress tracking error:', error);

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