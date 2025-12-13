# Aves - Learn, Practice, Species Full Implementation Plan

## Executive Summary

This plan outlines the complete implementation and integration of Learn, Practice, and Species features, with Admin AI tools serving as the content generation engine. The goal is to create a cohesive learning experience where AI-generated content flows seamlessly from admin approval to user-facing features.

---

## Phase 1: Data Pipeline & Content Flow (Foundation)

### 1.1 Admin AI → Learn/Practice Content Pipeline

**Current State:**
- AI annotation generation exists (`VisionAIService`, `aiExerciseGenerator`)
- Annotations are stored in `ai_annotations` table with status (pending/approved/rejected)
- Frontend only shows approved annotations in `useAnnotations` hook

**Required Work:**

#### Backend Changes

1. **Create `/api/content/learn` endpoint** (`backend/src/routes/content.ts`)
   - Fetches approved annotations grouped by difficulty level
   - Includes species metadata for each annotation
   - Supports filtering by: difficulty (1-5), type (anatomical/behavioral/color/pattern), species

2. **Create `/api/content/exercises` endpoint**
   - Returns AI-generated exercises ready for practice
   - Filters by exercise type, difficulty, species
   - Includes user progress context

3. **Create Content Publishing Service** (`backend/src/services/ContentPublishingService.ts`)
   - Method: `publishAnnotationsToLearn(annotationIds: string[])`
   - Method: `generateExercisesFromAnnotations(annotationIds: string[])`
   - Method: `getPublishedContent(filters: ContentFilters)`

#### Database Changes

4. **Add `published_at` column to `annotations` table**
   ```sql
   ALTER TABLE annotations ADD COLUMN published_at TIMESTAMP;
   ALTER TABLE annotations ADD COLUMN learning_module_id UUID;
   ```

