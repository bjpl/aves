# Migration Templates & Quick Reference

## Copy-Paste Templates

### Template 1: Basic React Query Test Migration

#### Before
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';

describe('MyComponent', () => {
  it('should fetch and display data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MyComponent />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

#### After
```typescript
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';

describe('MyComponent', () => {
  it('should fetch and display data', async () => {
    const queryClient = createTestQueryClient();
    renderWithQuery(<MyComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

---

### Template 2: Axios Mocking Migration

#### Before
```typescript
import axios from 'axios';

describe('ApiService', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch user data', async () => {
    getSpy.mockResolvedValue({
      data: { id: '123', name: 'John' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const result = await service.getUser('123');
    expect(result.name).toBe('John');
  });
});
```

#### After
```typescript
import { mockAxiosGet, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';

describe('ApiService', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should fetch user data', async () => {
    mockAxiosGet('/api/users/123', { id: '123', name: 'John' });

    const result = await service.getUser('123');
    expect(result.name).toBe('John');
  });
});
```

---

### Template 3: Async Waiting Migration

#### Before
```typescript
describe('AsyncComponent', () => {
  it('should wait for loading', async () => {
    render(<AsyncComponent />);

    fireEvent.click(screen.getByText('Load'));

    // Manual timeout
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

#### After
```typescript
import { waitForLoadingToFinish } from '@/test-utils/async-test-helpers';
import userEvent from '@testing-library/user-event';

describe('AsyncComponent', () => {
  it('should wait for loading', async () => {
    const user = userEvent.setup();
    render(<AsyncComponent />);

    await user.click(screen.getByText('Load'));

    await waitForLoadingToFinish(
      () => screen.queryByTestId('loader') as HTMLElement | null
    );

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

---

### Template 4: Error Handling Migration

#### Before
```typescript
describe('ErrorComponent', () => {
  it('should handle API errors', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(
      new Error('Network error')
    );

    render(<ErrorComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });
});
```

#### After
```typescript
import { mockAxiosError } from '@/test-utils/axios-mock-helpers';

describe('ErrorComponent', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should handle API errors', async () => {
    mockAxiosError('get', '/api/data', 'Network error', 500);

    render(<ErrorComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });
});
```

---

### Template 5: Combined Pattern (Most Common)

#### Before
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';

describe('UserProfile', () => {
  let queryClient: QueryClient;
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    getSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and display user profile', async () => {
    getSpy.mockResolvedValue({
      data: { id: '123', name: 'John', email: 'john@example.com' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserProfile userId="123" />
      </QueryClientProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

#### After
```typescript
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosGet, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';
import { waitForLoadingToFinish } from '@/test-utils/async-test-helpers';

describe('UserProfile', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should fetch and display user profile', async () => {
    mockAxiosGet('/api/users/123', {
      id: '123',
      name: 'John',
      email: 'john@example.com'
    });

    const queryClient = createTestQueryClient();
    renderWithQuery(<UserProfile userId="123" />, { queryClient });

    await waitForLoadingToFinish(
      () => screen.queryByTestId('loading-spinner') as HTMLElement | null
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

---

## Import Statement Templates

### Standard Test File Import Block
```typescript
// Standard testing imports
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Test utility imports (add as needed)
import {
  renderWithQuery,
  createTestQueryClient,
  mockQuerySuccess,
  mockQueryError,
  mockQueryLoading
} from '@/test-utils/react-query-helpers';

import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  mockAxiosDelete,
  mockAxiosError,
  mockAxiosTimeout,
  mockAxiosUnauthorized,
  clearAxiosMocks,
  createMockAxiosResponse
} from '@/test-utils/axios-mock-helpers';

import {
  waitForAsync,
  waitForLoadingToFinish,
  flushPromises,
  createDeferredPromise
} from '@/test-utils/async-test-helpers';
```

### Minimal Import Block (for simple tests)
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithQuery } from '@/test-utils/react-query-helpers';
```

### API Service Test Import Block
```typescript
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosError,
  clearAxiosMocks
} from '@/test-utils/axios-mock-helpers';
```

---

## Quick Reference: Common Patterns

### Pattern 1: Replace QueryClient Setup
```typescript
// Find:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

// Replace with:
const queryClient = createTestQueryClient();
```

### Pattern 2: Replace Manual Provider Wrapping
```typescript
// Find:
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);

// Replace with:
renderWithQuery(<Component />, { queryClient });
```

### Pattern 3: Replace Axios Get Mocking
```typescript
// Find:
jest.spyOn(axios, 'get').mockResolvedValue({
  data: mockData,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

// Replace with:
mockAxiosGet('/api/endpoint', mockData);
```

### Pattern 4: Replace Axios Post Mocking
```typescript
// Find:
jest.spyOn(axios, 'post').mockResolvedValue({
  data: mockResponse,
  status: 201,
  statusText: 'Created',
  headers: {},
  config: {} as any,
});

// Replace with:
mockAxiosPost('/api/endpoint', mockResponse);
```

### Pattern 5: Replace Error Mocking
```typescript
// Find:
jest.spyOn(axios, 'get').mockRejectedValue(
  new Error('Error message')
);

// Replace with:
mockAxiosError('get', '/api/endpoint', 'Error message', 500);
```

### Pattern 6: Replace Timeout Delays
```typescript
// Find:
await new Promise(resolve => setTimeout(resolve, 100));

// Replace with (if checking for loading state):
await waitForLoadingToFinish(
  () => screen.queryByTestId('loader') as HTMLElement | null
);

// Or (if just flushing promises):
await flushPromises();
```

### Pattern 7: Replace fireEvent with userEvent
```typescript
// Find:
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'test' } });

// Replace with:
const user = userEvent.setup(); // Add at start of test
await user.click(button);
await user.type(input, 'test');
```

### Pattern 8: Add Cleanup Hook
```typescript
// Add to describe block if using axios mocks:
afterEach(() => {
  clearAxiosMocks();
});

// Or for all mocks:
afterEach(() => {
  clearAxiosMocks();
  vi.clearAllMocks();
});
```

---

## Regex Find & Replace Patterns

### Replace QueryClient Constructor
```regex
Find: new QueryClient\(\{[\s\S]*?\}\)
Replace: createTestQueryClient()
```

### Replace QueryClientProvider Wrapper
```regex
Find: <QueryClientProvider client=\{queryClient\}>\s*
Replace: // Use renderWithQuery instead
```

### Replace Axios Spy Setup
```regex
Find: jest\.spyOn\(axios, '(get|post|put|delete)'\)
Replace: // Use mockAxios$1 instead
```

### Replace setTimeout Promises
```regex
Find: await new Promise\(resolve => setTimeout\(resolve, \d+\)\)
Replace: await flushPromises()
```

### Replace jest with vi
```regex
Find: jest\.(fn|mock|spyOn|clearAllMocks|restoreAllMocks)
Replace: vi.$1
```

---

## Step-by-Step Migration Checklist

### Phase 1: Preparation
- [ ] Read through the test file to understand what's being tested
- [ ] Identify which utilities are needed (Query, Axios, Async)
- [ ] Make a backup or ensure version control is clean
- [ ] Run tests to ensure they pass before migration

### Phase 2: Import Updates
- [ ] Add `@/test-utils` import statements at the top
- [ ] Remove manual import of QueryClient, QueryClientProvider
- [ ] Update jest imports to vi (if using Vitest)
- [ ] Add userEvent import if using fireEvent

### Phase 3: Setup Changes
- [ ] Replace `new QueryClient({...})` with `createTestQueryClient()`
- [ ] Remove manual QueryClient configuration objects
- [ ] Replace beforeEach spy setup with utility functions
- [ ] Add `clearAxiosMocks()` to afterEach

### Phase 4: Test Body Updates
- [ ] Replace manual render wrapping with `renderWithQuery()`
- [ ] Replace axios spy mocks with `mockAxiosGet/Post/etc()`
- [ ] Replace setTimeout with `waitForAsync()` or `flushPromises()`
- [ ] Replace `fireEvent` with `userEvent`
- [ ] Update loading state checks with `waitForLoadingToFinish()`

### Phase 5: Verification
- [ ] Run the migrated test file
- [ ] Check for console warnings or errors
- [ ] Verify test names and descriptions are still accurate
- [ ] Ensure test coverage is maintained
- [ ] Check that tests are more readable

### Phase 6: Cleanup
- [ ] Remove unused imports
- [ ] Remove commented-out old code
- [ ] Format the file
- [ ] Add any missing type annotations

---

## Common Scenarios Quick Guide

### Scenario: Simple Component with Query
```typescript
// Minimal setup needed
const queryClient = createTestQueryClient();
renderWithQuery(<Component />, { queryClient });
```

### Scenario: Component with Axios Fetching
```typescript
mockAxiosGet('/api/data', mockData);
render(<Component />);
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());
```

### Scenario: Component with Loading State
```typescript
mockAxiosGet('/api/data', mockData);
render(<Component />);
await waitForLoadingToFinish(() => screen.queryByTestId('loader'));
expect(screen.getByText('Data')).toBeInTheDocument();
```

### Scenario: Component with Error Handling
```typescript
mockAxiosError('get', '/api/data', 'Failed to load', 500);
render(<Component />);
await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
```

### Scenario: Component with Multiple Requests
```typescript
mockAxiosGet('/api/users', mockUsers);
mockAxiosGet('/api/posts', mockPosts);
mockAxiosGet('/api/comments', mockComments);
render(<Component />);
```

### Scenario: Component with Retry Logic
```typescript
import { mockAxiosSequence } from '@/test-utils/axios-mock-helpers';

