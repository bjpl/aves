/**
 * Admin Image Upload Routes
 *
 * CONCEPT: API endpoints for uploading and processing new images
 * WHY: Provides multi-file upload with image processing and quality validation
 * PATTERN: Multer file upload with Sharp processing, async quality checks
 *
 * Endpoints:
 * - POST /admin/images/upload - Upload and process multiple images
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../../database/connection';
import { ImageQualityValidator } from '../../../services/ImageQualityValidator';
import { optionalSupabaseAuth, optionalSupabaseAdmin } from '../../../middleware/optionalSupabaseAuth';
import { error as logError, info } from '../../../utils/logger';
import { upload, processAndSaveImage, adminRateLimiter } from './shared';

const router = Router();

/**
 * POST /admin/images/upload
 * Upload and process multiple images
 *
 * @auth Admin only
 * @rate-limited 1000 requests/hour
 *
 * Form data:
 * - files: Array of image files (max 20, 10MB each)
 * - speciesId: UUID of species for these images
 *
 * Response:
 * {
 *   "message": "Successfully uploaded 5 images",
 *   "uploaded": [...],
 *   "failed": [...],
 *   "summary": { "total": 5, "successful": 5, "failed": 0 }
 * }
 */
router.post(
  '/upload',
  optionalSupabaseAuth,
  optionalSupabaseAdmin,
  adminRateLimiter,
  upload.array('files', 20),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const { speciesId } = req.body;

      // Validate speciesId
      if (!speciesId) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'speciesId is required'
        });
        return;
      }

      // Validate species exists
      const speciesResult = await pool.query(
        'SELECT id, english_name, spanish_name FROM species WHERE id = $1',
        [speciesId]
      );

      if (speciesResult.rows.length === 0) {
        res.status(400).json({
          error: 'Invalid species',
          message: 'The specified speciesId does not exist'
        });
        return;
      }

      const speciesRow = speciesResult.rows[0];
      const speciesName = speciesRow.english_name;

      if (!files || files.length === 0) {
        res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select at least one image file to upload'
        });
        return;
      }

      info('Starting image upload', {
        fileCount: files.length,
        speciesId,
        speciesName,
        userId: req.user?.userId
      });

      const uploaded: Array<{
        id: string;
        url: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        originalName: string;
        qualityScore?: number;
      }> = [];
      const failed: Array<{ filename: string; error: string }> = [];

      // Initialize quality validator
      const qualityValidator = new ImageQualityValidator();

      // Process each file
      for (const file of files) {
        try {
          // Process and save the image
          const processed = await processAndSaveImage(file.buffer, file.originalname);

          // Insert into database (without quality_score initially)
          const insertResult = await pool.query(
            `INSERT INTO images (
              species_id, url, thumbnail_url, width, height,
              description, source_type, original_filename
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
              speciesId,
              processed.imagePath,
              processed.thumbnailPath,
              processed.width,
              processed.height,
              `${speciesName} - uploaded image`,
              'local_upload',
              file.originalname
            ]
          );

          const imageId = insertResult.rows[0].id;
          let qualityScore: number | undefined;

          // Run quality check if validator is configured
          if (qualityValidator.isConfigured()) {
            try {
              // Build full URL for quality check
              const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
              const fullImageUrl = `${baseUrl}${processed.imagePath}`;

              const analysis = await qualityValidator.analyzeImage(fullImageUrl);
              qualityScore = analysis.overallScore;

              // Update quality_score in database
              await pool.query(
                `UPDATE images SET quality_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [qualityScore, imageId]
              );

              info('Image quality assessed', {
                imageId,
                filename: file.originalname,
                qualityScore,
                passed: analysis.passed,
                category: analysis.category
              });

              // Log if quality is below annotation threshold
              if (qualityScore < 60) {
                const failedChecks = Object.entries(analysis.checks)
                  .filter(([_, check]) => !check.passed)
                  .map(([name, check]) => `${name}: ${check.reason}`)
                  .join(', ');

                info('Image quality below annotation threshold - skipping auto-annotation', {
                  imageId,
                  qualityScore,
                  failedChecks
                });
              }
            } catch (qualityError) {
              // Log error but don't fail the upload
              logError('Failed to assess image quality', qualityError as Error, {
                imageId,
                filename: file.originalname
              });
              // Set quality_score to NULL on error
              await pool.query(
                `UPDATE images SET quality_score = NULL WHERE id = $1`,
                [imageId]
              );
            }
          }

          uploaded.push({
            id: imageId,
            url: processed.imagePath,
            thumbnailUrl: processed.thumbnailPath,
            width: processed.width,
            height: processed.height,
            originalName: file.originalname,
            qualityScore
          });

        } catch (fileError) {
          logError('Failed to process uploaded file', fileError as Error, {
            filename: file.originalname
          });
          failed.push({
            filename: file.originalname,
            error: (fileError as Error).message
          });
        }
      }

      info('Image upload completed', {
        uploaded: uploaded.length,
        failed: failed.length,
        speciesId,
        userId: req.user?.userId
      });

      res.status(uploaded.length > 0 ? 201 : 400).json({
        message: uploaded.length > 0
          ? `Successfully uploaded ${uploaded.length} image${uploaded.length !== 1 ? 's' : ''}`
          : 'Failed to upload any images',
        uploaded,
        failed: failed.length > 0 ? failed : undefined,
        summary: {
          total: files.length,
          successful: uploaded.length,
          failed: failed.length
        }
      });

    } catch (err) {
      logError('Error uploading images', err as Error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

export default router;
