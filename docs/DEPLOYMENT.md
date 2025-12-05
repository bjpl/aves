# AVES Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-04
**Status:** Production Ready

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Frontend Deployment (GitHub Pages)](#frontend-deployment-github-pages)
- [Backend Deployment (Railway)](#backend-deployment-railway)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Database Migrations](#database-migrations)
- [Health Checks](#health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/aves.git
cd aves

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your credentials

# 4. Run database migrations
cd backend
npm run migrate

# 5. Start development servers
cd ..
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

---

## Prerequisites

### Required Tools

- **Node.js:** 18.x or 20.x LTS
- **npm:** 9.x or higher
- **Git:** Latest stable version
- **PostgreSQL:** 14+ (for local development)

### Accounts Required

1. **GitHub Account:** For repository and GitHub Pages hosting
2. **Supabase Account:** For database and authentication
3. **Railway Account:** For backend hosting (optional: Render/Fly.io)
4. **Anthropic Account:** For Claude AI API

### Installation

**Node.js:**
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 9.x.x or higher
```

**Git:**
```bash
# Verify installation
git --version
```

---

## Environment Variables

### Backend Environment Variables

**File:** `backend/.env`

```bash
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=3001

# ============================================
# DATABASE (Supabase PostgreSQL)
# ============================================
# Direct PostgreSQL connection string
DATABASE_URL=postgresql://postgres:[password]@[project].supabase.co:5432/postgres

# Supabase connection details
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Secret key (server-side only)

# ============================================
# AUTHENTICATION
# ============================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-random-string
JWT_EXPIRES_IN=24h
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# ============================================
# AI PROVIDER (Anthropic Claude)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_PROVIDER=claude  # or 'gpt4' for fallback

# OpenAI (Optional fallback)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# CORS & FRONTEND
# ============================================
FRONTEND_URL=https://bjpl.github.io/aves/

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=500

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info  # trace | debug | info | warn | error | fatal

# ============================================
# DEVELOPMENT ONLY (DO NOT USE IN PRODUCTION)
# ============================================
# DEV_AUTH_BYPASS=false  # NEVER set to true in production
```

### Frontend Environment Variables

**File:** `frontend/.env.production`

```bash
# ============================================
# API CONFIGURATION
# ============================================
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_API_VERSION=v1

# ============================================
# SUPABASE (Frontend)
# ============================================
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Public key

# ============================================
# FEATURE FLAGS
# ============================================
VITE_ENABLE_VISION_AI=true
VITE_ENABLE_ANALYTICS=true

# ============================================
# OPTIONAL
# ============================================
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx  # Error tracking
```

### Security Notes

⚠️ **CRITICAL SECURITY WARNINGS:**

1. **Never commit `.env` files to Git** (already in `.gitignore`)
2. **JWT_SECRET must be unique and random** (min 32 characters)
3. **SUPABASE_SERVICE_ROLE_KEY is highly sensitive** (backend only, never expose to frontend)
4. **Rotate secrets regularly** (every 90 days recommended)
5. **Use different secrets for dev/staging/prod**

**Generate Secure Secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

---

## Frontend Deployment (GitHub Pages)

### Automated Deployment (GitHub Actions)

**Setup:**

1. **GitHub Pages Configuration:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` → `/docs` folder
   - Save

2. **Configure Secrets:**
   ```
   Repository → Settings → Secrets and variables → Actions
   Add the following secrets:
   ```
   - `VITE_API_URL`: Backend API URL
   - `VITE_SUPABASE_URL`: Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase public anon key

3. **Deploy Workflow** (already configured in `.github/workflows/deploy-frontend.yml`):
   ```yaml
   name: Deploy Frontend
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: 20.x
         - run: npm ci
         - run: npm run build --workspace=frontend
           env:
             VITE_API_URL: ${{ secrets.VITE_API_URL }}
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./docs
   ```

4. **Trigger Deployment:**
   ```bash
   git push origin main
   # GitHub Actions will automatically deploy
   ```

5. **Verify Deployment:**
   - Check Actions tab for workflow status
   - Visit `https://<username>.github.io/aves/`

### Manual Deployment

```bash
# Build frontend
cd frontend
npm run build:gh-pages

# The build outputs to ../docs (configured in vite.config.ts)

# Commit and push
cd ..
git add docs/
git commit -m "deploy: update frontend build"
git push origin main
```

### Custom Domain (Optional)

1. **Add CNAME file:**
   ```bash
   echo "aves.yourdomain.com" > docs/CNAME
   git add docs/CNAME
   git commit -m "config: add custom domain"
   git push origin main
   ```

2. **Configure DNS:**
   - Add CNAME record: `aves` → `<username>.github.io`
   - Or A records pointing to GitHub Pages IPs

3. **Enable HTTPS:**
   - GitHub Pages → Enforce HTTPS (automatic after DNS propagation)

---

## Backend Deployment (Railway)

### Railway Setup

1. **Create Railway Account:**
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli

   # Login
   railway login
   ```

3. **Create New Project:**
   ```bash
   # From backend directory
   cd backend

   # Initialize Railway project
   railway init

   # Select: Create new project
   # Name: aves-backend
   ```

4. **Configure Environment Variables:**
   ```bash
   # Set variables via CLI
   railway variables set NODE_ENV=production
   railway variables set PORT=3001
   railway variables set DATABASE_URL=postgresql://...
   railway variables set SUPABASE_URL=https://...
   railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJ...
   railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   railway variables set ANTHROPIC_API_KEY=sk-ant-...
   railway variables set FRONTEND_URL=https://bjpl.github.io/aves/

   # Or set via Railway Dashboard:
   # Project → Variables → Add variables
   ```

5. **Deploy:**
   ```bash
   # Deploy from CLI
   railway up

   # Or push to main branch (if GitHub integration enabled)
   git push origin main
   ```

6. **Get Deployment URL:**
   ```bash
   railway domain
   # Output: https://aves-backend-production.up.railway.app
   ```

7. **Configure Custom Domain (Optional):**
   ```bash
   railway domain add api.aves.example.com
   # Add CNAME record: api → aves-backend-production.up.railway.app
   ```

### Railway Configuration Files

**`railway.json`** (already in repository):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**`nixpacks.toml`** (already in repository):
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

### GitHub Integration (Automated Deployments)

1. **Connect GitHub:**
   - Railway Dashboard → Project → Settings → GitHub
   - Connect repository
   - Select branch: `main`

2. **Configure Auto-Deploy:**
   - Enable "Auto Deploy"
   - Every push to `main` triggers deployment

3. **Preview Environments:**
   - Enable "PR Deployments"
   - Each PR gets temporary environment

---

## Database Setup (Supabase)

### Create Supabase Project

1. **Sign up at [supabase.com](https://supabase.com)**

2. **Create New Project:**
   - Organization: Your organization
   - Name: `aves-database`
   - Database Password: Generate strong password
   - Region: Select closest to users

3. **Get Connection Details:**
   - Project Settings → Database → Connection string
   - Copy: `postgresql://postgres:[password]@[project].supabase.co:5432/postgres`

4. **Get API Keys:**
   - Project Settings → API
   - Copy:
     - `URL`: https://[project-id].supabase.co
     - `anon public`: eyJhbGc... (frontend)
     - `service_role`: eyJhbGc... (backend only, SECRET)

### Configure Row Level Security (RLS)

**Enable RLS on Tables:**
```sql
-- Enable RLS on user_vocabulary_progress
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "user_vocab_select"
  ON user_vocabulary_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_vocab_insert"
  ON user_vocabulary_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_vocab_update"
  ON user_vocabulary_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Configure Authentication

1. **Enable Email Authentication:**
   - Authentication → Providers → Email
   - Enable email authentication
   - Configure email templates (optional)

2. **OAuth Providers (Optional):**
   - Authentication → Providers → Google/GitHub
   - Add OAuth client credentials

---

## Database Migrations

### Migration Workflow

**Development:**
```bash
cd backend

# Create new migration
npm run migrate:create add_annotation_mastery_table

# Edit migration file in backend/migrations/

# Apply migration
npm run migrate

# Rollback if needed
npm run migrate:rollback
```

**Production:**

⚠️ **ALWAYS test migrations in development first!**

```bash
# Test in development
npm run migrate

# If successful, apply to production
# Option 1: Via Railway CLI
railway run npm run migrate

# Option 2: Via Supabase SQL Editor
# Copy migration SQL and run in Supabase Dashboard
```

### Migration Files

**Create Migration Script:**
```bash
# backend/migrations/20251204_add_annotation_mastery.sql
-- Up Migration
CREATE TABLE annotation_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  mastery_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, annotation_id)
);

CREATE INDEX idx_annotation_mastery_user_id ON annotation_mastery(user_id);

-- Down Migration (Rollback)
DROP TABLE IF EXISTS annotation_mastery;
```

### Migration Safety Checklist

- [ ] Test migration in local development database
- [ ] Backup production database before applying
- [ ] Review migration for breaking changes
- [ ] Ensure backward compatibility
- [ ] Test rollback procedure
- [ ] Notify team before running production migration
- [ ] Monitor logs during migration

---

## Health Checks

### Health Check Endpoint

**Endpoint:** `GET /health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T12:00:00.000Z",
  "database": "connected"
}
```

### Monitoring Health

**Railway Health Checks:**
- Configured in `railway.json`
- Path: `/health`
- Timeout: 300 seconds
- Automatic restart if health check fails

**Manual Health Check:**
```bash
# Check backend health
curl https://your-backend.railway.app/health

