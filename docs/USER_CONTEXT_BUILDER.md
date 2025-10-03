# User Context Builder - Implementation Documentation

## Overview

The User Context Builder is a service that analyzes user performance data to create intelligent context for AI-powered exercise generation. It provides adaptive difficulty, personalized topic selection, and performance-based recommendations.

**File:** `backend/src/services/userContextBuilder.ts`

---

## Core Functionality

### 1. Context Building (`buildContext`)

Generates complete user context by analyzing:
- Overall performance metrics
- Exercise history (last 20 exercises)
- Topic-specific performance
- Current learning streaks
- Weak and mastered topics

**Output:**
```typescript
interface UserContext {
  userId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 1 | 2 | 3 | 4 | 5;
  weakTopics: string[];        // accuracy < 70%
  masteredTopics: string[];    // accuracy > 90%
  newTopics: string[];         // never seen
  recentErrors: Exercise[];    // last 5 incorrect
  streak: number;
  performance: UserPerformance;
  hash: string;                // For cache key generation
}
```

---

## Level Classification Algorithm

### Beginner
- **Criteria:**
  - Less than 20 total exercises, OR
  - Overall accuracy < 60%
- **Rationale:** New users or struggling learners need easier content

### Intermediate
- **Criteria:**
  - 20-50 exercises with 60-85% accuracy, OR
  - 50+ exercises with 60-85% accuracy
- **Rationale:** Moderate performers who are actively learning

### Advanced
- **Criteria:**
  - More than 50 exercises AND
  - Overall accuracy > 85%
- **Rationale:** Experienced learners ready for challenging content

**Implementation:**
```typescript
calculateLevel(performance: UserPerformance): Level {
  const { totalExercises, accuracy } = performance;

  if (totalExercises < 20 || accuracy < 60) {
    return 'beginner';
  }

  if (totalExercises > 50 && accuracy > 85) {
    return 'advanced';
  }

  return 'intermediate';
}
```

---

## Adaptive Difficulty Algorithm

### Base Difficulty Assignment
1. **New users** (< 10 exercises): Start at difficulty 1
2. **High performers** (accuracy > 85%): Base difficulty 4
3. **Struggling users** (accuracy < 60%): Base difficulty 2
4. **Average users**: Base difficulty 3

### Adaptive Adjustments
Based on **recent 10 exercises**:

#### Increase Difficulty (+1)
- **Condition:** Recent accuracy > 85% AND streak > 5
- **Result:** Min(5, baseDifficulty + 1)
- **Rationale:** User is ready for more challenge

#### Decrease Difficulty (-1)
- **Condition:** Recent accuracy < 60%
- **Result:** Max(1, baseDifficulty - 1)
- **Rationale:** User needs easier content to rebuild confidence

#### Gradual Increase (+0.5)
- **Condition:** Recent accuracy 75-85% AND streak > 10
- **Result:** Min(5, baseDifficulty + 0.5)
- **Rationale:** Consistent performer ready for gradual progression

**Implementation:**
```typescript
calculateDifficulty(history: ExerciseHistoryItem[], performance: UserPerformance): Difficulty {
  const recent = history.slice(0, 10);
  const recentAccuracy = recent.filter(r => r.isCorrect).length / recent.length;
  const streak = this.getCurrentStreak(history);

  let baseDifficulty = 3;

  if (performance.totalExercises < 10) {
    baseDifficulty = 1;
  } else if (performance.accuracy > 85) {
    baseDifficulty = 4;
  } else if (performance.accuracy < 60) {
    baseDifficulty = 2;
  }

  let adjustedDifficulty = baseDifficulty;

  if (recentAccuracy > 0.85 && streak > 5) {
    adjustedDifficulty = Math.min(5, baseDifficulty + 1);
  } else if (recentAccuracy < 0.60) {
    adjustedDifficulty = Math.max(1, baseDifficulty - 1);
  } else if (recentAccuracy >= 0.75 && recentAccuracy <= 0.85 && streak > 10) {
    adjustedDifficulty = Math.min(5, baseDifficulty + 0.5);
  }

  return Math.round(adjustedDifficulty) as Difficulty;
}
```

---

## Topic Analysis

### Topic Classification

**Weak Topics** (Need Practice):
- **Criteria:** Accuracy < 70% with at least 3 attempts
- **Selection:** Top 5 weakest topics by accuracy
- **Usage:** Prioritized in exercise generation

