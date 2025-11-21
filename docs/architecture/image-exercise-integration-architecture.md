# Image-Exercise Integration Architecture
## SPARC Methodology Implementation

**Architecture Designer**: System Architect Agent
**Date**: 2025-11-17
**Status**: Design Phase
**Swarm ID**: swarm-ugdua4o4y

---

## Executive Summary

This document outlines a comprehensive architecture for integrating approved images into exercise creation workflows, leveraging ML/Neural capabilities for intelligent image recommendations and seamless user experience.

### Key Objectives
1. Enable educators to select from quality-validated images during exercise creation
2. Provide ML-powered image recommendations based on learning objectives
3. Maintain attribution and licensing compliance
4. Optimize for performance and scalability
5. Support multi-language learning contexts

---

## Phase 1: SPARC Specification

### 1.1 Requirements Analysis

#### Functional Requirements

**FR-1: Image Selection in Exercise Creation**
- Users can browse and select approved images when creating exercises
- Images are filtered by species, quality score, and approval status
- Real-time preview with annotation overlays available
- Support for multiple images per exercise (visual discrimination)

**FR-2: ML-Powered Image Recommendations**
- System suggests optimal images based on exercise type and learning objectives
- Recommendations consider vocabulary coverage gaps
- Pattern learning from previous successful exercises
- Quality-first ranking using reinforcement learning feedback

**FR-3: Image Quality Validation**
- All images undergo quality assessment before availability
- Quality scores visible to educators
- Automatic filtering of low-quality or unsuitable images
- Support for manual quality override by admins

**FR-4: Attribution & Licensing**
- Automatic attribution generation for selected images
- License compliance tracking and enforcement
- Photographer credit display in exercises
- Unsplash API compliance (download tracking)

**FR-5: Exercise Type Support**
- **Visual Discrimination**: Select 3-4 similar species images
- **Visual Identification**: Single high-quality annotated image
- **Image Labeling**: Images with clear anatomical features
- **Contextual Fill**: Supporting imagery for sentences
- **Term Matching**: Species comparison imagery

#### Non-Functional Requirements

**NFR-1: Performance**
- Image browsing response time < 200ms
- ML recommendations computed in < 500ms
- Thumbnail loading < 100ms
- Support for 1000+ concurrent users

**NFR-2: Scalability**
- Support 10,000+ images in the catalog
- Handle 500+ species with multiple images each
- Efficient pagination for large result sets
- CDN integration for image delivery

**NFR-3: Usability**
- Intuitive image selection interface
- Mobile-responsive design
- Accessibility (WCAG 2.1 AA compliance)
- Multi-language support (Spanish/English)

**NFR-4: Reliability**
- 99.9% uptime for image services
- Graceful degradation when ML services unavailable
- Automatic retry for failed image operations
- Comprehensive error logging

### 1.2 User Stories

**US-1: Educator Creating Visual Discrimination Exercise**
```
As an educator
I want to select multiple bird images of similar species
So that learners can practice distinguishing between them

Acceptance Criteria:
- Can search/filter images by species, habitat, or characteristics
- See quality scores and approval status
- Preview images with existing annotations
- Select 2-4 images for the exercise
- System validates image selection (sufficient differences)
```

**US-2: System Recommending Images**
```
As the ML system
I want to recommend optimal images for each exercise type
So that exercises have maximum learning effectiveness

Acceptance Criteria:
- Analyze exercise type and learning objectives
- Consider vocabulary coverage gaps
- Apply pattern learning from successful exercises
- Rank by quality and relevance
- Provide reasoning for recommendations
```

**US-3: Admin Managing Image Quality**
```
As an administrator
I want to review and manage image quality settings
So that only suitable images are available for exercises

Acceptance Criteria:
- View quality assessment details
- Override automatic quality decisions
- Bulk approve/reject images
- Track quality metrics over time
- Export quality reports
```

### 1.3 Constraints

**Technical Constraints**
- PostgreSQL database (existing)
- React frontend with TypeScript
- Express.js backend
- Anthropic Claude Sonnet 4.5 for ML
- Supabase authentication
- Unsplash API rate limits (50 req/hour)

**Business Constraints**
- Unsplash attribution requirements
- GDPR compliance for user data
- Educational use licensing
- Budget for ML API calls

**Design Constraints**
- Must integrate with existing exercise system
- Cannot disrupt current annotation workflow
- Must support offline exercise creation (cached images)
- Mobile-first responsive design

### 1.4 Success Criteria

**Measurable Outcomes**
1. 80%+ of exercises use recommended images
2. Image selection time reduced by 50%
3. Quality score average > 75/100
4. Zero attribution violations
5. Vocabulary coverage gaps reduced by 30%
6. 90%+ user satisfaction with image selection UX

---

## Phase 2: SPARC Pseudocode

### 2.1 Core Algorithms

#### Algorithm 1: Image Selection Workflow

```pseudocode
FUNCTION selectImageForExercise(exerciseType, learningObjectives)
  // Step 1: Fetch candidate images
  candidates = fetchApprovedImages({
    minQualityScore: 60,
    hasAnnotations: true,
    species: extractSpeciesFromObjectives(learningObjectives)
  })

  // Step 2: Get ML recommendations
  recommendations = mlImageRecommender.recommend({
    candidates: candidates,
    exerciseType: exerciseType,
    objectives: learningObjectives,
    vocabularyGaps: getVocabularyGaps()
  })

  // Step 3: Rank and filter
  rankedImages = rankImages(recommendations, {
    qualityWeight: 0.4,
    relevanceWeight: 0.3,
    noveltyWeight: 0.2,
    diversityWeight: 0.1
  })

  // Step 4: Apply business rules
  finalImages = applyBusinessRules(rankedImages, exerciseType)

  RETURN {
    recommended: finalImages.slice(0, 5),
    all: rankedImages,
    reasoning: generateReasoningText(recommendations)
  }
END FUNCTION
```

#### Algorithm 2: ML Image Recommendation Engine

