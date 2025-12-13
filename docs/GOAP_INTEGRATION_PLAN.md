# GOAP Integration Plan: Aves Platform

**Generated:** 2025-12-13
**Planner:** GOAP Specialist Agent
**Algorithm:** A* Pathfinding with Cost Optimization
**Total Actions:** 21
**Estimated Cost:** 60 units
**Phases:** 7

---

## Executive Summary

This GOAP (Goal-Oriented Action Planning) plan provides an optimal sequence of actions to fully integrate the Aves platform's Learn, Practice, and Species features with AI-generated content and user progress tracking.

**Goal State:**
- Learn feature displays real annotations from database
- Practice feature uses personalized exercises based on user mastery
- Species pages show learning content with user progress
- Admin AI tools publish directly to user-facing features
- Full user progress tracking with Spaced Repetition System (SRS)

**Critical Path (7 actions):** 1 → 3 → 4 → 7 → 17 → 18 → 16
**Estimated Time:** 4-6 days of development

---

## Current State Analysis

### Frontend Status
| Component | Status | Gap |
|-----------|--------|-----|
| EnhancedLearnPage | ✅ Working | Uses hardcoded bird data instead of database annotations |
| EnhancedPracticePage | ✅ Working | Generates exercises but not personalized by user mastery |
| SpeciesBrowser | ✅ Complete | No integration with learning content |
| SpeciesDetailPage | ✅ Complete | Doesn't show annotations or learning content |

### Backend Status
| System | Status | Gap |
|--------|--------|-----|
| Species API | ✅ Complete | Returns species with images |
| Annotations API | ✅ Complete | CRUD operations, but no learning-specific endpoints |
| Annotation Mastery API | ✅ Complete | Full SRS system ready, not integrated with exercises |
| Database Schema | ✅ Complete | All tables exist (species, images, annotations, annotation_mastery) |

### Critical Gaps
1. No API endpoint to fetch "learning content" (species + annotations)
2. EnhancedLearnPage doesn't consume annotation data from backend
3. Admin annotation review pipeline doesn't publish to user-facing Learn page
4. Practice exercises not personalized based on user mastery data
5. No user progress tracking in Learn page (discovered terms, mastery levels)

---

## GOAP Action Plan

### Phase 1: Foundation - Learning Content API (Cost: 5)

**Parallel Group 1.1** (can execute simultaneously)
- Action 1 (Cost: 3, Priority: CRITICAL)
- Action 2 (Cost: 2, Priority: CRITICAL)
- Action 5 (Cost: 3, Priority: HIGH)
- Action 6 (Cost: 2, Priority: HIGH)

#### Action 1: Create Learning Content Detail API
```typescript
// Endpoint: GET /api/learning-content/:speciesId
// Backend route: backend/src/routes/learningContent.ts

interface LearningContentResponse {
  species: {
    id: string;
    scientificName: string;
    spanishName: string;
    englishName: string;
    description: string;
    funFact?: string;
  };
  images: Array<{
    id: string;
    url: string;
    annotations: Array<{
      id: string;
      boundingBox: { x: number; y: number; width: number; height: number };
      spanishTerm: string;
      englishTerm: string;
      pronunciation?: string;
      type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
      difficultyLevel: number;
    }>;
  }>;
  totalAnnotations: number;
}
```

**Preconditions:** species, images, annotations tables exist
**Effects:** learning-content-api-available
**Implementation:**
- Join species + images + annotations (WHERE is_visible = true)
- Group annotations by image
- Return enriched data structure

---

#### Action 2: Create Learning Content List API
```typescript
// Endpoint: GET /api/learning-content/list
// Returns: Species that have approved annotations

interface LearningSpeciesListItem {
  id: string;
  spanishName: string;
  englishName: string;
  annotationCount: number;
  primaryImageUrl: string;
}
```

**Preconditions:** species, annotations tables exist
**Effects:** learning-content-list-available
**Implementation:**
- Query species WHERE EXISTS (SELECT 1 FROM annotations WHERE is_visible = true)
- Include annotation counts per species
- Order by annotation count DESC

---

