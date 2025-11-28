# 🚀 Aves Deployment Guide

## ✅ Backend Status: DEPLOYED!
- **URL**: https://aves-production.up.railway.app
- **Platform**: Railway
- **Database**: Connected to Supabase via IPv4-compatible pooler

## 🎨 Frontend Deployment Options

### Option 1: Vercel (Recommended - Easiest)
```bash
cd frontend
npx vercel
```
- Follow prompts (just press Enter for defaults)
- Your app will be live in ~2 minutes at a URL like: https://aves-frontend.vercel.app

### Option 2: Netlify
1. Build locally:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Go to https://app.netlify.com
3. Drag the `frontend/dist` folder to deploy

### Option 3: Railway (Same Platform as Backend)
1. In Railway dashboard, click "New Service"
2. Connect to GitHub repo
3. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run preview`
4. Add environment variables:
   ```
   VITE_API_URL=https://aves-production.up.railway.app
   VITE_SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTA1NTAsImV4cCI6MjA3NTIyNjU1MH0.GNEjJ_ralYnpIeUVnDSpF64WSlPK-Z_69wIdAgwRj0U
   ```

### Option 4: GitHub Pages (Free)
1. Build for production:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## 🔗 API Endpoints

### Backend (Railway)
- Health: https://aves-production.up.railway.app/health
- API Base: https://aves-production.up.railway.app/api

### Available Endpoints:
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/species` - Bird species data
- `/api/images` - Bird images
- `/api/annotations` - Image annotations
- `/api/ai-annotations` - AI-generated annotations
- `/api/exercises` - Learning exercises

## 🔧 Environment Variables

### Backend (Already Configured in Railway)
- `NODE_ENV=production`
- `DATABASE_URL` - Supabase pooler connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `JWT_SECRET` - Authentication secret
- `SESSION_SECRET` - Session secret

### Frontend (Set During Deployment)
- `VITE_API_URL` - Backend URL
- `VITE_SUPABASE_URL` - Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key

## 📊 Testing Your Deployment

1. **Backend Health Check**:
   ```bash
   curl https://aves-production.up.railway.app/health
   ```

2. **Frontend** (after deployment):
   - Visit your frontend URL
   - Try registering a new user
   - Upload and annotate bird images

## 🛠️ Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify environment variables are set
- Ensure database connection string is using shared pooler

### Frontend Issues
- Verify `VITE_API_URL` points to correct backend
- Check browser console for errors
- Ensure CORS is configured correctly

## 📈 Next Steps

1. Deploy frontend using one of the methods above
2. Configure custom domain (optional)
3. Set up monitoring (optional)
4. Enable RLS policies in Supabase for better security

## 🎉 Success!
Your backend is fully operational at https://aves-production.up.railway.app

Just deploy your frontend and you'll have a complete working application!