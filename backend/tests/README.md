# Quality Filtering Test Suite

## Overview

Comprehensive test suite for the image quality validation and filtering system used in AI annotation generation.

## Test Structure

```
tests/
├── fixtures/
│   └── imageMetadata.ts       # Mock image data with known characteristics
├── services/
│   └── ImageQualityValidator.test.ts  # Unit tests for quality validator
├── routes/
│   └── aiAnnotations.quality.test.ts  # Integration tests for API routes
├── utils/
│   └── testDataBuilders.ts    # Factory functions for test data
├── jest.config.js              # Jest configuration
├── setup.ts                    # Test setup and global config
└── README.md                   # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run quality validation tests only
npm test -- ImageQualityValidator

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run integration tests only
npm test -- aiAnnotations.quality
```

## Test Categories

### 1. Unit Tests (ImageQualityValidator.test.ts)

Tests the core quality validation logic with various image characteristics.

**Good Images (Should PASS):**
- ✓ Well-composed large bird (45% of frame)
- ✓ Medium bird (30% of frame)
- ✓ Minimal acceptable bird size (20% of frame)
- ✓ Well-lit image

**Bad Images (Should REJECT):**
- ✗ Bird too small (<15% of frame)
- ✗ Bird too large (>80% of frame)
- ✗ Heavily occluded (<60% visible)
- ✗ Too dark (brightness < 30)
- ✗ Too bright (brightness > 240)
- ✗ Low resolution (< 400x300 pixels)

**Edge Cases:**
- Multiple birds (choose largest)
- Bird at edge of frame
- Partial bird visibility
- Exactly at threshold values

### 2. Integration Tests (aiAnnotations.quality.test.ts)

Tests quality filtering integration with the annotation generation API.

**Test Cases:**
- Skip annotation generation for low-quality images
- Proceed with high-quality images
- Store quality metrics in database
- Track rejection reasons
- Exclude skipped images from analytics
- Handle validation errors gracefully

### 3. Test Fixtures (imageMetadata.ts)

Predefined image metadata with known quality characteristics:

- `goodImageLargeWell` - 45% bird, 150 brightness, 95% visible
- `goodImageMediumBird` - 30% bird, 120 brightness, 85% visible
- `badImageTooSmall` - 8% bird (below 15% threshold)
- `badImageOccluded` - 45% visible (below 60% threshold)
- `edgeCaseBirdAtEdge` - Bird at x=0.02 (edge detection)
- And more...

## Quality Thresholds

Default thresholds used in validation:

| Metric | Minimum | Maximum |
|--------|---------|---------|
| Bird Size | 15% of frame | 80% of frame |
| Brightness | 30 | 240 |
| Occlusion Ratio | 60% visible | - |
| Resolution | 120,000 pixels | - |

## Expected Test Outcomes

### Unit Tests
- **Total:** ~35 test cases
- **Expected Pass Rate:** 100%
- **Coverage Target:** >90% for ImageQualityValidator

### Integration Tests
- **Total:** ~12 test cases
- **Expected Pass Rate:** 100%
- **Coverage Target:** >85% for quality filtering routes

## Test Data Builders

Use factory functions to create test data:

```typescript
import { ImageMetadataBuilder } from './utils/testDataBuilders';

// Create custom test image
const testImage = new ImageMetadataBuilder()
  .withResolution(1920, 1080)
  .withBirdSize(0.35, 0.45)
  .withBrightness(150)
  .build();

// Use presets
const lowQualityImage = new ImageMetadataBuilder()
  .asLowQuality()
  .build();

const highQualityImage = new ImageMetadataBuilder()
  .asHighQuality()
  .build();
```

## Mock Images

Test fixtures simulate images with specific characteristics:

**Good Images:**
- `goodImageLargeWell` - Professional photo, bird prominent
- `goodImageMediumBird` - Standard composition, good lighting
- `goodImageMinimalSize` - Just above minimum size threshold

**Bad Images:**
- `badImageTooSmall` - Bird only 8% of frame (distant shot)
- `badImageOccluded` - Bird 55% hidden by branches
- `badImageTooDark` - Underexposed, brightness=20

**Edge Cases:**
- `edgeCaseMultipleBirds` - Flock, use largest bird
- `edgeCaseBirdAtEdge` - Partially out of frame
- `edgeCaseExactlyMinimumSize` - At 15% threshold

## Performance Benchmarks

Expected test execution times:

- Unit tests: < 100ms per test
- Integration tests: < 500ms per test (with database)
- Full suite: < 30 seconds

## Continuous Integration

Tests should be run:
1. Before each commit (pre-commit hook)
2. On pull request creation
3. Before deployment to production

## Coverage Requirements

Minimum coverage thresholds:
- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

## Troubleshooting

### Tests Failing?

1. **Database connection issues:**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL environment variable

2. **API key issues:**
   - Set ANTHROPIC_API_KEY in .env.test
   - Or mock the API calls

3. **Timeout errors:**
   - Increase jest timeout in config
   - Check network connectivity for image fetching

### Common Issues

- **"Cannot find module"** - Run `npm install`
- **"Connection refused"** - Start database: `docker-compose up -d`
- **"API key not configured"** - Check .env.test file

## Contributing

When adding new quality checks:

1. Add test fixtures in `fixtures/imageMetadata.ts`
2. Add unit tests in `services/ImageQualityValidator.test.ts`
3. Add integration tests in `routes/aiAnnotations.quality.test.ts`
4. Update this README with new test cases
5. Ensure coverage remains above thresholds

## Related Documentation

- [Image Quality Validator Service](../src/services/ImageQualityValidator.ts)
- [AI Annotations Routes](../src/routes/aiAnnotations.ts)
- [Pattern Learning](../src/services/PatternLearner.ts)
