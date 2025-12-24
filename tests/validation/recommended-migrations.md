# Recommended Test Files for Initial Migration

## Tier 1: Immediate Migration (Phase 1 - Week 1)

### 🎯 Highest Priority: Service Tests

#### 1. exerciseGenerator.test.ts
**Location:** `frontend/src/__tests__/services/exerciseGenerator.test.ts`
**Lines:** 312
**Current State:** Good coverage, but verbose
**Migration Effort:** Medium (6 hours)
**Expected Improvement:** 35% boilerplate reduction

**Why Migrate First:**
- Pure functions, no external dependencies
- High test count (30+ tests)
- Core business logic
- Sets pattern for other service tests

**Current Issues:**
- Repetitive mock data setup
- Verbose assertions
- Duplicate test setup
- Known timing bug in ID generation

**Migration Benefits:**
- Factory functions for test data
- Cleaner assertion helpers
- Fix timing-based test failures
- Template for other generators

**Pattern Example:**
```typescript
// Before (current)
const mockAnnotations = [
  { id: '1', imageId: 'img1', spanishTerm: 'pico', ... },
  { id: '2', imageId: 'img1', spanishTerm: 'ala', ... },
  // 50+ lines of setup
];

// After (improved)
const annotations = createMockAnnotations(4, {
  imageId: 'img1',
  type: 'anatomical'
});
```

---

#### 2. VocabularyService.test.ts
**Location:** `backend/src/__tests__/services/VocabularyService.test.ts`
**Lines:** 183
**Current State:** Good structure, Jest mocks verbose
**Migration Effort:** Low (4 hours)
**Expected Improvement:** 40% boilerplate reduction

**Why Migrate First:**
- Database mock patterns reusable
- Clear test structure
- No UI dependencies
- Template for other backend services

**Current Issues:**
- Complex Jest mock setup
- Repetitive pool.query mocks
- JSON parsing tested redundantly

**Migration Benefits:**
- Simplified database mocking
- Reusable query mock helpers
- Better error handling tests
- Cleaner async patterns

**Pattern Example:**
```typescript
// Before
(mockPool.query as jest.Mock)
  .mockResolvedValueOnce({ rows: [] })
  .mockResolvedValueOnce({});

// After
mockDbQuery()
  .select([])
  .insert();
```

---

### 🔧 High Priority: Test Utilities

#### 3. Test Utility Files
**Location:** `frontend/src/test-utils/`
**Files:** 4 utility files
**Current State:** Exists but underutilized
**Migration Effort:** Low (3 hours)
**Expected Improvement:** Foundation for all other migrations

**Files to Enhance:**
- `react-query-test-utils.ts` - Excellent foundation
- `axios-mock-config.ts` - Needs expansion
- `async-test-helpers.ts` - Good patterns
- `index.ts` - Consolidate exports

**Why Migrate First:**
- Used by all other test files
- High leverage impact
- Low risk
- Quick wins

**Migration Benefits:**
- Centralized test patterns
- Better TypeScript support
- Chainable test builders
- Documented examples

---

## Tier 2: Quick Wins (Phase 1 - Week 1)

### 🎨 Simple UI Components

#### 4. Button.test.tsx
**Location:** `frontend/src/__tests__/components/ui/Button.test.tsx`
**Current State:** Simple, good coverage
**Migration Effort:** Very Low (2 hours)
**Expected Improvement:** 30% cleaner

**Why Migrate:**
- Simple component
- Pattern for other UI tests
- High visibility
- Quick validation

---

#### 5. Card.test.tsx
**Location:** `frontend/src/__tests__/components/ui/Card.test.tsx`
**Migration Effort:** Very Low (2 hours)
**Pattern:** Same as Button

---

### 🎣 Hook Tests

#### 6. useDisclosure.test.ts
**Location:** `frontend/src/__tests__/hooks/useDisclosure.test.ts`
**Current State:** Simple logic hook
**Migration Effort:** Low (3 hours)
**Expected Improvement:** 35% cleaner

**Why Migrate:**
- Simple hook pattern
- No async complexity
- Template for other hooks
- Fast to validate

---

## Tier 3: Medium Priority (Phase 2 - Week 2)

