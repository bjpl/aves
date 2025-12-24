# Test Migration Strategy

## Overview
This document outlines the strategy for migrating tests to improved patterns with reduced boilerplate and better readability.

## Phase 1: Low-Risk, High-Impact Migrations (Week 1)

### Priority A: Test Utilities & Helpers
**Target Files:**
- `frontend/src/test-utils/react-query-test-utils.ts`
- `frontend/src/test-utils/axios-mock-config.ts`
- `frontend/src/test-utils/async-test-helpers.ts`

**Impact:** Foundation for all other migrations
**Risk:** Low - only helper functions
**Estimated Effort:** 4 hours

**Improvements:**
- Consolidate duplicate helper functions
- Add type safety to test utilities
- Create chainable test builders
- Document usage patterns

### Priority B: Service Tests (No UI Dependencies)
**Target Files:**
1. `frontend/src/__tests__/services/exerciseGenerator.test.ts` (312 lines)
2. `frontend/src/__tests__/services/clientDataService.test.ts`
3. `frontend/src/__tests__/services/apiAdapter.test.ts`
4. `backend/src/__tests__/services/VocabularyService.test.ts` (183 lines)
5. `backend/src/__tests__/services/ExerciseService.test.ts`

**Impact:** High - covers core business logic
**Risk:** Low - pure functions, minimal dependencies
**Estimated Effort:** 8 hours

**Pattern Improvements:**
```typescript
// Before
beforeEach(() => {
  vi.clearAllMocks();
  mockAxios.post.mockResolvedValue({ data: {} });
  mockAxios.get.mockResolvedValue({ data: {} });
});

// After
beforeEach(() => {
  resetMocks();
  mockApiResponses({ post: {}, get: {} });
});
```

### Priority C: Hook Tests
**Target Files:**
1. `frontend/src/__tests__/hooks/useExercise.test.ts` (160 lines)
2. `frontend/src/__tests__/hooks/useProgress.test.ts`
3. `frontend/src/__tests__/hooks/useSpecies.test.ts`
4. `frontend/src/__tests__/hooks/useDisclosure.test.ts`

**Impact:** Medium-High - critical user interactions
**Risk:** Medium - React hooks complexity
**Estimated Effort:** 6 hours

**Pattern Improvements:**
```typescript
// Before
const { result } = renderHook(() => useExercise());
await waitFor(() => {
  expect(result.current.sessionProgress.exercisesCompleted).toBe(1);
});

// After
const { session } = renderExerciseHook();
await expectSessionProgress(session, { exercisesCompleted: 1 });
```

## Phase 2: Medium-Risk Migrations (Week 2)

### Priority D: UI Component Tests (Simple)
**Target Files:**
1. `frontend/src/__tests__/components/ui/Button.test.tsx`
2. `frontend/src/__tests__/components/ui/Card.test.tsx`
3. `frontend/src/__tests__/components/ui/Modal.test.tsx`
4. `frontend/src/__tests__/components/ui/Input.test.tsx`

**Impact:** Medium - UI consistency
**Risk:** Medium - user interaction patterns
**Estimated Effort:** 8 hours

### Priority E: Component Tests (Complex)
**Target Files:**
1. `frontend/src/__tests__/components/exercises/ExerciseContainer.test.tsx`
2. `frontend/src/__tests__/components/annotations/AnnotationCanvas.test.tsx`
3. `frontend/src/__tests__/components/practice/ExerciseRenderer.test.tsx`

**Impact:** High - core user experience
**Risk:** High - complex state management
**Estimated Effort:** 12 hours

## Phase 3: Integration Tests (Week 3)

### Priority F: Backend Integration Tests
**Target Files:**
1. `backend/src/__tests__/integration/auth-flow.test.ts`
2. `backend/src/__tests__/integration/exercise-generation-flow.test.ts`
3. `backend/src/__tests__/integration/species-vocabulary-flow.test.ts`

**Impact:** Critical - end-to-end flows
**Risk:** High - database dependencies
**Estimated Effort:** 10 hours

**Improvements:**
- Add transaction rollback helpers
- Create test data factories
- Improve async error handling
- Add request/response logging

## Phase 4: E2E Tests (Week 4)

### Priority G: Playwright E2E Tests
**Target Files:**
1. `frontend/e2e/tests/smoke.spec.ts`
2. `frontend/e2e/tests/learning-flow.spec.ts`
3. `frontend/e2e/tests/practice-mode.spec.ts`

**Impact:** Medium - regression prevention
**Risk:** Low - isolated from other tests
**Estimated Effort:** 6 hours

## Test Pattern Templates

### 1. Service Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { createServiceTest } from '@/test-utils';

const { test, mock, assert } = createServiceTest(MyService);

describe('MyService', () => {
  test('should handle success', async () => {
    mock.api.success({ data: 'result' });
    const result = await service.method();
    assert.data(result, 'result');
  });
});
```

### 2. Hook Test Template
```typescript
import { renderHookTest } from '@/test-utils';

const { render, act, expect } = renderHookTest(useMyHook);

test('should update state', async () => {
  const hook = render({ initialValue: 0 });
  await act(() => hook.increment());
  expect.state(hook.value, 1);
});
```

### 3. Component Test Template
```typescript
import { renderComponentTest } from '@/test-utils';

const { render, user, screen, expect } = renderComponentTest(MyComponent);

test('should handle click', async () => {
  render({ onClick: vi.fn() });
  await user.click(screen.getByRole('button'));
  expect.called(onClick);
});
```

## Validation Process

### For Each Migration Batch:

1. **Pre-Migration Snapshot**
   ```bash
   npm run test -- --reporter=json > pre-migration.json
   npm run test -- --coverage > pre-coverage.json
   ```

2. **Execute Migration**
   - Apply new patterns
   - Update imports
   - Simplify boilerplate
   - Add comments

3. **Post-Migration Validation**
   ```bash
   npm run test -- --reporter=json > post-migration.json
   npm run test -- --coverage > post-coverage.json
   diff pre-migration.json post-migration.json
   ```

4. **Quality Checks**
   - All tests passing
   - Coverage maintained or improved
   - No console warnings
   - Execution time acceptable
   - Code review approved

5. **Documentation**
   - Update test examples
   - Document new patterns
   - Add migration notes
   - Update README

## Rollback Plan

If migration fails validation:
1. Revert changes via git
2. Document failure reason
3. Revise migration approach
4. Re-test in isolation
5. Try again with smaller scope

## Success Metrics

### Quantitative
- **Boilerplate Reduction:** 30-40% fewer lines
- **Test Execution:** Same or faster
- **Coverage:** Maintained at 85%+
- **Failures:** <2% regression rate

### Qualitative
- **Readability:** Improved by team vote
- **Maintainability:** Easier to update
- **Debuggability:** Clearer error messages
- **Consistency:** Standardized patterns

## Communication Plan

- **Daily:** Slack updates on progress
- **Weekly:** Demo new patterns
- **End of Phase:** Retrospective meeting
- **Final:** Documentation handoff

## Training & Adoption

1. **Week 1:** Share test utility documentation
2. **Week 2:** Pair programming sessions
3. **Week 3:** Team code review workshop
4. **Week 4:** Create test pattern cheat sheet

## Continuous Improvement

After migration:
- Collect team feedback
- Measure adoption rate
- Iterate on patterns
- Update documentation
- Share learnings
