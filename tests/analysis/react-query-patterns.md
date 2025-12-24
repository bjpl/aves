# React Query Testing Patterns Analysis

## Overview
Analysis of React Query testing patterns across the AVES codebase to identify current approaches, consistency issues, and refactoring opportunities.

**Analysis Date**: 2025-10-16
**Test Files Analyzed**: 23 files
**Primary Framework**: Vitest + React Testing Library + React Query

---

## Current React Query Testing Patterns

### 1. QueryClient Setup Patterns

#### Pattern A: Inline QueryClient Creation (Most Common)
**Files**: `useAIAnnotations.test.ts`, `useProgressQuery.test.ts`, `useSpecies.test.ts`

```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return Wrapper;
};
```

**Advantages**:
- Full control over QueryClient configuration
- Test isolation guaranteed
- Can customize per test suite

**Disadvantages**:
- Code duplication across 10+ test files
- Inconsistent configurations (gcTime vs cacheTime)
- Repeated logger silencing

#### Pattern B: Centralized Test Utility
**File**: `test/test-utils.tsx`

```typescript
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};
```

**Usage**: Component tests import from `test-utils.tsx`
**Adoption**: Only 3 of 23 test files use this approach

**Advantages**:
- Centralized configuration
- Includes BrowserRouter for routing
- DRY principle

**Disadvantages**:
- Cannot customize QueryClient per test
- Not used by hook tests (renderHook pattern)

#### Pattern C: Separate QueryClient Mock
**File**: `test/mocks/queryClient.ts`

```typescript
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
```

**Usage**: Minimal adoption (1 file)
**Status**: Underutilized utility

---

### 2. React Query Hook Testing Patterns

#### Query Hook Pattern
**Example**: `useAIAnnotations`, `useSpecies`, `useProgressQuery`

```typescript
describe('useAIAnnotations - Query', () => {
  it('should fetch AI annotations without filters', async () => {
    const mockAnnotations = [mockAIAnnotation({ id: 'ann-1' })];

    mockAxios.get.mockResolvedValueOnce({
      data: { data: mockAnnotations },
    });

    const { result } = renderHook(() => useAIAnnotations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAnnotations);
  });
});
```

**Pattern Characteristics**:
- Mock API response before hook render
- Use `renderHook` from `@testing-library/react`
- Wait for `isSuccess` state
- Assert on `result.current.data`

**Consistency**: High across all query tests

#### Mutation Hook Pattern
**Example**: `useApproveAnnotation`, `useRejectAnnotation`, `useRecordExerciseResult`

```typescript
describe('useApproveAnnotation - Mutation', () => {
  it('should approve an annotation', async () => {
    const approvedAnnotation = mockAIAnnotation({
      status: 'approved',
      reviewedAt: new Date(),
    });

    mockAxios.post.mockResolvedValueOnce({
      data: { data: approvedAnnotation },
    });

    const { result } = renderHook(() => useApproveAnnotation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('ann-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/ai/annotations/ann-1/approve'
    );
  });
});
```

**Pattern Characteristics**:
- Mock mutation response
- Call `result.current.mutate()`
- Wait for `isSuccess` or `isError`
- Verify API was called correctly

**Consistency**: High across mutation tests

---

### 3. Optimistic Update Testing

**Found in**: `useAIAnnotations.test.ts`, `useProgressQuery.test.ts`

```typescript
it('should perform optimistic update', async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Set initial cache data
  const pendingAnnotations = [
    mockAIAnnotation({ id: 'ann-1' }),
    mockAIAnnotation({ id: 'ann-2' }),
  ];

  queryClient.setQueryData(['ai-annotations', 'pending'], pendingAnnotations);

  mockAxios.post.mockResolvedValueOnce({
    data: { data: mockAIAnnotation({ id: 'ann-1', status: 'approved' }) },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  const { result } = renderHook(() => useApproveAnnotation(), { wrapper: Wrapper });

  result.current.mutate('ann-1');

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // Verify cache was updated optimistically
  const updatedPending = queryClient.getQueryData(['ai-annotations', 'pending']);
  expect(updatedPending).toBeDefined();
});
```

**Pattern Characteristics**:
- Create custom QueryClient instance
- Pre-populate cache with `setQueryData`
- Execute mutation
- Assert cache state with `getQueryData`

**Issues**:
- Complex setup with inline wrapper
- Duplicate QueryClient configuration
- Test assumes implementation details (query keys)

---

### 4. Cache Invalidation Testing

**Found in**: `useAIAnnotations.test.ts` (lines 438-467)

```typescript
describe('Cache Invalidation', () => {
  it('should invalidate related queries after approval', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockAxios.post.mockResolvedValueOnce({
      data: { data: mockAIAnnotation({ status: 'approved' }) },
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useApproveAnnotation(), { wrapper: Wrapper });

    result.current.mutate('ann-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
```

**Pattern**: Spy on `invalidateQueries` method

**Coverage**: Minimal (only 1 test file tests invalidation)

---

### 5. Error Handling Patterns

#### Pattern A: Fallback to Empty Data
**Example**: `useAIAnnotations`, `useSpecies`

```typescript
it('should return empty array on API error', async () => {
  mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

  const { result } = renderHook(() => useAIAnnotations(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual([]);
});
```

**Hooks Using This Pattern**: All query hooks with default fallback values

#### Pattern B: Error State Testing
**Example**: Mutation error handling

```typescript
it('should handle approval error', async () => {
  mockAxios.post.mockRejectedValueOnce(new Error('API error'));

  const { result } = renderHook(() => useApproveAnnotation(), {
    wrapper: createWrapper(),
  });

  result.current.mutate('ann-1');

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error).toBeDefined();
});
```

