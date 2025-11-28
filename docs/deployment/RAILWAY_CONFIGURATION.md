# Railway Environment Variables Configuration

## 🎯 Overview

Based on the analysis of your Railway screenshots and documentation, here's the complete configuration guide for the `aves-backend` deployment on Railway.

## 📊 Current Railway Status (from screenshots)

**Deployment Status:** Both `aves` and `aves-backend` show "Failed (3 days ago)"

**Current Variables:** 9 variables configured in Railway production environment:
- CORS_ALLOWED_ORIGINS
- DATABASE_URL
- FRONTEND_URL
- JWT_SECRET
- NODE_ENV
- PORT
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL

## ✅ Required Environment Variables for Production

### **CRITICAL (Must Have) - Add These Now:**

```bash
# ============================================================================
# AUTHENTICATION & SECURITY (Add to Railway Variables)
# ============================================================================

# JWT Configuration (ALREADY IN RAILWAY - Verify it's strong)
JWT_SECRET=d289148f64feed18738dec33874915ba7140f736c47ad9d570fad22d61e7291c
JWT_EXPIRES_IN=24h

# Session Security (MISSING - Add This)
SESSION_SECRET=614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48

# API Key (MISSING - Add This)
API_KEY_SECRET=59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=

# ============================================================================
# AI SERVICES (Add to Railway Variables)
# ============================================================================

# Anthropic Claude (MISSING - Add Your Real Key)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# ============================================================================
# DATABASE (Railway PostgreSQL or Supabase)
# ============================================================================
# If using Railway PostgreSQL (recommended):
DB_HOST=your-railway-db-host
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=your-database-password

# Database SSL (MISSING - Add for Production)
DB_SSL_ENABLED=true

# ============================================================================
# SUPABASE (ALREADY IN RAILWAY - Verify Values)
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ⚠️ WARNING: If the service role key was exposed, you MUST create a new
#    Supabase project and migrate your data. Service keys cannot be rotated.

# ============================================================================
# SERVER CONFIGURATION (Verify Current Settings)
# ============================================================================
NODE_ENV=production  # ✅ Already set in Railway
PORT=${{PORT}}       # ✅ Railway provides this automatically
FRONTEND_URL=https://aves-production.up.railway.app  # ✅ Already set

# ============================================================================
# CORS (Verify Match with FRONTEND_URL)
# ============================================================================
CORS_ALLOWED_ORIGINS=https://aves-production.up.railway.app  # ✅ Already set
CORS_CREDENTIALS=true  # MISSING - Add This

# ============================================================================
# SECURITY HEADERS (Add These for Production)
# ============================================================================
FORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
HSTS_ENABLED=true

# ============================================================================
# RATE LIMITING (Recommended for Production)
# ============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_MAX_REQUESTS=5

# ============================================================================
# OPTIONAL BUT RECOMMENDED
# ============================================================================
# Unsplash (for bird images)
UNSPLASH_ACCESS_KEY=your-new-unsplash-access-key
UNSPLASH_SECRET_KEY=your-new-unsplash-secret-key

# Logging
LOG_LEVEL=info
LOG_REQUESTS=true
```

---

## 🚨 CRITICAL: Variables That Need Immediate Attention

### 1. **Missing Critical Variables (Add These to Railway Now)**

Add these variables in Railway → aves-backend → Variables tab:

| Variable Name | Value | Priority |
|--------------|-------|----------|
| `SESSION_SECRET` | `614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48` | 🔴 CRITICAL |
| `API_KEY_SECRET` | `59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=` | 🔴 CRITICAL |
| `ANTHROPIC_API_KEY` | Your real Anthropic API key | 🔴 CRITICAL |
| `FORCE_HTTPS` | `true` | 🔴 CRITICAL |
| `SECURE_COOKIES` | `true` | 🔴 CRITICAL |
| `TRUST_PROXY` | `true` | 🔴 CRITICAL |
| `DB_SSL_ENABLED` | `true` | 🔴 CRITICAL |
| `CORS_CREDENTIALS` | `true` | 🟡 HIGH |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 🟡 HIGH |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | 🟡 HIGH |

### 2. **Verify Existing Variables**

Check these in Railway dashboard and confirm they match:

