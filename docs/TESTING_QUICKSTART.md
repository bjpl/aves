# Testing Quick Start ⚡

**Get testing in under 5 minutes!**

---

## 🚀 Super Quick Start (For Experienced Users)

```bash
# 1. Set your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> backend/.env

# 2. Setup database
cd backend && npm run migrate && cd ..

# 3. Start servers
npm run dev

# 4. Open browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001/api/health
```

**Done!** Start testing with `docs/TESTING_SCRIPT.md`

---

## 📋 Step-by-Step Checklist (For First-Time Setup)

### ✅ Pre-Setup (2 min)

- [ ] **Get Anthropic API Key**
  - Go to https://console.anthropic.com/
  - Sign up or log in
  - Navigate to "API Keys"
  - Create new key (copy it - starts with `sk-ant-`)
  - **Free tier**: $5 credit included

---

### ✅ Environment Setup (1 min)

Environment files are already created! You just need to add your API key.

- [ ] **Configure Backend**
  ```bash
  # Edit backend/.env
  # Find line: ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
  # Replace with: ANTHROPIC_API_KEY=sk-ant-xxxxx (your actual key)
  ```

  **Quick edit**:
  ```bash
  # Replace YOUR_ANTHROPIC_API_KEY_HERE with your actual key
  sed -i 's/YOUR_ANTHROPIC_API_KEY_HERE/sk-ant-your-actual-key/' backend/.env
  ```

---

### ✅ Database Setup (1 min)

Using SQLite (no PostgreSQL needed).

- [ ] **Run Migrations**
  ```bash
  cd backend
  npm run migrate
  cd ..
  ```

  **Expected output**:
  ```
  ✓ Database migrations completed successfully
  ✓ Created tables: users, species, annotations, exercises, etc.
  ```

- [ ] **(Optional) Seed Test Data**
  ```bash
  cd backend
  npm run seed
  cd ..
  ```

  **This creates**:
  - 20+ bird species (Petirrojo, Gorrión, Águila, etc.)
  - 50+ vocabulary terms
  - Sample exercises
  - Test user account

---

### ✅ Start Servers (1 min)

- [ ] **Start Development Servers**
  ```bash
  npm run dev
  ```

  **Expected output**:
  ```
  [backend]  Server running on http://localhost:3001
  [frontend] Local: http://localhost:5173
  ```

  **Both servers will run together**. Keep this terminal open.

---

### ✅ Verify Setup (1 min)

Open these URLs in your browser:

- [ ] **Backend Health Check**
  ```
  http://localhost:3001/api/health
  ```

  **Expected response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-10-24T...",
    "services": {
      "database": "connected",
      "anthropic": "configured"
    }
  }
  ```

- [ ] **Frontend**
  ```
  http://localhost:5173
  ```

  **Expected**: Aves homepage with navigation

- [ ] **Browser Console** (Press F12)
  - No red errors in console
  - Look for: `[Aves] App initialized`

---

## 🧪 Start Testing

### Quick Test: Does Everything Work?

**Test Scenario** (2 minutes):

1. **Navigate** to http://localhost:5173
2. **Click** "Species Browser" (or equivalent)
3. **Select** a bird species (e.g., "Petirrojo")
4. **Hover** over an annotation on the bird image
5. **Click** the annotation to reveal Spanish vocabulary
6. **Navigate** to "Exercises"
7. **Start** a new exercise session
8. **Complete** 1-2 exercise questions

**Success Criteria**:
- ✅ Pages load quickly (< 3 seconds)
- ✅ Annotations appear on hover
- ✅ Spanish terms are revealed on click
- ✅ Exercises load and display correctly
- ✅ No errors in browser console

---

### Full Testing (90 minutes)

Follow the comprehensive test script:

📖 **See**: `docs/TESTING_SCRIPT.md`

**Testing Scenarios**:
1. First-time user onboarding (10 min)
2. Species browser navigation (10 min)
3. Interactive annotations (20 min)
4. AI-powered exercises (25 min)
5. Mobile/responsive testing (15 min)
6. Error handling (10 min)

---

## 📝 Bug Tracking

**Found a bug?** Use the bug report template:

📖 **See**: `docs/BUG_REPORT_TEMPLATE.md`

**Quick bug report**:
1. Take screenshot (Cmd+Shift+4 on macOS)
2. Note browser and OS
3. Describe steps to reproduce
4. Copy any console errors
5. Fill out template

---

## ⚙️ Configuration Reference

### Backend Configuration (`backend/.env`)

**Essential settings**:
```bash
PORT=3001                    # Backend server port
NODE_ENV=development         # Development mode
FRONTEND_URL=http://localhost:5173

# Database (SQLite - no setup required)
DATABASE_URL=sqlite:./aves-test.db

