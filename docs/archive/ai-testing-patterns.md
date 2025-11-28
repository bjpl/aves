# AI Testing Patterns - Mocking Anthropic/Claude API

**Last Updated**: October 17, 2025
**Audience**: Test Engineers, Backend Developers
**Prerequisites**: Understanding of Jest mocking, async/await patterns

---

## Table of Contents

1. [Overview](#overview)
2. [Why Mock AI Services](#why-mock-ai-services)
3. [Anthropic SDK Structure](#anthropic-sdk-structure)
4. [Basic Mocking Pattern](#basic-mocking-pattern)
5. [Mock Response Fixtures](#mock-response-fixtures)
6. [Advanced Mocking Scenarios](#advanced-mocking-scenarios)
7. [Testing AI-Dependent Features](#testing-ai-dependent-features)
8. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
9. [Best Practices](#best-practices)

---

## Overview

The AVES platform uses **Claude/Anthropic API** for AI-powered features including:

- Exercise generation (contextual fill, term matching, image labeling)
- Bird image annotation
- Vision AI for image analysis
- Content generation

This guide covers how to test these features **without making real API calls**.

### Key Principles

1. **Never make real API calls in tests** - Too slow, costs money, rate limited
2. **Use predictable mock responses** - Tests should be deterministic
3. **Test both success and error scenarios** - Cover edge cases
4. **Mock at the SDK level** - Mock `@anthropic-ai/sdk` module
5. **Use shared fixtures** - Reusable mock responses

---

## Why Mock AI Services

### Problems with Real API Calls

| Issue | Impact | Solution |
|-------|--------|----------|
| **Cost** | Each test run costs money | Mock responses |
| **Speed** | API calls add 1-5s per test | Instant mock responses |
| **Rate Limits** | Tests fail when limit hit | No real API calls |
| **Non-Deterministic** | AI responses vary slightly | Fixed mock responses |
| **Network Dependency** | Tests fail if network down | Local mocks |
| **CI/CD Complexity** | Need API keys in CI | No credentials needed |

### Benefits of Mocking

- Tests run in **milliseconds** instead of seconds
- **100% deterministic** - same input = same output
- **No API costs** - run tests unlimited times
- **Offline testing** - work without internet
- **Easy error simulation** - test failure scenarios
- **No rate limits** - run tests in parallel

---

## Anthropic SDK Structure

Understanding the SDK structure is key to effective mocking.

### SDK Architecture

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Create client
const client = new Anthropic({
  apiKey: 'your-api-key'
});

// Make API call
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [
    { role: 'user', content: 'Generate a Spanish exercise' }
  ]
});

// Response structure
{
  id: 'msg_abc123',
  type: 'message',
  role: 'assistant',
  content: [
    { type: 'text', text: '{"exercise": "data"}' }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
}
```

### Key Components to Mock

1. **Anthropic constructor** - Returns mock client
2. **messages.create()** - Returns mock response
3. **Response structure** - Must match actual API format

---

## Basic Mocking Pattern

### Step 1: Mock the SDK Module

Place at the **top** of your test file (before imports):

```typescript
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});
```

### Step 2: Setup Mock in beforeEach

```typescript
import { AIExerciseGenerator } from '../../services/aiExerciseGenerator';

describe('AI Exercise Generator', () => {
  let generator: AIExerciseGenerator;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Get the mocked Anthropic constructor
    const Anthropic = require('@anthropic-ai/sdk').default;

    // Create mock for messages.create
    mockCreate = jest.fn();

    // Setup mock implementation
    Anthropic.mockImplementation(() => ({
      messages: {
        create: mockCreate
      }
    }));

    // Create generator with mock
    generator = new AIExerciseGenerator(pool, {
      apiKey: 'test-key'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

### Step 3: Configure Mock Response

```typescript
it('should generate exercise', async () => {
  // Setup mock response
  mockCreate.mockResolvedValue({
    id: 'msg_test123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          sentence: 'El pájaro tiene plumas ___.',
          correctAnswer: 'rojas',
          options: ['rojas', 'azules', 'verdes', 'amarillas']
        })
      }
    ],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50
    }
  });

  // Test the function
  const result = await generator.generateExercise('contextual_fill', context);

  // Verify
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(result.type).toBe('contextual_fill');
  expect(result.correctAnswer).toBe('rojas');
});
```

---

## Mock Response Fixtures

Create reusable mock responses in `backend/src/__tests__/fixtures/aiResponses.ts`:

### Exercise Generation Fixtures

```typescript
/**
 * Mock Claude response for contextual fill exercise
 */
export const mockClaudeContextualFillResponse = {
  id: 'msg_test123',
  type: 'message' as const,
  role: 'assistant' as const,
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        sentence: 'El cardenal tiene plumas ___ brillantes.',
        correctAnswer: 'rojas',
        options: ['rojas', 'azules', 'verdes', 'amarillas'],
        context: 'Cardinals are known for their bright red plumage.',
        difficulty: 3
      })
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn' as const,
  stop_sequence: null,
  usage: {
    input_tokens: 200,
    output_tokens: 100
  }
};

/**
 * Mock Claude response for term matching exercise
 */
export const mockClaudeTermMatchingResponse = {
  id: 'msg_test456',
  type: 'message' as const,
  role: 'assistant' as const,
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        spanishTerms: ['el pico', 'las alas', 'la cola'],
        englishTerms: ['beak', 'wings', 'tail'],
        correctPairs: [
          { spanish: 'el pico', english: 'beak' },
          { spanish: 'las alas', english: 'wings' },
          { spanish: 'la cola', english: 'tail' }
        ],
        category: 'Bird Anatomy',
        difficulty: 3
      })
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn' as const,
  stop_sequence: null,
  usage: {
    input_tokens: 150,
    output_tokens: 80
  }
};
```

### Error Response Fixtures

```typescript
/**
 * Mock Claude error response
 */
export const mockClaudeErrorResponse = {
  error: {
    type: 'invalid_request_error',
    message: 'Invalid API key'
  }
};

/**
 * Mock Claude empty response
 */
export const mockClaudeEmptyResponse = {
  id: 'msg_empty',
  type: 'message' as const,
  role: 'assistant' as const,
  content: [
    {
      type: 'text' as const,
      text: ''
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn' as const,
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 0
  }
};

/**
 * Mock Claude invalid JSON response
 */
export const mockClaudeInvalidJsonResponse = {
  id: 'msg_invalid',
  type: 'message' as const,
  role: 'assistant' as const,
  content: [
    {
      type: 'text' as const,
      text: 'This is not valid JSON'
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn' as const,
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
};
```

### Usage in Tests

```typescript
import {
  mockClaudeContextualFillResponse,
  mockClaudeErrorResponse
} from '../fixtures/aiResponses';

it('should generate exercise', async () => {
  mockCreate.mockResolvedValue(mockClaudeContextualFillResponse);

  const result = await generator.generateExercise('contextual_fill', context);

  expect(result.type).toBe('contextual_fill');
});

it('should handle API errors', async () => {
  mockCreate.mockRejectedValue(new Error('Invalid API key'));

  await expect(
    generator.generateExercise('contextual_fill', context)
  ).rejects.toThrow('Invalid API key');
});
```

---

## Advanced Mocking Scenarios

### Scenario 1: Retry Logic Testing

Test that your code retries on failure:

```typescript
it('should retry on transient errors', async () => {
  mockCreate
    .mockRejectedValueOnce(new Error('Network error'))
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockResolvedValueOnce(mockClaudeContextualFillResponse);

  const result = await generator.generateExercise('contextual_fill', context);

  expect(mockCreate).toHaveBeenCalledTimes(3);
  expect(result.type).toBe('contextual_fill');
});
```

### Scenario 2: Rate Limiting

Test rate limit handling:

```typescript
it('should handle rate limit errors', async () => {
  mockCreate.mockRejectedValue({
    error: {
      type: 'rate_limit_error',
      message: 'Rate limit exceeded'
    }
  });

  await expect(
    generator.generateExercise('contextual_fill', context)
  ).rejects.toThrow('Rate limit exceeded');
});
```

### Scenario 3: Different Response Formats

Test handling of various response formats:

```typescript
it('should parse JSON in markdown code blocks', async () => {
  mockCreate.mockResolvedValue({
    ...mockClaudeContextualFillResponse,
    content: [
      {
        type: 'text',
        text: '```json\n{"sentence": "Test ___"}\n```'
      }
    ]
  });

  const result = await generator.generateExercise('contextual_fill', context);

  expect(result.sentence).toBe('Test ___');
});
```

### Scenario 4: Token Usage Tracking

Test that token usage is tracked correctly:

```typescript
it('should track token usage', async () => {
  mockCreate.mockResolvedValue(mockClaudeContextualFillResponse);

  await generator.generateExercise('contextual_fill', context);

  const stats = generator.getStatistics();
  expect(stats.totalTokensUsed).toBe(300); // 200 input + 100 output
});
```

### Scenario 5: Conditional Behavior

Test different behaviors based on input:

```typescript
it('should generate different exercises based on type', async () => {
  mockCreate
    .mockResolvedValueOnce(mockClaudeContextualFillResponse)
    .mockResolvedValueOnce(mockClaudeTermMatchingResponse);

  const exercise1 = await generator.generateExercise('contextual_fill', context);
  const exercise2 = await generator.generateExercise('term_matching', context);

  expect(exercise1.type).toBe('contextual_fill');
  expect(exercise2.type).toBe('term_matching');
  expect(mockCreate).toHaveBeenCalledTimes(2);
});
```

---

## Testing AI-Dependent Features

### Pattern 1: Vision AI Annotation

Mock vision AI service for image annotation:

```typescript
import { mockVisionAIService } from '../utils/workerMocks';

describe('Vision AI Annotation', () => {
  let visionAI: any;

  beforeEach(() => {
    visionAI = mockVisionAIService();
  });

  it('should generate annotations for image', async () => {
    const result = await visionAI.generateAnnotations('image-123');

    expect(result).toHaveLength(1);
    expect(result[0].spanishTerm).toBe('pico');
    expect(result[0].confidence).toBe(0.95);
  });
});
```

### Pattern 2: Batch Processing

Mock batch processor for bulk operations:

```typescript
import { MockBatchProcessor } from '../utils/workerMocks';

describe('Batch Annotation Processing', () => {
  let processor: MockBatchProcessor;

  beforeEach(() => {
    processor = new MockBatchProcessor();
  });

  afterEach(() => {
    processor.destroy();
  });

  it('should process batch of images', async () => {
    const imageIds = ['img1', 'img2', 'img3'];
    const jobId = await processor.startBatch(imageIds);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 50));

    const progress = await processor.getJobProgress(jobId);
    expect(progress.status).toBe('completed');
    expect(progress.progress.processed).toBe(3);
  });
});
```

### Pattern 3: Exercise Cache

Test exercise caching with AI generation:

```typescript
describe('Exercise Cache with AI Generation', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue(mockClaudeContextualFillResponse);
  });

  it('should cache generated exercises', async () => {
    const context = { userId: 'user1', difficulty: 3 };

    // First call - generates and caches
    const exercise1 = await generator.generateExercise('contextual_fill', context);

    // Second call - should use cache
    const exercise2 = await generator.generateExercise('contextual_fill', context);

    expect(mockCreate).toHaveBeenCalledTimes(1); // Only called once
    expect(exercise1).toEqual(exercise2);
  });
});
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Mock Not Applied

**Problem**: Mock doesn't work, real API called

```typescript
// WRONG - Mock after import
import { AIExerciseGenerator } from '../../services/aiExerciseGenerator';
jest.mock('@anthropic-ai/sdk');
```

**Solution**: Mock before imports

```typescript
// CORRECT - Mock before import
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() }
  }))
}));

import { AIExerciseGenerator } from '../../services/aiExerciseGenerator';
```

### Pitfall 2: Incorrect Response Structure

**Problem**: Tests fail because response doesn't match API format

```typescript
// WRONG - Missing required fields
mockCreate.mockResolvedValue({
  text: 'Response'
});
```

**Solution**: Use complete response structure

```typescript
// CORRECT - Complete response
mockCreate.mockResolvedValue({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Response' }],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 100, output_tokens: 50 }
});
```

### Pitfall 3: Not Clearing Mocks

**Problem**: Tests interfere with each other

```typescript
// WRONG - No cleanup
it('test 1', () => {
  mockCreate.mockResolvedValue(response1);
  // ...
});

it('test 2', () => {
  // Still has response1 from test 1!
  // ...
});
```

**Solution**: Clear mocks in afterEach

```typescript
// CORRECT - Clean between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

### Pitfall 4: Hardcoded API Keys in Tests

**Problem**: Real API key in test code

```typescript
// WRONG - Real API key
const generator = new AIExerciseGenerator(pool, {
  apiKey: 'sk-ant-api03-real-key-here'
});
```

**Solution**: Use test keys

```typescript
// CORRECT - Test key
const generator = new AIExerciseGenerator(pool, {
  apiKey: 'test-key'
});
```

### Pitfall 5: Not Testing Error Cases

**Problem**: Only test happy path

```typescript
// INCOMPLETE - Only success case
it('should generate exercise', async () => {
  mockCreate.mockResolvedValue(mockResponse);
  const result = await generator.generateExercise('type', context);
  expect(result).toBeDefined();
});
```

**Solution**: Test errors too

```typescript
// COMPLETE - Test errors
it('should handle API errors', async () => {
  mockCreate.mockRejectedValue(new Error('API error'));
  await expect(
    generator.generateExercise('type', context)
  ).rejects.toThrow('API error');
});

it('should handle empty responses', async () => {
  mockCreate.mockResolvedValue(mockClaudeEmptyResponse);
  await expect(
    generator.generateExercise('type', context)
  ).rejects.toThrow('Empty response');
});
```

---

## Best Practices

### 1. Use Shared Fixtures

Create reusable mock responses:

```typescript
// fixtures/aiResponses.ts
export const mockResponses = {
  contextualFill: mockClaudeContextualFillResponse,
  termMatching: mockClaudeTermMatchingResponse,
  error: mockClaudeErrorResponse
};

// In tests
import { mockResponses } from '../fixtures/aiResponses';
mockCreate.mockResolvedValue(mockResponses.contextualFill);
```

### 2. Test Prompt Generation

Verify that correct prompts are sent to API:

```typescript
it('should send correct prompt to Claude', async () => {
  mockCreate.mockResolvedValue(mockClaudeContextualFillResponse);

  await generator.generateExercise('contextual_fill', context);

  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      model: 'claude-sonnet-4-20250514',
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('difficulty: 3')
        })
      ])
    })
  );
});
```

### 3. Test Response Parsing

Verify JSON parsing logic:

```typescript
it('should parse JSON from markdown code blocks', async () => {
  mockCreate.mockResolvedValue({
    ...mockClaudeContextualFillResponse,
    content: [
      { type: 'text', text: '```json\n{"test": "data"}\n```' }
    ]
  });

  const result = await generator.generateExercise('contextual_fill', context);
  expect(result).toBeDefined();
});
```

### 4. Test Validation Logic

Ensure generated exercises are validated:

```typescript
it('should reject invalid exercise responses', async () => {
  mockCreate.mockResolvedValue({
    ...mockClaudeContextualFillResponse,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          sentence: 'Missing blank marker', // No ___
          correctAnswer: 'test',
          options: ['test']
        })
      }
    ]
  });

  await expect(
    generator.generateExercise('contextual_fill', context)
  ).rejects.toThrow('Invalid contextual fill response');
});
```

### 5. Mock at Right Level

Mock external dependencies, not internal functions:

```typescript
// GOOD - Mock external SDK
jest.mock('@anthropic-ai/sdk');

// BAD - Mock internal function
jest.spyOn(generator, 'generateExercise');
```

### 6. Document Mock Behavior

Add comments explaining mock setup:

```typescript
it('should retry on network errors', async () => {
  // First call: network error (should retry)
  // Second call: timeout error (should retry)
  // Third call: success
  mockCreate
    .mockRejectedValueOnce(new Error('Network error'))
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockResolvedValueOnce(mockClaudeContextualFillResponse);

  const result = await generator.generateExercise('contextual_fill', context);

  expect(mockCreate).toHaveBeenCalledTimes(3);
  expect(result.type).toBe('contextual_fill');
});
```

### 7. Keep Fixtures Realistic

Mock responses should match real API responses:

```typescript
// GOOD - Realistic response
export const mockClaudeResponse = {
  id: 'msg_01ABC123def456',  // Realistic ID format
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        sentence: 'El cardenal vive en ___ árboles.',  // Realistic Spanish
        correctAnswer: 'los',
        options: ['los', 'las', 'el', 'la']
      })
    }
  ],
  model: 'claude-sonnet-4-20250514',  // Actual model name
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 247,  // Realistic token count
    output_tokens: 89
  }
};
```

---

## Quick Reference

### Mock Setup Template

```typescript
// 1. Mock SDK (top of file)
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() }
  }))
}));

// 2. Setup in beforeEach
let mockCreate: jest.Mock;

beforeEach(() => {
  const Anthropic = require('@anthropic-ai/sdk').default;
  mockCreate = jest.fn();
  Anthropic.mockImplementation(() => ({
    messages: { create: mockCreate }
  }));
});

// 3. Cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// 4. Use in tests
mockCreate.mockResolvedValue(mockClaudeContextualFillResponse);
```

### Common Mock Scenarios

```typescript
// Success
mockCreate.mockResolvedValue(mockResponse);

// Error
mockCreate.mockRejectedValue(new Error('API error'));

// Multiple calls
mockCreate
  .mockResolvedValueOnce(response1)
  .mockResolvedValueOnce(response2);

// Conditional
mockCreate.mockImplementation((args) => {
  if (args.model === 'claude-4') {
    return Promise.resolve(response1);
  }
  return Promise.resolve(response2);
});
```

---

## Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Jest Mocking Guide](https://jestjs.io/docs/mock-functions)
- [Test Setup Instructions](./TEST-SETUP-INSTRUCTIONS.md)
- [Test Troubleshooting](./test-troubleshooting.md)

---

**Documentation maintained by**: Development Team
**Last verified**: October 17, 2025
**Next review**: When Anthropic SDK updates