```pseudocode
CLASS MLImageRecommender:

  FUNCTION recommend(candidates, exerciseType, objectives, vocabularyGaps):
    // Step 1: Extract features
    features = []
    FOR EACH image IN candidates:
      features.append({
        imageId: image.id,
        qualityScore: image.qualityScore,
        annotationCount: image.annotationCount,
        features: extractImageFeatures(image),
        vocabulary: extractVocabulary(image.annotations),
        historicalSuccess: getHistoricalSuccessRate(image)
      })
    END FOR

    // Step 2: Calculate relevance scores
    FOR EACH feature IN features:
      feature.relevanceScore = calculateRelevance(
        feature,
        exerciseType,
        objectives
      )

      // Boost for vocabulary gap coverage
      IF feature.vocabulary OVERLAPS vocabularyGaps:
        feature.relevanceScore *= 1.3
      END IF

      // Boost for high historical success
      IF feature.historicalSuccess > 0.8:
        feature.relevanceScore *= 1.2
      END IF
    END FOR

    // Step 3: Apply pattern learning adjustments
    patternAdjustments = patternLearner.getPredictedAdjustments(
      features,
      exerciseType
    )

    FOR EACH feature, adjustment IN zip(features, patternAdjustments):
      feature.finalScore = (
        feature.qualityScore * 0.3 +
        feature.relevanceScore * 0.4 +
        feature.historicalSuccess * 0.2 +
        adjustment * 0.1
      )
    END FOR

    // Step 4: Sort and return
    SORT features BY finalScore DESC
    RETURN features
  END FUNCTION

  FUNCTION calculateRelevance(feature, exerciseType, objectives):
    MATCH exerciseType:
      CASE "visual_discrimination":
        RETURN scoreVisualDiscrimination(feature, objectives)
      CASE "visual_identification":
        RETURN scoreVisualIdentification(feature, objectives)
      CASE "image_labeling":
        RETURN scoreImageLabeling(feature, objectives)
      DEFAULT:
        RETURN scoreGeneric(feature, objectives)
    END MATCH
  END FUNCTION

  FUNCTION scoreVisualDiscrimination(feature, objectives):
    score = 0.0

    // Need multiple clear features for discrimination
    IF feature.features.length >= 3:
      score += 0.3
    END IF

    // High quality required for comparison
    IF feature.qualityScore > 75:
      score += 0.3
    END IF

    // Clear side profile preferred
    IF feature.orientation == "side_profile":
      score += 0.2
    END IF

    // Multiple annotations = more features to compare
    score += min(feature.annotationCount / 5.0, 0.2)

    RETURN score
  END FUNCTION

END CLASS
```

#### Algorithm 3: Image Quality Validation Pipeline

```pseudocode
FUNCTION validateImageQuality(imageUrl, speciesId):
  // Step 1: Fetch image
  imageData = fetchImage(imageUrl)

  // Step 2: Quality assessment via Claude Vision
  assessment = claudeVisionAPI.assess({
    image: imageData,
    criteria: [
      "bird_visibility",
      "feature_clarity",
      "technical_quality",
      "educational_value"
    ],
    minScore: 60
  })

  // Step 3: Store assessment
  qualityRecord = database.insert("image_quality_assessments", {
    imageId: imageData.id,
    speciesId: speciesId,
    overallScore: assessment.score,
    suitable: assessment.suitable,
    skipReason: assessment.skipReason,
    issues: assessment.issues,
    recommendations: assessment.recommendations,
    assessedAt: NOW()
  })

  // Step 4: Update image approval status
  IF assessment.suitable AND assessment.score >= 60:
    database.update("images", imageData.id, {
      approvalStatus: "approved",
      qualityScore: assessment.score
    })
  ELSE:
    database.update("images", imageData.id, {
      approvalStatus: "rejected",
      qualityScore: assessment.score,
      rejectionReason: assessment.skipReason
    })
  END IF

  // Step 5: Track for ML learning
  IF assessment.suitable:
    patternLearner.recordApproval(imageData.id, assessment)
  ELSE:
    patternLearner.recordRejection(imageData.id, assessment)
  END IF

  RETURN qualityRecord
END FUNCTION
```

#### Algorithm 4: Vocabulary Gap Analysis

```pseudocode
FUNCTION analyzeVocabularyGaps():
  // Step 1: Define target vocabulary (31 anatomical features)
  targetVocabulary = [
    "pico", "plumas", "alas", "cola", "patas",
    "ojos", "cresta", "pecho", "espalda", "garganta",
    // ... 21 more features
  ]

  // Step 2: Count current coverage
  coverageMap = {}
  FOR EACH feature IN targetVocabulary:
    count = database.count("annotations", {
      spanishTerm: feature,
      approvalStatus: "approved"
    })
    coverageMap[feature] = count
  END FOR

  // Step 3: Identify gaps
  gaps = []
  FOR feature, count IN coverageMap:
    IF count < THRESHOLD:
      gaps.append({
        feature: feature,
        currentCount: count,
        targetCount: THRESHOLD,
        priority: calculatePriority(feature, count)
      })
    END IF
  END FOR

  // Step 4: Sort by priority
  SORT gaps BY priority DESC

  RETURN {
    totalCoverage: (sum(coverageMap.values()) / (31 * THRESHOLD)) * 100,
    gaps: gaps,
    wellCovered: filter(coverageMap, count >= THRESHOLD)
  }
END FUNCTION
```

### 2.2 Workflow Diagrams

#### Workflow 1: Exercise Creation with Image Selection

```
[Educator]
    |
    v
[Start Exercise Creation]
    |
    v
[Select Exercise Type] --> (visual_discrimination | visual_identification | image_labeling)
    |
    v
[Define Learning Objectives]
    |
    v
[Request Image Recommendations] --> [ML Image Recommender]
    |                                        |
    |                                        v
    |                                [Fetch Approved Images]
    |                                        |
    |                                        v
    |                                [Calculate Relevance Scores]
    |                                        |
    |                                        v
    |                                [Apply Pattern Learning]
    |                                        |
    |                                        v
    |                                [Rank by Final Score]
    |                                        |
    v<---------------------------------------+
[Review Recommended Images]
    |
    v
[Manual Selection or Accept Recommendations]
    |
    v
[Preview Selected Images with Annotations]
    |
    v
[Validate Selection] --> (Pass | Fail) --Fail--> [Adjust Selection]
    |
   Pass
    |
    v
[Complete Exercise with Selected Images]
    |
    v
[Store Exercise-Image Relationships]
    |
    v
[Track Success Metrics for ML Learning]
    |
    v
[End]
```

