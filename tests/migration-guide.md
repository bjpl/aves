# Test Migration Guide

## Overview

This guide helps migrate existing tests to use the new test utilities framework. The new utilities provide better patterns for testing React Query, Axios mocks, and async operations.

## Quick Start

### Before (Old Pattern)
```typescript
// Manual QueryClient setup everywhere
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

// Manual axios mocking
jest.spyOn(axios, 'get').mockResolvedValue({ data: mockData });

// Complex async waiting
await new Promise(resolve => setTimeout(resolve, 100));
```

### After (New Pattern)
```typescript
import { renderWithQuery, createTestQueryClient } from '../utils/react-query-helpers';
import { mockAxiosGet } from '../utils/axios-mock-helpers';
import { waitForAsync } from '../utils/async-test-helpers';

// Clean, reusable utilities
renderWithQuery(<Component />);
mockAxiosGet('/api/data', mockData);
await waitForAsync(operation);
```

## Migration Examples

### 1. React Query Tests

#### Before
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('MyComponent', () => {
  it('should fetch data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MyComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Data')).toBeInTheDocument();
    });
  });
});
```

#### After
```typescript
import { renderWithQuery, createTestQueryClient, mockQuerySuccess } from '../utils/react-query-helpers';

describe('MyComponent', () => {
  it('should fetch data', async () => {
    const queryClient = createTestQueryClient();
    mockQuerySuccess(queryClient, ['dataKey'], { value: 'Data' });

    renderWithQuery(<MyComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Data')).toBeInTheDocument();
    });
  });
});
```

**Benefits:**
- Less boilerplate
- Consistent test setup
- Better type safety
- Reusable QueryClient configuration

### 2. Axios Mocking

#### Before
```typescript
describe('ApiService', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch data', async () => {
    getSpy.mockResolvedValue({
      data: { id: '123', name: 'Test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const result = await service.getData('123');
    expect(result).toEqual({ id: '123', name: 'Test' });
  });
});
```

#### After
```typescript
import { mockAxiosGet, clearAxiosMocks } from '../utils/axios-mock-helpers';

