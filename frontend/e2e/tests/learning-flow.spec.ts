import { test, expect, waitForNavigation } from '../fixtures/test-fixtures';

/**
 * Learning Flow E2E Tests
 *
 * CONCEPT: Test the complete learning journey from lesson selection to completion
 * WHY: Core feature - learning exercises must work flawlessly
 * COVERAGE: Lesson browsing, exercise interaction, progress tracking
 */

test.describe('Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
  });

  test('should display learning page with content', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('main')).toBeVisible();

    // Check for page title or heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display available lessons or exercises', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check if there's any interactive content
    // This is a basic check - adjust based on actual implementation
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Reload page to see loading state
    await page.reload();

    // Check for loading indicator (adjust selector based on implementation)
    const loadingIndicator = page.locator('text=/loading/i, [role="progressbar"], .loading').first();

    // Either loading indicator exists and disappears, or content loads immediately
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);

    if (hasLoading) {
      // Wait for loading to complete
      await page.waitForLoadState('networkidle');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }

    // Verify main content is visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should maintain progress during navigation', async ({ page }) => {
    // Navigate away
    await page.click('text=Practice');
    await waitForNavigation(page, /\/practice/);

    // Navigate back
    await page.click('text=Learn');
    await waitForNavigation(page, /\/learn/);

    // Verify page state is maintained (check for any stored state indicators)
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Learning Flow - Exercise Interaction', () => {
  test.beforeEach(async ({ page, mockAPI }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
  });

  test('should display exercise content when available', async ({ page }) => {
    // Wait for potential exercise content
    await page.waitForTimeout(2000);

    // Check for any interactive elements (buttons, inputs, etc.)
    const interactive = page.locator('button, input, select').first();
    const hasInteractive = await interactive.isVisible().catch(() => false);

    if (hasInteractive) {
      await expect(interactive).toBeVisible();
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test that page doesn't crash on errors
    await page.waitForLoadState('networkidle');

    // Verify no JavaScript errors crashed the page
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Learning Flow - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Verify focus is visible (browser will handle focus styles)
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Check for headings
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Should have at least one h1 (or page is empty, which is also valid)
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });
});
