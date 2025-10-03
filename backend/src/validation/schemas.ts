import { z } from 'zod';

/**
 * Validation schemas for all API endpoints using Zod
 * Provides type-safe validation with detailed error messages
 */

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const sessionIdSchema = z.string().min(1, 'Session ID is required').max(100);
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const timestampSchema = z.number().positive('Timestamp must be positive');

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// ============================================================================
// EXERCISE SCHEMAS
// ============================================================================

export const exerciseTypeEnum = z.enum([
  'visual_discrimination',
  'term_matching',
  'contextual_fill',
  'multiple_choice',
  'translation',
  'listening_comprehension'
], {
  errorMap: () => ({ message: 'Invalid exercise type' })
});

export const exerciseSessionStartSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const exerciseResultSchema = z.object({
  sessionId: sessionIdSchema,
  exerciseType: exerciseTypeEnum,
  annotationId: z.number().int().positive().optional(),
  spanishTerm: z.string().min(1, 'Spanish term is required').max(200),
  userAnswer: z.any(), // Can be string, number, array, etc.
  isCorrect: z.boolean(),
  timeTaken: z.number().positive('Time taken must be positive').max(3600000, 'Time taken seems unrealistic')
});

export const exerciseSessionProgressParamsSchema = z.object({
  sessionId: sessionIdSchema
});

export const exerciseSessionProgressSchema = exerciseSessionProgressParamsSchema;

// ============================================================================
// VOCABULARY SCHEMAS
// ============================================================================

export const vocabularyEnrichmentParamsSchema = z.object({
  term: z.string().min(1, 'Term is required').max(200)
});

export const vocabularyEnrichmentSchema = vocabularyEnrichmentParamsSchema;

export const vocabularyInteractionSchema = z.object({
  sessionId: sessionIdSchema,
  annotationId: z.number().int().positive('Annotation ID must be a positive integer'),
  spanishTerm: z.string().min(1, 'Spanish term is required').max(200),
  disclosureLevel: z.number().int().min(0, 'Disclosure level must be 0 or greater').max(5, 'Disclosure level cannot exceed 5')
});

export const vocabularySessionProgressParamsSchema = z.object({
  sessionId: sessionIdSchema
});

export const vocabularySessionProgressSchema = vocabularySessionProgressParamsSchema;

// ============================================================================
// ANNOTATION SCHEMAS
// ============================================================================

export const createAnnotationSchema = z.object({
  imageId: z.number().int().positive('Image ID must be a positive integer'),
  speciesId: z.number().int().positive('Species ID must be a positive integer').optional(),
  boundingBox: z.object({
    x: z.number().min(0, 'X coordinate must be non-negative').max(1, 'X coordinate must not exceed 1'),
    y: z.number().min(0, 'Y coordinate must be non-negative').max(1, 'Y coordinate must not exceed 1'),
    width: z.number().min(0, 'Width must be positive').max(1, 'Width must not exceed 1'),
    height: z.number().min(0, 'Height must be positive').max(1, 'Height must not exceed 1')
  }),
  bodyPart: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  pattern: z.string().max(100).optional(),
  spanishTerm: z.string().min(1, 'Spanish term is required').max(200),
  englishTranslation: z.string().min(1, 'English translation is required').max(200),
  etymology: z.string().max(500).optional(),
  mnemonic: z.string().max(500).optional()
});

export const updateAnnotationSchema = z.object({
  speciesId: z.number().int().positive().optional(),
  boundingBox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1)
  }).optional(),
  bodyPart: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  pattern: z.string().max(100).optional(),
  spanishTerm: z.string().max(200).optional(),
  englishTranslation: z.string().max(200).optional(),
  etymology: z.string().max(500).optional(),
  mnemonic: z.string().max(500).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================================================
// SPECIES SCHEMAS
// ============================================================================

export const createSpeciesSchema = z.object({
  commonName: z.string().min(1, 'Common name is required').max(200),
  scientificName: z.string().min(1, 'Scientific name is required').max(200),
  spanishName: z.string().max(200).optional(),
  family: z.string().max(100).optional(),
  habitat: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  conservationStatus: z.enum([
    'LC', // Least Concern
    'NT', // Near Threatened
    'VU', // Vulnerable
    'EN', // Endangered
    'CR', // Critically Endangered
    'EW', // Extinct in the Wild
    'EX'  // Extinct
  ]).optional()
});

export const updateSpeciesSchema = z.object({
  commonName: z.string().max(200).optional(),
  scientificName: z.string().max(200).optional(),
  spanishName: z.string().max(200).optional(),
  family: z.string().max(100).optional(),
  habitat: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  conservationStatus: z.enum(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================================================
// IMAGE SCHEMAS
// ============================================================================

export const uploadImageMetadataSchema = z.object({
  speciesId: z.number().int().positive().optional(),
  photographerName: z.string().max(200).optional(),
  location: z.string().max(300).optional(),
  dateTaken: z.string().datetime().optional(),
  license: z.enum(['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-NC-SA', 'All Rights Reserved']).optional(),
  sourceUrl: z.string().url().max(500).optional()
});

export const updateImageSchema = z.object({
  speciesId: z.number().int().positive().optional(),
  photographerName: z.string().max(200).optional(),
  location: z.string().max(300).optional(),
  dateTaken: z.string().datetime().optional(),
  license: z.enum(['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-NC-SA', 'All Rights Reserved']).optional(),
  sourceUrl: z.string().url().max(500).optional(),
  altText: z.string().max(500).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).pipe(z.number().int().positive().max(100)).optional()
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  ...paginationSchema.shape
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ExerciseResultInput = z.infer<typeof exerciseResultSchema>;
export type VocabularyInteractionInput = z.infer<typeof vocabularyInteractionSchema>;
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type CreateSpeciesInput = z.infer<typeof createSpeciesSchema>;
export type UploadImageMetadataInput = z.infer<typeof uploadImageMetadataSchema>;