#### Workflow 2: Image Approval Pipeline

```
[New Image Import] (Unsplash/Upload)
    |
    v
[Store in Database] --> (images table)
    |
    v
[Trigger Quality Assessment Job]
    |
    v
[Image Quality Validator Service]
    |
    |---> [Fetch Image Data]
    |
    |---> [Claude Vision API Assessment]
    |           |
    |           v
    |     [Analyze: Bird Visibility]
    |     [Analyze: Feature Clarity]
    |     [Analyze: Technical Quality]
    |     [Analyze: Educational Value]
    |           |
    |           v
    |     [Calculate Overall Score]
    |
    v
[Store Quality Assessment]
    |
    v
(Score >= 60?)
    |
    |--Yes--> [Mark as Approved] --> [Available for Exercises]
    |              |
    |              v
    |         [Record in rl_approvals]
    |
    |--No---> [Mark as Rejected] --> [Not Available]
                   |
                   v
              [Record in rl_rejection_patterns]
                   |
                   v
              [Pattern Learner Updates Model]
```

---

## Phase 3: SPARC Architecture

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Exercise       │  │  Image          │  │  Admin          │ │
│  │  Creation UI    │  │  Browser UI     │  │  Dashboard      │ │
│  │                 │  │                 │  │                 │ │
│  │  - Type Select  │  │  - Search/Filter│  │  - Quality Mgmt │ │
│  │  - Image Select │  │  - Preview      │  │  - ML Analytics │ │
│  │  - Preview      │  │  - Details      │  │  - Reports      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Gateway (Express)                  │  │
│  │  - Authentication (Supabase)                             │  │
│  │  - Rate Limiting                                         │  │
│  │  - Request Validation                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Exercise       │  │  Image          │  │  ML             │ │
│  │  Service        │  │  Service        │  │  Service        │ │
│  │                 │  │                 │  │                 │ │
│  │  - CRUD         │  │  - Search       │  │  - Recommend    │ │
│  │  - Validation   │  │  - Quality Mgmt │  │  - Pattern Learn│ │
│  │  - Caching      │  │  - Attribution  │  │  - RL Engine    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  PostgreSQL     │  │  Redis Cache    │  │  Unsplash API   │ │
│  │                 │  │                 │  │                 │ │
│  │  - exercises    │  │  - Image Recs   │  │  - Image Search │ │
│  │  - images       │  │  - Quality Data │  │  - Download     │ │
│  │  - annotations  │  │  - Session Data │  │  - Attribution  │ │
│  │  - species      │  │                 │  │                 │ │
│  │  - rl_tables    │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Claude Sonnet  │  │  Supabase       │  │  CDN            │ │
│  │  4.5 Vision API │  │  Auth           │  │  (Image         │ │
│  │                 │  │                 │  │   Delivery)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema Design

#### New Tables

```sql
-- Exercise-Image Relationships
CREATE TABLE exercise_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,

  -- Position in exercise (for visual discrimination with multiple images)
  position INTEGER NOT NULL DEFAULT 1,

  -- Is this the correct answer image?
  is_correct_answer BOOLEAN DEFAULT FALSE,

  -- Override annotations for this specific exercise
  annotation_overrides JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(exercise_id, image_id, position),
  CHECK(position > 0)
);

CREATE INDEX idx_exercise_images_exercise ON exercise_images(exercise_id);
CREATE INDEX idx_exercise_images_image ON exercise_images(image_id);
CREATE INDEX idx_exercise_images_position ON exercise_images(exercise_id, position);

-- Image Quality Assessments (Expanded)
CREATE TABLE image_quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,

  -- Quality metrics
  overall_score INTEGER NOT NULL CHECK(overall_score >= 0 AND overall_score <= 100),
  bird_visibility_score INTEGER CHECK(bird_visibility_score >= 0 AND bird_visibility_score <= 40),
  feature_clarity_score INTEGER CHECK(feature_clarity_score >= 0 AND feature_clarity_score <= 30),
  technical_quality_score INTEGER CHECK(technical_quality_score >= 0 AND technical_quality_score <= 20),
  educational_value_score INTEGER CHECK(educational_value_score >= 0 AND educational_value_score <= 10),

  -- Assessment details
  suitable BOOLEAN NOT NULL,
  skip_reason TEXT,
  issues TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',

  -- ML metadata
  assessed_by VARCHAR(50) DEFAULT 'claude-sonnet-4.5',
  assessment_version VARCHAR(20),

  -- Timestamps
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(image_id, assessed_at)
);

CREATE INDEX idx_quality_assessments_image ON image_quality_assessments(image_id);
CREATE INDEX idx_quality_assessments_suitable ON image_quality_assessments(suitable, overall_score DESC);
CREATE INDEX idx_quality_assessments_score ON image_quality_assessments(overall_score DESC);

-- Image Recommendations Cache
CREATE TABLE image_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request context
  exercise_type VARCHAR(50) NOT NULL,
  learning_objectives JSONB NOT NULL,
  species_filter UUID[],

  -- Recommendations
  recommended_images JSONB NOT NULL, -- Array of {imageId, score, reasoning}

  -- Cache metadata
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  ml_model_version VARCHAR(20),
  vocabulary_gaps_snapshot JSONB,

  -- Expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,

  -- Constraints
  CHECK(expires_at > created_at)
);

CREATE INDEX idx_recommendations_cache_key ON image_recommendations_cache(cache_key);
CREATE INDEX idx_recommendations_expires ON image_recommendations_cache(expires_at);
CREATE INDEX idx_recommendations_type ON image_recommendations_cache(exercise_type);

-- Image Usage Analytics
CREATE TABLE image_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,

  -- Usage context
  used_in_exercise_type VARCHAR(50) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,

  -- Success metrics
  was_recommended BOOLEAN DEFAULT FALSE,
  recommendation_rank INTEGER,
  user_selected BOOLEAN DEFAULT TRUE,

  -- Learning outcomes (populated after exercise completion)
  average_completion_time INTEGER, -- milliseconds
  success_rate DECIMAL(5, 4), -- 0.0000 to 1.0000
  learner_feedback_score INTEGER CHECK(learner_feedback_score >= 1 AND learner_feedback_score <= 5),

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Feedback collection
  feedback_collected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_usage_analytics_image ON image_usage_analytics(image_id);
CREATE INDEX idx_usage_analytics_exercise_type ON image_usage_analytics(used_in_exercise_type);
CREATE INDEX idx_usage_analytics_success ON image_usage_analytics(success_rate DESC NULLS LAST);
CREATE INDEX idx_usage_analytics_recommended ON image_usage_analytics(was_recommended, recommendation_rank);
```

