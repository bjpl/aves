# Integration Test Guide - AVES Phase 3

## Overview

This guide covers the comprehensive integration test suite for the AVES application, focusing on end-to-end testing of critical user flows across the full stack.

## Test Coverage

### Critical User Flows Tested

1. **Authentication Flow** (85 test cases)
   - User registration with validation
   - Login with credential verification
   - JWT token management
   - Protected route access
   - Session integrity

2. **AI Exercise Generation Flow** (45 test cases)
   - Cache hit/miss scenarios
   - Exercise prefetching
   - Cost optimization
   - Concurrent generation
   - Statistics tracking

3. **Annotation Workflow** (60 test cases)
   - Manual annotation creation
   - AI-powered generation
   - Review and approval workflow
   - Batch operations
   - Quality control

4. **Species & Vocabulary Flow** (50 test cases)
   - Species browsing
   - Vocabulary retrieval
   - User progress tracking
   - Multi-species learning
   - Performance optimization

5. **Admin Dashboard Flow** (40 test cases)
   - Batch job management
   - System monitoring
   - Cache management
   - Statistics aggregation
   - Error handling

**Total: 280+ integration tests**

## Test Infrastructure

### Database Setup

The integration tests use a dedicated test database (`aves_test`) with:

- **Isolated environment**: Separate from development and production
- **Automatic cleanup**: Tests clean up after themselves
- **Seeded data**: Realistic test data for comprehensive testing
- **Transaction support**: Rollback capabilities for failed tests

#### Test Database Configuration

```env
# .env.test
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=aves_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres
```

### Test Structure

```
backend/src/__tests__/integration/
├── setup.ts                          # Test infrastructure & utilities
├── seed-test-data.ts                 # Database seeding script
├── auth-flow.test.ts                 # Authentication flow tests
├── exercise-generation-flow.test.ts  # AI exercise generation tests
├── annotation-workflow.test.ts       # Annotation workflow tests
├── species-vocabulary-flow.test.ts   # Learning flow tests
└── admin-dashboard-flow.test.ts      # Admin operations tests
```

## Running Integration Tests

### Prerequisites

1. **PostgreSQL Database**
   ```bash
   # Create test database
   createdb aves_test

   # Run migrations
   npm run migrate
   ```

2. **Environment Variables**
   ```bash
   # Copy test environment file
   cp .env.example .env.test

   # Update test database credentials
   nano .env.test
   ```

### Run All Integration Tests

```bash
# Run all integration tests
npm test -- --testPathPattern=integration

# Run specific test suite
npm test -- auth-flow.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern=integration

# Run in watch mode
npm test -- --watch --testPathPattern=integration
```

### Run Individual Test Files

```bash
# Authentication tests
npm test -- auth-flow.test.ts

# Exercise generation tests
npm test -- exercise-generation-flow.test.ts

# Annotation workflow tests
npm test -- annotation-workflow.test.ts

# Species & vocabulary tests
npm test -- species-vocabulary-flow.test.ts

# Admin dashboard tests
npm test -- admin-dashboard-flow.test.ts
```

## Test Utilities

### Database Seeding

```bash
# Seed test database with sample data
cd backend
npx tsx src/__tests__/integration/seed-test-data.ts
```

The seed script creates:
- 3 test users (regular, admin, alternate)
- 5 bird species with descriptions
- 15 images across species
- 25 vocabulary terms
- 30 annotations
- 24 cached exercises
- 4 batch jobs
- 20 user progress records

### Test Helpers

#### Creating Test Users

```typescript
import { createTestUser, TEST_USERS } from './setup';

// Create regular user
const user = await createTestUser(TEST_USERS.regularUser);

// Create admin user
const admin = await createTestUser(TEST_USERS.adminUser, true);

// Access user properties
console.log(user.id, user.email, user.token);
```

#### Creating Test Data

```typescript
import {
  createTestSpecies,
  createTestImage,
  createTestVocabulary,
  createTestAnnotation,
  createCachedExercise,
  createBatchJob,
} from './setup';

// Create test species
const species = await createTestSpecies({
  name: 'Test Bird',
  scientificName: 'Testus birdus',
});

// Create test image
const image = await createTestImage(species.id);

// Create vocabulary
const vocab = await createTestVocabulary({
  speciesId: species.id,
  spanishTerm: 'el pico',
  englishTerm: 'beak',
  difficultyLevel: 2,
});
```

#### Database Cleanup

```typescript
import { cleanDatabase, testPool } from './setup';

// Clean all test data
await cleanDatabase();

// Close database connection
await testPool.end();
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on state from other tests:

```typescript
beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();

  // Set up fresh test data
  const user = await createTestUser(TEST_USERS.regularUser);
});
```

### 2. Async Operations

Always use `await` for async operations and handle delays properly:

```typescript
import { delay } from './setup';

// Trigger async operation
await request(app).post('/api/ai/annotations/generate/...').send(...);

// Wait for background processing
await delay(1500);

