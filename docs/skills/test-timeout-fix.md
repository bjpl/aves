# Test Timeout Fix - Skill Library Pattern

**Version:** 1.0.0
**Category:** Testing
**Tags:** vitest, jest, timeout, async, debugging, mocking

## Overview

Comprehensive pattern for diagnosing and fixing test timeout issues in Vitest/Jest test suites. This skill helps identify root causes of hanging tests and provides proven fix patterns.

## When to Use This Skill

### Trigger Conditions
- ❌ Tests timing out after default timeout period (30s)
- ❌ Tests hanging indefinitely
- ❌ Tests running slowly (>5 seconds per test)
- ❌ Unhandled promise rejections
- ❌ afterEach/afterAll hooks not completing
- ❌ Mock functions not being called as expected

## Common Causes

### 1. Unresolved Promises
**Symptoms:** Test hangs, timeout after 30s, test never completes

Missing await on async operations:
```typescript
// ❌ BAD - No await
it('fetches data', () => {
  result.current.refetch();
  expect(result.current.data).toBeDefined();
});

// ✅ GOOD - Properly awaited
it('fetches data', async () => {
  result.current.refetch();
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  expect(result.current.data).toBeDefined();
});
```

### 2. Real API Calls
**Symptoms:** Slow tests, intermittent failures, network errors

Tests making actual network requests:
```typescript
// ❌ BAD - Real API call
it('fetches data', async () => {
  const data = await fetch('/api/data'); // Real network call!
});

// ✅ GOOD - Mocked
const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({ default: mockFetch }));

it('fetches data', async () => {
  mockFetch.mockResolvedValue({ data: mockData });
  const data = await fetch('/api/data');
});
```

### 3. Missing Cleanup
**Symptoms:** Memory leaks, tests affecting each other, cleanup warnings

Resources not cleaned up:
```typescript
// ❌ BAD - No cleanup
describe('Tests', () => {
  it('test 1', () => {
    setInterval(callback, 1000); // Never cleared!
  });
});

// ✅ GOOD - Proper cleanup
describe('Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it('test 1', () => {
    setInterval(callback, 1000);
    vi.advanceTimersByTime(1000);
  });
});
```

### 4. Incorrect Mock Configuration
**Symptoms:** Mock functions undefined, wrong module imported, hoisting errors

Mocks not properly hoisted:
```typescript
// ❌ BAD - Not hoisted
vi.mock('../service', () => ({
  fetchData: vi.fn() // This might not work!
}));

// ✅ GOOD - Properly hoisted
const { mockFetchData } = vi.hoisted(() => ({
  mockFetchData: vi.fn()
}));

vi.mock('../service', () => ({
  fetchData: mockFetchData
}));
```

### 5. Missing waitFor/Act
**Symptoms:** Act warnings, state not updated, assertions fail

State updates not awaited:
```typescript
// ❌ BAD - No waitFor
it('updates state', () => {
  result.current.mutate(data);
  expect(result.current.data).toBe(newData); // Fails!
});

// ✅ GOOD - Using waitFor
it('updates state', async () => {
  result.current.mutate(data);
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  expect(result.current.data).toBe(newData);
});
```

## Diagnostic Process

### Step 1: Identify the Hanging Test
```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- path/to/test.test.ts

# Run without coverage (faster)
npm test -- --no-coverage
```

**Look for:**
- Which test is timing out
- How long before timeout
- Any error messages before timeout

### Step 2: Check for Unresolved Promises
```bash
grep -n 'async' test-file.test.ts
grep -n '\.then(' test-file.test.ts
grep -n 'await' test-file.test.ts
```

**Look for:**
- Async functions without await
- Promise chains without catch
- Callbacks that should be awaited

### Step 3: Verify Mock Configuration

**Checklist:**
- [ ] Are all external modules properly mocked?
- [ ] Are mock functions hoisted using `vi.hoisted()`?
- [ ] Do mocks return proper data structures?
- [ ] Are mocks cleared in beforeEach/afterEach?

### Step 4: Inspect Cleanup Patterns