#### Schema Modifications

```sql
-- Add new columns to existing images table
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'
    CHECK(approval_status IN ('pending', 'approved', 'rejected', 'under_review')),
  ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK(quality_score >= 0 AND quality_score <= 100),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS exercise_usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_images_approval_status ON images(approval_status, quality_score DESC);
CREATE INDEX idx_images_usage_count ON images(exercise_usage_count DESC);

-- Add new columns to existing exercises table (if not exists)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uses_ml_recommendations BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recommendation_acceptance_rate DECIMAL(5, 4);

CREATE INDEX idx_exercises_primary_image ON exercises(primary_image_id);
```

### 3.3 API Contract Design

#### Endpoint Group: Image Management

```typescript
// GET /api/images/search
interface ImageSearchRequest {
  query?: string;
  speciesId?: string;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  minQualityScore?: number;
  exerciseType?: ExerciseType;
  hasAnnotations?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'quality' | 'usage' | 'created' | 'relevance';
}

interface ImageSearchResponse {
  images: ImageWithQuality[];
  total: number;
  page: number;
  pageSize: number;
  filters: AppliedFilters;
}

interface ImageWithQuality {
  id: string;
  speciesId: string;
  speciesName: { english: string; spanish: string };
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  approvalStatus: string;
  qualityScore: number;
  qualityAssessment?: {
    suitable: boolean;
    issues: string[];
    recommendations: string[];
  };
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  annotationCount: number;
  exerciseUsageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

// POST /api/images/recommendations
interface ImageRecommendationRequest {
  exerciseType: ExerciseType;
  learningObjectives: {
    targetVocabulary?: string[];
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    species?: string[];
    features?: string[];
  };
  count?: number; // Default 5
  excludeImageIds?: string[];
}

interface ImageRecommendationResponse {
  recommendations: RecommendedImage[];
  reasoning: {
    vocabularyGapsFilled: string[];
    qualityDistribution: { high: number; medium: number; low: number };
    diversityScore: number;
  };
  alternates: RecommendedImage[];
  mlModelVersion: string;
  cachedResult: boolean;
}

interface RecommendedImage extends ImageWithQuality {
  recommendationScore: number;
  recommendationReasoning: string[];
  rank: number;
  matchedObjectives: string[];
}

// GET /api/images/:id/quality-assessment
interface ImageQualityResponse {
  imageId: string;
  overallScore: number;
  breakdown: {
    birdVisibility: number;
    featureClarity: number;
    technicalQuality: number;
    educationalValue: number;
  };
  suitable: boolean;
  skipReason?: string;
  issues: string[];
  recommendations: string[];
  assessedBy: string;
  assessedAt: string;
}

// POST /api/images/:id/approve (Admin only)
interface ImageApprovalRequest {
  approved: boolean;
  overrideQualityScore?: number;
  notes?: string;
}

interface ImageApprovalResponse {
  imageId: string;
  approvalStatus: 'approved' | 'rejected';
  qualityScore: number;
  approvedBy: string;
  approvedAt: string;
}
```

#### Endpoint Group: Exercise-Image Integration

```typescript
// POST /api/exercises/:id/images
interface AddImageToExerciseRequest {
  imageId: string;
  position: number;
  isCorrectAnswer?: boolean;
  annotationOverrides?: AnnotationOverride[];
}

interface AnnotationOverride {
  annotationId: string;
  visibility?: boolean;
  customLabel?: string;
}

interface AddImageToExerciseResponse {
  exerciseImageId: string;
  exerciseId: string;
  imageId: string;
  position: number;
  image: ImageWithQuality;
}

// GET /api/exercises/:id/images
interface ExerciseImagesResponse {
  exerciseId: string;
  images: ExerciseImage[];
}

interface ExerciseImage extends ImageWithQuality {
  position: number;
  isCorrectAnswer: boolean;
  annotationOverrides?: AnnotationOverride[];
  exerciseImageId: string;
}

// DELETE /api/exercises/:exerciseId/images/:imageId
interface RemoveImageResponse {
  success: boolean;
  message: string;
}
```

#### Endpoint Group: Analytics

```typescript
// GET /api/analytics/image-performance
interface ImagePerformanceRequest {
  imageId?: string;
  exerciseType?: ExerciseType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface ImagePerformanceResponse {
  analytics: ImagePerformanceData[];
  summary: {
    totalUsage: number;
    averageSuccessRate: number;
    averageCompletionTime: number;
    averageFeedbackScore: number;
  };
}

interface ImagePerformanceData {
  imageId: string;
  imageThumbnail: string;
  speciesName: string;
  usageCount: number;
  exerciseTypes: Record<ExerciseType, number>;
  successRate: number;
  averageCompletionTime: number;
  feedbackScore: number;
  recommendationAcceptanceRate: number;
}

// GET /api/analytics/recommendation-effectiveness
interface RecommendationEffectivenessResponse {
  overall: {
    totalRecommendations: number;
    acceptanceRate: number;
    averageRank: number;
    improvementOverRandom: number;
  };
  byExerciseType: Record<ExerciseType, {
    recommendationCount: number;
    acceptanceRate: number;
    averageSuccessRate: number;
  }>;
  topPerformingFeatures: Array<{
    feature: string;
    recommendationCount: number;
    acceptanceRate: number;
    successRate: number;
  }>;
}
```

### 3.4 Component Architecture (Frontend)

