# Credential Rotation Guide

## 🔄 Complete Guide to Rotating All Exposed Credentials

This guide provides step-by-step instructions for rotating every credential that was found in the security audit.

---

## 1. OpenAI API Key

**Current Exposed Key:** `sk-proj-MK5lkCWAt4q-_47E78Vylh...` (PARTIAL)

### Steps to Rotate:

1. **Log in to OpenAI Platform:**
   - Visit: https://platform.openai.com/api-keys
   - Sign in with your account

2. **Delete Old Key:**
   - Find the exposed key in your key list
   - Click the delete/revoke button
   - Confirm deletion

3. **Create New Key:**
   - Click "+ Create new secret key"
   - Name it: `aves-production-api-key`
   - Copy the key immediately (shown only once)
   - Store securely in password manager

4. **Update Environment:**
   ```bash
   # In production environment
   OPENAI_API_KEY=sk-proj-<your-new-key-here>
   ```

5. **Verify:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

---

## 2. Anthropic API Key

**Current Exposed Key:** `sk-ant-api03-_lKPcJaUmy4ofDY2BQNSHs...` (PARTIAL)

### Steps to Rotate:

1. **Log in to Anthropic Console:**
   - Visit: https://console.anthropic.com/settings/keys
   - Sign in with your account

2. **Delete Old Key:**
   - Find the exposed key
   - Click "Delete"
   - Confirm deletion

3. **Create New Key:**
   - Click "Create Key"
   - Name it: `aves-production`
   - Copy the key (shown only once)
   - Store securely

4. **Update Environment:**
   ```bash
   # In production environment
   ANTHROPIC_API_KEY=sk-ant-api03-<your-new-key-here>
   ```

5. **Verify:**
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
   ```

---

## 3. Unsplash API Keys

**Current Exposed:**
- **Access Key:** `eSjXJ5k6vbf2APMbdCXGqcFIeSIy8stFN4sp3zgFjk8`
- **Secret Key:** `yboNFdzqugrLb2EwTjwSwRAPV49FMcIKsKXRSl3306g`

### Steps to Rotate:

1. **Log in to Unsplash:**
   - Visit: https://unsplash.com/oauth/applications
   - Sign in with your account

2. **Find Your Application:**
   - Locate your "Aves" application
   - Click on it to view details

3. **Option A: Regenerate Keys (if available):**
   - Look for "Regenerate" or "Rotate" button
   - Click and confirm
   - Copy new keys immediately

4. **Option B: Create New Application:**
   - Click "New Application"
   - Fill in details:
     - App name: "Aves Production"
     - Description: "Visual Spanish Bird Learning Platform"
   - Accept terms
   - Copy Access Key and Secret Key

5. **Update Environment:**
   ```bash
   UNSPLASH_ACCESS_KEY=<new-access-key>
   UNSPLASH_SECRET_KEY=<new-secret-key>
   ```

6. **Verify:**
   ```bash
   curl https://api.unsplash.com/photos/random \
     -H "Authorization: Client-ID $UNSPLASH_ACCESS_KEY"
   ```

---

## 4. Supabase Credentials ⚠️ CRITICAL

**Current Exposed:**
- **Service Role Key:** Full key exposed in backend/.env
- **Anon Key:** Full key exposed
- **Database Password:** `ymS5gBm9Wz9q1P11`

### ⚠️ Important: Service Role Key Cannot Be Rotated

The Supabase Service Role Key is permanent per project. Since it was exposed, you have two options:

### Option A: Create New Supabase Project (RECOMMENDED)

1. **Create New Project:**
   - Go to: https://supabase.com/dashboard
   - Click "New Project"
   - Name: "aves-production"
   - Choose region (same as current for migration ease)
   - Generate strong database password:
     ```bash
     openssl rand -base64 32
     ```
   - Save credentials securely

2. **Copy Database Schema:**
   ```bash
   # Export from old project
   pg_dump "postgresql://postgres:OLD_PASSWORD@OLD_HOST:5432/postgres" \
     --schema-only > schema.sql

   # Import to new project
   psql "postgresql://postgres:NEW_PASSWORD@NEW_HOST:5432/postgres" \
     < schema.sql
   ```

3. **Migrate Data:**
   ```bash
   # Export data
   pg_dump "postgresql://postgres:OLD_PASSWORD@OLD_HOST:5432/postgres" \
     --data-only --exclude-table=auth.* > data.sql

   # Import data
   psql "postgresql://postgres:NEW_PASSWORD@NEW_HOST:5432/postgres" \
     < data.sql
   ```

4. **Update Environment:**
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   DATABASE_URL=postgresql://postgres:NEW_PASSWORD@NEW_HOST:5432/postgres
   ```

