# Statistics Dashboard Audit Report
**Date:** November 28, 2025
**Component:** Image Management Statistics Dashboard
**Scope:** Backend API, Frontend Display, Integration

---

## Executive Summary

The Statistics dashboard displays image and annotation metrics with API quota information. The audit reveals **excellent architecture** with a highly optimized combined endpoint, but identifies **several critical integration issues** that prevent the dashboard from displaying correctly.

**Overall Assessment:** ⚠️ **Requires Fixes** (3 critical issues, 2 warnings)

---

## 1. API Endpoint Integration

### ✅ Working Features

#### 1.1 Combined Dashboard Endpoint (Optimized)
**Location:** `backend/src/routes/adminImageManagement.ts:2249-2383`

```typescript
router.get('/admin/dashboard', ...)
```

**Strengths:**
- **Performance Optimization:** Single API call replaces 4 separate requests (stats, quota, jobs, flags)
- **Parallel Queries:** All database queries run in parallel using `Promise.all()`
- **Smart Response Structure:** Returns comprehensive data in single payload
- **Error Handling:** Graceful degradation with try-catch and `.catch()` on quota fetch

**Response Structure:**
```typescript
{
  data: {
    stats: {
      totalImages: number,
      pendingAnnotation: number,
      annotated: number,
      failed: number,
      bySpecies: Record<string, number>,
      uniqueSpecies: number,
      annotations: { total, pending, approved, rejected, edited, avgConfidence },
      jobs: { active, completed, failed }
    },
    quota: {
      unsplash: { remaining, limit, resetTime },
      anthropic: { remaining, limit, resetTime }
    },
    jobs: CollectionJob[],  // Last 20 jobs
    hasActiveJobs: boolean
  }
}
```

#### 1.2 Legacy Stats Endpoint (Still Available)
**Location:** `backend/src/routes/adminImageManagement.ts:1284-1386`

```typescript
router.get('/admin/images/stats', ...)
```

**Issues:**
- ⚠️ Returns data wrapped in `{ data: { ... } }` format
- Returns same structure as dashboard's `stats` object
- Frontend hook doesn't use this endpoint anymore (uses dashboard)

---

## 2. Frontend-Backend Alignment

### ❌ Critical Issue #1: Data Structure Mismatch

**Problem:** Backend returns `data.stats.bySpecies` with **English names as keys**, but frontend expects **species IDs**.

**Backend Implementation:** `adminImageManagement.ts:2298-2300`
```typescript
SELECT
  s.english_name as species,  // ❌ Using English name
  COUNT(i.id) as count
FROM images i
JOIN species s ON i.species_id = s.id
GROUP BY s.english_name
```

**Frontend Expectation:** `ImageManagementPage.tsx:629-631`
```typescript
const sp = species.find((s) => s.id === speciesId);  // ❌ Looking up by ID
return (
  <div key={speciesId} className="bg-gray-50 rounded-lg p-3 text-center">
    <div className="text-xl font-bold text-gray-800">{count}</div>
    <div className="text-xs text-gray-600 truncate" title={sp?.englishName || speciesId}>
      {sp?.englishName || speciesId}  // ❌ Will always show speciesId as fallback
    </div>
  </div>
);
```

**Impact:**
- Statistics tab shows species names but frontend tries to look them up by ID
- Result: All species cards show the English name as the "ID" without matching species records
- Tooltip and display will show raw English name strings instead of proper species info

**Fix Required:**
```typescript
// Option 1: Change backend to return species_id
SELECT
  s.id as species,  // ✅ Return species ID
  COUNT(i.id) as count

// Option 2: Change frontend to use English name as key
const sp = species.find((s) => s.englishName === speciesName);
```

---

### ❌ Critical Issue #2: Missing Quota Endpoint

**Problem:** Frontend `useQuotaStatus()` hook references non-existent endpoint.

**Frontend Code:** `useImageManagement.ts:121`
```typescript
const response = await axios.get<{ data: QuotaStatus }>('/api/admin/quota/status');
```

**Backend Reality:**
- ❌ No `/api/admin/quota/status` endpoint exists
- ✅ Quota data is ONLY available from `/api/admin/dashboard`
- ✅ Also embedded in `/api/admin/images/sources` endpoint

**Impact:**
- Hook fails silently and returns default values
- When individual quota hook is used (not in current page), it will always show defaults

**Fix Required:**
```typescript
// Remove standalone quota hook or point it to dashboard
export const useQuotaStatus = () => {
  return useQuery({
    queryKey: imageManagementKeys.quota(),
    queryFn: async (): Promise<QuotaStatus> => {
      const response = await axios.get<DashboardResponse>('/api/admin/dashboard');
      return response.data.data.quota;
    },
    // ...
  });
};
```

---

### ❌ Critical Issue #3: Missing Jobs Endpoint

