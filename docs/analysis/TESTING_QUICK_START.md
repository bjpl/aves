# Testing Quick Start Guide

Get up and running with testing in 30 minutes.

---

## 🚀 Quick Setup (10 minutes)

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install -D @testing-library/react@^14.1.2 \
              @testing-library/jest-dom@^6.1.5 \
              @testing-library/user-event@^14.5.1 \
              @vitest/ui@^1.1.0 \
              @vitest/coverage-v8@^1.1.0 \
              jsdom@^23.0.1 \
              msw@^2.0.11

# Backend
cd ../backend
npm install -D supertest@^6.3.3 @types/supertest@^6.0.2
```

### 2. Run Your First Test

```bash
# Frontend
cd frontend
npm test

# Backend
cd ../backend
npm test
```

---

## 📁 Essential Files

### Frontend: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Frontend: `src/__tests__/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});
```

### Backend: `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
```

---

## 🧪 Write Your First Test (10 minutes)

### Component Test Example

**File:** `frontend/src/__tests__/unit/components/Button.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button', () => {
  it('should render with text', () => {
    render(<button>Click me</button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<button onClick={handleClick}>Click me</button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Service Test Example

**File:** `frontend/src/__tests__/unit/services/math.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

function add(a: number, b: number): number {
  return a + b;
}

describe('Math utilities', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-2, 3)).toBe(1);
  });
});
```

### API Test Example

**File:** `backend/src/__tests__/routes/health.test.ts`

```typescript
import request from 'supertest';
import express from 'express';

describe('Health endpoint', () => {
  const app = express();
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  it('should return healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

---

## ⚡ Common Commands (10 minutes)

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- exerciseGenerator.test.ts

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Debug Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "should generate exercise"

# Debug in VS Code
# Add breakpoint, press F5, select "Vitest" configuration
```

### View Coverage

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## 🎯 Test Patterns Cheat Sheet

### AAA Pattern
```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = { value: 5 };

  // Act: Execute the code
  const result = doSomething(input);

  // Assert: Verify the outcome
  expect(result).toBe(10);
});
```

### Testing Async Code
```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// With waitFor
it('should update UI', async () => {
  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Mocking Functions
```typescript
import { vi } from 'vitest';

it('should call callback', () => {
  const callback = vi.fn();

  doSomethingWithCallback(callback);

  expect(callback).toHaveBeenCalled();
  expect(callback).toHaveBeenCalledWith('expected', 'args');
});
```

### Mocking Modules
```typescript
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mock' }),
}));
```

### Testing User Interactions
```typescript
import userEvent from '@testing-library/user-event';

it('should type in input', async () => {
  const user = userEvent.setup();
  render(<input />);

  await user.type(screen.getByRole('textbox'), 'Hello');

  expect(screen.getByRole('textbox')).toHaveValue('Hello');
});
```

---

## 🔍 Common Queries

### Finding Elements
```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i });

// By label text
screen.getByLabelText('Username');

// By placeholder
screen.getByPlaceholderText('Enter name...');

// By text content
screen.getByText('Click me');

// By test ID (last resort)
screen.getByTestId('custom-element');
```

### Async Queries
```typescript
// Wait for element to appear
const element = await screen.findByText('Loaded');

// Wait for condition
await waitFor(() => {
  expect(screen.getByText('Done')).toBeInTheDocument();
});

// Query with timeout
const element = await screen.findByText('Slow', {}, { timeout: 3000 });
```

---

## 🛠️ Testing Fixtures

### Create Mock Data

**File:** `frontend/src/__tests__/fixtures/mockData.ts`

```typescript
export const mockUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
};

export const mockAnnotation = {
  id: 'ann-1',
  spanishTerm: 'el pico',
  englishTerm: 'beak',
  type: 'anatomical',
};

export const createMockExercise = (overrides = {}) => ({
  id: 'ex-1',
  type: 'visual_discrimination',
  instructions: 'Select the correct image',
  ...overrides,
});
```

### Use in Tests
```typescript
import { mockUser, createMockExercise } from '../fixtures/mockData';