5. **Create `learning_modules` table**
   ```sql
   CREATE TABLE learning_modules (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     title VARCHAR(200) NOT NULL,
     title_spanish VARCHAR(200) NOT NULL,
     description TEXT,
     difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
     species_ids UUID[],
     prerequisite_module_id UUID REFERENCES learning_modules(id),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## Phase 2: Learn Feature - Full Implementation

### 2.1 Learning Path Architecture

**Current:** EnhancedLearnPage uses hardcoded data
**Target:** Dynamic, AI-powered learning paths with progression

#### Components to Create/Modify

1. **LearningPathSelector** (`frontend/src/components/learn/LearningPathSelector.tsx`)
   - Shows available learning modules/paths
   - Displays completion progress per path
   - Recommended next module based on user history

2. **LessonView** (`frontend/src/components/learn/LessonView.tsx`)
   - Single lesson with 5-10 annotations to learn
   - Progressive disclosure (hover → click → details)
   - Audio pronunciation (existing AudioPlayer integration)
   - "I know this" / "Still learning" buttons

3. **LessonComplete** (`frontend/src/components/learn/LessonComplete.tsx`)
   - Summary of terms learned
   - Mini quiz (3-5 questions)
   - "Practice Now" or "Next Lesson" CTA

#### Hooks to Create

4. **useLearnContent** (`frontend/src/hooks/useLearnContent.ts`)
   ```typescript
   export const useLearnContent = (moduleId?: string) => {
     // Fetch learning content from /api/content/learn
     // Group by lesson/module
     // Track which terms user has seen/learned
   };
   ```

5. **useLearningProgress** (`frontend/src/hooks/useLearningProgress.ts`)
   ```typescript
   export const useLearningProgress = (userId: string) => {
     // Track: terms discovered, lessons completed, streaks
     // Persist to backend + localStorage
     // Calculate mastery levels
   };
   ```

#### Pages to Modify

6. **Modify EnhancedLearnPage.tsx**
   - Add module/path selection
   - Integrate with `useLearnContent` instead of hardcoded data
   - Add lesson progress indicator
   - Save progress on annotation discovery

7. **Create LearnModulePage.tsx** (`frontend/src/pages/LearnModulePage.tsx`)
   - Route: `/learn/:moduleId`
   - Shows lessons within a module
   - Tracks module-level progress

---

## Phase 3: Practice Feature - Full Implementation

### 3.1 Spaced Repetition System (SRS)

**Current:** Random exercises from species data
**Target:** Intelligent SRS with mastery tracking

#### Backend Services

1. **SpacedRepetitionService** (`backend/src/services/SpacedRepetitionService.ts`)
   ```typescript
   class SpacedRepetitionService {
     // SM-2 algorithm implementation
     calculateNextReview(correct: boolean, currentInterval: number, easeFactor: number): ReviewSchedule

     // Get terms due for review
     getDueTerms(userId: string): Term[]

     // Record review result
     recordReview(userId: string, termId: string, quality: 0-5): void
   }
   ```

2. **Add SRS tables to database**
   ```sql
   CREATE TABLE user_term_progress (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id),
     term_id UUID REFERENCES annotations(id),
     repetitions INTEGER DEFAULT 0,
     ease_factor DECIMAL(3,2) DEFAULT 2.5,
     interval_days INTEGER DEFAULT 1,
     next_review_at TIMESTAMP,
     last_reviewed_at TIMESTAMP,
     times_correct INTEGER DEFAULT 0,
     times_incorrect INTEGER DEFAULT 0
   );
   ```

#### Frontend Changes

3. **EnhancedPracticePage.tsx Modifications**
   - Add "Review Mode" (SRS due terms) vs "Practice Mode" (all terms)
   - Show terms due for review count
   - Record answers to SRS service
   - Display mastery indicators

4. **PracticeModePicker** (`frontend/src/components/practice/PracticeModePicker.tsx`)
   - Quick Quiz (10 random)
   - Review Due (SRS)
   - By Species
   - By Difficulty
   - By Type (visual match, fill blank, etc.)

5. **MasteryIndicator** (`frontend/src/components/practice/MasteryIndicator.tsx`)
   - Visual display of term mastery (0-100%)
   - Color-coded: learning → familiar → mastered
   - Streak indicator

#### Exercise Types to Add

6. **ListeningExercise** - Audio pronunciation, pick correct term
7. **SpellingExercise** - Type the Spanish term from English
8. **ContextExercise** - Fill in sentence with correct term
9. **ImageLabelingExercise** - Drag terms to correct positions on bird image

---

## Phase 4: Species Feature - Rich Content Integration

### 4.1 Species Detail Enhancements

**Current:** Basic info (names, taxonomy, colors, habitats)
**Target:** Educational hub linking to Learn/Practice

#### Components to Create

1. **SpeciesLearningSection** (`frontend/src/components/species/SpeciesLearningSection.tsx`)
   - Shows all vocabulary terms for this species
   - "Learn these terms" button → goes to species-specific lesson
   - Mastery progress for species vocabulary

2. **SpeciesGallery** (`frontend/src/components/species/SpeciesGallery.tsx`)
   - Multiple images per species
   - Each image shows annotation hotspots
   - Clickable to view annotations

3. **SpeciesQuickQuiz** (`frontend/src/components/species/SpeciesQuickQuiz.tsx`)
   - 5-question quiz about this species
   - Covers vocabulary learned for this species
   - "Practice more" link

#### API Enhancements

4. **GET /api/species/:id/learning-content**
   - Returns all annotations for species
   - User's mastery level per term
   - Available exercises

5. **GET /api/species/:id/images-with-annotations**
   - Returns all images with their annotations
   - For gallery view

#### Page Modifications

6. **SpeciesDetailPage.tsx Enhancements**
   - Add "Learning" tab with SpeciesLearningSection
   - Add "Gallery" tab with SpeciesGallery
   - Add "Quick Quiz" widget
   - Show user's mastery for this species

---

## Phase 5: Admin AI Tools Integration

### 5.1 Content Publishing Workflow

**Current:** Admin reviews, approves/rejects annotations
**Target:** Clear workflow: Generate → Review → Publish → Available in Learn/Practice

#### Admin Interface Changes

1. **Annotation Publishing Panel** (`frontend/src/components/admin/AnnotationPublishingPanel.tsx`)
   - Select approved annotations
   - Assign to learning module
   - Set difficulty level
   - Preview how it will appear in Learn page
   - "Publish to Learn" button

2. **Content Dashboard** (`frontend/src/pages/admin/ContentDashboardPage.tsx`)
   - Overview: Pending review, Approved, Published
   - Content gaps analysis (species with no content)
   - Bulk actions: Generate content for species without annotations

3. **Exercise Generator Panel** (`frontend/src/components/admin/ExerciseGeneratorPanel.tsx`)
   - Select annotations to generate exercises from
   - Choose exercise types
   - Preview generated exercises
   - Approve and publish

#### Backend Changes

4. **POST /api/admin/content/publish**
   - Takes annotation IDs
   - Sets `published_at` timestamp
   - Optionally assigns to learning module
   - Triggers exercise generation

5. **POST /api/admin/content/generate-exercises**
   - Takes annotation IDs
   - Generates exercises using AI service
   - Returns for review before publishing

---

## Phase 6: User Progress & Analytics

### 6.1 Progress Tracking System

1. **User Dashboard** (`frontend/src/pages/UserDashboardPage.tsx`)
   - Overall progress: terms learned, mastery %, streak
   - Recent activity
   - Suggested next lessons
   - Achievements/badges

2. **Progress API Endpoints**
   - GET /api/progress - User's overall progress
   - GET /api/progress/terms - Per-term mastery
   - GET /api/progress/modules - Module completion
   - POST /api/progress/record - Record learning activity

3. **Analytics Dashboard (Admin)**
   - User engagement metrics
   - Content effectiveness
   - Most/least learned terms
   - Exercise success rates

---

## Phase 7: Navigation & User Flow Improvements

### 7.1 Cross-Feature Navigation

1. **Learning Call-to-Actions**
   - Species page → "Learn vocabulary for this bird"
   - After Learn lesson → "Practice what you learned"
   - After Practice → "Learn more birds"

2. **Contextual Links**
   - Practice exercise shows bird image → "View species details"
   - Species gallery → "Learn this term" on each annotation

3. **Global Progress Indicator**
   - Add to navbar: "5 terms due for review"
   - Daily streak indicator
   - Quick access to continue learning

---

## Implementation Order

### Sprint 1 (Week 1-2): Foundation
- [ ] Create learning_modules table
- [ ] Add published_at to annotations
- [ ] Create ContentPublishingService
- [ ] Create /api/content/learn endpoint
- [ ] Create useLearnContent hook

### Sprint 2 (Week 3-4): Learn Feature
- [ ] LearningPathSelector component
- [ ] LessonView component
- [ ] Modify EnhancedLearnPage
- [ ] Create LearnModulePage
- [ ] Integrate with real content

### Sprint 3 (Week 5-6): Practice Feature
- [ ] SpacedRepetitionService
- [ ] user_term_progress table
- [ ] PracticeModePicker component
- [ ] MasteryIndicator component
- [ ] SRS integration in Practice page

### Sprint 4 (Week 7-8): Species & Admin
- [ ] SpeciesLearningSection
- [ ] SpeciesGallery
- [ ] Admin publishing workflow
- [ ] Content Dashboard

### Sprint 5 (Week 9-10): Polish & Integration
- [ ] User Dashboard
- [ ] Cross-feature navigation
- [ ] Analytics
- [ ] Testing & bug fixes

---

## Technical Architecture Decisions

### State Management
- **React Query** for server state (content, progress)
- **Zustand** for client state (UI state, offline cache)
- **localStorage** for progress backup (offline support)

### Caching Strategy
- Species list: 10 min stale time
- Annotations: 5 min stale time
- User progress: Real-time (no cache)
- SRS due terms: 1 min stale time

### Offline Support
- Cache learn content in localStorage
- Queue progress updates for sync
- Show last known progress when offline

---

## Success Metrics

1. **Content Coverage**: 100% of species have learning content
2. **User Engagement**: >50% users complete first lesson
3. **Retention**: >30% users return within 7 days
4. **Learning**: >70% average quiz score
5. **SRS Effectiveness**: Users review >80% of due terms

---

## Files to Create/Modify Summary

### New Files (18)
- `backend/src/routes/content.ts`
- `backend/src/services/ContentPublishingService.ts`
- `backend/src/services/SpacedRepetitionService.ts`
- `frontend/src/components/learn/LearningPathSelector.tsx`
- `frontend/src/components/learn/LessonView.tsx`
- `frontend/src/components/learn/LessonComplete.tsx`
- `frontend/src/components/practice/PracticeModePicker.tsx`
- `frontend/src/components/practice/MasteryIndicator.tsx`
- `frontend/src/components/species/SpeciesLearningSection.tsx`
- `frontend/src/components/species/SpeciesGallery.tsx`
- `frontend/src/components/species/SpeciesQuickQuiz.tsx`
- `frontend/src/components/admin/AnnotationPublishingPanel.tsx`
- `frontend/src/hooks/useLearnContent.ts`
- `frontend/src/hooks/useLearningProgress.ts`
- `frontend/src/hooks/useSpacedRepetition.ts`
- `frontend/src/pages/LearnModulePage.tsx`
- `frontend/src/pages/UserDashboardPage.tsx`
- `frontend/src/pages/admin/ContentDashboardPage.tsx`

### Modified Files (8)
- `frontend/src/pages/EnhancedLearnPage.tsx`
- `frontend/src/pages/EnhancedPracticePage.tsx`
- `frontend/src/pages/SpeciesDetailPage.tsx`
- `frontend/src/pages/admin/AdminAnnotationReviewPage.tsx`
- `frontend/src/App.tsx` (new routes)
- `backend/src/index.ts` (new routes)
- `database/schemas/` (new migrations)
- `shared/types/` (new types)

### Database Migrations (2)
- `006_learning_modules.sql`
- `007_user_progress.sql`
