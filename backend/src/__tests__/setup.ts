// Test setup file for Jest
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Allow database pool to exit on idle for faster test cleanup
process.env.DB_ALLOW_EXIT_ON_IDLE = 'true';

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
