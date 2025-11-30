# AVES Deployment Guide

## 🚀 Deployment Overview

AVES uses a modern cloud deployment architecture:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (Node.js + Express)
- **Database**: Supabase (PostgreSQL)

## ✅ Deployment Status

### Recent Updates Pushed (November 29, 2025)
- All Round 2 user testing issues fixed
- Annotation exercise pipeline implemented
- UI/UX improvements
- Data integrity verified
- Pipeline monitoring dashboard added

### Commits Deployed
```
88c4c74 feat: implement complete annotation exercise pipeline
2df3bae feat: complete all remaining user testing issues
87e1b18 fix: add array guards to SpeciesCard component
4a67c3e fix: handle null/undefined arrays in Species Browser filtering
```

## 🔄 Automatic Deployment

Both platforms support automatic deployment from GitHub:

### Frontend (Vercel)
1. **Automatic**: Pushes to `main` branch trigger deployment
2. **Build Command**: `npm run build:vercel`
3. **Output Directory**: `dist`
4. **URL**: Your Vercel deployment URL

### Backend (Railway)
1. **Automatic**: Pushes to `main` branch trigger deployment
2. **Build**: Uses Nixpacks
3. **Health Check**: `/health` endpoint
4. **URL**: https://aves-production.up.railway.app

## 📝 Manual Deployment Commands

### Deploy Frontend to Vercel
```bash
cd frontend
npm run build:vercel
vercel --prod
```

### Deploy Backend to Railway
```bash
# From root directory
npm run deploy:railway
```

### Monitor Railway Logs
```bash
npm run logs:railway
```

## 🔧 Environment Variables

### Frontend (Vercel)
Set in Vercel Dashboard:
- `VITE_API_URL`: https://aves-production.up.railway.app
- `VITE_SUPABASE_URL`: Your Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### Backend (Railway)
Set in Railway Dashboard:
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Your Supabase URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service key
- `JWT_SECRET`: Strong random secret (min 32 chars)
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `NODE_ENV`: production
- `PORT`: (Railway sets this automatically)

## 🗄️ Database Migrations

The latest migration (018) has been added for the annotation pipeline:

### Run Migrations in Production
```bash
# SSH into Railway instance or run via Railway CLI
npx tsx src/database/migrate.ts
```

### New Tables Added
- `annotation_exercise_pipeline_log`
- `user_species_interactions`
- Enhanced `exercise_cache` table

## ✅ Post-Deployment Checklist

### Frontend Verification
- [ ] Homepage loads correctly
- [ ] Navigation works (all tabs)
- [ ] Login/logout functionality
- [ ] Species Browser displays all 10 species
- [ ] Learn tab shows exercises
- [ ] Practice tab loads exercises
- [ ] Admin dashboard accessible

### Backend Verification
- [ ] Health check endpoint responds: `GET /health`
- [ ] API documentation available: `GET /api/docs`
- [ ] Authentication working
- [ ] Annotation approval triggers pipeline
- [ ] Exercise endpoints responding

### Pipeline Verification
- [ ] Check pipeline stats: `GET /api/annotation-exercises/pipeline-stats`
- [ ] Verify exercise generation on annotation approval
- [ ] Monitor cache performance
- [ ] Check pipeline dashboard in admin panel

## 📊 Monitoring

### Frontend (Vercel)
- Analytics dashboard in Vercel
- Real User Monitoring (RUM)
- Error tracking

### Backend (Railway)
- Logs: `npm run logs:railway`
- Metrics dashboard in Railway
- Health checks every 30 seconds

### Application Monitoring
- Pipeline Monitoring Dashboard (Admin → Pipeline Monitoring)
- ML Analytics Dashboard (Admin → ML Analytics)
- Annotation Analytics (Admin → Analytics)

## 🚨 Troubleshooting

### Frontend Issues
1. **Build Failures**
   ```bash
   npm run build:vercel
   # Check for TypeScript errors
   npm run typecheck
   ```

2. **API Connection Issues**
   - Verify `VITE_API_URL` is correct
   - Check CORS settings in backend

### Backend Issues
1. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Check Supabase service is running
   - Run migrations if needed

2. **Memory Issues**
   - Railway default: 512MB RAM
   - Upgrade if needed in Railway dashboard

### Pipeline Issues
1. **Exercises Not Generating**
   - Check pipeline logs in dashboard
   - Verify annotation approval webhook
   - Check database tables exist

2. **Cache Not Working**
   - Verify exercise_cache table exists
   - Check cache expiration settings
   - Monitor cache statistics

## 🔐 Security Checklist

- [x] JWT_SECRET is strong (32+ chars)
- [x] Environment variables not in repository
- [x] CORS configured correctly
- [x] Rate limiting enabled
- [x] SQL injection prevention
- [x] XSS protection enabled

## 📈 Performance Optimization

### Current Optimizations
- Exercise caching (24-hour TTL)
- Database query optimization
- Frontend code splitting
- Image lazy loading
- API response caching

### Recommended Future Optimizations
- CDN for static assets
- Redis for session cache
- Database connection pooling
- WebSocket for real-time updates
- Service worker for offline support

## 🎯 Success Metrics

### Target Performance
- Frontend Load Time: <3s
- API Response Time: <500ms
- Cache Hit Rate: >80%
- Uptime: >99.9%
- Error Rate: <1%

### Current Status
- ✅ All critical functionality working
- ✅ Data integrity verified
- ✅ UI/UX issues resolved
- ✅ Pipeline integrated
- ✅ Monitoring enabled

## 📞 Support

### Deployment Issues
- Check Railway logs: `npm run logs:railway`
- Check Vercel build logs in dashboard
- Review error tracking in monitoring tools

### Application Issues
- Check Pipeline Monitoring Dashboard
- Review application logs
- Check database migrations status

---

**Deployment Date**: November 29, 2025
**Version**: 1.0.0 (with annotation pipeline)
**Status**: ✅ Production Ready