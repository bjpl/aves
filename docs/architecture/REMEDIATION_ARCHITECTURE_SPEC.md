# AVES Architecture Remediation Specification
**Date**: 2025-12-04
**Architect**: System Architecture Designer
**Status**: APPROVED FOR IMPLEMENTATION

## Executive Summary

This document provides comprehensive architectural specifications for remediating critical technical debt in the AVES project, focusing on:

1. **Dependency Injection** pattern for PatternLearner.ts to enable proper test mocking
2. **God File Decomposition** plan for files exceeding 500 lines
3. **Route-Service-Repository** pattern standardization across backend
4. **Shared Type Extraction** to eliminate `: any` violations

---

## 1. PatternLearner Dependency Injection Refactoring

### 1.1 Current Architecture Issues

**Problem Identification:**
- **Line 18**: `const supabase = createClient(supabaseUrl, supabaseKey)` - Module-level Supabase client instantiation
- **Impact**: Prevents test mocking, causes test failures
- **Anti-pattern**: Tight coupling to external service at module scope

```typescript
// CURRENT (PROBLEMATIC)
const supabase = createClient(supabaseUrl, supabaseKey); // Line 18 - module scope

export class PatternLearner {
  constructor() {
    this.initPromise = this.initialize();
  }
  // Direct usage of module-level supabase instance
}
```

### 1.2 Dependency Injection Pattern Specification

**Architecture Pattern**: Constructor Injection with Factory Pattern

#### 1.2.1 Storage Interface Definition

**Location**: `backend/src/services/interfaces/IPatternStorage.ts`

```typescript
/**
 * Storage interface for pattern learning persistence
 * Abstracts Supabase client to enable dependency injection and testing
 */
export interface IPatternStorage {
  /**
   * Store pattern data to persistent storage
   * @param namespace - Storage namespace/bucket
   * @param key - Storage key/path
   * @param data - Data to store (serializable)
   * @returns Success status
   */
  store(namespace: string, key: string, data: unknown): Promise<boolean>;

  /**
   * Retrieve pattern data from persistent storage
   * @param namespace - Storage namespace/bucket
   * @param key - Storage key/path
   * @returns Retrieved data or null if not found
   */
  retrieve(namespace: string, key: string): Promise<unknown | null>;

  /**
   * Delete pattern data from storage
   * @param namespace - Storage namespace/bucket
   * @param key - Storage key/path
   * @returns Success status
   */
  delete(namespace: string, key: string): Promise<boolean>;

  /**
   * List keys in a namespace
   * @param namespace - Storage namespace/bucket
   * @param prefix - Optional key prefix filter
   * @returns Array of keys
   */
  list(namespace: string, prefix?: string): Promise<string[]>;
}
```

#### 1.2.2 Supabase Storage Implementation

**Location**: `backend/src/services/storage/SupabasePatternStorage.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IPatternStorage } from '../interfaces/IPatternStorage';
import { info, error as logError } from '../../utils/logger';

/**
 * Supabase-backed implementation of pattern storage
 * Encapsulates all Supabase client interactions
 */
export class SupabasePatternStorage implements IPatternStorage {
  private client: SupabaseClient;

  /**
   * Constructor with explicit client injection
   * Enables testing with mock clients
   */
  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      // Production initialization - only if no client provided
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
      }

      this.client = createClient(supabaseUrl, supabaseKey);
    }
  }

  async store(namespace: string, key: string, data: unknown): Promise<boolean> {
    try {
      const bucket = `pattern-learning-${namespace}`;
      const path = `${key}.json`;
      const content = JSON.stringify(data);

      const { error } = await this.client.storage
        .from(bucket)
        .upload(path, content, { upsert: true });

      if (error) {
        logError('Failed to store pattern data', error);
        return false;
      }

      info('Pattern data stored', { namespace, key });
      return true;
    } catch (err) {
      logError('Storage operation failed', err as Error);
      return false;
    }
  }

  async retrieve(namespace: string, key: string): Promise<unknown | null> {
    try {
      const bucket = `pattern-learning-${namespace}`;
      const path = `${key}.json`;

      const { data, error } = await this.client.storage
        .from(bucket)
        .download(path);

      if (error || !data) {
        return null;
      }

      const text = await data.text();
      return JSON.parse(text);
    } catch (err) {
      logError('Storage retrieval failed', err as Error);
      return null;
    }
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    try {
      const bucket = `pattern-learning-${namespace}`;
      const path = `${key}.json`;

      const { error } = await this.client.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        logError('Failed to delete pattern data', error);
        return false;
      }

      return true;
    } catch (err) {
      logError('Storage deletion failed', err as Error);
      return false;
    }
  }

  async list(namespace: string, prefix?: string): Promise<string[]> {
    try {
      const bucket = `pattern-learning-${namespace}`;

      const { data, error } = await this.client.storage
        .from(bucket)
        .list(prefix || '');

      if (error || !data) {
        return [];
      }

      return data.map(file => file.name.replace('.json', ''));
    } catch (err) {
      logError('Storage list failed', err as Error);
      return [];
    }
  }
}
```

#### 1.2.3 In-Memory Storage for Testing

**Location**: `backend/src/services/storage/InMemoryPatternStorage.ts`

