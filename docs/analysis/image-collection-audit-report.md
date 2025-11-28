# Image Collection Feature Audit Report
**Date:** November 28, 2025
**Feature:** Image Collection for Aves Bird Learning Platform
**Scope:** Unsplash integration, species selection, and collection job management

---

## Executive Summary

The Image Collection feature has a **solid foundation** with proper async job processing, species multi-select, and real-time progress tracking. However, there are **critical misalignments** between frontend and backend that would prevent the feature from working correctly in production.

**Overall Status:** ⚠️ **Requires Fixes** - Core functionality present but type mismatches need resolution

---

## 1. API Endpoint Integration

### ✅ Working Endpoints

#### POST `/api/admin/images/collect`
**Location:** `backend/src/routes/adminImageManagement.ts:504-674`

**Implementation:**
- ✅ Properly validates request body with Zod schema (lines 270-273)
- ✅ Supports species filtering by name matching (lines 524-541)
- ✅ Implements async job processing with in-memory tracking (lines 544-657)
- ✅ Returns job ID immediately with 202 status (lines 660-667)
- ✅ Rate limiting configured (30 requests/hour, line 508)

**Request Format:**
```typescript
{
  species?: string[],  // Array of species names (English/Spanish/Scientific)
  count?: number       // Images per species (1-10, default: 2)
}
```

**Response Format:**
```typescript
{
  jobId: string,
  status: "processing",
  message: string,
  totalSpecies: number,
  imagesPerSpecies: number,
  estimatedImages: number
}
```

#### GET `/api/admin/images/stats`
**Location:** `backend/src/routes/adminImageManagement.ts:1284-1385`

**Implementation:**
- ✅ Returns wrapped response format: `{ data: { totalImages, pendingAnnotation, annotated, failed, bySpecies, ... } }`
- ✅ Aggregates image counts, annotation coverage, and job statistics
- ✅ Handles NULL values with COALESCE (line 1550)

#### GET `/api/admin/dashboard`
**Location:** `backend/src/routes/adminImageManagement.ts:2249-2383`

**Implementation:**
- ✅ **Performance optimized** - Combines 4 API calls into 1 (lines 2260-2294)
- ✅ Parallel query execution with Promise.all
- ✅ Returns stats, quota, jobs, and hasActiveJobs flag in single response
- ✅ Smart polling support via hasActiveJobs flag

---

## 2. Critical Issues Found

### ❌ **ISSUE #1: Species ID vs Name Mismatch**
**Severity:** HIGH
**Impact:** Collection will fail - species filtering won't work

**Backend Expectation:**
```typescript
// backend/src/routes/adminImageManagement.ts:270-273
const CollectImagesSchema = z.object({
  species: z.array(z.string()).optional(),  // Expects species NAMES
  count: z.number().int().min(1).max(10).optional().default(2)
});

// Lines 524-532: Filters by matching names
speciesToCollect = DEFAULT_BIRD_SPECIES.filter(s =>
  species.some((name: string) =>
    s.englishName.toLowerCase().includes(name.toLowerCase()) ||
    s.spanishName.toLowerCase().includes(name.toLowerCase()) ||
    s.scientificName.toLowerCase().includes(name.toLowerCase())
  )
);
```

**Frontend Sends:**
```typescript
// frontend/src/components/admin/image-management/types.ts:44-47
export interface CollectionRequest {
  speciesIds: string[],  // Sends UUIDs instead of names!
  imagesPerSpecies: number;
}

// frontend/src/pages/admin/ImageManagementPage.tsx:68-72
await collectMutation.mutateAsync({
  speciesIds: selectedSpecies,  // Array of UUIDs
  imagesPerSpecies,
});
```

**File References:**
- Backend: `backend/src/routes/adminImageManagement.ts:270-273` (schema definition)
- Backend: `backend/src/routes/adminImageManagement.ts:524-532` (name matching logic)
- Frontend: `frontend/src/components/admin/image-management/types.ts:44-47` (type definition)
- Frontend: `frontend/src/pages/admin/ImageManagementPage.tsx:68-72` (API call)

