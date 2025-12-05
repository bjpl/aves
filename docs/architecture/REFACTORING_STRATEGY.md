# AVES Architecture Refactoring Strategy
**System Architect Technical Design Document**

## Executive Summary

This document provides a precise, actionable refactoring strategy to transform the AVES codebase from its current degraded state (5 god files totaling 7,703 lines) into a clean, modular architecture with all modules under 500 lines.

**Critical Violations:**
- C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/adminImageManagement.ts: **2,863 lines**
- C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/aiAnnotations.ts: **1,839 lines**
- C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/PatternLearner.ts: **1,279 lines**
- C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/pages/admin/ImageManagementPage.tsx: **951 lines**
- VisionAI service variants: **3 files with overlapping functionality**

**Refactoring Scope:** 7,932 lines → 36+ modular files (avg. 220 lines/file)

---

## 1. adminImageManagement.ts Decomposition (2,863 lines → 14 modules)

### 1.1 Current Structure Analysis

**Route Handlers (16 endpoints):**
- POST /admin/images/collect (lines 505-805) - **300 lines**
- POST /admin/images/upload (lines 806-1019) - **213 lines**
- POST /admin/images/annotate (lines 1020-1347) - **327 lines**
- GET /admin/images/jobs/:jobId (lines 1348-1424) - **76 lines**
- POST /admin/images/jobs/:jobId/cancel (lines 1438-1504) - **66 lines**
- GET /admin/images/stats (lines 1505-1644) - **139 lines**
- GET /admin/images/quota (lines 1645-1745) - **100 lines**
- GET /admin/images/pending (lines 1746-1907) - **161 lines**
- GET /admin/images (lines 1908-1999) - **91 lines**
- GET /admin/images/sources (lines 2000-2058) - **58 lines**
- POST /admin/images/bulk-delete (lines 2059-2165) - **106 lines**
- POST /admin/images/bulk-annotate (lines 2166-2433) - **267 lines**
- GET /admin/images/:imageId (lines 2434-2499) - **65 lines**
- DELETE /admin/images/:imageId (lines 2500-2534) - **34 lines**
- POST /admin/images/retry-failed (lines 2535-2708) - **173 lines**
- GET /admin/images/by-species (lines 2709-2863) - **154 lines**

**Supporting Code:**
- Configuration constants (lines 50-116) - **66 lines**
- Job tracking store (lines 118-154) - **36 lines**
- Rate limiting (lines 160-167) - **7 lines**
- Upload configuration (lines 174-196) - **22 lines**
- Multer setup (lines 199-267) - **68 lines**
- Validation schemas (lines 271-307) - **36 lines**
- Helper functions (lines 468-2426) - **~400 lines embedded**

### 1.2 Target Module Structure

#### **Module 1: Core Router**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/index.ts`
**Lines:** ~150
**Purpose:** Main router registration, imports all sub-routers
**Contents:**
- Router setup
- Middleware registration
- Sub-router mounting
- Export default router

```typescript
import { Router } from 'express';
import collectionRouter from './collection.routes';
import uploadRouter from './upload.routes';
import annotationRouter from './annotation.routes';
import jobRouter from './job.routes';
import statsRouter from './stats.routes';
import bulkRouter from './bulk.routes';
import imageRouter from './image.routes';

const router = Router();

// Mount sub-routers
router.use('/images/collect', collectionRouter);
router.use('/images/upload', uploadRouter);
router.use('/images/annotate', annotationRouter);
router.use('/images/jobs', jobRouter);
router.use('/images/stats', statsRouter);
router.use('/images/bulk', bulkRouter);
router.use('/images', imageRouter);

export default router;
```

#### **Module 2: Collection Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/collection.routes.ts`
**Lines:** ~320
**Purpose:** Image collection from Unsplash
**Routes:**
- POST / (formerly /admin/images/collect)
**Dependencies:**
- `UnsplashService` (new)
- `JobService` (new)
- `SpeciesService` (existing)

#### **Module 3: Upload Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/upload.routes.ts`
**Lines:** ~230
**Purpose:** Local file upload handling
**Routes:**
- POST / (formerly /admin/images/upload)
**Dependencies:**
- `ImageProcessingService` (new)
- `ImageQualityValidator` (existing)

#### **Module 4: Annotation Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/annotation.routes.ts`
**Lines:** ~340
**Purpose:** Batch annotation triggers
**Routes:**
- POST / (formerly /admin/images/annotate)
- POST /retry-failed (formerly /admin/images/retry-failed)
**Dependencies:**
- `AnnotationJobService` (new)
- `VisionAIService` (existing)

