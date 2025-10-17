module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  // Timeout configuration for async operations
  testTimeout: 15000, // 15 seconds default timeout
  // Force exit to prevent hanging on timers (reduced delay for faster cleanup)
  forceExit: true,
  // Detect open handles (timers, connections) that prevent exit
  detectOpenHandles: true,
  // Maximum number of workers (1 worker prevents pool exhaustion in tests)
  maxWorkers: 1,
  // Run tests serially to avoid connection pool conflicts
  maxConcurrency: 1,
  verbose: true
};
