/**
 * AI Response Fixtures
 * Mock responses for Claude/Anthropic API calls in tests
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

export const mockClaudeImageLabelingResponse = {
  id: 'msg_test789',
  type: 'message' as const,
  role: 'assistant' as const,
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        imageUrl: '/images/birds/cardinal.jpg',
        labels: [
          { term: 'el pico', correctPosition: { x: 0.45, y: 0.30 } },
          { term: 'las alas', correctPosition: { x: 0.35, y: 0.50 } },
          { term: 'la cola', correctPosition: { x: 0.70, y: 0.60 } }
        ],
        difficulty: 3
      })
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn' as const,
  stop_sequence: null,
  usage: {
    input_tokens: 180,
    output_tokens: 90
  }
};

export const mockClaudeErrorResponse = {
  error: {
    type: 'invalid_request_error',
    message: 'Invalid API key'
  }
};

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
