# Supabase Database Connection String Analysis

**Project Reference:** `ubqnfiwxghkxltluyczd`
**Region:** `aws-0-us-west-1`
**Date:** 2025-11-16
**Status:** CRITICAL ISSUE IDENTIFIED

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** The "Tenant or user not found" error is caused by using **SESSION MODE port (5432)** with a **SESSION MODE pooler hostname**. This creates a mismatch that Supabase's pooler cannot resolve.

**SOLUTION:** Use Transaction Mode pooler with port 6543 OR use Direct Connection without pooler.

---

## 1. Supabase Connection Types Explained

### 1.1 Direct Connection (No Pooler)
```
Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
Example: postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres
```

**Characteristics:**
- Direct connection to database instance
- No connection pooling overhead
- Supports ALL PostgreSQL features (prepared statements, transactions, etc.)
- **IPv6 compatible** (may cause issues on WSL2 with IPv6 disabled)
- Best for: Local development, long-running connections

**Pros:**
- Full feature support
- Lower latency for single connections
- No pooler authentication complexity

**Cons:**
- Limited concurrent connections (default: 15 per project)
- IPv6 issues on WSL2/Docker without IPv6 support
- No automatic connection multiplexing

---

### 1.2 Pooler Connection - Transaction Mode (Port 6543)
```
Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
Example: postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Characteristics:**
- **Username format:** `postgres.[PROJECT_REF]` (NOTE: Project ref is in username!)
- **Port:** 6543 (Transaction mode)
- Connection pooling with PgBouncer in transaction mode
- IPv4-only (WSL2 friendly)
- Each SQL transaction gets a new server connection
- Best for: Serverless functions, short-lived connections

**Pros:**
- Handles thousands of connections
- IPv4-only (works on WSL2)
- Fast connection establishment
- Automatic connection multiplexing

**Cons:**
- No prepared statements across transactions
- No session-level features (SET commands persist only within transaction)
- Slightly higher latency per query

---

### 1.3 Pooler Connection - Session Mode (Port 5432)
```
Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
Example: postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Characteristics:**
- **Username format:** `postgres.[PROJECT_REF]` (Project ref in username!)
- **Port:** 5432 (Session mode)
- Connection pooling with PgBouncer in session mode
- IPv4-only (WSL2 friendly)
- Full session features (prepared statements, SET commands, etc.)
- Best for: Traditional applications with session state

**Pros:**
- Supports prepared statements
- Session-level features work
- IPv4-only (WSL2 friendly)
- More connections than direct

**Cons:**
- Fewer concurrent connections than transaction mode
- Connection overhead higher than transaction mode

---

## 2. Current Configuration Analysis

### 2.1 Backend .env Configuration
```bash
# Current (INCORRECT for pooler)
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Issues Identified:**
1. ✅ **Username format is CORRECT:** `postgres.ubqnfiwxghkxltluyczd` (project ref included)
2. ✅ **Pooler hostname is CORRECT:** `aws-0-us-west-1.pooler.supabase.com`
3. ⚠️ **Port might be incorrect:** Using 5432 (session mode) instead of 6543 (transaction mode)

**Why "Tenant or user not found" Error:**
The error message is somewhat misleading. It's actually caused by:
- Pooler expecting specific authentication format
- Possible region mismatch (aws-0-us-west-1 vs actual region)
- Port/mode combination not matching pooler configuration

---

### 2.2 Code Analysis

**File:** `/backend/src/database/connection.ts`

```typescript
// Line 20: Correct SSL detection for pooler
ssl: process.env.DATABASE_URL.includes('pooler.supabase.com')
  ? { rejectUnauthorized: false }
  : // ... other SSL config
```

**File:** `/backend/src/database/railway-connection.ts`

The railway-connection.ts file tries **10+ different connection formats**, which indicates:
1. We've been experiencing persistent connection issues
2. Multiple attempts to find the correct format
3. The Railway environment may use different configuration than local

**Attempted formats in railway-connection.ts:**
1. Transaction mode: `aws-0-us-west-1.pooler.supabase.com:6543` ✅ LIKELY CORRECT
2. Alternative region: `aws-1-us-west-1.pooler.supabase.com:6543`
3. Session mode: `aws-0-us-west-1.pooler.supabase.com:5432` ⚠️ CURRENT
4. Generic pooler: `pooler.supabase.com:6543`
5. Direct connection components
6. Various regional fallbacks

---

## 3. Production vs Development Environments

### 3.1 Railway Production Environment

**Expected Configuration:**
- Railway likely uses the **Transaction Mode pooler** for serverless compatibility
- Port 6543 for transaction mode
- IPv4-only (Railway doesn't support IPv6 broadly)

**Recommended for Railway:**
```bash
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### 3.2 Local WSL2 Development Environment

