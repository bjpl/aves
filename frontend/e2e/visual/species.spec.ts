/**
 * Species Page Visual Tests
 *
 * Visual regression tests for the species browser and detail pages.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockSpeciesListResponse } from '../../src/test-utils/api-mocks';
import { mockSpeciesList } from '../../src/test-utils/mock-data';

test.describe('Species Browser Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('species grid - populated', async ({ page }) => {
    // Setup mock API responses
    await setupApiMocks(page, 'success');

    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('species-grid-populated.png', {
      fullPage: true,
    });
  });

  test('species grid - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');

    await page.goto('/species');

    // Capture loading state quickly
    await expect(page).toHaveScreenshot('species-grid-loading.png');
  });

  test('species grid - empty state', async ({ page }) => {
    await setupApiMocks(page, 'empty');

    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('species-grid-empty.png', {
      fullPage: true,
    });
  });

  test('species grid - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');

    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('species-grid-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Species Detail Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('species detail - default view', async ({ page }) => {
    await page.goto('/species/sp-001');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('species-detail-default.png', {
      fullPage: true,
    });
  });

  test('species detail - annotations visible', async ({ page }) => {
    await page.goto('/species/sp-001');
    await page.waitForLoadState('networkidle');

    // Hover over image to show annotations (if applicable)
    const image = page.locator('[data-testid="species-image"]').first();
    if (await image.isVisible()) {
      await image.hover();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('species-detail-annotations.png', {
      fullPage: true,
    });
  });
});

test.describe('Species Filters Visual Tests', () => {
  test('filter panel - expanded', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    // Open filters if collapsed
    const filterToggle = page.locator('[data-testid="filter-toggle"]');
    if (await filterToggle.isVisible()) {
      await filterToggle.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('species-filters-expanded.png', {
      fullPage: true,
    });
  });
});
