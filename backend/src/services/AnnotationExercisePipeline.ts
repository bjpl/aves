import { createClient } from '@supabase/supabase-js';
import { AnnotationAwareExerciseGenerator } from './AnnotationAwareExerciseGenerator';
import { AnnotationMasteryService } from './AnnotationMasteryService';
import { Database } from '../types/supabase';
import { logger } from '../utils/logger';

interface PipelineJob {
  annotationId: string;
  userId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exercisesGenerated?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface ExerciseCache {
  id: string;
  annotationId: string;
  userId: string;
  exerciseType: 'learn' | 'practice';
  exercise: any;
  createdAt: Date;
  expiresAt: Date;
}

export class AnnotationExercisePipeline {
  private supabase: ReturnType<typeof createClient<Database>>;
  private exerciseGenerator: AnnotationAwareExerciseGenerator;
  private masteryService: AnnotationMasteryService;
  private activeJobs: Map<string, PipelineJob> = new Map();
  private exerciseCache: Map<string, ExerciseCache[]> = new Map();

  constructor(supabaseClient: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabaseClient;
    this.exerciseGenerator = new AnnotationAwareExerciseGenerator(supabaseClient);
    this.masteryService = new AnnotationMasteryService(supabaseClient);
  }

  /**
   * Called when an annotation is approved
   * Generates exercises for all applicable users
   */
  async onAnnotationApproved(annotationId: string): Promise<void> {
    logger.info(`Pipeline triggered for approved annotation: ${annotationId}`);

    const job: PipelineJob = {
      annotationId,
      status: 'processing',
      createdAt: new Date()
    };

    this.activeJobs.set(annotationId, job);

    try {
      // Get annotation details
      const { data: annotation, error: annotationError } = await this.supabase
        .from('annotations')
        .select('*')
        .eq('id', annotationId)
        .single();

      if (annotationError || !annotation) {
        throw new Error(`Failed to fetch annotation: ${annotationError?.message}`);
      }

      // Get all users who should receive exercises for this annotation
      const users = await this.getTargetUsers(annotationId);

      let totalExercisesGenerated = 0;

      // Generate exercises for each user context
      for (const userId of users) {
        const exercises = await this.generateUserExercises(userId, annotationId);
        totalExercisesGenerated += exercises.length;

        // Cache exercises for quick delivery
        await this.cacheExercises(userId, annotationId, exercises);
      }

      // Update job status
      job.status = 'completed';
      job.exercisesGenerated = totalExercisesGenerated;
      job.completedAt = new Date();

      // Store job in database for monitoring
      await this.storeJobResult(job);

      logger.info(`Pipeline completed for annotation ${annotationId}: ${totalExercisesGenerated} exercises generated for ${users.length} users`);

    } catch (error) {
      logger.error(`Pipeline failed for annotation ${annotationId}:`, error);

      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();

      await this.storeJobResult(job);

      throw error;
    } finally {
      this.activeJobs.delete(annotationId);
    }
  }

