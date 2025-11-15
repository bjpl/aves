# Secure Production Deployment - Step by Step

## 🎯 Goal
Get your app running on Railway with ALL new, secure credentials.

---

## 📋 STEP 1: Create New Supabase Project (30 min)

### 1.1 Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Click **"New Project"**

### 1.2 Configure New Project
```
Organization: [Your org]
Name: aves-production
Database Password: [Generate strong password - see below]
Region: [Same as your current project for easier migration]
```

**Generate Strong Database Password:**
```bash
# Run this command locally:
openssl rand -base64 32
```
Copy the output and use it as your database password.

### 1.3 Wait for Project Creation
- Takes 2-3 minutes
- Don't close the browser

### 1.4 Save New Credentials

Once created, go to **Project Settings → API**:

Copy these THREE values:
```
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ANON_KEY: eyJhbGc... (long token)
SUPABASE_SERVICE_ROLE_KEY: eyJhbGc... (long token, KEEP SECRET!)
```

Go to **Project Settings → Database**:

Copy the connection string:
```
DATABASE_URL: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**SAVE ALL OF THESE** - You'll need them in Step 3.

---

## 📋 STEP 2: Migrate Database Schema (45 min)

### 2.1 Check Your Current Schema

Do you have database tables with data in your old Supabase project?

**Check at:** https://supabase.com/dashboard → [Old Project] → Table Editor

### 2.2 If YES - Migrate Schema and Data

**Option A: Use Supabase Migration Tool (Easiest)**

1. In OLD project: Go to **Settings → Database**
2. Scroll to "Database Schema"
3. Click **"Download Schema SQL"**
4. Save the file

5. In NEW project: Go to **SQL Editor**
6. Click **"New Query"**
7. Paste the schema SQL
8. Click **"Run"**

**Option B: Manual Migration (if you have the schema files)**

If your schema is in code (e.g., `backend/src/database/schema.sql`):

```bash
# From your local machine:
psql "postgresql://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT].supabase.co:5432/postgres" < backend/src/database/schema.sql
```

### 2.3 If NO - Fresh Start

Skip migration, you'll start with empty tables.

---

## 📋 STEP 3: Configure Railway with NEW Credentials (10 min)

### 3.1 Go to Railway Dashboard
- Visit: https://railway.app
- Click your project
- Click **`aves-backend`** service
- Click **"Variables"** tab

### 3.2 Add/Update ALL These Variables

Click "Add" or click existing variable to edit:

```bash
# ============================================
# SUPABASE (NEW PROJECT - SECURE)
# ============================================
SUPABASE_URL=https://[YOUR-NEW-PROJECT].supabase.co
SUPABASE_ANON_KEY=[Your new anon key from Step 1.4]
SUPABASE_SERVICE_ROLE_KEY=[Your new service role key from Step 1.4]

# ============================================
# DATABASE (NEW SUPABASE PROJECT)
# ============================================
DATABASE_URL=postgresql://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT].supabase.co:5432/postgres
DB_HOST=db.[NEW-PROJECT].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[Your new database password from Step 1.2]
DB_SSL_ENABLED=true

# ============================================
# AUTHENTICATION & SECURITY (NEW GENERATED)
# ============================================
JWT_SECRET=d289148f64feed18738dec33874915ba7140f736c47ad9d570fad22d61e7291c
SESSION_SECRET=614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48
API_KEY_SECRET=59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=

# ============================================
# AI SERVICES (YOUR NEW ROTATED KEYS)
# ============================================
ANTHROPIC_API_KEY=<your-new-rotated-anthropic-key>
UNSPLASH_ACCESS_KEY=AMUimVou5HrfA-QJjW8MYCzLWkSBbc7blTIiTut0G7g
UNSPLASH_SECRET_KEY=UfURFD_38oCu3UgnUwr77HOAn51ONkQVB6aBQJZXOLc

# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=${{PORT}}
FRONTEND_URL=https://aves-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://aves-production.up.railway.app

# ============================================
# SECURITY SETTINGS (PRODUCTION)
# ============================================
FORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
HSTS_ENABLED=true

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_MAX_REQUESTS=5

# ============================================
# CORS
# ============================================
CORS_CREDENTIALS=true

