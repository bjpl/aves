# GOAP Plan Visual Summary

## At a Glance: AVES Health Recovery

```
Current State              Goal State
┌─────────────┐           ┌─────────────┐
│ Health: 46  │  ──────>  │ Health: 95  │
│ Tests: 74%  │           │ Tests: 100% │
│ God: 60     │           │ God: 0      │
│ Any: 236    │           │ Any: 0      │
└─────────────┘           └─────────────┘
     7 weeks @ 2 developers
```

---

## Timeline Visualization

```
Week 1-2: Foundation (14h, +4.2 health)
■■□□□□□□□□□□□□□□□ 12%
├─ Fix PatternLearner DI (2h)
├─ Decompose services (10h)
└─ Write ADRs (2h)

Week 3-6: Backend Routes (76h, +21.5 health)
■■■■■■■■□□□□□□□□□ 45%
├─ adminImageManagement.ts (12h) [CRITICAL]
├─ aiAnnotations.ts (8h) [CRITICAL]
├─ 8 Backend services (32h)
├─ Route tests (16h)
└─ Route type safety (8h)

Week 7-10: Frontend (58h, +8.3 health)
■■■■■■■■■■□□□□□□□ 66%
├─ Decompose 6 components (30h)
├─ Frontend type fixes (12h)
└─ Component tests (20h)

Week 11-13: Test Quality (68h, +23.3 health)
■■■■■■■■■■■■□□□□□ 90%
├─ Frontend tests (34h)
├─ Backend tests (18h)
└─ Integration tests (16h)

Week 14-15: Type Safety (27h, +36.2 health)
■■■■■■■■■■■■■□□□□ 95%
├─ Vision AI types (8h)
├─ Service types (12h)
├─ Test fixtures (6h)
└─ Enable ESLint (1h)

Week 16-17: Polish (32h, +6.5 health)
■■■■■■■■■■■■■■■■■ 100%
├─ Edge cases (24h)
├─ Documentation (5h)
└─ Strict rules (3h)
```

---

## Health Score Progression

```
100 ┤                                        ┌─ Goal: 95
 90 ┤                                  ┌─────┘
 80 ┤                            ┌─────┘
 70 ┤                      ┌─────┘
 60 ┤               ┌──────┘
 50 ┤          ┌────┘
 40 ┤ ─────────┘ Current: 46.83
 30 ┤
 20 ┤
 10 ┤
  0 └┬────┬────┬────┬────┬────┬────┬────┬────┬
    W0   W2   W4   W6   W8  W10  W12  W14  W17

    Phase 1  Phase 2    Phase 3   Phase 4  Phase 5 P6
    Found.   Routes     Frontend  Tests    Types   Polish
```

---

## Resource Allocation (Strategy B - Recommended)

```
Developer 1 (Backend Focus)
Week 1-2   : ████████████ Foundation
Week 3-6   : ████████████████████ Route Decomposition
Week 7-10  : ████ (Assist Frontend)
Week 11-13 : ████████ Backend Test Decomposition
Week 14-15 : ████████ Backend Type Safety
Week 16-17 : ████ Backend Polish

Developer 2 (Frontend Focus)
Week 1-2   : ████ Documentation
Week 3-6   : ████ (Assist Backend)
Week 7-10  : ████████████████ Frontend Decomposition
Week 11-13 : ████████████████ Frontend Test Decomposition
Week 14-15 : ████ Frontend Type Safety
Week 16-17 : ████ Frontend Polish

Total Effort: 275 hours (137.5 hours each)
```

---

## Critical Path Diagram