### Phase 2: Frontend Learning Service Integration (Cost: 8)

#### Action 3: Create Learning Content Service
```typescript
// File: frontend/src/services/learningContentService.ts

class LearningContentService {
  private cache: Map<string, LearningContent> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async fetchLearningContent(speciesId: string): Promise<LearningContent>
  async fetchLearningSpeciesList(): Promise<LearningSpeciesListItem[]>
  clearCache(): void
}

export const learningContentService = new LearningContentService();
```

**Preconditions:** Actions 1, 2 complete
**Effects:** frontend-can-fetch-learning-content
**Dependencies:** [1, 2]
**Cost:** 3

---

#### Action 4: Modify EnhancedLearnPage to Use Real Data
```typescript
// File: frontend/src/pages/EnhancedLearnPage.tsx
// Changes:
// 1. Replace hardcoded birdLearningData with API calls
// 2. Add loading/error states
// 3. Transform API data to component format
// 4. Keep all existing interactive components

const EnhancedLearnPage = () => {
  const [species, setSpecies] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const data = await learningContentService.fetchLearningContent(selectedId);
        setSpecies(data);
      } catch (err) {
        setError('Failed to load learning content');
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [selectedId]);

  // Keep existing: InteractiveBirdImage, VocabularyPanel, ProgressSection
};
```

**Preconditions:** Action 3 complete
**Effects:** learn-page-uses-real-data
**Dependencies:** [3]
**Cost:** 4
**Priority:** CRITICAL

---

### Phase 3: Progress Tracking (Cost: 10)

**Parallel Group 3.1**
- Action 5 (already defined)
- Action 6 (already defined)
- Action 8 (Cost: 5, Priority: HIGH)

#### Action 5: Create Learning Progress Tracking API
```typescript
// Endpoint: POST /api/learning-progress/track
// Body: { userId: string, annotationId: string, interactionType: string, discovered: boolean }

// Uses annotation_mastery table to track:
// - First exposure (first_seen_at)
// - Discovery interactions
// - Prepares for mastery tracking
```

**Preconditions:** annotation_mastery table exists
**Effects:** learn-progress-tracking-available
**Cost:** 3

---

#### Action 6: Create Learning Progress Fetch API
```typescript
// Endpoint: GET /api/learning-progress/:userId
// Returns: { discovered: string[], masteryScores: Record<string, number>, totalAvailable: number }

interface UserLearningProgress {
  userId: string;
  discovered: string[]; // annotation IDs
  masteryScores: Record<string, number>; // annotationId -> mastery score
  totalAvailable: number;
  byType: Record<string, number>; // anatomical: 5, behavioral: 3, etc.
  recentlyDiscovered: Array<{ annotationId: string; timestamp: string }>;
}
```

**Preconditions:** annotation_mastery table exists
**Effects:** learn-progress-fetch-available
**Cost:** 2

---

#### Action 7: Integrate Progress Tracking into Learn Page
```typescript
// File: frontend/src/pages/EnhancedLearnPage.tsx
// Add progress persistence

const handleAnnotationClick = async (annotation: Annotation) => {
  setSelectedAnnotation(annotation);
  setDiscoveredTerms(prev => new Set([...prev, annotation.id]));

  // NEW: Track to backend
  await api.learningProgress.track({
    userId: currentUserId,
    annotationId: annotation.id,
    interactionType: 'click',
    discovered: true
  });
};

// Load user progress on mount
useEffect(() => {
  const loadProgress = async () => {
    const progress = await api.learningProgress.fetch(currentUserId);
    setDiscoveredTerms(new Set(progress.discovered));
  };
  loadProgress();
}, [currentUserId]);
```

**Preconditions:** Actions 4, 5, 6 complete
**Effects:** learn-page-tracks-progress
**Dependencies:** [4, 5, 6]
**Cost:** 3
**Priority:** HIGH

---