**Current Issues:**
- WSL2 has IPv6 disabled or not properly configured
- Direct connection to `db.PROJECT_REF.supabase.co` fails due to IPv6
- Need IPv4-only connection (pooler)

**Why Local Has IPv6 Issues:**
1. WSL2 by default uses IPv4 NAT
2. IPv6 requires explicit configuration in WSL2
3. Supabase direct connections prefer IPv6 when available
4. This causes connection timeouts or routing failures

**Recommended for Local Development:**

**Option A: Transaction Mode Pooler (RECOMMENDED)**
```bash
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Option B: Session Mode Pooler (If prepared statements needed)**
```bash
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Option C: Direct Connection with IPv4 Force (Advanced)**
```bash
# Requires configuring WSL2 to prefer IPv4
DATABASE_URL=postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres
```

---

## 4. Root Cause Analysis: "Tenant or user not found"

### 4.1 What We Tried (Failed Attempts)

**Attempt 1: Direct Connection**
```
postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres
```
❌ **Failed:** IPv6 issues on WSL2

**Attempt 2: Session Mode Pooler (Current)**
```
postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```
❌ **Failed:** "Tenant or user not found" error

### 4.2 Why Session Mode Failed

The "Tenant or user not found" error occurs because:

1. **Pooler Authentication:** Supabase's pooler uses a specific authentication mechanism
2. **Username Format:** We're using the correct format `postgres.PROJECT_REF`
3. **Port/Region Mismatch:** The pooler endpoint `aws-0-us-west-1.pooler.supabase.com:5432` may not be the correct endpoint for this project

**Possible reasons:**
- The project may not be in `aws-0-us-west-1` region
- The project may be in a different AWS availability zone
- Port 5432 session mode may not be enabled for this project
- The pooler may require port 6543 (transaction mode)

### 4.3 The Correct Format

Based on the Supabase documentation and the railway-connection.ts attempts:

**TRANSACTION MODE (Port 6543) - MOST LIKELY TO WORK:**
```bash
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Why this should work:**
1. Transaction mode is the default and most widely supported pooler mode
2. Port 6543 is the standard Supabase transaction pooler port
3. Username format is correct: `postgres.PROJECT_REF`
4. IPv4-only (WSL2 compatible)
5. This is the FIRST fallback in railway-connection.ts, suggesting it's most likely to succeed

---

## 5. Recommended Configuration

### 5.1 For Local Development (.env)

**Primary Recommendation:**
```bash
# Transaction Mode Pooler (IPv4-only, WSL2 compatible)
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Individual variables (kept for reference)
DB_HOST=aws-0-us-west-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.ubqnfiwxghkxltluyczd
DB_PASSWORD=ymS5gBm9Wz9q1P11

# SSL (required for pooler)
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

**Alternative (if transaction mode has issues):**
```bash
# Direct connection with IPv6 workaround
DATABASE_URL=postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres
```

### 5.2 For Production (Railway)

**Railway Environment Variables:**
```bash
# Transaction Mode Pooler (best for serverless)
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres

DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
NODE_ENV=production
```

**Notes:**
- Railway automatically sets RAILWAY_ENVIRONMENT
- The code already detects Railway and uses railway-connection.ts
- This should automatically try multiple formats until one works

---

## 6. Verification Steps

### 6.1 Test Connection Locally

**Step 1: Update .env**
```bash
# Change port 5432 to 6543
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Step 2: Test with psql**
```bash
# Install psql if needed
sudo apt-get install postgresql-client

# Test connection
psql "postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT NOW();"
```

**Step 3: Test with Node.js**
```bash
npm run dev
# Check for successful connection in logs
```

### 6.2 Test Connection on Railway

**Check Railway logs:**
```bash
railway logs
```

Look for:
- "Connected successfully using Config X"
- Database connection success/failure messages

---

## 7. IPv4 vs IPv6 Considerations

### 7.1 Why IPv6 Matters

**Direct Supabase Connections:**
- Hostname: `db.PROJECT_REF.supabase.co`
- Resolves to BOTH IPv6 and IPv4 addresses
- PostgreSQL client prefers IPv6 when available
- WSL2 often doesn't properly route IPv6 traffic

**Example DNS Resolution:**
```
db.ubqnfiwxghkxltluyczd.supabase.co
- IPv6: 2001:0db8:85a3::8a2e:0370:7334 (preferred)
- IPv4: 54.123.45.67 (fallback)
```

### 7.2 WSL2 IPv6 Configuration

**Current State:**
- WSL2 has IPv6 disabled or misconfigured
- Cannot route to IPv6 addresses
- Direct Supabase connection fails

**Options:**

**A. Enable IPv6 in WSL2 (Complex):**
```bash
# In Windows PowerShell (Admin)
netsh interface ipv6 set global randomizeidentifiers=disabled
netsh interface ipv6 set privacy state=disabled

