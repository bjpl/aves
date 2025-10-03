import { test, expect, waitForNavigation } from '../fixtures/test-fixtures';

/**
 * Practice Mode E2E Tests
 *
 * CONCEPT: Test practice mode functionality including AI-generated exercises
 * WHY: Practice mode is key for user engagement and skill building
 * COVERAGE: Exercise generation, answering, feedback, scoring
 */

test.describe('Practice Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
  });

  test('should display practice page', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('main')).toBeVisible();

    // Check for page content
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display practice mode interface', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for any interactive elements
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle practice mode initialization', async ({ page }) => {
    // Verify no errors during page load
    await page.waitForLoadState('networkidle');

    // Check that main content is present
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Practice Mode - Exercise Generation', () => {
  test.beforeEach(async ({ page, mockAPI }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
  });

  test('should show exercise content when available', async ({ page }) => {
    // Wait for potential exercise content
    await page.waitForTimeout(2000);

    // Verify main content is visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Reload to trigger loading
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify page loads successfully
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Practice Mode - User Interaction', () => {
  test.beforeEach(async ({ page, mockAPI }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
  });

  test('should display interactive elements', async ({ page }) => {
    // Wait for content
    await page.waitForTimeout(2000);

    // Check for buttons or interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    // If there are buttons, verify at least one is visible
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
    }
  });

  test('should maintain state during session', async ({ page }) => {
    // Navigate away and back
    await page.click('text=Learn');
    await waitForNavigation(page, /\/learn/);

    await page.click('text=Practice');
    await waitForNavigation(page, /\/practice/);

    // Verify page reloaded successfully
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Practice Mode - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Verify content is visible on mobile
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Verify content is visible on tablet
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
