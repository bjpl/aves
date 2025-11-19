/**
 * Annotation-Aware Exercise Generator
 *
 * Generates exercises directly from user's annotation interactions and mastery data.
 * Implements intelligent selection using spaced repetition and weak annotation targeting.
 *
 * @example
 * ```typescript
 * const generator = new AnnotationAwareExerciseGenerator(pool, masteryService);
 *
 * // Generate exercise from user's weak annotations
 * const exercise = await generator.generateFromUserContext('user123', {
 *   exerciseType: 'spatial_identification',
 *   focusType: 'anatomical',
 *   difficultyRange: [2, 4]
 * });
 * ```
 */

import { Pool } from 'pg';
import { Annotation } from '../types/annotation.types';
import {
  SpatialIdentificationExercise,
  ComparativeAnalysisExercise,
  AnnotationSequencingExercise,
  CategorySortingExercise,
  ExerciseSelectionStrategy
} from '../../../shared/types/enhanced-exercise.types';
import { AnnotationMasteryService } from './AnnotationMasteryService';
import * as logger from '../utils/logger';

export interface ExerciseGenerationContext {
  userId: string;
  exerciseType: 'spatial_identification' | 'comparative_analysis' | 'annotation_sequencing' | 'category_sorting';
  focusType?: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyRange?: [number, number];
  sessionId?: string;
}

export class AnnotationAwareExerciseGenerator {
  constructor(
    private pool: Pool,
    private masteryService: AnnotationMasteryService
  ) {}

