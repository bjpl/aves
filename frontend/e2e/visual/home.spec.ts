/**
 * Home Page Visual Tests
 *
 * Visual regression tests for the home page across viewports.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations, captureScrollPositions } from '../../src/test-utils/scroll-capture';

test.describe('Home Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await disableAnimations(page);
  });

  test('home page renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for content to be visible
    await expect(page.locator('body')).toBeVisible();

    // Capture screenshot
    await expect(page).toHaveScreenshot('home-default.png', {
      fullPage: true,
    });
  });

  test('home page hero section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capture above-the-fold content
    await expect(page).toHaveScreenshot('home-hero.png');
  });

  test('home page with scroll positions', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capture at different scroll positions
    const basePath = testInfo.outputPath('home');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });
});

test.describe('Home Page Responsive Tests', () => {
  test('responsive navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    // Capture navigation area
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      await expect(nav).toHaveScreenshot('home-nav.png');
    }
  });

  test('responsive footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('home-footer.png');
  });
});
