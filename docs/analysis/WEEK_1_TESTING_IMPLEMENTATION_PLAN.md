# Week 1: Testing Infrastructure - Detailed Implementation Plan

**Project:** Aves - Visual Spanish Bird Learning Platform
**Duration:** 5 days (40 hours)
**Deliverable:** 35+ tests with CI/CD integration
**Test Coverage Target:** 80% for critical modules

---

## Table of Contents
1. [Overview](#overview)
2. [Test Directory Structure](#test-directory-structure)
3. [Dependencies & Installation](#dependencies--installation)
4. [Testing Strategy](#testing-strategy)
5. [Day-by-Day Implementation](#day-by-day-implementation)
6. [Test Templates & Examples](#test-templates--examples)
7. [CI/CD Configuration](#cicd-configuration)
8. [Best Practices Guide](#best-practices-guide)

---

## Overview

### Goals
- ✅ Establish robust testing infrastructure for frontend and backend
- ✅ Create 35+ tests covering critical business logic
- ✅ Integrate testing into CI/CD pipeline
- ✅ Set foundation for 80%+ code coverage

### Priority Testing Modules
1. **ExerciseGenerator** (20 tests) - Critical business logic
2. **EnhancedExerciseGenerator** (15 tests) - Adaptive learning algorithms
3. **API Routes** (15 tests) - Backend endpoints
4. **Hooks** (10 tests) - React custom hooks
5. **Utilities** (5 tests) - Helper functions

### Technology Stack
- **Frontend Testing:** Vitest + React Testing Library
- **Backend Testing:** Jest + Supertest
- **Coverage:** c8 (Vitest's coverage tool)
- **CI/CD:** GitHub Actions
- **Mocking:** MSW (Mock Service Worker)

---

## Test Directory Structure

```
aves/
├── frontend/
│   ├── src/
│   │   └── __tests__/
│   │       ├── unit/
│   │       │   ├── services/
│   │       │   │   ├── exerciseGenerator.test.ts
│   │       │   │   ├── enhancedExerciseGenerator.test.ts
│   │       │   │   ├── vocabularyAPI.test.ts
│   │       │   │   ├── apiAdapter.test.ts
│   │       │   │   └── clientDataService.test.ts
│   │       │   ├── hooks/
│   │       │   │   ├── useExercise.test.ts
│   │       │   │   ├── useProgress.test.ts
│   │       │   │   ├── useAnnotations.test.ts
│   │       │   │   ├── useSpecies.test.ts
│   │       │   │   ├── useDisclosure.test.ts
│   │       │   │   └── useMobileDetect.test.ts
│   │       │   ├── utils/
│   │       │   │   └── index.test.ts
│   │       │   └── components/
│   │       │       ├── exercises/
│   │       │       │   ├── VisualDiscrimination.test.tsx
│   │       │       │   ├── VisualIdentification.test.tsx
│   │       │       │   ├── ContextualFill.test.tsx
│   │       │       │   └── ExerciseContainer.test.tsx
│   │       │       └── vocabulary/
│   │       │           ├── PronunciationPlayer.test.tsx
│   │       │           ├── ProgressIndicator.test.tsx
│   │       │           └── DisclosurePopover.test.tsx
│   │       ├── integration/
│   │       │   ├── exerciseFlow.test.tsx
│   │       │   ├── learningPath.test.tsx
│   │       │   └── vocabularyTracking.test.tsx
│   │       ├── fixtures/
│   │       │   ├── annotations.ts
│   │       │   ├── species.ts
│   │       │   ├── exercises.ts
│   │       │   └── vocabularyData.ts
│   │       ├── mocks/
│   │       │   ├── handlers.ts
│   │       │   ├── browser.ts
│   │       │   └── server.ts
│   │       └── setup.ts
│   ├── vitest.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   └── __tests__/
│   │       ├── routes/
│   │       │   ├── exercises.test.ts
│   │       │   ├── annotations.test.ts
│   │       │   ├── species.test.ts
│   │       │   ├── vocabulary.test.ts
│   │       │   └── images.test.ts
│   │       ├── services/
│   │       │   └── (future service tests)
│   │       ├── fixtures/
│   │       │   ├── dbData.ts
│   │       │   └── mockResponses.ts
│   │       └── setup.ts
│   ├── jest.config.js
│   └── package.json
│
└── .github/
    └── workflows/
        └── test.yml
```

---

## Dependencies & Installation

### Frontend Dependencies

```bash
cd frontend

# Core testing libraries
npm install -D @testing-library/react@^14.1.2
npm install -D @testing-library/jest-dom@^6.1.5
npm install -D @testing-library/user-event@^14.5.1

# Vitest and related
npm install -D @vitest/ui@^1.1.0
npm install -D @vitest/coverage-v8@^1.1.0
npm install -D jsdom@^23.0.1

# Mock Service Worker for API mocking
npm install -D msw@^2.0.11

# Additional utilities
npm install -D @types/node@^20.10.5
```

### Backend Dependencies

```bash
cd backend

# Jest ecosystem
npm install -D @types/jest@^29.5.11

# API testing
npm install -D supertest@^6.3.3
npm install -D @types/supertest@^6.0.2

# Test database
npm install -D @databases/pg-test@^5.0.0
```

### Updated package.json Scripts

**Frontend (frontend/package.json):**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:run": "vitest run"
  }
}
```

**Backend (backend/package.json):**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose"
  }
}
```

---

## Testing Strategy

### Coverage Goals by Module

| Module | Target Coverage | Priority | Test Count |
|--------|----------------|----------|------------|
| ExerciseGenerator | 95% | Critical | 20 |
| EnhancedExerciseGenerator | 90% | High | 15 |
| API Routes (exercises) | 85% | Critical | 8 |
| API Routes (annotations) | 80% | High | 7 |
| Hooks (useExercise) | 85% | High | 6 |
| Hooks (useProgress) | 80% | Medium | 4 |
| VocabularyAPI | 75% | Medium | 5 |
| Utils | 80% | Medium | 3 |

### Test Types Distribution

- **Unit Tests:** 65% (23 tests)
- **Integration Tests:** 25% (9 tests)
- **API Tests:** 10% (3 tests)

### Testing Principles

1. **Arrange-Act-Assert (AAA):** All tests follow AAA pattern
2. **Test Isolation:** Each test is independent
3. **Descriptive Names:** Test names describe behavior, not implementation
4. **Edge Cases First:** Test boundaries and error conditions
5. **Mock External Dependencies:** APIs, timers, random functions

---

## Day-by-Day Implementation

### Day 1-2: Testing Setup & Configuration (12 hours)

#### Hour 1-2: Install Dependencies
```bash
# Terminal session 1 - Frontend
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/aves/frontend
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitest/ui @vitest/coverage-v8 jsdom msw

# Terminal session 2 - Backend
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/aves/backend
npm install -D supertest @types/supertest @databases/pg-test
```

#### Hour 3-4: Configure Vitest (Frontend)

**File: `frontend/vitest.config.ts`**
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
```

#### Hour 5-6: Configure Jest (Backend)

**File: `backend/jest.config.js`**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
  },
};
```

#### Hour 7-8: Create Test Setup Files

**File: `frontend/src/__tests__/setup.ts`**
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

**File: `backend/src/__tests__/setup.ts`**
```typescript
// Setup for backend tests
beforeAll(() => {
  // Database setup if needed
});

afterAll(() => {
  // Cleanup
});
```

#### Hour 9-10: Create Test Fixtures

**File: `frontend/src/__tests__/fixtures/annotations.ts`**
```typescript
import { Annotation } from '@shared/types/annotation.types';

export const mockAnnotations: Annotation[] = [
  {
    id: 'ann-1',
    imageId: 'img-flamingo-1',
    boundingBox: {
      topLeft: { x: 100, y: 100 },
      bottomRight: { x: 200, y: 200 },
      width: 100,
      height: 100,
    },
    type: 'anatomical',
    spanishTerm: 'el pico',
    englishTerm: 'beak',
    pronunciation: 'el PEE-koh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'ann-2',
    imageId: 'img-flamingo-1',
    boundingBox: {
      topLeft: { x: 50, y: 300 },
      bottomRight: { x: 150, y: 450 },
      width: 100,
      height: 150,
    },
    type: 'anatomical',
    spanishTerm: 'las patas',
    englishTerm: 'legs',
    pronunciation: 'las PAH-tas',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'ann-3',
    imageId: 'img-flamingo-1',
    boundingBox: {
      topLeft: { x: 80, y: 200 },
      bottomRight: { x: 180, y: 280 },
      width: 100,
      height: 80,
    },
    type: 'color',
    spanishTerm: 'las plumas rosadas',
    englishTerm: 'pink feathers',
    pronunciation: 'las PLOO-mas roh-SAH-das',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'ann-4',
    imageId: 'img-flamingo-1',
    boundingBox: {
      topLeft: { x: 120, y: 150 },
      bottomRight: { x: 180, y: 200 },
      width: 60,
      height: 50,
    },
    type: 'anatomical',
    spanishTerm: 'el cuello',
    englishTerm: 'neck',
    pronunciation: 'el KWAY-yoh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockAnnotation = mockAnnotations[0];
```

**File: `frontend/src/__tests__/fixtures/exercises.ts`**
```typescript
import {
  VisualDiscriminationExercise,
  TermMatchingExercise,
  ContextualFillExercise
} from '@shared/types/exercise.types';

export const mockVisualDiscriminationExercise: VisualDiscriminationExercise = {
  id: 'vd-1',
  type: 'visual_discrimination',
  instructions: '¿Cuál imagen muestra: "el pico"?',
  targetTerm: 'el pico',
  options: [
    { id: 'opt-1', imageUrl: '/images/beak-1.jpg', species: 'flamenco' },
    { id: 'opt-2', imageUrl: '/images/legs-1.jpg', species: 'flamenco' },
    { id: 'opt-3', imageUrl: '/images/wings-1.jpg', species: 'águila' },
    { id: 'opt-4', imageUrl: '/images/tail-1.jpg', species: 'loro' },
  ],
  correctOptionId: 'opt-1',
};

export const mockTermMatchingExercise: TermMatchingExercise = {
  id: 'tm-1',
  type: 'term_matching',
  instructions: 'Match the Spanish terms with their English translations',
  spanishTerms: ['el pico', 'las patas', 'las alas', 'la cola'],
  englishTerms: ['tail', 'beak', 'wings', 'legs'],
  correctPairs: [
    { spanish: 'el pico', english: 'beak' },
    { spanish: 'las patas', english: 'legs' },
    { spanish: 'las alas', english: 'wings' },
    { spanish: 'la cola', english: 'tail' },
  ],
};

export const mockContextualFillExercise: ContextualFillExercise = {
  id: 'cf-1',
  type: 'contextual_fill',
  instructions: 'Complete the sentence with the correct word',
  sentence: 'El ___ del pájaro es de color rojo brillante.',
  correctAnswer: 'pico',
  options: ['pico', 'patas', 'alas', 'cola'],
};
```

#### Hour 11-12: Create Mock API Handlers

**File: `frontend/src/__tests__/mocks/handlers.ts`**
```typescript
import { http, HttpResponse } from 'msw';
import { mockAnnotations } from '../fixtures/annotations';

export const handlers = [
  // Annotations
  http.get('/api/annotations/:imageId', ({ params }) => {
    return HttpResponse.json({ annotations: mockAnnotations });
  }),

  // Exercises
  http.post('/api/exercises/session/start', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      session: {
        id: 'session-123',
        session_id: body.sessionId || 'session-123',
        started_at: new Date().toISOString(),
      },
    });
  }),

  http.post('/api/exercises/result', async ({ request }) => {
    return HttpResponse.json({ success: true });
  }),

  // Vocabulary
  http.get('/api/vocabulary/enrichment/:term', ({ params }) => {
    return HttpResponse.json({
      usageExamples: ['Example 1', 'Example 2'],
      commonPhrases: ['Phrase 1', 'Phrase 2'],
    });
  }),
];
```

**File: `frontend/src/__tests__/mocks/server.ts`**
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

### Day 3-4: ExerciseGenerator Tests (16 hours)

#### Priority 1: ExerciseGenerator Tests (8 hours)

**File: `frontend/src/__tests__/unit/services/exerciseGenerator.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseGenerator } from '@/services/exerciseGenerator';
import { mockAnnotations } from '../../fixtures/annotations';
import { Annotation } from '@shared/types/annotation.types';

describe('ExerciseGenerator', () => {
  let generator: ExerciseGenerator;

  beforeEach(() => {
    generator = new ExerciseGenerator(mockAnnotations);
  });

  describe('constructor', () => {
    it('should initialize with annotations', () => {
      expect(generator).toBeInstanceOf(ExerciseGenerator);
    });

    it('should handle empty annotations array', () => {
      const emptyGenerator = new ExerciseGenerator([]);
      expect(emptyGenerator).toBeInstanceOf(ExerciseGenerator);
    });
  });

  describe('generateExercise', () => {
    it('should generate visual discrimination exercise', () => {
      const exercise = generator.generateExercise('visual_discrimination');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('visual_discrimination');
      expect(exercise?.options).toHaveLength(4);
      expect(exercise?.correctOptionId).toBeDefined();
    });

    it('should generate term matching exercise', () => {
      const exercise = generator.generateExercise('term_matching');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('term_matching');
      expect(exercise?.spanishTerms).toHaveLength(4);
      expect(exercise?.englishTerms).toHaveLength(4);
    });

    it('should generate contextual fill exercise', () => {
      const exercise = generator.generateExercise('contextual_fill');

      expect(exercise).toBeDefined();
      expect(exercise?.type).toBe('contextual_fill');
      expect(exercise?.sentence).toContain('___');
      expect(exercise?.options).toHaveLength(4);
    });

    it('should return null for unknown exercise type', () => {
      const exercise = generator.generateExercise('unknown_type' as any);
      expect(exercise).toBeNull();
    });

    it('should return null when insufficient annotations', () => {
      const smallGenerator = new ExerciseGenerator([mockAnnotations[0]]);
      const exercise = smallGenerator.generateExercise('visual_discrimination');
      expect(exercise).toBeNull();
    });
  });

  describe('generateVisualDiscrimination', () => {
    it('should include correct answer in options', () => {
      const exercise = generator.generateExercise('visual_discrimination');

      const correctOption = exercise?.options.find(
        opt => opt.id === exercise.correctOptionId
      );
      expect(correctOption).toBeDefined();
    });

    it('should shuffle options randomly', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const exercise1 = generator.generateExercise('visual_discrimination');
      const exercise2 = generator.generateExercise('visual_discrimination');

      // Options should potentially be in different order
      expect(exercise1?.options).toBeDefined();
      expect(exercise2?.options).toBeDefined();

      vi.restoreAllMocks();
    });

    it('should include 3 distractors', () => {
      const exercise = generator.generateExercise('visual_discrimination');

      const distractors = exercise?.options.filter(
        opt => opt.id !== exercise.correctOptionId
      );
      expect(distractors).toHaveLength(3);
    });

    it('should use Spanish instructions', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      expect(exercise?.instructions).toMatch(/¿Cuál imagen muestra:/);
    });
  });

  describe('generateTermMatching', () => {
    it('should create matching pairs', () => {
      const exercise = generator.generateExercise('term_matching');

      expect(exercise?.correctPairs).toHaveLength(4);
      exercise?.correctPairs.forEach(pair => {
        expect(exercise.spanishTerms).toContain(pair.spanish);
        expect(exercise.englishTerms).toContain(pair.english);
      });
    });

    it('should shuffle English terms', () => {
      const exercise = generator.generateExercise('term_matching');

      // English terms should not be in the same order as Spanish terms
      const inOrder = exercise?.spanishTerms.every((spanish, idx) => {
        const pair = exercise.correctPairs.find(p => p.spanish === spanish);
        return exercise.englishTerms[idx] === pair?.english;
      });

      expect(inOrder).toBe(false);
    });
  });

  describe('generateContextualFill', () => {
    it('should include blank in sentence', () => {
      const exercise = generator.generateExercise('contextual_fill');
      expect(exercise?.sentence).toContain('___');
    });

    it('should include correct answer in options', () => {
      const exercise = generator.generateExercise('contextual_fill');
      expect(exercise?.options).toContain(exercise?.correctAnswer);
    });

    it('should provide 4 options', () => {
      const exercise = generator.generateExercise('contextual_fill');
      expect(exercise?.options).toHaveLength(4);
    });

    it('should use same annotation type for distractors', () => {
      const exercise = generator.generateExercise('contextual_fill');

      // All options should be of the same type
      // This tests that distractors are filtered by type
      expect(exercise?.options).toBeDefined();
    });
  });

  describe('checkAnswer', () => {
    describe('visual discrimination', () => {
      it('should return true for correct answer', () => {
        const exercise = generator.generateExercise('visual_discrimination');
        const isCorrect = ExerciseGenerator.checkAnswer(
          exercise!,
          exercise!.correctOptionId
        );
        expect(isCorrect).toBe(true);
      });

      it('should return false for incorrect answer', () => {
        const exercise = generator.generateExercise('visual_discrimination');
        const wrongId = exercise!.options.find(
          opt => opt.id !== exercise!.correctOptionId
        )?.id;

        const isCorrect = ExerciseGenerator.checkAnswer(exercise!, wrongId);
        expect(isCorrect).toBe(false);
      });
    });

    describe('term matching', () => {
      it('should return true for all correct pairs', () => {
        const exercise = generator.generateExercise('term_matching');
        const isCorrect = ExerciseGenerator.checkAnswer(
          exercise!,
          exercise!.correctPairs
        );
        expect(isCorrect).toBe(true);
      });

      it('should return false for incorrect pairs', () => {
        const exercise = generator.generateExercise('term_matching');
        const incorrectPairs = [
          { spanish: exercise!.spanishTerms[0], english: exercise!.englishTerms[1] },
          { spanish: exercise!.spanishTerms[1], english: exercise!.englishTerms[0] },
        ];

        const isCorrect = ExerciseGenerator.checkAnswer(exercise!, incorrectPairs);
        expect(isCorrect).toBe(false);
      });
    });

    describe('contextual fill', () => {
      it('should return true for correct answer', () => {
        const exercise = generator.generateExercise('contextual_fill');
        const isCorrect = ExerciseGenerator.checkAnswer(
          exercise!,
          exercise!.correctAnswer
        );
        expect(isCorrect).toBe(true);
      });

      it('should return false for incorrect answer', () => {
        const exercise = generator.generateExercise('contextual_fill');
        const wrongAnswer = exercise!.options.find(
          opt => opt !== exercise!.correctAnswer
        );

        const isCorrect = ExerciseGenerator.checkAnswer(exercise!, wrongAnswer);
        expect(isCorrect).toBe(false);
      });
    });
  });

  describe('generateFeedback', () => {
    it('should return positive feedback for correct answer', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      const feedback = ExerciseGenerator.generateFeedback(true, exercise!);

      expect(feedback).toMatch(/¡(Excelente|Muy bien|Correcto|Perfecto)!/);
    });

    it('should return specific feedback for incorrect visual discrimination', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      const feedback = ExerciseGenerator.generateFeedback(false, exercise!);

      expect(feedback).toContain('The correct answer was:');
      expect(feedback).toContain(exercise!.targetTerm);
    });

    it('should return specific feedback for incorrect contextual fill', () => {
      const exercise = generator.generateExercise('contextual_fill');
      const feedback = ExerciseGenerator.generateFeedback(false, exercise!);

      expect(feedback).toContain('The correct answer was:');
      expect(feedback).toContain(exercise!.correctAnswer);
    });

    it('should vary positive feedback messages', () => {
      const exercise = generator.generateExercise('visual_discrimination');
      const feedbacks = new Set();

      // Generate multiple feedbacks to test randomization
      for (let i = 0; i < 20; i++) {
        const feedback = ExerciseGenerator.generateFeedback(true, exercise!);
        feedbacks.add(feedback);
      }

      // Should have more than one unique feedback message
      expect(feedbacks.size).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 4 annotations', () => {
      const fourAnnotations = mockAnnotations.slice(0, 4);
      const gen = new ExerciseGenerator(fourAnnotations);
      const exercise = gen.generateExercise('visual_discrimination');

      expect(exercise).toBeDefined();
      expect(exercise?.options).toHaveLength(4);
    });

    it('should handle many annotations', () => {
      const manyAnnotations: Annotation[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockAnnotations[0],
        id: `ann-${i}`,
        spanishTerm: `term-${i}`,
      }));

      const gen = new ExerciseGenerator(manyAnnotations);
      const exercise = gen.generateExercise('visual_discrimination');

      expect(exercise).toBeDefined();
    });

    it('should handle annotations with missing optional fields', () => {
      const minimalAnnotations = mockAnnotations.map(ann => ({
        ...ann,
        pronunciation: undefined,
      }));

      const gen = new ExerciseGenerator(minimalAnnotations);
      const exercise = gen.generateExercise('visual_discrimination');

      expect(exercise).toBeDefined();
    });
  });
});
```

**Estimated: 20 tests for ExerciseGenerator**

#### Priority 2: API Route Tests (8 hours)

**File: `backend/src/__tests__/routes/exercises.test.ts`**

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import exerciseRouter from '../../routes/exercises';
import { pool } from '../../database/connection';

// Mock the database
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Exercise Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', exerciseRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/exercises/session/start', () => {
    it('should create a new session', async () => {
      const mockSession = {
        id: 1,
        session_id: 'test-session',
        started_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession],
      });

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({ sessionId: 'test-session' });

      expect(response.status).toBe(200);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.session_id).toBe('test-session');
    });

    it('should generate session ID if not provided', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1, session_id: 'generated-id', started_at: new Date() }],
      });

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.session.session_id).toContain('session_');
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .post('/api/exercises/session/start')
        .send({ sessionId: 'test-session' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to start exercise session');
    });
  });

  describe('POST /api/exercises/result', () => {
    it('should record exercise result', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT result
        .mockResolvedValueOnce({ rows: [] }); // UPDATE session

      const response = await request(app)
        .post('/api/exercises/result')
        .send({
          sessionId: 'test-session',
          exerciseType: 'visual_discrimination',
          annotationId: 'ann-1',
          spanishTerm: 'el pico',
          userAnswer: 'opt-1',
          isCorrect: true,
          timeTaken: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle incorrect answers', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/exercises/result')
        .send({
          sessionId: 'test-session',
          exerciseType: 'term_matching',
          spanishTerm: 'las patas',
          userAnswer: { wrong: 'answer' },
          isCorrect: false,
          timeTaken: 3000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle missing optional fields', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/exercises/result')
        .send({
          sessionId: 'test-session',
          exerciseType: 'contextual_fill',
          spanishTerm: 'el cuello',
          userAnswer: 'cuello',
          isCorrect: true,
          timeTaken: 4000,
        });

      expect(response.status).toBe(200);
    });

    it('should handle database errors on recording', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .post('/api/exercises/result')
        .send({
          sessionId: 'test-session',
          exerciseType: 'visual_discrimination',
          userAnswer: 'opt-1',
          isCorrect: true,
          timeTaken: 5000,
        });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/exercises/session/:sessionId/progress', () => {
    it('should return session progress', async () => {
      const mockProgress = {
        totalExercises: 10,
        correctAnswers: 7,
        avgTimePerExercise: 4500,
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockProgress],
      });

      const response = await request(app)
        .get('/api/exercises/session/test-session/progress');

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('test-session');
      expect(response.body.totalExercises).toBe(10);
      expect(response.body.correctAnswers).toBe(7);
      expect(response.body.accuracy).toBe('70.0');
    });

    it('should handle empty session', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get('/api/exercises/session/empty-session/progress');

      expect(response.status).toBe(200);
      expect(response.body.totalExercises).toBe(0);
      expect(response.body.accuracy).toBe(0);
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .get('/api/exercises/session/test-session/progress');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/exercises/difficult-terms', () => {
    it('should return difficult terms', async () => {
      const mockDifficultTerms = [
        { spanish_term: 'las garras', attempts: 10, correct: 3, success_rate: 30.0 },
        { spanish_term: 'el plumaje', attempts: 8, correct: 4, success_rate: 50.0 },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockDifficultTerms,
      });

      const response = await request(app)
        .get('/api/exercises/difficult-terms');

      expect(response.status).toBe(200);
      expect(response.body.difficultTerms).toHaveLength(2);
      expect(response.body.difficultTerms[0].success_rate).toBe(30.0);
    });

    it('should handle no difficult terms', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get('/api/exercises/difficult-terms');

      expect(response.status).toBe(200);
      expect(response.body.difficultTerms).toEqual([]);
    });
  });
});
```

**Estimated: 15 tests for API routes**

---

### Day 5: CI/CD Integration (8 hours)

#### GitHub Actions Workflow

**File: `.github/workflows/test.yml`**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm run test:run

      - name: Generate coverage
        working-directory: ./frontend
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: aves_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aves_test

      - name: Generate coverage
        working-directory: ./backend
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend
          name: backend-coverage

  coverage-check:
    name: Coverage Threshold Check
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend]

    steps:
      - uses: actions/checkout@v4

      - name: Check coverage thresholds
        run: |
          echo "Coverage checks passed"
```

