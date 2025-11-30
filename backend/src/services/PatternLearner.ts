/**
 * Pattern Learning Service
 * Implements memory-based pattern learning to improve annotation quality over time
 * Uses ML techniques to track successful patterns and optimize prompts
 */

import { info, error as logError } from '../utils/logger';
import { AIAnnotation } from './VisionAIService';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

// Initialize Supabase client for storage
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Learned pattern for a specific feature or species
 */
export interface LearnedPattern {
  id: string;
  featureType: string; // e.g., "pico", "alas", "cola"
  speciesContext?: string; // Species name if species-specific
  successfulPrompts: string[]; // Prompts that worked well
  commonBoundingBoxes: BoundingBoxPattern[]; // Common positions for this feature
  averageConfidence: number;
  observationCount: number;
  lastUpdated: Date;
  metadata: {
    avgDifficultyLevel?: number;
    commonPronunciations?: string[];
    relatedFeatures?: string[];
    imageCharacteristics?: string[]; // e.g., "profile view", "flying", "perched"
  };
}

/**
 * Bounding box pattern with statistical data
 */
export interface BoundingBoxPattern {
  center: { x: number; y: number }; // Mean center point
  size: { width: number; height: number }; // Mean size
  variance: { x: number; y: number; width: number; height: number }; // Variance for each dimension
  sampleSize: number; // Number of observations
}

/**
 * Position correction data for learning
 */
export interface PositionCorrection {
  feature: string;
  species: string;
  originalBox: { x: number; y: number; width: number; height: number };
  correctedBox: { x: number; y: number; width: number; height: number };
  delta: { dx: number; dy: number; dwidth: number; dheight: number };
  timestamp: Date;
  reviewerId: string;
}

/**
 * Rejection pattern tracking
 */
export interface RejectionPattern {
  feature: string;
  species: string;
  reason: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  timestamp: Date;
  count: number;
}

/**
 * Feature statistics for a species
 */
export interface SpeciesFeatureStats {
  species: string;
  features: Map<string, FeatureStats>;
  totalAnnotations: number;
  lastUpdated: Date;
}

export interface FeatureStats {
  featureName: string; // e.g., "el pico"
  occurrenceRate: number; // 0-1, how often this feature appears
  avgConfidence: number;
  avgDifficultyLevel: number;
  boundingBoxPatterns: BoundingBoxPattern[];
}

/**
 * Annotation quality metrics
 */
export interface QualityMetrics {
  confidence: number;
  boundingBoxQuality: number; // Based on variance from learned patterns
  promptEffectiveness: number; // Based on historical success
  overallQuality: number; // Composite score
}

/**
 * Pattern Learning Service
 * Self-improving system that learns from successful annotations
 */
export class PatternLearner {
  private patterns: Map<string, LearnedPattern> = new Map();
  private speciesStats: Map<string, SpeciesFeatureStats> = new Map();
  private positionCorrections: Map<string, PositionCorrection[]> = new Map();
  private rejectionPatterns: Map<string, RejectionPattern[]> = new Map();
  private memoryNamespace = 'pattern-learning';
  private sessionId = `swarm-pattern-learning-${Date.now()}`;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  // ML hyperparameters
  private readonly CONFIDENCE_THRESHOLD = 0.75; // Only learn from high-confidence annotations
  private readonly MIN_SAMPLES_FOR_PATTERN = 3; // Minimum samples before considering a pattern
  private readonly PATTERN_DECAY_FACTOR = 0.95; // Exponential decay for old patterns
  private readonly MAX_PROMPT_HISTORY = 10; // Keep top N successful prompts
  private readonly APPROVAL_CONFIDENCE_BOOST = 0.05; // Boost confidence on approval
  private readonly REJECTION_CONFIDENCE_PENALTY = 0.1; // Reduce confidence on rejection
  private readonly CORRECTION_WEIGHT = 1.5; // Weight corrections higher than initial observations

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Ensure initialization is complete before using
   */
  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize the pattern learner and restore session
   */
  private async initialize(): Promise<void> {
    try {
      info('Initializing Pattern Learning Service');

      // Restore previous session data from file storage
      await this.restoreSession();

      this.isInitialized = true;

      info('Pattern Learning Service initialized', {
        patternsLoaded: this.patterns.size,
        speciesTracked: this.speciesStats.size
      });
    } catch (error) {
      logError('Failed to initialize Pattern Learning Service', error as Error);
      this.isInitialized = true; // Mark as initialized even if restore failed
    }
  }

