/**
 * React Query Test Utilities
 *
 * Comprehensive helpers for testing components that use React Query
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tantml:parameter>@tanstack/react-query';

/**
 * Create a test QueryClient with sensible defaults
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // Disable retries in tests
        gcTime: 0,          // Disable garbage collection timer
        staleTime: 0,       // Always consider data stale
      },
      mutations: {
        retry: false,        // Disable mutation retries
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},     // Suppress error logs in tests
    },
  });
}

/**
 * Wrapper component that provides QueryClient
 */
interface QueryWrapperProps {
  children: ReactNode;
  client?: QueryClient;
}

export function QueryWrapper({ children, client }: QueryWrapperProps) {
  const queryClient = client || createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render that includes QueryClientProvider
 */
export function renderWithQuery(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) {
  const { queryClient, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryWrapper client={queryClient}>{children}</QueryWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Wait for query to settle (either success or error)
 */
export async function waitForQueryToSettle(queryClient: QueryClient, queryKey: unknown[]) {
  await new Promise<void>((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.query.queryKey === queryKey &&
        (event?.query.state.status === 'success' || event?.query.state.status === 'error')
      ) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Set query data in cache
 */
export function setQueryData<TData>(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: TData
) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Clear all queries from cache
 */
export function clearAllQueries(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Mock successful query response
 */
export function mockQuerySuccess<TData>(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: TData
) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Mock query error
 */
export function mockQueryError(
  queryClient: QueryClient,
  queryKey: unknown[],
  error: Error
) {
  queryClient.setQueryState(queryKey, {
    status: 'error',
    error,
    data: undefined,
    dataUpdatedAt: 0,
    errorUpdatedAt: Date.now(),
    fetchFailureCount: 1,
    fetchFailureReason: error,
    fetchMeta: null,
    isInvalidated: false,
  });
}

/**
 * Assert query is in loading state
 */
export function assertQueryLoading(queryClient: QueryClient, queryKey: unknown[]) {
  const query = queryClient.getQueryState(queryKey);
  expect(query?.status).toBe('pending');
}

/**
 * Assert query has data
 */
export function assertQueryHasData<TData>(
  queryClient: QueryClient,
  queryKey: unknown[],
  expectedData?: TData
) {
  const query = queryClient.getQueryState(queryKey);
  expect(query?.status).toBe('success');
  if (expectedData !== undefined) {
    expect(query?.data).toEqual(expectedData);
  }
}

/**
 * Assert query has error
 */
export function assertQueryHasError(
  queryClient: QueryClient,
  queryKey: unknown[],
  expectedError?: string
) {
  const query = queryClient.getQueryState(queryKey);
  expect(query?.status).toBe('error');
  if (expectedError !== undefined) {
    expect(query?.error).toMatchObject({ message: expectedError });
  }
}