5. **Test Thoroughly:**
   - Test authentication
   - Test database queries
   - Test RLS policies
   - Verify all features work

6. **Switch Over:**
   - Update production environment variables
   - Monitor for issues
   - Keep old project active for 7 days as backup
   - Then delete old project

### Option B: Enhanced Security on Current Project (NOT RECOMMENDED)

If you cannot migrate immediately:

1. **Review All RLS Policies:**
   ```sql
   -- List all tables without RLS
   SELECT schemaname, tablename
   FROM pg_tables
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
   AND tablename NOT IN (
     SELECT tablename FROM pg_policies
   );
   ```

2. **Enable RLS on All Tables:**
   ```sql
   -- For each table found above
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   -- Create strict policies
   CREATE POLICY "Users can only view their own data"
     ON table_name FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Restrict Service Key Usage:**
   - Only use service key on backend
   - Never expose in frontend
   - Add IP restrictions if possible
   - Monitor usage closely

4. **Reset Database Password:**
   - Go to Project Settings > Database
   - Click "Reset database password"
   - Generate strong password: `openssl rand -base64 32`
   - Update DATABASE_URL

---

## 5. JWT Secret

**Current Exposed:** `290d3903773734282eaf8870aa1de666b6c6c8999953bfa9fbde15b1e4d7584f`

### Steps to Rotate:

1. **Generate New Secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Update Environment:**
   ```bash
   JWT_SECRET=<your-new-64-character-hex-string>
   ```

3. **⚠️ Important Effects:**
   - All existing JWT tokens will become invalid
   - All users will be logged out
   - Users must log in again

4. **Deployment Strategy:**
   ```bash
   # Option A: Immediate rotation (logs everyone out)
   # Just update JWT_SECRET and deploy

   # Option B: Graceful rotation (support both keys temporarily)
   # Requires code changes to verify against both old and new keys
   ```

5. **Verify:**
   ```bash
   # Test login endpoint
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

---

## 6. Session Secret

**Current Exposed:** `1ab7c1aba961b215ab1af5c67bf3cc7afa188fde9dd878d801bff884917b107b`

### Steps to Rotate:

1. **Generate New Secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Update Environment:**
   ```bash
   SESSION_SECRET=<your-new-64-character-hex-string>
   ```

3. **⚠️ Important Effects:**
   - All existing sessions will become invalid
   - Users will be logged out
   - Similar to JWT rotation

4. **Verify:**
   - Test login and session persistence
   - Verify session cookies are created
   - Test session-based features

---

## 7. CMS Secrets (Strapi)

**Current Exposed:** All set to `tobemodified`

### Steps to Rotate:

1. **Generate All New Secrets:**
   ```bash
   # Generate 5 different secrets
   echo "APP_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32)"
   echo "API_TOKEN_SALT=$(openssl rand -base64 32)"
   echo "ADMIN_JWT_SECRET=$(openssl rand -base64 32)"
   echo "TRANSFER_TOKEN_SALT=$(openssl rand -base64 32)"
   echo "JWT_SECRET=$(openssl rand -base64 32)"
   ```

2. **Update cms/.env:**
   ```bash
   APP_KEYS=<key1>,<key2>
   API_TOKEN_SALT=<salt>
   ADMIN_JWT_SECRET=<secret>
   TRANSFER_TOKEN_SALT=<salt>
   JWT_SECRET=<secret>
   ```

3. **Reset CMS Database Password:**
   ```bash
   DATABASE_PASSWORD=<strong-password>
   ```

4. **⚠️ Important Effects:**
   - All CMS admin users will be logged out
   - API tokens will be invalidated
   - Transfer tokens will be invalidated

5. **Verify:**
   - Access CMS admin panel
   - Test API token authentication
   - Verify content delivery works

