# Aves Testing Modules - Complete Inventory

This document provides a comprehensive inventory of all components, services, hooks, and API routes that need testing.

---

## Frontend Testing Inventory

### Services (7 files)

#### 1. exerciseGenerator.ts
**Location:** `/frontend/src/services/exerciseGenerator.ts`
**Lines of Code:** 148
**Priority:** CRITICAL
**Complexity:** High

**Functions to Test:**
- `constructor(annotations: Annotation[])`
- `generateExercise(type: ExerciseType): Exercise | null`
- `generateVisualDiscrimination(): VisualDiscriminationExercise | null`
- `generateTermMatching(): TermMatchingExercise | null`
- `generateContextualFill(): ContextualFillExercise | null`
- `static checkAnswer(exercise: Exercise, userAnswer: any): boolean`
- `static generateFeedback(isCorrect: boolean, exercise: Exercise): string`

**Test Count Required:** 20
**Estimated Effort:** 6-8 hours
**Coverage Target:** 95%

---

#### 2. enhancedExerciseGenerator.ts
**Location:** `/frontend/src/services/enhancedExerciseGenerator.ts`
**Lines of Code:** 483
**Priority:** HIGH
**Complexity:** Very High

**Functions to Test:**
- `constructor(annotations: Annotation[])`
- `generateAdaptiveExercise(): EnhancedExercise | null`
- `getExerciseTypesForLevel(level: number): EnhancedExerciseType[]`
- `selectNextExerciseType(types: EnhancedExerciseType[]): EnhancedExerciseType`
- `generateExercise(type: EnhancedExerciseType): EnhancedExercise | null`
- `generateVisualIdentification(): EnhancedExercise | null`
- `generateEnhancedVisualDiscrimination(): EnhancedExercise | null`
- `generateAudioRecognition(): EnhancedExercise | null`
- `generateEnhancedTermMatching(): EnhancedExercise | null`
- `generateEnhancedContextualFill(): EnhancedExercise | null`
- `generateSentenceBuilding(): EnhancedExercise | null`
- `generateCulturalContext(): EnhancedExercise | null`
- `updateLevel(performance: { correct: number; total: number })`
- `static checkAnswer(exercise: EnhancedExercise, userAnswer: any): boolean`
- `static generateFeedback(isCorrect: boolean, exercise: EnhancedExercise): string`

**Helper Methods:**
- `mapTermToPart(spanishTerm: string): string`
- `groupAnnotationsByType(): Record<string, Annotation[]>`
- `getContextSentences(annotation: Annotation)`
- `getCulturalNote(term: string): string`
- `getAdjective(): string`
- `getAdjectiveTranslation(): string`
- `getColor(): string`
- `getColorTranslation(): string`

**Test Count Required:** 25
**Estimated Effort:** 10-12 hours
**Coverage Target:** 90%

---

#### 3. vocabularyAPI.ts
**Location:** `/frontend/src/services/vocabularyAPI.ts`
**Lines of Code:** 48
**Priority:** MEDIUM
**Complexity:** Low

**Functions to Test:**
- `getEnrichment(spanishTerm: string)`
- `getExamples(spanishTerm: string)`
- `trackInteraction(annotationId: string, spanishTerm: string, level: DisclosureLevel)`
- `getSessionId(): string`
- `generatePronunciationAudio(text: string): Promise<string>`

**Test Count Required:** 5
**Estimated Effort:** 2 hours
**Coverage Target:** 85%

---

#### 4. apiAdapter.ts
**Location:** `/frontend/src/services/apiAdapter.ts`
**Priority:** MEDIUM
**Complexity:** Medium
**Issues:** Uses `any` types, unsafe assertions

**Test Count Required:** 6
**Estimated Effort:** 3 hours
**Coverage Target:** 80%

---

#### 5. clientDataService.ts
**Location:** `/frontend/src/services/clientDataService.ts`
**Priority:** MEDIUM
**Complexity:** Medium

**Test Count Required:** 5
**Estimated Effort:** 2 hours
**Coverage Target:** 75%

---

#### 6. cms.service.ts
**Location:** `/frontend/src/services/cms.service.ts`
**Priority:** LOW
**Complexity:** Medium
**Issues:** JSON comparison bug

**Test Count Required:** 4
**Estimated Effort:** 2 hours
**Coverage Target:** 70%

---

