# AVES Annotation Workflow - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide gets you up and running with the full annotation workflow immediately.

---

## ✅ Prerequisites Check

Your system is already configured with:
- ✅ **Anthropic API Key**: Configured for Claude Vision
- ✅ **Database**: Supabase PostgreSQL (cloud)
- ✅ **Migrations**: All 11 migrations completed
- ✅ **Dependencies**: Backend and frontend packages installed

---

## 📝 Step 1: Start the Backend Server

```bash
# From the project root
cd backend

# Start the development server
npm run dev
```

**What to expect:**
```
INFO: VisionAI Service initialized with Claude Sonnet 4.5
INFO: Database connected successfully
INFO: Server listening on port 3001
```

**If you see "Port 3001 in use":**
```bash
# Kill the conflicting process (Hablas app)
# On Windows (find process ID):
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID):
taskkill /PID <PID> /F

# Then retry:
npm run dev
```

---

## 📝 Step 2: Start the Frontend (New Terminal)

```bash
# From the project root
cd frontend

# Start the development server
npm run dev
```

**Access at:** http://localhost:5173

---

## 🎯 Step 3: Your First Annotation Workflow

### Option A: Use the Integration Test (Recommended)

Test the complete workflow automatically:

```bash
cd backend
npm run test -- annotation-workflow.test.ts -t "Complete Annotation Workflow Integration"
```

This test will:
1. ✅ Generate AI annotations for a test image
2. ✅ Retrieve pending annotations
3. ✅ Approve the first annotation
4. ✅ Verify it moved to production table
5. ✅ Check statistics

### Option B: Manual API Testing with curl

#### 1. Get an Admin Token

First, create an admin user or login:

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aves.com",
    "password": "SecurePassword123!",
    "name": "Admin User"
  }'

# Set user as admin in database (from backend directory):
npm run migrate  # Ensure migrations are current
# Then run SQL manually or use a migration
```

**SQL to set admin role:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@aves.com';
```

#### 2. Login and Get Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aves.com",
    "password": "SecurePassword123!"
  }'
```

**Save the token from response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### 3. Create a Test Image Entry

First, you need an image record in the database. You can use the species and images endpoints:

```bash
# Get a species ID (or create one)
curl http://localhost:3001/api/species \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Generate AI Annotations

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/generate/YOUR_IMAGE_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1444464666168-49d633b86797"
  }'
```

**Response:**
```json
{
  "jobId": "job_1730331600_abc123",
  "status": "processing",
  "imageId": "your-image-uuid",
  "message": "Annotation generation started. Check job status for results."
}
```

#### 5. Wait 2-5 Seconds, Then Check Pending Annotations

```bash
curl http://localhost:3001/api/ai/annotations/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "annotations": [
    {
      "id": "annotation-uuid",
      "imageId": "your-image-uuid",
      "spanishTerm": "el pico",
      "englishTerm": "beak",
      "boundingBox": {
        "topLeft": { "x": 0.45, "y": 0.30 },
        "bottomRight": { "x": 0.55, "y": 0.38 },
        "width": 0.10,
        "height": 0.08
      },
      "type": "anatomical",
      "difficultyLevel": 2,
      "confidenceScore": 0.92,
      "status": "pending"
    }
  ],
  "total": 2
}
```

#### 6. Approve an Annotation

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/ANNOTATION_UUID/approve" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Excellent annotation, ready for production!"
  }'
```

**Response:**
```json
{
  "message": "Annotation approved successfully",
  "annotationId": "original-annotation-uuid",
  "approvedAnnotationId": "new-production-annotation-uuid"
}
```

#### 7. Verify Production Annotation

```bash
curl "http://localhost:3001/api/annotations/YOUR_IMAGE_UUID"
```

You should see the approved annotation in the production table!

#### 8. Check Statistics

```bash
curl http://localhost:3001/api/ai/annotations/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🎨 Frontend Integration

### Accessing the Admin Review Interface

Once the frontend is running (http://localhost:5173), navigate to:

```
/admin/annotations/review
```

This provides a visual interface for:
- 📋 Viewing pending annotations
- 👁️ Previewing images with bounding box overlays
- ✅ Approving annotations with one click
- ❌ Rejecting with categorized reasons
- ✏️ Editing terms, bounding boxes, and difficulty
- 📊 Viewing analytics dashboard

---

## 🔧 Common Actions

### Edit an Annotation (Without Approving)

```bash
curl -X PATCH "http://localhost:3001/api/ai/annotations/ANNOTATION_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.45,
      "y": 0.30,
      "width": 0.12,
      "height": 0.10
    },
    "spanishTerm": "el pico anaranjado"
  }'
