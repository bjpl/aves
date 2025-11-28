# Railway Deployment Configuration Report

**Generated**: November 27, 2025
**Status**: Ready for Deployment

## Configuration Files Status

### ✅ Complete and Verified

1. **railway.json** - Main Railway configuration
   - Builder: NIXPACKS
   - Health check: `/health` (30s timeout)
   - Restart policy: ON_FAILURE (max 10 retries)
   - Replicas: 1

2. **railway-backend.toml** - Backend service configuration
   - Build: `npm ci && npm run build --workspace=backend`
   - Start: `npm run start --workspace=backend`
   - Health check: `/health`
   - Environment: production

3. **railway-frontend.toml** - Frontend service configuration
   - Build: `cd frontend && npm ci && npm run build:vercel`
   - Start: `cd frontend && npx serve dist -l 8080`
   - Variables: NODE_ENV, VITE_API_URL, PORT

4. **nixpacks.toml** - Nix package configuration
   - Node.js: 20.x (correct version)
   - Install: `npm ci`
   - Build: `npm run build --workspace=backend`
   - Start: `npm run start --workspace=backend`

5. **package.json** - Root package scripts
   - Added: `deploy:railway` command
   - Added: `logs:railway` command
   - Workspaces: frontend, backend
   - Node engine: >=20.0.0 ✅

6. **backend/package.json** - Backend package
   - Start script: `tsx src/index.ts` (uses tsx, no build needed)
   - Build script: Echoes "Using tsx - no build needed"
   - Dependencies: All production-ready

## Required Environment Variables

### Critical (Must Set Before Deploy)

These MUST be configured in Railway dashboard before deployment:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Security Secrets (Generate New)
JWT_SECRET=[64-char hex string - generate new]
SESSION_SECRET=[64-char hex string - generate new]
API_KEY_SECRET=[32-char base64 - generate new]

# Server Configuration
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

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional (Recommended)

```bash
# AI Features
ANTHROPIC_API_KEY=[Your Anthropic key for AI annotations]

# Image Service
UNSPLASH_ACCESS_KEY=[Rotated Unsplash key]
UNSPLASH_SECRET_KEY=[Rotated Unsplash secret]

# Logging
LOG_LEVEL=info
```

## Database Setup

### Supabase Configuration

1. **Get connection details** from Supabase Dashboard:
   - Project Settings → Database
   - Connection string (Transaction mode)
   - Copy host, password, project reference

2. **Construct DATABASE_URL**:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

3. **Migrations**: Run automatically on first startup
   - Backend validates connection in `src/index.ts`
   - Migrations in `backend/src/database/migrate.ts`
   - Check logs for "Running database migrations..." message

### Database Requirements

- PostgreSQL 14+ (Supabase provides 15+)
- SSL enabled (required for Railway → Supabase)
- Connection pooling (Supabase provides PgBouncer)

## Deployment Commands

### From Repository Root

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to backend service
railway link

# Deploy backend
npm run deploy:railway

# View logs
npm run logs:railway

# Or deploy directly
railway up
```

### Manual Deployment

1. Push to GitHub main branch
2. Railway auto-deploys if GitHub integration enabled
3. Monitor deployment in Railway dashboard

## Health Check Verification

After deployment, verify the health endpoint:

```bash
# Get URL from Railway dashboard
export BACKEND_URL="https://[your-service].railway.app"

