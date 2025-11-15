# Local Testing Setup Guide

Complete step-by-step instructions for setting up Aves for local user testing with full AI features.

---

## Overview

This guide will help you:
1. Set up the development environment
2. Configure backend with AI features (Anthropic Claude)
3. Configure frontend
4. Run database migrations
5. Start both servers
6. Verify everything is working

**Estimated setup time**: 15-20 minutes

---

## Prerequisites Check

### Required
- ✅ **Node.js 18+** (you have v22.20.0)
- ✅ **npm 9+** (you have v10.9.3)
- 🔑 **Anthropic API key** ([Get one here](https://console.anthropic.com/))

### Optional
- PostgreSQL 14+ (can use SQLite for quick testing)
- Git (for version control)

---

## Step 1: Install Dependencies

```bash
# From project root (/home/user/aves)
npm install

# This installs dependencies for:
# - Root workspace
# - Frontend workspace
# - Backend workspace
```

**Expected output**:
```
added 1847 packages, and audited 1848 packages in 45s
```

**Troubleshooting**:
- If you see `ENOENT` errors, ensure you're in the project root
- If you see permission errors, avoid using `sudo` - fix npm permissions instead
- If postinstall scripts fail, try `npm install --ignore-scripts`

---

## Step 2: Configure Backend Environment

### 2.1 Create Backend .env File

```bash
cd backend
cp .env.example .env
```

### 2.2 Edit Backend .env

Open `backend/.env` in your editor and configure:

#### Essential Configuration

```bash
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (Option 1: PostgreSQL - if you have it installed)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Database (Option 2: SQLite - simpler for testing)
# Comment out the PostgreSQL settings above and use:
# DATABASE_URL=sqlite://./aves.db

# AI Configuration (REQUIRED for full features)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx  # ← Replace with your actual key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250629
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7

# AI Features
ENABLE_VISION_AI=true
VISION_PROVIDER=claude
ENABLE_EXERCISE_GENERATION=true

# Security (generate strong secrets for production)
JWT_SECRET=dev-secret-change-in-production
```

#### Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys" in the dashboard
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `ANTHROPIC_API_KEY` in your `.env` file

**Note**: Free tier includes $5 credit. Vision API and exercise generation use Claude Sonnet 4.5.

---

### 2.3 Database Setup

#### Option A: PostgreSQL (Recommended for Production)

**Install PostgreSQL** (if not already installed):

```bash
# macOS (with Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

**Create Database**:

```bash
# Connect to PostgreSQL
psql postgres

# In psql console:
CREATE DATABASE aves;
CREATE USER aves_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aves TO aves_user;
\q
```

**Update .env**:
```bash
DB_PASSWORD=your_password  # Match the password you set above
```

**Run Migrations**:
```bash
cd backend
npm run migrate
```

---

#### Option B: SQLite (Quick Start - No PostgreSQL Needed)

**For quick testing without PostgreSQL**:

1. Edit `backend/.env`:
```bash
# Comment out PostgreSQL settings
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=aves
# DB_USER=postgres
# DB_PASSWORD=postgres

# Use SQLite instead
DATABASE_URL=sqlite://./aves.db
```

2. Run migrations:
```bash
cd backend
npm run migrate
```

**Note**: SQLite is great for testing but not recommended for production.

---

## Step 3: Configure Frontend Environment

### 3.1 Create Frontend .env File

```bash
cd ../frontend  # From backend directory
cp .env.example .env
```

### 3.2 Edit Frontend .env

Open `frontend/.env` and configure:

```bash
# Backend API Configuration
VITE_API_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_AI_EXERCISES=true
VITE_ENABLE_VISION_AI=true
VITE_DEBUG_MODE=true

# Optional: Unsplash (for additional bird images)
# VITE_ENABLE_UNSPLASH=false
```

**Note**: Frontend .env variables must start with `VITE_` to be accessible in the browser.

---

## Step 4: Verify Configuration

```bash
# From backend directory
cd ../backend
npm run validate-config
```

**Expected output**:
```
✓ Database connection successful
✓ Anthropic API key valid
✓ JWT secret configured
✓ All required environment variables set
```

**Common Issues**:
- ❌ `Database connection failed` → Check PostgreSQL is running or switch to SQLite
- ❌ `Invalid Anthropic API key` → Verify key starts with `sk-ant-`
- ❌ `Weak JWT secret` → Use at least 32 characters for production

---

## Step 5: Seed Test Data (Optional)

Load sample bird species and vocabulary for testing:

```bash
cd backend
npm run seed
```

**This creates**:
- 20+ bird species (Petirrojo, Gorrión, Águila, etc.)
- 50+ vocabulary terms with annotations
- Sample exercises
- Test user account (email: `test@aves.com`, password: `TestPassword123!`)

---

## Step 6: Start Development Servers

### Option 1: Start Both Servers Concurrently (Recommended)

```bash
# From project root
cd ..  # If you're in backend or frontend
npm run dev
```

**Expected output**:
```
[backend] Server running on http://localhost:3001
[frontend] Local: http://localhost:5173
```

Both servers will run in watch mode (auto-reload on file changes).

---

### Option 2: Start Servers Separately (For Debugging)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Vite dev server runs on http://localhost:5173
```

---

## Step 7: Verify Setup

### 7.1 Check Backend Health

Open browser to:
```
http://localhost:3001/api/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T20:00:00.000Z",
  "services": {
    "database": "connected",
    "anthropic": "configured",
    "vision": "enabled"
  }
}
```

---

### 7.2 Check Frontend

Open browser to:
```
http://localhost:5173
```

**You should see**:
- Aves homepage with logo
- Navigation menu
- No console errors (press F12 to check)

---

### 7.3 Test AI Features

#### Test Vision AI Annotations

```bash
# Terminal 3 (from backend directory)
curl -X POST http://localhost:3001/api/ai/annotations/generate \
  -H "Content-Type: application/json" \
  -d '{
    "speciesId": 1,
    "imageUrl": "https://images.unsplash.com/photo-robin"
  }'
```

**Expected**: JSON response with AI-generated annotations

#### Test Exercise Generation

1. Navigate to http://localhost:5173/exercises
2. Click "Start New Session"
3. Verify exercises load within 2 seconds
4. Check console for no errors

---

## Step 8: Run Tests (Optional)

Verify everything works by running the test suite:

### Backend Tests (95%+ coverage)

```bash
cd backend
npm test
```

**Expected**: All tests pass (may take 30-60 seconds)

### Frontend Tests

```bash
cd frontend
npm test
```

**Expected**: 264 tests pass

### E2E Tests (Full Integration)

```bash
cd frontend
npm run test:e2e
```

**Expected**: 57 E2E tests pass (may take 2-3 minutes)

---

## Troubleshooting

### Issue: Backend won't start

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd backend
npm install
```

---

### Issue: Database connection failed

**Error**: `ECONNREFUSED ::1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# If not running, start it:
brew services start postgresql@14  # macOS
sudo systemctl start postgresql     # Linux

# Or switch to SQLite (see Step 2.3 Option B)
```

---

### Issue: Anthropic API errors

**Error**: `401 Unauthorized`

**Cause**: Invalid or missing API key

**Solution**:
1. Verify key in `backend/.env`
2. Check key hasn't expired in Anthropic console
3. Ensure key starts with `sk-ant-`

---

### Issue: Port already in use

**Error**: `EADDRINUSE :::3001`

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in backend/.env
PORT=3002
```

---

### Issue: Frontend can't connect to backend

**Error**: `Network Error` or `CORS error`

**Solution**:
1. Verify backend is running on port 3001
2. Check `backend/.env` has `FRONTEND_URL=http://localhost:5173`
3. Check `frontend/.env` has `VITE_API_URL=http://localhost:3001`
4. Clear browser cache and reload

---

### Issue: Images not loading

**Possible causes**:
- CORS issues
- Unsplash API not configured
- Missing image files

**Solution**:
1. Check browser console for errors
2. Verify images exist in `backend/uploads/` or `frontend/public/`
3. Configure Unsplash API (optional):
```bash
# In backend/.env
UNSPLASH_ACCESS_KEY=your_key_here
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Backend server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes* | - | Database connection string |
| `ANTHROPIC_API_KEY` | Yes** | - | Claude API key for AI features |
| `JWT_SECRET` | Yes | - | Secret for JWT tokens (32+ chars) |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS |

\* Required if not using PostgreSQL individual settings
** Required for AI features (annotations, exercises)

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API base URL |
| `VITE_ENABLE_AI_EXERCISES` | No | true | Enable AI-generated exercises |
| `VITE_ENABLE_VISION_AI` | No | true | Enable Vision AI annotations |
| `VITE_DEBUG_MODE` | No | false | Enable debug logging |

---

## Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Project dependencies installed (`npm install`)
- [ ] Backend .env configured (with Anthropic API key)
- [ ] Frontend .env configured
- [ ] Database setup (PostgreSQL or SQLite)
- [ ] Migrations run (`npm run migrate`)
- [ ] Test data seeded (optional: `npm run seed`)
- [ ] Backend server running (http://localhost:3001)
- [ ] Frontend server running (http://localhost:5173)
- [ ] Health check passed (http://localhost:3001/api/health)
- [ ] No console errors in browser

---

## Next Steps

Once setup is complete:

1. **Read Testing Guide**: `/docs/USER_TESTING_GUIDE.md`
2. **Follow Testing Script**: `/docs/TESTING_SCRIPT.md`
3. **Use Bug Template**: `/docs/BUG_REPORT_TEMPLATE.md`
4. **Run Full Test Suite**: `npm test` (both workspaces)

---

## Additional Resources

- **API Documentation**: `/docs/api/`
- **Database Schema**: `/database/schemas/`
- **Component Documentation**: `/frontend/src/components/README.md`
- **Troubleshooting**: `/docs/TEST-SETUP-INSTRUCTIONS.md`

---

**Setup Guide Version**: 1.0
**Last Updated**: October 24, 2025
**Estimated Setup Time**: 15-20 minutes