**Coverage**: Comprehensive across all mutation tests

---

### 6. Placeholder Data Testing

**Found in**: `useAIAnnotations.test.ts`, `useSpecies.test.ts`

```typescript
it('should use placeholder data', () => {
  mockAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

  const { result } = renderHook(() => useAIAnnotations(), {
    wrapper: createWrapper(),
  });

  expect(result.current.data).toEqual([]);
});
```

**Pattern**: Test initial placeholder before query resolves

**Coverage**: Limited (only 2 test files)

---

## Identified Issues and Inconsistencies

### 1. QueryClient Configuration Duplication
**Problem**: 15+ test files create identical QueryClient configurations
**Impact**: Maintenance burden, inconsistent settings

**Example Variations**:
```typescript
// Variation A: gcTime: 0
queries: { retry: false, gcTime: 0, staleTime: 0 }

// Variation B: No gcTime
queries: { retry: false, staleTime: 0 }

// Variation C: Only retry
queries: { retry: false }
```

### 2. Wrapper Component Patterns
**Inconsistencies**:
- Some use `React.createElement`
- Some use JSX syntax
- Some inline wrappers, some extracted functions
- BrowserRouter included in some, not others

### 3. Mock Data Creation
**Current State**:
- Each test file creates own mock factories
- No centralized mock utilities
- Duplicated mock structures (AIAnnotation, Species, Exercise)

**Example**:
```typescript
// useAIAnnotations.test.ts
const mockAIAnnotation = (overrides: Partial<AIAnnotation> = {}): AIAnnotation => ({
  id: 'ann-1',
  imageId: 'img-1',
  spanishTerm: 'pico',
  // ... 10 more fields
  ...overrides,
});

// Similar pattern repeated in 10+ test files
```

### 4. waitFor Usage Inconsistencies
**Pattern A**: Check state flags
```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

**Pattern B**: Direct data assertion
```typescript
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

**Issue**: Mixing patterns can cause race conditions

### 5. Query Key Testing
**Gap**: No tests verify query key correctness
**Risk**: Query key changes could break caching without detection

### 6. Stale Data Handling
**Gap**: No tests verify `staleTime` behavior
**Gap**: No tests verify `refetchOnWindowFocus` behavior

---

## Test Coverage Analysis

### Well-Covered Areas
- ✅ Basic query fetching
- ✅ Mutation execution
- ✅ Error handling (query and mutation)
- ✅ API parameter passing
- ✅ Loading states
- ✅ Success states

### Gaps in Coverage
- ❌ Query key uniqueness and correctness
- ❌ Cache persistence across components
- ❌ Refetch behaviors (window focus, mount)
- ❌ Concurrent query handling
- ❌ Query cancellation
- ❌ Retry logic (disabled but not verified)
- ❌ Background refetch behaviors
- ❌ Query deduplication
- ❌ Mutation rollback on error (only 1 test)

---

## Performance Considerations

### Current Performance Patterns
1. **Test Isolation**: Each test creates fresh QueryClient ✅
2. **Cache Cleanup**: `gcTime: 0` prevents cache leaks ✅
3. **Retry Disabled**: Fast test execution ✅

### Potential Optimizations
1. Share QueryClient across tests in same file (with cleanup)
2. Use `createTestQueryClient()` utility consistently
3. Batch mock setup in `beforeEach` blocks

---

## Recommended Refactoring Approach

### Phase 1: Standardize QueryClient Creation
**Goal**: Eliminate duplication, consistent configuration

**Action**:
1. Enhance `/tests/mocks/queryClient.ts`
2. Export `createTestQueryClient()` and `createTestWrapper()`
3. Update all test files to use centralized utilities

### Phase 2: Centralized Mock Factories
**Goal**: DRY mock data creation

**Action**:
1. Create `/tests/mocks/factories/` directory
2. Implement typed mock factories for each domain model
3. Support partial overrides with TypeScript

### Phase 3: Advanced Testing Patterns
**Goal**: Fill coverage gaps

**Action**:
1. Add query key correctness tests
2. Test optimistic updates comprehensively
3. Test cache invalidation patterns
4. Add mutation rollback tests

### Phase 4: Test Utilities Enhancement
**Goal**: Simplified test writing

**Action**:
1. Create `renderQueryHook()` helper
2. Create `renderMutationHook()` helper
3. Add assertion helpers for common patterns

---

## Example Refactored Test Structure

```typescript
// Using improved utilities
import { createTestQueryClient, createTestWrapper } from '@/tests/mocks/queryClient';
import { mockAIAnnotation } from '@/tests/mocks/factories/annotations';

describe('useAIAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch AI annotations', async () => {
    const annotations = [mockAIAnnotation()];
    mockAxios.get.mockResolvedValueOnce({ data: { data: annotations } });

    const { result } = renderHook(() => useAIAnnotations(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(annotations);
  });
});
```

---

## Statistics

- **Total Test Files with React Query**: 23
- **Inline QueryClient Creations**: 18
- **Centralized Utility Usage**: 3
- **Query Hook Tests**: 156
- **Mutation Hook Tests**: 89
- **Optimistic Update Tests**: 4
- **Cache Invalidation Tests**: 1

---

## Conclusion

The current React Query testing approach is **functional but inconsistent**. Key improvements needed:

1. **Standardize QueryClient creation** across all tests
2. **Centralize mock data factories** to eliminate duplication
3. **Fill coverage gaps** in advanced React Query features
4. **Create test utilities** for common patterns

These refactorings will improve maintainability, consistency, and test reliability.