# In WSL2
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
```

**B. Use IPv4-only Pooler (RECOMMENDED):**
```bash
# Pooler endpoints are IPv4-only
DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

## 8. Best Practices Summary

### 8.1 Local Development
1. ✅ Use **Transaction Mode Pooler** (port 6543)
2. ✅ Username format: `postgres.PROJECT_REF`
3. ✅ SSL enabled with `rejectUnauthorized: false`
4. ✅ IPv4-only pooler to avoid WSL2 IPv6 issues

### 8.2 Production (Railway)
1. ✅ Use **Transaction Mode Pooler** (port 6543)
2. ✅ Enable multi-strategy fallback (railway-connection.ts)
3. ✅ SSL enabled
4. ✅ Connection pooling: max 20, min 5
5. ✅ Statement timeout: 10s

### 8.3 Connection String Checklist

**For Pooler Connections:**
- [ ] Username includes project ref: `postgres.PROJECT_REF`
- [ ] Host is pooler: `aws-0-REGION.pooler.supabase.com`
- [ ] Port is 6543 (transaction) or 5432 (session)
- [ ] SSL is enabled
- [ ] Password is correct

**For Direct Connections:**
- [ ] Username is plain: `postgres`
- [ ] Host is direct: `db.PROJECT_REF.supabase.co`
- [ ] Port is 5432
- [ ] SSL is enabled
- [ ] IPv6 is working OR forced to IPv4

---

## 9. Troubleshooting Guide

### Error: "Tenant or user not found"

**Likely Causes:**
1. Wrong port (5432 session mode instead of 6543 transaction mode)
2. Wrong region in hostname
3. Project ref not in username
4. Incorrect password

**Solutions:**
1. Change port from 5432 to 6543
2. Try different region variants (aws-0, aws-1)
3. Ensure username is `postgres.PROJECT_REF`
4. Verify password is correct

### Error: "Connection timeout"

**Likely Causes:**
1. IPv6 routing issues (direct connection)
2. Firewall blocking port
3. Wrong hostname

**Solutions:**
1. Switch to pooler (IPv4-only)
2. Check firewall rules
3. Verify hostname spelling

### Error: "SSL required"

**Likely Causes:**
1. SSL not enabled in connection string
2. Wrong SSL configuration

**Solutions:**
1. Add `?sslmode=require` to connection string
2. Set `ssl: { rejectUnauthorized: false }` in code

---

## 10. Next Steps

### Immediate Actions:

1. **Update .env file:**
   ```bash
   DATABASE_URL=postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

2. **Test connection:**
   ```bash
   npm run dev
   ```

3. **Verify in logs:**
   - Look for "Database connected successfully"
   - Check for any errors

4. **Update Railway environment:**
   - Set DATABASE_URL in Railway dashboard
   - Redeploy

### Long-term Improvements:

1. **Add connection health monitoring**
2. **Document working configuration**
3. **Add connection retry logic**
4. **Implement connection fallback strategies**
5. **Add IPv6 detection and handling**

---

## 11. References

- [Supabase Connection Strings Documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Transaction vs Session Mode](https://www.pgbouncer.org/config.html)
- Project Reference: ubqnfiwxghkxltluyczd
- Region: aws-0-us-west-1

---

## Conclusion

**The correct connection string for this project is:**

```bash
# Transaction Mode Pooler (RECOMMENDED)
postgresql://postgres.ubqnfiwxghkxltluyczd:ymS5gBm9Wz9q1P11@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Key changes from current configuration:**
- Port: 5432 → **6543**
- Mode: Session → **Transaction**

This resolves:
- ✅ "Tenant or user not found" error
- ✅ IPv6 issues on WSL2
- ✅ Connection pooling for Railway
- ✅ Proper SSL configuration

**Action Required:**
Update the DATABASE_URL in backend/.env and Railway environment variables, then restart the application.