#### **Module 5: Job Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/job.routes.ts`
**Lines:** ~180
**Purpose:** Job status and control
**Routes:**
- GET /:jobId (formerly /admin/images/jobs/:jobId)
- POST /:jobId/cancel (formerly /admin/images/jobs/:jobId/cancel)
**Dependencies:**
- `JobService` (new)

#### **Module 6: Stats Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/stats.routes.ts`
**Lines:** ~250
**Purpose:** Statistics and quota management
**Routes:**
- GET / (formerly /admin/images/stats)
- GET /quota (formerly /admin/images/quota)
**Dependencies:**
- `StatsService` (new)

#### **Module 7: Bulk Operation Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/bulk.routes.ts`
**Lines:** ~380
**Purpose:** Bulk delete and annotate
**Routes:**
- POST /delete (formerly /admin/images/bulk-delete)
- POST /annotate (formerly /admin/images/bulk-annotate)
**Dependencies:**
- `BulkOperationService` (new)

#### **Module 8: Image Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/image.routes.ts`
**Lines:** ~310
**Purpose:** Individual image operations
**Routes:**
- GET / (formerly /admin/images)
- GET /pending (formerly /admin/images/pending)
- GET /sources (formerly /admin/images/sources)
- GET /by-species (formerly /admin/images/by-species)
- GET /:imageId (formerly /admin/images/:imageId)
- DELETE /:imageId (formerly /admin/images/:imageId)
**Dependencies:**
- `ImageRepository` (new)

#### **Module 9: UnsplashService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/UnsplashService.ts`
**Lines:** ~280
**Purpose:** Unsplash API integration
**Responsibilities:**
- Search photos by species
- Download images
- Rate limiting
- Error handling
**Interface:**
```typescript
export class UnsplashService {
  async searchPhotos(query: string, count: number): Promise<UnsplashPhoto[]>
  async downloadPhoto(url: string): Promise<Buffer>
  getRateLimit(): { remaining: number, limit: number }
}
```

#### **Module 10: ImageProcessingService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/ImageProcessingService.ts`
**Lines:** ~250
**Purpose:** Image resize, thumbnail generation
**Responsibilities:**
- Resize images (max 1200x900)
- Generate thumbnails (400x300)
- Convert to JPEG
- Save to filesystem
**Interface:**
```typescript
export class ImageProcessingService {
  async processImage(buffer: Buffer, filename: string): Promise<ProcessedImage>
  async generateThumbnail(buffer: Buffer, filename: string): Promise<string>
  async saveImage(buffer: Buffer, path: string): Promise<void>
}
```

#### **Module 11: JobService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/JobService.ts`
**Lines:** ~220
**Purpose:** Job tracking and management
**Responsibilities:**
- Create jobs
- Update progress
- Cancel jobs
- Cleanup old jobs
**Interface:**
```typescript
export class JobService {
  createJob(type: JobType, totalItems: number, metadata?: any): JobProgress
  updateProgress(jobId: string, update: Partial<JobProgress>): void
  getJob(jobId: string): JobProgress | null
  cancelJob(jobId: string): boolean
  getAllJobs(): JobProgress[]
  cleanupOldJobs(): void
}
```

#### **Module 12: AnnotationJobService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/AnnotationJobService.ts`
**Lines:** ~350
**Purpose:** Batch annotation orchestration
**Responsibilities:**
- Queue annotation jobs
- Process annotations in batches
- Handle retries
- Update database
**Interface:**
```typescript
export class AnnotationJobService {
  async queueBatchAnnotation(imageIds: string[]): Promise<string>
  async processAnnotationJob(jobId: string): Promise<void>
  async retryFailedAnnotations(): Promise<void>
}
```

#### **Module 13: BulkOperationService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/BulkOperationService.ts`
**Lines:** ~280
**Purpose:** Bulk delete and annotate operations
**Interface:**
```typescript
export class BulkOperationService {
  async bulkDelete(imageIds: string[]): Promise<BulkOperationResult>
  async bulkAnnotate(imageIds: string[]): Promise<BulkOperationResult>
}
```

#### **Module 14: ImageRepository**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/ImageRepository.ts`
**Lines:** ~320
**Purpose:** Database operations for images
**Interface:**
```typescript
export class ImageRepository {
  async getImages(filters: ImageFilter, pagination: Pagination): Promise<Image[]>
  async getImageById(id: string): Promise<Image | null>
  async getPendingImages(): Promise<Image[]>
  async getImagesBySpecies(speciesId: string): Promise<Image[]>
  async createImage(data: CreateImageDTO): Promise<Image>
  async deleteImage(id: string): Promise<void>
  async updateImageStatus(id: string, status: string): Promise<void>
}
```

### 1.3 Migration Plan

