# SPARC Development: Vocabulary Disclosure System

## 📋 SPECIFICATION

### Purpose
Create a progressive vocabulary disclosure system that reveals Spanish terms, pronunciations, and contextual information through user interactions, implementing an inductive learning approach where learners discover vocabulary naturally.

### Requirements
1. **Functional Requirements**
   - Progressive disclosure levels (hover → click → deep dive)
   - Audio pronunciation playback
   - Contextual hints and mnemonics
   - Simple interaction tracking
   - Multi-modal learning (visual, audio, text)

2. **Non-Functional Requirements**
   - Instant feedback (<50ms interaction response)
   - Accessibility: Screen reader support
   - Mobile-responsive interactions

### Disclosure Levels
1. **Level 0**: Hidden - Only bounding box visible
2. **Level 1**: Hover - Spanish term appears
3. **Level 2**: Click - English translation + pronunciation
4. **Level 3**: Deep Dive - Etymology, usage, related terms
5. **Level 4**: Mastered - Full information + examples

## 🔤 PSEUDOCODE

```
CLASS VocabularyDisclosureSystem:
    disclosureStates = Map<annotationId, DisclosureLevel>
    learningHistory = Array<InteractionEvent>
    masteryScores = Map<vocabularyId, score>

    FUNCTION handleInteraction(annotation, interactionType):
        currentLevel = disclosureStates.get(annotation.id) || 0

        IF interactionType == "hover" AND currentLevel < 1:
            revealLevel = 1
        ELSE IF interactionType == "click":
            revealLevel = min(currentLevel + 1, 4)
        ELSE IF interactionType == "keyboard":
            revealLevel = navigateWithKeyboard(annotation)

        disclosureStates.set(annotation.id, revealLevel)

        content = generateDisclosureContent(annotation, revealLevel)
        recordLearningEvent(annotation, revealLevel, timestamp)
        updateMasteryScore(annotation.vocabularyId)

        RETURN {
            content: content,
            level: revealLevel,
            nextHint: getNextHint(annotation, revealLevel)
        }

    FUNCTION generateDisclosureContent(annotation, level):
        content = {}

        SWITCH level:
            CASE 1:
                content.spanish = annotation.spanishTerm
                content.hint = generateVisualHint(annotation.boundingBox)
            CASE 2:
                content.spanish = annotation.spanishTerm
                content.english = annotation.englishTerm
                content.pronunciation = annotation.pronunciation
                content.audio = generateAudioUrl(annotation.spanishTerm)
            CASE 3:
                content = {...level2Content}
                content.etymology = fetchEtymology(annotation.spanishTerm)
                content.related = findRelatedTerms(annotation)
                content.mnemonic = generateMnemonic(annotation)
            CASE 4:
                content = {...level3Content}
                content.examples = fetchUsageExamples(annotation)
                content.commonPhrases = fetchCommonPhrases(annotation)

        RETURN content

    FUNCTION calculateMastery(vocabularyId):
        interactions = learningHistory.filter(e => e.vocabularyId == vocabularyId)

        factors = {
            viewCount: interactions.length,
            timeSpent: sum(interactions.map(i => i.duration)),
            correctExercises: countCorrectExercises(vocabularyId),
            daysSinceFirst: daysBetween(interactions[0].timestamp, now),
            spacedRepetition: calculateSpacedRepetitionScore(interactions)
        }

        mastery = (
            factors.viewCount * 0.1 +
            factors.timeSpent * 0.2 +
            factors.correctExercises * 0.4 +
            factors.spacedRepetition * 0.3
        ) / 100

        RETURN min(mastery, 1.0)
```

## 🏗️ ARCHITECTURE

### Component Structure
```
VocabularyDisclosure/
├── components/
│   ├── DisclosurePopover.tsx      # Main disclosure UI
│   ├── PronunciationPlayer.tsx    # Audio playback
│   ├── MasteryIndicator.tsx       # Progress visualization
│   ├── RelatedTermsCard.tsx       # Related vocabulary
│   └── SpacedRepetitionPrompt.tsx # Review reminders
├── hooks/
│   ├── useDisclosure.ts           # Disclosure state management
│   ├── useVocabularyMastery.ts    # Learning tracking
│   ├── usePronunciation.ts        # Audio handling
│   └── useSpacedRepetition.ts     # SRS algorithm
├── services/
│   ├── vocabularyAPI.ts           # Backend communication
│   ├── audioService.ts            # Text-to-speech
│   ├── etymologyService.ts        # Word origins
│   └── mnemonicGenerator.ts       # Memory aids
└── stores/
    ├── disclosureStore.ts         # Global disclosure state
    └── learningStore.ts           # Learning progress
```

### Data Model
```sql
-- Vocabulary mastery tracking
CREATE TABLE vocabulary_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    annotation_id UUID REFERENCES annotations(id),
    spanish_term VARCHAR(200) NOT NULL,
    disclosure_level INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    last_viewed TIMESTAMP WITH TIME ZONE,
    first_viewed TIMESTAMP WITH TIME ZONE,
    mastery_score DECIMAL(3,2) DEFAULT 0.00,
    next_review_date DATE,
    review_interval INTEGER DEFAULT 1, -- days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Learning events for analytics
CREATE TABLE learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    annotation_id UUID REFERENCES annotations(id),
    event_type VARCHAR(50) NOT NULL,
    disclosure_level INTEGER,
    interaction_duration INTEGER, -- milliseconds
    correct_response BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Etymology and related terms cache
CREATE TABLE vocabulary_enrichment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spanish_term VARCHAR(200) UNIQUE NOT NULL,
    etymology TEXT,
    mnemonic TEXT,
    related_terms JSONB,
    common_phrases JSONB,
    usage_examples JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mastery_user ON vocabulary_mastery(user_id);
CREATE INDEX idx_mastery_next_review ON vocabulary_mastery(next_review_date);
CREATE INDEX idx_events_user_annotation ON learning_events(user_id, annotation_id);
```

## 🔧 REFINEMENT

### Optimization Strategies
1. **Performance**
   - Preload Level 1 content for visible annotations
   - Cache pronunciation audio files
   - Use IndexedDB for offline vocabulary storage
   - Implement virtual scrolling for large vocabulary lists

2. **Learning Optimization**
   - Adaptive difficulty based on mastery scores
   - Personalized spaced repetition intervals
   - Context-aware hints based on common mistakes
   - Gamification elements (streaks, achievements)

3. **Accessibility**
   - ARIA labels for all interactive elements
   - Keyboard shortcuts for navigation
   - High contrast mode support
   - Screen reader announcements for level changes

### Enhanced Features
- **Smart Hints**: ML-based hint generation based on user's learning patterns
- **Social Learning**: Share mnemonics and tips with other learners
- **Progress Analytics**: Detailed learning analytics dashboard
- **Custom Flashcards**: Generate flashcards from mastered vocabulary

## ✅ COMPLETION

### Testing Strategy
- Unit tests for mastery calculation algorithms
- Integration tests for disclosure level transitions
- E2E tests for complete learning workflows
- A/B testing for optimal disclosure timing

### Success Metrics
- Average time to mastery per term
- Retention rate after spaced intervals
- User engagement with disclosure levels
- Learning velocity improvement over time

### Deployment Checklist
- [ ] All disclosure levels rendering correctly
- [ ] Audio pronunciation working across browsers
- [ ] Offline mode functioning
- [ ] Analytics tracking properly
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed