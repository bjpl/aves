# **AVES User Testing \- Round 2 Notes (Organized)**

## **Overview**

This is the second round of testing after implementing changes from Round 1\. Several improvements noted, but new issues discovered and previous issues persist.

---

## **Navigation & Authentication**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Top-right navigation redesign | ✅ Good | Looks clean for admin |
| Login button (when logged out) | ⚠️ Verify | Not visible when logged in—confirm it appears when logged out |
| Logout/Account button | ❌ Missing | Need logout or account management button in navigation |

**Action Items:**

* Verify login button appears when user is logged out  
* Add logout/account button to navigation for authenticated users

---

## **Analytics Dashboard**

### **Annotation Review Section**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Species coverage tooltips | ⚠️ UX change needed | Prefer static description under heading instead of hover tooltips |
| Annotation types tooltip | ❌ Not helpful | Current tooltip doesn't make sense; remove it |

**Recommended changes:**

* **Species Coverage:** Replace hover tooltip with static text underneath: *"Number of annotations for each species across all images"*  
* **Annotation Types:** Remove tooltip; add descriptive subtitle for context

**Action Items:**

* Replace species coverage hover tooltip with static description  
* Remove annotation types tooltip  
* Add descriptive subtitle under "Annotation Types" heading

---

## **Image Management**

### **Gallery Tab**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Updates visible | ✅ Progress | Changes from Round 1 implemented |
| Annotate button | ⚠️ Clarify logic | Appears on birds with 0 annotations—what does it do? |
| View/Trash buttons | ✅ Present | On birds with existing annotations |
| Tooltips | ❌ Broken | Text cut off at card margins (horizontal overflow) |
| Image quality score | ⚠️ Verify | Shows "not generated yet"—confirm this will populate |
| Upload images workflow | ⚠️ Verify | Ensure fully implemented for bulk bird image uploads |

**Questions to resolve:**

1. What exactly does the "Annotate" button do? Is the logic correct?  
2. Why do birds with annotations only show View/Trash but not Annotate?  
3. Will image quality scores eventually generate? What triggers them?

**Action Items:**

* Fix tooltip overflow (prevent horizontal cutoff)  
* Document/clarify Annotate button logic  
* Verify image quality score integration is complete  
* Test and verify upload images workflow end-to-end

---

### **Batch Annotation Tab**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Conceptual confusion | ❌ UX problem | Gallery shows "7 annotations" (suggesting multiple images per species), but batch annotation treats selection as individual images |

**The Problem:**

* Gallery cards show species with annotation counts (e.g., "7 annotations")  
* This implies each card represents a species with multiple images  
* But when selecting cards for batch annotation, system says "2 images selected"  
* Mismatch between what user thinks they're selecting (species) vs. what system processes (images)

**Action Items:**

* Clarify the data model: Are gallery cards species or individual images?  
* Align UI/UX language consistently throughout  
* Make batch annotation flow match user's mental model  
* Add clear labeling to prevent confusion

---

### **Statistics Tab**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Images by Species distribution | ⚠️ Possible duplication | Similar data appears in multiple places—review for consolidation |
| Unsplash API quota | ⚠️ Needs enhancement | Keep this (rate-limited API), but add more context/tracking |
| Anthropic API tokens remaining | ❌ Remove | Not needed for admin; can re-add later for user-facing paid features |

**Action Items:**

* Audit all locations showing "images by species" data; consolidate if duplicated  
* Enhance Unsplash API quota display with better rate limit context/tracking  
* Remove Anthropic API "tokens remaining" metric from admin view

---

## **ML Analytics Dashboard**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Title/subtitle | ❌ Bug | Displaying twice (once at top, once immediately below) |
| Card tooltips | ❌ Broken | Same overflow issue—cut off at card margins |
| Pattern observation counts | ⚠️ Verify accuracy | Shows "45 observations" for Plumas, but that many haven't been annotated |
| Quality trend metric | ⚠️ Verify | Need to confirm calculation is meaningful and intentional |
| Species specific recommendations | ⚠️ Unclear purpose | User doesn't know what to do with this list |

**Data Accuracy Questions:**

1. Where does "45 observations" come from for Plumas? Is it accurate?  
2. What is the quality trend calculation? Is it meaningful?  
3. What action should user take based on "recommended features"?

**Action Items:**

* Fix duplicate title/subtitle display  
* Fix tooltip overflow on all cards  
* Verify and document pattern observation count data source  
* Document quality trend calculation; ensure it's meaningful  
* Either add actionable guidance to species recommendations OR remove the section

---

## **Practice Tab (Main Navigation)**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Page loads | ✅ Pass | Structure present |
| Exercises | ❌ Fail | "Unable to load exercises, no exercises available" |

**Action Items:**

* Debug exercise loading failure  
* Ensure exercises are generated/available from approved annotations

---

## **Learn Tab (Main Navigation)**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Page structure | ✅ Pass | Interactive bird learning section exists |
| Exercise images | ❌ Fail | Not loading (e.g., flamingo) |
| Hotspots | ❌ Fail | Still incorrect/misaligned (same as Round 1\) |
| Integration with annotations | ❌ Not connected | Should feed from approved annotations |

**Critical Issue:** The learn exercises are not integrated with the annotation pipeline. Approved annotations should flow into these exercises.

**Action Items:**

* Review existing docs/architecture for annotation → exercise pipeline  
* Implement/fix integration so approved annotations feed into Learn exercises  
* Fix image loading for all exercises  
* Align hotspots with actual annotation data

---

## **Species Browser (Main Navigation)**

| Item | Status | Notes |
| ----- | ----- | ----- |
| Header text | ⚠️ Hardcoded | "Explore 10 bird species"—should be dynamic |
| Species cards | ❌ Fail | Placeholder images only, no real images |
| Species detail view | ❌ Fail | Clicking card causes error |
| Back navigation | ❌ Broken | Results in 404, then "Species not found" error page |
| State after error | ❌ Broken | Shows "0 species" after returning from error |

**Error Flow:**

1. Click species card → Error  
2. Click back → 404  
3. Redirect to "Species not found" page  
4. Click "Back to species" → Shows 0 species

**Action Items:**

* Make species count dynamic (not hardcoded "10")  
* Connect real species images to cards  
* Fix species detail view loading  
* Fix navigation/routing errors  
* Fix state management (species count shouldn't reset to 0\)

---

## **Summary: Round 2 Priority Action Items**

### **Critical (Core Functionality Broken)**

1. Fix Learn tab: image loading and hotspot alignment with annotation data  
2. Fix Practice tab: exercise loading failure  
3. Fix Species Browser: entire flow is broken (images, details, navigation, state)  
4. Implement annotation → exercise pipeline integration

### **High Priority (Data Integrity & UX)**

5. Fix all tooltip overflow issues (multiple locations)  
6. Fix duplicate title on ML Analytics dashboard  
7. Verify pattern observation counts are accurate  
8. Clarify batch annotation data model (species vs. images confusion)  
9. Add logout/account button to navigation

### **Medium Priority (Polish & Clarity)**

10. Replace hover tooltips with static descriptions (Analytics dashboard)  
11. Remove Anthropic API tokens metric from admin  
12. Enhance Unsplash API quota tracking  
13. Audit and consolidate duplicate "images by species" displays  
14. Make species count dynamic in Species Browser header

### **Needs Investigation**

15. Document/verify image quality score integration  
16. Document quality trend calculation methodology  
17. Determine purpose of species recommendations (keep with guidance, or remove)  
18. Review existing architecture docs for annotation pipeline

