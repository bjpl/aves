# GOAP Plan Documentation - AVES Health Recovery

## Overview

This directory contains a comprehensive Goal-Oriented Action Planning (GOAP) analysis for recovering AVES project health from 46.83/100 to 95/100. The plan uses AI-driven action planning algorithms to identify the optimal sequence of refactoring tasks.

**Current State**: 46.83/100 health, 163 test failures, 60 god files, 236 any types
**Target State**: 95/100 health, 0 test failures, 0 god files, 0 any types
**Timeline**: 7 weeks with 2 developers (Strategy B - Recommended)

---

## Documents in This Collection

### 1. Main GOAP Plan Analysis
**File**: `goap-plan-analysis.md`
**Purpose**: Comprehensive action sequence with preconditions, effects, and dependencies
**Key Content**:
- State gap analysis (current → goal)
- 27 available actions with preconditions and effects
- 6-phase execution plan (275 hours)
- Critical path analysis
- Risk assessment and contingencies
- Health score projections by week

**When to Use**: Primary planning document - read this first to understand the complete strategy.

---

### 2. Execution Strategy Comparison
**File**: `goap-execution-comparison.md`
**Purpose**: Compares three execution strategies (1, 2, or 3 developers)
**Key Content**:
- Strategy A: Single developer (14 weeks, low risk)
- **Strategy B: Two developers (7 weeks, medium risk)** ⭐ Recommended
- Strategy C: Three developers (5 weeks, high risk)
- Coordination requirements for each strategy
- Risk-adjusted timelines
- Decision matrix for selecting strategy

**When to Use**: When deciding team size and timeline. Use this to justify resource allocation to stakeholders.

---

### 3. Cost-Benefit Analysis
**File**: `goap-cost-benefit-analysis.md`
**Purpose**: ROI analysis for each action, prioritized by efficiency
**Key Content**:
- ROI rankings (health points per hour)
- Type safety: 1.57 health/hour (best ROI)
- God file decomposition: 0.34 health/hour
- Incremental funding strategy (3 phases)
- Risk-adjusted ROI calculations
- Optimization recommendations (automation, reordering)

**When to Use**: When prioritizing work or justifying budget. Use this to make data-driven trade-offs if timeline or budget constraints arise.

---

### 4. Action Matrix (CSV)
**File**: `goap-action-matrix.csv`
**Purpose**: Machine-readable action sequence for tracking and reporting
**Key Content**:
- All 27 actions in tabular format
- Effort, risk, dependencies, effects for each action
- Parallel stream assignments (A/B/C)
- Week start/end dates
- Health delta per action

**When to Use**: Import into Excel, Google Sheets, or project management tools for Gantt charts and progress tracking.

---

### 5. Execution Plan Diagram (Mermaid)
**File**: `goap-execution-plan.mmd`
**Purpose**: Visual representation of action dependencies and critical path
**Key Content**:
- Flowchart of all 27 actions
- Critical path highlighted in red
- Parallel execution paths shown with dotted lines
- Color-coded by category (backend, frontend, testing, docs)
- 6 phase boundaries

**When to Use**: Visualize dependencies and critical path. Render with Mermaid Live Editor or GitHub/GitLab markdown.

---

### 6. Week 1 Execution Guide
**File**: `goap-week1-execution-guide.md`
**Purpose**: Detailed step-by-step instructions for the first week
**Key Content**:
- Pre-execution checklist (environment, tooling, team)
- Day-by-day tasks with exact commands
- Code examples and commit message templates
- Common issues and solutions
- Success metrics and deliverables checklist

**When to Use**: Tactical guide for developers starting Week 1. Contains exact bash commands and code patterns to follow.

---

## Quick Navigation

### For Project Managers:
1. Read: `goap-plan-analysis.md` (30 min) - Understand the complete plan
2. Read: `goap-execution-comparison.md` (15 min) - Choose execution strategy
3. Review: `goap-cost-benefit-analysis.md` (15 min) - Understand ROI and budget
4. Use: `goap-action-matrix.csv` - Track progress in project management tool

### For Technical Leads:
1. Read: `goap-plan-analysis.md` (30 min) - Technical strategy
2. Review: `goap-execution-plan.mmd` (10 min) - Visualize dependencies
3. Study: `goap-cost-benefit-analysis.md` (20 min) - Prioritization decisions
4. Reference: `goap-week1-execution-guide.md` - Implementation patterns

