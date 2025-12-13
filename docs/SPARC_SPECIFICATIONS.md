# SPARC Specifications - Aves Learning Platform Implementation

## Document Control

**Project**: Aves - Bilingual Bird Learning Platform
**Phase**: Specification (SPARC Methodology)
**Date**: 2025-12-12
**Version**: 1.0
**Status**: Draft

---

## 1. Executive Summary

This specification document defines the complete requirements, interfaces, data models, and acceptance criteria for integrating the Learn, Practice, and Species features with the Admin AI content pipeline in the Aves platform.

### 1.1 Purpose

Transform the Aves platform from a demonstration to a complete learning system where:
- AI-generated annotations flow from admin approval to user-facing learning content
- Users experience structured learning paths with progressive difficulty
- Spaced repetition ensures long-term vocabulary retention
- Species pages serve as educational hubs linking content discovery to practice

### 1.2 Scope

**In Scope:**
- Content Pipeline API (3 endpoints)
- Database Schema (2 new tables, 2 columns)
- Component Interfaces (12 components)
- Data Flow Architecture
- TypeScript Type Definitions

**Out of Scope:**
- UI/UX design mockups (implementation detail)
- Performance optimization (Refinement phase)
- Mobile-specific implementations
- Multi-language support beyond English/Spanish

---

## 2. Functional Requirements

### FR-2.1 Content Pipeline

#### FR-2.1.1 Learning Content Endpoint
**ID**: FR-2.1.1
**Priority**: High
**Description**: System shall provide an API endpoint to fetch approved learning content

**Acceptance Criteria:**
- Endpoint exists at `GET /api/content/learn`
- Returns only annotations with `published_at` IS NOT NULL
- Supports query parameters: `difficulty`, `type`, `species`, `moduleId`
- Groups annotations by learning module
- Includes species metadata for each annotation
- Response time < 500ms for up to 1000 annotations
- Returns proper HTTP status codes (200, 400, 404, 500)

**Request Parameters:**
```typescript
interface LearnContentQuery {
  difficulty?: 1 | 2 | 3 | 4 | 5;
  type?: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  species?: string;
  moduleId?: string;
  limit?: number;
  offset?: number;
}
```

**Response Schema:**
```typescript
interface LearnContentResponse {
  modules: LearningModule[];
  total: number;
  limit: number;
  offset: number;
}
```

#### FR-2.1.2 Practice Exercises Endpoint
**ID**: FR-2.1.2
**Priority**: High
**Description**: System shall provide an API endpoint to fetch practice exercises

**Acceptance Criteria:**
- Endpoint exists at `GET /api/content/exercises`
- Returns AI-generated exercises from approved annotations
- Filters by: exercise type, difficulty, species
- Includes user progress context when authenticated
- Supports SRS mode (only due terms)
- Response time < 500ms
- Returns 50 exercises maximum per request

**Request Parameters:**
```typescript
interface ExercisesQuery {
  exerciseType?: ExerciseType;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  species?: string;
  mode?: 'practice' | 'review'; // review = SRS due terms only
  limit?: number;
}
```

**Response Schema:**
```typescript
interface ExercisesResponse {
  exercises: Exercise[];
  dueCount?: number; // If authenticated and mode=review
  userProgress?: UserProgressSummary;
  total: number;
}
```

#### FR-2.1.3 Content Publishing Endpoint
**ID**: FR-2.1.3
**Priority**: High
**Description**: Admin shall publish approved annotations to learning content

**Acceptance Criteria:**
- Endpoint exists at `POST /api/admin/content/publish`
- Requires admin authentication
- Sets `published_at` timestamp on annotations
- Optionally assigns to learning module
- Triggers exercise generation
- Returns detailed success/failure report
- Validates all annotation IDs exist and are approved
- Atomic operation (all or nothing)

**Request Schema:**
```typescript
interface PublishContentRequest {
  annotationIds: string[];
  moduleId?: string;
  generateExercises?: boolean;
}
```

**Response Schema:**
```typescript
interface PublishContentResponse {
  published: number;
  failed: number;
  exercisesGenerated?: number;
  details: {
    annotationId: string;
    status: 'success' | 'failed';
    error?: string;
  }[];
}
```

---

### FR-2.2 Database Schema

#### FR-2.2.1 Learning Modules Table
**ID**: FR-2.2.1
**Priority**: High
**Description**: System shall store learning module metadata

**Schema:**
```sql
CREATE TABLE learning_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  title_spanish VARCHAR(200) NOT NULL,
  description TEXT,
  description_spanish TEXT,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  species_ids UUID[] NOT NULL,
  prerequisite_module_id UUID REFERENCES learning_modules(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
```sql
CREATE INDEX idx_modules_difficulty ON learning_modules(difficulty_level);
CREATE INDEX idx_modules_published ON learning_modules(is_published);
CREATE INDEX idx_modules_order ON learning_modules(order_index);
CREATE INDEX idx_modules_species ON learning_modules USING GIN(species_ids);
```

**Validation Rules:**
- `title` and `title_spanish` must be unique
- `difficulty_level` must be 1-5
- `species_ids` must reference valid species
- `prerequisite_module_id` cannot create circular dependencies

#### FR-2.2.2 User Term Progress Table (SRS)
**ID**: FR-2.2.2
**Priority**: High
**Description**: System shall track user's spaced repetition progress

**Schema:**
```sql
CREATE TABLE user_term_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

  -- SM-2 Algorithm Fields
  repetitions INTEGER NOT NULL DEFAULT 0,
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval_days INTEGER NOT NULL DEFAULT 1,

  -- Scheduling
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Performance Tracking
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_incorrect INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,

  -- Mastery
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),

  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, annotation_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_user_progress_user ON user_term_progress(user_id);
