# Test Utilities and Examples

## Overview

This directory contains comprehensive test utilities and examples for the Aves project. These utilities simplify testing React Query, Axios, and async operations.

## Directory Structure

```
tests/
├── utils/                    # Reusable test utilities
│   ├── react-query-helpers.tsx    # React Query testing utilities
│   ├── axios-mock-helpers.ts      # Axios mocking utilities
│   └── async-test-helpers.ts      # Async operation utilities
├── examples/                 # Example test files demonstrating utilities
│   ├── react-query-examples.test.tsx
│   ├── axios-mock-examples.test.ts
│   └── async-handling-examples.test.tsx
└── migration-guide.md        # Complete migration guide

```

## Quick Start

### 1. React Query Testing

```typescript
import { renderWithQuery, createTestQueryClient, mockQuerySuccess } from '../utils/react-query-helpers';

it('should display data', async () => {
  const queryClient = createTestQueryClient();
  mockQuerySuccess(queryClient, ['dataKey'], { value: 'Test Data' });

  renderWithQuery(<MyComponent />, { queryClient });

  await waitFor(() => {
    expect(screen.getByText('Test Data')).toBeInTheDocument();
  });
});
```

### 2. Axios Mocking

```typescript
import { mockAxiosGet, mockAxiosError, clearAxiosMocks } from '../utils/axios-mock-helpers';

afterEach(() => {
  clearAxiosMocks();
});

it('should fetch data successfully', async () => {
  mockAxiosGet('/api/data', { id: '123', name: 'Test' });

  const result = await service.getData();
  expect(result.name).toBe('Test');
});

it('should handle errors', async () => {
  mockAxiosError('get', '/api/data', 'Network error');

  await expect(service.getData()).rejects.toThrow('Network error');
});
```

### 3. Async Operations

```typescript
import { waitForLoadingToFinish, waitForAsync, flushPromises } from '../utils/async-test-helpers';

it('should wait for loading to complete', async () => {
  render(<AsyncComponent />);

  await waitForLoadingToFinish(
    () => screen.queryByTestId('loader') as HTMLElement | null
  );

  expect(screen.getByTestId('data')).toBeInTheDocument();
});
```

## Available Utilities

### React Query Helpers

| Function | Description |
|----------|-------------|
| `createTestQueryClient()` | Create QueryClient with test-friendly defaults |
| `renderWithQuery(ui, options)` | Render component with QueryClientProvider |
| `mockQuerySuccess(client, key, data)` | Mock successful query response |
| `mockQueryError(client, key, error)` | Mock query error |
| `waitForQueryToSettle(client, key)` | Wait for query to complete |
| `assertQueryHasData(client, key, data?)` | Assert query has data |
| `assertQueryHasError(client, key, error?)` | Assert query has error |

### Axios Mock Helpers

| Function | Description |
|----------|-------------|
| `mockAxiosGet(url, data, delay?)` | Mock GET request |
| `mockAxiosPost(url, data, delay?)` | Mock POST request |
| `mockAxiosError(method, url, error, delay?)` | Mock error response |
| `mockAxiosTimeout(method, url)` | Mock timeout error |
| `mockAxiosUnauthorized(method, url)` | Mock 401 error |
| `mockAxiosNotFound(method, url)` | Mock 404 error |
| `mockAxiosSequence(method, url, responses)` | Mock sequence of responses |
| `createMockAxiosResponse(data, config?)` | Create mock response object |
| `createMockAxiosError(message, status?, code?)` | Create mock error object |
| `clearAxiosMocks()` | Clear all axios mocks |

### Async Test Helpers

| Function | Description |
|----------|-------------|
| `waitForCondition(fn, options?)` | Wait for condition to be true |
| `waitForAsync(fn, timeout?)` | Wait for async operation with timeout |
| `flushPromises()` | Flush all pending promises |
| `waitForLoadingToFinish(getLoader, timeout?)` | Wait for loading indicator to disappear |
| `assertAsyncThrows(fn, error?)` | Assert async function throws |
| `assertAsyncNoThrow(fn)` | Assert async function doesn't throw |
| `createDeferredPromise()` | Create manually controllable promise |
| `createControlledAsync(value?)` | Create controlled async operation |
| `retryAsync(fn, options?)` | Retry async operation with backoff |
| `advanceTimers(ms)` | Advance fake timers |

