# Environment Configuration - Action Plan
**Date:** 2025-11-27
**Status:** Ready for Implementation

Based on the comprehensive environment configuration audit, this action plan outlines the specific steps needed to address identified issues.

---

## 🔴 CRITICAL PRIORITY (Do Immediately)

### Action 1: Remove Redundant Root .env File

**Issue:** Root `.env` file contains real credentials and duplicates backend configuration, creating confusion about which file is authoritative.

**Risk:** Medium - Potential credential exposure, configuration confusion

**Steps:**
```bash
# 1. Verify file is not tracked by git (should show in .gitignore)
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/aves
git check-ignore .env

# 2. Backup for safety (if needed for reference)
cp .env .env.backup.$(date +%Y%m%d)

# 3. Delete the file
rm .env

# 4. Verify .gitignore is working
git status | grep .env  # Should not show .env as untracked

# 5. Clean up backup after verification
rm .env.backup.*
```

**Verification:**
- [ ] Root `.env` file deleted
- [ ] `.env` not showing in `git status`
- [ ] Backend still runs correctly with `backend/.env`
- [ ] Frontend still runs correctly with `frontend/.env`

**Status:** ⏳ Pending

---

### Action 2: Secure CMS Configuration or Document Inactive Status

**Issue:** CMS `.env` file uses default placeholder values for all security secrets.

**Risk:** Critical (if CMS is active) - Complete security compromise

**Option A: If CMS is Active**
```bash
cd cms

# Generate new secure secrets
cat > .env.new << 'EOF'
HOST=0.0.0.0
PORT=1337
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=aves_cms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_SSL=false

# Generated secrets (replace these with actual generated values)
APP_KEYS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_TOKEN_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TRANSFER_TOKEN_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF

# Actually generate the secrets
echo "APP_KEYS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex') + ',' + require('crypto').randomBytes(32).toString('hex'))")"
echo "API_TOKEN_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "ADMIN_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "TRANSFER_TOKEN_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# Manually update .env with generated values
# Then verify CMS starts correctly
```

**Option B: If CMS is Inactive (Recommended if not in use)**
```bash
cd cms

# Document inactive status
cat > README.md << 'EOF'
# CMS Directory - Currently Inactive

This directory contains a Strapi CMS setup that is currently **not in use** by the Aves project.

## Status
- **Active:** No
- **Last Used:** Unknown
- **Purpose:** Originally intended for content management
- **Current State:** Configuration present but not secured

## Security Note
The `.env` file in this directory contains default placeholder values and should NOT be used in production without generating new secrets.

## Future Use
If the CMS is needed in the future:
1. Generate new secrets for all environment variables
2. Set up the database (aves_cms)
3. Configure proper authentication
4. Update this README

## Removal
This directory can be safely removed if the CMS is not planned for future use.
EOF

# Add note to .env file
cat > .env << 'EOF'
# ============================================================
# NOTICE: THIS CMS IS CURRENTLY INACTIVE
# ============================================================
# This configuration uses placeholder values and is NOT SECURE.
# Do not use in production without generating new secrets.
# See README.md for more information.
# ============================================================

HOST=0.0.0.0
PORT=1337
APP_KEYS=toBeModified1,toBeModified2
API_TOKEN_SALT=tobemodified
ADMIN_JWT_SECRET=tobemodified
TRANSFER_TOKEN_SALT=tobemodified
JWT_SECRET=tobemodified
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=aves_cms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_SSL=false
EOF
```

**Verification:**
- [ ] CMS status documented
- [ ] Security issue addressed (either secured or documented as inactive)
- [ ] README created explaining current state

**Status:** ⏳ Pending - Awaiting decision on CMS usage

---

### Action 3: Update Frontend .env.example

**Issue:** Frontend example file is outdated and missing critical Supabase configuration.

**Risk:** Medium - New developers will misconfigure the frontend

