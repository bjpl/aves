# AI Exercise Generation API

RESTful API for AI-powered exercise generation with smart caching to minimize costs.

## Base URL

```
/api/ai/exercises
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Admin-only endpoints additionally require an admin or moderator role.

## Rate Limiting

**100 requests per 15 minutes** for all AI exercise generation endpoints.

---

## Endpoints

### 1. Generate AI Exercise

Generate a personalized exercise for a user, utilizing cache when possible.

**Endpoint:** `POST /api/ai/exercises/generate`

**Authentication:** Required (JWT)

**Rate Limit:** 100 requests/15 minutes

**Request Body:**

```json
{
  "type": "contextual_fill",  // Optional: specific exercise type
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Exercise Types:**
- `visual_discrimination`
- `visual_identification`
- `audio_recognition`
- `sentence_building`
- `cultural_context`
- `term_matching`
- `contextual_fill`
- `image_labeling`

**Response:**

```json
{
  "exercise": {
    "id": "ex_1696284720_k3j4h5",
    "type": "contextual_fill",
    "instructions": "Complete this exercise",
    "prompt": "Sample AI-generated exercise",
    "metadata": {
      "difficulty": 2,
      "generated": true,
      "timestamp": "2025-10-02T14:32:00.000Z"
    }
  },
  "metadata": {
    "generated": false,        // true = AI generated, false = from cache
    "cacheKey": "user123_contextual_fill_2",
    "cost": 0,                  // $0.003 if generated, $0 if cached
    "difficulty": 2
  }
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/ai/exercises/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contextual_fill",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 2. Get Exercise Statistics

Retrieve aggregate statistics for AI exercise generation and caching performance.

**Endpoint:** `GET /api/ai/exercises/stats`

**Authentication:** Required (Admin only)

**Request:** No body required

**Response:**

```json
{
  "totalGenerated": 1250,      // Total exercises generated via AI
  "cached": 1000,              // Exercises with cache hits
  "cacheHitRate": 0.80,        // 80% cache hit rate
  "totalCost": 3.75,           // Total API cost ($0.003 per generation)
  "avgGenerationTime": 2000    // Average generation time in ms
}
```

**Example Request:**

```bash
curl -X GET http://localhost:3001/api/ai/exercises/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

### 3. Prefetch Exercises

Pre-generate exercises for a user to improve response time during actual practice sessions.

**Endpoint:** `POST /api/ai/exercises/prefetch`

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "count": 10  // Number of exercises to prefetch (1-50)
}
```

**Response:**

```json
{
  "message": "Exercises prefetched successfully",
  "prefetched": 10,
  "cached": 10
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/ai/exercises/prefetch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "count": 10
  }'
```

**Use Case:**
- Call this endpoint when a user starts a practice session
- Pre-generates exercises in the background
- Subsequent exercise requests will be instant (served from cache)

---

### 4. Clear User Cache

Clear all cached exercises for a specific user (for testing/debugging).

**Endpoint:** `DELETE /api/ai/exercises/cache/:userId`

**Authentication:** Required (Admin only)

**URL Parameters:**
- `userId` (UUID) - User ID whose cache should be cleared

**Response:**

```json
{
  "message": "Cache cleared successfully",
  "deletedCount": 15
}
```

**Example Request:**

```bash
curl -X DELETE http://localhost:3001/api/ai/exercises/cache/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Use Case:**
- Testing new exercise generation logic
- Debugging cache issues
- Resetting user's exercise pool

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": {
    "userId": ["Invalid UUID format"]
  }
}
```

### 401 Unauthorized

```json
{
  "error": "Access token required"
}
```

### 403 Forbidden (Admin endpoints)

```json
{
  "error": "Forbidden",
  "message": "Admin or moderator access required"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many exercise generation requests. Please try again later."
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to generate exercise"
}
```

---

## Cache Strategy

### Cache Key Generation

Cache keys are generated based on:
- User ID
- Exercise type
- Difficulty level (1-5)

Format: `{userId}_{exerciseType}_{difficulty}`

Example: `550e8400-e29b-41d4-a716-446655440000_contextual_fill_2`

### Cache Expiration

- **TTL:** 24 hours
- **Eviction:** LRU (Least Recently Used) when cache exceeds 10,000 entries

### Cache Hit Rate Target

**80%+** cache hit rate to achieve operational cost of **$2-10/month**

### Cost Calculation

- **AI Generation Cost:** $0.003 per exercise
- **Cache Hit:** $0.00 (free)
- **Monthly Target:** <$10 with 80% cache hit rate

---

## Integration Example

### React Query Hook

```typescript
import { useMutation } from '@tanstack/react-query';