describe('ApiService', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should fetch data', async () => {
    mockAxiosGet('/api/data/123', { id: '123', name: 'Test' });

    const result = await service.getData('123');
    expect(result).toEqual({ id: '123', name: 'Test' });
  });
});
```

**Benefits:**
- Cleaner syntax
- Automatic response structure
- Built-in error scenarios
- URL pattern matching

### 3. Async Operations

#### Before
```typescript
describe('AsyncComponent', () => {
  it('should load data', async () => {
    render(<AsyncComponent />);

    const button = screen.getByText('Load');
    fireEvent.click(button);

    // Manual waiting
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

#### After
```typescript
import { waitForLoadingToFinish, flushPromises } from '../utils/async-test-helpers';

describe('AsyncComponent', () => {
  it('should load data', async () => {
    const user = userEvent.setup();
    render(<AsyncComponent />);

    const button = screen.getByText('Load');
    await user.click(button);

    await waitForLoadingToFinish(
      () => screen.queryByTestId('loader') as HTMLElement | null
    );

    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

**Benefits:**
- Semantic helpers
- Better error messages
- Timeout control
- More reliable tests

## Migrating Specific Test Patterns

### Pattern 1: Fetch Mocking

#### Before
```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

#### After
```typescript
import { mockAxiosGet } from '../utils/axios-mock-helpers';

// If using axios
mockAxiosGet('/api/endpoint', { data: 'test' });

// If still using fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

### Pattern 2: Error Scenarios

#### Before
```typescript
jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));
```

#### After
```typescript
import { mockAxiosError, mockAxiosTimeout, mockAxiosUnauthorized } from '../utils/axios-mock-helpers';

// Generic error
mockAxiosError('get', '/api/endpoint', 'Network error');

// Specific scenarios
mockAxiosTimeout('get', '/api/endpoint');
mockAxiosUnauthorized('get', '/api/endpoint');
```

### Pattern 3: Retry Logic

#### Before
```typescript
let attempts = 0;
jest.spyOn(axios, 'get').mockImplementation(() => {
  attempts++;
  if (attempts < 3) {
    return Promise.reject(new Error('Fail'));
  }
  return Promise.resolve({ data: 'success' });
});
```

#### After
```typescript
import { mockAxiosSequence } from '../utils/axios-mock-helpers';

mockAxiosSequence('get', '/api/endpoint', [
  { error: 'Fail' },
  { error: 'Fail' },
  { data: 'success' },
]);
```

### Pattern 4: Loading States

#### Before
```typescript
it('should show loading state', async () => {
  let resolvePromise: any;
  jest.spyOn(axios, 'get').mockReturnValue(
    new Promise(resolve => { resolvePromise = resolve; })
  );

  render(<Component />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  resolvePromise({ data: 'test' });
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

#### After
```typescript
import { createDeferredPromise, waitForLoadingToFinish } from '../utils/async-test-helpers';

it('should show loading state', async () => {
  const deferred = createDeferredPromise();
  jest.spyOn(axios, 'get').mockReturnValue(deferred.promise);

  render(<Component />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  deferred.resolve({ data: 'test' });
  await waitForLoadingToFinish(() => screen.queryByText('Loading...'));
});
```

## Step-by-Step Migration Process

### Step 1: Add Imports
```typescript
import {
  renderWithQuery,
  createTestQueryClient,
  mockQuerySuccess,
  mockQueryError,
} from '../utils/react-query-helpers';

import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosError,
  clearAxiosMocks,
} from '../utils/axios-mock-helpers';

import {
  waitForAsync,
  waitForLoadingToFinish,
  flushPromises,
} from '../utils/async-test-helpers';
```

### Step 2: Replace QueryClient Setup
Find and replace:
- `new QueryClient({ ... })` → `createTestQueryClient()`
- Manual `QueryClientProvider` → `renderWithQuery()`

### Step 3: Replace Axios Mocks
Find and replace:
- `jest.spyOn(axios, 'get').mockResolvedValue(...)` → `mockAxiosGet(...)`
- `jest.spyOn(axios, 'post').mockResolvedValue(...)` → `mockAxiosPost(...)`
- `jest.spyOn(axios, 'get').mockRejectedValue(...)` → `mockAxiosError(...)`

### Step 4: Replace Async Waiting
Find and replace:
- `await new Promise(resolve => setTimeout(...))` → `await waitForAsync(...)`
- Manual loading checks → `waitForLoadingToFinish(...)`

### Step 5: Add Cleanup
```typescript
afterEach(() => {
  clearAxiosMocks();
});
```

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Clear Mocks
**Problem:** Tests interfere with each other

**Solution:**
```typescript
afterEach(() => {
  clearAxiosMocks();
  vi.clearAllMocks();
});
```

### Pitfall 2: Not Waiting for Async Operations
**Problem:** Tests fail intermittently

**Solution:**
```typescript
// ❌ Bad
fireEvent.click(button);
expect(screen.getByText('Result')).toBeInTheDocument();

// ✅ Good
await user.click(button);
await waitFor(() => {
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

### Pitfall 3: Incorrect QueryKey Matching
**Problem:** Query mock not applied

**Solution:**
```typescript
// Ensure queryKey matches exactly
const queryKey = ['users', userId]; // Component uses this

mockQuerySuccess(queryClient, ['users', userId], mockData); // Must match
```

### Pitfall 4: Missing await on Async Utilities
**Problem:** Test completes before assertions run

**Solution:**
```typescript
// ❌ Bad
waitForLoadingToFinish(...); // Missing await!

// ✅ Good
await waitForLoadingToFinish(...);
```

## Testing Checklist

Before migrating a test file:
- [ ] Read the test to understand what it's testing
- [ ] Identify test utilities that can be applied
- [ ] Add necessary imports
- [ ] Replace manual mocking with utilities
- [ ] Add proper cleanup in afterEach
- [ ] Run tests to verify they still pass
- [ ] Check for improved readability

After migration:
- [ ] Tests pass consistently
- [ ] No console warnings/errors
- [ ] Code is more readable
- [ ] Less boilerplate code
- [ ] Better error messages

## Example: Complete Migration

### Before (backend/src/__tests__/services/VisionAI.test.ts - Partial)
```typescript
describe('VisionAI Service', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockCreate = jest.fn();
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: jest.fn().mockReturnValue('image/jpeg') },
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from([...]))
    } as any);
  });

  it('should annotate image', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify([...]) }],
      usage: { input_tokens: 100, output_tokens: 400 }
    });

    const result = await visionAI.annotateImage('https://example.com/bird.jpg', 'img_123');
    expect(result).toHaveLength(1);
  });
});
```

### After (Using New Utilities)
```typescript
import { mockAxiosGet, createMockAxiosResponse } from '../../utils/axios-mock-helpers';
import { waitForAsync, flushPromises } from '../../utils/async-test-helpers';

describe('VisionAI Service', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockCreate = jest.fn();
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    // Use axios mock helper for fetch (if we convert to axios)
    // Or keep simple fetch mock for image loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('image/jpeg') },
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from([...]))
    });
  });

  it('should annotate image', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify([...]) }],
      usage: { input_tokens: 100, output_tokens: 400 }
    });

    const result = await waitForAsync(
      () => visionAI.annotateImage('https://example.com/bird.jpg', 'img_123')
    );

    expect(result).toHaveLength(1);
  });
});
```

## Resources

- `/tests/examples/react-query-examples.test.tsx` - React Query patterns
- `/tests/examples/axios-mock-examples.test.ts` - Axios mocking patterns
- `/tests/examples/async-handling-examples.test.tsx` - Async testing patterns
- `/tests/utils/` - Utility function implementations

## Getting Help

If you encounter issues during migration:

1. Check the example tests in `/tests/examples/`
2. Review utility function documentation in `/tests/utils/`
3. Look for similar patterns in already-migrated tests
4. Test each change incrementally

## Summary

The new test utilities provide:
- ✅ Less boilerplate code
- ✅ More consistent test patterns
- ✅ Better error messages
- ✅ Improved type safety
- ✅ Easier to maintain tests
- ✅ Faster test development

Start with small, isolated tests and gradually migrate more complex ones as you become familiar with the utilities.