  /**
   * Learn from a batch of successful annotations
   */
  async learnFromAnnotations(
    annotations: AIAnnotation[],
    imageMetadata: {
      species?: string;
      imageCharacteristics?: string[];
      prompt?: string;
    }
  ): Promise<void> {
    try {
      // Filter high-confidence annotations
      const highConfidenceAnnotations = annotations.filter(
        ann => (ann.confidence || 0) >= this.CONFIDENCE_THRESHOLD
      );

      if (highConfidenceAnnotations.length === 0) {
        info('No high-confidence annotations to learn from');
        return;
      }

      info('Learning from annotations', {
        total: annotations.length,
        highConfidence: highConfidenceAnnotations.length,
        species: imageMetadata.species
      });

      // Update feature patterns
      for (const annotation of highConfidenceAnnotations) {
        await this.updateFeaturePattern(annotation, imageMetadata);
      }

      // Update species-specific statistics
      if (imageMetadata.species) {
        await this.updateSpeciesStats(
          imageMetadata.species,
          highConfidenceAnnotations
        );
      }

      // Store prompt effectiveness if provided
      if (imageMetadata.prompt) {
        await this.trackPromptSuccess(
          imageMetadata.prompt,
          highConfidenceAnnotations,
          imageMetadata.species
        );
      }

      // Persist patterns to memory
      await this.persistPatterns();

    } catch (error) {
      logError('Failed to learn from annotations', error as Error);
    }
  }

  /**
   * Update pattern for a specific feature
   */
  private async updateFeaturePattern(
    annotation: AIAnnotation,
    metadata: { species?: string; imageCharacteristics?: string[]; prompt?: string }
  ): Promise<void> {
    const featureKey = this.getFeatureKey(
      annotation.spanishTerm,
      metadata.species
    );

    let pattern = this.patterns.get(featureKey);

    if (!pattern) {
      // Create new pattern
      pattern = {
        id: featureKey,
        featureType: annotation.spanishTerm,
        speciesContext: metadata.species,
        successfulPrompts: [],
        commonBoundingBoxes: [],
        averageConfidence: annotation.confidence || 0.8,
        observationCount: 0,
        lastUpdated: new Date(),
        metadata: {
          avgDifficultyLevel: annotation.difficultyLevel,
          commonPronunciations: annotation.pronunciation ? [annotation.pronunciation] : [],
          relatedFeatures: [],
          imageCharacteristics: metadata.imageCharacteristics || []
        }
      };
    }

    // Update bounding box patterns using incremental statistics (if bounding box exists)
    if (annotation.boundingBox) {
      pattern.commonBoundingBoxes = this.updateBoundingBoxPattern(
        pattern.commonBoundingBoxes,
        annotation.boundingBox
      );
    }

    // Update running averages
    const n = pattern.observationCount;
    pattern.averageConfidence = this.updateRunningAverage(
      pattern.averageConfidence,
      annotation.confidence || 0.8,
      n
    );

    pattern.metadata.avgDifficultyLevel = this.updateRunningAverage(
      pattern.metadata.avgDifficultyLevel || 0,
      annotation.difficultyLevel,
      n
    );

    pattern.observationCount++;
    pattern.lastUpdated = new Date();

    // Update pronunciation patterns
    if (annotation.pronunciation && pattern.metadata.commonPronunciations) {
      if (!pattern.metadata.commonPronunciations.includes(annotation.pronunciation)) {
        pattern.metadata.commonPronunciations.push(annotation.pronunciation);
      }
    }

    this.patterns.set(featureKey, pattern);
  }

  /**
   * Update bounding box pattern using incremental mean and variance
   */
  private updateBoundingBoxPattern(
    existingPatterns: BoundingBoxPattern[],
    newBox: { x: number; y: number; width: number; height: number }
  ): BoundingBoxPattern[] {
    if (existingPatterns.length === 0) {
      // First observation
      return [{
        center: { x: newBox.x + newBox.width / 2, y: newBox.y + newBox.height / 2 },
        size: { width: newBox.width, height: newBox.height },
        variance: { x: 0, y: 0, width: 0, height: 0 },
        sampleSize: 1
      }];
    }

    // Use incremental formulas for mean and variance (Welford's algorithm)
    const pattern = existingPatterns[0];
    const n = pattern.sampleSize;
    const newN = n + 1;

    const newCenterX = newBox.x + newBox.width / 2;
    const newCenterY = newBox.y + newBox.height / 2;

    // Update mean
    const deltaX = newCenterX - pattern.center.x;
    const deltaY = newCenterY - pattern.center.y;
    const deltaWidth = newBox.width - pattern.size.width;
    const deltaHeight = newBox.height - pattern.size.height;

    const meanX = pattern.center.x + deltaX / newN;
    const meanY = pattern.center.y + deltaY / newN;
    const meanWidth = pattern.size.width + deltaWidth / newN;
    const meanHeight = pattern.size.height + deltaHeight / newN;

    // Update variance (Welford's online algorithm)
    const delta2X = newCenterX - meanX;
    const delta2Y = newCenterY - meanY;
    const delta2Width = newBox.width - meanWidth;
    const delta2Height = newBox.height - meanHeight;

    const varianceX = (pattern.variance.x * n + deltaX * delta2X) / newN;
    const varianceY = (pattern.variance.y * n + deltaY * delta2Y) / newN;
    const varianceWidth = (pattern.variance.width * n + deltaWidth * delta2Width) / newN;
    const varianceHeight = (pattern.variance.height * n + deltaHeight * delta2Height) / newN;

    return [{
      center: { x: meanX, y: meanY },
      size: { width: meanWidth, height: meanHeight },
      variance: { x: varianceX, y: varianceY, width: varianceWidth, height: varianceHeight },
      sampleSize: newN
    }];
  }

