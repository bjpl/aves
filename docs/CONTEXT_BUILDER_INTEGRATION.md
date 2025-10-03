# User Context Builder - Integration Guide

## How to Use UserContextBuilder with AI Exercise Generator

This guide shows how to integrate the UserContextBuilder with the AI Exercise Generator for intelligent, personalized exercise creation.

---

## Quick Start

### 1. Import and Initialize

```typescript
import { UserContextBuilder } from './services/userContextBuilder';
import { AIExerciseGenerator } from './services/aiExerciseGenerator';
import { ExerciseCache } from './services/exerciseCache';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const contextBuilder = new UserContextBuilder(pool);
const exerciseGenerator = new AIExerciseGenerator(pool);
const exerciseCache = new ExerciseCache(pool);
```

---

## 2. Generate Personalized Exercise

### Basic Pattern

```typescript
async function generatePersonalizedExercise(userId: string, type?: ExerciseType) {
  // Step 1: Build user context
  const context = await contextBuilder.buildContext(userId);

  // Step 2: Check cache using context hash
  const cached = await exerciseCache.get(context.hash);
  if (cached) {
    console.log('Cache hit! Saved $0.003');
    return cached;
  }

  // Step 3: Generate with AI using context
  const exercise = await exerciseGenerator.generate(type || 'adaptive', context);

  // Step 4: Cache the result
  await exerciseCache.set(context.hash, exercise, 86400); // 24 hours

  return exercise;
}
```

---

## 3. API Endpoint Example

```typescript
// POST /api/ai/exercises/generate
router.post('/generate', authenticateToken, async (req, res) => {
  const { type, userId } = req.body;

  try {
    // Build context
    const context = await contextBuilder.buildContext(userId);

    // Log context for monitoring
    logger.info('Generated context', {
      summary: contextBuilder.getContextSummary(context),
      hash: context.hash
    });

    // Check cache
    let exercise = await exerciseCache.get(context.hash);
    let generated = false;

    if (!exercise) {
      // Cache miss - generate with AI
      exercise = await exerciseGenerator.generate(type || 'adaptive', context);
      await exerciseCache.set(context.hash, exercise);
      generated = true;
    }

    res.json({
      exercise,
      metadata: {
        generated,
        cacheKey: context.hash,
        cost: generated ? 0.003 : 0,
        difficulty: context.difficulty,
        level: context.level,
        focusAreas: context.weakTopics
      }
    });
  } catch (error) {
    logger.error('Exercise generation failed', { error, userId });
    res.status(500).json({ error: 'Failed to generate exercise' });
  }
});
```

---

## 4. AI Prompt Generation

### Use Context in Prompts

```typescript
function buildAIPrompt(type: ExerciseType, context: UserContext): string {
  const basePrompt = `
You are a Spanish language tutor creating vocabulary exercises about birds.

STUDENT PROFILE:
================
Level: ${context.level}
${context.level === 'beginner' ? '→ Keep it simple and encouraging!' :
  context.level === 'advanced' ? '→ Make it challenging and nuanced!' :
  '→ Moderate difficulty with gradual progression'}

Current Performance:
- Overall Accuracy: ${context.performance.accuracy.toFixed(1)}%
- Success Streak: ${context.streak} exercises
- Difficulty Level: ${context.difficulty}/5

LEARNING PRIORITIES:
===================
1. Practice Weak Areas:
${context.weakTopics.length > 0
  ? context.weakTopics.map(t => `   - ${t} (student struggling here)`).join('\n')
  : '   - No weak areas identified'}

2. Reinforce Mastered Topics:
${context.masteredTopics.length > 0
  ? context.masteredTopics.map(t => `   - ${t} (known well, review occasionally)`).join('\n')
  : '   - Building mastery'}

3. Introduce New Content:
${context.newTopics.slice(0, 3).map(t => `   - ${t} (new topic)`).join('\n')}