**Recommended Fix:**
```typescript
// Option A: Update backend to accept UUIDs (preferred)
const CollectImagesSchema = z.object({
  speciesIds: z.array(z.string().uuid()).optional(),
  count: z.number().int().min(1).max(10).optional().default(2)
});

// Update backend logic to filter by UUID
if (speciesIds && speciesIds.length > 0) {
  // Get species from database by IDs
  const speciesResult = await pool.query(
    'SELECT * FROM species WHERE id = ANY($1)',
    [speciesIds]
  );
  speciesToCollect = speciesResult.rows;
}

// Option B: Update frontend to send names (less flexible)
const selectedSpeciesNames = selectedSpecies.map(id => {
  const sp = species.find(s => s.id === id);
  return sp?.englishName || '';
}).filter(Boolean);

await collectMutation.mutateAsync({
  species: selectedSpeciesNames,  // Send names instead of IDs
  imagesPerSpecies,
});
```

---

### ❌ **ISSUE #2: Job Response Format Mismatch**
**Severity:** MEDIUM
**Impact:** Frontend won't parse job status correctly

**Backend Returns:**
```typescript
// backend/src/routes/adminImageManagement.ts:660-667
res.status(202).json({
  jobId,
  status: 'processing',
  message: 'Image collection started...',
  totalSpecies: speciesToCollect.length,
  imagesPerSpecies: count,
  estimatedImages: totalItems
});
```

**Frontend Expects:**
```typescript
// frontend/src/components/admin/image-management/types.ts:26-42
export interface CollectionJob {
  id: string,           // Backend sends "jobId"
  type: 'collection' | 'annotation',  // Backend doesn't send this
  status: 'pending' | 'running' | 'completed' | 'failed',
  speciesIds: string[],  // Backend doesn't send this
  imagesPerSpecies?: number,  // Backend sends this
  progress: number,      // Backend doesn't send this initially
  total: number,         // Backend doesn't send this initially
  startedAt: string,     // Backend doesn't send this initially
  completedAt?: string,
  error?: string,
  results?: {...}
}
```

**File References:**
- Backend: `backend/src/routes/adminImageManagement.ts:660-667` (response format)
- Frontend: `frontend/src/components/admin/image-management/types.ts:26-42` (type definition)

**Recommended Fix:**
```typescript
// Backend: backend/src/routes/adminImageManagement.ts:660-667
res.status(202).json({
  id: jobId,  // Change "jobId" to "id"
  type: 'collect',  // Add job type
  status: 'processing',
  speciesIds: speciesToCollect.map(s => s.id || s.scientificName),  // Add speciesIds
  imagesPerSpecies: count,
  progress: 0,  // Add initial progress
  total: totalItems,  // Add total
  startedAt: new Date().toISOString(),  // Add timestamp
  message: 'Image collection started...',
});
```

---

### ⚠️ **ISSUE #3: Missing API Endpoints**
**Severity:** LOW
**Impact:** Some frontend features won't work but aren't critical

**Frontend calls these endpoints that don't exist:**

1. **`GET /api/admin/quota/status`**
   - Called by: `frontend/src/components/admin/image-management/useImageManagement.ts:121`
   - Purpose: Get Unsplash/Anthropic quota status
   - **Workaround:** Dashboard endpoint (`/api/admin/dashboard`) provides quota data
   - **Status:** Non-blocking - frontend has fallback logic (lines 123-133)

2. **`GET /api/admin/jobs`**
   - Called by: `frontend/src/components/admin/image-management/useImageManagement.ts:141`
   - Purpose: List all jobs
   - **Backend has:** `/api/admin/images/jobs` (line 1673)
   - **Fix:** Update frontend endpoint path or add alias route

3. **`GET /api/admin/images/pending`**
   - Called by: `frontend/src/components/admin/image-management/useImageManagement.ts:161`
   - Purpose: Get images pending annotation
   - **Status:** Missing endpoint
   - **Recommended:** Add query param to existing gallery endpoint

**File References:**
- Frontend: `frontend/src/components/admin/image-management/useImageManagement.ts:121` (quota endpoint)
- Frontend: `frontend/src/components/admin/image-management/useImageManagement.ts:141` (jobs endpoint)
- Frontend: `frontend/src/components/admin/image-management/useImageManagement.ts:161` (pending endpoint)
- Backend: `backend/src/routes/adminImageManagement.ts:1673` (existing jobs endpoint)

---

## 3. User Flow Analysis

### ✅ Species Multi-Select Component
**Location:** `frontend/src/components/admin/image-management/SpeciesMultiSelect.tsx`

