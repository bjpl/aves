# Complete Test Infrastructure Setup Guide

**Last Updated**: October 17, 2025
**Target Setup Time**: 30 minutes
**Required Knowledge**: Basic command line, PostgreSQL basics

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (3 Steps)](#quick-start-3-steps)
4. [Detailed Setup](#detailed-setup)
5. [Running Tests](#running-tests)
6. [Test Architecture](#test-architecture)
7. [Common Issues](#common-issues)
8. [Advanced Topics](#advanced-topics)

---

## Overview

The AVES test infrastructure uses:

- **Supabase PostgreSQL** with schema-based isolation
- **Jest** as the test framework
- **Schema-based testing** (production: `public`, testing: `aves_test`)
- **Mocked AI services** (Claude/Anthropic)
- **Async test utilities** for worker/batch operations

### Key Benefits

- Complete isolation from production data
- Works with Supabase free tier
- Fast test execution
- No accidental production data corruption
- Comprehensive test coverage (>80% target)

---

## Prerequisites

### Required Software

- Node.js 18+ and npm
- PostgreSQL access (Supabase or local)
- Git (for cloning repository)

### Required Credentials

- **Supabase Database Credentials**:
  - Host: `aws-0-us-east-1.pooler.supabase.com`
  - Port: `6543`
  - Database: `postgres`
  - User: `postgres`
  - Password: (in `.env.test`)

- **Anthropic API Key** (for AI mocking tests):
  - Get from: https://console.anthropic.com
  - Required for AI annotation tests

### Repository Access

Ensure you have cloned the repository:

```bash
git clone https://github.com/your-org/aves.git
cd aves
```

---

## Quick Start (3 Steps)

### Step 1: Create Test Schema on Supabase (1 minute)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ubqnfiwxghkxltluyczd/sql

2. **Run this SQL to create the test schema:**

   ```sql
   -- Create test schema
   CREATE SCHEMA IF NOT EXISTS aves_test;

   -- Grant permissions
   GRANT ALL ON SCHEMA aves_test TO postgres;
   GRANT ALL ON ALL TABLES IN SCHEMA aves_test TO postgres;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA aves_test TO postgres;

   -- Set default privileges
   ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test
   GRANT ALL ON TABLES TO postgres;

   ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test
   GRANT ALL ON SEQUENCES TO postgres;
   ```

3. **Verify schema was created:**

   ```sql
   SELECT schema_name
   FROM information_schema.schemata
   WHERE schema_name = 'aves_test';
   ```

   You should see `aves_test` in the results.

### Step 2: Run Test Migrations (30 seconds)

Navigate to the backend directory and run migrations:

```bash
cd backend
npm install  # If not already done
npx tsx ../scripts/migrate-test-schema.ts
```

Expected output:

```
🔧 Running migrations on schema: aves_test

✓ Schema aves_test ready
✓ Migrations table ready
▶️  Running 001_create_users_table.sql
✅ Completed 001_create_users_table.sql
...
✨ All migrations completed successfully in aves_test schema!
```

### Step 3: Verify Test Configuration

Ensure `.env.test` exists in the `backend/` directory with correct values:

```bash
# Check if .env.test exists
ls -la backend/.env.test
```

If it doesn't exist, create it using the template below (see [Detailed Setup](#detailed-setup)).

### Step 4: Run Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test suite
npm test -- annotation-workflow

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

---

## Detailed Setup

### 1. Environment Configuration

Create `backend/.env.test` with the following configuration:

```bash
# ========================================
# TEST DATABASE CONFIGURATION (Supabase)
# ========================================
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
TEST_DB_NAME=postgres
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_supabase_password_here
TEST_SCHEMA=aves_test

# Database SSL Configuration (Supabase requires SSL)
DB_SSL_ENABLED=true

# ========================================
# SECURITY KEYS (Use test keys)
# ========================================
JWT_SECRET=test_jwt_secret_key_min_32_chars_long
JWT_EXPIRES_IN=24h
SESSION_SECRET=test_session_secret_key_min_32_chars

# ========================================
# ANTHROPIC CLAUDE (For AI Annotation Tests)
# ========================================
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7

# AI Feature Flags (Enable for testing)
ENABLE_VISION_AI=true
VISION_PROVIDER=claude
ENABLE_IMAGE_ANALYSIS=true
ENABLE_EXERCISE_GENERATION=true

# ========================================
# TEST ENVIRONMENT
# ========================================
NODE_ENV=test
```

### 2. Database Schema Architecture

The test infrastructure uses **schema-based isolation**:

```
Production Environment:
├── Database: postgres
└── Schema: public (default)
    ├── users
    ├── species
    ├── annotations
    └── ... (all production tables)

Test Environment:
├── Database: postgres (same database)
└── Schema: aves_test (isolated)
    ├── users (test data only)
    ├── species (test data only)
    ├── annotations (test data only)
    └── ... (all tables replicated)
```

### 3. Migration System

Migrations are run automatically during test setup. The migration system:

1. Creates `aves_test` schema if it doesn't exist
2. Tracks migrations in `aves_test.migrations` table
3. Runs each migration file once (idempotent)
4. Supports both production and test-specific migrations

Migration files are located in:

```
backend/src/database/migrations/
├── 001_create_users_table.sql
├── 002_create_ai_annotations_table.sql
├── 003_create_vision_ai_cache.sql
├── 006_batch_jobs.sql
├── 007_exercise_cache.sql
├── 008_add_user_roles.sql
├── 009_optimize_cache_indexes.sql
├── 010_create_species_and_images.sql
├── 011_create_annotations_table.sql
└── test/
    └── 010_create_species_and_images.sql (simplified for tests)
```

### 4. Test Utilities

The project includes comprehensive test utilities:

#### Test Helper Functions

Located in `backend/src/__tests__/utils/`:

- **asyncTestUtils.ts** - Async operation helpers
  - `waitForCondition()` - Wait for async condition
  - `withTimeout()` - Timeout wrapper for promises
  - `retryWithBackoff()` - Retry with exponential backoff
  - `flushPromises()` - Flush pending promises
  - `TimerTracker` - Track and cleanup timers

- **workerMocks.ts** - Worker/batch processor mocks
  - `MockRateLimiter` - Mock rate limiter without real timers
  - `MockBatchProcessor` - Mock batch processor
  - `mockVisionAIService()` - Mock vision AI service
  - `waitForBatchJobCompletion()` - Wait for batch jobs

- **run-test-migrations.ts** - Migration utilities
  - Automated migration runner for test schema

#### AI Response Fixtures

Located in `backend/src/__tests__/fixtures/aiResponses.ts`:

Pre-configured mock responses for Claude/Anthropic API:

- `mockClaudeContextualFillResponse` - Exercise generation
- `mockClaudeTermMatchingResponse` - Term matching
- `mockClaudeImageLabelingResponse` - Image labeling
- `mockClaudeErrorResponse` - Error scenarios
- `mockClaudeEmptyResponse` - Empty responses

---

## Running Tests

### Basic Commands

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- annotation-workflow.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create annotation"

# Run with coverage
npm test -- --coverage

# Run in watch mode (for development)
npm test -- --watch

# Run only changed tests
npm test -- --onlyChanged

# Run with verbose output
npm test -- --verbose
```

### Test Suites Overview

#### Integration Tests

Located in `backend/src/__tests__/integration/`:

- **annotation-workflow.test.ts** - Complete annotation workflow
- **admin-dashboard-flow.test.ts** - Admin dashboard operations
- **auth-flow.test.ts** - Authentication flows
- **exercise-generation-flow.test.ts** - Exercise generation
- **species-vocabulary-flow.test.ts** - Species and vocabulary

#### Unit Tests

Located in `backend/src/__tests__/`:

- **services/** - Service layer tests
  - `aiExerciseGenerator.test.ts` - AI exercise generation
  - `UserService.test.ts` - User management
  - `VocabularyService.test.ts` - Vocabulary operations
  - `exerciseCache.test.ts` - Exercise caching

- **routes/** - Route handler tests
  - `auth.test.ts` - Auth endpoints
  - `exercises.test.ts` - Exercise endpoints
  - `vocabulary.test.ts` - Vocabulary endpoints

- **config/** - Configuration tests
  - `aiConfig.test.ts` - AI configuration

- **Core tests**:
  - `validation.test.ts` - Input validation
  - `validate-middleware.test.ts` - Middleware validation
  - `sanitize.test.ts` - Input sanitization

### Expected Test Results

After proper setup, you should see:

```
Test Suites: 19 passed, 19 total
Tests:       102 passed, 102 total
Snapshots:   0 total
Time:        45.234 s
```

---

## Test Architecture

### Test Lifecycle

```
Test Suite Start
├── beforeAll()
│   ├── Load .env.test configuration
│   ├── Connect to test database
│   └── Run migrations (if needed)
│
├── beforeEach()
│   ├── Clean test data from previous test
│   ├── Set up test fixtures
│   └── Initialize mocks
│
├── Test Execution
│   ├── Run test logic
│   ├── Verify assertions
│   └── Check database state
│
├── afterEach()
│   ├── Clean up test data
│   ├── Clear mocks
│   └── Reset state
│
└── afterAll()
    ├── Close database connections
    ├── Cleanup workers/timers
    └── Global teardown
```

### Database Cleanup Strategy

Each test suite uses isolated cleanup:

```typescript
afterEach(async () => {
  // Clean test data (schema-scoped)
  await pool.query(`DELETE FROM aves_test.annotations`);
  await pool.query(`DELETE FROM aves_test.images`);
  await pool.query(`DELETE FROM aves_test.species`);
  await pool.query(`DELETE FROM aves_test.users`);
});
```

### AI Service Mocking

All AI services are mocked to avoid:

- Real API calls in tests
- API rate limits
- API costs
- Network dependencies

Example mock setup:

```typescript
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockClaudeResponse)
      }
    }))
  };
});
```

---

## Common Issues

### Issue 1: "Schema aves_test does not exist"

**Cause**: Test schema not created in Supabase
**Solution**: Run Step 1 of Quick Start to create schema

```sql
CREATE SCHEMA IF NOT EXISTS aves_test;
GRANT ALL ON SCHEMA aves_test TO postgres;
```

### Issue 2: "Table does not exist"

**Cause**: Migrations not run on test schema
**Solution**: Run migrations

```bash
cd backend
npx tsx ../scripts/migrate-test-schema.ts
```

### Issue 3: "password authentication failed"

**Cause**: Incorrect database credentials in `.env.test`
**Solution**: Verify credentials

```bash
# Check .env.test has correct password
cat backend/.env.test | grep TEST_DB_PASSWORD
```

### Issue 4: "Connection refused" or "Network unreachable"

**Cause**: Using direct connection instead of connection pooler
**Solution**: Use Supabase connection pooler (port 6543)

```bash
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
```

### Issue 5: "Worker exited before finishing task"

**Cause**: Worker processes not properly cleaned up
**Solution**: Use worker mocks from test utilities

```typescript
import { MockBatchProcessor } from '../utils/workerMocks';