# Test health endpoint
curl $BACKEND_URL/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "database": "connected"
}
```

## Pre-Deployment Checklist

### Configuration Files
- [x] railway.json configured
- [x] railway-backend.toml configured
- [x] railway-frontend.toml configured
- [x] nixpacks.toml with Node 20.x
- [x] package.json with deploy scripts
- [x] backend/package.json start script

### Environment Variables
- [ ] All critical variables added to Railway
- [ ] JWT_SECRET is strong (64+ chars, random)
- [ ] DATABASE_URL points to Supabase
- [ ] FRONTEND_URL matches actual frontend
- [ ] No DEV_AUTH_BYPASS in production
- [ ] ANTHROPIC_API_KEY added (if using AI)

### Security
- [ ] All secrets rotated (not from committed .env)
- [ ] FORCE_HTTPS=true
- [ ] SECURE_COOKIES=true
- [ ] DB_SSL_ENABLED=true
- [ ] Rate limiting configured
- [ ] CORS restricted to frontend URL only

### Database
- [ ] Supabase project created
- [ ] Connection tested locally
- [ ] DATABASE_URL format verified
- [ ] SSL mode confirmed

### Documentation
- [x] RAILWAY_QUICKSTART.md created
- [x] RAILWAY_DEPLOYMENT.md exists
- [x] RAILWAY_CONFIGURATION.md exists
- [x] Environment variables documented

## Post-Deployment Verification

After deploying, check:

1. **Health endpoint** returns 200 OK
2. **Railway logs** show no errors
3. **Database connection** successful
4. **Migrations** completed
5. **Frontend** can connect to backend
6. **CORS** working (no console errors)
7. **Authentication** working
8. **API responses** valid

## Troubleshooting Common Issues

### 503 Service Unavailable
**Symptoms**: Health check fails, service shows unhealthy
**Solutions**:
- Check Railway logs for startup errors
- Verify all required env vars are set
- Ensure PORT=${{PORT}} is set
- Check DATABASE_URL is correct

### Database Connection Failed
**Symptoms**: "Connection refused" or timeout errors
**Solutions**:
- Verify DB_SSL_ENABLED=true
- Check DATABASE_URL format
- Confirm Supabase project is active
- Test connection locally first

### CORS Errors
**Symptoms**: Browser console shows CORS errors
**Solutions**:
- Verify FRONTEND_URL exactly matches deployed URL
- Include https:// protocol
- No trailing slash in FRONTEND_URL
- Check CORS_ALLOWED_ORIGINS matches

### Build Failures
**Symptoms**: Deployment fails during build
**Solutions**:
- Check package.json scripts are correct
- Verify npm ci completes successfully
- Review build logs in Railway
- Test build locally: `npm run build --workspace=backend`

### Health Check Timeout
**Symptoms**: Railway marks service unhealthy after 30s
**Solutions**:
- Check if backend is starting (view logs)
- Verify health endpoint exists at /health
- Ensure PORT is correctly bound
- Check for slow database migrations

## Monitoring and Maintenance

### Recommended Tools

1. **Uptime Monitoring**: UptimeRobot (free tier)
2. **Error Tracking**: Sentry (optional)
3. **Logging**: Railway built-in logs
4. **Performance**: Railway metrics dashboard

### Log Monitoring

```bash
# View live logs
railway logs -f

# Filter for errors
railway logs | grep ERROR

# View specific deployment
railway logs --deployment [ID]
```

### Performance Metrics

Monitor in Railway dashboard:
- Response time (target: <200ms)
- CPU usage (target: <50%)
- Memory usage (target: <256MB)
- Error rate (target: <1%)

## Cost Estimate

**Railway Hobby Plan**: $5/month
- Backend service: ~$2-3/month (512MB RAM)
- Frontend service: ~$1-2/month (optional)
- **Total**: ~$5/month for both services

**Supabase Free Tier**: $0/month
- 500MB database storage
- 1GB file storage (for uploaded images)
- 50,000 monthly active users
- 2GB bandwidth
- **Upgrade if needed**: $25/month for Pro tier

**Total Monthly Cost**: $5-30 depending on usage

## Next Steps

1. **Add all required environment variables** to Railway dashboard
2. **Generate new secrets** for JWT_SECRET, SESSION_SECRET, API_KEY_SECRET
3. **Deploy backend** using `npm run deploy:railway` or Railway dashboard
4. **Verify health endpoint** returns 200 OK
5. **Test API endpoints** with curl or Postman
6. **Deploy frontend** (optional, can use Vercel instead)
7. **Configure custom domain** (optional)
8. **Set up monitoring** with UptimeRobot
9. **Review security checklist** before making repo public

## Support and Documentation

- **Quick Start**: `docs/deployment/RAILWAY_QUICKSTART.md`
- **Detailed Guide**: `docs/deployment/RAILWAY_DEPLOYMENT.md`
- **Environment Variables**: `docs/deployment/RAILWAY_CONFIGURATION.md`
- **Security**: `docs/security/SECURITY_CHECKLIST.md`
- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs

## Summary

The Railway deployment is **fully configured** and ready to deploy. All configuration files are in place:

- Railway JSON configurations for build/deploy ✅
- Nixpacks config with Node.js 20.x ✅
- Package scripts for deployment ✅
- Health check endpoints configured ✅
- Comprehensive documentation created ✅

**What you need to do**:

1. Add environment variables to Railway dashboard
2. Generate and set new secrets
3. Run `npm run deploy:railway` or push to GitHub
4. Verify health endpoint after deployment

The backend will start with `tsx src/index.ts` (no build step needed), connect to Supabase, run migrations, and start serving requests at the Railway-assigned URL with full health checks and auto-restart on failure.