  /**
   * Batch generation for multiple approved annotations
   */
  async generateForBatch(annotationIds: string[]): Promise<void> {
    logger.info(`Batch pipeline triggered for ${annotationIds.length} annotations`);

    const results = await Promise.allSettled(
      annotationIds.map(id => this.onAnnotationApproved(id))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Batch pipeline completed: ${succeeded} succeeded, ${failed} failed`);
  }

  /**
   * Pre-generate exercises for a user based on their weak areas
   */
  async prefetchExercises(userId: string, count: number = 10): Promise<void> {
    logger.info(`Pre-fetching ${count} exercises for user ${userId}`);

    try {
      // Get user's weak annotations
      const weakAnnotations = await this.masteryService.getWeakAnnotations(userId, count);

      for (const annotation of weakAnnotations) {
        const exercises = await this.generateUserExercises(userId, annotation.annotationId);
        await this.cacheExercises(userId, annotation.annotationId, exercises);
      }

      logger.info(`Pre-fetch completed for user ${userId}`);

    } catch (error) {
      logger.error(`Pre-fetch failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get exercises from cache or generate on-demand
   */
  async getExercisesForUser(
    userId: string,
    type: 'learn' | 'practice',
    limit: number = 10
  ): Promise<any[]> {
    // Check cache first
    const cacheKey = `${userId}-${type}`;
    const cached = this.exerciseCache.get(cacheKey);

    if (cached && cached.length > 0) {
      // Filter out expired entries
      const valid = cached.filter(c => c.expiresAt > new Date());
      if (valid.length >= limit) {
        return valid.slice(0, limit).map(c => c.exercise);
      }
    }

    // Generate new exercises if cache miss or insufficient
    const weakAnnotations = await this.masteryService.getWeakAnnotations(userId, limit);
    const exercises: any[] = [];

    for (const annotation of weakAnnotations) {
      const newExercises = await this.generateUserExercises(userId, annotation.annotationId, type);
      exercises.push(...newExercises);

      if (exercises.length >= limit) break;
    }

    // Update cache
    await this.cacheExercises(userId, weakAnnotations[0]?.annotationId, exercises, type);

    return exercises.slice(0, limit);
  }

  /**
   * Get monitoring statistics for the pipeline
   */
  async getPipelineStats(): Promise<any> {
    try {
      // Get all logs and group by status in JavaScript
      const { data: logs, error } = await this.supabase
        .from('annotation_exercise_pipeline_log')
        .select('status');

      if (error) {
        logger.error('Error fetching pipeline logs:', error);
      }

      // Group by status manually
      const statusCounts = logs?.reduce((acc: any, log: any) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const jobsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      const activeJobs = Array.from(this.activeJobs.values());
      const cacheSize = Array.from(this.exerciseCache.values())
        .reduce((total, cache) => total + cache.length, 0);

      return {
        activeJobs: activeJobs.length,
        jobsByStatus,
        cacheSize,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting pipeline stats:', error);
      return {
        activeJobs: 0,
        jobsByStatus: [],
        cacheSize: 0,
        timestamp: new Date(),
        error: 'Failed to fetch stats'
      };
    }
  }

  // Private helper methods

  private async getTargetUsers(annotationId: string): Promise<string[]> {
    // Get users who have interacted with similar annotations or the same species
    const { data: annotation } = await this.supabase
      .from('annotations')
      .select('species_id')
      .eq('id', annotationId)
      .single();

    if (!annotation) return [];

    // Get users who have viewed this species
    const { data: users } = await this.supabase
      .from('user_species_interactions')
      .select('user_id')
      .eq('species_id', annotation.species_id)
      .limit(100);

    return users?.map(u => u.user_id) || [];
  }

  private async generateUserExercises(
    userId: string,
    annotationId: string,
    type?: 'learn' | 'practice'
  ): Promise<any[]> {
    const context = {
      userId,
      sessionId: `pipeline-${Date.now()}`,
      targetAnnotations: [annotationId],
      difficulty: 'adaptive' as const
    };

    const exercises = await this.exerciseGenerator.generateFromUserContext(context);

    // Filter by type if specified
    if (type === 'learn') {
      return exercises.filter(e =>
        e.type === 'anatomical_identification' ||
        e.type === 'interactive_annotation'
      );
    } else if (type === 'practice') {
      return exercises.filter(e =>
        e.type === 'vocabulary_matching' ||
        e.type === 'feature_recognition'
      );
    }

    return exercises;
  }

  private async cacheExercises(
    userId: string,
    annotationId: string,
    exercises: any[],
    type?: 'learn' | 'practice'
  ): Promise<void> {
    const cacheEntries: ExerciseCache[] = exercises.map(exercise => ({
      id: `cache-${Date.now()}-${Math.random()}`,
      annotationId,
      userId,
      exerciseType: type || (exercise.type.includes('annotation') ? 'learn' : 'practice'),
      exercise,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hour cache
    }));

    const cacheKey = type ? `${userId}-${type}` : userId;
    const existing = this.exerciseCache.get(cacheKey) || [];
    this.exerciseCache.set(cacheKey, [...existing, ...cacheEntries]);

    // Also store in database for persistence
    const { error } = await this.supabase
      .from('exercise_cache')
      .insert(
        cacheEntries.map(c => ({
          user_id: c.userId,
          annotation_id: c.annotationId,
          exercise_type: c.exerciseType,
          exercise_data: c.exercise,
          expires_at: c.expiresAt
        }))
      );

    if (error) {
      logger.error('Failed to persist exercise cache:', error);
    }
  }

  private async storeJobResult(job: PipelineJob): Promise<void> {
    const { error } = await this.supabase
      .from('annotation_exercise_pipeline_log')
      .insert({
        annotation_id: job.annotationId,
        user_id: job.userId || null,
        exercises_generated: job.exercisesGenerated || 0,
        status: job.status,
        error_message: job.errorMessage || null,
        created_at: job.createdAt.toISOString(),
        completed_at: job.completedAt?.toISOString() || null
      });

    if (error) {
      logger.error('Failed to store pipeline job result:', error);
    }
  }
}