- ✅ `NODE_ENV` = `production`
- ✅ `FRONTEND_URL` = `https://aves-production.up.railway.app`
- ✅ `CORS_ALLOWED_ORIGINS` = `https://aves-production.up.railway.app`
- ⚠️ `JWT_SECRET` - Should be a long random string (not a weak default)

### 3. **Database Configuration**

**Option A: Using Railway PostgreSQL (Recommended)**
```bash
# Railway provides DATABASE_URL automatically
# You may need to add these for SSL:
DB_SSL_ENABLED=true
```

**Option B: Using Supabase Database**
```bash
# Extract from your Supabase connection string:
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password
DB_SSL_ENABLED=true
```

---

## 🔐 Security Configuration Verification

### Step 1: Verify No Development Settings in Production

**Check that these are NOT set or are set to `false`:**
- `DEV_AUTH_BYPASS=false` (or removed completely)
- `BYPASS_AUTH=false` (or removed completely)
- `VERBOSE_ERRORS=false`
- `SOURCE_MAPS=false`

### Step 2: Verify Production Security Settings

**Ensure these are set to `true`:**
- `FORCE_HTTPS=true`
- `SECURE_COOKIES=true`
- `TRUST_PROXY=true`
- `DB_SSL_ENABLED=true`
- `HSTS_ENABLED=true`

### Step 3: Check CORS Configuration

The CORS origin and frontend URL must match exactly:
```bash
FRONTEND_URL=https://aves-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://aves-production.up.railway.app
```

---

## 🔄 Credentials That Need Rotation

Based on the security audit, these credentials were exposed and **MUST** be rotated before going public:

### **Priority 1: Cannot Be Rotated (Requires New Project)**
1. ⚠️ **Supabase Service Role Key**
   - **Action Required:** Create new Supabase project and migrate data
   - **Why:** Service role keys are permanent per project
   - **Time Required:** 2-4 hours
   - **Guide:** See `CREDENTIAL_ROTATION_GUIDE.md` Section 4

### **Priority 2: Rotate Immediately**
2. 🔑 **Anthropic API Key** (exposed: `sk-ant-api03-_lKPc...`)
   - **Action:** Delete old key at console.anthropic.com, create new
   - **Update in:** Railway Variables → `ANTHROPIC_API_KEY`

3. 🔑 **Unsplash Keys** (exposed: access & secret)
   - **Action:** Rotate at unsplash.com/oauth/applications
   - **Update in:** Railway Variables → `UNSPLASH_ACCESS_KEY`, `UNSPLASH_SECRET_KEY`

4. 🔑 **Database Password** (exposed: `ymS5gBm9Wz9q1P11`)
   - **Action:** Reset in Supabase dashboard
   - **Update in:** Railway Variables → `DATABASE_URL` or `DB_PASSWORD`

### **Priority 3: Already Generated (Use These)**
5. ✅ **JWT_SECRET**
   - **New Value:** `d289148f64feed18738dec33874915ba7140f736c47ad9d570fad22d61e7291c`
   - **Update in:** Railway Variables → `JWT_SECRET`
   - ⚠️ **Effect:** All users will be logged out

6. ✅ **SESSION_SECRET**
   - **New Value:** `614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48`
   - **Add to:** Railway Variables → `SESSION_SECRET` (new)
   - ⚠️ **Effect:** All sessions invalidated

7. ✅ **API_KEY_SECRET**
   - **New Value:** `59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=`
   - **Add to:** Railway Variables → `API_KEY_SECRET` (new)

---

## 📝 Step-by-Step Configuration Instructions

### For Railway Backend (`aves-backend` service):

1. **Go to Railway Dashboard:**
   - Navigate to your project
   - Click on `aves-backend` service
   - Click on "Variables" tab

2. **Add Missing Critical Variables:**
   Click the "Add" button and add each of these:

   ```
   SESSION_SECRET = 614465a303ae2a235de0713c9a8320527fa03ddf2fb16830e4d477fbef155c48
   API_KEY_SECRET = 59C8NshwDsJdkKRuc55crpBg/S9J6EgeswxtaZ2KBqc=
   ANTHROPIC_API_KEY = [Your New Anthropic Key Here]
   FORCE_HTTPS = true
   SECURE_COOKIES = true
   TRUST_PROXY = true
   DB_SSL_ENABLED = true
   CORS_CREDENTIALS = true
   RATE_LIMIT_WINDOW_MS = 900000
   RATE_LIMIT_MAX_REQUESTS = 100
   HSTS_ENABLED = true
   ```

