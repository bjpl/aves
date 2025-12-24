# Quality Filter & Bird Detection Integration

## Overview

This document describes the integration of image quality filtering and bird detection into the AI annotation generation pipeline.

## Architecture

### Components

1. **ImageQualityValidator** (`services/ImageQualityValidator.ts`)
   - Assesses image quality using Claude Vision API
   - Returns quality score (0-100) and suitability assessment
   - Identifies specific quality issues and recommendations

2. **BirdDetectionService** (`services/BirdDetectionService.ts`)
   - Detects bird presence and location with bounding box
   - Performs combined quality assessment
   - Returns validation result with skip reasons
   - Supports batch validation

3. **Integration Point** (`routes/aiAnnotations.ts`)
   - Validates image before annotation generation
   - Skips unsuitable images with detailed reasons
   - Passes bird location context to VisionAI
   - Stores quality metrics with annotations

## Integration Flow

```
1. User requests annotation generation
   ↓
2. Run BirdDetectionService.validateImage(imageUrl)
   ↓
3. Check validationResult.valid
   ├─ If false: Skip with detailed reason
   └─ If true: Continue to annotation generation
   ↓
4. Fetch species information from database
   ↓
5. Pass bird location and quality metrics to VisionAI
   ↓
6. Generate annotations with enhanced context
   ↓
7. Store quality metrics with each annotation
   ↓
8. Update job status (completed or failed with skip reason)
```

## Quality Metrics

### Quality Score Calculation

```typescript
quality_score = (
  clarity * 30 +
  lighting * 20 +
  focus * 30 +
  birdSize * 20
)
```

Ranges:
- **80-100**: Excellent - ideal for annotation
- **60-79**: Good - suitable for annotation
- **40-59**: Fair - usable but not ideal
- **0-39**: Poor - unsuitable for annotation

### Skip Reasons

Images are skipped for the following reasons:

1. **No bird detected in image**
   - Threshold: `detected === false`

2. **Low detection confidence**
   - Threshold: `confidence < 0.6`

3. **Bird too small**
   - Threshold: `percentageOfImage < 0.05` (5% of image)

4. **Image quality unsuitable**
   - Set by Claude Vision assessment

5. **Image too blurry**
   - Threshold: `clarity < 0.6`

6. **Poor lighting**
   - Threshold: `lighting < 0.5`

7. **Bird partially cut off or obscured**
   - Set by Claude Vision assessment

## Database Schema

### Migration: `011_add_quality_metrics_to_annotations.sql`

Added columns to `ai_annotation_items`:

```sql
quality_score INTEGER             -- Overall quality (0-100)
bird_detected BOOLEAN             -- Bird presence
bird_confidence DECIMAL(3,2)      -- Detection confidence (0-1)
bird_size_percentage DECIMAL(3,2) -- Bird size relative to image (0-1)
image_clarity DECIMAL(3,2)        -- Clarity score (0-1)
image_lighting DECIMAL(3,2)       -- Lighting score (0-1)
image_focus DECIMAL(3,2)          -- Focus score (0-1)
skip_reason TEXT                  -- Reason for skipping (if applicable)
```

### Indexes

- `idx_ai_annotation_items_quality_score` - Filter by quality
- `idx_ai_annotation_items_bird_detected` - Filter validated images

### Constraints

- All decimal scores are constrained to 0-1 range
- Quality score is constrained to 0-100 range

## API Changes

### POST /api/ai-annotations/images/:imageId/generate

**Enhanced Response** (when image is skipped):

```json
{
  "jobId": "job_123",
  "status": "failed",
  "error": "Image skipped: Bird too small: 3.2% of image",
  "validation": {
    "valid": false,
    "detection": {
      "detected": true,
      "confidence": 0.85,
      "percentageOfImage": 0.032,
      "boundingBox": {...}
    },
    "quality": {
      "suitable": false,
      "birdSize": 0.032,
      "clarity": 0.85,
      "lighting": 0.75,
      "focus": 0.90,
      "partialBird": false
    },
    "skipReason": "Bird too small: 3.2% of image"
  }
}
```

**Enhanced Context** (passed to VisionAI):

```typescript
imageCharacteristics: [
  "Bird size: 32.5%",
  "Clarity: 0.85",
  "Lighting: 0.75",
  "Bird location: center at (0.52, 0.48)"
]
```

## Usage Examples

### 1. Generate Annotations with Quality Filter

```typescript
// POST /api/ai-annotations/images/:imageId/generate
// The quality filter runs automatically

// If image passes quality check:
{
  "jobId": "job_123",
  "status": "processing",
  "imageId": "uuid-123"
}

// If image fails quality check:
{
  "error": "Image skipped: No bird detected in image",
  "skipReason": "No bird detected in image",
  "validation": {...}
}
```

