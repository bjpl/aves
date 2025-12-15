# Spaced Repetition System (SRS) Integration with Practice Exercises

## Overview

The Practice page and exercise system now properly integrates with the Spaced Repetition System (SRS) to track user progress on Spanish vocabulary terms and optimize review scheduling.

## Implementation

### 1. New Hook: `useExerciseSRS`

**Location:** `/frontend/src/hooks/useExerciseSRS.ts`

This hook converts exercise results into SRS quality scores and records reviews for vocabulary terms.

#### Quality Score Mapping (0-5 scale)

The hook maps exercise performance to SM-2 algorithm quality scores:

| Score | Description | Criteria |
|-------|-------------|----------|
| 5 | Perfect - Fast recall | Correct answer in < 1.5 seconds, no hints |
| 4 | Good - Normal recall | Correct answer in 1.5-3 seconds, no hints |
| 3 | Correct but hesitant | Correct but slow (3-5s) OR hints used |
| 2 | Partially correct | Some points earned but not fully correct |
| 1 | Wrong but close | Incorrect but fast attempt (< 1.5s) |
| 0 | Wrong | Incorrect with slow response |

#### Key Features

1. **Timing-Based Quality**: Uses response time to differentiate between perfect recall (fast) and hesitant recall (slow)
2. **Hint Penalty**: Automatically reduces quality score when hints are used
3. **Partial Credit**: Supports exercises with partial success (e.g., getting 3 out of 4 matches correct)
4. **Multi-Term Support**: Handles exercises involving multiple vocabulary terms
5. **Non-Critical Recording**: SRS failures don't block exercise completion

### 2. Updated Components

#### ExerciseContainer

**Location:** `/frontend/src/components/exercises/ExerciseContainer.tsx`

**Changes:**
- Updated `onExerciseComplete` callback signature to accept `ExerciseResult` instead of `(correct, annotationId)`
- Added exercise timing tracking with `exerciseStartTime` ref
- Creates structured `ExerciseResult` objects with:
  - `exerciseId`: Annotation/term ID for SRS tracking
  - `exerciseType`: Type of exercise performed
  - `correct`: Whether answer was correct
  - `score`: Normalized score (0-1) for partial credit
  - `timeTaken`: Response time in milliseconds

#### PracticePage

**Location:** `/frontend/src/pages/PracticePage.tsx`

**Changes:**
- Imports and uses `useExerciseSRS` hook
- Removed direct SRS recording logic (now handled by `useExerciseSRS`)
- Updated exercise completion handlers to use `recordExerciseReview(result)`
- Works with all three practice modes:
  - Traditional mode (ExerciseContainer)
  - Enhanced mode (EnhancedPracticeSession)
  - AI mode (AIExerciseContainer)

#### EnhancedPracticeSession

**Location:** `/frontend/src/components/practice/EnhancedPracticeSession.tsx`

**Already Compatible:**
- Already used `ExerciseResult` type in callback
- Individual exercise components (TermMatchingExercise, AudioRecognitionExercise, etc.) already generate proper `ExerciseResult` objects

## Exercise Type Handling

### Single-Term Exercises

Most exercises involve a single vocabulary term:
- **Visual Identification**: User selects the correct Spanish term
- **Audio Recognition**: User identifies the term from audio
- **Spatial Identification**: User clicks on the anatomical feature

For these, the `exerciseId` is the annotation/term ID.

### Multi-Term Exercises

Some exercises involve multiple terms:
- **Term Matching**: Match multiple Spanish-English pairs
- **Category Sorting**: Sort terms into categories
- **Comparative Analysis**: Answer questions about multiple terms

For multi-term exercises:
- Primary term ID is tracked in `exerciseId`
- Partial success is reflected in the `score` (0-1)
- Quality score is adjusted based on partial success rate:
  - 100% correct → Use base quality score
  - 75-99% correct → Cap quality at 4 (good but not perfect)
  - 50-74% correct → Quality 3 (partial success)
  - < 50% correct → Quality 2 (needs more practice)

