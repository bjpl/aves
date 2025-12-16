/**
 * Viewport Configuration for Visual Testing
 *
 * Shared viewport definitions used by both Storybook and Playwright
 * for consistent visual regression testing across devices.
 */

export interface Viewport {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

/**
 * Standard viewport configurations
 */
export const VIEWPORTS: Record<string, Viewport> = {
  mobile: {
    name: 'Mobile',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    name: 'Tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
  },
  desktop: {
    name: 'Desktop',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  desktopLarge: {
    name: 'Desktop Large',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
} as const;

/**
 * Viewport keys for iteration
 */
export const VIEWPORT_KEYS = Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[];

/**
 * Primary viewports for visual testing (excludes large desktop)
 */
export const PRIMARY_VIEWPORTS = ['mobile', 'tablet', 'desktop'] as const;

/**
 * Storybook viewport configuration
 */
export const STORYBOOK_VIEWPORTS = {
  mobile: {
    name: 'Mobile (375×667)',
    styles: {
      width: '375px',
      height: '667px',
    },
  },
  tablet: {
    name: 'Tablet (768×1024)',
    styles: {
      width: '768px',
      height: '1024px',
    },
  },
  desktop: {
    name: 'Desktop (1440×900)',
    styles: {
      width: '1440px',
      height: '900px',
    },
  },
  desktopLarge: {
    name: 'Desktop Large (1920×1080)',
    styles: {
      width: '1920px',
      height: '1080px',
    },
  },
};

/**
 * Playwright viewport configuration
 */
export const PLAYWRIGHT_VIEWPORTS = PRIMARY_VIEWPORTS.map((key) => ({
  name: key,
  use: {
    viewport: {
      width: VIEWPORTS[key].width,
      height: VIEWPORTS[key].height,
    },
    deviceScaleFactor: VIEWPORTS[key].deviceScaleFactor,
    isMobile: VIEWPORTS[key].isMobile,
    hasTouch: VIEWPORTS[key].hasTouch,
  },
}));

/**
 * Get viewport by name
 */
export function getViewport(name: keyof typeof VIEWPORTS): Viewport {
  return VIEWPORTS[name];
}

/**
 * Check if viewport is mobile
 */
export function isMobileViewport(viewport: Viewport): boolean {
  return viewport.width < 768;
}

/**
 * Check if viewport is tablet
 */
export function isTabletViewport(viewport: Viewport): boolean {
  return viewport.width >= 768 && viewport.width < 1024;
}

/**
 * Check if viewport is desktop
 */
export function isDesktopViewport(viewport: Viewport): boolean {
  return viewport.width >= 1024;
}
