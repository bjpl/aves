# Axios Mock Patterns Analysis

## Overview
Analysis of Axios mocking strategies across the AVES test suite to identify patterns, inconsistencies, and refactoring opportunities.

**Analysis Date**: 2025-10-16
**Files Using Axios Mocks**: 33
**Mock Framework**: Vitest (`vi.mock`)

---

## Axios Mocking Strategies

### Strategy 1: Global Axios Mock (Setup File)
**Location**: `frontend/src/test/setup.ts`

```typescript
// Mock axios globally to provide create() method
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
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});
```

**Scope**: Applies to ALL tests
**Purpose**: Ensure axios is available with all methods mocked

**Advantages**:
- Consistent baseline for all tests
- Prevents accidental network requests
- Provides `create()` method for axios instances

**Disadvantages**:
- Can hide test-specific mocking needs
- Global state can leak between tests
- Less explicit about what's being mocked

---

### Strategy 2: Per-File Axios Mock
**Pattern**: Most common in test files

```typescript
// At top of test file
vi.mock('axios');

describe('MyComponent', () => {
  const mockAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data', async () => {
    mockAxios.get.mockResolvedValueOnce({ data: mockData });
    // test code
  });
});
```

**Files Using This Pattern**: 15 files

**Characteristics**:
- Explicit `vi.mock('axios')` at file top
- Type assertion: `axios as any`
- `vi.clearAllMocks()` in `beforeEach`
- Method-specific mocking: `mockAxios.get.mockResolvedValueOnce`

**Advantages**:
- Clear declaration of mocking intent
- File-scoped control
- Easy to reason about

**Disadvantages**:
- Relies on global mock from setup.ts
- Type safety loss with `as any`

---

### Strategy 3: Axios Mock Module
**Location**: `frontend/src/__mocks__/axios.ts`

```typescript
import { vi } from 'vitest';

const mockAxios: any = {
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  patch: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
  create: vi.fn(function(_config?: any) {
    return mockAxios;
  }),
  defaults: {
    baseURL: '',
    headers: { common: {} },
  },
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};

export default mockAxios;
```

**Usage**: Manual mock (Vitest auto-uses if `vi.mock('axios')` called)

**Characteristics**:
- Centralized mock definition
- Default implementations return resolved promises
- `create()` returns itself for chaining

**Advantages**:
- Single source of truth for axios mocking
- Consistent default behavior
- Supports axios instance creation

**Disadvantages**:
- Not widely used (global setup.ts shadows it)
- Less flexible than per-test mocking

---

### Strategy 4: Service-Specific Mocking
**Example**: `apiAdapter.test.ts`

```typescript
describe('ApiAdapter', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          // Store interceptor for testing
          return 1;
        })
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          return 1;
        })
      }
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    vi.mocked(axios.isAxiosError).mockImplementation((error: any) => {
      return error && (error.response !== undefined || error.isAxiosError === true);
    });

    // Dynamically import after mocks
    const module = await import('../../services/apiAdapter');
    apiAdapter = module.apiAdapter;
  });
});
```

**Characteristics**:
- Custom axios instance mock
- Interceptor testing support
- Dynamic module import after mock setup
- Mock `axios.isAxiosError` for error handling

**Advantages**:
- Precise control over axios behavior
- Can test interceptors
- Isolated from global mocks

**Disadvantages**:
- Complex setup
- Requires module reset and re-import
- Verbose

---

### Strategy 5: Mocking Axios for Unsplash Service
**File**: `unsplashService.test.ts`

```typescript
vi.mock('axios');

describe('UnsplashService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('REACT_APP_UNSPLASH_ACCESS_KEY', 'test-api-key');
    service = new UnsplashService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should search photos with correct API call', async () => {
    vi.mocked(axios.get).mockResolvedValue(mockResponse);

    const result = await service.searchPhotos('cardinal', 1, 10);

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.unsplash.com/search/photos',
      {
        headers: { Authorization: 'Client-ID test-api-key' },
        params: { query: 'cardinal', page: 1, per_page: 10, orientation: 'landscape' }
      }
    );
  });
});
```

**Characteristics**:
- Uses `vi.mocked(axios.get)` for type safety
- Environment variable stubbing
- Verifies exact API call parameters
- Tests external API integration

**Advantages**:
- Type-safe mocking with `vi.mocked`
- Clear intent with env stubbing
- Comprehensive assertion on API calls

