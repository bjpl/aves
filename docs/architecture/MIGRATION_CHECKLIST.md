# AVES Refactoring Migration Checklist

## Quick Reference Guide for Implementation

---

## Week 1-2: adminImageManagement.ts → 14 Modules

### Day 1-2: Extract Services

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/services/admin
  ```

- [ ] **Extract UnsplashService**
  - [ ] Create `backend/src/services/admin/UnsplashService.ts`
  - [ ] Move lines 505-805 (Unsplash API logic)
  - [ ] Add interface: `searchPhotos()`, `downloadPhoto()`, `getRateLimit()`
  - [ ] Add error handling: `UnsplashAPIError`, `RateLimitError`
  - [ ] Write unit tests: `backend/src/__tests__/services/admin/UnsplashService.test.ts`
  - [ ] Run tests: `npm test -- --testPathPattern=UnsplashService`
  - [ ] ✅ All tests pass

- [ ] **Extract ImageProcessingService**
  - [ ] Create `backend/src/services/admin/ImageProcessingService.ts`
  - [ ] Move lines 806-1019 (sharp image processing)
  - [ ] Add interface: `processImage()`, `generateThumbnail()`, `saveImage()`
  - [ ] Add constants: `MAX_IMAGE_WIDTH`, `JPEG_QUALITY`, etc.
  - [ ] Write unit tests
  - [ ] Run tests: `npm test -- --testPathPattern=ImageProcessingService`
  - [ ] ✅ All tests pass

- [ ] **Extract JobService**
  - [ ] Create `backend/src/services/admin/JobService.ts`
  - [ ] Move lines 118-154 (job tracking store)
  - [ ] Move job helper functions (lines 468-475)
  - [ ] Add interface: `createJob()`, `updateProgress()`, `getJob()`, `cleanupOldJobs()`
  - [ ] Add types: `JobProgress`, `JobStatus`
  - [ ] Write unit tests
  - [ ] Run tests: `npm test -- --testPathPattern=JobService`
  - [ ] ✅ All tests pass

### Day 3-4: Extract Repositories

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/repositories
  ```

- [ ] **Extract ImageRepository**
  - [ ] Create `backend/src/repositories/ImageRepository.ts`
  - [ ] Extract all `pool.query` calls for images table
  - [ ] Add interface: `getImages()`, `getImageById()`, `createImage()`, `deleteImage()`, `updateImageStatus()`
  - [ ] Add DTOs: `CreateImageDTO`, `ImageFilter`, `Pagination`
  - [ ] Map database rows to domain objects
  - [ ] Write unit tests
  - [ ] Run tests: `npm test -- --testPathPattern=ImageRepository`
  - [ ] ✅ All tests pass

### Day 5-7: Extract Sub-Routers

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/routes/admin/images
  ```

- [ ] **Extract collection.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/collection.routes.ts`
  - [ ] Move POST /collect handler (lines 505-805)
  - [ ] Import: `UnsplashService`, `JobService`, `ImageRepository`
  - [ ] Add middleware: `optionalSupabaseAuth`, `optionalSupabaseAdmin`, `validateBody`
  - [ ] Write route tests
  - [ ] Run tests: `npm test -- --testPathPattern=collection.routes`
  - [ ] ✅ All tests pass

- [ ] **Extract upload.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/upload.routes.ts`
  - [ ] Move POST /upload handler (lines 806-1019)
  - [ ] Move multer configuration
  - [ ] Import: `ImageProcessingService`, `ImageQualityValidator`, `ImageRepository`
  - [ ] Write route tests
  - [ ] Run tests: `npm test -- --testPathPattern=upload.routes`
  - [ ] ✅ All tests pass

- [ ] **Extract annotation.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/annotation.routes.ts`
  - [ ] Move POST /annotate handler (lines 1020-1347)
  - [ ] Move POST /retry-failed handler (lines 2535-2708)
  - [ ] Import: `AnnotationJobService`, `VisionAIService`
  - [ ] Write route tests
  - [ ] ✅ All tests pass

