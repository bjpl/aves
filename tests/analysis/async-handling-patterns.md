# Async Handling Patterns Analysis

## Overview
Analysis of asynchronous test patterns across the AVES test suite, focusing on `waitFor`, `findBy*`, `act`, and async/await usage.

**Analysis Date**: 2025-10-16
**Files Analyzed**: 53 (component + hook tests)
**Framework**: Vitest + React Testing Library

---

## Async Utility Usage Patterns

### 1. waitFor Pattern

#### Usage Frequency
**Found in**: 45 of 53 test files
**Total Uses**: 226 occurrences

#### Pattern A: State Flag Checking (Most Common)
**Example**: `useAIAnnotations.test.ts`, `useProgressQuery.test.ts`

```typescript
const { result } = renderHook(() => useAIAnnotations(), {
  wrapper: createWrapper(),
});

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

expect(result.current.data).toEqual(mockAnnotations);
```

**Characteristics**:
- Wait for state flag (`isSuccess`, `isError`, `isLoading`)
- Assertion after `waitFor` completes
- Separates waiting from verification

**Advantages**:
- Clear intent
- Predictable timing
- Safe for React Query state

**Disadvantages**:
- Two-step assertion pattern
- Slightly verbose

**Usage**: ~70% of all `waitFor` calls

#### Pattern B: Direct Data Assertion
**Example**: Some component tests

```typescript
await waitFor(() => {
  expect(screen.getByText('Data Loaded')).toBeInTheDocument();
});
```

**Characteristics**:
- Assertion inside `waitFor`
- Single-step verification
- Implicit state checking

**Advantages**:
- Concise
- Single assertion point

**Disadvantages**:
- Can hide timing issues
- Less explicit about what's being waited for

**Usage**: ~30% of `waitFor` calls

#### Pattern C: Multiple Assertions in waitFor
**Example**: Complex state verification

```typescript
await waitFor(() => {
  expect(result.current.data).toBeDefined();
  expect(result.current.data?.length).toBeGreaterThan(0);
  expect(result.current.isSuccess).toBe(true);
});
```

**Issue**: If first assertion fails, subsequent ones never run
**Anti-Pattern**: Should be avoided

**Usage**: Found in ~5 test files

---

### 2. findBy* Queries

#### Usage Frequency
**Found in**: 18 of 53 files
**Total Uses**: 45 occurrences

#### Pattern: Async Element Finding
**Example**: Component rendering tests

```typescript
// Wait for element to appear
const button = await screen.findByRole('button', { name: /submit/i });
expect(button).toBeInTheDocument();
```

**Characteristics**:
- Built-in waiting (up to 1000ms default)
- Returns element or throws
- Combines `waitFor` + `getBy`

**Advantages**:
- Concise for element appearance tests
- No explicit `waitFor` needed
- Clear semantic intent

**Common Uses**:
- Waiting for components to render after data load
- Waiting for async error/success messages
- Waiting for modals/dialogs to appear

**Comparison to getBy + waitFor**:
```typescript
// Using findBy (concise)
const element = await screen.findByText('Loaded');

// Using getBy + waitFor (verbose)
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

**Recommendation**: Prefer `findBy*` for element appearance tests

---

### 3. act() Usage

#### Usage Frequency
**Found in**: Minimal (3 files)
**Total Uses**: 6 occurrences

#### Pattern: Explicit act() Wrapping
**Example**: State update testing

```typescript
act(() => {
  result.current.setState(newState);
});

await waitFor(() => {
  expect(result.current.state).toEqual(newState);
});
```

**Current State**: Rarely needed with modern React Testing Library

**Why Low Usage**:
- `renderHook` and `render` auto-wrap in `act`
- `waitFor` auto-wraps in `act`
- User events (`userEvent.click()`) auto-wrap

**When Actually Needed**:
- Direct state updates outside RTL utilities
- Testing custom hooks with synchronous state changes
- Timer-based updates (with `vi.useFakeTimers()`)

**Example of Unnecessary act()**:
```typescript
// ❌ Unnecessary - userEvent already wraps in act
await act(async () => {
  await userEvent.click(button);
});

