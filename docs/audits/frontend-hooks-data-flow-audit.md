# Frontend React Hooks and Data Flow Audit
**Date:** 2025-12-14
**Auditor:** Code Analyzer Agent
**Scope:** AVES Frontend React Hooks, Pages, and Data Integration

---

## Executive Summary

This audit identifies **28 critical issues** across hooks and pages that may cause silent failures, empty data returns, missing error handling, and broken user flows. The most severe issues are in authentication-dependent hooks (SRS, AI exercises) and integration between Learn → Practice → Species pages.

**Severity Breakdown:**
- 🔴 **Critical (10):** Silent failures, data loss, broken features
- 🟠 **High (12):** Missing error handling, poor fallback behavior
- 🟡 **Medium (6):** UX issues, incomplete integration

---

## Critical Issues (🔴)

### 1. **useSpacedRepetition.ts** - Silent Authentication Failures

**Location:** `frontend/src/hooks/useSpacedRepetition.ts:58-83`

**Issue:** The hook silently returns empty data when user is not authenticated, with no error indication to the UI.

```typescript
queryFn: async (): Promise<TermProgress[]> => {
  if (!userId) return [];  // 🔴 SILENT FAILURE

  try {
    const response = await fetch(`${API_URL}/api/srs/due?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${await user?.getIdToken?.() || ''}`,  // 🔴 Optional chaining might fail
      },
    });

    if (!response.ok) throw new Error('Failed to fetch due terms');
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    logError('Error fetching due terms', err instanceof Error ? err : new Error(String(err)));
    return [];  // 🔴 SILENT FAILURE - no error surface to UI
  }
},
enabled: !!userId,  // Query won't run without userId, but component doesn't know why
```

**Impact:** Practice page shows "0 due terms" instead of "Please log in" - users don't know why SRS isn't working.

**Recommended Fix:**
```typescript
// Add error state tracking
const { data, isLoading, error } = useQuery({
  queryKey: srsQueryKeys.dueTerms(userId || ''),
  queryFn: async (): Promise<TermProgress[]> => {
    if (!userId) {
      throw new Error('Authentication required for spaced repetition');
    }
    // ... rest of implementation
  },
  enabled: !!userId,
  retry: false, // Don't retry auth failures
});

// Component should check: isLoading, error, !userId states separately
```

---

### 2. **useAIExercise.ts** - Backend Availability Not Checked

**Location:** `frontend/src/hooks/useAIExercise.ts:153-160`

**Issue:** `useAIExerciseAvailability` always returns `isAvailable: true` when `aiExerciseService.isAvailable()` returns true, but this check is based on **environment variable presence**, not actual backend connectivity.

```typescript
export const useAIExerciseAvailability = () => {
  return {
    isAvailable: aiExerciseService.isAvailable(),  // 🔴 Only checks env var, not actual API
    reason: aiExerciseService.isAvailable()
      ? 'Backend API connected'  // 🔴 FALSE - not actually connected
      : 'Running in static mode (GitHub Pages)',
  };
};
```

**Impact:** UI shows "AI exercises available" but all generation calls fail silently with network errors.

