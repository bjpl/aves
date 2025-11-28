# Authentication Debugging Guide

## Overview

This guide explains how to use the comprehensive debugging system to diagnose Supabase token validation issues.

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The server will now log detailed Supabase configuration on startup.

### 2. Check Configuration

```bash
curl http://localhost:3001/api/debug/config
```

This will show you:
- Environment variables status
- Supabase configuration (sanitized)
- Auth settings
- Server environment

### 3. Test Token Validation

Get a token from your frontend (check browser DevTools > Application > Local Storage):

```bash
curl -X POST http://localhost:3001/api/debug/auth \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

Or use the test script:

```bash
cd backend
tsx src/scripts/test-auth-debug.ts YOUR_TOKEN_HERE
```

## Debug Endpoints

### GET /api/debug/config

Returns sanitized configuration information:
- Environment settings
- Supabase connection status
- Auth configuration

**Response Example:**
```json
{
  "timestamp": "2025-11-17T02:00:00.000Z",
  "environment": {
    "nodeEnv": "development",
    "port": 3001
  },
  "supabase": {
    "urlConfigured": true,
    "urlValue": "https://xxx.supabase.co...",
    "anonKeyConfigured": true,
    "serviceKeyConfigured": true
  }
}
```

### GET /api/debug/health

Basic health check endpoint.

### POST /api/debug/auth

Comprehensive token validation with step-by-step diagnostics.

**Headers Required:**
- `Authorization: Bearer <token>`

**Response Example (Success):**
```json
{
  "success": true,
  "message": "Token validation successful",
  "diagnostics": {
    "timestamp": "2025-11-17T02:00:00.000Z",
    "step1_tokenExtraction": {
      "authHeaderPresent": true,
      "tokenPresent": true,
      "tokenLength": 256
    },
    "step2_tokenDecode": {
      "success": true,
      "claims": {
        "sub": "user-id",
        "email": "user@example.com"
      },
      "timing": {
        "isExpired": false,
        "timeUntilExpiry": "3600s"
      }
    },
    "step3_supabaseValidation": {
      "duration": "150ms",
      "success": true,
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "emailConfirmed": true
      }
    }
  }
}
```

**Response Example (Failure):**
```json
{
  "error": "Token validation failed",
  "supabaseError": "Invalid JWT",
  "diagnostics": {
    "timestamp": "2025-11-17T02:00:00.000Z",
    "step1_tokenExtraction": {
      "authHeaderPresent": true,
      "tokenPresent": true
    },
    "step2_tokenDecode": {
      "success": true,
      "timing": {
        "isExpired": true,
        "timeUntilExpiry": "EXPIRED"
      }
    },
    "step3_supabaseValidation": {
      "success": false,
      "error": {
        "message": "Token expired",
        "status": 401
      }
    }
  }
}
```

## Enhanced Middleware Logging

The authentication middleware now logs every step:

### Step 1: Authorization Header Extraction
- Checks if header is present
- Extracts Bearer token
- Logs header format

### Step 2: Token Decoding
- Decodes JWT without verification
- Checks token expiry
- Logs token claims (iss, sub, aud, exp, iat)
- Calculates time until expiry

### Step 3: Token Format Validation
- Validates JWT structure
- Checks Bearer scheme
- Detects encoding issues

### Step 4: Supabase Validation
- Sends token to Supabase for verification
- Logs validation duration
- Captures detailed error information
- Returns user information if successful

### Step 5: User Attachment
- Attaches user to request object
- Logs user metadata
- Continues to next middleware

## Common Issues & Solutions

### Issue 1: Token Expired

**Symptoms:**
```json
{
  "step2_tokenDecode": {
    "timing": {
      "isExpired": true,
      "expiresAt": "2025-11-17T01:00:00.000Z"
    }
  }
}
```

**Solution:**
- Implement token refresh in frontend
- Check token expiry before making requests
- Use Supabase session management

### Issue 2: Invalid Token Format

**Symptoms:**
```json
{
  "step3_tokenDecode": {
    "success": false,
    "error": "Invalid token specified"
  }
}
```

**Solution:**
- Verify token is properly extracted from Supabase
- Check for whitespace or encoding issues
- Ensure Bearer prefix is correct

### Issue 3: Supabase Validation Failed

**Symptoms:**
```json
{
  "step4_supabaseValidation": {
    "error": {
      "message": "Invalid JWT",
      "status": 401
    }
  }
}
```

**Solution:**
- Verify SUPABASE_URL is correct
- Ensure SUPABASE_SERVICE_ROLE_KEY matches your project
- Check if token was issued by the correct Supabase instance
- Verify token wasn't manually modified

### Issue 4: Missing Environment Variables

**Symptoms:**
```json
{
  "supabase": {
    "urlConfigured": false,
    "serviceKeyConfigured": false
  }
}
```

**Solution:**
- Check `.env` file exists
- Verify environment variables are set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Restart server after updating `.env`

## Testing Workflow

### 1. Get a Fresh Token

In your frontend app:
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
console.log('Token:', token);
```

### 2. Test Configuration

```bash
curl http://localhost:3001/api/debug/config
```

Verify:
- ✅ `supabaseUrlConfigured: true`
- ✅ `serviceKeyConfigured: true`

### 3. Test Token Validation

```bash
curl -X POST http://localhost:3001/api/debug/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | json_pp
```

Review diagnostics for each step.

### 4. Monitor Server Logs

Watch the server console for detailed logs:
- `✅ [AUTH-DEBUG] Supabase auth successful`
- `❌ [AUTH-DEBUG] Supabase validation failed`

## Production Considerations

**IMPORTANT:** Debug endpoints are automatically disabled in production.

The following line in `src/index.ts` ensures this:
```typescript
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRouter);
}
```

## Advanced Debugging

### Compare Service Key vs Anon Key

The debug endpoint tests both keys:
- Service role key (used by middleware)
- Anon key (alternative test)

This helps identify key-specific issues.

### Token Claims Inspection

Check the decoded token for:
- `iss`: Should match your Supabase URL
- `aud`: Should be "authenticated"
- `role`: User role
- `exp`: Expiry timestamp
- `sub`: User ID

### Timing Analysis

Monitor `step4_supabaseValidation.duration`:
- Normal: 50-200ms
- Slow: >500ms (may indicate network issues)
- Timeout: >5000ms (configuration problem)

## Next Steps

After identifying the issue:

1. **Token Expiry:** Implement token refresh
2. **Configuration:** Update environment variables
3. **Network:** Check Supabase connectivity
4. **Keys:** Verify correct Supabase project keys

## Support

If issues persist, check:
- Supabase project dashboard
- Network connectivity to Supabase
- CORS configuration
- Firewall/proxy settings
