/**
 * AI Annotations Shared Utilities and Helpers
 * Common functions, validation schemas, and middleware used across AI annotation routes
 */

import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// ============================================================================
// Validation Schemas
// ============================================================================

export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1)
});

export const AnnotationItemSchema = z.object({
  spanishTerm: z.string().min(1).max(200),
  englishTerm: z.string().min(1).max(200),
  boundingBox: BoundingBoxSchema,
  type: z.enum(['anatomical', 'behavioral', 'color', 'pattern']),
  difficultyLevel: z.number().int().min(1).max(5),
  pronunciation: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

export const GenerateAnnotationsSchema = z.object({
  imageUrl: z.string().url()
});

export const ApproveAnnotationSchema = z.object({
  notes: z.string().optional()
});

export const RejectAnnotationSchema = z.object({
  category: z.string().optional(), // Rejection category (technical, pedagogical, etc.)
  notes: z.string().max(500).optional(), // Additional notes
  reason: z.string().min(1).max(500).optional() // Legacy field for backwards compatibility
}).refine(
  (data) => data.category || data.reason || data.notes,
  { message: "At least one of category, reason, or notes must be provided" }
);

export const EditAnnotationSchema = z.object({
  spanishTerm: z.string().min(1).max(200).optional(),
  englishTerm: z.string().min(1).max(200).optional(),
  boundingBox: BoundingBoxSchema.optional(),
  type: z.enum(['anatomical', 'behavioral', 'color', 'pattern']).optional(),
  difficultyLevel: z.number().int().min(1).max(5).optional(),
  pronunciation: z.string().optional(),
  notes: z.string().optional()
});

export const BulkApproveSchema = z.object({
  jobIds: z.array(z.string()),
  notes: z.string().optional()
});

export const ImageIdParamSchema = z.object({
  imageId: z.string().uuid()
});

export const JobIdParamSchema = z.object({
  jobId: z.string()
});

export const AnnotationIdParamSchema = z.object({
  annotationId: z.string().uuid()
});

// ============================================================================
// Rate Limiters
// ============================================================================

/**
 * Rate limiter for AI generation endpoints (expensive operations)
 * 500 requests per hour for heavy annotation review workflows
 */
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // Increased to 500 for heavy annotation review workflows
  message: { error: 'Too many AI generation requests. Please try again later.' },
  validate: { trustProxy: false } // Disable trust proxy validation (handled at infrastructure level)
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert legacy bounding box format {topLeft, bottomRight} to standard {x, y, width, height}
 */
export function normalizeBoundingBox(bbox: any): any {
  if (bbox && bbox.topLeft) {
    return {
      x: bbox.topLeft.x,
      y: bbox.topLeft.y,
      width: bbox.bottomRight.x - bbox.topLeft.x,
      height: bbox.bottomRight.y - bbox.topLeft.y
    };
  }
  return bbox;
}