# AI Features (REQUIRED)
ANTHROPIC_API_KEY=sk-ant-xxxxx  # ← Your key here
ENABLE_VISION_AI=true
ENABLE_EXERCISE_GENERATION=true
```

---

### Frontend Configuration (`frontend/.env`)

**Essential settings**:
```bash
VITE_API_URL=http://localhost:3001
VITE_ENABLE_AI_EXERCISES=true
VITE_ENABLE_VISION_AI=true
VITE_DEBUG_MODE=true
```

---

## 🛠️ Troubleshooting

### Issue: "Cannot find module"

**Solution**:
```bash
npm install
```

---

### Issue: "Port 3001 already in use"

**Find and kill the process**:
```bash
# macOS/Linux
lsof -i :3001
kill -9 <PID>

# Or change port in backend/.env
PORT=3002
```

---

### Issue: "Database connection failed"

**Using SQLite?** Check `backend/.env` has:
```bash
DATABASE_URL=sqlite:./aves-test.db
```

**Run migrations**:
```bash
cd backend && npm run migrate && cd ..
```

---

### Issue: "401 Unauthorized" (AI features)

**Check API key**:
1. Verify key in `backend/.env`
2. Key should start with `sk-ant-`
3. Check key hasn't expired in Anthropic console

---

### Issue: Frontend can't connect to backend

**Check**:
1. Backend is running on port 3001
2. `frontend/.env` has `VITE_API_URL=http://localhost:3001`
3. No CORS errors in browser console
4. Try restarting both servers

---

## 📊 Testing Metrics to Track

| Metric | Target | Your Result |
|--------|--------|-------------|
| Page load time | < 3s | ___ |
| Exercise load time | < 2s | ___ |
| Spanish terms learned | 5-10 | ___ |
| Bugs found per hour | < 5 | ___ |
| Overall satisfaction (1-10) | > 7 | ___ |

---

## 📚 Full Documentation

**Comprehensive guides**:

| Document | Purpose | Time |
|----------|---------|------|
| `USER_TESTING_GUIDE.md` | Complete testing framework | 15 min read |
| `TESTING_SCRIPT.md` | Step-by-step test cases | 90 min testing |
| `BUG_REPORT_TEMPLATE.md` | Bug tracking template | As needed |
| `LOCAL_TESTING_SETUP.md` | Detailed setup instructions | 20 min setup |

---

## 🎯 Testing Goals

**By the end of testing, you should have**:

- ✅ Validated all core features work
- ✅ Identified 5-10 bugs (expected for pre-release)
- ✅ Learned 5-10 Spanish bird vocabulary words
- ✅ Completed bug reports for critical issues
- ✅ UX feedback documented
- ✅ Performance metrics recorded
- ✅ Mobile experience tested

---

## 🚦 Status Indicators

**How to know if setup is working**:

| Status | Indicator | Action |
|--------|-----------|--------|
| ✅ **Ready** | Both servers running, no console errors | Start testing! |
| 🟡 **Partial** | Frontend works, AI features disabled | Add API key, restart |
| ⚠️ **Issues** | Errors in console or can't load pages | Check troubleshooting |
| ❌ **Broken** | Servers won't start | Review setup steps |

---

## 💡 Pro Tips

1. **Use two monitors**: One for app, one for bug tracker
2. **Screen record**: Record your first test session (OBS, QuickTime)
3. **Think aloud**: Narrate your thoughts as you test
4. **Test mobile first**: Many users will be on mobile
5. **Clear cache between sessions**: Get fresh-user perspective
6. **Check console frequently**: Catch errors early

---

## ⏱️ Time Budget

**Recommended testing schedule**:

| Session | Duration | Focus |
|---------|----------|-------|
| **Session 1** | 30 min | Core features (annotations, browser) |
| **Session 2** | 30 min | AI exercises |
| **Session 3** | 20 min | Mobile testing |
| **Session 4** | 15 min | Error handling |
| **Session 5** | 10 min | Performance benchmarking |

**Total**: ~2 hours for comprehensive testing

---

## 📞 Support

**Stuck? Check these first**:

1. **Console errors**: F12 → Console tab
2. **Network tab**: F12 → Network (check API calls)
3. **Terminal output**: Look for error messages
4. **Environment files**: Verify .env settings

**Common quick fixes**:
```bash
# Restart servers
Ctrl+C (in terminal running npm run dev)
npm run dev

# Clear npm cache
npm cache clean --force
npm install

# Reset database
cd backend
rm aves-test.db
npm run migrate
cd ..
```

---

**Ready to test?** 🚀

```bash
npm run dev
```

Open http://localhost:5173 and start testing!

For detailed test scenarios, see `docs/TESTING_SCRIPT.md`

---

**Last Updated**: October 24, 2025
**Version**: 1.0
