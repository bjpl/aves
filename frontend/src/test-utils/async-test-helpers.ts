/**
 * Async Testing Helpers
 *
 * Utilities for testing asynchronous code with timeouts and retries.
 * Provides consistent patterns for waiting on async operations.
 *
 * @module test-utils/async-test-helpers
 */

import { waitFor as rtlWaitFor } from '@testing-library/react';

/**
 * Default timeout for async operations (5 seconds)
 */
export const DEFAULT_TIMEOUT = 5000;

/**
 * Default interval for polling checks (50ms)
 */
export const DEFAULT_INTERVAL = 50;

/**
 * Options for waitForCondition
 */
export interface WaitForOptions {
  /**
   * Maximum time to wait in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Interval between condition checks in milliseconds
   * @default 50
   */
  interval?: number;

  /**
   * Error message if timeout occurs
   */
  errorMessage?: string;
}

/**
 * Waits for a condition to become truthy
 *
 * @param condition - Function that returns a boolean or Promise<boolean>
 * @param options - Wait options
 * @returns Promise that resolves when condition is truthy
 *
 * @example
 * ```typescript
 * await waitForCondition(() => element !== null, {
 *   timeout: 3000,
 *   errorMessage: 'Element was not found'
 * });
 * ```
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {}
): Promise<void> {
  const {
    timeout = DEFAULT_TIMEOUT,
    interval = DEFAULT_INTERVAL,
    errorMessage = 'Condition was not met within timeout',
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCondition = async () => {
      try {
        const result = await Promise.resolve(condition());

        if (result) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(errorMessage));
          return;
        }

        setTimeout(checkCondition, interval);
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
          return;
        }
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}

/**
 * Waits for a value to be defined (not null or undefined)
 *
 * @param getValue - Function that returns the value to check
 * @param options - Wait options
 * @returns Promise that resolves with the value
 *
 * @example
 * ```typescript
 * const user = await waitForValue(() => getUserFromState(), {
 *   timeout: 3000
 * });
 * ```
 */
export async function waitForValue<T>(
  getValue: () => T | null | undefined,
  options: WaitForOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    interval = DEFAULT_INTERVAL,
    errorMessage = 'Value was not defined within timeout',
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkValue = () => {
      const value = getValue();

      if (value !== null && value !== undefined) {
        resolve(value);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(errorMessage));
        return;
      }

      setTimeout(checkValue, interval);
    };

    checkValue();
  });
}

/**
 * Delays execution for a specified time
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function until it succeeds or max retries reached
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param delayMs - Delay between retries in milliseconds
 * @returns Promise that resolves with function result
 *
 * @example
 * ```typescript
 * const data = await retryAsync(() => fetchData(), 3, 1000);
 * ```
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Waits for all promises to settle (resolve or reject)
 * Similar to Promise.allSettled but with typed results
 *
 * @param promises - Array of promises to wait for
 * @returns Array of settled results
 *
 * @example
 * ```typescript
 * const results = await waitForAllSettled([
 *   promise1,
 *   promise2,
 *   promise3
 * ]);
 * ```
 */
export async function waitForAllSettled<T>(
  promises: Promise<T>[]
): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
  const results = await Promise.allSettled(promises);

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return { status: 'fulfilled', value: result.value };
    }
    return { status: 'rejected', reason: result.reason };
  });
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message if timeout occurs
 * @returns Promise that rejects on timeout
 *
 * @example
 * ```typescript
 * const data = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Request timed out'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Waits for an element to appear in the DOM
 * Re-exports React Testing Library's waitFor with better typing
 *
 * @param callback - Callback to execute
 * @param options - Wait options
 * @returns Promise that resolves when callback succeeds
 *
 * @example
 * ```typescript
 * await waitFor(() => {
 *   expect(screen.getByText('Success')).toBeInTheDocument();
 * });
 * ```
 */
export const waitFor = rtlWaitFor;

/**
 * Flushes all pending promises in the microtask queue
 * Useful for testing hooks and effects
 *
 * @example
 * ```typescript
 * await flushPromises();
 * expect(mockCallback).toHaveBeenCalled();
 * ```
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Waits for the next tick
 *
 * @example
 * ```typescript
 * await nextTick();
 * ```
 */
export async function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(resolve);
  });
}

/**
 * Executes a callback and waits for state updates
 *
 * @param callback - Callback to execute
 * @returns Promise that resolves after state updates
 *
 * @example
 * ```typescript
 * await actAndWait(() => {
 *   fireEvent.click(button);
 * });
 * ```
 */
export async function actAndWait(callback: () => void | Promise<void>): Promise<void> {
  await callback();
  await flushPromises();
}

/**
 * Polls a function until it returns a truthy value or timeout
 *
 * @param fn - Function to poll
 * @param options - Poll options
 * @returns Promise that resolves with the truthy value
 *
 * @example
 * ```typescript
 * const element = await poll(() => document.querySelector('.dynamic'), {
 *   timeout: 3000,
 *   interval: 100
 * });
 * ```
 */
export async function poll<T>(
  fn: () => T | null | undefined,
  options: WaitForOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    interval = DEFAULT_INTERVAL,
    errorMessage = 'Polling timed out',
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkValue = () => {
      const value = fn();

      if (value) {
        resolve(value);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(errorMessage));
        return;
      }

      setTimeout(checkValue, interval);
    };

    checkValue();
  });
}

/**
 * Creates a deferred promise that can be resolved or rejected externally
 *
 * @returns Deferred promise with resolve and reject methods
 *
 * @example
 * ```typescript
 * const deferred = createDeferred<string>();
 * setTimeout(() => deferred.resolve('done'), 1000);
 * const result = await deferred.promise;
 * ```
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
