# Aves Deployment Checklist

Quick reference for deploying Aves to various platforms.

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] Copy `.env.example` to `.env` and configure all values
- [ ] Generate strong secrets for `SESSION_SECRET` and `JWT_SECRET` (32+ characters)
- [ ] Obtain Anthropic API key for Claude Sonnet 4.5
- [ ] Configure database connection string
- [ ] Set `NODE_ENV=production`

### Security
- [ ] Rotate all secrets if redeploying
- [ ] Verify no secrets committed to repository
- [ ] Enable SSL/HTTPS on hosting platform
- [ ] Configure CORS to restrict allowed origins
- [ ] Review security headers in nginx.conf

### Database
- [ ] Create production database
- [ ] Run migrations: `npm run migrate --workspace=backend`
- [ ] Verify schema created successfully
- [ ] Configure database backups
- [ ] Test database connection

### Testing
- [ ] Run backend tests: `npm test --workspace=backend`
- [ ] Run frontend tests: `npm test --workspace=frontend`
- [ ] Run E2E tests: `npm run test:e2e --workspace=frontend`
- [ ] Verify all critical user flows work
- [ ] Test with production environment variables

---

## GitHub Pages Deployment

### Prerequisites
- [ ] GitHub repository set up
- [ ] GitHub Pages enabled in repository settings

### Deployment Steps
```bash
# 1. Build for GitHub Pages
cd frontend
npm run build:gh-pages

# 2. Verify build output in /docs directory
ls -la ../docs

# 3. Commit and push
git add ../docs
git commit -m "chore: deploy to GitHub Pages"
git push origin main
```

### Post-Deployment
- [ ] Visit https://[username].github.io/aves/
- [ ] Verify app loads correctly
- [ ] Test navigation and routing
- [ ] Check browser console for errors
- [ ] Test on mobile devices

**Note:** GitHub Pages serves frontend only. API calls will need a separate backend deployment.

---

## Docker Deployment

### Prerequisites
- [ ] Docker installed (v20+)
- [ ] Docker Compose installed (v2.0+)
- [ ] `.env` file configured from `.env.docker.example`

### Deployment Steps
```bash
# 1. Configure environment
cp .env.docker.example .env
# Edit .env with production values

# 2. Build images
docker-compose build

# 3. Start services
docker-compose up -d

# 4. Verify services are healthy
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f frontend

# 5. Test endpoints
curl http://localhost/health
curl http://localhost:3001/health
```

### Post-Deployment
- [ ] All containers running: `docker-compose ps`
- [ ] Database initialized with schema
- [ ] Backend API responding: `curl http://localhost:3001/health`
- [ ] Frontend serving: `curl http://localhost/health`
- [ ] No errors in logs: `docker-compose logs --tail=50`
- [ ] Test user signup and login flow

### Maintenance
```bash
# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Update and redeploy
git pull
docker-compose down
docker-compose build
docker-compose up -d

# Database backup
docker-compose exec database pg_dump -U postgres aves > backup.sql
```

---

## Railway Deployment

### Prerequisites
- [ ] Railway account created
- [ ] Railway CLI installed: `npm i -g @railway/cli`
- [ ] Two Railway projects created (backend + frontend)

### Backend Deployment
```bash
# 1. Link to Railway project
railway link

# 2. Set environment variables
railway variables set DB_HOST=<postgres-host>
railway variables set DB_PORT=5432
railway variables set DB_NAME=aves
railway variables set DB_USER=postgres
railway variables set DB_PASSWORD=<strong-password>
railway variables set ANTHROPIC_API_KEY=<your-key>
railway variables set SESSION_SECRET=<32-char-secret>
railway variables set JWT_SECRET=<32-char-secret>
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=<frontend-url>

# 3. Add PostgreSQL plugin
railway add

# 4. Deploy
railway up

# 5. Run migrations
railway run npm run migrate --workspace=backend
```

### Frontend Deployment
```bash
# 1. Link to frontend Railway project
railway link

# 2. Set environment variables
railway variables set VITE_API_URL=<backend-railway-url>
railway variables set VITE_API_VERSION=v1
railway variables set VITE_ENABLE_VISION_AI=true
railway variables set NODE_ENV=production

# 3. Deploy
railway up
```

### Post-Deployment
- [ ] Backend health check: `curl https://[backend].railway.app/health`
- [ ] Frontend loads: Visit Railway-provided URL
- [ ] API calls work from frontend
- [ ] Database migrations completed
- [ ] Environment variables set correctly
- [ ] Monitoring configured in Railway dashboard

---

## Vercel Deployment

### Prerequisites
- [ ] Vercel account created
- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Backend deployed separately (Railway, Render, etc.)

