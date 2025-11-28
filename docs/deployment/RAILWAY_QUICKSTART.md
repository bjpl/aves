# Railway Deployment Quickstart

**Objective**: Deploy the AVES backend to Railway in under 15 minutes.

## Prerequisites

- Railway account connected to GitHub
- Supabase project with database initialized
- Node.js 20.x installed locally for testing

## Step 1: Create Railway Project (2 min)

1. Visit https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `aves` repository
4. Create **two services**:
   - `aves-backend` (for backend API)
   - `aves-frontend` (optional, for frontend)

## Step 2: Configure Backend Service (5 min)

### 2.1 Select Backend Configuration

In Railway dashboard for `aves-backend`:

1. Settings → Root Directory: Leave blank (uses root)
2. Settings → Build Command: `npm ci && npm run build --workspace=backend`
3. Settings → Start Command: `npm run start --workspace=backend`
4. Settings → Watch Paths: `backend/**`

### 2.2 Add Environment Variables

Click Variables tab and add these **CRITICAL** variables:

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Security (generate new secrets)
JWT_SECRET=[Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
SESSION_SECRET=[Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
API_KEY_SECRET=[Generate with: node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"]

# Server
NODE_ENV=production
PORT=${{PORT}}
FRONTEND_URL=https://aves-production.up.railway.app

# CORS
CORS_ALLOWED_ORIGINS=https://aves-production.up.railway.app
CORS_CREDENTIALS=true

# Security Headers
FORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
DB_SSL_ENABLED=true

# AI (optional - add your key)
ANTHROPIC_API_KEY=sk-ant-api03-[YOUR_KEY]

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.3 Generate Secrets Locally

Run these commands to generate secure secrets:

```bash
# JWT Secret (64 chars)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Session Secret (64 chars)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# API Key Secret (32 chars base64)
node -e "console.log('API_KEY_SECRET=' + require('crypto').randomBytes(24).toString('base64'))"
```

Copy these values into Railway variables.

## Step 3: Deploy Backend (3 min)

### Option A: Deploy from Railway Dashboard

1. Click "Deploy" in Railway
2. Wait for build to complete (2-3 minutes)
3. Check deployment logs for errors

### Option B: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to backend service
railway link

# Deploy
railway up
```

## Step 4: Verify Deployment (2 min)

### 4.1 Check Health Endpoint

Get your backend URL from Railway dashboard, then:

```bash
# Test health endpoint
curl https://[YOUR-BACKEND-URL].railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-27T...","database":"connected"}
```

### 4.2 Check Logs

In Railway dashboard:
1. Click Deployments
2. Click latest deployment
3. View Logs
4. Verify no errors

### 4.3 Common Issues

**503 Service Unavailable**
- Check Railway logs for startup errors
- Verify all required env vars are set
- Ensure DATABASE_URL is correct

**Database Connection Failed**
- Verify `DB_SSL_ENABLED=true`
- Check DATABASE_URL format
- Test Supabase connection from local machine

**CORS Errors**
- Ensure `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` match exactly
- Include protocol (https://)
- No trailing slash

## Step 5: Configure Frontend (Optional, 3 min)

If deploying frontend to Railway:

### Environment Variables for Frontend Service

```bash
VITE_API_URL=https://[YOUR-BACKEND-URL].railway.app
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
NODE_ENV=production
```

### Build & Start Commands

- Build: `cd frontend && npm ci && npm run build:vercel`
- Start: `cd frontend && npx serve dist -l $PORT`

## Required Environment Variables Reference

### Minimal (Backend Only)

These are the **absolute minimum** variables needed for backend deployment:

```bash
DATABASE_URL          # Supabase PostgreSQL connection string
SUPABASE_URL          # Supabase project URL
SUPABASE_ANON_KEY     # Public anonymous key
SUPABASE_SERVICE_ROLE_KEY  # Service role key (admin)
JWT_SECRET            # Strong random 64-char hex string
NODE_ENV=production   # Enable production mode
PORT=${{PORT}}        # Railway provides this
FRONTEND_URL          # Your frontend URL for CORS
```

### Recommended Production Variables

Add these for security and features:

```bash
SESSION_SECRET        # Session encryption key
API_KEY_SECRET        # API key encryption
FORCE_HTTPS=true      # Redirect HTTP to HTTPS
SECURE_COOKIES=true   # Secure cookie flag
TRUST_PROXY=true      # Trust Railway proxy
DB_SSL_ENABLED=true   # Require SSL for database
CORS_CREDENTIALS=true # Allow credentials in CORS
ANTHROPIC_API_KEY     # For AI annotation features
RATE_LIMIT_WINDOW_MS=900000   # 15 min window
RATE_LIMIT_MAX_REQUESTS=100   # 100 requests per window
```

## Database Setup with Supabase

### 1. Get Connection Details

From Supabase Dashboard → Project Settings → Database:

```
Host: db.[PROJECT].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR_PASSWORD]
```

### 2. Construct DATABASE_URL

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### 3. Run Migrations

Migrations are run automatically on first startup. Verify in logs:

```
[INFO] Running database migrations...
[INFO] Migrations completed successfully
```

To run manually:

```bash
# Locally with DATABASE_URL set
npm run migrate --workspace=backend

# Or via Railway CLI
railway run npm run migrate --workspace=backend
```

## Deployment Commands

### Using Railway CLI

```bash
# View logs
railway logs

# Tail logs
railway logs -f

# Run migrations
railway run npm run migrate --workspace=backend

# Open dashboard
railway open

# View environment variables
railway variables

# Rollback deployment
railway rollback
```

### Using Package Scripts

From root directory:

```bash
# Deploy to Railway (if linked)
npm run deploy:railway

# View logs
npm run logs:railway
```

## Troubleshooting Checklist

- [ ] All required environment variables are set in Railway
- [ ] `NODE_ENV=production` (not development)
- [ ] JWT_SECRET is 64+ characters and random
- [ ] DATABASE_URL is correct and includes SSL mode
- [ ] FRONTEND_URL matches actual frontend URL
- [ ] No `DEV_AUTH_BYPASS` variable in production
- [ ] Health endpoint returns 200 OK
- [ ] Railway logs show no errors
- [ ] Database migrations completed successfully

## Security Checklist

Before making the repository public:

- [ ] All secrets rotated (not using any from committed .env files)
- [ ] Strong JWT_SECRET (never commit this)
- [ ] Supabase service role key never exposed
- [ ] FORCE_HTTPS enabled
- [ ] SECURE_COOKIES enabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted to frontend URL
- [ ] No development auth bypass in production

## Cost Estimate

**Railway Hobby Plan**: $5/month
- Backend service: ~$2-3/month
- Frontend service (optional): ~$1-2/month
- Total: ~$5/month for both services

**Supabase Free Tier**:
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Free forever

## Next Steps

1. **Test the deployment**: Visit your backend URL + `/health`
2. **Configure custom domain** (optional): Railway Settings → Domains
3. **Set up monitoring**: Add UptimeRobot or similar
4. **Configure CI/CD**: Automatic deploys on git push to main
5. **Review logs regularly**: Check for errors and performance issues

## Support Resources

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Supabase Docs: https://supabase.com/docs
- Project Issues: https://github.com/yourusername/aves/issues

## Files Reference

- Configuration: `railway-backend.toml`, `railway.json`, `nixpacks.toml`
- Detailed guide: `docs/deployment/RAILWAY_DEPLOYMENT.md`
- Security: `docs/security/SECURITY_CHECKLIST.md`
- Environment variables: `docs/deployment/RAILWAY_CONFIGURATION.md`