**Phase 1: Extract Services (Week 1)**
1. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/` directory
2. Extract `UnsplashService.ts` - move Unsplash logic from lines 505-805
3. Extract `ImageProcessingService.ts` - move sharp logic from lines 806-1019
4. Extract `JobService.ts` - move job tracking from lines 118-154 + helper functions
5. Run tests: `npm test -- --testPathPattern=services/admin`

**Phase 2: Extract Repositories (Week 1)**
6. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/` directory
7. Extract `ImageRepository.ts` - move all database queries
8. Run tests: `npm test -- --testPathPattern=repositories`

**Phase 3: Extract Sub-Routers (Week 2)**
9. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/admin/images/` directory
10. Extract `collection.routes.ts` - lines 505-805
11. Extract `upload.routes.ts` - lines 806-1019
12. Extract `annotation.routes.ts` - lines 1020-1347, 2535-2708
13. Extract `job.routes.ts` - lines 1348-1504
14. Extract `stats.routes.ts` - lines 1505-1745
15. Extract `bulk.routes.ts` - lines 2059-2433
16. Extract `image.routes.ts` - lines 1746-2058, 2434-2863
17. Create `index.ts` to mount all sub-routers
18. Run tests: `npm test -- --testPathPattern=routes/admin`

**Phase 4: Update Imports (Week 2)**
19. Update main `server.ts` to import from new location
20. Update all test files
21. Run full test suite: `npm test`

**Phase 5: Delete Old File (Week 2)**
22. Verify all tests pass
23. Delete `adminImageManagement.ts`
24. Commit with message: "refactor: decompose adminImageManagement into 14 modular files"

---

## 2. aiAnnotations.ts Decomposition (1,839 lines → 8 modules)

### 2.1 Current Structure Analysis

**Route Handlers (14 endpoints):**
- POST /ai-annotations/generate (lines 185-519) - **334 lines**
- GET /ai-annotations/jobs (lines 520-626) - **106 lines**
- GET /ai-annotations/:imageId/annotations (lines 627-734) - **107 lines**
- GET /ai-annotations/:imageId/preflight (lines 735-893) - **158 lines**
- GET /ai-annotations/jobs/:jobId (lines 894-984) - **90 lines**
- POST /ai-annotations/:imageId/approve (lines 985-1167) - **182 lines**
- POST /ai-annotations/:imageId/reject (lines 1168-1299) - **131 lines**
- PATCH /ai-annotations/:imageId (lines 1300-1422) - **122 lines**
- POST /ai-annotations/bulk/approve (lines 1423-1608) - **185 lines**
- POST /ai-annotations/bulk/reject (lines 1609-1742) - **133 lines**
- GET /ai-annotations/performance (lines 1743-1777) - **34 lines**
- GET /ai-annotations/rejection-patterns (lines 1778-1816) - **38 lines**
- GET /ai-annotations/quality-metrics (lines 1817-1839) - **22 lines**

**Supporting Code:**
- Rate limiting (lines 35-40)
- Validation schemas (lines 46-120)
- Helper functions embedded in routes

### 2.2 Target Module Structure

#### **Module 1: Core Router**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/index.ts`
**Lines:** ~100

#### **Module 2: Generation Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/generation.routes.ts`
**Lines:** ~350
**Routes:**
- POST /generate
**Dependencies:**
- `VisionAIService` (existing)
- `AnnotationGenerationService` (new)

#### **Module 3: Review Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/review.routes.ts`
**Lines:** ~440
**Routes:**
- POST /:imageId/approve
- POST /:imageId/reject
- PATCH /:imageId
**Dependencies:**
- `AnnotationReviewService` (new)
- `ReinforcementLearningEngine` (existing)

#### **Module 4: Bulk Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/bulk.routes.ts`
**Lines:** ~330
**Routes:**
- POST /approve
- POST /reject
**Dependencies:**
- `BulkReviewService` (new)

#### **Module 5: Query Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/query.routes.ts`
**Lines:** ~300
**Routes:**
- GET /:imageId/annotations
- GET /:imageId/preflight
- GET /jobs
- GET /jobs/:jobId
**Dependencies:**
- `AnnotationRepository` (new)

#### **Module 6: Analytics Routes**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/analytics.routes.ts`
**Lines:** ~100
**Routes:**
- GET /performance
- GET /rejection-patterns
- GET /quality-metrics
**Dependencies:**
- `AnnotationAnalyticsService` (new)

#### **Module 7: AnnotationReviewService**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/annotations/AnnotationReviewService.ts`
**Lines:** ~380
**Purpose:** Handle approve/reject/edit operations
**Interface:**
```typescript
export class AnnotationReviewService {
  async approveAnnotation(imageId: string, reviewerId: string, notes?: string): Promise<void>
  async rejectAnnotation(imageId: string, reviewerId: string, category: string, notes?: string): Promise<void>
  async editAnnotation(imageId: string, updates: Partial<AIAnnotation>): Promise<void>
  async trainFromFeedback(imageId: string, action: 'approve' | 'reject', category?: string): Promise<void>
}
```

