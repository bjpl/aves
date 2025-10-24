# Aves Testing Script with Test Data

This script provides step-by-step instructions with specific test data for comprehensive testing.

---

## Prerequisites

- [ ] Local environment running (`npm run dev`)
- [ ] Browser DevTools open (F12)
- [ ] Bug tracking template ready
- [ ] Timer/stopwatch ready
- [ ] Screen recording software (optional)

---

## Test Data Reference

### Test Species

| ID | Spanish Name | English Name | Category | Annotations |
|----|--------------|--------------|----------|-------------|
| 1 | Petirrojo | Robin | Common | 8 annotations |
| 2 | Gorrión | Sparrow | Urban | 6 annotations |
| 3 | Águila Real | Golden Eagle | Raptor | 10 annotations |
| 4 | Colibrí | Hummingbird | Tropical | 7 annotations |

### Test Vocabulary

| Spanish | English | Category | Difficulty |
|---------|---------|----------|------------|
| Pico | Beak | Anatomy | Beginner |
| Ala | Wing | Anatomy | Beginner |
| Cola | Tail | Anatomy | Beginner |
| Plumaje | Plumage | Anatomy | Intermediate |
| Garra | Talon | Anatomy | Intermediate |
| Cresta | Crest | Anatomy | Intermediate |
| Pechuga | Breast | Anatomy | Advanced |
| Envergadura | Wingspan | Measurement | Advanced |

### Test Filters

| Filter Type | Test Values |
|-------------|-------------|
| Habitat | Bosque, Montaña, Urbano, Acuático |
| Size | Pequeño, Mediano, Grande |
| Color | Rojo, Azul, Verde, Amarillo, Marrón |
| Behavior | Volar, Cantar, Anidar, Migrar |

---

## 🧪 Test Session 1: Core Functionality (30 min)

### Test 1.1: Homepage & Navigation (5 min)

**Objective**: Verify first-time user experience

**Steps**:
```
1. Clear browser cache (Cmd+Shift+Delete)
2. Navigate to http://localhost:5173
3. Start timer
4. Observe page for 30 seconds WITHOUT clicking
5. Stop timer when you understand the app's purpose
```

**Checklist**:
- [ ] Page loads in < 3 seconds
- [ ] No JavaScript errors in console
- [ ] Header/logo is visible
- [ ] Navigation menu is clear
- [ ] Call-to-action button is obvious
- [ ] Images load properly

**Record**:
- Time to understand purpose: _____ seconds
- First impression (1-10): _____
- What confused you: _____________________

---

### Test 1.2: Species Browser - Basic Navigation (5 min)

**Objective**: Test taxonomy browsing

**Steps**:
```
1. Click "Species Browser" (or equivalent)
2. Verify species grid loads
3. Click on "Petirrojo" (Robin) card
4. Verify species detail page loads
5. Click "Back" button
6. Verify you return to species grid
```

**Checklist**:
- [ ] Species grid renders (at least 10 species visible)
- [ ] Each species card has: image, Spanish name, English name
- [ ] Click on card navigates to detail page
- [ ] Detail page shows: full image, description, habitat info
- [ ] Back navigation works
- [ ] No 404 errors

**Test Data**:
- Expected species on first page: Petirrojo, Gorrión, Águila
- If not found, search for "Passer" or "Robin"

---

### Test 1.3: Species Browser - Filtering (10 min)

**Objective**: Verify filter functionality

**Steps**:
```
1. Go to Species Browser
2. Apply filter: Habitat = "Urbano"
3. Count results
4. Apply second filter: Size = "Pequeño"
5. Count results (should be fewer)
6. Clear all filters
7. Verify all species return
```

**Test Cases**:

| Filter Combination | Expected Results |
|--------------------|------------------|
| Habitat: Bosque | Should show forest birds (10+ species) |
| Habitat: Urbano | Should show urban birds (5+ species) |
| Size: Grande | Should show large birds (eagles, etc.) |
| Color: Rojo | Should show birds with red features |
| Habitat: Urbano + Size: Pequeño | Should show sparrows, robins |
| Habitat: Acuático + Color: Azul | Should show water birds with blue |

**Checklist**:
- [ ] Filters apply correctly
- [ ] Results update in < 1 second
- [ ] Result count is displayed
- [ ] "Clear filters" button works
- [ ] No duplicate species shown
- [ ] Empty state shown if no results

