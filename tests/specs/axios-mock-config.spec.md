# Axios Mock Configuration - Architecture Specification

## Executive Summary

This specification defines a standardized Axios mocking system that eliminates inconsistent mock patterns across frontend and backend tests. Analysis reveals 39 frontend files and 18+ backend files with varying Axios mock implementations, leading to maintenance challenges and unreliable test behavior.

## Problem Analysis

### Current State

#### Frontend Setup (/frontend/src/test/setup.ts)
```typescript
// Global axios mock - complex interceptor structure
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };

  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance),
      get: vi.fn(),
      post: vi.fn(),
      // ... duplicated methods
    },
  };
});
```

#### Backend Setup (/backend/src/__tests__/setup.ts)
```typescript
// Minimal setup - tests handle mocking individually
process.env.NODE_ENV = 'test';
```

### Issues Identified

1. **Inconsistent Mock Patterns**
   - Frontend: Global axios mock in setup.ts
   - Backend: Per-test mocking (no standard pattern)
   - Tests: Mix of `vi.mock('axios')` and `vi.mocked(axios.method)`

2. **Type Safety Problems**
   - Frequent `as any` casts to satisfy TypeScript
   - Mock instance types don't match real axios
   - Interceptor mocks incomplete

3. **Maintainability Issues**
   - Complex setup duplicated across test files
   - No standardized response builders
   - Difficult to update mock behavior globally

4. **Testing Gaps**
   - No utilities for testing interceptors
   - No standard error mock patterns
   - No network delay simulation
   - No request verification helpers

## Architecture Design

### 1. Core Mock Configuration

```typescript
// Location: /tests/utils/axios-mocks.ts
// Purpose: Centralized axios mocking for both frontend and backend

import { vi } from 'vitest';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Type-safe mock axios instance
 * Matches real AxiosInstance interface
 */
export interface MockAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
  interceptors: {
    request: {
      use: ReturnType<typeof vi.fn>;
      eject: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
    response: {
      use: ReturnType<typeof vi.fn>;
      eject: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
  };
}

/**
 * Create type-safe mock axios instance
 * Eliminates need for 'as any' casts
 */
export const createMockAxiosInstance = (): MockAxiosInstance => {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
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
  };
};

/**
 * Mock axios module factory
 * Use in vi.mock() calls
 */
export const mockAxiosModule = () => {
  const mockInstance = createMockAxiosInstance();

  return {
    default: {
      create: vi.fn(() => mockInstance),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      isAxiosError: vi.fn((error: any) => {
        return error && (error.response !== undefined || error.isAxiosError === true);
      }),
    },
    isAxiosError: vi.fn((error: any) => {
      return error && (error.response !== undefined || error.isAxiosError === true);
    }),
    AxiosError: class MockAxiosError extends Error {
      response?: any;
      request?: any;
      config?: any;
      code?: string;
      isAxiosError = true;
    },
  };
};
```

### 2. Response Builders

