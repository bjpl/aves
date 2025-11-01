# Bug Report Template

Use this template to document bugs found during user testing.

---

## Bug Report #[ID]

### Summary
**One-line description**:

**Severity**: [ ] Critical | [ ] High | [ ] Medium | [ ] Low

**Status**: [ ] New | [ ] Confirmed | [ ] In Progress | [ ] Fixed | [ ] Won't Fix

**Reported by**: [Your name]
**Date**: [YYYY-MM-DD]
**Testing phase**: [e.g., Phase 3 Week 2 Self-Testing]

---

## Environment

**Browser**: [e.g., Chrome 120.0.6099.109]
**OS**: [e.g., macOS 14.1.1, Windows 11, iOS 17.1]
**Device**: [e.g., MacBook Pro M1, iPhone 14, Desktop PC]
**Screen size**: [e.g., 1920x1080, 375x667 mobile]
**Testing mode**: [ ] Local development | [ ] Live deployment (GitHub Pages)

---

## Bug Details

### Description
[Provide a clear, detailed description of the bug]

**Example**:
> When clicking on a bird annotation in the interactive image viewer, the Spanish term should be revealed. However, on mobile devices (iOS Safari), tapping the annotation does nothing. The hover state works on desktop, but touch events don't trigger the disclosure.

---

### Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]
4. [Final step]

**Example**:
1. Open the app on iPhone 14 (iOS 17.1) using Safari
2. Navigate to "Learn" > Select "Petirrojo" (Robin)
3. Tap on the "pico" (beak) annotation on the bird image
4. Observe that nothing happens (no Spanish term revealed)

---

### Expected Behavior
[What should happen?]

**Example**:
> Tapping the annotation should progress through the 5-level disclosure system:
> 1. Tap 1: Spanish term "pico" appears
> 2. Tap 2: English translation "beak" appears
> 3. Tap 3: Etymology shown
> 4. Tap 4: Example sentence displayed

---

### Actual Behavior
[What actually happens?]

**Example**:
> Nothing happens when tapping. The annotation remains in its default state. No errors appear in the console. The hover state works on desktop, suggesting a touch event handling issue.

---

### Visual Evidence

**Screenshots**:
- [ ] Attached (see below)
- [ ] Not applicable

**Screen recording**:
- [ ] Attached (link: _______)
- [ ] Not applicable

**Console errors**:
```
[Paste any console errors here]
```

---

## Impact Analysis

### User Impact
**Who is affected?**
- [ ] All users
- [ ] Mobile users only
- [ ] Desktop users only
- [ ] Specific browsers: _______________
- [ ] Edge case (rare)

**How many users?**
- [ ] All users (100%)
- [ ] Most users (>50%)
- [ ] Some users (10-50%)
- [ ] Few users (<10%)

### Business Impact
**Does this block core functionality?**
- [ ] Yes - app is unusable
- [ ] Partially - major feature broken
- [ ] No - minor issue only

**Does this affect learning experience?**
- [ ] Yes - cannot learn vocabulary
- [ ] Partially - reduced effectiveness
- [ ] No - cosmetic only

---

## Severity Classification

### Critical (P0) ⛔
- [ ] App crashes or is completely unusable
- [ ] Data loss occurs
- [ ] Security vulnerability
- [ ] Core feature (annotations, exercises) completely broken

### High (P1) 🔴
- [ ] Major feature significantly impaired
- [ ] Affects majority of users
- [ ] Workaround is difficult
- [ ] Severe performance degradation (>10s load times)

### Medium (P2) 🟡
- [ ] Minor feature issue
- [ ] Affects some users
- [ ] Easy workaround available
- [ ] Noticeable cosmetic issue

### Low (P3) 🟢
- [ ] Minor cosmetic issue
- [ ] Very minor impact
- [ ] Affects few users
- [ ] Nice-to-have fix

---

## Reproducibility

**How often does this bug occur?**
- [ ] Always (100%)
- [ ] Usually (>75%)
- [ ] Sometimes (25-75%)
- [ ] Rarely (<25%)

**Conditions required**:
- [ ] Specific device type: _______________
- [ ] Specific browser: _______________
- [ ] Specific network condition: _______________
- [ ] Specific user action sequence
- [ ] Other: _______________

---

## Workaround

**Is there a workaround?**
- [ ] Yes (see below)
- [ ] No

**Workaround steps**:
1. [If applicable, describe how users can work around this bug]

**Example**:
> Desktop users are unaffected. Mobile users can rotate to landscape mode and use a stylus for more precise tapping, though this is not ideal.

---

## Technical Details (for developers)