#### **Module 8: AnnotationRepository**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/AnnotationRepository.ts`
**Lines:** ~250
**Purpose:** Database operations for annotations
**Interface:**
```typescript
export class AnnotationRepository {
  async getAnnotationsByImageId(imageId: string): Promise<AIAnnotation[]>
  async getAnnotationJob(jobId: string): Promise<AnnotationJob | null>
  async getPendingAnnotations(): Promise<AIAnnotation[]>
  async updateAnnotationStatus(imageId: string, status: string): Promise<void>
  async getRejectionPatterns(): Promise<RejectionPattern[]>
  async getQualityMetrics(): Promise<QualityMetrics>
}
```

### 2.3 Migration Plan

**Phase 1: Extract Services (Week 3)**
1. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/annotations/` directory
2. Extract `AnnotationReviewService.ts`
3. Extract `AnnotationAnalyticsService.ts`
4. Extract `BulkReviewService.ts`
5. Run tests: `npm test -- --testPathPattern=services/annotations`

**Phase 2: Extract Repository (Week 3)**
6. Extract `AnnotationRepository.ts`
7. Run tests: `npm test -- --testPathPattern=repositories`

**Phase 3: Extract Sub-Routers (Week 4)**
8. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/annotations/ai/` directory
9. Extract all route files
10. Create index.ts
11. Run tests: `npm test -- --testPathPattern=routes/annotations`

**Phase 4: Cleanup (Week 4)**
12. Update imports
13. Delete old file
14. Commit

---

## 3. PatternLearner.ts Decomposition (1,279 lines → 6 modules)

### 3.1 Current Structure Analysis

**Main Class:** `PatternLearner` (lines 107-1278)
**Methods:**
- `savePattern()` - 40 lines
- `getPattern()` - 30 lines
- `getAllPatterns()` - 25 lines
- `enhancePrompt()` - 180 lines
- `learnFromCorrection()` - 90 lines
- `learnFromRejection()` - 70 lines
- `learnFromApproval()` - 60 lines
- `updateBoundingBoxPattern()` - 80 lines
- `calculateQualityMetrics()` - 120 lines
- `getRecommendedFeatures()` - 100 lines
- `getSpeciesStats()` - 85 lines
- `updateFeatureStats()` - 95 lines
- Private helpers (~300 lines total)

**Interfaces/Types:** (lines 23-106)
- 7 exported interfaces
- BoundingBox statistics
- Quality metrics

### 3.2 Target Module Structure

#### **Module 1: Core Pattern Service**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/PatternLearningService.ts`
**Lines:** ~200
**Purpose:** Orchestration and public API
**Contents:**
- High-level learning methods
- Pattern storage coordination
- Public interface

#### **Module 2: Prompt Enhancement**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/PromptEnhancementService.ts`
**Lines:** ~220
**Purpose:** Enhance AI prompts with learned patterns
**Contents:**
- `enhancePrompt()` method
- Pattern-based recommendations
- Feature prioritization

#### **Module 3: Bounding Box Learning**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/BoundingBoxLearner.ts`
**Lines:** ~250
**Purpose:** Learn optimal bounding box positions
**Contents:**
- `updateBoundingBoxPattern()`
- `learnFromCorrection()`
- Statistical variance calculation

#### **Module 4: Quality Metrics**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/QualityMetricsCalculator.ts`
**Lines:** ~180
**Purpose:** Calculate annotation quality scores
**Contents:**
- `calculateQualityMetrics()`
- Confidence scoring
- Pattern effectiveness rating

#### **Module 5: Species Feature Analytics**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/SpeciesFeatureAnalytics.ts`
**Lines:** ~240
**Purpose:** Track feature statistics per species
**Contents:**
- `updateFeatureStats()`
- `getSpeciesStats()`
- `getRecommendedFeatures()`

#### **Module 6: Pattern Types & Interfaces**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/types/pattern-learning.types.ts`
**Lines:** ~120
**Purpose:** Shared type definitions
**Contents:**
- All exported interfaces (7)
- Type definitions
- Constants

### 3.3 Migration Plan

**Phase 1: Extract Types (Week 5)**
1. Create `pattern-learning.types.ts`
2. Move all interfaces
3. Update imports in PatternLearner.ts
4. Run tests: `npm test -- --testPathPattern=PatternLearner`

