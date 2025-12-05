# Architecture Decision Records (ADRs)

## ADR-001: Adopt Repository Pattern for Data Access

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect, Development Team

### Context

The current codebase has database queries scattered throughout route handlers, making it difficult to:
- Test route logic without database dependencies
- Reuse queries across different routes
- Modify database schema without changing multiple files
- Enforce consistent data access patterns

### Decision

We will adopt the Repository Pattern, creating dedicated repository classes for each domain entity (Image, Annotation, Species).

**Implementation:**
```typescript
// C:/Users/brand/Development/Project_Workspace/active-development/aves/backend/src/repositories/ImageRepository.ts
export class ImageRepository {
  async getImages(filters: ImageFilter, pagination: Pagination): Promise<Image[]>
  async getImageById(id: string): Promise<Image | null>
  async createImage(data: CreateImageDTO): Promise<Image>
  async deleteImage(id: string): Promise<void>
  async updateImageStatus(id: string, status: string): Promise<void>
}
```

### Consequences

**Positive:**
- Route handlers become testable with mocked repositories
- Database queries are centralized and reusable
- Type-safe data access with DTOs and domain models
- Easier to optimize queries in one place
- Clear separation between business logic and data access

**Negative:**
- Additional abstraction layer (more files)
- Slight increase in boilerplate code
- Need to maintain mapping between DB rows and domain objects

**Mitigation:**
- Use TypeScript interfaces to minimize boilerplate
- Create base repository with common CRUD operations
- Document mapping conventions clearly

---

## ADR-002: Split Large Route Files into Sub-Routers

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

`adminImageManagement.ts` contains 16 endpoints in 2,863 lines, making it:
- Hard to navigate and understand
- Difficult to review in pull requests
- Prone to merge conflicts
- Violates Single Responsibility Principle

### Decision

We will decompose large route files into sub-routers organized by domain concern.

**Structure:**
```
routes/admin/images/
├── index.ts (mounts all sub-routers)
├── collection.routes.ts (Unsplash collection)
├── upload.routes.ts (local file upload)
├── annotation.routes.ts (annotation triggers)
├── job.routes.ts (job status/control)
├── stats.routes.ts (statistics/quotas)
├── bulk.routes.ts (bulk operations)
└── image.routes.ts (image CRUD)
```

**URL Mapping:**
- Old: `POST /api/admin/images/collect`
- New: `POST /api/admin/images/collect` (same, transparent to clients)

### Consequences

**Positive:**
- Each file has single, clear responsibility
- Easier to locate and modify specific endpoints
- Better code review experience (smaller diffs)
- Reduced merge conflicts
- Easier to apply route-specific middleware

**Negative:**
- More files to navigate
- Need to understand sub-router mounting

**Mitigation:**
- Create clear index.ts showing all sub-routers
- Document URL structure in each sub-router file
- Use consistent naming: `{domain}.routes.ts`

---

## ADR-003: Extract Service Layer from Route Handlers

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

Route handlers contain business logic, database queries, and external API calls, making them:
- Difficult to test (requires mocking Express req/res)
- Not reusable across different routes
- Tightly coupled to HTTP layer

### Decision

We will extract business logic into service classes that are independent of HTTP concerns.

**Pattern:**
```typescript
// Route (thin, orchestration only)
router.post('/collect', async (req, res) => {
  const { speciesIds, count } = req.body; // Already validated
  const jobId = await imageCollectionService.collectImages(speciesIds, count);
  res.json({ jobId, message: 'Collection started' });
});

// Service (thick, business logic)
class ImageCollectionService {
  constructor(
    private unsplashService: UnsplashService,
    private imageRepository: ImageRepository,
    private jobService: JobService
  ) {}

  async collectImages(speciesIds: string[], count: number): Promise<string> {
    // All business logic here
  }
}
```

### Consequences

**Positive:**
- Services are testable without HTTP mocking
- Business logic is reusable (CLI, workers, cron jobs, etc.)
- Routes become thin orchestrators (easy to read)
- Clear dependency injection points

**Negative:**
- More files and classes
- Need to pass data through additional layers

**Mitigation:**
- Use TypeScript to catch type errors at boundaries
- Document service interfaces clearly
- Keep services focused (single responsibility)

---

## ADR-004: Consolidate VisionAI Service Variants

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

Three VisionAI files exist with overlapping functionality:
- `VisionAIService.ts` (491 lines) - basic implementation
- `VisionAIService.integrated.ts` (573 lines) - adds validation & retry
- `VisionPreflightService.ts` (520 lines) - pre-validation

This causes:
- Confusion about which service to use
- Code duplication
- Maintenance burden (fix bugs in multiple places)

### Decision

We will consolidate into two services with clear separation:

1. **VisionAIService** (primary) - annotation generation with retry & validation
2. **VisionPreflightService** (supporting) - pre-generation validation

**Rationale:**
- `VisionAIService` incorporates best features from both variants
- `VisionPreflightService` has distinct responsibility (can be used independently)

**Migration:**
```typescript
// Before
import { VisionAIService } from '../services/VisionAIService.integrated';

// After
import { VisionAIService } from '../services/vision/VisionAIService';
```