```typescript
/**
 * Standardized response builders
 * Matches actual API response structure from apiAdapter
 */
export const mockAxiosResponse = {
  /**
   * Success response (200 OK)
   * Matches backend API wrapper: { data: { data: T } }
   */
  success: <T>(data: T, config?: Partial<AxiosResponse>): AxiosResponse<{ data: T }> => ({
    data: { data },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosRequestConfig,
    ...config,
  }),

  /**
   * Created response (201)
   */
  created: <T>(data: T): AxiosResponse<{ data: T }> => ({
    data: { data },
    status: 201,
    statusText: 'Created',
    headers: {},
    config: {} as AxiosRequestConfig,
  }),

  /**
   * No content response (204)
   */
  noContent: (): AxiosResponse => ({
    data: null,
    status: 204,
    statusText: 'No Content',
    headers: {},
    config: {} as AxiosRequestConfig,
  }),

  /**
   * Error response (4xx/5xx)
   * Matches axios error structure
   */
  error: (status: number, message: string, details?: any) => {
    const error: any = new Error(message);
    error.response = {
      data: { error: message, ...details },
      status,
      statusText: getStatusText(status),
      headers: {},
      config: {} as AxiosRequestConfig,
    };
    error.request = {};
    error.config = {} as AxiosRequestConfig;
    error.isAxiosError = true;
    return error;
  },

  /**
   * Network error (no response)
   */
  networkError: (message = 'Network Error') => {
    const error: any = new Error(message);
    error.request = {};
    error.config = {} as AxiosRequestConfig;
    error.isAxiosError = true;
    return error;
  },

  /**
   * Timeout error
   */
  timeoutError: () => {
    const error: any = new Error('timeout of 10000ms exceeded');
    error.code = 'ECONNABORTED';
    error.request = {};
    error.config = {} as AxiosRequestConfig;
    error.isAxiosError = true;
    return error;
  },

  /**
   * Validation error (400)
   */
  validationError: (fields: Record<string, string>) => {
    return mockAxiosResponse.error(400, 'Validation failed', { fields });
  },

  /**
   * Unauthorized error (401)
   */
  unauthorized: (message = 'Unauthorized') => {
    return mockAxiosResponse.error(401, message);
  },

  /**
   * Forbidden error (403)
   */
  forbidden: (message = 'Forbidden') => {
    return mockAxiosResponse.error(403, message);
  },

  /**
   * Not found error (404)
   */
  notFound: (resource = 'Resource') => {
    return mockAxiosResponse.error(404, `${resource} not found`);
  },

  /**
   * Server error (500)
   */
  serverError: (message = 'Internal Server Error') => {
    return mockAxiosResponse.error(500, message);
  },

  /**
   * Service unavailable (503)
   */
  serviceUnavailable: () => {
    return mockAxiosResponse.error(503, 'Service Unavailable');
  },
};

/**
 * Helper to get HTTP status text
 */
const getStatusText = (status: number): string => {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return statusTexts[status] || 'Unknown';
};
```

### 3. Request Verification Utilities

```typescript
/**
 * Utilities for verifying axios mock calls
 */
export const axiosTestUtils = {
  /**
   * Verify request was made with specific config
   */
  expectRequestWith: (
    mockFn: ReturnType<typeof vi.fn>,
    url: string,
    config?: Partial<AxiosRequestConfig>
  ) => {
    expect(mockFn).toHaveBeenCalledWith(
      url,
      expect.objectContaining(config ?? {})
    );
  },

  /**
   * Verify POST request body
   */
  expectPostWith: (
    mockFn: ReturnType<typeof vi.fn>,
    url: string,
    body: any,
    config?: Partial<AxiosRequestConfig>
  ) => {
    expect(mockFn).toHaveBeenCalledWith(
      url,
      body,
      config ? expect.objectContaining(config) : undefined
    );
  },

  /**
   * Verify request headers
   */
  expectHeaders: (
    mockFn: ReturnType<typeof vi.fn>,
    headers: Record<string, string>
  ) => {
    const calls = mockFn.mock.calls;
    const lastCall = calls[calls.length - 1];
    const config = lastCall[lastCall.length - 1];

    expect(config?.headers).toMatchObject(headers);
  },

  /**
   * Verify query parameters
   */
  expectParams: (
    mockFn: ReturnType<typeof vi.fn>,
    params: Record<string, any>
  ) => {
    const calls = mockFn.mock.calls;
    const lastCall = calls[calls.length - 1];
    const config = lastCall[lastCall.length - 1];

    expect(config?.params).toMatchObject(params);
  },

  /**
   * Get all requests made to a mock
   */
  getRequests: (mockFn: ReturnType<typeof vi.fn>) => {
    return mockFn.mock.calls.map(call => ({
      url: call[0],
      config: call[1],
    }));
  },

  /**
   * Clear all mock call history
   */
  clearMocks: (instance: MockAxiosInstance) => {
    Object.values(instance).forEach(method => {
      if (typeof method === 'function' && 'mockClear' in method) {
        method.mockClear();
      }
    });
  },

  /**
   * Reset all mocks to initial state
   */
  resetMocks: (instance: MockAxiosInstance) => {
    Object.values(instance).forEach(method => {
      if (typeof method === 'function' && 'mockReset' in method) {
        method.mockReset();
      }
    });
  },
};
```

