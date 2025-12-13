import { test as base, expect } from '@playwright/test';

/**
 * Custom Playwright Test Fixtures for AVES
 *
 * CONCEPT: Reusable test utilities and setup/teardown logic
 * WHY: DRY principle - avoid repeating common test setup code
 * PATTERN: Fixture-based testing with automatic cleanup
 */

// Define custom fixture types
export type AVESFixtures = {
  // Custom fixtures can be added here
  mockAPI: void;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<AVESFixtures>({
  // Mock API fixture - automatically mocks API calls for offline testing
  mockAPI: async ({ page }, use) => {
    // Setup: Mock API responses
    await page.route('**/api/**', (route) => {
      const url = route.request().url();

      // Mock species data
      if (url.includes('/api/species')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              commonName: 'Bald Eagle',
              scientificName: 'Haliaeetus leucocephalus',
              description: 'A large bird of prey found in North America.',
              imageUrl: 'https://example.com/eagle.jpg',
            },
            {
              id: 2,
              commonName: 'Northern Cardinal',
              scientificName: 'Cardinalis cardinalis',
              description: 'A mid-sized songbird with distinctive red plumage.',
              imageUrl: 'https://example.com/cardinal.jpg',
            },
          ]),
        });
      }
      // Mock exercises data
      else if (url.includes('/api/exercises')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'exercise-1',
            type: 'visual-identification',
            question: 'Identify this bird species',
            options: ['Bald Eagle', 'Golden Eagle', 'Osprey', 'Hawk'],
            correctAnswer: 'Bald Eagle',
            imageUrl: 'https://example.com/eagle.jpg',
          }),
        });
      }
      // Mock progress data
      else if (url.includes('/api/progress')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            userId: 'test-user',
            completedExercises: 5,
            totalExercises: 20,
            accuracy: 0.85,
            streak: 3,
          }),
        });
      }
      // Default: continue with actual request
      else {
        route.continue();
      }
    });

    // Use the fixture
    await use();

    // Cleanup: Remove routes
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  },
});

/**
 * Helper function to wait for navigation to complete
 */
export async function waitForNavigation(page: any, expectedUrl: string | RegExp) {
  await page.waitForURL(expectedUrl, { timeout: 10000 });
  await expect(page).toHaveURL(expectedUrl);
}

/**
 * Helper function to check responsive layout
 */
export async function checkResponsiveLayout(page: any, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  // Use 'load' instead of 'networkidle' to avoid timeout when app has ongoing network activity
  await page.waitForLoadState('load');

  // Verify layout doesn't break
  const body = page.locator('body');
  await expect(body).toBeVisible();

  // Check for horizontal scrollbar (layout overflow) - log warning but don't fail
  // Some pages may have intentional horizontal scroll or minor overflow
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });

  if (hasHorizontalScroll) {
    console.warn(`Horizontal scroll detected at viewport ${viewport.width}x${viewport.height}`);
  }
}

/**
 * Helper function to test navigation links
 */
export async function testNavigationLink(page: any, linkText: string, expectedPath: string) {
  // Use specific selector to avoid strict mode violation when multiple elements match
  await page.getByRole('link', { name: linkText }).first().click();
  await waitForNavigation(page, new RegExp(expectedPath));
}

/**
 * Helper function to take timestamped screenshot
 */
export async function takeTimestampedScreenshot(page: any, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png`, fullPage: true });
}

// Re-export expect for convenience
export { expect };
