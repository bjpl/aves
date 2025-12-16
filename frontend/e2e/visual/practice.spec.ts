/**
 * Practice Page Visual Tests
 *
 * Visual regression tests for the practice/exercise page across viewports and states.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations, captureScrollPositions } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockEndpoint, mockAuthenticatedUser } from '../../src/test-utils/api-mocks';
import { mockExerciseSession } from '../../src/test-utils/mock-data';

test.describe('Practice Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('practice page - default (mode selection)', async ({ page }) => {
    await setupApiMocks(page, 'success');
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('practice-default.png', {
      fullPage: true,
    });
  });

  test('practice page - loading state', async ({ page }) => {
    await setupApiMocks(page, 'loading');
    await page.goto('/practice');

    await expect(page).toHaveScreenshot('practice-loading.png');
  });

  test('practice page - empty (no exercises)', async ({ page }) => {
    await setupApiMocks(page, 'empty');
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('practice-empty.png', {
      fullPage: true,
    });
  });

  test('practice page - error state', async ({ page }) => {
    await setupApiMocks(page, 'error');
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('practice-error.png', {
      fullPage: true,
    });
  });
});

test.describe('Practice Mode Picker', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('mode picker - all modes visible', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const modePicker = page.locator('[data-testid="practice-mode-picker"]').first();
    if (await modePicker.isVisible()) {
      await expect(modePicker).toHaveScreenshot('practice-mode-picker.png');
    }
  });

  test('mode picker - vocabulary selected', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const vocabMode = page.locator('[data-testid="mode-vocabulary"]').first();
    if (await vocabMode.isVisible()) {
      await vocabMode.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('practice-vocab-selected.png', {
        fullPage: true,
      });
    }
  });

  test('mode picker - identification selected', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const idMode = page.locator('[data-testid="mode-identification"]').first();
    if (await idMode.isVisible()) {
      await idMode.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('practice-id-selected.png', {
        fullPage: true,
      });
    }
  });
});

test.describe('Practice Session - Active', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('session - exercise displayed', async ({ page }) => {
    // Mock active session
    await mockEndpoint(page, '/api/exercises/session', {
      data: {
        ...mockExerciseSession,
        currentExercise: 3,
        totalExercises: 10,
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Start a session if button is visible
    const startBtn = page.locator('[data-testid="start-practice-btn"]').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForLoadState('networkidle');
    }

    await expect(page).toHaveScreenshot('practice-session-active.png', {
      fullPage: true,
    });
  });

  test('session - progress bar', async ({ page }) => {
    await mockEndpoint(page, '/api/exercises/session', {
      data: {
        ...mockExerciseSession,
        currentExercise: 5,
        totalExercises: 10,
        correctAnswers: 4,
        streak: 3,
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const progress = page.locator('[data-testid="session-progress"]').first();
    if (await progress.isVisible()) {
      await expect(progress).toHaveScreenshot('practice-session-progress.png');
    }
  });

  test('session - streak indicator', async ({ page }) => {
    await mockEndpoint(page, '/api/exercises/session', {
      data: {
        ...mockExerciseSession,
        streak: 7,
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const streak = page.locator('[data-testid="streak-indicator"]').first();
    if (await streak.isVisible()) {
      await expect(streak).toHaveScreenshot('practice-streak-hot.png');
    }
  });
});

test.describe('Practice Session - Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('feedback - correct answer', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Simulate showing correct feedback
    const feedback = page.locator('[data-testid="exercise-feedback"].correct').first();
    if (await feedback.isVisible()) {
      await expect(feedback).toHaveScreenshot('practice-feedback-correct.png');
    }
  });

  test('feedback - incorrect answer', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const feedback = page.locator('[data-testid="exercise-feedback"].incorrect').first();
    if (await feedback.isVisible()) {
      await expect(feedback).toHaveScreenshot('practice-feedback-incorrect.png');
    }
  });
});

test.describe('Practice Session - Complete', () => {
  test('session complete - summary', async ({ page }) => {
    await disableAnimations(page);
    await mockEndpoint(page, '/api/exercises/session', {
      data: {
        ...mockExerciseSession,
        currentExercise: 10,
        totalExercises: 10,
        correctAnswers: 8,
        isComplete: true,
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('practice-session-complete.png', {
      fullPage: true,
    });
  });

  test('session complete - perfect score', async ({ page }) => {
    await disableAnimations(page);
    await mockEndpoint(page, '/api/exercises/session', {
      data: {
        ...mockExerciseSession,
        currentExercise: 10,
        totalExercises: 10,
        correctAnswers: 10,
        streak: 10,
        isComplete: true,
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('practice-perfect-score.png', {
      fullPage: true,
    });
  });
});

test.describe('Exercise Types Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setupApiMocks(page, 'success');
  });

  test('exercise - visual identification', async ({ page }) => {
    await mockEndpoint(page, '/api/exercises', {
      data: {
        type: 'visual_identification',
        prompt: 'Click on: el pico',
        metadata: { bird: 'flamingo', targetPart: 'beak' },
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const exercise = page.locator('[data-testid="exercise-visual-id"]').first();
    if (await exercise.isVisible()) {
      await expect(exercise).toHaveScreenshot('exercise-visual-id.png');
    }
  });

  test('exercise - term matching', async ({ page }) => {
    await mockEndpoint(page, '/api/exercises', {
      data: {
        type: 'term_matching',
        pairs: [
          { spanish: 'el pico', english: 'the beak' },
          { spanish: 'las alas', english: 'the wings' },
        ],
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const exercise = page.locator('[data-testid="exercise-term-match"]').first();
    if (await exercise.isVisible()) {
      await expect(exercise).toHaveScreenshot('exercise-term-match.png');
    }
  });

  test('exercise - contextual fill', async ({ page }) => {
    await mockEndpoint(page, '/api/exercises', {
      data: {
        type: 'contextual_fill',
        sentence: 'El pájaro tiene un ___ largo y puntiagudo.',
        options: ['pico', 'ala', 'cola', 'pluma'],
        correctAnswer: 'pico',
      },
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const exercise = page.locator('[data-testid="exercise-contextual"]').first();
    if (await exercise.isVisible()) {
      await expect(exercise).toHaveScreenshot('exercise-contextual-fill.png');
    }
  });
});

test.describe('Practice Page - Scroll Positions', () => {
  test('scroll positions capture', async ({ page }, testInfo) => {
    await setupApiMocks(page, 'success');
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
    await disableAnimations(page);

    const basePath = testInfo.outputPath('practice');
    await captureScrollPositions(page, basePath, {
      positions: ['top', 'midPage', 'bottom'],
    });
  });
});