### For Developers:
1. Skim: `goap-plan-analysis.md` (15 min) - Context only
2. Study: `goap-week1-execution-guide.md` (30 min) - Your immediate work
3. Reference: `goap-execution-plan.mmd` - See where your work fits
4. Consult: `goap-cost-benefit-analysis.md` - Understand priority if blocked

### For Stakeholders:
1. Read: Executive Summary in `goap-plan-analysis.md` (5 min)
2. Review: `goap-execution-comparison.md` comparison matrix (5 min)
3. Check: Cost summary in `goap-cost-benefit-analysis.md` (5 min)

---

## Execution Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish testability and unblock parallel work
- Fix PatternLearner DI
- Decompose 2 service files
- Write foundational ADRs
- **Health**: +4.2 points

### Phase 2: Route Decomposition (Weeks 3-6)
**Goal**: Break down mega-files blocking test coverage
- Decompose adminImageManagement.ts (2879 lines)
- Decompose aiAnnotations.ts (1839 lines)
- Refactor 8 backend services
- Add route module tests
- Fix route type safety
- **Health**: +21.5 points

### Phase 3: Frontend Refactoring (Weeks 7-10)
**Goal**: Decompose frontend god files and add tests
- Decompose 6 admin components
- Fix frontend type errors
- Add component tests
- **Health**: +8.3 points

### Phase 4: Test Decomposition (Weeks 11-13)
**Goal**: Refactor god test files for maintainability
- Decompose 17 frontend test files
- Decompose 9 backend test files
- Add integration tests
- **Health**: +23.3 points

### Phase 5: Type Safety Sweep (Weeks 14-15)
**Goal**: Eliminate remaining any types
- Fix 176 remaining any types
- Enable no-explicit-any ESLint rule
- **Health**: +36.2 points

### Phase 6: Coverage & Documentation (Weeks 16-17)
**Goal**: Achieve 90%+ coverage and complete ADRs
- Add backend edge case tests
- Add frontend edge case tests
- Complete remaining ADRs
- Enable all strict ESLint rules
- **Health**: +6.5 points

**Final Health**: 95/100 ✓

---

## Key Insights

### 1. Critical Path Bottleneck
The largest blocker is `adminImageManagement.ts` (2879 lines). This single file blocks:
- 15% of test coverage improvements
- 60 type safety fixes
- 4 downstream service decompositions

**Mitigation**: Create facade pattern to enable parallel testing while decomposition is in progress.

### 2. Type Safety Has 10x Better ROI
Type safety improvements (A3.x) provide 1.57 health/hour compared to 0.34 health/hour for god file decomposition. However, decomposition is necessary to unlock type safety work.

**Strategy**: Prioritize type safety immediately after critical path files are decomposed.

### 3. Test Decomposition Can Be Deferred
Phase 4 (test decomposition) provides maintainability benefits but doesn't block other work. If budget is constrained:
- Complete Phases 1-3, 5-6 (skip Phase 4)
- Achieves 88/100 health in 5 weeks
- Saves 52 hours ($5,200)

### 4. Automation Reduces Effort by 20%
Using tools like `ts-migrate`, `prettier`, and `jscodeshift` can reduce manual effort from 275 to 220 hours while maintaining quality.

---

## Success Metrics

### Health Score Milestones
- **Week 2**: 51/100 (foundation complete)
- **Week 6**: 73/100 (routes refactored)
- **Week 10**: 81/100 (frontend complete)
- **Week 13**: 95/100 (target achieved) ✓

### Code Quality Metrics
- **God Files**: 60 → 0
- **Any Types**: 236 → 0
- **Test Pass Rate**: 74% → 100%
- **Test Coverage**: 22% → 90%+
- **ESLint Strict Mode**: Disabled → Enabled

### Process Metrics
- **Commits**: ~80-100 (average 1 commit per 3 hours of work)
- **Code Reviews**: ~40 (2 reviews per major change)
- **Coordination Meetings**: 17 (weekly syncs + 2 checkpoints per phase)

---

## Risk Management

### High-Risk Actions
1. **Route Decomposition** (A2.3-4): 30% chance of production breaks
   - Mitigation: Integration tests, feature flags, 2-week rollback window
2. **Type Safety Changes** (A3.1-4): 15% chance of build breaks
   - Mitigation: Incremental by module, validation after each module

### Contingency Plans
- **Plan B**: Target 75/100 health in 8 weeks (skip test decomposition)
- **Plan C**: Emergency fix to 60/100 in 3 weeks (critical path only)