**Steps:**
```bash
cd frontend

# Create updated .env.example
cat > .env.example << 'EOF'
# ============================================================
# AVES FRONTEND - ENVIRONMENT CONFIGURATION (EXAMPLE)
# ============================================================
# This file shows the required environment variables for the frontend.
# Copy this file to .env and fill in your actual values.
# IMPORTANT: All frontend environment variables must have the VITE_ prefix
# to be exposed to the client-side code.
# ============================================================

# ----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# ----------------------------------------------------------------------------
# Your Supabase project URL
# Get this from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase anonymous/public key (safe to expose in frontend)
# Get this from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ----------------------------------------------------------------------------
# BACKEND API CONFIGURATION
# ----------------------------------------------------------------------------
# Backend API URL (local development)
# IMPORTANT: This should match the PORT setting in backend/.env
# Default backend port is 3001 (see backend/.env)
VITE_API_URL=http://localhost:3001

# ----------------------------------------------------------------------------
# CMS CONFIGURATION (OPTIONAL)
# ----------------------------------------------------------------------------
# Strapi CMS URL (if using CMS)
VITE_CMS_URL=http://localhost:1337

# CMS API token (if using CMS)
VITE_CMS_API_TOKEN=

# ----------------------------------------------------------------------------
# NOTES
# ----------------------------------------------------------------------------
# 1. All variables must start with VITE_ to be accessible in client code
# 2. Never put sensitive secrets in frontend .env (they will be exposed)
# 3. VITE_API_URL should match backend PORT (default: 3001, not 3000)
# 4. Supabase anon key is safe to expose (it's public by design)
# 5. For production, update VITE_API_URL to your production backend URL
EOF
```

**Verification:**
- [ ] New `.env.example` includes all Supabase variables
- [ ] Port number correct (3001, not 3000)
- [ ] Documentation clear and helpful
- [ ] File committed to git

**Status:** ⏳ Pending

---

## 🟡 HIGH PRIORITY (Do This Week)

### Action 4: Verify Git History Clean

**Issue:** Need to confirm no .env files were ever committed to git history.

**Risk:** High - Historical credential exposure

**Steps:**
```bash
# Already verified - no .env files found in git history
# This check was performed during the audit and came back clean

# For documentation, here's what was run:
git log --all --full-history --oneline -- ".env" "*/.env"
git log --all --full-history --oneline -- "backend/.env" "frontend/.env" "cms/.env"
git log --all --diff-filter=D --summary -- "*/.env" ".env"

# All commands returned empty results (no history)
```

**Result:** ✅ **VERIFIED CLEAN** - No .env files found in git history

**Status:** ✅ Complete

---

### Action 5: Test Database Connectivity

**Issue:** Need to verify database connection works with current configuration.

**Risk:** Medium - Application failure if connection is misconfigured

**Steps:**
```bash
cd backend

# Test 1: Quick connection test
node -e "
const { Pool } = require('pg');
require('dotenv').config();

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('pooler.supabase.com')
    ? { rejectUnauthorized: false }
    : false
});

pool.query('SELECT version(), current_database(), current_user, now()')
  .then(result => {
    console.log('✅ Database Connected Successfully!');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version.split(',')[0]);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Connection Failed:', err.message);
    console.error('Hint:', err.hint || 'Check DATABASE_URL and credentials');
    pool.end();
    process.exit(1);
  });
"

# Test 2: Run existing tests
npm test 2>&1 | grep -i "database\|connection" | head -20

# Test 3: Check if migrations work
npm run migrate:latest  # If migrations are set up
```

**Verification:**
- [ ] Connection test passes
- [ ] Can query database
- [ ] SSL connection working
- [ ] Tests pass

**Status:** ⏳ Pending

---

### Action 6: Create Environment Setup Documentation

**Issue:** No comprehensive guide for setting up environment configuration.

**Risk:** Low - But impacts developer onboarding

**Steps:**
```bash
# Document created as part of this audit
# See: docs/analysis/environment-config-status-report.md

# Additional quick reference needed in main README
# Add section to README.md explaining:
# 1. Copy .env.example files
# 2. Fill in credentials
# 3. Verify configuration
```

**Content for README.md:**
```markdown
## Environment Configuration

### Quick Setup

1. **Backend Configuration:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your credentials
   ```

