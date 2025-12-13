/**
 * SpacedRepetitionService
 *
 * Implements the SM-2 (SuperMemo 2) algorithm for optimal vocabulary retention.
 * Tracks user progress per term and schedules reviews at increasing intervals.
 *
 * SM-2 Algorithm:
 * - Quality: 0-5 (0-2 = incorrect, 3-5 = correct with varying ease)
 * - EF (Ease Factor): starts at 2.5, minimum 1.3
 * - Interval: days until next review
 * - Repetitions: consecutive correct answers
 */

import { pool } from '../database/connection';
import { error as logError, info } from '../utils/logger';

export interface ReviewResult {
  userId: string;
  termId: string;
  quality: number; // 0-5: 0=complete failure, 5=perfect recall
  responseTimeMs?: number;
}

export interface TermProgress {
  id: string;
  termId: string;
  spanishTerm: string;
  englishTerm: string;
  imageUrl?: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
  masteryLevel: number;
  timesCorrect: number;
  timesIncorrect: number;
}

export interface ReviewSchedule {
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: Date;
  masteryDelta: number;
}

class SpacedRepetitionService {
  /**
   * SM-2 algorithm implementation
   * Returns new interval and ease factor based on response quality
   */
  calculateNextReview(
    quality: number,
    currentInterval: number,
    currentEaseFactor: number,
    repetitions: number
  ): ReviewSchedule {
    // Clamp quality to 0-5
    const q = Math.max(0, Math.min(5, quality));

    let newInterval: number;
    let newEaseFactor: number;
    let newRepetitions: number;
    let masteryDelta: number;

    if (q < 3) {
      // Incorrect - reset to beginning
      newRepetitions = 0;
      newInterval = 1;
      newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
      masteryDelta = -10;
    } else {
      // Correct - calculate new interval
      newRepetitions = repetitions + 1;

      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentInterval * currentEaseFactor);
      }

      // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
      const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      newEaseFactor = Math.max(1.3, currentEaseFactor + efDelta);