#### Action 8: Create Backend Practice Exercise Generator
```typescript
// File: backend/src/services/PracticeExerciseGenerator.ts

class PracticeExerciseGenerator {
  constructor(private pool: Pool) {}

  /**
   * Generate exercises using intelligent selection based on user mastery
   */
  async generateFromAnnotations(
    userId: string,
    count: number
  ): Promise<Exercise[]> {
    // 1. Fetch user's weak annotations (mastery_score < 0.7)
    // 2. Fetch annotations due for review (next_review_at <= NOW)
    // 3. Mix in some new annotations (not yet seen)
    // 4. Generate exercises targeting these annotations
    // 5. Include distractors from similar difficulty levels
  }

  /**
   * Spaced repetition mode: prioritize annotations due for review
   */
  async spacedRepetitionExercises(userId: string, count: number): Promise<Exercise[]>

  /**
   * Mixed difficulty: balance easy/medium/hard based on recent performance
   */
  async mixedDifficultyExercises(userId: string, count: number): Promise<Exercise[]>
}
```

**Preconditions:** annotation_mastery, annotations tables exist
**Effects:** backend-generates-annotation-exercises
**Cost:** 5
**Priority:** HIGH

---

#### Action 9: Create Practice Exercise Generation API
```typescript
// Endpoint: POST /api/practice/exercises/generate
// Body: { userId: string, count: number, type?: string, difficultyRange?: [number, number] }

interface GenerateExercisesRequest {
  userId: string;
  count: number;
  type?: 'visual_match' | 'fill_blank' | 'multiple_choice';
  difficultyRange?: [number, number];
  mode?: 'mixed' | 'spaced_repetition' | 'weak_focus';
}

interface GenerateExercisesResponse {
  exercises: Exercise[];
  metadata: {
    weakCount: number; // exercises targeting weak annotations
    reviewCount: number; // exercises for spaced repetition
    newCount: number; // exercises with new annotations
  };
}
```

**Preconditions:** Action 8 complete
**Effects:** practice-exercises-api-available
**Dependencies:** [8]
**Cost:** 2

---

### Phase 4: Personalized Practice Integration (Cost: 9)

#### Action 10: Modify Practice Exercise Service
```typescript
// File: frontend/src/services/practiceExerciseService.ts
// Add personalized exercise fetching

class PracticeExerciseService {
  // EXISTING: generateVisualMatchExercises, generateFillBlankExercises, etc.

  // NEW: Fetch personalized exercises from backend
  async generatePersonalizedExercises(
    userId: string,
    count: number = 30,
    mode: 'mixed' | 'spaced_repetition' | 'weak_focus' = 'mixed'
  ): Promise<PracticeExercise[]> {
    try {
      const response = await api.practice.generateExercises({ userId, count, mode });
      return response.exercises;
    } catch (error) {
      console.error('Failed to fetch personalized exercises, using fallback');
      return this.generateMixedExercises(count); // Fallback to existing logic
    }
  }
}
```

**Preconditions:** Action 9 complete
**Effects:** frontend-fetches-personalized-exercises
**Dependencies:** [9]
**Cost:** 3

---

#### Action 11: Modify EnhancedPracticePage for Personalization
```typescript
// File: frontend/src/pages/EnhancedPracticePage.tsx
// Integrate user mastery tracking

const EnhancedPracticePage = () => {
  const [userId, setUserId] = useState<string>(() => {
    // Get or create session-based user ID
    const stored = localStorage.getItem('aves-user-id');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random()}`;
    localStorage.setItem('aves-user-id', newId);
    return newId;
  });

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        // NEW: Use personalized exercises
        const exercises = await practiceExerciseService.generatePersonalizedExercises(
          userId,
          30,
          'mixed'
        );
        setExercises(exercises);
      } catch (err) {
        setError('Failed to load practice exercises');
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, [userId]);

  const handleAnswer = async (answer: string) => {
    const correct = answer.toLowerCase() === exercise.correctAnswer.toLowerCase();
    setIsCorrect(correct);

    // NEW: Track to mastery system
    if (exercise.annotationId) {
      await api.mastery.update({
        userId,
        annotationId: exercise.annotationId,
        correct,
        responseTimeMs: responseTime
      });
    }

    // Existing feedback logic...
  };
};
```

**Preconditions:** Actions 10, 5 complete
**Effects:** practice-page-personalized
**Dependencies:** [10, 5]
**Cost:** 4
**Priority:** HIGH

---

#### Action 12: Create Mastery Indicator Component
```typescript
// File: frontend/src/components/practice/MasteryIndicator.tsx