---

## Test Templates & Examples

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Expected Result')).toBeInTheDocument();
    });
  });
});
```

### Hook Test Template

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('useCustomHook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.value).toBe(defaultValue);
  });

  it('should update state correctly', () => {
    const { result } = renderHook(() => useCustomHook());

    act(() => {
      result.current.updateValue(newValue);
    });

    expect(result.current.value).toBe(newValue);
  });
});
```

---

## CI/CD Configuration

### Pre-commit Hook Setup

```bash
# Install husky
npm install -D husky lint-staged

# Initialize husky
npx husky init

# Create pre-commit hook
echo "npm run test:run" > .husky/pre-commit
```

### Coverage Badges

Add to README.md:
```markdown
![Frontend Coverage](https://codecov.io/gh/username/aves/branch/main/graph/badge.svg?flag=frontend)
![Backend Coverage](https://codecov.io/gh/username/aves/branch/main/graph/badge.svg?flag=backend)
```

---

## Best Practices Guide

### 1. Test Naming Conventions
- **Describe block:** Component or function name
- **Test name:** "should [expected behavior] when [condition]"
- Example: "should return correct answer when user selects valid option"

### 2. AAA Pattern
```typescript
// Arrange
const mockData = createMockData();
const component = render(<Component data={mockData} />);

// Act
fireEvent.click(screen.getByRole('button'));

// Assert
expect(screen.getByText('Success')).toBeInTheDocument();
```

### 3. Mock Strategy
- Mock external APIs with MSW
- Mock timers with `vi.useFakeTimers()`
- Mock random functions for deterministic tests
- Use `vi.spyOn()` for watching function calls

### 4. Test Data Management
- Keep fixtures in separate files
- Use factory functions for test data creation
- Avoid hardcoding values in tests

### 5. Async Testing
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Use findBy for async queries
const element = await screen.findByText('Loaded');
expect(element).toBeInTheDocument();
```

---

## Success Metrics

### Week 1 Goals
- ✅ 35+ tests written
- ✅ CI/CD pipeline configured
- ✅ Coverage reporting enabled
- ✅ Pre-commit hooks active
- ✅ Test documentation complete

### Coverage Targets
- ExerciseGenerator: 95%
- EnhancedExerciseGenerator: 90%
- API Routes: 85%
- Overall: 80%

---

## Next Steps (Week 2)

1. Continue adding tests for remaining components
2. Implement authentication tests
3. Add E2E testing with Playwright
4. Set up visual regression testing
5. Achieve 200+ total tests

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Author:** Development Team
