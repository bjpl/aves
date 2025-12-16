# Contributing to Aves

Thank you for your interest in contributing to Aves, a Visual Spanish Bird Learning Platform! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Documentation Standards](#documentation-standards)
- [Troubleshooting](#troubleshooting)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to foster an open and welcoming environment.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js**: v18.x or higher (v20.x recommended)
- **npm**: v9.x or higher
- **Git**: Latest stable version
- **Code Editor**: VS Code recommended (with ESLint and Prettier extensions)

### Fork and Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aves.git
   cd aves
   ```
3. **Add upstream remote** to keep your fork synchronized:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/aves.git
   ```

### Setup

1. **Install dependencies** (uses npm workspaces):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Copy example environment files
   cp apps/frontend/.env.example apps/frontend/.env.local
   cp apps/backend/.env.example apps/backend/.env
   ```

   Edit the `.env` files with appropriate values for your local development environment.

3. **Verify setup** by running tests:
   ```bash
   npm test
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```
   This starts both frontend (typically http://localhost:5173) and backend (typically http://localhost:3000) servers concurrently.

## Development Workflow

### Branch Naming

Create feature branches with descriptive names following this convention:

- **Features**: `feature/short-description` (e.g., `feature/add-audio-playback`)
- **Bug fixes**: `fix/short-description` (e.g., `fix/login-validation`)
- **Documentation**: `docs/short-description` (e.g., `docs/update-api-guide`)
- **Refactoring**: `refactor/short-description` (e.g., `refactor/extract-bird-service`)
- **Tests**: `test/short-description` (e.g., `test/add-exercise-coverage`)
- **Chores**: `chore/short-description` (e.g., `chore/update-dependencies`)

**Example workflow**:
```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/add-pronunciation-guide

# Make your changes, commit, and push
git add .
git commit -m "feat: add pronunciation guide component"
git push origin feature/add-pronunciation-guide
```

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)
- `ci`: CI/CD configuration changes

**Examples**:
```bash
feat: add spaced repetition algorithm for exercise scheduling
fix: resolve image loading race condition on Learn page
docs: update API documentation for bird endpoints
test: add integration tests for authentication flow
refactor: extract exercise logic into separate service
perf: optimize bird data fetching with caching
```

**Scope examples** (optional but encouraged):
```bash
feat(frontend): add dark mode toggle
fix(backend): resolve CORS configuration issue
test(shared): add validation tests for bird schema
```

### Keeping Your Fork Updated

Regularly sync your fork with the upstream repository:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

## Code Style

### TypeScript Standards

- **Strict Mode**: TypeScript strict mode is enabled. All code must pass strict type checking.
- **Type Safety**: Avoid `any` types. Use `unknown` with proper type guards when necessary.
- **Interfaces over Types**: Prefer interfaces for object shapes, types for unions/intersections.
- **Explicit Return Types**: Define return types for functions, especially in public APIs.

**Example**:
```typescript
// ✅ Good
interface BirdData {
  id: string;
  name: string;
  scientificName: string;
}

function fetchBird(id: string): Promise<BirdData> {
  return api.get(`/birds/${id}`);
}

// ❌ Avoid
function fetchBird(id: any): any {
  return api.get(`/birds/${id}`);
}
```

### ESLint

ESLint configuration is enforced across the project. Run linting before committing:

```bash
# Lint all packages
npm run lint

# Auto-fix issues where possible
npm run lint:fix
```

**Key Rules**:
- No unused variables (prefix with `_` if intentionally unused)
- No console statements in production code (use proper logging)
- Consistent import ordering
- Proper React hooks usage

### Prettier

Code formatting is handled by Prettier. Configuration is shared across workspaces.

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

**VS Code Setup**: Install the Prettier extension and enable "Format on Save" in settings.

### File Naming Conventions

- **Components**: PascalCase (e.g., `BirdCard.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `useFetchBirds.ts`, `formatDate.ts`)
- **Tests**: Match source file with `.test.ts` or `.spec.ts` suffix
- **Types**: PascalCase for interfaces/types in dedicated files (e.g., `BirdTypes.ts`)

## Testing Requirements

### Coverage Thresholds

Maintain **minimum 75% code coverage** across:
- Statements: 75%
- Branches: 75%
- Functions: 75%
- Lines: 75%

Coverage is enforced in CI/CD. PRs that reduce coverage below thresholds will not be merged.

### Unit Tests

Write unit tests for:
- Utility functions
- React hooks
- Service layer functions
- State management logic
- Validation functions

**Framework**: Jest (backend/shared), Vitest (frontend)

**Example**:
```typescript
// src/utils/formatDate.test.ts
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('should format date to Spanish locale', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'es')).toBe('15 de enero de 2024');
  });

  it('should handle invalid dates', () => {
    expect(() => formatDate(null as any, 'es')).toThrow();
  });
});
```

### Integration Tests

Write integration tests for:
- API endpoints (backend)
- Component interactions (frontend)
- Database operations
- Authentication flows

**Example**:
```typescript
// apps/backend/src/routes/birds.test.ts
import request from 'supertest';
import app from '../app';

describe('GET /api/birds', () => {
  it('should return list of birds', async () => {
    const response = await request(app)
      .get('/api/birds')
      .expect(200);

    expect(response.body).toHaveLength(greaterThan(0));
    expect(response.body[0]).toHaveProperty('name');
  });
});
```

### End-to-End Tests

Write E2E tests for:
- Critical user journeys
- Authentication flows
- Complex interactions across multiple pages

**Framework**: Playwright

**Example**:
```typescript
// tests/e2e/learn-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete a bird learning exercise', async ({ page }) => {
  await page.goto('/learn');
  await page.click('[data-testid="start-lesson"]');

  // Complete exercise
  await page.click('[data-testid="answer-option-1"]');
  await page.click('[data-testid="submit-answer"]');

  // Verify feedback
  await expect(page.locator('[data-testid="feedback"]')).toBeVisible();
});
```

### Test Organization

```
apps/
  frontend/
    src/
      components/
        BirdCard.tsx
        BirdCard.test.tsx
      hooks/
        useFetchBirds.ts
        useFetchBirds.test.ts
  backend/
    src/
      routes/
        birds.ts
        birds.test.ts
tests/
  e2e/
    learn-flow.spec.ts
    exercise-completion.spec.ts
```

## Pull Request Process

### Before Submitting

1. **Run all tests** and ensure they pass:
   ```bash
   npm test
   npm run test:integration
   npm run test:e2e
   ```

2. **Check code coverage**:
   ```bash
   npm run test:coverage
   ```

3. **Lint and format**:
   ```bash
   npm run lint
   npm run format
   ```

4. **Type check**:
   ```bash
   npm run typecheck
   ```

5. **Update documentation** if your changes affect:
   - API endpoints
   - Component props/interfaces
   - Configuration options
   - User-facing features

### PR Template

When creating a PR, fill out the template with:

1. **Description**: Clear summary of what changed and why
2. **Type of Change**: Feature, bug fix, refactor, etc.
3. **Related Issues**: Link to issue(s) being addressed
4. **Testing**: How you tested your changes
5. **Screenshots**: For UI changes, include before/after images
6. **Checklist**: Confirm tests pass, documentation updated, etc.

### Review Process

1. **Automated Checks**: CI runs linting, tests, and build checks
2. **Code Review**: At least one maintainer review required
3. **Address Feedback**: Respond to review comments promptly
4. **Merge**: Maintainers will merge once approved and checks pass

**Review Timeline**: Expect initial review within 2-3 business days.

## Project Structure

```
aves/
├── apps/
│   ├── frontend/          # React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── pages/       # Page components
│   │   │   ├── services/    # API client services
│   │   │   ├── store/       # State management (Zustand)
│   │   │   ├── types/       # TypeScript type definitions
│   │   │   └── utils/       # Utility functions
│   │   ├── public/          # Static assets
│   │   └── tests/           # Frontend-specific tests
│   │
│   └── backend/           # Express + TypeScript backend
│       ├── src/
│       │   ├── routes/      # API route handlers
│       │   ├── services/    # Business logic services
│       │   ├── models/      # Database models
│       │   ├── middleware/  # Express middleware
│       │   ├── config/      # Configuration files
│       │   └── types/       # TypeScript type definitions
│       └── tests/           # Backend-specific tests
│
├── packages/
│   └── shared/            # Shared code between frontend/backend
│       ├── src/
│       │   ├── types/       # Shared TypeScript types
│       │   ├── utils/       # Shared utility functions
│       │   └── validation/  # Shared validation schemas
│       └── tests/
│
├── tests/
│   └── e2e/               # End-to-end Playwright tests
│
├── docs/                  # Project documentation
├── scripts/               # Build and deployment scripts
└── package.json           # Root workspace configuration
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests for specific package
npm test -w apps/frontend
npm test -w apps/backend
npm test -w packages/shared

# Run specific test file
npm test -- BirdCard.test.tsx
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run backend integration tests only
npm run test:integration -w apps/backend
```

### End-to-End Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test
npm run test:e2e -- learn-flow.spec.ts

# Debug E2E tests
npm run test:e2e:debug
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Documentation Standards

### JSDoc Comments

Add JSDoc comments for:
- All exported functions
- Public class methods
- Complex utility functions
- React components with non-obvious behavior

**Example**:
```typescript
/**
 * Fetches bird data by ID from the API
 *
 * @param id - The unique identifier of the bird
 * @param options - Optional fetch configuration
 * @returns Promise resolving to bird data
 * @throws {NotFoundError} When bird with given ID doesn't exist
 *
 * @example
 * ```ts
 * const bird = await fetchBirdById('123');
 * console.log(bird.name);
 * ```
 */
export async function fetchBirdById(
  id: string,
  options?: FetchOptions
): Promise<BirdData> {
  // Implementation
}
```

### React Component Documentation

Document component props with JSDoc:

```typescript
interface BirdCardProps {
  /** Unique identifier for the bird */
  id: string;
  /** Display name of the bird in Spanish */
  name: string;
  /** URL to the bird's image */
  imageUrl: string;
  /** Optional callback when card is clicked */
  onClick?: (id: string) => void;
}

/**
 * BirdCard component displays a bird with image and name
 *
 * Handles loading states and error fallbacks for images.
 *
 * @example
 * ```tsx
 * <BirdCard
 *   id="123"
 *   name="Gorrión"
 *   imageUrl="/images/sparrow.jpg"
 *   onClick={(id) => navigate(`/bird/${id}`)}
 * />
 * ```
 */
export function BirdCard({ id, name, imageUrl, onClick }: BirdCardProps) {
  // Implementation
}
```

### API Endpoint Documentation

Use OpenAPI/Swagger annotations for backend routes:

```typescript
/**
 * @openapi
 * /api/birds/{id}:
 *   get:
 *     summary: Get bird by ID
 *     description: Retrieves detailed information about a specific bird
 *     tags:
 *       - Birds
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bird unique identifier
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bird'
 *       404:
 *         description: Bird not found
 */
router.get('/birds/:id', async (req, res) => {
  // Implementation
});
```

### README Updates

Update relevant README files when adding:
- New features
- Configuration options
- Environment variables
- Dependencies
- Setup steps

## Troubleshooting

### Common Issues

**Issue**: Tests fail with module resolution errors
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript compilation errors after pulling latest changes
```bash
# Solution: Clean build cache and rebuild
npm run clean
npm run build
```

**Issue**: E2E tests fail locally but pass in CI
```bash
# Solution: Ensure browsers are installed
npx playwright install
```

**Issue**: ESLint errors about unused variables
```bash
# Solution: Prefix unused parameters with underscore
function handleClick(_event: MouseEvent) {
  // If 'event' is required by signature but unused
}
```

### Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/OWNER/aves/discussions)
- **Bugs**: Create an [Issue](https://github.com/OWNER/aves/issues) with reproduction steps
- **Security**: Email security concerns to security@aves-project.com

## License

By contributing to Aves, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Aves! Your efforts help create a better Spanish learning experience for everyone. 🐦
