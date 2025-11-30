# ImageQualityValidator Service

## Overview

The `ImageQualityValidator` service implements technical quality assessment for bird images to determine their suitability for annotation generation. It performs 5 comprehensive quality checks to ensure images meet the standards required for educational content creation.

## Quality Checks

### 1. Bird Size Check (25% weight)
- **Requirement**: Bird must be 15-80% of image area
- **Rationale**: Too small = hard to annotate; too large = cropped features
- **Threshold**: `minBirdSize: 0.15, maxBirdSize: 0.80`

### 2. Positioning & Occlusion (20% weight)
- **Requirement**: Bird must be ≥60% visible (< 40% obscured)
- **Rationale**: Occluded features cannot be annotated
- **Threshold**: `minOcclusionRatio: 0.60`

### 3. Image Resolution (20% weight)
- **Requirement**: Minimum dimension ≥400px (120k total pixels)
- **Rationale**: Low resolution images lack detail for annotations
- **Threshold**: `minResolution: 120000`

### 4. Contrast & Brightness (15% weight)
- **Requirement**: Average brightness 40-220 (0-255 scale)
- **Rationale**: Proper exposure ensures features are visible
- **Thresholds**: `minBrightness: 40, maxBrightness: 220`

### 5. Primary Subject (20% weight)
- **Requirement**: Bird is the main subject (confidence ≥0.7)
- **Rationale**: Multiple birds or small subjects confuse annotation
- **Implementation**: Checks bird size is within optimal range

## API

### Class: ImageQualityValidator

```typescript
class ImageQualityValidator {
  constructor(thresholds?: QualityThresholds)

  // Analyze image from URL (uses sharp for image processing)
  async analyzeImage(imageUrl: string): Promise<QualityAnalysis>

  // Validate pre-computed metadata (for testing)
  validateImage(metadata: ImageMetadata): ValidationResult

  // Utility methods
  isBirdAtEdge(bbox: BoundingBox, threshold?: number): boolean
  getLargestBird(bboxes: BoundingBox[]): BoundingBox | null
  getThresholds(): Required<QualityThresholds>
  updateThresholds(newThresholds: QualityThresholds): void
  isConfigured(): boolean
}
```

### Interfaces

```typescript
interface QualityAnalysis {
  overallScore: number; // 0-100
  passed: boolean; // true if score >= 60
  checks: {
    birdSize: QualityCheckResult;
    positioning: QualityCheckResult;
    resolution: QualityCheckResult;
    contrast: QualityCheckResult;
    primarySubject: QualityCheckResult;
  };
  category: 'high' | 'medium' | 'low';
}

interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  reason?: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  birdBoundingBox?: BoundingBox;
  averageBrightness?: number;
  occlusionRatio?: number;
  hasMultipleBirds?: boolean;
}
```

## Quality Score Categories

- **High** (80-100): Excellent quality, ideal for annotation
- **Medium** (60-79): Good quality, suitable for annotation
- **Low** (0-59): Poor quality, unsuitable for annotation

## Usage Examples

### Basic Usage

```typescript
import { imageQualityValidator } from '../services/ImageQualityValidator';

// Analyze image from URL
const analysis = await imageQualityValidator.analyzeImage(
  'https://example.com/bird-image.jpg'
);

console.log(`Score: ${analysis.overallScore}`);
console.log(`Category: ${analysis.category}`);
console.log(`Passed: ${analysis.passed}`);

// Check individual quality checks
if (!analysis.checks.birdSize.passed) {
  console.log(`Bird size issue: ${analysis.checks.birdSize.reason}`);
}
```

### With Custom Thresholds

```typescript
import { ImageQualityValidator } from '../services/ImageQualityValidator';

// Create validator with stricter thresholds
const strictValidator = new ImageQualityValidator({
  minBirdSize: 0.25, // Require 25% minimum
  minOcclusionRatio: 0.75, // Require 75% visible
  minResolution: 200000 // Higher resolution
});

const analysis = await strictValidator.analyzeImage(imageUrl);
```

### Integration with BirdDetectionService

```typescript
import { birdDetectionService } from '../services/BirdDetectionService';
import { imageQualityValidator } from '../services/ImageQualityValidator';

// Step 1: Validate image has bird and basic quality
const validation = await birdDetectionService.validateImage(imageUrl);

if (!validation.valid) {
  console.log(`Image rejected: ${validation.skipReason}`);
  return;
}

// Step 2: Assess detailed quality for annotation
const qualityAnalysis = await imageQualityValidator.analyzeImage(imageUrl);

if (!qualityAnalysis.passed) {
  console.log(`Quality too low: ${qualityAnalysis.overallScore}`);
  return;
}

// Step 3: Store quality score in database
await db.query(
  'UPDATE images SET quality_score = $1 WHERE id = $2',
  [qualityAnalysis.overallScore, imageId]
);
```