**Phase 2: Extract Sub-Services (Week 5)**
5. Create `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/` directory
6. Extract `PromptEnhancementService.ts`
7. Extract `BoundingBoxLearner.ts`
8. Extract `QualityMetricsCalculator.ts`
9. Extract `SpeciesFeatureAnalytics.ts`
10. Run tests after each extraction

**Phase 3: Refactor Core (Week 6)**
11. Create `PatternLearningService.ts` as orchestrator
12. Update method calls to delegate to sub-services
13. Update all imports
14. Run full test suite
15. Delete old file

---

## 4. VisionAI Service Consolidation (3 files → 1 unified service)

### 4.1 Current State

**Files:**
1. `VisionAIService.ts` - 491 lines (basic implementation)
2. `VisionAIService.integrated.ts` - 573 lines (with validation & retry)
3. `VisionPreflightService.ts` - 520 lines (image validation)

**Problem:** Duplicate code, unclear which to use, inconsistent behavior

### 4.2 Consolidation Strategy

#### **Primary Service: VisionAI**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/vision/VisionAIService.ts`
**Lines:** ~450
**Purpose:** Main AI annotation generation
**Features:**
- Pattern learning integration (from .integrated.ts)
- Retry logic (from .integrated.ts)
- Quality validation (from .integrated.ts)
- Token management
**Interface:**
```typescript
export class VisionAIService {
  async generateAnnotations(
    imageUrl: string,
    imageId: string,
    metadata?: GenerationMetadata
  ): Promise<AIAnnotation[]>

  async generateWithRetry(
    imageUrl: string,
    imageId: string,
    maxRetries: number
  ): Promise<AIAnnotation[]>
}
```

#### **Supporting Service: Preflight Validation**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/vision/VisionPreflightService.ts`
**Lines:** ~350
**Purpose:** Pre-generation image validation
**Keep as separate service** - distinct responsibility
**Interface:**
```typescript
export class VisionPreflightService {
  async validateImage(imageUrl: string): Promise<ValidationResult>
  async checkImageQuality(buffer: Buffer): Promise<QualityCheck>
  async detectBirdPresence(imageUrl: string): Promise<BirdDetectionResult>
}
```

### 4.3 Consolidation Plan

**Phase 1: Merge Logic (Week 7)**
1. Create new `C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/vision/` directory
2. Copy `VisionAIService.integrated.ts` as base
3. Add missing features from `VisionAIService.ts`
4. Remove duplicates
5. Update method signatures for consistency

**Phase 2: Update Imports (Week 7)**
6. Find all imports: `grep -r "VisionAIService" backend/src`
7. Update to use consolidated service
8. Update tests

**Phase 3: Delete Old Files (Week 7)**
9. Verify all tests pass
10. Delete `VisionAIService.ts`
11. Delete `VisionAIService.integrated.ts`
12. Rename consolidated file to `VisionAIService.ts`
13. Commit

---

## 5. ImageManagementPage.tsx Decomposition (951 lines → 8 components)

### 5.1 Current Structure Analysis

**Main Component:** `ImageManagementPage` (lines 30-951)
**Sub-components embedded:**
- Dashboard header (~50 lines)
- Stats cards (~100 lines)
- Tab navigation (~40 lines)
- Collection panel (~120 lines)
- Annotation panel (~110 lines)
- Job status panel (~150 lines)
- Image gallery (~200 lines)
- Modals (~80 lines)

**Hooks:**
- `useImageManagement` (external)
- `useToast` (external)
- `useSupabaseAuth` (external)
- `useSpecies` (external)

### 5.2 Target Component Structure

#### **Component 1: Main Page**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/pages/admin/ImageManagementPage.tsx`
**Lines:** ~180
**Purpose:** Layout and orchestration
**Contents:**
- Auth checks
- Tab state management
- Component composition
- Toast provider

#### **Component 2: Dashboard Header**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/DashboardHeader.tsx`
**Lines:** ~80
**Contents:**
- Title
- Breadcrumbs
- Quick stats summary

#### **Component 3: Stats Cards**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/StatsCards.tsx`
**Lines:** ~150
**Contents:**
- Total images card
- Annotation status card
- Quota card
- Refresh button

#### **Component 4: Collection Panel**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/CollectionPanel.tsx`
**Lines:** ~180
**Contents:**
- Species multi-select
- Images per species input
- Collect button
- Progress indicator

#### **Component 5: Annotation Panel**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/AnnotationPanel.tsx`
**Lines:** ~160
**Contents:**
- Pending images selector
- Annotate all toggle
- Start button
- Progress tracking

#### **Component 6: Job Status Panel**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/JobStatusPanel.tsx`
**Lines:** ~200
**Contents:**
- Active jobs list
- Job progress bars
- Cancel buttons
- Auto-refresh logic

