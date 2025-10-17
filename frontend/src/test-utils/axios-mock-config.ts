/**
 * Axios Mock Configuration Utilities
 *
 * Standardized utilities for mocking Axios requests in tests.
 * Provides consistent mock setup and helper functions.
 *
 * @module test-utils/axios-mock-config
 */

import { vi } from 'vitest';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Creates a mock Axios instance with all HTTP methods
 *
 * @returns Mock Axios instance with spied methods
 *
 * @example
 * ```typescript
 * const axiosInstance = createMockAxiosInstance();
 * axiosInstance.get.mockResolvedValue({ data: { id: 1 } });
 * ```
 */
export function createMockAxiosInstance(): MockAxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    request: vi.fn(),
    getUri: vi.fn(),
    defaults: {
      headers: {
        common: {},
        delete: {},
        get: {},
        head: {},
        post: {},
        put: {},
        patch: {},
      },
    } as any,
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
        clear: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
        clear: vi.fn(),
      },
    },
  } as MockAxiosInstance;
}

/**
 * Mock Axios instance type with all methods as vi.Mock
 */
export type MockAxiosInstance = {
  [K in keyof AxiosInstance]: AxiosInstance[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn>
    : AxiosInstance[K];
};

/**
 * Creates a successful Axios response object
 *
 * @param data - Response data
 * @param config - Optional request config
 * @returns Mock AxiosResponse
 *
 * @example
 * ```typescript
 * const response = createMockAxiosResponse({ id: 1, name: 'Test' });
 * axiosInstance.get.mockResolvedValue(response);
 * ```
 */
export function createMockAxiosResponse<T = any>(
  data: T,
  config?: Partial<AxiosRequestConfig>
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: {} as any,
      ...config,
    },
  };
}

/**
 * Creates an Axios error response object
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param data - Optional error response data
 * @returns Mock Axios error
 *
 * @example
 * ```typescript
 * const error = createMockAxiosError('Not found', 404);
 * axiosInstance.get.mockRejectedValue(error);
 * ```
 */
export function createMockAxiosError(
  message: string,
  status: number = 500,
  data?: any
): any {
  const error: any = new Error(message);
  error.response = {
    data: data || { message },
    status,
    statusText: getStatusText(status),
    headers: {},
    config: { headers: {} as any },
  };
  error.isAxiosError = true;
  error.config = { headers: {} as any };
  return error;
}

/**
 * Gets HTTP status text for a status code
 *
 * @param status - HTTP status code
 * @returns Status text
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[status] || 'Unknown';
}

/**
 * Mocks a successful GET request
 *
 * @param axiosInstance - Mock Axios instance
 * @param url - Request URL (or regex pattern)
 * @param data - Response data
 *
 * @example
 * ```typescript
 * mockAxiosGet(axiosInstance, '/api/birds', [{ id: 1, name: 'Sparrow' }]);
 * ```
 */
export function mockAxiosGet<T = any>(
  axiosInstance: MockAxiosInstance,
  url: string | RegExp,
  data: T
): void {
  axiosInstance.get.mockImplementation((requestUrl: string) => {
    const matches =
      typeof url === 'string' ? requestUrl === url : url.test(requestUrl);

    if (matches) {
      return Promise.resolve(createMockAxiosResponse(data));
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });
}

/**
 * Mocks a successful POST request
 *
 * @param axiosInstance - Mock Axios instance
 * @param url - Request URL (or regex pattern)
 * @param responseData - Response data
 *
 * @example
 * ```typescript
 * mockAxiosPost(axiosInstance, '/api/birds', { id: 1, name: 'Sparrow' });
 * ```
 */
export function mockAxiosPost<T = any>(
  axiosInstance: MockAxiosInstance,
  url: string | RegExp,
  responseData: T
): void {
  axiosInstance.post.mockImplementation((requestUrl: string) => {
    const matches =
      typeof url === 'string' ? requestUrl === url : url.test(requestUrl);

    if (matches) {
      return Promise.resolve(createMockAxiosResponse(responseData, { status: 201 }));
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });
}

/**
 * Mocks a failed request with an error
 *
 * @param axiosInstance - Mock Axios instance
 * @param method - HTTP method
 * @param url - Request URL (or regex pattern)
 * @param error - Error to throw
 *
 * @example
 * ```typescript
 * mockAxiosError(axiosInstance, 'get', '/api/birds',
 *   createMockAxiosError('Server error', 500)
 * );
 * ```
 */
export function mockAxiosError(
  axiosInstance: MockAxiosInstance,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string | RegExp,
  error: any
): void {
  axiosInstance[method].mockImplementation((requestUrl: string) => {
    const matches =
      typeof url === 'string' ? requestUrl === url : url.test(requestUrl);

    if (matches) {
      return Promise.reject(error);
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });
}

/**
 * Mocks a delayed response (simulates network latency)
 *
 * @param axiosInstance - Mock Axios instance
 * @param method - HTTP method
 * @param url - Request URL
 * @param data - Response data
 * @param delay - Delay in milliseconds
 *
 * @example
 * ```typescript
 * mockAxiosDelayedResponse(axiosInstance, 'get', '/api/birds',
 *   [{ id: 1 }], 1000
 * );
 * ```
 */
export function mockAxiosDelayedResponse<T = any>(
  axiosInstance: MockAxiosInstance,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data: T,
  delay: number
): void {
  axiosInstance[method].mockImplementation((requestUrl: string) => {
    if (requestUrl === url) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createMockAxiosResponse(data));
        }, delay);
      });
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });
}

/**
 * Resets all mocks on an Axios instance
 *
 * @param axiosInstance - Mock Axios instance
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetAxiosMocks(axiosInstance);
 * });
 * ```
 */
export function resetAxiosMocks(axiosInstance: MockAxiosInstance): void {
  axiosInstance.get.mockReset();
  axiosInstance.post.mockReset();
  axiosInstance.put.mockReset();
  axiosInstance.patch.mockReset();
  axiosInstance.delete.mockReset();
  axiosInstance.head.mockReset();
  axiosInstance.options.mockReset();
  axiosInstance.request.mockReset();
}

/**
 * Verifies that a specific request was made
 *
 * @param axiosInstance - Mock Axios instance
 * @param method - HTTP method
 * @param url - Expected URL
 * @param data - Expected request data (for POST/PUT/PATCH)
 *
 * @example
 * ```typescript
 * verifyAxiosRequest(axiosInstance, 'post', '/api/birds', { name: 'Sparrow' });
 * ```
 */
export function verifyAxiosRequest(
  axiosInstance: MockAxiosInstance,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: any
): void {
  const methodMock = axiosInstance[method];

  if (data !== undefined && (method === 'post' || method === 'put' || method === 'patch')) {
    expect(methodMock).toHaveBeenCalledWith(url, data, expect.anything());
  } else {
    expect(methodMock).toHaveBeenCalledWith(url, expect.anything());
  }
}

/**
 * Gets the number of calls made to a specific method
 *
 * @param axiosInstance - Mock Axios instance
 * @param method - HTTP method
 * @returns Number of calls
 *
 * @example
 * ```typescript
 * const callCount = getAxiosCallCount(axiosInstance, 'get');
 * expect(callCount).toBe(2);
 * ```
 */
export function getAxiosCallCount(
  axiosInstance: MockAxiosInstance,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
): number {
  return axiosInstance[method].mock.calls.length;
}