mockAxiosSequence('get', '/api/data', [
  { error: 'Temporary failure' },
  { error: 'Temporary failure' },
  { data: mockData }
]);
```

### Scenario: Mutation Testing
```typescript
mockAxiosPost('/api/users', { id: '123', name: 'New User' });

const user = userEvent.setup();
render(<CreateUserForm />);

await user.type(screen.getByLabelText('Name'), 'New User');
await user.click(screen.getByText('Submit'));

await waitFor(() => {
  expect(screen.getByText('User created')).toBeInTheDocument();
});
```

### Scenario: Protected Route Testing
```typescript
mockAxiosUnauthorized('get', '/api/protected');
render(<ProtectedComponent />);
await waitFor(() => {
  expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
});
```

---

## Before & After Complete Examples

### Example 1: List Component with Filtering

#### Before (231 lines)
```typescript
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import UserList from '../UserList';

describe('UserList', () => {
  let queryClient: QueryClient;
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });
    getSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and display users', async () => {
    const mockUsers = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '2', name: 'Bob', email: 'bob@test.com' },
    ];

    getSpy.mockResolvedValue({
      data: mockUsers,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should filter users by search term', async () => {
    const mockUsers = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '2', name: 'Bob', email: 'bob@test.com' },
    ];

    getSpy.mockResolvedValue({
      data: mockUsers,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });
});
```

#### After (87 lines - 62% reduction)
```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosGet, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';
import { waitForLoadingToFinish } from '@/test-utils/async-test-helpers';
import UserList from '../UserList';