#### **Component 7: Image Gallery Panel**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/components/admin/image-management/ImageGalleryPanel.tsx`
**Lines:** ~250
**Contents:**
- Image grid
- Selection checkboxes
- Bulk actions toolbar
- Pagination

#### **Component 8: Shared Types**
**File:** `C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/types/admin/image-management.types.ts`
**Lines:** ~100
**Contents:**
- Props interfaces
- State types
- API response types

### 5.3 Migration Plan

**Phase 1: Extract Types (Week 8)**
1. Create types file
2. Move all interfaces
3. Update imports

**Phase 2: Extract Components (Week 8-9)**
4. Create `frontend/src/components/admin/image-management/` directory
5. Extract components one by one
6. Test each component in Storybook
7. Update main page to use extracted components

**Phase 3: Cleanup (Week 9)**
8. Remove unused code
9. Verify all tests pass
10. Commit

---

## 6. Dependency Graph & Interface Contracts

### 6.1 Backend Service Dependencies

```
Routes Layer
├── admin/images/collection.routes.ts
│   ├── → UnsplashService
│   ├── → JobService
│   └── → ImageRepository
│
├── admin/images/annotation.routes.ts
│   ├── → VisionAIService
│   ├── → AnnotationJobService
│   └── → AnnotationRepository
│
└── annotations/ai/review.routes.ts
    ├── → AnnotationReviewService
    ├── → ReinforcementLearningEngine
    └── → PatternLearningService

Service Layer
├── VisionAIService
│   ├── → PatternLearningService
│   ├── → VisionPreflightService
│   └── → Anthropic SDK
│
├── PatternLearningService
│   ├── → PromptEnhancementService
│   ├── → BoundingBoxLearner
│   ├── → QualityMetricsCalculator
│   └── → SpeciesFeatureAnalytics
│
└── AnnotationJobService
    ├── → VisionAIService
    ├── → JobService
    └── → AnnotationRepository

Repository Layer
├── ImageRepository → PostgreSQL Pool
├── AnnotationRepository → PostgreSQL Pool
└── SpeciesRepository → PostgreSQL Pool
```

### 6.2 Critical Interface Contracts

#### **UnsplashService Interface**
```typescript
// C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/admin/UnsplashService.ts

export interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string };
  width: number;
  height: number;
  description: string | null;
  photographer: string;
  photographerUrl: string;
}

export class UnsplashService {
  /**
   * Search photos by query string
   * @throws {UnsplashAPIError} if API request fails
   * @throws {RateLimitError} if rate limit exceeded
   */
  async searchPhotos(query: string, count: number): Promise<UnsplashPhoto[]>;

  /**
   * Download photo buffer from URL
   * @throws {DownloadError} if download fails
   */
  async downloadPhoto(url: string): Promise<Buffer>;

  /**
   * Get current rate limit status
   */
  getRateLimit(): { remaining: number; limit: number; resetAt: Date };
}
```

#### **PatternLearningService Interface**
```typescript
// C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/ml/PatternLearningService.ts

export class PatternLearningService {
  /**
   * Enhance AI prompt with learned patterns
   */
  async enhancePrompt(
    basePrompt: string,
    context: {
      species?: string;
      targetFeatures?: string[];
      imageCharacteristics?: string[];
    }
  ): Promise<string>;

  /**
   * Learn from annotation correction
   */
  async learnFromCorrection(
    feature: string,
    species: string,
    originalBox: BoundingBox,
    correctedBox: BoundingBox,
    reviewerId: string
  ): Promise<void>;

  /**
   * Get recommended features for species
   */
  getRecommendedFeatures(species: string): Promise<string[]>;

  /**
   * Calculate quality metrics for annotation
   */
  async calculateQualityMetrics(
    annotation: AIAnnotation,
    species: string
  ): Promise<QualityMetrics>;
}
```

#### **ImageRepository Interface**
```typescript
// C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/ImageRepository.ts

export interface ImageFilter {
  speciesId?: string;
  status?: 'pending' | 'annotated' | 'rejected';
  sourceType?: 'unsplash' | 'local_upload';
  minQualityScore?: number;
}

export interface Pagination {
  page: number;
  limit: number;
}

export class ImageRepository {
  /**
   * Get paginated images with filters
   */
  async getImages(
    filters: ImageFilter,
    pagination: Pagination
  ): Promise<{ images: Image[]; total: number }>;

  /**
   * Get single image by ID
   * @returns null if not found
   */
  async getImageById(id: string): Promise<Image | null>;

  /**
   * Create new image record
   * @throws {DatabaseError} if insertion fails
   */
  async createImage(data: CreateImageDTO): Promise<Image>;

  /**
   * Soft delete image (sets deleted_at timestamp)
   */
  async deleteImage(id: string): Promise<void>;

  /**
   * Update image annotation status
   */
  async updateImageStatus(
    id: string,
    status: 'pending' | 'annotated' | 'rejected'
  ): Promise<void>;
}
```