- [ ] **Extract job.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/job.routes.ts`
  - [ ] Move GET /jobs/:jobId (lines 1348-1424)
  - [ ] Move POST /jobs/:jobId/cancel (lines 1438-1504)
  - [ ] Import: `JobService`
  - [ ] Write route tests
  - [ ] ✅ All tests pass

- [ ] **Extract stats.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/stats.routes.ts`
  - [ ] Move GET /stats (lines 1505-1644)
  - [ ] Move GET /quota (lines 1645-1745)
  - [ ] Import: `ImageRepository`, `AnnotationRepository`
  - [ ] Write route tests
  - [ ] ✅ All tests pass

- [ ] **Extract bulk.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/bulk.routes.ts`
  - [ ] Move POST /bulk-delete (lines 2059-2165)
  - [ ] Move POST /bulk-annotate (lines 2166-2433)
  - [ ] Import: `BulkOperationService`
  - [ ] Write route tests
  - [ ] ✅ All tests pass

- [ ] **Extract image.routes.ts**
  - [ ] Create `backend/src/routes/admin/images/image.routes.ts`
  - [ ] Move GET /images (lines 1908-1999)
  - [ ] Move GET /pending (lines 1746-1907)
  - [ ] Move GET /sources (lines 2000-2058)
  - [ ] Move GET /by-species (lines 2709-2863)
  - [ ] Move GET /:imageId (lines 2434-2499)
  - [ ] Move DELETE /:imageId (lines 2500-2534)
  - [ ] Import: `ImageRepository`
  - [ ] Write route tests
  - [ ] ✅ All tests pass

- [ ] **Create index router**
  - [ ] Create `backend/src/routes/admin/images/index.ts`
  - [ ] Import all sub-routers
  - [ ] Mount routes:
    ```typescript
    router.use('/collect', collectionRouter);
    router.use('/upload', uploadRouter);
    router.use('/annotate', annotationRouter);
    router.use('/jobs', jobRouter);
    router.use('/stats', statsRouter);
    router.use('/bulk', bulkRouter);
    router.use('/', imageRouter);
    ```
  - [ ] Export default router

### Day 8-10: Integration & Cleanup

- [ ] **Update main server**
  - [ ] Update `backend/src/server.ts`
  - [ ] Change import: `import adminImageRouter from './routes/admin/images'`
  - [ ] Mount: `app.use('/api/admin/images', adminImageRouter)`
  - [ ] Verify routes still accessible

- [ ] **Run full test suite**
  ```bash
  npm test
  ```
  - [ ] ✅ All tests pass
  - [ ] ✅ No regressions

- [ ] **Check for circular dependencies**
  ```bash
  npx madge --circular backend/src
  ```
  - [ ] ✅ No circular dependencies

- [ ] **Delete old file**
  - [ ] Delete `backend/src/routes/adminImageManagement.ts`
  - [ ] Delete old test file if separate

- [ ] **Git commit**
  ```bash
  git add .
  git commit -m "refactor: decompose adminImageManagement into 14 modular files

  - Extract services: UnsplashService, ImageProcessingService, JobService
  - Extract repository: ImageRepository
  - Create sub-routers: collection, upload, annotation, job, stats, bulk, image
  - All modules < 350 lines
  - Test coverage maintained at 80%+
  - No circular dependencies"
  ```

---

## Week 3-4: aiAnnotations.ts → 8 Modules

### Day 1-2: Extract Services

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/services/annotations
  ```

- [ ] **Extract AnnotationReviewService**
  - [ ] Create `backend/src/services/annotations/AnnotationReviewService.ts`
  - [ ] Extract approve/reject/edit logic (lines 985-1422)
  - [ ] Add interface: `approveAnnotation()`, `rejectAnnotation()`, `editAnnotation()`, `trainFromFeedback()`
  - [ ] Inject dependencies: `AnnotationRepository`, `PatternLearningService`, `ReinforcementLearningEngine`
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

