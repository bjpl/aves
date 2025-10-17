# React Query Testing Utility - Architecture Specification

## Executive Summary

This specification defines a standardized React Query testing utility that eliminates duplicate wrapper creation code across 30+ hook tests. Current analysis shows each test file reimplements identical QueryClient configuration, leading to maintenance burden and inconsistent test behavior.

## Problem Analysis

### Current State
- **39 test files** use React Query hooks (useQuery, useMutation, QueryClient)
- Each file creates custom wrapper with **identical QueryClient config**
- Configuration duplicated across files:
  - `retry: false`
  - `gcTime: 0`
  - `staleTime: 0`
  - Silent logger (log/warn/error: no-ops)
- Two patterns observed:
  1. Custom `createWrapper()` function (useAIAnnotations.test.ts)
  2. Inline wrapper in test-utils.tsx (existing but limited)

### Issues Identified
1. **Code Duplication**: 10+ lines repeated per test file
2. **Maintenance Overhead**: Config changes require updates across all files
3. **Inconsistency Risk**: Different files may drift in configuration
4. **Testing Blind Spots**: No utilities for common React Query patterns:
   - Query invalidation testing
   - Optimistic update verification
   - Cache state inspection
   - Mutation lifecycle hooks

## Architecture Design

### 1. Core Utility Structure

```typescript
// Location: /frontend/src/test/react-query-utils.tsx
// Purpose: Centralized React Query testing utilities

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Test-optimized QueryClient configuration
 * - No retries (faster test execution)
 * - No caching (test isolation)
 * - Silent logging (clean test output)
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // Fail fast in tests
        gcTime: 0,          // No cache persistence
        staleTime: 0,       // Always refetch
      },
      mutations: {
        retry: false,        // Fail fast in tests
      },
    },
    logger: {
      log: () => {},         // Suppress console.log
      warn: () => {},        // Suppress console.warn
      error: () => {},       // Suppress console.error
    },
  });
};

/**
 * Wrapper component for React Query + Router context
 * Matches existing test-utils.tsx pattern
 */
interface QueryWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export const QueryWrapper = ({ children, queryClient }: QueryWrapperProps) => {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Enhanced render for components with React Query
 * Replaces custom render from test-utils.tsx
 */
export interface RenderWithQueryOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithQuery = (
  ui: ReactElement,
  options?: RenderWithQueryOptions
) => {
  const { queryClient, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryWrapper queryClient={queryClient}>{children}</QueryWrapper>
    ),
    ...renderOptions,
  });
};

/**
 * Wrapper factory for renderHook usage
 * Addresses useAIAnnotations.test.ts pattern
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
};
```

### 2. Advanced Testing Utilities

```typescript
/**
 * Cache inspection utilities
 * For verifying optimistic updates and invalidation
 */
export const queryTestUtils = {
  /**
   * Get cached query data for inspection
   */
  getCachedData: <T = unknown>(
    queryClient: QueryClient,
    queryKey: unknown[]
  ): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },

  /**
   * Verify query was invalidated
   */
  wasInvalidated: async (
    queryClient: QueryClient,
    queryKey: unknown[]
  ): Promise<boolean> => {
    const state = queryClient.getQueryState(queryKey);
    return state?.isInvalidated ?? false;
  },

  /**
   * Wait for specific query state
   */
  waitForQueryState: async (
    queryClient: QueryClient,
    queryKey: unknown[],
    predicate: (state: any) => boolean,
    timeout = 1000
  ): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = queryClient.getQueryState(queryKey);
      if (predicate(state)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new Error(`Query state timeout for key: ${JSON.stringify(queryKey)}`);
  },

  /**
   * Verify optimistic update applied
   */
  verifyOptimisticUpdate: <T = unknown>(
    queryClient: QueryClient,
    queryKey: unknown[],
    expectedData: T
  ): void => {
    const cachedData = queryClient.getQueryData<T>(queryKey);
    expect(cachedData).toEqual(expectedData);
  },

  /**
   * Clear all query cache
   */
  clearAllQueries: (queryClient: QueryClient): void => {
    queryClient.clear();
  },

  /**
   * Get query count (for leak detection)
   */
  getQueryCount: (queryClient: QueryClient): number => {
    return queryClient.getQueryCache().getAll().length;
  },
};
```