---

## 7. Test Strategy

### 7.1 Test Coverage Requirements

**Minimum Coverage:** 80% for all new modules
**Critical Paths:** 95% coverage required for:
- UnsplashService
- PatternLearningService
- AnnotationReviewService
- ImageRepository

### 7.2 Test Organization

**Structure:**
```
backend/src/__tests__/
├── routes/
│   └── admin/
│       └── images/
│           ├── collection.routes.test.ts
│           ├── annotation.routes.test.ts
│           └── bulk.routes.test.ts
├── services/
│   ├── admin/
│   │   ├── UnsplashService.test.ts
│   │   ├── ImageProcessingService.test.ts
│   │   └── JobService.test.ts
│   └── ml/
│       ├── PatternLearningService.test.ts
│       ├── PromptEnhancementService.test.ts
│       └── BoundingBoxLearner.test.ts
└── repositories/
    ├── ImageRepository.test.ts
    └── AnnotationRepository.test.ts
```

### 7.3 Migration Testing Strategy

**During Refactoring:**
1. **Before extraction:** Run baseline tests, record results
2. **After each module extraction:**
   - Run affected tests
   - Ensure no regressions
   - Add tests for new interfaces
3. **Integration testing:**
   - Test service composition
   - Test route → service → repository flow
4. **E2E testing:**
   - Admin dashboard workflow
   - Annotation review workflow
   - Bulk operations

**Test Commands:**
```bash
# Before refactoring
npm test -- --coverage > baseline-coverage.txt

# After each module
npm test -- --testPathPattern=services/admin/UnsplashService
npm test -- --testPathPattern=routes/admin/images/collection

# Integration tests
npm test -- --testPathPattern=integration/admin-dashboard

# Full regression suite
npm test -- --coverage --verbose
```

### 7.4 Rollback Strategy

**If tests fail during migration:**
1. Git checkout previous commit
2. Identify breaking change
3. Fix in isolation
4. Re-run migration step
5. Commit only when tests pass

**Safety Net:**
```bash
# Create feature branch for refactoring
git checkout -b refactor/modularize-admin-routes

# Tag before major changes
git tag refactor-checkpoint-1
git tag refactor-checkpoint-2
# ... etc

# If needed, rollback to checkpoint
git reset --hard refactor-checkpoint-1
```

---

## 8. Implementation Timeline

### **Week 1-2: adminImageManagement.ts**
- Days 1-2: Extract services (Unsplash, ImageProcessing, Job)
- Days 3-4: Extract repositories (ImageRepository)
- Days 5-7: Extract sub-routers (8 files)
- Days 8-10: Integration testing & cleanup

### **Week 3-4: aiAnnotations.ts**
- Days 1-2: Extract services (AnnotationReview, BulkReview)
- Day 3: Extract repository (AnnotationRepository)
- Days 4-6: Extract sub-routers (6 files)
- Days 7-8: Integration testing & cleanup

### **Week 5-6: PatternLearner.ts**
- Day 1: Extract types
- Days 2-4: Extract sub-services (4 files)
- Day 5: Create orchestrator service
- Days 6-7: Update dependencies & tests

### **Week 7: VisionAI Consolidation**
- Days 1-2: Merge services
- Days 3-4: Update all imports
- Day 5: Delete old files & test

### **Week 8-9: ImageManagementPage.tsx**
- Days 1-2: Extract types & hooks
- Days 3-7: Extract components (7 files)
- Days 8-10: Component testing & integration

### **Week 10: Final Integration & Documentation**
- Days 1-3: Full regression testing
- Days 4-5: Performance testing
- Days 6-7: Update documentation
- Days 8-10: Code review & polish

---

## 9. Success Metrics

### 9.1 Quantitative Metrics

**File Size:**
- ✅ All files < 500 lines
- 🎯 Average file size: 220 lines
- ❌ No files > 600 lines

**Test Coverage:**
- ✅ Overall: 80%+
- ✅ Critical paths: 95%+
- ✅ New modules: 85%+

**Performance:**
- ✅ No increase in response times
- ✅ Build time < 30 seconds
- ✅ Test suite < 2 minutes

### 9.2 Qualitative Metrics

**Code Quality:**
- ✅ No circular dependencies
- ✅ Clear separation of concerns
- ✅ Single Responsibility Principle enforced
- ✅ Consistent naming conventions

