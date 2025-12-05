# GOAP Plan Analysis - AVES Health Recovery

**Generated**: 2025-12-04
**Current Health Score**: 46.83/100
**Target Health Score**: 95/100
**Gap**: 48.17 points

---

## Executive Summary

This GOAP (Goal-Oriented Action Planning) analysis provides an optimal action sequence to transform AVES from its current state (46.83/100 health) to production-ready state (95/100 health). The plan identifies 60 god files, 236 `: any` types, and 163 test failures as primary blockers.

**Critical Finding**: The largest impediment is architectural debt in route files (`adminImageManagement.ts` at 2879 lines, `aiAnnotations.ts` at 1839 lines), which cascade into test failures and maintainability issues.

---

## 1. State Analysis

### Current State (Observed)
```yaml
metrics:
  health_score: 46.83/100
  test_pass_rate: 74% (163 failures out of ~220 tests)
  test_coverage: ~22% (estimated from limited test files)
  source_files: 336 TypeScript files
  god_files: 60 files over 500 lines
  any_types: 236 instances
  eslint_disabled: 0 (good - no disabled rules)
```

### Goal State (Desired)
```yaml
metrics:
  health_score: 95/100
  test_pass_rate: 100%
  test_coverage: 90%+
  source_files: 336+ (may increase with decomposition)
  god_files: 0
  any_types: 0
  eslint_strict: true
```

### State Gap Analysis
```
Health Gap:        48.17 points (103% improvement needed)
Test Failures:     163 tests to fix
Coverage Gap:      68% coverage to add
God Files:         60 files to decompose
Type Safety:       236 any types to eliminate
```

---

## 2. Available Actions with Preconditions & Effects

### Action Catalog

#### A1: fix_pattern_learner_di
**Type**: Foundation Fix
**Precondition**: None (currently blocked by dependency injection issue)
**Effect**:
- Enables test mocking for PatternLearner
- Unblocks ~20 dependent tests
- Health Score: +2 points

**Cost**: 2 hours (moderate complexity)

---

#### A2: decompose_god_file
**Type**: Refactoring
**Precondition**: File identified, tests exist or created
**Effect**:
- -1 god file
- +2-5 modular files
- Improved maintainability
- Health Score: +0.8 points per file

**Cost**: 1-4 hours per file (varies by size)

**Priority Targets** (by impact):
1. `adminImageManagement.ts` (2879 lines) - 12 hours
2. `aiAnnotations.ts` (1839 lines) - 8 hours
3. `PatternLearner.ts` (1279 lines) - 6 hours
4. `VectorExerciseService.ts` (913 lines) - 4 hours
5. `aiExerciseGenerator.ts` (907 lines) - 4 hours

---

#### A3: fix_any_type
**Type**: Type Safety Improvement
**Precondition**: Type definition available or can be inferred
**Effect**:
- -1 any type
- +type safety
- Health Score: +0.2 points

**Cost**: 0.5-2 hours per cluster (5-20 any types per cluster)

**Clustering Strategy**: Group by module to fix in batches
- Vision AI types: ~40 any types
- Route handlers: ~60 any types
- Test fixtures: ~50 any types
- Service layers: ~86 any types

---

#### A4: add_test
**Type**: Coverage Increase
**Precondition**: Code is testable (not in god file)
**Effect**:
- +coverage percentage
- Health Score: +0.5 points per 5% coverage

**Cost**: 1-3 hours per module

**Target Modules** (uncovered):
- Backend services: ~30% coverage
- Frontend components: ~15% coverage
- Integration flows: ~10% coverage

---

#### A5: enable_eslint_rule
**Type**: Quality Gate
**Precondition**: All violations for rule are fixed
**Effect**:
- +strictness
- Prevents regression
- Health Score: +1 point per major rule

**Cost**: 1-2 hours per rule (after violations fixed)

**Target Rules**:
- `@typescript-eslint/no-explicit-any`
- `max-lines-per-function`
- `complexity`
- `max-depth`

---

#### A6: write_adr
**Type**: Documentation
**Precondition**: Architecture decision has been made
**Effect**:
- +documentation completeness
- Health Score: +0.3 points

**Cost**: 1 hour per ADR

**Required ADRs** (7 identified):
1. Service decomposition strategy
2. Type safety migration path
3. Test architecture patterns
4. Frontend state management
5. Backend dependency injection
6. Vector database integration
7. AI model selection criteria