CREATE INDEX idx_user_progress_next_review ON user_term_progress(next_review_at);
CREATE INDEX idx_user_progress_mastery ON user_term_progress(mastery_level);
CREATE INDEX idx_user_progress_user_review ON user_term_progress(user_id, next_review_at);
```

**Validation Rules:**
- `ease_factor` >= 1.3 (SM-2 algorithm constraint)
- `mastery_level` 0-100
- `next_review_at` must be in the future after update
- `times_correct + times_incorrect` must match review count

#### FR-2.2.3 Annotations Table Extension
**ID**: FR-2.2.3
**Priority**: High
**Description**: Extend annotations table with publishing metadata

**Migration:**
```sql
ALTER TABLE annotations
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN learning_module_id UUID REFERENCES learning_modules(id) ON DELETE SET NULL;

CREATE INDEX idx_annotations_published ON annotations(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_annotations_module ON annotations(learning_module_id);
```

**Validation Rules:**
- `published_at` can only be set if `status` = 'approved'
- `learning_module_id` must reference valid module

---

### FR-2.3 Component Interfaces

#### FR-2.3.1 LearningPathSelector
**ID**: FR-2.3.1
**Priority**: High
**Description**: Component for selecting learning paths/modules

**Props Interface:**
```typescript
interface LearningPathSelectorProps {
  /** Available learning modules */
  modules: LearningModule[];

  /** Currently selected module */
  selectedModuleId?: string;

  /** User's progress for each module */
  progress: Record<string, ModuleProgress>;

  /** Callback when module selected */
  onSelectModule: (moduleId: string) => void;

  /** Display mode */
  mode?: 'grid' | 'list';

  /** Show recommended next module */
  showRecommendations?: boolean;
}
```

**State Interface:**
```typescript
interface LearningPathSelectorState {
  /** Filter by difficulty */
  difficultyFilter?: 1 | 2 | 3 | 4 | 5;

  /** Sort order */
  sortBy: 'difficulty' | 'progress' | 'recommended' | 'alphabetical';

  /** View mode */
  viewMode: 'grid' | 'list';
}
```

**Behavioral Requirements:**
- Display module completion percentage
- Highlight recommended next module
- Show locked modules (prerequisites not met)
- Filter by difficulty level
- Sort by multiple criteria
- Responsive grid/list toggle

#### FR-2.3.2 LessonView
**ID**: FR-2.3.2
**Priority**: High
**Description**: Component for displaying individual lesson content

**Props Interface:**
```typescript
interface LessonViewProps {
  /** Lesson data with annotations */
  lesson: Lesson;

  /** Current annotation index */
  currentIndex: number;

  /** Total annotations in lesson */
  totalAnnotations: number;

  /** Callback when user marks term as known */
  onMarkKnown: (annotationId: string) => void;

  /** Callback when user marks term as learning */
  onMarkLearning: (annotationId: string) => void;

  /** Callback when lesson complete */
  onComplete: (results: LessonResults) => void;

  /** User's previous interactions with terms */
  previousProgress?: Record<string, TermProgress>;
}
```

**State Interface:**
```typescript
interface LessonViewState {
  /** Current disclosure level for active term */
  disclosureLevel: DisclosureLevel;

  /** Terms marked as known in this session */
  knownTerms: Set<string>;

  /** Terms still learning */
  learningTerms: Set<string>;

  /** Time spent on current term (ms) */
  termTimeSpent: number;

  /** Audio playback state */
  audioPlaying: boolean;
}
```

**Behavioral Requirements:**
- Progressive disclosure (0-4 levels)
- Audio pronunciation playback
- "I know this" / "Still learning" buttons
- Progress indicator (3 of 10 terms)
- Image with highlighted annotation
- Auto-advance option
- Keyboard navigation (arrow keys, space, enter)

#### FR-2.3.3 SpacedRepetitionService
**ID**: FR-2.3.3
**Priority**: High
**Description**: Service for managing SRS algorithm

**Interface:**
```typescript
interface SpacedRepetitionService {
  /**
   * Calculate next review schedule based on SM-2 algorithm
   * @param quality - Quality of response (0-5)
   * @param currentState - Current SRS state
   * @returns Updated SRS state
   */
  calculateNextReview(
    quality: 0 | 1 | 2 | 3 | 4 | 5,
    currentState: SRSState
  ): SRSState;

  /**
   * Get terms due for review for a user
   * @param userId - User ID
   * @param limit - Maximum terms to return
   * @returns Array of terms due for review
   */
  getDueTerms(
    userId: string,
    limit?: number
  ): Promise<TermWithProgress[]>;

  /**
   * Record a review result
   * @param userId - User ID
   * @param annotationId - Annotation ID
   * @param correct - Whether answer was correct
   * @param quality - Quality rating (0-5)
   */
  recordReview(
    userId: string,
    annotationId: string,
    correct: boolean,
    quality: 0 | 1 | 2 | 3 | 4 | 5
  ): Promise<void>;

  /**
   * Get user's overall progress statistics
   * @param userId - User ID
   */
  getProgressStats(userId: string): Promise<ProgressStats>;

  /**
   * Initialize a new term for a user
   * @param userId - User ID
   * @param annotationId - Annotation ID
   */
  initializeTerm(
    userId: string,
    annotationId: string
  ): Promise<void>;
}
```

**Data Types:**
```typescript
interface SRSState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

interface TermWithProgress extends Annotation {
  progress: UserTermProgress;
  daysOverdue?: number;
}

interface ProgressStats {
  totalTerms: number;
  masteredTerms: number;
  learningTerms: number;
  dueTerms: number;
  averageMastery: number;
  currentStreak: number;
  longestStreak: number;
}
```

**SM-2 Algorithm Requirements:**
- Quality 0-2: Reset interval to 1 day, reduce EF
- Quality 3: Maintain current interval
- Quality 4-5: Increase interval exponentially
- EF minimum: 1.3
- First interval: 1 day
- Second interval: 6 days
- Subsequent: interval × EF

#### FR-2.3.4 MasteryIndicator
**ID**: FR-2.3.4
**Priority**: Medium
**Description**: Visual component showing term mastery level

**Props Interface:**
```typescript
interface MasteryIndicatorProps {
  /** Mastery level (0-100) */
  level: number;

  /** Current streak */
  streak?: number;

  /** Display mode */
  variant?: 'compact' | 'detailed' | 'minimal';

  /** Show label */
  showLabel?: boolean;

  /** Size */
  size?: 'sm' | 'md' | 'lg';

  /** Custom class */
  className?: string;
}
```

**Behavioral Requirements:**
- Color-coded levels:
  - 0-20: Red (Learning)
  - 21-50: Orange (Familiar)
  - 51-80: Yellow (Proficient)
  - 81-100: Green (Mastered)
- Animated progress bar
- Streak indicator (fire icon + number)
- Tooltip with details on hover
- Accessibility: aria-label with level

---

## 3. Data Flow Specifications

### DF-3.1 Admin Approval to Published Content

**Flow:**
```
1. Admin reviews AI annotation
2. Admin clicks "Approve"
3. POST /api/admin/annotations/:id/approve
4. Backend updates: status = 'approved', approved_at = NOW()
5. Admin navigates to Publishing Panel
6. Admin selects approved annotations
7. Admin assigns to module (optional)
8. Admin clicks "Publish to Learn"
9. POST /api/admin/content/publish
10. Backend sets published_at = NOW(), learning_module_id
11. Backend triggers exercise generation (if enabled)
12. Response: { published: 5, exercisesGenerated: 15 }
13. Published content appears in GET /api/content/learn
```

**Sequence Diagram:**
```
Admin -> API: POST /api/admin/annotations/:id/approve
API -> DB: UPDATE annotations SET status='approved'
DB -> API: Success
API -> Admin: { status: 'approved' }

Admin -> API: POST /api/admin/content/publish
API -> ContentPublishingService: publishAnnotations()
ContentPublishingService -> DB: UPDATE annotations SET published_at=NOW()
ContentPublishingService -> AIExerciseService: generateExercises()
AIExerciseService -> DB: INSERT exercises
DB -> ContentPublishingService: Success
ContentPublishingService -> API: PublishResult
API -> Admin: { published: 5, exercisesGenerated: 15 }
```

### DF-3.2 User Discovers Term in Learn Page

**Flow:**
```
1. User navigates to /learn/:moduleId
2. Frontend: GET /api/content/learn?moduleId=X
3. Backend: SELECT annotations WHERE module_id=X AND published_at NOT NULL
4. Response: { modules: [...], total: 50 }
5. User clicks on annotation hotspot
6. Disclosure level increases (0 -> 1 -> 2 -> 3 -> 4)
7. User clicks "I know this"
8. POST /api/progress/record-discovery
9. Backend: INSERT/UPDATE user_term_progress
10. Backend: Initialize SRS (if new term)
11. next_review_at = NOW() + 1 day
12. Response: { termProgress: {...} }
```

**State Transitions:**
```
Term State Lifecycle:
UNDISCOVERED -> DISCOVERED -> LEARNING -> FAMILIAR -> MASTERED
     |              |            |            |           |
     0            1-20         21-50       51-80      81-100
                                                    (mastery)
```

### DF-3.3 Practice Answer to SRS Update

**Flow:**
```
1. User navigates to /practice (Review Mode)
2. Frontend: GET /api/content/exercises?mode=review
3. Backend:
   - SELECT FROM user_term_progress
   - WHERE user_id=X AND next_review_at <= NOW()
   - JOIN annotations
4. Response: { exercises: [...], dueCount: 12 }
5. User answers exercise
6. Frontend: POST /api/practice/submit-answer
   - Body: { exerciseId, annotationId, correct, quality, timeTaken }
7. Backend: SpacedRepetitionService.recordReview()
8. Backend: Calculate new SRS state (SM-2)
9. Backend: UPDATE user_term_progress
   - repetitions += 1
   - interval_days = calculateInterval()
   - next_review_at = NOW() + interval_days
   - ease_factor = calculateEF()
   - mastery_level = calculateMastery()
10. Response: { nextReviewAt, masteryLevel, streak }
```

**SM-2 Calculation Example:**
```typescript
// Quality = 4 (Good answer)
// Current: repetitions=2, EF=2.5, interval=6

// New EF = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
// New EF = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02))
// New EF = 2.5 + (0.1 - 0.1) = 2.5

// New interval = previous_interval * EF
// New interval = 6 * 2.5 = 15 days

// Result:
{
  repetitions: 3,
  easeFactor: 2.5,
  intervalDays: 15,
  nextReviewAt: NOW() + 15 days
}
```

---

## 4. API Contract Specifications

### API-4.1 Content Pipeline Endpoints

#### GET /api/content/learn

**Purpose**: Fetch published learning content grouped by modules

**Authentication**: Optional (shows personalized progress if authenticated)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| difficulty | 1-5 | No | All | Filter by difficulty level |
| type | string | No | All | Filter by annotation type |
| species | string | No | All | Filter by species name |
| moduleId | UUID | No | All | Specific module |
| limit | number | No | 50 | Results per page |
| offset | number | No | 0 | Pagination offset |

**Response 200 OK:**
```typescript
{
  modules: [
    {
      id: "uuid",
      title: "Bird Anatomy Basics",
      titleSpanish: "Anatomía Básica de Aves",
      description: "Learn fundamental bird anatomy terms",
      descriptionSpanish: "Aprende términos fundamentales...",
      difficultyLevel: 1,
      orderIndex: 0,
      annotations: [
        {
          id: "uuid",
          imageId: "uuid",
          imageUrl: "https://...",
          spanishTerm: "pico",
          englishTerm: "beak",
          pronunciation: "PEE-koh",
          type: "anatomical",
          difficultyLevel: 1,
          boundingBox: { x: 0.5, y: 0.3, width: 0.2, height: 0.1 },
          publishedAt: "2025-12-12T10:00:00Z"
        }
      ],
      userProgress?: {
        completed: false,
        termsLearned: 3,
        totalTerms: 10,
        masteryLevel: 30
      }
    }
  ],
  total: 5,
  limit: 50,
  offset: 0
}
```

**Response 400 Bad Request:**
```typescript
{
  error: "Invalid query parameters",
  details: {
    difficulty: "Must be between 1 and 5"
  }
}
```

**Response 500 Internal Server Error:**
```typescript
{
  error: "Failed to fetch learning content",
  message: "Database connection error"
}
```

#### GET /api/content/exercises

**Purpose**: Fetch practice exercises with optional SRS filtering

**Authentication**: Optional (required for mode=review)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| exerciseType | ExerciseType | No | All | Filter by exercise type |
| difficulty | 1-5 | No | All | Filter by difficulty |
| species | string | No | All | Filter by species |
| mode | 'practice' \| 'review' | No | practice | Practice all or SRS review |
| limit | number | No | 10 | Max exercises to return |

**Response 200 OK:**
```typescript
{
  exercises: [
    {
      id: "uuid",
      type: "visual_discrimination",
      instructions: "Which bird has a red crown?",
      targetTerm: "corona roja",
      options: [
        { id: "1", imageUrl: "...", species: "Cardinal" },
        { id: "2", imageUrl: "...", species: "Blue Jay" }
      ],
      correctOptionId: "1",
      annotation: {
        id: "uuid",
        spanishTerm: "corona",
        englishTerm: "crown",
        difficultyLevel: 2
      }
    }
  ],
  dueCount: 12,  // If authenticated and mode=review
  userProgress: {
    totalTerms: 50,
    masteredTerms: 15,
    dueTerms: 12,
    averageMastery: 45
  },
  total: 12
}
```

**Response 401 Unauthorized:** (if mode=review without auth)
```typescript
{
  error: "Authentication required for review mode"
}
```

#### POST /api/admin/content/publish

**Purpose**: Publish approved annotations to learning content

**Authentication**: Required (Admin only)

**Request Body:**
```typescript
{
  annotationIds: ["uuid1", "uuid2", "uuid3"],
  moduleId?: "uuid",  // Optional: assign to module
  generateExercises?: true  // Default: true
}
```

**Response 200 OK:**
```typescript
{
  published: 3,
  failed: 0,
  exercisesGenerated: 9,
  details: [
    {
      annotationId: "uuid1",
      status: "success",
      exercisesCreated: 3
    },
    {
      annotationId: "uuid2",
      status: "success",
      exercisesCreated: 3
    }
  ]
}
```

**Response 400 Bad Request:**
```typescript
{
  error: "Validation failed",
  details: [
    {
      annotationId: "uuid3",
      reason: "Annotation not approved"
    }
  ]
}
```

**Response 403 Forbidden:**
```typescript
{
  error: "Admin access required"
}
```

---

## 5. TypeScript Type Definitions

### 5.1 Core Domain Types

```typescript
// ============================================
// Learning Module Types
// ============================================

export interface LearningModule {
  id: string;
  title: string;
  titleSpanish: string;
  description?: string;
  descriptionSpanish?: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  speciesIds: string[];
  prerequisiteModuleId?: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  annotations?: Annotation[];
}

export interface ModuleProgress {
  moduleId: string;
  userId: string;
  completed: boolean;
  termsLearned: number;
  totalTerms: number;
  masteryLevel: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  titleSpanish: string;
  orderIndex: number;
  annotations: Annotation[];
  estimatedMinutes: number;
}

export interface LessonResults {
  lessonId: string;
  moduleId: string;
  completedAt: Date;
  timeSpent: number; // seconds
  termsLearned: string[]; // annotation IDs
  termsAlreadyKnown: string[];
  quizScore?: number; // 0-100
}

// ============================================
// Spaced Repetition Types
// ============================================

export interface UserTermProgress {
  id: string;
  userId: string;
  annotationId: string;

  // SM-2 Algorithm
  repetitions: number;
  easeFactor: number; // 1.3 - 2.5+
  intervalDays: number;

  // Scheduling
  nextReviewAt: Date;
  lastReviewedAt?: Date;

  // Performance
  timesCorrect: number;
  timesIncorrect: number;
  currentStreak: number;
  longestStreak: number;

  // Mastery
  masteryLevel: number; // 0-100

  // Metadata
  firstSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SRSState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

export type SRSQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewResult {
  annotationId: string;
  correct: boolean;
  quality: SRSQuality;
  timeTaken: number; // milliseconds
  previousState: SRSState;
  newState: SRSState;
  masteryChange: number; // delta
}

export interface ProgressStats {
  totalTerms: number;
  masteredTerms: number;
  learningTerms: number;
  dueTerms: number;
  overdueTerms: number;
  averageMastery: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  accuracy: number; // 0-100
}

// ============================================
// Content Types
// ============================================

export interface PublishedAnnotation extends Annotation {
  publishedAt: Date;
  learningModuleId?: string;
  module?: LearningModule;
}

export interface ContentFilters {
  difficulty?: 1 | 2 | 3 | 4 | 5;
  type?: AnnotationType;
  species?: string;
  moduleId?: string;
  limit?: number;
  offset?: number;
}

export interface LearnContentResponse {
  modules: (LearningModule & {
    annotations: PublishedAnnotation[];
    userProgress?: ModuleProgress;
  })[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExercisesQuery {
  exerciseType?: ExerciseType;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  species?: string;
  mode?: 'practice' | 'review';
  limit?: number;
}

export interface ExercisesResponse {
  exercises: Exercise[];
  dueCount?: number;
  userProgress?: ProgressStats;
  total: number;
}

// ============================================
// Admin Types
// ============================================

export interface PublishContentRequest {
  annotationIds: string[];
  moduleId?: string;
  generateExercises?: boolean;
}

export interface PublishContentResponse {
  published: number;
  failed: number;
  exercisesGenerated?: number;
  details: {
    annotationId: string;
    status: 'success' | 'failed';
    error?: string;
    exercisesCreated?: number;
  }[];
}

export interface ContentDashboardStats {
  pending: number;
  approved: number;
  published: number;
  totalExercises: number;
  speciesWithContent: number;
  speciesWithoutContent: number;
  contentGaps: {
    species: string;
    scientificName: string;
    annotationCount: number;
  }[];
}

// ============================================
// Component Props
// ============================================

export interface LearningPathSelectorProps {
  modules: LearningModule[];
  selectedModuleId?: string;
  progress: Record<string, ModuleProgress>;
  onSelectModule: (moduleId: string) => void;
  mode?: 'grid' | 'list';
  showRecommendations?: boolean;
}

export interface LessonViewProps {
  lesson: Lesson;
  currentIndex: number;
  totalAnnotations: number;
  onMarkKnown: (annotationId: string) => void;
  onMarkLearning: (annotationId: string) => void;
  onComplete: (results: LessonResults) => void;
  previousProgress?: Record<string, UserTermProgress>;
}

export interface MasteryIndicatorProps {
  level: number; // 0-100
  streak?: number;
  variant?: 'compact' | 'detailed' | 'minimal';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface PracticeModePickerProps {
  dueCount: number;
  onSelectMode: (mode: PracticeMode) => void;
  userStats: ProgressStats;
}

export type PracticeMode =
  | 'quick-quiz'
  | 'review-due'
  | 'by-species'
  | 'by-difficulty'
  | 'by-type';
```

---

## 6. Validation & Business Rules

### BR-6.1 Content Publishing Rules

**Rule**: Only approved annotations can be published
- Validation: `status = 'approved'` before setting `published_at`
- Error: 400 Bad Request with annotation IDs that failed

**Rule**: Published annotations cannot be unpublished
- Validation: Once `published_at` is set, it cannot be set to NULL
- Exception: Admin can hide by setting module's `is_published = false`

**Rule**: Annotations can belong to max 1 module
- Validation: `learning_module_id` is singular, not array
- Rationale: Simplifies progress tracking

**Rule**: Modules must have at least 5 annotations to publish
- Validation: Check annotation count before `is_published = true`
- Error: 400 Bad Request "Module needs minimum 5 annotations"

### BR-6.2 Spaced Repetition Rules

**Rule**: SM-2 Ease Factor bounds [1.3, 2.5+]
- Validation: `ease_factor >= 1.3` in database constraint
- Calculation: Never reduce below 1.3, no upper limit

**Rule**: First review always 1 day
- Validation: When `repetitions = 0`, set `interval_days = 1`
- Rationale: Give user immediate reinforcement

**Rule**: Quality 0-2 resets interval to 1 day
- Validation: If quality <= 2, set `interval_days = 1, repetitions = 0`
- Rationale: Term needs relearning

**Rule**: Mastery increases only on correct answers
- Calculation: `mastery += (quality * 5)` capped at 100
- Calculation: `mastery -= 10` on incorrect, minimum 0

**Rule**: Terms become "mastered" at mastery >= 80
- Validation: `mastery_level >= 80`
- UI: Show green indicator, trophy icon

### BR-6.3 Progress Tracking Rules

**Rule**: Terms discovered automatically initialize SRS
- Trigger: When user clicks "Still learning" on new term
- Action: INSERT user_term_progress with defaults

**Rule**: "I know this" skips to mastery 80
- Action: Set `mastery_level = 80, next_review_at = NOW() + 30 days`
- Rationale: Trust user's self-assessment but verify later

**Rule**: Streaks reset after 2 missed review days
- Calculation: If current_date > next_review_at + 2 days, `current_streak = 0`
- UI: Show warning if review overdue by 1+ days

---

## 7. Non-Functional Requirements

### NFR-7.1 Performance

**NFR-7.1.1**: Learning content API response < 500ms
- Measurement: p95 latency for GET /api/content/learn
- Strategy: Database indexes on published_at, difficulty, module_id
- Target: 95% of requests < 500ms with 1000 annotations

**NFR-7.1.2**: SRS calculation < 50ms
- Measurement: Time for calculateNextReview() function
- Strategy: In-memory calculation, no external API calls
- Target: 99% < 50ms

**NFR-7.1.3**: Exercises generation < 2s per annotation
- Measurement: Time for AI to generate 3 exercises from 1 annotation
- Strategy: Parallel API calls, caching
- Target: Average 2s, timeout at 10s

### NFR-7.2 Scalability

**NFR-7.2.1**: Support 10,000 concurrent users
- Measurement: Load testing with 10k concurrent sessions
- Strategy: Database connection pooling, caching
- Target: No degradation in response time

**NFR-7.2.2**: Handle 100,000 annotations
- Measurement: Query performance with 100k records
- Strategy: Pagination, indexes, partitioning
- Target: Response time stable within 10% variance

### NFR-7.3 Data Integrity

**NFR-7.3.1**: Zero data loss on concurrent updates
- Measurement: Race condition testing
- Strategy: Database transactions, optimistic locking
- Validation: Automated tests with concurrent writes

**NFR-7.3.2**: SRS state consistency
- Measurement: Audit logs matching user_term_progress
- Strategy: Atomic updates, foreign key constraints
- Validation: Daily consistency checks

### NFR-7.4 Accessibility

**NFR-7.4.1**: WCAG 2.1 AA compliance
- Measurement: Automated accessibility testing
- Requirements: Keyboard navigation, screen reader support, contrast ratios
- Tools: axe DevTools, NVDA testing

**NFR-7.4.2**: Mobile responsive (320px min width)
- Measurement: Visual regression testing
- Requirements: Touch targets 44x44px, readable text
- Target: All features functional on mobile

---

## 8. Acceptance Criteria

### AC-8.1 Content Pipeline

**Given** an admin has approved 10 annotations
**When** admin publishes them to a learning module
**Then** all 10 annotations have `published_at` set
**And** GET /api/content/learn returns those annotations
**And** exercises are generated (if enabled)

**Given** a user requests learning content for difficulty level 2
**When** GET /api/content/learn?difficulty=2
**Then** response contains only level 2 annotations
**And** response time is < 500ms
**And** annotations are grouped by module

### AC-8.2 Learn Feature

**Given** a user opens a lesson with 10 terms
**When** user progresses through all terms
**Then** progress indicator shows 1/10, 2/10, ... 10/10
**And** audio plays correctly for each term
**And** "I know this" marks term as mastered
**And** "Still learning" initializes SRS for term

**Given** a user completes a lesson
**When** lesson ends
**Then** summary shows terms learned vs already known
**And** mini quiz appears (if configured)
**And** "Practice Now" button links to exercises for those terms

### AC-8.3 Practice Feature (SRS)

**Given** a user has 5 terms due for review
**When** user selects "Review Due" mode
**Then** GET /api/content/exercises?mode=review returns 5 exercises
**And** exercises are based on those 5 due terms
**And** order is randomized

**Given** a user answers an exercise correctly
**When** answer is submitted with quality=4
**Then** SRS interval increases (e.g., 1 day → 6 days)
**And** ease factor adjusts per SM-2
**And** mastery level increases by 20
**And** streak increments by 1

**Given** a user answers incorrectly
**When** quality=1 is recorded
**Then** interval resets to 1 day
**And** repetitions reset to 0
**And** mastery decreases by 10
**And** streak resets to 0

### AC-8.4 Species Integration

**Given** a species has 15 published annotations
**When** user views species detail page
**Then** "Learning" tab shows all 15 terms
**And** user's mastery per term is displayed
**And** "Learn these terms" button links to species-specific lesson
**And** "Quick Quiz" widget appears

---

## 9. Edge Cases & Error Handling

### EC-9.1 Publishing Edge Cases

**Case**: Publishing annotation that's already published
**Behavior**: Update `learning_module_id` if different, skip if same
**Response**: Status "skipped" in details array

**Case**: Publishing with invalid module ID
**Behavior**: Return 400 Bad Request
**Response**: `{ error: "Module not found", moduleId: "..." }`

**Case**: Network failure mid-publish (5 of 10 succeed)
**Behavior**: Rollback transaction, no partial publishes
**Response**: 500 Internal Server Error, retry all

### EC-9.2 SRS Edge Cases

**Case**: User reviews term same day it's due
**Behavior**: Allow review, calculate next interval normally
**Response**: Success with updated next_review_at

**Case**: User reviews term 30 days overdue
**Behavior**: Reset streak, treat as quality=2 (hard)
**Response**: Success with streak=0, interval=1 day

**Case**: Concurrent reviews of same term
**Behavior**: Use database row locking, serialize updates
**Response**: Last update wins (optimistic locking)

### EC-9.3 Learning Path Edge Cases

**Case**: Module has prerequisite, user hasn't completed it
**Behavior**: Show module as "locked" in UI
**Action**: Display message "Complete [prereq] first"

**Case**: User starts lesson, closes browser mid-lesson
**Behavior**: Store progress in localStorage
**Resume**: Offer "Resume lesson" or "Start over" on return

**Case**: No published content available
**Behavior**: Show empty state in Learn page
**Action**: "Check back soon" message or suggestion to explore species

---

## 10. Testing Requirements

### TR-10.1 Unit Tests

**Component Tests:**
- LearningPathSelector: Filtering, sorting, selection
- LessonView: Disclosure levels, audio, progress tracking
- MasteryIndicator: Color calculations, streak display
- SpacedRepetitionService: SM-2 algorithm accuracy

**Minimum Coverage**: 80% for new code

### TR-10.2 Integration Tests

**API Endpoint Tests:**
- GET /api/content/learn: Various filters, pagination
- GET /api/content/exercises: Practice vs review modes
- POST /api/admin/content/publish: Success and failure cases
- POST /api/practice/submit-answer: SRS state updates

**Database Tests:**
- Constraint validation (FK, CHECK constraints)
- Trigger functionality (updated_at)
- Transaction rollback scenarios

### TR-10.3 End-to-End Tests

**User Journeys:**
1. Admin publishes content → User learns terms → User practices
2. User discovers term → SRS scheduling → Review after interval
3. Module completion → Progress tracking → Next module unlock

**Critical Paths:**
- Publishing workflow (approve → publish → available)
- SRS workflow (learn → review → master)
- Progress persistence (localStorage → backend sync)

### TR-10.4 Performance Tests

**Load Testing:**
- 1,000 concurrent users on learn endpoint
- 10,000 SRS calculations per second
- 100,000 annotations in database

**Benchmarks:**
- p50, p95, p99 latencies for all endpoints
- Database query execution plans
- Frontend bundle size (< 500KB gzipped)

---

## 11. Documentation Requirements

### DR-11.1 API Documentation

- OpenAPI 3.0 specification for all endpoints
- Example requests/responses
- Error codes and meanings
- Rate limiting policies

### DR-11.2 Component Documentation

- Storybook stories for all UI components
- Props tables with types and defaults
- Usage examples
- Accessibility notes

### DR-11.3 Algorithm Documentation

- SM-2 implementation details
- Mastery calculation formulas
- Streak logic and edge cases
- Performance characteristics

---

## 12. Success Metrics

**Content Coverage**: 100% of species have published learning content
**Measurement**: COUNT(DISTINCT species_id) with published annotations / total species

**User Engagement**: >50% of users complete first lesson
**Measurement**: Users with lesson_complete event / total registered users

**Retention**: >30% users return within 7 days
**Measurement**: Users with login events in days 1-7 after first lesson

**Learning Effectiveness**: >70% average quiz score
**Measurement**: AVG(quiz_score) from lesson_results

**SRS Adherence**: >80% review completion rate
**Measurement**: Reviews completed / reviews due (on time)

**Performance**: p95 API response time < 500ms
**Measurement**: Server-side latency tracking

---

## 13. Security Considerations

### SC-13.1 Authentication & Authorization

- Admin endpoints require `role = 'admin'` claim in JWT
- User progress endpoints require authenticated user
- Public endpoints (learn, exercises) support anonymous access
- Rate limiting: 100 req/min for public, 1000 req/min authenticated

### SC-13.2 Data Validation

- All inputs validated against TypeScript schemas
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping
- CSRF tokens for state-changing operations

### SC-13.3 Privacy

- User progress data isolated by user_id (RLS in Supabase)
- No PII in annotation data
- Analytics anonymized after 90 days
- GDPR-compliant data export/deletion

---

## 14. Migration Strategy

### MG-14.1 Database Migrations

**Migration 006_learning_modules.sql:**
```sql
-- Create learning_modules table
-- Add published_at and learning_module_id to annotations
-- Create indexes
```

**Migration 007_user_progress.sql:**
```sql
-- Create user_term_progress table
-- Create indexes for SRS queries
-- Add triggers for updated_at
```

**Rollback Plan:**
- Migrations are reversible
- Backup database before applying
- Test on staging environment first

### MG-14.2 Code Deployment

**Phase 1**: Backend APIs (no UI changes)
- Deploy endpoints behind feature flag
- Test with Postman/curl
- Monitor error rates

**Phase 2**: Frontend components
- Deploy Learn page updates
- Deploy Practice page updates
- A/B test with 10% of users

**Phase 3**: Full release
- Remove feature flags
- Monitor engagement metrics
- Iterate based on feedback

---

## 15. Dependencies & Constraints

### DP-15.1 Technical Dependencies

- PostgreSQL 14+ (for JSONB, array features)
- Node.js 18+ (backend)
- React 18+ (frontend)
- Supabase Auth (user management)
- Anthropic Claude API (exercise generation)

### DP-15.2 External Constraints

- Claude API rate limit: 50 requests/min
- Database storage: 10GB limit on free tier
- Bandwidth: 100GB/month on hosting plan

### DP-15.3 Timeline Constraints

- Sprint 1-2: Foundation + Content Pipeline (2 weeks)
- Sprint 3-4: Learn Feature (2 weeks)
- Sprint 5-6: Practice Feature + SRS (2 weeks)
- Sprint 7-8: Species Integration + Admin (2 weeks)
- Sprint 9-10: Polish + Testing (2 weeks)

**Total**: 10 weeks (2.5 months)

---

## 16. Glossary

**Annotation**: A labeled region on a bird image with Spanish/English terminology

**SM-2 Algorithm**: SuperMemo 2 spaced repetition algorithm (Wozniak, 1990)

**Ease Factor (EF)**: Multiplier determining interval growth rate (1.3-2.5+)

**Interval**: Days until next review of a term

**Mastery Level**: 0-100 score indicating user's proficiency with a term

**Quality**: 0-5 rating of recall difficulty in SRS

**Module**: Collection of related annotations forming a lesson unit

**Progressive Disclosure**: Revealing information gradually (levels 0-4)

**SRS**: Spaced Repetition System

**Due Term**: Term scheduled for review (next_review_at <= NOW())

---

## 17. Appendices

### A. SM-2 Algorithm Reference

```typescript
function calculateSM2(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  repetitions: number,
  easeFactor: number,
  intervalDays: number
): SRSState {
  let newEF = easeFactor;
  let newInterval = intervalDays;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Correct response
    newRepetitions += 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }

    // Adjust ease factor
    newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEF = Math.max(1.3, newEF);

  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    newInterval = 1;
    newEF = Math.max(1.3, easeFactor - 0.2);
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEF,
    intervalDays: newInterval,
    nextReviewAt: addDays(new Date(), newInterval)
  };
}
```

### B. Database Schema Diagram

```
┌─────────────────────┐
│ learning_modules    │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ difficulty_level    │
│ prerequisite_id (FK)│
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│ annotations         │
├─────────────────────┤
│ id (PK)             │
│ image_id (FK)       │
│ spanish_term        │
│ english_term        │
│ published_at        │
│ module_id (FK)      │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────┐
│ user_term_progress      │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ annotation_id (FK)      │
│ repetitions             │
│ ease_factor             │
│ interval_days           │
│ next_review_at          │
│ mastery_level           │
└─────────────────────────┘
```

### C. Example User Journey

**Day 1:**
1. User discovers "pico" in Learn page (disclosure 0→4)
2. Clicks "Still learning"
3. System: INSERT user_term_progress (interval=1, next_review=tomorrow)

**Day 2:**
1. User opens Practice → "5 terms due for review"
2. Sees exercise with "pico"
3. Answers correctly (quality=4)
4. System: UPDATE interval=6 days, mastery=20

**Day 8:**
1. User reviews "pico" again (interval=6)
2. Answers correctly (quality=5)
3. System: UPDATE interval=15 days, mastery=45

**Day 23:**
1. User reviews "pico" (interval=15)
2. Answers correctly (quality=5)
3. System: UPDATE interval=38 days, mastery=70

**Day 61:**
1. User reviews "pico" (interval=38)
2. Answers correctly (quality=5)
3. System: UPDATE interval=95 days, mastery=95 → MASTERED

---

## Document Approval

**Author**: SPARC Specification Agent
**Reviewers**: Development Team, Product Owner
**Approval Date**: Pending
**Next Review**: After Phase 1 completion

---

**END OF SPECIFICATION DOCUMENT**