// In test
const processor = new MockBatchProcessor();
// ... use processor
processor.destroy(); // Clean up
```

### Issue 6: "Invalid API key" (Anthropic)

**Cause**: Missing or invalid Anthropic API key
**Solution**:

1. Get API key from https://console.anthropic.com
2. Add to `.env.test`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Issue 7: Tests hanging or timing out

**Cause**: Async operations not completing, timers not cleaned up
**Solution**: Use async test utilities

```typescript
import { cleanupAsyncTests, withTimeout } from '../utils/asyncTestUtils';

afterEach(async () => {
  await cleanupAsyncTests();
});

// Use timeout wrapper
await withTimeout(
  someAsyncOperation(),
  5000,
  'Operation timed out'
);
```

---

## Advanced Topics

### Running Tests in CI/CD

GitHub Actions configuration (`.github/workflows/test.yml`):

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run migrations
        env:
          TEST_DB_HOST: ${{ secrets.TEST_DB_HOST }}
          TEST_DB_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cd backend
          npx tsx ../scripts/migrate-test-schema.ts

      - name: Run tests
        env:
          TEST_DB_HOST: ${{ secrets.TEST_DB_HOST }}
          TEST_DB_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cd backend
          npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Local PostgreSQL Setup (Alternative)

If you prefer local PostgreSQL instead of Supabase:

1. **Install PostgreSQL**:

   ```bash
   # Windows (Chocolatey)
   choco install postgresql

   # macOS (Homebrew)
   brew install postgresql

   # Linux (Ubuntu/Debian)
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create test database**:

   ```bash
   createdb aves_test
   psql aves_test -c "CREATE SCHEMA aves_test;"
   ```