  /**
   * Update running average using incremental formula
   */
  private updateRunningAverage(
    currentAvg: number,
    newValue: number,
    sampleCount: number
  ): number {
    return (currentAvg * sampleCount + newValue) / (sampleCount + 1);
  }

  /**
   * Update species-specific feature statistics
   */
  private async updateSpeciesStats(
    species: string,
    annotations: AIAnnotation[]
  ): Promise<void> {
    let stats = this.speciesStats.get(species);

    if (!stats) {
      stats = {
        species,
        features: new Map(),
        totalAnnotations: 0,
        lastUpdated: new Date()
      };
    }

    for (const annotation of annotations) {
      const featureName = annotation.spanishTerm;
      let featureStats = stats.features.get(featureName);

      if (!featureStats) {
        featureStats = {
          featureName,
          occurrenceRate: 0,
          avgConfidence: 0,
          avgDifficultyLevel: 0,
          boundingBoxPatterns: []
        };
      }

      const n = featureStats.boundingBoxPatterns[0]?.sampleSize || 0;

      featureStats.avgConfidence = this.updateRunningAverage(
        featureStats.avgConfidence,
        annotation.confidence || 0.8,
        n
      );

      featureStats.avgDifficultyLevel = this.updateRunningAverage(
        featureStats.avgDifficultyLevel,
        annotation.difficultyLevel,
        n
      );

      if (annotation.boundingBox) {
        featureStats.boundingBoxPatterns = this.updateBoundingBoxPattern(
          featureStats.boundingBoxPatterns,
          annotation.boundingBox
        );
      }

      stats.features.set(featureName, featureStats);
    }

    stats.totalAnnotations += annotations.length;
    stats.lastUpdated = new Date();

    // Calculate occurrence rates
    stats.features.forEach(feature => {
      feature.occurrenceRate = (feature.boundingBoxPatterns[0]?.sampleSize || 0) / stats!.totalAnnotations;
    });

    this.speciesStats.set(species, stats);
  }

  /**
   * Track prompt success for future optimization
   */
  private async trackPromptSuccess(
    prompt: string,
    annotations: AIAnnotation[],
    species?: string
  ): Promise<void> {
    // Calculate prompt effectiveness score
    const avgConfidence = annotations.reduce((sum, ann) => sum + (ann.confidence || 0.8), 0) / annotations.length;
    const annotationCount = annotations.length;
    const effectiveness = avgConfidence * Math.min(annotationCount / 5, 1); // Normalize to 5 annotations

    // Store in memory for future retrieval
    const promptKey = `prompt-success-${species || 'general'}-${Date.now()}`;
    await this.storeInMemory(promptKey, {
      prompt,
      effectiveness,
      avgConfidence,
      annotationCount,
      species,
      timestamp: new Date()
    });

    info('Tracked prompt success', { effectiveness, species });
  }