# Expected output:
# {"status":"ok","timestamp":"...","database":"connected"}
```

**Database Connection Test:**
```bash
# From backend directory
npm run test:connection

# Or via Railway
railway run npm run test:connection
```

---

## Rollback Procedures

### Frontend Rollback

**Via Git:**
```bash
# Find commit to rollback to
git log --oneline

# Revert to specific commit
git revert <commit-hash>

# Push to trigger redeploy
git push origin main
```

**Manual Rollback:**
```bash
# Checkout previous version
git checkout <previous-commit>

# Rebuild and deploy
npm run build --workspace=frontend
git add docs/
git commit -m "rollback: revert to previous frontend version"
git push origin main
```

### Backend Rollback

**Via Railway CLI:**
```bash
# List deployments
railway deployments list

# Rollback to specific deployment
railway deployment rollback <deployment-id>
```

**Via Railway Dashboard:**
1. Project → Deployments
2. Find working deployment
3. Click "Redeploy"

**Via Git (if auto-deploy enabled):**
```bash
git revert <bad-commit>
git push origin main
# Railway will auto-deploy
```

### Database Rollback

⚠️ **WARNING: Database rollbacks can cause data loss!**

```bash
# Only use if you have migration rollback scripts
railway run npm run migrate:rollback

# Or manually in Supabase SQL Editor
# Run the "Down Migration" SQL
```

---

## Monitoring

### Application Monitoring

**Railway Metrics:**
- Dashboard → Project → Metrics
- CPU usage, Memory usage, Request rate

**Logs:**
```bash
# View logs via CLI
railway logs -f

