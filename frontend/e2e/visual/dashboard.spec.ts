/**
 * Dashboard Page Visual Tests
 *
 * Visual regression tests for the user dashboard across viewports and states.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations, captureScrollPositions } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockEndpoint, mockAuthenticatedUser } from '../../src/test-utils/api-mocks';
import { mockUser, mockProgress } from '../../src/test-utils/mock-data';

test.describe('Dashboard Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
  });

  test('dashboard - default view', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-default.png', {
      fullPage: true,
    });
  });

  test('dashboard - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/dashboard');

    await expect(page).toHaveScreenshot('dashboard-loading.png');
  });

  test('dashboard - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Dashboard - New User', () => {
  test('new user - empty state', async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page, {
      ...mockUser,
      createdAt: new Date().toISOString(),
    });
    await mockEndpoint(page, '/api/progress', {
      data: {
        totalLessons: 0,
        completedLessons: 0,
        currentStreak: 0,
        speciesDiscovered: 0,
        vocabularyLearned: 0,
      },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-new-user.png', {
      fullPage: true,
    });
  });

  test('new user - welcome message', async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
    await mockEndpoint(page, '/api/progress', {
      data: { totalLessons: 0, completedLessons: 0 },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const welcome = page.locator('[data-testid="welcome-message"]').first();
    if (await welcome.isVisible()) {
      await expect(welcome).toHaveScreenshot('dashboard-welcome.png');
    }
  });
});

test.describe('Dashboard - Progress Stats', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
  });

  test('progress stats - beginner', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: {
        totalLessons: 50,
        completedLessons: 5,
        currentStreak: 2,
        speciesDiscovered: 3,
        vocabularyLearned: 15,
        accuracy: 65,
      },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const stats = page.locator('[data-testid="progress-stats"]').first();
    if (await stats.isVisible()) {
      await expect(stats).toHaveScreenshot('dashboard-stats-beginner.png');
    }
  });

  test('progress stats - intermediate', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: {
        totalLessons: 50,
        completedLessons: 25,
        currentStreak: 7,
        speciesDiscovered: 15,
        vocabularyLearned: 80,
        accuracy: 78,
      },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const stats = page.locator('[data-testid="progress-stats"]').first();
    if (await stats.isVisible()) {
      await expect(stats).toHaveScreenshot('dashboard-stats-intermediate.png');
    }
  });

  test('progress stats - advanced', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: {
        totalLessons: 50,
        completedLessons: 48,
        currentStreak: 30,
        speciesDiscovered: 40,
        vocabularyLearned: 200,
        accuracy: 92,
      },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const stats = page.locator('[data-testid="progress-stats"]').first();
    if (await stats.isVisible()) {
      await expect(stats).toHaveScreenshot('dashboard-stats-advanced.png');
    }
  });
});

test.describe('Dashboard - Streak Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
  });

  test('streak - no streak', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: { ...mockProgress, currentStreak: 0 },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const streak = page.locator('[data-testid="streak-card"]').first();
    if (await streak.isVisible()) {
      await expect(streak).toHaveScreenshot('dashboard-streak-none.png');
    }
  });

  test('streak - small streak (3 days)', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: { ...mockProgress, currentStreak: 3 },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const streak = page.locator('[data-testid="streak-card"]').first();
    if (await streak.isVisible()) {
      await expect(streak).toHaveScreenshot('dashboard-streak-small.png');
    }
  });

  test('streak - hot streak (7+ days)', async ({ page }) => {
    await mockEndpoint(page, '/api/progress', {
      data: { ...mockProgress, currentStreak: 14 },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const streak = page.locator('[data-testid="streak-card"]').first();
    if (await streak.isVisible()) {
      await expect(streak).toHaveScreenshot('dashboard-streak-hot.png');
    }
  });
});

test.describe('Dashboard - Recent Activity', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
    await setupApiMocks(page, 'success');
  });

  test('recent activity - with items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const activity = page.locator('[data-testid="recent-activity"]').first();
    if (await activity.isVisible()) {
      await expect(activity).toHaveScreenshot('dashboard-activity.png');
    }
  });

  test('recent species - learned', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const species = page.locator('[data-testid="recent-species"]').first();
    if (await species.isVisible()) {
      await expect(species).toHaveScreenshot('dashboard-recent-species.png');
    }
  });
});

test.describe('Dashboard - SRS Review Section', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuthenticatedUser(page);
  });

  test('reviews - none due', async ({ page }) => {
    await mockEndpoint(page, '/api/srs/due', {
      data: { dueCount: 0, nextReviewAt: null },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const reviews = page.locator('[data-testid="srs-review-card"]').first();
    if (await reviews.isVisible()) {
      await expect(reviews).toHaveScreenshot('dashboard-reviews-none.png');
    }
  });

  test('reviews - some due', async ({ page }) => {
    await mockEndpoint(page, '/api/srs/due', {
      data: { dueCount: 15, nextReviewAt: new Date().toISOString() },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const reviews = page.locator('[data-testid="srs-review-card"]').first();
    if (await reviews.isVisible()) {
      await expect(reviews).toHaveScreenshot('dashboard-reviews-due.png');
    }
  });

  test('reviews - many due (urgent)', async ({ page }) => {
    await mockEndpoint(page, '/api/srs/due', {
      data: { dueCount: 50, nextReviewAt: new Date().toISOString() },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const reviews = page.locator('[data-testid="srs-review-card"]').first();
    if (await reviews.isVisible()) {
      await expect(reviews).toHaveScreenshot('dashboard-reviews-urgent.png');
    }
  });
});

test.describe('Dashboard - Scroll Positions', () => {
  test('scroll positions capture', async ({ page }, testInfo) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page, 'success');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('dashboard');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });
});
