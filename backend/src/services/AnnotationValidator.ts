/**
 * Annotation Quality Validator
 * Validates AI-generated annotations for quality, accuracy, and completeness
 */

import { info, warn, error as logError } from '../utils/logger';
import { AIAnnotation, BoundingBox } from './VisionAIService';

export interface ValidationMetrics {
  totalAnnotations: number;
  validAnnotations: number;
  rejectedAnnotations: number;
  duplicatesRemoved: number;
  lowConfidenceCount: number;
  invalidBoundingBoxes: number;
  missingAnatomicalFeatures: string[];
  averageConfidence: number;
  validationTimestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  annotations: AIAnnotation[];
  metrics: ValidationMetrics;
  errors: string[];
  warnings: string[];
}

export interface AnnotationValidatorConfig {
  minConfidence: number;
  maxDuplicateDistance: number;
  requiredAnatomicalFeatures: string[];
  minBoundingBoxSize: number;
  maxBoundingBoxSize: number;
  validateSpanishTerms: boolean;
  validateEnglishTerms: boolean;
  minAnnotationsPerImage: number;
  maxAnnotationsPerImage: number;
}

/**
 * Default configuration for annotation validation
 */
const DEFAULT_CONFIG: AnnotationValidatorConfig = {
  minConfidence: 0.7,
  maxDuplicateDistance: 0.05, // 5% overlap threshold
  requiredAnatomicalFeatures: [], // Optional: specific features required
  minBoundingBoxSize: 0.01, // 1% of image
  maxBoundingBoxSize: 0.8, // 80% of image
  validateSpanishTerms: true,
  validateEnglishTerms: true,
  minAnnotationsPerImage: 3,
  maxAnnotationsPerImage: 15
};

/**
 * Known valid Spanish anatomical terms
 */
const VALID_SPANISH_TERMS = new Set([
  'el pico', 'la cabeza', 'las alas', 'el ala', 'la cola',
  'las patas', 'la pata', 'las plumas', 'la pluma', 'los ojos',
  'el ojo', 'el cuello', 'el pecho', 'el cuerpo', 'las garras',
  'la garra', 'el lomo', 'el vientre', 'las patas', 'la cresta',
  'el copete', 'las cejas', 'la mejilla', 'la garganta', 'el flanco',
  'el rabadilla', 'las coberteras', 'las primarias', 'las secundarias',
  'el tarso', 'los dedos'
]);

/**
 * Known valid English anatomical terms
 */
const VALID_ENGLISH_TERMS = new Set([
  'beak', 'bill', 'head', 'wings', 'wing', 'tail', 'legs', 'leg',
  'feathers', 'feather', 'eyes', 'eye', 'neck', 'breast', 'body',
  'talons', 'talon', 'back', 'belly', 'feet', 'foot', 'crest',
  'crown', 'eyebrow', 'cheek', 'throat', 'flank', 'rump',
  'coverts', 'primaries', 'secondaries', 'tarsus', 'toes', 'toe',
  'nape', 'mantle', 'chest'
]);

/**
 * Annotation Quality Validator
 */
export class AnnotationValidator {
  private config: AnnotationValidatorConfig;