```typescript
import { IPatternStorage } from '../interfaces/IPatternStorage';

/**
 * In-memory storage implementation for testing
 * No external dependencies, fully synchronous
 */
export class InMemoryPatternStorage implements IPatternStorage {
  private storage: Map<string, Map<string, unknown>> = new Map();

  async store(namespace: string, key: string, data: unknown): Promise<boolean> {
    if (!this.storage.has(namespace)) {
      this.storage.set(namespace, new Map());
    }

    this.storage.get(namespace)!.set(key, data);
    return true;
  }

  async retrieve(namespace: string, key: string): Promise<unknown | null> {
    const namespaceData = this.storage.get(namespace);
    if (!namespaceData) {
      return null;
    }

    return namespaceData.get(key) ?? null;
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    const namespaceData = this.storage.get(namespace);
    if (!namespaceData) {
      return false;
    }

    return namespaceData.delete(key);
  }

  async list(namespace: string, prefix?: string): Promise<string[]> {
    const namespaceData = this.storage.get(namespace);
    if (!namespaceData) {
      return [];
    }

    const keys = Array.from(namespaceData.keys());
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix));
    }
    return keys;
  }

  // Test utility methods
  clear(): void {
    this.storage.clear();
  }

  getAll(): Map<string, Map<string, unknown>> {
    return this.storage;
  }
}
```

#### 1.2.4 Refactored PatternLearner Class

**Location**: `backend/src/services/PatternLearner.ts`

```typescript
import { info, error as logError } from '../utils/logger';
import { AIAnnotation } from './VisionAIService';
import { IPatternStorage } from './interfaces/IPatternStorage';
import { SupabasePatternStorage } from './storage/SupabasePatternStorage';

export class PatternLearner {
  private patterns: Map<string, LearnedPattern> = new Map();
  private speciesStats: Map<string, SpeciesFeatureStats> = new Map();
  private positionCorrections: Map<string, PositionCorrection[]> = new Map();
  private rejectionPatterns: Map<string, RejectionPattern[]> = new Map();
  private memoryNamespace = 'pattern-learning';
  private sessionId = `swarm-pattern-learning-${Date.now()}`;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  // Injected storage dependency
  private storage: IPatternStorage;

  // ML hyperparameters (unchanged)
  private readonly CONFIDENCE_THRESHOLD = 0.75;
  private readonly MIN_SAMPLES_FOR_PATTERN = 3;
  private readonly PATTERN_DECAY_FACTOR = 0.95;
  private readonly MAX_PROMPT_HISTORY = 10;
  private readonly APPROVAL_CONFIDENCE_BOOST = 0.05;
  private readonly REJECTION_CONFIDENCE_PENALTY = 0.1;
  private readonly CORRECTION_WEIGHT = 1.5;

  /**
   * Constructor with dependency injection
   * @param storage - Storage implementation (defaults to Supabase in production)
   */
  constructor(storage?: IPatternStorage) {
    this.storage = storage || new SupabasePatternStorage();
    this.initPromise = this.initialize();
  }

  /**
   * Factory method for production instantiation
   */
  static createProduction(): PatternLearner {
    return new PatternLearner(new SupabasePatternStorage());
  }

  /**
   * Factory method for testing instantiation
   */
  static createForTesting(mockStorage: IPatternStorage): PatternLearner {
    return new PatternLearner(mockStorage);
  }

  // Rest of implementation unchanged, using this.storage instead of supabase

  private async restoreSession(): Promise<void> {
    try {
      const data = await this.storage.retrieve(
        this.memoryNamespace,
        `session-${this.sessionId}`
      );

      if (data) {
        // Restore state from data
        info('Session restored from storage', { sessionId: this.sessionId });
      }
    } catch (error) {
      logError('Failed to restore session', error as Error);
    }
  }

  private async persistSession(): Promise<void> {
    try {
      const sessionData = {
        patterns: Array.from(this.patterns.entries()),
        speciesStats: Array.from(this.speciesStats.entries()),
        positionCorrections: Array.from(this.positionCorrections.entries()),
        rejectionPatterns: Array.from(this.rejectionPatterns.entries()),
        timestamp: new Date().toISOString()
      };

      await this.storage.store(
        this.memoryNamespace,
        `session-${this.sessionId}`,
        sessionData
      );
    } catch (error) {
      logError('Failed to persist session', error as Error);
    }
  }

  // ... rest of class implementation
}

// Singleton exports for backward compatibility
export const patternLearner = PatternLearner.createProduction();
```

#### 1.2.5 Test Implementation Example

**Location**: `backend/src/__tests__/services/PatternLearner.test.ts`

```typescript
import { PatternLearner } from '../../services/PatternLearner';
import { InMemoryPatternStorage } from '../../services/storage/InMemoryPatternStorage';

describe('PatternLearner', () => {
  let patternLearner: PatternLearner;
  let mockStorage: InMemoryPatternStorage;

  beforeEach(() => {
    // Create mock storage for each test
    mockStorage = new InMemoryPatternStorage();

    // Inject mock storage via constructor
    patternLearner = PatternLearner.createForTesting(mockStorage);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it('should initialize without Supabase dependency', async () => {
    await patternLearner.ensureInitialized();

    // Test passes without real Supabase connection
    expect(patternLearner).toBeDefined();
  });

  it('should store and retrieve patterns', async () => {
    // Test logic using mockStorage
    // No external dependencies required
  });
});
```

### 1.3 Migration Strategy

**Phase 1: Interface & Implementations (1-2 hours)**
1. Create `IPatternStorage` interface
2. Create `SupabasePatternStorage` implementation
3. Create `InMemoryPatternStorage` implementation

**Phase 2: PatternLearner Refactoring (2-3 hours)**
1. Add constructor parameter for storage
2. Replace direct `supabase` usage with `this.storage`
3. Add factory methods
4. Update singleton export

**Phase 3: Test Migration (1-2 hours)**
1. Update existing tests to use `InMemoryPatternStorage`
2. Add integration tests for `SupabasePatternStorage`
3. Verify all tests pass

**Phase 4: Rollout (1 hour)**
1. Update imports in dependent files
2. Deploy to staging
3. Monitor for issues
4. Deploy to production

**Total Estimated Time**: 6-8 hours

---

## 2. God File Decomposition Plan

### 2.1 File Size Analysis

**Critical Files Requiring Decomposition:**