- [ ] **Extract AnnotationAnalyticsService**
  - [ ] Create `backend/src/services/annotations/AnnotationAnalyticsService.ts`
  - [ ] Extract performance/metrics logic (lines 1743-1839)
  - [ ] Add interface: `getPerformanceMetrics()`, `getRejectionPatterns()`, `getQualityMetrics()`
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

- [ ] **Extract BulkReviewService**
  - [ ] Create `backend/src/services/annotations/BulkReviewService.ts`
  - [ ] Extract bulk approve/reject (lines 1423-1742)
  - [ ] Add interface: `bulkApprove()`, `bulkReject()`
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

### Day 3: Extract Repository

- [ ] **Extract AnnotationRepository**
  - [ ] Create `backend/src/repositories/AnnotationRepository.ts`
  - [ ] Extract all annotation database queries
  - [ ] Add interface: `getAnnotationsByImageId()`, `getAnnotationJob()`, `updateAnnotationStatus()`, etc.
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

### Day 4-6: Extract Sub-Routers

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/routes/annotations/ai
  ```

- [ ] **Extract generation.routes.ts**
  - [ ] Create `backend/src/routes/annotations/ai/generation.routes.ts`
  - [ ] Move POST /generate (lines 185-519)
  - [ ] Import: `VisionAIService`, `VisionPreflightService`
  - [ ] Write tests
  - [ ] ✅ All tests pass

- [ ] **Extract review.routes.ts**
  - [ ] Create `backend/src/routes/annotations/ai/review.routes.ts`
  - [ ] Move POST /:imageId/approve, /reject, PATCH /:imageId
  - [ ] Import: `AnnotationReviewService`
  - [ ] Write tests
  - [ ] ✅ All tests pass

- [ ] **Extract bulk.routes.ts**
  - [ ] Create `backend/src/routes/annotations/ai/bulk.routes.ts`
  - [ ] Move POST /bulk/approve, /bulk/reject
  - [ ] Import: `BulkReviewService`
  - [ ] Write tests
  - [ ] ✅ All tests pass

- [ ] **Extract query.routes.ts**
  - [ ] Create `backend/src/routes/annotations/ai/query.routes.ts`
  - [ ] Move GET /:imageId/annotations, /preflight, /jobs, /jobs/:jobId
  - [ ] Import: `AnnotationRepository`
  - [ ] Write tests
  - [ ] ✅ All tests pass

- [ ] **Extract analytics.routes.ts**
  - [ ] Create `backend/src/routes/annotations/ai/analytics.routes.ts`
  - [ ] Move GET /performance, /rejection-patterns, /quality-metrics
  - [ ] Import: `AnnotationAnalyticsService`
  - [ ] Write tests
  - [ ] ✅ All tests pass

- [ ] **Create index router**
  - [ ] Create `backend/src/routes/annotations/ai/index.ts`
  - [ ] Mount all sub-routers
  - [ ] Export

### Day 7-8: Cleanup

- [ ] **Update server**
  - [ ] Update imports in `backend/src/server.ts`

- [ ] **Run tests**
  ```bash
  npm test
  ```
  - [ ] ✅ All tests pass

- [ ] **Check dependencies**
  ```bash
  npx madge --circular backend/src
  ```
  - [ ] ✅ No circular dependencies

- [ ] **Delete old file**
  - [ ] Delete `backend/src/routes/aiAnnotations.ts`

- [ ] **Git commit**
  ```bash
  git commit -m "refactor: decompose aiAnnotations into 8 modular files"
  ```

---

## Week 5-6: PatternLearner.ts → 6 Modules

### Day 1: Extract Types

- [ ] **Create types file**
  - [ ] Create `backend/src/types/pattern-learning.types.ts`
  - [ ] Move all interfaces (lines 23-106):
    - `LearnedPattern`
    - `BoundingBoxPattern`
    - `PositionCorrection`
    - `RejectionPattern`
    - `SpeciesFeatureStats`
    - `FeatureStats`
    - `QualityMetrics`
  - [ ] Export all types

- [ ] **Update imports**
  - [ ] Update `PatternLearner.ts` to import from types file
  - [ ] Run tests: `npm test -- --testPathPattern=PatternLearner`
  - [ ] ✅ All tests pass

### Day 2-4: Extract Sub-Services

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/services/ml
  ```

