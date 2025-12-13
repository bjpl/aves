import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for AVES
 *
 * CONCEPT: Comprehensive browser testing across Chromium, Firefox, and WebKit
 * WHY: Ensures cross-browser compatibility and catches browser-specific issues
 * PATTERN: Multi-project configuration with shared settings and browser-specific overrides
 */

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // Global test settings
  use: {
    // Base URL for all tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Collect trace when retrying failed tests
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable headless mode by default
        headless: true,
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: true,
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: true,
      },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        headless: true,
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        headless: true,
      },
    },

    // Tablet viewport
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
        headless: true,
      },
    },
  ],

  // Run local dev server before starting tests
  // In CI: use preview server with built files (faster startup)
  // In local dev: use dev server with hot reload
  webServer: process.env.CI ? {
    command: 'npx vite preview --port 5173 --host',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 60 * 1000, // Preview server starts much faster than dev server
  } : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