3. **Update `.env.test`**:

   ```bash
   TEST_DB_HOST=localhost
   TEST_DB_PORT=5432
   TEST_DB_NAME=aves_test
   TEST_DB_USER=postgres
   TEST_DB_PASSWORD=postgres
   TEST_SCHEMA=aves_test
   DB_SSL_ENABLED=false
   ```

### Writing New Tests

#### Template for Integration Tests

```typescript
import { pool } from '../../database/connection';
import { cleanupAsyncTests } from '../utils/asyncTestUtils';

describe('Feature Name', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test data
    const result = await pool.query(
      `INSERT INTO aves_test.users (email, name)
       VALUES ($1, $2) RETURNING id`,
      ['test@example.com', 'Test User']
    );
    testUserId = result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM aves_test.users WHERE id = $1`, [testUserId]);
    await cleanupAsyncTests();
  });

  it('should perform expected behavior', async () => {
    // Arrange
    const input = { /* test data */ };

    // Act
    const result = await functionUnderTest(input);

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

#### Template for Unit Tests with Mocks

```typescript
import { AIExerciseGenerator } from '../../services/aiExerciseGenerator';
import { mockClaudeContextualFillResponse } from '../fixtures/aiResponses';

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() }
  }))
}));

describe('AI Exercise Generator', () => {
  let generator: AIExerciseGenerator;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockCreate = jest.fn().mockResolvedValue(mockClaudeContextualFillResponse);
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    generator = new AIExerciseGenerator(pool, {
      apiKey: 'test-key'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate exercise', async () => {
    const result = await generator.generateExercise('contextual_fill', mockContext);

    expect(mockCreate).toHaveBeenCalled();
    expect(result.type).toBe('contextual_fill');
  });
});
```

### Performance Testing

Run tests with performance profiling:

```bash
# Time individual test suites
npm test -- --verbose --testTimeout=10000

# Profile test execution
node --inspect-brk node_modules/.bin/jest --runInBand

# Check for slow tests
npm test -- --verbose | grep -E '\([0-9]+ ms\)'
```

---

## Test Coverage Goals

Current coverage targets:

- **Overall**: >80% coverage
- **Critical paths**: >90% coverage (authentication, data integrity)
- **Services**: >85% coverage
- **Routes**: >80% coverage
- **Utilities**: >75% coverage

View coverage report:

```bash
cd backend
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## Additional Resources

- [AI Testing Patterns](./ai-testing-patterns.md) - Mocking Anthropic API
- [Incremental Test Workflow](./incremental-test-workflow.md) - Plan B guide
- [Test Troubleshooting Guide](./test-troubleshooting.md) - Common failures
- [Test Failure Analysis](./test-failure-analysis.md) - Detailed issue breakdown

---

## Support and Contribution

### Getting Help

1. Check [Test Troubleshooting Guide](./test-troubleshooting.md)
2. Review [Test Failure Analysis](./test-failure-analysis.md)
3. Check recent daily reports in `/daily_dev_startup_reports/`
4. Open an issue on GitHub

### Contributing Tests

When adding new features:

1. Write tests FIRST (TDD approach)
2. Achieve >80% coverage for new code
3. Use existing test utilities and mocks
4. Follow test templates above
5. Update documentation if needed

---

**Documentation maintained by**: Development Team
**Last verified**: October 17, 2025
**Next review**: Monthly or when infrastructure changes