**Record**:
- Habitat: Urbano → _____ results
- Habitat: Urbano + Size: Pequeño → _____ results

---

### Test 1.4: Annotation Interaction (10 min)

**Objective**: Test progressive vocabulary disclosure

**Steps**:
```
1. Navigate to Species: "Petirrojo"
2. Hover over the bird's beak area
3. Observe annotation preview
4. Click on the annotation (Tap 1)
5. Verify Spanish term "pico" appears
6. Click again (Tap 2)
7. Verify English translation "beak" appears
8. Click again (Tap 3)
9. Verify etymology appears
10. Click again (Tap 4)
11. Verify example sentence appears
12. Repeat for "ala" (wing), "cola" (tail), "plumaje" (plumage)
```

**Annotations to Test**:

| Annotation | Spanish | English | Expected Etymology | Expected Example |
|------------|---------|---------|-------------------|------------------|
| Beak | Pico | Beak | Latin "picus" (woodpecker) | "El pico del águila es muy fuerte" |
| Wing | Ala | Wing | Latin "ala" | "Las alas del colibrí baten rápido" |
| Tail | Cola | Tail | Latin "cauda" | "La cola del pavo real es hermosa" |
| Plumage | Plumaje | Plumage | French "plume" (feather) | "El plumaje del petirrojo es rojo" |

**Checklist**:
- [ ] Hover shows annotation boundary
- [ ] Click 1: Spanish term visible
- [ ] Click 2: English translation visible
- [ ] Click 3: Etymology visible (interesting fact)
- [ ] Click 4: Example sentence visible (grammatically correct)
- [ ] Annotations don't overlap
- [ ] Progress is tracked (counter updates)
- [ ] Can close annotation with X or ESC

**Record**:
- Number of annotations tested: _____
- Did you learn new Spanish words? Yes / No
- Most helpful disclosure level: 1 / 2 / 3 / 4

---

## 🧪 Test Session 2: AI Features (30 min)

### Test 2.1: Exercise Generation - Visual Discrimination (10 min)

**Objective**: Test AI-generated visual exercises

**Steps**:
```
1. Click "Practice" or "Exercises"
2. Select "Visual Discrimination" exercise type
3. Click "Start Session"
4. Complete 5 questions:
   - Question 1: Select correct answer
   - Question 2: Select correct answer
   - Question 3: Select WRONG answer (intentionally)
   - Question 4: Select correct answer
   - Question 5: Select WRONG answer (intentionally)
5. Click "Submit"
6. Review feedback and score
```

**Sample Question Format**:
```
Question: "Which feature is the 'pico' (beak)?"
[Image of bird with 4 highlighted areas]
Options:
A) Wing area
B) Beak area ← Correct
C) Tail area
D) Leg area
```

**Checklist**:
- [ ] Exercise loads in < 2 seconds (cached)
- [ ] Questions are clear and unambiguous
- [ ] Images are high quality (no pixelation)
- [ ] 4 answer options provided
- [ ] Only 1 correct answer per question
- [ ] Feedback shows for wrong answers
- [ ] Correct answer highlighted after submission
- [ ] Score calculated correctly (3/5 = 60%)
- [ ] Progress bar updates

**Record**:
- Exercise load time: _____ seconds
- Your score: _____ / 5
- Were wrong answers explained clearly? Yes / No
- Any confusing questions: _____________________

---

### Test 2.2: Exercise Generation - Contextual Fill (10 min)

**Objective**: Test sentence completion exercises

**Steps**:
```
1. Select "Contextual Fill" exercise type
2. Start new session
3. Complete 5 fill-in-the-blank questions
```

**Sample Question Format**:
```
Question: "El _____ del águila es muy afilado."
Options:
A) ala (wing)
B) pico (beak) ← Correct
C) cola (tail)
D) plumaje (plumage)
```

**Test Cases**:

| Sentence | Correct Answer | Why |
|----------|----------------|-----|
| "El _____ del colibrí bate muy rápido" | ala (wing) | Wings beat fast |
| "La _____ del pavo real es colorida" | cola (tail) | Peacock's tail |
| "El _____ rojo del petirrojo es distintivo" | pecho (breast) | Robin's red breast |