interface MasteryIndicatorProps {
  masteryScore: number; // 0.0 to 1.0
  confidenceLevel: number; // 1 to 5
  nextReview?: Date;
}

export const MasteryIndicator: React.FC<MasteryIndicatorProps> = ({
  masteryScore,
  confidenceLevel,
  nextReview
}) => {
  const getColorClass = () => {
    if (masteryScore >= 0.9) return 'bg-green-500';
    if (masteryScore >= 0.7) return 'bg-blue-500';
    if (masteryScore >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(level => (
          <div
            key={level}
            className={`w-3 h-6 rounded ${
              level <= confidenceLevel ? getColorClass() : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">
        {Math.round(masteryScore * 100)}% mastery
      </span>
      {nextReview && (
        <span className="text-xs text-gray-500">
          Next review: {formatDistanceToNow(nextReview)}
        </span>
      )}
    </div>
  );
};
```

**Preconditions:** None
**Effects:** mastery-indicator-component-available
**Cost:** 2
**Priority:** MEDIUM

---

### Phase 5: Species Page Integration (Cost: 11)

#### Action 13: Add Learning Content to Species Detail Page
```typescript
// File: frontend/src/pages/SpeciesDetailPage.tsx
// Add learning content section

const SpeciesDetailPage = () => {
  const { speciesId } = useParams();
  const [learningContent, setLearningContent] = useState<LearningContent | null>(null);
  const [userMastery, setUserMastery] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadLearningData = async () => {
      const [content, progress] = await Promise.all([
        learningContentService.fetchLearningContent(speciesId),
        api.learningProgress.fetch(userId)
      ]);
      setLearningContent(content);
      setUserMastery(progress.masteryScores);
    };
    loadLearningData();
  }, [speciesId, userId]);

  return (
    <div>
      {/* Existing species info */}

      {/* NEW: Learning content section */}
      {learningContent && (
        <section className="mt-8">
          <h2>Learning Content</h2>
          <p>{learningContent.totalAnnotations} vocabulary terms available</p>

          <div className="grid grid-cols-2 gap-4">
            {learningContent.images.map(image => (
              <div key={image.id}>
                <img src={image.url} alt={learningContent.species.spanishName} />
                <div className="mt-2">
                  {image.annotations.map(ann => (
                    <div key={ann.id} className="flex justify-between items-center">
                      <span>{ann.spanishTerm} - {ann.englishTerm}</span>
                      <MasteryIndicator
                        masteryScore={userMastery[ann.id] || 0}
                        confidenceLevel={getMasteryLevel(userMastery[ann.id])}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Link to={`/learn?species=${speciesId}`}>
            Start Learning This Species →
          </Link>
        </section>
      )}
    </div>
  );
};
```

**Preconditions:** Actions 3, 12 complete
**Effects:** species-page-shows-learning-content
**Dependencies:** [3, 12]
**Cost:** 4
**Priority:** MEDIUM

---

#### Action 14: Create useUserProgress Hook
```typescript
// File: frontend/src/hooks/useUserProgress.ts

interface UserProgress {
  userId: string;
  discovered: string[];
  masteryScores: Record<string, number>;
  totalAvailable: number;
  loading: boolean;
  error: string | null;
  trackProgress: (annotationId: string, correct: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserProgress = (): UserProgress => {
  const [userId] = useState(() => {
    const stored = localStorage.getItem('aves-user-id');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random()}`;
    localStorage.setItem('aves-user-id', newId);
    return newId;
  });

  const [progress, setProgress] = useState({
    discovered: [],
    masteryScores: {},
    totalAvailable: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const data = await api.learningProgress.fetch(userId);
      setProgress(data);
      setError(null);
    } catch (err) {
      setError('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const trackProgress = async (annotationId: string, correct: boolean) => {
    await api.learningProgress.track({
      userId,
      annotationId,
      interactionType: correct ? 'correct' : 'incorrect',
      discovered: true
    });
    await fetchProgress(); // Refresh
  };

  useEffect(() => {
    fetchProgress();
  }, [userId]);

  return {
    userId,
    ...progress,
    loading,
    error,
    trackProgress,
    refresh: fetchProgress
  };
};
```

**Preconditions:** Actions 6, 5 complete
**Effects:** reusable-progress-hook-available
**Dependencies:** [6, 5]
**Cost:** 3
**Priority:** MEDIUM

---

#### Action 15: Create Progress Dashboard Component
```typescript
// File: frontend/src/components/progress/ProgressDashboard.tsx

interface ProgressDashboardProps {
  userId: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ userId }) => {
  const { discovered, masteryScores, totalAvailable, loading } = useUserProgress();

  const weakAreas = Object.entries(masteryScores)
    .filter(([_, score]) => score < 0.7)
    .sort(([_, a], [__, b]) => a - b)
    .slice(0, 5);

  const strongAreas = Object.entries(masteryScores)
    .filter(([_, score]) => score >= 0.9)
    .length;

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Your Progress</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Terms Discovered"
          value={discovered.length}
          total={totalAvailable}
          color="blue"
        />
        <StatCard
          label="Mastered"
          value={strongAreas}
          total={discovered.length}
          color="green"
        />
        <StatCard
          label="Needs Practice"
          value={weakAreas.length}
          total={discovered.length}
          color="yellow"
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Focus Areas</h3>
        {weakAreas.map(([annotationId, score]) => (
          <div key={annotationId} className="flex justify-between items-center mb-2">
            <AnnotationPreview annotationId={annotationId} />
            <MasteryIndicator
              masteryScore={score}
              confidenceLevel={getMasteryLevel(score)}
            />
          </div>
        ))}
      </div>

      <Link
        to="/practice?mode=weak_focus"
        className="mt-4 btn btn-primary w-full"
      >
        Practice Weak Areas
      </Link>
    </div>
  );
};
```

**Preconditions:** Action 14 complete
**Effects:** progress-dashboard-available
**Dependencies:** [14]
**Cost:** 4
**Priority:** MEDIUM

---

### Phase 6: Admin Pipeline Integration (Cost: 8)

#### Action 16: Integrate Admin Annotations with Learn Page
```
Mechanism: When admin approves annotation via review UI:
1. Set annotation.is_visible = true in annotations table
2. Annotation automatically appears in learning content API responses
3. EnhancedLearnPage displays newly approved annotations on next load

No code changes needed - architectural integration point.
This action represents testing and validation of the flow.
```

**Preconditions:** Action 4 complete (learn-page-uses-real-data)
**Effects:** admin-annotations-flow-to-learn
**Dependencies:** [4]
**Cost:** 2
**Priority:** CRITICAL

---

#### Action 17: Create Annotation Publish API
```typescript
// Endpoint: POST /api/admin/annotations/publish
// Body: { annotationIds: string[] }

/**
 * Publishes approved AI annotations to production annotations table
 * This copies from ai_annotation_items to annotations table with is_visible=true
 */
router.post('/admin/annotations/publish', async (req, res) => {
  const { annotationIds } = req.body;

  // Transaction: copy approved annotations to production table
  await pool.query(`
    INSERT INTO annotations (
      image_id, bounding_box, annotation_type,
      spanish_term, english_term, pronunciation, difficulty_level,
      is_visible
    )
    SELECT
      image_id::uuid,
      bounding_box,
      annotation_type,
      spanish_term,
      english_term,
      pronunciation,
      difficulty_level,
      true as is_visible
    FROM ai_annotation_items
    WHERE id = ANY($1)
    ON CONFLICT (id) DO UPDATE
    SET is_visible = true
  `, [annotationIds]);

  res.json({ published: annotationIds.length });
});
```

**Preconditions:** annotations table exists
**Effects:** admin-can-publish-annotations
**Cost:** 3
**Priority:** CRITICAL

---

#### Action 18: Add Publish UI to Admin Annotation Review
```typescript
// File: frontend/src/components/admin/AnnotationReviewPanel.tsx
// (or create if doesn't exist)

const AnnotationReviewPanel = () => {
  const [selectedAnnotations, setSelectedAnnotations] = useState<string[]>([]);

  const handlePublish = async () => {
    try {
      await api.admin.publishAnnotations(selectedAnnotations);
      toast.success(`Published ${selectedAnnotations.length} annotations`);
      setSelectedAnnotations([]);
      refreshAnnotationList();
    } catch (err) {
      toast.error('Failed to publish annotations');
    }
  };

  return (
    <div>
      {/* Existing annotation review UI */}

      <div className="mt-4">
        <button
          onClick={handlePublish}
          disabled={selectedAnnotations.length === 0}
          className="btn btn-primary"
        >
          Publish {selectedAnnotations.length} Approved Annotations
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        Published annotations will immediately appear in the Learn page
      </div>
    </div>
  );
};
```

**Preconditions:** Action 17 complete
**Effects:** admin-ui-can-publish
**Dependencies:** [17]
**Cost:** 3
**Priority:** CRITICAL

---

### Phase 7: Analytics & Advanced Features (Cost: 9)

#### Action 19: Create Analytics API
```typescript
// Endpoint: GET /api/analytics/mastery-stats
// Returns aggregate mastery statistics

interface MasteryAnalytics {
  overallStats: {
    totalUsers: number;
    totalAnnotations: number;
    avgMasteryScore: number;
    totalExposures: number;
  };
  difficultAnnotations: Array<{
    annotationId: string;
    spanishTerm: string;
    avgMasteryScore: number;
    avgExposures: number;
    masteryRate: number; // % of users who mastered it
  }>;
  popularContent: Array<{
    annotationId: string;
    spanishTerm: string;
    totalExposures: number;
    avgResponseTime: number;
  }>;
  learningVelocity: {
    avgTimeToMastery: number; // days
    fastestLearners: Array<{ userId: string; avgMasteryScore: number }>;
  };
}
```

**Preconditions:** annotation_mastery table exists
**Effects:** analytics-api-available
**Cost:** 3
**Priority:** LOW

---

#### Action 20: Create Spaced Repetition Scheduler Component
```typescript
// File: frontend/src/components/practice/SpacedRepetitionScheduler.tsx

interface SchedulerProps {
  userId: string;
}

export const SpacedRepetitionScheduler: React.FC<SchedulerProps> = ({ userId }) => {
  const [dueAnnotations, setDueAnnotations] = useState([]);

  useEffect(() => {
    const fetchDue = async () => {
      const due = await api.mastery.getDueForReview(userId);
      setDueAnnotations(due);
    };
    fetchDue();
  }, [userId]);

  const startSRSSession = async () => {
    const exercises = await practiceExerciseService.generatePersonalizedExercises(
      userId,
      20,
      'spaced_repetition'
    );
    // Navigate to practice with SRS exercises
    navigate('/practice', { state: { exercises, mode: 'srs' } });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Spaced Repetition</h3>

      <div className="mb-4">
        <span className="text-3xl font-bold text-blue-600">
          {dueAnnotations.length}
        </span>
        <span className="text-gray-600 ml-2">terms due for review</span>
      </div>

      {dueAnnotations.length > 0 && (
        <>
          <ul className="mb-4">
            {dueAnnotations.slice(0, 5).map(ann => (
              <li key={ann.annotationId} className="mb-2">
                <span className="font-medium">{ann.spanishTerm}</span>
                <span className="text-sm text-gray-500 ml-2">
                  Last reviewed: {formatDistanceToNow(ann.lastSeenAt)} ago
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={startSRSSession}
            className="btn btn-primary w-full"
          >
            Start Review Session
          </button>
        </>
      )}

      {dueAnnotations.length === 0 && (
        <p className="text-gray-600">
          No reviews due right now. Check back tomorrow!
        </p>
      )}
    </div>
  );
};
```

**Preconditions:** Action 14 complete
**Effects:** srs-scheduler-available
**Dependencies:** [14]
**Cost:** 4
**Priority:** LOW

---

#### Action 21: Create User Session Tracking Migration
```sql
-- File: backend/src/database/migrations/015_user_session_tracking.sql

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255), -- NULL for anonymous, UUID for authenticated

  -- Session metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address INET,

  -- Usage tracking
  total_exercises INTEGER DEFAULT 0,
  total_discoveries INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER,

  -- Index for quick lookups
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_last_active (last_active)
);

-- Auto-update last_active on any mastery update
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_sessions
  SET last_active = CURRENT_TIMESTAMP
  WHERE session_id = (
    SELECT session_id FROM annotation_mastery WHERE user_id = NEW.user_id LIMIT 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_active
  AFTER INSERT OR UPDATE ON annotation_mastery
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();
```

**Preconditions:** None
**Effects:** user-session-tracking-available
**Cost:** 2
**Priority:** LOW

---

## Dependency Graph

```
Phase 1 (Foundation):
  1 ──┐
  2 ──┼──> 3 (Learning Service)
  5 ──┤
  6 ──┘

Phase 2 (Frontend Integration):
  3 ──> 4 (Learn Page Real Data)

Phase 3 (Progress & Exercise Generation):
  4 ──┐
  5 ──┼──> 7 (Learn Page Progress Tracking)
  6 ──┘

  8 ──> 9 (Practice Exercise API)

Phase 4 (Personalized Practice):
  9 ──> 10 (Frontend Exercise Service)

  10 ──┐
  5 ──┼──> 11 (Practice Page Personalization)

  12 (Mastery Indicator - independent)

Phase 5 (Species Integration):
  3 ──┐
  12 ─┼──> 13 (Species Page Learning Content)

  5 ──┐
  6 ──┼──> 14 (useUserProgress Hook)

  14 ──> 15 (Progress Dashboard)

Phase 6 (Admin Integration):
  4 ──> 16 (Admin Flow Validation)

  17 (Publish API - independent)
  17 ──> 18 (Admin UI)

Phase 7 (Analytics):
  19 (Analytics API - independent)
  14 ──> 20 (SRS Scheduler)
  21 (Session Tracking - independent)
```

---

## Parallel Execution Groups

**Group 1 (Phase 1):** Can execute simultaneously
- Action 1: Learning Content Detail API
- Action 2: Learning Content List API
- Action 5: Progress Tracking API
- Action 6: Progress Fetch API
- Action 8: Exercise Generator Service
- Action 12: Mastery Indicator Component
- Action 17: Publish API
- Action 19: Analytics API
- Action 21: Session Tracking Migration

**Group 2 (Phase 2):** Sequential after Group 1
- Action 3: Learning Service (depends on 1, 2)

**Group 3 (Phase 2):** Sequential after Group 2
- Action 4: Learn Page Real Data (depends on 3)

**Group 4 (Phase 3):** Parallel after previous phases
- Action 7: Learn Page Progress (depends on 4, 5, 6)
- Action 9: Exercise API (depends on 8)

**Group 5 (Phase 4):** Parallel after Group 4
- Action 10: Frontend Exercise Service (depends on 9)
- Action 14: useUserProgress Hook (depends on 5, 6)

**Group 6 (Phase 4-5):** Parallel after Group 5
- Action 11: Practice Page Personalization (depends on 10, 5)
- Action 13: Species Page Learning (depends on 3, 12)
- Action 15: Progress Dashboard (depends on 14)
- Action 18: Admin UI Publish (depends on 17)

**Group 7 (Phase 6):** Final validation
- Action 16: Admin Flow Validation (depends on 4)
- Action 20: SRS Scheduler (depends on 14)

---

## Critical Path

**7 Actions - Must complete in order:**

1. **Action 1** → Create Learning Content Detail API (Cost: 3)
2. **Action 3** → Create Learning Content Service (Cost: 3)
3. **Action 4** → Modify Learn Page to Use Real Data (Cost: 4)
4. **Action 7** → Integrate Progress Tracking (Cost: 3)
5. **Action 17** → Create Annotation Publish API (Cost: 3)
6. **Action 18** → Add Publish UI to Admin (Cost: 3)
7. **Action 16** → Validate Admin-to-Learn Flow (Cost: 2)

**Critical Path Total Cost:** 21 units
**Critical Path Estimated Time:** 2-3 days

---

## Implementation Strategy

### Week 1: Foundation & Core Integration (Actions 1-7)
**Days 1-2:**
- Parallel execution of Group 1 (backend APIs + components)
- Focus: Actions 1, 2, 5, 6, 8, 12, 17

**Day 3:**
- Action 3: Learning Service
- Action 4: Learn Page Real Data

**Day 4:**
- Action 7: Progress Tracking Integration
- Action 9: Exercise Generation API

### Week 2: Personalization & Admin (Actions 8-18)
**Days 5-6:**
- Actions 10, 14: Frontend services and hooks
- Actions 11, 13: Page integrations

**Day 7:**
- Action 15: Progress Dashboard
- Action 18: Admin UI
- Action 16: End-to-end validation

### Week 3 (Optional): Advanced Features (Actions 19-21)
- Analytics dashboard
- SRS scheduler UI
- Session tracking enhancements

---

## Testing Strategy

### Unit Tests (Per Action)
- Backend routes: Request/response validation, error handling
- Frontend services: API mocking, cache behavior
- Components: Props, state management, user interactions

### Integration Tests
- **Learn Page Flow:** API → Service → Component → User interaction → Progress tracking
- **Practice Flow:** Exercise generation → Mastery update → Next exercise selection
- **Admin Flow:** Annotation review → Publish → Appear in Learn page

### End-to-End Tests
1. **User Learning Journey:**
   - Browse species → View learning content → Discover annotations → Track progress
2. **Practice Session:**
   - Start practice → Answer exercises → Update mastery → Get personalized next set
3. **Admin Workflow:**
   - Review AI annotations → Approve → Publish → Verify in Learn page

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Backend API performance with large annotation sets | Medium | High | Add pagination, caching, database indexes |
| Frontend state management complexity | Medium | Medium | Use established patterns (React Query, Context API) |
| User ID management (session vs. auth) | High | Medium | Start with session IDs, plan for auth migration |
| Database migration conflicts | Low | High | Test migrations in dev environment first |
| Admin UI doesn't exist yet | Medium | High | Create minimal viable admin UI as part of Action 18 |

---

## Success Metrics

### Phase 1-2 Success:
- ✅ Learn page displays real annotations from database
- ✅ No hardcoded data in Learn page
- ✅ Loading/error states handle API failures gracefully

### Phase 3-4 Success:
- ✅ User progress persists across sessions
- ✅ Practice exercises personalized based on mastery data
- ✅ Mastery scores update after each exercise

### Phase 5-6 Success:
- ✅ Species pages show learning content with user progress
- ✅ Admin can publish annotations with one click
- ✅ Published annotations appear in Learn page within 5 minutes

### Phase 7 Success:
- ✅ Analytics dashboard shows meaningful insights
- ✅ Spaced repetition scheduler suggests optimal review times
- ✅ Session tracking provides usage analytics

---

## Rollback Plan

### If Critical Path Fails:
1. **Action 4 fails:** Keep hardcoded data in Learn page, deploy other features independently
2. **Action 7 fails:** Progress tracking works without persistence, use local storage fallback
3. **Action 17 fails:** Manual database updates for publishing annotations

### If Non-Critical Actions Fail:
- Actions 12, 15, 20: UI enhancements, can be deferred
- Actions 19, 21: Analytics features, nice-to-have

---

## Next Steps

1. **Review this plan** with development team
2. **Set up development environment** for backend/frontend integration
3. **Create feature branch:** `feature/goap-integration`
4. **Start with Group 1 parallel execution** (9 actions)
5. **Track progress** in project management tool
6. **Daily standups** to monitor critical path progress

---

**Generated by:** GOAP Planning Agent
**Algorithm:** A* Pathfinding with Cost-Based Heuristics
**Stored in:** claude-flow memory (namespace: aves, key: goap-plan-aves)
**Task ID:** task-1765586118464-lw48pk4fi

---