---

#### A7: fix_frontend_type_error
**Type**: Build Fix
**Precondition**: None
**Effect**:
- Reduces frontend type errors
- Enables stricter type checking
- Health Score: +0.5 points per major fix

**Cost**: 2-4 hours per module

**Target Modules**:
- Admin components (3 god files)
- Annotation components (7 god test files)
- Hook implementations (2 god files)

---

## 3. Action Sequence & Cost Matrix

### Phase 1: Foundation (Weeks 1-2) - CRITICAL PATH
**Goal**: Establish testability and unblock parallel work

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A1 | PatternLearner DI | 2h | Low | None | Enable mocking | +2 |
| A2.1 | Decompose aiExerciseGenerator | 4h | Medium | Tests | -1 god file | +0.8 |
| A2.2 | Decompose PatternLearner | 6h | High | A1 | -1 god file | +0.8 |
| A6.1 | ADR: DI Strategy | 1h | Low | None | Document pattern | +0.3 |
| A6.2 | ADR: Service Decomposition | 1h | Low | A2.1 | Document pattern | +0.3 |

**Phase 1 Totals**: 14 hours, +4.2 health, 2 god files fixed

---

### Phase 2: Route Decomposition (Weeks 3-6) - HIGH IMPACT
**Goal**: Break down mega-files blocking test coverage

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A2.3 | adminImageManagement.ts | 12h | High | Tests | -1 god file | +0.8 |
| A2.4 | aiAnnotations.ts | 8h | High | Tests | -1 god file | +0.8 |
| A2.5 | 8 Backend Services | 32h | Medium | A2.3-4 | -8 god files | +6.4 |
| A4.1 | Route module tests | 16h | Medium | A2.3-5 | +15% coverage | +1.5 |
| A3.1 | Route type safety | 8h | Low | A2.3-4 | -60 any types | +12 |

**Phase 2 Totals**: 76 hours, +21.5 health, 10 god files fixed, 60 any types fixed

---

### Phase 3: Frontend Refactoring (Weeks 7-10) - PARALLEL TRACK
**Goal**: Decompose frontend god files and add tests

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A2.6 | ImageManagementPage | 6h | Medium | Tests | -1 god file | +0.8 |
| A2.7 | ImageGalleryTab | 4h | Medium | Tests | -1 god file | +0.8 |
| A2.8 | MLAnalyticsDashboard | 4h | Medium | Tests | -1 god file | +0.8 |
| A2.9 | Admin components (3) | 12h | Medium | A2.6-8 | -3 god files | +2.4 |
| A7.1 | Frontend type fixes | 12h | Medium | A2.6-9 | Type safety | +1.5 |
| A4.2 | Component tests | 20h | Medium | A2.6-9 | +20% coverage | +2.0 |

**Phase 3 Totals**: 58 hours, +8.3 health, 6 god files fixed

---

### Phase 4: Test File Decomposition (Weeks 11-13) - QUALITY
**Goal**: Refactor god test files for maintainability

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A2.10 | 17 Frontend test files | 34h | Low | A2.6-9 | -17 god files | +13.6 |
| A2.11 | 9 Backend test files | 18h | Low | A2.3-5 | -9 god files | +7.2 |
| A4.3 | Integration tests | 16h | Medium | A2.10-11 | +25% coverage | +2.5 |

**Phase 4 Totals**: 68 hours, +23.3 health, 26 god files fixed

---

### Phase 5: Type Safety Sweep (Weeks 14-15) - CLEANUP
**Goal**: Eliminate remaining any types

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A3.2 | Vision AI types | 8h | Low | Phase 2 | -40 any types | +8 |
| A3.3 | Service layers | 12h | Medium | Phase 2 | -86 any types | +17.2 |
| A3.4 | Test fixtures | 6h | Low | Phase 4 | -50 any types | +10 |
| A5.1 | Enable no-explicit-any | 1h | Low | A3.1-4 | Enforce rule | +1 |

**Phase 5 Totals**: 27 hours, +36.2 health, 176 any types fixed

---

### Phase 6: Coverage & Documentation (Weeks 16-17) - POLISH
**Goal**: Achieve 90%+ coverage and complete ADRs

