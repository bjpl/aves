# AVES Architecture Dependency Graph

## Visual Dependency Map

### Current Architecture (Degraded)

```
┌────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (GOD FILES)                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  adminImageManagement.ts (2,863 lines)                         │
│  ├─ 16 route handlers                                          │
│  ├─ Direct database queries (pool)                             │
│  ├─ Direct Unsplash API calls (axios)                          │
│  ├─ Direct file system operations (fs, sharp)                  │
│  ├─ Embedded job tracking logic                                │
│  └─ Mixed validation, business logic, and I/O                  │
│                                                                │
│  aiAnnotations.ts (1,839 lines)                                │
│  ├─ 14 route handlers                                          │
│  ├─ Direct VisionAI calls                                      │
│  ├─ Direct ReinforcementLearningEngine calls                   │
│  ├─ Direct PatternLearner calls                                │
│  ├─ Embedded annotation review logic                           │
│  └─ Mixed ML integration and database operations               │
│                                                                │
│  PatternLearner.ts (1,279 lines)                               │
│  ├─ Pattern storage (Supabase)                                 │
│  ├─ Prompt enhancement                                         │
│  ├─ Bounding box learning                                      │
│  ├─ Quality metrics                                            │
│  ├─ Species feature analytics                                  │
│  └─ All ML logic in one class                                  │
│                                                                │
│  VisionAIService.ts + VisionAIService.integrated.ts            │
│  └─ Duplicate logic, unclear responsibilities                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Target Architecture (Modular)

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Express Routes (8 routers × ~150 lines each)                  │
│  ├─ admin/images/collection.routes.ts                          │
│  │   └─ POST /collect                                          │
│  ├─ admin/images/upload.routes.ts                              │
│  │   └─ POST /upload                                           │
│  ├─ admin/images/annotation.routes.ts                          │
│  │   ├─ POST /annotate                                         │
│  │   └─ POST /retry-failed                                     │
│  ├─ admin/images/job.routes.ts                                 │
│  │   ├─ GET /:jobId                                            │
│  │   └─ POST /:jobId/cancel                                    │
│  ├─ admin/images/stats.routes.ts                               │
│  │   ├─ GET /stats                                             │
│  │   └─ GET /quota                                             │
│  ├─ admin/images/bulk.routes.ts                                │
│  │   ├─ POST /bulk-delete                                      │
│  │   └─ POST /bulk-annotate                                    │
│  ├─ admin/images/image.routes.ts                               │
│  │   ├─ GET /images                                            │
│  │   ├─ GET /images/:id                                        │
│  │   └─ DELETE /images/:id                                     │
│  └─ annotations/ai/*.routes.ts                                 │
│      ├─ generation.routes.ts                                   │
│      ├─ review.routes.ts                                       │
│      ├─ bulk.routes.ts                                         │
│      └─ analytics.routes.ts                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Services (5 services × ~250 lines each)                 │
│  ├─ UnsplashService                                             │
│  │   ├─ searchPhotos()                                         │
│  │   ├─ downloadPhoto()                                        │
│  │   └─ getRateLimit()                                         │
│  ├─ ImageProcessingService                                     │
│  │   ├─ processImage()                                         │
│  │   ├─ generateThumbnail()                                    │
│  │   └─ saveImage()                                            │
│  ├─ JobService                                                 │
│  │   ├─ createJob()                                            │
│  │   ├─ updateProgress()                                       │
│  │   └─ getJob()                                               │
│  ├─ AnnotationJobService                                       │
│  │   ├─ queueBatchAnnotation()                                 │
│  │   └─ processAnnotationJob()                                 │
│  └─ BulkOperationService                                       │
│      ├─ bulkDelete()                                           │
│      └─ bulkAnnotate()                                         │
│                                                                 │
│  Annotation Services (3 services × ~300 lines each)            │
│  ├─ AnnotationReviewService                                    │
│  │   ├─ approveAnnotation()                                    │
│  │   ├─ rejectAnnotation()                                     │
│  │   ├─ editAnnotation()                                       │
│  │   └─ trainFromFeedback()                                    │
│  ├─ AnnotationAnalyticsService                                 │
│  │   ├─ getPerformanceMetrics()                                │
│  │   ├─ getRejectionPatterns()                                 │
│  │   └─ getQualityMetrics()                                    │
│  └─ BulkReviewService                                          │
│      ├─ bulkApprove()                                          │
│      └─ bulkReject()                                           │
│                                                                 │
│  ML Services (5 services × ~220 lines each)                    │
│  ├─ PatternLearningService (orchestrator)                      │
│  │   ├─ enhancePrompt()                                        │
│  │   ├─ learnFromCorrection()                                  │
│  │   └─ getRecommendedFeatures()                               │
│  ├─ PromptEnhancementService                                   │
│  │   ├─ enhanceWithPatterns()                                  │
│  │   └─ buildPromptContext()                                   │
│  ├─ BoundingBoxLearner                                         │
│  │   ├─ updateBoundingBoxPattern()                             │
│  │   └─ calculateVariance()                                    │
│  ├─ QualityMetricsCalculator                                   │
│  │   ├─ calculateQualityMetrics()                              │
│  │   └─ scoreAnnotation()                                      │
│  └─ SpeciesFeatureAnalytics                                    │
│      ├─ updateFeatureStats()                                   │
│      ├─ getSpeciesStats()                                      │
│      └─ getRecommendedFeatures()                               │
│                                                                 │
│  Vision Services (2 services)                                  │
│  ├─ VisionAIService (consolidated, ~450 lines)                 │
│  │   ├─ generateAnnotations()                                  │
│  │   ├─ generateWithRetry()                                    │
│  │   └─ buildAnnotationPrompt()                                │
│  └─ VisionPreflightService (~350 lines)                        │
│      ├─ validateImage()                                        │
│      ├─ checkImageQuality()                                    │
│      └─ detectBirdPresence()                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     REPOSITORY LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Data Access (3 repositories × ~280 lines each)                │
│  ├─ ImageRepository                                             │
│  │   ├─ getImages()                                            │
│  │   ├─ getImageById()                                         │
│  │   ├─ createImage()                                          │
│  │   ├─ deleteImage()                                          │
│  │   └─ updateImageStatus()                                    │
│  ├─ AnnotationRepository                                       │
│  │   ├─ getAnnotationsByImageId()                              │
│  │   ├─ getAnnotationJob()                                     │
│  │   ├─ getPendingAnnotations()                                │
│  │   └─ updateAnnotationStatus()                               │
│  └─ SpeciesRepository                                          │
│      ├─ getSpeciesById()                                       │
│      ├─ getSpeciesByIds()                                      │
│      └─ createSpecies()                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PostgreSQL (via pg pool)                                       │
│  ├─ images table                                                │
│  ├─ ai_annotations table                                        │
│  ├─ species table                                               │
│  └─ learned_patterns table (Supabase)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Service Dependencies

### 1. Collection Flow

```
collection.routes.ts
  ↓
  ├─→ UnsplashService.searchPhotos()
  │     ↓
  │     └─→ axios (Unsplash API)
  │
  ├─→ ImageProcessingService.processImage()
  │     ↓
  │     └─→ sharp (image manipulation)
  │
  ├─→ ImageRepository.createImage()
  │     ↓
  │     └─→ PostgreSQL pool
  │
  └─→ JobService.createJob()
        ↓
        └─→ In-memory job store