### 2. Query Annotations with Quality Metrics

```sql
-- Get high-quality annotations only
SELECT * FROM ai_annotation_items
WHERE quality_score >= 80
  AND bird_detected = true
  AND image_clarity >= 0.7;

-- Get annotations that were skipped
SELECT * FROM ai_annotations
WHERE status = 'failed'
  AND error_message LIKE 'Image skipped:%';
```

### 3. Test Quality Filter

```bash
# Run test script
cd backend
npx tsx scripts/test-quality-filter.ts
```

## Performance Considerations

### API Calls

- **BirdDetectionService.validateImage()**: 1 Claude Vision API call
- **VisionAIService.generateAnnotations()**: 1 Claude Vision API call
- **Total per image**: 2 API calls (increased from 1)

### Benefits

- **Cost savings**: Skip unsuitable images early (no annotation generation)
- **Quality improvement**: Only annotate high-quality images
- **User experience**: Clear feedback on why images were skipped
- **Data insights**: Quality metrics for analytics and improvement

### Rate Limiting

- Quality check adds ~2-5 seconds per image
- Batch processing includes 1-second delays between requests
- Rate limiter: 50 requests per hour (unchanged)

## Monitoring

### Metrics to Track

1. **Skip Rate**: Percentage of images skipped
2. **Skip Reasons**: Distribution of skip reasons
3. **Quality Distribution**: Average quality scores
4. **Detection Accuracy**: Bird detection success rate
5. **Cost Savings**: API calls saved by skipping

### Logging

```typescript
info('Image validation completed', {
  valid: true/false,
  detected: true/false,
  suitable: true/false,
  skipReason: "..."
});
```

## Configuration

### Thresholds (BirdDetectionService)

```typescript
MIN_BIRD_SIZE = 0.05       // 5% of image
MIN_CONFIDENCE = 0.6       // 60% detection confidence
MIN_CLARITY = 0.6          // 60% clarity
MIN_LIGHTING = 0.5         // 50% lighting quality
```

### Model Configuration

```typescript
ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'
ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
```

## Testing

### Test Script

Location: `/backend/scripts/test-quality-filter.ts`

Tests:
1. High-quality bird image → Should pass
2. Blurry bird image → Should fail (clarity)
3. Small bird image → Should fail (size)
4. No bird image → Should fail (detection)

### Manual Testing

1. Generate annotation for a known good image
2. Generate annotation for a known bad image (blurry, small, etc.)
3. Check database for quality metrics
4. Verify skip reasons in job status

## Migration Instructions

### 1. Run Database Migration

```bash
cd backend
psql -d aves -f src/database/migrations/011_add_quality_metrics_to_annotations.sql
```

### 2. Verify Services

```bash
# Check that services are imported correctly
npm run typecheck

# Run tests
npm test
```

### 3. Test Integration

```bash
# Test with sample images
npx tsx scripts/test-quality-filter.ts
```

### 4. Monitor Production

- Watch for skip rates in logs
- Monitor API costs (2x calls per image)
- Track quality score distribution
- Adjust thresholds if needed

## Troubleshooting

### Issue: Too many images being skipped

**Solution**: Lower quality thresholds in `BirdDetectionService`

```typescript
MIN_BIRD_SIZE = 0.03      // Reduce from 0.05
MIN_CLARITY = 0.5         // Reduce from 0.6
```

### Issue: Poor quality images passing through

**Solution**: Increase quality thresholds or adjust scoring weights

```typescript
MIN_CLARITY = 0.7         // Increase from 0.6
MIN_LIGHTING = 0.6        // Increase from 0.5

// Adjust quality score calculation
quality_score = (
  clarity * 40 +          // Increase clarity weight
  lighting * 20 +
  focus * 30 +
  birdSize * 10           // Decrease size weight
)
```

### Issue: API timeout errors

**Solution**: Increase timeout in service constructors

```typescript
timeout: 5 * 60 * 1000    // 5 minutes (increase from 2)
```

## Future Enhancements

1. **Async Validation**: Run validation in background for batch jobs
2. **Caching**: Cache validation results for previously seen images
3. **Manual Override**: Allow admins to override quality checks
4. **Quality Trends**: Analytics dashboard for quality metrics
5. **Smart Retries**: Retry with adjusted parameters for borderline images
6. **Custom Thresholds**: Per-species or per-collection threshold settings

## References

- [BirdDetectionService Implementation](../src/services/BirdDetectionService.ts)
- [ImageQualityValidator Implementation](../src/services/ImageQualityValidator.ts)
- [Route Integration](../src/routes/aiAnnotations.ts)
- [Database Migration](../src/database/migrations/011_add_quality_metrics_to_annotations.sql)