| File | Lines | Priority | Complexity |
|------|-------|----------|-----------|
| `adminImageManagement.ts` | 2863 | CRITICAL | Very High |
| `aiAnnotations.ts` | 1839 | CRITICAL | High |
| `PatternLearner.ts` | 1279 | HIGH | High |
| `ImageManagementPage.tsx` | 951 | HIGH | Medium |
| Additional 39 files | 500-900 | MEDIUM | Varies |

### 2.2 Decomposition Strategy: adminImageManagement.ts

**Current Structure** (2863 lines):
- Configuration (50 lines)
- Job tracking (200 lines)
- Validation schemas (150 lines)
- Unsplash integration (400 lines)
- Image processing (300 lines)
- Upload handling (400 lines)
- Annotation triggers (300 lines)
- Statistics (200 lines)
- API routes (863 lines)

**Target Architecture**:

```
backend/src/routes/admin/
├── imageManagement.routes.ts        (150 lines) - Express router only
├── imageCollection.routes.ts        (150 lines) - Collection endpoints
├── imageAnnotation.routes.ts        (150 lines) - Annotation endpoints
├── imageGallery.routes.ts           (150 lines) - Gallery endpoints
└── imageStatistics.routes.ts        (100 lines) - Statistics endpoints

backend/src/services/admin/
├── ImageCollectionService.ts        (300 lines) - Unsplash integration
├── ImageProcessingService.ts        (300 lines) - Image processing logic
├── ImageAnnotationService.ts        (250 lines) - Annotation orchestration
├── JobTrackingService.ts            (200 lines) - Job management
├── UnsplashService.ts               (250 lines) - Unsplash API wrapper
└── index.ts                         (50 lines)  - Service exports

backend/src/validation/admin/
├── imageSchemas.ts                  (150 lines) - Zod validation schemas
└── index.ts                         (20 lines)  - Schema exports

backend/src/types/admin/
├── job.types.ts                     (100 lines) - Job type definitions
├── image.types.ts                   (100 lines) - Image type definitions
└── index.ts                         (20 lines)  - Type exports
```

**Decomposition Benefits**:
- **Testability**: Each service can be tested independently
- **Maintainability**: Smaller, focused files easier to understand
- **Reusability**: Services can be imported without route dependencies
- **Team Collaboration**: Reduces merge conflicts

### 2.3 Decomposition Strategy: aiAnnotations.ts

**Current Structure** (1839 lines):
- Validation schemas (100 lines)
- AI generation logic (400 lines)
- Review workflow (500 lines)
- Bulk operations (300 lines)
- Analytics (200 lines)
- API routes (339 lines)

**Target Architecture**:

```
backend/src/routes/ai/
├── annotations.routes.ts            (150 lines) - Express router
├── generation.routes.ts             (150 lines) - Generation endpoints
├── review.routes.ts                 (150 lines) - Review endpoints
└── analytics.routes.ts              (100 lines) - Analytics endpoints

backend/src/services/ai/
├── AnnotationGenerationService.ts   (350 lines) - AI generation orchestration
├── AnnotationReviewService.ts       (300 lines) - Review workflow
├── AnnotationBulkService.ts         (250 lines) - Bulk operations
├── AnnotationAnalyticsService.ts    (200 lines) - Analytics & metrics
└── index.ts                         (50 lines)  - Service exports

backend/src/validation/ai/
├── annotationSchemas.ts             (150 lines) - Validation schemas
└── index.ts                         (20 lines)  - Schema exports
```

### 2.4 Decomposition Strategy: PatternLearner.ts

**Current Structure** (1279 lines):
- Interfaces (100 lines)
- Storage logic (200 lines)
- Pattern learning algorithms (400 lines)
- Statistics tracking (300 lines)
- Quality metrics (279 lines)

**Target Architecture**:

```
backend/src/services/pattern-learning/
├── PatternLearner.ts                (250 lines) - Main orchestrator
├── PatternStorage.ts                (200 lines) - Persistence logic
├── PatternAlgorithms.ts             (300 lines) - ML algorithms
├── PatternStatistics.ts             (250 lines) - Statistics tracking
├── QualityMetrics.ts                (200 lines) - Quality scoring
└── index.ts                         (50 lines)  - Exports

backend/src/types/pattern-learning/
├── pattern.types.ts                 (150 lines) - Pattern types
├── metrics.types.ts                 (100 lines) - Metrics types
└── index.ts                         (20 lines)  - Type exports
```

### 2.5 Decomposition Strategy: ImageManagementPage.tsx

**Current Structure** (951 lines):
- Component logic (200 lines)
- State management (150 lines)
- Tab rendering (300 lines)
- Gallery rendering (301 lines)

**Target Architecture**:

```
frontend/src/pages/admin/
└── ImageManagementPage.tsx          (200 lines) - Main page container

frontend/src/components/admin/image-management/
├── ImageCollectionPanel.tsx         (200 lines) - Collection tab
├── ImageGalleryPanel.tsx            (250 lines) - Gallery tab
├── ImageAnnotationPanel.tsx         (200 lines) - Annotation tab
├── ImageStatisticsPanel.tsx         (150 lines) - Statistics tab
├── ImageJobHistoryPanel.tsx         (150 lines) - Job history tab
└── index.ts                         (50 lines)  - Component exports

frontend/src/hooks/admin/
├── useImageManagement.ts            (200 lines) - Main management hook
├── useImageCollection.ts            (150 lines) - Collection operations
├── useImageAnnotation.ts            (150 lines) - Annotation operations
└── index.ts                         (30 lines)  - Hook exports
```

### 2.6 Universal Decomposition Guidelines

**File Size Targets**:
- **Routes**: Maximum 150 lines per route file
- **Services**: Maximum 350 lines per service
- **Components**: Maximum 250 lines per component
- **Types**: Maximum 150 lines per type file

