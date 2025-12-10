/**
 * Reinforcement Learning Engine
 * Captures user feedback (approvals, rejections, corrections) to improve ML models
 * Implements continuous learning from annotation review workflow
 */

import { pool } from '../database/connection';
import { info, error as logError } from '../utils/logger';
import { patternLearner, PositionCorrection, RejectionPattern } from './PatternLearner';

/**
 * Feedback types for reinforcement learning
 */
export type FeedbackType = 'approve' | 'reject' | 'position_fix';

/**
 * Structured feedback data
 */
export interface FeedbackData {
  type: FeedbackType;
  annotationId: string;
  originalData: Record<string, unknown>;
  correctedData?: Record<string, unknown>;
  rejectionReason?: string;
  userId: string;
  metadata?: {
    species?: string;
    imageId?: string;
    feature?: string;
  };
}

/**
 * Reinforcement Learning Engine
 * Continuously improves ML models through user feedback
 */
export class ReinforcementLearningEngine {
  /**
   * Capture feedback from user review actions
   */
  async captureFeedback(feedback: FeedbackData): Promise<void> {
    try {
      info('Capturing reinforcement learning feedback', {
        type: feedback.type,
        annotationId: feedback.annotationId,
        userId: feedback.userId
      });

      switch (feedback.type) {
        case 'approve':
          await this.captureApproval(feedback);
          break;
        case 'reject':
          await this.captureRejection(feedback);
          break;
        case 'position_fix':
          await this.capturePositionCorrection(feedback);
          break;
      }

      // Update aggregated metrics
      await this.updateMetrics(feedback);

    } catch (error) {
      logError('Failed to capture feedback', error as Error, {
        type: feedback.type,
        annotationId: feedback.annotationId
      });
    }
  }

  /**
   * Capture approval feedback (positive reinforcement)
   */
  private async captureApproval(feedback: FeedbackData): Promise<void> {
    const { annotationId, originalData, metadata } = feedback;

    // Log approval for metrics tracking
    await pool.query(
      `INSERT INTO feedback_metrics (
        metric_type, species, feature_type, value, sample_size, time_window, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING`,
      [
        'approval_rate',
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        1.0,
        1,
        '1day'
      ]
    );

    info('Approval feedback captured', {
      annotationId,
      species: metadata?.species
    });
  }

  /**
   * Capture rejection feedback (negative reinforcement)
   */
  private async captureRejection(feedback: FeedbackData): Promise<void> {
    const { annotationId, originalData, rejectionReason, metadata } = feedback;

    // Extract rejection category
    const category = this.categorizeRejection(rejectionReason || '');

    // Store rejection pattern
    await pool.query(
      `INSERT INTO rejection_patterns (
        annotation_id, rejection_category, rejection_notes, species,
        feature_type, bounding_box, confidence_score, rejected_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        annotationId,
        category,
        rejectionReason || 'No reason provided',
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        originalData.bounding_box ? JSON.stringify(originalData.bounding_box) : null,
        originalData.confidence || null,
        feedback.userId
      ]
    );

    // Update rejection metrics
    await pool.query(
      `INSERT INTO feedback_metrics (
        metric_type, species, feature_type, value, sample_size, time_window
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'rejection_rate',
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        1.0,
        1,
        '1day'
      ]
    );

    info('Rejection feedback captured', {
      annotationId,
      category,
      species: metadata?.species
    });
  }

