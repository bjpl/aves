/**
 * Bulk Operation Undo Service
 *
 * CONCEPT: Grace period undo queue for bulk admin operations
 * WHY: Allow admins to undo accidental bulk deletes/updates within 30 seconds
 * PATTERN: Soft-delete with delayed execution and cancellation tokens
 *
 * Features:
 * - 30-second grace period before executing operations
 * - Cancellation support (undo button)
 * - Auto-cleanup of expired operations
 * - Reverse action storage for rollback
 */

import { Pool } from 'pg';
import { info, error as logError } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type OperationType = 'bulk_delete' | 'bulk_annotate';
export type OperationStatus = 'pending' | 'executed' | 'cancelled';

export interface UndoOperation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  itemIds: string[]; // Image IDs affected
  reverseData: any; // Data needed to reverse the operation
  createdAt: Date;
  expiresAt: Date;
  executedAt?: Date;
  cancelledAt?: Date;
  userId?: string;
}

export interface BulkDeleteReverseData {
  images: Array<{
    id: string;
    speciesId: string;
    unsplashId: string;
    url: string;
    width: number;
    height: number;
    description: string | null;
    photographer: string;
    photographerUsername: string;
    qualityScore: number | null;
  }>;
  annotations: Array<{
    imageId: string;
    jobId: string;
    spanishTerm: string;
    englishTerm: string;
    boundingBox: any;
    annotationType: string;
    difficultyLevel: string;
    pronunciation: string | null;
    confidence: number;
    status: string;
  }>;
}

// ============================================================================
// Service
// ============================================================================

export class BulkOperationUndoService {
  private pool: Pool;
  private operations: Map<string, UndoOperation> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private gracePeriodMs: number = 30 * 1000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    this.startCleanupInterval();
  }

  /**
   * Clean up resources (for testing and graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.operations.clear();
  }

  /**
   * Queue a bulk delete operation with undo capability
   */
  async queueBulkDelete(
    imageIds: string[],
    userId?: string
  ): Promise<{ operationId: string; expiresAt: Date }> {
    const operationId = this.generateOperationId('bulk_delete');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.gracePeriodMs);

    // Fetch all data needed to reverse the operation
    const reverseData = await this.fetchDeleteReverseData(imageIds);

    const operation: UndoOperation = {
      id: operationId,
      type: 'bulk_delete',
      status: 'pending',
      itemIds: imageIds,
      reverseData,
      createdAt: now,
      expiresAt,
      userId,
    };

    this.operations.set(operationId, operation);

    // Schedule auto-execution after grace period
    const timer = setTimeout(async () => {
      await this.executeOperation(operationId);
    }, this.gracePeriodMs);

    this.timers.set(operationId, timer);

    info('Bulk delete operation queued', {
      operationId,
      imageCount: imageIds.length,
      expiresAt: expiresAt.toISOString(),
    });

    return { operationId, expiresAt };
  }

  /**
   * Cancel a pending operation (undo)
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    const operation = this.operations.get(operationId);

    if (!operation) {
      return false;
    }

    if (operation.status !== 'pending') {
      return false;
    }

    // Clear the auto-execution timer
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }

    // Mark as cancelled
    operation.status = 'cancelled';
    operation.cancelledAt = new Date();

    info('Bulk operation cancelled', {
      operationId,
      type: operation.type,
      itemCount: operation.itemIds.length,
    });

    // Clean up after a short delay
    setTimeout(() => {
      this.operations.delete(operationId);
    }, 5000);

    return true;
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): UndoOperation | undefined {
    return this.operations.get(operationId);
  }

  /**
   * List all active operations for a user
   */
  getUserOperations(userId?: string): UndoOperation[] {
    return Array.from(this.operations.values()).filter(
      (op) => op.status === 'pending' && (!userId || op.userId === userId)
    );
  }

  /**
   * Execute a pending operation
   */
  private async executeOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);

    if (!operation || operation.status !== 'pending') {
      return;
    }

    try {
      info('Executing pending operation', {
        operationId,
        type: operation.type,
        itemCount: operation.itemIds.length,
      });

      if (operation.type === 'bulk_delete') {
        await this.executeBulkDelete(operation.itemIds);
      }

      operation.status = 'executed';
      operation.executedAt = new Date();

      // Clean up after execution
      this.timers.delete(operationId);
      setTimeout(() => {
        this.operations.delete(operationId);
      }, 60000); // Keep for 1 minute after execution
    } catch (err) {
      logError('Failed to execute pending operation', err as Error, {
        operationId,
        type: operation.type,
      });
      // Keep in pending state so admin can retry
    }
  }

  /**
   * Execute the actual bulk delete
   */
  private async executeBulkDelete(imageIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const imageId of imageIds) {
        // Delete annotation items
        await client.query(
          'DELETE FROM ai_annotation_items WHERE image_id::text = $1',
          [imageId]
        );

        // Delete annotations
        await client.query(
          'DELETE FROM ai_annotations WHERE image_id::text = $1',
          [imageId]
        );

        // Delete image
        await client.query('DELETE FROM images WHERE id = $1', [imageId]);
      }

      await client.query('COMMIT');

      info('Bulk delete executed', { imageCount: imageIds.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all data needed to reverse a delete operation
   */
  private async fetchDeleteReverseData(
    imageIds: string[]
  ): Promise<BulkDeleteReverseData> {
    // Fetch image data
    const imagesResult = await this.pool.query(
      `SELECT
        id, species_id as "speciesId", unsplash_id as "unsplashId",
        url, width, height, description, photographer,
        photographer_username as "photographerUsername",
        quality_score as "qualityScore"
      FROM images
      WHERE id = ANY($1)`,
      [imageIds]
    );

    // Fetch annotation data
    const annotationsResult = await this.pool.query(
      `SELECT
        image_id as "imageId", job_id as "jobId",
        spanish_term as "spanishTerm", english_term as "englishTerm",
        bounding_box as "boundingBox", annotation_type as "annotationType",
        difficulty_level as "difficultyLevel", pronunciation,
        confidence, status
      FROM ai_annotation_items
      WHERE image_id::text = ANY($1)`,
      [imageIds]
    );

    return {
      images: imagesResult.rows,
      annotations: annotationsResult.rows,
    };
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(type: string): string {
    return `undo_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired operations
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, operation] of this.operations.entries()) {
        // Remove operations that are:
        // 1. Cancelled and older than 5 minutes
        // 2. Executed and older than 1 hour
        const age = now - operation.createdAt.getTime();

        if (
          (operation.status === 'cancelled' && age > 5 * 60 * 1000) ||
          (operation.status === 'executed' && age > 60 * 60 * 1000)
        ) {
          this.operations.delete(id);
          const timer = this.timers.get(id);
          if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
          }
        }
      }
    }, 60 * 1000); // Run every minute
  }
}