it('should display user name', () => {
  render(<UserProfile user={mockUser} />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
});

it('should handle custom exercise', () => {
  const exercise = createMockExercise({ difficulty: 'hard' });
  // ... test with custom exercise
});
```

---

## 🎨 Coverage Best Practices

### What to Aim For
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

### How to Check Coverage
```bash
npm run test:coverage

# View in terminal
# Open HTML report: coverage/index.html
```

### Interpreting Coverage

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
exerciseGenerator.ts    |   95.23 |    88.89 |     100 |   95.00
apiAdapter.ts          |   45.45 |    33.33 |   50.00 |   44.44
```

**Good coverage:** exerciseGenerator.ts ✅
**Needs work:** apiAdapter.ts ❌

---

## 🐛 Debugging Tips

### Console Logging
```typescript
import { screen } from '@testing-library/react';

it('debug test', () => {
  render(<Component />);

  // Print entire DOM
  screen.debug();

  // Print specific element
  screen.debug(screen.getByRole('button'));
});
```

### VS Code Debugging
1. Add breakpoint in test file
2. Open "Run and Debug" panel (Ctrl+Shift+D)
3. Select "Vitest: Current Test"
4. Press F5

### Common Issues

**Error: "Cannot find element"**
```typescript
// ❌ Wrong - element not ready
expect(screen.getByText('Loading')).toBeInTheDocument();

// ✅ Correct - wait for element
const element = await screen.findByText('Loaded');
expect(element).toBeInTheDocument();
```

**Error: "Multiple elements found"**
```typescript
// ❌ Wrong - ambiguous query
screen.getByText('Submit');

// ✅ Correct - more specific
screen.getByRole('button', { name: /submit form/i });
```

**Error: "Act warning"**
```typescript
// ❌ Wrong - missing async/await
user.click(button);

// ✅ Correct - proper async handling
await user.click(button);
```

---

## 📚 Essential Resources

### Documentation
- [Vitest Docs](https://vitest.dev/) - Test runner
- [Testing Library](https://testing-library.com/react) - React testing
- [Jest Docs](https://jestjs.io/) - Backend testing
- [MSW](https://mswjs.io/) - API mocking

### Learning
- [Kent C. Dodds Testing Blog](https://kentcdodds.com/blog)
- [Testing JavaScript Course](https://testingjavascript.com/)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Cheat Sheets
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Vitest API](https://vitest.dev/api/)

---

## ✅ Week 1 Checklist

### Day 1
- [ ] Install all dependencies
- [ ] Create vitest.config.ts
- [ ] Create test setup files
- [ ] Run example test successfully

### Day 2
- [ ] Create test fixtures
- [ ] Set up MSW for API mocking
- [ ] Write first real test
- [ ] Achieve 1 passing test

### Day 3
- [ ] Complete ExerciseGenerator tests (20 tests)
- [ ] Verify >90% coverage
- [ ] All tests passing

### Day 4
- [ ] Complete Exercise API tests (12 tests)
- [ ] Test error cases
- [ ] All tests passing

### Day 5
- [ ] Set up GitHub Actions CI/CD
- [ ] Configure coverage reporting
- [ ] Add pre-commit hooks
- [ ] Documentation complete

---

## 🎯 Next Steps

After completing this quick start:

1. **Read the full implementation plan:**
   - `WEEK_1_TESTING_IMPLEMENTATION_PLAN.md`

2. **Review the complete inventory:**
   - `TEST_MODULES_INVENTORY.md`

3. **Track your progress:**
   - `TESTING_CHECKLIST.md`

4. **Start building tests:**
   - Begin with ExerciseGenerator
   - Move to API routes
   - Add component tests

---

## 💡 Pro Tips

1. **Write tests as you code** - Don't wait until the end
2. **Test behavior, not implementation** - Focus on what, not how
3. **Keep tests simple** - One assertion per test when possible
4. **Use descriptive names** - "should do X when Y" format
5. **Mock external dependencies** - Keep tests isolated
6. **Run tests often** - Use watch mode during development
7. **Maintain fixtures** - Keep test data clean and reusable
8. **Coverage is a tool** - 100% coverage ≠ perfect tests

---

**Ready to start testing?** Follow the Day 1 checklist above!

**Need help?** Check the full implementation plan or ask the team.

**Last Updated:** 2025-10-02
