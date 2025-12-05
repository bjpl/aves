# GOAP Week 1 Execution Guide

## Overview

This guide provides step-by-step instructions for executing the first week of the GOAP plan, establishing the foundation for all subsequent work.

**Week 1 Goal**: Achieve +12.6 health points (46.83 → 59.43) in 15 hours

---

## Pre-Execution Checklist

### Environment Setup
- [ ] Git repository is clean (commit or stash all changes)
- [ ] All tests pass in current state: `npm test`
- [ ] Node version: >=20.0.0
- [ ] NPM version: >=9.0.0
- [ ] IDE/editor configured with TypeScript support
- [ ] ESLint extension enabled
- [ ] Prettier extension enabled

### Tooling Setup
- [ ] Install automation tools:
  ```bash
  npm install -g ts-migrate prettier jscodeshift
  ```
- [ ] Configure Git hooks:
  ```bash
  npm install husky lint-staged --save-dev
  npx husky install
  ```
- [ ] Set up test coverage tracking:
  ```bash
  npm install --save-dev @vitest/coverage-c8
  ```

### Team Coordination
- [ ] Assign Developer 1 (Backend)
- [ ] Assign Developer 2 (Frontend)
- [ ] Schedule Week 2 sync meeting (Friday)
- [ ] Create Slack/Teams channel for daily updates
- [ ] Set up shared project board (GitHub Projects/Jira)

---

## Day 1 (Monday): Foundation - 3 hours

### Task 1.1: Fix PatternLearner DI (A1) - 2 hours
**Developer**: Backend specialist
**Priority**: Critical (unblocks testing)

#### Steps:
1. **Read current implementation**:
   ```bash
   cat backend/src/services/PatternLearner.ts | head -100
   ```

2. **Identify DI issue**:
   - PatternLearner is likely a singleton with hard dependencies
   - Need to extract dependencies as constructor parameters
   - Enable dependency injection for testing

3. **Refactor approach**:
   ```typescript
   // Before (problematic)
   class PatternLearner {
     private db = getConnection();
     private logger = createLogger();
   }

   // After (testable)
   class PatternLearner {
     constructor(
       private db: DatabaseConnection,
       private logger: Logger
     ) {}
   }
   ```

4. **Implementation**:
   ```bash
   # Create backup
   cp backend/src/services/PatternLearner.ts backend/src/services/PatternLearner.ts.backup

   # Open in editor and refactor
   code backend/src/services/PatternLearner.ts
   ```

5. **Update tests**:
   ```bash
   # Verify test now works with mocks
   npm test -- backend/tests/services/PatternLearner.test.ts
   ```

6. **Commit**:
   ```bash
   git add backend/src/services/PatternLearner.ts backend/tests/services/PatternLearner.test.ts
   git commit -m "fix: enable dependency injection in PatternLearner for testability

   - Extract database and logger as constructor parameters
   - Enable mock injection in tests
   - Unblocks 20+ dependent tests

   GOAP: A1 (+2 health)"
   ```

**Expected Outcome**:
- ✅ PatternLearner accepts dependencies via constructor
- ✅ Tests can inject mocks
- ✅ 20+ tests now pass
- ✅ Health: +2 points

---

### Task 1.2: Write DI Strategy ADR (A6.1) - 1 hour
**Developer**: Backend specialist (while context is fresh)
**Priority**: Medium (documents pattern for team)

#### Steps:
1. **Create ADR file**:
   ```bash
   mkdir -p docs/architecture/decisions
   touch docs/architecture/decisions/001-dependency-injection-strategy.md
   ```

2. **ADR Template**:
   ```markdown
   # ADR-001: Dependency Injection Strategy

   Date: 2025-12-04
   Status: Accepted

   ## Context
   AVES services have hard-coded dependencies, making testing difficult.
   PatternLearner required 2 hours to refactor for testability.

   ## Decision
   All services will use constructor-based dependency injection:
   - Database connections as constructor parameters
   - Loggers as constructor parameters
   - External services as constructor parameters

   ## Consequences
   - Positive: Services are testable with mocks
   - Positive: Easier to swap implementations
   - Negative: Requires refactoring existing services (estimated 10 files)
   - Mitigation: Refactor incrementally during decomposition phases

   ## Implementation
   See PatternLearner.ts for reference implementation.
   ```