```

### 2. Annotation Generation Flow

```
generation.routes.ts
  ↓
  ├─→ VisionPreflightService.validateImage()
  │     ↓
  │     ├─→ ImageQualityValidator
  │     └─→ BirdDetectionService
  │
  ├─→ VisionAIService.generateAnnotations()
  │     ↓
  │     ├─→ PatternLearningService.enhancePrompt()
  │     │     ↓
  │     │     ├─→ PromptEnhancementService
  │     │     └─→ SpeciesFeatureAnalytics
  │     │
  │     ├─→ Anthropic API (Claude Sonnet 4.5)
  │     │
  │     └─→ QualityMetricsCalculator.calculateQualityMetrics()
  │
  ├─→ AnnotationRepository.createAnnotation()
  │     ↓
  │     └─→ PostgreSQL pool
  │
  └─→ JobService.updateProgress()
```

### 3. Annotation Review Flow

```
review.routes.ts
  ↓
  └─→ AnnotationReviewService.approveAnnotation()
        ↓
        ├─→ AnnotationRepository.updateAnnotationStatus()
        │     ↓
        │     └─→ PostgreSQL pool
        │
        ├─→ PatternLearningService.learnFromApproval()
        │     ↓
        │     ├─→ BoundingBoxLearner.updateBoundingBoxPattern()
        │     └─→ SpeciesFeatureAnalytics.updateFeatureStats()
        │
        └─→ ReinforcementLearningEngine.recordFeedback()
              ↓
              └─→ PostgreSQL pool