**Recommended Fix:**
```typescript
// Add actual connectivity check
export const useAIExerciseHealth = () => {
  return useQuery({
    queryKey: ['ai-exercise-health'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/exercises/health`);
        return response.ok;
      } catch {
        return false;
      }
    },
    staleTime: 60 * 1000, // Check every minute
    retry: false,
  });
};
```

---

### 3. **useAnnotationExercises.ts** - User State Dependency Not Handled

**Location:** `frontend/src/hooks/useAnnotationExercises.ts:46-67`

**Issue:** Returns empty exercises when `user?.id` is undefined, but doesn't expose authentication requirement to consuming components.

```typescript
queryFn: async () => {
  if (!user?.id) {
    return { exercises: [], total: 0, source: 'empty' as const };  // 🔴 Silent failure
  }

  const response = await axios.get(`${API_URL}/api/annotation-exercises/learn`, {
    params: {
      userId: user.id,
      limit
    }
  });

  return response.data;
},
enabled: !!user?.id,  // 🔴 Component doesn't know WHY query is disabled
```

**Impact:** Learn page shows "no exercises" when user isn't logged in, no prompt to authenticate.

**Recommended Fix:**
```typescript
// Expose authentication state
export function useLearnExercises(limit: number = 10) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user?.id;

  const query = useQuery<ExerciseResponse>({
    queryKey: ['annotation-exercises', 'learn', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Authentication required');
      }
      // ... rest
    },
    enabled: isAuthenticated,
  });

  return {
    ...query,
    isAuthenticated, // 🟢 Components can check this
    requiresAuth: !isAuthenticated && !query.data,
  };
}
```

---

### 4. **useExercise.ts** - No Network Error Recovery

**Location:** `frontend/src/hooks/useExercise.ts:17-25, 49-62`

**Issue:** All API calls fail silently with only console logging. No retry mechanism, no error state exposed.

```typescript
const startSession = useCallback(async () => {
  try {
    await axios.post(`${API_BASE_URL}/exercises/session/start`, {
      sessionId: sessionProgress.sessionId
    });
  } catch (error) {
    logError('Failed to start exercise session:', error instanceof Error ? error : new Error(String(error)));
    // 🔴 NO ERROR STATE SET - component doesn't know session failed to start
  }
}, [sessionProgress.sessionId]);

const recordResult = useCallback(async (
  exercise: Exercise,
  userAnswer: any,
  isCorrect: boolean,
  timeTaken: number
) => {
  // ... local state update happens BEFORE API call

  try {
    await axios.post(`${API_BASE_URL}/exercises/result`, {
      // ... payload
    });
  } catch (error) {
    logError('Failed to record exercise result:', error instanceof Error ? error : new Error(String(error)));
    // 🔴 Result already recorded locally, but API failed - data inconsistency
  }

  return result;
}, [sessionProgress.sessionId]);
```

**Impact:**
- Session might not start on backend, but user continues practicing
- Results saved locally but lost on backend → progress tracking broken

**Recommended Fix:**
```typescript
const [sessionError, setSessionError] = useState<Error | null>(null);