```
                     ┌─────────────────┐
                     │  Current State  │
                     │   Health: 46    │
                     └────────┬────────┘
                              │
                    ┌─────────▼─────────┐
                    │ A1: Fix Pattern   │
                    │   Learner DI (2h) │ FOUNDATION
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────────┐ ┌───▼────────┐ ┌───▼────────┐
    │ A2.1: Decompose  │ │ A2.2: Pat. │ │ A6.1: ADR  │
    │ aiExercise (4h)  │ │ Learner(6h)│ │   DI (1h)  │
    └─────────┬────────┘ └─────┬──────┘ └────────────┘
              │                │
              └────────┬───────┘
                       │
         ┌─────────────▼──────────────┐
         │ A2.3: adminImageMgmt (12h) │ ⚠️ CRITICAL PATH
         └─────────────┬──────────────┘ ⚠️ BOTTLENECK
                       │
         ┌─────────────▼──────────────┐
         │ A2.4: aiAnnotations (8h)   │ ⚠️ CRITICAL PATH
         └─────────────┬──────────────┘
                       │
              ┌────────┴────────┐
              │                 │
    ┌─────────▼────────┐ ┌─────▼──────────┐
    │ A3.1: Route Type │ │ A2.5: Services │
    │   Safety (8h)    │ │     (32h)      │
    └─────────┬────────┘ └────────────────┘
              │
         [continues through phases 3-6]
              │
              ▼
    ┌────────────────────┐
    │   Goal State       │
    │   Health: 95       │
    └────────────────────┘
```

---

## ROI Heatmap (Health Points per Hour)

```
                ROI →
Type Safety    ████████████████ 1.57 h/hr  [HIGHEST]
PatternLearner ██████████ 1.00 h/hr
ADRs           ███ 0.30 h/hr
Test Decomp    ████ 0.40 h/hr
Service Decomp ██ 0.20 h/hr
Route Decomp   █ 0.08 h/hr             [FOUNDATION]
Test Coverage  █ 0.11 h/hr
```

**Insight**: Type safety provides 20x better ROI than route decomposition, but route decomposition must come first (precondition).

---

## Execution Strategy Comparison

```
Strategy A: 1 Developer
Timeline: ████████████████████████████ 14 weeks
Cost:     $$
Risk:     Low ■□□□□

Strategy B: 2 Developers ⭐ RECOMMENDED
Timeline: ██████████████ 7 weeks
Cost:     $$
Risk:     Medium ■■■□□

Strategy C: 3 Developers
Timeline: █████████ 5 weeks
Cost:     $$$
Risk:     High ■■■■□

Legend: █ = work in progress
```

---

## Action Categories

```
God File Decomposition (A2.x)
├─ Critical: adminImageManagement.ts (2879 lines)
├─ Critical: aiAnnotations.ts (1839 lines)
├─ High: PatternLearner.ts (1279 lines)
└─ 57 other files over 500 lines

Type Safety (A3.x, A5.x)
├─ Route types: 60 any types (8h)
├─ Service types: 86 any types (12h)
├─ Vision AI types: 40 any types (8h)
└─ Test fixtures: 50 any types (6h)

Test Coverage (A4.x)
├─ Route tests: +15% coverage (16h)
├─ Component tests: +20% coverage (20h)
├─ Integration tests: +25% coverage (16h)
└─ Edge cases: +20% coverage (24h)

Documentation (A6.x)
├─ DI Strategy ADR (1h)
├─ Service Decomposition ADR (1h)
└─ 5 additional ADRs (5h)
```

---

## Risk Matrix

```
           Impact →
           Low    Medium   High
         ┌──────┬────────┬──────┐
High   │ │      │ A2.3-4 │      │  A2.3-4: Route Decomp
Prob.  │ │      │   ⚠️    │      │  - 30% failure chance
       ├──────┼────────┼──────┤  - Breaks admin features
Medium │ │      │ A3.1-4 │      │  Mitigation: Integration
       │ │      │   ⚡    │      │  tests, feature flags
       ├──────┼────────┼──────┤
Low    │ │A6.x  │  A4.x  │      │  A3.1-4: Type Safety
       │ │ ✓   │   ✓    │      │  - 15% build breaks
       └──────┴────────┴──────┘  Mitigation: Incremental
```