RECENT MISTAKES TO REVIEW:
==========================
${context.recentErrors.slice(0, 3).map(e =>
  `- ${e.spanishTerm} (missed ${Math.floor((Date.now() - e.completedAt.getTime()) / (1000 * 60 * 60 * 24))} days ago)`
).join('\n') || '- No recent errors'}

TASK:
=====
Create a ${type} exercise that:
1. Focuses on 1 weak topic if available, otherwise introduce a new topic
2. Briefly reviews 1 mastered topic for retention
3. Matches difficulty level ${context.difficulty}/5
4. Creates natural, memorable Spanish sentences
5. Uses bird vocabulary in realistic contexts

RETURN JSON FORMAT:
==================
{
  "sentence": "El cardenal tiene plumas _____ brillantes.",
  "correctAnswer": "rojas",
  "distractors": ["azules", "verdes", "negras"],
  "hint": "Think about the common color of cardinals",
  "difficulty": ${context.difficulty},
  "focusTopics": ["plumas", "colores"],
  "vocabulary": [
    {"spanish": "plumas", "english": "feathers", "mastery": "high"},
    {"spanish": "rojas", "english": "red", "mastery": "low"}
  ],
  "explanation": "Cardinals are known for their bright red plumage."
}`;

  return basePrompt;
}
```

---

## 5. Monitoring and Analytics

### Track Context Changes

```typescript
async function trackContextEvolution(userId: string) {
  const context = await contextBuilder.buildContext(userId);

  // Log to analytics
  analytics.track('user_context_updated', {
    userId,
    level: context.level,
    difficulty: context.difficulty,
    weakTopicsCount: context.weakTopics.length,
    masteredTopicsCount: context.masteredTopics.length,
    streak: context.streak,
    accuracy: context.performance.accuracy,
    hash: context.hash
  });

  // Alert if user struggling
  if (context.difficulty === 1 && context.performance.accuracy < 50) {
    logger.warn('User struggling significantly', { userId, context });
    // Could trigger intervention: easier content, hints, etc.
  }

  // Celebrate if user advancing
  if (context.level === 'advanced' && context.streak > 10) {
    logger.info('User performing excellently', { userId, context });
    // Could trigger reward: badge, achievement, etc.
  }
}
```

---

## 6. Batch Exercise Generation

### Pre-generate Exercises

```typescript
async function prefetchExercises(userId: string, count: number = 10) {
  const context = await contextBuilder.buildContext(userId);
  const types: ExerciseType[] = [
    'contextual_fill',
    'term_matching',
    'visual_discrimination',
    'visual_identification'
  ];

  const exercises = [];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];

    // Check cache first
    let exercise = await exerciseCache.get(context.hash, type);

    if (!exercise) {
      exercise = await exerciseGenerator.generate(type, context);
      await exerciseCache.set(context.hash, exercise, 86400, type);
    }

    exercises.push(exercise);
  }

  return exercises;
}
```

---

## 7. Adaptive Difficulty Feedback Loop

### Update Context After Each Exercise

```typescript
async function completeExercise(
  userId: string,
  exerciseId: string,
  correct: boolean,
  timeTaken: number
) {
  // Record result
  await exerciseService.recordResult({
    sessionId: userId,
    exerciseType: 'contextual_fill',
    spanishTerm: 'pico',
    userAnswer: 'pico',
    isCorrect: correct,
    timeTaken
  });

  // Get fresh context (difficulty may have changed)
  const newContext = await contextBuilder.buildContext(userId);

  // Log difficulty changes
  const oldContext = await contextBuilder.buildContext(userId); // from cache
  if (newContext.difficulty !== oldContext.difficulty) {
    logger.info('Difficulty adjusted', {
      userId,
      oldDifficulty: oldContext.difficulty,
      newDifficulty: newContext.difficulty,
      reason: correct ? 'performing well' : 'needs easier content'
    });
  }

  return newContext;
}
```

---

## 8. Frontend Integration

### React Hook Example