**Checklist:**
- [ ] Is `cleanup()` called in afterEach?
- [ ] Are timers cleared?
- [ ] Are listeners removed?
- [ ] Is test isolation maintained?

### Step 5: Check Test Configuration

**Files to check:**
- `vitest.config.ts` / `jest.config.js`
- `src/test/setup.ts`

**Look for:**
- `testTimeout` setting
- `hookTimeout` setting
- Proper test isolation (`pool: 'threads'`, `isolate: true`)

## Fix Patterns

### Pattern 1: Add Explicit Timeouts

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000,  // 30s for regular tests
    hookTimeout: 10000,  // 10s for hooks
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true  // Each test gets fresh context
      }
    }
  }
});

// Per-test timeout
it('slow test', { timeout: 60000 }, async () => {
  // Test that legitimately needs more time
});
```

### Pattern 2: Properly Await Async Operations

```typescript
// React Query mutation
it('generates exercise', async () => {
  const { result } = renderHook(() => useGenerateAIExercise(), {
    wrapper: createWrapper()
  });

  result.current.mutate(params);

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});

// API call
it('fetches data', async () => {
  const promise = apiService.getData();
  const data = await promise;
  expect(data).toBeDefined();
});
```

### Pattern 3: Mock External Dependencies

```typescript
// Mock API service
const { mockGenerateExercise } = vi.hoisted(() => ({
  mockGenerateExercise: vi.fn()
}));

vi.mock('../../services/aiExerciseService', () => ({
  aiExerciseService: {
    generateExercise: mockGenerateExercise
  }
}));

beforeEach(() => {
  mockGenerateExercise.mockResolvedValue({
    exercise: mockData
  });
});

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    }))
  }
}));
```

### Pattern 4: Add Proper Cleanup

```typescript
describe('MyComponent', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,      // No caching between tests
          staleTime: 0
        }
      }
    });
  });

  afterEach(() => {
    cleanup();              // Clean up React components
    queryClient.clear();    // Clear React Query cache
    vi.clearAllMocks();     // Clear all mock state
    vi.clearAllTimers();    // Clear any pending timers
    vi.useRealTimers();     // Restore real timers
  });

  // Tests here...
});
```

### Pattern 5: Use Fake Timers

```typescript
describe('Polling tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('polls every 5 seconds', () => {
    const mockPoll = vi.fn();
    startPolling(mockPoll, 5000);

    // Advance time instead of waiting
    vi.advanceTimersByTime(5000);
    expect(mockPoll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(mockPoll).toHaveBeenCalledTimes(2);
  });
});
```

### Pattern 6: Isolate Test Environment

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true  // Each test gets fresh context
      }
    }
  }
});

// In test file
beforeEach(() => {
  vi.resetModules();           // Reset all module state
  vi.clearAllMocks();          // Clear all mocks
  document.body.innerHTML = ''; // Reset DOM
});
```

### Pattern 7: Add Error Boundaries

```typescript
// Catch and verify errors
it('handles errors', async () => {
  mockFunction.mockRejectedValueOnce(new Error('API Error'));

  await expect(async () => {
    await result.current.mutate(params);
  }).rejects.toThrow('API Error');
});

// Verify error state
it('shows error state', async () => {
  mockFunction.mockRejectedValueOnce(new Error('Failed'));

  result.current.mutate(params);

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
  });
});
```

## Best Practices

### 1. Always Await Async Operations
- Use `await waitFor()` for React Testing Library
- Use `await act()` for React state updates
- Always await mutation/query operations

### 2. Mock All External Dependencies
- Mock HTTP clients (axios, fetch)
- Mock external services
- Mock file system operations
- Mock timers for time-dependent code

### 3. Clean Up After Every Test
**Cleanup checklist:**
- [ ] Call `cleanup()` from @testing-library/react
- [ ] Clear all mocks with `vi.clearAllMocks()`
- [ ] Clear timers with `vi.clearAllTimers()`
- [ ] Reset QueryClient cache
- [ ] Remove event listeners
- [ ] Clear localStorage/sessionStorage

