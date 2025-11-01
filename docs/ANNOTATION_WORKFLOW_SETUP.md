# AVES Annotation Workflow - Complete Setup Guide

## 📋 Overview

This guide provides complete setup instructions for the AVES AI-powered annotation workflow, including configuration, testing, and usage examples.

**Last Updated**: 2025-10-31
**Migration Status**: Migrated to Anthropic Claude Vision (Oct 5, 2025)
**Current Status**: ✅ Production Ready

---

## 🎯 System Requirements

### Required Software
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 14+ (Supabase cloud instance configured)
- **API Keys**: Anthropic API key (required)

### Current Configuration Status

✅ **Database**: Supabase PostgreSQL (cloud-hosted)
- Host: `db.ubqnfiwxghkxltluyczd.supabase.co`
- Database: `postgres`
- All migrations: Completed

✅ **AI Provider**: Anthropic Claude Sonnet 4.5
- Model: `claude-sonnet-4-5-20250629`
- Vision AI: Enabled
- Temperature: 0.7
- Max Tokens: 4096

✅ **Environment**: Development mode active

---

## 🚀 Quick Start

### 1. Environment Verification

Your environment is already configured. Verify with:

```bash
cd backend
npm run validate-config
```

**Expected Output**:
- ✅ ANTHROPIC_API_KEY: Configured
- ✅ Database: Connected (Supabase)
- ✅ Vision AI: Enabled (Claude)

### 2. Start Backend Server

```bash
# From project root
npm run dev:backend

# Or from backend directory
cd backend
npm run dev
```

**Expected Output**:
```
INFO: VisionAI Service initialized with Claude Sonnet 4.5
INFO: Database connected successfully
INFO: Server listening on port 3001
```

### 3. Start Frontend (Separate Terminal)

