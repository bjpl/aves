# Week 1 Testing Implementation Checklist

Use this checklist to track progress through the testing infrastructure setup.

---

## Day 1-2: Testing Setup (12 hours)

### Dependencies Installation
- [ ] Frontend: Install @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
- [ ] Frontend: Install @vitest/ui, @vitest/coverage-v8, jsdom
- [ ] Frontend: Install MSW for API mocking
- [ ] Backend: Install supertest, @types/supertest
- [ ] Backend: Install @databases/pg-test
- [ ] Verify all dependencies install successfully

### Configuration Files
- [ ] Create `frontend/vitest.config.ts`
- [ ] Create `backend/jest.config.js`
- [ ] Update `frontend/package.json` scripts
- [ ] Update `backend/package.json` scripts
- [ ] Test configuration with `npm test -- --version`

### Test Setup Files
- [ ] Create `frontend/src/__tests__/setup.ts`
- [ ] Create `backend/src/__tests__/setup.ts`
- [ ] Configure global test utilities
- [ ] Mock browser APIs (matchMedia, IntersectionObserver)
- [ ] Mock localStorage
- [ ] Verify setup runs without errors

### Directory Structure
- [ ] Create `frontend/src/__tests__/unit/`
- [ ] Create `frontend/src/__tests__/unit/services/`
- [ ] Create `frontend/src/__tests__/unit/hooks/`
- [ ] Create `frontend/src/__tests__/unit/components/`
- [ ] Create `frontend/src/__tests__/integration/`
- [ ] Create `frontend/src/__tests__/fixtures/`
- [ ] Create `frontend/src/__tests__/mocks/`
- [ ] Create `backend/src/__tests__/routes/`
- [ ] Create `backend/src/__tests__/fixtures/`

### Test Fixtures
- [ ] Create `fixtures/annotations.ts` (4+ mock annotations)
- [ ] Create `fixtures/exercises.ts` (3+ exercise types)
- [ ] Create `fixtures/species.ts` (sample species data)
- [ ] Create `fixtures/vocabularyData.ts`
- [ ] Verify fixtures match TypeScript types

### Mock Service Worker
- [ ] Create `mocks/handlers.ts` with API mocks
- [ ] Create `mocks/server.ts` for Node environment
- [ ] Create `mocks/browser.ts` for browser environment
- [ ] Add handlers for annotations API
- [ ] Add handlers for exercises API
- [ ] Add handlers for vocabulary API
- [ ] Test MSW setup with simple test

---

## Day 3: ExerciseGenerator Tests (8 hours)

### Constructor Tests (30 min)
- [ ] Test: should initialize with annotations
- [ ] Test: should handle empty annotations array

### generateExercise Tests (1 hour)
- [ ] Test: should generate visual discrimination exercise
- [ ] Test: should generate term matching exercise
- [ ] Test: should generate contextual fill exercise
- [ ] Test: should return null for unknown exercise type
- [ ] Test: should return null when insufficient annotations

### generateVisualDiscrimination Tests (1.5 hours)
- [ ] Test: should include correct answer in options
- [ ] Test: should shuffle options randomly
- [ ] Test: should include 3 distractors
- [ ] Test: should use Spanish instructions
- [ ] Test: options should have required properties

### generateTermMatching Tests (1 hour)
- [ ] Test: should create matching pairs
- [ ] Test: should shuffle English terms
- [ ] Test: Spanish and English arrays should match length
- [ ] Test: all pairs should be valid

### generateContextualFill Tests (1 hour)
- [ ] Test: should include blank in sentence
- [ ] Test: should include correct answer in options
- [ ] Test: should provide 4 options
- [ ] Test: should use same annotation type for distractors

### checkAnswer Tests (2 hours)
- [ ] Test: visual discrimination - correct answer returns true
- [ ] Test: visual discrimination - incorrect answer returns false
- [ ] Test: term matching - all correct pairs returns true
- [ ] Test: term matching - incorrect pairs returns false
- [ ] Test: contextual fill - correct answer returns true
- [ ] Test: contextual fill - incorrect answer returns false

### generateFeedback Tests (1 hour)
- [ ] Test: should return positive feedback for correct answer
- [ ] Test: should return specific feedback for incorrect visual discrimination
- [ ] Test: should return specific feedback for incorrect contextual fill
- [ ] Test: should vary positive feedback messages

### Edge Cases (30 min)
- [ ] Test: should handle exactly 4 annotations
- [ ] Test: should handle many annotations (100+)
- [ ] Test: should handle annotations with missing optional fields

### Coverage Verification
- [ ] Run coverage report for exerciseGenerator.ts
- [ ] Verify 95%+ coverage
- [ ] Fix any uncovered branches

---

## Day 4: API Route Tests (8 hours)

### Exercise Routes Setup (30 min)
- [ ] Create test file structure
- [ ] Mock database connection
- [ ] Create Express app for testing
- [ ] Set up beforeEach and afterEach hooks

