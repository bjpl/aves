# AVES Architecture Documentation

This directory contains comprehensive documentation for the AVES architecture refactoring initiative.

## 📋 Document Index

### 🎯 Start Here

**[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Executive summary
- Problem statement and solution overview
- Key metrics (before/after comparison)
- Timeline and effort estimates
- Risk assessment
- Success criteria
- **Read this first** for high-level understanding

### 📖 Detailed Technical Specifications

**[REFACTORING_STRATEGY.md](./REFACTORING_STRATEGY.md)** - Complete technical plan
- Precise decomposition strategy for all 5 god files
- Module-by-module breakdown with exact line counts
- Interface contracts for 36 new modules
- Step-by-step migration procedures
- Test strategy and rollback plans
- **Use this** for implementation guidance

**[DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md)** - Visual architecture maps
- Current vs. target architecture diagrams
- Service dependency graphs
- Data flow examples (collection, annotation, review)
- Interface boundary contracts
- Circular dependency prevention rules
- **Reference this** to understand system interactions

**[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** - Implementation checklist
- Week-by-week task breakdown
- Day-by-day action items with checkboxes
- Verification steps for each module
- Git commands and test commands
- Success criteria verification
- **Use this** as your daily work guide

**[ADR.md](./ADR.md)** - Architecture Decision Records
- 10 key architectural decisions with full context
- Rationale, consequences, and mitigations
- Design patterns (Repository, Service Layer, DI)
- Testing and deployment strategies
- **Reference this** to understand "why" decisions were made

## 📊 Quick Reference

### File Decomposition Summary

| Original File | Lines | Target Modules | New Files | Avg. Lines |
|--------------|-------|----------------|-----------|------------|
| adminImageManagement.ts | 2,863 | 14 modules | 8 routes + 6 services | 220 |
| aiAnnotations.ts | 1,839 | 8 modules | 5 routes + 3 services | 230 |
| PatternLearner.ts | 1,279 | 6 modules | 5 services + 1 types | 213 |
| VisionAI (3 files) | 1,584 | 2 modules | Consolidated | 400 |
| ImageManagementPage.tsx | 951 | 8 modules | 7 components + 1 types | 180 |
| **TOTAL** | **7,932** | **36 modules** | **36 files** | **220** |

### Implementation Timeline

```
Week 1-2: adminImageManagement.ts → 14 modules
Week 3-4: aiAnnotations.ts → 8 modules
Week 5-6: PatternLearner.ts → 6 modules
Week 7:   VisionAI Consolidation → 2 modules
Week 8-9: ImageManagementPage.tsx → 8 modules
Week 10:  Final Integration & Testing
```

### Target File Structure

```
backend/src/
├── routes/
│   ├── admin/images/
│   │   ├── index.ts
│   │   ├── collection.routes.ts
│   │   ├── upload.routes.ts
│   │   ├── annotation.routes.ts
│   │   ├── job.routes.ts
│   │   ├── stats.routes.ts
│   │   ├── bulk.routes.ts
│   │   └── image.routes.ts
│   └── annotations/ai/
│       ├── index.ts
│       ├── generation.routes.ts
│       ├── review.routes.ts
│       ├── bulk.routes.ts
│       ├── query.routes.ts
│       └── analytics.routes.ts
├── services/
│   ├── admin/
│   │   ├── UnsplashService.ts
│   │   ├── ImageProcessingService.ts
│   │   ├── JobService.ts
│   │   ├── AnnotationJobService.ts
│   │   └── BulkOperationService.ts
│   ├── annotations/
│   │   ├── AnnotationReviewService.ts
│   │   ├── AnnotationAnalyticsService.ts
│   │   └── BulkReviewService.ts
│   ├── ml/
│   │   ├── PatternLearningService.ts
│   │   ├── PromptEnhancementService.ts
│   │   ├── BoundingBoxLearner.ts
│   │   ├── QualityMetricsCalculator.ts
│   │   └── SpeciesFeatureAnalytics.ts
│   └── vision/
│       ├── VisionAIService.ts
│       └── VisionPreflightService.ts
└── repositories/
    ├── ImageRepository.ts
    ├── AnnotationRepository.ts
    └── SpeciesRepository.ts

frontend/src/
├── pages/admin/
│   └── ImageManagementPage.tsx (orchestrator)
└── components/admin/image-management/
    ├── DashboardHeader.tsx
    ├── StatsCards.tsx
    ├── CollectionPanel.tsx
    ├── AnnotationPanel.tsx
    ├── JobStatusPanel.tsx
    └── ImageGalleryPanel.tsx
```

## 🎓 How to Use This Documentation

### For Implementation

1. **Start with:** REFACTORING_SUMMARY.md (understand the big picture)
2. **Then read:** REFACTORING_STRATEGY.md (understand technical details)
3. **Work from:** MIGRATION_CHECKLIST.md (day-to-day tasks)
4. **Reference:** DEPENDENCY_GRAPH.md (when designing interfaces)
5. **Consult:** ADR.md (when making design decisions)

### For Code Review

1. **Check:** Module is < 500 lines (enforced by ESLint)
2. **Verify:** Tests pass and coverage ≥ 80%
3. **Confirm:** No circular dependencies (`npx madge --circular backend/src`)
4. **Review:** Interface contracts match DEPENDENCY_GRAPH.md
5. **Validate:** ADRs are followed (Repository pattern, DI, etc.)

### For Onboarding New Developers

1. Read REFACTORING_SUMMARY.md (30 minutes)
2. Review DEPENDENCY_GRAPH.md diagrams (20 minutes)
3. Skim ADR.md for context (20 minutes)
4. Explore new module structure in codebase
5. Pair with team member on first PR

## ✅ Success Criteria

### Must Have (Blocking)

- [ ] All files < 500 lines (zero violations)
- [ ] Test coverage ≥ 80% overall, ≥ 95% critical paths
- [ ] Zero circular dependencies
- [ ] All tests pass (100% pass rate)
- [ ] No performance regressions (API response times maintained)

### Nice to Have (Non-blocking)

- [ ] Average file size < 250 lines
- [ ] Test coverage > 85% overall
- [ ] Build time < 20 seconds (current: <30s target)
- [ ] Test suite < 90 seconds (current: <2min target)

## 🔧 Useful Commands

### Check file sizes
```bash
find backend/src -name "*.ts" -not -path "*/node_modules/*" -exec wc -l {} \; | sort -rn | head -20
```

### Check for violations (>500 lines)
```bash
find backend/src -name "*.ts" ! -path "*/node_modules/*" -exec wc -l {} \; | awk '{if ($1 > 500) print $0}'
```

### Check test coverage
```bash
npm test -- --coverage --coverageReporters=text-summary
```

### Check circular dependencies
```bash
npx madge --circular backend/src
```

### Run specific test suite
```bash
npm test -- --testPathPattern=services/admin
npm test -- --testPathPattern=routes/admin/images
```

### Build and verify
```bash
npm run build && npm run typecheck && npm run lint
```

## 📞 Support

**Questions about refactoring strategy?**
- Review ADR.md for design decisions
- Check DEPENDENCY_GRAPH.md for architecture
- Consult MIGRATION_CHECKLIST.md for step-by-step guide

**Encountered issues during implementation?**
- Check git tags for rollback points
- Review baseline test results
- Consult mitigation strategies in REFACTORING_SUMMARY.md

**Need help with specific module?**
- Review interface contract in REFACTORING_STRATEGY.md
- Check data flow examples in DEPENDENCY_GRAPH.md
- Pair with team member familiar with domain

---

**Last Updated:** 2025-12-04
**Status:** Documentation Complete - Ready for Implementation
**Next Update:** End of Week 5 (after PatternLearner refactoring)
