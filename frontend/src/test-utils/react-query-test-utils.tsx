/**
 * React Query Testing Utilities
 *
 * Standardized utilities for testing React Query hooks and components.
 * Provides consistent QueryClient configuration and wrapper functions.
 *
 * @module test-utils/react-query-test-utils
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { QueryClientConfig } from '@tanstack/react-query';
import { ReactElement } from 'react';

/**
 * Default QueryClient configuration for testing
 * Disables retries and caching to speed up tests
 */
export const defaultTestQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
};

/**
 * Creates a new QueryClient configured for testing
 *
 * @param config - Optional configuration to merge with defaults
 * @returns Configured QueryClient instance
 *
 * @example
 * ```typescript
 * const queryClient = createTestQueryClient();
 *
 * // With custom config
 * const queryClient = createTestQueryClient({
 *   defaultOptions: {
 *     queries: { retry: 1 }
 *   }
 * });
 * ```
 */
export function createTestQueryClient(config?: Partial<QueryClientConfig>): QueryClient {
  return new QueryClient({
    ...defaultTestQueryClientConfig,
    ...config,
    defaultOptions: {
      ...defaultTestQueryClientConfig.defaultOptions,
      ...config?.defaultOptions,
      queries: {
        ...defaultTestQueryClientConfig.defaultOptions?.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...defaultTestQueryClientConfig.defaultOptions?.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

/**
 * Creates a QueryClientProvider wrapper for testing
 *
 * @param queryClient - Optional QueryClient instance (creates new one if not provided)
 * @returns QueryClientProvider wrapper component
 *
 * @example
 * ```typescript
 * const wrapper = createQueryClientWrapper();
 *
 * renderHook(() => useMyQuery(), { wrapper });
 * ```
 */
export function createQueryClientWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return function QueryClientWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * Wraps a component with QueryClientProvider for testing
 *
 * @param component - Component to wrap
 * @param queryClient - Optional QueryClient instance
 * @returns Wrapped component
 *
 * @example
 * ```typescript
 * const WrappedComponent = wrapWithQueryClient(<MyComponent />);
 * render(WrappedComponent);
 * ```
 */
export function wrapWithQueryClient(
  component: ReactElement,
  queryClient?: QueryClient
): ReactElement {
  const client = queryClient || createTestQueryClient();

  return <QueryClientProvider client={client}>{component}</QueryClientProvider>;
}

/**
 * Clears all queries and mutations from a QueryClient
 * Useful for cleanup between tests
 *
 * @param queryClient - QueryClient to clear
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   clearQueryClient(queryClient);
 * });
 * ```
 */
export function clearQueryClient(queryClient: QueryClient): void {
  queryClient.clear();
}

/**
 * Sets query data for a specific query key
 * Useful for mocking query results
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to set data for
 * @param data - Data to set
 *
 * @example
 * ```typescript
 * setQueryData(queryClient, ['birds', 'sparrow'], { id: 1, name: 'Sparrow' });
 * ```
 */
export function setQueryData<TData = unknown>(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: TData
): void {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Gets query data for a specific query key
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to get data for
 * @returns Query data or undefined
 *
 * @example
 * ```typescript
 * const data = getQueryData(queryClient, ['birds', 'sparrow']);
 * ```
 */
export function getQueryData<TData = unknown>(
  queryClient: QueryClient,
  queryKey: unknown[]
): TData | undefined {
  return queryClient.getQueryData<TData>(queryKey);
}

/**
 * Invalidates queries matching a query key
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to invalidate
 *
 * @example
 * ```typescript
 * await invalidateQueries(queryClient, ['birds']);
 * ```
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  queryKey: unknown[]
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey });
}

/**
 * Waits for a query to be settled (success or error)
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to wait for
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @returns Promise that resolves when query is settled
 *
 * @example
 * ```typescript
 * await waitForQueryToSettle(queryClient, ['birds', 'sparrow']);
 * ```
 */
export async function waitForQueryToSettle(
  queryClient: QueryClient,
  queryKey: unknown[],
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkQuery = () => {
      const query = queryClient.getQueryState(queryKey);

      if (!query) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Query ${JSON.stringify(queryKey)} not found after ${timeout}ms`));
          return;
        }
        setTimeout(checkQuery, 50);
        return;
      }

      if (query.status === 'success' || query.status === 'error') {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(
          new Error(
            `Query ${JSON.stringify(queryKey)} did not settle after ${timeout}ms (status: ${query.status})`
          )
        );
        return;
      }

      setTimeout(checkQuery, 50);
    };

    checkQuery();
  });
}

/**
 * Gets the current status of a query
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to check
 * @returns Query status or undefined if not found
 *
 * @example
 * ```typescript
 * const status = getQueryStatus(queryClient, ['birds', 'sparrow']);
 * expect(status).toBe('success');
 * ```
 */
export function getQueryStatus(
  queryClient: QueryClient,
  queryKey: unknown[]
): 'pending' | 'error' | 'success' | undefined {
  return queryClient.getQueryState(queryKey)?.status;
}

/**
 * Checks if a query is currently loading
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to check
 * @returns True if query is loading
 *
 * @example
 * ```typescript
 * expect(isQueryLoading(queryClient, ['birds'])).toBe(true);
 * ```
 */
export function isQueryLoading(queryClient: QueryClient, queryKey: unknown[]): boolean {
  return queryClient.getQueryState(queryKey)?.status === 'pending';
}

/**
 * Checks if a query has errored
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to check
 * @returns True if query has errored
 *
 * @example
 * ```typescript
 * expect(isQueryError(queryClient, ['birds'])).toBe(true);
 * ```
 */
export function isQueryError(queryClient: QueryClient, queryKey: unknown[]): boolean {
  return queryClient.getQueryState(queryKey)?.status === 'error';
}

/**
 * Gets the error from a query if it exists
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to check
 * @returns Query error or null
 *
 * @example
 * ```typescript
 * const error = getQueryError(queryClient, ['birds']);
 * expect(error).toBeInstanceOf(Error);
 * ```
 */
export function getQueryError(queryClient: QueryClient, queryKey: unknown[]): Error | null {
  return queryClient.getQueryState(queryKey)?.error as Error | null;
}
