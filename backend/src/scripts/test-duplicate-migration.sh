#!/bin/bash
# Test script for duplicate species migration
# Purpose: Safely test the migration in a transaction that can be rolled back
# Usage: ./test-duplicate-migration.sh

set -e

echo "========================================"
echo "Testing Duplicate Species Migration"
echo "========================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL or provide connection details"
  exit 1
fi

echo "1. Running pre-migration duplicate check..."
echo "--------------------------------------------"
psql "$DATABASE_URL" -f src/scripts/check-duplicate-species.sql

echo ""
echo "2. Testing migration in a transaction (will rollback)..."
echo "---------------------------------------------------------"
psql "$DATABASE_URL" <<'EOSQL'
BEGIN;

-- Run the migration
\i src/database/migrations/026_remove_duplicate_species.sql

-- Display results
\echo ''
\echo 'Migration completed successfully in test mode'
\echo 'Running post-migration verification...'

-- Verify
SELECT COUNT(*) as remaining_species FROM species;
SELECT COUNT(*) as total_images FROM images;

-- ROLLBACK instead of COMMIT for testing
ROLLBACK;

\echo ''
\echo 'Transaction rolled back - no changes were made to the database'
EOSQL

echo ""
echo "========================================"
echo "Test Complete"
echo "========================================"
echo ""
echo "To actually run the migration, use:"
echo "  npm run migrate"
echo ""
