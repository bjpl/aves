# AVES Project - Action Plan Walkthrough

**Generated**: October 3, 2025
**Based on**: PROJECT_STATUS_REPORT.md
**Current Phase**: Phase 3 Week 1 → Week 2 Transition

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [What You'll Do Manually](#what-youll-do-manually)
3. [What Claude Can Do Programmatically](#what-claude-can-do-programmatically)
4. [Detailed Step-by-Step Walkthrough](#detailed-step-by-step-walkthrough)
5. [Troubleshooting Guide](#troubleshooting-guide)

---

## Quick Overview

### Summary of Issues

**High Priority (This Week)**:
- ❌ 73 failing frontend tests (27.7% failure rate)
- ❌ Missing CONTRIBUTING.md and LICENSE files
- ❌ Duplicate `react-query` dependency (v3 + v5)
- ⚠️ Test environment setup too slow (644s)

**Medium Priority (Phase 3 Week 2)**:
- ⚠️ 4 moderate dev-only npm vulnerabilities (Vite/Vitest upgrade needed)
- ⚠️ No CI/CD pipeline
- ⚠️ Low inline JSDoc coverage (1.4%)

### Time Estimates

| Task Category | Manual Time | Automated Time | Total Time |
|--------------|-------------|----------------|------------|
| **Critical Fixes** | 30 min | 2 hours | 2.5 hours |
| **Documentation** | 1 hour | 30 min | 1.5 hours |
| **Testing Fixes** | 1 hour | 3-4 hours | 4-5 hours |
| **Code Quality** | - | 2-3 hours | 2-3 hours |
| **TOTAL** | **2.5 hours** | **8-10 hours** | **10.5-12.5 hours** |

---

## What You'll Do Manually

### 1. Decision-Making Tasks (30 minutes)

These require your judgment and cannot be automated:

#### A. License Selection (5 minutes)
**Task**: Confirm MIT license for the project
**Why Manual**: Legal decision

**Steps**:
1. Review MIT License terms: https://opensource.org/licenses/MIT
2. Confirm this matches your intended usage
3. Decide on copyright holder name (your name or "AVES Contributors")
4. Tell Claude: "Use MIT license with copyright holder: [YOUR NAME]"

#### B. Contributing Guidelines Review (15 minutes)
**Task**: Define contribution policies
**Why Manual**: Project governance decisions

**Decisions Needed**:
- [ ] Code of conduct enforcement level (strict/moderate/relaxed)
- [ ] PR approval requirements (1 reviewer? 2 reviewers?)
- [ ] Testing requirements (must pass all tests? coverage threshold?)
- [ ] Commit message format (conventional commits?)
- [ ] Branch naming convention (feature/*, bugfix/*, etc.?)

**What to Tell Claude**:
```
"Create CONTRIBUTING.md with these policies:
- [Your decisions from above]
- Use Conventional Commits: yes/no
- Minimum test coverage: X%
- etc."
```

#### C. Security Policy Review (10 minutes)
**Task**: Define vulnerability reporting process
**Why Manual**: Security contact and process decisions

**Decisions Needed**:
- [ ] Security contact email
- [ ] Response time commitment (24h? 48h? 1 week?)
- [ ] Supported versions for security patches
- [ ] Bug bounty program? (yes/no)

---

### 2. Testing Review Tasks (1 hour)

#### A. Review Failing Tests (30 minutes)
**Task**: Manually inspect test failures to identify patterns
**Why Manual**: Requires understanding of business logic

**Steps**:
1. Run frontend tests: `cd frontend && npm test`
2. Note failure patterns:
   - Are they all in one component/feature?
   - Are they environment-related (jsdom issues)?
   - Are they timing/async issues?
   - Are they API mocking issues?
3. Tell Claude the patterns you see

**Example**:
```
"I ran the tests and found:
- 40 failures in annotation components (canvas-related)
- 20 failures in exercise components (API mocking issues)
- 13 failures in hooks (timing issues with waitFor)"
```

#### B. Decide on Test Fixes Approach (15 minutes)
**Task**: Choose fix strategy
**Why Manual**: Trade-off decisions

**Options**:
1. **Fix all failing tests** (most thorough, 3-4 hours)
2. **Fix critical path tests only** (faster, 1-2 hours)
3. **Skip flaky tests temporarily** (quick fix, technical debt)

**What to Tell Claude**:
```
"Fix all failing tests" OR
"Fix only critical path tests (auth, exercises, species browser)" OR
"Mark flaky tests as skip and create issues to track them"
```

#### C. Review Test Output (15 minutes)
**Task**: Verify fixed tests make sense
**Why Manual**: Quality assurance

**Steps**:
1. After Claude fixes tests, review the changes
2. Run tests again: `cd frontend && npm test`
3. Check if fixes are legitimate or just disabled tests
4. Approve or request revisions

---

### 3. Dependency Upgrade Decisions (30 minutes)

#### A. React Query Cleanup Decision (5 minutes)
**Task**: Decide how to remove duplicate dependency
**Why Manual**: Migration strategy decision

**Current State**:
- `react-query` v3.39.3 (old)
- `@tanstack/react-query` v5.90.2 (new)

**Options**:
1. **Remove v3 immediately** (may break some code)
2. **Migrate incrementally** (safer, more work)
3. **Audit usage first** (find which code uses v3)

**What to Tell Claude**:
```
"Audit react-query v3 usage first, then create migration plan" OR
"Remove react-query v3 if no code uses it"
```

#### B. Vite/Vitest Upgrade Decision (15 minutes)
**Task**: Decide when to upgrade to fix vulnerabilities
**Why Manual**: Breaking change risk assessment

**Current Vulnerabilities**:
- Vite 5.0.10 → 7.1.9 (major version, breaking changes)
- Vitest 1.1.0 → 3.2.4 (major version, breaking changes)

**Impact**: Dev-only vulnerabilities, low production risk

**Options**:
1. **Defer to Phase 3 Week 2** (recommended - focus on tests first)
2. **Upgrade now** (may introduce new issues)
3. **Upgrade in separate branch** (safe testing)

**Recommended Decision**:
```
"Defer Vite/Vitest upgrade to Phase 3 Week 2 after test stabilization"
```

#### C. Dependency Audit Review (10 minutes)
**Task**: Review npm audit output
**Why Manual**: Risk assessment

**Steps**:
1. Run: `npm audit`
2. Review each vulnerability
3. Assess risk vs effort
4. Decide which to fix now vs later

---

## What Claude Can Do Programmatically

### 1. File Creation & Documentation (30 minutes)

**Fully Automated** - Just give Claude the decisions from above:

- ✅ Create LICENSE file (MIT with your copyright)
- ✅ Create CONTRIBUTING.md (based on your policies)
- ✅ Create CODE_OF_CONDUCT.md (standard Contributor Covenant)
- ✅ Create SECURITY.md (based on your policies)
- ✅ Create CHANGELOG.md (initial version with current state)

**Command**:
```
"Claude, create all missing standard files:
- LICENSE: MIT, copyright [YOUR NAME]
- CONTRIBUTING.md: [your policies]
- CODE_OF_CONDUCT.md: Contributor Covenant v2.1
- SECURITY.md: [your security policies]
- CHANGELOG.md: Document v0.1.0 with Phase 3 Week 1 completion"
```

---

### 2. Dependency Cleanup (15 minutes)

**Fully Automated** - After your decisions:

- ✅ Audit `react-query` v3 usage
- ✅ Remove `react-query` v3 if unused
- ✅ Update imports if needed
- ✅ Update package.json and package-lock.json
- ✅ Run npm install to clean up

**Command**:
```
"Claude, search for all react-query v3 imports, create a report,
then remove the dependency if it's unused"
```

---

### 3. Test Fixes (3-4 hours)

**Mostly Automated** - After your review and decisions:

- ✅ Fix failing frontend tests (based on patterns you identified)
- ✅ Update test mocks for API changes
- ✅ Fix timing issues with proper waitFor usage
- ✅ Fix jsdom environment issues
- ✅ Update snapshots if needed
- ✅ Optimize test setup time (reduce from 644s)

**Command**:
```
"Claude, fix all failing frontend tests. Patterns I found:
- [patterns from your review]
Strategy: [fix all / fix critical / skip flaky]"
```

**Claude Will**:
1. Read each failing test file
2. Identify the root cause
3. Apply appropriate fixes
4. Run tests to verify
5. Report results

---

### 4. Code Quality Improvements (2-3 hours)

**Fully Automated** - No decisions needed:

- ✅ Add JSDoc comments to public APIs (60%+ coverage)
- ✅ Add @param, @returns, @throws annotations
- ✅ Document complex algorithms
- ✅ Add interface/type documentation
- ✅ Generate API documentation

**Command**:
```
"Claude, add comprehensive JSDoc comments to all public APIs,
focusing on services, hooks, and components.
Target: 60%+ JSDoc coverage with @param and @returns annotations"
```

**Claude Will**:
1. Find all public exports
2. Add JSDoc with descriptions
3. Document parameters and return types
4. Add usage examples where helpful
5. Generate metrics report

---

### 5. Architecture Documentation (1 hour)

**Fully Automated** - No decisions needed:

- ✅ Create system architecture diagram (Mermaid.js)
- ✅ Create component hierarchy diagram
- ✅ Create data flow diagram
- ✅ Create authentication flow diagram
- ✅ Update README with diagrams

**Command**:
```
"Claude, create architecture diagrams using Mermaid.js:
- System architecture (frontend → backend → database)
- Component hierarchy
- Data flow (user actions → state → API → database)
- Authentication flow
Save as docs/ARCHITECTURE.md"
```

---

### 6. CI/CD Pipeline Setup (1-2 hours)

**Mostly Automated** - Minimal manual steps:

- ✅ Create GitHub Actions workflow files
- ✅ Configure test automation
- ✅ Configure build automation
- ✅ Configure deployment automation
- ✅ Add status badges to README

**Manual Steps** (5 minutes):
- Enable GitHub Actions in repository settings
- Add secrets to GitHub (if needed for deployment)

**Command**:
```
"Claude, create GitHub Actions CI/CD pipeline:
- Run tests on PR and push to main
- Run linting and type checking
- Build frontend and backend
- Deploy to GitHub Pages on main push
- Add status badges to README"
```

---

## Detailed Step-by-Step Walkthrough

### Phase 1: Critical Fixes (Day 1 - 2.5 hours)

#### Step 1: Manual Decisions (30 minutes)

**Your Tasks**:
1. [ ] Review MIT License and confirm usage
2. [ ] Define contributing policies (see decisions above)
3. [ ] Define security policy (contact email, response time)
4. [ ] Choose copyright holder name

**Deliverable**: A message to Claude with all decisions

**Template**:
```
Claude, I've made these decisions:

LICENSE:
- Type: MIT
- Copyright holder: [YOUR NAME or "AVES Contributors"]

CONTRIBUTING.md:
- Code of Conduct: Contributor Covenant v2.1
- PR Requirements: [e.g., "1 approval required, all tests must pass"]
- Testing Requirements: [e.g., "Coverage must not decrease"]
- Commit Format: [e.g., "Conventional Commits preferred"]
- Branch Naming: [e.g., "feature/*, bugfix/*, hotfix/*"]

SECURITY.md:
- Security contact: [YOUR EMAIL]
- Response time: [e.g., "within 48 hours"]
- Supported versions: [e.g., "Latest release only"]
- Bug bounty: [yes/no]

Please create all these files now.
```

#### Step 2: Claude Creates Standard Files (15 minutes)

**Claude's Tasks**:
- ✅ Create LICENSE file
- ✅ Create CONTRIBUTING.md
- ✅ Create CODE_OF_CONDUCT.md
- ✅ Create SECURITY.md
- ✅ Create CHANGELOG.md

**Your Tasks**:
1. [ ] Review generated files
2. [ ] Approve or request changes

#### Step 3: Dependency Cleanup (15 minutes)

**Your Task** (5 minutes):
```
Claude, audit react-query v3 usage:
1. Search for imports from 'react-query' (not @tanstack)
2. List all files using v3
3. Check if removal is safe
4. If safe, remove the dependency
```

**Claude's Tasks**:
- ✅ Search codebase for react-query v3 usage
- ✅ Generate audit report
- ✅ Remove dependency if unused
- ✅ Update package.json
- ✅ Run npm install

**Your Task** (5 minutes):
```bash
# Verify removal
cd frontend
npm install
npm run build
```

#### Step 4: Review and Commit (30 minutes)

**Your Tasks**:
1. [ ] Review all changes
2. [ ] Test that build still works
3. [ ] Commit changes:
```bash
git add .
git status  # Review staged files
git commit -m "Add standard project files (LICENSE, CONTRIBUTING, etc) and remove duplicate react-query dependency

- Add MIT LICENSE file
- Add CONTRIBUTING.md with contribution guidelines
- Add CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- Add SECURITY.md with vulnerability reporting
- Add CHANGELOG.md (initial version)
- Remove duplicate react-query v3 dependency
- Clean up package.json

🤖 Generated with Claude Code"
```
4. [ ] Push to GitHub:
```bash
git push origin main
```

---

### Phase 2: Test Stabilization (Day 2-3 - 4-5 hours)

#### Step 5: Manual Test Review (1 hour)

**Your Tasks**:
1. [ ] Run frontend tests and observe failures:
```bash
cd frontend
npm test 2>&1 | tee test-output.txt
```

2. [ ] Analyze test-output.txt for patterns:
   - Which components fail most?
   - Are failures environment-related?
   - Are they timing/async issues?
   - Are they mock-related?

3. [ ] Create pattern summary for Claude

**Template**:
```
Claude, I analyzed the test failures. Here are the patterns:

PATTERN 1: [e.g., "Canvas/annotation tests - jsdom doesn't support canvas"]
- Affected files: [list]
- Failure type: [error message pattern]
- Suggested fix: [e.g., "Mock canvas APIs"]

PATTERN 2: [e.g., "Exercise tests - API mocks returning undefined"]
- Affected files: [list]
- Failure type: [error message pattern]
- Suggested fix: [e.g., "Update mock responses"]

PATTERN 3: [etc...]

Strategy: [Fix all / Fix critical only / Skip flaky]
```

#### Step 6: Claude Fixes Tests (3-4 hours automated)

**Command to Claude**:
```
Claude, fix all failing frontend tests based on the patterns I identified.
For each pattern:
1. Read the failing test files
2. Implement the suggested fix
3. Verify the fix works
4. Report results

Work on this systematically - fix one pattern at a time.
```

**Claude Will**:
1. Work through each pattern category
2. Read relevant test files
3. Apply fixes (mock updates, timing fixes, etc.)
4. Run tests after each fix
5. Report progress

**Your Tasks** (15 min per batch):
- [ ] Review Claude's fixes
- [ ] Approve to continue to next pattern

#### Step 7: Test Optimization (30 minutes)

**Command to Claude**:
```
Claude, optimize test setup time (currently 644s):
1. Analyze test setup code in frontend/src/test/
2. Identify slow operations (DB setup, mock loading, etc)
3. Implement optimizations (parallel loading, lazy initialization)
4. Measure improvement
Target: <200s setup time
```

**Your Task** (15 minutes):
```bash
# Verify optimization
cd frontend
time npm test
```

#### Step 8: Verify and Commit (30 minutes)

**Your Tasks**:
1. [ ] Run full test suite:
```bash
cd frontend && npm test
cd ../backend && npm test
cd .. && npm test  # Run all workspaces
```

2. [ ] Verify <5% failure rate
3. [ ] Review test changes
4. [ ] Commit:
```bash
git add .
git commit -m "Fix frontend test failures and optimize test setup

- Fix canvas/annotation test failures with proper mocks
- Update API mock responses for exercise tests
- Fix timing issues with proper waitFor usage
- Optimize test setup from 644s to <200s
- Achieve <5% test failure rate (target met)

Test Results:
- Frontend: [X/Y tests passing]
- Backend: [X/Y tests passing]
- Overall: [X%] pass rate

🤖 Fixed with Claude Code"
```
5. [ ] Push to GitHub

---

### Phase 3: Code Quality (Day 4 - 2-3 hours)

#### Step 9: JSDoc Enhancement (2-3 hours automated)

**Command to Claude**:
```
Claude, add comprehensive JSDoc comments to the codebase:

Priority 1 (Critical):
- All exported functions in /frontend/src/services/
- All exported functions in /backend/src/services/
- All custom hooks in /frontend/src/hooks/
- All API route handlers in /backend/src/routes/

Priority 2 (Important):
- All exported components in /frontend/src/components/ui/
- All exported utilities
- All middleware functions

Format:
- Use full JSDoc syntax with @param, @returns, @throws
- Include brief description
- Add @example for complex functions
- Document error conditions

Target: 60%+ JSDoc coverage
Report metrics when complete.
```

**Your Task** (30 minutes):
- [ ] Review sample of added JSDoc comments
- [ ] Verify quality and accuracy
- [ ] Approve completion

#### Step 10: Architecture Documentation (1 hour automated)

**Command to Claude**:
```
Claude, create comprehensive architecture documentation:

1. Create docs/architecture/ARCHITECTURE.md with:
   - System architecture diagram (Mermaid.js)
   - Component hierarchy diagram
   - Data flow diagram
   - Authentication flow diagram
   - Database schema diagram

2. Create docs/architecture/DECISIONS.md with:
   - Document key architectural decisions
   - Rationale for technology choices
   - Trade-offs and alternatives considered

3. Update README.md:
   - Add "Architecture" section
   - Link to architecture docs
   - Include system diagram

Use Mermaid.js for all diagrams (renders on GitHub).
```

**Your Task** (15 minutes):
- [ ] Review diagrams (they'll render on GitHub)
- [ ] Verify accuracy
- [ ] Request adjustments if needed

#### Step 11: Review and Commit (30 minutes)

**Your Tasks**:
1. [ ] Review all documentation changes
2. [ ] Check JSDoc coverage:
```bash
# Claude will provide metrics, verify they match target
```
3. [ ] Commit:
```bash
git add .
git commit -m "Add comprehensive JSDoc comments and architecture documentation

- Add JSDoc to all services, hooks, and API routes
- Add @param, @returns, @throws annotations
- Include usage examples for complex functions
- Achieve 60%+ JSDoc coverage

Documentation:
- Create architecture diagrams (Mermaid.js)
- Document architectural decisions
- Add system, component, data flow diagrams
- Update README with architecture section

🤖 Enhanced with Claude Code"
```
4. [ ] Push to GitHub

---

### Phase 4: CI/CD Setup (Day 5 - 1-2 hours)

#### Step 12: GitHub Actions Setup (1 hour automated)

**Command to Claude**:
```
Claude, create a comprehensive GitHub Actions CI/CD pipeline:

1. Create .github/workflows/ci.yml:
   - Trigger: on push and pull_request to main
   - Jobs:
     a. Lint (ESLint for frontend and backend)
     b. Type Check (TypeScript)
     c. Test Backend (Jest with coverage)
     d. Test Frontend (Vitest with coverage)
     e. E2E Tests (Playwright - Chrome only for CI)
     f. Build (both workspaces)
   - Matrix strategy for Node 18 and 20
   - Upload coverage reports
   - Cache node_modules for speed

2. Create .github/workflows/deploy.yml:
   - Trigger: on push to main (after CI passes)
   - Build frontend for GitHub Pages
   - Deploy to gh-pages branch

3. Update README.md:
   - Add status badges for CI, tests, coverage
   - Document CI/CD workflow

4. Create .github/dependabot.yml:
   - Auto-update dependencies weekly
   - Separate PRs for frontend/backend
```

**Manual Steps** (5 minutes):
1. [ ] Enable GitHub Actions in repo settings
2. [ ] Verify GitHub Pages source (gh-pages branch)
3. [ ] Add any required secrets (if needed)

#### Step 13: Test CI/CD Pipeline (30 minutes)

**Your Tasks**:
1. [ ] Commit the workflow files:
```bash
git add .github/
git commit -m "Add GitHub Actions CI/CD pipeline

- Add CI workflow (lint, test, build)
- Add deployment workflow (GitHub Pages)
- Add Dependabot for dependency updates
- Add status badges to README
- Configure matrix builds (Node 18, 20)

🤖 Configured with Claude Code"
```

2. [ ] Push and watch Actions run:
```bash
git push origin main
```

3. [ ] Go to GitHub → Actions tab
4. [ ] Verify all jobs pass
5. [ ] Check that deployment succeeds

#### Step 14: Fix Any CI Issues (variable time)

**If CI Fails**:
```
Claude, the CI workflow failed with this error:
[paste error from GitHub Actions]

Please fix the workflow configuration.
```

**Your Task**:
- [ ] Iterate with Claude until CI passes

---

### Phase 5: Final Polish (Day 6 - 1 hour)

#### Step 15: Update Documentation (30 minutes)

**Command to Claude**:
```
Claude, perform final documentation updates:

1. Update README.md:
   - Add CI/CD badges (now that workflows exist)
   - Update project status to reflect Phase 3 Week 1 completion
   - Add links to new documentation files

2. Update CHANGELOG.md:
   - Add entry for v0.1.0
   - List all completed Phase 3 Week 1 items
   - Note test coverage achievements
   - Document new files added

3. Create docs/README.md:
   - Documentation index
   - Links to all doc categories
   - Quick reference guide

4. Verify all cross-references:
   - Check that all internal links work
   - Verify file paths are correct
```

#### Step 16: Final Review and Release Tag (30 minutes)

**Your Tasks**:
1. [ ] Full project review:
```bash
# Run all quality checks
npm run lint
npm run typecheck
npm test
npm run build
```

2. [ ] Review all changes since evaluation start
3. [ ] Create git tag for Phase 3 Week 1:
```bash
git tag -a v0.1.0-phase3-week1 -m "Phase 3 Week 1 Complete: Testing & Quality Assurance

Achievements:
- Backend test coverage: 95%+
- Frontend test stability: <5% failure rate
- Added all standard project files
- Comprehensive JSDoc documentation (60%+)
- Architecture documentation with diagrams
- CI/CD pipeline with GitHub Actions
- Dependency cleanup (removed react-query v3)

Next: Phase 3 Week 2 - DevOps & Infrastructure"

git push origin v0.1.0-phase3-week1
```

4. [ ] Create GitHub Release (optional):
   - Go to GitHub → Releases → New Release
   - Select tag: v0.1.0-phase3-week1
   - Title: "Phase 3 Week 1: Testing & Quality Assurance"
   - Description: Copy from tag message
   - Publish release

---

## Troubleshooting Guide

### Issue: Tests Still Failing After Fixes

**Symptoms**: Test failure rate >5% after Claude's fixes

**Your Actions**:
1. Identify remaining failure patterns
2. Ask Claude:
```
Claude, these tests are still failing:
[paste specific test names and errors]

Please investigate and fix these individually.
```

### Issue: Build Fails After Changes

**Symptoms**: `npm run build` fails

**Your Actions**:
1. Check error message
2. Ask Claude:
```
Claude, the build is failing with this error:
[paste error]

Please fix the build configuration.
```

### Issue: CI Pipeline Doesn't Start

**Symptoms**: No GitHub Actions run after push

**Your Actions**:
1. Check GitHub → Settings → Actions → "Allow all actions"
2. Verify .github/workflows/ files are committed
3. Check branch name matches workflow trigger

### Issue: JSDoc Comments Are Wrong

**Symptoms**: Claude added incorrect documentation

**Your Actions**:
```
Claude, review the JSDoc in [file path]:
- The parameter [name] is actually [correct description]
- The return type should be [correct type]
Please fix and update related comments.
```

### Issue: Merge Conflicts During Development

**Symptoms**: Can't push due to conflicts

**Your Actions**:
1. Pull latest changes:
```bash
git pull origin main
```
2. If conflicts, ask Claude:
```
Claude, I have merge conflicts in these files:
[list files]

Please help resolve them, preferring [local/remote] changes for [specific areas].
```

---

## Summary Checklists

### Manual Tasks Checklist

**Pre-Work (30 minutes)**:
- [ ] Review and confirm MIT License
- [ ] Define contributing policies
- [ ] Define security policy
- [ ] Review test failures and identify patterns
- [ ] Choose dependency upgrade strategy

**Review Tasks (2 hours total)**:
- [ ] Review standard files (LICENSE, CONTRIBUTING, etc.)
- [ ] Review dependency cleanup results
- [ ] Review test fixes (in batches)
- [ ] Review JSDoc additions (samples)
- [ ] Review architecture documentation
- [ ] Review CI/CD pipeline results

**Git Tasks (30 minutes total)**:
- [ ] Commit after Phase 1 (files + dependencies)
- [ ] Commit after Phase 2 (test fixes)
- [ ] Commit after Phase 3 (documentation)
- [ ] Commit after Phase 4 (CI/CD)
- [ ] Create release tag
- [ ] Create GitHub release (optional)

**Total Manual Time**: ~3 hours (decisions + reviews + git operations)

---

### Automated Tasks Checklist (Claude's Work)

**Phase 1: Critical Fixes (30 minutes)**:
- [ ] Create LICENSE file
- [ ] Create CONTRIBUTING.md
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Create SECURITY.md
- [ ] Create CHANGELOG.md
- [ ] Audit react-query v3 usage
- [ ] Remove react-query v3 dependency

**Phase 2: Test Stabilization (3-4 hours)**:
- [ ] Fix failing frontend tests (all patterns)
- [ ] Optimize test setup time
- [ ] Verify <5% failure rate

**Phase 3: Code Quality (2-3 hours)**:
- [ ] Add JSDoc to services (frontend + backend)
- [ ] Add JSDoc to hooks
- [ ] Add JSDoc to API routes
- [ ] Add JSDoc to UI components
- [ ] Create architecture diagrams
- [ ] Document architectural decisions
- [ ] Update README with architecture

**Phase 4: CI/CD (1 hour)**:
- [ ] Create CI workflow
- [ ] Create deployment workflow
- [ ] Create Dependabot config
- [ ] Add status badges
- [ ] Fix any CI issues

**Phase 5: Polish (30 minutes)**:
- [ ] Update README with badges
- [ ] Update CHANGELOG
- [ ] Create docs/README.md
- [ ] Verify all cross-references

**Total Automated Time**: ~8-10 hours

---

## Next Steps After Completion

Once all tasks are complete, you'll have:
- ✅ All standard project files (LICENSE, CONTRIBUTING, etc.)
- ✅ Stable test suite (<5% failure rate)
- ✅ Clean dependencies (no duplicates)
- ✅ Comprehensive JSDoc (60%+ coverage)
- ✅ Architecture documentation with diagrams
- ✅ CI/CD pipeline with automated testing
- ✅ GitHub Pages deployment automation
- ✅ Dependency update automation (Dependabot)

**Ready for Phase 3 Week 2**: DevOps & Infrastructure
- Docker containerization
- Staging environment
- Monitoring and alerting
- Production deployment optimization

---

## Quick Reference Commands

### For You (Manual)

```bash
# Review tests
cd frontend && npm test

# Build verification
npm run build

# Full quality check
npm run lint && npm run typecheck && npm test

# Commit workflow
git add .
git status
git commit -m "[message]"
git push origin main

# Create release tag
git tag -a v0.1.0-phase3-week1 -m "[message]"
git push origin v0.1.0-phase3-week1
```

### For Claude (Automated)

```
# Standard files
"Claude, create [LICENSE/CONTRIBUTING/etc] with [your policies]"

# Dependency cleanup
"Claude, audit and remove react-query v3 if unused"

# Test fixes
"Claude, fix failing tests. Patterns: [your analysis]"

# Documentation
"Claude, add JSDoc to all public APIs (60%+ coverage)"
"Claude, create architecture diagrams with Mermaid.js"

# CI/CD
"Claude, create GitHub Actions CI/CD pipeline"

# Verification
"Claude, run all quality checks and report status"
```

---

**Estimated Total Time**: 10.5-12.5 hours (spread over 5-6 days)
- **Your Manual Work**: 2.5-3 hours
- **Claude's Automated Work**: 8-10 hours
- **Your Review Time**: Additional 2 hours

**Recommended Pace**: 2-3 hours per day for 5 days

---

*This walkthrough is based on the PROJECT_STATUS_REPORT.md evaluation. All tasks are prioritized by impact and dependencies. You can execute phases in order or pick individual tasks as needed.*