```typescript
// Component Hierarchy
<ExerciseCreationFlow>
  <ExerciseTypeSelector />
  <LearningObjectivesForm />
  <ImageSelectionStep>
    <ImageRecommendationsPanel>
      <RecommendedImageCard />
      <RecommendationReasoning />
      <AcceptAllButton />
    </ImageRecommendationsPanel>

    <ImageBrowserPanel>
      <ImageSearchBar />
      <ImageFilters>
        <SpeciesFilter />
        <QualityFilter />
        <ApprovalStatusFilter />
      </ImageFilters>
      <ImageGrid>
        <ImageCard>
          <ImageThumbnail />
          <QualityBadge />
          <SelectButton />
          <PreviewButton />
        </ImageCard>
      </ImageGrid>
      <Pagination />
    </ImageBrowserPanel>

    <SelectedImagesPanel>
      <SelectedImagePreview>
        <ImageWithAnnotations />
        <PositionControls />
        <RemoveButton />
      </SelectedImagePreview>
      <ValidationStatus />
    </SelectedImagesPanel>
  </ImageSelectionStep>

  <ExercisePreview />
  <SaveButton />
</ExerciseCreationFlow>

// State Management
interface ExerciseCreationState {
  exerciseType: ExerciseType | null;
  learningObjectives: LearningObjectives;
  recommendedImages: RecommendedImage[];
  selectedImages: SelectedImage[];
  allImages: ImageWithQuality[];
  filters: ImageFilters;
  searchQuery: string;
  validationErrors: ValidationError[];
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// Actions
type ExerciseCreationAction =
  | { type: 'SET_EXERCISE_TYPE'; payload: ExerciseType }
  | { type: 'SET_LEARNING_OBJECTIVES'; payload: LearningObjectives }
  | { type: 'LOAD_RECOMMENDATIONS'; payload: RecommendedImage[] }
  | { type: 'SELECT_IMAGE'; payload: { image: ImageWithQuality; position: number } }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'REORDER_IMAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_FILTERS'; payload: Partial<ImageFilters> }
  | { type: 'SEARCH_IMAGES'; payload: string }
  | { type: 'VALIDATE_SELECTION' }
  | { type: 'SAVE_EXERCISE' };
```

### 3.5 ML/Neural Integration Points

#### Integration 1: Pattern Learning Service

```typescript
class PatternLearnerService {
  /**
   * Learn from exercise usage patterns
   */
  async learnFromExerciseUsage(
    exerciseId: string,
    imageIds: string[],
    outcomes: LearningOutcome[]
  ): Promise<void> {
    // Collect features
    const features = await this.extractFeatures(imageIds);

    // Calculate reward signal
    const reward = this.calculateReward(outcomes);

    // Update pattern database
    await this.updatePatterns(features, reward);

    // Retrain model if threshold reached
    if (await this.shouldRetrain()) {
      await this.scheduleRetraining();
    }
  }

  /**
   * Get pattern-based adjustments for recommendations
   */
  async getPredictedAdjustments(
    imageFeatures: ImageFeatures[],
    exerciseType: ExerciseType
  ): Promise<number[]> {
    // Query learned patterns
    const patterns = await this.getRelevantPatterns(exerciseType);

    // Apply patterns to features
    const adjustments = imageFeatures.map(features => {
      return this.calculateAdjustment(features, patterns);
    });

    return adjustments;
  }
}
```

#### Integration 2: Reinforcement Learning Engine

```typescript
class ReinforcementLearningEngine {
  /**
   * Process feedback from exercise completions
   */
  async processFeedback(feedback: ExerciseFeedback): Promise<void> {
    // Determine reward/penalty
    const reward = this.calculateReward(feedback);

    // Update value estimates
    await this.updateValueFunction(feedback.imageId, reward);

    // Store in RL tables
    await this.storeRLData({
      imageId: feedback.imageId,
      exerciseType: feedback.exerciseType,
      reward: reward,
      state: feedback.state,
      action: feedback.action,
      nextState: feedback.nextState
    });
  }

  /**
   * Get action recommendations based on current policy
   */
  async recommendActions(
    state: ExerciseState
  ): Promise<RecommendedAction[]> {
    // Get current policy
    const policy = await this.getCurrentPolicy(state.exerciseType);

    // Sample actions
    const actions = await this.sampleActions(state, policy);

    return actions;
  }
}
```

#### Integration 3: Quality Validator with ML Feedback Loop

```typescript
class ImageQualityValidator {
  /**
   * Assess image quality with ML feedback
   */
  async assessQuality(imageUrl: string): Promise<QualityAssessment> {
    // Use Claude Vision API
    const assessment = await this.claudeVisionAPI.assess(imageUrl);

    // Apply learned corrections
    const corrections = await this.patternLearner.getQualityCorrections();
    const adjustedScore = this.applyCorrections(
      assessment.score,
      corrections
    );

    // Store assessment
    await this.storeAssessment({
      ...assessment,
      adjustedScore,
      corrections
    });

    return {
      ...assessment,
      score: adjustedScore
    };
  }

  /**
   * Learn from manual quality overrides
   */
  async learnFromOverride(
    imageId: string,
    autoScore: number,
    manualScore: number,
    reasons: string[]
  ): Promise<void> {
    // Calculate correction delta
    const delta = manualScore - autoScore;

    // Store learning pattern
    await this.patternLearner.recordCorrection({
      imageId,
      delta,
      reasons,
      timestamp: new Date()
    });

    // Update quality model
    await this.updateQualityModel();
  }
}
```

### 3.6 Performance Optimization Strategy

#### Caching Strategy

```typescript
// Multi-level caching
interface CacheStrategy {
  levels: {
    // L1: In-memory cache (Node.js)
    memory: {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100, // items
      keys: [
        'image-recommendations',
        'quality-assessments',
        'vocabulary-gaps'
      ]
    },

    // L2: Redis cache
    redis: {
      ttl: 30 * 60, // 30 minutes
      keys: [
        'image-search-results',
        'ml-recommendations',
        'species-data'
      ]
    },

    // L3: CDN cache (CloudFlare)
    cdn: {
      ttl: 7 * 24 * 60 * 60, // 7 days
      resources: [
        'image-thumbnails',
        'image-previews'
      ]
    }
  },

  invalidation: {
    onImageApproval: ['image-search-results', 'ml-recommendations'],
    onQualityUpdate: ['quality-assessments', 'image-recommendations'],
    onNewAnnotation: ['image-search-results', 'vocabulary-gaps']
  }
}
```