| Action | Target | Effort | Risk | Dependencies | Effect | Health Δ |
|--------|--------|--------|------|--------------|--------|----------|
| A4.4 | Backend edge cases | 12h | Low | All phases | +10% coverage | +1.0 |
| A4.5 | Frontend edge cases | 12h | Low | All phases | +10% coverage | +1.0 |
| A6.3-7 | Remaining 5 ADRs | 5h | Low | All phases | +documentation | +1.5 |
| A5.2-4 | Enable strict rules | 3h | Low | All phases | Enforce quality | +3 |

**Phase 6 Totals**: 32 hours, +6.5 health

---

## 4. Parallel Execution Opportunities

### Parallel Work Streams

**Stream A (Backend Focus)**:
- Weeks 1-2: Foundation (A1, A2.1-2)
- Weeks 3-6: Route decomposition (A2.3-5, A3.1)
- Weeks 11-13: Backend test decomposition (A2.11)
- Weeks 14-15: Backend type safety (A3.2-3)

**Stream B (Frontend Focus)**:
- Weeks 1-2: Planning and ADRs (A6.1-2)
- Weeks 7-10: Frontend decomposition (A2.6-9, A7.1)
- Weeks 11-13: Frontend test decomposition (A2.10)
- Weeks 14-15: Frontend type safety (A3.4)

**Stream C (Testing Focus)**:
- Weeks 3-6: Route tests (A4.1)
- Weeks 7-10: Component tests (A4.2)
- Weeks 11-13: Integration tests (A4.3)
- Weeks 16-17: Edge case coverage (A4.4-5)

**Convergence Points**:
- Week 6: Route decomposition complete
- Week 13: All god files decomposed
- Week 15: Type safety complete
- Week 17: 95/100 health achieved

---

## 5. Critical Path Analysis

### Critical Path (Cannot be parallelized)
```
A1 (Foundation)
  → A2.1-2 (Service decomposition)
  → A2.3-4 (Route decomposition)
  → A3.1 (Route type safety)
  → A4.1 (Route tests)
```

**Critical Path Duration**: 50 hours (6.25 days at 8h/day)

### Bottleneck: Route Decomposition
- `adminImageManagement.ts` (2879 lines) blocks:
  - Image management tests
  - Admin UI tests
  - Upload workflow tests
  - Job status tests
- **Mitigation**: Create facade pattern to enable parallel testing

### Dependency Chain
```
Foundation (Week 1-2)
  ├─→ Backend Routes (Week 3-6) ──→ Backend Tests (Week 11-13)
  └─→ Frontend Components (Week 7-10) ──→ Frontend Tests (Week 11-13)
        ↓
  Type Safety (Week 14-15)
        ↓
  Final Coverage (Week 16-17)
```

---

## 6. Risk Assessment & Contingencies

### High-Risk Actions

#### Risk 1: Route Decomposition Breaks Production
- **Action**: A2.3 (adminImageManagement.ts)
- **Probability**: Medium (30%)
- **Impact**: High (breaks admin features)
- **Mitigation**:
  1. Create comprehensive integration tests first (A4.1)
  2. Deploy facade pattern to maintain API contracts
  3. Use feature flags for gradual rollout
  4. Maintain 2-week rollback window

#### Risk 2: Type Safety Changes Break Builds
- **Action**: A3.1-4 (any type elimination)
- **Probability**: Low (15%)
- **Impact**: Medium (development slowdown)
- **Mitigation**:
  1. Fix types incrementally by module
  2. Use `@ts-expect-error` with TODO comments temporarily
  3. Validate builds after each module
  4. Maintain type definition documentation

#### Risk 3: Test Coverage Targets Missed
- **Action**: A4.1-5 (test additions)
- **Probability**: Medium (25%)
- **Impact**: Medium (delays Phase 6)
- **Mitigation**:
  1. Focus on critical path coverage first
  2. Use mutation testing to validate test quality
  3. Allow 85% coverage as acceptable fallback
  4. Extend timeline by 1 week if needed

---

## 7. Cost Summary

### Total Effort by Phase
```
Phase 1 (Foundation):          14 hours
Phase 2 (Backend Routes):      76 hours
Phase 3 (Frontend):            58 hours
Phase 4 (Test Decomposition):  68 hours
Phase 5 (Type Safety):         27 hours
Phase 6 (Coverage & Docs):     32 hours
────────────────────────────────────────
TOTAL:                        275 hours
```

### Timeline Options

