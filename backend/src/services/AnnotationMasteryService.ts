/**
 * Annotation Mastery Service
 *
 * Manages user progress tracking for individual annotations with spaced repetition.
 * Implements intelligent selection of annotations for targeted practice.
 *
 * @example
 * ```typescript
 * const masteryService = new AnnotationMasteryService(pool);
 *
 * // Update mastery after exercise completion
 * await masteryService.updateMastery('user123', 'annotation-id', true, 3500);
 *
 * // Get weak annotations for practice
 * const weakAnnotations = await masteryService.getWeakAnnotations('user123', 5);
 * ```
 */

import { Pool } from 'pg';
import { Annotation } from '../types/annotation.types';
import * as logger from '../utils/logger';

export interface AnnotationMasteryRecord {
  id: string;
  userId: string;
  annotationId: string;
  exposureCount: number;
  correctCount: number;
  incorrectCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastCorrectAt?: Date;
  nextReviewAt?: Date;
  masteryScore: number; // 0.0 to 1.0
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  avgResponseTimeMs?: number;
  fastestResponseTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationWithMastery extends Annotation {
  masteryData?: AnnotationMasteryRecord;
}

export interface MasteryUpdateParams {
  userId: string;
  annotationId: string;
  correct: boolean;
  responseTimeMs: number;
  sessionId?: string;
}

export interface AnnotationRecommendation {
  annotation: Annotation;
  masteryData?: AnnotationMasteryRecord;
  reason: 'weak' | 'due_for_review' | 'new' | 'reinforcement';
  priority: number; // 1-10, higher = more important
}

export class AnnotationMasteryService {
  constructor(private pool: Pool) {}

  /**
   * Update mastery record after exercise completion
   *
   * Automatically calculates mastery score, confidence level, and next review date
   *
   * @param userId - User identifier
   * @param annotationId - Annotation being practiced
   * @param correct - Whether user answered correctly
   * @param responseTimeMs - Time taken to respond
   * @param sessionId - Optional session identifier
   * @returns Updated mastery record
   */
  async updateMastery(
    userId: string,
    annotationId: string,
    correct: boolean,
    responseTimeMs: number,
    sessionId?: string
  ): Promise<AnnotationMasteryRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Upsert mastery record
      const upsertQuery = `
        INSERT INTO annotation_mastery (
          user_id,
          annotation_id,
          exposure_count,
          correct_count,
          incorrect_count,
          last_seen_at,
          last_correct_at,
          avg_response_time_ms,
          fastest_response_time_ms
        ) VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP, $5, $6, $6)
        ON CONFLICT (user_id, annotation_id)
        DO UPDATE SET
          exposure_count = annotation_mastery.exposure_count + 1,
          correct_count = annotation_mastery.correct_count + $3,
          incorrect_count = annotation_mastery.incorrect_count + $4,
          last_seen_at = CURRENT_TIMESTAMP,
          last_correct_at = CASE WHEN $3 = 1 THEN CURRENT_TIMESTAMP ELSE annotation_mastery.last_correct_at END,
          avg_response_time_ms = CASE
            WHEN annotation_mastery.avg_response_time_ms IS NULL THEN $6
            ELSE (annotation_mastery.avg_response_time_ms * annotation_mastery.exposure_count + $6) / (annotation_mastery.exposure_count + 1)
          END,
          fastest_response_time_ms = CASE
            WHEN annotation_mastery.fastest_response_time_ms IS NULL THEN $6
            WHEN $6 < annotation_mastery.fastest_response_time_ms THEN $6
            ELSE annotation_mastery.fastest_response_time_ms
          END
        RETURNING *
      `;

      const correctValue = correct ? 1 : 0;
      const incorrectValue = correct ? 0 : 1;
      const lastCorrectAt = correct ? new Date() : null;

      const result = await client.query(upsertQuery, [
        userId,
        annotationId,
        correctValue,
        incorrectValue,
        lastCorrectAt,
        responseTimeMs
      ]);

      const masteryRecord = this.mapRowToMasteryRecord(result.rows[0]);

      // Calculate and update next review date
      const nextReviewQuery = `
        UPDATE annotation_mastery
        SET next_review_at = calculate_next_review_date($1, $2, $3)
        WHERE user_id = $4 AND annotation_id = $5
        RETURNING next_review_at
      `;