### Suspected Cause
[Your hypothesis about what's causing the bug]

**Example**:
> The annotation component likely uses `onMouseEnter` and `onClick` handlers but doesn't implement touch event handlers (`onTouchStart`, `onTouchEnd`). This is a common React event handling issue on mobile.

### Relevant Code Locations
- **File**: [e.g., `frontend/src/components/annotations/InteractiveAnnotation.tsx`]
- **Line**: [e.g., Line 145-160]
- **Function**: [e.g., `handleAnnotationClick()`]

### Console Output
```javascript
// Paste any relevant console logs, errors, or warnings
```

### Network Activity
- [ ] No network requests made
- [ ] Network request failed (see details below)
- [ ] Network request succeeded but wrong data returned

**Request details**:
```
URL: [e.g., /api/annotations/123]
Method: [GET, POST, etc.]
Status: [e.g., 200, 404, 500]
Response: [Paste relevant response data]
```

---

## Regression Testing

**Was this feature working before?**
- [ ] Yes - this is a regression (worked in version: _____)
- [ ] No - this is a new bug
- [ ] Unknown

**Related bugs**:
- #[Bug ID] - [Brief description]

---

## Suggested Fix (optional)

**Proposed solution**:
[If you have ideas for how to fix this, describe them here]

**Example**:
> Add touch event handlers to the InteractiveAnnotation component:
> - Replace `onMouseEnter` with both `onMouseEnter` and `onTouchStart`
> - Replace `onClick` with both `onClick` and `onTouchEnd`
> - Prevent default touch behavior to avoid double-firing
> - Test on iOS Safari and Android Chrome

**Estimated effort**:
- [ ] Low (< 1 hour)
- [ ] Medium (1-4 hours)
- [ ] High (> 4 hours)

---

## Priority Calculation

**Urgency** (How soon does this need to be fixed?)
- [ ] Immediate (blocks release)
- [ ] High (fix before launch)
- [ ] Medium (fix in next sprint)
- [ ] Low (backlog)

**Effort** (How hard is it to fix?)
- [ ] Low (quick fix)
- [ ] Medium (moderate effort)
- [ ] High (significant work)

**Impact** (How many users affected?)
- [ ] High (all/most users)
- [ ] Medium (some users)
- [ ] Low (few users)

**Overall Priority**: [Calculated from above]
- [ ] P0 (Critical - drop everything)
- [ ] P1 (High - fix ASAP)
- [ ] P2 (Medium - fix soon)
- [ ] P3 (Low - fix when time allows)

---

## Testing Checklist

**Before marking as fixed, verify**:
- [ ] Bug is reproducible on original platform
- [ ] Fix resolves the issue
- [ ] Fix doesn't introduce new bugs (regression testing)
- [ ] Fix is tested on all affected platforms
- [ ] Code is reviewed
- [ ] Tests are added to prevent regression
- [ ] Documentation is updated if needed

---

## Notes

[Any additional context, observations, or discussion]

---

## Example Bug Reports

### Example 1: Critical Bug

**Summary**: Cannot submit exercise answers on mobile

**Severity**: Critical (P0)

**Environment**: iOS 17.1, Safari, iPhone 14

**Steps to Reproduce**:
1. Start an exercise session
2. Answer all 10 questions
3. Tap "Submit Answers" button
4. Observe error message: "Network request failed"

**Expected**: Answers are submitted and score is displayed

**Actual**: Error message appears, no score shown

**Impact**: Mobile users cannot complete exercises (50% of user base)

**Priority**: P0 - Blocks core functionality for mobile users

---

### Example 2: Medium Bug

**Summary**: Species images load slowly on 3G connection

**Severity**: Medium (P2)

**Environment**: All browsers, 3G network

**Steps to Reproduce**:
1. Throttle network to "Slow 3G" in DevTools
2. Navigate to Species Browser
3. Scroll through species list
4. Observe image loading times

**Expected**: Images load within 2-3 seconds

**Actual**: Images take 8-12 seconds to load

**Impact**: Poor user experience on slow connections

**Suggested Fix**: Implement lazy loading, use WebP format, add placeholder images

**Priority**: P2 - Degrades UX but not critical

---

### Example 3: Low Bug

**Summary**: Button padding inconsistent on "Learn More" vs "Get Started"

**Severity**: Low (P3)

**Environment**: All browsers

**Steps to Reproduce**:
1. Open homepage
2. Compare "Learn More" button padding to "Get Started" button
3. Observe inconsistency

**Expected**: Both buttons have same padding (16px vertical, 32px horizontal)

**Actual**: "Learn More" has 12px vertical padding

**Impact**: Minor visual inconsistency

**Priority**: P3 - Cosmetic issue only

---

**Template Version**: 1.0
**Last Updated**: October 24, 2025