### Consequences

**Positive:**
- Single source of truth for AI annotation
- No confusion about which service to use
- Reduced code duplication
- Easier maintenance

**Negative:**
- Breaking change for imports (but internal only)
- Need to migrate all existing imports

**Mitigation:**
- Do migration in single atomic commit
- Run full test suite to verify no regressions
- Update all documentation

---

## ADR-005: Decompose PatternLearner into Focused Services

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

`PatternLearner.ts` (1,279 lines) is a god class with 4 distinct responsibilities:
1. Prompt enhancement for AI calls
2. Bounding box position learning
3. Quality metrics calculation
4. Species feature analytics

This violates Single Responsibility Principle and makes the class:
- Hard to test (must mock everything)
- Hard to understand (too many concerns)
- Hard to extend (fear of breaking other parts)

### Decision

We will decompose into 5 services with clear boundaries:

```
PatternLearningService (orchestrator)
  ├─→ PromptEnhancementService
  ├─→ BoundingBoxLearner
  ├─→ QualityMetricsCalculator
  └─→ SpeciesFeatureAnalytics
```

**Orchestrator Pattern:**
```typescript
class PatternLearningService {
  constructor(
    private promptEnhancer: PromptEnhancementService,
    private boxLearner: BoundingBoxLearner,
    private metricsCalc: QualityMetricsCalculator,
    private featureAnalytics: SpeciesFeatureAnalytics
  ) {}

  async enhancePrompt(prompt: string, context: Context): Promise<string> {
    return this.promptEnhancer.enhance(prompt, context);
  }

  async learnFromCorrection(correction: Correction): Promise<void> {
    await this.boxLearner.learn(correction);
    await this.featureAnalytics.update(correction);
  }
}
```

### Consequences

**Positive:**
- Each service has single, testable responsibility
- Easier to understand and modify individual services
- Can test services independently
- Can extend/replace individual services without affecting others

**Negative:**
- More files and classes
- Need to coordinate between services via orchestrator
- Slightly more complex dependency injection

**Mitigation:**
- Use dependency injection container (if project grows)
- Document orchestration flow clearly
- Keep orchestrator thin (delegation only, no logic)

---

## ADR-006: Frontend Component Decomposition Strategy

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect, Frontend Lead

### Context

`ImageManagementPage.tsx` (951 lines) is a monolithic component containing:
- Dashboard header
- Stats cards
- Collection panel
- Annotation panel
- Job status panel
- Image gallery
- Multiple modals
- State management for all of the above

This makes it:
- Hard to test individual features
- Difficult to reuse components
- Slow to render (re-renders entire page on state change)
- Hard to review changes

### Decision

We will decompose into 8 focused components:

```
pages/admin/ImageManagementPage.tsx (orchestrator, 180 lines)
  ├─→ DashboardHeader
  ├─→ StatsCards
  ├─→ CollectionPanel
  ├─→ AnnotationPanel
  ├─→ JobStatusPanel
  └─→ ImageGalleryPanel
```

**Component Contract:**
```typescript
// Each component receives only props it needs
interface CollectionPanelProps {
  species: Species[];
  onCollect: (speciesIds: string[], count: number) => void;
  isLoading: boolean;
}
```

### Consequences

**Positive:**
- Components are independently testable
- Can use React.memo() to prevent unnecessary re-renders
- Components are reusable in other contexts
- Easier to review changes (smaller diffs)
- Better Storybook integration

**Negative:**
- More files to navigate
- Need to manage prop drilling
- State management becomes more complex

**Mitigation:**
- Use composition pattern to keep hierarchy flat
- Consider context API or state management library if prop drilling becomes excessive
- Document component hierarchy in README

---

## ADR-007: Enforce 500-Line File Size Limit

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

Large files (>1000 lines) have multiple problems:
- Hard to understand (too much to hold in working memory)
- Difficult to navigate (scrolling fatigue)
- Slow code review (reviewers lose focus)
- Likely violate Single Responsibility Principle
- Increased merge conflicts

Research shows optimal file size is 200-400 lines for maintainability.

### Decision

We will enforce a hard limit of **500 lines** per file.

**Implementation:**
```json
// .eslintrc.json
{
  "rules": {
    "max-lines": ["error", {
      "max": 500,
      "skipBlankLines": true,
      "skipComments": true
    }]
  }
}
```

**Exceptions:**
- Test files (can be longer due to test data)
- Generated files (migrations, API clients)
- Configuration files (tsconfig, webpack, etc.)

### Consequences

**Positive:**
- Forces modular design thinking
- Easier to understand individual files
- Better code review experience
- Reduced cognitive load

**Negative:**
- Must decompose existing large files (initial work)
- May lead to over-fragmentation if not careful

**Mitigation:**
- Automate detection with ESLint
- Provide refactoring guide (this document)
- Allow exceptions where justified (document in file)

---

## ADR-008: Use Dependency Injection for Service Composition

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

Services need to call other services, leading to:
- Hard-coded dependencies (`new UnsplashService()` inside class)
- Difficulty mocking dependencies in tests
- Tight coupling between services
- Can't swap implementations (e.g., for testing or feature flags)