### 4. Interceptor Testing Utilities

```typescript
/**
 * Utilities for testing axios interceptors
 */
export const interceptorTestUtils = {
  /**
   * Extract registered request interceptor
   */
  getRequestInterceptor: (instance: MockAxiosInstance): Function | null => {
    const calls = instance.interceptors.request.use.mock.calls;
    if (calls.length === 0) return null;
    return calls[calls.length - 1][0]; // onFulfilled handler
  },

  /**
   * Extract registered response interceptor
   */
  getResponseInterceptor: (instance: MockAxiosInstance): {
    onFulfilled: Function | null;
    onRejected: Function | null;
  } => {
    const calls = instance.interceptors.response.use.mock.calls;
    if (calls.length === 0) return { onFulfilled: null, onRejected: null };

    const [onFulfilled, onRejected] = calls[calls.length - 1];
    return { onFulfilled, onRejected };
  },

  /**
   * Test request interceptor transformation
   */
  testRequestInterceptor: async (
    instance: MockAxiosInstance,
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig> => {
    const interceptor = interceptorTestUtils.getRequestInterceptor(instance);
    if (!interceptor) throw new Error('No request interceptor registered');
    return await interceptor(config);
  },

  /**
   * Test response interceptor transformation
   */
  testResponseInterceptor: async (
    instance: MockAxiosInstance,
    response: AxiosResponse
  ): Promise<AxiosResponse> => {
    const { onFulfilled } = interceptorTestUtils.getResponseInterceptor(instance);
    if (!onFulfilled) throw new Error('No response interceptor registered');
    return await onFulfilled(response);
  },

  /**
   * Test response error interceptor
   */
  testResponseErrorInterceptor: async (
    instance: MockAxiosInstance,
    error: any
  ): Promise<any> => {
    const { onRejected } = interceptorTestUtils.getResponseInterceptor(instance);
    if (!onRejected) throw new Error('No response error interceptor registered');
    return await onRejected(error);
  },
};
```

### 5. Advanced Mock Scenarios

```typescript
/**
 * Mock scenarios for complex testing
 */
export const mockScenarios = {
  /**
   * Simulate network latency
   */
  withDelay: <T>(response: T, delayMs: number) => {
    return new Promise(resolve => {
      setTimeout(() => resolve(response), delayMs);
    });
  },

  /**
   * Simulate intermittent failures
   */
  withRandomFailure: <T>(
    successResponse: T,
    errorResponse: any,
    failureRate = 0.3
  ) => {
    return Math.random() < failureRate ? errorResponse : successResponse;
  },

  /**
   * Simulate rate limiting
   */
  withRateLimit: (maxRequests: number, windowMs: number) => {
    let requestCount = 0;
    let windowStart = Date.now();

    return () => {
      const now = Date.now();

      if (now - windowStart > windowMs) {
        requestCount = 0;
        windowStart = now;
      }

      requestCount++;

      if (requestCount > maxRequests) {
        return mockAxiosResponse.error(429, 'Too Many Requests', {
          retryAfter: Math.ceil((windowMs - (now - windowStart)) / 1000),
        });
      }

      return mockAxiosResponse.success({ ok: true });
    };
  },

  /**
   * Simulate progressive loading
   */
  withPagination: <T>(
    allItems: T[],
    pageSize: number
  ) => {
    let currentPage = 0;

    return () => {
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const items = allItems.slice(start, end);
      const hasMore = end < allItems.length;

      currentPage++;

      return mockAxiosResponse.success({
        items,
        page: currentPage,
        pageSize,
        total: allItems.length,
        hasMore,
      });
    };
  },

  /**
   * Simulate authentication flow
   */
  withAuth: (validToken: string) => {
    return (config: AxiosRequestConfig) => {
      const authHeader = config.headers?.['Authorization'];

      if (!authHeader) {
        return mockAxiosResponse.unauthorized('Missing authorization header');
      }

      if (authHeader !== `Bearer ${validToken}`) {
        return mockAxiosResponse.unauthorized('Invalid token');
      }

      return mockAxiosResponse.success({ authenticated: true });
    };
  },
};
```

