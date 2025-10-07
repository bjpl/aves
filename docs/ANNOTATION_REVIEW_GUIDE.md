# Human-in-the-Loop Annotation Review Guide
**Date Created:** October 6, 2025
**Purpose:** Step-by-step instructions for reviewing Claude-generated bird annotations

---

## 🎯 Quick Start (10 Minutes to First Review)

### Phase 1: Start Local Environment

#### Step 1: Start Backend Server
```bash
# Navigate to backend directory
cd backend

# Start the development server
npm run dev
```

**Expected Output:**
```
✅ Server running on http://localhost:3001
✅ Database connected (Supabase)
✅ VisionAI Service initialized with Claude Sonnet 4.5
```

**Troubleshooting:**
- If port 3001 is in use: Kill the process or change PORT in .env
- If database connection fails: Check SUPABASE_URL and credentials in .env
- If TypeScript errors: Run `npm run build` first

---

#### Step 2: Start Frontend Development Server
```bash
# Open a new terminal
cd frontend

# Start Vite development server
npm run dev
```

**Expected Output:**
```
✅ VITE v5.4.20 ready in 450 ms
✅ Local: http://localhost:5173/
✅ Network: use --host to expose
```

**Access:** Open browser to http://localhost:5173/

---

#### Step 3: Login to Admin Panel
1. Navigate to: http://localhost:5173/login
2. **Email:** brandon.lambert87@gmail.com (or your registered email)
3. **Password:** Your Supabase auth password
4. Click "Sign In"

**What Happens:**
- Supabase authenticates your credentials
- JWT token stored in localStorage
- Redirects to admin dashboard

**If Login Fails:**
- Check email/password are correct
- Verify Supabase is running (check backend logs)
- Clear browser cache and try again

---

### Phase 2: Access Review Interface

#### Step 4: Navigate to Annotation Review Page
1. After login, go to: http://localhost:5173/admin/annotations/review
2. You should see:
   - Header with counts (68 Pending, 0 Approved, 68 Total)
   - Two tabs: "Review Annotations" | "📊 Analytics Dashboard"
   - Grid of annotation cards with bird images

**If You See "No pending annotations":**
- Annotations haven't been generated yet
- Run batch annotation generation (see "Advanced: Generate Annotations" section)
- Check backend logs for errors

---

## ⌨️ Review Workflow with Keyboard Shortcuts

### The 4 Actions You Can Take:

| Action | Shortcut | When to Use |
|--------|----------|-------------|
| **Approve** | `A` | Annotation is accurate and high-quality |
| **Reject** | `R` | Annotation has issues (opens category modal) |
| **Edit** | `E` | Fix Spanish/English/pronunciation terms |
| **Fix Position** | `F` | Adjust bounding box location/size |

**ESC** - Cancel any open modal

---

### Step 5: Review Your First Annotation

#### 5A. Examine the Annotation Card

**What You'll See:**
```
┌─────────────────────────────────────────────┐
│ AI-Generated Annotation  Confidence: 87.2%  │
│ Difficulty: 3                               │
│ ⚠️ Too Small (1.3%)                        │ <- Quality flag
├─────────────────────────────────────────────┤
│ [Bird Image with Yellow Bounding Box]      │
│                                             │
│ Spanish: el pico                            │
│ English: beak                               │
│ Pronunciation: el PEE-koh                   │
│                                             │
│ Bounding Box: X: 0.45 Y: 0.32              │
│               W: 0.08 H: 0.06              │
├─────────────────────────────────────────────┤
│ [Approve (A)] [Edit (E)]  [Fix (F)] [Reject]│
└─────────────────────────────────────────────┘
```

#### 5B. Quality Checklist (Mental Evaluation)

**Ask yourself:**
1. ✓ Is the Spanish term correct for this bird feature?
2. ✓ Does the bounding box accurately highlight the feature?
3. ✓ Is the feature clearly visible (not blurry or occluded)?
4. ✓ Is the feature large enough (>2% of image)?
5. ✓ Would this help a learner identify the feature?

---

### Step 6: Make a Decision

#### Option A: Approve (Shortcut: A)
**When:** Everything looks good!

**Action:** Press `A` or click "Approve (A)" button

**What Happens:**
- Annotation moves to production database
- Disappears from pending queue
- Pending count decreases by 1
- Approved count increases by 1

**Instant Feedback:**
- Card shows green "Approved!" overlay
- Card fades out and is removed from grid

---

#### Option B: Reject (Shortcut: R)
**When:** Annotation has issues

**Action:** Press `R` or click "Reject (R)" button

