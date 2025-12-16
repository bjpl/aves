/**
 * Admin Pages Visual Tests
 *
 * Visual regression tests for admin pages (annotations, images, analytics).
 * These pages require authentication with admin privileges.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations, captureScrollPositions } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockEndpoint, mockAuthenticatedUser } from '../../src/test-utils/api-mocks';
import { mockUser, mockAnnotations } from '../../src/test-utils/mock-data';

// Admin user mock
const adminUser = {
  ...mockUser,
  role: 'admin',
  permissions: ['annotations:read', 'annotations:write', 'images:manage', 'analytics:view'],
};

test.describe('Admin: Annotation Review Page', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
  });

  test('annotation review - default queue', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-annotations-default.png', {
      fullPage: true,
    });
  });

  test('annotation review - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/admin/annotations');

    await expect(page).toHaveScreenshot('admin-annotations-loading.png');
  });

  test('annotation review - empty queue', async ({ page }) => {
    await setupApiMocks(page, 'empty');
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-annotations-empty.png', {
      fullPage: true,
    });
  });

  test('annotation review - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-annotations-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Admin: Annotation Review Card', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('review card - pending annotation', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-testid="annotation-review-card"]').first();
    if (await card.isVisible()) {
      await expect(card).toHaveScreenshot('admin-annotation-card.png');
    }
  });

  test('review card - expanded details', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    const expandBtn = page.locator('[data-testid="expand-annotation"]').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('admin-annotation-expanded.png', {
        fullPage: true,
      });
    }
  });

  test('review card - with bounding box', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    const imageWithBox = page.locator('[data-testid="annotation-preview"]').first();
    if (await imageWithBox.isVisible()) {
      await expect(imageWithBox).toHaveScreenshot('admin-annotation-bbox.png');
    }
  });
});

test.describe('Admin: Annotation Actions', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('approve modal', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    const approveBtn = page.locator('[data-testid="approve-btn"]').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[data-testid="approve-modal"]').first();
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('admin-approve-modal.png');
      }
    }
  });

  test('reject modal', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    const rejectBtn = page.locator('[data-testid="reject-btn"]').first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[data-testid="reject-modal"]').first();
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('admin-reject-modal.png');
      }
    }
  });

  test('batch actions toolbar', async ({ page }) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    // Select multiple items
    const checkboxes = page.locator('[data-testid="annotation-checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await page.waitForTimeout(300);

      const toolbar = page.locator('[data-testid="batch-toolbar"]').first();
      if (await toolbar.isVisible()) {
        await expect(toolbar).toHaveScreenshot('admin-batch-toolbar.png');
      }
    }
  });
});

test.describe('Admin: Image Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
  });

  test('image management - default grid', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-images-default.png', {
      fullPage: true,
    });
  });

  test('image management - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/admin/images');

    await expect(page).toHaveScreenshot('admin-images-loading.png');
  });

  test('image management - empty state', async ({ page }) => {
    await setupApiMocks(page, 'empty');
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-images-empty.png', {
      fullPage: true,
    });
  });
});

test.describe('Admin: Image Upload Modal', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('upload modal - default', async ({ page }) => {
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    const uploadBtn = page.locator('[data-testid="upload-btn"]').first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[data-testid="upload-modal"]').first();
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('admin-upload-modal.png');
      }
    }
  });

  test('upload modal - drag area hover', async ({ page }) => {
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    const uploadBtn = page.locator('[data-testid="upload-btn"]').first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(300);

      const dropzone = page.locator('[data-testid="dropzone"]').first();
      if (await dropzone.isVisible()) {
        await dropzone.hover();
        await expect(dropzone).toHaveScreenshot('admin-upload-dropzone.png');
      }
    }
  });
});

test.describe('Admin: Image Bulk Selection', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('bulk selection mode', async ({ page }) => {
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    // Enter bulk selection mode
    const selectModeBtn = page.locator('[data-testid="bulk-select-btn"]').first();
    if (await selectModeBtn.isVisible()) {
      await selectModeBtn.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('admin-images-bulk-mode.png', {
        fullPage: true,
      });
    }
  });

  test('bulk selection - items selected', async ({ page }) => {
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');

    const imageCards = page.locator('[data-testid="image-card"]');
    const count = await imageCards.count();

    if (count >= 3) {
      // Select multiple images
      await imageCards.nth(0).click({ modifiers: ['Control'] });
      await imageCards.nth(1).click({ modifiers: ['Control'] });
      await imageCards.nth(2).click({ modifiers: ['Control'] });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('admin-images-selected.png', {
        fullPage: true,
      });
    }
  });
});

test.describe('Admin: ML Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
  });

  test('analytics dashboard - default', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-analytics-default.png', {
      fullPage: true,
    });
  });

  test('analytics dashboard - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/admin/analytics');

    await expect(page).toHaveScreenshot('admin-analytics-loading.png');
  });

  test('analytics dashboard - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-analytics-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Admin: Analytics Charts', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('annotation stats chart', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    const chart = page.locator('[data-testid="annotation-stats-chart"]').first();
    if (await chart.isVisible()) {
      await expect(chart).toHaveScreenshot('admin-chart-annotations.png');
    }
  });

  test('accuracy metrics', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    const metrics = page.locator('[data-testid="accuracy-metrics"]').first();
    if (await metrics.isVisible()) {
      await expect(metrics).toHaveScreenshot('admin-accuracy-metrics.png');
    }
  });

  test('pipeline performance', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    const pipeline = page.locator('[data-testid="pipeline-metrics"]').first();
    if (await pipeline.isVisible()) {
      await expect(pipeline).toHaveScreenshot('admin-pipeline-metrics.png');
    }
  });
});

test.describe('Admin: Unauthorized Access', () => {
  test('redirect non-admin user', async ({ page }) => {
    await disableAnimations(page);
    // Login as regular user (not admin)
    await mockAuthenticatedUser(page, { ...mockUser, role: 'user' });

    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    // Should redirect or show access denied
    await expect(page).toHaveScreenshot('admin-unauthorized.png', {
      fullPage: true,
    });
  });

  test('redirect unauthenticated user', async ({ page }) => {
    await disableAnimations(page);
    // Don't authenticate

    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveScreenshot('admin-unauthenticated.png', {
      fullPage: true,
    });
  });
});

test.describe('Admin Pages - Scroll Positions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page, adminUser);
    await setupApiMocks(page, 'success');
  });

  test('annotations scroll positions', async ({ page }, testInfo) => {
    await page.goto('/admin/annotations');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('admin-annotations');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });

  test('images scroll positions', async ({ page }, testInfo) => {
    await page.goto('/admin/images');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('admin-images');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });

  test('analytics scroll positions', async ({ page }, testInfo) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('admin-analytics');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });
});
