# Quality Scoring Integration - Quick Reference

## Integration Overview

✅ **Integrated Endpoints:** 5 total
- Image Upload
- Image Collection
- Batch Annotation
- Single Image Annotation
- Bulk Annotation

## Quality Thresholds

| Score Range | Category | Annotation | Meaning |
|------------|----------|-----------|---------|
| 80-100 | High | ✅ Allowed | Ideal for annotation |
| 60-79 | Medium | ✅ Allowed | Suitable for annotation |
| 0-59 | Low | ❌ Blocked | Unsuitable for annotation |
| NULL | Unscored | ⚠️ Check first | Not yet assessed |

## Integration Behavior

### Upload Endpoint
```
Upload → Process → Save → Quality Check → Update DB
                                    ↓
                            (Non-blocking - logs only)
```

### Collection Endpoint
```
Fetch → Save → Quality Check → Mark Success/Fail
                      ↓
              score >= 60 ? Success : Fail
```

### Annotation Endpoints
```
Request → Quality Check → score >= 60?
                ↓              ↓
              NULL?        Yes → Annotate
                ↓          No → Reject (422)
         Assess Now
```

## API Response Examples

### Upload Success (High Quality)
```json
{
  "uploaded": [{
    "id": "uuid",
    "url": "/uploads/images/...",
    "qualityScore": 85
  }]
}
```

### Annotation Blocked (Low Quality)
```json
{
  "error": "Image quality too low for annotation",
  "message": "Image quality score (45/100) is below minimum threshold of 60...",
  "qualityScore": 45
}
```

### Collection Job Status
```json
{
  "status": "completed",
  "progress": {
    "successful": 7,  // score >= 60
    "failed": 3       // score < 60
  },
  "errors": [
    {
      "item": "Cardinal:photo_id",
      "error": "Quality too low (45/100): birdSize: Bird too small"
    }
  ]
}
```

## Database Query

```sql
-- Get quality distribution
SELECT
  CASE
    WHEN quality_score >= 80 THEN 'high'
    WHEN quality_score >= 60 THEN 'medium'
    WHEN quality_score IS NOT NULL THEN 'low'
    ELSE 'unscored'
  END as category,
  COUNT(*) as count
FROM images
GROUP BY category;
```

## Quality Checks Performed

1. **Bird Size** (25%) - Bird must be 15-80% of image
2. **Positioning** (20%) - Bird not at edge, >60% visible
3. **Resolution** (20%) - Minimum 400x400px
4. **Contrast** (15%) - Brightness 40-220
5. **Primary Subject** (20%) - Bird is main subject

## Error Handling

| Scenario | Behavior | Quality Score |
|----------|----------|---------------|
| Upload - Quality check fails | Upload succeeds | NULL |
| Collection - Quality check fails | Image saved | NULL |
| Collection - Score < 60 | Marked as failed | 0-59 |
| Annotation - No score | Assess then decide | Assessed |
| Annotation - Score < 60 | Return 422 error | 0-59 |
| Annotation - Score ≥ 60 | Proceed with annotation | 60-100 |

## Logging Examples

```javascript
// Quality assessed
info('Image quality assessed', {
  imageId: 'uuid',
  qualityScore: 75,
  passed: true,
  category: 'medium'
});

// Below threshold
info('Image quality below annotation threshold', {
  imageId: 'uuid',
  qualityScore: 45,
  failedChecks: 'birdSize: Bird too small (8.2% of frame)'
});

// Assessment error
logError('Failed to assess image quality', error, {
  imageId: 'uuid',
  filename: 'bird.jpg'
});
```

## Common Issues & Solutions

### Issue: All images getting NULL scores
**Solution:** Check that ImageQualityValidator is properly initialized and sharp is installed

### Issue: Quality check too slow
**Solution:** Quality checks are async and cached. First check is slow (~500ms), subsequent checks use cached score

### Issue: Images with good quality getting low scores
**Solution:** Check that bird is clearly visible and 15-80% of frame. Review failed checks in logs

### Issue: Want to re-score images
**Solution:** Set quality_score to NULL and trigger annotation (will re-assess)

## Testing Commands

```bash
# Upload with quality check
curl -X POST http://localhost:3001/api/admin/images/upload \
  -F "speciesId=uuid" -F "files=@bird.jpg"

# Collect with quality filtering
curl -X POST http://localhost:3001/api/admin/images/collect \
  -d '{"speciesIds":["uuid"],"count":5}'

# Try annotation (will check quality)
curl -X POST http://localhost:3001/api/admin/images/uuid/annotate

# Check job status (includes quality metrics)
curl http://localhost:3001/api/admin/images/jobs/jobId
```

## Key Files

- **Service:** `backend/src/services/ImageQualityValidator.ts`
- **Integration:** `backend/src/routes/adminImageManagement.ts`
- **Tests:** `backend/tests/services/ImageQualityValidator.test.ts`
- **Docs:** `docs/QUALITY_SCORING_INTEGRATION.md`

## Performance Notes

- ⚡ Assessment time: ~500ms per image
- 💾 Scores cached in database (no redundant checks)
- 🔄 Collection/batch jobs run checks asynchronously
- ✅ No blocking on upload success path

---

**Quick Tip:** Quality scores persist in the database. If you need to re-assess an image, set its quality_score to NULL and trigger any endpoint that checks quality (like annotation).