const startSession = useCallback(async () => {
  setSessionError(null);
  try {
    await axios.post(`${API_BASE_URL}/exercises/session/start`, {
      sessionId: sessionProgress.sessionId
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setSessionError(err);
    logError('Failed to start exercise session:', err);
    throw err; // 🟢 Let component handle it
  }
}, [sessionProgress.sessionId]);

// Return error state
return {
  sessionProgress,
  sessionError,
  startSession,
  // ...
};
```

---

### 5. **useLearnContent.ts** - Data Transformation Returns Wrong Type

**Location:** `frontend/src/hooks/useLearnContent.ts:155-175`

**Issue:** `useLearnContentByImage` returns wrong data structure than documented - returns array of objects instead of grouped map.

```typescript
export const useLearnContentByImage = (filters?: ContentFilters) => {
  const { data: content = [], ...rest } = useLearnContent(filters);

  const contentByImage = content.reduce((acc, item) => {
    const key = item.imageUrl;
    if (!acc[key]) {
      acc[key] = {
        imageUrl: item.imageUrl,
        speciesName: item.speciesName,
        annotations: []
      };
    }
    acc[key].annotations.push(item);
    return acc;
  }, {} as Record<string, { imageUrl: string; speciesName?: string; annotations: LearningContent[] }>);

  return {
    ...rest,
    data: Object.values(contentByImage)  // 🔴 Returns array, not Record
  };
};
```

**Impact:** EnhancedLearnPage expects keyed object, gets array → type mismatch, potential runtime errors.

**Recommended Fix:**
```typescript
// Either rename hook to indicate it returns array:
export const useLearnContentGroupedByImage = (filters?: ContentFilters) => {
  // ... same implementation
  return {
    ...rest,
    data: Object.values(contentByImage),
    dataByUrl: contentByImage, // 🟢 Also provide keyed version
  };
};

// OR return both formats
return {
  ...rest,
  grouped: Object.values(contentByImage),
  byUrl: contentByImage,
};
```

---

### 6. **useProgress.ts** - Race Condition on Initialization

**Location:** `frontend/src/hooks/useProgress.ts:206-208`

**Issue:** `initializeProgress` is called in `useEffect` without dependency array - runs on EVERY render. Creates race conditions.

```typescript
// Initialize on mount
useEffect(() => {
  initializeProgress();  // 🔴 Missing deps - runs on every render
}, []);  // 🔴 ESLint warning: missing 'initializeProgress' in deps
```

**Impact:** Multiple concurrent API calls on rapid re-renders, potential data corruption, IndexedDB conflicts.

**Recommended Fix:**
```typescript
useEffect(() => {
  initializeProgress();
}, [initializeProgress]); // 🟢 Include dependency

// OR use useRef to track initialization
const initialized = useRef(false);
useEffect(() => {
  if (!initialized.current) {
    initialized.current = true;
    initializeProgress();
  }
}, []);
```

---

### 7. **LearnPage.tsx** - No Integration with useLearnContent Hook

**Location:** `frontend/src/pages/LearnPage.tsx:196-224`

**Issue:** LearnPage uses `useAnnotations()` directly (raw annotations) instead of `useLearnContent()` which provides curated learning materials. Completely bypasses the AI annotation pipeline.

```typescript
// Fetch approved annotations from production annotations table
const { data: approvedAnnotations = [], isLoading: loading } = useAnnotations();
const { progress, recordTermDiscovery } = useProgress();
const { isMobile } = useMobileDetect();

// Group annotations by image, with fallback to sample data
const annotationsByImage = useMemo(() => {
  const grouped = new Map<string, { imageUrl: string; annotations: Annotation[] }>();

  // Filter annotations that have imageUrl (from JOIN with images table)
  // All annotations from useAnnotations are already visible/approved
  const filteredAnnotations = approvedAnnotations.filter(a => a.imageUrl);
  // 🔴 NOT using AI-published learn content from useLearnContent hook!
```

**Impact:**
- AI annotation pipeline ignored
- Learning modules not available
- Difficulty progression not utilized
- EnhancedLearnPage and LearnPage show different content

**Recommended Fix:**
```typescript
// Use the dedicated learn content hook
const { data: learnContent = [], isLoading: loading } = useLearnContent({
  difficulty: selectedDifficulty,
  moduleId: selectedModule,
});

// Transform to annotation format for backward compatibility
const annotationsByImage = useMemo(() => {
  return learnContent.map(item => ({
    imageUrl: item.imageUrl,
    speciesName: item.speciesName,
    annotations: [{
      ...item,
      // Map LearningContent to Annotation format
    }],
  }));
}, [learnContent]);
```

---

### 8. **PracticePage.tsx** - No SRS Integration

**Location:** `frontend/src/pages/PracticePage.tsx:202-243`

**Issue:** PracticePage doesn't use `useSpacedRepetition` hook at all. All SRS infrastructure exists but is unused.

```typescript
// Hooks
const { data: apiAnnotations = [], isLoading: annotationsLoading } = useAnnotations();
const { isAvailable: isAIAvailable } = useAIExerciseAvailability();
const { mutate: prefetchExercises } = usePrefetchExercises();

// 🔴 useSpacedRepetition() never called!
// 🔴 useDueTerms() never called!
// 🔴 No integration with SRS system

// Use API annotations if available, otherwise fallback to samples
const annotations = apiAnnotations.length > 0 ? apiAnnotations : fallbackAnnotations;
```

**Impact:**
- Spaced repetition doesn't work
- Users practice random terms instead of due reviews
- Progress tracking disconnected from SRS

**Recommended Fix:**
```typescript
const {
  dueTerms,
  stats,
  isLoading: srsLoading,
  recordReview
} = useSpacedRepetition();

// Prioritize SRS due terms, fallback to general annotations
const practiceAnnotations = useMemo(() => {
  if (dueTerms.length > 0) {
    // Convert TermProgress to Annotation format
    return dueTerms.map(term => ({
      id: term.termId,
      spanishTerm: term.spanishTerm,
      englishTerm: term.englishTerm,
      imageUrl: term.imageUrl,
      // ...
    }));
  }
  return apiAnnotations.length > 0 ? apiAnnotations : fallbackAnnotations;
}, [dueTerms, apiAnnotations]);
```

---

### 9. **SpeciesDetailPage.tsx** - No Error Boundary for Learning Section

**Location:** `frontend/src/pages/SpeciesDetailPage.tsx:282-289`

**Issue:** SpeciesLearningSection component can throw errors, but no error boundary to catch them.

```typescript
{/* Learning Section - Full Width Below Main Card */}
{activeTab === 'learning' && id && (
  <div className="mt-8">
    <SpeciesLearningSection
      speciesId={id}
      speciesName={species.spanishName}
    />
    {/* 🔴 No error boundary - if this crashes, whole page crashes */}
  </div>
)}
```

**Impact:** Single annotation loading error crashes entire species detail page.

**Recommended Fix:**
```typescript
// Create error boundary wrapper
{activeTab === 'learning' && id && (
  <ErrorBoundary
    fallback={
      <div className="mt-8 p-8 bg-red-50 rounded-lg">
        <p className="text-red-800">Failed to load learning content</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    }
  >
    <SpeciesLearningSection
      speciesId={id}
      speciesName={species.spanishName}
    />
  </ErrorBoundary>
)}
```

---

### 10. **EnhancedLearnPage.tsx** - markDiscovered Call Swallows Errors

**Location:** `frontend/src/pages/EnhancedLearnPage.tsx:239-250`

**Issue:** Auth errors are caught and silently ignored, but discoveredTerms state is still updated → inconsistent state.

```typescript
const handleAnnotationClick = async (annotation: any) => {
  setSelectedAnnotation(annotation);
  setDiscoveredTerms(prev => new Set([...prev, annotation.id]));  // 🔴 Updated BEFORE API call

  // Track discovered term in SRS if user is authenticated
  try {
    await markDiscovered(annotation.id);
  } catch (err) {
    // Silently fail if not authenticated or network error
    console.log('Could not track discovered term:', err);  // 🔴 Only console.log
    // 🔴 discoveredTerms state already updated, but backend tracking failed
  }
};
```

**Impact:** Local progress shows term discovered, but SRS backend doesn't know → review schedule incorrect.

**Recommended Fix:**
```typescript
const handleAnnotationClick = async (annotation: any) => {
  setSelectedAnnotation(annotation);

  try {
    await markDiscovered(annotation.id);
    // Only update local state if backend succeeds
    setDiscoveredTerms(prev => new Set([...prev, annotation.id]));
  } catch (err) {
    // Show user-facing error for auth issues
    if (err.message.includes('auth')) {
      setError('Please log in to track progress');
    } else {
      // Allow offline mode for network errors
      setDiscoveredTerms(prev => new Set([...prev, annotation.id]));
      console.warn('Offline mode: discovered term not synced', err);
    }
  }
};
```

---

## High Priority Issues (🟠)

### 11. **useAnnotations.ts** - No Loading State Differentiation

**Location:** `frontend/src/hooks/useAnnotations.ts:12-27`

**Issue:** Hook returns `placeholderData: []` which makes it impossible to distinguish between "loading" and "no annotations".

```typescript
return useQuery({
  queryKey: queryKeys.annotations.list(imageId),
  queryFn: async () => {
    try {
      return await api.annotations.list(imageId);
    } catch (err) {
      logError('Error fetching annotations:', err instanceof Error ? err : new Error(String(err)));
      return [];  // 🟠 Error returns empty array
    }
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  placeholderData: [],  // 🟠 Loading shows empty array too
});
```

**Impact:** Components can't show "Loading..." vs "No annotations found" vs "Error loading".

**Recommended Fix:**
```typescript
return useQuery({
  queryKey: queryKeys.annotations.list(imageId),
  queryFn: async () => {
    // Don't catch errors - let React Query handle them
    return await api.annotations.list(imageId);
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  // Don't use placeholderData for data that might be empty
});

// Component usage:
const { data, isLoading, error } = useAnnotations();
if (isLoading) return <Loading />;
if (error) return <Error />;
if (!data || data.length === 0) return <Empty />;
```

---

### 12. **useSpecies.ts** - Client-Side Search Inefficiency

**Location:** `frontend/src/hooks/useSpecies.ts:47-65`

**Issue:** `useSpeciesSearch` loads ALL species then filters client-side. Inefficient for large datasets.

```typescript
export const useSpeciesSearch = (query: string, enabled = true) => {
  const { data: allSpecies = [] } = useSpecies();  // 🟠 Loads ALL species

  return useQuery({
    queryKey: queryKeys.species.search(query),
    queryFn: () => {
      const searchTerm = query.toLowerCase();
      return allSpecies.filter(s =>  // 🟠 Client-side filter
        s.spanishName?.toLowerCase().includes(searchTerm) ||
        s.englishName?.toLowerCase().includes(searchTerm) ||
        s.scientificName?.toLowerCase().includes(searchTerm)
      );
    },
    enabled: enabled && query.length > 2 && allSpecies.length > 0,
    staleTime: 1 * 60 * 1000,
  });
};
```

**Impact:** Performance degradation with 1000+ species. Network bandwidth wasted.

**Recommended Fix:**
```typescript
// Add server-side search endpoint
export const useSpeciesSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.species.search(query),
    queryFn: async () => {
      // Use backend search endpoint with SQL LIKE or full-text search
      return await api.species.search(query);
    },
    enabled: enabled && query.length > 2,
    staleTime: 1 * 60 * 1000,
  });
};
```

---

### 13. **useAIAnnotations.ts** - Optimistic Updates Don't Rollback Properly

**Location:** `frontend/src/hooks/useAIAnnotations.ts:163-217`

**Issue:** onMutate removes annotation from pending list optimistically, but onError doesn't properly restore it.

```typescript
onMutate: async (annotationId) => {
  await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });
  const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

  if (previousData) {
    const filtered = previousData.filter((a) => a.id !== annotationId);
    queryClient.setQueryData<AIAnnotation[]>(
      aiAnnotationKeys.pending(),
      filtered  // 🟠 Annotation removed optimistically
    );
  }

  return { previousData };
},
onError: (err, annotationId, context) => {
  if (context?.previousData) {
    queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
    // 🟠 Restores ALL previous data, but other mutations might have happened meanwhile
  }
  logError('Error approving annotation', err instanceof Error ? err : new Error(String(err)));
},
```

**Impact:** Race condition if multiple approvals/rejections happen quickly → UI state inconsistent.

**Recommended Fix:**
```typescript
onMutate: async (annotationId) => {
  await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

  // Snapshot current state
  const previousPending = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

  // Optimistically update
  if (previousPending) {
    queryClient.setQueryData<AIAnnotation[]>(
      aiAnnotationKeys.pending(),
      previousPending.filter((a) => a.id !== annotationId)
    );
  }

  return { previousPending, annotationId };
},
onError: (err, annotationId, context) => {
  if (context?.previousPending && context.annotationId) {
    // Find the removed annotation
    const removed = context.previousPending.find(a => a.id === context.annotationId);

    if (removed) {
      // Add it back
      queryClient.setQueryData<AIAnnotation[]>(
        aiAnnotationKeys.pending(),
        (current) => current ? [...current, removed] : [removed]
      );
    }
  }
},
```

---

### 14. **useAnnotationExercises.ts** - Automatic Prefetch Threshold Too Low

**Location:** `frontend/src/hooks/useAnnotationExercises.ts:165-169`

**Issue:** Prefetch triggers when total < 5, but prefetch generates 20 exercises → constant re-prefetching.

```typescript
const prefetchIfNeeded = useCallback(() => {
  if (activeQuery.data && activeQuery.data.total < 5 && !prefetchMutation.isPending) {
    prefetchMutation.mutate(20);  // 🟠 Generates 20, but threshold is 5
  }
}, [activeQuery.data, prefetchMutation]);
```

**Impact:** Unnecessary API calls, potential rate limiting, poor UX with constant loading states.

**Recommended Fix:**
```typescript
const prefetchIfNeeded = useCallback(() => {
  // Only prefetch if we're running low
  if (activeQuery.data && activeQuery.data.total < 3 && !prefetchMutation.isPending) {
    // Generate enough to reach target buffer (e.g., 15 total)
    const needed = Math.max(12, 15 - activeQuery.data.total);
    prefetchMutation.mutate(needed);
  }
}, [activeQuery.data, prefetchMutation]);
```

---

### 15. **useBatchGenerateExercises.ts** - Sequential Generation Ignores Partial Failures

**Location:** `frontend/src/hooks/useAIExercise.ts:208-263`

**Issue:** Loop continues on individual failures but doesn't track which ones failed.

```typescript
mutationFn: async ({ userId, count, types }) => {
  const exercises: AIExerciseResponse[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const exercise = await aiExerciseService.generateExercise(params);
      exercises.push(exercise);
    } catch (error) {
      logError(`Failed to generate exercise ${i + 1}/${count}`, error instanceof Error ? error : new Error(String(error)));
      // 🟠 Continue generating even if one fails
      // 🟠 No tracking of which failed
    }
  }

  return exercises;  // 🟠 Might return fewer than requested
},
```

**Impact:** User expects 10 exercises, gets 7 with no explanation. Silent partial failures.

**Recommended Fix:**
```typescript
mutationFn: async ({ userId, count, types }) => {
  const results = {
    exercises: [] as AIExerciseResponse[],
    failures: [] as { index: number; error: string }[],
  };

  for (let i = 0; i < count; i++) {
    try {
      const exercise = await aiExerciseService.generateExercise(params);
      results.exercises.push(exercise);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.failures.push({ index: i, error: errorMsg });
      logError(`Failed to generate exercise ${i + 1}/${count}`, error);
    }
  }

  return results;
},
onSuccess: (results, variables) => {
  if (results.failures.length > 0) {
    // Show warning to user
    toast.warning(`Generated ${results.exercises.length}/${variables.count} exercises. ${results.failures.length} failed.`);
  }
}
```

---

### 16-22. **Additional High Priority Issues** (Summarized)

16. **useProgress.ts:83-95** - `recordTermDiscovery` doesn't handle save failures → progress appears tracked but isn't persisted
17. **useExerciseQuery.ts** - Missing file, referenced in imports but doesn't exist → build errors
18. **useSupabaseAuth.ts:34-44** - Session restoration happens async but components render before complete → flash of unauthenticated state
19. **PracticePage.tsx:224-229** - Prefetch runs unconditionally every time `useAIExercises` changes → performance issue
20. **LearnPage.tsx:259-268** - `handleAnnotationDiscover` doesn't check if `recordTermDiscovery` succeeds before updating local state
21. **EnhancedLearnPage.tsx:186-189** - Error state captured but never displayed to user → silent failures
22. **SpeciesDetailPage.tsx:15-19** - `useSpeciesById` always enabled even when `id` is undefined → unnecessary API calls

---

## Medium Priority Issues (🟡)

### 23. **Missing Loading States in User Flows**

**Affected Pages:**
- `LearnPage.tsx:270-276` - Shows "Loading learning materials..." but no progress indicator
- `PracticePage.tsx:337-340` - Generic "Loading exercises..." without context
- `SpeciesDetailPage.tsx:22-31` - Loading shows emoji but no percentage or ETA

**Impact:** Poor UX, users don't know if app is frozen or loading.

---

### 24. **No Connection Between Learn and Practice Pages**

**Issue:** User discovers 10 terms in Learn tab, switches to Practice tab → doesn't see those terms prioritized.

**Files:**
- `LearnPage.tsx` tracks `discoveredTerms` locally only
- `PracticePage.tsx` doesn't query user progress
- `useProgress.ts` stores data but Practice page doesn't read it

**Recommended Fix:** Practice page should prioritize recently discovered terms from Learn tab.

---

### 25. **Species Detail Learning Section Not Linked to Progress**

**Location:** `SpeciesDetailPage.tsx:282-289`

**Issue:** Clicking "View Learning Content" shows terms, but clicking them doesn't:
- Track discovery in progress system
- Mark as learned in SRS
- Link back to Practice for that species

**Impact:** Learning is isolated per-page, no holistic progress tracking.

---

### 26. **Fallback Data Inconsistency**

**Issue:** Multiple pages use different fallback data:
- `LearnPage.tsx:16-187` - 4 bird images with 10 annotations
- `PracticePage.tsx:26-200` - 5 bird images with 12 annotations
- `EnhancedLearnPage.tsx:12-173` - 5 bird images with different annotations

**Impact:** Inconsistent experience depending on which page loaded first.

---

### 27. **No Deep Linking Between Features**

**Issue:** User can't:
- Click a term in Learn → jump to Practice for that term
- Click a species in Practice → view Species Detail
- Click "Practice Now" notification → go to Practice with discovered terms pre-loaded

**Files:** All page components lack URL params for state sharing.

---

### 28. **Duplicate Hook Logic**

**Issue:**
- `useExercise.ts` and `useAnnotationExercises.ts` both manage exercise sessions
- `useAnnotations.ts` and `useLearnContent.ts` both fetch annotations
- `useProgress.ts` and `useSpacedRepetition.ts` both track user progress

**Impact:** Confusion about which hook to use, duplicate API calls, inconsistent state.

---

## Recommendations

### Immediate Actions (Week 1)

1. **Fix Critical Auth Issues** (Issues #1, #3, #18)
   - Add auth state checks to all hooks
   - Surface authentication requirements to UI
   - Implement proper loading states

2. **Integrate SRS with Practice Page** (Issue #8)
   - Connect `useSpacedRepetition` to PracticePage
   - Prioritize due terms over random selection

3. **Fix Learn/Practice Data Source** (Issue #7)
   - Migrate LearnPage to `useLearnContent`
   - Ensure both Learn pages use same data

### Short-term (Week 2-3)

4. **Add Error Boundaries** (Issues #9, #21)
   - Wrap all feature sections in error boundaries
   - Implement retry mechanisms

5. **Implement Progress Linking** (Issues #24, #25, #27)
   - Add URL params for state sharing
   - Create "Continue Learning" flow
   - Link Species → Learn → Practice

6. **Consolidate Hooks** (Issue #28)
   - Create single source of truth for exercises
   - Merge progress tracking hooks

### Long-term (Month 2)

7. **Optimize Data Fetching** (Issues #12, #22)
   - Move search to backend
   - Implement query invalidation strategies

8. **Add Offline Support**
   - Cache learning content for offline use
   - Queue progress updates for sync

9. **Implement Analytics**
   - Track user flows across pages
   - Identify drop-off points

---

## Testing Checklist

### Auth Flow
- [ ] Learn page when not logged in
- [ ] Practice page without auth
- [ ] SRS due terms with expired session
- [ ] Token refresh during long session

### Data Flow
- [ ] Learn → Practice transition
- [ ] Species → Learning content
- [ ] Progress tracking across tabs
- [ ] Offline → Online sync

### Error Scenarios
- [ ] Network failure mid-session
- [ ] API returns 500 error
- [ ] Backend unavailable
- [ ] Partial API failures

### Edge Cases
- [ ] Empty database (no annotations)
- [ ] Single annotation
- [ ] 1000+ species
- [ ] Rapid page switching

---

## Conclusion

The frontend has solid foundational hooks, but **integration issues** and **silent failure patterns** prevent seamless user flows. Priority should be given to:

1. Surfacing errors to users
2. Connecting Learn → Practice → Species flows
3. Implementing proper auth checks
4. Consolidating duplicate logic

**Estimated effort:** 40-60 hours to address all issues.

**Risk if not addressed:** Users will experience:
- "Empty" states when data exists
- Lost progress from failed saves
- Confusion about feature availability
- Broken SRS functionality