  /**
   * Generate exercise from user context using mastery data
   *
   * Selects annotations based on user's weak areas, due-for-review items, and new content
   *
   * @param userId - User identifier
   * @param context - Exercise generation context
   * @returns Generated exercise or null if insufficient data
   */
  async generateFromUserContext(
    userId: string,
    context: ExerciseGenerationContext
  ): Promise<SpatialIdentificationExercise | ComparativeAnalysisExercise | AnnotationSequencingExercise | CategorySortingExercise | null> {
    try {
      logger.info('Generating annotation-aware exercise', {
        userId,
        exerciseType: context.exerciseType,
        focusType: context.focusType
      });

      // Get recommended annotations based on mastery
      const recommendations = await this.masteryService.getRecommendedAnnotations(userId, 10, {
        focusType: context.focusType,
        difficultyRange: context.difficultyRange,
        includeNew: true
      });

      if (recommendations.length === 0) {
        logger.warn('No annotations available for exercise generation', { userId });
        return null;
      }

      // Generate exercise based on type
      switch (context.exerciseType) {
        case 'spatial_identification':
          return await this.generateSpatialIdentification(recommendations, context);

        case 'comparative_analysis':
          return await this.generateComparativeAnalysis(recommendations, context);

        case 'annotation_sequencing':
          return await this.generateAnnotationSequencing(recommendations, context);

        case 'category_sorting':
          return await this.generateCategorySorting(recommendations, context);

        default:
          logger.error('Unknown exercise type', { exerciseType: context.exerciseType });
          return null;
      }

    } catch (error) {
      logger.error('Failed to generate annotation-aware exercise', {
        error: error instanceof Error ? error : { error },
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Generate Spatial Identification Exercise
   *
   * User clicks on image where feature is located
   */
  private async generateSpatialIdentification(
    recommendations: any[],
    context: ExerciseGenerationContext
  ): Promise<SpatialIdentificationExercise | null> {
    // Select target annotation (prioritize weak or due-for-review)
    const targetRec = recommendations.find(r => r.reason === 'weak' || r.reason === 'due_for_review')
      || recommendations[0];

    if (!targetRec) {
      return null;
    }

    const annotation = targetRec.annotation;

    // Get image data
    const imageQuery = `
      SELECT id, image_url, species_id
      FROM images
      WHERE id = $1
    `;
    const imageResult = await this.pool.query(imageQuery, [annotation.imageId]);
    const image = imageResult.rows[0];

    if (!image) {
      logger.warn('Image not found for annotation', { annotationId: annotation.id });
      return null;
    }

    // Determine difficulty-based tolerance
    const tolerance = this.calculateTolerance(annotation.difficultyLevel);

    // Generate hints based on mastery
    const hints = targetRec.masteryData?.exposureCount > 0 && targetRec.masteryData?.masteryScore < 0.4
      ? {
          after5Seconds: `Busca ${annotation.spanishTerm} en la imagen`,
          boundingBoxHint: true
        }
      : undefined;

    const exerciseId = this.generateExerciseId('spatial_identification');

    const exercise: SpatialIdentificationExercise = {
      id: exerciseId,
      type: 'spatial_identification',
      imageUrl: image.image_url,
      imageId: annotation.imageId,
      prompt: `Haz clic en ${annotation.spanishTerm}`,
      instructions: `Encuentra y haz clic en ${annotation.spanishTerm} del pájaro`,
      targetAnnotation: annotation,
      tolerance,
      hints,
      metadata: {
        targetFeature: annotation.spanishTerm,
        difficulty: annotation.difficultyLevel,
        annotationType: annotation.type,
        reason: targetRec.reason,
        priority: targetRec.priority
      }
    };

    // Record exercise-annotation link
    await this.recordExerciseAnnotationLink(
      exerciseId,
      annotation.id,
      'target',
      context.exerciseType,
      context.sessionId
    );

    logger.info('Generated spatial identification exercise', {
      exerciseId,
      targetAnnotation: annotation.spanishTerm,
      difficulty: annotation.difficultyLevel
    });

    return exercise;
  }

  /**
   * Generate Comparative Analysis Exercise
   *
   * Compare feature across multiple bird images
   */
  private async generateComparativeAnalysis(
    recommendations: any[],
    context: ExerciseGenerationContext
  ): Promise<ComparativeAnalysisExercise | null> {
    // Need at least 3 annotations for comparison
    if (recommendations.length < 3) {
      return null;
    }

    // Group annotations by type for meaningful comparisons
    const anatomicalAnnotations = recommendations.filter(r =>
      r.annotation.type === 'anatomical'
    ).map(r => r.annotation);

    const colorAnnotations = recommendations.filter(r =>
      r.annotation.type === 'color'
    ).map(r => r.annotation);

    // Choose comparison feature based on available annotations
    let compareFeature: 'anatomical' | 'color' | 'size' | 'pattern';
    let selectedAnnotations: Annotation[];

    if (context.focusType === 'color' && colorAnnotations.length >= 3) {
      compareFeature = 'color';
      selectedAnnotations = colorAnnotations.slice(0, 3);
    } else if (context.focusType === 'anatomical' && anatomicalAnnotations.length >= 3) {
      compareFeature = 'anatomical';
      selectedAnnotations = anatomicalAnnotations.slice(0, 3);
    } else {
      // Default to color if we have enough
      if (colorAnnotations.length >= 3) {
        compareFeature = 'color';
        selectedAnnotations = colorAnnotations.slice(0, 3);
      } else {
        compareFeature = 'anatomical';
        selectedAnnotations = recommendations.slice(0, 3).map(r => r.annotation);
      }
    }

    // Get images for each annotation
    const imagePromises = selectedAnnotations.map(async (ann) => {
      const imageQuery = `
        SELECT i.id, i.image_url, s.common_name_spanish
        FROM images i
        JOIN species s ON i.species_id = s.id
        WHERE i.id = $1
      `;
      const result = await this.pool.query(imageQuery, [ann.imageId]);
      return result.rows[0];
    });

    const images = await Promise.all(imagePromises);

    // Filter out any failed queries
    const validImages = images.filter(img => img !== undefined);

    if (validImages.length < 3) {
      logger.warn('Insufficient images for comparative analysis', { count: validImages.length });
      return null;
    }

    // Select correct answer (first annotation - the weakest/due for review)
    const correctImage = validImages[0];

    const exerciseId = this.generateExerciseId('comparative_analysis');

    const exercise: ComparativeAnalysisExercise = {
      id: exerciseId,
      type: 'comparative_analysis',
      prompt: this.buildComparisonPrompt(compareFeature, selectedAnnotations[0].spanishTerm),
      instructions: 'Selecciona la imagen que mejor coincide con la descripción',
      compareFeature,
      images: validImages.map((img, idx) => ({
        id: img.id,
        url: img.image_url,
        speciesName: img.common_name_spanish,
        relevantAnnotations: [selectedAnnotations[idx]]
      })),
      correctAnswerId: correctImage.id,
      explanation: `${selectedAnnotations[0].spanishTerm} se refiere a ${selectedAnnotations[0].englishTerm}`,
      metadata: {
        difficulty: Math.max(...selectedAnnotations.map(a => a.difficultyLevel)),
        annotationsUsed: selectedAnnotations.map(a => a.id)
      }
    };

    // Record all annotation links
    for (let i = 0; i < selectedAnnotations.length; i++) {
      await this.recordExerciseAnnotationLink(
        exerciseId,
        selectedAnnotations[i].id,
        i === 0 ? 'target' : 'distractor',
        context.exerciseType,
        context.sessionId
      );
    }

    logger.info('Generated comparative analysis exercise', {
      exerciseId,
      compareFeature,
      annotationCount: selectedAnnotations.length
    });

    return exercise;
  }

  /**
   * Generate Annotation Sequencing Exercise
   *
   * Order annotations spatially or by category
   */
  private async generateAnnotationSequencing(
    recommendations: any[],
    context: ExerciseGenerationContext
  ): Promise<AnnotationSequencingExercise | null> {
    // Need at least 4 annotations
    if (recommendations.length < 4) {
      return null;
    }

    // Select annotations from same image for spatial sequencing
    const annotationsByImage = new Map<string, Annotation[]>();

    for (const rec of recommendations) {
      const imageId = rec.annotation.imageId;
      if (!annotationsByImage.has(imageId)) {
        annotationsByImage.set(imageId, []);
      }
      annotationsByImage.get(imageId)!.push(rec.annotation);
    }

    // Find image with most annotations
    let bestImageId: string | null = null;
    let maxAnnotations = 0;

    for (const [imageId, annotations] of annotationsByImage.entries()) {
      if (annotations.length >= 4 && annotations.length > maxAnnotations) {
        bestImageId = imageId;
        maxAnnotations = annotations.length;
      }
    }

    if (!bestImageId || maxAnnotations < 4) {
      logger.warn('Insufficient annotations on single image for sequencing', {
        maxAnnotations
      });
      return null;
    }

    const selectedAnnotations = annotationsByImage.get(bestImageId)!.slice(0, 5);

    // Get image data
    const imageQuery = `SELECT image_url FROM images WHERE id = $1`;
    const imageResult = await this.pool.query(imageQuery, [bestImageId]);
    const imageUrl = imageResult.rows[0]?.image_url;

    if (!imageUrl) {
      return null;
    }

    // Sort annotations vertically (top to bottom based on y coordinate)
    const correctOrder = [...selectedAnnotations]
      .sort((a, b) => a.boundingBox.y - b.boundingBox.y)
      .map(a => a.id);

    const exerciseId = this.generateExerciseId('annotation_sequencing');

    const exercise: AnnotationSequencingExercise = {
      id: exerciseId,
      type: 'annotation_sequencing',
      imageUrl,
      prompt: 'Ordena estas partes del pájaro de arriba a abajo',
      instructions: 'Arrastra los términos para ordenarlos de arriba a abajo en el pájaro',
      annotations: selectedAnnotations,
      sequenceType: 'spatial_vertical',
      correctOrder,
      metadata: {
        difficulty: Math.max(...selectedAnnotations.map(a => a.difficultyLevel)),
        hints: ['Observa la posición de cada parte en la imagen']
      }
    };

    // Record annotation links
    for (const annotation of selectedAnnotations) {
      await this.recordExerciseAnnotationLink(
        exerciseId,
        annotation.id,
        'target',
        context.exerciseType,
        context.sessionId
      );
    }

    logger.info('Generated annotation sequencing exercise', {
      exerciseId,
      annotationCount: selectedAnnotations.length,
      sequenceType: 'spatial_vertical'
    });

    return exercise;
  }

  /**
   * Generate Category Sorting Exercise
   *
   * Sort annotations by type (anatomical, color, behavioral, etc.)
   */
  private async generateCategorySorting(
    recommendations: any[],
    context: ExerciseGenerationContext
  ): Promise<CategorySortingExercise | null> {
    // Need at least 6 annotations from at least 2 different categories
    if (recommendations.length < 6) {
      return null;
    }

    const annotations = recommendations.map(r => r.annotation);

    // Group by type
    const byType = new Map<string, Annotation[]>();
    for (const ann of annotations) {
      if (!byType.has(ann.type)) {
        byType.set(ann.type, []);
      }
      byType.get(ann.type)!.push(ann);
    }

    // Need at least 2 categories with at least 2 items each
    const viableCategories = Array.from(byType.entries())
      .filter(([_, anns]) => anns.length >= 2);

    if (viableCategories.length < 2) {
      logger.warn('Insufficient category diversity for sorting exercise', {
        categoriesFound: byType.size
      });
      return null;
    }

    // Select top 3 categories (or however many we have)
    const selectedCategories = viableCategories.slice(0, 3);

    // Build terms array
    const terms = selectedCategories.flatMap(([type, anns]) =>
      anns.slice(0, 3).map(ann => ({
        id: ann.id,
        term: ann.spanishTerm,
        annotation: ann
      }))
    );

    // Build categories
    const categories = selectedCategories.map(([type, anns]) => ({
      id: type,
      name: type,
      label: this.getCategoryLabel(type),
      acceptedTermIds: anns.map(a => a.id)
    }));

    const exerciseId = this.generateExerciseId('category_sorting');

    const exercise: CategorySortingExercise = {
      id: exerciseId,
      type: 'category_sorting',
      prompt: 'Agrupa estos términos por categoría',
      instructions: 'Arrastra cada término a su categoría correcta',
      terms,
      categories,
      metadata: {
        difficulty: Math.round(terms.reduce((sum, t) =>
          sum + (t.annotation?.difficultyLevel || 3), 0) / terms.length),
        annotationsUsed: terms.map(t => t.id)
      }
    };

    // Record annotation links
    for (const term of terms) {
      await this.recordExerciseAnnotationLink(
        exerciseId,
        term.id,
        'target',
        context.exerciseType,
        context.sessionId
      );
    }

    logger.info('Generated category sorting exercise', {
      exerciseId,
      termCount: terms.length,
      categoryCount: categories.length
    });

    return exercise;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateExerciseId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private calculateTolerance(difficultyLevel: number): number {
    // Easier difficulty = larger tolerance
    // Difficulty 1: 0.25 (very forgiving)
    // Difficulty 5: 0.05 (very precise)
    return 0.30 - (difficultyLevel * 0.05);
  }

  private buildComparisonPrompt(feature: string, targetTerm: string): string {
    const prompts: Record<string, string> = {
      color: `¿Qué pájaro muestra ${targetTerm}?`,
      anatomical: `¿Qué pájaro tiene ${targetTerm} más prominente?`,
      size: `¿Qué pájaro tiene el ${targetTerm} más grande?`,
      pattern: `¿Qué pájaro muestra el patrón de ${targetTerm}?`
    };

    return prompts[feature] || `¿Qué imagen muestra ${targetTerm}?`;
  }

  private getCategoryLabel(type: string): string {
    const labels: Record<string, string> = {
      anatomical: 'Anatómico',
      behavioral: 'Comportamiento',
      color: 'Color',
      pattern: 'Patrón'
    };

    return labels[type] || type;
  }

  private async recordExerciseAnnotationLink(
    exerciseId: string,
    annotationId: string,
    role: 'target' | 'distractor' | 'context',
    exerciseType: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO exercise_annotation_links (
          exercise_id,
          session_id,
          annotation_id,
          role,
          exercise_type
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await this.pool.query(query, [
        exerciseId,
        sessionId || null,
        annotationId,
        role,
        exerciseType
      ]);

    } catch (error) {
      logger.error('Failed to record exercise-annotation link', {
        error: error instanceof Error ? error : { error },
        exerciseId,
        annotationId
      });
      // Don't throw - this is not critical for exercise generation
    }
  }
}

export default AnnotationAwareExerciseGenerator;
