# E2E Testing with Playwright

This directory contains end-to-end tests for the AVES frontend application using Playwright.

## Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run smoke tests only
npm run test:e2e:smoke

# View test report
npm run test:e2e:report
```

## Directory Structure

```
e2e/
├── fixtures/          # Reusable test fixtures and helpers
│   └── test-fixtures.ts
├── tests/            # Test specifications
│   ├── navigation.spec.ts
│   ├── learning-flow.spec.ts
│   ├── practice-mode.spec.ts
│   ├── species-browser.spec.ts
│   ├── responsive-design.spec.ts
│   └── smoke.spec.ts
└── README.md         # This file
```

## Test Suites

### Smoke Tests (`smoke.spec.ts`)
Fast, critical path tests that verify core functionality:
- Page loads without errors
- Basic navigation works
- Performance benchmarks
- Asset loading

### Navigation Tests (`navigation.spec.ts`)
Comprehensive routing and navigation verification:
- Page-to-page navigation
- Browser back/forward buttons
- Active navigation states
- Direct URL access

### Learning Flow Tests (`learning-flow.spec.ts`)
Learning experience testing:
- Lesson browsing
- Exercise interaction
- Progress tracking
- Accessibility

### Practice Mode Tests (`practice-mode.spec.ts`)
Practice mode functionality:
- Exercise generation
- User interactions
- Feedback display
- State management

### Species Browser Tests (`species-browser.spec.ts`)
Species browsing and discovery:
- List display
- Search and filtering
- Detail views
- Data loading

### Responsive Design Tests (`responsive-design.spec.ts`)
Multi-viewport testing:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)
- Viewport transitions

## Custom Fixtures

Located in `fixtures/test-fixtures.ts`:

### `mockAPI`
Automatically mocks API endpoints for offline testing:
```typescript
test('with mocked API', async ({ page, mockAPI }) => {
  await page.goto('/species');
  // API calls are automatically mocked
});
```

### Helper Functions

#### `waitForNavigation(page, expectedUrl)`
Waits for and verifies navigation:
```typescript
await waitForNavigation(page, /\/learn/);
```

#### `checkResponsiveLayout(page, viewport)`
Verifies responsive layout constraints:
```typescript
await checkResponsiveLayout(page, { width: 375, height: 667 });
```

#### `testNavigationLink(page, linkText, expectedPath)`
Tests navigation link functionality:
```typescript
await testNavigationLink(page, 'Learn', '/learn');
```

#### `takeTimestampedScreenshot(page, name)`
Captures screenshot with timestamp:
```typescript
await takeTimestampedScreenshot(page, 'debug-view');
```

## Running Tests

### By Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### By Device

```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
npx playwright test --project="iPad"
```

### By Test File

```bash
npx playwright test navigation.spec.ts
npx playwright test smoke.spec.ts
```

### Debug Mode

```bash
npm run test:e2e:debug
# or
npx playwright test --debug
```

### Headed Mode

```bash
npm run test:e2e:headed
# or
npx playwright test --headed
```

## Configuration

Test configuration is in `playwright.config.ts` at the frontend root.

Key settings:
- **Base URL**: `http://localhost:5173`
- **Timeout**: 30 seconds per test
- **Retries**: 2 in CI, 0 locally
- **Parallel**: Yes
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## CI/CD

Tests run automatically in GitHub Actions:

1. **Full E2E Suite**: All browsers, all tests
2. **Smoke Tests**: Fast critical path (Chromium only)
3. **Mobile Tests**: Mobile viewports

Artifacts uploaded:
- Test results (JSON)
- HTML report
- Screenshots (failures)
- Videos (failures)

## Writing New Tests

1. Create a new spec file in `tests/`:
```typescript
// tests/my-feature.spec.ts
import { test, expect } from '../fixtures/test-fixtures';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/my-feature');
    await expect(page.locator('main')).toBeVisible();
  });
});
```

2. Use existing fixtures and helpers
3. Follow existing naming conventions
4. Add to relevant test suite or create new one
5. Update documentation

## Best Practices

1. **Wait for stability**: Use `waitForLoadState('networkidle')`
2. **Independent tests**: Each test should work in isolation
3. **Meaningful selectors**: Prefer semantic over CSS selectors
4. **Error handling**: Handle optional elements gracefully
5. **Screenshots**: Take screenshots for debugging
6. **Parallel-safe**: Don't rely on shared state

## Troubleshooting

### Tests fail locally but pass in CI
- Check Node.js version (18+)
- Clear Playwright cache: `npx playwright install --force`
- Check for port conflicts (5173)

### Browser installation fails
```bash
sudo npx playwright install-deps
npx playwright install --with-deps
```

### Tests timeout
- Increase timeout in test
- Check network conditions
- Verify dev server is running

### Flaky tests
- Add explicit waits
- Use retry logic
- Check for race conditions
- Add debug logs

## Documentation

Full documentation: `/docs/testing/E2E_TEST_GUIDE.md`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [CI Integration](https://playwright.dev/docs/ci)
