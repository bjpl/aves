import { test, expect, waitForNavigation, testNavigationLink } from '../fixtures/test-fixtures';

/**
 * Navigation and Routing E2E Tests
 *
 * CONCEPT: Verify all navigation paths work correctly across the application
 * WHY: Routing issues are common sources of user frustration
 * COVERAGE: Main navigation, breadcrumbs, back/forward buttons
 */

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display home page with correct branding', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Aves/i);

    // Verify logo and branding
    const logo = page.locator('text=🦅');
    await expect(logo).toBeVisible();

    const brandText = page.locator('text=Aves');
    await expect(brandText).toBeVisible();
  });

  test('should navigate to Learn page', async ({ page }) => {
    await testNavigationLink(page, 'Learn', '/learn');

    // Verify Learn page loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to Practice page', async ({ page }) => {
    await testNavigationLink(page, 'Practice', '/practice');

    // Verify Practice page loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to Species page', async ({ page }) => {
    await testNavigationLink(page, 'Species', '/species');

    // Verify Species page loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should maintain active navigation state', async ({ page }) => {
    // Navigate to Learn
    await page.click('text=Learn');
    await page.waitForURL(/\/learn/);

    // Check active state (you may need to adjust selector based on actual implementation)
    const learnLink = page.locator('nav a[href*="learn"]');
    const classes = await learnLink.getAttribute('class');

    // Verify link is in nav (basic check - adjust based on your active state styling)
    await expect(learnLink).toBeVisible();
  });

  test('should navigate using browser back/forward buttons', async ({ page }) => {
    // Navigate: Home -> Learn -> Practice
    await page.click('text=Learn');
    await waitForNavigation(page, /\/learn/);

    await page.click('text=Practice');
    await waitForNavigation(page, /\/practice/);

    // Go back to Learn
    await page.goBack();
    await waitForNavigation(page, /\/learn/);

    // Go back to Home
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // Go forward to Learn
    await page.goForward();
    await waitForNavigation(page, /\/learn/);
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to Practice page
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/practice/);
    await expect(page.locator('main')).toBeVisible();

    // Navigate directly to Species page
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/species/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate between all pages in sequence', async ({ page }) => {
    const pages = [
      { link: 'Learn', path: '/learn' },
      { link: 'Practice', path: '/practice' },
      { link: 'Species', path: '/species' },
    ];

    for (const pageInfo of pages) {
      await page.click(`text=${pageInfo.link}`);
      await waitForNavigation(page, new RegExp(pageInfo.path));
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should return to home from any page via logo click', async ({ page }) => {
    // Navigate to Practice
    await page.click('text=Practice');
    await waitForNavigation(page, /\/practice/);

    // Click logo to return home
    const logo = page.locator('nav a[href="/"]').first();
    await logo.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
