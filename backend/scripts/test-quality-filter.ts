/**
 * Test Quality Filter Integration
 * Validates that the quality filter and bird detection work correctly
 */

import { birdDetectionService } from '../src/services/BirdDetectionService';
import { imageQualityValidator } from '../src/services/ImageQualityValidator';
import { info, error as logError } from '../src/utils/logger';

// Test image URLs (replace with actual URLs from your database)
const TEST_IMAGES = [
  {
    name: 'High Quality Bird',
    url: 'https://example.com/high-quality-bird.jpg',
    expectedValid: true
  },
  {
    name: 'Blurry Bird',
    url: 'https://example.com/blurry-bird.jpg',
    expectedValid: false,
    expectedReason: 'Image too blurry'
  },
  {
    name: 'Small Bird',
    url: 'https://example.com/small-bird.jpg',
    expectedValid: false,
    expectedReason: 'Bird too small'
  },
  {
    name: 'No Bird',
    url: 'https://example.com/no-bird.jpg',
    expectedValid: false,
    expectedReason: 'No bird detected'
  }
];

async function testQualityFilter() {
  console.log('🧪 Testing Quality Filter Integration\n');

  for (const testImage of TEST_IMAGES) {
    console.log(`\n📸 Testing: ${testImage.name}`);
    console.log(`URL: ${testImage.url}`);
    console.log('─'.repeat(60));

    try {
      // Test 1: Image Quality Validator
      console.log('\n1️⃣ Testing ImageQualityValidator...');
      const qualityResult = await imageQualityValidator.assessQuality(testImage.url);

      console.log('Quality Assessment:');
      console.log(`  ✓ Suitable: ${qualityResult.suitable}`);
      console.log(`  ✓ Score: ${qualityResult.score}/100`);
      if (qualityResult.skipReason) {
        console.log(`  ✓ Skip Reason: ${qualityResult.skipReason}`);
      }
      console.log(`  ✓ Issues: ${qualityResult.issues.join(', ')}`);
      console.log(`  ✓ Recommendations: ${qualityResult.recommendations.join(', ')}`);

      // Test 2: Bird Detection Service
      console.log('\n2️⃣ Testing BirdDetectionService...');
      const validationResult = await birdDetectionService.validateImage(testImage.url);

      console.log('Bird Detection & Validation:');
      console.log(`  ✓ Valid: ${validationResult.valid}`);
      console.log(`  ✓ Bird Detected: ${validationResult.detection.detected}`);
      if (validationResult.detection.detected) {
        console.log(`  ✓ Confidence: ${validationResult.detection.confidence.toFixed(2)}`);
        console.log(`  ✓ Bird Size: ${(validationResult.detection.percentageOfImage * 100).toFixed(1)}%`);
        if (validationResult.detection.boundingBox) {
          const bbox = validationResult.detection.boundingBox;
          console.log(`  ✓ Bounding Box: (${bbox.x.toFixed(2)}, ${bbox.y.toFixed(2)}) [${bbox.width.toFixed(2)} x ${bbox.height.toFixed(2)}]`);
        }
      }

      console.log('Quality Metrics:');
      console.log(`  ✓ Suitable: ${validationResult.quality.suitable}`);
      console.log(`  ✓ Clarity: ${validationResult.quality.clarity.toFixed(2)}`);
      console.log(`  ✓ Lighting: ${validationResult.quality.lighting.toFixed(2)}`);
      console.log(`  ✓ Focus: ${validationResult.quality.focus.toFixed(2)}`);
      console.log(`  ✓ Bird Size: ${validationResult.quality.birdSize.toFixed(2)}`);

      if (validationResult.skipReason) {
        console.log(`  ✓ Skip Reason: ${validationResult.skipReason}`);
      }

      // Verify expectations
      console.log('\n3️⃣ Verifying Expectations...');
      const passed = validationResult.valid === testImage.expectedValid;
      console.log(`  ${passed ? '✅' : '❌'} Expected valid: ${testImage.expectedValid}, Got: ${validationResult.valid}`);

      if (!passed && testImage.expectedReason && validationResult.skipReason) {
        const reasonMatches = validationResult.skipReason.toLowerCase().includes(
          testImage.expectedReason.toLowerCase()
        );
        console.log(`  ${reasonMatches ? '✅' : '❌'} Skip reason matches expected: ${reasonMatches}`);
      }

    } catch (error) {
      console.error(`\n❌ Test failed for ${testImage.name}:`);
      console.error((error as Error).message);
      logError(`Test failed for ${testImage.name}`, error as Error);
    }

    console.log('\n' + '═'.repeat(60));
  }

  console.log('\n✅ Quality Filter Tests Complete!\n');
}

// Run tests
testQualityFilter()
  .then(() => {
    info('All quality filter tests completed');
    process.exit(0);
  })
  .catch((error) => {
    logError('Quality filter tests failed', error);
    process.exit(1);
  });