### 🎮 Complex Hooks

#### 7. useExercise.test.ts
**Location:** `frontend/src/__tests__/hooks/useExercise.test.ts`
**Lines:** 160
**Current State:** Good coverage, complex async
**Migration Effort:** Medium (5 hours)
**Expected Improvement:** 40% boilerplate reduction

**Why Migrate:**
- Core user interaction hook
- Complex async patterns
- High test value
- Needs better error messages

**Current Issues:**
- Verbose waitFor patterns
- Repetitive mock setup
- Complex state assertions

**Migration Benefits:**
- Custom hook test helpers
- Better async utilities
- Cleaner assertions
- Improved debugging

---

#### 8. useProgress.test.ts
**Location:** `frontend/src/__tests__/hooks/useProgress.test.ts`
**Pattern:** Similar to useExercise
**Migration Effort:** Medium (4 hours)

---

## Tier 4: Complex Components (Phase 2-3)

### 🎯 Exercise Components

#### 9. ExerciseContainer.test.tsx
**Location:** `frontend/src/__tests__/components/exercises/ExerciseContainer.test.tsx`
**Current State:** Complex integration
**Migration Effort:** High (8 hours)
**Risk:** Medium-High

**Why Migrate Later:**
- Complex state management
- Multiple dependencies
- Needs stable test utilities first
- High value but risky

---

#### 10. AnnotationCanvas.test.tsx
**Location:** `frontend/src/__tests__/components/annotations/AnnotationCanvas.test.tsx`
**Current State:** Very complex
**Migration Effort:** High (10 hours)
**Risk:** High

**Why Migrate Last:**
- Canvas rendering complexity
- Mouse event simulation
- Multiple integration points
- Needs all utilities stable

---

## Migration Priority Matrix

```
Priority │ Files                      │ Effort │ Risk │ Impact │ Order
─────────┼────────────────────────────┼────────┼──────┼────────┼──────
P0       │ Test Utilities             │ Low    │ Low  │ High   │ 1
P0       │ exerciseGenerator.test     │ Medium │ Low  │ High   │ 2
P0       │ VocabularyService.test     │ Low    │ Low  │ High   │ 3
P1       │ Button/Card UI tests       │ V.Low  │ Low  │ Medium │ 4
P1       │ useDisclosure.test         │ Low    │ Low  │ Medium │ 5
P2       │ useExercise.test           │ Medium │ Med  │ High   │ 6
P2       │ useProgress.test           │ Medium │ Med  │ Medium │ 7
P2       │ Other UI component tests   │ Low    │ Med  │ Medium │ 8
P3       │ ExerciseContainer.test     │ High   │ Med  │ High   │ 9
P3       │ Integration tests          │ High   │ High │ High   │ 10
P4       │ AnnotationCanvas.test      │ High   │ High │ Medium │ 11
```

## Success Criteria for Each File

### Must Pass:
✅ All existing tests pass
✅ No new console warnings
✅ Coverage maintained
✅ Test execution time ≤ same

### Should Achieve:
🎯 30%+ boilerplate reduction
🎯 Improved error messages
🎯 Better test descriptions
🎯 Reusable patterns documented

### Nice to Have:
⭐ Faster execution
⭐ Better IDE support
⭐ Enhanced debugging
⭐ Team feedback positive

## Weekly Goals

### Week 1: Foundation
- Migrate test utilities ✓
- Migrate 2 service tests ✓
- Migrate 2 simple UI tests ✓
- **Total: 4-6 files**

### Week 2: Hooks & UI
- Migrate 4 hook tests ✓
- Migrate 4 UI component tests ✓
- **Total: 8 files**

### Week 3: Complex Components
- Migrate 3 exercise components ✓
- Migrate 2 annotation components ✓
- **Total: 5 files**

### Week 4: Integration & E2E
- Migrate 3 integration tests ✓
- Migrate 2 E2E tests ✓
- Final documentation ✓
- **Total: 5 files + docs**

## Total Scope
- **Total Files:** 22-25 test files
- **Total Effort:** 60-70 hours
- **Timeline:** 4 weeks
- **Team Size:** 1-2 developers
