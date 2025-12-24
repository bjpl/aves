-- ========================================
-- Setup Test Schema for Supabase
-- ========================================
-- This script creates a separate schema for testing
-- Run this in Supabase SQL Editor before running tests

-- Create test schema
CREATE SCHEMA IF NOT EXISTS aves_test;

-- Grant permissions to postgres user
GRANT ALL ON SCHEMA aves_test TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA aves_test TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA aves_test TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA aves_test TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA aves_test GRANT ALL ON FUNCTIONS TO postgres;

-- Verify schema was created
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'aves_test';