**Mastered Topics** (Maintenance Review):
- **Criteria:** Accuracy > 90% with at least 3 attempts
- **Selection:** Top 5 strongest topics by accuracy
- **Usage:** Included occasionally to maintain mastery

**New Topics** (Exploration):
- **Criteria:** Never seen by user
- **Selection:** Up to 10 unexplored topics from database
- **Usage:** Gradually introduced for variety

### Topic Statistics

For each topic, we track:
- **Accuracy:** Correct attempts / Total attempts
- **Count:** Total number of attempts
- **Avg Time:** Average time spent per attempt
- **Last Seen:** Most recent attempt date

**Implementation:**
```typescript
analyzeTopics(history: ExerciseHistoryItem[]): TopicStats[] {
  const topicMap = new Map();

  history.forEach(exercise => {
    const topics = exercise.topics || [exercise.spanishTerm];

    topics.forEach(topic => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { correct: 0, total: 0, totalTime: 0 });
      }

      const stats = topicMap.get(topic);
      stats.total++;
      stats.totalTime += exercise.timeTaken;
      if (exercise.isCorrect) stats.correct++;

      if (!stats.lastSeen || exercise.completedAt > stats.lastSeen) {
        stats.lastSeen = exercise.completedAt;
      }
    });
  });

  return Array.from(topicMap.entries())
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.correct / stats.total,
      count: stats.total,
      avgTime: stats.totalTime / stats.total,
      lastSeen: stats.lastSeen
    }))
    .sort((a, b) => b.count - a.count);
}
```

---

## Streak Calculation

### Current Streak
Counts consecutive correct answers from most recent exercise backwards.

**Example:**
```
[✓, ✓, ✓, ✗, ✓, ✓] → Current Streak: 3
[✗, ✓, ✓, ✓] → Current Streak: 0
[✓, ✓, ✓, ✓] → Current Streak: 4
```

### Longest Streak
Tracks maximum consecutive correct answers in history.

**Implementation:**
```typescript
getCurrentStreak(history: ExerciseHistoryItem[]): number {
  let streak = 0;

  for (const exercise of history) {
    if (exercise.isCorrect) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

getLongestStreak(history: ExerciseHistoryItem[]): number {
  let longestStreak = 0;
  let currentStreak = 0;

  for (const exercise of history) {
    if (exercise.isCorrect) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return longestStreak;
}
```

---

## Cache Key Generation

To enable efficient caching of generated exercises, we create a deterministic hash from context:

**Hashed Elements:**
- User level (beginner/intermediate/advanced)
- Difficulty (1-5)
- Weak topics (sorted)
- Mastered topics (sorted)
- New topics (sorted)

**Implementation:**
```typescript
generateContextHash(context: Partial<UserContext>): string {
  const key = JSON.stringify({
    level: context.level,
    difficulty: context.difficulty,
    weakTopics: context.weakTopics?.sort(),
    masteredTopics: context.masteredTopics?.sort(),
    newTopics: context.newTopics?.sort()
  });

  return crypto
    .createHash('sha256')
    .update(key)
    .digest('hex')
    .substring(0, 16);
}
```

**Benefits:**
- Same context = same hash = cache hit
- Changes in user performance = new hash = fresh exercises
- Efficient cache invalidation

---

## Performance Tracking

### Metrics Collected

**Overall Performance:**
- Total exercises completed
- Correct answers count
- Overall accuracy percentage
- Average time per exercise

**Streak Tracking:**
- Current consecutive correct answers
- Longest streak achieved

**Topic-Specific:**
- Per-topic accuracy
- Attempt counts
- Average completion time
- Last practice date

### Database Queries

**User Performance:**
```sql
SELECT
  COUNT(*) as total_exercises,
  COUNT(CASE WHEN is_correct THEN 1 END) as correct_answers,
  AVG(time_taken) as avg_time,
  COUNT(CASE WHEN is_correct THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as accuracy
FROM exercise_results
WHERE session_id IN (
  SELECT session_id FROM exercise_sessions WHERE session_id LIKE 'user-123%'
)
```

**Exercise History:**
```sql
SELECT
  er.id as exercise_id,
  er.exercise_type,
  er.spanish_term,
  er.is_correct,
  er.time_taken,
  er.created_at as completed_at
FROM exercise_results er
WHERE er.session_id IN (
  SELECT session_id FROM exercise_sessions WHERE session_id LIKE 'user-123%'
)
ORDER BY er.created_at DESC
LIMIT 20
```

