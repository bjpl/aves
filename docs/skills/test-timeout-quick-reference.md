# Test Timeout Fix - Quick Reference Card

⚡ **Quick diagnosis and fixes for test timeouts** - Keep this handy!

## 🚨 Is Your Test Timing Out?

### Quick Checklist (30 seconds)
1. ❓ Is it an async test? → Add `async` and `await waitFor()`
2. ❓ Using real APIs? → Mock with `vi.mock()`
3. ❓ Using timers? → Use `vi.useFakeTimers()`
4. ❓ React Query? → Clear cache with `gcTime: 0`
5. ❓ Has cleanup? → Add `afterEach(() => cleanup())`

## 🔧 Quick Fixes

### Fix 1: Async Not Awaited (Most Common)
```typescript
// ❌ BAD - Times out
it('test', () => {
  result.current.mutate(data);
  expect(result.current.data).toBe(value);
});

// ✅ GOOD - Works
it('test', async () => {
  result.current.mutate(data);
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  expect(result.current.data).toBe(value);
});
```

### Fix 2: Unmocked API
```typescript
// ❌ BAD - Real network call
import { apiService } from './service';

// ✅ GOOD - Mocked
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn()
}));

vi.mock('./service', () => ({
  apiService: { fetch: mockFn }
}));
```

### Fix 3: Missing Cleanup
```typescript
// ❌ BAD - No cleanup
describe('Tests', () => {
  it('test 1', () => { /* ... */ });
});

// ✅ GOOD - Cleanup added
describe('Tests', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('test 1', () => { /* ... */ });
});
```

### Fix 4: Real Timers
```typescript
// ❌ BAD - Real setTimeout
it('test', () => {
  setTimeout(callback, 5000); // Waits 5 seconds!
});

// ✅ GOOD - Fake timers
beforeEach(() => {
  vi.useFakeTimers();
});

it('test', () => {
  setTimeout(callback, 5000);
  vi.advanceTimersByTime(5000); // Instant!
});
```

### Fix 5: QueryClient Cache
```typescript
// ❌ BAD - Shared cache
const queryClient = new QueryClient();

// ✅ GOOD - Fresh cache per test
const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 }
    }
  });
  return ({ children }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};
```

## 📋 Copy-Paste Templates

### Complete Test Template
```typescript
// Hoist mocks
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn()
}));

vi.mock('../module', () => ({
  exportedFn: mockFn
}));

// Wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 }
    }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFn.mockResolvedValue(mockData);
  });

  afterEach(() => {
    cleanup();
  });

  it('works', async () => {
    const { result } = renderHook(() => useHook(), {
      wrapper: createWrapper()
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Timer Test Template
```typescript
describe('Timer Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('handles delay', () => {
    const callback = vi.fn();
    setTimeout(callback, 1000);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalled();
  });
});
```

## ⚙️ Config Settings

### vitest.config.ts
```typescript
export default defineConfig({
  test: {
    testTimeout: 30000,  // 30s max
    hookTimeout: 10000,  // 10s for hooks
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true    // Fresh context
      }
    }
  }
});
```

## 🎯 Success Checklist

After applying fixes:
- [ ] Tests complete in <5 seconds each
- [ ] No timeout errors
- [ ] Tests pass in random order
- [ ] No flaky failures
- [ ] Clean console (no warnings)

## 📊 Performance Targets

| Test Type | Target Time | Max Time |
|-----------|-------------|----------|
| Unit | <1s | 5s |
| Component | <2s | 10s |
| Integration | <5s | 30s |
| Full Suite | <30s | 120s |

## 🔍 Debugging Commands

```bash
# Run single test with full output
npm test -- path/to/test.test.ts --reporter=verbose

# Run without coverage (faster)
npm test -- --no-coverage

# Check test isolation
npm test -- --sequence.shuffle

# Find async patterns
grep -rn "async" src/__tests__/

# Find unmocked modules
grep -rn "import.*from" src/__tests__/ | grep -v "vi.mock"
```

## 🚫 Common Mistakes

1. **Forgetting `async`**
   ```typescript
   it('test', () => {  // ❌ Should be async
     await waitFor(...);
   });
   ```

2. **Not awaiting `waitFor`**
   ```typescript
   waitFor(() => {  // ❌ Missing await
     expect(...)
   });
   ```

3. **Mocking after import**
   ```typescript
   import { fn } from './module';
   vi.mock('./module');  // ❌ Too late!
   ```

4. **Shared QueryClient**
   ```typescript
   const client = new QueryClient();  // ❌ Used by all tests
   ```

5. **Real timers in tests**
   ```typescript
   setTimeout(..., 5000);  // ❌ Actually waits 5s
   ```

## 📞 Need More Help?

- Full documentation: `docs/skills/test-timeout-fix.md`
- Research analysis: `docs/research/test-timeout-analysis.md`
- Skill definition: `docs/skills/test-timeout-fix.json`

## 🎓 Learn More

- [Vitest API](https://vitest.dev/api/)
- [Testing Library](https://testing-library.com/docs/dom-testing-library/api-async/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

---

**Version:** 1.0.0 | **Last Updated:** 2025-12-03
**Print this and keep it near your keyboard!** 🖨️
