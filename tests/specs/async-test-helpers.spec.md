# Async Testing Helpers - Architecture Specification

## Executive Summary

This specification defines improved async testing utilities to address flaky tests, timeout issues, and unreliable async assertions across the test suite. Analysis reveals inconsistent async patterns using `waitFor`, manual polling, and hardcoded delays, leading to test instability and slow execution.

## Problem Analysis

### Current State

#### Async Patterns Observed
1. **waitFor() usage** (Testing Library)
   ```typescript
   await waitFor(() => {
     expect(result.current.isSuccess).toBe(true);
   });
   ```

2. **Manual polling loops**
   ```typescript
   const startTime = Date.now();
   while (Date.now() - startTime < timeout) {
     const state = queryClient.getQueryState(queryKey);
     if (predicate(state)) return;
     await new Promise(resolve => setTimeout(resolve, 50));
   }
   ```

3. **Hardcoded delays**
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 100));
   ```

4. **Fake timers** (inconsistent usage)
   ```typescript
   vi.useFakeTimers();
   // ... test code
   vi.useRealTimers();
   ```

### Issues Identified

1. **Flaky Tests**
   - Race conditions in async assertions
   - Timing-dependent test failures
   - Inconsistent wait strategies

2. **Slow Test Execution**
   - Excessive `waitFor()` timeouts (default 1000ms)
   - Polling intervals too long (50ms typical)
   - Unnecessary delays

3. **Poor Error Messages**
   - Generic timeout errors
   - No visibility into what failed
   - Difficult to debug failures

4. **Missing Patterns**
   - No utilities for Promise.all testing
   - No retry logic for intermittent failures
   - No utilities for testing debounce/throttle
   - No helpers for testing async sequences

## Architecture Design

### 1. Core Async Utilities

```typescript
// Location: /tests/utils/async-helpers.ts
// Purpose: Centralized async testing utilities

import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Configuration for async wait operations
 */
export interface WaitOptions {
  timeout?: number;        // Maximum wait time (default: 1000ms)
  interval?: number;       // Poll interval (default: 50ms)
  onTimeout?: (error: Error) => void;  // Timeout callback
}

/**
 * Enhanced waitFor with better defaults and error messages
 */
export const waitForCondition = async <T>(
  condition: () => T | Promise<T>,
  options: WaitOptions = {}
): Promise<T> => {
  const {
    timeout = 1000,
    interval = 50,
    onTimeout,
  } = options;

  return waitFor(condition, {
    timeout,
    interval,
    onTimeout: onTimeout || ((error) => {
      const enhancedError = new Error(
        `Async condition timeout after ${timeout}ms: ${error.message}`
      );
      enhancedError.stack = error.stack;
      throw enhancedError;
    }),
  });
};

/**
 * Wait for predicate to be true
 * More descriptive than generic waitFor
 */
export const waitUntil = async (
  predicate: () => boolean | Promise<boolean>,
  message?: string,
  options: WaitOptions = {}
): Promise<void> => {
  const {
    timeout = 1000,
    interval = 50,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(predicate());
    if (result) return;
    await sleep(interval);
  }

  throw new Error(
    message || `Predicate not satisfied within ${timeout}ms`
  );
};

/**
 * Wait for value to change
 * Useful for testing state updates
 */
export const waitForValueChange = async <T>(
  getValue: () => T | Promise<T>,
  initialValue: T,
  options: WaitOptions = {}
): Promise<T> => {
  await waitUntil(
    async () => {
      const current = await Promise.resolve(getValue());
      return current !== initialValue;
    },
    `Value did not change from ${initialValue}`,
    options
  );

  return await Promise.resolve(getValue());
};

/**
 * Wait for async function to not throw
 * Useful for eventual consistency scenarios
 */
export const waitForNoThrow = async <T>(
  fn: () => T | Promise<T>,
  options: WaitOptions = {}
): Promise<T> => {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  let lastError: Error | null = null;

  while (Date.now() - startTime < timeout) {
    try {
      return await Promise.resolve(fn());
    } catch (error) {
      lastError = error as Error;
      await sleep(interval);
    }
  }

  throw new Error(
    `Function still throwing after ${timeout}ms: ${lastError?.message}`
  );
};

/**
 * Type-safe sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Wait for multiple conditions in parallel
 */
export const waitForAll = async <T extends readonly unknown[]>(
  conditions: { [K in keyof T]: () => Promise<T[K]> },
  options: WaitOptions = {}
): Promise<T> => {
  const promises = conditions.map(condition =>
    waitForCondition(condition, options)
  );

  return Promise.all(promises) as Promise<T>;
};

/**
 * Wait for first condition to succeed
 */
