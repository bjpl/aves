/**
 * Learn Page Visual Tests
 *
 * Visual regression tests for the learning page across viewports and states.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations, captureScrollPositions } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockEndpoint, mockAuthenticatedUser } from '../../src/test-utils/api-mocks';

test.describe('Learn Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('learn page - default view', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('learn-default.png', {
      fullPage: true,
    });
  });

  test('learn page - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/learn');

    // Capture loading skeleton
    await expect(page).toHaveScreenshot('learn-loading.png');
  });

  test('learn page - empty state (no lessons)', async ({ page }) => {
    await setupApiMocks(page, 'empty');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('learn-empty.png', {
      fullPage: true,
    });
  });

  test('learn page - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('learn-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Learn Page - Bird Selector', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('bird selector - default', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Find and screenshot the bird selector component
    const selector = page.locator('[data-testid="bird-selector"]').first();
    if (await selector.isVisible()) {
      await expect(selector).toHaveScreenshot('learn-bird-selector.png');
    }
  });

  test('bird selector - with selection', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Select a bird if selector is visible
    const birdCard = page.locator('[data-testid="bird-card"]').first();
    if (await birdCard.isVisible()) {
      await birdCard.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('learn-bird-selected.png', {
        fullPage: true,
      });
    }
  });
});

test.describe('Learn Page - Vocabulary Panel', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('vocabulary panel - collapsed', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="vocabulary-panel"]').first();
    if (await panel.isVisible()) {
      await expect(panel).toHaveScreenshot('learn-vocab-collapsed.png');
    }
  });

  test('vocabulary panel - expanded', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Expand vocabulary panel
    const expandBtn = page.locator('[data-testid="vocab-expand-btn"]').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('learn-vocab-expanded.png', {
        fullPage: true,
      });
    }
  });
});

test.describe('Learn Page - Interactive Bird Image', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('interactive image - default', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const image = page.locator('[data-testid="interactive-bird-image"]').first();
    if (await image.isVisible()) {
      await expect(image).toHaveScreenshot('learn-interactive-default.png');
    }
  });

  test('interactive image - annotation hover', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    // Hover over an annotation point
    const annotationPoint = page.locator('[data-testid="annotation-point"]').first();
    if (await annotationPoint.isVisible()) {
      await annotationPoint.hover();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('learn-annotation-hover.png');
    }
  });
});

test.describe('Learn Page - Progress Section', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('progress - new user (0%)', async ({ page }) => {
    await setupApiMocks(page, 'empty');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const progress = page.locator('[data-testid="progress-section"]').first();
    if (await progress.isVisible()) {
      await expect(progress).toHaveScreenshot('learn-progress-new.png');
    }
  });

  test('progress - mid-progress (50%)', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: { totalLessons: 20, completedLessons: 10, currentStreak: 5 },
    });
    await setupApiMocks(page, 'success');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const progress = page.locator('[data-testid="progress-section"]').first();
    if (await progress.isVisible()) {
      await expect(progress).toHaveScreenshot('learn-progress-mid.png');
    }
  });

  test('progress - complete (100%)', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: { totalLessons: 20, completedLessons: 20, currentStreak: 30 },
    });
    await setupApiMocks(page, 'success');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const progress = page.locator('[data-testid="progress-section"]').first();
    if (await progress.isVisible()) {
      await expect(progress).toHaveScreenshot('learn-progress-complete.png');
    }
  });
});

test.describe('Learn Page - Scroll Positions', () => {
  test('scroll positions capture', async ({ page }, testInfo) => {
    await setupApiMocks(page, 'success');
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('learn');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });
});