      const reviewResult = await client.query(nextReviewQuery, [
        masteryRecord.masteryScore,
        masteryRecord.correctCount,
        masteryRecord.lastSeenAt,
        userId,
        annotationId
      ]);

      masteryRecord.nextReviewAt = reviewResult.rows[0]?.next_review_at;

      await client.query('COMMIT');

      logger.info('Updated annotation mastery', {
        userId,
        annotationId,
        correct,
        masteryScore: masteryRecord.masteryScore,
        confidenceLevel: masteryRecord.confidenceLevel
      });

      return masteryRecord;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update annotation mastery', {
        error: error instanceof Error ? error : { error },
        userId,
        annotationId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's weak annotations (mastery score < 0.7)
   *
   * Returns annotations ordered by weakest first (lowest mastery score)
   *
   * @param userId - User identifier
   * @param limit - Maximum number of annotations to return
   * @param annotationType - Optional filter by annotation type
   * @returns Array of annotations with mastery data
   */
  async getWeakAnnotations(
    userId: string,
    limit: number = 10,
    annotationType?: string
  ): Promise<AnnotationWithMastery[]> {
    try {
      let query = `
        SELECT
          a.*,
          am.id as mastery_id,
          am.user_id,
          am.exposure_count,
          am.correct_count,
          am.incorrect_count,
          am.mastery_score,
          am.confidence_level,
          am.last_seen_at,
          am.next_review_at
        FROM annotation_mastery am
        JOIN annotations a ON am.annotation_id = a.id
        WHERE am.user_id = $1
      `;

      const params: (string | number)[] = [userId];

      if (annotationType) {
        query += ` AND a.annotation_type = $2`;
        params.push(annotationType);
      }

      query += ` ORDER BY am.mastery_score ASC, am.last_seen_at ASC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.pool.query(query, params);

      return result.rows.map(row => this.mapRowToAnnotationWithMastery(row));

    } catch (error) {
      logger.error('Failed to get weak annotations', {
        error: error instanceof Error ? error : { error },
        userId
      });
      throw error;
    }
  }

  /**
   * Get annotations due for spaced repetition review
   *
   * Returns annotations where next_review_at <= current time
   *
   * @param userId - User identifier
   * @param limit - Maximum number of annotations to return
   * @returns Array of annotations due for review
   */
  async getAnnotationsDueForReview(
    userId: string,
    limit: number = 10
  ): Promise<AnnotationWithMastery[]> {
    try {
      const query = `
        SELECT
          a.*,
          am.id as mastery_id,
          am.user_id,
          am.exposure_count,
          am.correct_count,
          am.incorrect_count,
          am.mastery_score,
          am.confidence_level,
          am.last_seen_at,
          am.next_review_at,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - am.next_review_at)) / 3600 as hours_overdue
        FROM annotations_due_for_review am
        JOIN annotations a ON am.annotation_id = a.id
        WHERE am.user_id = $1
        ORDER BY am.next_review_at ASC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);