export const waitForAny = async <T>(
  conditions: Array<() => Promise<T>>,
  options: WaitOptions = {}
): Promise<T> => {
  const promises = conditions.map(condition =>
    waitForCondition(condition, options)
  );

  return Promise.race(promises);
};
```

### 2. React Query Async Utilities

```typescript
/**
 * React Query specific async helpers
 */
export const queryAsyncHelpers = {
  /**
   * Wait for query to be successful
   */
  waitForQuerySuccess: async (
    getResult: () => { isSuccess: boolean; data: any },
    options: WaitOptions = {}
  ) => {
    await waitUntil(
      () => getResult().isSuccess,
      'Query did not succeed',
      options
    );
    return getResult().data;
  },

  /**
   * Wait for mutation to complete
   */
  waitForMutationComplete: async (
    getResult: () => { isSuccess: boolean; isError: boolean; data?: any; error?: any },
    options: WaitOptions = {}
  ) => {
    await waitUntil(
      () => getResult().isSuccess || getResult().isError,
      'Mutation did not complete',
      options
    );

    if (getResult().isError) {
      throw new Error(`Mutation failed: ${getResult().error?.message}`);
    }

    return getResult().data;
  },

  /**
   * Wait for query to be fetching
   */
  waitForQueryFetching: async (
    getResult: () => { isFetching: boolean },
    options: WaitOptions = {}
  ) => {
    await waitUntil(
      () => getResult().isFetching,
      'Query did not start fetching',
      options
    );
  },

  /**
   * Wait for query to finish fetching
   */
  waitForQueryIdle: async (
    getResult: () => { isFetching: boolean },
    options: WaitOptions = {}
  ) => {
    await waitUntil(
      () => !getResult().isFetching,
      'Query still fetching',
      options
    );
  },

  /**
   * Wait for query cache to update
   */
  waitForCacheUpdate: async <T>(
    queryClient: any,
    queryKey: unknown[],
    predicate: (data: T | undefined) => boolean,
    options: WaitOptions = {}
  ): Promise<T | undefined> => {
    await waitUntil(
      () => {
        const data = queryClient.getQueryData<T>(queryKey);
        return predicate(data);
      },
      `Cache did not update for key: ${JSON.stringify(queryKey)}`,
      options
    );

    return queryClient.getQueryData<T>(queryKey);
  },
};
```

### 3. Timer Utilities

```typescript
/**
 * Utilities for testing time-dependent code
 */
export const timerHelpers = {
  /**
   * Setup fake timers with automatic cleanup
   */
  useFakeTimers: () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    return {
      advance: (ms: number) => vi.advanceTimersByTime(ms),
      advanceToNext: () => vi.advanceTimersToNextTimer(),
      runAll: () => vi.runAllTimers(),
      runPending: () => vi.runOnlyPendingTimers(),
    };
  },

  /**
   * Test debounced function
   */
  testDebounce: async (
    fn: (...args: any[]) => any,
    delay: number,
    calls: Array<{ args: any[]; delay: number }>
  ): Promise<number> => {
    vi.useFakeTimers();

    let callCount = 0;
    const wrappedFn = (...args: any[]) => {
      callCount++;
      return fn(...args);
    };

    for (const call of calls) {
      wrappedFn(...call.args);
      vi.advanceTimersByTime(call.delay);
    }

    vi.advanceTimersByTime(delay);
    vi.useRealTimers();

    return callCount;
  },

  /**
   * Test throttled function
   */
  testThrottle: async (
    fn: (...args: any[]) => any,
    interval: number,
    callCount: number
  ): Promise<number> => {
    vi.useFakeTimers();

    let executionCount = 0;
    const wrappedFn = (...args: any[]) => {
      executionCount++;
      return fn(...args);
    };

    for (let i = 0; i < callCount; i++) {
      wrappedFn();
      vi.advanceTimersByTime(interval / 2);
    }

    vi.useRealTimers();
    return executionCount;
  },

  /**
   * Test interval execution
   */
  testInterval: (
    fn: () => void,
    interval: number,
    expectedCalls: number
  ): void => {
    vi.useFakeTimers();

    const mockFn = vi.fn(fn);
    const intervalId = setInterval(mockFn, interval);

    vi.advanceTimersByTime(interval * expectedCalls);
    clearInterval(intervalId);

    expect(mockFn).toHaveBeenCalledTimes(expectedCalls);

    vi.useRealTimers();
  },
};
```

### 4. Promise Testing Utilities

```typescript
/**
 * Utilities for testing Promise behavior
 */