**Rejection Modal Opens:**
```
┌─────────────────────────────────────────────┐
│  Reject Annotation: el pico (beak)          │
├─────────────────────────────────────────────┤
│ 🔧 Technical Issues:                        │
│  □ Too Small (<2% of image)                 │
│  □ Blurry/Unclear Image                     │
│  □ Occlusion (blocked)                      │
│                                             │
│ 🤖 AI Identification Issues:                │
│  □ Not in Image (hallucination)             │
│  □ Wrong Feature Identified                 │
│  □ Duplicate Annotation                     │
│                                             │
│ 🎓 Pedagogical Issues:                      │
│  □ Not a Representative Example             │
│  □ Confusing for Learners                   │
│  □ Missing Important Context                │
│                                             │
│ 📏 Positioning Issues:                      │
│  □ Incorrect Bounding Box                   │
│  □ Off by >20% / Multiple Features         │
│                                             │
│ Additional Notes:                           │
│ [Text area for details]                     │
│                                             │
│ [Cancel]              [Submit Rejection]    │
└─────────────────────────────────────────────┘
```

**Steps:**
1. Select one or more categories (checkboxes)
2. (Optional) Add notes with specific details
3. Click "Submit Rejection" or press Enter

**What Gets Stored:**
```
notes: "[TOO_SMALL] Beak is only 1.3% of image, hard to see clearly"
```

**What Happens:**
- Annotation status changes to "rejected"
- Removed from pending queue
- Tracked in analytics for pattern analysis
- Can be used to improve AI prompts later

---

#### Option C: Edit Terms (Shortcut: E)
**When:** Annotation is mostly correct but has minor term errors

**Action:** Press `E` or click "Edit (E)" button

**Edit Mode Activates:**
```
┌─────────────────────────────────────────────┐
│ Edit Annotation Data                        │
├─────────────────────────────────────────────┤
│ Spanish Term:                               │
│ [el pico        ]  <- Editable input       │
│                                             │
│ English Term:                               │
│ [beak           ]  <- Editable input       │
│                                             │
│ Pronunciation (IPA):                        │
│ [el PEE-koh     ]  <- Editable input       │
│                                             │
│ [Save & Approve]  [Cancel]                  │
└─────────────────────────────────────────────┘
```

**Steps:**
1. Click in any field to edit
2. Make corrections
3. Click "Save & Approve"

**What Happens:**
- Terms are updated in database
- Annotation automatically approved
- Moves to production with corrections

**Example Use Cases:**
- Fix capitalization: "El Pico" → "el pico"
- Correct spelling: "las allas" → "las alas"
- Fix pronunciation: "lahs PAH-tahs" → "lahs PAH-tas"

---

#### Option D: Fix Bounding Box (Shortcut: F)
**When:** Terms are correct but box position/size needs adjustment

**Action:** Press `F` or click "🎯 Fix Position (F)" button

**Bounding Box Editor Opens:**
```
┌───────────────────────────────────────────────────┐
│  Adjust Bounding Box - el pico                    │
├───────────────────────────────────────────────────┤
│   ┌──────────────────────────────────────────┐   │
│   │              ╔══════════╗                │   │
│   │              ║  BEAK    ║  <- Drag box   │   │
│   │    [Bird     ║          ║   Image]      │   │
│   │              ║          ║                │   │
│   │              ╚══════════╝                │   │
│   │    Drag corners to resize  →  ◆          │   │
│   └──────────────────────────────────────────┘   │
│                                                   │
│  Current Coordinates (Normalized 0-1):            │
│  X: 0.434  Y: 0.627  W: 0.076  H: 0.080          │
│                                                   │
│  [↺ Reset]         [Cancel]  [💾 Save & Apply]   │
└───────────────────────────────────────────────────┘
```

**How to Use:**
1. **Drag the box** - Click and drag to move position
2. **Resize** - Drag corner handles to change size
3. **Fine-tune** - Use 8 resize handles (corners + edges)
4. **Reset** - Click reset to restore original
5. **Save** - Click "Save & Apply"

**What Happens:**
- Bounding box coordinates updated in database
- Annotation stays in pending queue (not auto-approved)
- You can review the adjustment, then approve separately
- Instant visual feedback (optimistic update)

---

## 📊 Step 7: Check Your Progress

### View Analytics Dashboard
1. Click "📊 Analytics Dashboard" tab
2. Review metrics:
   - **Progress Bar:** 68/400 annotations (17% complete)
   - **Quality Flags:** How many need attention
   - **Species Coverage:** Which birds have most annotations
   - **Rejection Breakdown:** Most common rejection reasons

**Use Analytics To:**
- Track daily review progress
- Identify which species need more images
- See patterns in rejection categories
- Plan next batch of annotations

---

## 🎯 Recommended Review Strategy

### Strategy 1: Speed Review (Batch Approval)
**When:** Reviewing obviously good annotations