3. **Commit**:
   ```bash
   git add docs/architecture/decisions/001-dependency-injection-strategy.md
   git commit -m "docs: add ADR for dependency injection strategy

   GOAP: A6.1 (+0.3 health)"
   ```

**Expected Outcome**:
- ✅ Team understands DI pattern
- ✅ Future refactors follow consistent approach
- ✅ Health: +0.3 points

---

## Day 2 (Tuesday): Type Safety Quick Wins - 6 hours

### Task 2.1: Fix Test Fixture Types (A3.4) - 6 hours
**Developer**: Frontend specialist
**Priority**: High (best ROI - 1.67 health/hour)

#### Steps:
1. **Identify any types in test fixtures**:
   ```bash
   grep -r ": any" frontend/src/__tests__ backend/src/__tests__ --include="*.ts" | wc -l
   # Expected: ~50 instances
   ```

2. **Automated conversion (where safe)**:
   ```bash
   # Use ts-migrate for mechanical conversions
   cd frontend/src/__tests__
   npx ts-migrate retype . --sources "**/*.ts"
   ```

3. **Manual fixes for complex types**:
   ```typescript
   // Before
   const mockUser: any = { id: 1, name: 'Test' };

   // After
   interface MockUser {
     id: number;
     name: string;
   }
   const mockUser: MockUser = { id: 1, name: 'Test' };
   ```

4. **Group by test module**:
   - Frontend service tests: 20 any types
   - Frontend component tests: 15 any types
   - Backend route tests: 10 any types
   - Backend service tests: 5 any types

5. **Fix incrementally by module**:
   ```bash
   # Frontend services first
   code frontend/src/__tests__/services/

   # After fixing each file, verify tests pass
   npm test -- frontend/src/__tests__/services/aiExerciseService.test.ts
   ```

6. **Commit after each module**:
   ```bash
   git add frontend/src/__tests__/services/
   git commit -m "fix: eliminate 20 any types from frontend service tests

   - Define proper mock interfaces
   - Use TypeScript type inference where possible
   - All tests still pass

   GOAP: A3.4 partial (20/50 types fixed, +4 health)"
   ```

7. **Repeat for remaining modules**:
   - Component tests (15 types) - 1.5 hours
   - Backend tests (15 types) - 1.5 hours

**Expected Outcome**:
- ✅ 50 any types eliminated from test files
- ✅ All tests still pass
- ✅ Health: +10 points

---

## Day 3 (Wednesday): Documentation - 2 hours

### Task 3.1: Write Service Decomposition ADR (A6.2) - 1 hour
**Developer**: Backend specialist
**Priority**: Medium (guides Phase 2 work)

#### Steps:
1. **Create ADR**:
   ```bash
   touch docs/architecture/decisions/002-service-decomposition-strategy.md
   ```

2. **ADR Content**:
   ```markdown
   # ADR-002: Service Decomposition Strategy

   Date: 2025-12-04
   Status: Accepted

   ## Context
   AVES has 60 "god files" over 500 lines, hindering maintainability.
   Two route files exceed 1800 lines each.

   ## Decision
   Decompose large files using domain-driven design:
   - Group related operations into bounded contexts
   - Extract validation logic into separate modules
   - Split routes by resource type
   - Maximum file size: 500 lines

   ## Decomposition Pattern
   For route files:
   1. Extract validation schemas → `validation/`
   2. Extract business logic → `services/`
   3. Split routes by resource → `routes/{resource}/`
   4. Create index file to maintain API contracts

   ## Target Files (Priority Order)
   1. adminImageManagement.ts (2879 lines) → 6 modules
   2. aiAnnotations.ts (1839 lines) → 4 modules
   3. PatternLearner.ts (1279 lines) → 3 modules

   ## Success Criteria
   - All files under 500 lines
   - Each module has single responsibility
   - API contracts maintained (no breaking changes)
   ```

3. **Commit**:
   ```bash
   git add docs/architecture/decisions/002-service-decomposition-strategy.md
   git commit -m "docs: add ADR for service decomposition strategy

   GOAP: A6.2 (+0.3 health)"
   ```