---

## 8. Flow-Nexus JWT Token

**Current Exposed:** Full JWT token in root .env

### Steps to Rotate:

1. **Log Out from Flow-Nexus:**
   ```bash
   npx flow-nexus@latest logout
   ```

2. **Log In Again:**
   ```bash
   npx flow-nexus@latest login
   ```

3. **Update Environment:**
   - Token is usually stored automatically
   - If manual storage needed:
     ```bash
     FLOW_NEXUS_TOKEN=<new-token>
     ```

4. **Verify:**
   ```bash
   npx flow-nexus@latest status
   ```

---

## 9. Database Passwords

**Current Exposed:**
- `ymS5gBm9Wz9q1P11` (Supabase)
- `lsZXGgU92KhK5VqR` (root .env)
- `postgres` (CMS - default password)

### Steps to Rotate:

#### For Supabase Database:

1. **Go to Supabase Dashboard:**
   - Project Settings > Database
   - Click "Reset database password"

2. **Generate Strong Password:**
   ```bash
   openssl rand -base64 32
   ```

3. **Update All Connection Strings:**
   ```bash
   DATABASE_URL=postgresql://postgres:<NEW_PASSWORD>@db.xxx.supabase.co:5432/postgres
   ```

#### For CMS Database:

1. **Connect to PostgreSQL:**
   ```bash
   psql -U postgres
   ```

2. **Change Password:**
   ```sql
   ALTER USER postgres WITH PASSWORD '<new-strong-password>';
   ```

3. **Update cms/.env:**
   ```bash
   DATABASE_PASSWORD=<new-password>
   ```

---

## 📋 Rotation Checklist

Complete this checklist in order:

### Critical Rotations (Do First)

- [ ] Create new Supabase project (if using Option A)
- [ ] Migrate database schema and data
- [ ] Rotate database passwords
- [ ] Rotate Supabase service role key (via new project)
- [ ] Update all DATABASE_URL references

### API Key Rotations (Do Second)

- [ ] Rotate OpenAI API key
- [ ] Rotate Anthropic API key
- [ ] Rotate Unsplash access key
- [ ] Rotate Unsplash secret key
- [ ] Verify all API integrations work

### Authentication Rotations (Do Third)

- [ ] Rotate JWT_SECRET
- [ ] Rotate SESSION_SECRET
- [ ] Rotate CMS secrets (5 total)
- [ ] Notify users of forced logout

### Service Token Rotations (Do Fourth)

- [ ] Rotate Flow-Nexus token
- [ ] Update any other service tokens
- [ ] Verify service integrations

### Verification (Do Last)

- [ ] Test all authentication flows
- [ ] Test all API integrations
- [ ] Test database connectivity
- [ ] Test CMS access
- [ ] Monitor for errors in production

---

## 🔐 Secret Generation Quick Reference

```bash
# Generate 32-character hex (64 chars) - for JWT, Session
openssl rand -hex 32

# Generate 32-byte base64 (44 chars) - for CMS
openssl rand -base64 32

# Generate 16-character alphanumeric - for database passwords
openssl rand -base64 16 | tr -d "=+/" | cut -c1-16

# Generate 64-character alphanumeric - for ultra-secure secrets
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
```

---

## 🚨 Emergency Contacts

If you need help with rotation:

- **OpenAI Support:** https://help.openai.com/
- **Anthropic Support:** support@anthropic.com
- **Unsplash Support:** support@unsplash.com
- **Supabase Support:** https://supabase.com/support
- **GitHub Security:** https://github.com/security

---

## 📊 Post-Rotation Verification

After completing all rotations:

1. **Test All Features:**
   - User registration
   - User login
   - API requests
   - Database queries
   - Image searches (Unsplash)
   - AI features (OpenAI, Anthropic)
   - CMS access

2. **Monitor for Issues:**
   - Check application logs
   - Monitor error rates
   - Watch for authentication failures
   - Verify API usage patterns

3. **Document What Changed:**
   - Update internal docs with new credential locations
   - Update team password manager
   - Update deployment documentation

---

**Estimated Time to Complete Full Rotation:** 2-4 hours

**Recommended:** Do this during low-traffic period with team available for support.

**Last Updated:** 2025-11-03
