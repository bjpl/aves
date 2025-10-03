# AI Exercise Generation API Reference

**Version:** 1.0.0
**Last Updated:** October 2, 2025

## Overview

The AI Exercise Generation API provides intelligent, context-aware exercise creation for the Aves Spanish learning platform. It combines GPT-4 for dynamic content generation with an aggressive caching strategy to minimize costs while maintaining high-quality, personalized learning experiences.

**Key Features:**
- AI-powered exercise generation using GPT-4
- Multi-type exercise support (fill-in-blank, multiple choice, translation, contextual)
- Smart caching with 80%+ hit rate
- Adaptive difficulty based on user performance
- Cost optimization (~$2/month operational cost)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
3. [Request/Response Schemas](#requestresponse-schemas)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Example Requests](#example-requests)

---

## Authentication

All AI Exercise Generation API endpoints require authentication using JWT tokens.

### Header Format

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "sessionId": "your_session_id"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

## Endpoints

### 1. Generate Exercise

Generate a new AI-powered exercise based on user context and difficulty level.

**Endpoint:** `POST /api/ai/exercises/generate`

**Authentication:** Required

**Request Body:**
```typescript
{
  type?: ExerciseType;     // Optional: 'fill_in_blank' | 'multiple_choice' | 'translation' | 'contextual' | 'adaptive'
  userId: string;          // Required: User identifier
  difficulty?: number;     // Optional: 1-5, defaults to adaptive
  topics?: string[];       // Optional: Focus topics (e.g., ['colors', 'anatomy'])
}
```

**Response:**
```typescript
{
  exercise: Exercise;
  metadata: {
    generated: boolean;     // true = AI generated, false = cached
    cacheKey: string;      // Cache identifier
    cost: number;          // Estimated API cost ($0.003 if generated, $0 if cached)
    difficulty: number;    // 1-5 difficulty level
    source: 'ai' | 'cache'; // Source of exercise
    timestamp: string;     // ISO 8601 timestamp
  }
}
```

**Status Codes:**
- `200 OK` - Exercise generated successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error or AI service unavailable

**Example:**
```bash
curl -X POST https://api.aves.app/api/ai/exercises/generate \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "fill_in_blank",
    "difficulty": 3
  }'
```

---

### 2. Get Generation Statistics

Retrieve AI generation statistics including cache hit rate and costs.

**Endpoint:** `GET /api/ai/exercises/stats`

**Authentication:** Required (Admin only)

**Query Parameters:**
```typescript
{
  startDate?: string;  // ISO 8601 date, defaults to 30 days ago
  endDate?: string;    // ISO 8601 date, defaults to now
  userId?: string;     // Filter by specific user
}
```

**Response:**
```typescript
{
  totalGenerated: number;      // Total AI generations
  cached: number;              // Number of cache hits
  cacheHitRate: number;        // Percentage (0-100)
  totalCost: number;           // Total API cost in USD
  avgGenerationTime: number;   // Average time in milliseconds
  byType: {
    fill_in_blank: { count: number; cost: number; };
    multiple_choice: { count: number; cost: number; };
    translation: { count: number; cost: number; };
    contextual: { count: number; cost: number; };
  };
  dateRange: {
    start: string;
    end: string;
  };
}
```

**Status Codes:**
- `200 OK` - Statistics retrieved successfully
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User does not have admin privileges
- `500 Internal Server Error` - Server error

---

### 3. Prefetch Exercises

Pre-generate exercises for improved performance. Useful for background jobs.

**Endpoint:** `POST /api/ai/exercises/prefetch`

**Authentication:** Required (Admin only)

**Request Body:**
```typescript
{
  userId: string;      // Required: User identifier
  count: number;       // Required: Number of exercises to prefetch (max 50)
  types?: ExerciseType[];  // Optional: Specific types to generate
  difficulty?: number;     // Optional: Target difficulty level
}
```

**Response:**
```typescript
{
  prefetched: number;     // Number of exercises generated
  cached: number;         // Number already cached
  totalCost: number;      // Cost of generation
  exercises: {
    id: string;
    type: ExerciseType;
    cacheKey: string;
  }[];
}
```

**Status Codes:**
- `200 OK` - Prefetch completed
- `400 Bad Request` - Invalid parameters (e.g., count > 50)
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User does not have admin privileges
- `500 Internal Server Error` - Server error

---

### 4. Clear Exercise Cache

Clear cached exercises for a user or globally (admin only).

**Endpoint:** `DELETE /api/ai/exercises/cache/:userId`

**Authentication:** Required (Admin only)

**Path Parameters:**
- `userId` - User identifier or 'all' for global cache clear

**Query Parameters:**
```typescript
{
  type?: ExerciseType;     // Optional: Clear specific exercise type only
  olderThan?: string;      // Optional: ISO 8601 date, clear entries older than this
}
```

**Response:**
```typescript
{
  cleared: number;         // Number of cache entries cleared
  userId: string;          // User ID or 'all'
  timestamp: string;       // ISO 8601 timestamp
}
```

**Status Codes:**
- `200 OK` - Cache cleared successfully
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User does not have admin privileges
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### 5. Validate Exercise

Validate the quality of a generated exercise.

**Endpoint:** `POST /api/ai/exercises/validate`

**Authentication:** Required

**Request Body:**
```typescript
{
  exercise: Exercise;      // Exercise to validate
  strictMode?: boolean;    // Optional: Enable strict validation rules
}
```

**Response:**
```typescript
{
  valid: boolean;
  errors: string[];        // Validation errors (if any)
  warnings: string[];      // Non-critical issues
  quality: {
    grammarScore: number;  // 0-100
    difficultyMatch: boolean;
    vocabularyRelevance: number;  // 0-100
  };
}
```

**Status Codes:**
- `200 OK` - Validation completed
- `400 Bad Request` - Invalid exercise format
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server error

---

### 6. Submit Exercise Result

Submit user's answer and get feedback.

**Endpoint:** `POST /api/exercises/result`

**Authentication:** Required

**Request Body:**
```typescript
{
  sessionId: string;
  exerciseType: ExerciseType;
  annotationId?: number;
  spanishTerm: string;
  userAnswer: any;         // Type varies by exercise
  isCorrect: boolean;
  timeTaken: number;       // Milliseconds
}
```

**Response:**
```typescript
{
  success: boolean;
  feedback: string;
  nextDifficulty: number;  // Suggested difficulty for next exercise
  stats: {
    sessionAccuracy: number;
    streak: number;
    totalExercises: number;
  };
}
```

---

## Request/Response Schemas

### Exercise Types

```typescript
type ExerciseType =
  | 'fill_in_blank'
  | 'multiple_choice'
  | 'translation'
  | 'contextual'
  | 'visual_discrimination'
  | 'visual_identification'
  | 'audio_recognition'
  | 'sentence_building'
  | 'cultural_context'
  | 'term_matching'
  | 'image_labeling';
```

### Exercise Schema

```typescript
interface Exercise {
  id: string;
  type: ExerciseType;
  instructions: string;
  difficulty: number;          // 1-5
  prompt?: string;
  metadata?: {
    generatedAt: string;
    context: UserContext;
    topics: string[];
    estimatedTime: number;     // Seconds
  };
}
```

### Fill-in-Blank Exercise

```typescript
interface FillInBlankExercise extends Exercise {
  type: 'fill_in_blank';
  sentence: string;            // Contains ___ placeholder
  correctAnswer: string;
  hint?: string;
  vocabulary: {
    spanish: string;
    english: string;
    category?: string;
  }[];
}
```

### Multiple Choice Exercise

```typescript
interface MultipleChoiceExercise extends Exercise {
  type: 'multiple_choice';
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
  explanation?: string;
}
```

### Translation Exercise

```typescript
interface TranslationExercise extends Exercise {
  type: 'translation';
  sourceText: string;
  sourceLanguage: 'es' | 'en';
  targetLanguage: 'es' | 'en';
  correctTranslation: string;
  acceptableAlternatives?: string[];
}
```

### Contextual Exercise

```typescript
interface ContextualExercise extends Exercise {
  type: 'contextual';
  scenario: string;
  question: string;
  answer: string;
  context: {
    situation: string;
    culturalNote?: string;
  };
}
```

### User Context

```typescript
interface UserContext {
  userId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 1 | 2 | 3 | 4 | 5;
  weakTopics: string[];        // accuracy < 70%
  masteredTopics: string[];    // accuracy > 90%
  newTopics: string[];         // never seen
  recentErrors: Exercise[];    // last 5 incorrect
  streak: number;              // current success streak
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  error: string;               // Error message
  code: string;                // Error code (e.g., 'INVALID_EXERCISE_TYPE')
  details?: any;               // Additional error details
  timestamp: string;           // ISO 8601 timestamp
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_EXERCISE_TYPE` | Unknown or unsupported exercise type | 400 |
| `INVALID_USER_ID` | User ID is missing or invalid | 400 |
| `INVALID_DIFFICULTY` | Difficulty must be 1-5 | 400 |
| `MISSING_AUTH` | Authorization header missing | 401 |
| `INVALID_TOKEN` | JWT token is invalid or expired | 401 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | 403 |
| `USER_NOT_FOUND` | User does not exist | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `AI_SERVICE_UNAVAILABLE` | OpenAI API is unavailable | 503 |
| `GENERATION_FAILED` | Exercise generation failed | 500 |
| `CACHE_ERROR` | Cache operation failed | 500 |

### Example Error Response

```json
{
  "error": "Invalid exercise type provided",
  "code": "INVALID_EXERCISE_TYPE",
  "details": {
    "providedType": "invalid_type",
    "supportedTypes": ["fill_in_blank", "multiple_choice", "translation", "contextual"]
  },
  "timestamp": "2025-10-02T14:30:00.000Z"
}
```

---

## Rate Limiting

### Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `POST /api/ai/exercises/generate` | 60 requests | per minute per user |
| `POST /api/ai/exercises/prefetch` | 10 requests | per hour per user |
| `GET /api/ai/exercises/stats` | 100 requests | per minute |
| `DELETE /api/ai/exercises/cache/:userId` | 10 requests | per hour |
| `POST /api/ai/exercises/validate` | 100 requests | per minute per user |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1696262400
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 60,
    "window": "1 minute",
    "retryAfter": 45
  },
  "timestamp": "2025-10-02T14:30:00.000Z"
}
```

---

## Example Requests

### Generate Fill-in-Blank Exercise

```bash
curl -X POST https://api.aves.app/api/ai/exercises/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_12345",
    "type": "fill_in_blank",
    "difficulty": 3,
    "topics": ["colors", "anatomy"]
  }'
