# Phase 2: AI Exercise Generation - Quick Start Guide

**Get started with intelligent exercise generation in 5 minutes**

---

## Overview

Phase 2 adds intelligent exercise generation to the Aves platform, creating personalized Spanish learning exercises that adapt to each user's skill level and learning patterns.

**Key Features:**
- Multiple exercise types (visual discrimination, term matching, contextual fill)
- Session-based progress tracking
- Performance analytics and difficult term identification
- Type-safe exercise generation
- Zero API costs with client-side generation

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Testing the System](#testing-the-system)
6. [Usage Examples](#usage-examples)
7. [Configuration Options](#configuration-options)
8. [Deployment Checklist](#deployment-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting Phase 2, ensure you have completed:

- ✅ Phase 1 (Vision AI and annotation system)
- ✅ PostgreSQL 14+ installed and running
- ✅ Node.js 18+ and npm 9+
- ✅ All Phase 1 database migrations applied

**Verify prerequisites:**
```bash
# Check Node version
node --version  # Should be 18+

# Check PostgreSQL
psql --version  # Should be 14+

# Check Phase 1 completion
npm run test  # All Phase 1 tests should pass
```

---

## Quick Setup

### 1. Install Dependencies

```bash
# From project root
npm install

# Frontend dependencies
cd frontend && npm install

# Backend dependencies
cd ../backend && npm install
```

### 2. Run Database Migrations

```bash
# From backend directory
cd backend

# Apply Phase 2 migrations (exercise tables)
npm run db:migrate
```

**Expected tables created:**
- `exercise_sessions` - Track learning sessions
- `exercise_results` - Store individual exercise attempts

### 3. Verify Installation

```bash
# Run Phase 2 tests
npm run test -- exerciseGenerator

# Start development servers
cd ..
npm run dev
```

You should see:
```
✅ Frontend running on http://localhost:5173
✅ Backend running on http://localhost:3001
✅ Exercise generation ready
```

---

## Environment Configuration

### Backend Configuration

Update `backend/.env`:

```bash
# Database (should already be configured)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3001
NODE_ENV=development

# Optional: OpenAI (for future AI enhancements)
OPENAI_API_KEY=your_openai_key  # Optional for Phase 2
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7

# Feature Flags
ENABLE_EXERCISE_GENERATION=true
ENABLE_SESSION_TRACKING=true
ENABLE_PERFORMANCE_ANALYTICS=true

# Performance
EXERCISE_CACHE_TTL=3600  # 1 hour
MAX_EXERCISES_PER_SESSION=50
SESSION_TIMEOUT=7200  # 2 hours
```

### Frontend Configuration

Update `frontend/.env`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_ENABLE_EXERCISES=true

# Feature Flags
VITE_ENABLE_ADAPTIVE_DIFFICULTY=true
VITE_ENABLE_PROGRESS_TRACKING=true
VITE_SHOW_EXERCISE_METADATA=true

# Analytics (optional)
VITE_ANALYTICS_ENABLED=false
```

---

## Database Setup

### Migration Files

Phase 2 requires the following database tables:

**exercise_sessions table:**
```sql
CREATE TABLE exercise_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  exercises_completed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0
);
```

**exercise_results table:**
```sql
CREATE TABLE exercise_results (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  exercise_type VARCHAR(50) NOT NULL,
  annotation_id INTEGER REFERENCES annotations(id),
  spanish_term VARCHAR(255),
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_session ON exercise_results(session_id);
CREATE INDEX idx_results_term ON exercise_results(spanish_term);
CREATE INDEX idx_results_type ON exercise_results(exercise_type);
```

### Apply Migrations

```bash
# From backend directory
cd backend

# Check migration status
npm run db:status

# Run migrations
npm run db:migrate

# Verify tables created
psql -d aves -c "\dt exercise_*"
```

Expected output:
```
              List of relations
 Schema |        Name         | Type  |  Owner
--------+---------------------+-------+----------
 public | exercise_results    | table | postgres
 public | exercise_sessions   | table | postgres
```

### Seed Sample Data (Optional)

```bash
# Seed sample exercise sessions
npm run db:seed:exercises
```

---

## Testing the System

### 1. Run Unit Tests

```bash
# Frontend tests
cd frontend
npm run test -- exerciseGenerator

# Backend tests
cd ../backend
npm run test -- ExerciseService
```

### 2. Manual Testing

**Start the development server:**
```bash
npm run dev
```

**Test exercise generation:**

1. Open http://localhost:5173
2. Navigate to Practice page
3. Click "Start Exercise"
4. Complete a few exercises
5. Check session progress

**Expected behavior:**
- Exercises generate instantly
- Progress updates in real-time
- Session stats display correctly
- Difficult terms are tracked

### 3. API Testing

```bash
# Test session creation
curl -X POST http://localhost:3001/api/exercises/session/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_session_1"}'

# Test exercise result submission
curl -X POST http://localhost:3001/api/exercises/result \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_1",
    "exerciseType": "visual_discrimination",
    "spanishTerm": "plumas",
    "userAnswer": "correct_answer",
    "isCorrect": true,
    "timeTaken": 5000
  }'

# Check session progress
curl http://localhost:3001/api/exercises/session/test_session_1/progress
```

---

## Usage Examples

### Frontend: Generate an Exercise

```typescript
import { ExerciseGenerator } from '../services/exerciseGenerator';
import { useAnnotations } from '../hooks/useAnnotations';

function PracticePage() {
  const { annotations } = useAnnotations();
  const [exercise, setExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (annotations.length > 0) {
      const generator = new ExerciseGenerator(annotations);
      const newExercise = generator.generateExercise('visual_discrimination');
      setExercise(newExercise);
    }
  }, [annotations]);

  if (!exercise) return <LoadingSpinner />;

  return <ExerciseRenderer exercise={exercise} />;
}
```

### Backend: Track Exercise Results

```typescript
import { ExerciseService } from '../services/ExerciseService';
import { pool } from '../database/connection';

const exerciseService = new ExerciseService(pool);

// Start a session
const session = await exerciseService.createSession('user_123_session');

// Record a result
await exerciseService.recordResult({
  sessionId: session.session_id,
  exerciseType: 'visual_discrimination',
  spanishTerm: 'plumas',
  userAnswer: 'feathers',
  isCorrect: true,
  timeTaken: 3500
});

// Get progress
const progress = await exerciseService.getSessionProgress(session.session_id);
console.log(`Accuracy: ${progress.accuracy}%`);
```

### React Hook: Adaptive Exercises

```typescript
import { useState, useEffect } from 'react';
import { ExerciseGenerator } from '../services/exerciseGenerator';

function useAdaptiveExercise(annotations: Annotation[]) {
  const [difficulty, setDifficulty] = useState(1);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const generateNext = () => {
    const generator = new ExerciseGenerator(annotations);
    const newExercise = generator.generateExercise('visual_discrimination');
    setExercise(newExercise);
  };

  const handleAnswer = (isCorrect: boolean) => {
    // Adjust difficulty based on performance
    if (isCorrect && difficulty < 5) {
      setDifficulty(d => d + 1);
    } else if (!isCorrect && difficulty > 1) {
      setDifficulty(d => d - 1);
    }

    generateNext();
  };

  useEffect(() => {
    if (annotations.length > 0) {
      generateNext();
    }
  }, [annotations]);

  return { exercise, difficulty, handleAnswer, generateNext };
}
```

---

## Configuration Options

### Exercise Generator Settings

```typescript
// frontend/src/services/exerciseGenerator.ts

const EXERCISE_CONFIG = {
  // Minimum annotations needed for each exercise type
  MIN_ANNOTATIONS: {
    visual_discrimination: 4,
    term_matching: 4,
    contextual_fill: 4
  },

  // Number of options for multiple choice
  MULTIPLE_CHOICE_OPTIONS: 4,

  // Number of distractors
  DISTRACTOR_COUNT: 3,

  // Difficulty scaling
  DIFFICULTY_LEVELS: {
    beginner: 1,
    intermediate: 3,
    advanced: 5
  }
};
```

### Session Configuration

```typescript
// backend/src/services/ExerciseService.ts

const SESSION_CONFIG = {
  // Maximum exercises per session
  MAX_EXERCISES: 50,

  // Session timeout (milliseconds)
  TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours

  // Minimum attempts for difficult terms analysis
  MIN_ATTEMPTS_FOR_ANALYSIS: 3,

  // Success rate threshold for "difficult" classification
  DIFFICULT_THRESHOLD: 0.6 // 60%
};
```

### Performance Thresholds

```typescript
const PERFORMANCE_CONFIG = {
  // Target accuracy rates by level
  TARGET_ACCURACY: {
    beginner: 0.8,    // 80%
    intermediate: 0.7, // 70%
    advanced: 0.6      // 60%
  },

  // Streak thresholds for difficulty adjustment
  STREAK_INCREASE_THRESHOLD: 3,
  STREAK_DECREASE_THRESHOLD: 2,

  // Time limits (seconds)
  TIME_LIMITS: {
    visual_discrimination: 30,
    term_matching: 45,
    contextual_fill: 20
  }
};
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All Phase 2 tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Logging configured

### Database

- [ ] Backup current database
- [ ] Run migrations on staging
- [ ] Verify table creation
- [ ] Test rollback procedures
- [ ] Set up monitoring queries

### Backend

- [ ] Build production bundle (`npm run build`)
- [ ] Configure production environment variables
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure logging (Winston, Bunyan)
- [ ] Enable error tracking (Sentry)
- [ ] Set up health check endpoint

### Frontend

- [ ] Build production bundle (`npm run build`)
- [ ] Configure CDN for assets
- [ ] Enable service worker (if PWA)
- [ ] Set up analytics (Google Analytics, etc.)
- [ ] Configure error boundaries
- [ ] Enable performance monitoring

### Monitoring

- [ ] Database query performance monitoring
- [ ] API endpoint response times
- [ ] Exercise generation success rate
- [ ] Session completion rates
- [ ] Error rates and types
- [ ] User engagement metrics

### Post-Deployment

- [ ] Smoke test all exercise types
- [ ] Verify session tracking
- [ ] Check progress analytics
- [ ] Monitor error logs
- [ ] Verify performance metrics
- [ ] User acceptance testing

---

## Troubleshooting

### Common Issues

#### Issue 1: Exercises Not Generating

**Symptoms:**
- "No exercises available" error
- Blank exercise screen
- Loading spinner never stops

**Diagnosis:**
```typescript
// Check annotations
const annotations = await fetchAnnotations();
console.log('Annotations count:', annotations.length);

// Verify minimum requirements
const generator = new ExerciseGenerator(annotations);
const exercise = generator.generateExercise('visual_discrimination');
console.log('Exercise generated:', exercise);
```

**Solutions:**
1. Ensure at least 4 annotations exist in database
2. Verify annotation data structure is correct
3. Check console for JavaScript errors
4. Verify ExerciseGenerator import path

#### Issue 2: Session Not Tracking

**Symptoms:**
- Progress shows 0 exercises
- Results not saving
- Session ID errors

**Diagnosis:**
```bash
# Check database
psql -d aves -c "SELECT * FROM exercise_sessions LIMIT 5;"
psql -d aves -c "SELECT * FROM exercise_results LIMIT 5;"

# Check API
curl http://localhost:3001/api/exercises/session/test/progress
```

**Solutions:**
1. Verify database migrations applied
2. Check session_id format (should be string)
3. Ensure API endpoints are accessible
4. Verify CORS configuration

#### Issue 3: Poor Performance

**Symptoms:**
- Slow exercise generation
- Laggy UI
- High database query times

**Diagnosis:**
```typescript
// Measure generation time
console.time('exercise-generation');
const exercise = generator.generateExercise('visual_discrimination');
console.timeEnd('exercise-generation');

// Check database queries
// Enable PostgreSQL query logging
```

**Solutions:**
1. Add database indexes on frequently queried columns
2. Implement client-side caching
3. Reduce annotation data size
4. Optimize React rendering with useMemo

#### Issue 4: Type Errors

**Symptoms:**
- TypeScript compilation errors
- Runtime type mismatches
- "undefined is not an object" errors

**Diagnosis:**
```bash
# Check TypeScript errors
npm run typecheck

# Verify types
cat shared/types/exercise.types.ts
```

**Solutions:**
1. Update shared types to match implementation
2. Run `npm install` to update type definitions
3. Clear TypeScript cache: `rm -rf node_modules/.cache`
4. Verify import paths for type files

#### Issue 5: Database Connection Errors

**Symptoms:**
- "Cannot connect to database"
- "Relation does not exist"
- Connection timeout errors

**Diagnosis:**
```bash
# Test connection
psql -h localhost -p 5432 -U postgres -d aves

# Check tables
\dt

# Verify migrations
psql -d aves -c "SELECT * FROM schema_migrations ORDER BY version;"
```

**Solutions:**
1. Verify PostgreSQL is running: `systemctl status postgresql`
2. Check connection string in .env
3. Ensure database exists: `createdb aves`
4. Run migrations: `npm run db:migrate`

---

## Next Steps

Now that Phase 2 is set up:

1. **Explore the Code:**
   - Review `frontend/src/services/exerciseGenerator.ts`
   - Examine `backend/src/services/ExerciseService.ts`
   - Study the API endpoints in `backend/src/routes/exercises.ts`

2. **Read the Documentation:**
   - [AI Exercise Generation API](docs/AI_EXERCISE_GENERATION_API.md)
   - [Exercise Generation Guide](docs/EXERCISE_GENERATION_GUIDE.md)
   - [Code Examples](docs/examples/ai-exercise-examples.md)

3. **Customize Your Implementation:**
   - Add new exercise types
   - Implement adaptive difficulty algorithms
   - Create custom analytics dashboards
   - Build admin management tools

4. **Monitor and Optimize:**
   - Track user engagement metrics
   - Analyze difficult terms
   - Optimize query performance
   - A/B test exercise variations

---

## Support

**Documentation:**
- [Phase 2 Plan](docs/PHASE_2_INTELLIGENT_EXERCISE_GENERATION.md)
- [API Reference](docs/AI_EXERCISE_GENERATION_API.md)
- [System Guide](docs/EXERCISE_GENERATION_GUIDE.md)

**Code Examples:**
- [Frontend Examples](docs/examples/ai-exercise-examples.md)
- [API Integration](docs/examples/ai-exercise-examples.md#api-integration)
- [Testing Patterns](docs/examples/ai-exercise-examples.md#testing-examples)

**Need Help?**
- Check the troubleshooting section above
- Review the implementation notes in PHASE_2 documentation
- Examine the test files for usage examples

---

**Phase 2 Setup Complete! Start generating intelligent exercises for your users. 🚀**
