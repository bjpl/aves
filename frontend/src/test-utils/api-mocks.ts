/**
 * API Mock Handlers for Visual Testing
 *
 * Mock API responses for different UI states during testing.
 * Can be used with Playwright's route interception or MSW.
 */

import type { Page, Route } from '@playwright/test';
import {
  mockSpeciesList,
  mockSpecies,
  mockAnnotations,
  mockExercise,
  mockExerciseSession,
  mockUser,
  mockProgress,
} from './mock-data';

/**
 * API endpoints configuration
 */
const API_BASE = process.env.VITE_API_URL || 'https://aves-production.up.railway.app';

/**
 * Mock response builders
 */
const mockResponses = {
  // Species endpoints
  '/api/species': {
    success: { data: mockSpeciesList, total: mockSpeciesList.length },
    empty: { data: [], total: 0 },
    error: { error: 'Failed to fetch species' },
  },
  '/api/species/:id': {
    success: { data: mockSpecies },
    notFound: { error: 'Species not found', status: 404 },
    error: { error: 'Failed to fetch species details' },
  },

  // Annotation endpoints
  '/api/annotations': {
    success: { data: mockAnnotations, total: mockAnnotations.length },
    empty: { data: [], total: 0 },
    error: { error: 'Failed to fetch annotations' },
  },

  // Exercise endpoints
  '/api/exercises': {
    success: { data: mockExercise },
    error: { error: 'Failed to fetch exercise' },
  },
  '/api/exercises/session': {
    success: { data: mockExerciseSession },
    empty: { data: null, message: 'No active session' },
    error: { error: 'Failed to create session' },
  },

  // User endpoints
  '/api/auth/me': {
    success: { data: mockUser },
    unauthorized: { error: 'Unauthorized', status: 401 },
  },
  '/api/progress': {
    success: { data: mockProgress },
    empty: { data: { totalLessons: 0, completedLessons: 0 } },
    error: { error: 'Failed to fetch progress' },
  },

  // AI endpoints
  '/api/ai/annotations/generate': {
    success: { data: mockAnnotations, cached: false },
    cached: { data: mockAnnotations, cached: true },
    error: { error: 'AI service unavailable' },
  },
};

type MockState = 'success' | 'empty' | 'error' | 'loading' | 'notFound' | 'unauthorized' | 'cached';

/**
 * Setup API mocks for a specific state
 */
export async function setupApiMocks(
  page: Page,
  state: MockState = 'success'
): Promise<void> {
  await page.route(`${API_BASE}/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    // Find matching mock response
    for (const [pattern, responses] of Object.entries(mockResponses)) {
      const regex = new RegExp(`^${pattern.replace(':id', '[^/]+')}$`);
      if (regex.test(path)) {
        const response = responses[state] || responses['success'];

        if (state === 'loading') {
          // Simulate slow response for loading states
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const status = response.status || (state === 'error' ? 500 : 200);

        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
        return;
      }
    }

    // Pass through unmatched requests
    await route.continue();
  });
}

/**
 * Setup specific endpoint mock
 */
export async function mockEndpoint(
  page: Page,
  endpoint: string,
  response: object,
  options: { status?: number; delay?: number } = {}
): Promise<void> {
  const { status = 200, delay = 0 } = options;

  await page.route(`${API_BASE}${endpoint}`, async (route: Route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Setup mock for species list with custom data
 */
export async function mockSpeciesListResponse(
  page: Page,
  species: typeof mockSpeciesList
): Promise<void> {
  await mockEndpoint(page, '/api/species', { data: species, total: species.length });
}

/**
 * Setup mock for species detail with custom data
 */
export async function mockSpeciesDetailResponse(
  page: Page,
  species: typeof mockSpecies
): Promise<void> {
  await mockEndpoint(page, `/api/species/${species.id}`, { data: species });
}

/**
 * Setup mock for authenticated user
 */
export async function mockAuthenticatedUser(
  page: Page,
  user = mockUser
): Promise<void> {
  await mockEndpoint(page, '/api/auth/me', { data: user });

  // Also set auth cookie/token if needed
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: 'mock_token_for_testing',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * Setup mock for unauthenticated state
 */
export async function mockUnauthenticated(page: Page): Promise<void> {
  await mockEndpoint(page, '/api/auth/me', { error: 'Unauthorized' }, { status: 401 });
}

/**
 * Clear all route mocks
 */
export async function clearMocks(page: Page): Promise<void> {
  await page.unroute(`${API_BASE}/**`);
}

/**
 * Helper to inject state into page for testing
 */
export async function injectAppState(
  page: Page,
  state: Record<string, unknown>
): Promise<void> {
  await page.evaluate((stateData) => {
    // For Zustand stores
    if (window.__ZUSTAND_STORE__) {
      window.__ZUSTAND_STORE__.setState(stateData);
    }
    // For React Query cache
    if (window.__REACT_QUERY_CLIENT__) {
      Object.entries(stateData).forEach(([key, value]) => {
        window.__REACT_QUERY_CLIENT__.setQueryData([key], value);
      });
    }
  }, state);
}

// Type augmentation for window
declare global {
  interface Window {
    __ZUSTAND_STORE__?: { setState: (state: Record<string, unknown>) => void };
    __REACT_QUERY_CLIENT__?: { setQueryData: (key: string[], value: unknown) => void };
  }
}