## Implementation Plan

### Phase 1: Core Infrastructure (Priority: HIGH)
- Create `/tests/utils/axios-mocks.ts`
- Implement `createMockAxiosInstance()`
- Implement `mockAxiosModule()`
- Implement `mockAxiosResponse` builders

### Phase 2: Testing Utilities (Priority: HIGH)
- Implement `axiosTestUtils` verification helpers
- Implement `interceptorTestUtils`
- Add type-safe request matchers

### Phase 3: Advanced Scenarios (Priority: MEDIUM)
- Implement `mockScenarios` utilities
- Add network latency simulation
- Add rate limiting simulation

### Phase 4: Integration (Priority: HIGH)
- Update frontend setup.ts
- Update backend setup.ts
- Create migration guide

### Phase 5: Migration (Priority: LOW)
- Migrate sample frontend tests (5 files)
- Migrate sample backend tests (5 files)
- Document migration patterns

## Usage Examples

### Example 1: Frontend Test Setup
```typescript
// /frontend/src/test/setup.ts - AFTER migration
import { mockAxiosModule } from '../../../tests/utils/axios-mocks';

vi.mock('axios', () => mockAxiosModule());
```

### Example 2: Component Test
```typescript
// Test file using standardized mocks
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { mockAxiosResponse, axiosTestUtils } from '@/tests/utils/axios-mocks';

vi.mock('axios');

describe('AnnotationService', () => {
  const mockAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch annotations successfully', async () => {
    // Setup mock response
    const mockAnnotations = [{ id: '1', term: 'pico' }];
    mockAxios.get.mockResolvedValue(
      mockAxiosResponse.success(mockAnnotations)
    );

    // Execute
    const result = await apiAdapter.getAnnotations();

    // Verify
    expect(result).toEqual(mockAnnotations);
    axiosTestUtils.expectRequestWith(
      mockAxios.get,
      '/api/annotations',
      { params: { imageId: undefined } }
    );
  });

  it('should handle network errors', async () => {
    // Setup mock error
    mockAxios.get.mockRejectedValue(
      mockAxiosResponse.networkError()
    );

    // Execute and verify
    await expect(apiAdapter.getAnnotations()).rejects.toThrow('Network Error');
  });

  it('should handle validation errors', async () => {
    // Setup validation error
    mockAxios.post.mockRejectedValue(
      mockAxiosResponse.validationError({
        spanishTerm: 'Required field',
        englishTerm: 'Required field',
      })
    );

    // Execute and verify
    await expect(apiAdapter.createAnnotation({})).rejects.toThrow();
  });
});
```

### Example 3: Interceptor Testing
```typescript
it('should add session ID to request headers', () => {
  const mockInstance = createMockAxiosInstance();

  // Setup interceptor
  setupApiAdapter(mockInstance);

  // Extract and test interceptor
  const config = interceptorTestUtils.testRequestInterceptor(
    mockInstance,
    { url: '/api/test', headers: {} }
  );

  expect(config.headers['X-Session-Id']).toBeDefined();
});
```

### Example 4: Backend Integration Test
```typescript
// Backend service test
import request from 'supertest';
import { mockAxiosResponse } from '../../../tests/utils/axios-mocks';
import axios from 'axios';

vi.mock('axios');

describe('VocabularyService Integration', () => {
  it('should enrich vocabulary from external API', async () => {
    // Mock external API call
    const mockAxios = axios as any;
    mockAxios.post.mockResolvedValue(
      mockAxiosResponse.success({
        etymology: 'From Latin...',
        mnemonic: 'Remember by...',
      })
    );

    // Test service
    const result = await vocabularyService.getEnrichment('pájaro');

    expect(result.etymology).toBe('From Latin...');
  });
});
```