  constructor(config: Partial<AnnotationValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate a set of annotations
   * @param annotations - Array of AI-generated annotations
   * @returns ValidationResult with validated annotations and metrics
   */
  async validate(annotations: AIAnnotation[]): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    info('Starting annotation validation', {
      annotationCount: annotations.length,
      config: this.config
    });

    // Initialize metrics
    const metrics: ValidationMetrics = {
      totalAnnotations: annotations.length,
      validAnnotations: 0,
      rejectedAnnotations: 0,
      duplicatesRemoved: 0,
      lowConfidenceCount: 0,
      invalidBoundingBoxes: 0,
      missingAnatomicalFeatures: [],
      averageConfidence: 0,
      validationTimestamp: new Date()
    };

    // Step 1: Basic count validation
    if (annotations.length < this.config.minAnnotationsPerImage) {
      errors.push(
        `Insufficient annotations: ${annotations.length} < ${this.config.minAnnotationsPerImage}`
      );
    }

    if (annotations.length > this.config.maxAnnotationsPerImage) {
      warnings.push(
        `Too many annotations: ${annotations.length} > ${this.config.maxAnnotationsPerImage}. Will trim.`
      );
    }

    // Step 2: Filter and validate each annotation
    let validatedAnnotations: AIAnnotation[] = [];

    for (const annotation of annotations) {
      const annotationErrors: string[] = [];

      // Confidence threshold validation
      if (!this.validateConfidence(annotation, annotationErrors)) {
        metrics.lowConfidenceCount++;
      }

      // Bounding box validation
      if (!this.validateBoundingBox(annotation.boundingBox, annotationErrors)) {
        metrics.invalidBoundingBoxes++;
      }

      // Spanish term validation
      if (
        this.config.validateSpanishTerms &&
        !this.validateSpanishTerm(annotation.spanishTerm, annotationErrors)
      ) {
        // Term validation failed
      }

      // English term validation
      if (
        this.config.validateEnglishTerms &&
        !this.validateEnglishTerm(annotation.englishTerm, annotationErrors)
      ) {
        // Term validation failed
      }

      // If no errors, add to validated list
      if (annotationErrors.length === 0) {
        validatedAnnotations.push(annotation);
      } else {
        metrics.rejectedAnnotations++;
        errors.push(
          `Annotation rejected (${annotation.spanishTerm}): ${annotationErrors.join(', ')}`
        );
      }
    }

    // Step 3: Remove duplicates
    const beforeDuplicateRemoval = validatedAnnotations.length;
    validatedAnnotations = this.removeDuplicates(validatedAnnotations);
    metrics.duplicatesRemoved = beforeDuplicateRemoval - validatedAnnotations.length;

    if (metrics.duplicatesRemoved > 0) {
      info('Removed duplicate annotations', { count: metrics.duplicatesRemoved });
    }

    // Step 4: Validate anatomical feature coverage
    const missingFeatures = this.validateAnatomicalCoverage(validatedAnnotations);
    metrics.missingAnatomicalFeatures = missingFeatures;

    if (missingFeatures.length > 0) {
      warnings.push(`Missing recommended features: ${missingFeatures.join(', ')}`);
    }

    // Step 5: Calculate metrics
    metrics.validAnnotations = validatedAnnotations.length;
    metrics.averageConfidence = this.calculateAverageConfidence(validatedAnnotations);

    // Step 6: Trim to max if needed
    if (validatedAnnotations.length > this.config.maxAnnotationsPerImage) {
      // Sort by confidence and keep top N
      validatedAnnotations = validatedAnnotations
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, this.config.maxAnnotationsPerImage);

      warnings.push(
        `Trimmed to ${this.config.maxAnnotationsPerImage} highest confidence annotations`
      );
    }

    // Final validation result
    const valid =
      validatedAnnotations.length >= this.config.minAnnotationsPerImage &&
      errors.filter(e => e.includes('rejected')).length < annotations.length * 0.5; // At least 50% valid

    const validationTime = Date.now() - startTime;

    info('Annotation validation completed', {
      valid,
      validAnnotations: metrics.validAnnotations,
      rejectedAnnotations: metrics.rejectedAnnotations,
      duplicatesRemoved: metrics.duplicatesRemoved,
      averageConfidence: metrics.averageConfidence.toFixed(3),
      validationTimeMs: validationTime
    });

    if (warnings.length > 0) {
      warnings.forEach(warning => warn(warning));
    }

    if (errors.length > 0) {
      errors.forEach(error => logError('Validation error: ' + error, new Error(error)));
    }