### POST /exercises/session/start (1 hour)
- [ ] Test: should create a new session
- [ ] Test: should generate session ID if not provided
- [ ] Test: should handle database errors
- [ ] Test: should return correct response format

### POST /exercises/result (1.5 hours)
- [ ] Test: should record exercise result
- [ ] Test: should handle incorrect answers
- [ ] Test: should handle missing optional fields
- [ ] Test: should update session statistics
- [ ] Test: should handle database errors

### GET /exercises/session/:sessionId/progress (1 hour)
- [ ] Test: should return session progress
- [ ] Test: should calculate accuracy correctly
- [ ] Test: should handle empty session
- [ ] Test: should handle database errors

### GET /exercises/difficult-terms (1 hour)
- [ ] Test: should return difficult terms
- [ ] Test: should order by success rate
- [ ] Test: should handle no difficult terms
- [ ] Test: should limit to 10 results

### Annotations Routes (1.5 hours)
- [ ] Test: GET /annotations/:imageId - success case
- [ ] Test: POST /annotations - valid data
- [ ] Test: POST /annotations - validation errors
- [ ] Test: PUT /annotations/:id - update success
- [ ] Test: DELETE /annotations/:id - success

### Species Routes (1 hour)
- [ ] Test: GET /species - list all
- [ ] Test: GET /species/:id - single species
- [ ] Test: GET /species/search - search functionality
- [ ] Test: POST /species - create new

### Vocabulary Routes (30 min)
- [ ] Test: GET /vocabulary/enrichment/:term
- [ ] Test: POST /vocabulary/track-interaction

### Coverage Verification
- [ ] Run coverage for all route files
- [ ] Verify 85%+ coverage
- [ ] Document any intentionally uncovered code

---

## Day 5: CI/CD Integration (8 hours)

### GitHub Actions Setup (2 hours)
- [ ] Create `.github/workflows/test.yml`
- [ ] Configure frontend test job
- [ ] Configure backend test job
- [ ] Add PostgreSQL service for backend tests
- [ ] Set up Node.js environment
- [ ] Configure caching for dependencies

### Coverage Reporting (1.5 hours)
- [ ] Sign up for Codecov account
- [ ] Add Codecov to GitHub Actions
- [ ] Configure coverage upload for frontend
- [ ] Configure coverage upload for backend
- [ ] Add coverage badges to README.md
- [ ] Test coverage reporting with a commit

### Pre-commit Hooks (1 hour)
- [ ] Install Husky
- [ ] Install lint-staged
- [ ] Configure pre-commit hook to run tests
- [ ] Configure pre-commit hook to run linter
- [ ] Test pre-commit hooks locally
- [ ] Document hook setup in README

### CI/CD Testing (1.5 hours)
- [ ] Create test branch
- [ ] Push changes and verify workflow runs
- [ ] Verify frontend tests pass in CI
- [ ] Verify backend tests pass in CI
- [ ] Verify coverage reports generate
- [ ] Fix any CI-specific issues

### Documentation (2 hours)
- [ ] Update README with testing instructions
- [ ] Document how to run tests locally
- [ ] Document how to view coverage reports
- [ ] Create TESTING.md guide
- [ ] Add examples of running specific tests
- [ ] Document troubleshooting common issues

---

## Quality Gates

### Before marking Week 1 complete:
- [ ] All 35+ tests passing
- [ ] Frontend coverage >80% for exerciseGenerator
- [ ] Backend coverage >85% for exercise routes
- [ ] CI/CD pipeline green
- [ ] Pre-commit hooks working
- [ ] Coverage badges displaying
- [ ] Documentation complete
- [ ] Team trained on testing workflow

---

## Troubleshooting

### Common Issues Checklist
- [ ] Tests fail locally but pass in CI → Check Node versions
- [ ] Coverage not reporting → Verify vitest.config.ts settings
- [ ] MSW not working → Check handler setup in setup.ts
- [ ] Database tests failing → Verify PostgreSQL service in CI
- [ ] Import errors → Check path aliases in config
- [ ] Type errors → Verify @types packages installed

---

## Resources Quick Links

- [ ] Bookmark: Vitest Docs (https://vitest.dev/)
- [ ] Bookmark: Testing Library Docs (https://testing-library.com/)
- [ ] Bookmark: MSW Docs (https://mswjs.io/)
- [ ] Bookmark: Jest Docs (https://jestjs.io/)
- [ ] Save: Team testing standards document

---

## Next Week Preview

### Week 2 Focus Areas
- [ ] Add component tests (vocabulary, exercises)
- [ ] Add hook tests (useProgress, useExercise)
- [ ] Add integration tests
- [ ] Backend authentication tests
- [ ] Service layer tests
- [ ] Target: 100+ total tests

---

**Track your progress:** Mark items complete as you go. Update this checklist daily.

**Last Updated:** 2025-10-02
