# Frontend Testing Guide - AVES Phase 3

## Overview

This document outlines the comprehensive frontend testing strategy for the AVES (Avian Vocabulary Education System) application. The goal is to achieve 80%+ test coverage across 95+ component and hook files.

## Testing Infrastructure

### Test Framework

- **Vitest**: Fast unit test runner compatible with Vite
- **React Testing Library**: Component testing with user-centric queries
- **@testing-library/user-event**: Realistic user interactions
- **jsdom**: DOM environment for tests

### Configuration

- **Config File**: `frontend/vitest.config.ts`
- **Setup File**: `frontend/src/test/setup.ts`
- **Test Utils**: `frontend/src/test/test-utils.tsx`

### Test Scripts

```bash
npm run test           # Run tests in watch mode
npm run test -- --run  # Run tests once
npm run test -- --run --coverage  # Run with coverage report
```

## Test Coverage Summary

### ✅ Completed Test Files (15 files)

#### Test Utilities & Mocks (4 files)
- `frontend/src/test/mocks/queryClient.ts` - Test query client factory
- `frontend/src/test/mocks/annotations.ts` - Mock annotation data generators
- `frontend/src/test/mocks/exercises.ts` - Mock exercise data generators
- `frontend/src/test/mocks/progress.ts` - Mock progress data generators

#### Hook Tests (5 files)
- `frontend/src/__tests__/hooks/useExercise.test.ts` - 40+ test cases
- `frontend/src/__tests__/hooks/useAnnotations.test.ts` - 25+ test cases
- `frontend/src/__tests__/hooks/useProgress.test.ts` - 50+ test cases
- `frontend/src/__tests__/hooks/useDisclosure.test.ts` - 30+ test cases
- `frontend/src/__tests__/hooks/useSpecies.test.ts` - 25+ test cases

#### UI Component Tests (3 files)
- `frontend/src/__tests__/components/ui/Button.test.tsx` - 25+ test cases
- `frontend/src/__tests__/components/ui/Card.test.tsx` - 20+ test cases
- `frontend/src/__tests__/components/ui/Modal.test.tsx` - 25+ test cases

#### Service Tests (2 files)
- `frontend/src/__tests__/services/exerciseGenerator.test.ts` (existing)

### 🔄 In Progress / Remaining

#### Remaining Hooks (6 hooks to test)
- `useAIAnnotations` - AI-powered annotations
- `useAIExercise` - AI-generated exercises
- `useCMS` - Content management
- `useExerciseQuery` - Exercise queries
- `useProgressQuery` - Progress queries
- `useMobileDetect` - Mobile detection

#### UI Components (7 components to test)
- Input, Alert, Badge, Tabs, Tooltip, Skeleton, ProgressBar

#### Exercise Components (5 components to test)
- ExerciseContainer, VisualDiscrimination, VisualIdentification, ContextualFill, AIExerciseContainer

#### Annotation Components (5 components to test)
- AnnotationCanvas, ResponsiveAnnotationCanvas, CanvasLayer, StaticLayer, InteractiveLayer, HoverLayer

#### Practice/Learn Components (8 components to test)
- ExerciseRenderer, PracticeStats, FeedbackDisplay
- BirdSelector, VocabularyPanel, ProgressSection, InteractiveBirdImage

#### Admin Components (3 components to test)
- ImageImporter, AnnotationReviewCard, AnnotationBatchActions

#### Services (4 services to test)
- apiAdapter, clientDataService, unsplashService, aiExerciseService

## Test Patterns & Best Practices

### 1. Hook Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create wrapper for hooks that use React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCustomHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCustomHook(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeDefined();
  });

  it('should update state on action', async () => {
    const { result } = renderHook(() => useCustomHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.performAction();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveChanged();
    });
  });
});
```

### 2. Component Testing Pattern

```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { MyComponent } from '../../../components/MyComponent';

describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<MyComponent onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle async updates', async () => {
    render(<MyComponent />);

    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument();
    });
  });
});
```

### 3. Service Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiAdapter } from '../../../services/apiAdapter';
import axios from 'axios';

vi.mock('axios');

describe('apiAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (axios.get as any).mockResolvedValue({ data: { data: [] } });
  });

  it('should fetch data from API', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    (axios.get as any).mockResolvedValue({ data: { data: mockData } });

    const result = await apiAdapter.getData();

    expect(result).toEqual(mockData);
    expect(axios.get).toHaveBeenCalledWith('/api/data');
  });

  it('should fallback to client storage on error', async () => {
    (axios.get as any).mockRejectedValue(new Error('Network error'));

    const result = await apiAdapter.getData();

    expect(result).toBeDefined(); // Should return fallback data
  });
});
```

## Test Organization

### Directory Structure