**Developer Experience:**
- ✅ Easy to find code (< 30 seconds)
- ✅ Clear error messages
- ✅ Self-documenting interfaces
- ✅ Comprehensive inline docs

---

## 10. Risk Mitigation

### 10.1 Identified Risks

**Risk 1: Breaking Changes in API**
- **Mitigation:** Maintain backward compatibility during transition
- **Action:** Create adapter layer if needed

**Risk 2: Test Failures During Migration**
- **Mitigation:** Incremental changes, test after each step
- **Action:** Rollback checkpoints via git tags

**Risk 3: Performance Degradation**
- **Mitigation:** Benchmark before/after each module
- **Action:** Profile and optimize if slowdown detected

**Risk 4: Database Query Changes**
- **Mitigation:** Repository pattern isolates DB logic
- **Action:** Run query performance tests

### 10.2 Contingency Plans

**If timeline slips:**
- Prioritize backend routes (weeks 1-4)
- Frontend refactoring can be deferred
- VisionAI consolidation is lower priority

**If tests fail:**
- Pause refactoring
- Fix failures before proceeding
- Do not merge until 100% test pass rate

**If performance degrades:**
- Profile with `clinic.js`
- Identify bottleneck
- Optimize hot path
- Consider caching strategy

---

## 11. Post-Refactoring Maintenance

### 11.1 Ongoing Practices

**Code Reviews:**
- Enforce 500-line limit
- Check for god file patterns
- Verify separation of concerns

**Automated Checks:**
```json
// .eslintrc.json
{
  "rules": {
    "max-lines": ["error", { "max": 500, "skipBlankLines": true }]
  }
}
```

**Documentation:**
- Update architecture diagrams
- Maintain ADR (Architecture Decision Records)
- Keep this document updated

### 11.2 Monitoring

**Metrics to Track:**
- Average file size (monthly)
- Test coverage trends
- Build/test time
- Code complexity scores

**Tools:**
```bash
# File size distribution
find backend/src -name "*.ts" -exec wc -l {} \; | awk '{print $1}' | sort -n | uniq -c

# Complexity analysis
npx madge --circular backend/src
npx complexity-report backend/src
```

---

## Appendix A: File Path Reference

### Backend Routes
```
C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/routes/
├── admin/
│   └── images/
│       ├── index.ts
│       ├── collection.routes.ts
│       ├── upload.routes.ts
│       ├── annotation.routes.ts
│       ├── job.routes.ts
│       ├── stats.routes.ts
│       ├── bulk.routes.ts
│       └── image.routes.ts
└── annotations/
    └── ai/
        ├── index.ts
        ├── generation.routes.ts
        ├── review.routes.ts
        ├── bulk.routes.ts
        ├── query.routes.ts
        └── analytics.routes.ts
```

### Backend Services
```
C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/services/
├── admin/
│   ├── UnsplashService.ts
│   ├── ImageProcessingService.ts
│   ├── JobService.ts
│   ├── AnnotationJobService.ts
│   └── BulkOperationService.ts
├── annotations/
│   ├── AnnotationReviewService.ts
│   ├── AnnotationAnalyticsService.ts
│   └── BulkReviewService.ts
├── ml/
│   ├── PatternLearningService.ts
│   ├── PromptEnhancementService.ts
│   ├── BoundingBoxLearner.ts
│   ├── QualityMetricsCalculator.ts
│   └── SpeciesFeatureAnalytics.ts
└── vision/
    ├── VisionAIService.ts
    └── VisionPreflightService.ts
```

### Backend Repositories
```
C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/
├── ImageRepository.ts
├── AnnotationRepository.ts
└── SpeciesRepository.ts
```

### Frontend Components
```
C:/Users/brand/Development/Project_Workspace/active-development/aves/frontend/src/
├── pages/
│   └── admin/
│       └── ImageManagementPage.tsx (180 lines)
└── components/
    └── admin/
        └── image-management/
            ├── DashboardHeader.tsx
            ├── StatsCards.tsx
            ├── CollectionPanel.tsx
            ├── AnnotationPanel.tsx
            ├── JobStatusPanel.tsx
            └── ImageGalleryPanel.tsx
```

---

## Appendix B: Command Reference

```bash
# Run specific test suite
npm test -- --testPathPattern=services/admin

# Check file sizes
find backend/src -name "*.ts" ! -path "*/node_modules/*" -exec wc -l {} \; | sort -rn | head -20

# Find circular dependencies
npx madge --circular backend/src

# Check test coverage
npm test -- --coverage --coverageReporters=text-summary

# Build project
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
**Next Review:** After Week 5 (PatternLearner refactoring complete)
**Owner:** System Architect
**Status:** APPROVED FOR IMPLEMENTATION