#### Database Optimization

```sql
-- Materialized view for fast vocabulary gap queries
CREATE MATERIALIZED VIEW vocabulary_coverage_summary AS
SELECT
  annotation_feature as feature,
  COUNT(*) as annotation_count,
  COUNT(DISTINCT image_id) as image_count,
  AVG(quality_score) as avg_quality,
  MAX(updated_at) as last_updated
FROM annotations a
JOIN images i ON a.image_id = i.id::text
WHERE i.approval_status = 'approved'
GROUP BY annotation_feature;

CREATE UNIQUE INDEX ON vocabulary_coverage_summary(feature);

-- Refresh strategy: Every hour or on significant data changes
CREATE OR REPLACE FUNCTION refresh_vocabulary_coverage()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vocabulary_coverage_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Optimized query for image recommendations
CREATE INDEX idx_images_composite_recommendation ON images(
  approval_status,
  quality_score DESC,
  exercise_usage_count,
  annotation_count
) WHERE approval_status = 'approved';
```

#### API Response Optimization

```typescript
// Pagination with cursor-based approach
interface CursorPaginationParams {
  cursor?: string; // Base64 encoded cursor
  limit?: number;  // Default 20, max 100
}

interface CursorPaginationResponse<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  totalCount?: number; // Optional, expensive to compute
}

// Progressive image loading
interface ImageLoadingStrategy {
  thumbnail: {
    format: 'webp',
    quality: 60,
    width: 200,
    loadPriority: 'high'
  },
  preview: {
    format: 'webp',
    quality: 80,
    width: 800,
    loadPriority: 'low',
    lazy: true
  },
  fullSize: {
    format: 'original',
    quality: 95,
    loadPriority: 'low',
    lazy: true,
    onDemand: true
  }
}
```

### 3.7 Security & Compliance Architecture

#### Authentication & Authorization

```typescript
// Role-based access control
enum Role {
  ADMIN = 'admin',
  EDUCATOR = 'educator',
  LEARNER = 'learner'
}

enum Permission {
  // Image management
  IMAGE_VIEW = 'image:view',
  IMAGE_APPROVE = 'image:approve',
  IMAGE_REJECT = 'image:reject',
  IMAGE_DELETE = 'image:delete',
  IMAGE_QUALITY_OVERRIDE = 'image:quality:override',

  // Exercise management
  EXERCISE_CREATE = 'exercise:create',
  EXERCISE_EDIT = 'exercise:edit',
  EXERCISE_DELETE = 'exercise:delete',
  EXERCISE_PUBLISH = 'exercise:publish',

  // Analytics access
  ANALYTICS_VIEW_BASIC = 'analytics:view:basic',
  ANALYTICS_VIEW_ADVANCED = 'analytics:view:advanced',
  ANALYTICS_EXPORT = 'analytics:export',

  // ML management
  ML_RECOMMENDATIONS_VIEW = 'ml:recommendations:view',
  ML_MODEL_RETRAIN = 'ml:model:retrain',
  ML_PATTERNS_MANAGE = 'ml:patterns:manage'
}

const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // All permissions
    ...Object.values(Permission)
  ],
  [Role.EDUCATOR]: [
    Permission.IMAGE_VIEW,
    Permission.EXERCISE_CREATE,
    Permission.EXERCISE_EDIT,
    Permission.EXERCISE_DELETE,
    Permission.EXERCISE_PUBLISH,
    Permission.ANALYTICS_VIEW_BASIC,
    Permission.ML_RECOMMENDATIONS_VIEW
  ],
  [Role.LEARNER]: [
    // Limited to viewing assigned exercises
  ]
};

// Middleware for permission checking
function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // From Supabase auth
    const userRole = user.role as Role;

    if (!RolePermissions[userRole]?.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
}
```

#### Data Privacy & Compliance

```typescript
// GDPR compliance measures
interface GDPRCompliance {
  dataRetention: {
    imageUsageAnalytics: '2 years',
    qualityAssessments: '1 year',
    mlTrainingData: '3 years',
    userSessions: '90 days'
  },

  rightToForget: {
    anonymizeUserData: (userId: string) => Promise<void>,
    deleteUserImages: (userId: string) => Promise<void>,
    exportUserData: (userId: string) => Promise<ExportPackage>
  },

  dataMini minimization: {
    // Only collect necessary data
    requiredFields: [
      'imageId',
      'exerciseType',
      'usageTimestamp'
    ],
    optionalFields: [
      'userId', // Anonymized
      'sessionId', // Anonymized
      'deviceType'
    ]
  }
}

// Unsplash API compliance
interface UnsplashCompliance {
  attribution: {
    format: 'Photo by {photographer} on Unsplash',
    linkToPhoto: true,
    linkToProfile: true,
    trackDownloads: true
  },

  downloadTracking: {
    endpoint: 'https://api.unsplash.com/photos/{id}/download',
    triggerOn: 'imageView',
    rateLimit: '50 requests/hour'
  },

  licensing: {
    allowCommercialUse: false, // Educational use only
    requireAttribution: true,
    modificationAllowed: true // For educational annotations
  }
}
```

### 3.8 Deployment Architecture

#### Infrastructure as Code

```yaml
# Kubernetes deployment manifests
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-service
  labels:
    app: aves
    component: image-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: aves
      component: image-service
  template:
    metadata:
      labels:
        app: aves
        component: image-service
    spec:
      containers:
      - name: image-service
        image: aves/image-service:latest
        ports:
        - containerPort: 3000
          protocol: TCP
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aves-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: aves-secrets
              key: redis-url
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: aves-secrets
              key: anthropic-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: image-service
  labels:
    app: aves
    component: image-service
spec:
  selector:
    app: aves
    component: image-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: image-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: image-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Monitoring & Observability

```typescript
// Metrics collection
interface MetricsCollection {
  businessMetrics: {
    'image.recommendations.generated': Counter,
    'image.recommendations.accepted': Counter,
    'image.recommendations.rejected': Counter,
    'exercise.created.with_images': Counter,
    'image.quality.assessed': Counter,
    'image.approval.manual_override': Counter
  },