```
frontend/src/
├── __tests__/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.test.tsx
│   │   │   ├── Card.test.tsx
│   │   │   └── Modal.test.tsx
│   │   ├── exercises/
│   │   │   ├── ExerciseContainer.test.tsx
│   │   │   └── VisualDiscrimination.test.tsx
│   │   └── annotation/
│   │       └── AnnotationCanvas.test.tsx
│   ├── hooks/
│   │   ├── useExercise.test.ts
│   │   ├── useAnnotations.test.ts
│   │   └── useProgress.test.ts
│   ├── services/
│   │   ├── exerciseGenerator.test.ts
│   │   ├── apiAdapter.test.ts
│   │   └── clientDataService.test.ts
│   └── example.test.tsx (template)
├── test/
│   ├── setup.ts
│   ├── test-utils.tsx
│   └── mocks/
│       ├── annotations.ts
│       ├── exercises.ts
│       ├── progress.ts
│       └── queryClient.ts
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Mock files: Place in `test/mocks/`
- One test file per source file
- Mirror source file structure in `__tests__/`

## Coverage Goals

### Target: 80%+ Overall Coverage

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Priority Coverage Areas

1. **Critical User Paths** (95%+ coverage required)
   - Exercise generation and validation
   - Progress tracking and persistence
   - Annotation display and interaction

2. **Core Hooks** (90%+ coverage required)
   - useExercise, useAnnotations, useProgress
   - useAIExercise, useAIAnnotations
   - useSpecies, useCMS

3. **UI Components** (85%+ coverage required)
   - Exercise components
   - UI library components
   - Practice/Learn components

4. **Services** (90%+ coverage required)
   - apiAdapter (dual-mode: backend/client)
   - clientDataService (IndexedDB)
   - exerciseGenerator

### Excluded from Coverage

- Type definition files (`*.d.ts`)
- Configuration files (`*.config.ts`)
- Mock data files
- Test files themselves

## Common Testing Patterns

### 1. Testing Async Operations

```typescript
it('should fetch data asynchronously', async () => {
  const { result } = renderHook(() => useAsyncHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### 2. Testing User Interactions

```typescript
it('should handle button click', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<Button onClick={onClick}>Click Me</Button>);

  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

### 3. Testing Forms

```typescript
it('should submit form with values', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

### 4. Testing Error States

```typescript
it('should display error message on failure', async () => {
  (api.getData as any).mockRejectedValue(new Error('API Error'));

  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### 5. Testing Loading States

```typescript
it('should show loading spinner', () => {
  render(<Button isLoading>Submit</Button>);

  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
});
```

## Mocking Strategies

### 1. Mocking API Calls

```typescript
vi.mock('axios');

beforeEach(() => {
  (axios.get as any).mockResolvedValue({ data: mockData });
});
```

### 2. Mocking React Query

```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
```

### 3. Mocking LocalStorage/SessionStorage

```typescript
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

it('should store session ID', () => {
  sessionStorage.setItem('session-id', '123');
  expect(sessionStorage.getItem('session-id')).toBe('123');
});
```

### 4. Mocking Timers

```typescript
vi.useFakeTimers();

it('should debounce search', async () => {
  const user = userEvent.setup({ delay: null });

  render(<SearchInput />);

  await user.type(screen.getByRole('textbox'), 'query');
  vi.advanceTimersByTime(300);

  expect(mockSearch).toHaveBeenCalledWith('query');
});

vi.useRealTimers();
```

## Accessibility Testing

### Test for ARIA Attributes

```typescript
it('should have proper ARIA attributes', () => {
  render(<Modal isOpen title="Test Modal" />);

  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby');
});
```

### Test Keyboard Navigation

```typescript
it('should be keyboard accessible', async () => {
  const user = userEvent.setup();

  render(<Button>Click Me</Button>);

  const button = screen.getByRole('button');
  button.focus();
  await user.keyboard('{Enter}');

  expect(mockOnClick).toHaveBeenCalled();
});
```

## Performance Testing

### Test Memoization

```typescript
it('should memoize expensive calculations', () => {
  const { result, rerender } = renderHook(() => useExpensiveCalculation(props));

  const firstResult = result.current.value;

  rerender();

  expect(result.current.value).toBe(firstResult); // Same reference
});
```

### Test Lazy Loading

```typescript
it('should lazy load images', () => {
  render(<LazyImage src="/image.jpg" />);

  const img = screen.getByRole('img');
  expect(img).toHaveAttribute('loading', 'lazy');
});
```

## Continuous Integration

### Running Tests in CI

```yaml
# .github/workflows/test.yml
- name: Run Frontend Tests
  run: |
    cd frontend
    npm ci
    npm run test -- --run --coverage
```

### Coverage Reporting

Tests generate coverage reports in:
- **HTML**: `frontend/coverage/index.html`
- **JSON**: `frontend/coverage/coverage-final.json`
- **Text**: Terminal output

## Debugging Tests

### Run Single Test File

```bash
npm run test -- src/__tests__/hooks/useExercise.test.ts
```

### Run Tests in Watch Mode

```bash
npm run test
```

### Run with Verbose Output

```bash
npm run test -- --reporter=verbose
```

### Debug with VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest",
  "program": "${workspaceFolder}/frontend/node_modules/vitest/vitest.mjs",
  "args": ["--run"],
  "cwd": "${workspaceFolder}/frontend"
}
```

## Next Steps

1. **Complete remaining hook tests** (6 hooks)
2. **Add UI component tests** (7 components)
3. **Test exercise components** (5 components)
4. **Test service layer** (4 services)
5. **Run full coverage analysis**
6. **Fill gaps to reach 80%+ coverage**
7. **Document edge cases and known limitations**

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://testing-library.com/docs/queries/about#priority)

---

**Last Updated**: 2025-10-03
**Coverage Status**: 15/95 files tested (~16%)
**Target**: 80%+ coverage across all files
