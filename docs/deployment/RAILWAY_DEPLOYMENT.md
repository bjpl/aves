# Railway Deployment Guide

## Prerequisites

1. Railway account linked to GitHub
2. Two Railway services created:
   - `aves-backend` (backend API)
   - `aves` or `aves-frontend` (frontend)
3. Supabase project with database setup

## Backend Deployment

### 1. Environment Variables

Set these in Railway dashboard for backend service:

```bash
# Node Environment
NODE_ENV=production
PORT=$PORT

# Database (Supabase)
DATABASE_URL=postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres
SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTA1NTAsImV4cCI6MjA3NTIyNjU1MH0.GNEjJ_ralYnpIeUVnDSpF64WSlPK-Z_69wIdAgwRj0U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY1MDU1MCwiZXhwIjoyMDc1MjI2NTUwfQ.385WSN4_WsQgWQau5VS_jXOjf1dTDQwcwDi6RSQiroU

# JWT Configuration
JWT_SECRET=290d3903773734282eaf8870aa1de666b6c6c8999953bfa9fbde15b1e4d7584f
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=https://aves-production.up.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# OpenAI (if using AI features)
OPENAI_API_KEY=your-openai-key-here

# IMPORTANT: DO NOT SET THESE IN PRODUCTION
# DEV_AUTH_BYPASS=false (or don't set at all)
# BYPASS_AUTH=false (or don't set at all)
```

### 2. Deploy Backend

Using Railway CLI:
```bash
# Link to backend service
railway link

# Deploy
railway up

# Or trigger from GitHub
git push origin main
```

### 3. Verify Backend

```bash
# Get backend URL from Railway dashboard
# Test health endpoint
curl https://aves-backend-production.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2025-11-01T..."}
```

## Frontend Deployment

### 1. Environment Variables

Set these in Railway dashboard for frontend service:

```bash
# Backend API URL (use your actual Railway backend URL)
VITE_API_URL=https://aves-backend-production.up.railway.app

# Supabase
VITE_SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTA1NTAsImV4cCI6MjA3NTIyNjU1MH0.GNEjJ_ralYnpIeUVnDSpF64WSlPK-Z_69wIdAgwRj0U

# CMS Token (if needed)
VITE_CMS_API_TOKEN=
```

### 2. Deploy Frontend

```bash
# Link to frontend service
railway link

# Deploy
railway up
```

### 3. Verify Frontend

Open your frontend URL in browser and check:
- Home page loads
- Admin login works
- Can access annotation review page

## Railway Configuration Files

The repo includes optimized Railway config files:

### `railway-backend.toml`
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

### `railway-frontend.toml`
```toml
[build]
builder = "nixpacks"
buildCommand = "cd frontend && npm ci && npm run build"

[deploy]
startCommand = "cd frontend && npm run preview"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

## Deployment Checklist

### Before Deploying

- [ ] All environment variables set in Railway
- [ ] `NODE_ENV=production` in backend
- [ ] `DEV_AUTH_BYPASS` NOT set (or set to false)
- [ ] Strong `JWT_SECRET` generated
- [ ] Frontend URL updated in backend CORS
- [ ] Database migrations run on Supabase
- [ ] Test data seeded (optional)

### After Backend Deployment

- [ ] Health check returns 200
- [ ] Railway shows "Running" status
- [ ] No errors in Railway logs
- [ ] Database connection successful

### After Frontend Deployment

- [ ] Frontend loads in browser
- [ ] API requests to backend succeed
- [ ] No CORS errors in console
- [ ] Authentication works

## Troubleshooting

### Backend Issues

**503 Service Unavailable**
- Check Railway logs for errors
- Verify DATABASE_URL is correct
- Ensure health endpoint returns 200

**CORS Errors**
- Update `FRONTEND_URL` in backend env vars
- Verify frontend URL matches exactly
- Check `src/index.ts` CORS configuration

**Database Connection Failed**
- Verify DATABASE_URL format
- Check Supabase connection pooler settings
- Test connection locally first

### Frontend Issues

**API Requests Fail**
- Verify `VITE_API_URL` points to backend
- Check backend is running and healthy
- Inspect network tab for actual errors

**Build Fails**
- Check frontend/package.json scripts
- Verify all dependencies installed
- Review Railway build logs

**404 Errors**
- Check routing configuration
- Verify public directory structure
- Review Vite build output

## Monitoring

### Railway Dashboard

Monitor these metrics:
- CPU usage
- Memory usage
- Response time
- Error rate

### Logs

```bash
# View live logs
railway logs

# Filter errors
railway logs | grep ERROR

# Tail logs
railway logs -f
```

### Health Checks

Set up automated monitoring:
- UptimeRobot for uptime monitoring
- Sentry for error tracking
- LogRocket for session replay

## Rollback

If deployment fails:

```bash
# View deployments
railway status

# Rollback to previous
railway rollback
```

## Cost Optimization

- Use Railway Hobby plan ($5/month) for small projects
- Optimize Docker images for faster builds
- Enable hibernation for inactive services
- Monitor usage in Railway dashboard

## Security Notes

⚠️ **IMPORTANT**:
1. Never commit `.env` files
2. Rotate secrets regularly
3. Use strong JWT_SECRET (32+ chars)
4. Enable 2FA on Railway account
5. Review environment variables periodically
6. Disable dev bypasses in production

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Supabase Docs: https://supabase.com/docs
