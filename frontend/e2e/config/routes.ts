/**
 * Route Configuration for Visual Testing
 *
 * Defines all routes and their testable states for visual regression testing.
 */

export interface RouteState {
  name: string;
  description: string;
  mockSetup?: string; // Function name to call for mock setup
}

export interface RouteConfig {
  path: string;
  name: string;
  states: RouteState[];
  requiresAuth?: boolean;
  scrollable?: boolean;
}

/**
 * All application routes with their visual states
 */
export const ROUTES: Record<string, RouteConfig> = {
  home: {
    path: '/',
    name: 'Home',
    states: [
      { name: 'default', description: 'Default landing page' },
      { name: 'loading', description: 'Initial loading state' },
    ],
    scrollable: true,
  },

  learn: {
    path: '/learn',
    name: 'Learn',
    states: [
      { name: 'default', description: 'Learning page with content' },
      { name: 'loading', description: 'Loading learning content' },
      { name: 'empty', description: 'No lessons available' },
      { name: 'lesson-active', description: 'Lesson in progress' },
    ],
    scrollable: true,
  },

  practice: {
    path: '/practice',
    name: 'Practice',
    states: [
      { name: 'default', description: 'Practice selection page' },
      { name: 'loading', description: 'Loading practice content' },
      { name: 'session-active', description: 'Practice session in progress' },
      { name: 'session-complete', description: 'Practice session completed' },
      { name: 'empty', description: 'No exercises available' },
    ],
    scrollable: true,
  },

  species: {
    path: '/species',
    name: 'Species Browser',
    states: [
      { name: 'grid', description: 'Species grid view' },
      { name: 'loading', description: 'Loading species' },
      { name: 'filtered', description: 'Filtered by category' },
      { name: 'search-results', description: 'Search results displayed' },
      { name: 'empty', description: 'No species found' },
    ],
    scrollable: true,
  },

  speciesDetail: {
    path: '/species/:id',
    name: 'Species Detail',
    states: [
      { name: 'default', description: 'Species detail with annotations' },
      { name: 'loading', description: 'Loading species details' },
      { name: 'not-found', description: 'Species not found (404)' },
      { name: 'annotations-expanded', description: 'Annotations panel open' },
    ],
    scrollable: true,
  },

  dashboard: {
    path: '/dashboard',
    name: 'User Dashboard',
    requiresAuth: true,
    states: [
      { name: 'default', description: 'Dashboard with user stats' },
      { name: 'loading', description: 'Loading user data' },
      { name: 'empty', description: 'New user with no progress' },
    ],
    scrollable: true,
  },

  login: {
    path: '/login',
    name: 'Login',
    states: [
      { name: 'default', description: 'Login form' },
      { name: 'error', description: 'Login error displayed' },
      { name: 'loading', description: 'Submitting login' },
    ],
    scrollable: false,
  },

  adminAnnotations: {
    path: '/admin/annotations',
    name: 'Admin: Annotations',
    requiresAuth: true,
    states: [
      { name: 'default', description: 'Annotation review queue' },
      { name: 'loading', description: 'Loading annotations' },
      { name: 'empty', description: 'No pending annotations' },
      { name: 'review-modal', description: 'Review modal open' },
    ],
    scrollable: true,
  },

  adminImages: {
    path: '/admin/images',
    name: 'Admin: Image Management',
    requiresAuth: true,
    states: [
      { name: 'default', description: 'Image management grid' },
      { name: 'loading', description: 'Loading images' },
      { name: 'upload-modal', description: 'Upload modal open' },
      { name: 'bulk-select', description: 'Bulk selection mode' },
    ],
    scrollable: true,
  },

  adminAnalytics: {
    path: '/admin/analytics',
    name: 'Admin: ML Analytics',
    requiresAuth: true,
    states: [
      { name: 'default', description: 'Analytics dashboard' },
      { name: 'loading', description: 'Loading analytics data' },
    ],
    scrollable: true,
  },
};

/**
 * Get all route paths as flat array
 */
export function getAllRoutePaths(): string[] {
  return Object.values(ROUTES).map((r) => r.path);
}

/**
 * Get routes requiring authentication
 */
export function getAuthRoutes(): RouteConfig[] {
  return Object.values(ROUTES).filter((r) => r.requiresAuth);
}

/**
 * Get public routes (no auth required)
 */
export function getPublicRoutes(): RouteConfig[] {
  return Object.values(ROUTES).filter((r) => !r.requiresAuth);
}

/**
 * Get scrollable routes (need scroll position testing)
 */
export function getScrollableRoutes(): RouteConfig[] {
  return Object.values(ROUTES).filter((r) => r.scrollable);
}

/**
 * Calculate total snapshot count
 */
export function calculateSnapshotCount(
  viewportCount: number = 3,
  scrollPositionCount: number = 3
): number {
  let total = 0;
  for (const route of Object.values(ROUTES)) {
    const stateCount = route.states.length;
    const scrollMultiplier = route.scrollable ? scrollPositionCount : 1;
    total += stateCount * viewportCount * scrollMultiplier;
  }
  return total;
}