```

### Reject an Annotation

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/ANNOTATION_UUID/reject" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "TOO_SMALL",
    "notes": "Bounding box only covers 1% of the feature"
  }'
```

### Bulk Approve Multiple Jobs

```bash
curl -X POST http://localhost:3001/api/ai/annotations/batch/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": ["job_1730331600_abc123", "job_1730331700_def456"],
    "notes": "Batch approval of high-confidence annotations"
  }'
```

---

## 📊 Monitoring & Analytics

### View Overall Statistics

```bash
curl http://localhost:3001/api/ai/annotations/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Detailed Analytics

```bash
curl http://localhost:3001/api/annotations/analytics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response includes:**
- Overall counts (total, pending, approved, rejected)
- Breakdown by species
- Breakdown by annotation type
- Rejection reasons by category
- Quality flags (too small, low confidence)

---

## ✅ Verification Checklist

Before using in production, verify:

- [ ] Backend server starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Can register and login as admin user
- [ ] AI annotation generation returns job ID
- [ ] Pending annotations list returns data
- [ ] Can approve annotation and see it in production table
- [ ] Can reject annotation with reason
- [ ] Can edit annotation terms and bounding box
- [ ] Statistics endpoint returns accurate data
- [ ] Analytics dashboard shows species/type breakdowns

---

## 🐛 Troubleshooting

### "Port 3001 already in use"

Another app (Hablas) is using port 3001. Stop it:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

### "OPENAI_API_KEY required"

This error is outdated. Verify Anthropic key is set:

```bash
cd backend
npm run validate-config
```

Should show:
- ✅ ANTHROPIC_API_KEY: Set
- ✅ Vision AI: Enabled (Claude)

### "Database connection failed"

Check Supabase credentials in `backend/.env`:

```bash
cat backend/.env | grep DB_
```

Should show Supabase host: `db.ubqnfiwxghkxltluyczd.supabase.co`

### "Annotation not found"

Make sure you're using the correct UUID from the pending list:

```bash
# Get current pending annotations
curl http://localhost:3001/api/ai/annotations/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.annotations[0].id'
```

---

## 📚 Next Steps

Once you've completed your first annotation workflow:

1. **Read the full documentation**: `docs/ANNOTATION_WORKFLOW_SETUP.md`
2. **Explore the codebase**:
   - Backend routes: `backend/src/routes/aiAnnotations.ts`
   - Vision service: `backend/src/services/VisionAIService.ts`
   - Frontend components: `frontend/src/components/annotations/`
3. **Run the test suite**:
   ```bash
   cd backend
   npm run test -- annotation-workflow.test.ts
   ```
4. **Build admin UI**: Implement the review interface in React
5. **Configure monitoring**: Set up logging and alerts for production

---

## 🎯 Key Concepts

### Bounding Box Format

The system uses TWO formats:

**Backend Format** (AI generates this):
```json
{
  "x": 0.45,        // Top-left X (0-1)
  "y": 0.30,        // Top-left Y (0-1)
  "width": 0.10,    // Width (0-1)
  "height": 0.08    // Height (0-1)
}
```

**Frontend Format** (UI displays this):
```json
{
  "topLeft": { "x": 0.45, "y": 0.30 },
  "bottomRight": { "x": 0.55, "y": 0.38 },
  "width": 0.10,
  "height": 0.08
}
```

The API automatically converts between formats.

### Annotation States

- **`processing`**: AI is generating annotations
- **`pending`**: Awaiting human review
- **`approved`**: Moved to production table
- **`rejected`**: Archived with reason
- **`edited`**: Modified and approved

### Confidence Scores

- **0.95-1.0**: Excellent (consider auto-approval)
- **0.85-0.94**: Good (quick review)
- **0.70-0.84**: Fair (careful review)
- **<0.70**: Poor (likely needs editing)

---

## 🎓 Learning Resources

- **Integration Test**: `backend/src/__tests__/integration/annotation-workflow.test.ts`
  - Shows complete workflow from generation to approval
  - Excellent reference for API usage

- **API Routes**: `backend/src/routes/aiAnnotations.ts`
  - All endpoint implementations
  - Zod validation schemas
  - Error handling patterns

- **Vision Service**: `backend/src/services/VisionAIService.ts`
  - Claude Vision API integration
  - Annotation generation logic
  - Prompt engineering

---

**Ready to annotate!** 🦅

For detailed API documentation, see `docs/ANNOTATION_WORKFLOW_SETUP.md`

**Last Updated**: October 31, 2025