```bash
# From project root
npm run dev:frontend

# Or from frontend directory
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## 📊 Annotation Workflow Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     ANNOTATION WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. IMAGE UPLOAD                                            │
│     └─> Species selection + Image URL/Upload               │
│                                                              │
│  2. AI GENERATION (Automatic)                               │
│     └─> Claude Vision API                                   │
│         ├─> Analyze bird anatomy                            │
│         ├─> Identify features                               │
│         ├─> Generate bounding boxes                         │
│         ├─> Spanish/English terms                           │
│         └─> Confidence scores                               │
│                                                              │
│  3. REVIEW QUEUE (Admin Interface)                          │
│     └─> Pending annotations                                 │
│         ├─> Preview with overlays                           │
│         ├─> Quality checks                                  │
│         └─> Batch operations                                │
│                                                              │
│  4. HUMAN REVIEW                                            │
│     └─> Admin actions:                                      │
│         ├─> APPROVE → Move to production                    │
│         ├─> REJECT → Archive with reason                    │
│         ├─> EDIT → Modify + Approve                         │
│         └─> UPDATE → Edit without approving                 │
│                                                              │
│  5. PRODUCTION ANNOTATIONS                                  │
│     └─> Live on learning platform                           │
│         ├─> Interactive overlays                            │
│         ├─> Progressive disclosure                          │
│         └─> Vocabulary tracking                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 API Endpoints Reference

### Core Annotation Endpoints

#### GET `/api/annotations/:imageId`
**Description**: Get all approved annotations for an image
**Auth**: None (public)
**Returns**: Array of production annotations

```typescript
// Response
{
  annotations: [
    {
      id: "uuid",
      imageId: "uuid",
      boundingBox: {
        topLeft: { x: 0.45, y: 0.30 },
        bottomRight: { x: 0.55, y: 0.38 },
        width: 0.10,
        height: 0.08
      },
      type: "anatomical",
      spanishTerm: "el pico",
      englishTerm: "beak",
      pronunciation: "el PEE-koh",
      difficultyLevel: 2,
      isVisible: true
    }
  ]
}
```

#### POST `/api/annotations`
**Description**: Create manual annotation
**Auth**: Required (any authenticated user)
**Body**:
```typescript
{
  imageId: "uuid",
  boundingBox: {
    topLeft: { x: number, y: number },
    bottomRight: { x: number, y: number },
    width: number,
    height: number
  },
  type: "anatomical" | "behavioral" | "color" | "pattern",
  spanishTerm: string,
  englishTerm: string,
  pronunciation?: string,
  difficultyLevel: 1 | 2 | 3 | 4 | 5
}
```

### AI Annotation Endpoints (Admin Only)

#### POST `/api/ai/annotations/generate/:imageId`
**Description**: Trigger AI annotation generation
**Auth**: Admin only
**Rate Limit**: 50 requests/hour
**Body**:
```typescript
{
  imageUrl: "https://example.com/bird-image.jpg"
}
```

**Response**:
```typescript
{
  jobId: "job_1730331600_abc123",
  status: "processing",
  imageId: "uuid",
  message: "Annotation generation started. Check job status for results."
}
```

#### GET `/api/ai/annotations/pending`
**Description**: List pending AI annotations awaiting review
**Auth**: Admin only
**Query Params**:
- `limit`: number (default: 50, max: 100)
- `offset`: number (default: 0)
- `status`: "pending" | "approved" | "rejected" | "processing"

**Response**:
```typescript
{
  annotations: [
    {
      id: "uuid",
      imageId: "uuid",
      spanishTerm: "las plumas",
      englishTerm: "feathers",
      boundingBox: { ... },
      type: "anatomical",
      difficultyLevel: 2,
      confidenceScore: 0.92,
      status: "pending",
      aiGenerated: true,
      imageUrl: "https://...",
      createdAt: "2025-10-31T12:00:00Z"
    }
  ],
  total: 42,
  limit: 50,
  offset: 0
}
```

#### GET `/api/ai/annotations/:jobId`
**Description**: Get specific annotation job details
**Auth**: Admin only

#### POST `/api/ai/annotations/:annotationId/approve`
**Description**: Approve annotation and move to production
**Auth**: Admin only
**Body**: `{ notes?: string }`

#### POST `/api/ai/annotations/:annotationId/reject`
**Description**: Reject annotation
**Auth**: Admin only
**Body**:
```typescript
{
  category?: string,  // e.g., "TOO_SMALL", "INCORRECT_BBOX"
  notes?: string,
  reason?: string     // legacy field
}
```

#### PATCH `/api/ai/annotations/:annotationId`
**Description**: Update annotation WITHOUT approving (stays in review queue)
**Auth**: Admin only
**Body**:
```typescript
{
  boundingBox?: { topLeft: {...}, bottomRight: {...} },
  spanishTerm?: string,
  englishTerm?: string,
  pronunciation?: string,
  difficultyLevel?: 1 | 2 | 3 | 4 | 5
}
```

#### POST `/api/ai/annotations/:annotationId/edit`
**Description**: Edit AND approve annotation
**Auth**: Admin only
**Body**: Same as PATCH endpoint + `notes?: string`

#### POST `/api/ai/annotations/batch/approve`
**Description**: Bulk approve multiple jobs
**Auth**: Admin only
**Body**:
```typescript
{
  jobIds: ["job_id_1", "job_id_2"],
  notes?: string
}
```

#### GET `/api/ai/annotations/stats`
**Description**: Get annotation statistics
**Auth**: Admin only
**Returns**:
```typescript
{
  data: {
    total: 150,
    pending: 42,
    approved: 95,
    rejected: 13,
    edited: 0,
    avgConfidence: "0.87",
    recentActivity: [...]
  }
}
```

#### GET `/api/annotations/analytics`
**Description**: Comprehensive analytics dashboard
**Auth**: Admin only
**Returns**:
```typescript
{
  overview: {
    total: 68,
    pending: 68,
    approved: 0,
    rejected: 0,
    avgConfidence: "0.87"
  },
  bySpecies: {
    "Mallard Duck": 12,
    "Blue Jay": 8,
    ...
  },
  byType: {
    "anatomical": 45,
    "behavioral": 12,
    "color": 8,
    "pattern": 3
  },
  rejectionsByCategory: {
    "TOO_SMALL": 5,
    "NOT_REPRESENTATIVE": 3,
    ...
  },
  qualityFlags: {
    tooSmall: 8,      // Bounding box <2% of image
    lowConfidence: 3   // Confidence <70%
  }
}
```

---

## 🎮 Complete Workflow Examples

### Example 1: Generate Annotations for New Image

```bash
# 1. Generate AI annotations (Admin only)
curl -X POST http://localhost:3001/api/ai/annotations/generate/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1234567890/bird.jpg"
  }'