// ✅ Correct - userEvent handles act internally
await userEvent.click(button);
```

**Recommendation**: Only use `act()` when RTL doesn't handle it

---

### 4. async/await Patterns

#### Pattern A: Hook Testing with Async Data
**Example**: All React Query hook tests

```typescript
describe('useAIAnnotations', () => {
  it('should fetch annotations', async () => {
    mockAxios.get.mockResolvedValueOnce({ data: { data: mockData } });

    const { result } = renderHook(() => useAIAnnotations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
```

**Characteristics**:
- Test function marked `async`
- `await waitFor()` for state changes
- Mock resolved before hook render

**Usage**: 95% of hook tests

#### Pattern B: User Interaction Testing
**Example**: Component interaction tests

```typescript
it('should handle answer submission', async () => {
  const user = userEvent.setup();
  render(<AIExerciseContainer userId="user-123" />);

  const answerButton = screen.getByText('Answer');
  await user.click(answerButton);

  await waitFor(() => {
    expect(screen.getByText(/Correct/i)).toBeInTheDocument();
  });
});
```

**Characteristics**:
- Setup `userEvent` instance
- `await` user interactions
- `await waitFor()` for DOM updates

**Usage**: All component interaction tests

#### Pattern C: Sequential Async Operations
**Example**: Multi-step flows

```typescript
it('should generate new exercise when next button clicked', async () => {
  const user = userEvent.setup();
  render(<AIExerciseContainer userId="user-123" />);

  mockGenerateExercise.mockClear();

  const nextButton = screen.getByText(/Skip Exercise/i);
  await user.click(nextButton);

  expect(mockGenerateExercise).toHaveBeenCalled();
});
```

**Pattern**: Clear mock, interact, verify

---

## Timing and Race Condition Patterns

### 1. waitFor Timeout Configuration
**Default**: 1000ms

#### Custom Timeouts Found
**Rare**: Only 2 test files use custom timeouts

```typescript
await waitFor(
  () => {
    expect(result.current.data).toBeDefined();
  },
  { timeout: 3000 }
);
```

**When Used**:
- Slow API responses
- Complex component rendering
- Multiple async operations

**Recommendation**: Use sparingly, investigate why default isn't sufficient

---

### 2. Polling Interval Configuration
**Default**: 50ms

#### Custom Intervals
**Not Found**: No tests customize polling interval

```typescript
// Potential use case (not currently used)
await waitFor(
  () => expect(result.current.isSuccess).toBe(true),
  { interval: 100 }
);
```

**Recommendation**: Keep default for consistency

---

### 3. Race Condition Prevention

#### Pattern A: Sequential waitFor Calls
**Example**: Testing state transitions

```typescript
// First async operation
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});

// Second dependent check
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

**Issue**: Overly cautious, can slow tests

**Better Approach**:
```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data).toBeDefined();
});
```

#### Pattern B: Avoiding Race with findBy
**Good Pattern**:

```typescript
// Wait for element to appear
const successMessage = await screen.findByText(/success/i);
expect(successMessage).toBeInTheDocument();
```

**Bad Pattern**:
```typescript
// Can fail if timing is off
const successMessage = screen.getByText(/success/i);
expect(successMessage).toBeInTheDocument();
```

---

## Testing Library Query Patterns

### Synchronous Queries (getBy*, queryBy*, getAllBy*)

#### getBy* Usage
**When Used**: Element guaranteed to be present

```typescript
// After waitFor confirms data loaded
await waitFor(() => expect(result.current.isSuccess).toBe(true));

const title = screen.getByRole('heading', { name: /title/i });
expect(title).toBeInTheDocument();
```

**Advantage**: Throws if not found (catches bugs)

#### queryBy* Usage
**When Used**: Testing element absence

```typescript
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
```

**Advantage**: Returns null instead of throwing

**Common Use**: Conditional rendering tests

---

### Async Queries (findBy*, findAllBy*)

#### findBy* Usage
**When Used**: Waiting for async element appearance

```typescript
const loadedData = await screen.findByText('Data Loaded');
expect(loadedData).toBeInTheDocument();
```

**Characteristics**:
- Retries for 1000ms (default)
- Throws if not found after timeout
- Combines `waitFor` + `getBy`

**Usage Patterns**:
- Component mount with async data (60%)
- User interaction results (30%)
- Error/success message appearance (10%)

---

## Identified Issues and Anti-Patterns

### 1. Redundant waitFor Usage

#### Anti-Pattern A: waitFor + findBy
**Example**:
```typescript
// ❌ Redundant - findBy already waits
await waitFor(async () => {
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});

// ✅ Correct
const element = await screen.findByText('Loaded');
expect(element).toBeInTheDocument();
```

**Found In**: 3 test files

---

### 2. Premature Assertions

#### Anti-Pattern B: Assertion Before Async Completion
**Example**:
```typescript
// ❌ May pass/fail randomly
const { result } = renderHook(() => useQuery());
expect(result.current.isSuccess).toBe(false); // Might already be true
```

**Fix**: Always wait for stable state
```typescript
// ✅ Correct
const { result } = renderHook(() => useQuery());
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

**Found In**: 5 test files (potential race conditions)

---

### 3. Missing Async/Await

#### Anti-Pattern C: Forgetting await on User Events
**Example**:
```typescript
// ❌ Missing await - test continues before click completes
const user = userEvent.setup();
user.click(button); // Should be awaited
expect(mockFn).toHaveBeenCalled(); // May fail
```

**Fix**:
```typescript
// ✅ Correct
await user.click(button);
expect(mockFn).toHaveBeenCalled();
```

**Found In**: Rare (1-2 files) - but critical when it happens

---

### 4. Overly Broad waitFor Conditions

#### Anti-Pattern D: Waiting for Wrong Condition
**Example**:
```typescript
// ❌ Might succeed before query actually completes
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

**Better**:
```typescript
// ✅ More specific - ensures query completed successfully
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
expect(result.current.data).toBeDefined();
```

**Found In**: ~10 test files

---

## Best Practices Observed

### 1. userEvent Setup Pattern
**Consistent Pattern** across all component tests:

```typescript
it('should handle interaction', async () => {
  const user = userEvent.setup();
  render(<Component />);

  await user.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

**Why Good**:
- `userEvent.setup()` ensures proper timing
- All interactions awaited
- DOM changes verified with `waitFor`

---

### 2. State Flag Verification
**Pattern**: Check React Query flags before data

```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

expect(result.current.data).toHaveLength(3);
expect(result.current.error).toBeNull();
```

**Why Good**:
- Confirms query completed
- Safe to access data
- Explicit success verification

---

### 3. Mock Setup Before Rendering
**Pattern**: Set up mocks before component/hook render

```typescript
it('should load data', async () => {
  // Mock FIRST
  mockAxios.get.mockResolvedValueOnce({ data: mockData });

  // Render SECOND
  const { result } = renderHook(() => useQuery());

  // Wait THIRD
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});
```

**Why Good**:
- Prevents race conditions
- Mock ready when hook queries
- Predictable test behavior

---

## Coverage Gaps

### Areas Well-Covered
- ✅ Basic async data fetching
- ✅ User interaction timing
- ✅ Loading/success/error states
- ✅ Component re-rendering

### Areas Under-Covered
- ❌ Timeout handling (no tests verify timeout behavior)
- ❌ Concurrent async operations (minimal testing)
- ❌ Request cancellation (no tests)
- ❌ Debounced/throttled operations (no tests)
- ❌ WebSocket/SSE patterns (not applicable, but if added)
- ❌ Animation completion waiting (minimal)

---

## Performance Considerations

### Test Execution Speed
**Average Test Duration**:
- Hook tests: 50-100ms
- Component tests: 100-300ms
- Integration tests: 300-1000ms

### Optimization Opportunities

1. **Reduce Unnecessary waitFor Calls**
   - Replace `waitFor` + `getBy` with `findBy`
   - Combine multiple `waitFor` calls when safe

2. **Optimize Query Client Config**
   - `gcTime: 0` prevents cache persistence ✅
   - `retry: false` speeds up error tests ✅
   - `staleTime: 0` ensures fresh queries ✅

3. **Parallel Test Execution**
   - Tests properly isolated ✅
   - No shared state between tests ✅
   - Can run in parallel safely ✅

---

## Recommendations

### Short-Term Improvements

1. **Standardize waitFor Usage**
   - Create guideline: "Wait for state flags, then assert data"
   - Audit redundant `waitFor` + `findBy` patterns

2. **Enforce async/await**
   - ESLint rule: Require `await` on `userEvent` calls
   - ESLint rule: Require `await` on `waitFor` calls

3. **Replace Anti-Patterns**
   - Migrate `waitFor` + `getBy` to `findBy`
   - Remove unnecessary `act()` wrappers

### Long-Term Refactoring

1. **Create Async Test Utilities**
   ```typescript
   const waitForQuerySuccess = async (result: any) => {
     await waitFor(() => {
       expect(result.current.isSuccess).toBe(true);
     });
   };

   const waitForQueryError = async (result: any) => {
     await waitFor(() => {
       expect(result.current.isError).toBe(true);
     });
   };
   ```

2. **Comprehensive Timeout Testing**
   - Add tests for query timeouts
   - Add tests for slow responses
   - Add tests for request cancellation

3. **Advanced Async Patterns**
   - Test concurrent queries
   - Test query dependencies
   - Test polling/refetch behaviors

---

## Statistics

- **Total Test Files**: 53
- **Files Using `waitFor`**: 45 (85%)
- **Files Using `findBy*`**: 18 (34%)
- **Files Using `act()`**: 3 (6%)
- **Total `waitFor` Calls**: 226
- **Total `findBy*` Calls**: 45
- **Tests Marked `async`**: 98% (all async tests)
- **Anti-Pattern Instances**: ~15 (mostly redundant patterns)

---

## Conclusion

Async handling in the AVES test suite is **generally well-implemented** with consistent patterns. Key improvements:

1. **Reduce redundant `waitFor` usage** by preferring `findBy*` queries
2. **Standardize state flag verification** before data assertions
3. **Audit and remove unnecessary `act()` calls**
4. **Fill coverage gaps** in timeout, cancellation, and concurrent operations
5. **Create async test utilities** for common patterns

These changes will improve test clarity, execution speed, and maintainability while reducing flakiness.