#### 7. promptGenerator.ts
**Location:** `/frontend/src/services/promptGenerator.ts`
**Priority:** LOW
**Complexity:** Low

**Test Count Required:** 3
**Estimated Effort:** 1 hour
**Coverage Target:** 70%

---

### Custom Hooks (7 files)

#### 1. useExercise.ts
**Location:** `/frontend/src/hooks/useExercise.ts`
**Lines of Code:** 82
**Priority:** HIGH
**Complexity:** Medium

**State to Test:**
- Current exercise state
- Exercise history
- Loading states
- Error states

**Functions to Test:**
- Exercise generation
- Answer submission
- Exercise navigation
- Progress tracking

**Test Count Required:** 8
**Estimated Effort:** 3 hours
**Coverage Target:** 85%

---

#### 2. useProgress.ts
**Location:** `/frontend/src/hooks/useProgress.ts`
**Lines of Code:** 187
**Priority:** HIGH
**Complexity:** High

**State to Test:**
- Session progress
- Streak tracking
- Statistics calculations
- Performance metrics

**Test Count Required:** 10
**Estimated Effort:** 4 hours
**Coverage Target:** 85%

---

#### 3. useAnnotations.ts
**Location:** `/frontend/src/hooks/useAnnotations.ts`
**Lines of Code:** 71
**Priority:** MEDIUM
**Complexity:** Medium

**Test Count Required:** 6
**Estimated Effort:** 2 hours
**Coverage Target:** 80%

---

#### 4. useSpecies.ts
**Location:** `/frontend/src/hooks/useSpecies.ts`
**Lines of Code:** 96
**Priority:** MEDIUM
**Complexity:** Medium

**Test Count Required:** 6
**Estimated Effort:** 2 hours
**Coverage Target:** 80%

---

#### 5. useDisclosure.ts
**Location:** `/frontend/src/hooks/useDisclosure.ts`
**Lines of Code:** 103
**Priority:** MEDIUM
**Complexity:** Medium

**Test Count Required:** 5
**Estimated Effort:** 2 hours
**Coverage Target:** 75%

---

#### 6. useMobileDetect.ts
**Location:** `/frontend/src/hooks/useMobileDetect.ts`
**Lines of Code:** 82
**Priority:** LOW
**Complexity:** Low

**Test Count Required:** 4
**Estimated Effort:** 1.5 hours
**Coverage Target:** 70%

---

#### 7. useCMS.ts
**Location:** `/frontend/src/hooks/useCMS.ts`
**Lines of Code:** 112
**Priority:** LOW
**Complexity:** Medium

**Test Count Required:** 5
**Estimated Effort:** 2 hours
**Coverage Target:** 70%

---

### React Components

#### Exercise Components (4 files)

**1. VisualDiscrimination.tsx**
- **Priority:** HIGH
- **Tests:** 6
- **Effort:** 2 hours

**2. VisualIdentification.tsx**
- **Priority:** HIGH
- **Tests:** 6
- **Effort:** 2 hours

**3. ContextualFill.tsx**
- **Priority:** HIGH
- **Tests:** 5
- **Effort:** 2 hours

**4. ExerciseContainer.tsx**
- **Priority:** HIGH
- **Tests:** 8
- **Effort:** 3 hours
- **Issues:** Memory leak (setTimeout cleanup)

---

#### Vocabulary Components (3 files)

**1. PronunciationPlayer.tsx**
- **Priority:** MEDIUM
- **Tests:** 5
- **Effort:** 2 hours

**2. ProgressIndicator.tsx**
- **Priority:** MEDIUM
- **Tests:** 4
- **Effort:** 1.5 hours

**3. DisclosurePopover.tsx**
- **Priority:** MEDIUM
- **Tests:** 5
- **Effort:** 2 hours

---

#### Species Components (3 files)

**1. SpeciesCard.tsx**
- **Priority:** MEDIUM
- **Tests:** 4
- **Effort:** 1.5 hours
- **Note:** Should use React.memo

**2. SpeciesBrowser.tsx**
- **Priority:** MEDIUM
- **Tests:** 6
- **Effort:** 2 hours

**3. SpeciesFilters.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

---

#### Annotation Components (2 files)

**1. AnnotationCanvas.tsx**
- **Priority:** MEDIUM
- **Tests:** 8
- **Effort:** 3 hours
- **Note:** Complex canvas interactions

**2. ResponsiveAnnotationCanvas.tsx**
- **Priority:** MEDIUM
- **Tests:** 6
- **Effort:** 2 hours

