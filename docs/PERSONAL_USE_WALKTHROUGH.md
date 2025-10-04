# AVES Personal Use - Complete Walkthrough

**Goal**: Get AVES working for your personal Spanish bird vocabulary learning
**Timeline**: 2-3 hours for basic use, 10-15 hours for full features
**Generated**: October 3, 2025
**Current Status**: 70% ready - needs build fixes and exercise creation

---

## Table of Contents

1. [Quick Start (2-3 Hours)](#quick-start-2-3-hours)
2. [Full Features (10-15 Hours)](#full-features-10-15-hours)
3. [Path to Free/Paid App](#path-to-freepaid-app)
4. [What You Do vs What Claude Does](#what-you-do-vs-what-claude-does)
5. [Decision Points](#decision-points)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (2-3 Hours)

**Objective**: Get a working vocabulary learning app you can use TODAY

### Phase 1: Fix TypeScript Build (30 minutes)

#### Your Manual Tasks (5 minutes)

**Decision**: Choose build fix strategy

**Option A - Quick Fix (Recommended)**:
Exclude test files from production build

**Option B - Fix All Tests**:
Fix the 73 failing tests (takes 3-4 hours)

**What to tell Claude**:
```
"Claude, exclude all test files from the production build.
Update tsconfig.json to ignore __tests__ directories.
Strategy: Quick fix - tests not needed for deployment."
```

#### Claude's Automated Work (15 minutes)

Claude will:
1. ✅ Update `frontend/tsconfig.json`
2. ✅ Add exclude patterns for test files
3. ✅ Verify build configuration
4. ✅ Run test build
5. ✅ Report success

**Expected Output**:
```json
// frontend/tsconfig.json changes
{
  "exclude": [
    "node_modules",
    "dist",
    "**/__tests__",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/__mocks__"
  ]
}
```

#### Your Verification (10 minutes)

```bash
# Test the build
cd frontend
npm run build

# Should complete without errors
# Output: dist/ folder created with compiled app
```

**Success Criteria**: Build completes with no TypeScript errors

---

### Phase 2: Create Static Exercise Data (1.5 hours)

#### Your Manual Tasks (30 minutes)

**Decision 1**: How many exercises do you want initially?
- **Option A**: 20 exercises (minimum viable, 30 min)
- **Option B**: 50 exercises (good coverage, 1.5 hours)
- **Option C**: 100 exercises (comprehensive, 3 hours)

**Decision 2**: Which exercise types?
- ✅ Visual Discrimination (identify bird by image)
- ✅ Contextual Fill (complete Spanish sentences)
- ⚠️ Audio Recognition (requires audio files - skip for now)
- ✅ Translation Practice (Spanish ↔ English)
- ✅ Vocabulary Matching (match terms to definitions)

**What to tell Claude**:
```
"Claude, create 50 static exercises in data/exercises.json using the 10 existing species and 10 annotations.

Exercise types:
- 15 Visual Discrimination (identify bird by Spanish name)
- 15 Contextual Fill (complete sentences with vocabulary)
- 10 Translation Practice (bird names Spanish ↔ English)
- 10 Vocabulary Matching (anatomical terms)

Use the data from:
- data/species.json (10 birds)
- data/annotations.json (10 vocabulary terms)

Make them progressively harder:
- Level 1 (Easy): 20 exercises - common birds, basic terms
- Level 2 (Medium): 20 exercises - mixed difficulty
- Level 3 (Hard): 10 exercises - full sentences, etymology

Format each exercise as:
{
  'id': 'ex-001',
  'type': 'visual-discrimination',
  'question': 'Spanish question text',
  'correctAnswer': 'answer',
  'options': ['answer', 'distractor1', 'distractor2', 'distractor3'],
  'difficulty': 1-3,
  'hints': ['helpful hint if needed']
}
"
```

#### Claude's Automated Work (45 minutes)

Claude will:
1. ✅ Read `data/species.json` (10 birds)
2. ✅ Read `data/annotations.json` (10 vocabulary terms)
3. ✅ Generate 50 exercises across 4 types
4. ✅ Create realistic distractors (wrong answers that are plausible)
5. ✅ Add difficulty progression
6. ✅ Write to `data/exercises.json`
7. ✅ Validate JSON format
8. ✅ Report exercise breakdown

**Expected Output**:
```json
// data/exercises.json (sample)
[
  {
    "id": "ex-001",
    "type": "visual-discrimination",
    "question": "¿Qué pájaro tiene plumas rojas?",
    "correctAnswer": "sp-001",
    "options": ["sp-001", "sp-002", "sp-003", "sp-004"],
    "difficulty": 1,
    "explanation": "El cardenal rojo tiene plumas rojas brillantes.",
    "relatedVocabulary": ["plumas rojas", "cardenal"]
  },
  {
    "id": "ex-002",
    "type": "contextual-fill",
    "question": "El cardenal usa su ____ fuerte para romper semillas.",
    "correctAnswer": "pico",
    "options": ["pico", "alas", "cola", "patas"],
    "difficulty": 1,
    "explanation": "'Pico' significa beak en inglés.",
    "relatedVocabulary": ["pico"]
  }
  // ... 48 more exercises
]
```

#### Your Verification (15 minutes)

1. **Review Sample Exercises**:
```bash
# Open and review
cat data/exercises.json | head -50
```

2. **Check Quality**:
   - [ ] Questions make grammatical sense in Spanish
   - [ ] Correct answers are actually correct
   - [ ] Distractors are plausible but wrong
   - [ ] Difficulty progression feels right

3. **Test Data Loading**:
```bash
# Start dev server
npm run dev

# Open browser to localhost
# Navigate to Practice page
# Verify exercises load and work
```

**Success Criteria**:
- 50 exercises created
- At least 2 types working
- You can complete an exercise and see feedback

---

### Phase 3: Test on GitHub Pages (30 minutes)

#### Your Manual Tasks (25 minutes)

1. **Build Production Version**:
```bash
# From project root
cd frontend
npm run build

# Verify dist/ folder created
ls -la dist/
```

2. **Deploy to GitHub Pages**:
```bash
# Option A: Using GitHub Pages deploy script
npm run deploy

# Option B: Manual deployment
cd ..
git add .
git commit -m "Add static exercises for personal use

- Exclude test files from production build
- Add 50 static exercises (4 types)
- Exercise types: visual discrimination, contextual fill, translation, matching
- Progressive difficulty: 20 easy, 20 medium, 10 hard

Ready for personal daily use.

🤖 Built with Claude Code"

git push origin main
```

3. **Wait for GitHub Pages Deployment** (2-5 minutes):
   - Go to GitHub repo → Settings → Pages
   - Check deployment status
   - Note your URL: `https://[username].github.io/aves/`

4. **Test Live Site** (10 minutes):

**Testing Checklist**:
```
Visit: https://[username].github.io/aves/

Test Flow:
- [ ] Home page loads
- [ ] Species browser shows 10 birds
- [ ] Click on a bird → species detail page loads
- [ ] Navigate to Practice/Exercises page
- [ ] Exercise loads with question and options
- [ ] Select an answer → feedback appears (correct/incorrect)
- [ ] Progress to next exercise
- [ ] Complete 5 exercises
- [ ] Check progress is saved (refresh page, progress persists)
- [ ] Test on mobile (if you plan to use on phone)
```

#### Claude's Automated Work (5 minutes)

If deployment fails:

**What to tell Claude**:
```
"Claude, the GitHub Pages deployment failed with this error:
[paste error from GitHub Actions or console]

Please fix the deployment configuration."
```

Claude will:
1. ✅ Check `.github/workflows/` files
2. ✅ Verify `vite.config.ts` has correct `base: '/aves/'`
3. ✅ Check `package.json` deploy script
4. ✅ Fix any path issues
5. ✅ Provide corrected commands

#### Your Verification (5 minutes)

**Success Criteria**:
- ✅ Live site loads at your GitHub Pages URL
- ✅ Can browse species
- ✅ Can complete exercises
- ✅ Progress saves between sessions
- ✅ Works on both desktop and mobile

**If successful**: You now have a working app for personal use! 🎉

---

### Phase 4: Use It For 1 Week (Daily 15-30 minutes)

#### Your Manual Tasks (Daily)

**Day 1-7 Routine**:

1. **Morning Session** (15 min):
   - Visit your GitHub Pages URL
   - Complete 10 exercises
   - Review any you got wrong
   - Note which birds you're learning

2. **Track Your Experience** (5 min):

Create a simple log:
```markdown
# My AVES Learning Log

## Day 1 (Oct 3)
- Completed: 10 exercises
- Got right: 7/10 (70%)
- Struggled with: "plumas azules" vs "plumas rojas"
- Learned: 3 new bird names
- UX issues: None
- Feature requests: Would like audio pronunciation

## Day 2 (Oct 4)
...
```

3. **Weekly Assessment** (Day 7):

Answer these questions:
```
1. Did I use it every day? YES / NO
   - If NO, why not? _______________

2. What worked well?
   - _______________

3. What was frustrating?
   - _______________

4. Would I pay $5/month for premium features?
   - YES / NO / MAYBE
   - What features would make it worth it?
     _______________

5. Would I recommend this to a friend learning Spanish?
   - YES / NO
   - Why or why not? _______________
```

**Decision Point**:
- **If you used it 5+ days** → Proceed to Full Features
- **If you used it <3 days** → Identify blockers first

---

## Full Features (10-15 Hours)

**Prerequisites**:
- ✅ Completed Quick Start
- ✅ Used app for 1 week
- ✅ Identified what features you actually want

### Phase 5: Expand Content (4-6 hours)

#### Your Manual Tasks (1 hour)

**Decision 1**: How many total species?
- **Option A**: 30 species (manageable, 2 hours)
- **Option B**: 50 species (good coverage, 4 hours)
- **Option C**: 100+ species (comprehensive, 6+ hours)

**Decision 2**: Which species to add?

**Recommended Approach**:
```
"Claude, analyze the 10 existing species and suggest 40 more that:
1. Cover diverse habitats (forest, wetland, coastal, urban)
2. Represent different sizes (tiny to very large)
3. Include both common and interesting species
4. Span North/Central/South America
5. Have distinctive Spanish names

Create a prioritized list with rationale."
```

**Decision 3**: Data sources
- ✅ Use existing data structure
- ✅ Source images from Unsplash (free tier: 50 requests/hour)
- ⚠️ Audio: Skip for now OR use Google TTS

**What to tell Claude**:
```
"Claude, expand the species database to 50 birds total (40 new + 10 existing).

For each new species, create entries in:
1. data/species.json - full taxonomy and metadata
2. data/annotations.json - 2-3 vocabulary terms per bird
3. data/exercises.json - 5 exercises per bird

Use this process:
1. Research 40 bird species with distinctive Spanish names
2. Find Unsplash images for each (search: '[bird name] bird')
3. Create 2-3 anatomical/color vocabulary annotations per bird
4. Generate 5 exercises per bird (mix of types)

Total output:
- 50 species in species.json
- 120 annotations (40 birds × 3 terms average)
- 250 exercises (50 birds × 5 exercises)

Maintain consistent quality and difficulty progression."
```

#### Claude's Automated Work (3-5 hours)

Claude will work in batches:

**Batch 1: Research & Curate** (30 min)
1. ✅ Analyze existing 10 species
2. ✅ Research 40 complementary species
3. ✅ Create prioritized list with rationale
4. ✅ Present list for your approval

**Batch 2: Species Data** (1 hour)
5. ✅ Search Unsplash for images
6. ✅ Create species.json entries (40 birds)
7. ✅ Validate data structure
8. ✅ Report any missing images

**Batch 3: Vocabulary Annotations** (1.5 hours)
9. ✅ Create anatomical terms (wings, beak, tail, etc.)
10. ✅ Create color terms (plumas rojas, pecho amarillo, etc.)
11. ✅ Create behavioral terms (where appropriate)
12. ✅ Add etymology and example sentences
13. ✅ Write to annotations.json

**Batch 4: Exercise Generation** (2 hours)
14. ✅ Generate 250 exercises (50 birds × 5 each)
15. ✅ Mix exercise types evenly
16. ✅ Create difficulty progression
17. ✅ Ensure realistic distractors
18. ✅ Write to exercises.json
19. ✅ Validate all JSON

#### Your Review & Approval (1 hour)

After each batch, review:

**Batch 1 Review** (15 min):
```
Claude will present something like:

"I've researched 40 species. Here are the top candidates:

Priority 1 (Common + Distinctive) - 15 species:
1. Colibrí Ermitaño (Hermit Hummingbird) - tiny, forest, iridescent
2. Tucán Pico Iris (Keel-billed Toucan) - large, colorful beak
3. Quetzal (Resplendent Quetzal) - culturally significant
...

Priority 2 (Educational Value) - 15 species:
...

Priority 3 (Interesting) - 10 species:
...

Approve all 40? Or would you like to substitute any?"
```

You respond:
```
"Approved. Proceed with all 40."
OR
"Replace #7 and #15 with [alternatives]. Then proceed."
```

**Batch 2-4 Reviews** (15 min each):
- Spot-check 5-10 entries for quality
- Verify Spanish is correct
- Approve to continue

#### Your Verification (30 minutes)

1. **Data Validation**:
```bash
# Check file sizes grew
ls -lh data/
# species.json should be ~40KB (was ~8KB)
# annotations.json should be ~60KB (was ~5KB)
# exercises.json should be ~120KB (new)

# Validate JSON
cat data/species.json | jq length
# Should output: 50

cat data/annotations.json | jq length
# Should output: ~120

cat data/exercises.json | jq length
# Should output: 250
```

2. **Quality Spot Check**:
```bash
# Check a random species
cat data/species.json | jq '.[25]'

# Check a random exercise
cat data/exercises.json | jq '.[100]'
```

3. **Test In App**:
```bash
npm run dev
# Browse to species page
# Should see 50 birds
# Filter by habitat → should work
# Try 10 exercises → should have variety
```

**Success Criteria**:
- 50 species with images
- 120+ vocabulary terms
- 250 exercises
- All data validates
- App works with new data

---

### Phase 6: Audio Pronunciation (2-3 hours)

**Note**: This is optional but highly valuable for language learning.

#### Your Manual Tasks (30 minutes)

**Decision 1**: Audio source strategy

**Option A - Google Text-to-Speech** (Recommended):
- Free for low usage
- Good Spanish pronunciation
- Easy to automate
- Claude can generate audio files

**Option B - Manual Recording**:
- Your own voice (most authentic)
- Record 120 terms × 2-3 seconds each = ~6 minutes of audio
- Time-consuming but personal

**Option C - Skip Audio**:
- Defer to later
- Focus on text-based learning first

**What to tell Claude** (if choosing Option A):
```
"Claude, generate audio pronunciation files for all 120 vocabulary terms using Google TTS.

Requirements:
1. Use Spanish (es-ES or es-MX) voice
2. Generate MP3 files
3. File naming: audio/[spanishTerm]-pronunciation.mp3
4. Save metadata in audio/manifest.json
5. Update annotations.json with audioUrl field

Process:
1. Extract all unique spanishTerm values from annotations.json
2. Use Google Cloud TTS API to generate audio
3. Save to public/audio/ directory (for GitHub Pages)
4. Update data references

Note: I'll provide Google Cloud credentials separately."
```

#### Claude's Automated Work (1.5 hours)

**Prerequisites**: You need Google Cloud account with TTS API enabled

Claude will:
1. ✅ Extract 120 unique vocabulary terms
2. ✅ Generate TTS script
3. ✅ Call Google Cloud TTS API (you run the script)
4. ✅ Save MP3 files to `public/audio/`
5. ✅ Create `audio/manifest.json`
6. ✅ Update `annotations.json` with audio paths
7. ✅ Update UI components to play audio

**Alternative (No API)**:
If you don't want to use APIs, Claude can:
- Create a script you run locally with `say` command (macOS)
- Or provide a list for you to record yourself

#### Your Execution (1 hour)

1. **Setup Google Cloud TTS** (20 min):
```bash
# Install Google Cloud SDK
# Enable Text-to-Speech API
# Create service account
# Download credentials.json
```

2. **Run Claude's Generated Script** (30 min):
```bash
# Claude will create something like:
node scripts/generate-audio.js

# This will:
# - Read annotations.json
# - Call Google TTS for each term
# - Save MP3s to public/audio/
# - Take ~30 min for 120 terms (rate limiting)
```

3. **Verify Audio Files** (10 min):
```bash
# Check files created
ls public/audio/*.mp3 | wc -l
# Should show: 120

# Test a sample
open public/audio/pico-pronunciation.mp3
# Should hear: "PEE-koh"
```

#### Your Verification (10 minutes)

1. **Test in App**:
```bash
npm run dev
# Navigate to annotation
# Click speaker icon
# Audio should play
```

2. **Test on GitHub Pages**:
```bash
# Deploy
npm run build && npm run deploy
# Wait for deployment
# Test audio on live site
```

**Success Criteria**:
- 120 audio files generated
- Audio plays in browser
- Works on both desktop and mobile
- No console errors

---

### Phase 7: Enhanced UI/UX (2-3 hours)

#### Your Manual Tasks (30 minutes)

**Decision**: Which UX improvements matter most to YOU?

Review your 1-week usage log. What was frustrating?

**Common Improvements**:
- ✅ Progress dashboard (see stats, streak, mastered terms)
- ✅ Dark mode (if you study at night)
- ✅ Keyboard shortcuts (faster navigation)
- ✅ Spaced repetition (review terms at optimal intervals)
- ✅ Export progress (backup your learning data)
- ⚠️ Offline mode (service worker for offline use)

**What to tell Claude**:
```
"Claude, implement these UX improvements based on my usage:

Priority 1 (Must Have):
1. Progress Dashboard
   - Total exercises completed
   - Accuracy percentage
   - Streak counter (days used)
   - Mastered vocabulary count
   - Weak areas (lowest accuracy terms)

2. Spaced Repetition
   - Track when each term was last reviewed
   - Present terms I got wrong more frequently
   - Show 'due for review' count

3. Export/Import Progress
   - Download my progress as JSON
   - Import on different device
   - Backup before data loss

Priority 2 (Nice to Have):
4. Dark mode toggle
5. Keyboard shortcuts (n=next, space=reveal answer, 1-4=select option)

Create these features following the existing component patterns."
```

#### Claude's Automated Work (2 hours)

**Feature 1: Progress Dashboard** (45 min)
Claude will:
1. ✅ Create `ProgressDashboard.tsx` component
2. ✅ Add stats calculation in `clientDataService.ts`
3. ✅ Create progress types in `types/progress.types.ts`
4. ✅ Add route to App.tsx
5. ✅ Create visualizations (charts using existing UI components)
6. ✅ Add link in navigation

**Feature 2: Spaced Repetition** (45 min)
7. ✅ Implement SM-2 algorithm (basic spaced repetition)
8. ✅ Update `exerciseCache.ts` with review scheduling
9. ✅ Add review due dates to IndexedDB schema
10. ✅ Update exercise selection to prioritize due reviews
11. ✅ Add "Review" vs "New" exercise mode

**Feature 3: Export/Import** (15 min)
12. ✅ Add export button to dashboard
13. ✅ Generate JSON download
14. ✅ Add import button with file picker
15. ✅ Validate imported data
16. ✅ Merge with existing progress

**Feature 4: Dark Mode** (10 min)
17. ✅ Add theme context
18. ✅ Add toggle button
19. ✅ Update Tailwind config for dark mode
20. ✅ Persist preference to localStorage

**Feature 5: Keyboard Shortcuts** (5 min)
21. ✅ Add keyboard event listeners
22. ✅ Show keyboard hints on exercises
23. ✅ Add help modal with shortcuts list

#### Your Verification (30 minutes)

**Test Each Feature**:

1. **Progress Dashboard**:
```
- Navigate to /dashboard
- Verify stats are accurate
- Complete 5 exercises
- Return to dashboard
- Stats should update
```

2. **Spaced Repetition**:
```
- Get an exercise wrong intentionally
- Note the vocabulary term
- Complete 10 more exercises
- That wrong term should appear again sooner
```

3. **Export/Import**:
```
- Export progress → downloads JSON file
- Open in new incognito window
- Import progress → should restore state
```

4. **Dark Mode**:
```
- Toggle dark mode
- All pages should respect theme
- Refresh → theme persists
```

5. **Keyboard Shortcuts**:
```
- On exercise page: Press 1-4 → selects option
- Press Space → reveals answer
- Press N → next exercise
```

**Success Criteria**: All 5 features work smoothly

---

### Phase 8: Polish & Deploy (1 hour)

#### Your Manual Tasks (40 minutes)

1. **Final Quality Check** (20 min):

```bash
# Run all quality checks
npm run lint
npm run typecheck
npm run build

# All should pass with no errors
```

2. **Create Release Notes** (10 min):

```markdown
# AVES v1.0.0 - Personal Use Release

## Features
- 50 bird species with Spanish names and taxonomy
- 120 vocabulary terms (anatomical, color, behavioral)
- 250 exercises across 4 types
- Audio pronunciation (120 terms)
- Progress dashboard with stats
- Spaced repetition algorithm
- Export/import progress
- Dark mode
- Keyboard shortcuts

## Content
- Visual Discrimination: 75 exercises
- Contextual Fill: 75 exercises
- Translation Practice: 50 exercises
- Vocabulary Matching: 50 exercises

## Learning Features
- Progressive difficulty (easy → medium → hard)
- Real-time feedback
- Streak tracking
- Weak area identification
- Review scheduling

## Technical
- Runs entirely in browser (no backend required)
- Data persists via IndexedDB
- Works offline (after first load)
- Mobile responsive
- Deployed on GitHub Pages

Built with Claude Code in 2 weeks.
```

3. **Deploy Final Version** (10 min):

```bash
# Commit everything
git add .
git commit -m "Release v1.0.0 - Personal Use Ready

Features:
- 50 species, 120 vocabulary terms, 250 exercises
- Audio pronunciation for all terms
- Progress dashboard with stats and streaks
- Spaced repetition algorithm
- Export/import progress
- Dark mode and keyboard shortcuts

Ready for daily personal use and user testing.

🤖 Built with Claude Code"

# Tag release
git tag -a v1.0.0 -m "Personal use release - 50 birds, 250 exercises, full features"

# Push
git push origin main --tags

# Deploy to GitHub Pages
npm run deploy
```

#### Claude's Automated Work (15 minutes)

**What to tell Claude**:
```
"Claude, perform final pre-release checks:

1. Validate all data files (JSON syntax, required fields)
2. Check for broken links/images
3. Verify all exercises have correct answers
4. Test build output
5. Generate usage statistics report
6. Create README badges for version and status

Report any issues found."
```

Claude will:
1. ✅ Run validation scripts
2. ✅ Check data integrity
3. ✅ Test image URLs (verify Unsplash links work)
4. ✅ Analyze exercises (find any without correct answers)
5. ✅ Generate stats report
6. ✅ Update README with badges
7. ✅ Report any issues

#### Your Verification (5 minutes)

**Final Deployment Test**:

```
Visit: https://[username].github.io/aves/

Complete End-to-End Test:
1. [ ] Home page loads
2. [ ] Browse 50 species
3. [ ] View species details with images
4. [ ] Start exercise session
5. [ ] Complete 10 exercises (mix of types)
6. [ ] Hear audio pronunciation
7. [ ] Check progress dashboard
8. [ ] Toggle dark mode
9. [ ] Use keyboard shortcuts
10. [ ] Export progress
11. [ ] Open in new incognito window
12. [ ] Import progress
13. [ ] Verify data restored
14. [ ] Test on mobile device
```

**Success Criteria**: All 14 tests pass

---

## Path to Free/Paid App

**Prerequisites**:
- ✅ Completed Full Features build
- ✅ Used app personally for 2+ weeks
- ✅ Validated you find it valuable

### Phase 9: User Validation (2 weeks)

#### Your Manual Tasks (3-5 hours)

**Week 1: Get 10 Beta Testers**

1. **Recruit Testers** (2 hours):

Target audiences:
- Friends learning Spanish
- Spanish teachers you know
- Birdwatchers (Meetup groups, birding forums)
- Language learning communities

**Outreach Message**:
```
Subject: Beta test my Spanish bird vocabulary learning app?

Hi [Name],

I built a web app to learn Spanish bird vocabulary through interactive
exercises and visual identification.

It's like Duolingo meets bird watching, with 50 species and 250 exercises.

Would you try it for 1 week and give me honest feedback?
- Takes 15 min/day
- Completely free
- Works on phone and desktop
- No signup required

Link: https://[username].github.io/aves/

Let me know what you think!

Thanks,
[Your name]
```

Send to:
- [ ] 5 Spanish learners
- [ ] 3 birdwatchers
- [ ] 2 language teachers

2. **Create Feedback Form** (30 min):

Use Google Forms or Typeform:

```
AVES Beta Feedback Form

1. How many days did you use the app? (1-7)

2. What worked well? (open text)

3. What was frustrating? (open text)

4. Rate the learning experience (1-5 stars):
   - Visual design
   - Exercise variety
   - Difficulty progression
   - Audio quality
   - Overall experience

5. Would you recommend this to a friend learning Spanish?
   - Yes / No / Maybe

6. Would you pay for a premium version?
   - Yes / No / Maybe

7. If yes, what features would justify paying?
   (select all that apply)
   - More species (200+)
   - AI-generated personalized exercises
   - Conversation practice
   - Offline mobile app
   - Progress syncing across devices
   - Achievement badges and gamification
   - Community leaderboard

8. What price seems fair for premium?
   - $2.99/month
   - $4.99/month
   - $9.99/month
   - $19.99/year
   - $29.99/year
   - One-time purchase ($9.99)
   - I wouldn't pay

9. Additional comments or feature requests:
   (open text)
```

3. **Track Beta Usage** (automated):

**What to tell Claude**:
```
"Claude, add simple analytics to track beta usage:

Events to track (no personal data):
- Session started
- Exercise completed
- Exercise type used
- Accuracy rate
- Features used (audio, dark mode, export, etc.)

Use localStorage to aggregate data.
Add a /stats page (hidden, only you can access) to view anonymized metrics.

No external services, no cookies, privacy-first."
```

#### Claude's Automated Work (1 hour)

Claude will:
1. ✅ Add analytics events to components
2. ✅ Create local aggregation system
3. ✅ Build stats visualization page
4. ✅ Add export stats button (for your review)
5. ✅ Ensure no PII collected

#### Your Analysis (Week 2 - 2 hours)

**Collect Feedback**:
- Send reminder mid-week
- Collect responses end of week
- Review form responses
- Check analytics stats

**Decision Matrix**:

| Metric | Result | Action |
|--------|--------|--------|
| **Usage** (avg days used) | ≥5 days | ✅ Proceed to monetization |
| | 3-4 days | ⚠️ Improve engagement first |
| | ≤2 days | ❌ Major pivot needed |
| **Recommendation** | ≥70% Yes | ✅ Proceed to monetization |
| | 40-69% Yes | ⚠️ Improve core experience |
| | <40% Yes | ❌ Reconsider product |
| **Willingness to Pay** | ≥50% Yes/Maybe | ✅ Build premium |
| | 30-49% Yes/Maybe | ⚠️ Validate pricing |
| | <30% Yes/Maybe | ❌ Stay free, explore other monetization |

**Example Analysis**:
```
Beta Results (10 testers):

Usage:
- Avg days used: 5.2/7 ✅
- Total exercises completed: 487
- Completion rate: 68% finished sessions

Satisfaction:
- Overall rating: 4.1/5 ⭐
- Would recommend: 8/10 (80%) ✅

Monetization:
- Would pay: 6/10 (60%) ✅
- Preferred pricing: $4.99/mo (5 votes), $29/year (4 votes)

Top feature requests:
1. More bird species (9 requests)
2. Mobile app (7 requests)
3. Audio for sentences (6 requests)
4. Conversation practice (5 requests)

Decision: PROCEED to monetization with freemium model
```

---

### Phase 10: Freemium Launch (1-2 weeks)

#### Your Manual Tasks (4-6 hours)

**Decision**: Freemium tier structure

**Recommended Structure**:

| Feature | Free | Premium ($4.99/mo) |
|---------|------|-------------------|
| Bird species | 10 | 200+ |
| Exercises | 50 | 1000+ |
| Audio pronunciation | Basic (words only) | Full (sentences too) |
| Progress tracking | ✅ | ✅ |
| Spaced repetition | ✅ | ✅ + personalized |
| Export progress | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| AI-generated exercises | ❌ | ✅ |
| Conversation practice | ❌ | ✅ |
| Mobile app | ❌ | ✅ iOS/Android |
| Priority support | ❌ | ✅ |

**What to tell Claude**:
```
"Claude, implement freemium tier system:

FREE TIER:
- 10 bird species (existing)
- 50 exercises (existing)
- Basic features (existing)

PREMIUM TIER ($4.99/mo):
- Expand species to 200 birds
- Generate 1000+ exercises
- Add AI exercise generation (use existing backend code)
- Add conversation practice feature
- Add premium badge/UI

Implementation:
1. Create paywall component (shows on species 11+, exercise 51+)
2. Add 'Upgrade to Premium' CTA
3. Create pricing page
4. Add Stripe payment integration (I'll provide API keys)
5. Create user account system (email + password)
6. Add subscription management page
7. Update data loading to respect tier

Focus on premium content expansion first, payment later."
```

#### Claude's Automated Work (Phase 10A: Content - 6 hours)

**Step 1: Expand to 200 Species** (3 hours)

Claude will:
1. ✅ Research 190 additional bird species
2. ✅ Prioritize by:
   - Geographic diversity (all Americas)
   - Habitat diversity (forest, wetland, desert, urban, coastal)
   - Size range (tiny hummingbirds to large eagles)
   - Spanish name interest (culturally significant, beautiful names)
3. ✅ Present prioritized list for approval
4. ✅ Find Unsplash images for each
5. ✅ Create species.json entries
6. ✅ Generate 600+ vocabulary annotations (200 birds × 3 avg)
7. ✅ Update data files

**Step 2: Generate 1000+ Exercises** (3 hours)

8. ✅ Generate exercises for 200 species
9. ✅ Mix across 5 exercise types:
   - Visual Discrimination (300)
   - Contextual Fill (300)
   - Translation (200)
   - Vocabulary Matching (150)
   - Sentence Construction (50 - NEW TYPE)
10. ✅ Progressive difficulty across 5 levels
11. ✅ Quality validation
12. ✅ Write to exercises.json

#### Claude's Automated Work (Phase 10B: Premium Features - 4 hours)

**Step 3: AI Exercise Generation** (2 hours)

Claude will:
1. ✅ Integrate existing `aiExerciseGenerator.ts`
2. ✅ Create premium API endpoint
3. ✅ Add "Generate New Exercise" button (premium only)
4. ✅ Show AI-generated badge on exercises
5. ✅ Cache generated exercises

**Step 4: Conversation Practice** (2 hours)

6. ✅ Create conversation module
7. ✅ Generate bird-watching conversation scenarios:
   - "At a bird sanctuary"
   - "Talking to a guide"
   - "Describing what you see"
8. ✅ Fill-in-the-blank conversation exercises
9. ✅ Progressive conversation difficulty
10. ✅ Add to premium features

#### Claude's Automated Work (Phase 10C: Paywall - 2 hours)

**Step 5: Payment Integration** (2 hours)

Claude will create:
1. ✅ Paywall component
2. ✅ Pricing page
3. ✅ Stripe checkout integration (you provide keys)
4. ✅ User authentication (email/password)
5. ✅ Subscription status tracking
6. ✅ Account management page

**What Claude CAN'T do** (you'll need to handle):
- ❌ Create Stripe account
- ❌ Get API keys
- ❌ Handle payment compliance
- ❌ Customer support

#### Your Manual Implementation (4 hours)

**Stripe Setup** (1 hour):
1. Create Stripe account
2. Set up products:
   - Premium Monthly: $4.99/month
   - Premium Yearly: $29/year (save 50%)
3. Get API keys (test + production)
4. Configure webhooks

**Deploy Payment System** (1 hour):
```bash
# Add Stripe keys to environment
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_..." >> frontend/.env
echo "STRIPE_SECRET_KEY=sk_test_..." >> backend/.env

# Deploy backend (if needed)
# Deploy frontend
npm run build
npm run deploy
```

**Test Payment Flow** (1 hour):
```
End-to-End Payment Test:
1. [ ] Visit app as free user
2. [ ] Browse to species #11 → paywall appears
3. [ ] Click "Upgrade to Premium"
4. [ ] Pricing page loads
5. [ ] Click "Subscribe Monthly"
6. [ ] Stripe checkout opens
7. [ ] Enter test card: 4242 4242 4242 4242
8. [ ] Complete payment
9. [ ] Redirected to app
10. [ ] All 200 species now accessible
11. [ ] All 1000 exercises available
12. [ ] AI generation button appears
13. [ ] Account page shows subscription status
14. [ ] Test cancellation flow
```

**Create Marketing Page** (1 hour):

Update home page with:
- Hero section with value proposition
- Feature comparison (free vs premium)
- Testimonials (from beta testers)
- Pricing CTA
- FAQ section

---

### Phase 11: Public Launch (1 week)

#### Your Manual Tasks (8-10 hours)

**Prep Week**:

**Day 1-2: Create Marketing Assets** (4 hours)

1. **Demo Video** (2 hours):
   - Screen recording (2 minutes)
   - Show: browsing, exercise, audio, progress dashboard
   - Add text overlays explaining features
   - Upload to YouTube
   - Embed on landing page

2. **Screenshots** (30 min):
   - Home page
   - Species browser
   - Exercise in action
   - Progress dashboard
   - Dark mode
   - Save for social media posts

3. **Social Media Posts** (1 hour):

```
Twitter/X:
"I built a Spanish learning app for birdwatchers 🦅

50 species, 250 exercises, audio pronunciation.
Learn ornithology vocab through visual identification.

Like Duolingo meets Audubon. 100% free.

Try it: [link]

Built with Claude Code in 2 weeks. #buildinpublic"

Reddit (r/Spanish):
Title: "I built a free app to learn Spanish bird vocabulary - 50 species, 250 exercises"
Body: [share demo video, explain concept, ask for feedback]

Reddit (r/birdwatching):
Title: "Learn bird names in Spanish - interactive learning app"
Body: [emphasize birdwatching angle]

LinkedIn:
"After 2 weeks with Claude Code, I launched AVES - a visual Spanish learning
platform for bird enthusiasts. [link to demo]

Key learning: AI-assisted development is real. What took me 2 weeks would
have taken 2 months without Claude Code."
```

4. **Press Outreach** (30 min):

Email to:
- [ ] Spanish learning blogs/newsletters
- [ ] Birdwatching publications
- [ ] Ed-tech newsletters
- [ ] Product Hunt (schedule launch)

**Day 3-7: Launch** (4-6 hours)

**Launch Checklist**:

Day 3 (Soft Launch):
- [ ] Post to Twitter with demo video
- [ ] Post to r/Spanish
- [ ] Share in 3 Spanish learning Discord servers
- [ ] Email beta testers asking for reviews/shares

Day 4:
- [ ] Post to r/birdwatching
- [ ] Post to r/languagelearning
- [ ] LinkedIn post
- [ ] Share in birding Facebook groups

Day 5 (Product Hunt):
- [ ] Launch on Product Hunt (early morning)
- [ ] Respond to all comments
- [ ] Thank upvoters
- [ ] Drive traffic from other channels

Day 6-7:
- [ ] Monitor analytics
- [ ] Respond to user feedback
- [ ] Fix critical bugs
- [ ] Collect testimonials

**Support Setup** (2 hours):
- Create simple contact form or use support email
- Set up automated email responses
- Create FAQ page (common questions)
- Monitor daily for first week

#### Your Metrics Tracking (ongoing)

**Week 1 Goals**:
- 1000 unique visitors
- 100 users complete 5+ exercises
- 10 premium signups

**Track**:
```
Daily Log:

Day 1:
- Visitors: ___
- Signups: ___
- Premium conversions: ___
- Comments/feedback: ___
- Issues found: ___

Day 2:
...
```

**Success Criteria** (End of Week 1):
- ≥500 visitors = ✅ Good reach
- ≥50 active users = ✅ Product-market fit signal
- ≥5 premium signups = ✅ Monetization validated
- Positive feedback ratio ≥70% = ✅ Quality validated

---

## What You Do vs What Claude Does

### Your Manual Work (Total: ~25-35 hours)

**Strategic Decisions** (5 hours):
- Choose which features to build
- Determine content scope (how many species)
- Set pricing strategy
- Define freemium tiers
- Select target audience
- Approve Claude's work at checkpoints

**Technical Setup** (3 hours):
- Install dependencies
- Set up accounts (Stripe, Google Cloud, etc.)
- Deploy to GitHub Pages
- Configure environment variables
- Test payment flows

**Content Curation** (2 hours):
- Review generated species lists
- Approve vocabulary selections
- Validate Spanish correctness
- Spot-check exercise quality

**Testing & QA** (5-8 hours):
- Test every feature manually
- Use app daily (dogfooding)
- Verify mobile responsiveness
- Test payment integration
- Cross-browser testing

**Marketing & Launch** (8-10 hours):
- Create demo video
- Write marketing copy
- Post to social media
- Respond to user feedback
- Customer support

**Ongoing Use** (15 min/day):
- Use the app daily
- Log learning progress
- Note UX issues
- Identify improvement opportunities

### Claude Code's Automated Work (Total: ~25-30 hours)

**Code Implementation** (20-25 hours):
- Fix TypeScript build (15 min)
- Generate exercise data (2-4 hours)
- Expand species database (4-6 hours)
- Add premium features (4-6 hours)
- Implement payment system (2-3 hours)
- Create UI components (4-6 hours)
- Add analytics (1 hour)
- Write tests (2-3 hours)

**Content Generation** (4-5 hours):
- Research bird species
- Generate vocabulary terms
- Create exercises (1000+)
- Write example sentences
- Add etymology

**Documentation** (1 hour):
- Update README
- Create usage guides
- Write API docs
- Generate changelog

---

## Decision Points

### Critical Decisions (Must Make Before Starting)

1. **Time Commitment**:
   - [ ] Quick Start only (2-3 hours) → Basic usability
   - [ ] Full Features (10-15 hours) → Complete personal use
   - [ ] Freemium Launch (25-35 hours) → Public product

2. **Content Scope**:
   - [ ] 10 species (current) → Proof of concept
   - [ ] 50 species → Solid personal use
   - [ ] 200 species → Premium offering

3. **Monetization**:
   - [ ] Free forever → Portfolio/hobby project
   - [ ] Freemium → Sustainable side project
   - [ ] Paid only → Niche premium product

### Decision Trees

```
START: Do you want to use this yourself?
├─ YES → Proceed to Quick Start
│  └─ After 1 week of use:
│     ├─ Using 5+ days/week → Proceed to Full Features
│     └─ Using <3 days/week → Identify blockers first
│
└─ NO → Just portfolio project
   └─ Fix build, document process, move on

---

AFTER FULL FEATURES: Do you want others to use it?
├─ YES → Proceed to User Validation
│  └─ After beta testing:
│     ├─ 70%+ recommend → Proceed to monetization
│     ├─ 40-69% recommend → Improve first
│     └─ <40% recommend → Reconsider/pivot
│
└─ NO → Keep private, use personally

---

AFTER VALIDATION: Monetization strategy?
├─ Freemium → Best for education apps
├─ Paid only → Good for niche B2B
├─ Free + ads → Avoid (bad UX for learning)
├─ Free + sponsors → Good for community value
└─ Free forever → Portfolio/resume value
```

---

## Troubleshooting

### Issue: TypeScript Build Still Fails

**Symptoms**: Errors after excluding test files

**Solution**:
```
"Claude, the build is still failing with these errors:
[paste error messages]

Please fix the TypeScript configuration to exclude all test-related code from production build."
```

### Issue: Exercises Don't Load

**Symptoms**: Exercise page shows error or empty state

**Diagnostics**:
```bash
# Check if exercises.json exists
ls -la data/exercises.json

# Validate JSON
cat data/exercises.json | jq empty
# If error, JSON is malformed

# Check browser console
# Open DevTools → Console tab
# Look for fetch errors or parse errors
```

**Solutions**:
- JSON syntax error → Ask Claude to fix
- File not found → Verify path in `clientDataService.ts`
- CORS error → Check GitHub Pages deployment

### Issue: Audio Doesn't Play

**Symptoms**: Click speaker icon, no sound

**Diagnostics**:
```bash
# Check if audio files exist
ls public/audio/*.mp3

# Check browser console for 404 errors
```

**Solutions**:
- Files missing → Re-run audio generation
- Wrong path → Check `annotations.json` audioUrl field
- Browser blocked → Check autoplay permissions

### Issue: GitHub Pages Shows 404

**Symptoms**: Deployment succeeded but site doesn't load

**Solutions**:
```bash
# Check GitHub Pages settings
# Repo → Settings → Pages
# Should be: Source: gh-pages branch, / (root)

# Check base path in vite.config.ts
# Should be: base: '/aves/'

# Rebuild and redeploy
npm run build
git add dist/ -f
git commit -m "Fix deployment"
git push
```

### Issue: No One Signed Up for Premium

**Symptoms**: Launched, but 0 conversions after 1 week

**Diagnostics**:
- Check: Did anyone reach pricing page?
- Check: What's the free tier usage rate?
- Check: Is paywall triggering correctly?

**Solutions**:

**If no one reached pricing page**:
→ Positioning problem. Free tier might be too generous.
→ Action: Make free tier smaller (5 species instead of 10)

**If people reached pricing but didn't buy**:
→ Price too high or value unclear
→ Action:
  - Add 7-day free trial
  - Lower price to $2.99/mo
  - Add testimonials/social proof

**If free tier usage is low**:
→ Product problem, not pricing
→ Action: Improve core experience before monetizing

---

## Quick Reference Commands

### Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

### Deployment
```bash
# Build and deploy to GitHub Pages
npm run build
npm run deploy

# Or manual
cd frontend
npm run build
cd ..
git add .
git commit -m "Update deployment"
git push origin main
```

### Data Management
```bash
# Validate JSON files
cat data/species.json | jq empty
cat data/annotations.json | jq empty
cat data/exercises.json | jq empty

# Count entries
cat data/species.json | jq length      # Species count
cat data/annotations.json | jq length  # Annotation count
cat data/exercises.json | jq length    # Exercise count

# View specific entry
cat data/species.json | jq '.[0]'      # First species
cat data/exercises.json | jq '.[10]'   # 11th exercise
```

### Analytics
```bash
# Export usage stats (if analytics implemented)
# Visit: https://[username].github.io/aves/stats
# Download JSON

# Or via console
localStorage.getItem('aves-analytics')
```

---

## Success Metrics

### Personal Use (Quick Start)
- ✅ Can complete 10 exercises without errors
- ✅ Progress saves between sessions
- ✅ Use app 5+ days in first week
- ✅ Learn 10 bird names in Spanish

### Full Features
- ✅ 50 species, 250 exercises, audio works
- ✅ Progress dashboard shows accurate stats
- ✅ Spaced repetition correctly surfaces weak areas
- ✅ Use app 10+ days consecutively

### User Validation
- ✅ 10 beta testers recruited
- ✅ 70%+ completion rate (5+ days of use)
- ✅ 70%+ would recommend
- ✅ 50%+ willing to pay

### Monetization
- ✅ Free tier: 100+ active users
- ✅ Premium signups: 5+ in first week
- ✅ Conversion rate: ≥5% (5 paid / 100 free)
- ✅ Churn rate: <20% monthly
- ✅ MRR: $50+ after 1 month

---

## Next Steps

**After completing this walkthrough, you'll have**:
- ✅ Working app for personal daily use
- ✅ 50 bird species with Spanish vocabulary
- ✅ 250 exercises across multiple types
- ✅ Audio pronunciation
- ✅ Progress tracking and spaced repetition
- ✅ (Optional) Freemium product with paying users

**Then you can**:
1. **Keep as personal tool** → Use daily, refine based on your needs
2. **Grow user base** → Marketing, SEO, partnerships
3. **Add B2B offering** → License to schools/tour companies
4. **Build mobile app** → React Native version
5. **Expand to other topics** → Birds → Fish → Mammals → Plants
6. **Sell/license** → Approach education companies

**Or simply enjoy learning Spanish bird names!** 🦅🦜🦉

---

*This walkthrough assumes basic familiarity with git, npm, and command line. If you get stuck, ask Claude for help with specific commands or concepts.*
