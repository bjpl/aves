# Aves User Testing Guide

**Version**: 1.0
**Date**: October 24, 2025
**Phase**: 3 Week 2 - User Testing Preparation

## Overview

This guide provides a comprehensive framework for self-testing the Aves Spanish bird learning platform. It covers setup, testing scenarios, bug tracking, and reporting.

---

## Table of Contents

1. [Testing Environment Setup](#testing-environment-setup)
2. [Testing Scenarios](#testing-scenarios)
3. [Testing Checklist](#testing-checklist)
4. [Bug Tracking](#bug-tracking)
5. [Performance Metrics](#performance-metrics)
6. [UX Feedback Areas](#ux-feedback-areas)
7. [Post-Testing Review](#post-testing-review)

---

## Testing Environment Setup

### Option A: Live Deployment (Quick Start)
**URL**: https://bjpl.github.io/aves/

**Pros**:
- No setup required
- Test exactly what end-users see
- Mobile-friendly testing

**Cons**:
- Limited backend features (static hosting)
- No AI-powered exercise generation
- No real-time annotations

**Best for**: Quick UX testing, mobile testing, visual design feedback

---

### Option B: Local Development (Full Features)
**Best for**: Complete feature testing, AI functionality, backend integration

#### Prerequisites
- ✅ Node.js 18+ (you have v22.20.0)
- ✅ npm 9+ (you have v10.9.3)
- ⚠️ PostgreSQL 14+ (optional - can use mock data)
- 🔑 Anthropic API key (for AI features)

#### Quick Start Script
```bash
# From project root
npm install
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

#### Detailed Setup
See `docs/LOCAL_TESTING_SETUP.md` for step-by-step instructions.

---

## Testing Scenarios

### 🎯 Scenario 1: First-Time User Onboarding (5-10 min)

**Goal**: Experience the app with fresh eyes

**Test Steps**:
1. Open the app (clear browser cache first)
2. Observe the homepage for 30 seconds
3. Try to understand the app's purpose without reading documentation
4. Look for clear navigation and call-to-action buttons
5. Click through 3-4 different pages

**Success Criteria**:
- [ ] App purpose is clear within 30 seconds
- [ ] Navigation is intuitive (no hunting for features)
- [ ] Visual design is appealing and professional
- [ ] Loading states are clear (no "white screen of death")
- [ ] No broken images or links

**Notes Section**:
```
What confused you?
What delighted you?
What would you change?
```

---

### 🦜 Scenario 2: Species Browser Navigation (10 min)

**Goal**: Test taxonomy browsing and filtering

**Test Steps**:
1. Navigate to "Species Browser" (or equivalent)
2. Browse by taxonomic order (e.g., "Passeriformes")
3. Apply filters:
   - Habitat: "Forest"
   - Size: "Small"
   - Color: "Blue"
4. Click on a species card to view details
5. Check for:
   - Species images
   - Common name (Spanish & English)
   - Scientific name
   - Distribution maps
   - Conservation status

**Success Criteria**:
- [ ] Filters work correctly and update results
- [ ] Species cards load with images
- [ ] Species detail page has complete information
- [ ] Back navigation works smoothly
- [ ] No JavaScript errors in console

**Test Data**:
- Try searching for: "Gorrión" (sparrow)
- Try filtering for: Habitat="Urbano", Size="Pequeño"
- Try non-existent species: "Fakebirdius notrealis"

---

### 🎨 Scenario 3: Interactive Annotation System (15-20 min)

**Goal**: Test the core learning feature - progressive vocabulary disclosure

**Test Steps**:
1. Select a bird species with annotations (e.g., "Petirrojo" / Robin)
2. Observe the image without interaction (Level 0: Hidden)
3. **Hover** over annotated areas (Level 1: Preview)
4. **Click** on an annotation (Level 2: Spanish term revealed)
5. Click again (Level 3: English translation)
6. Click again (Level 4: Etymology)
7. Click again (Level 5: Example sentence)
8. Repeat for 5 different annotations
9. Refresh the page and check if progress persists

**Success Criteria**:
- [ ] Annotations appear smoothly on hover
- [ ] Click progression works through all 5 levels
- [ ] Spanish text is readable and correctly formatted
- [ ] Etymology is interesting and relevant
- [ ] Example sentences make sense
- [ ] Progress persists after page refresh
- [ ] No overlapping annotations
- [ ] Touch interactions work on mobile

**Vocabulary to Test**:
- Pico (beak)
- Ala (wing)
- Cola (tail)
- Plumaje (plumage)
- Garra (talon)

**Notes Section**:
```
Did you learn any Spanish words?
Which disclosure level was most helpful?
Were any annotations confusing?
```

---

### 🎮 Scenario 4: AI-Powered Exercise Generation (20-25 min)

**Goal**: Test intelligent exercise creation and adaptive learning

**Test Steps**:

#### Exercise Type 1: Visual Discrimination
1. Start a new exercise session
2. Complete "Identify the bird feature" exercise
3. Check for:
   - Image quality
   - Question clarity
   - Answer options (4 choices)
   - Immediate feedback
4. Note your score

#### Exercise Type 2: Contextual Fill-in-the-Blank
1. Complete a sentence completion exercise
2. Check for:
   - Sentence relevance
   - Vocabulary difficulty
   - Cultural context
3. Note your score

#### Exercise Type 3: Term Matching
1. Match Spanish terms to English translations
2. Try dragging and dropping (or clicking)
3. Check for visual feedback

#### Exercise Type 4: Translation Practice
1. Translate Spanish → English
2. Translate English → Spanish
3. Check for typo tolerance

**Success Criteria**:
- [ ] Exercises load within 2 seconds (caching working)
- [ ] Images are relevant to questions
- [ ] Difficulty is appropriate for beginners
- [ ] Feedback is immediate and helpful
- [ ] Wrong answers are explained
- [ ] Score is calculated correctly
- [ ] Progress bar updates in real-time
- [ ] Session can be paused and resumed
- [ ] No duplicate questions in same session

**Test Data**:
- Intentionally get 2 answers wrong to test feedback
- Complete a full session (10 questions)
- Start a second session immediately after

---

### 📱 Scenario 5: Mobile & Responsive Testing (15 min)

**Goal**: Validate mobile experience across devices

**Test Devices/Modes**:
1. **Mobile (iOS Safari)**: iPhone 12 or newer
2. **Mobile (Android Chrome)**: Pixel or Samsung
3. **Tablet (iPad)**: Portrait and landscape
4. **Desktop Browser DevTools**: Responsive mode

**Test Steps**:
1. Navigate through all main pages
2. Test touch interactions:
   - Tap on annotations
   - Swipe through image galleries
   - Scroll long lists
3. Test form inputs (if any):
   - Search bars
   - Exercise answer inputs
4. Test modals and overlays
5. Rotate device (portrait ↔ landscape)

**Success Criteria**:
- [ ] Text is readable without zooming (min 16px font)
- [ ] Touch targets are ≥44px × 44px
- [ ] Navigation menu works (hamburger menu?)
- [ ] Images scale properly
- [ ] No horizontal scrolling (overflow)
- [ ] Buttons are thumb-reachable
- [ ] Forms are easy to fill on mobile keyboard
- [ ] Modals/popups fit screen without clipping

**Common Issues to Watch For**:
- Text too small
- Buttons too close together
- Fixed positioning issues
- Image aspect ratio distortion
- Keyboard covering input fields

---

### 🐛 Scenario 6: Error Handling & Edge Cases (10-15 min)

**Goal**: Test resilience and graceful degradation

**Test Cases**:

#### 6.1 Network Errors
1. Disconnect internet mid-session
2. Try to load a new page
3. Try to submit an exercise
4. Reconnect and check recovery

**Expected**:
- [ ] User-friendly error message (not "ERR_NETWORK")
- [ ] Retry button appears
- [ ] Offline indicator (optional)
- [ ] Data saved locally if possible

#### 6.2 Invalid URLs
1. Navigate to `/species/999999` (non-existent ID)
2. Navigate to `/totally-fake-page`

**Expected**:
- [ ] 404 page with helpful message
- [ ] Link back to homepage
- [ ] No stack traces visible to user

#### 6.3 Invalid Inputs
1. Enter special characters in search: `'; DROP TABLE--`
2. Enter emoji in forms: `🦜🐦`
3. Enter very long strings (500+ chars)

**Expected**:
- [ ] Input validation prevents submission
- [ ] Error messages explain the issue
- [ ] No crashes or security vulnerabilities

#### 6.4 Browser Compatibility
1. Test in Chrome, Firefox, Safari, Edge
2. Check for console errors
3. Verify all features work

**Expected**:
- [ ] Consistent experience across browsers
- [ ] Polyfills handle older browsers
- [ ] Progressive enhancement (core features work everywhere)

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Environment configured (local or live)
- [ ] Testing device/browser ready
- [ ] Screen recording software ready (optional)
- [ ] Bug tracking template open
- [ ] Timer/stopwatch ready

### During Testing
- [ ] Follow scenarios in order
- [ ] Take screenshots of bugs
- [ ] Note timestamps for issues
- [ ] Check browser console for errors
- [ ] Think aloud (record your thoughts)
- [ ] Test both happy paths and edge cases

### Post-Testing
- [ ] Complete bug report template
- [ ] Fill out UX feedback form
- [ ] Calculate performance metrics
- [ ] Prioritize issues by severity
- [ ] Create GitHub issues for critical bugs

---

## Bug Tracking

### Bug Report Template

Use `/docs/BUG_REPORT_TEMPLATE.md` for detailed bug reports.

**Quick Reference**:

| ID | Severity | Feature | Description | Reproducible? | Browser |
|----|----------|---------|-------------|---------------|---------|
| 001 | Critical | Exercises | Cannot submit answers | Yes | Chrome 120 |
| 002 | High | Annotations | Hover not working on mobile | Yes | iOS Safari |
| 003 | Medium | Species | Images load slowly (>5s) | Sometimes | All |
| 004 | Low | UI | Button padding inconsistent | Yes | All |

### Severity Definitions

**🔴 Critical (P0)**:
- App is unusable or crashes
- Data loss occurs
- Security vulnerability
- Core feature completely broken

**🟠 High (P1)**:
- Major feature impaired
- Workaround exists but difficult
- Affects most users
- Performance severely degraded

**🟡 Medium (P2)**:
- Minor feature issue
- Easy workaround available
- Affects some users
- Cosmetic but noticeable

**🟢 Low (P3)**:
- Cosmetic issue
- Very minor impact
- Affects few users
- Nice-to-have fix

---

## Performance Metrics

### Time-Based Metrics

| Metric | How to Measure | Target | Your Result |
|--------|----------------|--------|-------------|
| **Time to First Paint** | DevTools Performance tab | < 1.5s | ___ |
| **Time to Interactive** | DevTools Performance tab | < 3.5s | ___ |
| **Exercise Load Time** | Stopwatch from click to render | < 2s | ___ |
| **Page Navigation** | Click to new page loaded | < 1s | ___ |
| **Image Load (first)** | First image visible | < 2s | ___ |
| **Image Load (cached)** | Return to same image | < 0.5s | ___ |

### Learning Metrics

| Metric | How to Measure | Target | Your Result |
|--------|----------------|--------|-------------|
| **Terms Learned per Session** | Count Spanish words you remember | 5-10 | ___ |
| **Exercise Completion Rate** | (Completed / Started) × 100% | > 80% | ___ |
| **Correct Answer Rate** | (Correct / Total) × 100% | 60-70% | ___ |
| **Time per Exercise** | Average seconds per question | 30-60s | ___ |

### Quality Metrics

| Metric | How to Measure | Target | Your Result |
|--------|----------------|--------|-------------|
| **Bugs per Hour** | Count of issues encountered | < 5 | ___ |
| **Lighthouse Performance** | Chrome DevTools Lighthouse | > 90 | ___ |
| **Lighthouse Accessibility** | Chrome DevTools Lighthouse | > 90 | ___ |
| **Console Errors** | Browser console error count | 0 | ___ |

### Subjective Metrics (1-10 scale)

| Aspect | Your Rating | Notes |
|--------|-------------|-------|
| **Visual Design** | ___ / 10 | |
| **Ease of Use** | ___ / 10 | |
| **Learning Effectiveness** | ___ / 10 | |
| **Mobile Experience** | ___ / 10 | |
| **Overall Satisfaction** | ___ / 10 | |

---

## UX Feedback Areas

### 1. Visual Design

**What to Evaluate**:
- Color scheme (cohesive? accessible?)
- Typography (readable? hierarchy clear?)
- Spacing (too cramped? too spacious?)
- Icons (intuitive? consistent style?)
- Images (high quality? relevant?)

**Questions**:
- Does the design feel modern and professional?
- Is the color contrast sufficient for readability?
- Do visual elements guide your attention correctly?

---

### 2. Information Architecture

**What to Evaluate**:
- Navigation structure (logical? intuitive?)
- Page hierarchy (clear parent-child relationships?)
- Labels and terminology (clear? jargon-free?)
- Search and filtering (easy to find species?)

**Questions**:
- Can you find features without hunting?
- Is the taxonomy organization helpful or confusing?
- Are menu labels descriptive?

---

### 3. Interaction Design

**What to Evaluate**:
- Button states (hover, active, disabled)
- Form feedback (validation messages)
- Loading indicators (spinners, skeletons)
- Error messages (helpful? actionable?)
- Animations (smooth? distracting?)

**Questions**:
- Do interactions feel responsive?
- Is feedback immediate and clear?
- Are animations purposeful or gratuitous?

---

### 4. Content Quality

**What to Evaluate**:
- Spanish vocabulary (accurate? level-appropriate?)
- Exercise questions (clear? unambiguous?)
- Example sentences (natural? useful?)
- Species information (complete? accurate?)

**Questions**:
- Did you actually learn Spanish words?
- Were any translations confusing?
- Is the content engaging?

---

### 5. Learning Experience

**What to Evaluate**:
- Progression system (motivating? clear?)
- Difficulty curve (too easy? too hard?)
- Feedback quality (helpful? discouraging?)
- Spaced repetition (effective?)

**Questions**:
- Would you come back to use this app again?
- Does the learning feel natural or forced?
- Are you motivated to continue learning?

---

## Post-Testing Review

### Debriefing Questions

1. **What was your first impression?**
   - Positive aspects:
   - Negative aspects:

2. **What surprised you (good or bad)?**
   -

3. **What was the most frustrating moment?**
   -

4. **What was the most delightful moment?**
   -

5. **Did you learn any Spanish vocabulary?** (List them)
   -

6. **Would you recommend this app to a friend learning Spanish?**
   - Yes / No / Maybe
   - Why?

7. **On a scale of 1-10, how likely would you use this app regularly?**
   - ___ / 10
   - Reason:

8. **If you could change ONE thing, what would it be?**
   -

---

### Action Items Template

After completing testing, fill out this prioritization matrix:

| Priority | Issue | Severity | Effort | Impact | Action |
|----------|-------|----------|--------|--------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Effort Scale**: Low (< 1 day), Medium (1-3 days), High (> 3 days)
**Impact Scale**: Low (nice-to-have), Medium (improves UX), High (critical for users)

---

## Testing Tools & Resources

### Browser DevTools
- **Chrome DevTools**: F12 or Cmd+Opt+I
  - Console: Check for errors
  - Network: Monitor API calls
  - Performance: Lighthouse audit
  - Device Mode: Test responsive design (Ctrl+Shift+M)

### Screen Recording (Optional)
- **macOS**: QuickTime (Cmd+Ctrl+N)
- **Windows**: Xbox Game Bar (Win+G)
- **Linux**: SimpleScreenRecorder
- **Cross-platform**: OBS Studio

### Accessibility Testing
- **WAVE**: https://wave.webaim.org/
- **axe DevTools**: Browser extension
- **Keyboard navigation**: Test without mouse

### Performance Testing
- **Lighthouse**: Chrome DevTools > Lighthouse tab
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/

---

## Appendix

### A. Sample Test Session Timeline

**Total Time**: 90 minutes

| Time | Activity |
|------|----------|
| 0:00-0:10 | Setup environment, open bug tracker |
| 0:10-0:20 | Scenario 1: First-time user onboarding |
| 0:20-0:30 | Scenario 2: Species browser navigation |
| 0:30-0:50 | Scenario 3: Interactive annotations |
| 0:50-1:15 | Scenario 4: AI-powered exercises |
| 1:15-1:30 | Scenario 5: Mobile testing |
| 1:30-1:45 | Scenario 6: Error handling |
| 1:45-2:00 | Review notes, fill out feedback form |

---

### B. Test Data Reference

**Species to Test**:
1. Petirrojo (Robin) - Common, many annotations
2. Gorrión (Sparrow) - Urban bird, beginner-friendly
3. Águila (Eagle) - Large bird, advanced vocabulary
4. Colibrí (Hummingbird) - Small, colorful, interesting

**Exercise Topics**:
- Bird anatomy (pico, ala, cola, plumaje)
- Colors (rojo, azul, verde, amarillo)
- Behaviors (volar, cantar, anidar)
- Habitats (bosque, montaña, ciudad)

---

### C. Quick Reference: Common Issues

| Issue | Likely Cause | Quick Check |
|-------|--------------|-------------|
| Annotations not appearing | JavaScript error | Check console |
| Images not loading | CORS / API issue | Check Network tab |
| Exercises slow | Cache not working | Check Application > Cache Storage |
| Mobile layout broken | CSS media queries | Check responsive mode |
| Text too small | rem/em units wrong | Check computed font size |

---

**Next Steps**:
1. Complete this testing guide
2. File bugs using `/docs/BUG_REPORT_TEMPLATE.md`
3. Run test script from `/docs/TESTING_SCRIPT.md`
4. Review setup instructions in `/docs/LOCAL_TESTING_SETUP.md`

---

**Prepared by**: Claude Code
**Last Updated**: October 24, 2025
**Version**: 1.0
