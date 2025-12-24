# Reinforcement Learning System Architecture

**Version:** 1.0.0
**Date:** 2025-11-17
**Status:** Architecture Design
**Owner:** System Architecture Team

---

## Executive Summary

This document describes the comprehensive reinforcement learning (RL) system designed to continuously improve AI-generated bird annotations through human-in-the-loop feedback. The system learns from three primary feedback sources: position corrections, approvals, and rejections, using these signals to adaptively improve annotation quality over time.

### Key Objectives

1. **Learn from Corrections**: Capture and analyze user position fixes to improve bounding box predictions
2. **Pattern Recognition**: Identify systematic errors through rejection analysis
3. **Adaptive Prompts**: Generate species and feature-specific prompts based on learned patterns
4. **Continuous Improvement**: Implement feedback loops that reduce annotation errors over time
5. **Neural Training**: Leverage claude-flow neural training for pattern recognition and prediction

---

## Table of Contents

1. [System Context](#system-context)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Neural Training Integration](#neural-training-integration)
7. [API Design](#api-design)
8. [Technology Stack](#technology-stack)
9. [Architecture Decision Records](#architecture-decision-records)
10. [Deployment Strategy](#deployment-strategy)
11. [Monitoring and Metrics](#monitoring-and-metrics)

---

## 1. System Context

### 1.1 Problem Statement

AI-generated bird annotations have varying quality depending on species, feature type, and image characteristics. Manual review and corrections provide valuable feedback, but this knowledge is not currently captured or used to improve future predictions.

### 1.2 Stakeholders

- **End Users**: Learners using the educational platform
- **Admin Reviewers**: Quality control personnel reviewing annotations
- **ML Engineers**: Team maintaining and improving the AI models
- **System Architects**: Infrastructure and performance optimization

### 1.3 Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    External Systems                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Claude AI  │  │  PostgreSQL  │  │ Claude-Flow  │      │
│  │   (Vision)   │  │   Database   │  │    Neural    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  RL System      │
                    │  (This Design)  │
                    └─────────────────┘
```

---

## 2. Architecture Overview

### 2.1 C4 Model - Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Boundary                               │
│                                                                   │
│  ┌──────────┐         ┌──────────────────────┐                  │
│  │  Admin   │────────▶│  Admin Review UI     │                  │
│  │ Reviewer │         │  (React Frontend)    │                  │
│  └──────────┘         └──────────┬───────────┘                  │
│                                   │                               │
│                                   │ User Actions                  │
│                                   │ (Approve/Reject/Fix)          │
│                                   │                               │
│                       ┌───────────▼────────────────┐             │
│                       │  Reinforcement Learning     │             │
│                       │  System                     │             │
│                       │  ┌──────────────────────┐  │             │
│                       │  │ FeedbackCapture      │  │             │
│                       │  │ Service              │  │             │
│                       │  └──────────┬───────────┘  │             │
│                       │             │               │             │
│                       │  ┌──────────▼───────────┐  │             │
│                       │  │ RL Engine            │  │             │
│                       │  │ - Correction Analyzer│  │             │
│                       │  │ - Rejection Analyzer │  │             │
│                       │  │ - Prompt Generator   │  │             │
│                       │  └──────────┬───────────┘  │             │
│                       └─────────────┼──────────────┘             │
│                                     │                             │
│                                     │ Improved Prompts            │
│                                     │ Position Predictions        │
│                                     │                             │
│                       ┌─────────────▼──────────────┐             │
│                       │  AI Annotation Pipeline    │             │
│                       │  (Existing System)         │             │
│                       └────────────────────────────┘             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 C4 Model - Container Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RL System Containers                              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Backend Services (Node.js/Express)                        │     │
│  │  ┌──────────────────┐  ┌──────────────────┐               │     │
│  │  │ Feedback API     │  │ Neural Training  │               │     │
│  │  │ (REST Endpoints) │  │ Service          │               │     │
│  │  └────────┬─────────┘  └────────┬─────────┘               │     │
│  │           │                      │                         │     │
│  │  ┌────────▼──────────────────────▼─────────┐               │     │
│  │  │  RL Core Engine                         │               │     │
│  │  │  - FeedbackCaptureService               │               │     │
│  │  │  - PositionCorrectionAnalyzer           │               │     │
│  │  │  - RejectionPatternAnalyzer             │               │     │
│  │  │  - AdaptivePromptGenerator              │               │     │
│  │  │  - NeuralPredictionService              │               │     │
│  │  └─────────────────┬───────────────────────┘               │     │
│  └────────────────────┼───────────────────────────────────────┘     │
│                       │                                              │
│  ┌────────────────────▼───────────────────────────────────────┐     │
│  │  PostgreSQL Database                                       │     │
│  │  - annotation_corrections                                  │     │
│  │  - rejection_patterns                                      │     │
│  │  - positioning_model                                       │     │
│  │  - feedback_metrics                                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Claude-Flow Neural Engine                                 │     │
│  │  - Pattern Recognition Models                              │     │
│  │  - WASM SIMD Acceleration                                  │     │
│  │  - Cross-session Memory                                    │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 FeedbackCaptureService

**Responsibility**: Capture all user feedback actions and normalize them for learning

**Key Functions**:
- Record position corrections with delta calculations
- Track approval events with context
- Log rejection events with categorization
- Enrich feedback with metadata (species, feature type, image characteristics)

**Interface**:
```typescript
interface FeedbackCaptureService {
  // Position Correction
  recordPositionCorrection(params: {
    annotationId: string;
    originalBbox: BoundingBox;
    correctedBbox: BoundingBox;
    species: string;
    featureType: string;
    correctedBy: string;
  }): Promise<CorrectionRecord>;

  // Approval
  recordApproval(params: {
    annotationId: string;
    species: string;
    featureType: string;
    confidenceScore: number;
    approvedBy: string;
  }): Promise<ApprovalRecord>;

  // Rejection
  recordRejection(params: {
    annotationId: string;
    rejectionCategory: RejectionCategory;
    rejectionNotes?: string;
    species: string;
    featureType: string;
    bbox: BoundingBox;
    confidenceScore: number;
    rejectedBy: string;
  }): Promise<RejectionRecord>;

  // Batch feedback for analytics
  getFeedbackBatch(params: {
    species?: string;
    featureType?: string;
    dateRange?: DateRange;
    limit?: number;
  }): Promise<FeedbackBatch>;
}
```

**Architecture Decisions**:
- **ADR-001**: Store all feedback in relational database for queryability
- **ADR-002**: Calculate deltas at write time for performance
- **ADR-003**: Use JSONB for flexible metadata storage

### 3.2 ReinforcementLearningEngine

**Responsibility**: Orchestrate learning from feedback data

**Key Functions**:
- Coordinate analyzers (Position, Rejection)
- Trigger periodic retraining
- Manage model versioning
- Generate predictions for new annotations

**Interface**:
```typescript
interface ReinforcementLearningEngine {
  // Training
  trainPositionModel(params: {
    species: string;
    featureType: string;
    minSamples?: number;
  }): Promise<TrainingResult>;

  trainAllModels(params: {
    minSamplesPerModel?: number;
    parallelTasks?: number;
  }): Promise<TrainingBatchResult>;

  // Prediction
  predictPositionAdjustment(params: {
    species: string;
    featureType: string;
    proposedBbox: BoundingBox;
  }): Promise<PositionPrediction>;

  // Prompt Generation
  generateAdaptivePrompt(params: {
    species: string;
    featureType: string;
    imageCharacteristics?: ImageMetadata;
  }): Promise<AdaptivePrompt>;

  // Metrics
  getModelPerformance(params: {
    species?: string;
    featureType?: string;
    timeWindow?: string;
  }): Promise<PerformanceMetrics>;
}
```

**Architecture Decisions**:
- **ADR-004**: Use online learning with periodic batch updates
- **ADR-005**: Implement model confidence thresholds before applying predictions
- **ADR-006**: Version models to allow rollback

### 3.3 PositionCorrectionAnalyzer

**Responsibility**: Learn optimal positioning from user corrections

**Key Functions**:
- Analyze correction patterns per species/feature
- Calculate statistical measures (mean, std dev, confidence)
- Detect outliers in corrections
- Update positioning models

**Interface**:
```typescript
interface PositionCorrectionAnalyzer {
  // Analysis
  analyzeCorrections(params: {
    species: string;
    featureType: string;
    minSamples?: number;
  }): Promise<CorrectionAnalysis>;

  // Model Updates
  updatePositioningModel(params: {
    species: string;
    featureType: string;
    corrections: CorrectionRecord[];
  }): Promise<PositioningModelUpdate>;

  // Prediction
  predictOptimalPosition(params: {
    species: string;
    featureType: string;
    initialBbox: BoundingBox;
    imageSize: { width: number; height: number };
  }): Promise<AdjustedBoundingBox>;

  // Statistics
  getCorrectionStats(params: {
    species?: string;
    featureType?: string;
    timeWindow?: string;
  }): Promise<CorrectionStatistics>;
}
```

**Core Algorithm**:
```typescript
// Position Adjustment Calculation
function calculateAdjustment(
  corrections: CorrectionRecord[],
  confidence: number
): PositionAdjustment {
  // Calculate average deltas
  const avgDeltaX = mean(corrections.map(c => c.deltaX));
  const avgDeltaY = mean(corrections.map(c => c.deltaY));
  const avgDeltaWidth = mean(corrections.map(c => c.deltaWidth));
  const avgDeltaHeight = mean(corrections.map(c => c.deltaHeight));

  // Calculate standard deviations
  const stdDevX = standardDeviation(corrections.map(c => c.deltaX));
  const stdDevY = standardDeviation(corrections.map(c => c.deltaY));
  const stdDevWidth = standardDeviation(corrections.map(c => c.deltaWidth));
  const stdDevHeight = standardDeviation(corrections.map(c => c.deltaHeight));

  // Confidence based on sample size and consistency
  const sampleConfidence = Math.min(1.0, corrections.length / 20);
  const consistencyConfidence = 1 - Math.min(1.0, (stdDevX + stdDevY) / 2);
  const adjustmentConfidence = (sampleConfidence * consistencyConfidence) * confidence;

  return {
    deltaX: avgDeltaX,
    deltaY: avgDeltaY,
    deltaWidth: avgDeltaWidth,
    deltaHeight: avgDeltaHeight,
    confidence: adjustmentConfidence,
    sampleSize: corrections.length,
    stdDev: { x: stdDevX, y: stdDevY, width: stdDevWidth, height: stdDevHeight }
  };
}
```

**Architecture Decisions**:
- **ADR-007**: Use weighted moving averages for online learning
- **ADR-008**: Apply predictions only when confidence > 0.7
- **ADR-009**: Store both absolute and normalized coordinates

### 3.4 RejectionPatternAnalyzer

**Responsibility**: Identify systematic errors through rejection analysis

**Key Functions**:
- Categorize rejection reasons
- Identify high-rejection species/features
- Detect confidence score patterns in rejections
- Generate targeted improvement recommendations

**Interface**:
```typescript
interface RejectionPatternAnalyzer {
  // Pattern Analysis
  analyzeRejectionPatterns(params: {
    timeWindow?: string;
    species?: string;
    featureType?: string;
  }): Promise<RejectionPatternAnalysis>;

  // Category Analysis
  getRejectionsByCategory(params: {
    dateRange?: DateRange;
    minCount?: number;
  }): Promise<CategoryBreakdown>;

  // Confidence Analysis
  analyzeConfidencePatterns(params: {
    rejectionCategory?: RejectionCategory;
    species?: string;
  }): Promise<ConfidenceAnalysis>;

  // Recommendations
  generateImprovementRecommendations(params: {
    species?: string;
    featureType?: string;
  }): Promise<ImprovementRecommendation[]>;
}
```

**Rejection Categories**:
```typescript
enum RejectionCategory {
  INCORRECT_SPECIES = 'incorrect_species',
  INCORRECT_FEATURE = 'incorrect_feature',
  POOR_LOCALIZATION = 'poor_localization',
  FALSE_POSITIVE = 'false_positive',
  DUPLICATE = 'duplicate',
  LOW_QUALITY = 'low_quality',
  OTHER = 'other'
}
```

**Pattern Detection Algorithm**:
```typescript
function detectRejectionPatterns(
  rejections: RejectionRecord[],
  threshold: number = 0.3
): RejectionPattern[] {
  const patterns: RejectionPattern[] = [];

  // Group by species + feature + category
  const grouped = groupBy(rejections, r =>
    `${r.species}|${r.featureType}|${r.rejectionCategory}`
  );

  for (const [key, records] of Object.entries(grouped)) {
    const [species, featureType, category] = key.split('|');
    const rejectionRate = records.length / getTotalAnnotations(species, featureType);

    if (rejectionRate > threshold) {
      patterns.push({
        species,
        featureType,
        category: category as RejectionCategory,
        rejectionRate,
        count: records.length,
        avgConfidence: mean(records.map(r => r.confidenceScore)),
        recommendation: generateRecommendation(species, featureType, category)
      });
    }
  }

  return patterns.sort((a, b) => b.rejectionRate - a.rejectionRate);
}
```

**Architecture Decisions**:
- **ADR-010**: Implement time-window based pattern detection
- **ADR-011**: Use ensemble methods for recommendation generation
- **ADR-012**: Flag patterns requiring immediate attention (>50% rejection rate)

### 3.5 AdaptivePromptGenerator

**Responsibility**: Generate species and feature-specific prompts based on learned patterns

**Key Functions**:
- Incorporate correction patterns into prompts
- Add species-specific positioning hints
- Include feature-specific guidance
- Adjust difficulty based on historical performance

**Interface**:
```typescript
interface AdaptivePromptGenerator {
  // Prompt Generation
  generatePrompt(params: {
    species: string;
    featureType: string;
    imageUrl: string;
    basePrompt?: string;
  }): Promise<AdaptivePrompt>;

  // Template Management
  updatePromptTemplate(params: {
    species?: string;
    featureType?: string;
    template: PromptTemplate;
  }): Promise<TemplateUpdate>;

  // Performance Tracking
  trackPromptPerformance(params: {
    promptId: string;
    annotationResult: AnnotationResult;
  }): Promise<void>;

  // A/B Testing
  createPromptVariant(params: {
    basePromptId: string;
    variation: PromptVariation;
  }): Promise<PromptVariant>;
}
```

**Prompt Structure**:
```typescript
interface AdaptivePrompt {
  promptId: string;
  basePrompt: string;
  adaptations: {
    positioningHints?: string[];      // Based on correction patterns
    speciesContext?: string;          // Species-specific guidance
    featureGuidance?: string;         // Feature-specific tips
    qualityThresholds?: {             // Learned quality criteria
      minConfidence: number;
      minBirdSize: number;
      minClarity: number;
    };
    commonMistakes?: string[];        // Based on rejection patterns
  };
  confidence: number;
  version: string;
  createdAt: Date;
}
```

**Prompt Enhancement Algorithm**:
```typescript
function enhancePrompt(
  basePrompt: string,
  species: string,
  featureType: string,
  learnings: LearningData
): AdaptivePrompt {
  const adaptations: PromptAdaptations = {};

  // Add positioning hints from correction data
  if (learnings.positioningModel?.confidence > 0.7) {
    adaptations.positioningHints = generatePositioningHints(
      learnings.positioningModel
    );
  }

  // Add species-specific context
  const speciesPatterns = learnings.speciesAnalysis[species];
  if (speciesPatterns) {
    adaptations.speciesContext = generateSpeciesContext(speciesPatterns);
  }

  // Add feature-specific guidance
  const featurePatterns = learnings.featureAnalysis[featureType];
  if (featurePatterns) {
    adaptations.featureGuidance = generateFeatureGuidance(featurePatterns);
  }

  // Add common mistakes to avoid
  const rejectionPatterns = learnings.rejectionPatterns.filter(
    p => p.species === species && p.featureType === featureType
  );
  if (rejectionPatterns.length > 0) {
    adaptations.commonMistakes = rejectionPatterns.map(
      p => formatMistakeWarning(p)
    );
  }

  // Calculate prompt confidence
  const confidence = calculatePromptConfidence(learnings);

  return {
    promptId: generatePromptId(),
    basePrompt,
    adaptations,
    confidence,
    version: '1.0',
    createdAt: new Date()
  };
}
```

**Example Enhanced Prompt**:
```
BASE PROMPT:
Analyze this bird image and identify anatomical features...

ADAPTIVE ENHANCEMENTS:
- Species Context: "For House Sparrow, the crown is typically brown with gray edges"
- Positioning Hints: "Crown features are typically located in the upper 30% of the bird's head"
- Feature Guidance: "Crown boundaries should extend from above the eye to the nape"
- Common Mistakes: "Avoid including the forehead in crown annotations"
- Quality Thresholds: "Only annotate if bird occupies >20% of image and clarity >0.7"
```

**Architecture Decisions**:
- **ADR-013**: Implement A/B testing for prompt variations
- **ADR-014**: Track prompt performance metrics per species/feature
- **ADR-015**: Version prompts for rollback capability

### 3.6 NeuralPredictionService

**Responsibility**: Interface with claude-flow neural training for advanced predictions

**Key Functions**:
- Train neural models on correction patterns
- Predict optimal positions using neural inference
- Manage model lifecycle (training, deployment, monitoring)
- Handle model versioning and A/B testing

**Interface**:
```typescript
interface NeuralPredictionService {
  // Model Training
  trainModel(params: {
    modelType: 'positioning' | 'rejection' | 'quality';
    trainingData: TrainingDataset;
    epochs?: number;
    validationSplit?: number;
  }): Promise<TrainingResult>;

  // Inference
  predict(params: {
    modelId: string;
    inputFeatures: FeatureVector;
  }): Promise<Prediction>;

  // Model Management
  deployModel(params: {
    modelId: string;
    deploymentTarget: 'production' | 'staging';
    rolloutPercentage?: number;
  }): Promise<DeploymentResult>;

  listModels(params: {
    modelType?: string;
    status?: 'training' | 'deployed' | 'archived';
  }): Promise<ModelInfo[]>;
}
```

**Neural Training Integration**:
```typescript
// Train positioning correction model using claude-flow
async function trainPositioningModel(
  corrections: CorrectionRecord[]
): Promise<NeuralModel> {
  // Prepare training data
  const trainingData = corrections.map(c => ({
    input: {
      species: c.species,
      featureType: c.featureType,
      originalBbox: c.originalBoundingBox,
      imageCharacteristics: c.imageMetadata
    },
    output: {
      deltaX: c.deltaX,
      deltaY: c.deltaY,
      deltaWidth: c.deltaWidth,
      deltaHeight: c.deltaHeight
    }
  }));

  // Train using claude-flow neural_train
  const result = await claudeFlow.neural_train({
    pattern_type: 'prediction',
    training_data: JSON.stringify(trainingData),
    epochs: 50,
    config: {
      architecture: 'feedforward',
      layers: [
        { type: 'input', size: 128 },
        { type: 'hidden', size: 256, activation: 'relu' },
        { type: 'hidden', size: 128, activation: 'relu' },
        { type: 'output', size: 4 }  // deltaX, deltaY, deltaWidth, deltaHeight
      ],
      optimizer: 'adam',
      learningRate: 0.001
    }
  });

  return result.model;
}
```

**Architecture Decisions**:
- **ADR-016**: Use claude-flow for neural training infrastructure
- **ADR-017**: Implement progressive rollout for neural models
- **ADR-018**: Fallback to statistical models if neural prediction fails

---

## 4. Data Flow

### 4.1 Position Correction Flow

```
┌──────────────┐
│ Admin UI     │
│ (Fix Button) │
└──────┬───────┘
       │
       │ 1. User adjusts bounding box
       │
       ▼
┌──────────────────────────────┐
│ FeedbackCaptureService       │
│ - Calculate deltas           │
│ - Extract metadata           │
│ - Validate corrections       │
└──────────┬───────────────────┘
           │
           │ 2. Store correction
           │
           ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
│ annotation_corrections       │
└──────────┬───────────────────┘
           │
           │ 3. Trigger analysis (async)
           │
           ▼
┌──────────────────────────────┐
│ PositionCorrectionAnalyzer   │
│ - Aggregate corrections      │
│ - Calculate statistics       │
│ - Update positioning model   │
└──────────┬───────────────────┘
           │
           │ 4. Update model
           │
           ▼
┌──────────────────────────────┐
│ positioning_model table      │
│ - avg_delta_x/y/w/h          │
│ - std_dev_x/y/w/h            │
│ - confidence                 │
└──────────┬───────────────────┘
           │
           │ 5. Train neural model (periodic)
           │
           ▼
┌──────────────────────────────┐
│ NeuralPredictionService      │
│ - Train on correction data   │
│ - Deploy improved model      │
└──────────────────────────────┘
```

### 4.2 Rejection Analysis Flow

```
┌──────────────┐
│ Admin UI     │
│ (Reject)     │
└──────┬───────┘
       │
       │ 1. User rejects with category
       │
       ▼
┌──────────────────────────────┐
│ FeedbackCaptureService       │
│ - Record rejection details   │
│ - Capture confidence score   │
│ - Store bbox + metadata      │
└──────────┬───────────────────┘
           │
           │ 2. Store rejection
           │
           ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
│ rejection_patterns           │
└──────────┬───────────────────┘
           │
           │ 3. Analyze patterns (periodic)
           │
           ▼
┌──────────────────────────────┐
│ RejectionPatternAnalyzer     │
│ - Group by category          │
│ - Calculate rates            │
│ - Identify trends            │
└──────────┬───────────────────┘
           │
           │ 4. Generate recommendations
           │
           ▼
┌──────────────────────────────┐
│ AdaptivePromptGenerator      │
│ - Update prompt templates    │
│ - Add warning messages       │
│ - Adjust confidence thresh   │
└──────────────────────────────┘
```

### 4.3 Approval Learning Flow

```
┌──────────────┐
│ Admin UI     │
│ (Approve)    │
└──────┬───────┘
       │
       │ 1. User approves annotation
       │
       ▼
┌──────────────────────────────┐
│ FeedbackCaptureService       │
│ - Record approval            │
│ - Capture bbox as "correct"  │
│ - Extract feature metadata   │
└──────────┬───────────────────┘
           │
           │ 2. Store as positive signal
           │
           ▼
┌──────────────────────────────┐
│ feedback_metrics             │
│ - approval_rate              │
│ - avg_confidence             │
│ - precision metrics          │
└──────────┬───────────────────┘
           │
           │ 3. Validate positioning model
           │
           ▼
┌──────────────────────────────┐
│ PositionCorrectionAnalyzer   │
│ - Compare approved vs model  │
│ - Calculate accuracy         │
│ - Adjust confidence          │
└──────────────────────────────┘
```

### 4.4 Adaptive Annotation Flow

```
┌──────────────────────────────┐
│ AI Annotation Pipeline       │
│ (Requesting annotation)      │
└──────────┬───────────────────┘
           │
           │ 1. Request with species + feature
           │
           ▼
┌──────────────────────────────┐
│ AdaptivePromptGenerator      │
│ - Load positioning model     │
│ - Load rejection patterns    │
│ - Generate enhanced prompt   │
└──────────┬───────────────────┘
           │
           │ 2. Enhanced prompt
           │
           ▼
┌──────────────────────────────┐
│ Claude Vision API            │
│ (Generate annotation)        │
└──────────┬───────────────────┘
           │
           │ 3. Raw annotation
           │
           ▼
┌──────────────────────────────┐
│ NeuralPredictionService      │
│ - Predict position adjust    │
│ - Apply if confidence > 0.7  │
└──────────┬───────────────────┘
           │
           │ 4. Adjusted annotation
           │
           ▼
┌──────────────────────────────┐
│ Store in ai_annotation_items │
│ (Ready for review)           │
└──────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Schema Overview

The database schema is already defined in migration `012_reinforcement_learning_feedback.sql`. Key tables:

1. **annotation_corrections** - Position correction data
2. **rejection_patterns** - Rejection analysis data
3. **positioning_model** - Learned positioning adjustments
4. **feedback_metrics** - Aggregated performance metrics

### 5.2 Entity Relationship Diagram

```
┌─────────────────────────┐
│ ai_annotation_items     │
│ ├─ id (PK)              │
│ ├─ image_id             │
│ ├─ bounding_box         │
│ ├─ feature_type         │
│ ├─ species              │
│ └─ review_status        │
└──────────┬──────────────┘
           │
           │ FK
           │
┌──────────▼──────────────────┐
│ annotation_corrections      │
│ ├─ id (PK)                  │
│ ├─ annotation_id (FK)       │
│ ├─ original_bounding_box    │
│ ├─ corrected_bounding_box   │
│ ├─ delta_x/y/width/height   │
│ ├─ species                  │
│ ├─ feature_type             │
│ └─ created_at               │
└─────────────────────────────┘

┌─────────────────────────────┐
│ rejection_patterns          │
│ ├─ id (PK)                  │
│ ├─ annotation_id (FK)       │
│ ├─ rejection_category       │
│ ├─ rejection_notes          │
│ ├─ species                  │
│ ├─ feature_type             │
│ ├─ bounding_box             │
│ ├─ confidence_score         │
│ └─ created_at               │
└─────────────────────────────┘

┌─────────────────────────────┐
│ positioning_model           │
│ ├─ id (PK)                  │
│ ├─ species (UNIQUE)         │
│ ├─ feature_type (UNIQUE)    │
│ ├─ avg_delta_x/y/w/h        │
│ ├─ std_dev_x/y/w/h          │
│ ├─ sample_count             │
│ ├─ confidence               │
│ └─ last_trained             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ feedback_metrics            │
│ ├─ id (PK)                  │
│ ├─ metric_type              │
│ ├─ species                  │
│ ├─ feature_type             │
│ ├─ value                    │
│ ├─ sample_size              │
│ ├─ time_window              │
│ └─ calculated_at            │
└─────────────────────────────┘
```

### 5.3 Key Indexes

```sql
-- Performance indexes (already in migration)
CREATE INDEX idx_corrections_species_feature
  ON annotation_corrections(species, feature_type);

CREATE INDEX idx_rejection_category
  ON rejection_patterns(rejection_category);

CREATE INDEX idx_positioning_confidence
  ON positioning_model(confidence DESC);

CREATE INDEX idx_metrics_type_species_feature
  ON feedback_metrics(metric_type, species, feature_type);
```

---

## 6. Neural Training Integration

### 6.1 Claude-Flow Neural Training

**Training Pattern**:
```typescript
async function trainCorrectionModel(
  species: string,
  featureType: string
): Promise<NeuralModel> {
  // 1. Fetch training data
  const corrections = await db.query(`
    SELECT
      original_bounding_box,
      corrected_bounding_box,
      delta_x, delta_y, delta_width, delta_height,
      species,
      feature_type
    FROM annotation_corrections
    WHERE species = $1 AND feature_type = $2
    ORDER BY created_at DESC
    LIMIT 1000
  `, [species, featureType]);

  // 2. Prepare training dataset
  const trainingData = {
    patterns: corrections.rows.map(c => ({
      input: [
        c.original_bounding_box.x,
        c.original_bounding_box.y,
        c.original_bounding_box.width,
        c.original_bounding_box.height
      ],
      output: [
        c.delta_x,
        c.delta_y,
        c.delta_width,
        c.delta_height
      ],
      metadata: {
        species: c.species,
        featureType: c.feature_type
      }
    }))
  };

  // 3. Train using claude-flow
  const result = await mcp.claude_flow.neural_train({
    pattern_type: 'prediction',
    training_data: JSON.stringify(trainingData),
    epochs: 50
  });

  // 4. Store model reference
  await db.query(`
    INSERT INTO neural_models (
      model_id, species, feature_type,
      model_type, confidence, created_at
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
  `, [
    result.modelId,
    species,
    featureType,
    'positioning_correction',
    result.confidence
  ]);

  return result;
}
```

### 6.2 Neural Inference

**Prediction Pattern**:
```typescript
async function predictPositionAdjustment(
  species: string,
  featureType: string,
  bbox: BoundingBox
): Promise<AdjustedBoundingBox> {
  // 1. Get latest model for species + feature
  const model = await db.query(`
    SELECT model_id, confidence
    FROM neural_models
    WHERE species = $1 AND feature_type = $2
      AND model_type = 'positioning_correction'
    ORDER BY created_at DESC
    LIMIT 1
  `, [species, featureType]);

  if (!model.rows[0] || model.rows[0].confidence < 0.7) {
    // Fallback to statistical model
    return await statisticalPositionAdjustment(species, featureType, bbox);
  }

  // 2. Run neural prediction
  const inputVector = [bbox.x, bbox.y, bbox.width, bbox.height];

  const prediction = await mcp.claude_flow.neural_predict({
    modelId: model.rows[0].model_id,
    input: JSON.stringify(inputVector)
  });

  // 3. Apply adjustments
  return {
    x: bbox.x + prediction.output[0],
    y: bbox.y + prediction.output[1],
    width: bbox.width + prediction.output[2],
    height: bbox.height + prediction.output[3],
    confidence: prediction.confidence,
    method: 'neural'
  };
}
```

### 6.3 Training Schedule

**Periodic Training**:
```typescript
// Cron job: Daily at 2 AM
async function dailyRetraining() {
  // 1. Find species/features with new corrections
  const targets = await db.query(`
    SELECT species, feature_type, COUNT(*) as new_corrections
    FROM annotation_corrections
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
    GROUP BY species, feature_type
    HAVING COUNT(*) >= 5
  `);

  // 2. Retrain models in parallel
  const results = await Promise.allSettled(
    targets.rows.map(t =>
      trainCorrectionModel(t.species, t.feature_type)
    )
  );

  // 3. Log results
  await logTrainingResults(results);

  // 4. Update feedback metrics
  await updateFeedbackMetrics();
}
```

---

## 7. API Design

### 7.1 REST Endpoints

**Feedback Endpoints**:
```
POST   /api/feedback/corrections
POST   /api/feedback/approvals
POST   /api/feedback/rejections
GET    /api/feedback/corrections/:species/:feature
GET    /api/feedback/stats
```

**Model Endpoints**:
```
GET    /api/models/positioning/:species/:feature
POST   /api/models/train
GET    /api/models/performance
GET    /api/models/list
```

**Prompt Endpoints**:
```
POST   /api/prompts/generate
GET    /api/prompts/:species/:feature
PUT    /api/prompts/templates/:id
GET    /api/prompts/performance
```

### 7.2 Request/Response Examples

**Record Position Correction**:
```typescript
// POST /api/feedback/corrections
{
  "annotationId": "uuid",
  "originalBbox": {
    "x": 0.3, "y": 0.2, "width": 0.4, "height": 0.5
  },
  "correctedBbox": {
    "x": 0.32, "y": 0.18, "width": 0.42, "height": 0.52
  },
  "species": "house_sparrow",
  "featureType": "crown",
  "correctedBy": "user-uuid"
}

// Response
{
  "id": "correction-uuid",
  "deltas": {
    "deltaX": 0.02,
    "deltaY": -0.02,
    "deltaWidth": 0.02,
    "deltaHeight": 0.02
  },
  "stored": true,
  "trainingTriggered": true
}
```

**Record Rejection**:
```typescript
// POST /api/feedback/rejections
{
  "annotationId": "uuid",
  "rejectionCategory": "poor_localization",
  "rejectionNotes": "Bounding box too large, includes background",
  "species": "house_sparrow",
  "featureType": "crown",
  "bbox": { "x": 0.3, "y": 0.2, "width": 0.4, "height": 0.5 },
  "confidenceScore": 0.85,
  "rejectedBy": "user-uuid"
}

// Response
{
  "id": "rejection-uuid",
  "stored": true,
  "patternDetected": true,
  "recommendation": "Consider reducing bounding box size for crown features"
}
```

**Generate Adaptive Prompt**:
```typescript
// POST /api/prompts/generate
{
  "species": "house_sparrow",
  "featureType": "crown",
  "imageUrl": "https://...",
  "basePrompt": "Identify the crown feature..."
}

// Response
{
  "promptId": "prompt-uuid",
  "enhancedPrompt": "...",
  "adaptations": {
    "positioningHints": [
      "Crown typically located in upper 30% of head",
      "Average dimensions: 40% width, 25% height of head"
    ],
    "speciesContext": "House Sparrow crown is brown with gray edges",
    "commonMistakes": [
      "Avoid including forehead area"
    ]
  },
  "confidence": 0.85,
  "version": "1.2"
}
```

---

## 8. Technology Stack

### 8.1 Backend Services

**Runtime**: Node.js 20+
**Framework**: Express.js
**Language**: TypeScript
**Database**: PostgreSQL 14+
**ORM**: Raw SQL with pg library (performance optimization)
**Validation**: Zod
**Logging**: Winston

### 8.2 Neural/ML Infrastructure

**Neural Training**: Claude-Flow MCP
**WASM Acceleration**: Claude-Flow SIMD
**Pattern Recognition**: Claude-Flow Neural Engine
**Memory Management**: Claude-Flow Cross-session Memory

### 8.3 Data Storage

**Primary Database**: PostgreSQL with JSONB
**Caching**: Redis (for model predictions)
**Model Storage**: S3-compatible storage
**Metrics**: PostgreSQL + TimescaleDB extension (optional)

### 8.4 Monitoring

**Metrics**: Prometheus
**Visualization**: Grafana
**Logging**: Winston + CloudWatch
**Error Tracking**: Sentry

---

## 9. Architecture Decision Records

### ADR-001: Relational Database for Feedback Storage

**Context**: Need to store and query feedback data efficiently

**Decision**: Use PostgreSQL with JSONB for metadata

**Rationale**:
- Complex queries for pattern analysis
- ACID guarantees for feedback integrity
- JSONB for flexible metadata without schema changes
- Excellent indexing for time-series queries

**Consequences**:
- Requires database scaling for high volume
- More complex than NoSQL for simple queries
- Strong consistency guarantees

### ADR-002: Calculate Deltas at Write Time

**Context**: Need efficient position correction analysis

**Decision**: Pre-calculate deltas when storing corrections

**Rationale**:
- Avoid repeated calculations during analysis
- Enables efficient aggregation queries
- Simplifies statistical computations

**Consequences**:
- Slightly more write latency
- Storage overhead (minimal)
- Faster read/analysis performance

### ADR-003: JSONB for Flexible Metadata

**Context**: Metadata requirements evolve over time

**Decision**: Use JSONB columns for extensible metadata

**Rationale**:
- Schema flexibility without migrations
- Indexable for common queries
- Native PostgreSQL support

**Consequences**:
- Less type safety than relational columns
- Requires validation in application layer
- Excellent query performance with GIN indexes

### ADR-004: Online Learning with Batch Updates

**Context**: Need continuous learning without downtime

**Decision**: Implement online learning with periodic batch retraining

**Rationale**:
- Immediate incorporation of new feedback
- Batch training for model stability
- Balance between freshness and quality

**Consequences**:
- More complex training pipeline
- Requires model versioning
- Better user experience (faster adaptation)

### ADR-005: Confidence Threshold for Predictions

**Context**: Low-confidence predictions may harm quality

**Decision**: Only apply predictions with confidence > 0.7

**Rationale**:
- Avoid degrading annotations with uncertain adjustments
- Build trust in system over time
- Gradual rollout of learned patterns

**Consequences**:
- Slower adoption of predictions
- Higher quality when applied
- Clear A/B testing capability

### ADR-006: Model Versioning

**Context**: Need to rollback problematic models

**Decision**: Version all models with deployment tracking

**Rationale**:
- Enable quick rollback
- A/B testing different model versions
- Audit trail for model changes

**Consequences**:
- Additional storage overhead
- More complex deployment pipeline
- Better safety and experimentation

### ADR-007: Weighted Moving Averages

**Context**: Need online learning that adapts to trends

**Decision**: Use weighted moving averages for position models

**Rationale**:
- Recent corrections weighted more heavily
- Smooth adaptation to changing patterns
- Computationally efficient

**Consequences**:
- More complex than simple averages
- Requires tuning of weights
- Better adaptation to evolving patterns

### ADR-008: Apply Predictions Only at High Confidence

**Context**: Balance between improvement and risk

**Decision**: Only adjust positions when confidence > 0.7

**Rationale**:
- Prevent degradation from uncertain adjustments
- Build system credibility
- Allow gradual learning

**Consequences**:
- Conservative approach
- Slower improvement initially
- Higher quality when active

### ADR-009: Store Normalized and Absolute Coordinates

**Context**: Need to work with different image sizes

**Decision**: Store normalized (0-1) coordinates in corrections table

**Rationale**:
- Image size agnostic
- Easier statistical analysis
- Simpler model training

**Consequences**:
- Requires denormalization for display
- Additional computation
- More generalizable models

### ADR-010: Time-Window Pattern Detection

**Context**: Patterns change over time

**Decision**: Analyze patterns in configurable time windows

**Rationale**:
- Detect recent trends
- Avoid stale pattern influence
- Configurable analysis granularity

**Consequences**:
- More complex queries
- Requires periodic analysis jobs
- Better adaptation to changes

### ADR-011: Ensemble Recommendation Generation

**Context**: Recommendations need multiple perspectives

**Decision**: Use ensemble of analyzers for recommendations

**Rationale**:
- Combine statistical and neural insights
- More robust recommendations
- Cross-validation of patterns

**Consequences**:
- Higher computational cost
- More complex implementation
- Better recommendation quality

### ADR-012: Alert on High Rejection Rates

**Context**: Critical issues need immediate attention

**Decision**: Flag patterns with >50% rejection rate

**Rationale**:
- Proactive issue detection
- Prevent quality degradation
- Enable quick intervention

**Consequences**:
- Requires monitoring infrastructure
- May generate false alarms
- Better system health

### ADR-013: A/B Testing for Prompts

**Context**: Need to validate prompt improvements

**Decision**: Implement A/B testing framework for prompts

**Rationale**:
- Measure prompt effectiveness
- Safe experimentation
- Data-driven optimization

**Consequences**:
- More complex prompt management
- Requires analytics pipeline
- Scientifically validated improvements

### ADR-014: Track Prompt Performance Metrics

**Context**: Need to measure prompt effectiveness

**Decision**: Track approval rate, correction rate per prompt variant

**Rationale**:
- Quantify prompt improvements
- Enable optimization
- Clear success metrics

**Consequences**:
- Additional tracking overhead
- Data-driven prompt evolution
- Continuous improvement

### ADR-015: Prompt Versioning

**Context**: Need to rollback ineffective prompts

**Decision**: Version all prompts with performance tracking

**Rationale**:
- Safe experimentation
- Rollback capability
- Audit trail

**Consequences**:
- Version management complexity
- Storage overhead
- Better safety and control

### ADR-016: Claude-Flow for Neural Training

**Context**: Need neural training infrastructure

**Decision**: Use claude-flow MCP for all neural training

**Rationale**:
- Battle-tested infrastructure
- WASM SIMD acceleration
- Cross-session memory
- Integrated with existing stack

**Consequences**:
- Dependency on claude-flow
- Learning curve
- High performance and reliability

### ADR-017: Progressive Rollout for Neural Models

**Context**: New models may have unknown issues

**Decision**: Progressive rollout (10% → 50% → 100%)

**Rationale**:
- Limit blast radius of issues
- Gradual performance monitoring
- Safe deployment

**Consequences**:
- Slower full deployment
- More complex routing
- Better safety

### ADR-018: Fallback to Statistical Models

**Context**: Neural predictions may fail or be unavailable

**Decision**: Always have statistical model fallback

**Rationale**:
- System resilience
- Gradual neural adoption
- Performance guarantee

**Consequences**:
- Maintain two model types
- More complex prediction logic
- Better reliability

---

## 10. Deployment Strategy

### 10.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Production                           │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   API       │  │   Worker    │  │   Trainer   │     │
│  │   Servers   │  │   Pool      │  │   Service   │     │
│  │   (3x)      │  │   (5x)      │  │   (1x)      │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │              │
│         └────────────────┼────────────────┘              │
│                          │                                │
│                 ┌────────▼────────┐                      │
│                 │   PostgreSQL    │                      │
│                 │   (Primary +    │                      │
│                 │   Replicas)     │                      │
│                 └─────────────────┘                      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 10.2 Deployment Pipeline

**Stages**:
1. **Development** → Local testing with sample data
2. **Staging** → Full-scale testing with production clone
3. **Canary** → 10% traffic for 24 hours
4. **Production** → Progressive rollout to 100%

**Rollback Criteria**:
- Error rate > 1%
- Latency p99 > 500ms
- Approval rate decrease > 10%
- Manual rollback trigger

### 10.3 Scaling Strategy

**Horizontal Scaling**:
- API servers: Auto-scale based on CPU (target 70%)
- Worker pool: Auto-scale based on queue depth
- Database: Read replicas for analytics queries

**Vertical Scaling**:
- Training service: GPU instances for neural training
- Database: Scale up for write-heavy periods

---

## 11. Monitoring and Metrics

### 11.1 Key Performance Indicators

**System Performance**:
- API latency (p50, p95, p99)
- Database query performance
- Neural training time
- Model prediction latency

**ML Performance**:
- Approval rate (target: >80%)
- Correction rate (target: <20%)
- Rejection rate (target: <10%)
- Position accuracy improvement over time

**Business Metrics**:
- Annotations per day
- Review throughput
- Time to approval
- Cost per annotation

### 11.2 Dashboards

**Operations Dashboard**:
- API health and latency
- Database performance
- Error rates
- Queue depths

**ML Performance Dashboard**:
- Approval/rejection trends
- Correction patterns by species/feature
- Model confidence over time
- Neural vs statistical performance

**Business Dashboard**:
- Annotation volume
- Quality metrics
- Cost analysis
- User feedback trends

### 11.3 Alerts

**Critical Alerts** (PagerDuty):
- API down
- Database connection failures
- Error rate > 5%
- Rejection rate > 40%

**Warning Alerts** (Email):
- Latency p99 > 1s
- Correction rate > 30%
- Model confidence < 0.5
- Training job failures

---

## Appendix A: Example Code Implementation

### FeedbackCaptureService Implementation

```typescript
import { pool } from '../database/connection';
import { BoundingBox, CorrectionRecord } from '../types';

export class FeedbackCaptureService {
  async recordPositionCorrection(params: {
    annotationId: string;
    originalBbox: BoundingBox;
    correctedBbox: BoundingBox;
    species: string;
    featureType: string;
    correctedBy: string;
  }): Promise<CorrectionRecord> {
    const { annotationId, originalBbox, correctedBbox, species, featureType, correctedBy } = params;

    // Calculate deltas
    const deltaX = correctedBbox.x - originalBbox.x;
    const deltaY = correctedBbox.y - originalBbox.y;
    const deltaWidth = correctedBbox.width - originalBbox.width;
    const deltaHeight = correctedBbox.height - originalBbox.height;

    // Store correction
    const result = await pool.query(`
      INSERT INTO annotation_corrections (
        annotation_id,
        original_bounding_box,
        corrected_bounding_box,
        delta_x,
        delta_y,
        delta_width,
        delta_height,
        species,
        feature_type,
        corrected_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at
    `, [
      annotationId,
      JSON.stringify(originalBbox),
      JSON.stringify(correctedBbox),
      deltaX,
      deltaY,
      deltaWidth,
      deltaHeight,
      species,
      featureType,
      correctedBy
    ]);

    // Trigger async analysis
    this.triggerCorrectionAnalysis(species, featureType);

    return {
      id: result.rows[0].id,
      annotationId,
      originalBbox,
      correctedBbox,
      deltas: { deltaX, deltaY, deltaWidth, deltaHeight },
      species,
      featureType,
      createdAt: result.rows[0].created_at
    };
  }

  private async triggerCorrectionAnalysis(species: string, featureType: string): Promise<void> {
    // Queue async job for analysis
    await this.queueJob('analyze_corrections', { species, featureType });
  }

  private async queueJob(jobType: string, params: any): Promise<void> {
    // Implementation using job queue (Bull, BullMQ, etc.)
  }
}
```

---

## Appendix B: SQL Query Examples

### Get Correction Statistics

```sql
-- Get correction statistics for a species/feature combination
SELECT
  species,
  feature_type,
  COUNT(*) as total_corrections,
  AVG(delta_x) as avg_delta_x,
  AVG(delta_y) as avg_delta_y,
  AVG(delta_width) as avg_delta_width,
  AVG(delta_height) as avg_delta_height,
  STDDEV(delta_x) as std_dev_x,
  STDDEV(delta_y) as std_dev_y,
  MIN(created_at) as first_correction,
  MAX(created_at) as last_correction
FROM annotation_corrections
WHERE species = 'house_sparrow'
  AND feature_type = 'crown'
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY species, feature_type;
```

### Get Rejection Pattern Analysis

```sql
-- Get rejection patterns with high rates
SELECT
  species,
  feature_type,
  rejection_category,
  COUNT(*) as rejection_count,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) * 100.0 / (
    SELECT COUNT(*)
    FROM ai_annotation_items
    WHERE species = rp.species
      AND feature_type = rp.feature_type
  ) as rejection_rate
FROM rejection_patterns rp
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY species, feature_type, rejection_category
HAVING COUNT(*) >= 5
ORDER BY rejection_rate DESC;
```

---

## Appendix C: Deployment Checklist

### Pre-Deployment

- [ ] Run database migrations in staging
- [ ] Verify all indexes are created
- [ ] Load test with production-like data
- [ ] Review monitoring dashboards
- [ ] Confirm alert configurations
- [ ] Test rollback procedures

### Deployment

- [ ] Deploy to canary (10% traffic)
- [ ] Monitor for 24 hours
- [ ] Review error rates and latency
- [ ] Check ML performance metrics
- [ ] Increase to 50% traffic
- [ ] Monitor for 12 hours
- [ ] Full deployment to 100%

### Post-Deployment

- [ ] Monitor dashboards for 48 hours
- [ ] Review user feedback
- [ ] Analyze correction patterns
- [ ] Document any issues
- [ ] Update runbooks
- [ ] Schedule retrospective

---

## Document Control

**Version History**:
- 1.0.0 (2025-11-17): Initial architecture design

**Approvals**:
- System Architect: [Pending]
- ML Engineer Lead: [Pending]
- Platform Lead: [Pending]

**Next Review Date**: 2025-12-17
