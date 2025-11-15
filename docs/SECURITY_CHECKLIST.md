# Security Checklist for Public Repository Deployment

## 🚨 CRITICAL - Do These IMMEDIATELY Before Making Repo Public

### 1. Remove All .env Files from Git History

**Check if .env files were committed:**
```bash
git log --all --full-history --oneline -- "*.env" "**/**.env"
```

**If any .env files found in history, clean them:**

#### Option A: BFG Repo-Cleaner (Recommended - Fast)
```bash
# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Backup your repo first!
cp -r aves aves-backup

# Clone a fresh copy
git clone --mirror https://github.com/yourusername/aves.git aves-mirror

# Remove all .env files
java -jar bfg.jar --delete-files "*.env" aves-mirror

# Clean up
cd aves-mirror
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push (THIS REWRITES HISTORY!)
git push --force
```

#### Option B: git filter-repo (Alternative)
```bash
# Install: pip install git-filter-repo

# Backup first!
cp -r aves aves-backup

# Remove .env files from history
git filter-repo --path-glob '*.env' --invert-paths --force

# Force push (THIS REWRITES HISTORY!)
git push --force --all
```

### 2. Rotate ALL Exposed Credentials Immediately

⚠️ **These credentials were found in .env files and MUST be rotated:**

#### A. OpenAI API Key
- **Found:** `sk-proj-MK5lkCWAt4q-_47E78VylhSTrVqM4UP_...`
- **Action:**
  1. Go to https://platform.openai.com/api-keys
  2. Delete the old key
  3. Generate new key
  4. Update in secure environment variables

#### B. Anthropic API Key
- **Found:** `sk-ant-api03-_lKPcJaUmy4ofDY2BQNSHs76B0v5qneI...`
- **Action:**
  1. Go to https://console.anthropic.com/settings/keys
  2. Delete the old key
  3. Generate new key
  4. Update in secure environment variables

#### C. Unsplash API Keys
- **Access Key Found:** `eSjXJ5k6vbf2APMbdCXGqcFIeSIy8stFN4sp3zgFjk8`
- **Secret Key Found:** `yboNFdzqugrLb2EwTjwSwRAPV49FMcIKsKXRSl3306g`
- **Action:**
  1. Go to https://unsplash.com/oauth/applications
  2. Delete old application or rotate keys
  3. Generate new keys
  4. Update in secure environment variables

#### D. Supabase Service Role Key ⚠️ CRITICAL
- **Found:** Full service role key in backend/.env
- **Action:**
  1. Go to Supabase Dashboard > Project Settings > API
  2. **Cannot rotate service role key** - It's permanent per project
  3. **Solution:** Create new Supabase project and migrate data
  4. Or: Review RLS policies and ensure they prevent abuse

#### E. Database Password
- **Found:** `ymS5gBm9Wz9q1P11` and `lsZXGgU92KhK5VqR`
- **Action:**
  1. Go to Supabase Dashboard > Project Settings > Database
  2. Reset database password
  3. Update connection strings

#### F. JWT Secrets
- **Found:** `290d3903773734282eaf8870aa1de666b6c6c8999953bfa9fbde15b1e4d7584f`
- **Action:**
  1. Generate new secret: `openssl rand -hex 32`
  2. Update JWT_SECRET in environment
  3. **NOTE:** All existing user sessions will be invalidated

#### G. Session Secret
- **Found:** `1ab7c1aba961b215ab1af5c67bf3cc7afa188fde9dd878d801bff884917b107b`
- **Action:**
  1. Generate new secret: `openssl rand -hex 32`
  2. Update SESSION_SECRET in environment
  3. All existing sessions will be invalidated