```

**Response:**
```json
{
  "exercise": {
    "id": "ex_1696262400_fill",
    "type": "fill_in_blank",
    "instructions": "Complete the sentence with the correct Spanish word",
    "difficulty": 3,
    "sentence": "El cardenal tiene plumas ___ brillantes.",
    "correctAnswer": "rojas",
    "hint": "This color is common in cardinals",
    "vocabulary": [
      { "spanish": "plumas", "english": "feathers", "category": "anatomy" },
      { "spanish": "rojas", "english": "red", "category": "colors" }
    ],
    "metadata": {
      "generatedAt": "2025-10-02T14:30:00.000Z",
      "topics": ["colors", "anatomy"],
      "estimatedTime": 30
    }
  },
  "metadata": {
    "generated": true,
    "cacheKey": "fb_3_colors_anatomy_abc123",
    "cost": 0.003,
    "difficulty": 3,
    "source": "ai",
    "timestamp": "2025-10-02T14:30:00.000Z"
  }
}
```

### Generate Adaptive Exercise

```bash
curl -X POST https://api.aves.app/api/ai/exercises/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_12345",
    "type": "adaptive"
  }'
```

The system will analyze user performance and select the optimal exercise type and difficulty.

### Get Generation Statistics

```bash
curl -X GET "https://api.aves.app/api/ai/exercises/stats?startDate=2025-09-01&endDate=2025-10-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "totalGenerated": 1500,
  "cached": 1200,
  "cacheHitRate": 80.0,
  "totalCost": 4.50,
  "avgGenerationTime": 1850,
  "byType": {
    "fill_in_blank": { "count": 600, "cost": 1.80 },
    "multiple_choice": { "count": 500, "cost": 1.50 },
    "translation": { "count": 250, "cost": 0.75 },
    "contextual": { "count": 150, "cost": 0.45 }
  },
  "dateRange": {
    "start": "2025-09-01T00:00:00.000Z",
    "end": "2025-10-01T23:59:59.999Z"
  }
}
```

### Prefetch Exercises

```bash
curl -X POST https://api.aves.app/api/ai/exercises/prefetch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_12345",
    "count": 10,
    "types": ["fill_in_blank", "multiple_choice"],
    "difficulty": 3
  }'
