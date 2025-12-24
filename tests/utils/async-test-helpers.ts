/**
 * Async Test Utilities
 *
 * Helpers for handling async operations in tests
 */

import { waitFor, act } from '@testing-library/react';

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Wait for async operation with timeout
 */
export async function waitForAsync<T>(
  fn: () => Promise<T>,
  timeout = 5000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
    ),
  ]);
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Wait for element to be present
 */
export async function waitForElement(
  getElement: () => HTMLElement | null,
  timeout = 3000
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (true) {
    const element = getElement();
    if (element) return element;

    if (Date.now() - startTime > timeout) {
      throw new Error('Element not found within timeout');
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  getElement: () => HTMLElement | null,
  timeout = 3000
): Promise<void> {
  await waitFor(
    () => {
      expect(getElement()).not.toBeInTheDocument();
    },
    { timeout }
  );
}

/**
 * Retry async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Mock timer and advance time
 */
export async function advanceTimers(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await flushPromises();
  });
}

/**
 * Wait for loading state to finish
 */
export async function waitForLoadingToFinish(
  getLoadingIndicator: () => HTMLElement | null,
  timeout = 5000
): Promise<void> {
  await waitFor(
    () => {
      const loader = getLoadingIndicator();
      expect(loader).not.toBeInTheDocument();
    },
    { timeout }
  );
}

/**
 * Assert async function throws
 */
export async function assertAsyncThrows(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();

  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(error?.message).toContain(expectedError);
    } else {
      expect(error?.message).toMatch(expectedError);
    }
  }
}

/**
 * Assert async function does not throw
 */
export async function assertAsyncNoThrow(fn: () => Promise<any>): Promise<void> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeUndefined();
}

/**
 * Create a deferred promise for manual control
 */
export interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;

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

/**
 * Mock async function with controllable timing
 */
export function createControlledAsync<T>(initialValue?: T) {
  const deferred = createDeferredPromise<T>();

  return {
    promise: deferred.promise,
    resolve: (value: T = initialValue!) => deferred.resolve(value),
    reject: (error: Error) => deferred.reject(error),
  };
}