**Working Features:**
- ✅ Search filtering by English/Spanish/Scientific names (lines 25-30)
- ✅ Multi-selection with checkboxes (lines 132-136)
- ✅ Select All / Clear All buttons (lines 103-123)
- ✅ Visual feedback with badges (lines 71-88)
- ✅ Dropdown toggle with keyboard accessibility (lines 50-54)
- ✅ Disabled state handling (lines 20, 52, 229)

**UI/UX:**
- ✅ Shows up to 5 selected species as badges, "+N more" for overflow
- ✅ Click outside to close (standard dropdown behavior)
- ✅ Loading state support during collection

**No issues found** - Well-implemented component

---

### ⚠️ Collection Job Creation Flow

**User Journey:**
1. User selects species via `SpeciesMultiSelect` → **WORKS**
2. User sets images per species (1-10) → **WORKS**
3. User clicks "Collect Images" button → **WORKS**
4. Frontend sends POST to `/api/admin/images/collect` with `speciesIds: string[]` → **FAILS**
   - Backend expects `species: string[]` (names, not IDs)
   - Backend will either reject request or fail to match species

**Current Behavior:**
```typescript
// Frontend sends (ImageManagementPage.tsx:68-72)
{
  speciesIds: ["uuid-1", "uuid-2"],  // UUIDs
  imagesPerSpecies: 2
}

// Backend expects (adminImageManagement.ts:270-273)
{
  species: ["Northern Cardinal", "Blue Jay"],  // Names
  count: 2
}
```

**Result:** Collection will fail to find matching species

---

### ✅ Unsplash API Integration
**Location:** `backend/src/routes/adminImageManagement.ts:345-370`

**Implementation:**
- ✅ Proper API key validation (lines 514-521)
- ✅ Search with landscape orientation filter (line 355)
- ✅ Content filter set to "high" quality (line 356)
- ✅ Rate limiting between requests (lines 618-623)
- ✅ Error handling with empty array fallback (lines 366-369)

**Configuration:**
```typescript
// backend/src/routes/adminImageManagement.ts:50-51
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API_URL = 'https://api.unsplash.com';
```

**Default Species List:**
- ✅ 5 hardcoded bird species with metadata (lines 54-115)
- ✅ Includes scientific names, search terms, habitats, colors
- ✅ Proper family/order classification

**No issues found** - Properly implemented

---

## 4. Frontend-Backend Alignment

### Response Format Consistency

#### ✅ **Aligned:** Stats Endpoint
```typescript
// Backend (adminImageManagement.ts:1356-1379)
res.json({
  data: {
    totalImages: parseInt(...),
    pendingAnnotation: parseInt(...),
    annotated: parseInt(...),
    failed: failedJobs,
    bySpecies: {...}
  }
});

// Frontend (types.ts:5-11)
export interface ImageStats {
  totalImages: number;
  pendingAnnotation: number;
  annotated: number;
  failed: number;
  bySpecies: Record<string, number>;
}
```
**Status:** Perfect match ✅

#### ❌ **Misaligned:** Collection Request/Response
See **ISSUE #1** and **ISSUE #2** above.

#### ⚠️ **Partial:** Dashboard Response
```typescript
// Backend returns (adminImageManagement.ts:2346-2376)
{
  data: {
    stats: {...},
    quota: {...},
    jobs: [...]  // Array of job objects
    hasActiveJobs: boolean
  }
}

// Frontend expects (useImageManagement.ts:29-36)
interface DashboardResponse {
  data: {
    stats: ImageStats;
    quota: QuotaStatus;
    jobs: CollectionJob[];  // Expects CollectionJob type
    hasActiveJobs: boolean;
  };
}
```

**Issue:** Job objects in dashboard don't match `CollectionJob` interface
- Backend jobs have: `{ id, type, status, progress, total, startedAt, completedAt, error, results }`
- Frontend expects additional fields: `speciesIds`, `imagesPerSpecies`

**File References:**
- Backend: `backend/src/routes/adminImageManagement.ts:2305-2344` (job formatting)
- Frontend: `frontend/src/components/admin/image-management/useImageManagement.ts:29-36` (type definition)

---

## 5. Error Handling

### ✅ Backend Error Handling
**Location:** `backend/src/routes/adminImageManagement.ts`

**Strengths:**
- ✅ Async job error tracking (lines 593-597, 625-633)
- ✅ Per-item error capture in job progress (lines 608-615)
- ✅ Validation errors with clear messages (lines 516-521, 534-540)
- ✅ Try-catch blocks around all operations (lines 669-672, 1098-1100)
- ✅ Logging with structured context (lines 566-571, 640-645)