3. **Update Existing Variables:**
   - Update `JWT_SECRET` to the new value if it's weak
   - Verify `NODE_ENV` is set to `production`
   - Verify `FRONTEND_URL` matches your actual frontend URL

4. **Remove Development Variables (if present):**
   - Remove `DEV_AUTH_BYPASS` if it exists
   - Remove `BYPASS_AUTH` if it exists

5. **Click "Deploy" to apply changes**

---

## 🔍 Verification Checklist

After adding variables, verify:

- [ ] All 9+ required variables are present in Railway
- [ ] `NODE_ENV=production` (no dev mode)
- [ ] `JWT_SECRET` is a strong 64-character hex string
- [ ] `SESSION_SECRET` is set with the new value
- [ ] `ANTHROPIC_API_KEY` is set with your rotated key
- [ ] `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` match
- [ ] `FORCE_HTTPS=true` for SSL enforcement
- [ ] `SECURE_COOKIES=true` for cookie security
- [ ] `DB_SSL_ENABLED=true` for database encryption
- [ ] No `DEV_AUTH_BYPASS` or development flags
- [ ] Database connection works (check logs)
- [ ] Deployment succeeds (check build logs)

---

## 🐛 Troubleshooting Failed Deployments

Your screenshot shows both services failed 3 days ago. Here's how to diagnose:

### 1. Check Build Logs
```bash
# In Railway dashboard:
aves-backend → Deployments → Click latest deployment → View Logs
```

Common issues:
- Missing environment variables → Add them from this guide
- Database connection failed → Check DB_SSL_ENABLED and credentials
- Port binding issues → Verify PORT=${{PORT}}
- Module not found → Check package.json dependencies

### 2. Check Runtime Logs
Look for errors related to:
- Authentication (check JWT_SECRET, SESSION_SECRET)
- Database (check connection strings and SSL)
- CORS (check FRONTEND_URL matches CORS_ALLOWED_ORIGINS)

### 3. Test Locally First
```bash
# Set all production variables in backend/.env
# Then test:
cd backend
npm install
npm run build
npm start
```

---

## 📊 Summary of Changes Needed

### **Add to Railway (11 new variables):**
1. SESSION_SECRET
2. API_KEY_SECRET
3. ANTHROPIC_API_KEY (rotated)
4. FORCE_HTTPS
5. SECURE_COOKIES
6. TRUST_PROXY
7. DB_SSL_ENABLED
8. CORS_CREDENTIALS
9. RATE_LIMIT_WINDOW_MS
10. RATE_LIMIT_MAX_REQUESTS
11. HSTS_ENABLED

### **Update in Railway (if weak):**
1. JWT_SECRET (use new generated value)
2. SUPABASE_SERVICE_ROLE_KEY (from new project)
3. DATABASE_URL (with new password)

### **Verify in Railway (should already be correct):**
1. NODE_ENV=production
2. FRONTEND_URL=https://aves-production.up.railway.app
3. CORS_ALLOWED_ORIGINS=https://aves-production.up.railway.app

---

## 🎯 What You Need to Do Manually

I can't access Railway directly, so you need to:

1. **Log into Railway:**
   - Go to https://railway.app
   - Navigate to your `aves-backend` project

2. **Add the 11 missing variables** listed above in the "Add to Railway" section

3. **Rotate these API keys** (I can't do this):
   - Anthropic API key at https://console.anthropic.com/settings/keys
   - Unsplash keys at https://unsplash.com/oauth/applications

4. **Decide on Supabase:**
   - Option A: Create new Supabase project (recommended, 2-4 hours)
   - Option B: Continue with current project but review all RLS policies

5. **Trigger a new deployment** in Railway after adding variables

6. **Monitor the logs** to ensure successful deployment

---

## 📞 Next Steps

1. Add all missing variables from this document to Railway
2. Follow the `CREDENTIAL_ROTATION_GUIDE.md` for API key rotation
3. Test the deployment in Railway
4. Check the deployment logs for any errors
5. Verify the app is working at your production URL
6. Complete the `SECURITY_CHECKLIST.md` before making repo public

**Generated:** 2025-11-14
**Secrets Generated:** New JWT_SECRET, SESSION_SECRET, API_KEY_SECRET (see above)