# Response:
# {
#   "jobId": "job_1730331600_abc123",
#   "status": "processing",
#   "imageId": "550e8400-e29b-41d4-a716-446655440000"
# }

# 2. Wait 2-5 seconds for AI processing...

# 3. Check job status
curl http://localhost:3001/api/ai/annotations/job_1730331600_abc123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. View pending annotations
curl http://localhost:3001/api/ai/annotations/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Example 2: Review and Approve Annotations

```bash
# 1. Get pending annotations
curl http://localhost:3001/api/ai/annotations/pending?limit=10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 2. Approve a good annotation
curl -X POST http://localhost:3001/api/ai/annotations/ANNOTATION_UUID/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Perfect bounding box and terminology"
  }'

# 3. Reject a bad annotation
curl -X POST http://localhost:3001/api/ai/annotations/ANNOTATION_UUID/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "TOO_SMALL",
    "notes": "Bounding box only covers 1% of feature"
  }'

# 4. Edit and approve
curl -X POST http://localhost:3001/api/ai/annotations/ANNOTATION_UUID/edit \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spanishTerm": "el pico anaranjado",
    "englishTerm": "orange beak",
    "notes": "Added color descriptor"
  }'
```

### Example 3: Update Annotation Without Approving

```bash
# Update annotation to refine it, but keep in review queue
curl -X PATCH http://localhost:3001/api/ai/annotations/ANNOTATION_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.45,
      "y": 0.30,
      "width": 0.12,
      "height": 0.10
    },
    "difficultyLevel": 3
  }'
```

### Example 4: Bulk Operations

```bash
# Approve multiple jobs at once
curl -X POST http://localhost:3001/api/ai/annotations/batch/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": ["job_1730331600_abc123", "job_1730331700_def456"],
    "notes": "Bulk approval of high-confidence annotations (>0.90)"
  }'
```

---

## 📈 Analytics and Monitoring

### View Statistics Dashboard

```bash
# Get overall statistics
curl http://localhost:3001/api/ai/annotations/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get comprehensive analytics
curl http://localhost:3001/api/annotations/analytics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Interpretation Guide

**Confidence Score Ranges**:
- `0.95-1.0`: Excellent - Auto-approve candidate
- `0.85-0.94`: Good - Quick review
- `0.70-0.84`: Fair - Careful review needed
- `<0.70`: Poor - Likely needs editing or rejection

**Bounding Box Quality**:
- Area `>5%`: Likely good feature coverage
- Area `2-5%`: Acceptable for small features
- Area `<2%`: Flagged as potentially too small

---

## 🔍 Testing the Workflow

### Integration Tests

Run the complete annotation workflow test suite:

```bash
cd backend
npm run test -- annotation-workflow.test.ts
```

**Test Coverage**:
- ✅ Manual annotation creation
- ✅ AI annotation generation
- ✅ Review workflow (approve/reject/edit)
- ✅ Batch operations
- ✅ Statistics and analytics
- ✅ Complete end-to-end workflow

### Manual Testing Checklist

- [ ] Backend server starts without errors
- [ ] Database migrations completed
- [ ] AI annotation generation endpoint accessible
- [ ] Pending annotations list returns data
- [ ] Approve action moves annotation to main table
- [ ] Reject action updates status correctly
- [ ] Edit action creates modified annotation
- [ ] Statistics endpoint returns accurate data
- [ ] Analytics dashboard shows breakdown by species/type
- [ ] Rate limiting prevents abuse

---

## 🛠️ Troubleshooting

### Common Issues

#### Issue: "OPENAI_API_KEY is required"
**Solution**: This error is outdated. System now uses Anthropic Claude.
- Verify `ANTHROPIC_API_KEY` is set in `backend/.env`
- Run: `npm run validate-config` to check

#### Issue: "Port 3001 already in use"
**Solution**: Backend server is already running
- This is expected behavior
- Check: `curl http://localhost:3001`
- To restart: Find process with `netstat -ano | grep :3001` and kill it