```

### 4. Pattern Learning Flow

```
PatternLearningService (orchestrator)
  ↓
  ├─→ PromptEnhancementService
  │     ↓
  │     ├─→ getRecommendedFeatures()
  │     ├─→ buildPromptContext()
  │     └─→ formatEnhancedPrompt()
  │
  ├─→ BoundingBoxLearner
  │     ↓
  │     ├─→ updateBoundingBoxPattern()
  │     ├─→ calculateVariance()
  │     └─→ findSimilarPatterns()
  │
  ├─→ QualityMetricsCalculator
  │     ↓
  │     ├─→ calculateQualityMetrics()
  │     ├─→ scoreBoundingBoxQuality()
  │     └─→ scorePromptEffectiveness()
  │
  └─→ SpeciesFeatureAnalytics
        ↓
        ├─→ updateFeatureStats()
        ├─→ getSpeciesStats()
        ├─→ getRecommendedFeatures()
        └─→ calculateOccurrenceRate()
```

---

## Cross-Cutting Concerns

### Authentication & Authorization

```
optionalSupabaseAuth middleware
  ↓
  └─→ All admin routes
        ↓
        └─→ optionalSupabaseAdmin middleware
              ↓
              └─→ Validates role = 'admin'
```

### Validation

```
validateBody/validateParams/validateQuery middleware
  ↓
  ├─→ Zod schema validation
  └─→ Returns 400 if invalid
```

### Error Handling

```
All services
  ↓
  ├─→ Try-catch blocks
  ├─→ Custom error classes
  │     ├─→ UnsplashAPIError
  │     ├─→ ImageProcessingError
  │     ├─→ DatabaseError
  │     └─→ ValidationError
  │
  └─→ Logger utility
        ├─→ info()
        ├─→ warn()
        └─→ error()
```

### Rate Limiting

```
express-rate-limit
  ↓
  ├─→ adminRateLimiter (1000/hour)
  └─→ aiGenerationLimiter (500/hour)
```

---

## External Dependencies Map

### NPM Packages

```
@anthropic-ai/sdk
  └─→ VisionAIService.generateAnnotations()

axios
  ├─→ UnsplashService.searchPhotos()
  └─→ UnsplashService.downloadPhoto()

sharp
  ├─→ ImageProcessingService.processImage()
  └─→ ImageProcessingService.generateThumbnail()

multer
  └─→ upload.routes.ts (file upload middleware)

pg
  └─→ All repositories (pool.query)

@supabase/supabase-js
  ├─→ PatternLearningService (pattern storage)
  └─→ optionalSupabaseAuth middleware

zod
  └─→ All routes (validation schemas)

express-rate-limit
  └─→ All admin routes (rate limiting)
```

### Environment Variables

```
UNSPLASH_ACCESS_KEY
  └─→ UnsplashService

ANTHROPIC_API_KEY
  └─→ VisionAIService

SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  ├─→ PatternLearningService
  └─→ optionalSupabaseAuth middleware