```

**Response:**
```json
{
  "prefetched": 8,
  "cached": 2,
  "totalCost": 0.024,
  "exercises": [
    {
      "id": "ex_1696262401_fill",
      "type": "fill_in_blank",
      "cacheKey": "fb_3_abc124"
    },
    // ... 9 more exercises
  ]
}
```

### Clear User Cache

```bash
curl -X DELETE "https://api.aves.app/api/ai/exercises/cache/user_12345?type=fill_in_blank" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "cleared": 42,
  "userId": "user_12345",
  "timestamp": "2025-10-02T14:30:00.000Z"
}
```

---

## Cost Optimization

### Caching Strategy

The API implements aggressive caching to minimize OpenAI API costs:

1. **Cache Key Generation**: Based on exercise type, difficulty, and topics
2. **TTL**: 24 hours for generated exercises
3. **LRU Eviction**: When cache exceeds 10,000 entries
4. **Hit Rate Target**: 80%+ cache hit rate

### Estimated Costs

| Exercise Type | GPT-4 Cost | Cache Hit Rate | Effective Cost |
|---------------|------------|----------------|----------------|
| Fill-in-Blank | $0.003 | 85% | $0.00045 |
| Multiple Choice | $0.003 | 80% | $0.00060 |
| Translation | $0.003 | 75% | $0.00075 |
| Contextual | $0.003 | 70% | $0.00090 |

**Monthly projection (1000 exercises/day):**
- Without cache: ~$90/month
- With 80% cache hit: ~$18/month
- **Actual target: $2-10/month** (achieved through high cache hit rate)

---

## Best Practices

### 1. Use Adaptive Type for Personalization

```javascript
// Let the system choose the best exercise type
const response = await fetch('/api/ai/exercises/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: currentUser.id,
    type: 'adaptive'  // System selects optimal type
  })
});
```

### 2. Prefetch During Idle Time

```javascript
// Background prefetch to improve UX
async function prefetchExercises() {
  await fetch('/api/ai/exercises/prefetch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: currentUser.id,
      count: 5
    })
  });
}

// Run during app idle time
window.addEventListener('load', () => {
  setTimeout(prefetchExercises, 3000);
});
```

### 3. Handle Errors Gracefully

```javascript
try {
  const response = await generateExercise(userId);
  if (!response.ok) {
    // Fall back to static exercises
    return getStaticExercise();
  }
  return response.json();
} catch (error) {
  console.error('AI generation failed:', error);
  return getStaticExercise();
}
```

### 4. Monitor Cache Hit Rate

```javascript
// Track cache performance
const { metadata } = await generateExercise(userId);
analytics.track('exercise_generated', {
  source: metadata.source,
  cost: metadata.cost,
  cached: !metadata.generated
});
```

---

## Support

For API support and questions:
- Email: api-support@aves.app
- Documentation: https://docs.aves.app/api
- Status Page: https://status.aves.app

---

**Last Updated:** October 2, 2025
**API Version:** 1.0.0