export const useGenerateAIExercise = (userId: string) => {
  return useMutation({
    mutationFn: async (type?: ExerciseType) => {
      const response = await fetch('/api/ai/exercises/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ userId, type })
      });

      if (!response.ok) throw new Error('Failed to generate exercise');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Exercise generated:', {
        cached: !data.metadata.generated,
        cost: data.metadata.cost,
        difficulty: data.metadata.difficulty
      });
    }
  });
};
```

### Usage in Component

```typescript
export const PracticeSession: React.FC = () => {
  const { user } = useAuth();
  const { mutate: generateExercise, data, isLoading } = useGenerateAIExercise(user.id);

  useEffect(() => {
    // Generate exercise on mount
    generateExercise('contextual_fill');
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div>
      {data?.metadata.generated && (
        <Badge>✨ AI-Generated</Badge>
      )}
      <ExerciseRenderer exercise={data?.exercise} />
      <Button onClick={() => generateExercise()}>
        Next Exercise
      </Button>
    </div>
  );
};
```

---

## Database Schema

Exercise cache is stored in the `exercise_cache` table:

```sql
CREATE TABLE exercise_cache (
  id UUID PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  exercise_type VARCHAR(50) NOT NULL,
  exercise_data JSONB NOT NULL,
  user_context_hash VARCHAR(64) NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

**Indexes:**
- `idx_exercise_cache_key` - Cache key lookup (unique)
- `idx_exercise_type_difficulty` - Type/difficulty filtering
- `idx_exercise_expires_at` - Expiration cleanup
- `idx_exercise_last_used` - LRU eviction

---

## Performance Metrics

### Response Times

- **Cache Hit:** <100ms
- **AI Generation:** ~2000ms (2 seconds)
- **Prefetch (background):** Async, no blocking

### Cache Efficiency

- **Target Hit Rate:** 80%
- **Current Hit Rate:** See `/api/ai/exercises/stats`
- **Cache Size Limit:** 10,000 entries

### Cost Optimization

- **With 0% cache:** ~$9/month (100 exercises/day)
- **With 80% cache:** ~$2/month (100 exercises/day)
- **With 85% cache:** ~$1.50/month (100 exercises/day)

---

## Validation Schemas

### Generate Exercise Request

```typescript
{
  type: z.enum([
    'visual_discrimination',
    'visual_identification',
    'audio_recognition',
    'sentence_building',
    'cultural_context',
    'term_matching',
    'contextual_fill',
    'image_labeling'
  ]).optional(),
  userId: z.string().uuid()
}
```

### Prefetch Request

```typescript
{
  userId: z.string().uuid(),
  count: z.number().int().min(1).max(50).default(10)
}
```

### User ID Parameter

```typescript
{
  userId: z.string().uuid()
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Cache Hit Rate:** Should be >80%
2. **Total API Cost:** Should be <$10/month
3. **Generation Time:** Average ~2s
4. **Cache Size:** Monitor to avoid excessive growth
5. **Popular Exercise Types:** Optimize caching for most-used types

### Admin Dashboard Queries

```sql
-- Overall cache performance
SELECT * FROM exercise_cache_overview;

-- Cache stats by exercise type
SELECT * FROM exercise_cache_stats;

-- Find expired entries
SELECT COUNT(*) FROM expired_exercises;

-- Clean up expired cache
SELECT cleanup_expired_exercises();

-- Evict LRU entries (keep max 10,000)
SELECT evict_lru_exercises(10000);
```

---

## Future Enhancements

### Phase 2 Features (Weeks 3-4)

- [ ] **Context-Aware Generation:** Use user performance data
- [ ] **Difficulty Adaptation:** Auto-adjust based on success rate
- [ ] **GPT-4 Integration:** Real AI exercise generation (currently mock)
- [ ] **Prompt Engineering:** Optimize prompts for quality/cost
- [ ] **Quality Validation:** Spanish language validation
- [ ] **A/B Testing:** Test different generation strategies

### Advanced Features

- [ ] **Multi-language Support:** Beyond Spanish
- [ ] **Exercise Recommendations:** ML-based personalization
- [ ] **Collaborative Filtering:** Learn from all users
- [ ] **Real-time Analytics:** Dashboard for cache performance
- [ ] **Cost Alerts:** Notify when approaching budget limits

---

## Support

For issues or questions, contact the development team or file an issue in the project repository.

**Related Documentation:**
- [Phase 2 Implementation Plan](../PHASE_2_INTELLIGENT_EXERCISE_GENERATION.md)
- [Exercise Cache Schema](../../backend/src/database/migrations/007_exercise_cache.sql)
- [AI Exercise Service](../../backend/src/services/aiExerciseGenerator.ts)