2. **Frontend Configuration:**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env and add your Supabase credentials
   ```

3. **Required Credentials:**
   - Supabase account (database + auth)
   - Anthropic API key (for AI features)
   - Unsplash API key (for bird images)

4. **Verify Setup:**
   ```bash
   cd backend
   npm run test  # Should pass if configured correctly
   ```

### Detailed Documentation

For comprehensive environment configuration details, see:
- `docs/analysis/environment-config-status-report.md` - Full audit and status
- `backend/.env.example` - All backend variables explained
- `frontend/.env.example` - All frontend variables explained
```

**Verification:**
- [ ] README.md updated with environment setup section
- [ ] Links to detailed documentation
- [ ] Quick start steps clear

**Status:** ⏳ Pending

---

## 🟢 MEDIUM PRIORITY (Do This Month)

### Action 7: Review and Clean Up Redundant Files

**Issue:** Multiple .env variant files with unclear purposes.

**Files to Review:**
1. `frontend/.env.production` - Production config or example?
2. `frontend/.env.vercel` - Vercel deployment specific?
3. `backend/.env.test` - Should be generated, not committed

**Steps:**
```bash
# 1. Check if these files are in .gitignore
git check-ignore frontend/.env.production
git check-ignore frontend/.env.vercel
git check-ignore backend/.env.test

# 2. Check if they're committed
git ls-files | grep "\.env"

# 3. For each file, decide:
#    - Keep: If needed and properly documented
#    - Remove: If redundant or auto-generated
#    - Rename: If should be .example
#    - Document: Add README explaining purpose

# Example decisions:
# - .env.test -> Should be generated by test setup, not committed
# - .env.production -> If template, rename to .env.production.example
# - .env.vercel -> If Vercel-specific, document in deployment guide
```

**Verification:**
- [ ] Each .env variant file has clear purpose
- [ ] Auto-generated files not committed
- [ ] Deployment-specific files documented
- [ ] .gitignore updated if needed

**Status:** ⏳ Pending

---

### Action 8: Create Secret Rotation Schedule

**Issue:** No documented procedure for rotating secrets.

**Risk:** Low - But important for long-term security

**Create:** `docs/security/secret-rotation-guide.md`

**Content:**
```markdown
# Secret Rotation Guide

## Rotation Schedule

| Secret Type | Rotation Frequency | Last Rotated | Next Due |
|-------------|-------------------|--------------|----------|
| JWT_SECRET | Every 90 days | [Date] | [Date] |
| SESSION_SECRET | Every 90 days | [Date] | [Date] |
| API_KEY_SECRET | Every 90 days | [Date] | [Date] |
| Anthropic API Key | Annually | [Date] | [Date] |
| Unsplash API Keys | Annually | [Date] | [Date] |
| Database Password | On personnel change | [Date] | As needed |

## Rotation Procedures

### JWT Secret Rotation
1. Generate new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update backend/.env
3. Update Railway environment variables (if deployed)
4. Restart backend service
5. All users will need to re-login
6. Update rotation date above

### API Key Rotation
[Procedures for each API key type]

## Emergency Rotation

If credentials are compromised:
1. Immediately rotate all potentially affected secrets
2. Check logs for unauthorized access
3. Notify team
4. Document incident
```

**Status:** ⏳ Pending

---

### Action 9: Add Environment Validation Script

**Issue:** No automated way to verify environment configuration is complete.

**Create:** `scripts/validate-env.js`