---

#### Utility Components (3 files)

**1. AudioPlayer.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

**2. BirdGallery.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

**3. LessonViewer.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

---

### Pages (6 files)

**1. EnhancedLearnPage.tsx**
- **Priority:** MEDIUM
- **Tests:** 6
- **Effort:** 2 hours
- **Lines:** 381 (needs refactoring)

**2. EnhancedPracticePage.tsx**
- **Priority:** MEDIUM
- **Tests:** 6
- **Effort:** 2 hours

**3. SpeciesPage.tsx**
- **Priority:** MEDIUM
- **Tests:** 5
- **Effort:** 2 hours

**4. HomePage.tsx**
- **Priority:** LOW
- **Tests:** 3
- **Effort:** 1 hour

**5. LearnPage.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

**6. PracticePage.tsx**
- **Priority:** LOW
- **Tests:** 4
- **Effort:** 1.5 hours

---

### Utilities

**1. utils/index.ts**
- **Priority:** MEDIUM
- **Tests:** 5
- **Effort:** 2 hours
- **Coverage Target:** 90%

---

## Backend Testing Inventory

### API Routes (5 files)

#### 1. exercises.ts
**Location:** `/backend/src/routes/exercises.ts`
**Lines of Code:** 133
**Priority:** CRITICAL
**Complexity:** Medium

**Endpoints to Test:**
1. `POST /exercises/session/start`
   - Success case
   - Auto-generate session ID
   - Database errors

2. `POST /exercises/result`
   - Record correct answer
   - Record incorrect answer
   - Handle missing fields
   - Database errors

3. `GET /exercises/session/:sessionId/progress`
   - Valid session
   - Empty session
   - Accuracy calculation
   - Database errors

4. `GET /exercises/difficult-terms`
   - Returns difficult terms
   - Empty result
   - Proper ordering

**Test Count Required:** 12
**Estimated Effort:** 4 hours
**Coverage Target:** 90%

---

#### 2. annotations.ts
**Location:** `/backend/src/routes/annotations.ts`
**Lines of Code:** 237
**Priority:** HIGH
**Complexity:** High

**Endpoints to Test:**
1. `GET /annotations/:imageId`
   - Success case
   - Empty annotations
   - Database errors

2. `POST /annotations`
   - Valid data
   - Validation errors (Zod)
   - Database errors

3. `PUT /annotations/:id`
   - Update success
   - Not found
   - Invalid fields
   - Database errors

4. `DELETE /annotations/:id`
   - Delete success
   - Not found
   - Database errors

5. `POST /annotations/:id/interaction`
   - Track interaction
   - Database errors

**Test Count Required:** 15
**Estimated Effort:** 5 hours
**Coverage Target:** 85%

---

#### 3. species.ts
**Location:** `/backend/src/routes/species.ts`
**Lines of Code:** 265
**Priority:** HIGH
**Complexity:** High

**Endpoints to Test:**
1. `GET /species`
   - List all species
   - Includes annotation count
   - Proper ordering

2. `GET /species/:id`
   - Single species
   - With images
   - Not found

3. `GET /species/search`
   - Search by Spanish name
   - Search by English name
   - Search by scientific name
   - Empty query
   - No results

4. `GET /species/stats`
   - Overall statistics
   - By order
   - By habitat
   - By size

5. `POST /species`
   - Create new species
   - Validation
   - Database errors

**Test Count Required:** 16
**Estimated Effort:** 5 hours
**Coverage Target:** 85%

---

#### 4. vocabulary.ts
**Location:** `/backend/src/routes/vocabulary.ts`
**Lines of Code:** 121
**Priority:** MEDIUM
**Complexity:** Medium

**Endpoints to Test:**
1. `GET /vocabulary/enrichment/:term`
2. `POST /vocabulary/track-interaction`
3. Various edge cases

**Test Count Required:** 8
**Estimated Effort:** 3 hours
**Coverage Target:** 80%

---

#### 5. images.ts
**Location:** `/backend/src/routes/images.ts`
**Lines of Code:** 239
**Priority:** MEDIUM
**Complexity:** High

**Endpoints to Test:**
1. `GET /images`
2. `POST /images`
3. `POST /images/upload`
4. Image processing

**Test Count Required:** 10
**Estimated Effort:** 4 hours
**Coverage Target:** 75%

---

## Testing Priority Matrix