  performanceMetrics: {
    'api.image.search.duration': Histogram,
    'api.recommendations.duration': Histogram,
    'ml.pattern_learning.duration': Histogram,
    'cache.hit_rate': Gauge,
    'database.query.duration': Histogram
  },

  systemMetrics: {
    'service.uptime': Gauge,
    'service.memory.usage': Gauge,
    'service.cpu.usage': Gauge,
    'service.requests.total': Counter,
    'service.requests.errors': Counter
  }
}

// Logging strategy
interface LoggingStrategy {
  levels: {
    error: 'Always logged',
    warn: 'Always logged',
    info: 'Production: Key events only',
    debug: 'Development only',
    trace: 'Development only'
  },

  structuredLogging: {
    format: 'JSON',
    fields: [
      'timestamp',
      'level',
      'service',
      'traceId',
      'userId',
      'action',
      'duration',
      'status',
      'metadata'
    ]
  },

  aggregation: {
    tool: 'Elasticsearch + Kibana',
    retention: '90 days',
    alerting: true
  }
}
```

---

## Phase 4: Implementation Roadmap

### 4.1 Development Phases

#### Phase 1: Foundation (Weeks 1-2)

**Database Schema**
- [ ] Create new tables (exercise_images, image_quality_assessments, etc.)
- [ ] Add columns to existing tables (images, exercises)
- [ ] Create indexes for performance
- [ ] Write and test migrations
- [ ] Setup database seed data

**API Foundation**
- [ ] Implement image search endpoint
- [ ] Implement basic quality assessment endpoint
- [ ] Setup authentication middleware
- [ ] Implement rate limiting
- [ ] Write API documentation

**Testing Setup**
- [ ] Unit test framework setup
- [ ] Integration test setup
- [ ] Test data fixtures
- [ ] CI/CD pipeline configuration

#### Phase 2: ML Integration (Weeks 3-4)

**Pattern Learning**
- [ ] Implement PatternLearner service
- [ ] Connect to reinforcement learning tables
- [ ] Create pattern analysis algorithms
- [ ] Setup automated retraining triggers

**Image Recommendations**
- [ ] Implement recommendation engine
- [ ] Create relevance scoring algorithms
- [ ] Implement vocabulary gap analysis
- [ ] Setup recommendation caching
- [ ] Test recommendation accuracy

**Quality Validation**
- [ ] Integrate Claude Vision API
- [ ] Implement quality assessment workflow
- [ ] Create approval/rejection logic
- [ ] Setup quality feedback loop

#### Phase 3: Frontend Development (Weeks 5-6)

**Image Selection UI**
- [ ] Build image browser component
- [ ] Implement search and filters
- [ ] Create image card components
- [ ] Build recommendation panel
- [ ] Implement image preview modal

**Exercise Creation Flow**
- [ ] Integrate image selection into exercise creation
- [ ] Build selected images panel
- [ ] Implement drag-and-drop reordering
- [ ] Create validation UI
- [ ] Build exercise preview

**Admin Dashboard**
- [ ] Build quality management interface
- [ ] Create analytics dashboards
- [ ] Implement bulk operations UI
- [ ] Build ML monitoring dashboard

#### Phase 4: Integration & Testing (Week 7)

**End-to-End Testing**
- [ ] Exercise creation flow testing
- [ ] Image recommendation testing
- [ ] Quality validation testing
- [ ] Performance testing
- [ ] Security testing

**User Acceptance Testing**
- [ ] Educator testing session
- [ ] Admin testing session
- [ ] Gather feedback
- [ ] Implement refinements

#### Phase 5: Deployment & Monitoring (Week 8)

**Deployment**
- [ ] Production database migration
- [ ] Service deployment
- [ ] CDN configuration
- [ ] DNS configuration
- [ ] Rollback plan preparation

**Monitoring Setup**
- [ ] Metrics collection configuration
- [ ] Dashboard creation
- [ ] Alert rule setup
- [ ] Log aggregation setup

**Documentation**
- [ ] User documentation
- [ ] Admin documentation
- [ ] Developer documentation
- [ ] API documentation
- [ ] Runbook creation

### 4.2 Testing Strategy

```typescript
// Unit Testing
describe('MLImageRecommender', () => {
  describe('recommend()', () => {
    it('should return top 5 recommendations by default', async () => {
      const recommender = new MLImageRecommender();
      const result = await recommender.recommend({
        candidates: mockImages,
        exerciseType: 'visual_discrimination',
        objectives: mockObjectives,
        vocabularyGaps: []
      });

      expect(result).toHaveLength(5);
      expect(result[0].finalScore).toBeGreaterThan(result[1].finalScore);
    });

    it('should boost images that fill vocabulary gaps', async () => {
      const recommender = new MLImageRecommender();
      const result = await recommender.recommend({
        candidates: mockImages,
        exerciseType: 'visual_identification',
        objectives: mockObjectives,
        vocabularyGaps: ['pico', 'plumas']
      });

      // Images with 'pico' or 'plumas' annotations should rank higher
      const topImage = result[0];
      const annotations = await getAnnotations(topImage.imageId);
      const hasGapVocabulary = annotations.some(a =>
        ['pico', 'plumas'].includes(a.spanishTerm)
      );

      expect(hasGapVocabulary).toBe(true);
    });
  });
});