### 4. Use Explicit Timeouts Judiciously
- 30s timeout is reasonable for integration tests
- 10s timeout is reasonable for unit tests
- 1s timeout for pure synchronous tests
- If you need >60s, you probably have a real issue to fix

### 5. Prefer Fake Timers Over Real Timers
- Use `vi.useFakeTimers()` for any time-dependent code
- Advance time explicitly with `vi.advanceTimersByTime()`
- Clean up with `vi.useRealTimers()` in afterEach

### 6. Test One Thing at a Time
- Each test should verify one behavior
- Keep tests focused and small
- Use describe blocks to group related tests
- Don't share state between tests

## Troubleshooting Checklist

- [ ] **Async functions awaited?** Add `await` to all async calls
- [ ] **External modules mocked?** Add `vi.mock()` for each dependency
- [ ] **Cleanup being called?** Add `afterEach(() => cleanup())`
- [ ] **Mocks return correct types?** Ensure mocks return Promises for async
- [ ] **Timers cleared?** Use fake timers or clear in afterEach
- [ ] **Test isolation configured?** Set `pool: 'threads'` and `isolate: true`
- [ ] **Promises rejected properly?** Wrap in `expect().rejects.toThrow()`

## Success Criteria

### Performance
- ✅ Unit tests: <1 second per test
- ✅ Integration tests: <5 seconds per test
- ✅ Total suite: <30 seconds for 100 tests

### Reliability
- ✅ >99% consistent pass rate
- ✅ Zero flaky tests
- ✅ Tests pass in any order

### Quality
- ✅ >80% code coverage
- ✅ Easy to debug when tests fail
- ✅ Clear test descriptions and comments

## Complete Example: Before & After

### Before (Problematic)
```typescript
describe('AI Exercise Hook', () => {
  it('generates exercise', () => {
    const { result } = renderHook(() => useGenerateAIExercise());
    result.current.mutate({ userId: 'user-1', type: 'adaptive' });
    expect(result.current.data).toBeDefined(); // ❌ Fails/times out
  });
});
```

### After (Fixed)
```typescript
// Properly hoist mocks
const { mockGenerateExercise } = vi.hoisted(() => ({
  mockGenerateExercise: vi.fn()
}));

vi.mock('../../services/aiExerciseService', () => ({
  aiExerciseService: {
    generateExercise: mockGenerateExercise
  }
}));

// Create wrapper with fresh QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AI Exercise Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateExercise.mockResolvedValue({
      exercise: { id: 'ex-1', type: 'adaptive' },
      metadata: { generated: true, cached: false }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('generates exercise', async () => {
    const { result } = renderHook(() => useGenerateAIExercise(), {
      wrapper: createWrapper()
    });

    result.current.mutate({ userId: 'user-1', type: 'adaptive' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(mockGenerateExercise).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'adaptive'
    });
  });
});
```

## Quick Reference Commands

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests without coverage (faster)
npm test -- --no-coverage

# Run tests in watch mode
npm test -- --watch

# Run tests with random order (check isolation)
npm test -- --sequence.shuffle

# Search for async patterns
grep -n 'async' test-file.test.ts

# Search for promises
grep -n '\.then(' test-file.test.ts

# Find all test files
find . -name "*.test.ts" -o -name "*.test.tsx"
```

## Integration with AgentDB

### Storage
Store this skill in the skills collection with appropriate indexing:
```json
{
  "skillId": "test-timeout-fix",
  "version": "1.0.0",
  "tags": ["timeout", "async", "vitest", "jest", "mocking"],
  "searchable": true
}
```

### Retrieval
Query skills when timeout errors detected:
```typescript
const skill = await agentdb.skills.findOne({
  tags: { $in: ['timeout', 'async'] }
});
```

### Application
1. Detect timeout error in test output
2. Retrieve this skill from AgentDB
3. Follow diagnostic steps
4. Apply relevant fix patterns
5. Validate success criteria met
6. Update skill with new patterns discovered

---

**Last Updated:** 2025-12-03
**Author:** Research Agent
**Status:** Production Ready
