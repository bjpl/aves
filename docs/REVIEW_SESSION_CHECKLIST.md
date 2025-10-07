# Annotation Review Session Checklist
**Quick Start Guide - Get Reviewing in 5 Minutes**

---

## ☑️ Pre-Session Checklist (5 minutes)

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```
**Wait for:** ✅ "Server running on http://localhost:3001"

---

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```
**Wait for:** ✅ "Local: http://localhost:5173/"

---

### Browser: Login
1. Open: http://localhost:5173/login
2. Email: brandon.lambert87@gmail.com
3. Password: [Your Supabase password]
4. Click "Sign In"

---

### Navigate to Review Page
**URL:** http://localhost:5173/admin/annotations/review

**You should see:**
- 68 Pending annotations
- Grid of bird image cards
- Two tabs: Review | Analytics

---

## ⌨️ Review Session (60-90 minutes for 68 annotations)

### Keyboard Shortcuts Quick Reference
```
A     → Approve (good annotation)
R     → Reject (open category modal)
E     → Edit (fix Spanish/English terms)
F     → Fix Position (adjust bounding box)
ESC   → Cancel any modal
```

---

### Review Flow (Repeat for Each Card)

1. **👀 Look at the card** (3 seconds)
   - Check quality warning badges (⚠️)
   - Look at bounding box alignment
   - Read Spanish/English terms

2. **🤔 Quick mental check** (2 seconds)
   - Is the box in the right place?
   - Are the terms correct?
   - Is the feature clearly visible?

3. **✅ Make decision** (5 seconds)
   - Good? → Press `A`
   - Bad? → Press `R`, select category, submit
   - Almost good? → Press `E` or `F`, fix, save

**Target Speed:** 10-30 seconds per annotation

---

## 📊 Mid-Session Check (After 20 annotations)

### Switch to Analytics Tab
**Click:** "📊 Analytics Dashboard"

**Check:**
- How many approved vs rejected?
- What are the most common rejection reasons?
- Which species have the most annotations?

**Document:**
```
Reviewed so far: 20
Approved: ?
Rejected: ?
Most common rejection: ?
Notes:
```

**Return to Review Tab** and continue

---

## 🎯 End-of-Session (Last 10 minutes)

### 1. Final Analytics Review
- Total approved: ?
- Total rejected: ?
- Rejection breakdown by category
- Species coverage

### 2. Document Findings
**Create:** `daily_reports/2025-10-06-annotation-review-session-1.md`

**Include:**
```markdown
# Annotation Review Session 1 - Oct 6, 2025

## Stats
- Reviewed: X annotations
- Approved: X (X%)
- Rejected: X (X%)
- Edited: X
- Bbox Fixed: X

## Rejection Breakdown
- Too Small: X
- Wrong Feature: X
- Blurry: X
- [Other categories]: X

## Observations
- Most common issue:
- Best species for annotations:
- Worst species for annotations:

## AI Prompt Improvements Needed
1.
2.
3.

## Next Steps
- Need more images for species: [list]
- Adjust AI prompt for: [issue]
- Target for next session: X annotations
```

### 3. Commit Progress
```bash
git add -A
git commit -m "Review session 1: Reviewed X annotations (Y approved, Z rejected)"
git push origin main
```

---

## 🚨 Quick Troubleshooting

### Backend won't start?
```bash
cd backend
npm install
npm run build
npm run dev
```

### Frontend won't start?
```bash
cd frontend
npm install
npm run dev
```

### Can't login?
- Check backend is running (port 3001)
- Verify email/password
- Check browser console (F12) for errors

### Annotations not showing?
- Check backend logs for database connection
- Verify Supabase credentials in backend/.env
- Try refreshing page (Ctrl+R)

### Keyboard shortcuts not working?
- Click outside input fields
- Close any open modals (ESC)
- Make sure card is not loading (wait for spinner to stop)

---

## ✅ Session Complete!

**You've successfully:**
- Reviewed X bird annotations
- Improved dataset quality
- Documented patterns for AI improvement

**Next session:** Review remaining annotations until you reach 400 total approved!

---

## 📈 Progress Tracker

| Session | Date | Reviewed | Approved | Rejected | Total Approved |
|---------|------|----------|----------|----------|----------------|
| 1       | Oct 6 | ?        | ?        | ?        | ?              |
| 2       | ?     | ?        | ?        | ?        | ?              |
| ...     | ...   | ...      | ...      | ...      | ...            |
| **Goal**|       |          |          |          | **400**        |