**Problem:** Frontend `useCollectionJobs()` hook references non-existent endpoint.

**Frontend Code:** `useImageManagement.ts:141`
```typescript
const response = await axios.get<{ data: CollectionJob[] }>('/api/admin/jobs');
```

**Backend Reality:**
- ❌ No `/api/admin/jobs` endpoint exists
- ✅ Jobs list available at `/api/admin/images/jobs` (line 1673)
- ✅ Also available from `/api/admin/dashboard`

**Impact:**
- Smart polling feature doesn't work when `hasActiveJobs` is true
- Job list always empty in polling scenario

**Fix Required:**
```typescript
const response = await axios.get<{ jobs: CollectionJob[], count: number }>(
  '/api/admin/images/jobs'  // ✅ Correct endpoint
);
return response.data.jobs;
```

---

### ❌ Critical Issue #4: Missing Pending Images Endpoint

**Problem:** Frontend `usePendingImages()` hook references non-existent endpoint.

**Frontend Code:** `useImageManagement.ts:160-162`
```typescript
const response = await axios.get<{ data: { id: string; ... }[] }>(
  '/api/admin/images/pending'
);
```

**Backend Reality:**
- ❌ No `/api/admin/images/pending` endpoint exists
- ⚠️ Must derive from `/api/admin/images` with `annotationStatus=unannotated` filter

**Impact:**
- Annotation tab's image selector doesn't load pending images
- Users cannot select specific images for annotation

**Fix Required:**
```typescript
// Option 1: Add new endpoint to backend
router.get('/admin/images/pending', async (req, res) => {
  const result = await pool.query(`
    SELECT i.id, i.species_id as "speciesId", i.url, i.created_at as "createdAt"
    FROM images i
    WHERE NOT EXISTS (
      SELECT 1 FROM ai_annotation_items ai WHERE ai.image_id::text = i.id::text
    )
    ORDER BY i.created_at DESC
    LIMIT 100
  `);
  res.json({ data: result.rows });
});

// Option 2: Use existing gallery endpoint with filters
const params = new URLSearchParams({
  annotationStatus: 'unannotated',
  pageSize: '100',
  page: '1'
});
const response = await axios.get(`/api/admin/images?${params.toString()}`);
return response.data.data.images;
```

---

## 3. Display Components

### ✅ Statistics Tab Implementation

**Location:** `ImageManagementPage.tsx:534-649`

**Working Features:**
1. **Stats Cards Display** (lines 536-561)
   - Total Images
   - Pending Annotation
   - Annotated
   - Failed
   - All properly mapped to `stats?.totalImages`, `stats?.pendingAnnotation`, etc.

2. **Quota Progress Bars** (lines 563-619)
   - Unsplash API quota with color-coded alerts
   - Anthropic API quota with color-coded alerts
   - Proper percentage calculations
   - Reset time display

3. **Species Distribution** (lines 621-647)
   - Grid layout for species counts
   - Sorted by count (descending)
   - Limited to top 12 species
   - Truncated names with tooltips

### ⚠️ Warning #1: Quota Display Logic

**Issue:** Quota bars calculate percentage incorrectly for "remaining" values.

**Current Code:** `ImageManagementPage.tsx:569-571`
```typescript
<ProgressBar
  value={quota?.unsplash.remaining || 0}  // ❌ Remaining shown as progress
  max={quota?.unsplash.limit || 50}
  // ...
/>
```

**Problem:** Progress bar fills based on remaining requests, which is counterintuitive. A full bar means many requests left, but visually suggests "complete" or "consumed."

**Better Approach:**
```typescript
<ProgressBar
  value={quota.unsplash.limit - quota.unsplash.remaining}  // ✅ Show consumed
  max={quota.unsplash.limit}
  label={`${quota.unsplash.remaining} remaining`}
/>
```

---

## 4. Real-Time Updates

### ✅ Smart Polling Implementation

**Location:** `useImageManagement.ts:327-328`

```typescript
const hasActiveJobs = dashboardData?.hasActiveJobs || false;
const { data: liveJobs } = useCollectionJobs(hasActiveJobs);
```

**Design:**
- When `hasActiveJobs` is true, polls `/api/admin/jobs` every 3 seconds (line 151)
- When false, no polling occurs (saves API calls)
- Falls back to dashboard jobs when not polling

**Issues:**
- ❌ Polling endpoint `/api/admin/jobs` doesn't exist (see Critical Issue #3)
- ⚠️ Should poll `/api/admin/images/jobs` instead

---

## 5. Loading States

### ✅ Loading Implementation

**Skeleton Loading:** `ImageManagementPage.tsx:205-207`
```typescript
{isLoading && <DashboardSkeleton activeTab={activeTab} />}
```