---

## Parallel Execution Streams

```
Stream A (Backend)          Stream B (Frontend)       Stream C (Testing)
─────────────────────────   ──────────────────────   ───────────────────
Week 1-2:                   Week 1-2:                Week 1-2:
• PatternLearner DI         • Documentation          • Test infrastructure
• Service decomposition     • Setup                  • (Planning)

Week 3-6:                   Week 3-6:                Week 3-6:
• Route decomposition ⚠️    • (Assist backend)       • Route tests
• Backend services          •                        •
• Type safety               •                        •

Week 7-10:                  Week 7-10:               Week 7-10:
• (Assist frontend)         • Frontend components    • Component tests
•                           • Admin UI               •
•                           • Type fixes             •

Week 11-13:                 Week 11-13:              Week 11-13:
• Backend test decomp       • Frontend test decomp   • Integration tests
•                           •                        •

Week 14-15:                 Week 14-15:              Week 14-15:
• Backend type safety       • Frontend type safety   • (Validation)
• Service types             • Test fixtures          •

Week 16-17:                 Week 16-17:              Week 16-17:
• Edge cases                • Edge cases             • Final validation
• Strict rules              • Documentation          •
```

---

## Cost Breakdown

```
Phase          Hours   Cost ($100/hr)   Health Δ   $/Health
─────────────────────────────────────────────────────────────
Foundation      14      $1,400           +4.2       $333
Routes          76      $7,600           +21.5      $353
Frontend        58      $5,800           +8.3       $699
Test Decomp     68      $6,800           +23.3      $292
Type Safety     27      $2,700           +36.2      $75  ⭐ BEST
Polish          32      $3,200           +6.5       $492
─────────────────────────────────────────────────────────────
TOTAL          275     $27,500           +48.17     $571/pt
```

**Insight**: Type safety phase has best cost-per-health ($75) but requires foundation first.

---

## Phase Gates (Go/No-Go Decisions)

```
Gate 1 (Week 2):
✓ Health > 50                 [Go to Phase 2]
✓ PatternLearner testable     [Go to Phase 2]
✗ Health < 50                 [Extend Phase 1 +1 week]

Gate 2 (Week 6):
✓ Health > 70                 [Go to Phase 3]
✓ Routes < 500 lines          [Go to Phase 3]
✗ Health < 70                 [Major blocker - escalate]

Gate 3 (Week 10):
✓ Health > 80                 [Go to Phase 4]
✓ Frontend refactored         [Go to Phase 4]
⚠ Health 75-80               [Phase 4 optional]
✗ Health < 75                 [Revise plan]

Gate 4 (Week 13):
✓ Health > 90                 [Go to Phase 5]
⚠ Health 85-90               [Skip Phase 4, go to 5]
✗ Health < 85                 [Extended timeline needed]

Gate 5 (Week 15):
✓ Any types < 10              [Go to Phase 6]
✓ ESLint enabled              [Go to Phase 6]
✗ Any types > 10              [Extend Phase 5]

Gate 6 (Week 17):
✓ Health ≥ 95                 [COMPLETE ✓]
✓ Tests 100%                  [COMPLETE ✓]
⚠ Health 90-95               [Acceptable, ship it]
✗ Health < 90                 [Polish phase extended]
```

---

## Quick Reference: First Actions