**Decomposition Principles**:
1. **Single Responsibility**: Each file has one clear purpose
2. **High Cohesion**: Related functionality stays together
3. **Low Coupling**: Minimize dependencies between files
4. **Clear Interfaces**: Well-defined contracts between modules
5. **Testability**: Each module can be tested in isolation

**Decomposition Priority**:
1. **Phase 1 (Week 1)**: Top 5 critical files (>1000 lines)
2. **Phase 2 (Week 2)**: Next 10 high-priority files (750-999 lines)
3. **Phase 3 (Week 3)**: Next 15 medium-priority files (600-749 lines)
4. **Phase 4 (Week 4)**: Remaining files (500-599 lines)

---

## 3. Route-Service-Repository Pattern

### 3.1 Pattern Architecture

```
┌─────────────────┐
│  Express Route  │ ← HTTP Layer (Request/Response handling)
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│    Service      │ ← Business Logic Layer
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│   Repository    │ ← Data Access Layer
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│   Database      │ ← PostgreSQL/Supabase
└─────────────────┘
```

### 3.2 Layer Responsibilities

**Route Layer** (`backend/src/routes/`):
- HTTP request/response handling
- Request validation (using Zod schemas)
- Authentication/authorization checks
- Error handling and status codes
- Response formatting
- **NO business logic**
- **NO database queries**

**Service Layer** (`backend/src/services/`):
- Business logic implementation
- Orchestration of multiple repositories
- Transaction management
- External API integration (Anthropic, Unsplash)
- Caching strategies
- **NO HTTP concerns**
- **NO direct database queries**

**Repository Layer** (`backend/src/repositories/`):
- Database query execution
- Data mapping (DB ↔ Domain objects)
- Query optimization
- Bulk operations
- Connection pooling
- **NO business logic**
- **NO HTTP concerns**

### 3.3 Example Implementation

#### Route Layer

**File**: `backend/src/routes/species.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { validateParams, validateBody, validateQuery } from '../middleware/validate';
import { SpeciesService } from '../services/SpeciesService';
import { CreateSpeciesSchema, SpeciesIdSchema } from '../validation/species.schemas';
import { info, error as logError } from '../utils/logger';

const router = Router();
const speciesService = new SpeciesService();

/**
 * GET /api/species/:speciesId
 * Get species details by ID
 */
router.get(
  '/:speciesId',
  validateParams(SpeciesIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { speciesId } = req.params;

      info('GET species by ID', { speciesId, userId: req.user?.userId });

      const species = await speciesService.getSpeciesById(speciesId);

      if (!species) {
        res.status(404).json({ error: 'Species not found' });
        return;
      }

      res.status(200).json(species);
    } catch (error) {
      logError('Failed to get species', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/species
 * Create new species
 */
router.post(
  '/',
  validateBody(CreateSpeciesSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const speciesData = req.body;

      info('POST create species', {
        scientificName: speciesData.scientificName,
        userId: req.user?.userId
      });

      const speciesId = await speciesService.createSpecies(speciesData);

      res.status(201).json({
        id: speciesId,
        message: 'Species created successfully'
      });
    } catch (error) {
      logError('Failed to create species', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

#### Service Layer

**File**: `backend/src/services/SpeciesService.ts`

```typescript
import { SpeciesRepository, SpeciesData, SpeciesRow } from '../repositories/SpeciesRepository';
import { ImageRepository } from '../repositories/ImageRepository';
import { info, error as logError } from '../utils/logger';

/**
 * Species business logic service
 * Orchestrates species operations and related image data
 */
export class SpeciesService {
  private speciesRepo: SpeciesRepository;
  private imageRepo: ImageRepository;

  constructor(
    speciesRepo?: SpeciesRepository,
    imageRepo?: ImageRepository
  ) {
    this.speciesRepo = speciesRepo || new SpeciesRepository();
    this.imageRepo = imageRepo || new ImageRepository();
  }

  /**
   * Get species by ID with image statistics
   */
  async getSpeciesById(speciesId: string): Promise<SpeciesRow | null> {
    try {
      const species = await this.speciesRepo.getById(speciesId);

      if (!species) {
        return null;
      }

      // Business logic: Enhance with image count
      const imageCount = await this.imageRepo.getCountBySpecies(speciesId);

      return {
        ...species,
        imageCount
      };
    } catch (error) {
      logError('SpeciesService.getSpeciesById failed', error as Error);
      throw error;
    }
  }

  /**
   * Create new species with validation
   */
  async createSpecies(data: SpeciesData): Promise<string> {
    try {
      // Business logic: Check for duplicates
      const existing = await this.speciesRepo.getByScientificName(
        data.scientificName
      );

      if (existing) {
        throw new Error('Species with this scientific name already exists');
      }

      // Business logic: Normalize data
      const normalizedData = {
        ...data,
        scientificName: data.scientificName.trim(),
        conservationStatus: data.conservationStatus || 'LC'
      };

      const speciesId = await this.speciesRepo.create(normalizedData);

      info('Species created', { speciesId, scientificName: data.scientificName });

      return speciesId;
    } catch (error) {
      logError('SpeciesService.createSpecies failed', error as Error);
      throw error;
    }
  }

  /**
   * Get species list with filtering and pagination
   * Business logic: Apply search, filter, and pagination
   */
  async listSpecies(options: {
    search?: string;
    habitat?: string;
    page?: number;
    limit?: number;
  }): Promise<{ species: SpeciesRow[]; total: number }> {
    try {
      // Business logic: Apply filters and pagination
      const result = await this.speciesRepo.list(options);

      return result;
    } catch (error) {
      logError('SpeciesService.listSpecies failed', error as Error);
      throw error;
    }
  }