**Checklist**:
- [ ] Sentences are grammatically correct
- [ ] Context makes the answer clear
- [ ] Distractors (wrong answers) are plausible
- [ ] Cultural context is appropriate
- [ ] Difficulty increases gradually
- [ ] No duplicate sentences in same session

**Record**:
- Your score: _____ / 5
- Difficulty rating (1=easy, 5=hard): _____
- Any unnatural sentences: _____________________

---

### Test 2.3: Exercise Generation - Term Matching (10 min)

**Objective**: Test vocabulary matching exercises

**Steps**:
```
1. Select "Term Matching" exercise type
2. Start new session
3. Match 10 Spanish terms to English translations
```

**Sample Question Format**:
```
Match Spanish to English:
1. Pico          A. Wing
2. Ala           B. Beak
3. Cola          C. Plumage
4. Plumaje       D. Tail

Correct matches: 1-B, 2-A, 3-D, 4-C
```

**Test Vocabulary Set**:

| Spanish | English | Category |
|---------|---------|----------|
| Pico | Beak | Anatomy |
| Ala | Wing | Anatomy |
| Cola | Tail | Anatomy |
| Garra | Talon | Anatomy |
| Plumaje | Plumage | Anatomy |
| Volar | To fly | Action |
| Cantar | To sing | Action |
| Anidar | To nest | Action |

**Checklist**:
- [ ] Drag-and-drop works (or click-based matching)
- [ ] Visual feedback on hover
- [ ] Matched pairs lock in place
- [ ] Can undo a match
- [ ] All terms are matchable (no orphans)
- [ ] Instant feedback on correctness
- [ ] Score shows matched/total

**Record**:
- Interaction method: Drag-drop / Click-based
- Your score: _____ / 10
- Matching time: _____ seconds
- UI was intuitive? Yes / No

---

## 🧪 Test Session 3: Mobile & Responsive (20 min)

### Test 3.1: Mobile Layout - Portrait (10 min)

**Objective**: Test mobile experience on phones

**Setup**:
```
Option A: Use real device (iPhone or Android)
Option B: Chrome DevTools > Toggle Device Mode (Cmd+Shift+M)
  - Device: iPhone 14 Pro (393 x 852)
  - Network: Fast 3G
```

**Steps**:
```
1. Open app on mobile device
2. Navigate through all pages:
   - Homepage
   - Species Browser
   - Species Detail (Petirrojo)
   - Exercises
3. Test touch interactions:
   - Tap on annotations
   - Swipe through image galleries
   - Fill out exercise forms
4. Rotate to landscape
5. Verify layout adapts
```

**Checklist**:
- [ ] Text is readable without zooming (min 16px)
- [ ] Navigation menu accessible (hamburger icon?)
- [ ] Buttons are large enough (≥44px × 44px)
- [ ] Images don't overflow screen width
- [ ] No horizontal scrolling
- [ ] Forms work with mobile keyboard
- [ ] Touch targets don't overlap
- [ ] Sticky headers don't cover content

**Test Touch Interactions**:

| Element | Action | Expected Result |
|---------|--------|-----------------|
| Annotation | Tap | Spanish term revealed |
| Species card | Tap | Navigate to detail page |
| Exercise option | Tap | Option selected (highlighted) |
| Navigation menu | Tap | Menu opens/closes |
| Back button | Tap | Navigate to previous page |

**Record**:
- Device tested: _____________________
- Viewport size: _____ × _____
- Font size readable? Yes / No
- Touch targets easy to tap? Yes / No
- Major issues found: _____________________

---

### Test 3.2: Tablet Layout - iPad (10 min)

**Setup**:
```
DevTools Device Mode:
- Device: iPad Pro 11" (834 × 1194)
- Orientation: Portrait, then Landscape
```

**Steps**:
```
1. Load app on iPad
2. Verify layout uses available space
3. Check if desktop features are available
4. Test two-column layouts
5. Rotate to landscape
6. Verify layout adjusts
```

**Checklist**:
- [ ] Layout is not just stretched mobile view
- [ ] Uses tablet-specific breakpoints
- [ ] Two-column layout where appropriate
- [ ] Touch and mouse inputs both work
- [ ] Landscape mode optimized

---

## 🧪 Test Session 4: Error Handling (15 min)

