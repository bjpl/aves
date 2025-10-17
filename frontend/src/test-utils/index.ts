/**
 * Test Utilities - Unified Exports
 *
 * Central export point for all testing utilities.
 * Provides standardized helpers for React Query, Axios mocking, and async testing.
 *
 * @module test-utils
 */

// React Query utilities
export {
  createTestQueryClient,
  createQueryClientWrapper,
  wrapWithQueryClient,
  clearQueryClient,
  setQueryData,
  getQueryData,
  invalidateQueries,
  waitForQueryToSettle,
  getQueryStatus,
  isQueryLoading,
  isQueryError,
  getQueryError,
  defaultTestQueryClientConfig,
} from './react-query-test-utils';

export type { MockAxiosInstance } from './axios-mock-config';

// Axios mock utilities
export {
  createMockAxiosInstance,
  createMockAxiosResponse,
  createMockAxiosError,
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosError,
  mockAxiosDelayedResponse,
  resetAxiosMocks,
  verifyAxiosRequest,
  getAxiosCallCount,
} from './axios-mock-config';

// Async test helpers
export {
  waitForCondition,
  waitForValue,
  delay,
  retryAsync,
  waitForAllSettled,
  withTimeout,
  waitFor,
  flushPromises,
  nextTick,
  actAndWait,
  poll,
  createDeferred,
  DEFAULT_TIMEOUT,
  DEFAULT_INTERVAL,
} from './async-test-helpers';

export type { WaitForOptions } from './async-test-helpers';

/**
 * Common test setup patterns
 */

/**
 * Complete test environment setup
 *
 * @example
 * ```typescript
 * import { setupTestEnvironment } from '@/test-utils';
 *
 * describe('MyComponent', () => {
 *   const env = setupTestEnvironment();
 *
 *   it('should fetch data', async () => {
 *     env.axios.get.mockResolvedValue({ data: { id: 1 } });
 *     // test code
 *   });
 * });
 * ```
 */
export function setupTestEnvironment() {
  const queryClient = createTestQueryClient();
  const axios = createMockAxiosInstance();
  const wrapper = createQueryClientWrapper(queryClient);

  return {
    queryClient,
    axios,
    wrapper,
    cleanup: () => {
      clearQueryClient(queryClient);
      resetAxiosMocks(axios);
    },
  };
}

/**
 * Re-export commonly used testing library utilities
 */
export { render, screen, within, renderHook } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
export type { RenderOptions, RenderResult } from '@testing-library/react';
