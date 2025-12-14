/**
 * ContentPublishingService
 *
 * Manages the workflow of publishing AI-generated annotations to user-facing Learn/Practice features.
 * Bridges the gap between Admin AI tools and public content.
 */

import { pool } from '../database/connection';
import { error as logError, info } from '../utils/logger';

export interface PublishOptions {
  annotationIds: string[];
  moduleId?: string;
  generateExercises?: boolean;
}

export interface LearningContent {
  id: string;
  imageId: string;
  imageUrl: string;
  spanishTerm: string;
  englishTerm: string;
  pronunciation?: string;
  type: string;
  boundingBox: any;
  difficultyLevel: number;
  speciesId?: string;
  speciesName?: string;
  moduleId?: string;
  moduleName?: string;
}

export interface ContentFilters {
  difficulty?: number;
  type?: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  speciesId?: string;
  moduleId?: string;
  limit?: number;
  offset?: number;
}

class ContentPublishingService {
  /**
   * Publish approved annotations to make them available in Learn/Practice
   */
  async publishAnnotations(options: PublishOptions): Promise<{ published: number; failed: string[] }> {
    const { annotationIds, moduleId, generateExercises } = options;
    const failed: string[] = [];
    let published = 0;

    try {
      for (const id of annotationIds) {
        try {
          // Note: annotations table uses is_visible instead of status column
          const result = await pool.query(
            `UPDATE annotations
             SET published_at = CURRENT_TIMESTAMP,
                 learning_module_id = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_visible = true
             RETURNING id`,
            [id, moduleId || null]
          );
          if (result.rowCount && result.rowCount > 0) {
            published++;
          } else {
            failed.push(id);
          }
        } catch (err) {
          failed.push(id);
          logError(`Failed to publish annotation ${id}`, err as Error);
        }
      }

      info(`Published ${published} annotations`, { moduleId, generateExercises });

      if (generateExercises && published > 0) {
        // Trigger exercise generation for newly published content
        await this.queueExerciseGeneration(annotationIds.filter(id => !failed.includes(id)));
      }

      return { published, failed };
    } catch (err) {
      logError('Error in publishAnnotations', err as Error);
      throw err;
    }
  }

  /**
   * Get published learning content with optional filters
   */
  async getPublishedContent(filters: ContentFilters = {}): Promise<LearningContent[]> {
    const { difficulty, type, speciesId, moduleId, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT
        a.id,
        a.image_id as "imageId",
        i.url as "imageUrl",
        a.spanish_term as "spanishTerm",
        a.english_term as "englishTerm",
        a.pronunciation,
        a.annotation_type as "type",
        a.bounding_box as "boundingBox",
        a.difficulty_level as "difficultyLevel",
        i.species_id as "speciesId",
        s.spanish_name as "speciesName",
        a.learning_module_id as "moduleId",
        lm.title as "moduleName"
      FROM annotations a
      JOIN images i ON a.image_id = i.id
      LEFT JOIN species s ON i.species_id = s.id
      LEFT JOIN learning_modules lm ON a.learning_module_id = lm.id
      WHERE a.published_at IS NOT NULL
        AND a.is_visible = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (difficulty) {
      query += ` AND a.difficulty_level = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (type) {
      query += ` AND a.annotation_type = $${paramIndex++}`;
      params.push(type);
    }

    if (speciesId) {
      query += ` AND i.species_id = $${paramIndex++}`;
      params.push(speciesId);
    }

    if (moduleId) {
      query += ` AND a.learning_module_id = $${paramIndex++}`;
      params.push(moduleId);
    }

    query += ` ORDER BY a.difficulty_level ASC, a.published_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      logError('Error fetching published content', err as Error);
      return [];
    }
  }

  /**
   * Get content grouped by learning module
   */
  async getContentByModule(): Promise<Map<string, LearningContent[]>> {
    const content = await this.getPublishedContent({ limit: 1000 });
    const grouped = new Map<string, LearningContent[]>();

    content.forEach(item => {
      const key = item.moduleId || 'unassigned';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });

    return grouped;
  }

  /**
   * Get learning modules with content counts
   */
  async getLearningModules(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT
          lm.*,
          COUNT(a.id) as "contentCount",
          AVG(a.difficulty_level) as "avgDifficulty"
        FROM learning_modules lm
        LEFT JOIN annotations a ON a.learning_module_id = lm.id AND a.published_at IS NOT NULL
        WHERE lm.is_active = true
        GROUP BY lm.id
        ORDER BY lm.order_index ASC
      `);
      return result.rows;
    } catch (err) {
      logError('Error fetching learning modules', err as Error);
      return [];
    }
  }

  /**
   * Create a new learning module
   */
  async createModule(data: {
    title: string;
    titleSpanish: string;
    description?: string;
    difficultyLevel?: number;
    speciesIds?: string[];
  }): Promise<string> {
    try {
      const result = await pool.query(
        `INSERT INTO learning_modules (title, title_spanish, description, difficulty_level, species_ids)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [data.title, data.titleSpanish, data.description, data.difficultyLevel || 1, data.speciesIds || []]
      );
      return result.rows[0].id;
    } catch (err) {
      logError('Error creating learning module', err as Error);
      throw err;
    }
  }

  /**
   * Queue exercise generation for annotations
   */
  private async queueExerciseGeneration(annotationIds: string[]): Promise<void> {
    // This would integrate with the existing aiExerciseGenerator service
    info(`Queued exercise generation for ${annotationIds.length} annotations`);
  }

  /**
   * Get content statistics
   */
  async getContentStats(): Promise<{
    totalPublished: number;
    byDifficulty: Record<number, number>;
    byType: Record<string, number>;
    byModule: Record<string, number>;
  }> {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total,
          difficulty_level,
          annotation_type,
          learning_module_id
        FROM annotations
        WHERE published_at IS NOT NULL
        GROUP BY GROUPING SETS (
          (difficulty_level),
          (annotation_type),
          (learning_module_id),
          ()
        )
      `);

      const stats = {
        totalPublished: 0,
        byDifficulty: {} as Record<number, number>,
        byType: {} as Record<string, number>,
        byModule: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        if (row.difficulty_level && !row.annotation_type && !row.learning_module_id) {
          stats.byDifficulty[row.difficulty_level] = parseInt(row.total);
        } else if (row.annotation_type && !row.difficulty_level && !row.learning_module_id) {
          stats.byType[row.annotation_type] = parseInt(row.total);
        } else if (row.learning_module_id && !row.difficulty_level && !row.annotation_type) {
          stats.byModule[row.learning_module_id] = parseInt(row.total);
        } else if (!row.difficulty_level && !row.annotation_type && !row.learning_module_id) {
          stats.totalPublished = parseInt(row.total);
        }
      });

      return stats;
    } catch (err) {
      logError('Error getting content stats', err as Error);
      return { totalPublished: 0, byDifficulty: {}, byType: {}, byModule: {} };
    }
  }
}

export const contentPublishingService = new ContentPublishingService();
export default contentPublishingService;
