module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Disable TypeScript diagnostics in tests (type errors are caught by tsc in CI separately)
  globals: {
    'ts-jest': {
      diagnostics: false,
      isolatedModules: true,
    },
  },
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
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
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