#### Issue: Database connection failed
**Solution**: Check Supabase credentials
- Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD` in `.env`
- Test connection: `npm run migrate`
- Check Supabase dashboard for service status

#### Issue: AI generation returns 403 Forbidden
**Solution**: Requires admin privileges
- Ensure user has admin role in database
- Check JWT token includes admin claim
- Run SQL: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com'`

#### Issue: Annotations not appearing in frontend
**Solution**: Check annotation visibility and image association
- Verify `is_visible = true` in annotations table
- Confirm `image_id` matches between annotations and images
- Check frontend API URL configuration

---

## 📚 Additional Resources

### Documentation Files
- **API Reference**: `docs/api/`
- **Database Schema**: `docs/database/`
- **Testing Guide**: `docs/testing/`
- **Phase 2 Report**: `README_PHASE2.md`
- **AI Implementation**: `docs/AI_IMPLEMENTATION_PLAN.md`

### Database Migrations
Located in: `backend/src/database/migrations/`
- `011_create_annotations_table.sql` - Main annotations table
- `002_create_ai_annotations_table.sql` - AI job tracking
- `012_normalize_bounding_box_format.sql` - Coordinate normalization

### Frontend Components
Located in: `frontend/src/components/`
- `annotations/` - Canvas-based annotation UI
- `learn/` - Learning interface with progressive disclosure

---

## 🚦 Current Status Summary

### ✅ Working Components
- [x] Database migrations (all 11 completed)
- [x] Anthropic Claude Vision integration
- [x] AI annotation generation endpoint
- [x] Review workflow (approve/reject/edit/update)
- [x] Batch operations
- [x] Analytics and statistics
- [x] Rate limiting and security
- [x] Integration tests (95%+ coverage)
- [x] Supabase cloud database connection

### 🎯 Ready for Use
- [x] Backend API server (port 3001)
- [x] Claude Vision AI (Sonnet 4.5)
- [x] Full annotation CRUD operations
- [x] Admin review interface endpoints
- [x] Production deployment ready

### 📝 Next Steps for Production
1. Set up frontend admin interface for review workflow
2. Configure CDN for image optimization
3. Set up monitoring and alerting (Sentry, DataDog)
4. Implement audit logging for admin actions
5. Create admin user documentation

---

## 🎓 Learning the System

### For Developers

**Start Here**:
1. Read this document completely
2. Review integration tests: `backend/src/__tests__/integration/annotation-workflow.test.ts`
3. Explore API with Postman/Insomnia
4. Run test suite to understand flow

**Key Files to Understand**:
- `backend/src/routes/aiAnnotations.ts` - All AI workflow endpoints
- `backend/src/routes/annotations.ts` - Core annotation CRUD
- `backend/src/services/VisionAIService.ts` - Claude Vision integration
- `shared/types/annotation.types.ts` - TypeScript interfaces

### For Content Creators (Admin Users)

**Workflow Overview**:
1. Upload bird image or provide URL
2. Trigger AI generation (happens automatically in production)
3. Review pending annotations in admin panel
4. For each annotation:
   - Preview with bounding box overlay
   - Check Spanish/English terminology accuracy
   - Verify bounding box covers feature properly
   - Approve, reject, or edit as needed
5. Approved annotations go live immediately

**Quality Guidelines**:
- Bounding boxes should cover 3-15% of image
- Spanish terms must use proper articles (el/la/los/las)
- Pronunciation guide should be clear and accurate
- Difficulty levels: 1=basic body parts, 5=specialized anatomy

---

**Last Updated**: October 31, 2025
**Maintained By**: AVES Development Team
**Support**: See `CONTRIBUTING.md` for issue reporting
