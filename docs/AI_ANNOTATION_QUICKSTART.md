# AI Annotation API - Quick Start Guide

## Prerequisites

1. **Environment Setup**
   ```bash
   # Add to .env file
   OPENAI_API_KEY=sk-your-api-key-here
   DATABASE_URL=postgresql://user:password@localhost:5432/aves
   JWT_SECRET=your-jwt-secret
   ```

2. **Database Migration**
   ```bash
   # Run the migration to create AI annotation tables
   psql -d aves -f backend/src/database/migrations/002_create_ai_annotations_table.sql
   ```

3. **Admin User Setup**
   ```bash
   # Update an existing user to admin role
   psql -d aves -c "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';"
   ```

---

## Quick Test Workflow

### Step 1: Get Admin Token

```bash
# Login as admin user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Save the token from response
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Generate Annotations

```bash
# Generate AI annotations for an image
curl -X POST "http://localhost:3001/api/ai/annotations/generate/YOUR_IMAGE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/bird-image.jpg"
  }'

# Response:
# {
#   "jobId": "job_1727883600_xyz789abc",
#   "status": "processing",
#   "imageId": "550e8400-e29b-41d4-a716-446655440000"
# }

# Save the job ID
export JOB_ID="job_1727883600_xyz789abc"
```

### Step 3: Check Job Status

```bash
# Wait 10-15 seconds, then check status
curl -X GET "http://localhost:3001/api/ai/annotations/$JOB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Status should be "pending" when complete
```

### Step 4: Review Pending Annotations

```bash
# List all pending annotations
curl -X GET "http://localhost:3001/api/ai/annotations/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Step 5: Approve an Annotation

```bash
# Approve a specific annotation item
export ANNOTATION_ID="660e8400-e29b-41d4-a716-446655440001"

curl -X POST "http://localhost:3001/api/ai/annotations/$ANNOTATION_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Looks great!"
  }'
```

### Step 6: Check Statistics

```bash
# View annotation statistics
curl -X GET "http://localhost:3001/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Common Operations

### Reject an Annotation

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/$ANNOTATION_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incorrect bounding box"
  }'
```

### Edit and Approve

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/$ANNOTATION_ID/edit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.50,
      "y": 0.32,
      "width": 0.08,
      "height": 0.06
    },
    "notes": "Adjusted bounding box size"
  }'
```

### Bulk Approve

```bash
curl -X POST "http://localhost:3001/api/ai/annotations/batch/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": [
      "job_1727883600_xyz789abc",
      "job_1727883650_def456ghi"
    ],
    "notes": "High confidence batch"
  }'
```

---

## Testing with Postman

1. **Import Environment Variables**
   ```json
   {
     "name": "AVES AI Annotations",
     "values": [
       {
         "key": "base_url",
         "value": "http://localhost:3001/api",
         "enabled": true
       },
       {
         "key": "admin_token",
         "value": "YOUR_TOKEN_HERE",
         "enabled": true
       }
     ]
   }
   ```

2. **Collection Structure**
   - Auth
     - Login (POST /auth/login)
   - AI Annotations
     - Generate (POST /ai/annotations/generate/:imageId)
     - Get Pending (GET /ai/annotations/pending)
     - Get Job (GET /ai/annotations/:jobId)
     - Approve (POST /ai/annotations/:annotationId/approve)
     - Reject (POST /ai/annotations/:annotationId/reject)
     - Edit (POST /ai/annotations/:annotationId/edit)
     - Bulk Approve (POST /ai/annotations/batch/approve)
     - Stats (GET /ai/annotations/stats)

---

## Troubleshooting

### "OpenAI API key not configured"
- Check `.env` file has `OPENAI_API_KEY`
- Restart server after adding env variable

### "Admin access required"
- Verify user has `role = 'admin'` in database
- Run: `SELECT email, role FROM users WHERE email = 'your-email';`

### Job stays in "processing" status
- Check server logs for errors
- Verify OpenAI API key is valid
- Check image URL is accessible
- Look for errors in `ai_annotations` table

### Rate limit errors
- Generation endpoint limited to 50/hour
- Wait for rate limit window to reset
- Consider implementing a queue system

---

## Database Queries

### View All Jobs
```sql
SELECT job_id, image_id, status, confidence_score, created_at
FROM ai_annotations
ORDER BY created_at DESC
LIMIT 10;
```

### View Pending Items
```sql
SELECT id, spanish_term, english_term, confidence, status
FROM ai_annotation_items
WHERE status = 'pending'
ORDER BY confidence DESC;
```

### View Review History
```sql
SELECT r.action, r.affected_items, r.notes, u.email, r.created_at
FROM ai_annotation_reviews r
LEFT JOIN users u ON r.reviewer_id = u.id
ORDER BY r.created_at DESC
LIMIT 20;
```

### Stats Query
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM ai_annotations
GROUP BY status;
```

---

## Production Deployment

### Before Going Live

1. **Set up job queue** (Bull/BullMQ)
   - Move async processing to dedicated workers
   - Better error handling and retries

2. **Configure monitoring**
   - Track API costs (OpenAI usage)
   - Monitor processing times
   - Alert on high failure rates

3. **Set appropriate rate limits**
   - Adjust based on OpenAI tier
   - Consider per-user limits

4. **Backup strategy**
   - Backup `ai_annotations` tables
   - Store raw API responses for debugging

5. **Security**
   - Rotate JWT secrets
   - Secure OpenAI API key
   - Enable HTTPS only

---

## Cost Estimation

**OpenAI GPT-4 Vision Pricing** (as of Oct 2025):
- ~$0.01-0.03 per image
- 1000 images = $10-30
- 10,000 images = $100-300

**Recommendations:**
- Start with small batches (10-50 images)
- Monitor costs in OpenAI dashboard
- Set billing alerts
- Consider caching results aggressively

---

## Next Steps

1. Test with sample images
2. Review and approve/reject generated annotations
3. Fine-tune prompts for better accuracy
4. Implement auto-approval for high-confidence annotations
5. Set up batch processing for large image sets
6. Monitor costs and performance

---

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review API docs: `docs/API_AI_ANNOTATIONS.md`
- Database schema: `backend/src/database/migrations/002_create_ai_annotations_table.sql`