**Content:**
```javascript
#!/usr/bin/env node
/**
 * Environment Validation Script
 * Validates that all required environment variables are set
 * Run before deployment or in CI/CD pipeline
 */

const path = require('path');
const fs = require('fs');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Required variables for backend
const BACKEND_REQUIRED = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
  'ANTHROPIC_API_KEY',
  'UNSPLASH_ACCESS_KEY'
];

// Required variables for frontend
const FRONTEND_REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL'
];

function validateBackend() {
  log('\n📋 Validating Backend Environment...', 'blue');

  const envPath = path.join(__dirname, '../backend/.env');
  if (!fs.existsSync(envPath)) {
    log('❌ backend/.env not found!', 'red');
    return false;
  }

  require('dotenv').config({ path: envPath });

  let valid = true;
  BACKEND_REQUIRED.forEach(varName => {
    if (!process.env[varName]) {
      log(`❌ Missing: ${varName}`, 'red');
      valid = false;
    } else if (process.env[varName].includes('your_') ||
               process.env[varName].includes('tobemodified')) {
      log(`⚠️  Placeholder detected: ${varName}`, 'yellow');
      valid = false;
    } else {
      log(`✅ ${varName}`, 'green');
    }
  });

  // Check JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    log('⚠️  JWT_SECRET should be at least 32 characters', 'yellow');
    valid = false;
  }

  return valid;
}

function validateFrontend() {
  log('\n📋 Validating Frontend Environment...', 'blue');

  const envPath = path.join(__dirname, '../frontend/.env');
  if (!fs.existsSync(envPath)) {
    log('❌ frontend/.env not found!', 'red');
    return false;
  }

  // Clear previous env vars
  BACKEND_REQUIRED.forEach(v => delete process.env[v]);

  require('dotenv').config({ path: envPath });

  let valid = true;
  FRONTEND_REQUIRED.forEach(varName => {
    if (!process.env[varName]) {
      log(`❌ Missing: ${varName}`, 'red');
      valid = false;
    } else if (process.env[varName].includes('your_')) {
      log(`⚠️  Placeholder detected: ${varName}`, 'yellow');
      valid = false;
    } else {
      log(`✅ ${varName}`, 'green');
    }
  });

  return valid;
}

// Main execution
log('🔍 Aves Environment Validation', 'blue');
log('================================\n', 'blue');

const backendValid = validateBackend();
const frontendValid = validateFrontend();

log('\n================================', 'blue');
if (backendValid && frontendValid) {
  log('✅ All environment variables are valid!', 'green');
  process.exit(0);
} else {
  log('❌ Environment validation failed!', 'red');
  log('Please check the errors above and update your .env files.', 'yellow');
  process.exit(1);
}
```

**Usage:**
```bash
# Make executable
chmod +x scripts/validate-env.js

# Run validation
node scripts/validate-env.js

# Add to package.json scripts
"scripts": {
  "validate-env": "node scripts/validate-env.js",
  "prestart": "npm run validate-env"
}
```

**Status:** ⏳ Pending

---

## 📊 Progress Tracking

### Overall Status

| Priority | Total Actions | Complete | Pending | Progress |
|----------|--------------|----------|---------|----------|
| Critical | 3 | 0 | 3 | 0% |
| High | 3 | 1 | 2 | 33% |
| Medium | 3 | 0 | 3 | 0% |
| **Total** | **9** | **1** | **8** | **11%** |

### Completion Checklist

#### Critical (Must Do Before Production)
- [ ] Action 1: Remove root .env file
- [ ] Action 2: Secure CMS or document inactive
- [ ] Action 3: Update frontend .env.example

#### High (Complete This Week)
- [x] Action 4: Verify git history (CLEAN ✅)
- [ ] Action 5: Test database connectivity
- [ ] Action 6: Create environment setup docs

#### Medium (Ongoing Improvements)
- [ ] Action 7: Clean up redundant files
- [ ] Action 8: Create rotation schedule
- [ ] Action 9: Add validation script

---

## 🎯 Success Criteria

**Definition of Done:**
1. ✅ All critical actions complete
2. ✅ All high priority actions complete
3. ✅ Environment validation script passes
4. ✅ Database connectivity confirmed
5. ✅ Documentation complete and accurate
6. ✅ No security warnings in audit

**Target Completion:** 2025-12-04 (1 week from audit date)

---

## 📞 Support

If you encounter issues while implementing these actions:

1. **Database Connection Issues:** See `docs/deployment/RAILWAY_CONFIGURATION.md`
2. **Supabase Setup:** See `docs/guides/SETUP.md`
3. **Security Questions:** See `docs/security/SECURITY.md`
4. **General Help:** Check README.md or project documentation

---

**Document Version:** 1.0
**Last Updated:** 2025-11-27
**Next Review:** After all actions complete
