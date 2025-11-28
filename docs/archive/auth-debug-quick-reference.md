# Auth Debugging Quick Reference

## 🚀 Quick Start

### 1. Start Server
```bash
cd backend && npm run dev
```

**Look for:**
```
✅ Supabase configuration detected:
  url: https://xxx.supabase.co...
  serviceKeyPrefix: eyJhbGciOiJIUzI1NiIs...
```

### 2. Check Config
```bash
curl http://localhost:3001/api/debug/config | json_pp
```

### 3. Get Token
**In browser console (logged in):**
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log(session?.access_token);
```

### 4. Test Token
```bash
curl -X POST http://localhost:3001/api/debug/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | json_pp
```

---

## 📋 Debug Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/debug/config` | GET | Check environment variables |
| `/api/debug/health` | GET | Server health status |
| `/api/debug/auth` | POST | Token validation test |

---

## 🔍 Validation Steps

The middleware checks in this order:

1. **Authorization Header** - Is it present?
2. **Bearer Token** - Is the token extracted?
3. **JWT Decode** - Is it a valid JWT?
4. **Token Expiry** - Has it expired?
5. **Supabase Validation** - Does Supabase accept it?
6. **User Attachment** - Is user info available?

---

## ⚠️ Common Issues

### Token Expired
```json
"step3_tokenDecode": {
  "isExpired": true,
  "timeUntilExpiry": "EXPIRED"
}
```
**Fix:** Get fresh token or implement refresh

### Wrong Supabase URL
```json
"step3_tokenDecode": {
  "iss": "https://wrong-project.supabase.co"
}
```
**Fix:** Verify SUPABASE_URL in .env matches frontend

### Missing Service Key
```json
"environment": {
  "supabaseServiceKeyConfigured": false
}
```
**Fix:** Set SUPABASE_SERVICE_ROLE_KEY in .env

### Invalid JWT Format
```json
"step3_tokenDecode": {
  "success": false,
  "error": "Invalid token specified"
}
```
**Fix:** Check token extraction from frontend

---

## 🧪 Test Script

```bash
# Test all debug endpoints
cd backend
tsx src/scripts/test-auth-debug.ts

# Test with token
tsx src/scripts/test-auth-debug.ts "YOUR_TOKEN_HERE"
```

---

## 📊 Success Response

```json
{
  "success": true,
  "diagnostics": {
    "step3_tokenDecode": {
      "isExpired": false,
      "timeUntilExpiry": "3600s"
    },
    "step4_supabaseValidation": {
      "duration": "150ms",
      "success": true
    }
  }
}
```

---

## ❌ Error Response

```json
{
  "error": "Token validation failed",
  "diagnostics": {
    "step4_supabaseValidation": {
      "error": {
        "message": "Invalid JWT",
        "status": 401
      }
    }
  }
}
```

---

## 🔐 Environment Variables

**Required:**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**Optional:**
```env
SUPABASE_ANON_KEY=eyJhbGci...  # For comparison testing
NODE_ENV=development
```

---

## 🛠️ Troubleshooting Commands

### View startup logs
```bash
cd backend && npm run dev 2>&1 | grep -i supabase
```

### Test configuration
```bash
curl -s http://localhost:3001/api/debug/config | jq .supabase
```

### Get detailed token info
```bash
curl -X POST http://localhost:3001/api/debug/auth \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .diagnostics
```

### Check environment
```bash
grep SUPABASE backend/.env
```

---

## 📖 Full Documentation

- **Debugging Guide:** `/docs/auth-debugging-guide.md`
- **Implementation Summary:** `/docs/debugging-implementation-summary.md`
- **Middleware Code:** `/backend/src/middleware/supabaseAuth.ts`

---

## 🔄 Quick Fix Workflow

1. **Start backend** → Check startup logs
2. **Test config** → Verify env vars loaded
3. **Get fresh token** → From frontend session
4. **Test token** → Using debug endpoint
5. **Read diagnostics** → Find failing step
6. **Apply fix** → Based on error type
7. **Retest** → Confirm resolution

---

## 🎯 Next Steps

- [ ] Review startup logs
- [ ] Test debug endpoints
- [ ] Get valid token from frontend
- [ ] Test token validation
- [ ] Identify failure point
- [ ] Apply appropriate fix
- [ ] Verify resolution

---

**Remember:** Debug endpoints are **disabled in production** for security.
