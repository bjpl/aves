# Test Troubleshooting Guide

**Last Updated**: October 17, 2025
**Covers**: All 4 root causes of 102 test failures
**Target Audience**: Developers, Test Engineers

---

## Table of Contents

1. [Quick Diagnosis](#quick-diagnosis)
2. [Root Cause 1: Database Schema Issues](#root-cause-1-database-schema-issues)
3. [Root Cause 2: Database Authentication](#root-cause-2-database-authentication)
4. [Root Cause 3: AI Service Configuration](#root-cause-3-ai-service-configuration)
5. [Root Cause 4: Worker Process Issues](#root-cause-4-worker-process-issues)
6. [Other Common Issues](#other-common-issues)
7. [Debugging Tools](#debugging-tools)
8. [Emergency Fixes](#emergency-fixes)

---

## Quick Diagnosis

Run this command to categorize failures:

```bash
cd backend
npm test 2>&1 | tee test_output.txt

# Count failures by category
grep -c "batch_jobs does not exist" test_output.txt        # Database schema
grep -c "authentication failed" test_output.txt            # Database auth
grep -c "OPENAI_API_KEY\|Invalid API key" test_output.txt  # AI config
grep -c "Worker exited" test_output.txt                    # Worker issues
```

### Quick Status Check

```bash
# Overall test status
npm test 2>&1 | grep "Tests:"

# Examples:
# Tests: 0 passed, 102 failed, 102 total    ← Need to fix everything
# Tests: 50 passed, 52 failed, 102 total    ← Database schema fixed
# Tests: 75 passed, 27 failed, 102 total    ← Auth fixed
# Tests: 102 passed, 0 failed, 102 total    ← All good! ✨
```

---

## Root Cause 1: Database Schema Issues

**Impact**: ~50 tests failing
**Priority**: CRITICAL
**Time to Fix**: 30 minutes

### Symptoms

```
Error: relation "batch_jobs" does not exist
Error: column "job_id" does not exist
Error: table "aves_test.batch_jobs" does not exist
```

**Affected Test Files**:
- `routes/exercises.test.ts`
- `integration/exercise-generation-flow.test.ts`
- `integration/admin-dashboard-flow.test.ts`
- `services/ExerciseService.test.ts`

### Diagnosis

Check if batch_jobs table exists:

```bash
# Connect to test database
psql "postgresql://postgres:PASSWORD@HOST:6543/postgres?options=-c%20search_path=aves_test"

# Check for batch_jobs table
\dt batch_jobs

# If not found, you'll see: "Did not find any relation named "batch_jobs"."
```

### Solution 1: Run Migrations

**If migrations exist but weren't run:**

```bash
cd backend
npx tsx ../scripts/migrate-test-schema.ts
```

Expected output:

```
🔧 Running migrations on schema: aves_test
✓ Schema aves_test ready
✓ Migrations table ready
▶️  Running 006_batch_jobs.sql
✅ Completed 006_batch_jobs.sql
✨ All migrations completed successfully!
```

### Solution 2: Create Migration (If Missing)

**If migration file doesn't exist:**

Create `backend/src/database/migrations/006_batch_jobs.sql`:

```sql
-- Create batch_jobs table for job tracking
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status
  ON batch_jobs(status);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at
  ON batch_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_type_status
  ON batch_jobs(job_type, status);
```

Then run migrations:

```bash
npx tsx ../scripts/migrate-test-schema.ts
```

### Solution 3: Manual Table Creation

**Quick fix for immediate testing:**

```sql
-- Connect to database
psql "postgresql://postgres:PASSWORD@HOST:6543/postgres"

-- Set schema
SET search_path TO aves_test;

-- Create table
CREATE TABLE batch_jobs (
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

-- Verify
\dt batch_jobs
```

### Verification

```bash
# Run affected tests
npm test -- routes/exercises.test.ts

# Should see tests passing:
# ✓ should generate exercises
# ✓ should track batch job status
# etc.
```

### If Still Failing

1. **Check schema context**:

```sql
-- Verify test schema exists
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'aves_test';

-- Check current schema
SELECT current_schema();

-- Should return: aves_test
```

2. **Check table ownership**:

```sql
-- Verify you can query the table
SELECT COUNT(*) FROM aves_test.batch_jobs;
```

3. **Check test setup**:

```typescript
// In test file, verify schema is set
beforeAll(async () => {
  await pool.query('SET search_path TO aves_test');
});
```

---

## Root Cause 2: Database Authentication

**Impact**: ~25 tests failing
**Priority**: HIGH
**Time to Fix**: 15 minutes

### Symptoms

```
Error: password authentication failed for user "postgres"
Error: connection refused
Error: FATAL: no pg_hba.conf entry
Error: network unreachable (IPv6 issue)
```

**Affected Test Files**:
- `integration/auth-flow.test.ts`
- `integration/species-vocabulary-flow.test.ts`
- `routes/auth.test.ts`
- Any test requiring database connection

### Diagnosis

Test database connection:

```bash
# Method 1: Using psql
psql "postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=-c%20search_path=aves_test"

# Method 2: Using Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres',
  password: 'YOUR_PASSWORD',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT 1').then(() => {
  console.log('✓ Connection successful!');
  pool.end();
}).catch(err => {
  console.error('✗ Connection failed:', err.message);
  pool.end();
});
"
```

### Solution 1: Update .env.test Credentials

Edit `backend/.env.test`:

```bash
# USE CONNECTION POOLER (port 6543) - more reliable
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
TEST_DB_NAME=postgres
TEST_DB_USER=postgres
TEST_DB_PASSWORD=ymS5gBm9Wz9q1P11  # Your actual password
TEST_SCHEMA=aves_test

# Enable SSL (required for Supabase)
DB_SSL_ENABLED=true
```

### Solution 2: Fix IPv6 Issues

If you see "network unreachable":

```bash
# Use connection pooler instead of direct connection
# Connection pooler supports IPv4

# WRONG (direct connection, may use IPv6):
TEST_DB_HOST=db.ubqnfiwxghkxltluyczd.supabase.co
TEST_DB_PORT=5432

# CORRECT (connection pooler, IPv4):
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
```

### Solution 3: Check SSL Configuration

```bash
# Supabase requires SSL
TEST_DB_HOST=aws-0-us-east-1.pooler.supabase.com
TEST_DB_PORT=6543
DB_SSL_ENABLED=true

# For local PostgreSQL, disable SSL
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
DB_SSL_ENABLED=false
```

### Verification

```bash
# Run integration tests
npm test -- integration/auth-flow.test.ts

# Should see:
# ✓ should authenticate user
# ✓ should create user session
# etc.
```

### If Still Failing

1. **Verify password**:

```bash
# Get fresh credentials from Supabase dashboard
# https://supabase.com/dashboard/project/ubqnfiwxghkxltluyczd/settings/database
```

2. **Check firewall**:

```bash
# Ensure ports are not blocked
telnet aws-0-us-east-1.pooler.supabase.com 6543

# Should connect
```

3. **Check user permissions**:

```sql
-- Connect as admin
psql "postgresql://postgres:PASSWORD@HOST:6543/postgres"

-- Check permissions
\l  -- List databases
\dn -- List schemas

-- Grant permissions if needed
GRANT ALL ON SCHEMA aves_test TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA aves_test TO postgres;
```

---

## Root Cause 3: AI Service Configuration

**Impact**: ~20 tests failing
**Priority**: MEDIUM
**Time to Fix**: 2 hours

### Symptoms

```
Expected: "openai"
Received: "claude"

Expected: false (feature flags)
Received: true

Error: OPENAI_API_KEY is required when vision AI is enabled
(Should say ANTHROPIC_API_KEY)

Error: Invalid JSON response from GPT-4
(Should say Claude)
```

**Affected Test Files**:
- `config/aiConfig.test.ts` (3 failures)
- `services/aiExerciseGenerator.test.ts` (17 failures)

### Category 3.1: Provider Mismatch

**Symptom**: Tests expect `openai` but config uses `claude`

**Fix** in `backend/src/__tests__/config/aiConfig.test.ts`:

```typescript
// BEFORE
it('should default to openai provider', () => {
  const config = loadAIConfig();
  expect(config.vision.provider).toBe('openai');
});

// AFTER
it('should use claude provider', () => {
  const config = loadAIConfig();
  expect(config.vision.provider).toBe('claude');
});
```

### Category 3.2: Feature Flag Defaults

**Symptom**: Tests expect `false` but test env has `true`

**Fix**:

```typescript
// BEFORE
it('should default feature flags to false', () => {
  const config = loadAIConfig();
  expect(config.features.enableVisionAI).toBe(false);
});

// AFTER
it('should enable vision AI in test environment', () => {
  const config = loadAIConfig();
  // Test environment has feature flags enabled
  expect(config.features.enableVisionAI).toBe(true);
});
```

### Category 3.3: API Key Validation Messages

**Symptom**: Error messages mention wrong provider

**Fix**:

```typescript
// BEFORE
expect(result.errors).toContain('OPENAI_API_KEY is required when vision AI is enabled');

// AFTER
expect(result.errors).toContain('ANTHROPIC_API_KEY is required when vision AI is enabled');
```

**And update the validator code**:

```typescript
// In src/config/aiConfig.ts
if (config.features.enableVisionAI && !config.openai.apiKey) {
  // BEFORE
  errors.push('OPENAI_API_KEY is required when vision AI is enabled');

  // AFTER (if using Anthropic)
  errors.push('ANTHROPIC_API_KEY is required when vision AI is enabled');
}
```

### Category 3.4: Error Message Mismatches

**Symptom**: Error messages reference wrong AI provider

**Fix** in `backend/src/services/aiExerciseGenerator.ts`:

```typescript
// BEFORE
throw new Error('Invalid JSON response from GPT-4');

// AFTER
throw new Error('Invalid JSON response from Claude');
```

**And update tests**:

```typescript
// BEFORE
expect(error.message).toBe('Invalid JSON response from GPT-4');

// AFTER
expect(error.message).toBe('Invalid JSON response from Claude');
```

### Category 3.5: Mock Configuration

**Verify mocks use Anthropic SDK**:

```typescript
// Should mock Anthropic, not OpenAI
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }))
}));

// NOT this:
// jest.mock('openai');
```

### Verification

```bash
# Test AI config
npm test -- config/aiConfig.test.ts

# Test AI exercise generator
npm test -- services/aiExerciseGenerator.test.ts

# Should see all tests passing
```

### Quick Fix Script

Create `scripts/fix-ai-tests.sh`:

```bash
#!/bin/bash
# Quick fix for AI test expectations

cd backend/src/__tests__

# Fix provider expectations
sed -i "s/'openai'/'claude'/g" config/aiConfig.test.ts

# Fix API key messages
sed -i "s/OPENAI_API_KEY/ANTHROPIC_API_KEY/g" config/aiConfig.test.ts

# Fix error messages
sed -i "s/GPT-4/Claude/g" services/aiExerciseGenerator.test.ts

echo "✓ AI test expectations updated"
```

---

## Root Cause 4: Worker Process Issues

**Impact**: ~10 tests failing
**Priority**: LOW
**Time to Fix**: 1 hour

### Symptoms

```
Error: Worker exited before finishing task
Error: Worker thread terminated unexpectedly
Timeout: Test exceeded 5000ms
```

**Affected Test Files**:
- Tests with batch processing
- Tests with async workers
- Tests with background tasks

### Diagnosis

Check for hanging timers:

```bash
# Run test with verbose output
npm test -- --verbose services/batchProcessor.test.ts

# Look for:
# - Timers still active
# - Promises not resolved
# - Workers not cleaned up
```

### Solution 1: Use Worker Mocks

Replace real workers with mocks:

```typescript
// BEFORE
import { BatchProcessor } from '../../services/batchProcessor';

describe('Batch Processing', () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    processor = new BatchProcessor();
  });

  // No cleanup!

  it('should process batch', async () => {
    await processor.startBatch(['img1', 'img2']);
  });
});

// AFTER
import { MockBatchProcessor } from '../utils/workerMocks';
import { cleanupAsyncTests } from '../utils/asyncTestUtils';

describe('Batch Processing', () => {
  let processor: MockBatchProcessor;

  beforeEach(() => {
    processor = new MockBatchProcessor();
  });

  afterEach(async () => {
    processor.destroy();  // Clean up mock
    await cleanupAsyncTests();  // Clean up timers
  });

  it('should process batch', async () => {
    const jobId = await processor.startBatch(['img1', 'img2']);

    // Wait for mock to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const progress = await processor.getJobProgress(jobId);
    expect(progress.status).toBe('completed');
  });
});
```

### Solution 2: Increase Timeouts

For legitimate long-running tests:

```typescript
// BEFORE
it('should process large batch', async () => {
  // Default 5s timeout, may not be enough
  await processor.processLargeBatch();
});

// AFTER
it('should process large batch', async () => {
  jest.setTimeout(15000);  // 15 seconds

  await processor.processLargeBatch();
}, 15000);  // Also set test-specific timeout
```

### Solution 3: Proper Cleanup

Add cleanup for all async operations:

```typescript
import { cleanupAsyncTests, TimerTracker } from '../utils/asyncTestUtils';

describe('Async Operations', () => {
  let timerTracker: TimerTracker;

  beforeEach(() => {
    timerTracker = new TimerTracker();
  });

  afterEach(async () => {
    timerTracker.clearAll();  // Clear all timers
    await cleanupAsyncTests();  // Flush promises
  });

  it('should handle delayed operation', async () => {
    const timer = timerTracker.setTimeout(() => {
      // Operation
    }, 1000);

    // Test logic

    timerTracker.clearTimer(timer);
  });
});
```

### Solution 4: Use Global Teardown

Ensure `backend/src/__tests__/globalTeardown.ts` is configured:

```typescript
import { pool } from '../database/connection';

module.exports = async () => {
  console.log('Starting global test teardown...');

  // Cleanup batch processor
  try {
    const { cleanupBatchProcessor } = await import('../routes/batch');
    if (typeof cleanupBatchProcessor === 'function') {
      cleanupBatchProcessor();
      console.log('✓ Batch processor cleaned up');
    }
  } catch (err) {
    console.warn('Batch processor cleanup skipped');
  }

  // Clear Jest timers
  if (typeof jest !== 'undefined') {
    jest.clearAllTimers();
    jest.clearAllMocks();
  }

  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Close database pool
  try {
    await pool.end();
    console.log('✓ Database pool closed');
  } catch (err) {
    console.warn('Pool cleanup warning:', err.message);
  }

  console.log('✓ Global test teardown complete');
};
```

### Verification

```bash
# Run async tests
npm test -- services/batchProcessor.test.ts

# Should complete without hanging
# Should see: ✓ Global test teardown complete
```

---

## Other Common Issues

### Issue: Tests Pass Individually But Fail in Suite

**Symptom**: `npm test -- specific.test.ts` passes, but `npm test` fails

**Causes**:
1. Test pollution (data not cleaned up)
2. Shared state between tests
3. Resource exhaustion (connections, memory)

**Solutions**:

```typescript
// 1. Ensure proper cleanup
afterEach(async () => {
  // Clean database
  await pool.query('DELETE FROM aves_test.annotations');
  await pool.query('DELETE FROM aves_test.users');

  // Clear mocks
  jest.clearAllMocks();

  // Clean timers
  await cleanupAsyncTests();
});

// 2. Run tests in isolation
npm test -- --runInBand  // One test at a time

// 3. Increase resource limits
node --max-old-space-size=4096 node_modules/.bin/jest
```

### Issue: "Cannot find module" Errors

**Symptom**: Import errors in tests

**Solutions**:

```bash
# 1. Check tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}

# 2. Rebuild
npm run build

# 3. Clear Jest cache
npx jest --clearCache
```

### Issue: "Port already in use"

**Symptom**: Tests fail with EADDRINUSE

**Solutions**:

```bash
# 1. Kill process on port
lsof -ti:3001 | xargs kill -9

# 2. Use random port in tests
process.env.PORT = '0';  // OS assigns random port

# 3. Clean up test servers
afterAll(async () => {
  await server.close();
});
```

### Issue: Memory Leaks

**Symptom**: Tests slow down, eventually fail

**Solutions**:

```typescript
// 1. Close all connections
afterAll(async () => {
  await pool.end();
  await redis.quit();
});

// 2. Limit test parallelism
// package.json
{
  "jest": {
    "maxWorkers": 2
  }
}

// 3. Monitor memory
npm test -- --logHeapUsage
```

---

## Debugging Tools

### Tool 1: Verbose Test Output

```bash
npm test -- --verbose --no-coverage
```

### Tool 2: Run Single Test

```bash
npm test -- --testNamePattern="should create annotation"
```

### Tool 3: Debug Mode

```bash
# In VS Code, use Jest extension debug
# Or manually:
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Tool 4: Check Database State

```sql
-- Connect to test schema
psql "postgresql://USER:PASS@HOST:6543/postgres?options=-c%20search_path=aves_test"

-- Check what's in database
\dt  -- List tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM annotations;

-- Check for orphaned data
SELECT * FROM batch_jobs WHERE status = 'processing';
```

### Tool 5: Test Coverage Report

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Tool 6: Jest Cache

```bash
# Clear cache if seeing weird behavior
npx jest --clearCache

# Show cache info
npx jest --showConfig
```

---

## Emergency Fixes

### When Everything is Broken

```bash
# 1. Start fresh
cd backend
rm -rf node_modules package-lock.json
npm install

# 2. Clear all caches
npx jest --clearCache
rm -rf coverage

# 3. Reset database
psql "postgresql://USER:PASS@HOST:6543/postgres" <<EOF
DROP SCHEMA IF EXISTS aves_test CASCADE;
CREATE SCHEMA aves_test;
GRANT ALL ON SCHEMA aves_test TO postgres;
EOF

# 4. Run migrations
npx tsx ../scripts/migrate-test-schema.ts

# 5. Run tests
npm test
```

### When One Test Hangs

```bash
# Kill and run with timeout
npm test -- --testTimeout=10000 --forceExit
```

### When CI Fails But Local Passes

```bash
# Match CI environment
NODE_ENV=test npm ci
NODE_ENV=test npm test

# Check for environment differences
# - Node version
# - Package versions
# - Environment variables
```

---

## Getting Help

If still stuck:

1. Check [Test Setup Instructions](./TEST-SETUP-INSTRUCTIONS.md)
2. Review [Test Failure Analysis](./test-failure-analysis.md)
3. Check recent [Daily Reports](/daily_dev_startup_reports/)
4. Ask team in Slack/chat
5. Open GitHub issue with:
   - Test output
   - Environment details
   - Steps to reproduce

---

**Documentation maintained by**: Development Team
**Last verified**: October 17, 2025
**Coverage**: All 4 root causes + common issues