    return {
      valid,
      annotations: validatedAnnotations,
      metrics,
      errors,
      warnings
    };
  }

  /**
   * Validate confidence threshold
   */
  private validateConfidence(annotation: AIAnnotation, errors: string[]): boolean {
    const confidence = annotation.confidence || 0;

    if (confidence < this.config.minConfidence) {
      errors.push(
        `Low confidence: ${confidence.toFixed(2)} < ${this.config.minConfidence}`
      );
      return false;
    }

    if (confidence < 0 || confidence > 1) {
      errors.push(`Invalid confidence value: ${confidence} (must be 0-1)`);
      return false;
    }

    return true;
  }

  /**
   * Validate bounding box sanity checks
   */
  private validateBoundingBox(bbox: BoundingBox, errors: string[]): boolean {
    let isValid = true;

    // Check coordinates are in valid range (0-1)
    if (bbox.x < 0 || bbox.x > 1) {
      errors.push(`Invalid x coordinate: ${bbox.x} (must be 0-1)`);
      isValid = false;
    }

    if (bbox.y < 0 || bbox.y > 1) {
      errors.push(`Invalid y coordinate: ${bbox.y} (must be 0-1)`);
      isValid = false;
    }

    if (bbox.width < 0 || bbox.width > 1) {
      errors.push(`Invalid width: ${bbox.width} (must be 0-1)`);
      isValid = false;
    }

    if (bbox.height < 0 || bbox.height > 1) {
      errors.push(`Invalid height: ${bbox.height} (must be 0-1)`);
      isValid = false;
    }

    // Check bounding box doesn't extend beyond image bounds
    if (bbox.x + bbox.width > 1.01) {
      // 1% tolerance
      errors.push(`Bounding box extends beyond image width`);
      isValid = false;
    }

    if (bbox.y + bbox.height > 1.01) {
      errors.push(`Bounding box extends beyond image height`);
      isValid = false;
    }

    // Check bounding box size is reasonable
    const area = bbox.width * bbox.height;

    if (area < this.config.minBoundingBoxSize) {
      errors.push(
        `Bounding box too small: ${(area * 100).toFixed(2)}% < ${this.config.minBoundingBoxSize * 100}%`
      );
      isValid = false;
    }

    if (area > this.config.maxBoundingBoxSize) {
      errors.push(
        `Bounding box too large: ${(area * 100).toFixed(2)}% > ${this.config.maxBoundingBoxSize * 100}%`
      );
      isValid = false;
    }

    // Check aspect ratio is reasonable (not too elongated)
    const aspectRatio = bbox.width / bbox.height;
    if (aspectRatio < 0.1 || aspectRatio > 10) {
      errors.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
      // Warning only, not invalid
    }

    return isValid;
  }

  /**
   * Validate Spanish term
   */
  private validateSpanishTerm(term: string, errors: string[]): boolean {
    if (!term || term.trim().length === 0) {
      errors.push('Spanish term is empty');
      return false;
    }

    const normalizedTerm = term.toLowerCase().trim();

    // Check if it's a known valid term (with some flexibility)
    const isKnownTerm = VALID_SPANISH_TERMS.has(normalizedTerm);

    if (!isKnownTerm) {
      // Check if it contains a known term (e.g., "las plumas del ala" contains "las plumas")
      const containsKnownTerm = Array.from(VALID_SPANISH_TERMS).some(validTerm =>
        normalizedTerm.includes(validTerm)
      );

      if (!containsKnownTerm) {
        errors.push(`Unknown Spanish term: "${term}"`);
        return false;
      }
    }

    // Check for proper Spanish article usage
    if (!this.hasSpanishArticle(normalizedTerm)) {
      // This is a warning, not an error
      // Some terms might be valid without articles
    }

    return true;
  }

  /**
   * Validate English term
   */
  private validateEnglishTerm(term: string, errors: string[]): boolean {
    if (!term || term.trim().length === 0) {
      errors.push('English term is empty');
      return false;
    }

    const normalizedTerm = term.toLowerCase().trim();

    // Check if it's a known valid term
    const isKnownTerm = VALID_ENGLISH_TERMS.has(normalizedTerm);

    if (!isKnownTerm) {
      // Check if it contains a known term
      const containsKnownTerm = Array.from(VALID_ENGLISH_TERMS).some(validTerm =>
        normalizedTerm.includes(validTerm)
      );

      if (!containsKnownTerm) {
        errors.push(`Unknown English term: "${term}"`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if Spanish term has proper article
   */
  private hasSpanishArticle(term: string): boolean {
    const articles = ['el ', 'la ', 'los ', 'las '];
    return articles.some(article => term.startsWith(article));
  }

  /**
   * Remove duplicate annotations based on spatial overlap
   */
  private removeDuplicates(annotations: AIAnnotation[]): AIAnnotation[] {
    const filtered: AIAnnotation[] = [];

    for (const annotation of annotations) {
      const isDuplicate = filtered.some(existing => {
        // Check if same term
        if (existing.spanishTerm === annotation.spanishTerm) {
          // Check spatial overlap
          const overlap = this.calculateBoundingBoxOverlap(
            existing.boundingBox,
            annotation.boundingBox
          );

          return overlap > this.config.maxDuplicateDistance;
        }
        return false;
      });

      if (!isDuplicate) {
        filtered.push(annotation);
      } else {
        // Keep the one with higher confidence
        const existingIndex = filtered.findIndex(
          e =>
            e.spanishTerm === annotation.spanishTerm &&
            this.calculateBoundingBoxOverlap(e.boundingBox, annotation.boundingBox) >
              this.config.maxDuplicateDistance
        );

        if (existingIndex !== -1) {
          const existing = filtered[existingIndex];
          if ((annotation.confidence || 0) > (existing.confidence || 0)) {
            filtered[existingIndex] = annotation;
          }
        }
      }
    }

    return filtered;
  }

  /**
   * Calculate overlap between two bounding boxes (Intersection over Union)
   */
  private calculateBoundingBoxOverlap(bbox1: BoundingBox, bbox2: BoundingBox): number {
    // Calculate intersection
    const x1 = Math.max(bbox1.x, bbox2.x);
    const y1 = Math.max(bbox1.y, bbox2.y);
    const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
    const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

    const intersectionWidth = Math.max(0, x2 - x1);
    const intersectionHeight = Math.max(0, y2 - y1);
    const intersectionArea = intersectionWidth * intersectionHeight;

    // Calculate union
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    const unionArea = area1 + area2 - intersectionArea;

    // Return IoU (Intersection over Union)
    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Validate anatomical feature coverage
   */
  private validateAnatomicalCoverage(annotations: AIAnnotation[]): string[] {
    // Core anatomical features that should ideally be present
    const coreFeatures = ['pico', 'alas', 'cola', 'cabeza'];

    const presentFeatures = new Set(
      annotations.map(a => a.spanishTerm.toLowerCase().replace(/^(el|la|los|las)\s+/, ''))
    );

    const missingFeatures = coreFeatures.filter(feature => {
      return !Array.from(presentFeatures).some(present => present.includes(feature));
    });

    return missingFeatures;
  }

  /**
   * Calculate average confidence across annotations
   */
  private calculateAverageConfidence(annotations: AIAnnotation[]): number {
    if (annotations.length === 0) return 0;

    const totalConfidence = annotations.reduce(
      (sum, annotation) => sum + (annotation.confidence || 0),
      0
    );

    return totalConfidence / annotations.length;
  }

  /**
   * Update validator configuration
   */
  updateConfig(config: Partial<AnnotationValidatorConfig>): void {
    this.config = { ...this.config, ...config };
    info('Annotation validator configuration updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): AnnotationValidatorConfig {
    return { ...this.config };
  }
}

// Export singleton instance with default config
export const annotationValidator = new AnnotationValidator();