**Example:**
```typescript
// backend/src/routes/adminImageManagement.ts:593-597
if (photos.length === 0) {
  job.errors.push({
    item: speciesData.englishName,
    error: 'No images found on Unsplash',
    timestamp: new Date().toISOString()
  });
  job.failedItems++;
}
```

### ✅ Frontend Error Handling
**Location:** `frontend/src/components/admin/image-management/useImageManagement.ts`

**Strengths:**
- ✅ Try-catch in all query functions (lines 63-82, 97-109)
- ✅ Fallback values on error (lines 67-81)
- ✅ Error logging via logger utility (lines 65, 101, 194)
- ✅ Toast notifications for user feedback (ImageManagementPage.tsx:76, 96)
- ✅ Mutation error handlers (lines 193-196, 214-217)

**Example:**
```typescript
// frontend/src/pages/admin/ImageManagementPage.tsx:62-78
const handleCollectImages = async () => {
  if (selectedSpecies.length === 0) {
    addToast('error', 'Please select at least one species');
    return;
  }

  try {
    await collectMutation.mutateAsync({...});
    addToast('success', `Started collecting images...`);
    setSelectedSpecies([]);
  } catch {
    addToast('error', 'Failed to start image collection');
  }
};
```

**No critical issues** - Error handling is comprehensive

---

## 6. Loading States

### ✅ Frontend Loading States
**Location:** `frontend/src/pages/admin/ImageManagementPage.tsx`

**Implementation:**
- ✅ Auth loading check (lines 125-134)
- ✅ Data loading check (line 154)
- ✅ Skeleton loading component (line 206)
- ✅ Button loading states (lines 265-267)
- ✅ Disabled states during mutations (lines 229, 243, 266)

**Example:**
```typescript
// ImageManagementPage.tsx:205-207
{isLoading && (
  <DashboardSkeleton activeTab={activeTab} />
)}
```

**No issues** - Loading states properly managed

---

## 7. Performance & Optimization

### ✅ Excellent Optimizations

#### Combined Dashboard Endpoint
**Location:** `backend/src/routes/adminImageManagement.ts:2249-2383`

**Benefits:**
- ✅ Reduces 4 API calls to 1 (stats, quota, jobs, metadata)
- ✅ Parallel query execution with `Promise.all` (lines 2260-2294)
- ✅ Single database connection for all queries
- ✅ **Performance gain:** ~75% reduction in HTTP overhead

#### Smart Polling
**Location:** `frontend/src/components/admin/image-management/useImageManagement.ts:136-153`

**Benefits:**
- ✅ Only polls when `hasActiveJobs: true` (line 151)
- ✅ 3-second polling interval (line 151)
- ✅ Stops polling when jobs complete
- ✅ Prevents unnecessary API calls

#### Prefetching
**Location:** `frontend/src/components/admin/image-management/useImageManagement.ts:250-271`

**Benefits:**
- ✅ Prefetches next gallery page for smooth pagination (line 250)
- ✅ Uses React Query's prefetch strategy
- ✅ Conditional prefetching (only when next page exists)

#### Caching
**Location:** `frontend/src/components/admin/image-management/useImageManagement.ts`

**Configuration:**
- ✅ `staleTime: 30s` for stats/dashboard (line 84)
- ✅ `gcTime: 5 minutes` for all queries (line 85)
- ✅ `placeholderData` to keep old data while fetching (line 246)

**No issues** - Excellent performance practices

---

## 8. Security Considerations

### ✅ Properly Secured

**Authentication:**
- ✅ Admin-only routes with `optionalSupabaseAuth` + `optionalSupabaseAdmin` middleware (lines 507-508)
- ✅ User ID tracking in job metadata (line 560)
- ✅ Rate limiting (30 req/hour) on mutations (line 508)

**Input Validation:**
- ✅ Zod schema validation on all POST endpoints (lines 270-300)
- ✅ UUID validation for imageIds (line 285)
- ✅ Min/max constraints on numeric inputs (line 272)

**SQL Injection Prevention:**
- ✅ Parameterized queries throughout (e.g., line 407-429)
- ✅ No string concatenation in SQL

**API Keys:**
- ✅ Environment variables for secrets (line 50)
- ✅ Configuration check before API calls (lines 514-521)

**No security issues** found

---