- [ ] **Extract PromptEnhancementService**
  - [ ] Create `backend/src/services/ml/PromptEnhancementService.ts`
  - [ ] Extract `enhancePrompt()` method (~180 lines)
  - [ ] Add helper methods for prompt building
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

- [ ] **Extract BoundingBoxLearner**
  - [ ] Create `backend/src/services/ml/BoundingBoxLearner.ts`
  - [ ] Extract `updateBoundingBoxPattern()` (~80 lines)
  - [ ] Extract `learnFromCorrection()` (~90 lines)
  - [ ] Add variance calculation logic
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

- [ ] **Extract QualityMetricsCalculator**
  - [ ] Create `backend/src/services/ml/QualityMetricsCalculator.ts`
  - [ ] Extract `calculateQualityMetrics()` (~120 lines)
  - [ ] Add scoring methods
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

- [ ] **Extract SpeciesFeatureAnalytics**
  - [ ] Create `backend/src/services/ml/SpeciesFeatureAnalytics.ts`
  - [ ] Extract `updateFeatureStats()` (~95 lines)
  - [ ] Extract `getSpeciesStats()` (~85 lines)
  - [ ] Extract `getRecommendedFeatures()` (~100 lines)
  - [ ] Write unit tests
  - [ ] ✅ All tests pass

### Day 5: Create Orchestrator

- [ ] **Create PatternLearningService**
  - [ ] Create `backend/src/services/ml/PatternLearningService.ts`
  - [ ] Inject all sub-services as dependencies
  - [ ] Implement orchestration methods:
    - `enhancePrompt()` → delegates to PromptEnhancementService
    - `learnFromCorrection()` → delegates to BoundingBoxLearner
    - `calculateQualityMetrics()` → delegates to QualityMetricsCalculator
    - `getRecommendedFeatures()` → delegates to SpeciesFeatureAnalytics
  - [ ] Write integration tests
  - [ ] ✅ All tests pass

### Day 6-7: Update Dependencies & Cleanup

- [ ] **Update imports across codebase**
  ```bash
  grep -r "PatternLearner" backend/src | grep "import"
  ```
  - [ ] Update all imports to use `PatternLearningService`
  - [ ] Update dependency injection

- [ ] **Run full test suite**
  ```bash
  npm test
  ```
  - [ ] ✅ All tests pass

- [ ] **Delete old file**
  - [ ] Delete `backend/src/services/PatternLearner.ts`

- [ ] **Git commit**
  ```bash
  git commit -m "refactor: decompose PatternLearner into 6 modular services"
  ```

---

## Week 7: VisionAI Consolidation

### Day 1-2: Merge Services

- [ ] **Create directory structure**
  ```bash
  mkdir -p backend/src/services/vision
  ```

- [ ] **Consolidate VisionAIService**
  - [ ] Copy `VisionAIService.integrated.ts` as base
  - [ ] Add missing features from `VisionAIService.ts`:
    - Basic annotation generation
    - Error handling patterns
    - Logging statements
  - [ ] Remove duplicate code
  - [ ] Standardize method signatures
  - [ ] Write comprehensive tests
  - [ ] ✅ All tests pass

- [ ] **Move VisionPreflightService**
  - [ ] Move `VisionPreflightService.ts` to `backend/src/services/vision/`
  - [ ] Update imports
  - [ ] ✅ Tests pass

### Day 3-4: Update Imports