  /**
   * Delete species with cascade validation
   * Business logic: Ensure safe deletion
   */
  async deleteSpecies(speciesId: string): Promise<void> {
    try {
      // Business logic: Check for related images
      const imageCount = await this.imageRepo.getCountBySpecies(speciesId);

      if (imageCount > 0) {
        throw new Error(
          `Cannot delete species with ${imageCount} associated images. ` +
          `Delete images first.`
        );
      }

      await this.speciesRepo.delete(speciesId);

      info('Species deleted', { speciesId });
    } catch (error) {
      logError('SpeciesService.deleteSpecies failed', error as Error);
      throw error;
    }
  }
}
```

#### Repository Layer

**File**: `backend/src/repositories/SpeciesRepository.ts`

```typescript
import { Pool } from 'pg';
import { pool as defaultPool } from '../database/connection';
import { info, error as logError } from '../utils/logger';

export interface SpeciesData {
  scientificName: string;
  englishName: string;
  spanishName: string;
  order?: string;
  family?: string;
  habitats?: string[];
  sizeCategory?: string;
  primaryColors?: string[];
  conservationStatus?: string;
}

export interface SpeciesRow extends SpeciesData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Species data access layer
 * Handles all species database operations
 */
export class SpeciesRepository {
  private pool: Pool;

  constructor(pool: Pool = defaultPool) {
    this.pool = pool;
  }

