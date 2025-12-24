# Migration Cheat Sheet - Quick Reference

## One-Page Quick Reference

### Essential Imports
```typescript
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosGet, mockAxiosPost, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';
import { waitForLoadingToFinish, flushPromises } from '@/test-utils/async-test-helpers';
import userEvent from '@testing-library/user-event';
```

---

## Find & Replace Guide

| Find This | Replace With | Context |
|-----------|--------------|---------|
| `new QueryClient({...})` | `createTestQueryClient()` | QueryClient setup |
| `<QueryClientProvider client={queryClient}>` | Use `renderWithQuery()` instead | Rendering |
| `jest.spyOn(axios, 'get').mockResolvedValue({data:...})` | `mockAxiosGet('/url', data)` | GET mocking |
| `jest.spyOn(axios, 'post').mockResolvedValue({data:...})` | `mockAxiosPost('/url', data)` | POST mocking |
| `jest.spyOn(axios, 'get').mockRejectedValue(...)` | `mockAxiosError('get', '/url', 'msg')` | Error mocking |
| `await new Promise(resolve => setTimeout(resolve, N))` | `await flushPromises()` | Async waiting |
| `fireEvent.click(element)` | `await user.click(element)` | User interaction |
| `fireEvent.change(input, {target:{value:'x'}})` | `await user.type(input, 'x')` | Input typing |
| `jest.fn()` | `vi.fn()` | Vitest migration |
| `jest.restoreAllMocks()` | `clearAxiosMocks()` | Cleanup |

---

## Top 10 Patterns

### 1. Basic Component Test
```typescript
const queryClient = createTestQueryClient();
renderWithQuery(<Component />, { queryClient });
```

### 2. Mock GET Request
```typescript
mockAxiosGet('/api/endpoint', { data: 'value' });
```

### 3. Mock POST Request
```typescript
mockAxiosPost('/api/endpoint', { id: '123' });
```

### 4. Mock Error
```typescript
mockAxiosError('get', '/api/endpoint', 'Error message', 500);
```

### 5. Wait for Loading
```typescript
await waitForLoadingToFinish(() => screen.queryByTestId('loader'));
```

### 6. User Interaction
```typescript
const user = userEvent.setup();
await user.click(screen.getByText('Button'));
```

### 7. Cleanup
```typescript
afterEach(() => {
  clearAxiosMocks();
});
```

### 8. Flush Promises
```typescript
await flushPromises();
```

### 9. Wait for Assertion
```typescript
await waitFor(() => {
  expect(screen.getByText('Text')).toBeInTheDocument();
});
```

### 10. Mock Sequence (Retry)
```typescript
mockAxiosSequence('get', '/api/endpoint', [
  { error: 'Fail' },
  { data: 'Success' }
]);
```

---

## Before/After Code Blocks

### QueryClient Setup
```typescript
// ❌ Before (17 lines)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
});

// ✅ After (1 line)
const queryClient = createTestQueryClient();
```

### Axios Mocking
```typescript
// ❌ Before (7 lines)
jest.spyOn(axios, 'get').mockResolvedValue({
  data: mockData,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

// ✅ After (1 line)
mockAxiosGet('/api/endpoint', mockData);
```

### Component Rendering
```typescript
// ❌ Before (5 lines)
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);

// ✅ After (1 line)
renderWithQuery(<Component />, { queryClient });
```

### Error Handling
```typescript
// ❌ Before (3 lines)
jest.spyOn(axios, 'get').mockRejectedValue(
  new Error('Network error')
);

// ✅ After (1 line)
mockAxiosError('get', '/api/endpoint', 'Network error', 500);
```

### Async Waiting
```typescript
// ❌ Before (3 lines)
await new Promise(resolve =>
  setTimeout(resolve, 100)
);

// ✅ After (1 line)
await flushPromises();
```

---

## Regex Patterns for Mass Find/Replace

### Replace QueryClient Constructor
```
Find: new QueryClient\(\{[^}]*\}\)
Replace: createTestQueryClient()
```

### Replace Axios GET Spy
```
Find: jest\.spyOn\(axios, 'get'\)\.mockResolvedValue\(\{[\s\S]*?data: ([^,]+),[\s\S]*?\}\)
Replace: mockAxiosGet('ENDPOINT_HERE', $1)
```

### Replace setTimeout Promise
```
Find: await new Promise\(resolve => setTimeout\(resolve, \d+\)\)
Replace: await flushPromises()
```

### Replace fireEvent.click
```
Find: fireEvent\.click\(([^)]+)\)
Replace: await user.click($1)
```

### Replace jest with vi
```
Find: jest\.(fn|mock|spyOn|clearAllMocks)
Replace: vi.$1
```

---

## Common Error Scenarios

### Error: Import not found
```typescript
// Issue: Wrong import path
import { renderWithQuery } from '../utils/react-query-helpers';

// Fix: Use @ alias
import { renderWithQuery } from '@/test-utils/react-query-helpers';
```