  /**
   * Capture position correction feedback
   */
  private async capturePositionCorrection(feedback: FeedbackData): Promise<void> {
    const { annotationId, originalData, correctedData, metadata, userId } = feedback;

    if (!correctedData || !originalData.bounding_box || !correctedData.bounding_box) {
      logError('Missing bounding box data for position correction', new Error('Invalid data'), {
        annotationId
      });
      return;
    }

    const original = originalData.bounding_box as { x: number; y: number; width: number; height: number };
    const corrected = correctedData.bounding_box as { x: number; y: number; width: number; height: number };

    // Calculate deltas
    const deltaX = corrected.x - original.x;
    const deltaY = corrected.y - original.y;
    const deltaWidth = corrected.width - original.width;
    const deltaHeight = corrected.height - original.height;

    // Store correction in database
    await pool.query(
      `INSERT INTO annotation_corrections (
        annotation_id, original_bounding_box, corrected_bounding_box,
        delta_x, delta_y, delta_width, delta_height,
        species, feature_type, corrected_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        annotationId,
        JSON.stringify(original),
        JSON.stringify(corrected),
        deltaX,
        deltaY,
        deltaWidth,
        deltaHeight,
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        userId
      ]
    );

    // Update positioning model
    await this.updatePositioningModel(
      metadata?.species || 'unknown',
      String(originalData.annotation_type || originalData.type || 'unknown'),
      deltaX,
      deltaY,
      deltaWidth,
      deltaHeight
    );

    // Update correction rate metric
    await pool.query(
      `INSERT INTO feedback_metrics (
        metric_type, species, feature_type, value, sample_size, time_window
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'correction_rate',
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        1.0,
        1,
        '1day'
      ]
    );

    // Calculate correction magnitude
    const magnitude = Math.sqrt(
      deltaX * deltaX + deltaY * deltaY +
      deltaWidth * deltaWidth + deltaHeight * deltaHeight
    );

    await pool.query(
      `INSERT INTO feedback_metrics (
        metric_type, species, feature_type, value, sample_size, time_window
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'avg_correction_magnitude',
        metadata?.species || null,
        originalData.annotation_type || originalData.type || null,
        magnitude,
        1,
        '1day'
      ]
    );

    info('Position correction captured', {
      annotationId,
      species: metadata?.species,
      magnitude: magnitude.toFixed(4)
    });
  }

  /**
   * Update positioning model with incremental learning
   */
  private async updatePositioningModel(
    species: string,
    featureType: string,
    deltaX: number,
    deltaY: number,
    deltaWidth: number,
    deltaHeight: number
  ): Promise<void> {
    // Use upsert with online update formulas
    const result = await pool.query(
      `INSERT INTO positioning_model (
        species, feature_type, avg_delta_x, avg_delta_y,
        avg_delta_width, avg_delta_height, sample_count, last_trained
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (species, feature_type) DO UPDATE SET
        avg_delta_x = (
          positioning_model.avg_delta_x * positioning_model.sample_count + $3
        ) / (positioning_model.sample_count + 1),
        avg_delta_y = (
          positioning_model.avg_delta_y * positioning_model.sample_count + $4
        ) / (positioning_model.sample_count + 1),
        avg_delta_width = (
          positioning_model.avg_delta_width * positioning_model.sample_count + $5
        ) / (positioning_model.sample_count + 1),
        avg_delta_height = (
          positioning_model.avg_delta_height * positioning_model.sample_count + $6
        ) / (positioning_model.sample_count + 1),
        sample_count = positioning_model.sample_count + 1,
        confidence = LEAST(1.0, (positioning_model.sample_count + 1) / 10.0),
        last_trained = CURRENT_TIMESTAMP
      RETURNING sample_count, confidence`,
      [species, featureType, deltaX, deltaY, deltaWidth, deltaHeight]
    );

    info('Positioning model updated', {
      species,
      featureType,
      sampleCount: result.rows[0]?.sample_count,
      confidence: result.rows[0]?.confidence
    });
  }

  /**
   * Categorize rejection reason into standard categories
   */
  private categorizeRejection(reason: string): string {
    const lowerReason = reason.toLowerCase();

    // Match common rejection patterns
    if (lowerReason.includes('species') || lowerReason.includes('wrong bird')) {
      return 'incorrect_species';
    } else if (lowerReason.includes('feature') || lowerReason.includes('part') || lowerReason.includes('anatomy')) {
      return 'incorrect_feature';
    } else if (lowerReason.includes('position') || lowerReason.includes('localization') || lowerReason.includes('bounding box')) {
      return 'poor_localization';
    } else if (lowerReason.includes('false') || lowerReason.includes('not found') || lowerReason.includes('doesn\'t exist')) {
      return 'false_positive';
    } else if (lowerReason.includes('duplicate') || lowerReason.includes('already exists')) {
      return 'duplicate';
    } else if (lowerReason.includes('quality') || lowerReason.includes('blurry') || lowerReason.includes('unclear')) {
      return 'low_quality';
    } else {
      return 'other';
    }
  }

  /**
   * Update aggregated metrics
   */
  private async updateMetrics(feedback: FeedbackData): Promise<void> {
    // This is a placeholder for future metric aggregation
    // Could include time-series analysis, trend detection, etc.
    info('Metrics updated', { type: feedback.type });
  }

  /**
   * Get positioning adjustments for species/feature combination
   */
  async getPositioningAdjustments(
    species: string,
    featureType: string
  ): Promise<{
    deltaX: number;
    deltaY: number;
    deltaWidth: number;
    deltaHeight: number;
    confidence: number;
  } | null> {
    try {
      const result = await pool.query(
        `SELECT avg_delta_x, avg_delta_y, avg_delta_width,
                avg_delta_height, confidence, sample_count
         FROM positioning_model
         WHERE species = $1 AND feature_type = $2
         AND sample_count >= 3`,  // Minimum samples for reliable adjustment
        [species, featureType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        deltaX: parseFloat(row.avg_delta_x),
        deltaY: parseFloat(row.avg_delta_y),
        deltaWidth: parseFloat(row.avg_delta_width),
        deltaHeight: parseFloat(row.avg_delta_height),
        confidence: parseFloat(row.confidence)
      };
    } catch (error) {
      logError('Failed to get positioning adjustments', error as Error);
      return null;
    }
  }

  /**
   * Get rejection analytics
   */
  async getRejectionAnalytics(timeWindow: string = '30days'): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT rejection_category, species, feature_type,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence
         FROM rejection_patterns
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
         GROUP BY rejection_category, species, feature_type
         ORDER BY count DESC
         LIMIT 20`
      );

      return result.rows;
    } catch (error) {
      logError('Failed to get rejection analytics', error as Error);
      return [];
    }
  }
}

/**
 * Helper function to extract rejection category from notes
 * Parses "[CATEGORY] notes" format or infers from content
 */
export function extractRejectionCategory(notes: string): string {
  // First try to extract explicit category
  const match = notes?.match(/^\[([A-Z_]+)\]/);
  if (match) {
    return match[1].toLowerCase();
  }

  // Otherwise infer from content
  const lowerNotes = notes?.toLowerCase() || '';

  if (lowerNotes.includes('species') || lowerNotes.includes('wrong bird')) {
    return 'incorrect_species';
  } else if (lowerNotes.includes('feature') || lowerNotes.includes('part')) {
    return 'incorrect_feature';
  } else if (lowerNotes.includes('position') || lowerNotes.includes('box')) {
    return 'poor_localization';
  } else if (lowerNotes.includes('false') || lowerNotes.includes('not found')) {
    return 'false_positive';
  } else if (lowerNotes.includes('duplicate')) {
    return 'duplicate';
  } else if (lowerNotes.includes('quality') || lowerNotes.includes('blurry')) {
    return 'low_quality';
  } else {
    return 'other';
  }
}

// Export singleton instance
export const reinforcementLearningEngine = new ReinforcementLearningEngine();
