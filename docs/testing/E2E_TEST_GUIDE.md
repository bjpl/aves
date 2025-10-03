# End-to-End Testing Guide for AVES

## Overview

This guide provides comprehensive documentation for the E2E testing framework implemented using Playwright for the AVES (Avian Visual Education System) project.

## Table of Contents

1. [Setup](#setup)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

```bash
cd frontend
npm install
npx playwright install
```

### Browser Installation

Install specific browsers:

```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

Install with system dependencies (Linux):

```bash
npx playwright install --with-deps
```

## Running Tests

### All Tests

Run all E2E tests across all browsers:

```bash
npm run test:e2e
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Mobile Tests

```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Smoke Tests (Fast)

```bash
npm run test:e2e:smoke
```

### Interactive UI Mode

```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### Specific Test File

```bash
npx playwright test navigation.spec.ts
```

### View Test Report

```bash
npm run test:e2e:report
```

## Test Structure

```
frontend/
├── e2e/
│   ├── fixtures/
│   │   └── test-fixtures.ts       # Reusable test fixtures and helpers
│   ├── tests/
│   │   ├── navigation.spec.ts     # Navigation and routing tests
│   │   ├── learning-flow.spec.ts  # Learning journey tests
│   │   ├── practice-mode.spec.ts  # Practice mode tests
│   │   ├── species-browser.spec.ts # Species browsing tests
│   │   ├── responsive-design.spec.ts # Responsive design tests
│   │   └── smoke.spec.ts          # Critical path smoke tests
│   └── utils/                     # Test utilities (future)
├── playwright.config.ts           # Playwright configuration
└── package.json
```

## Test Coverage

### 1. Navigation Tests (`navigation.spec.ts`)

- ✅ Home page rendering
- ✅ Navigation between pages
- ✅ Active navigation state
- ✅ Browser back/forward buttons
- ✅ Direct URL navigation
- ✅ Logo click returns to home

### 2. Learning Flow Tests (`learning-flow.spec.ts`)

- ✅ Learning page display
- ✅ Lesson/exercise availability
- ✅ Loading states
- ✅ Progress persistence
- ✅ Exercise interaction
- ✅ Accessibility (keyboard navigation, headings)

### 3. Practice Mode Tests (`practice-mode.spec.ts`)

- ✅ Practice page display
- ✅ Exercise generation
- ✅ User interaction
- ✅ Loading and error states
- ✅ Session state management
- ✅ Responsive design (mobile, tablet)

### 4. Species Browser Tests (`species-browser.spec.ts`)

- ✅ Species list display
- ✅ Search and filtering
- ✅ Data loading states
- ✅ Empty states
- ✅ Responsive design
- ✅ Accessibility

### 5. Responsive Design Tests (`responsive-design.spec.ts`)

- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ Desktop viewport (1920x1080)
- ✅ Touch-friendly navigation
- ✅ Layout overflow prevention
- ✅ Viewport transitions
- ✅ Responsive images

### 6. Smoke Tests (`smoke.spec.ts`)

- ✅ Page loads without errors
- ✅ Navigation functionality
- ✅ Performance (navigation speed)
- ✅ Direct URL access
- ✅ Asset loading

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('.selector');

    // Act
    await element.click();

    // Assert
    await expect(page).toHaveURL(/expected-path/);
  });
});
```

### Using Custom Fixtures

```typescript
import { test, expect, waitForNavigation, testNavigationLink } from '../fixtures/test-fixtures';

test('should navigate correctly', async ({ page }) => {
  await testNavigationLink(page, 'Learn', '/learn');
  await expect(page.locator('main')).toBeVisible();
});
```

### Responsive Testing

```typescript
import { checkResponsiveLayout } from '../fixtures/test-fixtures';

