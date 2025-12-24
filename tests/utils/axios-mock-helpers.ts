/**
 * Axios Mock Test Utilities
 *
 * Helpers for mocking axios requests in tests
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Create a mock AxiosResponse
 */
export function createMockAxiosResponse<T = any>(
  data: T,
  config: Partial<AxiosResponse> = {}
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosRequestConfig,
    ...config,
  };
}

/**
 * Create a mock AxiosError
 */
export function createMockAxiosError(
  message: string,
  status: number = 500,
  code?: string
): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.name = 'AxiosError';
  error.code = code || 'ERR_NETWORK';
  error.response = {
    data: { message },
    status,
    statusText: 'Error',
    headers: {},
    config: {} as AxiosRequestConfig,
  };
  error.config = {} as AxiosRequestConfig;
  error.toJSON = () => ({});
  return error;
}

/**
 * Setup axios mock for successful GET request
 */
export function mockAxiosGet<T>(url: string | RegExp, data: T, delay = 0) {
  const spy = jest.spyOn(axios, 'get');

  spy.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl.includes(url) : url.test(requestUrl)) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createMockAxiosResponse(data));
        }, delay);
      });
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });

  return spy;
}

/**
 * Setup axios mock for successful POST request
 */
export function mockAxiosPost<T>(url: string | RegExp, responseData: T, delay = 0) {
  const spy = jest.spyOn(axios, 'post');

  spy.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl.includes(url) : url.test(requestUrl)) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createMockAxiosResponse(responseData));
        }, delay);
      });
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });

  return spy;
}

/**
 * Setup axios mock for failed request
 */
export function mockAxiosError(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string | RegExp,
  error: AxiosError | string,
  delay = 0
) {
  const spy = jest.spyOn(axios, method);

  spy.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl.includes(url) : url.test(requestUrl)) {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(typeof error === 'string' ? createMockAxiosError(error) : error);
        }, delay);
      });
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });

  return spy;
}

/**
 * Setup axios mock for network timeout
 */
export function mockAxiosTimeout(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string | RegExp
) {
  const error = createMockAxiosError('Network timeout', 0, 'ECONNABORTED');
  return mockAxiosError(method, url, error);
}

/**
 * Setup axios mock for 401 unauthorized
 */
export function mockAxiosUnauthorized(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string | RegExp
) {
  const error = createMockAxiosError('Unauthorized', 401, 'ERR_BAD_REQUEST');
  return mockAxiosError(method, url, error);
}

/**
 * Setup axios mock for 404 not found
 */
export function mockAxiosNotFound(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string | RegExp
) {
  const error = createMockAxiosError('Not found', 404, 'ERR_BAD_REQUEST');
  return mockAxiosError(method, url, error);
}

/**
 * Clear all axios mocks
 */
export function clearAxiosMocks() {
  jest.restoreAllMocks();
}

/**
 * Assert axios was called with specific config
 */
export function assertAxiosCalledWith(
  spy: jest.SpyInstance,
  url: string,
  config?: Partial<AxiosRequestConfig>
) {
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining(url),
    expect.objectContaining(config || {})
  );
}

/**
 * Assert axios was called n times
 */
export function assertAxiosCallCount(spy: jest.SpyInstance, count: number) {
  expect(spy).toHaveBeenCalledTimes(count);
}

/**
 * Mock sequence of responses (useful for retry logic)
 */
export function mockAxiosSequence<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string | RegExp,
  responses: Array<{ data?: T; error?: AxiosError | string }>
) {
  const spy = jest.spyOn(axios, method);
  let callCount = 0;

  spy.mockImplementation((requestUrl: string) => {
    if (typeof url === 'string' ? requestUrl.includes(url) : url.test(requestUrl)) {
      const response = responses[Math.min(callCount, responses.length - 1)];
      callCount++;

      if (response.error) {
        return Promise.reject(
          typeof response.error === 'string'
            ? createMockAxiosError(response.error)
            : response.error
        );
      }
      return Promise.resolve(createMockAxiosResponse(response.data));
    }
    return Promise.reject(createMockAxiosError('Not mocked', 404));
  });

  return spy;
}