**Unexplored Topics:**
```sql
SELECT DISTINCT a.label_spanish as topic
FROM annotations a
WHERE a.label_spanish NOT IN (
  SELECT DISTINCT spanish_term
  FROM exercise_results er
  WHERE er.session_id IN (
    SELECT session_id FROM exercise_sessions WHERE session_id LIKE 'user-123%'
  )
)
LIMIT 10
```

---

## Usage Example

```typescript
import { UserContextBuilder } from './services/userContextBuilder';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const builder = new UserContextBuilder(pool);

// Build context for user
const context = await builder.buildContext('user-123');

console.log(builder.getContextSummary(context));
// Output: "User: user-123 | Level: intermediate | Difficulty: 3/5 |
//          Accuracy: 78.5% | Streak: 4 | Weak Topics: pico, alas |
//          Mastered: plumas | New Topics: cola, patas, garras"

// Use context for AI exercise generation
const prompt = `
Generate a ${context.level}-level exercise at difficulty ${context.difficulty}/5.

Focus on these weak areas: ${context.weakTopics.join(', ')}
Review these mastered topics: ${context.masteredTopics.join(', ')}
Introduce new topics: ${context.newTopics.slice(0, 2).join(', ')}

Recent errors to review:
${context.recentErrors.map(e => `- ${e.spanishTerm}`).join('\n')}
`;
```

---

## Testing

Comprehensive test suite in `backend/src/__tests__/services/userContextBuilder.test.ts`:

### Test Coverage
- ✅ Level classification (beginner/intermediate/advanced)
- ✅ Difficulty calculation (1-5 scale)
- ✅ Topic analysis (accuracy, frequency, time)
- ✅ Streak calculation (current and longest)
- ✅ Weak/mastered topic identification
- ✅ Context building integration
- ✅ Hash generation consistency

### Example Tests
```typescript
describe('calculateDifficulty', () => {
  it('should increase difficulty for high performers with streaks', () => {
    const performance = {
      totalExercises: 40,
      correctAnswers: 36,
      accuracy: 90,
      // ...
    };

    const history = Array(10).fill({ isCorrect: true });
    const difficulty = builder.calculateDifficulty(history, performance);

    expect(difficulty).toBeGreaterThanOrEqual(4);
  });
});
```

---

## Integration with AI Exercise Generator

The UserContext is designed to work seamlessly with AI prompts:

```typescript
// In AIExerciseGenerator
async generateExercise(type: ExerciseType, userId: string): Promise<Exercise> {
  // 1. Build user context
  const context = await this.contextBuilder.buildContext(userId);

  // 2. Check cache using context hash
  const cached = await this.cache.get(context.hash);
  if (cached) return cached;

  // 3. Generate prompt with context
  const prompt = this.buildPrompt(type, context);

  // 4. Call GPT-4 with context-aware prompt
  const exercise = await this.generateWithAI(prompt);

  // 5. Cache result
  await this.cache.set(context.hash, exercise);

  return exercise;
}
```

---

## Future Enhancements

### Topic Taxonomy
Currently, topics are extracted directly from Spanish terms. Future versions could:
- Categorize into semantic groups (colors, parts, behaviors)
- Track hierarchical topic relationships
- Enable cross-topic recommendations

### Time-Based Analysis
- Track performance by time of day
- Identify optimal learning windows
- Adjust difficulty based on session duration

### Spaced Repetition
- Implement SM-2 or similar algorithm
- Schedule reviews based on forgetting curve
- Track retention rates over time

### Multi-User Insights
- Compare performance to peer groups
- Identify commonly difficult topics
- Optimize curriculum based on aggregate data

---

## Performance Considerations

**Database Queries:**
- Limited to last 20-50 exercises for performance
- Indexed on `session_id` and `created_at`
- Queries optimized for common access patterns

**Memory Usage:**
- Context building processes max 20 exercises
- Topic maps use efficient data structures
- Hash generation is constant time

**Caching:**
- Context hash enables deterministic caching
- Same user state = same hash = cache hit
- Cache invalidation automatic on context change

---

## Summary

The User Context Builder provides:

✅ **Adaptive Learning**: Difficulty adjusts to user performance
✅ **Personalization**: Focuses on weak areas, reviews mastered content
✅ **Progression**: Tracks streaks and introduces new topics
✅ **Intelligence**: Provides rich context for AI exercise generation
✅ **Efficiency**: Deterministic hashing enables effective caching
✅ **Testability**: Comprehensive test coverage ensures reliability

This service is the foundation for intelligent, personalized exercise generation in Phase 2.