test('should be responsive', async ({ page }) => {
  await page.goto('/');
  await checkResponsiveLayout(page, { width: 375, height: 667 });
});
```

### API Mocking

```typescript
test('should handle mocked API', async ({ page, mockAPI }) => {
  // mockAPI fixture automatically mocks common API endpoints
  await page.goto('/species');

  // Verify mocked data is displayed
  await expect(page.locator('text=Bald Eagle')).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Workflows

The project includes three CI/CD workflows for E2E testing:

#### 1. Full E2E Test Suite (`e2e-tests.yml`)

Runs on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual trigger

Tests:
- All browsers (Chromium, Firefox, WebKit)
- Full test suite
- Screenshots on failure
- Test reports uploaded as artifacts

#### 2. Smoke Tests

Fast critical path tests using Chromium only:
- Quick feedback loop (< 10 minutes)
- Core functionality verification
- Runs before full test suite

#### 3. Mobile Tests

Dedicated mobile viewport testing:
- Mobile Chrome emulation
- Responsive design verification
- Touch interaction testing

### Environment Variables

```bash
# CI environment
CI=true

# Custom base URL (optional)
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
test.beforeEach(async ({ page }) => {
  // Reset state before each test
  await page.goto('/');
});
```

### 2. Wait for Stability

Always wait for the page to stabilize before assertions:

```typescript
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();
```

### 3. Meaningful Selectors

Use semantic selectors in priority order:

1. Accessibility roles: `page.getByRole('button', { name: 'Submit' })`
2. Test IDs: `page.locator('[data-testid="submit-btn"]')`
3. Text content: `page.locator('text=Submit')`
4. CSS selectors: `page.locator('.submit-btn')` (last resort)

### 4. Error Handling

Handle potential errors gracefully:

```typescript
const hasElement = await page.locator('.optional').isVisible().catch(() => false);

if (hasElement) {
  await page.locator('.optional').click();
}
```

### 5. Screenshot on Failure

Screenshots are automatically captured on failure. For manual screenshots:

```typescript
await page.screenshot({ path: 'test-results/screenshots/debug.png' });
```

### 6. Parallel Execution

Tests run in parallel by default. For sequential execution:

```typescript
test.describe.serial('Sequential Tests', () => {
  // These tests run one after another
});
```

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:

```typescript
{
  testDir: './e2e/tests',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' },
    { name: 'iPad' },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
}
```

## Troubleshooting

### Browser Installation Issues

If browsers fail to install:

```bash
# Install system dependencies (Ubuntu/Debian)
sudo npx playwright install-deps

# Install manually
npx playwright install chromium --with-deps
```

### Port Already in Use

If port 5173 is occupied:

```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port in playwright.config.ts
```

### Tests Timing Out

Increase timeout:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Flaky Tests

Use retry logic:

```typescript
test('potentially flaky test', async ({ page }) => {
  test.retries(3);
  // ... test code
});
```

### Debug Failing Tests

```bash
# Run in debug mode
npx playwright test --debug

# Run specific test in headed mode
npx playwright test navigation.spec.ts --headed --project=chromium

# View trace
npx playwright show-trace test-results/.../trace.zip
```

### CI Failures

1. Check uploaded artifacts in GitHub Actions
2. Review screenshots and videos
3. Check test-results.json for detailed errors
4. Run locally with `CI=true npm run test:e2e`

## Performance

### Current Metrics

- **Smoke Tests**: < 2 minutes
- **Full Suite (single browser)**: < 5 minutes
- **All Browsers**: < 15 minutes
- **Mobile Tests**: < 3 minutes

### Optimization Tips

1. Use `test.describe.configure({ mode: 'parallel' })`
2. Leverage `test.beforeAll()` for expensive setup
3. Mock API calls when possible
4. Use targeted selectors
5. Avoid unnecessary waits

## Reporting

### HTML Report

Generated automatically after test run:

```bash
npx playwright show-report
```

### JSON Results

Located at `test-results/results.json`

### CI Artifacts

- Test results
- Screenshots (failures)
- Videos (failures)
- HTML report
- Trace files

## Future Enhancements

- [ ] Visual regression testing
- [ ] Accessibility testing (axe-core)
- [ ] Performance budgets
- [ ] Network throttling tests
- [ ] Authentication flows
- [ ] Database state management
- [ ] Cross-browser visual comparison
- [ ] Load testing integration

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Guide](https://playwright.dev/docs/ci)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For issues or questions:
1. Check this guide
2. Review Playwright documentation
3. Check GitHub Issues
4. Contact the team

---

**Last Updated**: 2025-10-03
**Version**: 1.0.0
**Maintainer**: E2E Testing Team