- [ ] **Find all VisionAI imports**
  ```bash
  grep -r "VisionAIService" backend/src --include="*.ts"
  ```
  - [ ] Update all imports to use consolidated service
  - [ ] Update tests to use consolidated service

- [ ] **Run full test suite**
  ```bash
  npm test
  ```
  - [ ] ✅ All tests pass

### Day 5: Delete Old Files

- [ ] **Remove old files**
  - [ ] Delete `backend/src/services/VisionAIService.ts`
  - [ ] Delete `backend/src/services/VisionAIService.integrated.ts`

- [ ] **Rename consolidated file**
  - [ ] Ensure consolidated file is named `VisionAIService.ts`

- [ ] **Git commit**
  ```bash
  git commit -m "refactor: consolidate VisionAI services into unified implementation"
  ```

---

## Week 8-9: ImageManagementPage.tsx → 8 Components

### Day 1-2: Extract Types

- [ ] **Create types file**
  - [ ] Create `frontend/src/types/admin/image-management.types.ts`
  - [ ] Extract all interfaces and types
  - [ ] Export all types

### Day 3-7: Extract Components

- [ ] **Create directory structure**
  ```bash
  mkdir -p frontend/src/components/admin/image-management
  ```

- [ ] **Extract DashboardHeader**
  - [ ] Create `DashboardHeader.tsx`
  - [ ] Extract header logic (~80 lines)
  - [ ] Add prop types
  - [ ] Write Storybook story
  - [ ] Write tests
  - [ ] ✅ Tests pass

- [ ] **Extract StatsCards**
  - [ ] Create `StatsCards.tsx`
  - [ ] Extract stats display (~150 lines)
  - [ ] Write tests
  - [ ] ✅ Tests pass

- [ ] **Extract CollectionPanel**
  - [ ] Create `CollectionPanel.tsx`
  - [ ] Extract collection UI (~180 lines)
  - [ ] Write tests
  - [ ] ✅ Tests pass

- [ ] **Extract AnnotationPanel**
  - [ ] Create `AnnotationPanel.tsx`
  - [ ] Extract annotation UI (~160 lines)
  - [ ] Write tests
  - [ ] ✅ Tests pass

- [ ] **Extract JobStatusPanel**
  - [ ] Create `JobStatusPanel.tsx`
  - [ ] Extract job tracking UI (~200 lines)
  - [ ] Write tests
  - [ ] ✅ Tests pass

- [ ] **Extract ImageGalleryPanel**
  - [ ] Create `ImageGalleryPanel.tsx`
  - [ ] Extract gallery UI (~250 lines)
  - [ ] Write tests
  - [ ] ✅ Tests pass

### Day 8-10: Update Main Page & Cleanup

- [ ] **Refactor main page**
  - [ ] Update `ImageManagementPage.tsx` to use extracted components
  - [ ] Reduce to ~180 lines (orchestration only)
  - [ ] Verify UI still works correctly

- [ ] **Run tests**
  ```bash
  npm test
  ```
  - [ ] ✅ All frontend tests pass

- [ ] **Git commit**
  ```bash
  git commit -m "refactor: decompose ImageManagementPage into 8 modular components"
  ```

---

## Week 10: Final Integration

### Day 1-3: Full Regression Testing

- [ ] **Run complete test suite**
  ```bash
  npm test -- --coverage
  ```
  - [ ] ✅ Overall coverage ≥ 80%
  - [ ] ✅ Critical paths ≥ 95%
  - [ ] ✅ No test failures

- [ ] **Integration tests**
  ```bash
  npm test -- --testPathPattern=integration
  ```
  - [ ] ✅ Admin dashboard flow works
  - [ ] ✅ Annotation workflow works
  - [ ] ✅ Bulk operations work

- [ ] **E2E tests (manual)**
  - [ ] ✅ Image collection works
  - [ ] ✅ Image upload works
  - [ ] ✅ Annotation generation works
  - [ ] ✅ Annotation review works
  - [ ] ✅ Bulk actions work

### Day 4-5: Performance Testing