### 3. Mock Response Builders

```typescript
/**
 * Standardized mock response builders
 * Matches actual API response structure
 */
export const mockQueryResponse = {
  /**
   * Success response wrapper
   */
  success: <T>(data: T) => ({
    data: { data },
  }),

  /**
   * Error response wrapper
   */
  error: (status: number, message: string) => ({
    response: {
      status,
      data: { error: message },
    },
    message,
  }),

  /**
   * Axios error structure
   */
  axiosError: (status: number, message: string, details?: any) => ({
    response: {
      status,
      data: { message, ...details },
    },
    message,
    isAxiosError: true,
  }),
};
```

### 4. Integration with Existing test-utils.tsx

```typescript
// Update existing test-utils.tsx to use new utilities

import { renderWithQuery } from './react-query-utils';

// Export new enhanced render
export { renderWithQuery as render };

// Keep existing mock helpers
export { createMockUser, createMockObservation, createMockBirdSpecies };

// Re-export React Query utilities
export * from './react-query-utils';
```

## Implementation Plan

### Phase 1: Core Utilities (Priority: HIGH)
- Create `/frontend/src/test/react-query-utils.tsx`
- Implement `createTestQueryClient()`
- Implement `QueryWrapper` component
- Implement `renderWithQuery()`
- Implement `createQueryWrapper()`

### Phase 2: Advanced Utilities (Priority: MEDIUM)
- Implement `queryTestUtils` object
- Add cache inspection methods
- Add query state verification
- Add optimistic update helpers

### Phase 3: Mock Builders (Priority: MEDIUM)
- Implement `mockQueryResponse` builders
- Add success/error response helpers
- Add axios error structure builder

### Phase 4: Migration (Priority: LOW)
- Update test-utils.tsx integration
- Migrate 5 sample test files
- Document migration pattern
- Create migration guide

## Usage Examples

### Example 1: Hook Testing (Current Pattern)
```typescript
// BEFORE (useAIAnnotations.test.ts - 42 lines of boilerplate)
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return Wrapper;
};

const { result } = renderHook(() => useAIAnnotations(), {
  wrapper: createWrapper(),
});

// AFTER (3 lines)
import { createQueryWrapper } from '@/test/react-query-utils';

const { result } = renderHook(() => useAIAnnotations(), {
  wrapper: createQueryWrapper(),
});
```

### Example 2: Component Testing
```typescript
// BEFORE (AnnotationBatchActions.test.tsx)
import { render } from '@testing-library/react';
// Uses test-utils.tsx wrapper (already good)

// AFTER (explicitly use React Query utilities)
import { renderWithQuery } from '@/test/react-query-utils';

renderWithQuery(<AnnotationBatchActions {...props} />);
```

### Example 3: Optimistic Update Testing
```typescript
// NEW CAPABILITY
import { createTestQueryClient, queryTestUtils } from '@/test/react-query-utils';

it('should perform optimistic update', async () => {
  const queryClient = createTestQueryClient();

  // Set initial data
  queryClient.setQueryData(['ai-annotations', 'pending'], [
    mockAnnotation({ id: 'ann-1' }),
    mockAnnotation({ id: 'ann-2' }),
  ]);

  const { result } = renderHook(() => useApproveAnnotation(), {
    wrapper: createQueryWrapper(queryClient),
  });

  result.current.mutate('ann-1');

  // Verify optimistic update
  await waitFor(() => {
    const updated = queryTestUtils.getCachedData(
      queryClient,
      ['ai-annotations', 'pending']
    );
    expect(updated).toHaveLength(1);
  });
});
```

### Example 4: Cache Invalidation Testing
```typescript
// NEW CAPABILITY
it('should invalidate related queries after approval', async () => {
  const queryClient = createTestQueryClient();

  const { result } = renderHook(() => useApproveAnnotation(), {
    wrapper: createQueryWrapper(queryClient),
  });

  result.current.mutate('ann-1');

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // Verify invalidation
  const wasInvalidated = await queryTestUtils.wasInvalidated(
    queryClient,
    ['ai-annotations', 'pending']
  );
  expect(wasInvalidated).toBe(true);
});
```

