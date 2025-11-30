# AVES Research Documentation

This directory contains research documentation for feature explorations, technical investigations, and architectural decisions.

---

## Polygon Bounding Box Research (November 29, 2025)

**Status**: ✅ Complete - Awaiting Implementation Decision

**Overview**: Research into adding polygon, circle, and ellipse support to AVES annotation system (currently rectangle-only).

### Documents

1. **[Polygon Implementation Summary](./polygon-implementation-summary.md)** ⭐ START HERE
   - Quick overview (5-minute read)
   - Recommended approach (Hybrid: Annotorious admin + Canvas student)
   - Timeline estimates (5-7 days)
   - Next steps

2. **[Comprehensive Research Report](./polygon-bounding-boxes-research.md)**
   - Full 11-section analysis
   - Implementation options with pros/cons
   - Performance benchmarks
   - Database schema designs
   - Code examples
   - Decision matrix

3. **[Type Definitions Example](./polygon-type-definitions-example.ts)**
   - TypeScript discriminated union design
   - W3C Web Annotation converters
   - Validation helpers
   - Migration utilities
   - Usage examples

### Proof of Concept Code

4. **[Geometry Utilities](../../frontend/src/utils/geometryUtils.ts)**
   - Circle/polygon hit detection (O(1) and O(n))
   - Canvas rendering functions
   - Helper utilities
   - Fully documented with examples

### Key Findings

**Current State**:
- Custom Canvas architecture (60fps performance)
- @annotorious/react v3.7.6 installed but unused
- Rectangle-only bounding boxes
- JSONB database storage (flexible for any shape)

**Recommended Path**: Hybrid Approach
- Use Annotorious for admin annotation creation (rich polygon tools)
- Use Custom Canvas for student display (proven 60fps performance)
- Timeline: 5-7 days dev + 1-2 days testing

**Fallback**: Circle Support Only
- Simpler implementation (2-3 days)
- Covers 80% of bird feature shapes
- Lower risk and maintenance burden

---

## Research Process

Each research effort should follow this structure:

1. **Summary Document** - Quick overview for stakeholders
2. **Comprehensive Report** - Full technical analysis
3. **Proof of Concept** - Working code examples
4. **Type Definitions** - TypeScript interfaces/schemas
5. **Index Entry** - Update this README

---

## Research Topics Index

| Topic | Date | Status | Key Documents |
|-------|------|--------|---------------|
| Polygon Bounding Boxes | 2025-11-29 | ✅ Complete | [Summary](./polygon-implementation-summary.md), [Full Report](./polygon-bounding-boxes-research.md) |

---

## Contributing Research

When adding new research:

1. Create topic folder: `docs/research/<topic-name>/`
2. Include these files:
   - `README.md` - Summary
   - `full-report.md` - Comprehensive analysis
   - `examples/` - Code examples
   - `references.md` - External resources
3. Update this index
4. Follow research template structure

---

## Research Template

```markdown
# Research: [Topic Name]

**Date**: YYYY-MM-DD
**Researcher**: [Name/Role]
**Status**: [In Progress | Complete | Blocked]
**Priority**: [High | Medium | Low]

## Executive Summary
[2-3 paragraphs]

## Current State Analysis
[What exists today]

## Options Evaluated
[Option A, B, C with pros/cons]

## Recommendations
[Recommended path with rationale]

## Implementation Plan
[Timeline, phases, milestones]

## References
[Links and resources]
```

---

**Last Updated**: November 29, 2025
