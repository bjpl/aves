# Railway Setup - Manual Method

## 🎯 The deployment failed automatically. Let's do it manually via dashboard.

### Step 1: Go to Railway Dashboard
**Open:** https://railway.app/dashboard

### Step 2: Find Your Project
- You should see **"aves-backend"** in your projects
- Click on it

### Step 3: Delete Failed Deployment (if exists)
- If you see a failed service, delete it
- Click the service → Settings → Delete Service

### Step 4: Create New Service
1. Click **"+ New"**
2. Select **"Empty Service"**
3. Name it: **aves-backend**

### Step 5: Deploy from GitHub
1. Click on the service
2. Click **"Connect Repo"**
3. Select your **bjpl/aves** repository
4. Set **Root Directory:** `backend`
5. Click **Deploy**

**OR Deploy from Local:**
1. Click **"Deploy from Local"**
2. Railway will detect the backend folder
3. Click **Deploy**

### Step 6: Add Environment Variables
Click **Variables** tab and add:

```
PORT=3001
NODE_ENV=production

SUPABASE_URL=https://ubqnfiwxghkxltluyczd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTA1NTAsImV4cCI6MjA3NTIyNjU1MH0.GNEjJ_ralYnpIeUVnDSpF64WSlPK-Z_69wIdAgwRj0U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicW5maXd4Z2hreGx0bHV5Y3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY1MDU1MCwiZXhwIjoyMDc1MjI2NTUwfQ.385WSN4_WsQgWQau5VS_jXOjf1dTDQwcwDi6RSQiroU

DATABASE_URL=postgresql://postgres:ymS5gBm9Wz9q1P11@db.ubqnfiwxghkxltluyczd.supabase.co:5432/postgres

ANTHROPIC_API_KEY=sk-ant-api03-_lKPcJaUmy4ofDY2BQNSHs76B0v5qneIBeko5cx26-oDTktOCejdXFQl-uEoUG3r_JkTCC2FWEp9iRVaO7MCTg--FXXc6wAA
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ENABLE_VISION_AI=true
VISION_PROVIDER=claude

ALLOWED_ORIGINS=https://bjpl.github.io

UNSPLASH_ACCESS_KEY=eSjXJ5k6vbf2APMbdCXGqcFIeSIy8stFN4sp3zgFjk8

JWT_SECRET=290d3903773734282eaf8870aa1de666b6c6c8999953bfa9fbde15b1e4d7584f
JWT_EXPIRES_IN=24h
```

### Step 7: Generate Domain
1. Go to **Settings** tab
2. Scroll to **Networking** section
3. Click **"Generate Domain"**
4. Copy the URL (like: `https://aves-backend-production-abc123.up.railway.app`)

### Step 8: Check Build Logs
- Click **Deployments** tab
- Check if build succeeded
- Look for errors if it failed

### Step 9: Paste URL Here
Once you have the working Railway URL, paste it in chat!

---

## Alternative: Try CLI Again

If dashboard doesn't work, try CLI linking:

```bash
cd backend

# Link to service interactively (you'll select with arrow keys + enter)
railway service

# Then set variables
railway variables --set "PORT=3001"
# ... etc
```

---

## What Went Wrong Before?

The automatic deployment failed because:
1. ❌ Service wasn't properly linked
2. ❌ Environment variables weren't set before build
3. ❌ Build might have failed without proper config

The manual dashboard method is more reliable!