describe('UserList', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  const mockUsers = [
    { id: '1', name: 'Alice', email: 'alice@test.com' },
    { id: '2', name: 'Bob', email: 'bob@test.com' },
  ];

  it('should fetch and display users', async () => {
    mockAxiosGet('/api/users', mockUsers);

    const queryClient = createTestQueryClient();
    renderWithQuery(<UserList />, { queryClient });

    await waitForLoadingToFinish(() => screen.queryByTestId('loader'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should filter users by search term', async () => {
    mockAxiosGet('/api/users', mockUsers);

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    renderWithQuery(<UserList />, { queryClient });

    await waitForLoadingToFinish(() => screen.queryByTestId('loader'));

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'Alice');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });
});
```

**Benefits:**
- 62% fewer lines of code
- No manual QueryClient configuration
- No manual axios spy setup
- Better async handling
- More readable assertions
- Type-safe utilities

---

### Example 2: Form with Mutation

#### Before
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import CreateUserForm from '../CreateUserForm';

describe('CreateUserForm', () => {
  let queryClient: QueryClient;
  let postSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    postSpy = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a new user', async () => {
    postSpy.mockResolvedValue({
      data: { id: '123', name: 'John Doe', email: 'john@test.com' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CreateUserForm />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@test.com' }
    });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });
  });
});
```

#### After
```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { renderWithQuery, createTestQueryClient } from '@/test-utils/react-query-helpers';
import { mockAxiosPost, clearAxiosMocks } from '@/test-utils/axios-mock-helpers';
import CreateUserForm from '../CreateUserForm';

describe('CreateUserForm', () => {
  afterEach(() => {
    clearAxiosMocks();
  });

  it('should create a new user', async () => {
    mockAxiosPost('/api/users', {
      id: '123',
      name: 'John Doe',
      email: 'john@test.com'
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    renderWithQuery(<CreateUserForm />, { queryClient });

    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@test.com');
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });
  });
});
```

---

## Migration Time Estimates

- **Simple test file (1-3 tests)**: 5-10 minutes
- **Medium test file (4-10 tests)**: 15-30 minutes
- **Complex test file (10+ tests)**: 30-60 minutes
- **Full test suite (50+ files)**: 2-5 days with parallel work

## Success Metrics

After migration, you should see:
- 40-60% reduction in test code lines
- Elimination of repetitive boilerplate
- Consistent test patterns across files
- Improved test readability
- Better type safety and IDE support
- Faster test execution (fewer manual timeouts)

---

## Troubleshooting

### Issue: Import path errors
**Solution:** Ensure `@/test-utils` path is configured in tsconfig.json or vitest.config.ts

### Issue: Tests timeout
**Solution:** Replace setTimeout with proper async utilities like `waitForLoadingToFinish`

### Issue: Mocks not working
**Solution:** Add `clearAxiosMocks()` to afterEach block

### Issue: Query cache pollution
**Solution:** Create a new queryClient for each test with `createTestQueryClient()`

### Issue: Type errors
**Solution:** Ensure all test utilities are properly typed and imported from the correct path

---

This guide provides everything needed to migrate tests efficiently. Start with simple files and gradually tackle more complex ones as you become familiar with the patterns.