export const promiseHelpers = {
  /**
   * Create a deferred promise for manual control
   */
  createDeferred: <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  },

  /**
   * Test promise sequence
   */
  testSequence: async <T>(
    promises: Array<() => Promise<T>>,
    options: { parallel?: boolean } = {}
  ): Promise<T[]> => {
    if (options.parallel) {
      return Promise.all(promises.map(p => p()));
    }

    const results: T[] = [];
    for (const promiseFn of promises) {
      results.push(await promiseFn());
    }
    return results;
  },

  /**
   * Test promise retry logic
   */
  testRetry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<{ attempts: number; result?: T; error?: Error }> => {
    let attempts = 0;
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      attempts++;
      try {
        const result = await fn();
        return { attempts, result };
      } catch (error) {
        lastError = error as Error;
      }
    }

    return { attempts, error: lastError };
  },

  /**
   * Test promise timeout
   */
  expectTimeout: async (
    promise: Promise<any>,
    timeoutMs: number
  ): Promise<void> => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Expected timeout')), timeoutMs)
    );

    await expect(Promise.race([promise, timeout])).rejects.toThrow('Expected timeout');
  },

  /**
   * Test promise resolution time
   */
  measureResolutionTime: async <T>(
    promise: Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await promise;
    const duration = Date.now() - start;
    return { result, duration };
  },
};
```

### 5. Retry and Resilience Utilities

```typescript
/**
 * Utilities for testing retry and error handling
 */
export const resilienceHelpers = {
  /**
   * Create flaky function for testing retry logic
   */
  createFlakyFunction: <T>(
    successValue: T,
    failureRate: number,
    errorMessage = 'Flaky function failed'
  ) => {
    let callCount = 0;

    return () => {
      callCount++;
      if (Math.random() < failureRate) {
        throw new Error(`${errorMessage} (attempt ${callCount})`);
      }
      return successValue;
    };
  },

  /**
   * Test exponential backoff
   */
  testExponentialBackoff: async (
    fn: () => Promise<any>,
    maxRetries: number,
    baseDelay: number
  ): Promise<{ attempts: number; delays: number[] }> => {
    const delays: number[] = [];
    let attempts = 0;

    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      const delay = baseDelay * Math.pow(2, i);
      delays.push(delay);

      try {
        await fn();
        break;
      } catch {
        if (i < maxRetries - 1) {
          await sleep(delay);
        }
      }
    }

    return { attempts, delays };
  },

  /**
   * Test circuit breaker pattern
   */
  createCircuitBreaker: (
    threshold: number,
    resetTimeout: number
  ) => {
    let failures = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';
    let lastFailureTime = 0;

    return {
      call: async <T>(fn: () => Promise<T>): Promise<T> => {
        if (state === 'open') {
          if (Date.now() - lastFailureTime > resetTimeout) {
            state = 'half-open';
          } else {
            throw new Error('Circuit breaker is open');
          }
        }

        try {
          const result = await fn();
          if (state === 'half-open') {
            state = 'closed';
            failures = 0;
          }
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = Date.now();

          if (failures >= threshold) {
            state = 'open';
          }

          throw error;
        }
      },

      getState: () => state,
      getFailureCount: () => failures,
    };
  },
};
```

## Implementation Plan

### Phase 1: Core Utilities (Priority: HIGH)
- Create `/tests/utils/async-helpers.ts`
- Implement `waitForCondition()`, `waitUntil()`, `waitForValueChange()`
- Implement `sleep()`, `waitForAll()`, `waitForAny()`
- Implement `waitForNoThrow()`

### Phase 2: React Query Helpers (Priority: HIGH)
- Implement `queryAsyncHelpers` object
- Add query success/error waiting
- Add cache update verification
- Add mutation lifecycle helpers

### Phase 3: Timer Utilities (Priority: MEDIUM)
- Implement `timerHelpers` object
- Add fake timer management
- Add debounce/throttle testing
- Add interval testing

### Phase 4: Promise Utilities (Priority: MEDIUM)
- Implement `promiseHelpers` object
- Add deferred promise creation
- Add sequence testing
- Add retry and timeout testing

### Phase 5: Resilience Utilities (Priority: LOW)
- Implement `resilienceHelpers` object
- Add flaky function simulation
- Add exponential backoff testing
- Add circuit breaker pattern

## Usage Examples

### Example 1: Basic Async Wait
```typescript
// BEFORE
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

// AFTER
import { queryAsyncHelpers } from '@/tests/utils/async-helpers';

const data = await queryAsyncHelpers.waitForQuerySuccess(
  () => result.current
);
expect(data).toBeDefined();
```

### Example 2: Value Change Detection
```typescript
// BEFORE
const initialValue = getCount();
await new Promise(resolve => setTimeout(resolve, 100));
expect(getCount()).toBeGreaterThan(initialValue);

// AFTER
import { waitForValueChange } from '@/tests/utils/async-helpers';

const newValue = await waitForValueChange(
  () => getCount(),
  initialValue
);
expect(newValue).toBeGreaterThan(initialValue);
```

### Example 3: Query Cache Testing
```typescript
// BEFORE
await waitFor(() => {
  const data = queryClient.getQueryData(['annotations']);
  expect(data).toBeDefined();
});

