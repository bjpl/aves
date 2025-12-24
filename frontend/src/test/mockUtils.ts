/**
 * Reusable DOM Mock Utilities
 *
 * Centralized mocking utilities for common DOM API patterns in tests.
 * Prevents code duplication and ensures consistent mock implementations.
 *
 * @module test/mockUtils
 */

import { vi } from 'vitest';

/**
 * Mock window.location with all required properties
 *
 * @param overrides - Partial location object to merge with defaults
 * @returns Mocked location object
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   mockWindowLocation({ hostname: 'example.github.io', pathname: '/app' });
 * });
 * ```
 */
export function mockWindowLocation(overrides: Partial<Location> = {}) {
  const defaultLocation: Partial<Location> = {
    hostname: 'localhost',
    href: 'http://localhost:5173',
    pathname: '/',
    protocol: 'http:',
    port: '5173',
    host: 'localhost:5173',
    origin: 'http://localhost:5173',
    search: '',
    hash: ''
  };

  Object.defineProperty(window, 'location', {
    value: { ...defaultLocation, ...overrides },
    writable: true,
    configurable: true
  });
}

/**
 * Mock sessionStorage with spy functions
 *
 * @returns Mocked sessionStorage with spy methods
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   const storage = mockSessionStorage();
 *   storage.getItem.mockReturnValue('test-session-id');
 * });
 * ```
 */
export function mockSessionStorage() {
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  };

  Object.defineProperty(global, 'sessionStorage', {
    value: storage,
    writable: true,
    configurable: true
  });

  return storage;
}

/**
 * Mock localStorage with spy functions
 *
 * @returns Mocked localStorage with spy methods
 */
export function mockLocalStorage() {
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  };

  Object.defineProperty(global, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true
  });

  return storage;
}

/**
 * Mock window.matchMedia for responsive design tests
 *
 * @param matches - Whether the media query matches
 * @returns Mocked MediaQueryList
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   mockMatchMedia(true); // Simulate mobile viewport
 * });
 * ```
 */
export function mockMatchMedia(matches: boolean = false) {
  const mockMediaQueryList = {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };

  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
      ...mockMediaQueryList,
      media: query
    })),
    writable: true,
    configurable: true
  });

  return mockMediaQueryList;
}

/**
 * Mock IntersectionObserver for visibility detection tests
 *
 * @returns Mocked IntersectionObserver class
 */
export function mockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    value: mockIntersectionObserver,
    writable: true,
    configurable: true
  });

  return mockIntersectionObserver;
}

/**
 * Mock ResizeObserver for element resize detection tests
 *
 * @returns Mocked ResizeObserver class
 */
export function mockResizeObserver() {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  });

  Object.defineProperty(window, 'ResizeObserver', {
    value: mockResizeObserver,
    writable: true,
    configurable: true
  });

  return mockResizeObserver;
}

/**
 * Mock window.scrollTo for scroll behavior tests
 */
export function mockScrollTo() {
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
    configurable: true
  });
}

/**
 * Mock Element.getBoundingClientRect for layout tests
 *
 * @param rect - Partial DOMRect to return
 * @returns Mock function
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   mockGetBoundingClientRect({ width: 100, height: 50, top: 10, left: 20 });
 * });
 * ```
 */
export function mockGetBoundingClientRect(rect: Partial<DOMRect> = {}) {
  const defaultRect: DOMRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({})
  };

  const mockRect = { ...defaultRect, ...rect };

  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

  return mockRect;
}

/**
 * Comprehensive setup for all common DOM mocks
 * Call this in test setup to mock everything at once
 *
 * @param options - Configuration for individual mocks
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupAllDOMMocks({
 *     location: { hostname: 'localhost' },
 *     matchMedia: { matches: true },
 *     boundingRect: { width: 1024, height: 768 }
 *   });
 * });
 * ```
 */
export function setupAllDOMMocks(options: {
  location?: Partial<Location>;
  matchMedia?: { matches: boolean };
  boundingRect?: Partial<DOMRect>;
} = {}) {
  if (options.location) {
    mockWindowLocation(options.location);
  }

  mockSessionStorage();
  mockLocalStorage();

  if (options.matchMedia) {
    mockMatchMedia(options.matchMedia.matches);
  }

  mockIntersectionObserver();
  mockResizeObserver();
  mockScrollTo();

  if (options.boundingRect) {
    mockGetBoundingClientRect(options.boundingRect);
  }
}

/**
 * Clean up all DOM mocks after tests
 * Restores original implementations
 */
export function cleanupAllDOMMocks() {
  vi.restoreAllMocks();

  // Reset window properties
  delete (window as any).matchMedia;
  delete (window as any).IntersectionObserver;
  delete (window as any).ResizeObserver;
  delete (window as any).scrollTo;
}
