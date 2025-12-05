# ADR-001: Monorepo Structure with npm Workspaces

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** Development Team
**Tags:** #architecture #infrastructure #monorepo

---

## Context

AVES required a unified development environment for a full-stack TypeScript application with:

- Shared type definitions between frontend and backend
- Simplified dependency management
- Coordinated builds and deployments
- Code reusability across workspaces
- Single repository for version control

**Problem Statement:** How do we structure a full-stack TypeScript application to maximize code sharing while maintaining clear boundaries between frontend, backend, and shared code?

**Constraints:**
- Must support independent deployment of frontend and backend
- TypeScript type definitions must be shared without duplication
- Development experience should be seamless (single `npm install`)
- CI/CD must be able to build and test workspaces independently

---

## Decision

We will use **npm workspaces** with a monorepo structure:

```
aves/
├── package.json              # Root workspace manager
├── frontend/                 # React workspace
│   └── package.json
├── backend/                  # Express workspace
│   └── package.json
└── shared/                   # Shared TypeScript types
    └── types/
```

**Key Implementation Details:**

1. **Root `package.json` Configuration:**
```json
{
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build:all": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

2. **Shared Type Strategy:**
- Create `shared/` directory for common TypeScript types
- Both workspaces reference shared types via TypeScript path mapping
- No runtime dependencies in `shared/` (types only)

3. **Independent Deployment:**
- Frontend builds to static files (GitHub Pages)
- Backend runs as Node.js service (Railway/Render)
- Each workspace has independent `package.json` with specific dependencies

---

## Consequences

### Positive

✅ **Single Source of Truth for Types**
- Shared types in `shared/` directory prevent duplication
- Type changes propagate automatically to both workspaces
- Compile-time type safety across full stack

✅ **Simplified Development Experience**
- Single `npm install` installs all dependencies
- Unified dependency hoisting reduces disk space
- Concurrent development with `npm run dev`

✅ **Coordinated Versioning**
- Single git repository for all code
- Synchronized releases and versioning
- Easier code review across full stack

✅ **Efficient CI/CD**
- Single pipeline can build and test all workspaces
- Shared CI configuration
- Dependency caching applies to all workspaces

### Negative

⚠️ **Deployment Complexity**
- Frontend and backend must be deployed separately
- Requires careful environment variable management
- Cannot deploy workspaces as single unit

⚠️ **Dependency Conflicts**
- Shared dependencies can cause version conflicts
- Must coordinate TypeScript versions across workspaces
- ESLint/Prettier configs must be compatible

⚠️ **Build Performance**
- Full workspace build can be slow
- CI must be configured to cache workspace dependencies
- Large `node_modules` in development

### Mitigations

1. **Independent Deployment Scripts:**
```json
{
  "scripts": {
    "deploy:frontend": "npm run build --workspace=frontend && deploy-frontend.sh",
    "deploy:backend": "npm run build --workspace=backend && deploy-backend.sh"
  }
}
```

2. **Dependency Management:**
- Use `overrides` in root `package.json` to resolve conflicts
- Maintain compatibility matrix documentation
- Regular dependency audits

3. **Build Optimization:**
- Implement selective workspace builds in CI
- Use turbo/nx for incremental builds (future consideration)
- Cache compiled TypeScript outputs

---

## Alternatives Considered

### Alternative 1: Separate Repositories (Poly-repo)

**Pros:**
- Complete independence
- Simpler CI/CD per repository
- No dependency conflicts

**Cons:**
- Type duplication between repos
- Complex versioning and releases
- Difficult to coordinate changes
- **Rejected because:** Significant type duplication and coordination overhead

### Alternative 2: Lerna Monorepo

**Pros:**
- More powerful than npm workspaces
- Advanced versioning support
- Better for publishable packages

**Cons:**
- Additional tooling complexity
- Overkill for 2-workspace setup
- Steeper learning curve
- **Rejected because:** npm workspaces sufficient for our needs

### Alternative 3: Turborepo/Nx

**Pros:**
- Incremental builds
- Advanced caching
- Task orchestration

**Cons:**
- Significant complexity overhead
- Additional build tooling
- Over-engineering for current scale
- **Rejected because:** Premature optimization, can migrate later if needed

---

## Implementation Notes

### TypeScript Configuration

**Root `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"]
    }
  }
}
```

**Workspace `tsconfig.json` (extends root):**
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

### Workspace Scripts

**Workspace-specific commands:**
```bash
npm run dev --workspace=frontend
npm run test --workspace=backend
npm run build --workspaces
```

---

## Related Decisions

- **ADR-005:** File Structure Pattern (modular organization within workspaces)
- **ADR-008:** Testing Strategy (workspace-specific test suites)

---

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo Best Practices](https://monorepo.tools/)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | Development Team | Accepted | Initial implementation |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
