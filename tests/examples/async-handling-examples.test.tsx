/**
 * Async Handling Test Examples
 *
 * Demonstrates best practices for testing async operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithQuery } from '../utils/react-query-helpers';
import {
  waitForCondition,
  waitForAsync,
  flushPromises,
  waitForLoadingToFinish,
  assertAsyncThrows,
  assertAsyncNoThrow,
  createDeferredPromise,
  createControlledAsync,
  retryAsync,
  advanceTimers,
} from '../utils/async-test-helpers';
import { useState } from 'react';

// Example async component
function AsyncComponent() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setData('Loaded Data');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={loadData} disabled={loading}>
        Load
      </button>
      {loading && <div data-testid="loader">Loading...</div>}
      {data && <div data-testid="data">{data}</div>}
      {error && <div data-testid="error">Error: {error}</div>}
    </div>
  );
}

describe('Async Handling Testing Examples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Example 1: Basic Async Waiting', () => {
    it('should wait for data to load', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AsyncComponent />);

      const button = screen.getByText('Load');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toBeInTheDocument();
      });

      expect(screen.getByTestId('data')).toHaveTextContent('Loaded Data');
    });

    it('should wait for loading to finish', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AsyncComponent />);

      const button = screen.getByText('Load');
      await user.click(button);

      await waitForLoadingToFinish(
        () => screen.queryByTestId('loader') as HTMLElement | null
      );

      expect(screen.getByTestId('data')).toBeInTheDocument();
    });
  });

  describe('Example 2: Waiting for Conditions', () => {
    it('should wait for custom condition', async () => {
      let counter = 0;
      const increment = setInterval(() => counter++, 10);

      await waitForCondition(() => counter >= 5);

      clearInterval(increment);
      expect(counter).toBeGreaterThanOrEqual(5);
    });

    it('should timeout if condition not met', async () => {
      await assertAsyncThrows(
        () => waitForCondition(() => false, { timeout: 100 }),
        'Timeout waiting for condition'
      );
    });
  });

  describe('Example 3: Promise Utilities', () => {
    it('should flush all pending promises', async () => {
      let resolved = false;
      Promise.resolve().then(() => { resolved = true; });

      await flushPromises();

      expect(resolved).toBe(true);
    });

    it('should handle promise timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

      await assertAsyncThrows(
        () => waitForAsync(() => slowPromise, 100),
        'Operation timeout'
      );
    });

    it('should succeed within timeout', async () => {
      const fastPromise = Promise.resolve('success');

      const result = await waitForAsync(() => fastPromise, 1000);

      expect(result).toBe('success');
    });
  });

  describe('Example 4: Deferred Promises', () => {
    it('should control promise resolution manually', async () => {
      const deferred = createDeferredPromise<string>();
      let result: string | undefined;

      deferred.promise.then(value => { result = value; });

      expect(result).toBeUndefined();

      deferred.resolve('Manual resolution');
      await flushPromises();

      expect(result).toBe('Manual resolution');
    });

    it('should control promise rejection manually', async () => {
      const deferred = createDeferredPromise<string>();

      const promise = deferred.promise.catch(err => err.message);

      deferred.reject(new Error('Manual rejection'));
      const result = await promise;

      expect(result).toBe('Manual rejection');
    });
  });

  describe('Example 5: Controlled Async Operations', () => {
    it('should control async operation timing', async () => {
      const controlled = createControlledAsync<string>();
      let completed = false;

      controlled.promise.then(() => { completed = true; });

      await flushPromises();
      expect(completed).toBe(false);

      controlled.resolve('Done');
      await flushPromises();
      expect(completed).toBe(true);
    });
  });

  describe('Example 6: Retry Logic Testing', () => {
    it('should retry async operation', async () => {
      let attempts = 0;

      const result = await retryAsync(
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('Not yet');
          return 'Success';
        },
        { maxRetries: 3, initialDelay: 10 }
      );

      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;

      await assertAsyncThrows(
        () => retryAsync(
          async () => {
            attempts++;
            throw new Error('Always fails');
          },
          { maxRetries: 2, initialDelay: 10 }
        ),
        'Always fails'
      );

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Example 7: Timer Testing', () => {
    it('should advance timers in tests', async () => {
      vi.useFakeTimers();
      let executed = false;

      setTimeout(() => { executed = true; }, 1000);

      expect(executed).toBe(false);

      await advanceTimers(1000);

      expect(executed).toBe(true);

      vi.useRealTimers();
    });

    it('should test debounced functions', async () => {
      vi.useFakeTimers();
      let callCount = 0;

      const debounced = () => {
        setTimeout(() => callCount++, 300);
      };

      debounced();
      debounced();
      debounced();

      await advanceTimers(100);
      expect(callCount).toBe(0);

      await advanceTimers(200);
      expect(callCount).toBe(3);

      vi.useRealTimers();
    });
  });

  describe('Example 8: Error Assertions', () => {
    it('should assert async function throws', async () => {
      await assertAsyncThrows(
        () => Promise.reject(new Error('Expected error')),
        'Expected error'
      );
    });

    it('should assert async function does not throw', async () => {
      await assertAsyncNoThrow(
        () => Promise.resolve('success')
      );
    });

    it('should match error with regex', async () => {
      await assertAsyncThrows(
        () => Promise.reject(new Error('Error code: 123')),
        /Error code: \d+/
      );
    });
  });

  describe('Example 9: Sequential Async Operations', () => {
    it('should handle async operations in sequence', async () => {
      const results: number[] = [];

      const operation = async (delay: number, value: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        results.push(value);
      };

      await operation(50, 1);
      await operation(30, 2);
      await operation(20, 3);

      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('Example 10: Parallel Async Operations', () => {
    it('should handle async operations in parallel', async () => {
      const results: number[] = [];

      const operation = async (delay: number, value: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        results.push(value);
        return value;
      };

      const promises = [
        operation(50, 1),
        operation(30, 2),
        operation(20, 3),
      ];

      await Promise.all(promises);

      // Results order depends on completion time
      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(results).toContain(3);
      expect(results.length).toBe(3);
    });
  });
});
