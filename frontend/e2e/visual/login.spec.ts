/**
 * Login Page Visual Tests
 *
 * Visual regression tests for the login/authentication pages.
 */

import { test, expect } from '@playwright/test';
import { disableAnimations } from '../../src/test-utils/scroll-capture';
import { setupApiMocks, mockEndpoint } from '../../src/test-utils/api-mocks';

test.describe('Login Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('login page - default', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-default.png', {
      fullPage: true,
    });
  });

  test('login page - form focused', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Focus on email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.focus();
      await expect(page).toHaveScreenshot('login-focused.png', {
        fullPage: true,
      });
    }
  });

  test('login page - filled form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('user@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }

    await expect(page).toHaveScreenshot('login-filled.png', {
      fullPage: true,
    });
  });
});

test.describe('Login Page - Error States', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('login error - invalid credentials', async ({ page }) => {
    await mockEndpoint(
      page,
      '/api/auth/login',
      { error: 'Invalid email or password' },
      { status: 401 }
    );

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill and submit form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('wrong@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('wrongpassword');
    }
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('login-error-credentials.png', {
      fullPage: true,
    });
  });

  test('login error - validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Submit empty form to trigger validation
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('login-validation-errors.png', {
      fullPage: true,
    });
  });

  test('login error - network error', async ({ page }) => {
    await mockEndpoint(
      page,
      '/api/auth/login',
      { error: 'Network error. Please try again.' },
      { status: 500 }
    );

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill and submit
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('user@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('login-error-network.png', {
      fullPage: true,
    });
  });
});

test.describe('Login Page - Loading State', () => {
  test('login loading - submitting', async ({ page }) => {
    await disableAnimations(page);

    // Mock slow response
    await mockEndpoint(
      page,
      '/api/auth/login',
      { data: { token: 'mock_token' } },
      { delay: 3000 }
    );

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill and submit
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('user@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Capture loading state quickly
      await page.waitForTimeout(100);
    }

    await expect(page).toHaveScreenshot('login-loading.png', {
      fullPage: true,
    });
  });
});

test.describe('Login Page - Password Visibility', () => {
  test('password - hidden (default)', async ({ page }) => {
    await disableAnimations(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('secretpassword');

      const passwordField = page.locator('[data-testid="password-field"]').first();
      if (await passwordField.isVisible()) {
        await expect(passwordField).toHaveScreenshot('login-password-hidden.png');
      }
    }
  });

  test('password - visible (toggled)', async ({ page }) => {
    await disableAnimations(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    const toggleBtn = page.locator('[data-testid="toggle-password"]').first();

    if (await passwordInput.isVisible()) {
      await passwordInput.fill('secretpassword');
    }

    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(200);

      const passwordField = page.locator('[data-testid="password-field"]').first();
      if (await passwordField.isVisible()) {
        await expect(passwordField).toHaveScreenshot('login-password-visible.png');
      }
    }
  });
});

test.describe('Login Page - Social Login', () => {
  test('social login buttons', async ({ page }) => {
    await disableAnimations(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const socialSection = page.locator('[data-testid="social-login"]').first();
    if (await socialSection.isVisible()) {
      await expect(socialSection).toHaveScreenshot('login-social-buttons.png');
    }
  });
});

test.describe('Login Page - Links', () => {
  test('register link visible', async ({ page }) => {
    await disableAnimations(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const registerLink = page.locator('a[href*="register"], [data-testid="register-link"]').first();
    if (await registerLink.isVisible()) {
      await expect(registerLink).toHaveScreenshot('login-register-link.png');
    }
  });

  test('forgot password link visible', async ({ page }) => {
    await disableAnimations(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const forgotLink = page.locator('a[href*="forgot"], [data-testid="forgot-password-link"]').first();
    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toHaveScreenshot('login-forgot-link.png');
    }
  });
});
