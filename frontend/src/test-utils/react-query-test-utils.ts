/**
 * React Query Testing Utilities
 *
 * Provides utilities for testing React Query hooks and components.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * Default configuration for test QueryClient
 */
export const defaultTestQueryClientConfig = {
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
 * Create a QueryClient configured for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient(defaultTestQueryClientConfig);
}

/**
 * Create a wrapper component with QueryClientProvider
 */
export function createQueryClientWrapper(queryClient: QueryClient): React.FC<{ children: React.ReactNode }> {
  return function QueryClientWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/**
 * Wrap a component with QueryClient for testing
 */
export function wrapWithQueryClient(
  ui: React.ReactElement,
  queryClient: QueryClient = createTestQueryClient()
): { ui: React.ReactElement; queryClient: QueryClient } {
  return {
    ui: React.createElement(QueryClientProvider, { client: queryClient }, ui),
    queryClient,
  };
}

/**
 * Clear all queries from the QueryClient
 */
export function clearQueryClient(queryClient: QueryClient): void {
  queryClient.clear();
}

/**
 * Set data for a specific query key
 */
export function setQueryData<T>(queryClient: QueryClient, queryKey: readonly unknown[], data: T): void {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Get data for a specific query key
 */
export function getQueryData<T>(queryClient: QueryClient, queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Invalidate queries matching the query key
 */
export async function invalidateQueries(queryClient: QueryClient, queryKey: readonly unknown[]): Promise<void> {
  await queryClient.invalidateQueries({ queryKey });
}

/**
 * Wait for a query to settle (no longer fetching)
 */
export async function waitForQueryToSettle(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const state = queryClient.getQueryState(queryKey);
    if (state && !state.fetchStatus || state?.fetchStatus === 'idle') {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Query ${JSON.stringify(queryKey)} did not settle within ${timeout}ms`);
}

/**
 * Get the current status of a query
 */
export function getQueryStatus(queryClient: QueryClient, queryKey: readonly unknown[]): string | undefined {
  return queryClient.getQueryState(queryKey)?.status;
}

/**
 * Check if a query is currently loading
 */
export function isQueryLoading(queryClient: QueryClient, queryKey: readonly unknown[]): boolean {
  const state = queryClient.getQueryState(queryKey);
  return state?.fetchStatus === 'fetching';
}

/**
 * Check if a query has an error
 */
export function isQueryError(queryClient: QueryClient, queryKey: readonly unknown[]): boolean {
  return queryClient.getQueryState(queryKey)?.status === 'error';
}

/**
 * Get the error from a query
 */
export function getQueryError(queryClient: QueryClient, queryKey: readonly unknown[]): Error | null {
  return queryClient.getQueryState(queryKey)?.error as Error | null;
}
