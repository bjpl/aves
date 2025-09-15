# SPARC Development: Task-Based Exercises

## 📋 SPECIFICATION

### Purpose
Create interactive, task-based exercises that reinforce Spanish bird vocabulary through visual discrimination, behavioral matching, and contextual sentence construction, promoting active learning and retention.

### Requirements
1. **Functional Requirements**
   - Visual discrimination tasks (identify correct bird/part)
   - Behavioral matching (match description to image)
   - Fill-in-the-blank sentences
   - Multiple choice questions
   - Drag-and-drop labeling
   - Immediate feedback on answers
   - Progress tracking per session

2. **Non-Functional Requirements**
   - Responsive design for mobile/tablet
   - Accessibility: Keyboard navigation
   - Clear visual feedback
   - No complex scoring (just correct/incorrect)

### Exercise Types
1. **Visual Discrimination**: Select the correct image based on Spanish term
2. **Term Matching**: Match Spanish terms to English translations
3. **Contextual Fill**: Complete sentences with appropriate vocabulary
4. **Label the Image**: Drag labels to correct positions on bird image

## 🔤 PSEUDOCODE

```
CLASS ExerciseSystem:
    exercises = Array<Exercise>
    currentExercise = null
    sessionProgress = { correct: 0, total: 0 }

    FUNCTION generateExercise(type, vocabulary):
        SWITCH type:
            CASE "visual_discrimination":
                correctAnswer = random(vocabulary)
                distractors = getRandomDistractors(vocabulary, 3)
                options = shuffle([correctAnswer, ...distractors])

                RETURN {
                    type: "visual_discrimination",
                    question: `Select the image that shows: ${correctAnswer.spanish}`,
                    correctAnswer: correctAnswer.id,
                    options: options
                }

            CASE "term_matching":
                terms = getRandomTerms(vocabulary, 4)
                pairs = terms.map(t => ({ spanish: t.spanish, english: t.english }))
                shuffledEnglish = shuffle(pairs.map(p => p.english))

                RETURN {
                    type: "term_matching",
                    spanish: pairs.map(p => p.spanish),
                    english: shuffledEnglish,
                    correctPairs: pairs
                }

            CASE "contextual_fill":
                term = random(vocabulary)
                sentence = generateSentence(term)

                RETURN {
                    type: "contextual_fill",
                    sentence: sentence.withBlank,
                    correctAnswer: term.spanish,
                    options: getSimialarTerms(term, 3)
                }

    FUNCTION checkAnswer(exercise, userAnswer):
        isCorrect = false

        SWITCH exercise.type:
            CASE "visual_discrimination":
                isCorrect = userAnswer == exercise.correctAnswer
            CASE "term_matching":
                isCorrect = compareMatchPairs(userAnswer, exercise.correctPairs)
            CASE "contextual_fill":
                isCorrect = userAnswer == exercise.correctAnswer

        sessionProgress.total++
        IF isCorrect:
            sessionProgress.correct++

        RETURN {
            correct: isCorrect,
            feedback: generateFeedback(isCorrect, exercise),
            progress: sessionProgress
        }
```

## 🏗️ ARCHITECTURE

### Component Structure
```
Exercises/
├── components/
│   ├── ExerciseContainer.tsx       # Main exercise wrapper
│   ├── VisualDiscrimination.tsx   # Image selection task
│   ├── TermMatching.tsx           # Drag-and-drop matching
│   ├── ContextualFill.tsx         # Fill-in-the-blank
│   ├── ImageLabeling.tsx          # Label bird parts
│   └── ExerciseFeedback.tsx       # Result display
├── hooks/
│   ├── useExercise.ts             # Exercise state management
│   └── useSessionProgress.ts      # Track session progress
├── services/
│   └── exerciseGenerator.ts       # Generate random exercises
└── types/
    └── exercise.types.ts          # TypeScript definitions
```

### Data Model
```sql
-- Exercise sessions
CREATE TABLE exercise_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    exercises_completed INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0
);

-- Individual exercise results
CREATE TABLE exercise_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100),
    exercise_type VARCHAR(50),
    annotation_id UUID REFERENCES annotations(id),
    spanish_term VARCHAR(200),
    user_answer JSONB,
    is_correct BOOLEAN,
    time_taken INTEGER, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_session ON exercise_results(session_id);
CREATE INDEX idx_results_type ON exercise_results(exercise_type);
```

## 🔧 REFINEMENT

### Optimization Strategies
1. **Performance**
   - Preload images for exercises
   - Cache exercise templates
   - Lazy load exercise components

2. **User Experience**
   - Clear visual feedback (green/red indicators)
   - Smooth transitions between exercises
   - Skip option for difficult questions
   - Hint system (show first letter, etc.)

3. **Accessibility**
   - Keyboard shortcuts for answers (1-4 for multiple choice)
   - Screen reader descriptions for images
   - High contrast mode support

### Exercise Variations
- **Difficulty Levels**: Adjust number of options and similarity of distractors
- **Timed Mode**: Optional time limits for added challenge
- **Review Mode**: Practice only previously incorrect answers
- **Random Mode**: Mix all exercise types

## ✅ COMPLETION

### Testing Strategy
- Unit tests for exercise generation logic
- Component tests for user interactions
- Integration tests for progress tracking
- Accessibility testing with screen readers

### Success Metrics
- Average completion rate per exercise type
- Time spent per exercise
- Most commonly missed terms
- Session completion rate

### Deployment Checklist
- [ ] All exercise types functioning
- [ ] Feedback system working
- [ ] Progress tracking accurate
- [ ] Mobile responsive design verified
- [ ] Accessibility standards met