**Expected Outcome**:
- ✅ Clear strategy for Phase 2 decomposition
- ✅ Team aligned on approach
- ✅ Health: +0.3 points

---

### Task 3.2: Sync and Planning - 1 hour
**Developers**: Both (pair session)

#### Agenda:
1. **Review Week 1 progress** (15 min):
   - Demo PatternLearner DI fix
   - Demo type safety improvements
   - Review ADRs

2. **Plan Day 4-5** (15 min):
   - Identify next targets
   - Assign tasks
   - Set expectations

3. **Identify blockers** (15 min):
   - Any unexpected issues?
   - Need to adjust plan?

4. **Update project board** (15 min):
   - Move completed tasks to "Done"
   - Create cards for Day 4-5

---

## Day 4 (Thursday): Service Decomposition - 4 hours

### Task 4.1: Decompose aiExerciseGenerator (A2.1) - 4 hours
**Developer**: Backend specialist
**Priority**: Medium (unblocks Phase 2)

#### Steps:
1. **Analyze file structure**:
   ```bash
   wc -l backend/src/services/aiExerciseGenerator.ts
   # Expected: 907 lines
   ```

2. **Identify modules** (read file, take notes):
   - Prompt generation (~200 lines)
   - Exercise validation (~150 lines)
   - AI integration (~200 lines)
   - Cache management (~150 lines)
   - Type definitions (~100 lines)
   - Utilities (~100 lines)

3. **Create extraction plan**:
   ```
   aiExerciseGenerator.ts (907 lines)
     → prompts/exercisePromptGenerator.ts (200 lines)
     → validation/exerciseValidator.ts (150 lines)
     → integration/aiServiceClient.ts (200 lines)
     → cache/exerciseCacheManager.ts (150 lines)
     → types/exercise.types.ts (100 lines)
     → utils/exerciseUtils.ts (100 lines)
     → aiExerciseGenerator.ts (core logic, 150 lines)
   ```

4. **Extract incrementally** (test after each extraction):
   ```bash
   # Step 1: Extract types
   mkdir -p backend/src/types
   # Move type definitions to backend/src/types/exercise.types.ts
   npm test -- backend/src/__tests__/services/aiExerciseGenerator.test.ts

   # Step 2: Extract utilities
   mkdir -p backend/src/utils
   # Move utility functions to backend/src/utils/exerciseUtils.ts
   npm test -- backend/src/__tests__/services/aiExerciseGenerator.test.ts

   # Step 3: Extract validation
   mkdir -p backend/src/validation
   # Move validation logic to backend/src/validation/exerciseValidator.ts
   npm test -- backend/src/__tests__/services/aiExerciseGenerator.test.ts

   # Continue for remaining modules...
   ```

5. **Commit after each module**:
   ```bash
   git add backend/src/types/exercise.types.ts backend/src/services/aiExerciseGenerator.ts
   git commit -m "refactor: extract exercise type definitions from aiExerciseGenerator

   - Move types to dedicated file for reusability
   - No functional changes
   - All tests pass

   GOAP: A2.1 partial (1/6 modules extracted)"
   ```

6. **Final verification**:
   ```bash
   # All tests still pass
   npm test

   # File is now under 500 lines
   wc -l backend/src/services/aiExerciseGenerator.ts
   # Expected: ~150 lines
   ```

7. **Final commit**:
   ```bash
   git commit -m "refactor: complete aiExerciseGenerator decomposition

   - Extracted 6 modules (prompts, validation, integration, cache, types, utils)
   - Core service reduced from 907 to 150 lines
   - All tests pass (0 failures)
   - Improved maintainability and testability

   GOAP: A2.1 complete (-1 god file, +0.8 health)"
   ```

**Expected Outcome**:
- ✅ 1 god file eliminated
- ✅ 6 new focused modules created
- ✅ All tests still pass
- ✅ Health: +0.8 points

---

## Day 5 (Friday): Review and Week 2 Planning - 0 hours (async)

### Morning: Final verification
```bash
# Run full test suite
npm test

# Check health score improvement
# Expected: 46.83 → 59.43 (+12.6 points)

# Verify no regressions
npm run lint
npm run typecheck
```

### Afternoon: Week 2 Planning Session
**Duration**: 1 hour
**Participants**: Both developers

#### Agenda:
1. **Week 1 Retrospective** (20 min):
   - What went well?
   - What didn't go well?
   - Lessons learned
   - Adjustments for Week 2

2. **Week 2 Preview** (20 min):
   - Review Task: A2.2 (Decompose PatternLearner, 6h)
   - Assign ownership
   - Identify dependencies
   - Set checkpoint times

3. **Blockers and Risks** (10 min):
   - Any technical debt discovered?
   - Timeline still realistic?
   - Resource constraints?

4. **Documentation Update** (10 min):
   - Update progress in GOAP plan documents
   - Note any deviations from plan
   - Update project board

---

## Week 1 Success Metrics

### Quantitative Targets
- [x] Health Score: 46.83 → 59.43 (+12.6 points)
- [x] God Files: 60 → 59 (-1 file)
- [x] Any Types: 236 → 186 (-50 types)
- [x] Tests Passing: Same or improved
- [x] Time Spent: 15 hours

### Qualitative Targets
- [x] PatternLearner is testable with mocks
- [x] Team understands DI and decomposition patterns
- [x] Test fixtures are type-safe
- [x] ADRs provide clear guidance for Phase 2

---

## Common Issues & Solutions

### Issue 1: Tests fail after PatternLearner refactor
**Symptom**: Tests that previously passed now fail with "Cannot read property of undefined"
**Solution**:
```typescript
// Ensure all dependencies are injected in tests
const mockDb = { query: jest.fn() };
const mockLogger = { info: jest.fn(), error: jest.fn() };
const learner = new PatternLearner(mockDb, mockLogger);
```

### Issue 2: Type inference fails in test fixtures
**Symptom**: TypeScript can't infer types even after removing any
**Solution**:
```typescript
// Use explicit type annotations
const mockResponse: AxiosResponse<UserData> = {
  data: { id: 1, name: 'Test' },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any // OK in test setup
};
```

### Issue 3: aiExerciseGenerator tests break during extraction
**Symptom**: Tests fail after extracting a module
**Solution**:
```bash
# Revert the last extraction
git revert HEAD

# Extract smaller pieces
# Fix tests incrementally
# Commit more frequently
```

### Issue 4: Week 1 takes longer than 15 hours
**Contingency**:
- A3.4 can spill into Week 2 (low risk)
- A2.1 is most time-consuming (allow 6 hours if needed)
- Adjust Week 2 plan accordingly

---

## Week 1 Deliverables Checklist

### Code Changes
- [ ] `backend/src/services/PatternLearner.ts` refactored for DI
- [ ] `backend/tests/services/PatternLearner.test.ts` uses dependency injection
- [ ] `frontend/src/__tests__/` - 20 any types eliminated
- [ ] `backend/src/__tests__/` - 30 any types eliminated
- [ ] `backend/src/services/aiExerciseGenerator.ts` decomposed to 6 modules

### Documentation
- [ ] `docs/architecture/decisions/001-dependency-injection-strategy.md` created
- [ ] `docs/architecture/decisions/002-service-decomposition-strategy.md` created

### Git Commits
- [ ] At least 8 commits (one per major change)
- [ ] All commit messages follow GOAP format
- [ ] No commits with "WIP" or "temp"

### Verification
- [ ] All tests pass: `npm test`
- [ ] No lint errors: `npm run lint`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Health score tracked and improved

### Team Coordination
- [ ] Daily updates posted in team channel
- [ ] Week 2 planning session scheduled
- [ ] Project board updated
- [ ] Any blockers documented

---

## Next Steps

After completing Week 1:
1. Review Week 2 plan in main GOAP document
2. Begin A2.2 (Decompose PatternLearner, 6 hours)
3. Continue type safety improvements
4. Maintain daily standup cadence

**Week 2 Preview**:
- Complete foundation phase
- Begin planning Phase 2 (route decomposition)
- Target: +4.2 additional health points

---

## References

- Main GOAP Plan: `docs/goap-plan-analysis.md`
- Execution Comparison: `docs/goap-execution-comparison.md`
- Cost-Benefit Analysis: `docs/goap-cost-benefit-analysis.md`
- Action Matrix: `docs/goap-action-matrix.csv`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-04
**Author**: GOAP Specialist (Week 1 Execution Guide)