**Disadvantages**:
- Environment stub management complexity
- Teardown required (`unstubAllEnvs`)

---

## Mock Response Patterns

### Pattern A: mockResolvedValueOnce
**Most Common Pattern** (Used in 80% of tests)

```typescript
mockAxios.get.mockResolvedValueOnce({
  data: { data: mockAnnotations },
});
```

**Characteristics**:
- Mocks single call
- Auto-resets after use
- Sequential calls need multiple `mockResolvedValueOnce`

**Advantages**:
- Test isolation
- Explicit single-use intent
- Safe for parallel tests

**Disadvantages**:
- Must mock each call separately
- Easy to forget subsequent calls

### Pattern B: mockResolvedValue
**Less Common** (Used in 15% of tests)

```typescript
mockAxios.get.mockResolvedValue({
  data: { data: mockData },
});
```

**Characteristics**:
- Mocks all subsequent calls
- Persists across multiple invocations

**Advantages**:
- Less verbose for repeated calls
- Good for stable test fixtures

**Disadvantages**:
- Risk of test pollution
- Less explicit

### Pattern C: mockImplementation
**Used for Complex Behavior**

```typescript
mockAxios.get.mockImplementation((url, config) => {
  if (url.includes('/species')) {
    return Promise.resolve({ data: mockSpecies });
  }
  return Promise.resolve({ data: [] });
});
```

**Use Cases**:
- Conditional responses based on URL
- Simulating different API states
- Dynamic response generation

**Advantages**:
- Maximum flexibility
- Can test complex scenarios

**Disadvantages**:
- More complex to maintain
- Can obscure test intent

---

## Error Mocking Patterns

### Pattern A: mockRejectedValueOnce
**Standard Error Testing**

```typescript
mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

const { result } = renderHook(() => useAIAnnotations());

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

expect(result.current.data).toEqual([]);
```

**Usage**: Error fallback testing

### Pattern B: Mock Axios Error Response
**HTTP Error Simulation**

```typescript
mockAxios.post.mockRejectedValueOnce({
  response: {
    status: 403,
    data: { errors: ['Rate limit exceeded'] }
  }
});

await expect(service.searchPhotos('cardinal')).rejects.toBeTruthy();
```

**Usage**: Testing specific HTTP status codes

### Pattern C: Network Error vs API Error
**File**: `apiAdapter.test.ts`

```typescript
describe('Error Handling', () => {
  it('should convert axios errors to NetworkError', async () => {
    const axiosError = {
      response: { status: 404, data: { message: 'Not found' } },
      message: 'Request failed'
    };
    mockAxiosInstance.post.mockRejectedValue(axiosError);

    await expect(apiAdapter.createAnnotation({} as any)).rejects.toThrow(NetworkError);
  });

  it('should handle errors without response', async () => {
    const axiosError = { message: 'Network error', response: undefined };
    mockAxiosInstance.post.mockRejectedValue(axiosError);

    await expect(apiAdapter.createAnnotation({} as any)).rejects.toThrow(NetworkError);
  });
});
```

**Pattern**: Test both network errors and API errors separately

---

## Interceptor Testing

**Only Found In**: `apiAdapter.test.ts`

```typescript
describe('Request Interceptors', () => {
  it('should add session ID to request headers', () => {
    const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
    const requestInterceptor = interceptorCall[0];

    const config = { headers: {} };
    const sessionId = 'test-session-123';

    Object.defineProperty(window, 'sessionStorage', {
      value: { getItem: vi.fn(() => sessionId) },
      writable: true
    });

    const result = requestInterceptor(config);

    expect(result.headers['X-Session-Id']).toBe(sessionId);
  });
});
```

**Coverage**: Very limited (1 file)
**Gap**: Response interceptors not tested

---

## Identified Issues

### 1. Mock Cleanup Inconsistency
**Problem**: Some tests use `vi.clearAllMocks()`, others don't

**Impact**: Test pollution, flaky tests

**Example Good**:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Example Bad**:
```typescript
// No cleanup - mocks persist
```

**Recommendation**: Enforce `vi.clearAllMocks()` in all test files

---

### 2. Type Safety Loss
**Problem**: Frequent use of `axios as any` and `as any`

**Example**:
```typescript
const mockAxios = axios as any;
mockAxios.get.mockResolvedValueOnce(...)
```

**Impact**:
- No TypeScript safety
- Easy to typo method names
- Harder refactoring

