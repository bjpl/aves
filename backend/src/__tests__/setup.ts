// Test setup file for Jest
// This runs before all tests

import dotenv from 'dotenv';
import { join } from 'path';

// Load .env.test file first
const testEnvPath = join(__dirname, '../../.env.test');
dotenv.config({ path: testEnvPath });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Ensure TEST_SCHEMA is set for schema-based testing
if (!process.env.TEST_SCHEMA) {
  process.env.TEST_SCHEMA = 'aves_test';
}

// Allow database pool to exit on idle for faster test cleanup
process.env.DB_ALLOW_EXIT_ON_IDLE = 'true';

// Import database mocks to prevent actual connections in unit tests
import './mocks/database';

// Mock console methods to reduce noise in test output (optional)
// Uncomment if you want to suppress console output in tests
/*
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
*/

// Add global test utilities if needed