```typescript
// frontend/src/hooks/usePersonalizedExercise.ts
import { useQuery } from '@tanstack/react-query';

export const usePersonalizedExercise = (userId: string) => {
  return useQuery({
    queryKey: ['personalized-exercise', userId],
    queryFn: async () => {
      const response = await fetch('/api/ai/exercises/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      // Track if AI generated or cached
      analytics.track('exercise_loaded', {
        generated: data.metadata.generated,
        difficulty: data.metadata.difficulty,
        level: data.metadata.level,
        cost: data.metadata.cost
      });

      return data;
    },
    staleTime: 0 // Always fetch fresh
  });
};
```

---

## 9. Cost Optimization

### Cache Hit Rate Monitoring

```typescript
async function getCacheStats() {
  const stats = await exerciseCache.getStats();

  return {
    totalRequests: stats.hits + stats.misses,
    cacheHits: stats.hits,
    cacheMisses: stats.misses,
    hitRate: (stats.hits / (stats.hits + stats.misses) * 100).toFixed(1),
    costSavings: stats.hits * 0.003, // $0.003 per generation saved
    actualCost: stats.misses * 0.003
  };
}

// Example output:
// {
//   totalRequests: 1000,
//   cacheHits: 850,
//   cacheMisses: 150,
//   hitRate: "85.0%",
//   costSavings: 2.55,  // $2.55 saved
//   actualCost: 0.45    // $0.45 spent
// }
```

---

## 10. Error Handling

### Graceful Degradation

```typescript
async function generateExerciseWithFallback(userId: string) {
  try {
    // Try to build context
    const context = await contextBuilder.buildContext(userId);

    try {
      // Try cache
      const cached = await exerciseCache.get(context.hash);
      if (cached) return cached;

      try {
        // Try AI generation
        const exercise = await exerciseGenerator.generate('adaptive', context);
        await exerciseCache.set(context.hash, exercise);
        return exercise;
      } catch (aiError) {
        logger.error('AI generation failed', { aiError, userId });
        // Fallback to static exercise pool
        return await getStaticExercise(context.level, context.difficulty);
      }
    } catch (cacheError) {
      logger.warn('Cache failed', { cacheError, userId });
      // Continue without cache
      return await exerciseGenerator.generate('adaptive', context);
    }
  } catch (contextError) {
    logger.error('Context building failed', { contextError, userId });
    // Fallback to default context
    const defaultContext = {
      level: 'beginner',
      difficulty: 2,
      weakTopics: [],
      masteredTopics: [],
      newTopics: []
    };
    return await exerciseGenerator.generate('adaptive', defaultContext);
  }
}
```

---

## Best Practices

### 1. Always Build Fresh Context
```typescript
// ✅ Good: Fresh context for each request
const context = await contextBuilder.buildContext(userId);

// ❌ Bad: Reusing stale context
const cachedContext = getFromMemory(userId); // Could be outdated
```

### 2. Use Context Hash for Caching
```typescript
// ✅ Good: Use context hash
await cache.set(context.hash, exercise);

// ❌ Bad: Use userId (too specific, low hit rate)
await cache.set(userId, exercise);
```

### 3. Log Context Changes
```typescript
// ✅ Good: Track evolution
logger.info('Context updated', {
  summary: contextBuilder.getContextSummary(context),
  hash: context.hash
});
```

### 4. Monitor Performance
```typescript
// ✅ Good: Track metrics
analytics.track('context_built', {
  buildTime: Date.now() - startTime,
  level: context.level,
  difficulty: context.difficulty
});
```

---

## Summary

The UserContextBuilder provides:

✅ **Personalization:** Tailored to individual user performance
✅ **Adaptation:** Difficulty adjusts automatically
✅ **Efficiency:** Deterministic caching reduces costs
✅ **Intelligence:** Rich context for AI prompts
✅ **Reliability:** Graceful error handling and fallbacks

**Integration Pattern:**
1. Build context → 2. Check cache → 3. Generate with AI → 4. Cache result

**Expected Cost Savings:** 80%+ through effective caching
**Expected User Engagement:** 20%+ increase through personalization

---

**Ready to integrate with AI Exercise Generator! 🚀**
