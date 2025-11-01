# Deployment Issues and Fixes

## Issues Identified

### 1. Frontend - 404 Errors from Unsplash Images
**Problem**: Test data uses Unsplash photo URLs that return 404 errors
**Root Cause**: Unsplash test image URLs are returning 404
**Fix**: Created seed script with placeholder.com images that are reliable

### 2. Railway Deployment Failures
**Problem**: Both frontend and backend deployments crash on Railway
**Root Cause**:
- Build commands were trying to cd into subdirectories
- Missing environment variables
- Incorrect start commands

**Fixes Applied**:
- Updated `railway.toml`, `railway-backend.toml`, `railway-frontend.toml`
- Fixed build and start commands
- Added healthcheck configuration

### 3. Backend Authentication Issues
**Problem**: Supabase authentication fails with "missing sub claim"
**Root Cause**: The anon key is not a user JWT token (has no 'sub' claim)
**Solution**: Need to either:
1. Login to get a proper user session token
2. Modify middleware to bypass auth in development
3. Use service role key for admin operations

## Deployment Steps

### Backend Deployment to Railway

1. **Environment Variables Required**:
```bash
NODE_ENV=production
PORT=$PORT
DATABASE_URL=<your-supabase-connection-string>
SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-frontend.vercel.app
```

2. **Build Configuration** (`railway-backend.toml`):
```toml
[build]
builder = "nixpacks"
buildCommand = "cd backend && npm ci && npm run build"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
healthcheckPath = "/health"
healthcheckTimeout = 30
```

3. **Deploy**:
```bash
# Link to Railway project
railway link <project-id>

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# ... set other variables

# Deploy
railway up
```

### Frontend Deployment

1. **Environment Variables**:
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

2. **Vercel Deployment** (recommended for frontend):
```bash
vercel --prod
```

Or **Railway**:
```bash
railway up
```

## Testing Locally

### 1. Backend
```bash
cd backend
npm run build
npm start

# Test health
curl http://localhost:3001/health

# You need to login first to get a proper token
# Go to http://localhost:5173/admin/login
# Login with admin credentials
# Token will be stored in localStorage
```

### 2. Frontend
```bash
cd frontend
npm run dev

# Access: http://localhost:5173
# Admin panel: http://localhost:5173/admin
```

### 3. Seed Test Data
```bash
cd backend
npx tsx scripts/seed-test-data.ts
```

## Current Status

✅ Fixed Railway configuration files
✅ Created seed script for test data
✅ Fixed stats endpoint (removed early return)
✅ Updated CORS configuration
⏳ Auth middleware needs adjustment for development
⏳ Need to create proper admin user session
⏳ Deploy to Railway and verify

## Next Steps

1. Fix authentication:
   - Option A: Add development bypass in middleware
   - Option B: Create admin login flow and get proper token
   - Option C: Use service role key for admin endpoints in dev

2. Test complete flow locally with proper auth

3. Deploy to Railway with correct environment variables

4. Verify deployments are healthy

5. Test annotation review page with real data