#### H. CMS Default Secrets
- **Found:** `tobemodified` for multiple CMS secrets
- **Action:**
  1. Generate strong secrets for each:
     ```bash
     echo "APP_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32)"
     echo "API_TOKEN_SALT=$(openssl rand -base64 32)"
     echo "ADMIN_JWT_SECRET=$(openssl rand -base64 32)"
     echo "TRANSFER_TOKEN_SALT=$(openssl rand -base64 32)"
     echo "JWT_SECRET=$(openssl rand -base64 32)"
     ```

### 3. Update Environment Configuration

**Set these in backend/.env (NOT committed to git):**
```env
# CRITICAL: Set production mode
NODE_ENV=production

# CRITICAL: Disable auth bypass
DEV_AUTH_BYPASS=false
BYPASS_AUTH=false

# CRITICAL: Enable HTTPS
FORCE_HTTPS=true
SECURE_COOKIES=true

# CRITICAL: Enable SSL for database
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true

# Rate limiting (adjust for production load)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# New JWT secret (generate with: openssl rand -hex 32)
JWT_SECRET=<YOUR_NEW_SECRET_HERE>

# New session secret
SESSION_SECRET=<YOUR_NEW_SECRET_HERE>

# Rotated API keys
OPENAI_API_KEY=<YOUR_NEW_KEY>
ANTHROPIC_API_KEY=<YOUR_NEW_KEY>
UNSPLASH_ACCESS_KEY=<YOUR_NEW_KEY>
UNSPLASH_SECRET_KEY=<YOUR_NEW_KEY>

# New Supabase credentials
SUPABASE_URL=<YOUR_NEW_PROJECT_URL>
SUPABASE_ANON_KEY=<YOUR_NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_NEW_SERVICE_KEY>

# New database credentials
DATABASE_URL=postgresql://postgres:<NEW_PASSWORD>@...
```

### 4. Verify .gitignore is Comprehensive

✅ **Already Updated** - .gitignore now includes:
```gitignore
# Environment - ALL .env files must be excluded
.env
.env.*
**/.env
**/.env.*
**/backend/.env
**/frontend/.env
**/cms/.env
# Only allow example files
!.env.example
!.env.*.example
```

### 5. Clean Up Git Status

```bash
# Remove .env files from git tracking (if currently tracked)
git rm --cached .env
git rm --cached backend/.env
git rm --cached frontend/.env
git rm --cached cms/.env
git rm --cached backend/.env.test

# Commit the removal
git commit -m "security: Remove .env files from git tracking"
```

### 6. Verify No Secrets in Code

**Search for potential hardcoded secrets:**
```bash
# Search for API keys
git grep -i "api[_-]key" | grep -v "env" | grep -v "example"

# Search for passwords
git grep -i "password.*=" | grep -v "env" | grep -v "example"

# Search for tokens
git grep -i "token.*=" | grep -v "env" | grep -v "example"

# Search for secrets
git grep -i "secret.*=" | grep -v "env" | grep -v "example"
```

### 7. Set Up Secure Deployment

**Option A: Environment Variables in Hosting Platform**
- Vercel: Project Settings > Environment Variables
- Heroku: Config Vars
- AWS: Systems Manager Parameter Store
- Railway: Variables tab

**Option B: Secrets Management Service**
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

### 8. Update GitHub Repository Settings

**If using GitHub Actions:**
1. Go to Repository > Settings > Secrets and variables > Actions
2. Add all production secrets as Repository Secrets
3. Verify workflows use `${{ secrets.SECRET_NAME }}` syntax

**Enable Security Features:**
1. Go to Repository > Settings > Security
2. Enable "Private vulnerability reporting"
3. Enable "Dependabot alerts"
4. Enable "Dependabot security updates"
5. Enable "Code scanning" if available

### 9. Add Security.txt

Create `public/.well-known/security.txt`:
```
Contact: security@yourdomain.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://yourdomain.com/.well-known/security.txt
```

### 10. Configure Rate Limiting in Production

Ensure production environment has proper rate limiting:
```env
# Strict production rate limits
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
RATE_LIMIT_STRICT_MAX_REQUESTS=5   # 5 for auth endpoints
```