      // Mastery increases with quality
      masteryDelta = (q - 2) * 5; // +5 for q=3, +10 for q=4, +15 for q=5
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      newInterval,
      newEaseFactor,
      nextReviewDate,
      masteryDelta
    };
  }

  /**
   * Record a review result and update user progress
   */
  async recordReview(result: ReviewResult): Promise<TermProgress | null> {
    const { userId, termId, quality } = result;

    try {
      // Get current progress or create new
      let progress = await this.getTermProgress(userId, termId);

      if (!progress) {
        // First time seeing this term
        await pool.query(
          `INSERT INTO user_term_progress (user_id, term_id, first_seen_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, term_id) DO NOTHING`,
          [userId, termId]
        );
        progress = await this.getTermProgress(userId, termId);
      }

      if (!progress) {
        throw new Error('Failed to create progress record');
      }

      // Calculate new schedule
      const schedule = this.calculateNextReview(
        quality,
        progress.intervalDays,
        progress.easeFactor,
        progress.repetitions
      );

      // Update progress
      const isCorrect = quality >= 3;
      const newMastery = Math.max(0, Math.min(100, progress.masteryLevel + schedule.masteryDelta));

      await pool.query(
        `UPDATE user_term_progress
         SET repetitions = CASE WHEN $3 < 3 THEN 0 ELSE repetitions + 1 END,
             ease_factor = $4,
             interval_days = $5,
             next_review_at = $6,
             last_reviewed_at = CURRENT_TIMESTAMP,
             times_correct = times_correct + $7,
             times_incorrect = times_incorrect + $8,
             mastery_level = $9,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND term_id = $2`,
        [
          userId,
          termId,
          quality,
          schedule.newEaseFactor,
          schedule.newInterval,
          schedule.nextReviewDate,
          isCorrect ? 1 : 0,
          isCorrect ? 0 : 1,
          newMastery
        ]
      );

      info('Review recorded', { userId, termId, quality, newInterval: schedule.newInterval });

      return this.getTermProgress(userId, termId);
    } catch (err) {
      logError('Error recording review', err as Error);
      return null;
    }
  }

  /**
   * Get terms due for review
   */
  async getDueTerms(userId: string, limit: number = 20): Promise<TermProgress[]> {
    try {
      const result = await pool.query(
        `SELECT
           utp.id,
           utp.term_id as "termId",
           a.spanish_term as "spanishTerm",
           a.english_term as "englishTerm",
           i.url as "imageUrl",
           utp.repetitions,
           utp.ease_factor as "easeFactor",
           utp.interval_days as "intervalDays",
           utp.next_review_at as "nextReviewAt",
           utp.last_reviewed_at as "lastReviewedAt",
           utp.mastery_level as "masteryLevel",
           utp.times_correct as "timesCorrect",
           utp.times_incorrect as "timesIncorrect"
         FROM user_term_progress utp
         JOIN annotations a ON utp.term_id = a.id
         JOIN images i ON a.image_id = i.id
         WHERE utp.user_id = $1
           AND utp.next_review_at <= CURRENT_TIMESTAMP
         ORDER BY utp.next_review_at ASC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (err) {
      logError('Error getting due terms', err as Error);
      return [];
    }
  }

  /**
   * Get user's progress for a specific term
   */
  async getTermProgress(userId: string, termId: string): Promise<TermProgress | null> {
    try {
      const result = await pool.query(
        `SELECT
           utp.id,
           utp.term_id as "termId",
           a.spanish_term as "spanishTerm",
           a.english_term as "englishTerm",
           i.url as "imageUrl",
           utp.repetitions,
           utp.ease_factor as "easeFactor",
           utp.interval_days as "intervalDays",
           utp.next_review_at as "nextReviewAt",
           utp.last_reviewed_at as "lastReviewedAt",
           utp.mastery_level as "masteryLevel",
           utp.times_correct as "timesCorrect",
           utp.times_incorrect as "timesIncorrect"
         FROM user_term_progress utp
         JOIN annotations a ON utp.term_id = a.id
         JOIN images i ON a.image_id = i.id
         WHERE utp.user_id = $1 AND utp.term_id = $2`,
        [userId, termId]
      );
      return result.rows[0] || null;
    } catch (err) {
      logError('Error getting term progress', err as Error);
      return null;
    }
  }

  /**
   * Get user's overall progress statistics
   */
  async getUserStats(userId: string): Promise<{
    totalTerms: number;
    mastered: number;
    learning: number;
    dueForReview: number;
    averageMastery: number;
    streak: number;
  }> {
    try {
      const result = await pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered,
           COUNT(*) FILTER (WHERE mastery_level > 0 AND mastery_level < 80) as learning,
           COUNT(*) FILTER (WHERE next_review_at <= CURRENT_TIMESTAMP) as due,
           COALESCE(AVG(mastery_level), 0) as avg_mastery
         FROM user_term_progress
         WHERE user_id = $1`,
        [userId]
      );

      const stats = result.rows[0];

      // Calculate streak (consecutive days with reviews)
      const streakResult = await pool.query(
        `WITH daily_reviews AS (
           SELECT DATE(last_reviewed_at) as review_date
           FROM user_term_progress
           WHERE user_id = $1 AND last_reviewed_at IS NOT NULL
           GROUP BY DATE(last_reviewed_at)
           ORDER BY review_date DESC
         )
         SELECT COUNT(*) as streak
         FROM (
           SELECT review_date,
                  review_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY review_date DESC) as grp
           FROM daily_reviews
         ) t
         WHERE grp = (SELECT MIN(grp) FROM (
           SELECT review_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY review_date DESC) as grp
           FROM daily_reviews
         ) t2)`,
        [userId]
      );

      return {
        totalTerms: parseInt(stats.total),
        mastered: parseInt(stats.mastered),
        learning: parseInt(stats.learning),
        dueForReview: parseInt(stats.due),
        averageMastery: parseFloat(stats.avg_mastery),
        streak: parseInt(streakResult.rows[0]?.streak || 0)
      };
    } catch (err) {
      logError('Error getting user stats', err as Error);
      return {
        totalTerms: 0,
        mastered: 0,
        learning: 0,
        dueForReview: 0,
        averageMastery: 0,
        streak: 0
      };
    }
  }

  /**
   * Mark term as discovered (first exposure)
   */
  async markTermDiscovered(userId: string, termId: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO user_term_progress (user_id, term_id, next_review_at, first_seen_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, term_id) DO NOTHING`,
        [userId, termId]
      );
    } catch (err) {
      logError('Error marking term discovered', err as Error);
    }
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
export default spacedRepetitionService;