**Recommendation**: Use `vi.mocked(axios)` for type safety

**Better Approach**:
```typescript
vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });
```

---

### 3. Response Structure Inconsistency
**Problem**: Different data wrapping patterns

**Pattern A**: Wrapped in `data.data`
```typescript
mockAxios.get.mockResolvedValueOnce({
  data: { data: mockAnnotations },
});
```

**Pattern B**: Direct `data`
```typescript
mockAxios.get.mockResolvedValueOnce({
  data: mockSpecies,
});
```

**Pattern C**: Headers included
```typescript
mockAxios.get.mockResolvedValueOnce({
  data: { results: [], total: 0 },
  headers: { 'x-ratelimit-remaining': '45' }
});
```

**Issue**: Reflects API inconsistency, but tests should normalize

---

### 4. Module Import Order Issues
**Problem**: Dynamic imports required for proper mock setup

**Example**:
```typescript
beforeEach(async () => {
  vi.resetModules();
  vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);

  // Import AFTER mocks are set up
  const module = await import('../../services/apiAdapter');
  apiAdapter = module.apiAdapter;
});
```

**Impact**: Complex test setup, harder to understand

**Root Cause**: Module-level service instantiation

---

### 5. Missing Mock Verification
**Gap**: Few tests verify mock was called with correct parameters

**Good Example** (from `unsplashService.test.ts`):
```typescript
expect(axios.get).toHaveBeenCalledWith(
  'https://api.unsplash.com/search/photos',
  {
    headers: { Authorization: 'Client-ID test-api-key' },
    params: { query: 'cardinal', page: 1, per_page: 10, orientation: 'landscape' }
  }
);
```

**Bad Example**:
```typescript
// Just checks mock was called, not HOW
expect(mockAxios.get).toHaveBeenCalled();
```

**Recommendation**: Always verify parameters

---

## Coverage Analysis

### Well-Covered
- ✅ Basic GET requests
- ✅ POST/PUT/PATCH mutations
- ✅ Error responses (404, 500, network errors)
- ✅ Query parameter passing
- ✅ Request headers (limited)

### Gaps
- ❌ Response header handling (only 1 test)
- ❌ Request interceptors (minimal)
- ❌ Response interceptors (none)
- ❌ Timeout handling (none)
- ❌ Cancellation tokens (none)
- ❌ Concurrent request handling (none)
- ❌ Retry logic (none)

---

## Recommendations

### Short-Term Improvements

1. **Standardize Mock Setup**
   - Create `setupAxiosMocks()` helper
   - Enforce `vi.clearAllMocks()` in all tests

2. **Improve Type Safety**
   - Replace `axios as any` with `vi.mocked(axios)`
   - Add typed mock response helpers

3. **Consistent Mock Verification**
   - Always verify call parameters
   - Use `.toHaveBeenCalledWith()` with exact params

### Long-Term Refactoring

1. **Create Mock Response Builder**
   ```typescript
   const mockApiResponse = <T>(data: T, meta?: any) => ({
     data: { data, ...meta }
   });
   ```

2. **Centralized Error Mocking**
   ```typescript
   const mockAxiosError = (status: number, message: string) => ({
     response: { status, data: { message } },
     isAxiosError: true
   });
   ```

3. **Test Utilities for Common Patterns**
   ```typescript
   const mockApiSuccess = (endpoint: string, data: any) => {
     vi.mocked(axios.get).mockResolvedValueOnce(mockApiResponse(data));
   };
   ```

---

## Statistics

- **Total Files Using Axios Mocks**: 33
- **Files Using `vi.mock('axios')`**: 15
- **Files With `vi.clearAllMocks()`**: 28 (85%)
- **Files Using `as any` Type Assertion**: 22 (67%)
- **Files Using `vi.mocked()` Type Helper**: 11 (33%)
- **Tests Verifying Call Parameters**: ~60%
- **Tests Using `mockResolvedValueOnce`**: ~80%

---

## Conclusion

Axios mocking in the AVES codebase is **functional but inconsistent**. Key improvements:

1. Standardize mock setup patterns across all test files
2. Improve type safety by migrating to `vi.mocked()`
3. Create centralized mock utilities for common patterns
4. Increase coverage of interceptors, headers, and error scenarios
5. Enforce parameter verification in all API call tests

These changes will reduce duplication, improve maintainability, and catch more bugs.