DATABASE_URL
  └─→ PostgreSQL pool connection

UPLOAD_DIR
  └─→ ImageProcessingService
```

---

## Interface Boundary Contracts

### Route → Service Contract

**All routes must:**
- Accept validated request data (via Zod schemas)
- Call service methods with typed parameters
- Return standardized responses
- Handle service errors with try-catch
- Log all operations

**Example:**
```typescript
router.post('/collect', async (req, res) => {
  try {
    const { speciesIds, count } = req.body; // Pre-validated
    const result = await unsplashService.searchPhotos(query, count);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Collection failed', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Service → Repository Contract

**All services must:**
- Accept domain objects (DTOs)
- Return domain objects (not raw DB rows)
- Handle repository errors
- Not contain SQL queries

**Example:**
```typescript
class ImageRepository {
  async createImage(dto: CreateImageDTO): Promise<Image> {
    const result = await pool.query(sql, params);
    return this.mapRowToImage(result.rows[0]);
  }
}
```

### Service → Service Contract

**Services calling other services must:**
- Use dependency injection (constructor params)
- Handle service errors
- Not bypass abstraction layers

**Example:**
```typescript
class AnnotationJobService {
  constructor(
    private visionAIService: VisionAIService,
    private annotationRepository: AnnotationRepository,
    private jobService: JobService
  ) {}

  async processAnnotationJob(jobId: string): Promise<void> {
    // Uses injected dependencies
  }
}
```

---

## Data Flow Examples

### Example 1: User Collects Images

```
1. POST /api/admin/images/collect
   ├─ Body: { speciesIds: ['uuid1', 'uuid2'], count: 2 }
   └─ Headers: { Authorization: 'Bearer token' }

2. collection.routes.ts
   ├─ optionalSupabaseAuth → validates token
   ├─ optionalSupabaseAdmin → checks role
   ├─ validateBody(CollectImagesSchema) → validates input
   └─ Handler invoked

3. Handler calls services:
   ├─ jobService.createJob('collect', 4)
   │   └─ Returns: { jobId: 'collect_123', status: 'processing' }
   │
   ├─ For each species:
   │   ├─ unsplashService.searchPhotos('cardinal bird', 2)
   │   │   └─ Returns: [{ url, width, height }, ...]
   │   │
   │   ├─ For each photo:
   │   │   ├─ unsplashService.downloadPhoto(url)
   │   │   │   └─ Returns: Buffer
   │   │   │
   │   │   ├─ imageProcessingService.processImage(buffer)
   │   │   │   └─ Returns: { imagePath, thumbnailPath, width, height }
   │   │   │
   │   │   └─ imageRepository.createImage(dto)
   │   │       └─ Returns: Image { id, url, ... }
   │   │
   │   └─ jobService.updateProgress(jobId, { processedItems: 2 })
   │
   └─ Response: { jobId, message: 'Collection started' }

4. Client polls GET /api/admin/images/jobs/:jobId
   └─ Returns progress updates until status = 'completed'
```

### Example 2: AI Generates Annotations

```
1. POST /api/admin/images/annotate
   ├─ Body: { imageIds: ['img1', 'img2'] }
   └─ Headers: { Authorization: 'Bearer token' }

2. annotation.routes.ts
   ├─ Authentication/authorization checks
   └─ Handler invoked

3. Handler calls:
   ├─ annotationJobService.queueBatchAnnotation(['img1', 'img2'])
   │   └─ Creates job, returns jobId
   │
   └─ annotationJobService.processAnnotationJob(jobId) [async]
       ├─ For each imageId:
       │   ├─ imageRepository.getImageById(imageId)
       │   │   └─ Returns: Image { url, speciesId }
       │   │
       │   ├─ visionPreflightService.validateImage(imageUrl)
       │   │   └─ Checks quality, bird presence
       │   │
       │   ├─ visionAIService.generateAnnotations(imageUrl, imageId, metadata)
       │   │   ├─ patternLearningService.enhancePrompt(basePrompt, context)
       │   │   │   ├─ speciesFeatureAnalytics.getRecommendedFeatures(species)
       │   │   │   └─ promptEnhancementService.buildPromptContext()
       │   │   │
       │   │   ├─ Call Anthropic API with enhanced prompt
       │   │   │
       │   │   └─ qualityMetricsCalculator.calculateQualityMetrics()
       │   │
       │   └─ annotationRepository.createAnnotation(annotations)
       │
       └─ jobService.updateProgress(jobId, { status: 'completed' })

4. Response: { jobId, message: 'Annotation started' }
```

### Example 3: Reviewer Approves Annotation

```
1. POST /api/ai-annotations/:imageId/approve
   ├─ Params: { imageId: 'img1' }
   ├─ Body: { notes: 'Good quality' }
   └─ Headers: { Authorization: 'Bearer token' }

2. review.routes.ts
   └─ Handler invoked

3. Handler calls:
   └─ annotationReviewService.approveAnnotation(imageId, reviewerId, notes)
       ├─ annotationRepository.updateAnnotationStatus(imageId, 'approved')
       │   └─ UPDATE ai_annotations SET status = 'approved'
       │
       ├─ patternLearningService.learnFromApproval(imageId)
       │   ├─ annotationRepository.getAnnotationsByImageId(imageId)
       │   │   └─ Returns annotations with bounding boxes
       │   │
       │   ├─ For each annotation:
       │   │   ├─ boundingBoxLearner.updateBoundingBoxPattern(feature, box)
       │   │   └─ speciesFeatureAnalytics.updateFeatureStats(species, feature)
       │   │
       │   └─ Stores learned patterns in Supabase
       │
       └─ reinforcementLearningEngine.recordFeedback(imageId, 'approve')
           └─ Updates reward signals

4. Response: { message: 'Annotation approved', learned: true }
```

---

## Testing Dependencies

### Unit Test Dependencies

```
collection.routes.test.ts
  ├─ Mock: UnsplashService
  ├─ Mock: ImageProcessingService
  ├─ Mock: ImageRepository
  ├─ Mock: JobService
  └─ Real: Express app, request/response

UnsplashService.test.ts
  ├─ Mock: axios
  └─ Real: Service logic

PatternLearningService.test.ts
  ├─ Mock: PromptEnhancementService
  ├─ Mock: BoundingBoxLearner
  ├─ Mock: QualityMetricsCalculator
  ├─ Mock: SpeciesFeatureAnalytics
  └─ Real: Orchestration logic
```

### Integration Test Dependencies

```
admin-dashboard-flow.test.ts
  ├─ Real: Express app
  ├─ Real: All services
  ├─ Real: All repositories
  ├─ Mock: PostgreSQL pool
  ├─ Mock: Anthropic API
  └─ Mock: Unsplash API
```

---

## Circular Dependency Prevention

### Anti-Pattern Detection

**Check for circular dependencies:**
```bash
npx madge --circular backend/src
```

**Expected output:**
```
✔ No circular dependencies found!
```

### Dependency Rules

1. **Routes** can depend on **Services**, never the reverse
2. **Services** can depend on **Repositories**, never the reverse
3. **Services** can depend on other **Services** at the same level (via DI)
4. **Repositories** can only depend on **Database** layer
5. **ML Services** are leaf nodes (no circular refs)

### Valid Dependencies

```
✅ collection.routes.ts → UnsplashService
✅ UnsplashService → axios
✅ VisionAIService → PatternLearningService
✅ PatternLearningService → PromptEnhancementService
✅ ImageRepository → PostgreSQL pool
```

### Invalid Dependencies

```
❌ UnsplashService → collection.routes.ts (service → route)
❌ ImageRepository → UnsplashService (repository → service)
❌ PatternLearningService → VisionAIService (circular)
❌ PromptEnhancementService → PatternLearningService (circular)
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
**Related Documents:**
- REFACTORING_STRATEGY.md
- MIGRATION_CHECKLIST.md