---

## 📋 Pre-Deployment Verification Checklist

### Critical Items (Must Complete)

- [ ] All .env files removed from git history
- [ ] All credentials rotated (OpenAI, Anthropic, Unsplash, Database, JWT, Session)
- [ ] New Supabase project created (service key was exposed)
- [ ] `NODE_ENV=production` in deployment environment
- [ ] `DEV_AUTH_BYPASS=false` in production
- [ ] `FORCE_HTTPS=true` in production
- [ ] Git history cleaned of secrets (BFG or filter-repo)
- [ ] Force push completed (history rewritten)
- [ ] Team members notified to re-clone repository
- [ ] .gitignore updated and verified
- [ ] No secrets found in code (grep verification passed)

### High Priority Items

- [ ] Deployment platform configured with secrets
- [ ] GitHub Secrets configured for CI/CD
- [ ] Security features enabled on GitHub
- [ ] Rate limiting tested in staging environment
- [ ] HTTPS certificates configured
- [ ] Database SSL connections verified
- [ ] CORS origins configured for production domains
- [ ] Security headers verified (use securityheaders.com)
- [ ] CSP policy tested
- [ ] Monitoring and alerting configured

### Recommended Items

- [ ] Security.txt file added
- [ ] Dependency vulnerabilities resolved (`npm audit`)
- [ ] Penetration testing completed
- [ ] Load testing with rate limits verified
- [ ] Incident response plan documented
- [ ] Regular security audit schedule established
- [ ] Team security training completed
- [ ] Security contact email configured

---

## 🚨 After Making Repository Public

### Immediate Monitoring (First 24 Hours)

1. **Monitor API Usage:**
   - OpenAI API dashboard
   - Anthropic API dashboard
   - Unsplash API dashboard
   - Check for unusual spikes

2. **Monitor Database:**
   - Supabase logs
   - Check for unusual queries
   - Monitor connection counts

3. **Monitor Server:**
   - CPU and memory usage
   - Request patterns
   - Error rates

4. **Set Up Alerts:**
   ```env
   # Add monitoring emails to .env
   SECURITY_ALERT_EMAIL=security@yourdomain.com
   RATE_LIMIT_ALERT_THRESHOLD=80
   ```

### Weekly Security Tasks

- [ ] Review access logs for suspicious activity
- [ ] Check `npm audit` for new vulnerabilities
- [ ] Review rate limiting logs
- [ ] Check failed authentication attempts
- [ ] Review GitHub Dependabot alerts

---

## 🔥 Emergency Response Plan

### If Secrets Are Compromised After Going Public

1. **Immediate Actions:**
   ```bash
   # Take site offline immediately
   # Rotate ALL credentials
   # Review logs for unauthorized access
   # Notify affected users if data was accessed
   ```

2. **Rotation Priority Order:**
   1. Database password (highest priority)
   2. Supabase service key (create new project if needed)
   3. API keys (OpenAI, Anthropic, Unsplash)
   4. JWT and session secrets
   5. CMS secrets

3. **Communication:**
   - Email all team members
   - Post incident report (if applicable)
   - Document lessons learned

---

## 📊 Security Posture Status

### Current Status: ⚠️ NOT READY FOR PUBLIC

**Blockers:**
- [ ] .env files may be in git history
- [ ] Credentials exposed in .env files need rotation
- [ ] Git history needs cleaning

**After Completing This Checklist: ✅ READY FOR PUBLIC**

---

## 🔗 Helpful Resources

- **Git History Cleaning:** https://rtyley.github.io/bfg-repo-cleaner/
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Security Headers:** https://securityheaders.com/
- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **Have I Been Pwned:** https://haveibeenpwned.com/

---

**Last Updated:** 2025-11-03
**Review Frequency:** Before each deployment
**Next Review:** After completing all checklist items
