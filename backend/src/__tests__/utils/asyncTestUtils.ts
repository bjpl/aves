/**
 * Async Test Utilities
 * Helper functions for handling async operations, timers, and worker processes in tests
 */

/**
 * Wait for a condition to be true with timeout
 * Useful for waiting on async operations without hanging tests
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  checkIntervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return true;
    }
    await delay(checkIntervalMs);
  }

  return false;
}

/**
 * Wait for async operation with timeout
 * Throws error if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Delay utility - useful for waiting between async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Flush all pending promises and timers
 * Use this when you need to ensure all async operations complete
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

/**
 * Clean up all active timers and intervals
 * Useful in afterEach/afterAll hooks
 */
export function cleanupTimers(): void {
  // Clear all Jest timers if using fake timers
  if (typeof jest !== 'undefined' && jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
  }
}

/**
 * Setup test environment for async operations
 * Call in beforeAll/beforeEach
 */
export function setupAsyncTests(config?: {
  defaultTimeout?: number;
  useFakeTimers?: boolean;
}): void {
  const { defaultTimeout = 10000, useFakeTimers = false } = config || {};

  // Set Jest timeout
  if (typeof jest !== 'undefined') {
    jest.setTimeout(defaultTimeout);

    if (useFakeTimers) {
      jest.useFakeTimers();
    }
  }
}

/**
 * Cleanup test environment after async operations
 * Call in afterAll/afterEach
 */
export async function cleanupAsyncTests(): Promise<void> {
  cleanupTimers();
  await flushPromises();

  // Small delay to ensure cleanup completes
  await delay(100);
}

/**
 * Create a deferred promise that can be resolved/rejected externally
 * Useful for controlling async flow in tests
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Track and cleanup all timeouts/intervals created during test
 */
export class TimerTracker {
  private timers: Set<NodeJS.Timeout> = new Set();

  setTimeout(callback: () => void, ms: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  setInterval(callback: () => void, ms: number): NodeJS.Timeout {
    const timer = setInterval(callback, ms);
    this.timers.add(timer);
    return timer;
  }

  clearTimer(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    clearInterval(timer);
    this.timers.delete(timer);
  }

  clearAll(): void {
    this.timers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();
  }

  getActiveCount(): number {
    return this.timers.size;
  }
}
