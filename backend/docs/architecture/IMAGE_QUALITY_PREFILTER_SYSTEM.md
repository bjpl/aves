# Image Quality Pre-Filter System Architecture

**Version:** 1.0.0
**Created:** 2025-11-17
**Status:** Design Phase
**Author:** System Architect (Claude Code)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Quality Checks Specification](#quality-checks-specification)
4. [Architecture Design](#architecture-design)
5. [Component Specifications](#component-specifications)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Data Flow & Sequence Diagrams](#data-flow--sequence-diagrams)
9. [Integration Points](#integration-points)
10. [Error Handling](#error-handling)
11. [Performance Optimization](#performance-optimization)
12. [Monitoring & Metrics](#monitoring--metrics)
13. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Purpose

The Image Quality Pre-Filter System validates bird images before expensive AI annotation processing to:

- **Reduce API Costs**: Filter low-quality images before calling Claude Sonnet 4.5 Vision API
- **Improve Annotation Accuracy**: Ensure bird is clearly visible and properly sized
- **Provide Quality Feedback**: Give detailed suggestions for better image selection
- **Track Quality Metrics**: Monitor image quality trends over time

### Key Benefits

| Benefit | Impact |
|---------|--------|
| **API Cost Reduction** | 87.5% token savings on failed images (500 vs 8000 tokens) |
| **Annotation Quality** | Higher accuracy by ensuring clear bird visibility |
| **User Experience** | Immediate feedback on why images were rejected |
| **Data Quality** | Systematic quality tracking for continuous improvement |

### High-Level Flow

```
Image Request → Quality Pre-Check → Pass? → Full Annotation
                                  → Fail? → Return Quality Report
```

---

## System Overview

### Context Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   AVES Annotation System                     │
│                                                              │
│  ┌──────────┐      ┌──────────────────┐      ┌──────────┐ │
│  │  Admin   │─────>│  Quality Filter  │─────>│  Vision  │ │
│  │   UI     │      │     System       │      │ AI Service│ │
│  └──────────┘      └──────────────────┘      └──────────┘ │
│                            │                                │
│                            ▼                                │
│                    ┌──────────────┐                        │
│                    │  PostgreSQL  │                        │
│                    │  (Quality DB)│                        │
│                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Scope

**In Scope:**
- Image resolution validation
- Bird size in frame estimation
- Bird positioning and occlusion detection
- Contrast and brightness analysis
- Bird primacy verification (is bird the main subject?)
- Quality result caching in database
- Admin API for quality checking

**Out of Scope:**
- Image enhancement or preprocessing
- Automatic image cropping or adjustment
- Real-time image quality scoring during upload
- Batch quality analysis tools (future phase)

---

## Quality Checks Specification

### 1. Bird Size in Frame

**Requirement:** Bird must occupy ≥15% of total image area

**Rationale:**
- Small birds are difficult to annotate accurately
- Bounding boxes become imprecise for tiny features
- Educational value reduced if bird is too distant

**Calculation:**
```typescript
birdArea = (boundingBox.width * imageWidth) * (boundingBox.height * imageHeight)
imageArea = imageWidth * imageHeight
percentage = (birdArea / imageArea) * 100

PASS if percentage >= 15%
FAIL if percentage < 15% → BIRD_TOO_SMALL
```

**Example:**
- Image: 1200x800 px (960,000 px²)
- Bird box: 400x300 px (120,000 px²)
- Percentage: 12.5% → **FAIL**

---

### 2. Bird Positioning & Occlusion

**Requirement:** Bird must be clearly visible, not obscured >50%

**Rationale:**
- Occluded features cannot be annotated
- Partial visibility reduces educational value
- Ambiguous positioning confuses learners

**Detection Method:**
```typescript
// Analyze bird bounding box position
isCentered = bird.x > 0.2 && bird.x < 0.8 && bird.y > 0.2 && bird.y < 0.8
isAtEdge = bird.x < 0.1 || bird.x > 0.9 || bird.y < 0.1 || bird.y > 0.9

// Use Vision Preflight API to detect occlusion
occlusionLevel = await visionPreflight.detectOcclusion(imageUrl)

PASS if occlusionLevel <= 0.5 && !isAtEdge
FAIL if occlusionLevel > 0.5 → BIRD_OBSCURED
```

**Failure Cases:**
- Bird behind branches/leaves (>50% obscured)
- Bird cut off at image edge
- Bird in shadow with unclear boundaries

---

### 3. Image Resolution

**Requirement:** Minimum dimension ≥400px

**Rationale:**
- Low resolution images lack detail for feature identification
- Bounding box precision requires adequate pixel density
- Vision API performance degrades on low-res images

**Calculation:**
```typescript
minDimension = Math.min(width, height)

PASS if minDimension >= 400
FAIL if minDimension < 400 → RESOLUTION_TOO_LOW
```

**Quality Tiers:**
| Resolution | Quality | Usability |
|------------|---------|-----------|
| <400px | Poor | ❌ Reject |
| 400-800px | Acceptable | ✅ Pass |
| 800-1600px | Good | ✅ Pass |
| >1600px | Excellent | ✅ Pass |

---

### 4. Contrast & Brightness

**Requirement:** Image must have acceptable histogram distribution

**Rationale:**
- Overexposed (too bright) images lose detail
- Underexposed (too dark) images lack clarity
- Poor contrast makes features indistinguishable

**Analysis:**
```typescript
// Calculate image histogram
histogram = await analyzeHistogram(imageBuffer)
mean = histogram.mean
stdDev = histogram.standardDeviation

// Check for extreme values
isTooBright = mean > 230  // Nearly white
isTooDark = mean < 25     // Nearly black
isLowContrast = stdDev < 30  // Flat histogram

PASS if !isTooBright && !isTooDark && !isLowContrast
FAIL if any condition true → POOR_LIGHTING
```

**Histogram Examples:**

```
GOOD (normal distribution):
Pixels  ▁▃▅▇█▇▅▃▁
        0 128 255

BAD (overexposed):
Pixels  ▁▁▁▁▁▃▅▇█
        0 128 255

BAD (underexposed):
Pixels  █▇▅▃▁▁▁▁▁
        0 128 255
```

---

### 5. Bird as Primary Subject

**Requirement:** Bird must be the main focus (confidence >0.7)

**Rationale:**
- Background distractions reduce annotation quality
- Multiple subjects create ambiguity
- Non-bird subjects waste annotation effort

**Detection:**
```typescript
// Lightweight Vision API call
const result = await visionPreflight.detectPrimarySubject(imageUrl)

PASS if result.isBirdPrimary && result.confidence >= 0.7
FAIL if !result.isBirdPrimary → BIRD_NOT_PRIMARY
```

**Failure Cases:**
- Bird in background, landscape in foreground
- Multiple birds competing for focus
- Bird too far away compared to other elements

---

## Architecture Design

### Component Diagram (C4 Model - Container Level)

```
┌────────────────────────────────────────────────────────────────┐
│                     AVES Backend System                         │
│                                                                 │
│  ┌─────────────────┐                  ┌──────────────────┐    │
│  │   Express API   │                  │  PostgreSQL DB   │    │
│  │   (Node.js)     │◄────────────────>│   (images table) │    │
│  └────────┬────────┘                  └──────────────────┘    │
│           │                                                     │
│           │                                                     │
│  ┌────────▼───────────────────────────────────────────┐       │
│  │          aiAnnotations.ts Router                   │       │
│  │  POST /api/ai/annotations/generate/:imageId        │       │
│  └────────┬────────────────────────┬──────────────────┘       │
│           │                        │                           │
│           │ 1. Quality Check       │ 2. If Pass               │
│           ▼                        ▼                           │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ImageQualityValidator│  │  VisionAIService    │            │
│  │    (New Service)    │  │ (Existing Service)  │            │
│  └──────────┬──────────┘  └─────────────────────┘            │
│             │                                                  │
│             │ Bird Detection                                   │
│             ▼                                                  │
│  ┌─────────────────────┐         ┌──────────────────┐        │
│  │VisionPreflightSvc   │────────>│  Claude Vision   │        │
│  │  (New Service)      │ (500tk) │      API         │        │
│  └─────────────────────┘         └──────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

External Systems:
- Claude Vision API (Anthropic)
```

### Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ImageQualityValidator                       │
├─────────────────────────────────────────────────────────┤
│ + validateImage(url, id): QualityCheckResult           │
│ + checkResolution(w, h): ResolutionCheck                │
│ + checkContrast(buffer): ContrastCheck                  │
│ + checkBirdSize(bounds, dims): SizeCheck                │
│ + checkBirdPosition(bounds): PositionCheck              │
│ + checkBirdPrimacy(url): PrimacyCheck                   │
│ + storeQualityResult(id, result): void                  │
│ + getQualityResult(id): QualityCheckResult?             │
└─────────────────────────────────────────────────────────┘
                         │
                         │ depends on
                         ▼
┌─────────────────────────────────────────────────────────┐
│           VisionPreflightService                         │
├─────────────────────────────────────────────────────────┤
│ + detectBird(url): BirdDetectionResult                  │
│ + estimateBirdBounds(url): BoundingBox                  │
│ + detectOcclusion(url): number                          │
│ + detectPrimarySubject(url): SubjectResult              │
│ - buildPreflightPrompt(): string                        │
│ - callVisionAPI(prompt, url): APIResponse               │
└─────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### ImageQualityValidator Service

**File:** `backend/src/services/ImageQualityValidator.ts`

**Purpose:** Orchestrates all quality checks and aggregates results

**Key Methods:**

#### 1. `validateImage(imageUrl: string, imageId: string): Promise<QualityCheckResult>`

Main entry point for quality validation.

```typescript
async validateImage(imageUrl: string, imageId: string): Promise<QualityCheckResult> {
  // 1. Check cache first
  const cached = await this.getQualityResult(imageId);
  if (cached && !forceRecheck) return cached;

  // 2. Fetch image metadata
  const { buffer, width, height } = await this.fetchImageData(imageUrl);

  // 3. Run checks in parallel
  const [resCheck, contrastCheck, preflightResult] = await Promise.all([
    this.checkResolution(width, height),
    this.checkContrast(buffer),
    visionPreflightService.detectBird(imageUrl)
  ]);

  // 4. Check bird size and positioning
  const sizeCheck = this.checkBirdSize(preflightResult.boundingBox, { width, height });
  const positionCheck = this.checkBirdPosition(preflightResult.boundingBox);

  // 5. Aggregate results
  const result: QualityCheckResult = {
    passed: resCheck.passed && contrastCheck.passed &&
            sizeCheck.passed && positionCheck.passed &&
            preflightResult.isPrimary,
    score: this.calculateQualityScore({ resCheck, contrastCheck, sizeCheck, positionCheck, preflightResult }),
    checks: { /* detailed results */ },
    failureReasons: this.collectFailureReasons({ /* all checks */ }),
    suggestions: this.generateSuggestions({ /* all checks */ }),
    checkedAt: new Date().toISOString()
  };

  // 6. Store in database
  await this.storeQualityResult(imageId, result);

  return result;
}
```

#### 2. `checkResolution(width: number, height: number): ResolutionCheck`

Fast synchronous check - no API calls.

```typescript
checkResolution(width: number, height: number): ResolutionCheck {
  const minDimension = Math.min(width, height);
  const threshold = 400;

  return {
    passed: minDimension >= threshold,
    width,
    height,
    minDimension,
    threshold,
    details: minDimension < threshold
      ? `Image too small: ${minDimension}px < ${threshold}px minimum`
      : `Resolution acceptable: ${minDimension}px ≥ ${threshold}px`
  };
}
```

#### 3. `checkContrast(imageBuffer: Buffer): Promise<ContrastCheck>`

Analyzes image histogram using Sharp library.

```typescript
async checkContrast(imageBuffer: Buffer): Promise<ContrastCheck> {
  const sharp = require('sharp');

  // Get image statistics
  const stats = await sharp(imageBuffer)
    .stats();

  const mean = stats.channels[0].mean;  // Average brightness
  const stdDev = stats.channels[0].stdev;  // Contrast measure

  const isTooBright = mean > 230;
  const isTooDark = mean < 25;
  const isLowContrast = stdDev < 30;

  return {
    passed: !isTooBright && !isTooDark && !isLowContrast,
    mean,
    stdDev,
    histogram: stats.channels[0].histogram,
    details: this.getContrastDetails(mean, stdDev, isTooBright, isTooDark, isLowContrast)
  };
}
```

#### 4. `checkBirdSize(boundingBox: BoundingBox, imageDimensions: ImageDimensions): SizeCheck`

```typescript
checkBirdSize(boundingBox: BoundingBox, imageDimensions: ImageDimensions): SizeCheck {
  const imageArea = imageDimensions.width * imageDimensions.height;
  const birdArea = (boundingBox.width * imageDimensions.width) *
                   (boundingBox.height * imageDimensions.height);
  const percentage = (birdArea / imageArea) * 100;
  const threshold = 15; // 15% minimum

  return {
    passed: percentage >= threshold,
    birdArea,
    imageArea,
    percentage,
    threshold,
    details: percentage < threshold
      ? `Bird too small: ${percentage.toFixed(1)}% < ${threshold}% minimum`
      : `Bird size acceptable: ${percentage.toFixed(1)}% ≥ ${threshold}%`
  };
}
```

---

### VisionPreflightService

**File:** `backend/src/services/VisionPreflightService.ts`

**Purpose:** Lightweight Vision API calls for bird detection (500-1000 tokens vs 8000 for full annotation)

**Key Methods:**

#### 1. `detectBird(imageUrl: string): Promise<BirdDetectionResult>`

```typescript
async detectBird(imageUrl: string): Promise<BirdDetectionResult> {
  const prompt = this.buildPreflightPrompt();
  const imageData = await this.fetchImageAsBase64(imageUrl);

  const response = await this.client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,  // Much smaller than full annotation (8192)
    temperature: 0.1,  // Lower temperature for consistent detection
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: imageData },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const result = JSON.parse(response.content[0].text);

  return {
    birdDetected: result.birdDetected,
    isPrimary: result.isPrimarySubject,
    confidence: result.confidence,
    boundingBox: result.approximateBoundingBox,
    occlusionLevel: result.estimatedOcclusion,
    apiTokensUsed: response.usage.output_tokens
  };
}
```

#### 2. `buildPreflightPrompt(): string`

Minimal prompt for fast detection:

```typescript
buildPreflightPrompt(): string {
  return `
Analyze this image for bird annotation suitability. Return JSON ONLY:

{
  "birdDetected": boolean,
  "isPrimarySubject": boolean,
  "confidence": number (0-1),
  "approximateBoundingBox": {
    "x": number (0-1),
    "y": number (0-1),
    "width": number (0-1),
    "height": number (0-1)
  },
  "estimatedOcclusion": number (0-1, percentage obscured)
}

Focus on:
1. Is a bird clearly visible?
2. Is the bird the main subject?
3. Approximate bird location and size
4. Is bird partially hidden/obscured?

Return ONLY valid JSON, no explanations.
  `.trim();
}
```

**Token Comparison:**

| Operation | Tokens | Cost Ratio |
|-----------|--------|------------|
| Preflight Check | 500-1000 | 1x (baseline) |
| Full Annotation | 8000 | 8x |
| **Savings on Failed Image** | **7000 tokens** | **87.5% reduction** |

---

## Database Schema

### Migration: `015_add_image_quality_checks.sql`

**File:** `backend/src/database/migrations/015_add_image_quality_checks.sql`

```sql
-- ============================================================================
-- Migration 015: Add Image Quality Check Columns
-- Created: 2025-11-17
-- Purpose: Store quality validation results for images
-- ============================================================================

BEGIN;

-- Add quality check columns to images table
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS quality_check_result JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  ADD COLUMN IF NOT EXISTS quality_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for quality filtering and sorting
CREATE INDEX IF NOT EXISTS idx_images_quality_score
  ON images(quality_score DESC NULLS LAST)
  WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_images_quality_checked
  ON images(quality_checked_at DESC)
  WHERE quality_checked_at IS NOT NULL;

-- GIN index for JSONB queries on quality_check_result
CREATE INDEX IF NOT EXISTS idx_images_quality_check_result_gin
  ON images USING GIN(quality_check_result)
  WHERE quality_check_result IS NOT NULL;

-- Add comments
COMMENT ON COLUMN images.quality_check_result IS 'Detailed quality validation results (checks, failures, suggestions)';
COMMENT ON COLUMN images.quality_score IS 'Overall quality score (0-100) for quick filtering';
COMMENT ON COLUMN images.quality_checked_at IS 'Timestamp when quality check was last performed';

COMMIT;
```

### JSONB Structure for `quality_check_result`

```typescript
interface QualityCheckResult {
  passed: boolean;
  score: number;  // 0-100
  checks: {
    birdSizeInFrame: {
      passed: boolean;
      birdArea: number;
      imageArea: number;
      percentage: number;
      threshold: number;
      details: string;
    };
    birdPositioning: {
      passed: boolean;
      occlusionLevel: number;
      isAtEdge: boolean;
      isCentered: boolean;
      details: string;
    };
    imageResolution: {
      passed: boolean;
      width: number;
      height: number;
      minDimension: number;
      threshold: number;
      details: string;
    };
    contrastBrightness: {
      passed: boolean;
      mean: number;
      stdDev: number;
      isTooBright: boolean;
      isTooDark: boolean;
      isLowContrast: boolean;
      details: string;
    };
    birdPrimarySubject: {
      passed: boolean;
      confidence: number;
      threshold: number;
      birdDetected: boolean;
      details: string;
    };
  };
  failureReasons: string[];  // ["BIRD_TOO_SMALL", "POOR_LIGHTING"]
  suggestions: string[];  // ["Use images where bird occupies >15% of frame", ...]
  apiTokensUsed: number;  // Preflight API token count
  checkedAt: string;  // ISO timestamp
}
```

### Database Queries

**Get all high-quality images:**
```sql
SELECT * FROM images
WHERE quality_score >= 80
ORDER BY quality_score DESC;
```

**Get images that failed specific check:**
```sql
SELECT id, url, quality_check_result->'checks'->'birdSizeInFrame' as size_check
FROM images
WHERE quality_check_result->>'passed' = 'false'
  AND quality_check_result->'checks'->'birdSizeInFrame'->>'passed' = 'false';
```

**Quality score distribution:**
```sql
SELECT
  CASE
    WHEN quality_score >= 90 THEN 'Excellent (90-100)'
    WHEN quality_score >= 70 THEN 'Good (70-89)'
    WHEN quality_score >= 50 THEN 'Fair (50-69)'
    ELSE 'Poor (<50)'
  END as quality_tier,
  COUNT(*) as count
FROM images
WHERE quality_score IS NOT NULL
GROUP BY quality_tier
ORDER BY quality_tier;
```

---

## API Design

### Endpoint: Quality Check

**Route:** `GET /api/images/:id/quality-check`
**Auth:** Admin only
**Rate Limit:** 100 requests/hour

**Description:** Get or trigger quality check for a specific image

**Path Parameters:**
- `id` (UUID, required): Image ID

**Query Parameters:**
- `force` (boolean, optional): Force re-check even if cached result exists
  - Default: `false`
  - Example: `?force=true`

**Request Example:**
```http
GET /api/images/550e8400-e29b-41d4-a716-446655440000/quality-check?force=true
Authorization: Bearer <admin-token>
```

**Success Response (200 OK):**
```json
{
  "imageId": "550e8400-e29b-41d4-a716-446655440000",
  "qualityScore": 85,
  "passed": true,
  "checks": {
    "birdSizeInFrame": {
      "passed": true,
      "percentage": 23.5,
      "threshold": 15,
      "details": "Bird size acceptable: 23.5% ≥ 15%"
    },
    "imageResolution": {
      "passed": true,
      "width": 1200,
      "height": 800,
      "minDimension": 800,
      "details": "Resolution acceptable: 800px ≥ 400px"
    },
    "contrastBrightness": {
      "passed": true,
      "mean": 128,
      "stdDev": 55,
      "details": "Good contrast and brightness"
    },
    "birdPositioning": {
      "passed": true,
      "occlusionLevel": 0.1,
      "details": "Bird clearly visible with minimal occlusion"
    },
    "birdPrimarySubject": {
      "passed": true,
      "confidence": 0.92,
      "details": "Bird is primary subject with high confidence"
    }
  },
  "failureReasons": [],
  "suggestions": [],
  "apiTokensUsed": 750,
  "cachedAt": null,
  "checkedAt": "2025-11-17T20:15:30.000Z"
}
```

**Failure Response (200 OK - but quality check failed):**
```json
{
  "imageId": "660e8400-e29b-41d4-a716-446655440001",
  "qualityScore": 35,
  "passed": false,
  "checks": {
    "birdSizeInFrame": {
      "passed": false,
      "percentage": 8.2,
      "threshold": 15,
      "details": "Bird too small: 8.2% < 15% minimum"
    },
    "imageResolution": {
      "passed": true,
      "width": 1600,
      "height": 1200,
      "minDimension": 1200,
      "details": "Resolution acceptable: 1200px ≥ 400px"
    },
    "contrastBrightness": {
      "passed": false,
      "mean": 235,
      "stdDev": 12,
      "details": "Image overexposed (too bright)"
    },
    "birdPositioning": {
      "passed": true,
      "occlusionLevel": 0.3,
      "details": "Bird positioning acceptable"
    },
    "birdPrimarySubject": {
      "passed": false,
      "confidence": 0.45,
      "details": "Bird is not the primary subject (landscape dominant)"
    }
  },
  "failureReasons": [
    "BIRD_TOO_SMALL",
    "POOR_LIGHTING",
    "BIRD_NOT_PRIMARY"
  ],
  "suggestions": [
    "Use images where bird occupies >15% of frame for better annotation quality",
    "Choose images with better lighting (avoid overexposure)",
    "Select images where bird is the main focus, not background element"
  ],
  "apiTokensUsed": 820,
  "cachedAt": null,
  "checkedAt": "2025-11-17T20:16:45.000Z"
}
```

**Error Responses:**

```json
// 404 Not Found - Image doesn't exist
{
  "error": "Image not found",
  "imageId": "invalid-uuid"
}

// 500 Internal Server Error - Quality check failed
{
  "error": "Quality check failed",
  "details": "Failed to fetch image from URL",
  "imageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Data Flow & Sequence Diagrams

### Sequence Diagram: Quality Check Integration

```
┌─────┐          ┌─────────┐          ┌──────────────┐          ┌──────────────┐          ┌─────────┐
│Admin│          │ Router  │          │ImageQuality  │          │VisionPreflight│          │ Vision  │
│ UI  │          │aiAnnot. │          │  Validator   │          │   Service     │          │   API   │
└──┬──┘          └────┬────┘          └──────┬───────┘          └──────┬───────┘          └────┬────┘
   │                  │                       │                         │                       │
   │ POST /generate   │                       │                         │                       │
   ├─────────────────>│                       │                         │                       │
   │                  │                       │                         │                       │
   │                  │ Check cached quality  │                         │                       │
   │                  ├──────────────────────>│                         │                       │
   │                  │  SELECT quality_check_result                    │                       │
   │                  │<──────────────────────┤                         │                       │
   │                  │  null (not cached)    │                         │                       │
   │                  │                       │                         │                       │
   │                  │ validateImage()       │                         │                       │
   │                  ├──────────────────────>│                         │                       │
   │                  │                       │                         │                       │
   │                  │                       │ Parallel Checks:        │                       │
   │                  │                       │ ┌─────────────────────┐ │                       │
   │                  │                       │ │1. checkResolution() │ │                       │
   │                  │                       │ │   (fast, local)     │ │                       │
   │                  │                       │ └─────────────────────┘ │                       │
   │                  │                       │ ┌─────────────────────┐ │                       │
   │                  │                       │ │2. checkContrast()   │ │                       │
   │                  │                       │ │   (medium, Sharp)   │ │                       │
   │                  │                       │ └─────────────────────┘ │                       │
   │                  │                       │ ┌─────────────────────┐ │                       │
   │                  │                       │ │3. detectBird()      │ │                       │
   │                  │                       │ │   (slow, API call)  │ │                       │
   │                  │                       │ └─────────────────────┘ │                       │
   │                  │                       │                         │                       │
   │                  │                       │ detectBird(url)         │                       │
   │                  │                       ├────────────────────────>│                       │
   │                  │                       │                         │                       │
   │                  │                       │                         │ API Request (500tk)   │
   │                  │                       │                         ├──────────────────────>│
   │                  │                       │                         │                       │
   │                  │                       │                         │   BirdDetectionResult │
   │                  │                       │                         │<──────────────────────┤
   │                  │                       │                         │                       │
   │                  │                       │   BirdDetectionResult   │                       │
   │                  │                       │<────────────────────────┤                       │
   │                  │                       │                         │                       │
   │                  │                       │ Aggregate Results       │                       │
   │                  │                       │ ┌─────────────────────┐ │                       │
   │                  │                       │ │- Calculate score    │ │                       │
   │                  │                       │ │- Collect failures   │ │                       │
   │                  │                       │ │- Generate suggestions│ │                       │
   │                  │                       │ └─────────────────────┘ │                       │
   │                  │                       │                         │                       │
   │                  │                       │ Store in DB             │                       │
   │                  │                       │ UPDATE images SET...    │                       │
   │                  │                       │                         │                       │
   │                  │  QualityCheckResult   │                         │                       │
   │                  │<──────────────────────┤                         │                       │
   │                  │                       │                         │                       │
   │                  │ Decision Point        │                         │                       │
   │                  │ ┌─────────────────┐   │                         │                       │
   │                  │ │ IF passed=false │   │                         │                       │
   │                  │ │ RETURN 422      │   │                         │                       │
   │                  │ │ ELSE continue   │   │                         │                       │
   │                  │ └─────────────────┘   │                         │                       │
   │                  │                       │                         │                       │
   │  422 Unprocessable│                      │                         │                       │
   │<─────────────────┤                       │                         │                       │
   │ Quality Report   │                       │                         │                       │
   │                  │                       │                         │                       │
   │                  │ [IF PASSED]           │                         │                       │
   │                  │ visionAIService       │                         │                       │
   │                  │ .generateAnnotations()│                         │                       │
   │                  │                       │                         │                       │
```

### Data Flow: Quality Check to Annotation

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. IMAGE SUBMISSION                           │
│                                                                  │
│  Admin clicks "Generate Annotations" for image                  │
│  Request: POST /api/ai/annotations/generate/:imageId            │
│  Payload: { imageUrl: "https://..." }                           │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. QUALITY CHECK (NEW STEP)                         │
│                                                                  │
│  A. Check if quality result already cached in DB                │
│     SELECT quality_check_result FROM images WHERE id = $1       │
│                                                                  │
│  B. If NOT cached OR force=true:                                │
│     ┌────────────────────────────────────────┐                  │
│     │ ImageQualityValidator.validateImage()  │                  │
│     │                                        │                  │
│     │ • Fetch image data (buffer, metadata) │                  │
│     │ • Run 5 parallel quality checks        │                  │
│     │ • Aggregate results into score (0-100) │                  │
│     │ • Store in quality_check_result column │                  │
│     └────────────────────────────────────────┘                  │
│                                                                  │
│  C. Quality Decision:                                           │
│     ┌─────────────────┬──────────────────┐                      │
│     │ IF passed=false │ IF passed=true   │                      │
│     │ RETURN 422      │ CONTINUE         │                      │
│     │ with report     │ to annotation    │                      │
│     └─────────────────┴──────────────────┘                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ [QUALITY PASSED]
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            3. ANNOTATION GENERATION (EXISTING)                   │
│                                                                  │
│  VisionAIService.generateAnnotations()                          │
│  • Full Claude Vision API call (8000 tokens)                    │
│  • Generate detailed anatomical annotations                     │
│  • Store in ai_annotations & ai_annotation_items                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 4. RESPONSE TO ADMIN UI                          │
│                                                                  │
│  Success: 202 Accepted - Annotation job started                 │
│  Failure: 422 Unprocessable - Quality check failed with report  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. aiAnnotations.ts Router Modification

**Location:** `backend/src/routes/aiAnnotations.ts` - Line 125-370

**Current Flow:**
```typescript
router.post('/ai/annotations/generate/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const { imageUrl } = req.body;

  // Create job record
  const jobId = generateJobId();

  // IMMEDIATELY start annotation generation
  (async () => {
    const annotations = await visionAIService.generateAnnotations(imageUrl, imageId);
    // ... store results
  })();

  res.status(202).json({ jobId, status: 'processing' });
});
```

**New Flow with Quality Check:**
```typescript
import { imageQualityValidator } from '../services/ImageQualityValidator';

router.post('/ai/annotations/generate/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const { imageUrl } = req.body;

  try {
    // ===== NEW: QUALITY PRE-CHECK =====
    info('Running quality pre-check', { imageId });

    const qualityResult = await imageQualityValidator.validateImage(imageUrl, imageId);

    if (!qualityResult.passed) {
      // Quality check failed - return 422 with detailed report
      logError('Image quality check failed', new Error('Quality validation'), {
        imageId,
        failureReasons: qualityResult.failureReasons,
        score: qualityResult.score
      });

      return res.status(422).json({
        error: 'Image quality validation failed',
        qualityReport: {
          score: qualityResult.score,
          checks: qualityResult.checks,
          failureReasons: qualityResult.failureReasons,
          suggestions: qualityResult.suggestions
        },
        message: 'Image does not meet quality requirements for annotation. Please select a different image or see suggestions for improvement.'
      });
    }

    info('Quality check passed - proceeding with annotation', {
      imageId,
      qualityScore: qualityResult.score
    });
    // ===== END QUALITY PRE-CHECK =====

    // EXISTING CODE: Create job and generate annotations
    const jobId = generateJobId();

    await client.query(
      `INSERT INTO ai_annotations (job_id, image_id, annotation_data, status)
       VALUES ($1, $2, $3, $4)`,
      [jobId, imageId, JSON.stringify([]), 'processing']
    );

    // Async annotation generation
    (async () => {
      const annotations = await visionAIService.generateAnnotations(imageUrl, imageId, {
        species: speciesName,
        enablePatternLearning: true
      });
      // ... rest of existing code
    })();

    res.status(202).json({
      jobId,
      status: 'processing',
      imageId,
      qualityScore: qualityResult.score,  // Include quality score in response
      message: 'Annotation generation started. Check job status for results.'
    });

  } catch (err) {
    logError('Error in annotation generation endpoint', err as Error);
    res.status(500).json({ error: 'Failed to start annotation generation' });
  }
});
```

### 2. Admin UI Integration

**Location:** `frontend/src/pages/admin/AdminAnnotationReviewPage.tsx`

**Display quality warning before generating:**

```tsx
const handleGenerateAnnotations = async (imageId: string) => {
  try {
    // Check quality first
    const qualityResponse = await fetch(
      `/api/images/${imageId}/quality-check`,
      { headers: authHeaders }
    );

    const qualityData = await qualityResponse.json();

    if (!qualityData.passed) {
      // Show quality warning dialog
      const proceed = await showQualityWarning({
        score: qualityData.qualityScore,
        failureReasons: qualityData.failureReasons,
        suggestions: qualityData.suggestions
      });

      if (!proceed) return; // User cancelled
    }

    // Proceed with annotation generation
    const response = await fetch(
      `/api/ai/annotations/generate/${imageId}`,
      {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: image.url })
      }
    );

    if (response.status === 422) {
      // Quality check failed during generation
      const errorData = await response.json();
      showQualityError(errorData.qualityReport);
      return;
    }

    // Success - show job started
    toast.success('Annotation generation started');

  } catch (error) {
    toast.error('Failed to generate annotations');
  }
};
```

---

## Error Handling

### Error Scenarios & Responses

#### 1. Quality Check Failed (Expected)

**Scenario:** Image doesn't meet quality criteria

**HTTP Status:** `422 Unprocessable Entity`

**Response:**
```json
{
  "error": "Image quality validation failed",
  "qualityReport": {
    "score": 35,
    "checks": { /* detailed check results */ },
    "failureReasons": ["BIRD_TOO_SMALL", "POOR_LIGHTING"],
    "suggestions": [
      "Use images where bird occupies >15% of frame",
      "Choose images with better lighting"
    ]
  },
  "message": "Image does not meet quality requirements. See suggestions for improvement."
}
```

**User Experience:**
- Display friendly error message
- Show specific failure reasons
- Provide actionable suggestions
- Allow user to select different image

---

#### 2. Preflight API Failure (Recoverable)

**Scenario:** Vision API call for bird detection fails

**Fallback Strategy:**
```typescript
async validateImage(imageUrl: string, imageId: string): Promise<QualityCheckResult> {
  try {
    // Attempt bird detection via Vision API
    const birdResult = await visionPreflightService.detectBird(imageUrl);

    // Use bird detection results
    const sizeCheck = this.checkBirdSize(birdResult.boundingBox, dimensions);
    const primacyCheck = { passed: birdResult.isPrimary, confidence: birdResult.confidence };

  } catch (preflightError) {
    // Vision API failed - log warning but continue with partial validation
    logError('Preflight Vision API call failed - using fallback validation', preflightError);

    // FALLBACK: Skip bird-specific checks, rely on resolution & contrast
    const sizeCheck = { passed: true, skipped: true, reason: 'API unavailable' };
    const primacyCheck = { passed: true, skipped: true, reason: 'API unavailable' };

    // Still validate resolution and contrast (no API needed)
    // Return partial quality result with warning flag
    return {
      passed: resolutionCheck.passed && contrastCheck.passed,
      score: this.calculatePartialScore({ resolutionCheck, contrastCheck }),
      warning: 'Bird detection unavailable - partial validation only',
      checks: { /* partial results */ }
    };
  }
}
```

**HTTP Status:** `200 OK` (quality check completes, but with warning)

**Response:**
```json
{
  "imageId": "...",
  "qualityScore": 70,
  "passed": true,
  "warning": "Bird detection unavailable - partial validation performed",
  "checks": {
    "birdSizeInFrame": { "skipped": true, "reason": "API unavailable" },
    "imageResolution": { "passed": true, /* ... */ },
    "contrastBrightness": { "passed": true, /* ... */ }
  }
}
```

---

#### 3. Image Fetch Failure

**Scenario:** Cannot download image from URL

**HTTP Status:** `500 Internal Server Error`

**Response:**
```json
{
  "error": "Quality check failed",
  "details": "Failed to fetch image from URL: Connection timeout",
  "imageId": "550e8400-e29b-41d4-a716-446655440000",
  "imageUrl": "https://example.com/bird.jpg"
}
```

**Retry Strategy:**
```typescript
async fetchImageData(imageUrl: string): Promise<ImageData> {
  const MAX_RETRIES = 2;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      return {
        buffer: Buffer.from(response.data),
        width: /* extract from metadata */,
        height: /* extract from metadata */
      };
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) throw error;

      await this.sleep(1000 * attempt); // Exponential backoff
    }
  }
}
```

---

#### 4. Database Storage Failure

**Scenario:** Cannot store quality result in database

**Fallback Strategy:**
```typescript
async storeQualityResult(imageId: string, result: QualityCheckResult): Promise<void> {
  try {
    await pool.query(
      `UPDATE images
       SET quality_check_result = $1,
           quality_score = $2,
           quality_checked_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(result), result.score, imageId]
    );
  } catch (dbError) {
    // Log error but don't fail the entire quality check
    logError('Failed to store quality result in database', dbError);

    // Return result anyway - database storage is not critical
    // Quality check still succeeded
  }
}
```

**Behavior:** Quality validation proceeds, but result is not cached. Next request will re-run validation.

---

## Performance Optimization

### 1. Caching Strategy

**Database-Level Caching:**

```typescript
// Check cache before running validation
async validateImage(imageUrl: string, imageId: string, force = false): Promise<QualityCheckResult> {
  if (!force) {
    const cached = await this.getQualityResult(imageId);
    if (cached) {
      info('Using cached quality result', { imageId, age: Date.now() - new Date(cached.checkedAt).getTime() });
      return cached;
    }
  }

  // Run validation and cache result
  const result = await this.runQualityChecks(imageUrl, imageId);
  await this.storeQualityResult(imageId, result);
  return result;
}

async getQualityResult(imageId: string): Promise<QualityCheckResult | null> {
  const result = await pool.query(
    'SELECT quality_check_result FROM images WHERE id = $1',
    [imageId]
  );

  if (result.rows.length === 0 || !result.rows[0].quality_check_result) {
    return null;
  }

  return result.rows[0].quality_check_result as QualityCheckResult;
}
```

**Cache Hit Ratio Target:** >80% (most images checked once)

**Cache Invalidation:** Never expires (images are immutable), but `force=true` bypasses cache

---

### 2. Parallel Check Execution

**Optimize with Promise.all():**

```typescript
async validateImage(imageUrl: string, imageId: string): Promise<QualityCheckResult> {
  const { buffer, width, height } = await this.fetchImageData(imageUrl);

  // Run independent checks in parallel
  const [resolutionCheck, contrastCheck, birdDetection] = await Promise.all([
    this.checkResolution(width, height),           // Fast: <1ms
    this.checkContrast(buffer),                    // Medium: ~50-100ms
    visionPreflightService.detectBird(imageUrl)    // Slow: ~2-5 seconds
  ]);

  // Sequential dependent checks
  const sizeCheck = this.checkBirdSize(birdDetection.boundingBox, { width, height });
  const positionCheck = this.checkBirdPosition(birdDetection.boundingBox);

  // Aggregate
  return this.aggregateResults({ /* all checks */ });
}
```

**Performance Breakdown:**

| Check | Time | Parallelizable |
|-------|------|----------------|
| Resolution | <1ms | ✅ Yes |
| Contrast | ~100ms | ✅ Yes |
| Bird Detection API | ~3s | ✅ Yes |
| Bird Size | <1ms | ❌ No (depends on detection) |
| Bird Position | <1ms | ❌ No (depends on detection) |
| **Total (Sequential)** | ~3.1s | - |
| **Total (Parallel)** | ~3.0s | - |

**Net Speedup:** Minimal for first run (API dominates), but eliminates waiting for resolution/contrast while API calls run.

---

### 3. Token Optimization

**Preflight vs Full Annotation:**

```
Preflight Prompt (Minimal):
┌────────────────────────────────────┐
│ "Analyze bird in image. JSON only:│
│ {                                  │
│   birdDetected: boolean,           │
│   boundingBox: {...},              │
│   isPrimary: boolean               │
│ }"                                 │
└────────────────────────────────────┘
Tokens: ~500-1000 (87.5% savings)

Full Annotation Prompt (Detailed):
┌────────────────────────────────────┐
│ "Analyze bird anatomical features  │
│ Identify: pico, alas, cola, patas  │
│ Return precise bounding boxes...   │
│ [detailed guidelines]              │
│ [coordinate examples]              │
│ [validation rules]                 │
│ ..."                               │
└────────────────────────────────────┘
Tokens: ~8000
```

**Cost Savings Calculation:**

```
Assumptions:
- 100 images submitted for annotation
- 30% fail quality check

Without Quality Filter:
- 100 images × 8000 tokens = 800,000 tokens
- Cost: $12.00 (at $0.015 per 1K tokens for Sonnet 4.5)

With Quality Filter:
- 30 failed × 1000 preflight = 30,000 tokens
- 70 passed × 8000 full = 560,000 tokens
- Total: 590,000 tokens
- Cost: $8.85

Savings: $3.15 per 100 images (26% reduction)
Savings per year (10,000 images): $315
```

---

### 4. Batch Processing (Future Enhancement)

**Capability:** Validate multiple images in parallel

```typescript
async validateBatch(images: Array<{ id: string; url: string }>): Promise<QualityCheckResult[]> {
  const BATCH_SIZE = 5; // Process 5 at a time to avoid API rate limits

  const results: QualityCheckResult[] = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(img => this.validateImage(img.url, img.id))
    );

    results.push(...batchResults);

    // Rate limiting: wait 1 second between batches
    if (i + BATCH_SIZE < images.length) {
      await this.sleep(1000);
    }
  }

  return results;
}
```

**Use Case:** Admin pre-validates all images in a species collection before batch annotation

---

## Monitoring & Metrics

### Key Metrics to Track

#### 1. Quality Check Performance

```typescript
interface QualityMetrics {
  totalChecks: number;
  passRate: number;  // Percentage of images passing quality check
  avgQualityScore: number;  // Average score across all checks
  avgCheckDuration: number;  // Average time to complete check
  cacheHitRate: number;  // Percentage using cached results
  apiTokensUsed: number;  // Total preflight API tokens consumed
  apiFailureRate: number;  // Percentage of preflight API failures
}
```

**Database Query:**
```sql
SELECT
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE (quality_check_result->>'passed')::boolean = true) as passed_count,
  AVG((quality_check_result->>'score')::integer) as avg_score,
  COUNT(*) FILTER (WHERE quality_check_result IS NOT NULL) as cached_count
FROM images
WHERE quality_checked_at >= NOW() - INTERVAL '30 days';
```

---

#### 2. Failure Reason Distribution

**Track most common failure reasons:**

```sql
SELECT
  reason,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM (
  SELECT jsonb_array_elements_text(quality_check_result->'failureReasons') as reason
  FROM images
  WHERE (quality_check_result->>'passed')::boolean = false
) failures
GROUP BY reason
ORDER BY count DESC;
```

**Expected Output:**
```
┌───────────────────┬───────┬────────────┐
│ reason            │ count │ percentage │
├───────────────────┼───────┼────────────┤
│ BIRD_TOO_SMALL    │   45  │    52.3%   │
│ POOR_LIGHTING     │   28  │    32.6%   │
│ BIRD_NOT_PRIMARY  │   13  │    15.1%   │
└───────────────────┴───────┴────────────┘
```

**Actionable Insights:**
- If "BIRD_TOO_SMALL" dominates → Improve image curation, prefer close-up shots
- If "POOR_LIGHTING" spikes → Filter Unsplash results by brightness metadata
- If "BIRD_NOT_PRIMARY" high → Refine Unsplash search queries to be more specific

---

#### 3. Cost Savings Tracking

**Compare token usage with/without quality filtering:**

```typescript
interface CostMetrics {
  totalImagesProcessed: number;
  imagesPassedQuality: number;
  imagesFailedQuality: number;
  preflightTokensUsed: number;
  annotationTokensUsed: number;
  estimatedTokensWithoutFilter: number;  // All images × 8000
  tokensSaved: number;
  costSavingsUSD: number;
}

async getCostMetrics(startDate: Date, endDate: Date): Promise<CostMetrics> {
  // Query database for quality checks and annotations in date range
  const qualityResults = await pool.query(`
    SELECT
      COUNT(*) as total_images,
      COUNT(*) FILTER (WHERE (quality_check_result->>'passed')::boolean = true) as passed,
      COUNT(*) FILTER (WHERE (quality_check_result->>'passed')::boolean = false) as failed,
      SUM((quality_check_result->>'apiTokensUsed')::integer) as preflight_tokens
    FROM images
    WHERE quality_checked_at BETWEEN $1 AND $2
  `, [startDate, endDate]);

  const annotationResults = await pool.query(`
    SELECT COUNT(*) as annotation_count
    FROM ai_annotations
    WHERE created_at BETWEEN $1 AND $2
  `, [startDate, endDate]);

  const data = qualityResults.rows[0];
  const annotationTokensUsed = annotationResults.rows[0].annotation_count * 8000;
  const estimatedTokensWithoutFilter = data.total_images * 8000;
  const tokensSaved = estimatedTokensWithoutFilter - (data.preflight_tokens + annotationTokensUsed);

  const COST_PER_1K_TOKENS = 0.015;  // Sonnet 4.5 pricing
  const costSavingsUSD = (tokensSaved / 1000) * COST_PER_1K_TOKENS;

  return {
    totalImagesProcessed: data.total_images,
    imagesPassedQuality: data.passed,
    imagesFailedQuality: data.failed,
    preflightTokensUsed: data.preflight_tokens,
    annotationTokensUsed,
    estimatedTokensWithoutFilter,
    tokensSaved,
    costSavingsUSD
  };
}
```

---

#### 4. Admin Dashboard Integration

**Add Quality Metrics Panel to `/admin/ml-analytics`:**

```tsx
// frontend/src/pages/admin/MLAnalyticsPage.tsx

const QualityMetricsPanel = () => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);

  useEffect(() => {
    fetch('/api/admin/quality-metrics')
      .then(res => res.json())
      .then(setMetrics);
  }, []);

  return (
    <div className="quality-metrics-panel">
      <h3>Image Quality Filtering</h3>

      <div className="metrics-grid">
        <MetricCard
          title="Pass Rate"
          value={`${metrics.passRate.toFixed(1)}%`}
          subtitle={`${metrics.totalChecks} images checked`}
        />

        <MetricCard
          title="Avg Quality Score"
          value={metrics.avgQualityScore.toFixed(0)}
          subtitle="Out of 100"
        />

        <MetricCard
          title="Cost Savings"
          value={`$${metrics.costSavingsUSD.toFixed(2)}`}
          subtitle="Token reduction"
        />
      </div>

      <h4>Top Failure Reasons</h4>
      <FailureReasonsChart data={metrics.failureReasons} />

      <h4>Quality Score Distribution</h4>
      <QualityDistributionChart data={metrics.scoreDistribution} />
    </div>
  );
};
```

---

## Implementation Roadmap

### Phase 1: Database & Core Service (Week 1)

**Deliverables:**
- ✅ Database migration script (`015_add_image_quality_checks.sql`)
- ✅ `ImageQualityValidator.ts` service with all 5 checks
- ✅ Unit tests for quality checks
- ✅ Database integration (store/retrieve results)

**Tasks:**
1. Create migration file with quality columns and indexes
2. Implement `ImageQualityValidator` class
3. Implement individual check methods (resolution, contrast, size, position, primacy)
4. Add result aggregation and scoring logic
5. Write comprehensive unit tests (>90% coverage)
6. Test database storage and retrieval

**Success Criteria:**
- Migration runs successfully on test database
- All quality checks function correctly
- Test coverage >90%
- Quality results persist to database

---

### Phase 2: Vision Preflight Service (Week 1-2)

**Deliverables:**
- ✅ `VisionPreflightService.ts` implementation
- ✅ Optimized preflight prompt (<1000 tokens)
- ✅ Integration with ImageQualityValidator
- ✅ API error handling and fallback logic

**Tasks:**
1. Create `VisionPreflightService` class
2. Design minimal prompt for bird detection
3. Implement API calling logic with retries
4. Add token usage tracking
5. Test preflight accuracy vs full annotation
6. Implement graceful degradation on API failure

**Success Criteria:**
- Preflight prompt uses <1000 tokens
- Bird detection accuracy >85%
- API failures handled gracefully with fallback
- Token usage tracked and reported

---

### Phase 3: API Endpoint & Integration (Week 2)

**Deliverables:**
- ✅ GET `/api/images/:id/quality-check` endpoint
- ✅ Integration into `/api/ai/annotations/generate/:imageId`
- ✅ 422 error responses with quality reports
- ✅ API documentation updates

**Tasks:**
1. Create quality check route handler
2. Add authentication and rate limiting
3. Modify annotation generation endpoint to call quality check first
4. Handle quality failures with 422 responses
5. Update API documentation
6. Add integration tests

**Success Criteria:**
- Quality check endpoint returns accurate results
- Annotation generation blocked on quality failure
- Error responses include actionable suggestions
- Integration tests pass

---

### Phase 4: Admin UI Integration (Week 3)

**Deliverables:**
- ✅ Quality warning dialogs in annotation review page
- ✅ Quality metrics display in ML analytics dashboard
- ✅ Visual quality indicators (score badges, failure icons)
- ✅ User-friendly error messages

**Tasks:**
1. Add quality check before annotation generation
2. Create quality warning modal component
3. Display quality score badges on image cards
4. Add quality metrics panel to ML analytics page
5. Implement failure reason visualization (charts)
6. Add quality filtering in image selection

**Success Criteria:**
- Admins see quality warnings before generating annotations
- Quality scores visible on all images
- Quality metrics dashboard functional
- User experience smooth and informative

---

### Phase 5: Backfill & Optimization (Week 3-4)

**Deliverables:**
- ✅ Background job for quality backfill on existing images
- ✅ Performance benchmarks and optimization
- ✅ Monitoring dashboard for quality metrics
- ✅ Documentation and training materials

**Tasks:**
1. Create backfill script to check quality for existing images
2. Run performance profiling and optimize slow checks
3. Set up monitoring alerts for quality failures
4. Document quality check thresholds and rationale
5. Create admin training guide
6. Conduct load testing on quality endpoints

**Success Criteria:**
- All existing images have quality scores
- Average quality check completes in <5 seconds
- Monitoring alerts configured and tested
- Documentation complete and reviewed

---

### Phase 6: Production Deployment (Week 4)

**Deliverables:**
- ✅ Production database migration
- ✅ Service deployment with monitoring
- ✅ A/B testing for quality threshold tuning
- ✅ Final cost savings analysis

**Tasks:**
1. Review and approve production migration
2. Deploy to staging environment
3. Run smoke tests on staging
4. Deploy to production with rollback plan
5. Monitor quality check performance
6. Analyze cost savings and quality improvements
7. Tune thresholds based on production data

**Success Criteria:**
- Zero-downtime production deployment
- Quality filtering active on all annotation requests
- Cost savings measured and reported
- Quality improvements documented

---

## Appendix: Code Examples

### Full ImageQualityValidator Implementation Outline

```typescript
// backend/src/services/ImageQualityValidator.ts

import axios from 'axios';
import sharp from 'sharp';
import { pool } from '../database/connection';
import { visionPreflightService } from './VisionPreflightService';
import { info, error as logError } from '../utils/logger';

// Interfaces
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  checks: {
    birdSizeInFrame: SizeCheck;
    birdPositioning: PositionCheck;
    imageResolution: ResolutionCheck;
    contrastBrightness: ContrastCheck;
    birdPrimarySubject: PrimacyCheck;
  };
  failureReasons: string[];
  suggestions: string[];
  apiTokensUsed: number;
  checkedAt: string;
}

export interface SizeCheck {
  passed: boolean;
  birdArea: number;
  imageArea: number;
  percentage: number;
  threshold: number;
  details: string;
}

export interface PositionCheck {
  passed: boolean;
  occlusionLevel: number;
  isAtEdge: boolean;
  isCentered: boolean;
  details: string;
}

export interface ResolutionCheck {
  passed: boolean;
  width: number;
  height: number;
  minDimension: number;
  threshold: number;
  details: string;
}

export interface ContrastCheck {
  passed: boolean;
  mean: number;
  stdDev: number;
  isTooBright: boolean;
  isTooDark: boolean;
  isLowContrast: boolean;
  details: string;
}

export interface PrimacyCheck {
  passed: boolean;
  confidence: number;
  threshold: number;
  birdDetected: boolean;
  details: string;
}

export class ImageQualityValidator {
  private readonly BIRD_SIZE_THRESHOLD = 0.15; // 15%
  private readonly RESOLUTION_THRESHOLD = 400; // pixels
  private readonly OCCLUSION_THRESHOLD = 0.5; // 50%
  private readonly PRIMACY_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Main validation entry point
   */
  async validateImage(
    imageUrl: string,
    imageId: string,
    force = false
  ): Promise<QualityCheckResult> {
    try {
      // Check cache first
      if (!force) {
        const cached = await this.getQualityResult(imageId);
        if (cached) {
          info('Using cached quality result', { imageId });
          return cached;
        }
      }

      info('Running quality validation', { imageId, imageUrl });

      // Fetch image data
      const { buffer, width, height } = await this.fetchImageData(imageUrl);

      // Run checks in parallel
      const [resolutionCheck, contrastCheck, preflightResult] = await Promise.all([
        this.checkResolution(width, height),
        this.checkContrast(buffer),
        visionPreflightService.detectBird(imageUrl)
      ]);

      // Dependent checks
      const sizeCheck = this.checkBirdSize(preflightResult.boundingBox, { width, height });
      const positionCheck = this.checkBirdPosition(preflightResult);

      // Aggregate
      const result = this.aggregateResults({
        resolutionCheck,
        contrastCheck,
        sizeCheck,
        positionCheck,
        primacyCheck: {
          passed: preflightResult.isPrimary,
          confidence: preflightResult.confidence,
          threshold: this.PRIMACY_CONFIDENCE_THRESHOLD,
          birdDetected: preflightResult.birdDetected,
          details: this.getPrimacyDetails(preflightResult)
        },
        apiTokensUsed: preflightResult.apiTokensUsed
      });

      // Store result
      await this.storeQualityResult(imageId, result);

      info('Quality validation complete', {
        imageId,
        passed: result.passed,
        score: result.score
      });

      return result;

    } catch (error) {
      logError('Quality validation failed', error as Error, { imageId });
      throw error;
    }
  }

  /**
   * Check image resolution
   */
  checkResolution(width: number, height: number): ResolutionCheck {
    const minDimension = Math.min(width, height);
    const passed = minDimension >= this.RESOLUTION_THRESHOLD;

    return {
      passed,
      width,
      height,
      minDimension,
      threshold: this.RESOLUTION_THRESHOLD,
      details: passed
        ? `Resolution acceptable: ${minDimension}px ≥ ${this.RESOLUTION_THRESHOLD}px`
        : `Resolution too low: ${minDimension}px < ${this.RESOLUTION_THRESHOLD}px minimum`
    };
  }

  /**
   * Check image contrast and brightness
   */
  async checkContrast(imageBuffer: Buffer): Promise<ContrastCheck> {
    const stats = await sharp(imageBuffer).stats();

    const mean = stats.channels[0].mean;
    const stdDev = stats.channels[0].stdev;

    const isTooBright = mean > 230;
    const isTooDark = mean < 25;
    const isLowContrast = stdDev < 30;

    const passed = !isTooBright && !isTooDark && !isLowContrast;

    return {
      passed,
      mean,
      stdDev,
      isTooBright,
      isTooDark,
      isLowContrast,
      details: this.getContrastDetails(mean, stdDev, isTooBright, isTooDark, isLowContrast)
    };
  }

  /**
   * Check bird size in frame
   */
  checkBirdSize(
    boundingBox: BoundingBox,
    dimensions: { width: number; height: number }
  ): SizeCheck {
    const imageArea = dimensions.width * dimensions.height;
    const birdArea = (boundingBox.width * dimensions.width) *
                     (boundingBox.height * dimensions.height);
    const percentage = (birdArea / imageArea) * 100;
    const passed = (percentage / 100) >= this.BIRD_SIZE_THRESHOLD;

    return {
      passed,
      birdArea,
      imageArea,
      percentage,
      threshold: this.BIRD_SIZE_THRESHOLD * 100,
      details: passed
        ? `Bird size acceptable: ${percentage.toFixed(1)}% ≥ ${this.BIRD_SIZE_THRESHOLD * 100}%`
        : `Bird too small: ${percentage.toFixed(1)}% < ${this.BIRD_SIZE_THRESHOLD * 100}% minimum`
    };
  }

  /**
   * Check bird positioning and occlusion
   */
  checkBirdPosition(preflightResult: any): PositionCheck {
    const bbox = preflightResult.boundingBox;
    const occlusionLevel = preflightResult.occlusionLevel;

    const isAtEdge = bbox.x < 0.1 || bbox.x > 0.9 || bbox.y < 0.1 || bbox.y > 0.9;
    const isCentered = bbox.x > 0.2 && bbox.x < 0.8 && bbox.y > 0.2 && bbox.y < 0.8;
    const passed = occlusionLevel <= this.OCCLUSION_THRESHOLD && !isAtEdge;

    return {
      passed,
      occlusionLevel,
      isAtEdge,
      isCentered,
      details: this.getPositionDetails(occlusionLevel, isAtEdge, isCentered)
    };
  }

  // Helper methods, store/retrieve, etc.
  // ... (implementation details)
}

export const imageQualityValidator = new ImageQualityValidator();
```

---

## Summary

This architecture provides a comprehensive, production-ready solution for pre-filtering bird images before AI annotation. The system:

- **Reduces API costs** by 87.5% on failed images
- **Improves annotation quality** by ensuring bird visibility
- **Provides detailed feedback** to help select better images
- **Tracks quality metrics** for continuous improvement

The phased implementation roadmap allows for iterative development, testing, and optimization before full production deployment.

**Next Steps:**
1. Review and approve architecture document
2. Create implementation tickets for Phase 1
3. Set up development branch for quality filter feature
4. Begin database migration development

---

**Document History:**
- 2025-11-17: Initial architecture design (v1.0.0)
- Architecture stored in memory at: `swarm/architecture/quality_filter` (namespace: `annotation-improvement`)
