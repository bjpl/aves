# Incremental Test Fixing Workflow (Plan B)

**Last Updated**: October 17, 2025
**Duration**: 1 week (5 days)
**Goal**: Fix 102 failing tests while maintaining feature development velocity

---

## Table of Contents

1. [Overview](#overview)
2. [Strategy](#strategy)
3. [Daily Schedule](#daily-schedule)
4. [Phase-by-Phase Guide](#phase-by-phase-guide)
5. [Progress Tracking](#progress-tracking)
6. [Success Metrics](#success-metrics)
7. [Risk Management](#risk-management)

---

## Overview

**Plan B** balances test infrastructure fixes with ongoing feature development, allowing you to:

- Fix critical test failures incrementally
- Maintain feature development velocity
- Avoid long development freezes
- Build confidence progressively

### When to Use Plan B

Use this approach when:

- You need to deliver features while fixing tests
- Stakeholders require visible progress on features
- Team has bandwidth for parallel work
- Test fixes can be done in isolation

### When NOT to Use Plan B

Avoid this approach when:

- All tests block feature development (use Plan A instead)
- Test issues are interdependent
- Context switching overhead is too high
- Team size is <2 developers

---

## Strategy

### Daily Split

Each day follows this pattern:

```
Morning (9am - 12pm): Test Fixes
├── Focus: Fix 20-30 failing tests
├── Approach: Tackle one root cause category
└── Output: Tests passing, committed

Afternoon (1pm - 5pm): Feature Development
├── Focus: New features or enhancements
├── Approach: Normal development workflow
└── Output: Features implemented, reviewed
```

### Priorities

1. **Database schema issues** (Day 1) - Highest impact
2. **Database authentication** (Day 2) - Unblocks integration tests
3. **AI service configuration** (Day 3-4) - Many test files affected
4. **Worker process stability** (Day 5) - Nice-to-have fixes

---

## Daily Schedule

### Day 1: Database Schema Fixes

**Morning Session (3 hours)**

**Target**: Fix batch_jobs table issues (~50 tests)

```bash
# 9:00 - 9:30: Setup and planning
cd backend
npm test 2>&1 | grep "batch_jobs" > batch_jobs_failures.txt

# 9:30 - 11:00: Implementation
# 1. Create batch_jobs migration
# 2. Run migrations on test schema
# 3. Verify table structure

# 11:00 - 12:00: Testing and verification
npm test -- routes/exercises.test.ts
npm test -- integration/exercise-generation-flow.test.ts
```

**Tasks**:

1. Create `backend/src/database/migrations/006_batch_jobs.sql`:

```sql
CREATE TABLE IF NOT EXISTS batch_jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at);
```

2. Run test migrations:

```bash
npx tsx ../scripts/migrate-test-schema.ts
```

3. Verify tests pass:

```bash
npm test -- routes/exercises.test.ts
```

**Expected Outcome**: ~50 tests now passing (52 remaining)

**Afternoon Session (4 hours)**

Feature development - your choice of priority features.

---

### Day 2: Database Authentication

**Morning Session (3 hours)**

**Target**: Fix database connection issues (~25 tests)

```bash
# 9:00 - 9:30: Diagnosis
npm test 2>&1 | grep "authentication failed" > auth_failures.txt

# 9:30 - 11:00: Fix credentials
# Update .env.test with correct credentials
# Test connection

# 11:00 - 12:00: Verification
npm test -- integration/auth-flow.test.ts
npm test -- integration/species-vocabulary-flow.test.ts
```

**Tasks**:

1. Verify `.env.test` credentials:

```bash
# Test database connection
psql "postgresql://postgres:PASSWORD@HOST:PORT/postgres?options=-c%20search_path=aves_test"
```

2. If connection fails, update `.env.test`:

```bash
# Use Supabase connection pooler
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
TEST_DB_USER=postgres
TEST_DB_PASSWORD=correct_password_here
```

3. Run integration tests:

```bash
npm test -- integration/
```

**Expected Outcome**: ~25 tests now passing (27 remaining)

**Afternoon Session (4 hours)**

Feature development.

---

### Day 3: AI Configuration (Part 1)

**Morning Session (3 hours)**

**Target**: Fix aiConfig.test.ts (~3 tests)

```bash
# 9:00 - 10:30: Update test expectations
# Fix provider mismatch (openai -> claude)
# Update feature flag defaults

# 10:30 - 12:00: Update error messages
# Fix API key validation messages
```

**Tasks**:

1. Update `backend/src/__tests__/config/aiConfig.test.ts`:

```typescript
// Change test expectations to match actual config
it('should load default configuration', () => {
  const config = loadAIConfig();

  // System uses Claude/Anthropic, not OpenAI
  expect(config.vision.provider).toBe('claude');
  // Feature flags default to true in test env
  expect(config.features.enableVisionAI).toBe(true);
});

it('should require Anthropic API key', () => {
  const config = {
    ...DEFAULT_AI_CONFIG,
    features: { enableVisionAI: true }
  };

  const result = validateAIConfig(config);

  expect(result.valid).toBe(false);
  expect(result.errors).toContain('ANTHROPIC_API_KEY is required when vision AI is enabled');
});
```

2. Run config tests:

```bash
npm test -- config/aiConfig.test.ts
```

**Expected Outcome**: ~3 tests now passing (24 remaining)

**Afternoon Session (4 hours)**

Feature development.

---

### Day 4: AI Configuration (Part 2)

**Morning Session (3 hours)**

**Target**: Fix aiExerciseGenerator.test.ts (~17 tests)

```bash
# 9:00 - 11:00: Update mocks and expectations
# Fix error message assertions
# Update response validation

# 11:00 - 12:00: Test and verify
npm test -- services/aiExerciseGenerator.test.ts
```

**Tasks**:

1. Verify all mocks use Claude responses (already done):

```typescript
// These should already be using mockClaudeContextualFillResponse, etc.
import {
  mockClaudeContextualFillResponse,
  mockClaudeTermMatchingResponse
} from '../fixtures/aiResponses';
```

2. Update error message expectations:

```typescript
// Change from:
expect(() => {
  new AIExerciseGenerator(pool, { apiKey: '' });
}).toThrow('OpenAI API key is required');

// To:
expect(() => {
  new AIExerciseGenerator(pool, { apiKey: '' });
}).toThrow('Anthropic API key is required');
```

3. Update response validation error messages:

```typescript
// Change from:
throw new Error('Invalid JSON response from GPT-4');

// To:
throw new Error('Invalid JSON response from Claude');
```

4. Run tests:

```bash
npm test -- services/aiExerciseGenerator.test.ts
```

**Expected Outcome**: ~17 tests now passing (7 remaining)

**Afternoon Session (4 hours)**

Feature development.

---

### Day 5: Worker Process Cleanup

**Morning Session (3 hours)**

**Target**: Fix worker-related test failures (~7 tests)

```bash
# 9:00 - 10:30: Add worker mocks
# Import and use MockBatchProcessor
# Add proper cleanup in afterEach

# 10:30 - 12:00: Increase timeouts
# Update test timeouts for async operations
```

**Tasks**:

1. Add worker cleanup to test files:

```typescript
import { MockBatchProcessor, cleanupAsyncTests } from '../utils/workerMocks';

describe('Batch Processing', () => {
  let processor: MockBatchProcessor;

  beforeEach(() => {
    processor = new MockBatchProcessor();
  });

  afterEach(async () => {
    processor.destroy();
    await cleanupAsyncTests();
  });

  it('should process batch', async () => {
    const jobId = await processor.startBatch(['img1', 'img2']);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 50));

    const progress = await processor.getJobProgress(jobId);
    expect(progress.status).toBe('completed');
  });
});
```

2. Increase timeouts for async tests:

```typescript
jest.setTimeout(10000); // 10 seconds for async tests
```

3. Run tests:

```bash
npm test -- services/batchProcessor.test.ts
npm test -- integration/batch-operations.test.ts
```

**Expected Outcome**: ~7 tests now passing (0 remaining!)

**Afternoon Session (4 hours)**

Feature development + celebration!

---

## Phase-by-Phase Guide

### Phase 1: Database Schema (Day 1)

**Root Cause**: Missing `batch_jobs` table in test schema

**Files to Update**:
- `backend/src/database/migrations/006_batch_jobs.sql` (CREATE if missing)
- Run: `npx tsx ../scripts/migrate-test-schema.ts`

**Test Files Affected**:
- `routes/exercises.test.ts`
- `integration/exercise-generation-flow.test.ts`
- `integration/admin-dashboard-flow.test.ts`
- `services/ExerciseService.test.ts`

**Verification**:

```bash
# Should show batch_jobs table
psql "postgresql://USER:PASS@HOST:PORT/postgres?options=-c%20search_path=aves_test" \
  -c "\dt batch_jobs"

# Tests should pass
npm test -- routes/exercises.test.ts
```

### Phase 2: Database Authentication (Day 2)

**Root Cause**: Incorrect database credentials in `.env.test`

**Files to Update**:
- `backend/.env.test` (credentials)

**Test Files Affected**:
- `integration/auth-flow.test.ts`
- `integration/species-vocabulary-flow.test.ts`
- `routes/auth.test.ts`

**Verification**:

```bash
# Test connection
psql "postgresql://postgres:PASS@HOST:6543/postgres?options=-c%20search_path=aves_test" \
  -c "SELECT current_schema();"

# Tests should pass
npm test -- integration/auth-flow.test.ts
```

### Phase 3: AI Configuration (Days 3-4)

**Root Cause**: Tests expect OpenAI but system uses Claude

**Files to Update**:
- `backend/src/__tests__/config/aiConfig.test.ts`
- `backend/src/__tests__/services/aiExerciseGenerator.test.ts`

**Changes Needed**:

1. Update provider expectations:
   - `'openai'` → `'claude'`

2. Update error messages:
   - `'OpenAI API key'` → `'Anthropic API key'`
   - `'GPT-4'` → `'Claude'`

3. Update feature flag defaults:
   - `false` → `true` (for test environment)

**Verification**:

```bash
npm test -- config/aiConfig.test.ts
npm test -- services/aiExerciseGenerator.test.ts
```

### Phase 4: Worker Cleanup (Day 5)

**Root Cause**: Worker processes not properly cleaned up

**Files to Update**:
- Any test file using batch processors
- Any test file with async operations

**Changes Needed**:

1. Import worker mocks:

```typescript
import { MockBatchProcessor, cleanupAsyncTests } from '../utils/workerMocks';
```

2. Add cleanup:

```typescript
afterEach(async () => {
  await cleanupAsyncTests();
});
```

3. Use mock processors:

```typescript
const processor = new MockBatchProcessor();
// ... use processor
processor.destroy();
```

**Verification**:

```bash
npm test -- services/batchProcessor.test.ts
```

---

## Progress Tracking

### Daily Checklist

**Day 1**:
- [ ] batch_jobs migration created
- [ ] Test schema migrated
- [ ] 50+ tests passing
- [ ] Changes committed
- [ ] Feature work completed

**Day 2**:
- [ ] .env.test credentials verified
- [ ] Database connection tested
- [ ] 25+ tests passing
- [ ] Changes committed
- [ ] Feature work completed

**Day 3**:
- [ ] aiConfig.test.ts updated
- [ ] Tests passing
- [ ] Changes committed
- [ ] Feature work completed

**Day 4**:
- [ ] aiExerciseGenerator.test.ts updated
- [ ] Tests passing
- [ ] Changes committed
- [ ] Feature work completed

**Day 5**:
- [ ] Worker mocks added
- [ ] Async cleanup added
- [ ] All tests passing
- [ ] Changes committed
- [ ] Celebration!

### Progress Tracking Commands

Check overall progress:

```bash
# Run all tests and count failures
npm test 2>&1 | grep "Tests:" | tee test_results.txt

# Expected progression:
# Day 0: Tests: 0 passed, 102 failed, 102 total
# Day 1: Tests: 50 passed, 52 failed, 102 total
# Day 2: Tests: 75 passed, 27 failed, 102 total
# Day 3: Tests: 78 passed, 24 failed, 102 total
# Day 4: Tests: 95 passed, 7 failed, 102 total
# Day 5: Tests: 102 passed, 0 failed, 102 total ✨
```

Check specific categories:

```bash
# Database schema issues
npm test 2>&1 | grep -c "batch_jobs does not exist"

# Authentication issues
npm test 2>&1 | grep -c "authentication failed"

# AI config issues
npm test -- config/aiConfig.test.ts 2>&1 | grep "passed"

# Worker issues
npm test 2>&1 | grep -c "Worker exited"
```

---

## Success Metrics

### Daily Targets

| Day | Tests Fixed | Tests Remaining | Feature Work |
|-----|-------------|-----------------|--------------|
| 0   | 0           | 102             | -            |
| 1   | 50          | 52              | 1 feature    |
| 2   | 25          | 27              | 1 feature    |
| 3   | 3           | 24              | 1 feature    |
| 4   | 17          | 7               | 1 feature    |
| 5   | 7           | 0               | Celebrate!   |

### Week-End Goals

By end of week, you should have:

- 100% test pass rate (102/102 tests passing)
- 5 features implemented and tested
- Test infrastructure fully documented
- Team confident in test suite
- CI/CD pipeline green

---

## Risk Management

### Risk 1: Hidden Dependencies

**Symptom**: Fixing one test breaks another

**Mitigation**:
- Run full test suite after each fix
- Commit working changes immediately
- Keep changes isolated to specific files

### Risk 2: Context Switching Overhead

**Symptom**: Losing focus, reduced productivity

**Mitigation**:
- Use strict time boundaries (morning/afternoon)
- Document what you're working on
- Keep test fixes simple and focused

### Risk 3: Feature Work Takes Longer

**Symptom**: Can't finish features in afternoon

**Mitigation**:
- Choose smaller features for this week
- Push complex features to next week
- Focus on bug fixes or small enhancements

### Risk 4: Test Fixes More Complex Than Expected

**Symptom**: Morning session runs over time

**Mitigation**:
- Stop at 12pm regardless of completion
- Continue next morning
- Document blockers for team discussion

### Risk 5: New Test Failures Appear

**Symptom**: Tests that were passing now fail

**Mitigation**:
- Run tests before starting each day
- Track new failures separately
- Fix regressions immediately before continuing

---

## Tips for Success

### 1. Start Early

Begin test fixes at 9am sharp. Morning focus is critical.

### 2. Use Pomodoro Technique

Break morning into focused 25-minute blocks:
- 9:00-9:25: Planning and diagnosis
- 9:30-9:55: Implementation
- 10:00-10:25: Implementation
- 10:30-10:55: Testing
- 11:00-11:25: Verification
- 11:30-11:55: Documentation and commit

### 3. Commit Frequently

Commit after each category of fixes:

```bash
git add .
git commit -m "Fix batch_jobs table issue - 50 tests now passing"
```

### 4. Document Blockers

Keep a `blockers.md` file:

```markdown
# Test Fix Blockers

## Day 1
- [ ] Need production database credentials
- [ ] Unclear which migration file to update

## Day 2
- [x] Database connection syntax unclear (SOLVED: use connection pooler)
```

### 5. Celebrate Wins

Each day, celebrate progress:
- Send team update with test count
- Update project dashboard
- Acknowledge incremental progress

### 6. Track Time

Monitor actual time spent:

```
Day 1:
- Test fixes: 2.5 hours (under 3 hour budget!)
- Feature work: 4 hours
```

### 7. Pair When Stuck

If blocked for >30 minutes:
- Ask teammate for pair programming
- Check documentation
- Post in team chat

---

## Example Daily Update

Post this each day to keep team informed:

```markdown
## Test Fix Progress - Day 3

### Morning Session
- Fixed: AI configuration test expectations
- Tests passing: 78/102 (76% pass rate)
- Time spent: 2.5 hours
- Challenges: None

### Afternoon Session
- Feature: Implemented bulk annotation approve
- Status: In review
- Time spent: 3.5 hours

### Tomorrow Plan
- Morning: Fix AI exercise generator tests (expect 17 more tests passing)
- Afternoon: Continue feature work
```

---

## Alternative: Compressed 3-Day Schedule

If you need faster results, compress to 3 days:

**Day 1**: Database issues (morning) + AI config (afternoon)
**Day 2**: AI exercise generator (morning) + worker cleanup (afternoon)
**Day 3**: Final fixes and verification

This sacrifices some feature work but gets tests green faster.

---

## Transition to Plan A

If you find:
- Feature work constantly interrupted by test failures
- Test fixes taking longer than expected
- Context switching too costly

**Consider switching to Plan A** (full 3-day test sprint). Better to finish tests completely than drag them out.

---

## Additional Resources

- [Test Setup Instructions](./TEST-SETUP-INSTRUCTIONS.md) - Full setup guide
- [AI Testing Patterns](./ai-testing-patterns.md) - Mocking guide
- [Test Troubleshooting](./test-troubleshooting.md) - Common issues
- [Test Failure Analysis](./test-failure-analysis.md) - Detailed breakdown

---

**Documentation maintained by**: Development Team
**Last verified**: October 17, 2025
**Recommended for**: Teams balancing test fixes with feature delivery