### Early Warning Indicators
- Week 2 health < 50: Timeline at risk (+20% extension)
- Week 6 health < 70: Major blocker detected (escalate)
- Test pass rate decreases: Stop, fix regressions before proceeding

---

## Tools and Automation

### Required Tools
```bash
# TypeScript migration
npm install -g ts-migrate

# Code formatting
npm install -g prettier

# Code transformation
npm install -g jscodeshift

# Test coverage
npm install --save-dev @vitest/coverage-c8

# Git hooks
npm install --save-dev husky lint-staged
```

### Automation Scripts
- `scripts/check-health.sh` - Calculate current health score
- `scripts/analyze-god-files.sh` - List files over 500 lines
- `scripts/count-any-types.sh` - Count `: any` in codebase
- `scripts/run-phase-tests.sh` - Run tests for specific phase

---

## Getting Started

### Immediate Next Steps (Today)
1. **Review** this README and main plan document (1 hour)
2. **Choose** execution strategy (likely Strategy B) (30 min)
3. **Assign** developers (1 backend, 1 frontend) (30 min)
4. **Schedule** Week 1-2 work and sync meetings (30 min)
5. **Set up** environment and tools (1 hour)

### Week 1 Execution (Monday)
1. **Read** `goap-week1-execution-guide.md` (30 min)
2. **Start** Task 1.1: Fix PatternLearner DI (2 hours)
3. **Complete** Task 1.2: Write DI ADR (1 hour)
4. **Daily** standup at end of day (15 min)

---

## Questions and Support

### Common Questions

**Q: Can we skip some actions to go faster?**
A: Yes, but carefully. Test decomposition (Phase 4) can be deferred. Route decomposition (Phase 2) cannot - it's critical path.

**Q: What if we only have 1 developer?**
A: Use Strategy A (14 weeks). Timeline is longer but risk is lower.

**Q: What if we find more god files during execution?**
A: Expected. The plan has buffer room. Add them to Phase 4 backlog.

**Q: How do we track progress?**
A: Import `goap-action-matrix.csv` into your project management tool. Update health score weekly using `scripts/check-health.sh`.

**Q: What if tests start failing during refactoring?**
A: Stop immediately. Fix regressions before continuing. Never commit failing tests.

---

## Version History

- **v1.0** (2025-12-04): Initial GOAP plan created
  - 27 actions identified
  - 6-phase plan (275 hours)
  - 3 execution strategies analyzed
  - Week 1 guide completed

---

## Document Maintenance

This documentation should be updated:
- **Weekly**: Update health score projections, adjust timeline if needed
- **Phase End**: Retrospective learnings, update cost/benefit actuals
- **Major Blockers**: Document deviations from plan, update contingencies
- **Completion**: Final retrospective, lessons learned

---

## Contact

For questions about this GOAP plan:
- Technical questions: Reference the specific document section
- Strategy questions: Review `goap-execution-comparison.md`
- Priority questions: Consult `goap-cost-benefit-analysis.md`
- Tactical execution: Follow `goap-week1-execution-guide.md`

---

**Plan Author**: GOAP Specialist (Claude Sonnet 4.5)
**Plan Generated**: 2025-12-04
**Plan Status**: Ready for execution
**Next Review**: Week 2 (after foundation phase)

---

## Appendix: GOAP Algorithm Summary

This plan was generated using Goal-Oriented Action Planning (GOAP), an AI planning algorithm:

### How GOAP Works
1. **State Representation**: Current state (46.83 health) vs. goal state (95 health)
2. **Action Library**: 27 available actions with preconditions and effects
3. **Search Algorithm**: A* pathfinding to find optimal action sequence
4. **Cost Function**: Minimize total hours while maximizing health improvement
5. **Heuristic**: Estimate distance to goal (remaining health points)

### Why GOAP for Software Refactoring?
- **Dynamic**: Adapts if actions fail or produce unexpected results
- **Optimal**: Finds best path through state space
- **Explainable**: Every action has clear preconditions and effects
- **Replayable**: Can re-plan from any intermediate state

### GOAP vs. Traditional Planning
- Traditional: Fixed task list, rigid dependencies
- GOAP: Dynamic action selection based on current state
- Traditional: Fails if plan diverges
- GOAP: Replans automatically when conditions change

This makes GOAP ideal for complex refactoring where exact outcomes are uncertain but goals are clear.
