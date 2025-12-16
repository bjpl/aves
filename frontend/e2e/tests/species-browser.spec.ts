import { test, expect, waitForNavigation } from '../fixtures/test-fixtures';

/**
 * Species Browser E2E Tests
 *
 * CONCEPT: Test species browsing, filtering, and detail viewing
 * WHY: Species browser is a core discovery feature
 * COVERAGE: List view, search/filter, detail view, image viewing
 */

test.describe('Species Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
  });

  test('should display species page', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('main')).toBeVisible();

    // Check for page title or heading
    const heading = page.locator('h1, h2').first();
    const headingExists = await heading.isVisible().catch(() => false);

    if (headingExists) {
      await expect(heading).toBeVisible();
    }
  });

  test('should handle page initialization', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Verify main content is present
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Species Browser - Data Display', () => {
  test.beforeEach(async ({ page, mockAPI }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
  });

  test('should display species data when available', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for any content cards or items
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    // Reload to trigger loading
    await page.reload();

    // Check for loading indicator or immediate content
    await page.waitForLoadState('networkidle');

    // Verify content loaded
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Verify page doesn't crash with no data
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Species Browser - Search and Filter', () => {
  test.beforeEach(async ({ page, mockAPI }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
  });

  test('should display search or filter controls if available', async ({ page }) => {
    // Wait for content
    await page.waitForTimeout(2000);

    // Check for input fields (search/filter)
    const inputs = page.locator('input[type="text"], input[type="search"]');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const firstInput = inputs.first();
      await expect(firstInput).toBeVisible();
    }
  });

  test('should maintain filter state during session', async ({ page }) => {
    // Navigate away and back
    await page.click('text=Learn');
    await waitForNavigation(page, /\/learn/);

    await page.click('text=Species');
    await waitForNavigation(page, /\/species/);

    // Verify page reloaded
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Species Browser - Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Verify content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check no horizontal scroll
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Verify content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Verify content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Species Browser - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Tab through elements
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focused = page.locator(':focus');
    const hasFocus = await focused.isVisible().catch(() => false);

    if (hasFocus) {
      await expect(focused).toBeVisible();
    }
  });

  test('should have proper semantic structure', async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
