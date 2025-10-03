# AI Annotations API Documentation

## Overview

The AI Annotations API provides endpoints for automated bird image annotation using GPT-4 Vision AI, along with a complete review workflow for admins to approve, reject, or edit AI-generated annotations.

**Base URL:** `/api/ai/annotations`

**Authentication:** All endpoints require admin authentication (Bearer token + admin role)

**Rate Limiting:** Generation endpoints are limited to 50 requests/hour

---

## Endpoints

### 1. Generate AI Annotations

**POST** `/api/ai/annotations/generate/:imageId`

Trigger AI annotation generation for a specific bird image using GPT-4 Vision.

**Authentication:** Admin only
**Rate Limit:** 50 requests/hour

**URL Parameters:**
- `imageId` (string, UUID, required): ID of the image to annotate

**Request Body:**
```json
{
  "imageUrl": "https://example.com/images/bird123.jpg"
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "job_1727883600_xyz789abc",
  "status": "processing",
  "imageId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Annotation generation started. Check job status for results."
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/ai/annotations/generate/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/images/cardinal.jpg"
  }'
```

**Notes:**
- Annotation generation is asynchronous (returns 202 Accepted)
- Use the returned `jobId` to check status with GET `/api/ai/annotations/:jobId`
- Typical processing time: 5-15 seconds per image
- Generated annotations are automatically saved with `pending` status

---

### 2. Get Pending Annotations

**GET** `/api/ai/annotations/pending`

List all AI-generated annotations awaiting admin review.

**Authentication:** Admin only

**Query Parameters:**
- `limit` (number, optional, default: 50, max: 100): Number of results to return
- `offset` (number, optional, default: 0): Pagination offset
- `status` (string, optional, default: 'pending'): Filter by status
  - Values: `pending`, `approved`, `rejected`, `processing`, `failed`