### Test 4.1: Network Errors (5 min)

**Steps**:
```
1. Start an exercise session
2. Open DevTools > Network tab
3. Switch to "Offline" mode
4. Try to submit exercise answers
5. Observe error handling
6. Go back online
7. Verify app recovers
```

**Checklist**:
- [ ] User-friendly error message (not "ERR_NETWORK")
- [ ] Retry button available
- [ ] Offline indicator shown
- [ ] Data preserved (can retry later)
- [ ] App doesn't crash

**Expected Error Message**:
> "Unable to submit answers. Please check your internet connection and try again."

---

### Test 4.2: Invalid URLs (5 min)

**Test Cases**:

| URL | Expected Result |
|-----|-----------------|
| `/species/999999` | 404 page: "Species not found" |
| `/totally-fake-page` | 404 page: "Page not found" |
| `/species/abc` | Error: "Invalid species ID" |
| `/exercises/-1` | Error: "Invalid exercise ID" |

**Checklist**:
- [ ] 404 page is styled (not default browser page)
- [ ] Error message is helpful
- [ ] Link back to homepage provided
- [ ] No stack traces visible to user
- [ ] Console shows appropriate error logging

---

### Test 4.3: Invalid Inputs (5 min)

**Test Cases**:

| Input Field | Test Value | Expected Behavior |
|-------------|------------|-------------------|
| Search | `'; DROP TABLE--` | Input sanitized, no SQL injection |
| Search | `🦜🐦🦅` | Emoji handled gracefully |
| Search | 500 char string | Truncated or error message |
| Exercise answer | `<script>alert('xss')</script>` | Escaped, no XSS |

**Checklist**:
- [ ] Special characters don't break app
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] Long strings handled (truncated or scrolled)
- [ ] Error messages explain the issue

---

## 🧪 Test Session 5: Performance (15 min)

### Test 5.1: Lighthouse Audit (10 min)

**Steps**:
```
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select categories:
   ✓ Performance
   ✓ Accessibility
   ✓ Best Practices
   ✓ SEO
4. Click "Generate report"
5. Wait for audit to complete
6. Review scores
```

**Target Scores**:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

**Record**:
- Performance: _____ / 100
- Accessibility: _____ / 100
- Best Practices: _____ / 100
- SEO: _____ / 100

**Key Metrics**:
- First Contentful Paint: _____ s (target < 1.8s)
- Largest Contentful Paint: _____ s (target < 2.5s)
- Total Blocking Time: _____ ms (target < 200ms)
- Cumulative Layout Shift: _____ (target < 0.1)
- Speed Index: _____ s (target < 3.4s)

---

### Test 5.2: Network Performance (5 min)

**Steps**:
```
1. Open DevTools > Network tab
2. Reload page (Cmd+R)
3. Observe waterfall
4. Check file sizes
```

**Checklist**:
- [ ] Total page size < 2MB (initial load)
- [ ] Images lazy-load (only load when in viewport)
- [ ] Fonts load quickly
- [ ] No large unused libraries
- [ ] API responses < 100KB each
- [ ] Caching headers set correctly

**Record**:
- Total page size: _____ MB
- Number of requests: _____
- Load time (fast 3G): _____ s

---

## 📋 Testing Completion Checklist

### Documentation
- [ ] All test scenarios completed
- [ ] Bug reports filed for issues found
- [ ] Performance metrics recorded
- [ ] UX feedback documented

### Test Coverage
- [ ] Core features tested (annotations, exercises)
- [ ] Mobile experience tested
- [ ] Error handling tested
- [ ] Performance benchmarked
- [ ] Accessibility checked

### Follow-Up Actions
- [ ] Prioritize bugs (P0 → P3)
- [ ] Create GitHub issues for critical bugs
- [ ] Share findings with team
- [ ] Schedule regression testing after fixes

---

## Next Steps

1. **Review Results**: Compile all bug reports and feedback
2. **Prioritize Issues**: Use severity matrix from bug template
3. **Create Action Plan**: Assign fixes to sprints
4. **Regression Test**: Re-test after fixes are implemented
5. **User Acceptance**: Consider external beta testing

---

**Testing Script Version**: 1.0
**Last Updated**: October 24, 2025
**Estimated Total Time**: 90-120 minutes