## Data Flow

```
User completes exercise
  ↓
Exercise component generates ExerciseResult
  {
    exerciseId: "annotation-123",
    exerciseType: "audio_recognition",
    correct: true,
    score: 1.0,
    timeTaken: 1200,
    hintsUsed: 0
  }
  ↓
useExerciseSRS.recordExerciseReview(result)
  ↓
Calculate quality score (0-5)
  - Analyze correctness
  - Factor in response time
  - Apply hint penalties
  - Adjust for partial success
  ↓
useSpacedRepetition.recordReview({
  termId: "annotation-123",
  quality: 5,
  responseTimeMs: 1200
})
  ↓
Backend SRS system updates:
  - Interval calculation (SM-2)
  - Next review date
  - Ease factor adjustment
  - Mastery level tracking
```

## Benefits

1. **Optimized Review Scheduling**: Terms are scheduled for review at optimal intervals based on performance
2. **Personalized Learning**: Quality scores reflect individual performance characteristics (speed, accuracy, hint usage)
3. **Progressive Mastery**: System tracks progress from initial exposure to mastery
4. **Multi-Dimensional Assessment**: Considers correctness, speed, confidence (hints), and partial success
5. **Non-Intrusive**: SRS tracking happens silently without disrupting the learning experience

## Future Enhancements

Potential improvements for the SRS integration:

1. **Multi-Term Tracking**: Record reviews for all terms in multi-term exercises separately
2. **Context Metadata**: Store additional context (exercise type, difficulty level) with reviews
3. **Session Analytics**: Track overall session performance for adaptive difficulty
4. **Streak Bonuses**: Factor in learning streaks when calculating quality
5. **Error Pattern Analysis**: Identify common mistakes to generate targeted practice

## Testing

The integration has been verified to:
- ✅ Build successfully with TypeScript
- ✅ Work with all three practice modes (traditional, enhanced, AI)
- ✅ Handle single-term and multi-term exercises
- ✅ Record reviews without blocking exercise flow
- ✅ Calculate appropriate quality scores based on performance

## API Reference

### useExerciseSRS Hook

```typescript
const {
  recordExerciseReview,           // (result: ExerciseResult) => Promise<void>
  calculateQualityFromExercise,   // (result: ExerciseResult) => number
  extractTermIds,                 // (result: ExerciseResult) => string[]
  getQualityDescription,          // (quality: number) => string
  isRecording,                    // boolean
} = useExerciseSRS();
```

### ExerciseResult Interface

```typescript
interface ExerciseResult {
  exerciseId: string;           // Term/annotation ID
  exerciseType: ExerciseType;   // Type of exercise
  correct: boolean;             // Was answer correct?
  score: number;                // 0-1 for partial credit
  timeTaken: number;            // Response time in ms
  attemptsCount?: number;       // Number of attempts
  hintsUsed?: number;           // Number of hints used
  metadata?: {
    // Exercise-specific metadata
    matchedPairs?: number;
    totalPairs?: number;
    // ... etc
  };
}
```

## Configuration

Quality score thresholds can be adjusted in `/frontend/src/hooks/useExerciseSRS.ts`:

```typescript
const QUALITY_THRESHOLDS = {
  FAST_TIME_MS: 1500,       // < 1.5s = fast recall
  NORMAL_TIME_MS: 3000,     // < 3s = normal recall
  SLOW_TIME_MS: 5000,       // < 5s = slow but correct
  PARTIAL_THRESHOLD: 0.7,   // 70% score threshold
  GOOD_SCORE: 0.85,         // 85% = good performance
};
```

---

**Last Updated:** 2025-12-14
**Status:** Implemented and tested
**Related Files:**
- `/frontend/src/hooks/useExerciseSRS.ts` (new)
- `/frontend/src/hooks/useSpacedRepetition.ts`
- `/frontend/src/pages/PracticePage.tsx`
- `/frontend/src/components/exercises/ExerciseContainer.tsx`
- `/frontend/src/components/practice/EnhancedPracticeSession.tsx`