      return result.rows.map(row => this.mapRowToAnnotationWithMastery(row));

    } catch (error) {
      logger.error('Failed to get annotations due for review', {
        error: error instanceof Error ? error : { error },
        userId
      });
      throw error;
    }
  }

  /**
   * Get new annotations that user hasn't seen yet
   *
   * @param userId - User identifier
   * @param limit - Maximum number of annotations to return
   * @param difficultyRange - Optional difficulty filter [min, max]
   * @returns Array of unseen annotations
   */
  async getNewAnnotations(
    userId: string,
    limit: number = 10,
    difficultyRange?: [number, number]
  ): Promise<Annotation[]> {
    try {
      let query = `
        SELECT a.*
        FROM annotations a
        WHERE a.is_visible = true
          AND NOT EXISTS (
            SELECT 1
            FROM annotation_mastery am
            WHERE am.user_id = $1
              AND am.annotation_id = a.id
          )
      `;

      const params: (string | number)[] = [userId];

      if (difficultyRange) {
        query += ` AND a.difficulty_level BETWEEN $2 AND $3`;
        params.push(difficultyRange[0], difficultyRange[1]);
      }

      query += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.pool.query(query, params);

      return result.rows.map(row => this.mapRowToAnnotation(row));

    } catch (error) {
      logger.error('Failed to get new annotations', {
        error: error instanceof Error ? error : { error },
        userId
      });
      throw error;
    }
  }

  /**
   * Get recommended annotations for practice using intelligent selection
   *
   * Combines weak annotations, due-for-review, and new annotations with priority weighting
   *
   * @param userId - User identifier
   * @param count - Number of annotations to recommend
   * @param options - Selection options
   * @returns Array of recommended annotations with reasoning
   */
  async getRecommendedAnnotations(
    userId: string,
    count: number = 5,
    options?: {
      focusType?: string;
      difficultyRange?: [number, number];
      includeNew?: boolean;
    }
  ): Promise<AnnotationRecommendation[]> {
    try {
      const recommendations: AnnotationRecommendation[] = [];

      // 1. Priority: Annotations due for review (40% of recommendations)
      const dueCount = Math.ceil(count * 0.4);
      const dueAnnotations = await this.getAnnotationsDueForReview(userId, dueCount);
      recommendations.push(...dueAnnotations.map(ann => ({
        annotation: ann,
        masteryData: ann.masteryData,
        reason: 'due_for_review' as const,
        priority: 10
      })));

      // 2. Priority: Weak annotations (40% of recommendations)
      const weakCount = Math.ceil(count * 0.4);
      const weakAnnotations = await this.getWeakAnnotations(userId, weakCount, options?.focusType);
      recommendations.push(...weakAnnotations.map(ann => ({
        annotation: ann,
        masteryData: ann.masteryData,
        reason: 'weak' as const,
        priority: 8
      })));

      // 3. Priority: New annotations (20% of recommendations, if enabled)
      if (options?.includeNew !== false) {
        const newCount = Math.ceil(count * 0.2);
        const newAnnotations = await this.getNewAnnotations(userId, newCount, options?.difficultyRange);
        recommendations.push(...newAnnotations.map(ann => ({
          annotation: ann,
          masteryData: undefined,
          reason: 'new' as const,
          priority: 5
        })));
      }

      // Remove duplicates (prefer higher priority)
      const uniqueRecommendations = new Map<string, AnnotationRecommendation>();
      for (const rec of recommendations) {
        const existing = uniqueRecommendations.get(rec.annotation.id);
        if (!existing || rec.priority > existing.priority) {
          uniqueRecommendations.set(rec.annotation.id, rec);
        }
      }

      // Sort by priority and return top N
      const sorted = Array.from(uniqueRecommendations.values())
        .sort((a, b) => b.priority - a.priority)
        .slice(0, count);

      logger.info('Generated annotation recommendations', {
        userId,
        count,
        breakdown: {
          due_for_review: sorted.filter(r => r.reason === 'due_for_review').length,
          weak: sorted.filter(r => r.reason === 'weak').length,
          new: sorted.filter(r => r.reason === 'new').length
        }
      });

      return sorted;

    } catch (error) {
      logger.error('Failed to get recommended annotations', {
        error: error instanceof Error ? error : { error },
        userId
      });
      throw error;
    }
  }

  /**
   * Get mastery score for a specific annotation
   *
   * @param userId - User identifier
   * @param annotationId - Annotation ID
   * @returns Mastery score (0-1) or 0 if not practiced yet
   */
  async getMasteryScore(userId: string, annotationId: string): Promise<number> {
    try {
      const query = `
        SELECT mastery_score
        FROM annotation_mastery
        WHERE user_id = $1 AND annotation_id = $2
      `;

      const result = await this.pool.query(query, [userId, annotationId]);

      return result.rows[0]?.mastery_score || 0.0;

    } catch (error) {
      logger.error('Failed to get mastery score', {
        error: error instanceof Error ? error : { error },
        userId,
        annotationId
      });
      return 0.0;
    }
  }

  /**
   * Get overall user mastery statistics
   *
   * @param userId - User identifier
   * @returns Statistics about user's mastery across all annotations
   */
  async getUserMasteryStats(userId: string): Promise<{
    totalAnnotationsSeen: number;
    averageMasteryScore: number;
    annotationsByConfidence: Record<number, number>;
    weakAnnotationsCount: number;
    masteredAnnotationsCount: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_seen,
          AVG(mastery_score) as avg_mastery,
          COUNT(CASE WHEN confidence_level = 1 THEN 1 END) as level_1,
          COUNT(CASE WHEN confidence_level = 2 THEN 1 END) as level_2,
          COUNT(CASE WHEN confidence_level = 3 THEN 1 END) as level_3,
          COUNT(CASE WHEN confidence_level = 4 THEN 1 END) as level_4,
          COUNT(CASE WHEN confidence_level = 5 THEN 1 END) as level_5,
          COUNT(CASE WHEN mastery_score < 0.7 THEN 1 END) as weak_count,
          COUNT(CASE WHEN mastery_score >= 0.8 THEN 1 END) as mastered_count
        FROM annotation_mastery
        WHERE user_id = $1
      `;

      const result = await this.pool.query(query, [userId]);
      const row = result.rows[0];

      return {
        totalAnnotationsSeen: parseInt(row.total_seen) || 0,
        averageMasteryScore: parseFloat(row.avg_mastery) || 0.0,
        annotationsByConfidence: {
          1: parseInt(row.level_1) || 0,
          2: parseInt(row.level_2) || 0,
          3: parseInt(row.level_3) || 0,
          4: parseInt(row.level_4) || 0,
          5: parseInt(row.level_5) || 0
        },
        weakAnnotationsCount: parseInt(row.weak_count) || 0,
        masteredAnnotationsCount: parseInt(row.mastered_count) || 0
      };

    } catch (error) {
      logger.error('Failed to get user mastery stats', {
        error: error instanceof Error ? error : { error },
        userId
      });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapRowToMasteryRecord(row: Record<string, unknown>): AnnotationMasteryRecord {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      annotationId: row.annotation_id as string,
      exposureCount: row.exposure_count as number,
      correctCount: row.correct_count as number,
      incorrectCount: row.incorrect_count as number,
      firstSeenAt: row.first_seen_at as Date,
      lastSeenAt: row.last_seen_at as Date,
      lastCorrectAt: row.last_correct_at as Date | undefined,
      nextReviewAt: row.next_review_at as Date | undefined,
      masteryScore: parseFloat(row.mastery_score as string),
      confidenceLevel: row.confidence_level as 1 | 2 | 3 | 4 | 5,
      avgResponseTimeMs: row.avg_response_time_ms as number | undefined,
      fastestResponseTimeMs: row.fastest_response_time_ms as number | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date
    };
  }

  private mapRowToAnnotation(row: Record<string, unknown>): Annotation {
    return {
      id: row.id as string,
      imageId: row.image_id as string,
      boundingBox: typeof row.bounding_box === 'string'
        ? JSON.parse(row.bounding_box)
        : row.bounding_box as { x: number; y: number; width: number; height: number },
      type: row.annotation_type as 'anatomical' | 'behavioral' | 'color' | 'pattern' | 'habitat',
      spanishTerm: row.spanish_term as string,
      englishTerm: row.english_term as string,
      pronunciation: row.pronunciation as string | undefined,
      difficultyLevel: row.difficulty_level as 1 | 2 | 3 | 4 | 5,
      isVisible: row.is_visible as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date
    };
  }

  private mapRowToAnnotationWithMastery(row: Record<string, unknown>): AnnotationWithMastery {
    const annotation = this.mapRowToAnnotation(row) as AnnotationWithMastery;

    if (row.mastery_id) {
      annotation.masteryData = {
        id: row.mastery_id as string,
        userId: row.user_id as string,
        annotationId: row.id as string,
        exposureCount: row.exposure_count as number,
        correctCount: row.correct_count as number,
        incorrectCount: row.incorrect_count as number,
        firstSeenAt: row.first_seen_at as Date,
        lastSeenAt: row.last_seen_at as Date,
        lastCorrectAt: row.last_correct_at as Date | undefined,
        nextReviewAt: row.next_review_at as Date | undefined,
        masteryScore: parseFloat(row.mastery_score as string),
        confidenceLevel: row.confidence_level as 1 | 2 | 3 | 4 | 5,
        avgResponseTimeMs: row.avg_response_time_ms as number | undefined,
        fastestResponseTimeMs: row.fastest_response_time_ms as number | undefined,
        createdAt: (row.created_at || row.first_seen_at) as Date,
        updatedAt: (row.updated_at || row.last_seen_at) as Date
      };
    }

    return annotation;
  }
}

export default AnnotationMasteryService;
