/**
 * Enhanced Exercises API Routes
 *
 * Endpoints for annotation-aware exercise generation
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { AnnotationAwareExerciseGenerator } from '../services/AnnotationAwareExerciseGenerator';
import { AnnotationMasteryService } from '../services/AnnotationMasteryService';
import { error as logError } from '../utils/logger';

export function createEnhancedExercisesRouter(pool: Pool): Router {
  const router = Router();
  const masteryService = new AnnotationMasteryService(pool);
  const exerciseGenerator = new AnnotationAwareExerciseGenerator(pool, masteryService);

  // ============================================================================
  // VALIDATION SCHEMAS
  // ============================================================================

  const GenerateExerciseSchema = z.object({
    userId: z.string().min(1),
    exerciseType: z.enum([
      'spatial_identification',
      'comparative_analysis',
      'annotation_sequencing',
      'category_sorting'
    ]),
    focusType: z.enum(['anatomical', 'behavioral', 'color', 'pattern']).optional(),
    difficultyMin: z.number().int().min(1).max(5).optional(),
    difficultyMax: z.number().int().min(1).max(5).optional(),
    sessionId: z.string().optional()
  });

  const ValidateAnswerSchema = z.object({
    userId: z.string().min(1),
    exerciseId: z.string().min(1),
    exerciseType: z.string(),
    userAnswer: z.any(),
    timeTaken: z.number().int().positive(),
    sessionId: z.string().optional()
  });

  // ============================================================================
  // ROUTES
  // ============================================================================

  /**
   * POST /api/enhanced-exercises/generate
   * Generate annotation-aware exercise
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const data = GenerateExerciseSchema.parse(req.body);

      const difficultyRange: [number, number] | undefined =
        data.difficultyMin && data.difficultyMax
          ? [data.difficultyMin, data.difficultyMax]
          : undefined;

      const exercise = await exerciseGenerator.generateFromUserContext(data.userId, {
        userId: data.userId,
        exerciseType: data.exerciseType,
        focusType: data.focusType,
        difficultyRange,
        sessionId: data.sessionId
      });

      if (!exercise) {
        return res.status(404).json({
          error: 'Could not generate exercise',
          reason: 'Insufficient annotation data available'
        });
      }

      res.json({
        success: true,
        exercise
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: err.errors
        });
      }

      logError('Error generating enhanced exercise', err as Error);
      res.status(500).json({ error: 'Failed to generate exercise' });
    }
  });

  /**
   * POST /api/enhanced-exercises/validate
   * Validate exercise answer and update mastery
   */
  router.post('/validate', async (req: Request, res: Response) => {
    try {
      const data = ValidateAnswerSchema.parse(req.body);

      // Validation logic depends on exercise type
      let isCorrect = false;
      let feedback = '';
      let partialCredit = 0;

      // For spatial identification: validate click position
      if (data.exerciseType === 'spatial_identification') {
        const { clickX, clickY, annotationId } = data.userAnswer;

        // Get annotation bounding box
        const annotationQuery = `
          SELECT bounding_box, spanish_term, english_term
          FROM annotations
          WHERE id = $1
        `;
        const result = await pool.query(annotationQuery, [annotationId]);
        const annotation = result.rows[0];

        if (annotation) {
          const bbox = typeof annotation.bounding_box === 'string'
            ? JSON.parse(annotation.bounding_box)
            : annotation.bounding_box;

          // Check if click is within bounding box (with tolerance)
          const tolerance = 0.15; // 15% tolerance
          const inBox =
            clickX >= (bbox.x - tolerance) &&
            clickX <= (bbox.x + bbox.width + tolerance) &&
            clickY >= (bbox.y - tolerance) &&
            clickY <= (bbox.y + bbox.height + tolerance);

          isCorrect = inBox;
          feedback = inBox
            ? `¡Correcto! Has identificado ${annotation.spanish_term} correctamente.`
            : `No exactamente. ${annotation.spanish_term} está en otra parte del pájaro.`;

          // Calculate click accuracy
          if (inBox) {
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            const distance = Math.sqrt(
              Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
            );
            partialCredit = Math.max(0, 1 - distance);
          }
        }
      }

      // For comparative analysis: check selected image
      else if (data.exerciseType === 'comparative_analysis') {
        const { selectedImageId, correctImageId } = data.userAnswer;
        isCorrect = selectedImageId === correctImageId;
        feedback = isCorrect
          ? '¡Excelente! Has seleccionado la imagen correcta.'
          : 'Intenta de nuevo. Observa las características con más cuidado.';
      }

      // For annotation sequencing: check order
      else if (data.exerciseType === 'annotation_sequencing') {
        const { userOrder, correctOrder } = data.userAnswer;
        isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);

        // Calculate partial credit
        let correctPositions = 0;
        for (let i = 0; i < userOrder.length; i++) {
          if (userOrder[i] === correctOrder[i]) {
            correctPositions++;
          }
        }
        partialCredit = correctPositions / correctOrder.length;

        feedback = isCorrect
          ? '¡Perfecto! Has ordenado todas las partes correctamente.'
          : `Has acertado ${correctPositions} de ${correctOrder.length} posiciones. Intenta de nuevo.`;
      }

      // For category sorting: check categorization
      else if (data.exerciseType === 'category_sorting') {
        const { userCategories, correctCategories } = data.userAnswer;
        let correctAssignments = 0;
        let totalTerms = 0;

        for (const [termId, categoryId] of Object.entries(userCategories as Record<string, string>)) {
          totalTerms++;
          if (correctCategories[termId] === categoryId) {
            correctAssignments++;
          }
        }

        isCorrect = correctAssignments === totalTerms;
        partialCredit = correctAssignments / totalTerms;

        feedback = isCorrect
          ? '¡Excelente! Has categorizado todos los términos correctamente.'
          : `Has acertado ${correctAssignments} de ${totalTerms} términos. Revisa las categorías.`;
      }

      // Update mastery for all annotations involved
      const annotationIds = data.userAnswer.annotationIds || [data.userAnswer.annotationId];
      for (const annotationId of annotationIds) {
        if (annotationId) {
          await masteryService.updateMastery(
            data.userId,
            annotationId,
            isCorrect,
            data.timeTaken,
            data.sessionId
          );
        }
      }

      res.json({
        success: true,
        result: {
          isCorrect,
          partialCredit,
          feedback,
          timeTaken: data.timeTaken
        }
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: err.errors
        });
      }

      logError('Error validating exercise answer', err as Error);
      res.status(500).json({ error: 'Failed to validate answer' });
    }
  });

  /**
   * GET /api/enhanced-exercises/types
   * Get available enhanced exercise types
   */
  router.get('/types', async (req: Request, res: Response) => {
    res.json({
      success: true,
      exerciseTypes: [
        {
          id: 'spatial_identification',
          name: 'Identificación Espacial',
          description: 'Haz clic en la parte correcta del pájaro',
          usesAnnotations: true,
          difficulty: 'medium'
        },
        {
          id: 'comparative_analysis',
          name: 'Análisis Comparativo',
          description: 'Compara características entre diferentes pájaros',
          usesAnnotations: true,
          difficulty: 'medium'
        },
        {
          id: 'annotation_sequencing',
          name: 'Secuenciación',
          description: 'Ordena las partes del pájaro correctamente',
          usesAnnotations: true,
          difficulty: 'hard'
        },
        {
          id: 'category_sorting',
          name: 'Clasificación por Categorías',
          description: 'Agrupa términos por tipo',
          usesAnnotations: true,
          difficulty: 'easy'
        }
      ]
    });
  });

  return router;
}

export default createEnhancedExercisesRouter;