// AFTER
import { queryAsyncHelpers } from '@/tests/utils/async-helpers';

const data = await queryAsyncHelpers.waitForCacheUpdate(
  queryClient,
  ['annotations'],
  (data) => data !== undefined
);
expect(data).toBeDefined();
```

### Example 4: Debounce Testing
```typescript
// BEFORE
vi.useFakeTimers();
const mockFn = vi.fn();
debouncedFn();
vi.advanceTimersByTime(300);
debouncedFn();
vi.advanceTimersByTime(300);
vi.useRealTimers();

// AFTER
import { timerHelpers } from '@/tests/utils/async-helpers';

const callCount = await timerHelpers.testDebounce(
  mockFn,
  300,
  [
    { args: [], delay: 100 },
    { args: [], delay: 100 },
    { args: [], delay: 500 },
  ]
);
expect(callCount).toBe(1);
```

### Example 5: Retry Logic Testing
```typescript
// BEFORE
let attempts = 0;
while (attempts < 3) {
  try {
    await flakyFunction();
    break;
  } catch {
    attempts++;
  }
}

// AFTER
import { promiseHelpers } from '@/tests/utils/async-helpers';

const { attempts, result } = await promiseHelpers.testRetry(
  flakyFunction,
  3
);
expect(attempts).toBeLessThanOrEqual(3);
expect(result).toBeDefined();
```

## Benefits

### Quantitative
- **Reduce test flakiness**: 50% reduction in timing-related failures
- **Faster test execution**: Optimize timeouts (30% faster on average)
- **Better error messages**: 100% of async failures have context

### Qualitative
- **Consistent async patterns**: All tests use same utilities
- **Easier debugging**: Clear error messages with context
- **Better test coverage**: New utilities enable testing complex async scenarios
- **Future-proof**: Easy to add new async patterns

## Testing Strategy

### Unit Tests for Utilities
```typescript
describe('async-helpers', () => {
  describe('waitUntil', () => {
    it('should wait for predicate to be true', async () => {
      let value = false;
      setTimeout(() => { value = true; }, 100);

      await waitUntil(() => value);
      expect(value).toBe(true);
    });

    it('should timeout with descriptive error', async () => {
      await expect(
        waitUntil(() => false, 'Custom error', { timeout: 100 })
      ).rejects.toThrow('Custom error');
    });
  });

  describe('waitForValueChange', () => {
    it('should detect value change', async () => {
      let count = 0;
      setTimeout(() => { count = 1; }, 50);

      const newValue = await waitForValueChange(() => count, 0);
      expect(newValue).toBe(1);
    });
  });
});
```

## Non-Functional Requirements

### Performance
- Utilities must not add overhead (target <1ms)
- Polling should be efficient (default 50ms interval)
- Timeouts should be configurable

### Compatibility
- Must work with Vitest
- Must work with Testing Library
- Must work with React Query
- Must support async/await and Promises

### Documentation
- JSDoc comments for all APIs
- Usage examples for common patterns
- Migration guide from manual patterns

## Migration Guide

### Gradual Migration Strategy

1. **Start with flaky tests** - Migrate tests that fail intermittently
2. **Migrate complex async patterns** - Tests with polling loops
3. **Update remaining tests** - Standardize all async patterns

### Migration Patterns

```typescript
// Pattern 1: waitFor → waitUntil
// BEFORE
await waitFor(() => {
  expect(isReady()).toBe(true);
});

// AFTER
await waitUntil(() => isReady());

// Pattern 2: Manual polling → waitForValueChange
// BEFORE
while (getValue() === initialValue) {
  await new Promise(r => setTimeout(r, 50));
}

// AFTER
await waitForValueChange(() => getValue(), initialValue);

// Pattern 3: React Query success → queryAsyncHelpers
// BEFORE
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

// AFTER
await queryAsyncHelpers.waitForQuerySuccess(() => result.current);
```

## Risk Assessment

### Low Risk
- Utilities are pure functions
- No breaking changes to existing tests
- Optional adoption

### Medium Risk
- Changing timing behavior may reveal hidden test issues
- Need to validate timeout values

### Mitigation
- Test utilities thoroughly before rollout
- Migrate gradually with monitoring
- Document any timing changes

## Success Metrics

1. **Flakiness reduction**: 50% fewer intermittent failures
2. **Test speed**: 30% faster average execution
3. **Adoption**: 60% of async tests use new helpers within 1 month
4. **Error clarity**: 90% of failures have descriptive messages

---

**Document Version**: 1.0
**Created**: 2025-10-17
**Author**: Testing Architecture Designer
**Status**: Specification Complete - Ready for Implementation
