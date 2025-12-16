/**
 * Scroll Position Capture Utilities
 *
 * Utilities for capturing screenshots at different scroll positions
 * during visual regression testing with Playwright.
 */

import type { Page } from '@playwright/test';
import { VIEWPORTS, type Viewport } from './viewports';

/**
 * Standard scroll positions as percentages
 */
export const SCROLL_POSITIONS = {
  top: 0,
  quarterPage: 0.25,
  midPage: 0.5,
  threeQuarters: 0.75,
  bottom: 1,
} as const;

export type ScrollPosition = keyof typeof SCROLL_POSITIONS;

/**
 * Scroll capture configuration
 */
export interface ScrollCaptureConfig {
  /** Positions to capture (defaults to top, mid, bottom) */
  positions?: ScrollPosition[];
  /** Wait time after scroll in ms (defaults to 300) */
  waitAfterScroll?: number;
  /** Whether to capture full page (defaults to false) */
  fullPage?: boolean;
}

/**
 * Get the scrollable height of the page
 */
export async function getScrollHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  });
}

/**
 * Get the current viewport height
 */
export async function getViewportHeight(page: Page): Promise<number> {
  return page.evaluate(() => window.innerHeight);
}

/**
 * Scroll to a specific position on the page
 */
export async function scrollToPosition(
  page: Page,
  position: number,
  smooth = false
): Promise<void> {
  await page.evaluate(
    ({ y, smooth }) => {
      window.scrollTo({
        top: y,
        behavior: smooth ? 'smooth' : 'instant',
      });
    },
    { y: position, smooth }
  );
}

/**
 * Scroll to a percentage of the page
 */
export async function scrollToPercentage(
  page: Page,
  percentage: number
): Promise<void> {
  const scrollHeight = await getScrollHeight(page);
  const viewportHeight = await getViewportHeight(page);
  const maxScroll = scrollHeight - viewportHeight;
  const targetScroll = Math.floor(percentage * maxScroll);

  await scrollToPosition(page, targetScroll);
}

/**
 * Capture screenshots at multiple scroll positions
 */
export async function captureScrollPositions(
  page: Page,
  basePath: string,
  config: ScrollCaptureConfig = {}
): Promise<string[]> {
  const {
    positions = ['top', 'midPage', 'bottom'],
    waitAfterScroll = 300,
    fullPage = false,
  } = config;

  const capturedPaths: string[] = [];
  const scrollHeight = await getScrollHeight(page);
  const viewportHeight = await getViewportHeight(page);

  // Skip scroll captures if page doesn't scroll
  if (scrollHeight <= viewportHeight) {
    const path = `${basePath}-full.png`;
    await page.screenshot({ path, fullPage: true });
    return [path];
  }

  for (const positionKey of positions) {
    const percentage = SCROLL_POSITIONS[positionKey];
    await scrollToPercentage(page, percentage);
    await page.waitForTimeout(waitAfterScroll);

    const path = `${basePath}-scroll-${positionKey}.png`;
    await page.screenshot({ path, fullPage });
    capturedPaths.push(path);
  }

  return capturedPaths;
}

/**
 * Capture a visual matrix of viewport × scroll position
 */
export async function captureViewportScrollMatrix(
  page: Page,
  route: string,
  outputDir: string,
  viewports: (keyof typeof VIEWPORTS)[] = ['mobile', 'tablet', 'desktop'],
  scrollPositions: ScrollPosition[] = ['top', 'midPage', 'bottom']
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const routeName = route.replace(/\//g, '_') || 'home';

  for (const viewportKey of viewports) {
    const viewport = VIEWPORTS[viewportKey];
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const basePath = `${outputDir}/${routeName}/${viewportKey}`;
    const paths = await captureScrollPositions(page, basePath, {
      positions: scrollPositions,
    });

    results.set(viewportKey, paths);
  }

  return results;
}

/**
 * Wait for animations to complete before capturing
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const animations = document.getAnimations();
      if (animations.length === 0) {
        resolve();
        return;
      }
      Promise.all(animations.map((a) => a.finished)).then(() => resolve());
    });
  });
}

/**
 * Disable animations for consistent screenshots
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Capture element screenshot with scroll into view
 */
export async function captureElement(
  page: Page,
  selector: string,
  path: string
): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await element.screenshot({ path });
}