  /**
   * Enhance prompt based on learned patterns
   * Now includes correction-based adjustments
   */
  async enhancePrompt(
    basePrompt: string,
    context: {
      species?: string;
      targetFeatures?: string[];
      imageCharacteristics?: string[];
    }
  ): Promise<string> {
    try {
      let enhancedPrompt = basePrompt;

      // Add species-specific guidance
      if (context.species) {
        const speciesStats = this.speciesStats.get(context.species);
        if (speciesStats && speciesStats.features.size >= this.MIN_SAMPLES_FOR_PATTERN) {
          enhancedPrompt = this.addSpeciesGuidance(enhancedPrompt, speciesStats);
        }
      }

      // Add feature-specific guidance
      if (context.targetFeatures && context.targetFeatures.length > 0) {
        enhancedPrompt = this.addFeatureGuidance(enhancedPrompt, context.targetFeatures, context.species);
      }

      // Add correction-based adjustments
      if (context.species && context.targetFeatures && context.targetFeatures.length > 0) {
        enhancedPrompt = await this.addCorrectionGuidance(
          enhancedPrompt,
          context.species,
          context.targetFeatures
        );
      }

      // Add rejection warnings
      if (context.species && context.targetFeatures && context.targetFeatures.length > 0) {
        enhancedPrompt = this.addRejectionWarnings(
          enhancedPrompt,
          context.species,
          context.targetFeatures
        );
      }

      // Add learned bounding box hints
      enhancedPrompt = this.addBoundingBoxHints(enhancedPrompt, context);

      info('Enhanced prompt with learned patterns', {
        species: context.species,
        featureCount: context.targetFeatures?.length || 0
      });

      return enhancedPrompt;

    } catch (error) {
      logError('Failed to enhance prompt', error as Error);
      return basePrompt;
    }
  }

  /**
   * Add correction-based guidance to prompt
   */
  private async addCorrectionGuidance(
    prompt: string,
    species: string,
    targetFeatures: string[]
  ): Promise<string> {
    const adjustedFeatures = await this.getPositionAdjustedFeatures(species, targetFeatures);
    const featuresWithCorrections = adjustedFeatures.filter(
      f => f.adjustedBoundingBox && f.basedOnCorrections >= this.MIN_SAMPLES_FOR_PATTERN
    );

    if (featuresWithCorrections.length === 0) {
      return prompt;
    }

    const correctionHints = featuresWithCorrections.map(f => {
      const delta = f.adjustedBoundingBox!;
      return `- ${f.feature}: Adjust position by (${delta.dx.toFixed(1)}, ${delta.dy.toFixed(1)}) ` +
        `and size by (${delta.dwidth.toFixed(1)}, ${delta.dheight.toFixed(1)}) ` +
        `[Based on ${f.basedOnCorrections} user corrections]`;
    });

    const guidance = `\n\nCORRECTION-BASED ADJUSTMENTS:
${correctionHints.join('\n')}
Note: These adjustments are learned from expert corrections`;

    return prompt + guidance;
  }