  /**
   * Create new species
   */
  async create(data: SpeciesData): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO species (
          scientific_name, english_name, spanish_name,
          order_name, family_name, habitats, size_category,
          primary_colors, conservation_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          data.scientificName,
          data.englishName,
          data.spanishName,
          data.order || null,
          data.family || null,
          data.habitats || null,
          data.sizeCategory || null,
          data.primaryColors || null,
          data.conservationStatus || 'LC'
        ]
      );

      const speciesId = result.rows[0].id;
      info('Species inserted', { speciesId });
      return speciesId;
    } catch (error) {
      logError('Failed to create species', error as Error);
      throw error;
    }
  }

  /**
   * Get species by ID
   */
  async getById(speciesId: string): Promise<SpeciesRow | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        WHERE id = $1`,
        [speciesId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logError('Failed to get species by ID', error as Error);
      throw error;
    }
  }

  /**
   * Get species by scientific name
   */
  async getByScientificName(scientificName: string): Promise<SpeciesRow | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        WHERE scientific_name = $1`,
        [scientificName]
      );

      return result.rows[0] || null;
    } catch (error) {
      logError('Failed to get species by scientific name', error as Error);
      throw error;
    }
  }

  /**
   * List species with filtering and pagination
   */
  async list(options: {
    search?: string;
    habitat?: string;
    page?: number;
    limit?: number;
  }): Promise<{ species: SpeciesRow[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];
      let paramCount = 0;

      if (options.search) {
        paramCount++;
        whereClause += ` AND (
          scientific_name ILIKE $${paramCount} OR
          english_name ILIKE $${paramCount} OR
          spanish_name ILIKE $${paramCount}
        )`;
        params.push(`%${options.search}%`);
      }

      if (options.habitat) {
        paramCount++;
        whereClause += ` AND $${paramCount} = ANY(habitats)`;
        params.push(options.habitat);
      }

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM species ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataResult = await this.pool.query(
        `SELECT
          id,
          scientific_name as "scientificName",
          english_name as "englishName",
          spanish_name as "spanishName",
          order_name as "order",
          family_name as "family",
          habitats,
          size_category as "sizeCategory",
          primary_colors as "primaryColors",
          conservation_status as "conservationStatus",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM species
        ${whereClause}
        ORDER BY english_name
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      return {
        species: dataResult.rows,
        total
      };
    } catch (error) {
      logError('Failed to list species', error as Error);
      throw error;
    }
  }

  /**
   * Update species
   */
  async update(speciesId: string, data: Partial<SpeciesData>): Promise<void> {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramCount = 0;

      // Build dynamic UPDATE query
      if (data.scientificName !== undefined) {
        paramCount++;
        updates.push(`scientific_name = $${paramCount}`);
        params.push(data.scientificName);
      }

      if (data.englishName !== undefined) {
        paramCount++;
        updates.push(`english_name = $${paramCount}`);
        params.push(data.englishName);
      }

      if (data.spanishName !== undefined) {
        paramCount++;
        updates.push(`spanish_name = $${paramCount}`);
        params.push(data.spanishName);
      }

      // Add other fields...

      updates.push('updated_at = CURRENT_TIMESTAMP');

      paramCount++;
      params.push(speciesId);

      await this.pool.query(
        `UPDATE species SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );

      info('Species updated', { speciesId });
    } catch (error) {
      logError('Failed to update species', error as Error);
      throw error;
    }
  }

  /**
   * Delete species
   */
  async delete(speciesId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM species WHERE id = $1', [speciesId]);
      info('Species deleted', { speciesId });
    } catch (error) {
      logError('Failed to delete species', error as Error);
      throw error;
    }
  }
}
```

### 3.4 Pattern Benefits

1. **Separation of Concerns**: Each layer has clear responsibilities
2. **Testability**: Each layer can be tested independently with mocks
3. **Maintainability**: Changes in one layer don't cascade to others
4. **Reusability**: Services can be reused across multiple routes
5. **Type Safety**: Interfaces enforce contracts between layers
6. **Scalability**: Easy to add new features or modify existing ones

### 3.5 Current vs. Target Architecture

**Current (Anti-Pattern)**:
```typescript
// Route doing everything (from adminImageManagement.ts)
router.post('/collect', async (req, res) => {
  // Direct database query
  const client = await pool.connect();

  // Business logic mixed in
  const species = await client.query('SELECT * FROM species...');

  // External API call
  const unsplashResponse = await axios.get('...');

  // More business logic
  for (const photo of photos) {
    // Image processing
    // Database insertion
    // Error handling
  }

  res.json(result);
});
```

**Target (Clean Architecture)**:
```typescript
// Route (HTTP handling only)
router.post('/collect',
  validateBody(CollectImagesSchema),
  async (req, res) => {
    try {
      const result = await imageCollectionService.collectImages(req.body);
      res.status(202).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Service (Business logic)
class ImageCollectionService {
  async collectImages(params) {
    const species = await speciesRepository.getByIds(params.speciesIds);
    const photos = await unsplashService.search(species);
    const processed = await imageProcessingService.process(photos);
    await imageRepository.bulkInsert(processed);
    return { jobId, status: 'processing' };
  }
}

// Repository (Data access)
class ImageRepository {
  async bulkInsert(images) {
    return this.pool.query('INSERT INTO images...', images);
  }
}
```

---

## 4. Shared Types Extraction

### 4.1 Type Consolidation Strategy

**Problem**: 141 `: any` violations across 88 files indicates:
1. Missing type definitions
2. Duplicated type definitions
3. Unclear type contracts

**Solution**: Centralized type system

### 4.2 Shared Types Directory Structure

```
backend/src/types/
├── domain/
│   ├── species.types.ts             (Species-related types)
│   ├── image.types.ts               (Image-related types)
│   ├── annotation.types.ts          (Annotation-related types)
│   ├── exercise.types.ts            (Exercise-related types)
│   └── user.types.ts                (User-related types)
├── api/
│   ├── request.types.ts             (Request payload types)
│   ├── response.types.ts            (Response payload types)
│   └── pagination.types.ts          (Pagination types)
├── database/
│   ├── models.types.ts              (Database model types)
│   └── queries.types.ts             (Query parameter types)
├── services/
│   ├── ai.types.ts                  (AI service types)
│   ├── pattern.types.ts             (Pattern learning types)
│   └── storage.types.ts             (Storage interface types)
└── index.ts                         (Barrel export)

shared/types/                         (Shared between frontend/backend)
├── species.types.ts
├── annotation.types.ts
├── exercise.types.ts
└── index.ts
```

### 4.3 Example Type Definitions

#### Domain Types

**File**: `backend/src/types/domain/species.types.ts`

```typescript
/**
 * Species domain types
 * Shared across services, repositories, and routes
 */

/**
 * Conservation status codes (IUCN Red List)
 */
export type ConservationStatus =
  | 'LC'  // Least Concern
  | 'NT'  // Near Threatened
  | 'VU'  // Vulnerable
  | 'EN'  // Endangered
  | 'CR'  // Critically Endangered
  | 'EW'  // Extinct in the Wild
  | 'EX'; // Extinct

/**
 * Bird size categories
 */
export type SizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'very-large';

/**
 * Habitat types
 */
export type Habitat =
  | 'forest'
  | 'wetland'
  | 'grassland'
  | 'desert'
  | 'urban'
  | 'coastal'
  | 'mountain'
  | 'tundra';

/**
 * Species data (for creation/updates)
 */
export interface SpeciesData {
  scientificName: string;
  englishName: string;
  spanishName: string;
  order?: string;
  family?: string;
  habitats?: Habitat[];
  sizeCategory?: SizeCategory;
  primaryColors?: string[];
  conservationStatus?: ConservationStatus;
}

/**
 * Complete species record (from database)
 */
export interface Species extends SpeciesData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Species with additional computed fields
 */
export interface SpeciesWithStats extends Species {
  imageCount: number;
  annotationCount: number;
  exerciseCount: number;
}

/**
 * Species list filters
 */
export interface SpeciesFilters {
  search?: string;
  habitat?: Habitat;
  sizeCategory?: SizeCategory;
  conservationStatus?: ConservationStatus;
  hasImages?: boolean;
}

/**
 * Species sorting options
 */
export type SpeciesSortField =
  | 'scientificName'
  | 'englishName'
  | 'spanishName'
  | 'createdAt'
  | 'imageCount';

export interface SpeciesSortOptions {
  field: SpeciesSortField;
  direction: 'asc' | 'desc';
}
```

#### API Types

**File**: `backend/src/types/api/pagination.types.ts`

```typescript
/**
 * Pagination types for API responses
 */

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Create pagination metadata from params and total
 */
export function createPaginationMeta(
  params: Required<PaginationParams>,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1
  };
}
```

#### Database Types

**File**: `backend/src/types/database/models.types.ts`

```typescript
/**
 * Database model types
 * Mirror database schema structure
 */

/**
 * Base fields for all database models
 */
export interface BaseModel {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Species database model
 */
export interface SpeciesModel extends BaseModel {
  scientific_name: string;
  english_name: string;
  spanish_name: string;
  order_name: string | null;
  family_name: string | null;
  habitats: string[] | null;
  size_category: string | null;
  primary_colors: string[] | null;
  conservation_status: string;
}

/**
 * Image database model
 */
export interface ImageModel extends BaseModel {
  species_id: string;
  unsplash_id: string | null;
  url: string;
  width: number;
  height: number;
  description: string | null;
  photographer: string | null;
  photographer_username: string | null;
  thumbnail_url: string | null;
  quality_score: number | null;
}

/**
 * Annotation database model
 */
export interface AnnotationModel extends BaseModel {
  image_id: string;
  spanish_term: string;
  english_term: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficulty_level: number;
  pronunciation: string | null;
  confidence: number | null;
}
```

### 4.4 Type Migration Strategy

**Phase 1: Audit & Identify (2-3 days)**
1. Run `grep -r ": any" backend/src` to identify all violations
2. Categorize violations by domain (species, images, annotations, etc.)
3. Identify duplicate type definitions across files
4. Create type consolidation plan

**Phase 2: Create Shared Types (1-2 days)**
1. Create type files in `backend/src/types/` structure
2. Define domain types first (highest usage)
3. Create API types (request/response contracts)
4. Define database model types
5. Create utility types (pagination, filtering, sorting)

**Phase 3: Migrate Files (1-2 weeks)**
1. Start with core files (services, repositories)
2. Update imports to use shared types
3. Replace `: any` with specific types
4. Run TypeScript compiler to catch errors
5. Fix type mismatches incrementally

**Phase 4: Enable Strict Type Checking (1 day)**
1. Update `tsconfig.json` to enable `strict: true`
2. Enable `noImplicitAny: true`
3. Enable `strictNullChecks: true`
4. Fix remaining type errors
5. Update CI/CD to enforce strict checks

**Phase 5: Documentation (1 day)**
1. Document type system in `docs/architecture/TYPE_SYSTEM.md`
2. Create type usage guidelines
3. Add JSDoc comments to complex types
4. Update developer onboarding guide

---

## 5. Architecture Decision Records (ADRs)

### ADR-001: Dependency Injection for External Services

**Status**: APPROVED
**Date**: 2025-12-04
**Decision Makers**: System Architect, Lead Developer

**Context**:
PatternLearner.ts has module-level Supabase client instantiation preventing test mocking and violating dependency injection principles.

**Decision**:
Implement constructor-based dependency injection with interface abstraction:
1. Define `IPatternStorage` interface
2. Create `SupabasePatternStorage` production implementation
3. Create `InMemoryPatternStorage` test implementation
4. Refactor PatternLearner to accept injected storage

**Consequences**:
- ✅ **Positive**: Testable without external dependencies
- ✅ **Positive**: Flexible storage backend (can swap implementations)
- ✅ **Positive**: Clear separation of concerns
- ⚠️ **Neutral**: Requires updating tests and instantiation code
- ❌ **Negative**: Slightly more code (interfaces + implementations)

**Alternatives Considered**:
1. **Mock Supabase at module level**: Rejected (fragile, couples tests to implementation)
2. **Use environment variables to switch storage**: Rejected (runtime dependency, not compile-time safe)
3. **Extract storage to separate service**: Accepted (clean architecture principle)

### ADR-002: Route-Service-Repository Pattern

**Status**: APPROVED
**Date**: 2025-12-04
**Decision Makers**: System Architect, Backend Team

**Context**:
Current codebase has god files mixing HTTP handling, business logic, and database queries in single files (e.g., adminImageManagement.ts at 2863 lines).

**Decision**:
Adopt three-layer architecture:
- **Route Layer**: HTTP request/response handling only
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Database access and queries

**Consequences**:
- ✅ **Positive**: Clear separation of concerns
- ✅ **Positive**: Improved testability (mock at layer boundaries)
- ✅ **Positive**: Better maintainability (smaller, focused files)
- ✅ **Positive**: Reusable services across multiple routes
- ⚠️ **Neutral**: Requires refactoring existing code
- ⚠️ **Neutral**: More files (but smaller and focused)
- ❌ **Negative**: Learning curve for team members

**Alternatives Considered**:
1. **Keep current structure**: Rejected (unmaintainable at current scale)
2. **Four-layer architecture (add DTO layer)**: Rejected (over-engineering for current needs)
3. **Domain-driven design (DDD)**: Deferred (too complex for current team size)

### ADR-003: Centralized Type System

**Status**: APPROVED
**Date**: 2025-12-04
**Decision Makers**: System Architect, Frontend Lead, Backend Lead

**Context**:
141 `: any` type violations across 88 files indicate missing type safety and duplicated type definitions.

**Decision**:
Create centralized type system:
- `backend/src/types/` for backend-specific types
- `shared/types/` for types shared between frontend and backend
- Organize by domain (species, images, annotations)
- Enable strict TypeScript checking

**Consequences**:
- ✅ **Positive**: Type safety prevents runtime errors
- ✅ **Positive**: Better IDE autocomplete and refactoring
- ✅ **Positive**: Self-documenting code
- ✅ **Positive**: Catches errors at compile-time
- ⚠️ **Neutral**: Requires updating all files with `: any`
- ⚠️ **Neutral**: Initial time investment for type definitions
- ❌ **Negative**: Stricter compiler may reveal existing bugs

**Alternatives Considered**:
1. **Leave types as-is**: Rejected (technical debt will compound)
2. **Use JSDoc types**: Rejected (not enforced by TypeScript)
3. **Gradual typing**: Accepted (phased migration plan)

---

## 6. Implementation Roadmap

### Week 1: Foundation & Critical Fixes
**Days 1-2**: PatternLearner DI Refactoring
- Create `IPatternStorage` interface
- Implement `SupabasePatternStorage` and `InMemoryPatternStorage`
- Refactor `PatternLearner.ts` with DI
- Update tests
- Deploy and verify

**Days 3-5**: Shared Type System Setup
- Create type directory structure
- Define core domain types (species, images, annotations)
- Define API types (requests, responses, pagination)
- Define database model types
- Update core services to use shared types

### Week 2: God File Decomposition (Part 1)
**Days 1-3**: adminImageManagement.ts Decomposition
- Create service layer files (ImageCollectionService, ImageProcessingService, etc.)
- Create route layer files (separate route files by domain)
- Extract validation schemas
- Extract type definitions
- Update tests
- Integration testing

**Days 4-5**: aiAnnotations.ts Decomposition
- Create service layer files (AnnotationGenerationService, AnnotationReviewService)
- Create route layer files
- Extract validation schemas
- Update tests

### Week 3: God File Decomposition (Part 2)
**Days 1-2**: PatternLearner.ts Decomposition
- Extract pattern algorithms to separate file
- Extract statistics tracking to separate file
- Extract quality metrics to separate file
- Create pattern-learning module structure

**Days 3-5**: ImageManagementPage.tsx Decomposition
- Extract panel components (Gallery, Collection, Annotation, Statistics)
- Extract custom hooks (useImageCollection, useImageAnnotation)
- Update imports
- Component testing

### Week 4: Route-Service-Repository Implementation
**Days 1-2**: Create Repository Layer
- Extract database queries from services
- Create repository classes for each domain
- Implement repository pattern with constructor injection
- Unit test repositories

**Days 3-4**: Create Service Layer
- Extract business logic from routes
- Create service classes using repositories
- Implement service orchestration
- Unit test services with mocked repositories

**Day 5**: Update Route Layer
- Simplify routes to HTTP handling only
- Use services for business logic
- Integration testing
- API contract verification

### Week 5: Type System Migration & Cleanup
**Days 1-3**: Type Migration
- Replace `: any` with specific types (prioritize by file)
- Update function signatures
- Add type guards where needed
- Fix TypeScript errors

**Days 4-5**: Enable Strict Type Checking
- Enable `strict: true` in `tsconfig.json`
- Fix remaining type errors
- Update CI/CD to enforce strict checking
- Documentation updates

---

## 7. Success Metrics

### Quantitative Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Files > 500 lines | 43 | 0 | 5 weeks |
| Largest file size | 2863 lines | <350 lines | 5 weeks |
| `: any` violations | 141 | 0 | 5 weeks |
| Test coverage (backend) | ~65% | >85% | 5 weeks |
| TypeScript strict mode | ❌ | ✅ | 5 weeks |
| Module-level side effects | ~12 | 0 | 1 week |

### Qualitative Metrics

- **Code Maintainability**: Easier to understand and modify files
- **Test Reliability**: No more test failures due to untestable code
- **Developer Velocity**: Faster feature development with clear patterns
- **Onboarding Time**: New developers can understand architecture quickly
- **Bug Rate**: Fewer runtime errors due to type safety

### Monitoring & Validation

**Weekly Reviews**:
- Track progress against roadmap
- Review code quality metrics
- Identify blockers
- Adjust plan as needed

**Quality Gates**:
- All tests pass before merging
- No new `: any` violations
- ESLint passes with no errors
- TypeScript compiles with strict mode

---

## 8. Risk Assessment & Mitigation

### High Risk

**Risk**: Breaking changes during refactoring
- **Mitigation**: Comprehensive test suite before refactoring
- **Mitigation**: Feature flags for gradual rollout
- **Mitigation**: Maintain backward compatibility during transition

**Risk**: Test failures due to DI changes
- **Mitigation**: Update tests incrementally
- **Mitigation**: Keep old code until new code is verified
- **Mitigation**: Parallel implementation (old + new) during transition

### Medium Risk

**Risk**: Team resistance to new patterns
- **Mitigation**: Provide training and documentation
- **Mitigation**: Demonstrate benefits with early wins
- **Mitigation**: Pair programming for knowledge transfer

**Risk**: Performance degradation from additional layers
- **Mitigation**: Benchmark before and after
- **Mitigation**: Optimize hot paths if needed
- **Mitigation**: Use connection pooling and caching

### Low Risk

**Risk**: Increased code volume (more files)
- **Mitigation**: Clear file organization
- **Mitigation**: Use barrel exports for easier imports
- **Mitigation**: Document module structure

---

## 9. Conclusion

This architecture remediation specification provides a comprehensive plan to address critical technical debt in the AVES project:

1. **Dependency Injection** pattern fixes test failures and improves testability
2. **God File Decomposition** improves maintainability and team collaboration
3. **Route-Service-Repository** pattern provides clear separation of concerns
4. **Shared Type System** eliminates `: any` violations and improves type safety

The phased implementation roadmap ensures minimal disruption while delivering continuous value. Success metrics provide clear targets, and risk mitigation strategies ensure smooth execution.

**Recommendation**: APPROVED FOR IMMEDIATE IMPLEMENTATION

---

## Appendix A: File Organization Reference

### Backend Directory Structure (Post-Remediation)

```
backend/src/
├── routes/                          # HTTP layer
│   ├── admin/                       # Admin routes
│   │   ├── imageManagement.routes.ts
│   │   ├── imageCollection.routes.ts
│   │   ├── imageAnnotation.routes.ts
│   │   └── index.ts
│   ├── ai/                          # AI routes
│   │   ├── annotations.routes.ts
│   │   ├── generation.routes.ts
│   │   └── index.ts
│   └── species.routes.ts
├── services/                        # Business logic layer
│   ├── admin/
│   │   ├── ImageCollectionService.ts
│   │   ├── ImageProcessingService.ts
│   │   ├── JobTrackingService.ts
│   │   └── index.ts
│   ├── ai/
│   │   ├── AnnotationGenerationService.ts
│   │   ├── AnnotationReviewService.ts
│   │   └── index.ts
│   ├── pattern-learning/
│   │   ├── PatternLearner.ts
│   │   ├── PatternAlgorithms.ts
│   │   ├── PatternStatistics.ts
│   │   └── index.ts
│   └── SpeciesService.ts
├── repositories/                    # Data access layer
│   ├── SpeciesRepository.ts
│   ├── ImageRepository.ts
│   ├── AnnotationRepository.ts
│   └── index.ts
├── types/                           # Type definitions
│   ├── domain/
│   │   ├── species.types.ts
│   │   ├── image.types.ts
│   │   └── annotation.types.ts
│   ├── api/
│   │   ├── request.types.ts
│   │   ├── response.types.ts
│   │   └── pagination.types.ts
│   ├── database/
│   │   └── models.types.ts
│   └── index.ts
└── validation/                      # Zod schemas
    ├── species.schemas.ts
    ├── image.schemas.ts
    └── annotation.schemas.ts
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-04
**Next Review**: After Week 2 implementation