### Example 5: Complex Scenario Testing
```typescript
it('should handle rate limiting gracefully', async () => {
  const rateLimitMock = mockScenarios.withRateLimit(5, 60000);

  // First 5 requests succeed
  for (let i = 0; i < 5; i++) {
    mockAxios.get.mockResolvedValueOnce(rateLimitMock());
    await apiAdapter.getAnnotations();
  }

  // 6th request fails with 429
  mockAxios.get.mockRejectedValueOnce(rateLimitMock());
  await expect(apiAdapter.getAnnotations()).rejects.toThrow();
});

it('should simulate network latency', async () => {
  mockAxios.get.mockImplementation(() =>
    mockScenarios.withDelay(
      mockAxiosResponse.success([]),
      500 // 500ms delay
    )
  );

  const start = Date.now();
  await apiAdapter.getAnnotations();
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(500);
});
```

## Benefits

### Quantitative
- **Reduce code duplication**: ~300 lines eliminated across 57 test files
- **Type safety**: Eliminate 50+ `as any` casts
- **Test maintainability**: 1 source of truth for mock configuration

### Qualitative
- **Consistent mock behavior**: All tests use same structure
- **Better error testing**: Standardized error scenarios
- **Easier debugging**: Clear mock response builders
- **Future-proof**: Easy to add new HTTP scenarios

## Testing Strategy

### Unit Tests for Utilities
```typescript
describe('axios-mocks', () => {
  describe('mockAxiosResponse', () => {
    it('should create success response', () => {
      const response = mockAxiosResponse.success({ id: 1 });
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: { id: 1 } });
    });

    it('should create error response', () => {
      const error = mockAxiosResponse.error(404, 'Not found');
      expect(error.response.status).toBe(404);
      expect(error.isAxiosError).toBe(true);
    });
  });

  describe('axiosTestUtils', () => {
    it('should verify request parameters', () => {
      const mockFn = vi.fn();
      mockFn('/api/test', { params: { id: 1 } });

      axiosTestUtils.expectParams(mockFn, { id: 1 });
    });
  });
});
```

## Non-Functional Requirements

### Performance
- Mock creation must be fast (<1ms)
- Response builders should be zero-overhead
- Scenario utilities should not slow tests significantly

### Compatibility
- Must work with Vitest (frontend)
- Must work with Jest (backend)
- Must support TypeScript strict mode
- Must integrate with existing test setup

### Documentation
- JSDoc comments for all public APIs
- Migration guide with examples
- Common patterns cookbook

## Migration Guide

### Frontend Migration

1. **Update setup.ts**
   ```typescript
   // OLD
   vi.mock('axios', async (importOriginal) => { /* 40 lines */ });

   // NEW
   import { mockAxiosModule } from '../../../tests/utils/axios-mocks';
   vi.mock('axios', () => mockAxiosModule());
   ```

2. **Update test files**
   ```typescript
   // OLD
   mockAxios.get.mockResolvedValue({ data: { data: [...] } });

   // NEW
   import { mockAxiosResponse } from '@/tests/utils/axios-mocks';
   mockAxios.get.mockResolvedValue(mockAxiosResponse.success([...]));
   ```

### Backend Migration

1. **Add mock utilities**
   ```typescript
   import { mockAxiosResponse } from '../../tests/utils/axios-mocks';
   import axios from 'axios';

   jest.mock('axios');
   ```

2. **Standardize error handling**
   ```typescript
   // OLD
   mockAxios.post.mockRejectedValue({
     response: { status: 500, data: {} },
     message: 'Server error'
   });

   // NEW
   mockAxios.post.mockRejectedValue(
     mockAxiosResponse.serverError()
   );
   ```

## Risk Assessment

### Low Risk
- Utilities are pure functions
- No breaking changes to test behavior
- Backward compatible

### Medium Risk
- Large number of files to migrate (57 files)
- Potential for subtle mock behavior changes

### Mitigation
- Gradual migration strategy
- Run full test suite after each batch
- Document any behavioral differences

## Success Metrics

1. **Adoption**: 70% of tests use new mocks within 3 weeks
2. **Type safety**: Zero `as any` casts in axios mocks
3. **Code reduction**: 250+ lines of boilerplate removed
4. **Test reliability**: No increase in flaky tests

---

**Document Version**: 1.0
**Created**: 2025-10-17
**Author**: Testing Architecture Designer
**Status**: Specification Complete - Ready for Implementation