  /**
   * Add rejection warnings to prompt
   */
  private addRejectionWarnings(
    prompt: string,
    species: string,
    targetFeatures: string[]
  ): string {
    const warnings: string[] = [];

    for (const feature of targetFeatures) {
      const rejectionKey = `${species}:${feature}`;
      const rejections = this.rejectionPatterns.get(rejectionKey) || [];

      const commonRejections = rejections
        .filter(r => r.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (commonRejections.length > 0) {
        const reasons = commonRejections.map(r => `"${r.reason}" (${r.count}x)`).join(', ');
        warnings.push(`- ${feature}: Avoid patterns that caused: ${reasons}`);
      }
    }

    if (warnings.length === 0) {
      return prompt;
    }

    const guidance = `\n\nCOMMON REJECTION PATTERNS TO AVOID:
${warnings.join('\n')}
Note: Learn from past mistakes to improve accuracy`;

    return prompt + guidance;
  }

  /**
   * Add species-specific guidance to prompt
   */
  private addSpeciesGuidance(prompt: string, stats: SpeciesFeatureStats): string {
    const topFeatures = Array.from(stats.features.values())
      .sort((a, b) => b.occurrenceRate - a.occurrenceRate)
      .slice(0, 5)
      .map(f => f.featureName);

    const guidance = `\n\nSPECIES-SPECIFIC GUIDANCE for ${stats.species}:
- Common features to prioritize: ${topFeatures.join(', ')}
- Based on ${stats.totalAnnotations} previous annotations
- Focus on features with high occurrence rates`;

    return prompt + guidance;
  }

  /**
   * Add feature-specific guidance to prompt
   */
  private addFeatureGuidance(
    prompt: string,
    targetFeatures: string[],
    species?: string
  ): string {
    const featureHints: string[] = [];

    for (const feature of targetFeatures) {
      const patternKey = this.getFeatureKey(feature, species);
      const pattern = this.patterns.get(patternKey);

      if (pattern && pattern.observationCount >= this.MIN_SAMPLES_FOR_PATTERN) {
        const bbox = pattern.commonBoundingBoxes[0];
        if (bbox) {
          featureHints.push(
            `- ${feature}: typically centered at (${bbox.center.x.toFixed(2)}, ${bbox.center.y.toFixed(2)}) ` +
            `with size ${bbox.size.width.toFixed(2)}x${bbox.size.height.toFixed(2)}`
          );
        }
      }
    }

    if (featureHints.length > 0) {
      const guidance = `\n\nLEARNED FEATURE PATTERNS:
${featureHints.join('\n')}
Note: Use these as reference points, not strict requirements`;
      return prompt + guidance;
    }

    return prompt;
  }

  /**
   * Add bounding box hints based on learned patterns
   */
  private addBoundingBoxHints(
    prompt: string,
    context: { species?: string; targetFeatures?: string[] }
  ): string {
    // This is already covered in addFeatureGuidance
    return prompt;
  }

  /**
   * Evaluate annotation quality based on learned patterns
   */
  async evaluateAnnotationQuality(
    annotation: AIAnnotation,
    species?: string
  ): Promise<QualityMetrics> {
    const patternKey = this.getFeatureKey(annotation.spanishTerm, species);
    const pattern = this.patterns.get(patternKey);

    const confidence = annotation.confidence || 0.8;
    let boundingBoxQuality = 0.7; // Default if no pattern exists
    let promptEffectiveness = 0.7; // Default

    if (pattern && pattern.observationCount >= this.MIN_SAMPLES_FOR_PATTERN) {
      // Calculate bounding box quality based on deviation from learned pattern
      const bbox = pattern.commonBoundingBoxes[0];
      if (bbox && annotation.boundingBox) {
        const centerX = annotation.boundingBox.x + annotation.boundingBox.width / 2;
        const centerY = annotation.boundingBox.y + annotation.boundingBox.height / 2;

        // Calculate normalized distance from expected position
        const distanceX = Math.abs(centerX - bbox.center.x) / Math.sqrt(bbox.variance.x + 0.01);
        const distanceY = Math.abs(centerY - bbox.center.y) / Math.sqrt(bbox.variance.y + 0.01);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        // Convert distance to quality score (inverse exponential)
        boundingBoxQuality = Math.exp(-distance / 2);
      }

      // Prompt effectiveness based on historical confidence
      promptEffectiveness = pattern.averageConfidence;
    }

    const overallQuality = (confidence * 0.4 + boundingBoxQuality * 0.3 + promptEffectiveness * 0.3);

    return {
      confidence,
      boundingBoxQuality,
      promptEffectiveness,
      overallQuality
    };
  }

  /**
   * Get recommended features for a species
   */
  getRecommendedFeatures(species: string, limit: number = 8): string[] {
    const stats = this.speciesStats.get(species);
    if (!stats) {
      return [];
    }

    return Array.from(stats.features.values())
      .sort((a, b) => {
        // Sort by combination of occurrence rate and confidence
        const scoreA = a.occurrenceRate * a.avgConfidence;
        const scoreB = b.occurrenceRate * b.avgConfidence;
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .map(f => f.featureName);
  }

  /**
   * Generate pattern analytics report
   *
   * ⚠️ IMPORTANT: observationCount includes ALL annotations learned from (approved, pending, rejected).
   * For user-facing analytics, callers should query the database for actual approved annotation counts
   * by filtering ai_annotation_items where status = 'approved'.
   *
   * This in-memory count is useful for ML training but NOT for display purposes.
   */
  getAnalytics(): {
    totalPatterns: number;
    speciesTracked: number;
    topFeatures: Array<{ feature: string; observations: number; confidence: number }>;
    speciesBreakdown: Array<{ species: string; annotations: number; features: number }>;
  } {
    const topFeatures = Array.from(this.patterns.values())
      .sort((a, b) => b.observationCount - a.observationCount)
      .slice(0, 10)
      .map(p => ({
        feature: p.featureType,
        observations: p.observationCount, // ⚠️ This counts ALL annotations, not just approved
        confidence: p.averageConfidence
      }));

    const speciesBreakdown = Array.from(this.speciesStats.values())
      .map(s => ({
        species: s.species,
        annotations: s.totalAnnotations,
        features: s.features.size
      }))
      .sort((a, b) => b.annotations - a.annotations);

    return {
      totalPatterns: this.patterns.size,
      speciesTracked: this.speciesStats.size,
      topFeatures,
      speciesBreakdown
    };
  }

  /**
   * Persist patterns to Supabase Storage (Railway-compatible)
   */
  private async persistPatterns(): Promise<void> {
    try {
      // Convert patterns to serializable format
      const patternsData = Array.from(this.patterns.entries()).map(([key, pattern]) => ({
        key,
        pattern: {
          ...pattern,
          lastUpdated: pattern.lastUpdated.toISOString()
        }
      }));

      const speciesData = Array.from(this.speciesStats.entries()).map(([species, stats]) => ({
        species,
        stats: {
          ...stats,
          lastUpdated: stats.lastUpdated.toISOString(),
          features: Array.from(stats.features.entries())
        }
      }));

      // Upload to Supabase Storage
      const bucket = 'ml-patterns';

      // Upload patterns
      const patternsBlob = new Blob([JSON.stringify(patternsData, null, 2)], { type: 'application/json' });
      await supabase.storage
        .from(bucket)
        .upload('learned-patterns.json', patternsBlob, {
          upsert: true,
          contentType: 'application/json'
        });

      // Upload species stats
      const speciesBlob = new Blob([JSON.stringify(speciesData, null, 2)], { type: 'application/json' });
      await supabase.storage
        .from(bucket)
        .upload('species-stats.json', speciesBlob, {
          upsert: true,
          contentType: 'application/json'
        });

      info('Patterns persisted to Supabase Storage', {
        patterns: patternsData.length,
        species: speciesData.length
      });

    } catch (error) {
      logError('Failed to persist patterns to Supabase', error as Error);
    }
  }

  /**
   * Restore session from Supabase Storage
   */
  private async restoreSession(): Promise<void> {
    try {
      const bucket = 'ml-patterns';

      // Download patterns file
      const { data: patternsFile, error: patternsError } = await supabase.storage
        .from(bucket)
        .download('learned-patterns.json');

      // Download species stats file
      const { data: speciesFile, error: speciesError } = await supabase.storage
        .from(bucket)
        .download('species-stats.json');

      // Parse patterns
      if (patternsFile && !patternsError) {
        const patternsText = await patternsFile.text();
        const patternsData = JSON.parse(patternsText);

        if (Array.isArray(patternsData)) {
          for (const { key, pattern } of patternsData) {
            this.patterns.set(key, {
              ...pattern,
              lastUpdated: new Date(pattern.lastUpdated)
            });
          }
        }
      }

      // Parse species stats
      if (speciesFile && !speciesError) {
        const speciesText = await speciesFile.text();
        const speciesData = JSON.parse(speciesText);

        if (Array.isArray(speciesData)) {
          for (const { species, stats } of speciesData) {
            this.speciesStats.set(species, {
              ...stats,
              lastUpdated: new Date(stats.lastUpdated),
              features: new Map(stats.features)
            });
          }
        }
      }

      info('Session restored from Supabase Storage', {
        patterns: this.patterns.size,
        species: this.speciesStats.size
      });

    } catch (error) {
      info('No previous session to restore or restore failed', { error: (error as Error).message });
    }
  }

  /**
   * Store data in Claude-Flow memory
   */
  private async storeInMemory(key: string, value: any): Promise<void> {
    try {
      const fullKey = `${this.memoryNamespace}/${key}`;
      const valueJson = JSON.stringify(value).replace(/'/g, "'\\''");
      const command = `npx claude-flow@alpha memory store "${fullKey}" '${valueJson}' --namespace pattern-learning`;
      await execAsync(command);
    } catch (error) {
      logError(`Failed to store in memory: ${key}`, error as Error);
    }
  }

  /**
   * Retrieve data from Claude-Flow memory
   */
  private async retrieveFromMemory(key: string): Promise<any> {
    try {
      const fullKey = `${this.memoryNamespace}/${key}`;
      const command = `npx claude-flow@alpha memory query "${fullKey}" --namespace pattern-learning`;
      const { stdout } = await execAsync(command);

      // Parse the query results and extract the value
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.includes(fullKey)) {
          // Extract JSON from the output
          const match = line.match(/value:\s*(.+)$/);
          if (match) {
            return JSON.parse(match[1]);
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate feature key for pattern storage
   */
  private getFeatureKey(feature: string, species?: string): string {
    return species ? `${species}:${feature}` : `global:${feature}`;
  }

  /**
   * Learn from annotation approval
   * Reinforces successful patterns and increases confidence
   */
  async learnFromApproval(
    annotation: AIAnnotation,
    context: {
      species: string;
      imageId: string;
      reviewerId: string;
    }
  ): Promise<void> {
    try {
      info('Learning from approval', {
        feature: annotation.spanishTerm,
        species: context.species,
        confidence: annotation.confidence
      });

      const featureKey = this.getFeatureKey(annotation.spanishTerm, context.species);
      let pattern = this.patterns.get(featureKey);

      if (!pattern) {
        // Create new pattern from approved annotation
        pattern = {
          id: featureKey,
          featureType: annotation.spanishTerm,
          speciesContext: context.species,
          successfulPrompts: [],
          commonBoundingBoxes: [],
          averageConfidence: (annotation.confidence || 0.8) + this.APPROVAL_CONFIDENCE_BOOST,
          observationCount: 0,
          lastUpdated: new Date(),
          metadata: {
            avgDifficultyLevel: annotation.difficultyLevel,
            commonPronunciations: annotation.pronunciation ? [annotation.pronunciation] : [],
            relatedFeatures: [],
            imageCharacteristics: []
          }
        };
      } else {
        // Boost confidence for existing pattern
        pattern.averageConfidence = Math.min(
          1.0,
          pattern.averageConfidence + this.APPROVAL_CONFIDENCE_BOOST
        );
      }

      // Update bounding box patterns with higher weight
      if (annotation.boundingBox) {
        // Add the approved annotation multiple times to increase weight
        for (let i = 0; i < Math.ceil(this.CORRECTION_WEIGHT); i++) {
          pattern.commonBoundingBoxes = this.updateBoundingBoxPattern(
            pattern.commonBoundingBoxes,
            annotation.boundingBox
          );
        }
      }

      pattern.observationCount++;
      pattern.lastUpdated = new Date();
      this.patterns.set(featureKey, pattern);

      // Store as positive training example
      await this.storeInMemory(
        `approval-${context.species}-${annotation.spanishTerm}-${Date.now()}`,
        {
          annotation,
          context,
          timestamp: new Date(),
          reinforced: true
        }
      );

      await this.persistPatterns();

      info('Successfully learned from approval', {
        feature: annotation.spanishTerm,
        newConfidence: pattern.averageConfidence
      });

    } catch (error) {
      logError('Failed to learn from approval', error as Error);
    }
  }

  /**
   * Learn from annotation rejection
   * Tracks failure patterns and adjusts recommendations
   */
  async learnFromRejection(
    annotation: AIAnnotation,
    reason: string,
    context: {
      species: string;
      imageId: string;
    }
  ): Promise<void> {
    try {
      info('Learning from rejection', {
        feature: annotation.spanishTerm,
        species: context.species,
        reason
      });

      const featureKey = this.getFeatureKey(annotation.spanishTerm, context.species);
      const pattern = this.patterns.get(featureKey);

      // Reduce confidence for this pattern
      if (pattern) {
        pattern.averageConfidence = Math.max(
          0.3,
          pattern.averageConfidence - this.REJECTION_CONFIDENCE_PENALTY
        );
        pattern.lastUpdated = new Date();
        this.patterns.set(featureKey, pattern);
      }

      // Track rejection pattern
      const rejectionKey = `${context.species}:${annotation.spanishTerm}`;
      let rejections = this.rejectionPatterns.get(rejectionKey) || [];

      const existingRejection = rejections.find(r => r.reason === reason);
      if (existingRejection) {
        existingRejection.count++;
        existingRejection.timestamp = new Date();
      } else {
        rejections.push({
          feature: annotation.spanishTerm,
          species: context.species,
          reason,
          boundingBox: annotation.boundingBox,
          timestamp: new Date(),
          count: 1
        });
      }

      this.rejectionPatterns.set(rejectionKey, rejections);

      // Store as negative training example
      await this.storeInMemory(
        `rejection-${context.species}-${annotation.spanishTerm}-${Date.now()}`,
        {
          annotation,
          reason,
          context,
          timestamp: new Date()
        }
      );

      await this.persistPatterns();

      info('Successfully learned from rejection', {
        feature: annotation.spanishTerm,
        reason,
        totalRejections: rejections.reduce((sum, r) => sum + r.count, 0)
      });

    } catch (error) {
      logError('Failed to learn from rejection', error as Error);
    }
  }

  /**
   * Learn from position correction
   * Calculates position delta and updates positioning model
   */
  async learnFromCorrection(
    original: AIAnnotation,
    corrected: AIAnnotation,
    context: {
      species: string;
      imageId: string;
      reviewerId: string;
    }
  ): Promise<void> {
    try {
      if (!original.boundingBox || !corrected.boundingBox) {
        info('Skipping correction learning - no bounding boxes');
        return;
      }

      // Calculate position delta
      const delta = {
        dx: corrected.boundingBox.x - original.boundingBox.x,
        dy: corrected.boundingBox.y - original.boundingBox.y,
        dwidth: corrected.boundingBox.width - original.boundingBox.width,
        dheight: corrected.boundingBox.height - original.boundingBox.height
      };

      info('Learning from position correction', {
        feature: original.spanishTerm,
        species: context.species,
        delta
      });

      const correction: PositionCorrection = {
        feature: original.spanishTerm,
        species: context.species,
        originalBox: original.boundingBox,
        correctedBox: corrected.boundingBox,
        delta,
        timestamp: new Date(),
        reviewerId: context.reviewerId
      };

      // Store correction
      const correctionKey = `${context.species}:${original.spanishTerm}`;
      let corrections = this.positionCorrections.get(correctionKey) || [];
      corrections.push(correction);

      // Keep only recent corrections (last 50)
      if (corrections.length > 50) {
        corrections = corrections.slice(-50);
      }

      this.positionCorrections.set(correctionKey, corrections);

      // Update pattern with corrected position (with higher weight)
      const featureKey = this.getFeatureKey(original.spanishTerm, context.species);
      let pattern = this.patterns.get(featureKey);

      if (!pattern) {
        pattern = {
          id: featureKey,
          featureType: original.spanishTerm,
          speciesContext: context.species,
          successfulPrompts: [],
          commonBoundingBoxes: [],
          averageConfidence: corrected.confidence || 0.85,
          observationCount: 0,
          lastUpdated: new Date(),
          metadata: {
            avgDifficultyLevel: original.difficultyLevel,
            commonPronunciations: [],
            relatedFeatures: [],
            imageCharacteristics: []
          }
        };
      }

      // Add corrected position with higher weight
      for (let i = 0; i < Math.ceil(this.CORRECTION_WEIGHT * 2); i++) {
        pattern.commonBoundingBoxes = this.updateBoundingBoxPattern(
          pattern.commonBoundingBoxes,
          corrected.boundingBox
        );
      }

      pattern.observationCount++;
      pattern.lastUpdated = new Date();
      this.patterns.set(featureKey, pattern);

      // Store correction in memory
      await this.storeInMemory(
        `correction-${context.species}-${original.spanishTerm}-${Date.now()}`,
        {
          original: original.boundingBox,
          corrected: corrected.boundingBox,
          delta,
          context,
          timestamp: new Date()
        }
      );

      await this.persistPatterns();

      info('Successfully learned from correction', {
        feature: original.spanishTerm,
        correctionsTracked: corrections.length,
        avgDelta: this.calculateAverageDelta(corrections)
      });

    } catch (error) {
      logError('Failed to learn from correction', error as Error);
    }
  }

  /**
   * Get position-adjusted feature recommendations based on corrections
   */
  async getPositionAdjustedFeatures(
    species: string,
    baseFeatures: string[]
  ): Promise<Array<{
    feature: string;
    adjustedBoundingBox?: {
      dx: number;
      dy: number;
      dwidth: number;
      dheight: number;
    };
    basedOnCorrections: number;
  }>> {
    try {
      const adjustedFeatures = await Promise.all(
        baseFeatures.map(async (feature) => {
          const correctionKey = `${species}:${feature}`;
          const corrections = this.positionCorrections.get(correctionKey) || [];

          if (corrections.length < this.MIN_SAMPLES_FOR_PATTERN) {
            return {
              feature,
              basedOnCorrections: 0
            };
          }

          // Calculate average correction delta
          const avgDelta = this.calculateAverageDelta(corrections);

          return {
            feature,
            adjustedBoundingBox: avgDelta,
            basedOnCorrections: corrections.length
          };
        })
      );

      info('Generated position-adjusted features', {
        species,
        features: adjustedFeatures.length,
        withAdjustments: adjustedFeatures.filter(f => f.adjustedBoundingBox).length
      });

      return adjustedFeatures;

    } catch (error) {
      logError('Failed to get position-adjusted features', error as Error);
      return baseFeatures.map(feature => ({ feature, basedOnCorrections: 0 }));
    }
  }

  /**
   * Calculate average delta from corrections
   */
  private calculateAverageDelta(
    corrections: PositionCorrection[]
  ): { dx: number; dy: number; dwidth: number; dheight: number } {
    if (corrections.length === 0) {
      return { dx: 0, dy: 0, dwidth: 0, dheight: 0 };
    }

    const sum = corrections.reduce(
      (acc, corr) => ({
        dx: acc.dx + corr.delta.dx,
        dy: acc.dy + corr.delta.dy,
        dwidth: acc.dwidth + corr.delta.dwidth,
        dheight: acc.dheight + corr.delta.dheight
      }),
      { dx: 0, dy: 0, dwidth: 0, dheight: 0 }
    );

    return {
      dx: sum.dx / corrections.length,
      dy: sum.dy / corrections.length,
      dwidth: sum.dwidth / corrections.length,
      dheight: sum.dheight / corrections.length
    };
  }

  /**
   * Export patterns for analysis
   */
  exportPatterns(): {
    patterns: LearnedPattern[];
    speciesStats: SpeciesFeatureStats[];
  } {
    return {
      patterns: Array.from(this.patterns.values()),
      speciesStats: Array.from(this.speciesStats.values())
    };
  }
}

// Export singleton instance
export const patternLearner = new PatternLearner();