### Metadata-Based Validation (Testing)

```typescript
// For testing or when metadata is pre-computed
const metadata: ImageMetadata = {
  width: 1920,
  height: 1080,
  birdBoundingBox: { x: 0.25, y: 0.20, width: 0.45, height: 0.50 },
  averageBrightness: 150,
  occlusionRatio: 0.95,
  hasMultipleBirds: false
};

const result = imageQualityValidator.validateImage(metadata);
console.log(`Passed: ${result.passed}, Score: ${result.score}`);
```

## Database Integration

### Storing Quality Scores

```sql
-- Quality score is stored in images table
UPDATE images
SET quality_score = $1
WHERE id = $2;

-- Query by quality category
SELECT * FROM images
WHERE quality_score >= 80  -- High quality
ORDER BY quality_score DESC;
```

### Quality Categories (Database Function)

```sql
SELECT
  id,
  url,
  quality_score,
  get_quality_category(quality_score) as category
FROM images
WHERE quality_score IS NOT NULL;
```

## Integration Points

1. **BirdDetectionService**: Pre-validates images before detailed quality assessment
2. **VisionAIService**: Uses quality scores to prioritize high-quality images for annotation
3. **Admin Dashboard**: Filters and displays images by quality category
4. **Database**: Stores quality scores in `images.quality_score` column

## Performance Considerations

- **Sharp Library**: Fast image processing (< 500ms for most images)
- **No API Keys**: Runs locally without external API calls
- **Configurable Thresholds**: Adjust requirements based on use case
- **Batch Processing**: Can validate multiple images sequentially

## Testing

```bash
# Run unit tests
npm test -- src/__tests__/services/ImageQualityValidator.test.ts

# Test coverage
npm test -- --coverage src/__tests__/services/ImageQualityValidator.test.ts
```

## Error Handling

```typescript
try {
  const analysis = await imageQualityValidator.analyzeImage(imageUrl);
} catch (error) {
  if (error.message.includes('Failed to fetch image')) {
    // Handle network errors
  } else if (error.message.includes('Invalid image format')) {
    // Handle format errors
  } else {
    // Handle other errors
  }
}
```

## Configuration

### Default Thresholds

```typescript
const DEFAULT_THRESHOLDS = {
  minBirdSize: 0.15,      // 15% minimum
  maxBirdSize: 0.80,      // 80% maximum
  minOcclusionRatio: 0.60, // 60% visible
  minResolution: 120000,   // 120k pixels
  minBrightness: 40,       // Minimum brightness
  maxBrightness: 220,      // Maximum brightness
  edgeThreshold: 0.05      // 5% from edge
};
```

### Updating Thresholds

```typescript
// Update singleton instance
imageQualityValidator.updateThresholds({
  minBirdSize: 0.20,  // Require 20% minimum
  minResolution: 150000 // Higher resolution
});

// Get current thresholds
const thresholds = imageQualityValidator.getThresholds();
```

## Troubleshooting

### Issue: All images failing size check

**Solution**: Check if bird bounding boxes are correctly normalized (0-1 range)

```typescript
// Correct: normalized coordinates
const bbox = { x: 0.25, y: 0.30, width: 0.40, height: 0.50 };

// Incorrect: pixel coordinates
const bbox = { x: 480, y: 324, width: 768, height: 540 };
```

### Issue: Sharp library errors

**Solution**: Ensure sharp is properly installed

```bash
npm install sharp
# Or for platform-specific builds
npm rebuild sharp
```

### Issue: Quality scores too strict/lenient

**Solution**: Adjust thresholds based on your dataset

```typescript
// More lenient for diverse dataset
const lenientValidator = new ImageQualityValidator({
  minBirdSize: 0.10,  // Allow smaller birds
  minOcclusionRatio: 0.50 // Allow more occlusion
});
```

## Future Enhancements

1. **Advanced Contrast Analysis**: Implement histogram analysis for better exposure assessment
2. **Blur Detection**: Add sharpness/focus quality check
3. **Multiple Bird Handling**: Improved logic for images with multiple birds
4. **ML-Based Quality**: Train model to predict annotation success
5. **Real-time Quality Feedback**: WebSocket-based quality assessment during upload

## Related Services

- `BirdDetectionService`: Pre-validation and bird detection
- `VisionAIService`: AI-powered annotation generation
- `PatternLearner`: Learns from quality patterns over time
- `ImagePreflightService`: Complete image preprocessing pipeline