## 9. Database Schema Compatibility

### ✅ Schema Alignment

**Images Table:**
```sql
-- Referenced in adminImageManagement.ts:441-459
INSERT INTO images (
  species_id, unsplash_id, url, width, height,
  description, photographer, photographer_username
)
```

**Species Table:**
```sql
-- Referenced in adminImageManagement.ts:407-429
INSERT INTO species (
  scientific_name, english_name, spanish_name,
  order_name, family_name, habitats, size_category,
  primary_colors, conservation_status
)
```

**Annotations Tables:**
```sql
-- Referenced in adminImageManagement.ts:1011-1037
INSERT INTO ai_annotations (...)
INSERT INTO ai_annotation_items (...)
```

**No schema issues** - All queries compatible

---

## 10. Summary of Findings

### Critical Issues (Must Fix)
1. ❌ **Species ID vs Name Mismatch** (Issue #1)
   - Backend expects species names, frontend sends UUIDs
   - Blocks entire collection feature
   - Fix: Update backend schema and logic to accept UUIDs

2. ❌ **Job Response Format Mismatch** (Issue #2)
   - Backend response doesn't match `CollectionJob` interface
   - Frontend can't parse job status correctly
   - Fix: Standardize response format

### Medium Priority Issues
3. ⚠️ **Missing API Endpoints** (Issue #3)
   - `/api/admin/quota/status` - Has workaround via dashboard
   - `/api/admin/jobs` - Should be `/api/admin/images/jobs`
   - `/api/admin/images/pending` - Missing endpoint
   - Fix: Add endpoints or update frontend paths

### Working Features ✅
- ✅ Species multi-select component (fully functional)
- ✅ Unsplash API integration (properly implemented)
- ✅ Async job processing (solid architecture)
- ✅ Error handling (comprehensive)
- ✅ Loading states (well managed)
- ✅ Performance optimizations (excellent)
- ✅ Security (properly secured)
- ✅ Database queries (compatible with schema)

---

## 11. Recommended Action Plan

### Phase 1: Critical Fixes (Blocking)
**Priority:** HIGH
**Estimated Effort:** 2-3 hours

1. **Fix species filtering**
   - Update `CollectImagesSchema` to accept `speciesIds: string[]` (UUIDs)
   - Query database for species by IDs instead of filtering hardcoded list
   - Update collection logic to work with database species

   ```typescript
   // backend/src/routes/adminImageManagement.ts:270
   const CollectImagesSchema = z.object({
     speciesIds: z.array(z.string().uuid()).optional(),
     count: z.number().int().min(1).max(10).optional().default(2)
   });
   ```

2. **Standardize job response format**
   - Update collection endpoint to return `CollectionJob` format
   - Ensure all job-related endpoints use consistent format
   - Add `type`, `progress`, `total`, `startedAt` to initial response

   ```typescript
   // backend/src/routes/adminImageManagement.ts:660
   res.status(202).json({
     id: jobId,
     type: 'collect',
     status: 'processing',
     speciesIds: selectedSpecies,
     imagesPerSpecies: count,
     progress: 0,
     total: totalItems,
     startedAt: new Date().toISOString(),
     message: 'Image collection started'
   });
   ```

### Phase 2: Medium Priority (Non-blocking but recommended)
**Priority:** MEDIUM
**Estimated Effort:** 1-2 hours

3. **Add missing endpoints**
   - Add `/api/admin/images/pending` endpoint for unannotated images
   - Create route alias: `/api/admin/jobs` → `/api/admin/images/jobs`
   - Or update frontend to use `/api/admin/images/jobs`

4. **Update quota endpoint**
   - Add `/api/admin/quota/status` endpoint
   - Or update frontend to use dashboard endpoint exclusively

### Phase 3: Testing & Validation
**Priority:** HIGH
**Estimated Effort:** 2 hours

5. **Integration testing**
   - Test full collection flow with real species selection
   - Verify job status updates correctly
   - Test error scenarios (invalid species, API failures)
   - Verify real-time polling updates UI

6. **End-to-end testing**
   - Create test script for collection workflow
   - Verify images are saved to database
   - Check Unsplash rate limiting
   - Validate job cleanup (24-hour retention)

---

## 12. Test Scenarios

### Scenario 1: Happy Path Collection
**Steps:**
1. Select 2 species from multi-select dropdown
2. Set images per species to 3
3. Click "Collect Images" button
4. Verify job appears in "Active Jobs" panel
5. Poll job status endpoint every 3 seconds
6. Verify progress bar updates
7. Verify job completes successfully
8. Check database for 6 new images (2 species × 3 images)

**Expected Result:**
- ✅ Job created with status "processing"
- ✅ Progress updates from 0 to 6
- ✅ Job status changes to "completed"
- ✅ Images appear in gallery tab

**Current Result:**
- ❌ Request fails - species not found (due to UUID vs name mismatch)

---

### Scenario 2: Error Handling - No Species Selected
**Steps:**
1. Click "Collect Images" without selecting species
2. Verify error toast appears

**Expected Result:**
- ✅ Toast: "Please select at least one species"
- ✅ Button disabled when no species selected

**Current Result:**
- ✅ Works correctly (frontend validation)

---

### Scenario 3: Unsplash Rate Limit
**Steps:**
1. Exhaust Unsplash API quota (50 requests)
2. Attempt collection
3. Verify quota warning appears

**Expected Result:**
- ✅ Warning shown when quota < 10 remaining
- ✅ Request still sent (backend handles gracefully)
- ✅ Job tracks failures for each species

**Current Result:**
- ✅ Should work (quota check implemented)

---

## 13. Code Quality Assessment

### Strengths
- ✅ **Clean separation of concerns** (hooks, components, types)
- ✅ **Comprehensive error handling** (try-catch, fallbacks, logging)
- ✅ **Performance optimizations** (combined endpoints, smart polling, prefetching)
- ✅ **Type safety** (TypeScript interfaces throughout)
- ✅ **Accessibility** (ARIA labels, keyboard navigation)
- ✅ **Code documentation** (concept comments, why/how explanations)

### Areas for Improvement
- ⚠️ **Type consistency** between frontend and backend
- ⚠️ **API contract documentation** (OpenAPI/Swagger would help)
- ⚠️ **Integration tests** (no evidence of E2E tests)
- ⚠️ **Hardcoded species list** (should come from database)

---

## 14. Dependencies & Configuration

### Backend Dependencies
```typescript
// backend/src/routes/adminImageManagement.ts
import axios from 'axios';           // ✅ Unsplash API calls
import rateLimit from 'express-rate-limit';  // ✅ Rate limiting
import multer from 'multer';         // ✅ File uploads (future)
import sharp from 'sharp';           // ✅ Image processing
```

**Status:** All properly configured

### Frontend Dependencies
```typescript
// frontend/src/components/admin/image-management/useImageManagement.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

**Status:** React Query properly configured with caching

### Environment Variables Required
```bash
UNSPLASH_ACCESS_KEY=your_access_key_here  # Required for collection
ANTHROPIC_API_KEY=your_api_key_here       # Required for annotation
```

**Status:** ✅ Properly validated before use

---

## 15. Conclusion

The Image Collection feature has a **solid architectural foundation** with:
- ✅ Proper async job processing
- ✅ Excellent performance optimizations
- ✅ Comprehensive error handling
- ✅ Well-designed UI components

However, **critical type mismatches** between frontend and backend prevent the feature from working:
1. ❌ Frontend sends species UUIDs, backend expects species names
2. ❌ Job response format doesn't match frontend expectations
3. ⚠️ Missing API endpoints for some frontend features

**Recommendation:** Complete Phase 1 fixes (2-3 hours) before deployment. The fixes are straightforward and well-defined. After fixes, this feature will be production-ready.

---

## Appendix: File Locations

### Backend Files
- **Main Route:** `backend/src/routes/adminImageManagement.ts`
- **Types:** `backend/src/types/image.types.ts`
- **Database:** `backend/src/database/connection.ts`
- **Vision Service:** `backend/src/services/VisionAIService.ts`

### Frontend Files
- **Page Component:** `frontend/src/pages/admin/ImageManagementPage.tsx`
- **Species Selector:** `frontend/src/components/admin/image-management/SpeciesMultiSelect.tsx`
- **API Hook:** `frontend/src/components/admin/image-management/useImageManagement.ts`
- **Types:** `frontend/src/components/admin/image-management/types.ts`
- **Index:** `frontend/src/components/admin/image-management/index.ts`

### Database Tables
- `species` - Bird species metadata
- `images` - Image records with Unsplash attribution
- `ai_annotations` - Annotation job records
- `ai_annotation_items` - Individual annotation items

---

**End of Report**
