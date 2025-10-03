import { test, expect, checkResponsiveLayout } from '../fixtures/test-fixtures';

/**
 * Responsive Design E2E Tests
 *
 * CONCEPT: Verify responsive behavior across all breakpoints and devices
 * WHY: Mobile-first design is critical for modern web applications
 * COVERAGE: Mobile, tablet, desktop viewports across all pages
 */

test.describe('Responsive Design - Mobile (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should render home page responsively on mobile', async ({ page }) => {
    await page.goto('/');
    await checkResponsiveLayout(page, { width: 375, height: 667 });

    // Verify navigation is accessible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should render learn page responsively on mobile', async ({ page }) => {
    await page.goto('/learn');
    await checkResponsiveLayout(page, { width: 375, height: 667 });
  });

  test('should render practice page responsively on mobile', async ({ page }) => {
    await page.goto('/practice');
    await checkResponsiveLayout(page, { width: 375, height: 667 });
  });

  test('should render species page responsively on mobile', async ({ page }) => {
    await page.goto('/species');
    await checkResponsiveLayout(page, { width: 375, height: 667 });
  });

  test('should have touch-friendly navigation on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check navigation links are large enough for touch
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();

    if (count > 0) {
      const firstLink = navLinks.first();
      const box = await firstLink.boundingBox();

      if (box) {
        // Touch targets should be at least 44x44px (Apple HIG) or 48x48px (Material Design)
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Responsive Design - Tablet (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test('should render home page responsively on tablet', async ({ page }) => {
    await page.goto('/');
    await checkResponsiveLayout(page, { width: 768, height: 1024 });
  });

  test('should render learn page responsively on tablet', async ({ page }) => {
    await page.goto('/learn');
    await checkResponsiveLayout(page, { width: 768, height: 1024 });
  });

  test('should render practice page responsively on tablet', async ({ page }) => {
    await page.goto('/practice');
    await checkResponsiveLayout(page, { width: 768, height: 1024 });
  });

  test('should render species page responsively on tablet', async ({ page }) => {
    await page.goto('/species');
    await checkResponsiveLayout(page, { width: 768, height: 1024 });
  });
});

test.describe('Responsive Design - Desktop (1920x1080)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should render home page responsively on desktop', async ({ page }) => {
    await page.goto('/');
    await checkResponsiveLayout(page, { width: 1920, height: 1080 });
  });

  test('should render learn page responsively on desktop', async ({ page }) => {
    await page.goto('/learn');
    await checkResponsiveLayout(page, { width: 1920, height: 1080 });
  });

  test('should render practice page responsively on desktop', async ({ page }) => {
    await page.goto('/practice');
    await checkResponsiveLayout(page, { width: 1920, height: 1080 });
  });

  test('should render species page responsively on desktop', async ({ page }) => {
    await page.goto('/species');
    await checkResponsiveLayout(page, { width: 1920, height: 1080 });
  });

  test('should utilize wide screen space effectively', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify content doesn't stretch too wide (max-width constraint)
    const mainContent = page.locator('main, .container, .max-w-7xl').first();
    const box = await mainContent.boundingBox();

    if (box) {
      // Content should be centered with reasonable max width
      expect(box.width).toBeLessThanOrEqual(1536); // Typical max-width
    }
  });
});

test.describe('Responsive Design - Viewport Transitions', () => {
  test('should handle viewport resize gracefully', async ({ page }) => {
    await page.goto('/');

    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nav')).toBeVisible();

    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Allow reflow
    await expect(page.locator('nav')).toBeVisible();

    // Resize to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500); // Allow reflow
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should maintain functionality across viewport changes', async ({ page }) => {
    await page.goto('/');

    // Mobile viewport - navigate
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('text=Learn');
    await page.waitForURL(/\/learn/);

    // Tablet viewport - navigate
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.click('text=Practice');
    await page.waitForURL(/\/practice/);

    // Desktop viewport - navigate
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.click('text=Species');
    await page.waitForURL(/\/species/);

    // Verify final page loaded
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Responsive Design - Image Handling', () => {
  test('should load appropriate images for viewport', async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    // Check if any images exist
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Verify images are responsive (have max-width or width constraints)
      const firstImage = images.first();
      const styles = await firstImage.evaluate((el: HTMLImageElement) => {
        return {
          maxWidth: window.getComputedStyle(el).maxWidth,
          width: window.getComputedStyle(el).width,
        };
      });

      // Images should have responsive constraints
      expect(styles.maxWidth === '100%' || styles.width === '100%').toBeTruthy();
    }
  });
});