### Error: Test timeout
```typescript
// Issue: Not waiting for async
render(<Component />);
expect(screen.getByText('Data')).toBeInTheDocument();

// Fix: Wait properly
render(<Component />);
await waitFor(() => {
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

### Error: Mock not applied
```typescript
// Issue: Wrong cleanup
afterEach(() => {
  jest.restoreAllMocks(); // Only restores jest mocks
});

// Fix: Clear axios mocks
afterEach(() => {
  clearAxiosMocks(); // Clears our mock helpers
});
```

### Error: Query cache pollution
```typescript
// Issue: Reusing same queryClient
const queryClient = createTestQueryClient(); // Outside test

it('test 1', () => { /* uses queryClient */ });
it('test 2', () => { /* polluted cache! */ });

// Fix: Create fresh client per test
it('test 1', () => {
  const queryClient = createTestQueryClient();
});
```

---

## HTTP Methods Quick Reference

| Method | Function | Usage |
|--------|----------|-------|
| GET | `mockAxiosGet('/url', data)` | Fetch data |
| POST | `mockAxiosPost('/url', data)` | Create resource |
| PUT | `mockAxiosPut('/url', data)` | Update resource |
| DELETE | `mockAxiosDelete('/url', data)` | Delete resource |
| PATCH | `mockAxiosPatch('/url', data)` | Partial update |

## Error Scenarios Quick Reference

| Scenario | Function | Usage |
|----------|----------|-------|
| Generic Error | `mockAxiosError('get', '/url', 'msg', 500)` | Any error |
| Network Error | `mockAxiosNetworkError('get', '/url')` | Network failure |
| Timeout | `mockAxiosTimeout('get', '/url')` | Request timeout |
| 401 Unauthorized | `mockAxiosUnauthorized('get', '/url')` | Auth required |
| 404 Not Found | `mockAxiosNotFound('get', '/url')` | Resource missing |

---

## Test Structure Template

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosGet, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';
import { waitForLoadingToFinish } from '@/test-utils/async-test-helpers';

describe('ComponentName', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should do something', async () => {
    // 1. Setup mocks
    mockAxiosGet('/api/endpoint', mockData);

    // 2. Setup user interaction
    const user = userEvent.setup();

    // 3. Render component
    const queryClient = createTestQueryClient();
    renderWithQuery(<Component />, { queryClient });

    // 4. Wait for loading
    await waitForLoadingToFinish(() => screen.queryByTestId('loader'));

    // 5. Interact
    await user.click(screen.getByText('Button'));

    // 6. Assert
    await waitFor(() => {
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

---

## Estimated Time Savings

| Task | Before | After | Savings |
|------|--------|-------|---------|
| QueryClient setup | 17 lines | 1 line | 94% |
| Axios mock setup | 7 lines | 1 line | 86% |
| Component render | 5 lines | 1 line | 80% |
| Error mock | 3 lines | 1 line | 67% |
| Async wait | 3 lines | 1 line | 67% |
| **Total per test** | **~35 lines** | **~10 lines** | **~70%** |

---

## Priority Migration Order

1. **High Priority** (Do First)
   - Tests with manual QueryClient setup
   - Tests with complex axios mocking
   - Tests with setTimeout promises

2. **Medium Priority** (Do Next)
   - Tests with fireEvent usage
   - Tests with error scenarios
   - Tests with loading states

3. **Low Priority** (Optional)
   - Tests that already work well
   - Simple component tests
   - Snapshot tests

---

## Quick Validation Checklist

After migrating each file:
- [ ] All imports use `@/test-utils`
- [ ] No manual QueryClient configuration
- [ ] No axios spy setup in beforeEach
- [ ] `clearAxiosMocks()` in afterEach
- [ ] Using `userEvent` instead of `fireEvent`
- [ ] No `setTimeout` promises
- [ ] Tests pass without warnings
- [ ] Code is more readable

---

## Copy-Paste Snippets

### Full Test File Template
```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosGet, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';

describe('ComponentName', () => {
  afterEach(() => clearAxiosMocks());

  it('should render and fetch data', async () => {
    mockAxiosGet('/api/data', { id: '1', name: 'Test' });
    const queryClient = createTestQueryClient();
    renderWithQuery(<Component />, { queryClient });
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
  });
});
```

### afterEach Block
```typescript
afterEach(() => {
  clearAxiosMocks();
});
```

### User Setup
```typescript
const user = userEvent.setup();
```

### QueryClient
```typescript
const queryClient = createTestQueryClient();
```

### Render with Query
```typescript
renderWithQuery(<Component />, { queryClient });
```

---

## Need Help?

- See full examples: `/tests/examples/`
- Migration guide: `/tests/migration-guide.md`
- Detailed templates: `/tests/migration-templates.md`
- Utility docs: `/tests/utils/`

---

**Remember**: Start small, test often, migrate incrementally. The utilities are designed to make your tests cleaner and more maintainable, not to force a complete rewrite.