**Option A: Single Developer (Conservative)**
- Hours/week: 20
- Duration: 13.75 weeks (~3.5 months)
- Risk: Low
- Cost: 275 hours

**Option B: Two Developers (Balanced)**
- Backend + Frontend streams in parallel
- Hours/week: 40 (20 each)
- Duration: 6.9 weeks (~1.75 months)
- Risk: Medium
- Cost: 275 hours

**Option C: Three Developers (Aggressive)**
- Backend + Frontend + Testing streams in parallel
- Hours/week: 60 (20 each)
- Duration: 4.6 weeks (~1 month)
- Risk: High (coordination overhead)
- Cost: 300 hours (coordination overhead)

**RECOMMENDED**: Option B (2 developers, 7 weeks)

---

## 8. Health Score Projection

### Current State: 46.83/100

**Phase 1**: 46.83 + 4.2 = **51.03/100** (Week 2)
**Phase 2**: 51.03 + 21.5 = **72.53/100** (Week 6)
**Phase 3**: 72.53 + 8.3 = **80.83/100** (Week 10)
**Phase 4**: 80.83 + 23.3 = **104.13/100** → cap at **95/100** (Week 13)

**Achievement**: Target met in Week 13 with buffer

### Confidence Intervals
- 90% confidence: 85-95 health score
- 50% confidence: 92-95 health score
- 10% confidence: 95+ health score

---

## 9. Success Metrics

### Key Performance Indicators

**Week 2 (Foundation)**:
- ✓ PatternLearner testable
- ✓ 2 god files eliminated
- ✓ Health > 51

**Week 6 (Backend Routes)**:
- ✓ 10 god files eliminated
- ✓ 60 any types fixed
- ✓ Health > 72

**Week 10 (Frontend)**:
- ✓ 16 god files eliminated
- ✓ Frontend type-safe
- ✓ Health > 80

**Week 13 (Test Quality)**:
- ✓ 42 god files eliminated
- ✓ 90%+ test coverage
- ✓ Health > 95

**Week 17 (Polish)**:
- ✓ 0 god files
- ✓ 0 any types
- ✓ Health = 95
- ✓ All ESLint strict rules enabled

---

## 10. Execution Recommendations

### Week 1 Actions (Start Immediately)
1. Fix PatternLearner DI (A1) - 2 hours
2. Decompose aiExerciseGenerator (A2.1) - 4 hours
3. Write DI Strategy ADR (A6.1) - 1 hour
4. Create integration test suite for routes (A4.1 prep) - 6 hours
5. Set up parallel CI pipelines - 2 hours

**Total Week 1**: 15 hours

### Critical Success Factors
1. **Maintain test coverage** during refactoring
2. **Document architectural decisions** as you go
3. **Deploy incrementally** behind feature flags
4. **Review code** at every module boundary
5. **Monitor health score** weekly

### Tools & Automation
- **ESLint autofix**: Use for type imports and formatting
- **TypeScript migration**: Use `ts-migrate` for bulk any removal
- **Test coverage**: Use `nyc`/`istanbul` for coverage tracking
- **Monitoring**: Implement `.swarm/metrics/` tracking scripts

---

## 11. Alternative Plans (Contingencies)

### Plan B: Incremental Improvement (If timeline slips)
**Target**: 75/100 health in 8 weeks
- Focus only on Phases 1-3
- Accept 20 god files remaining
- Accept 50 any types remaining
- Achieve 70% test coverage

### Plan C: Emergency Fix (If production issues arise)
**Target**: Stabilize at 60/100 in 3 weeks
- Fix only critical path (A1, A2.3-4)
- Add integration tests (A4.1)
- Document known issues
- Plan major refactor for Q2

---

## 12. Conclusion

**Optimal Path**: 2 developers, 7 weeks, 275 hours, 95/100 health

**Key Insights**:
1. Route decomposition (A2.3-4) is the primary bottleneck
2. Type safety (A3) provides highest ROI per hour
3. Test file decomposition (Phase 4) is low-risk and high-value
4. Parallel execution reduces timeline by 50%

**Next Steps**:
1. Review and approve this plan
2. Allocate 2 developers (1 backend, 1 frontend)
3. Execute Week 1 actions (15 hours)
4. Review progress at Week 2 checkpoint

---

**Plan Author**: GOAP Specialist (Claude Sonnet 4.5)
**Plan Version**: 1.0
**Last Updated**: 2025-12-04