**Initial Load:**
- Combined auth loading + data loading (line 154)
- Single dashboard query handles all data
- Clean loading states with spinner

**Good Practices:**
- Placeholder data in gallery queries (line 246)
- Keeps showing old data while refetching
- No jarring UI jumps

---

## 6. Error Handling

### ✅ Graceful Degradation

**Hook Level:** `useImageManagement.ts:61-86`
```typescript
try {
  const response = await axios.get<DashboardResponse>('/api/admin/dashboard');
  return response.data.data;
} catch (err) {
  logError('Error fetching dashboard:', err);
  return {
    stats: { totalImages: 0, pendingAnnotation: 0, annotated: 0, failed: 0, bySpecies: {} },
    quota: { unsplash: { remaining: 50, limit: 50, resetTime: null }, ... },
    jobs: [],
    hasActiveJobs: false,
  };
}
```

**Strengths:**
- Never throws errors to UI
- Always returns valid data structure
- Logs errors for debugging
- Shows default "safe" values on failure

---

## Summary of Issues

### Critical Issues (Must Fix)

1. **bySpecies Key Mismatch** - Backend returns English names, frontend expects species IDs
   - **File:** `backend/src/routes/adminImageManagement.ts:2298`
   - **Fix:** Change `s.english_name` to `s.id` in query

2. **Missing Quota Endpoint** - `/api/admin/quota/status` doesn't exist
   - **File:** `frontend/src/components/admin/image-management/useImageManagement.ts:121`
   - **Fix:** Change to use `/api/admin/dashboard` or remove hook

3. **Missing Jobs Endpoint** - `/api/admin/jobs` doesn't exist
   - **File:** `frontend/src/components/admin/image-management/useImageManagement.ts:141`
   - **Fix:** Change to `/api/admin/images/jobs`

4. **Missing Pending Images Endpoint** - `/api/admin/images/pending` doesn't exist
   - **File:** `frontend/src/components/admin/image-management/useImageManagement.ts:160`
   - **Fix:** Add endpoint to backend or use `/api/admin/images` with filters

### Warnings (Should Fix)

1. **Quota Bar Display Logic** - Shows "remaining" as progress, which is counterintuitive
   - **File:** `frontend/src/pages/admin/ImageManagementPage.tsx:569`
   - **Fix:** Show consumed instead of remaining

2. **Legacy Stats Endpoint Unused** - `/api/admin/images/stats` still exists but not used
   - **File:** `backend/src/routes/adminImageManagement.ts:1284`
   - **Fix:** Consider deprecating if dashboard endpoint is preferred

---

## Recommended Fixes (Priority Order)

### High Priority (Breaks Functionality)

1. **Fix bySpecies keys** - Change backend query to return species IDs
   ```sql
   SELECT s.id as species, COUNT(i.id) as count
   ```

2. **Fix jobs polling** - Update frontend to use correct endpoint
   ```typescript
   const response = await axios.get('/api/admin/images/jobs');
   ```

3. **Add pending images endpoint** or update frontend to use gallery with filters

### Medium Priority (Improves UX)

4. **Fix quota bar visualization** - Show consumed instead of remaining

5. **Clean up unused endpoints** - Remove or document legacy endpoints

### Low Priority (Nice to Have)

6. **Add API documentation** - Document all endpoints with request/response examples

---

## Positive Findings

1. **Excellent Performance Optimization**
   - Single combined dashboard endpoint reduces API calls by 75%
   - Parallel database queries for fast response times
   - Smart polling only when needed

2. **Robust Error Handling**
   - All hooks gracefully degrade on errors
   - Default values prevent UI crashes
   - Comprehensive logging for debugging

3. **Clean Architecture**
   - Separation of concerns (hooks, components, types)
   - Reusable UI components (Card, ProgressBar, Badge)
   - Type-safe with TypeScript throughout

4. **User Experience**
   - Loading states with skeletons
   - Real-time updates with smart polling
   - Responsive grid layouts
   - Accessible color-coded status indicators

---

## Testing Checklist

- [ ] Statistics tab loads without errors
- [ ] Stats cards show correct totals
- [ ] Species distribution displays with proper names
- [ ] Quota bars show accurate percentages
- [ ] Quota color coding works (red < 10/100, yellow < 25/500, green otherwise)
- [ ] Active jobs trigger auto-refresh
- [ ] Polling stops when no active jobs
- [ ] Error states show gracefully
- [ ] Loading skeletons display correctly
- [ ] Reset times format properly

---

## Conclusion

The Statistics dashboard has **excellent architectural design** with performance optimizations and proper separation of concerns. However, **4 critical endpoint mismatches** prevent it from functioning correctly. Once these are fixed, the dashboard will provide a comprehensive, real-time view of image and annotation statistics with excellent UX.

**Estimated Fix Time:** 2-3 hours for all critical issues
