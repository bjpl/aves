# Backend Deployment Guide - Railway

## Quick Deploy (5 Minutes)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy Backend
```bash
cd backend
railway init
railway up
```

### Step 3: Set Environment Variables
```bash
# In Railway dashboard or CLI:
railway variables set PORT=3001
railway variables set SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
railway variables set CLAUDE_API_KEY=<your-claude-key>
```

### Step 4: Get Backend URL
```bash
railway domain
# Output: https://aves-backend-production.up.railway.app
```

### Step 5: Update Frontend Config
```bash
cd ../frontend

# Create .env.production
cat > .env.production << EOF
VITE_API_URL=https://aves-backend-production.up.railway.app
VITE_SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
```

### Step 6: Redeploy Frontend
```bash
npm run deploy
```

## Alternative: Render.com

### Step 1: Create Account
- Go to https://render.com
- Sign up with GitHub

### Step 2: New Web Service
- Click "New +" → "Web Service"
- Connect your GitHub repo
- Select `backend` folder
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node
- Plan: Free

### Step 3: Environment Variables
Add in Render dashboard:
- `PORT` = 3001
- `SUPABASE_URL` = https://ubqnfiwxghkxltluyczd.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = <your-key>
- `CLAUDE_API_KEY` = <your-key>

### Step 4: Get URL
- Copy URL: https://aves-backend.onrender.com

### Step 5: Update Frontend
Same as Railway Step 5-6

## Alternative: Supabase Edge Functions (Advanced)

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Step 2: Initialize Functions
```bash
cd backend
supabase functions new update-annotation
supabase functions new reject-annotation
```

### Step 3: Deploy
```bash
supabase functions deploy update-annotation
supabase functions deploy reject-annotation
```

### Step 4: Update Frontend
```typescript
// Use Supabase function URL
VITE_API_URL=https://ubqnfiwxghkxltluyczd.supabase.co/functions/v1
```

## Troubleshooting

### Railway Issues
- Check logs: `railway logs`
- Restart: `railway restart`
- Check vars: `railway variables`

### Render Issues
- Check logs in dashboard
- Restart service
- Verify build succeeded

### CORS Issues
Add to backend:
```typescript
app.use(cors({
  origin: 'https://bjpl.github.io',
  credentials: true
}));
```

## Cost Comparison

| Platform | Free Tier | Limits |
|----------|-----------|--------|
| **Railway** | $5/month credit | ~500 hours/month |
| **Render** | Free forever | Sleeps after 15min inactivity |
| **Vercel** | Free | Serverless, 100GB bandwidth |
| **Supabase** | Free | Included with DB plan |

## Recommended: Railway
- ✅ Easy CLI deployment
- ✅ Auto-deploys from GitHub
- ✅ Good free tier
- ✅ No sleep time
- ✅ Built-in logging

## Next Steps After Deployment

1. ✅ Backend deployed to Railway
2. ✅ Frontend updated with production API URL
3. ✅ Test annotation workflow on deployed site
4. ✅ Monitor backend logs for errors
5. ✅ Set up auto-deploy from GitHub (optional)
