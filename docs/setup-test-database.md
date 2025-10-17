# Setting Up Test Database on Supabase

## Step 1: Create Test Database

Since Supabase doesn't allow creating multiple databases in the free tier, we'll use a **schema-based approach** instead:

### Option A: Use Separate Schema (Recommended for Supabase)

Instead of creating a new database, create a separate schema:

1. **Go to Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/ubqnfiwxghkxltluyczd/sql

2. **Run this SQL:**
   ```sql
   -- Create test schema
   CREATE SCHEMA IF NOT EXISTS aves_test;

   -- Grant permissions
   GRANT ALL ON SCHEMA aves_test TO postgres;
   GRANT ALL ON ALL TABLES IN SCHEMA aves_test TO postgres;
   ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test GRANT ALL ON TABLES TO postgres;
   ```

3. **Update test setup to use schema:**
   The test pool will need to specify the schema in queries.

### Option B: Use Separate Supabase Project (If Available)

If you have multiple Supabase projects available:

1. Create a new Supabase project named "aves-test"
2. Update `.env.test` with the new project credentials
3. Run migrations on the new project

### Option C: Local PostgreSQL (Alternative)

Install PostgreSQL locally:

1. **Install PostgreSQL:**
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql

   # Or download from: https://www.postgresql.org/download/windows/
   ```

2. **Create test database:**
   ```bash
   createdb aves_test
   ```

3. **Update `.env.test`:**
   ```bash
   TEST_DB_HOST=localhost
   TEST_DB_PORT=5432
   TEST_DB_NAME=aves_test
   TEST_DB_USER=postgres
   TEST_DB_PASSWORD=postgres
   DB_SSL_ENABLED=false
   ```

## Step 2: Run Migrations

Once the test database/schema is ready:

```bash
cd backend
npm run migrate
```

## Step 3: Run Tests

```bash
# Run annotation workflow tests
npm test -- annotation-workflow

# Run all tests
npm test
```

## Current Status

- ✅ `.env.test` file created
- ⏳ Waiting for test database setup
- ⏳ Migrations pending
- ⏳ Tests ready to run