**Response (200 OK):**
```json
{
  "annotations": [
    {
      "jobId": "job_1727883600_xyz789abc",
      "imageId": "550e8400-e29b-41d4-a716-446655440000",
      "annotationData": [
        {
          "spanishTerm": "el pico",
          "englishTerm": "beak",
          "boundingBox": { "x": 0.45, "y": 0.30, "width": 0.10, "height": 0.08 },
          "type": "anatomical",
          "difficultyLevel": 1,
          "pronunciation": "el PEE-koh",
          "confidence": 0.95
        },
        {
          "spanishTerm": "las alas",
          "englishTerm": "wings",
          "boundingBox": { "x": 0.20, "y": 0.40, "width": 0.60, "height": 0.30 },
          "type": "anatomical",
          "difficultyLevel": 1,
          "pronunciation": "lahs AH-lahs",
          "confidence": 0.92
        }
      ],
      "status": "pending",
      "confidenceScore": 0.87,
      "reviewedBy": null,
      "reviewedAt": null,
      "notes": null,
      "createdAt": "2025-10-02T14:30:00.000Z",
      "updatedAt": "2025-10-02T14:30:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0,
  "status": "pending"
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/ai/annotations/pending?limit=10&offset=0&status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Get Annotation Job Details

**GET** `/api/ai/annotations/:jobId`

Get detailed information about a specific annotation job, including individual annotation items.

**Authentication:** Admin only

**URL Parameters:**
- `jobId` (string, required): ID of the annotation job

**Response (200 OK):**
```json
{
  "jobId": "job_1727883600_xyz789abc",
  "imageId": "550e8400-e29b-41d4-a716-446655440000",
  "annotationData": [...],
  "status": "pending",
  "confidenceScore": 0.87,
  "reviewedBy": null,
  "reviewedAt": null,
  "notes": null,
  "createdAt": "2025-10-02T14:30:00.000Z",
  "updatedAt": "2025-10-02T14:30:00.000Z",
  "items": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "spanishTerm": "el pico",
      "englishTerm": "beak",
      "boundingBox": { "x": 0.45, "y": 0.30, "width": 0.10, "height": 0.08 },
      "type": "anatomical",
      "difficultyLevel": 1,
      "pronunciation": "el PEE-koh",
      "confidence": 0.95,
      "status": "pending"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/ai/annotations/job_1727883600_xyz789abc" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Error Response (404 Not Found):**
```json
{
  "error": "Annotation job not found"
}
```

---

### 4. Approve Annotation

**POST** `/api/ai/annotations/:annotationId/approve`

Approve a specific AI-generated annotation and move it to the main annotations table.

**Authentication:** Admin only

**URL Parameters:**
- `annotationId` (string, UUID, required): ID of the annotation item to approve

**Request Body:**
```json
{
  "notes": "Looks accurate, approved!" // optional
}
```

**Response (200 OK):**
```json
{
  "message": "Annotation approved successfully",
  "annotationId": "660e8400-e29b-41d4-a716-446655440001",
  "approvedAnnotationId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/ai/annotations/660e8400-e29b-41d4-a716-446655440001/approve" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "High confidence, approved"
  }'
```

**What Happens:**
1. Annotation is inserted into main `annotations` table
2. AI annotation item status updated to `approved`
3. Review action recorded in `ai_annotation_reviews` table
4. Link created between AI annotation and approved annotation

---

### 5. Reject Annotation

**POST** `/api/ai/annotations/:annotationId/reject`

Reject a specific AI-generated annotation.

**Authentication:** Admin only

**URL Parameters:**
- `annotationId` (string, UUID, required): ID of the annotation item to reject

**Request Body:**
```json
{
  "reason": "Incorrect bounding box coordinates"
}
```

**Response (200 OK):**
```json
{
  "message": "Annotation rejected successfully",
  "annotationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/ai/annotations/660e8400-e29b-41d4-a716-446655440001/reject" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Bounding box too large"
  }'
```

---

### 6. Edit and Approve Annotation

**POST** `/api/ai/annotations/:annotationId/edit`

Edit an AI-generated annotation and approve it with the changes.

**Authentication:** Admin only

**URL Parameters:**
- `annotationId` (string, UUID, required): ID of the annotation item to edit

**Request Body:**
```json
{
  "spanishTerm": "el pico",          // optional
  "englishTerm": "beak",             // optional
  "boundingBox": {                   // optional
    "x": 0.45,
    "y": 0.30,
    "width": 0.10,
    "height": 0.08
  },
  "type": "anatomical",              // optional
  "difficultyLevel": 2,              // optional
  "pronunciation": "el PEE-koh",     // optional
  "notes": "Adjusted bounding box"   // optional
}
```

**Response (200 OK):**
```json
{
  "message": "Annotation edited and approved successfully",
  "annotationId": "660e8400-e29b-41d4-a716-446655440001",
  "approvedAnnotationId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/ai/annotations/660e8400-e29b-41d4-a716-446655440001/edit" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.50,
      "y": 0.32,
      "width": 0.08,
      "height": 0.06
    },
    "difficultyLevel": 2,
    "notes": "Made bounding box more precise"
  }'
```

**What Happens:**
1. Original annotation values merged with edited values
2. Edited annotation inserted into main `annotations` table
3. AI annotation item status updated to `edited`
4. Review action recorded with edit details

---

### 7. Bulk Approve Annotations

**POST** `/api/ai/annotations/batch/approve`

Approve multiple annotation jobs in a single request.

**Authentication:** Admin only

**Request Body:**
```json
{
  "jobIds": [
    "job_1727883600_xyz789abc",
    "job_1727883650_def456ghi",
    "job_1727883700_jkl789mno"
  ],
  "notes": "Bulk approval of high-confidence annotations" // optional
}
```

**Response (200 OK):**
```json
{
  "message": "Batch approval completed",
  "approved": 15,
  "failed": 1,
  "details": [
    {
      "jobId": "job_1727883600_xyz789abc",
      "status": "success",
      "itemsApproved": 5
    },
    {
      "jobId": "job_1727883650_def456ghi",
      "status": "success",
      "itemsApproved": 7
    },
    {
      "jobId": "job_1727883700_jkl789mno",
      "status": "error",
      "error": "Job not found"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/ai/annotations/batch/approve" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": [
      "job_1727883600_xyz789abc",
      "job_1727883650_def456ghi"
    ],
    "notes": "All annotations look accurate"
  }'
```

**What Happens:**
1. Each job processed in sequence
2. All pending items in each job approved
3. Items inserted into main `annotations` table
4. Job status updated to `approved`
5. Bulk review action recorded
6. Partial success possible (some jobs succeed, some fail)

---

### 8. Get Annotation Statistics

**GET** `/api/ai/annotations/stats`

Get review statistics and recent activity for AI annotations.

**Authentication:** Admin only

**Response (200 OK):**
```json
{
  "total": 150,
  "pending": 42,
  "approved": 95,
  "rejected": 13,
  "processing": 2,
  "failed": 1,
  "avgConfidence": "0.87",
  "recentActivity": [
    {
      "action": "bulk_approve",
      "affectedItems": 15,
      "createdAt": "2025-10-02T15:00:00.000Z",
      "reviewerEmail": "admin@example.com"
    },
    {
      "action": "edit",
      "affectedItems": 1,
      "createdAt": "2025-10-02T14:55:00.000Z",
      "reviewerEmail": "admin@example.com"
    },
    {
      "action": "reject",
      "affectedItems": 1,
      "createdAt": "2025-10-02T14:50:00.000Z",
      "reviewerEmail": "moderator@example.com"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/ai/annotations/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Data Models

### BoundingBox
```typescript
{
  x: number;        // 0-1 normalized, top-left X coordinate
  y: number;        // 0-1 normalized, top-left Y coordinate
  width: number;    // 0-1 normalized width
  height: number;   // 0-1 normalized height
}
```

### AIAnnotation
```typescript
{
  spanishTerm: string;
  englishTerm: string;
  boundingBox: BoundingBox;
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyLevel: number;  // 1-5
  pronunciation?: string;
  confidence?: number;      // 0-1
}
```

---

## Workflow

### Typical Admin Workflow

1. **Generate Annotations**
   ```bash
   POST /api/ai/annotations/generate/:imageId
   ```
   - Returns jobId for tracking

2. **Check Job Status**
   ```bash
   GET /api/ai/annotations/:jobId
   ```
   - Wait for status to change from 'processing' to 'pending'

3. **Review Pending Annotations**
   ```bash
   GET /api/ai/annotations/pending
   ```
   - See all annotations awaiting review

4. **Take Action**
   - **Approve:** `POST /api/ai/annotations/:annotationId/approve`
   - **Reject:** `POST /api/ai/annotations/:annotationId/reject`
   - **Edit:** `POST /api/ai/annotations/:annotationId/edit`

5. **Bulk Operations** (for high-confidence annotations)
   ```bash
   POST /api/ai/annotations/batch/approve
   ```

6. **Monitor Progress**
   ```bash
   GET /api/ai/annotations/stats
   ```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Admin or moderator access required"
}
```

**404 Not Found:**
```json
{
  "error": "Annotation job not found"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Too many AI generation requests. Please try again later."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to generate annotations"
}
```

---

## Environment Configuration

Required environment variables:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/aves

# JWT Secret
JWT_SECRET=your-jwt-secret-here
```

---

## Database Schema

### ai_annotations
Stores annotation job metadata
- `job_id` (VARCHAR, PRIMARY KEY)
- `image_id` (UUID)
- `annotation_data` (JSONB)
- `status` (VARCHAR)
- `confidence_score` (DECIMAL)
- `reviewed_by` (UUID)
- `reviewed_at` (TIMESTAMP)
- `notes` (TEXT)

### ai_annotation_items
Stores individual annotation items (flattened)
- `id` (UUID, PRIMARY KEY)
- `job_id` (VARCHAR, FOREIGN KEY)
- `image_id` (UUID)
- `spanish_term` (VARCHAR)
- `english_term` (VARCHAR)
- `bounding_box` (JSONB)
- `annotation_type` (VARCHAR)
- `difficulty_level` (INTEGER)
- `pronunciation` (VARCHAR)
- `confidence` (DECIMAL)
- `status` (VARCHAR)
- `approved_annotation_id` (UUID)

### ai_annotation_reviews
Tracks review history
- `id` (UUID, PRIMARY KEY)
- `job_id` (VARCHAR)
- `reviewer_id` (UUID)
- `action` (VARCHAR)
- `affected_items` (INTEGER)
- `notes` (TEXT)

---

## Best Practices

1. **Rate Limiting:** Generation endpoint limited to 50/hour to avoid OpenAI API costs
2. **Async Processing:** Generation is asynchronous; poll job status for results
3. **Confidence Scores:** Consider auto-approving annotations with confidence > 0.90
4. **Batch Operations:** Use bulk approve for high-confidence annotations
5. **Edit vs Reject:** Edit annotations with minor issues; reject only if fundamentally wrong
6. **Review History:** All actions are logged in `ai_annotation_reviews` for audit trail

---

## Performance

- **Generation Time:** 5-15 seconds per image
- **Typical Annotations:** 3-8 per image
- **Accuracy:** 85-95% based on image quality
- **API Cost:** ~$0.01-0.03 per image (GPT-4 Vision pricing)

---

## Future Enhancements

- [ ] Automatic approval for high-confidence annotations (>0.95)
- [ ] Job queue system (Bull/BullMQ) for better scalability
- [ ] Webhook notifications when jobs complete
- [ ] Batch image processing endpoint
- [ ] Annotation quality scoring
- [ ] A/B testing different AI prompts
- [ ] Support for Google Cloud Vision API as fallback