## Examples

Each example file demonstrates comprehensive usage patterns:

- **react-query-examples.test.tsx**: 5 examples covering useQuery, useMutation, query invalidation
- **axios-mock-examples.test.ts**: 7 examples covering GET/POST, errors, retries, concurrent requests
- **async-handling-examples.test.tsx**: 10 examples covering waiting, promises, timers, error handling

## Migration Guide

See [migration-guide.md](./migration-guide.md) for detailed instructions on migrating existing tests to use these utilities.

Key migration patterns:
- Replace manual QueryClient setup with `createTestQueryClient()`
- Replace axios spies with `mockAxiosGet()`, `mockAxiosPost()`, etc.
- Replace manual waiting with `waitForAsync()`, `waitForLoadingToFinish()`, etc.

## Best Practices

1. **Always clean up mocks**
   ```typescript
   afterEach(() => {
     clearAxiosMocks();
     vi.clearAllMocks();
   });
   ```

2. **Use semantic helpers**
   ```typescript
   // ✅ Good
   await waitForLoadingToFinish(() => screen.queryByTestId('loader'));

   // ❌ Avoid
   await new Promise(resolve => setTimeout(resolve, 500));
   ```

3. **Prefer utility functions over manual setup**
   ```typescript
   // ✅ Good
   mockAxiosGet('/api/users', userData);

   // ❌ Avoid
   jest.spyOn(axios, 'get').mockResolvedValue({
     data: userData,
     status: 200,
     statusText: 'OK',
     headers: {},
     config: {},
   });
   ```

4. **Use deferred promises for precise control**
   ```typescript
   const deferred = createDeferredPromise();
   mockFn.mockReturnValue(deferred.promise);

   // Test loading state
   expect(screen.getByText('Loading...')).toBeInTheDocument();

   // Resolve when ready
   deferred.resolve(data);
   await flushPromises();
   ```

## Testing Patterns

### Pattern: Testing Loading States

```typescript
it('should show loading indicator', async () => {
  const user = userEvent.setup();
  renderWithQuery(<Component />);

  const button = screen.getByText('Load');
  await user.click(button);

  expect(screen.getByTestId('loader')).toBeInTheDocument();

  await waitForLoadingToFinish(
    () => screen.queryByTestId('loader') as HTMLElement | null
  );

  expect(screen.getByTestId('data')).toBeInTheDocument();
});
```

### Pattern: Testing Error States

```typescript
it('should display error message', async () => {
  mockAxiosError('get', '/api/data', 'Failed to fetch');

  renderWithQuery(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
  });
});
```

### Pattern: Testing Retry Logic

```typescript
it('should retry on failure', async () => {
  mockAxiosSequence('get', '/api/data', [
    { error: 'Network error' },
    { error: 'Network error' },
    { data: { success: true } },
  ]);

  const result = await retryAsync(
    () => axios.get('/api/data').then(r => r.data),
    { maxRetries: 3 }
  );

  expect(result.success).toBe(true);
});
```

## Contributing

When adding new test utilities:

1. Add the utility function to the appropriate file in `/tests/utils/`
2. Add JSDoc comments explaining parameters and return values
3. Create an example in the corresponding example test file
4. Update this README with the new function
5. Update the migration guide if the pattern is common

## Troubleshooting

### Tests timing out
- Check if you're awaiting all async operations
- Verify mock setup is correct
- Use `waitFor()` instead of fixed delays

### Mocks not working
- Ensure `clearAxiosMocks()` is called in `afterEach()`
- Check URL matching (exact string vs regex)
- Verify the method matches ('get', 'post', etc.)

### Query not updating
- Check if queryKey matches exactly
- Ensure QueryClient is properly provided
- Call `queryClient.invalidateQueries()` if needed

## Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [React Query Testing Guide](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