# Or via Dashboard
# Project → Logs → Filter by service
```

### Error Tracking (Sentry - Optional)

**Setup:**
```bash
npm install @sentry/node

# backend/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Uptime Monitoring

**Recommended Services:**
- UptimeRobot (free tier)
- Better Uptime
- Pingdom

**Configure:**
1. Monitor: `https://your-backend.railway.app/health`
2. Alert: Email/Slack on downtime

---

## Troubleshooting

### Common Issues

#### Frontend Build Fails

**Error:** `VITE_API_URL is not defined`

**Solution:**
```bash
# Ensure environment variables are set
echo $VITE_API_URL

# Or add to GitHub Secrets
# Repository → Settings → Secrets → Add VITE_API_URL
```

#### Backend Won't Start

**Error:** `Cannot find module 'dist/index.js'`

**Solution:**
```bash
# Ensure TypeScript is compiled
npm run build

# Check build output
ls -la dist/
```

#### Database Connection Failed

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solution:**
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check Supabase project is running
# Dashboard → Project → Settings → Database
```

#### JWT Authentication Fails

**Error:** `Invalid token` or `Unauthorized`

**Solution:**
```bash
# Check JWT_SECRET matches between frontend/backend
# Check token expiry (JWT_EXPIRES_IN)

# Test token manually
curl -H "Authorization: Bearer <token>" https://api.example.com/health
```

### Debug Mode

**Enable Verbose Logging:**
```bash
# Railway
railway variables set LOG_LEVEL=debug

# Local
export LOG_LEVEL=debug
npm run dev
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (475 tests)
- [ ] Code coverage meets threshold (90% backend, 80% frontend)
- [ ] Environment variables configured correctly
- [ ] Database migrations tested
- [ ] API documentation up to date
- [ ] Security secrets rotated

### Deployment

- [ ] Frontend deployed to GitHub Pages
- [ ] Backend deployed to Railway
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] SSL/HTTPS enabled
- [ ] CORS configured correctly

### Post-Deployment

- [ ] Smoke tests run successfully
- [ ] Monitoring alerts configured
- [ ] Error tracking active (Sentry)
- [ ] Performance metrics baseline established
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## Support & Resources

**Documentation:**
- Architecture Decisions: `/docs/architecture/decisions/`
- API Documentation: `/docs/api/`
- Testing Guide: `/docs/testing/`

**External Resources:**
- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- GitHub Pages Docs: https://docs.github.com/pages

**Team Contact:**
- Development Team: [GitHub Issues](https://github.com/your-org/aves/issues)
- DevOps: devops@example.com

---

**Last Updated:** 2025-12-04
**Version:** 1.0.0
**Status:** ✅ Production Ready