// Verify results
const result = await request(app).get('/api/ai/annotations/...');
```

### 3. Comprehensive Assertions

Verify both API responses and database state:

```typescript
// Check API response
const response = await request(app).post('/api/auth/register').send(userData);
expect(response.status).toBe(201);
expect(response.body).toHaveProperty('token');

// Verify database state
const dbResult = await testPool.query('SELECT * FROM users WHERE email = $1', [email]);
expect(dbResult.rows.length).toBe(1);
```

### 4. Error Handling

Test both success and failure scenarios:

```typescript
it('should reject invalid data', async () => {
  const response = await request(app)
    .post('/api/annotations')
    .send({ invalidData: true })
    .expect(400);

  expect(response.body).toHaveProperty('error');
});
```

### 5. Concurrent Testing

Test race conditions and concurrent operations:

```typescript
it('should handle concurrent requests', async () => {
  const requests = Array(10).fill(null).map(() =>
    request(app).get('/api/species').set('Authorization', `Bearer ${token}`)
  );

  const responses = await Promise.all(requests);

  responses.forEach(response => {
    expect(response.status).toBe(200);
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main, develop ]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: aves_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run database migrations
        run: |
          cd backend
          npm run migrate
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: aves_test
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: postgres

      - name: Run integration tests
        run: |
          cd backend
          npm test -- --testPathPattern=integration --coverage
        env:
          NODE_ENV: test
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: aves_test
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: postgres
          JWT_SECRET: test-secret-key

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: integration-tests
```

### Local CI Simulation

```bash
# Run the same checks locally
cd backend

# Install dependencies
npm ci

# Run migrations
npm run migrate

# Run integration tests with coverage
npm test -- --testPathPattern=integration --coverage

# Check coverage thresholds
npm run test:coverage
```

## Performance Benchmarks

Integration tests should complete within these timeframes:

| Test Suite | Target Time | Max Time |
|-----------|-------------|----------|
| Authentication Flow | < 10s | 15s |
| Exercise Generation | < 15s | 25s |
| Annotation Workflow | < 20s | 35s |
| Species & Vocabulary | < 12s | 20s |
| Admin Dashboard | < 15s | 25s |
| **Total Suite** | **< 60s** | **90s** |

### Monitoring Test Performance

```bash
# Run tests with timing
npm test -- --testPathPattern=integration --verbose

# Profile slow tests
npm test -- --testPathPattern=integration --detectOpenHandles
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Ensure PostgreSQL is running: `pg_isready`
- Check database credentials in `.env.test`
- Verify test database exists: `psql -l`

#### 2. Test Timeouts

```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:**
- Increase Jest timeout in test file:
  ```typescript
  jest.setTimeout(30000); // 30 seconds
  ```
- Check for unhandled promises
- Verify async operations complete

#### 3. Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
- Kill existing process: `lsof -ti:3001 | xargs kill -9`
- Use different port for tests
- Ensure proper cleanup in `afterAll` hooks

#### 4. Stale Data Between Tests

```
Error: duplicate key value violates unique constraint
```

**Solution:**
- Verify `beforeEach` cleanup is running
- Check database cleanup in `setup.ts`
- Ensure proper transaction rollback

### Debug Mode

Run tests with detailed output:

```bash
# Enable debug logging
DEBUG=* npm test -- integration

# Verbose test output
npm test -- --verbose --testPathPattern=integration

# Show test execution order
npm test -- --verbose --listTests
```

## Maintenance

### Adding New Integration Tests

1. **Create test file** in `src/__tests__/integration/`
2. **Import utilities** from `setup.ts`
3. **Follow naming convention**: `[feature]-flow.test.ts`
4. **Add cleanup** in `beforeEach` and `afterAll`
5. **Document test scenarios** with clear descriptions
6. **Update this guide** with new test coverage

### Updating Test Data

1. Modify seed script: `seed-test-data.ts`
2. Update test utilities in `setup.ts`
3. Run tests to verify changes
4. Update documentation

### Performance Optimization

- Use database transactions for faster cleanup
- Mock external API calls (OpenAI, etc.)
- Implement parallel test execution where safe
- Cache common test fixtures
- Use in-memory database for unit tests

## Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Authentication | 95% | 95% |
| Exercise Generation | 90% | 92% |
| Annotation Workflow | 88% | 90% |
| Species & Vocabulary | 85% | 88% |
| Admin Dashboard | 82% | 85% |
| **Overall Backend** | **87%** | **90%** |

## Success Criteria

Integration tests are considered successful when:

- ✅ All 280+ tests pass
- ✅ Test execution completes in < 90 seconds
- ✅ No database leaks or connection errors
- ✅ Code coverage meets thresholds (>85%)
- ✅ No flaky tests (tests pass consistently)
- ✅ Proper cleanup (no test pollution)

## Support

For issues or questions about integration testing:

1. Check this guide for common solutions
2. Review test output for specific error messages
3. Consult the test utilities in `setup.ts`
4. Check existing test files for patterns
5. Contact the testing team lead

---

**Last Updated:** 2025-10-03
**Test Suite Version:** 1.0.0
**Total Test Cases:** 280+
**Maintained by:** AVES Integration Test Engineer