**Process:**
1. Quickly scan annotation card
2. Check bounding box alignment
3. If good → Press `A` immediately
4. Move to next card

**Goal:** 10 seconds per annotation (6 per minute)

---

### Strategy 2: Quality-First Review (Detailed)
**When:** Uncertain or complex annotations

**Process:**
1. Read Spanish/English terms carefully
2. Verify bounding box accuracy
3. Check quality flags (⚠️ warnings)
4. Consider pedagogical value
5. Make decision (A/R/E/F)

**Goal:** 30 seconds per annotation (2 per minute)

---

### Strategy 3: Category-Based Review
**When:** Focusing on specific annotation types

**Process:**
1. Review all "anatomical" annotations first
2. Then "behavioral" annotations
3. Then "color" annotations
4. Finally "pattern" annotations

**Why:** Consistent evaluation within category

---

## 📝 Documentation Strategy

### What to Track During Review

Create a simple spreadsheet or notes file tracking:

| Metric | Count | Notes |
|--------|-------|-------|
| **Approved** | ? | High-quality, ready for learners |
| **Rejected - Too Small** | ? | Need closer/zoomed images |
| **Rejected - Wrong Feature** | ? | AI hallucination |
| **Rejected - Poor Quality** | ? | Blurry/occluded |
| **Edited & Approved** | ? | Minor term fixes |
| **Bbox Fixed** | ? | Position adjustments |

**After First 20 Annotations:**
- Note most common rejection reason
- Identify species with best/worst annotations
- Document any AI prompt improvements needed

---

## 🔄 Advanced: Generate More Annotations

### If You Need More Annotations

**Via Backend API:**
```bash
# Example: Generate annotations for a specific image
curl -X POST http://localhost:3001/api/ai/annotations/generate/{imageId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"imageUrl": "https://images.unsplash.com/..."}'
```

**Via Admin Interface:**
(If batch generation UI exists)
1. Upload or select bird images
2. Click "Generate Annotations"
3. Wait for processing (~30-60 seconds per image)
4. Review appears in pending queue

---

## ⚠️ Common Issues & Solutions

### Issue 1: Bounding Box Editor Not Saving
**Symptom:** Click save but box reverts to original

**Solution:**
1. Check browser console for errors (F12)
2. Verify you're logged in (check JWT token)
3. Check backend is running on port 3001
4. Try refreshing page and re-attempting

---

### Issue 2: Keyboard Shortcuts Not Working
**Symptom:** Pressing A/R/E/F does nothing

**Possible Causes:**
1. **Typing in input field** - Shortcuts disabled when typing
2. **Modal is open** - Close modal first (ESC)
3. **API call in progress** - Wait for loading to finish

**Solution:** Click outside any input fields, close modals, wait for operations to complete

---

### Issue 3: No Annotations Showing
**Symptom:** "No pending annotations to review"

**Possible Causes:**
1. Annotations haven't been generated yet
2. All annotations already reviewed
3. Database connection issue

**Solution:**
1. Check backend logs for errors
2. Query database directly to verify annotations exist
3. Generate new batch of annotations

---

## 📈 Success Metrics

### Daily Goals
- **First Day:** Review 20-30 annotations (get familiar with UI)
- **Steady State:** Review 50-100 annotations per day
- **MVP Target:** 400 high-quality annotations

### Quality Targets
- **Approval Rate:** 60-80% (healthy for AI-generated content)
- **Rejection Rate:** 20-40% (normal during early batches)
- **Edit Rate:** 5-10% (minor fixes)

**If Approval Rate < 50%:**
- AI prompts need improvement
- Image quality may be too low
- Consider adjusting generation parameters

---

## 🎯 Next Steps After Review Session

1. **Check Analytics Dashboard**
   - Review rejection breakdown
   - Note most common categories
   - Identify species gaps

2. **Document Findings**
   - Common AI errors
   - Image quality issues
   - Prompt improvement ideas

3. **Plan Next Batch**
   - Which species need more annotations?
   - What image qualities work best?
   - Should AI prompts be adjusted?

4. **Deploy to Production** (when ready)
   - Backend already on Railway
   - Frontend already on GitHub Pages
   - Changes auto-deploy on git push

---

## 🚀 You're Ready!

**Quick Reference Card:**
```
KEYBOARD SHORTCUTS:
  A - Approve annotation
  R - Reject (open category modal)
  E - Edit terms
  F - Fix bounding box position
  ESC - Cancel/close

REVIEW SPEED:
  Fast: 10 sec/annotation (obvious approvals)
  Normal: 30 sec/annotation (careful review)

GOAL:
  400 total annotations for MVP
  Currently: 68 pending review (17% complete)
```

**Start your first review session! Good luck! 🎉**