```
Day 1 (Monday):
┌─────────────────────────────────────────┐
│ 09:00 - Setup environment (1h)         │
│ 10:00 - A1: Fix PatternLearner DI (2h) │
│ 12:00 - Lunch                           │
│ 13:00 - A6.1: Write DI ADR (1h)        │
│ 14:00 - Team sync (1h)                 │
└─────────────────────────────────────────┘
Total: 4 hours, +2.3 health

Day 2 (Tuesday):
┌─────────────────────────────────────────┐
│ 09:00 - A3.4: Test fixture types (6h)  │
│ 12:00 - Lunch                           │
│ 13:00 - Continue A3.4                   │
│ 15:00 - Review and commit               │
└─────────────────────────────────────────┘
Total: 6 hours, +10 health

Day 3 (Wednesday):
┌─────────────────────────────────────────┐
│ 09:00 - A6.2: Service Decomp ADR (1h)  │
│ 10:00 - Team sync (1h)                 │
│ 11:00 - Plan rest of week               │
└─────────────────────────────────────────┘
Total: 2 hours, +0.3 health

Day 4-5 (Thu-Fri):
┌─────────────────────────────────────────┐
│ A2.1: Decompose aiExerciseGenerator    │
│       (4 hours over 2 days)             │
└─────────────────────────────────────────┘
Total: 4 hours, +0.8 health

Week 1 Total: 15 hours, +12.6 health
Week 1 Achievement: 46.83 → 59.43 ✓
```

---

## Success Criteria Checklist

```
Phase 1 (Week 2):
☐ PatternLearner accepts constructor dependencies
☐ 20+ tests now pass with mocks
☐ 2 ADRs written and approved
☐ 1 god file eliminated
☐ 50 any types fixed
☐ Health score ≥ 51

Phase 2 (Week 6):
☐ adminImageManagement.ts < 500 lines
☐ aiAnnotations.ts < 500 lines
☐ 10 god files eliminated total
☐ 60 route any types fixed
☐ Route tests achieve 80% coverage
☐ Health score ≥ 72

Phase 3 (Week 10):
☐ All admin components < 500 lines
☐ Frontend type-safe (no TS errors)
☐ Component tests achieve 70% coverage
☐ 16 god files eliminated total
☐ Health score ≥ 80

Phase 4 (Week 13):
☐ All test files < 500 lines
☐ Integration test suite complete
☐ 42 god files eliminated total
☐ Test coverage ≥ 85%
☐ Health score ≥ 90

Phase 5 (Week 15):
☐ Zero any types in source code
☐ ESLint no-explicit-any enabled
☐ All builds pass strict mode
☐ Health score ≥ 95

Phase 6 (Week 17):
☐ Test coverage ≥ 90%
☐ All ADRs complete (7 total)
☐ All ESLint strict rules enabled
☐ Zero god files
☐ Health score = 95 ✓
```

---

## Key Contacts and Resources

```
Plan Documents:
├─ Main Plan:      goap-plan-analysis.md (16 KB)
├─ Comparison:     goap-execution-comparison.md (9.4 KB)
├─ Cost-Benefit:   goap-cost-benefit-analysis.md (9.4 KB)
├─ Week 1 Guide:   goap-week1-execution-guide.md (16 KB)
├─ Action Matrix:  goap-action-matrix.csv (1.9 KB)
├─ Diagram:        goap-execution-plan.mmd (3.5 KB)
└─ README:         GOAP-README.md (14 KB)

Total Documentation: 70 KB, 2245 lines
```

---

## Final Recommendation

```
╔══════════════════════════════════════════╗
║                                          ║
║  EXECUTE STRATEGY B (2 DEVELOPERS)      ║
║                                          ║
║  Timeline: 7 weeks                       ║
║  Cost: $27,500 @ $100/hour              ║
║  Risk: Medium (manageable)               ║
║  Outcome: 95/100 health, production-ready║
║                                          ║
║  START: Week 1, Day 1, Monday            ║
║  END: Week 17, Friday                    ║
║                                          ║
╚══════════════════════════════════════════╝
```

**Next Steps**:
1. Review main plan document (30 min)
2. Approve budget and timeline (1 hour)
3. Assign developers (30 min)
4. Begin Week 1 execution (Monday 9am)

---

**Generated**: 2025-12-04
**Author**: GOAP Specialist (Claude Sonnet 4.5)
**Status**: Ready for execution