# ============================================
# IMPORTANT: REMOVE THESE IF THEY EXIST
# ============================================
# Delete these variables if present:
# DEV_AUTH_BYPASS
# BYPASS_AUTH
```

### 3.3 Save and Wait for Deployment

Railway will automatically redeploy (takes 2-3 minutes).

---

## 📋 STEP 4: Update Local Development .env (5 min)

**Edit:** `backend/.env`

Update these sections:

```bash
# ========================================
# SUPABASE CONFIGURATION (NEW PROJECT)
# ========================================
SUPABASE_URL=https://[YOUR-NEW-PROJECT].supabase.co
SUPABASE_ANON_KEY=[Your new anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your new service role key]

# Database Configuration (New Supabase)
DB_HOST=db.[NEW-PROJECT].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[Your new database password]
DATABASE_URL=postgresql://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT].supabase.co:5432/postgres

# ========================================
# SECURITY KEYS (NEW GENERATED)
# ========================================
JWT_SECRET=d289148f64feed18738dec33874915ba7140f736c47ad9d570fad22d61e7291c
SESSION_SECRET=614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48
API_KEY_SECRET=59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=

# ========================================
# ANTHROPIC CLAUDE (NEW KEY)
# ========================================
ANTHROPIC_API_KEY=<your-new-rotated-anthropic-key>

# ========================================
# UNSPLASH (NEW KEYS)
# ========================================
UNSPLASH_ACCESS_KEY=AMUimVou5HrfA-QJjW8MYCzLWkSBbc7blTIiTut0G7g
UNSPLASH_SECRET_KEY=UfURFD_38oCu3UgnUwr77HOAn51ONkQVB6aBQJZXOLc
```

---

## 📋 STEP 5: Test Everything (15 min)

### 5.1 Check Railway Deployment

**In Railway Dashboard:**
1. Go to `aves-backend` → Deployments
2. Click latest deployment
3. Check Deploy Logs

**Look for:**
✅ `Server started on port 3001`
✅ `Connected to database`
✅ Deployment shows "Running" (green)

**If you see errors:**
- Share the Deploy Logs with me
- I'll help diagnose

### 5.2 Test Local Development

```bash
cd backend
npm run dev
```

**Should see:**
```
✅ Server started on port 3001
✅ Connected to database
```

### 5.3 Test API Endpoints

**Test health check:**
```bash
curl https://aves-backend-production.up.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"2025-11-14T..."}
```

---

## 📋 STEP 6: Delete Old Supabase Project (After Testing)

⚠️ **WAIT 7 DAYS** before doing this (keep as backup during testing)

1. Go to old Supabase project: https://supabase.com/dashboard
2. Click **Settings → General**
3. Scroll to "Danger Zone"
4. Click **"Delete Project"**
5. Type project name to confirm

This ensures the exposed service role key is completely revoked.

---

## ✅ Final Verification Checklist

After completing all steps:

- [ ] New Supabase project created
- [ ] Database schema migrated (if applicable)
- [ ] All Railway variables updated with NEW credentials
- [ ] Local .env updated with NEW credentials
- [ ] Railway deployment succeeded
- [ ] Local development works
- [ ] API health check responds
- [ ] No exposed credentials in use
- [ ] Old Supabase project scheduled for deletion (in 7 days)

---

## 🎯 Summary of ALL New Credentials

**Generated Today:**
- ✅ JWT_SECRET (new)
- ✅ SESSION_SECRET (new)
- ✅ API_KEY_SECRET (new)
- ✅ Anthropic API key (rotated)
- ✅ Unsplash keys (rotated)

**Created in Step 1:**
- ✅ New Supabase project URL
- ✅ New Supabase anon key
- ✅ New Supabase service role key
- ✅ New database password

**ALL credentials are now secure and not exposed!** 🎉

---

## 🆘 If You Get Stuck

At any step, share:
1. Which step you're on
2. The error message or issue
3. Screenshot if helpful

I'll help you through it!

---

**Time Investment:**
- Supabase setup: 30 min
- Migration: 45 min (or 5 min if no data)
- Railway config: 10 min
- Local config: 5 min
- Testing: 15 min
- **Total: 1.5 - 2 hours**

**Result: Fully secure, production-ready deployment!**