## Benefits

### Quantitative
- **Reduce code duplication**: ~400 lines eliminated across 39 files
- **Faster test writing**: 10 lines → 3 lines for hook tests
- **Improved maintainability**: 1 source of truth for configuration

### Qualitative
- **Consistent behavior**: All tests use identical QueryClient config
- **Better test coverage**: New utilities enable testing previously difficult patterns
- **Developer experience**: Clear, documented utilities
- **Future-proof**: Easy to add new React Query features

## Testing Strategy

### Unit Tests for Utilities
```typescript
describe('react-query-utils', () => {
  describe('createTestQueryClient', () => {
    it('should disable retries for queries', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.retry).toBe(false);
    });

    it('should disable retries for mutations', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    });

    it('should set zero cache times', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.gcTime).toBe(0);
      expect(client.getDefaultOptions().queries?.staleTime).toBe(0);
    });
  });

  describe('queryTestUtils', () => {
    it('should retrieve cached data', () => {
      const client = createTestQueryClient();
      const testData = { id: 1, name: 'test' };
      client.setQueryData(['test'], testData);

      const result = queryTestUtils.getCachedData(client, ['test']);
      expect(result).toEqual(testData);
    });
  });
});
```

## Non-Functional Requirements

### Performance
- Utilities must not add overhead to test execution
- Cache operations should be synchronous when possible
- Async helpers should have configurable timeouts

### Compatibility
- Must work with Vitest (current test runner)
- Must integrate with existing test-utils.tsx
- Must support both component and hook testing

### Documentation
- JSDoc comments for all public APIs
- Migration guide for existing tests
- Usage examples for common patterns

## Migration Guide

### Step-by-Step Migration

1. **Install new utilities** (already in test-utils.tsx)
   ```typescript
   import { createQueryWrapper } from '@/test/react-query-utils';
   ```

2. **Replace custom wrapper creation**
   ```typescript
   // DELETE this boilerplate
   const createWrapper = () => { ... };

   // USE this instead
   wrapper: createQueryWrapper()
   ```

3. **Update imports**
   ```typescript
   // BEFORE
   import { render } from '@testing-library/react';

   // AFTER
   import { renderWithQuery } from '@/test/react-query-utils';
   ```

4. **Add cache testing** (optional but recommended)
   ```typescript
   import { queryTestUtils } from '@/test/react-query-utils';

   // Verify optimistic updates
   queryTestUtils.verifyOptimisticUpdate(queryClient, queryKey, expectedData);
   ```

## Risk Assessment

### Low Risk
- Core utilities are simple wrappers
- No breaking changes to existing tests
- Backward compatible with current test-utils.tsx

### Medium Risk
- Migration requires updating 39 test files
- Potential for subtle behavioral changes if config differs

### Mitigation
- Gradual migration (start with 5 files)
- Run full test suite after each migration batch
- Document any behavioral differences

## Success Metrics

1. **Adoption**: 80% of hook tests use new utilities within 2 weeks
2. **Code reduction**: 300+ lines of boilerplate removed
3. **Test reliability**: No increase in flaky tests
4. **Developer satisfaction**: Positive feedback on ease of use

## Appendix: File Impact Analysis

### High Priority Files (Complex React Query usage)
- `useAIAnnotations.test.ts` - 468 lines, multiple mutation tests
- `useProgressQuery.test.ts` - Query with refetch intervals
- `useAIExercise.test.ts` - Complex mutation chains
- `useSpecies.test.ts` - Multiple related queries
- `useAnnotations.test.ts` - Optimistic updates

### Medium Priority Files (Standard patterns)
- `useCMS.test.ts`
- `useExercise.test.ts`
- `useProgress.test.ts`

### Low Priority Files (Simple usage)
- Component tests using test-utils.tsx render (already standardized)

---

**Document Version**: 1.0
**Created**: 2025-10-17
**Author**: Testing Architecture Designer
**Status**: Specification Complete - Ready for Implementation