- [ ] **Benchmark API endpoints**
  ```bash
  npm run benchmark
  ```
  - [ ] ✅ POST /collect response time < 500ms
  - [ ] ✅ POST /annotate response time < 1s
  - [ ] ✅ GET /images response time < 200ms

- [ ] **Check build time**
  ```bash
  time npm run build
  ```
  - [ ] ✅ Build time < 30 seconds

- [ ] **Check test time**
  ```bash
  time npm test
  ```
  - [ ] ✅ Test suite < 2 minutes

### Day 6-7: Update Documentation

- [ ] **Update architecture diagrams**
  - [ ] Update system architecture diagram
  - [ ] Update component diagram
  - [ ] Update sequence diagrams

- [ ] **Update API documentation**
  - [ ] Update OpenAPI/Swagger specs
  - [ ] Update route documentation
  - [ ] Update response examples

- [ ] **Update developer docs**
  - [ ] Update README.md
  - [ ] Update CONTRIBUTING.md
  - [ ] Update architecture docs

### Day 8-10: Code Review & Polish

- [ ] **Code review checklist**
  - [ ] ✅ All files < 500 lines
  - [ ] ✅ No circular dependencies
  - [ ] ✅ Consistent naming conventions
  - [ ] ✅ Comprehensive error handling
  - [ ] ✅ Proper logging
  - [ ] ✅ Type safety (no `any` types)
  - [ ] ✅ JSDoc comments on public APIs

- [ ] **Final cleanup**
  - [ ] Remove unused imports
  - [ ] Remove commented code
  - [ ] Format all files: `npm run format`
  - [ ] Lint all files: `npm run lint`

- [ ] **Final commit**
  ```bash
  git commit -m "refactor: complete modularization of AVES architecture

  Summary of changes:
  - adminImageManagement.ts (2,863 lines) → 14 modules (avg. 220 lines)
  - aiAnnotations.ts (1,839 lines) → 8 modules (avg. 230 lines)
  - PatternLearner.ts (1,279 lines) → 6 modules (avg. 213 lines)
  - VisionAI services (3 files) → 1 unified service
  - ImageManagementPage.tsx (951 lines) → 8 components (avg. 180 lines)

  Metrics:
  - Total files refactored: 5 god files → 36 modular files
  - Average file size: 220 lines (was 1,584 lines)
  - Test coverage: 82% (maintained)
  - Zero circular dependencies
  - All modules < 500 lines

  Breaking changes: None (backward compatible)
  Migration path: Seamless (no API changes)"
  ```

- [ ] **Create pull request**
  - [ ] Title: "Architecture Refactoring: Modularize God Files"
  - [ ] Description: Link to REFACTORING_STRATEGY.md
  - [ ] Add before/after metrics
  - [ ] Request reviews from team

---

## Success Criteria Verification

- [ ] **File Size Metrics**
  ```bash
  find backend/src -name "*.ts" ! -path "*/node_modules/*" -exec wc -l {} \; | awk '{if ($1 > 500) print $0}'
  ```
  - [ ] ✅ Output is empty (no files > 500 lines)

- [ ] **Test Coverage**
  ```bash
  npm test -- --coverage --coverageReporters=text-summary
  ```
  - [ ] ✅ Statements: 80%+
  - [ ] ✅ Branches: 75%+
  - [ ] ✅ Functions: 80%+
  - [ ] ✅ Lines: 80%+

- [ ] **No Circular Dependencies**
  ```bash
  npx madge --circular backend/src
  ```
  - [ ] ✅ No circular dependencies found

- [ ] **Build Success**
  ```bash
  npm run build
  ```
  - [ ] ✅ Build succeeds with no errors
  - [ ] ✅ No TypeScript errors
  - [ ] ✅ No linting errors

---

**Checklist Version:** 1.0.0
**Last Updated:** 2025-12-04
**Estimated Total Time:** 10 weeks (50 working days)
**Progress:** 0% (Not started)