### Deployment Steps
```bash
# 1. Link to Vercel project
cd frontend
vercel link

# 2. Set environment variables
vercel env add VITE_API_URL production
# Enter your backend API URL when prompted

vercel env add VITE_API_VERSION production
# Enter "v1" when prompted

vercel env add VITE_ENABLE_VISION_AI production
# Enter "true" when prompted

# 3. Deploy to production
vercel --prod
```

### Post-Deployment
- [ ] Frontend accessible at Vercel URL
- [ ] API calls reaching backend
- [ ] Environment variables set correctly
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled in Vercel dashboard

---

## Database Setup

### PostgreSQL 14+ Required

**Create Database:**
```sql
CREATE DATABASE aves;
CREATE USER aves_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE aves TO aves_user;
```

**Run Migrations:**
```bash
cd backend
npm run migrate
```

**Verify Schema:**
```sql
\c aves
\dt  -- List tables
SELECT * FROM users LIMIT 1;
SELECT * FROM species LIMIT 1;
```

**Backup Configuration:**
```bash
# Create backup
pg_dump -U postgres aves > aves_backup_$(date +%Y%m%d).sql

# Restore backup
psql -U postgres aves < aves_backup_20251127.sql
```

---

## Environment Variables Reference

### Backend Required
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=postgres
DB_PASSWORD=<strong-password>
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/aves

SESSION_SECRET=<32-char-random-string>
JWT_SECRET=<32-char-random-string>

ANTHROPIC_API_KEY=sk-ant-api03-...

NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.com
```

### Frontend Required
```
VITE_API_URL=https://your-backend.com
VITE_API_VERSION=v1
VITE_ENABLE_VISION_AI=true
VITE_ENABLE_AI_EXERCISES=true
VITE_DEBUG_MODE=false
```

### Optional
```
OPENAI_API_KEY=sk-...  (Legacy support)
UNSPLASH_ACCESS_KEY=...  (Image sourcing)
ENABLE_VISION_AI=true
ENABLE_EXERCISE_GENERATION=true
```

---

## Monitoring & Health Checks

### Health Endpoints
- Backend: `GET /health`
- Frontend (Docker): `GET /health`

### Manual Testing
```bash
# Backend health
curl https://your-backend.com/health

# API authentication
curl -X POST https://your-backend.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Frontend health (Docker)
curl http://localhost/health
```

### Logs
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# Railway
railway logs

# Vercel
vercel logs
```

---

## Troubleshooting

### Common Issues

**Backend tests timeout:**
```bash
# Fix: Increase Jest timeout or fix database cleanup
# Check: backend/jest.config.js
# Verify: Database connections close properly
```

**Frontend build fails:**
```bash
# Check: Node version (18+ required)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Docker services won't start:**
```bash
# Check logs
docker-compose logs [service]

# Verify environment variables
docker-compose config

# Restart from scratch
docker-compose down -v
docker-compose up -d --build
```

**Database connection fails:**
```bash
# Verify PostgreSQL is running
docker-compose ps database

# Test connection
docker-compose exec database psql -U postgres -c "SELECT 1"

# Check environment variables
echo $DATABASE_URL
```

**API calls fail from frontend:**
```bash
# Check CORS configuration in backend
# Verify VITE_API_URL is set correctly
# Check browser console for errors
# Verify backend is accessible
```

---

## Rollback Procedures

### GitHub Pages
```bash
# Revert to previous commit
git log --oneline  # Find commit hash
git revert <commit-hash>
git push origin main
```

### Docker
```bash
# Stop services
docker-compose down

# Restore database from backup
docker-compose exec database psql -U postgres aves < backup.sql

# Use previous image
docker-compose pull
docker-compose up -d
```

### Railway
```bash
# Redeploy previous version
railway rollback

# Or redeploy from specific commit
git checkout <commit-hash>
railway up
```

---

## Post-Deployment Checklist

### Immediate (0-1 hour)
- [ ] Application accessible at production URL
- [ ] Health endpoints responding
- [ ] Database migrations successful
- [ ] No errors in server logs
- [ ] SSL certificate valid
- [ ] All environment variables set

### Short-term (1-24 hours)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user authentication working
- [ ] Test AI features (annotation, exercises)
- [ ] Monitor database performance
- [ ] Check memory and CPU usage

### Medium-term (1-7 days)
- [ ] Collect user feedback
- [ ] Review logs for anomalies
- [ ] Verify backups running
- [ ] Check uptime monitoring
- [ ] Review security alerts
- [ ] Performance optimization if needed

---

## Support & Resources

**Documentation:**
- API Documentation: `/docs/api/`
- Architecture: `/docs/architecture/`
- Database Schema: `/database/schemas/`

**Monitoring:**
- Railway Dashboard: https://railway.app/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Pages Status: Repository Settings → Pages

**Help:**
- Integration Report: `/docs/testing/INTEGRATION_DEPLOYMENT_REPORT.md`
- README: `/README.md`
- Issues: Create GitHub issue with logs

---

**Last Updated:** November 27, 2025
**Version:** 0.1.0
