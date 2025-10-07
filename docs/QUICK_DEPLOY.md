# Quick Railway Deployment

## 🚀 Deploy Backend (5 Minutes)

### Step 1: Login to Railway
```bash
railway login
```

### Step 2: Initialize and Deploy
```bash
cd backend
railway init
# Choose: Create new project
# Name it: aves-backend

railway up
# This deploys your backend!
```

### Step 3: Add Environment Variables
```bash
# Set these one by one:
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
railway variables set SUPABASE_ANON_KEY=<your-anon-key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
railway variables set CLAUDE_API_KEY=<your-claude-key>
railway variables set ALLOWED_ORIGINS=https://bjpl.github.io,http://localhost:5173
```

**Or use Railway dashboard:**
- Go to https://railway.app
- Click your project → Variables tab
- Add all variables there

### Step 4: Get Your Backend URL
```bash
railway domain
# Output: https://aves-backend-production.up.railway.app
```

**Or in dashboard:**
- Settings tab → Generate Domain

### Step 5: Update Frontend Config
```bash
cd ../frontend

# Edit .env.production:
# Change VITE_API_URL to your Railway URL
```

Then edit: `frontend/.env.production`
```env
VITE_API_URL=https://your-railway-url.up.railway.app
```

### Step 6: Redeploy Frontend
```bash
npm run deploy
```

---

## 💰 Railway Free Tier

- **$5 credit per month** (free)
- ~500 hours of runtime
- **Good for testing/development**

### Cost Calculator:
- Backend running 24/7: ~$5/month (uses free credit)
- Backend running 8hrs/day: ~$1.50/month (under free tier)

---

## 🔄 Switch Between Cloud & Local

### Use Railway (Deployed):
```bash
# Frontend .env.production
VITE_API_URL=https://your-railway-url.up.railway.app

# Deploy
npm run deploy
```

### Use Local (Free):
```bash
# Frontend .env.production
VITE_API_URL=http://localhost:3001

# Terminal 1: Run backend locally
cd backend
npm start

# Terminal 2: Test locally
cd frontend
npm run dev
# Open http://localhost:5173
```

⚠️ **Local backend won't work with deployed frontend** (bjpl.github.io can't reach localhost)

---

## 🎯 Recommended Setup

**For Development:**
- Run backend locally (`npm start`)
- Run frontend locally (`npm run dev`)
- Cost: $0

**For Testing/Demo:**
- Deploy backend to Railway
- Deploy frontend to GitHub Pages
- Cost: Free tier ($5 credit covers it)

**For Production:**
- Deploy backend to Railway/Render
- Deploy frontend to GitHub Pages
- Cost: ~$5/month or free tier

---

## 📊 Monitor Usage

```bash
# Check Railway usage
railway status

# View logs
railway logs

# Restart if needed
railway restart
```

**Dashboard:** https://railway.app/dashboard
- Shows credit usage
- View logs
- Manage variables

---

## ⚡ Quick Commands

```bash
# Deploy backend
railway up

# View logs
railway logs

# Open in browser
railway open

# Check environment
railway variables

# Redeploy after changes
git push  # If connected to GitHub
# OR
railway up  # Manual redeploy
```

---

## 🐛 If Deployment Fails

1. **Check logs:**
   ```bash
   railway logs
   ```

2. **Verify build succeeds:**
   ```bash
   cd backend
   npm run build
   ```

3. **Test locally first:**
   ```bash
   npm start
   ```

4. **Check Railway dashboard:**
   - Build logs
   - Deploy logs
   - Runtime logs

---

## 🔑 Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/ubqnfiwxghkxltluyczd/settings/api
2. Copy **service_role** key (not anon key!)
3. Use in Railway variables

---

## ✅ Checklist

- [ ] Railway CLI installed (`railway --version`)
- [ ] Logged in (`railway login`)
- [ ] Backend deployed (`railway up`)
- [ ] Environment variables set
- [ ] Domain generated (`railway domain`)
- [ ] Frontend `.env.production` updated
- [ ] Frontend redeployed (`npm run deploy`)
- [ ] Test on https://bjpl.github.io/aves/
- [ ] Bounding box save works!