### Week 1 Focus (35+ tests)
1. ✅ **ExerciseGenerator** (20 tests) - CRITICAL
2. ✅ **Exercise Routes API** (12 tests) - CRITICAL
3. ⚠️ **EnhancedExerciseGenerator** (3 tests minimum) - HIGH

### Week 2 Focus (65+ tests)
1. **EnhancedExerciseGenerator** (complete 25 tests) - HIGH
2. **Annotations Routes API** (15 tests) - HIGH
3. **Species Routes API** (16 tests) - HIGH
4. **useExercise hook** (8 tests) - HIGH
5. **useProgress hook** (10 tests) - HIGH

### Week 3 Focus (50+ tests)
1. **Exercise Components** (25 tests)
2. **Vocabulary Components** (14 tests)
3. **Custom Hooks** (remaining 20 tests)

### Week 4+ Focus (50+ tests)
1. **Integration Tests** (15 tests)
2. **E2E Tests** (12 tests)
3. **Species Components** (14 tests)
4. **Page Components** (28 tests)

---

## Coverage Summary

### By Module Type

| Module Type | Files | Tests Required | Est. Hours | Coverage Target |
|-------------|-------|----------------|------------|-----------------|
| Services | 7 | 68 | 28 | 85% |
| Hooks | 7 | 44 | 17 | 80% |
| Exercise Components | 4 | 25 | 9 | 85% |
| Vocabulary Components | 3 | 14 | 5.5 | 80% |
| Species Components | 3 | 14 | 5 | 75% |
| Annotation Components | 2 | 14 | 5 | 75% |
| Pages | 6 | 28 | 10 | 70% |
| Utilities | 1 | 5 | 2 | 90% |
| Backend Routes | 5 | 61 | 21 | 85% |
| **TOTAL** | **38** | **273** | **102.5** | **82%** |

---

## Test Distribution by Priority

### Critical (Must Have - Week 1-2)
- ExerciseGenerator: 20 tests
- Exercise Routes: 12 tests
- EnhancedExerciseGenerator: 25 tests
- **Subtotal:** 57 tests

### High Priority (Week 2-3)
- Annotations Routes: 15 tests
- Species Routes: 16 tests
- useExercise: 8 tests
- useProgress: 10 tests
- Exercise Components: 25 tests
- **Subtotal:** 74 tests

### Medium Priority (Week 3-4)
- VocabularyAPI: 5 tests
- Vocabulary Routes: 8 tests
- Vocabulary Components: 14 tests
- Custom Hooks (remaining): 20 tests
- Species Components: 14 tests
- **Subtotal:** 61 tests

### Low Priority (Week 4+)
- Pages: 28 tests
- Utilities: 5 tests
- Other components: 20 tests
- Integration tests: 15 tests
- E2E tests: 13 tests
- **Subtotal:** 81 tests

---

## Dependencies Between Tests

### Must Test First (Foundation)
1. Test fixtures and mocks
2. ExerciseGenerator
3. API routes

### Can Test in Parallel
- Exercise components + ExerciseGenerator service
- Vocabulary components + VocabularyAPI service
- Species components + Species routes

### Requires Integration Tests
- Full exercise flow (generator → component → API)
- Vocabulary tracking (component → API → progress)
- Species browsing (filters → browser → API)

---

## Risk Assessment

### High Risk (Test First)
- ❌ ExerciseGenerator: Core business logic
- ❌ Exercise Routes: Critical data persistence
- ❌ EnhancedExerciseGenerator: Adaptive learning
- ❌ ExerciseContainer: Memory leaks

### Medium Risk
- ⚠️ useProgress: Complex state management
- ⚠️ Annotations Routes: Data validation
- ⚠️ AnnotationCanvas: Canvas performance

### Low Risk
- ✅ Static components
- ✅ Simple utilities
- ✅ CMS integration

---

## Success Metrics by Week

### Week 1
- ✅ 35+ tests
- ✅ 80% coverage on ExerciseGenerator
- ✅ CI/CD configured

### Week 2
- ✅ 100+ total tests
- ✅ All critical modules covered
- ✅ 85% average coverage

### Week 4
- ✅ 200+ total tests
- ✅ Integration tests complete
- ✅ 80%+ overall coverage

### Week 6
- ✅ 273 total tests
- ✅ E2E tests complete
- ✅ Production ready

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Total Test Count:** 273 tests
**Total Estimated Effort:** 102.5 hours