// Integration Testing
describe('Image Selection Flow', () => {
  it('should complete full exercise creation with image selection', async () => {
    // Setup
    const educator = await createTestUser('educator');
    const session = await authenticateUser(educator);

    // Step 1: Start exercise creation
    const exercise = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        type: 'visual_discrimination',
        title: 'Test Exercise'
      });

    expect(exercise.status).toBe(201);

    // Step 2: Get image recommendations
    const recommendations = await request(app)
      .post('/api/images/recommendations')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        exerciseType: 'visual_discrimination',
        learningObjectives: {
          targetVocabulary: ['alas', 'cola'],
          difficultyLevel: 'intermediate'
        },
        count: 3
      });

    expect(recommendations.status).toBe(200);
    expect(recommendations.body.recommendations).toHaveLength(3);

    // Step 3: Add images to exercise
    const selectedImages = recommendations.body.recommendations.slice(0, 3);

    for (let i = 0; i < selectedImages.length; i++) {
      const result = await request(app)
        .post(`/api/exercises/${exercise.body.id}/images`)
        .set('Authorization', `Bearer ${session.token}`)
        .send({
          imageId: selectedImages[i].id,
          position: i + 1,
          isCorrectAnswer: i === 0
        });

      expect(result.status).toBe(201);
    }

    // Step 4: Verify exercise is complete
    const completeExercise = await request(app)
      .get(`/api/exercises/${exercise.body.id}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(completeExercise.body.images).toHaveLength(3);
    expect(completeExercise.body.status).toBe('draft');
  });
});

// Performance Testing
describe('Performance Benchmarks', () => {
  it('should return image search results in < 200ms', async () => {
    const start = Date.now();

    const result = await request(app)
      .get('/api/images/search')
      .query({
        approvalStatus: 'approved',
        minQualityScore: 60,
        limit: 20
      });

    const duration = Date.now() - start;

    expect(result.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  it('should return ML recommendations in < 500ms', async () => {
    const start = Date.now();

    const result = await request(app)
      .post('/api/images/recommendations')
      .send({
        exerciseType: 'visual_discrimination',
        learningObjectives: mockObjectives,
        count: 5
      });

    const duration = Date.now() - start;

    expect(result.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
```

### 4.3 Rollout Strategy

**Phase 1: Internal Beta (Week 9)**
- Deploy to staging environment
- Invite 5-10 internal educators
- Monitor all metrics closely
- Daily feedback sessions
- Rapid iteration on issues

**Phase 2: Limited Release (Week 10)**
- Deploy to production with feature flag
- Enable for 20% of educators
- A/B testing: Old flow vs. New flow
- Collect usage analytics
- Monitor performance and errors

**Phase 3: Full Rollout (Week 11)**
- Gradually increase to 50%, then 100%
- Monitor key metrics:
  - Recommendation acceptance rate
  - Exercise creation time
  - Image quality scores
  - System performance
  - User satisfaction

**Phase 4: Optimization (Week 12+)**
- Analyze usage patterns
- Refine ML models based on data
- Implement user-requested features
- Performance tuning
- Cost optimization

### 4.4 Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ML recommendations poor quality | High | Medium | Extensive testing, fallback to manual selection |
| Performance degradation | High | Low | Load testing, caching, horizontal scaling |
| Unsplash API rate limits | Medium | Medium | Rate limiting, caching, error handling |
| User adoption low | Medium | Low | Training materials, in-app guidance, feedback loop |
| Database migration issues | High | Low | Comprehensive testing, rollback plan, backup strategy |
| Claude API costs exceed budget | Medium | Medium | Request caching, batch processing, usage monitoring |
| Security vulnerabilities | High | Low | Security audit, penetration testing, regular updates |

---

## Phase 5: Success Metrics & KPIs

### 5.1 Product Metrics

**User Engagement**
- Recommendation acceptance rate > 80%
- Image selection time reduced by > 50%
- Exercise creation completion rate > 95%
- Feature usage rate > 70% of active educators

**Content Quality**
- Average image quality score > 75/100
- Vocabulary coverage > 90% of 31 target features
- Annotation quality score > 80/100
- Exercise success rate > 85%

**System Performance**
- API response time p95 < 300ms
- Image load time p95 < 150ms
- ML recommendation time < 500ms
- System uptime > 99.9%

### 5.2 Business Metrics

**Operational Efficiency**
- Educator time saved per exercise > 5 minutes
- Content creation velocity increase > 40%
- Support tickets related to images < 5 per week
- Manual quality overrides < 10% of assessments

**Cost Efficiency**
- Claude API cost per exercise < $0.10
- CDN bandwidth cost < $50/month
- Infrastructure cost increase < 20%
- ROI positive within 6 months

### 5.3 Learning Outcomes

**Learner Performance**
- Exercise completion rate > 90%
- Average score improvement > 15%
- Time to proficiency reduced by > 20%
- Learner satisfaction score > 4.5/5

---

## Conclusion

This architecture provides a comprehensive, scalable, and ML-powered solution for integrating approved images into exercise creation workflows. The design prioritizes:

1. **User Experience**: Intuitive interfaces with intelligent recommendations
2. **Quality**: Multi-layered validation ensuring only suitable images are used
3. **Performance**: Optimized for speed and scalability
4. **Intelligence**: ML-driven recommendations that improve over time
5. **Compliance**: Full attribution and licensing compliance
6. **Observability**: Comprehensive monitoring and analytics

The phased implementation approach minimizes risk while allowing for iterative improvements based on real user feedback and data.

---

## Appendices

### Appendix A: Glossary

- **SPARC**: Specification, Pseudocode, Architecture, Refinement, Completion
- **RL**: Reinforcement Learning
- **ML**: Machine Learning
- **CDN**: Content Delivery Network
- **API**: Application Programming Interface
- **TTL**: Time To Live (cache expiration)
- **WCAG**: Web Content Accessibility Guidelines
- **GDPR**: General Data Protection Regulation

### Appendix B: References

1. Anthropic Claude API Documentation
2. Unsplash API Guidelines
3. PostgreSQL Performance Tuning Guide
4. React Performance Best Practices
5. Reinforcement Learning: An Introduction (Sutton & Barto)
6. WCAG 2.1 Guidelines
7. OWASP Security Best Practices

### Appendix C: Related Documents

- `/backend/docs/migrations/SQL_QUERIES.sql` - Database migration queries
- `/backend/migrations/008_create_rl_tables.sql` - RL tables schema
- `/backend/src/services/PatternLearner.ts` - Pattern learning implementation
- `/frontend/src/components/admin/MLAnalyticsDashboard.tsx` - ML analytics UI

---

**Document Status**: Design Complete
**Next Steps**: Begin Phase 1 implementation
**Review Date**: 2025-11-24
**Approvers**: Technical Lead, Product Manager, ML Engineer