### Decision

We will use constructor-based dependency injection for all services.

**Pattern:**
```typescript
// Define interface
interface IImageRepository {
  getImages(filters: ImageFilter): Promise<Image[]>;
}

// Service depends on interface
class ImageCollectionService {
  constructor(
    private unsplashService: IUnsplashService,
    private imageRepository: IImageRepository,
    private jobService: IJobService
  ) {}
}

// Instantiation (in app setup or DI container)
const imageRepository = new ImageRepository(pool);
const unsplashService = new UnsplashService(apiKey);
const jobService = new JobService();
const imageCollectionService = new ImageCollectionService(
  unsplashService,
  imageRepository,
  jobService
);
```

**Testing:**
```typescript
const mockRepository = {
  getImages: jest.fn().mockResolvedValue([])
};
const service = new ImageCollectionService(
  mockUnsplash,
  mockRepository,
  mockJob
);
```

### Consequences

**Positive:**
- Easy to test (inject mocks)
- Easy to swap implementations
- Explicit dependencies (visible in constructor)
- Follows Dependency Inversion Principle

**Negative:**
- More boilerplate (constructor params)
- Manual wiring in non-DI setup

**Mitigation:**
- Use TypeScript interfaces to reduce boilerplate
- Consider DI container (e.g., InversifyJS) if complexity grows
- Document dependency graph clearly

---

## ADR-009: Maintain Test Coverage During Refactoring

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect, QA Lead

### Context

Refactoring 7,932 lines of code carries risk of:
- Breaking existing functionality
- Introducing regressions
- Losing test coverage

We need a strategy to ensure quality during migration.

### Decision

We will enforce a **no-regression** policy during refactoring:

**Rules:**
1. Before extracting any module, run baseline tests and record results
2. After extracting module, run tests again - must achieve same or better coverage
3. Do not delete old file until all tests pass with new modules
4. Add new tests for extracted service interfaces

**Coverage Requirements:**
- Overall: ≥80%
- Critical paths: ≥95%
- New modules: ≥85%

**Process:**
```bash
# Before extraction
npm test -- --coverage > baseline-coverage.txt

# After extraction
npm test -- --coverage > new-coverage.txt

# Compare (should be same or better)
diff baseline-coverage.txt new-coverage.txt
```

### Consequences

**Positive:**
- High confidence in refactoring
- No feature regressions
- Improved test suite (new interface tests)
- Documentation via tests

**Negative:**
- Slower refactoring (must write/update tests)
- May need to write tests for previously untested code

**Mitigation:**
- Timebox test writing (don't aim for 100%)
- Focus on critical paths first
- Use integration tests to cover multiple modules

---

## ADR-010: Use Atomic Commits with Git Tags

**Status:** Approved
**Date:** 2025-12-04
**Deciders:** System Architect

### Context

Refactoring 5 major files into 36 modules is a large change with risk of:
- Breaking changes mid-refactoring
- Need to rollback to stable state
- Losing track of progress

We need a strategy for safe, incremental migration.

### Decision

We will use **atomic commits** with **git tags** as checkpoints.

**Strategy:**
```bash
# Create feature branch
git checkout -b refactor/modularize-architecture

# Tag before each major step
git tag refactor-checkpoint-adminRoutes-services
git tag refactor-checkpoint-adminRoutes-repositories
git tag refactor-checkpoint-adminRoutes-routers
# ... etc

# Commit after each successful module extraction
git commit -m "refactor: extract UnsplashService from adminImageManagement"
```

**If something breaks:**
```bash
# Rollback to last checkpoint
git reset --hard refactor-checkpoint-adminRoutes-services

# Or rollback single file
git checkout refactor-checkpoint-adminRoutes-services -- backend/src/routes/adminImageManagement.ts
```

### Consequences

**Positive:**
- Easy to rollback if tests fail
- Clear progress tracking
- Can resume work from checkpoint
- Git history shows incremental changes

**Negative:**
- More git commands to remember
- Need discipline to tag consistently

**Mitigation:**
- Document tagging convention
- Include tags in migration checklist
- Automate tagging with scripts if helpful

---

## Summary of Key Decisions

| ADR | Decision | Impact |
|-----|----------|--------|
| ADR-001 | Repository Pattern | Separates data access, enables testing |
| ADR-002 | Sub-Router Decomposition | Smaller, focused route files |
| ADR-003 | Service Layer Extraction | Reusable business logic |
| ADR-004 | VisionAI Consolidation | Single source of truth for AI |
| ADR-005 | PatternLearner Decomposition | Focused ML services |
| ADR-006 | Frontend Component Decomposition | Testable, reusable UI components |
| ADR-007 | 500-Line Limit | Enforces modularity |
| ADR-008 | Dependency Injection | Testable, flexible services |
| ADR-009 | Test Coverage Maintenance | No regressions during refactoring |
| ADR-010 | Atomic Commits with Tags | Safe, incremental migration |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
**Status:** All ADRs Approved
**Related Documents:**
- REFACTORING_STRATEGY.md
- DEPENDENCY_GRAPH.md
- MIGRATION_CHECKLIST.md
