/**
 * React Query Test Examples
 *
 * Demonstrates best practices for testing components using React Query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  renderWithQuery,
  createTestQueryClient,
  mockQuerySuccess,
  mockQueryError,
  assertQueryHasData,
  waitForQueryToSettle,
} from '../utils/react-query-helpers';
import { mockAxiosGet, mockAxiosPost, clearAxiosMocks } from '../utils/axios-mock-helpers';

// Example component using useQuery
function DataFetchComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['testData'],
    queryFn: async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  return <div>Data: {data?.value}</div>;
}

// Example component using useMutation
function MutationComponent() {
  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetch('/api/update', {
        method: 'POST',
        body: JSON.stringify({ value }),
      });
      return response.json();
    },
  });

  return (
    <div>
      <button
        onClick={() => mutation.mutate('test')}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
      {mutation.isSuccess && <div>Success!</div>}
      {mutation.isError && <div>Error: {(mutation.error as Error).message}</div>}
    </div>
  );
}

describe('React Query Testing Examples', () => {
  beforeEach(() => {
    clearAxiosMocks();
    global.fetch = vi.fn();
  });

  describe('Example 1: Testing useQuery with Mock Data', () => {
    it('should display data when query succeeds', async () => {
      const queryClient = createTestQueryClient();
      mockQuerySuccess(queryClient, ['testData'], { value: 'Hello World' });

      renderWithQuery(<DataFetchComponent />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('Data: Hello World')).toBeInTheDocument();
      });

      assertQueryHasData(queryClient, ['testData'], { value: 'Hello World' });
    });

    it('should display error when query fails', async () => {
      const queryClient = createTestQueryClient();
      const error = new Error('Network error');
      mockQueryError(queryClient, ['testData'], error);

      renderWithQuery(<DataFetchComponent />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Example 2: Testing useQuery with Fetch Mock', () => {
    it('should fetch and display data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 'Fetched Data' }),
      });

      renderWithQuery(<DataFetchComponent />);

      await waitFor(() => {
        expect(screen.getByText('Data: Fetched Data')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      renderWithQuery(<DataFetchComponent />);

      await waitFor(() => {
        expect(screen.getByText('Error: Fetch failed')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithQuery(<DataFetchComponent />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Example 3: Testing useMutation', () => {
    it('should execute mutation on button click', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithQuery(<MutationComponent />);

      const button = screen.getByText('Save');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
      });
    });

    it('should show loading state during mutation', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithQuery(<MutationComponent />);

      const button = screen.getByText('Save');
      await user.click(button);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should display error when mutation fails', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockRejectedValueOnce(new Error('Save failed'));

      renderWithQuery(<MutationComponent />);

      const button = screen.getByText('Save');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Error: Save failed')).toBeInTheDocument();
      });
    });
  });

  describe('Example 4: Testing Query Invalidation', () => {
    it('should refetch when query is invalidated', async () => {
      const queryClient = createTestQueryClient();
      let callCount = 0;

      (global.fetch as any).mockImplementation(async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({ value: `Call ${callCount}` }),
        };
      });

      renderWithQuery(<DataFetchComponent />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('Data: Call 1')).toBeInTheDocument();
      });

      // Invalidate query
      await queryClient.invalidateQueries({ queryKey: ['testData'] });

      await waitFor(() => {
        expect(screen.getByText('Data: Call 2')).toBeInTheDocument();
      });
    });
  });

  describe('Example 5: Testing with Axios Mocks', () => {
    it('should work with axios mock helpers', async () => {
      mockAxiosGet('/api/data', { value: 'Axios Data' });

      // Component would use axios instead of fetch
      renderWithQuery(<DataFetchComponent />);

      // This example shows how to use axios mocks
      // In real implementation, component would use axios
    });
  });
});
