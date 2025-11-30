/**
 * VisionPreflightService Usage Examples
 * Demonstrates how to use lightweight preflight checks to optimize API costs
 */

import { visionPreflightService } from '../services/VisionPreflightService';
import { visionAIService } from '../services/VisionAIService';
import { info } from '../utils/logger';

/**
 * Example 1: Basic preflight check before full annotation
 */
export async function basicPreflightCheck(imageUrl: string) {
  console.log('=== Example 1: Basic Preflight Check ===\n');

  // Step 1: Quick preflight check (500-1000 tokens)
  const detection = await visionPreflightService.detectBird(imageUrl);

  console.log('Preflight Detection Result:');
  console.log(`  Bird Detected: ${detection.birdDetected}`);
  console.log(`  Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
  console.log(`  Size: ${detection.approximateSize.toFixed(1)}% of image`);
  console.log(`  Position: (${detection.position.x.toFixed(2)}, ${detection.position.y.toFixed(2)})`);
  console.log(`  Occlusion: ${detection.occlusion.toFixed(1)}%`);
  console.log(`  Assessment: ${detection.quickAssessment || 'N/A'}\n`);

  // Step 2: Only proceed with full annotation if preflight passes
  const shouldProcess = await visionPreflightService.shouldProcess(imageUrl);

  if (shouldProcess) {
    console.log('✓ Preflight PASSED - Proceeding with full annotation\n');

    // Full annotation (8000 tokens)
    const annotations = await visionAIService.generateAnnotations(imageUrl, 'img-001');
    console.log(`Generated ${annotations.length} annotations\n`);

    return { success: true, annotations };
  } else {
    console.log('✗ Preflight FAILED - Skipping annotation to save costs\n');
    console.log('Cost saved: ~7000 tokens\n');

    return { success: false, reason: 'Failed preflight check' };
  }
}

/**
 * Example 2: Batch preflight checking for multiple images
 */
export async function batchPreflightCheck(imageUrls: string[]) {
  console.log('=== Example 2: Batch Preflight Check ===\n');

  console.log(`Checking ${imageUrls.length} images...\n`);

  // Run preflight checks for all images
  const results = await visionPreflightService.batchCheck(imageUrls);

  // Filter images that pass preflight
  const goodImages = results.filter(r => r.shouldProcess);
  const badImages = results.filter(r => !r.shouldProcess);

  console.log('Batch Results:');
  console.log(`  Total images: ${imageUrls.length}`);
  console.log(`  Passed preflight: ${goodImages.length}`);
  console.log(`  Failed preflight: ${badImages.length}`);
  console.log(`  Rejection rate: ${((badImages.length / imageUrls.length) * 100).toFixed(1)}%\n`);

  // Process only good images with full annotation
  const annotations = [];
  for (const { url, result } of goodImages) {
    console.log(`Processing: ${url}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Size: ${result.approximateSize.toFixed(1)}%`);

    const imageAnnotations = await visionAIService.generateAnnotations(url, url);
    annotations.push({ url, annotations: imageAnnotations });
  }

  // Show cost savings
  const savings = visionPreflightService.getCostSavings();
  console.log('\nCost Savings:');
  console.log(`  Tokens saved: ${savings.tokensSaved.toLocaleString()}`);
  console.log(`  Savings percentage: ${savings.savingsPercentage}%\n`);

  return { goodImages, badImages, annotations };
}

/**
 * Example 3: Pipeline with preflight check
 */
export async function annotationPipeline(imageUrl: string) {
  console.log('=== Example 3: Annotation Pipeline with Preflight ===\n');

  try {
    // Stage 1: Preflight check
    console.log('[Stage 1] Running preflight check...');
    const detection = await visionPreflightService.detectBird(imageUrl);

    if (!detection.birdDetected) {
      return {
        stage: 'preflight',
        success: false,
        reason: 'No bird detected',
        tokensUsed: '~700'
      };
    }

    if (detection.confidence < 0.6) {
      return {
        stage: 'preflight',
        success: false,
        reason: `Low confidence (${detection.confidence.toFixed(2)})`,
        tokensUsed: '~700'
      };
    }

    if (detection.approximateSize < 5) {
      return {
        stage: 'preflight',
        success: false,
        reason: `Bird too small (${detection.approximateSize.toFixed(1)}%)`,
        tokensUsed: '~700'
      };
    }

    console.log('[Stage 1] ✓ Preflight passed\n');

    // Stage 2: Full annotation
    console.log('[Stage 2] Running full annotation...');
    const annotations = await visionAIService.generateAnnotations(imageUrl, 'img-001', {
      enablePatternLearning: true
    });
    console.log(`[Stage 2] ✓ Generated ${annotations.length} annotations\n`);

    return {
      stage: 'completed',
      success: true,
      detection,
      annotations,
      tokensUsed: '~8700'
    };

  } catch (error) {
    console.error('Pipeline failed:', error);
    return {
      stage: 'error',
      success: false,
      reason: (error as Error).message
    };
  }
}

/**
 * Example 4: Monitor and optimize costs
 */
export async function monitorCosts() {
  console.log('=== Example 4: Cost Monitoring ===\n');

  // Get performance statistics
  const stats = visionPreflightService.getStats();
  console.log('Performance Statistics:');
  console.log(`  Total preflight checks: ${stats.totalChecks}`);
  console.log(`  Birds detected: ${stats.birdDetected}`);
  console.log(`  Birds rejected: ${stats.birdRejected}`);
  console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`  Average tokens/check: ${stats.avgTokensUsed.toFixed(0)}`);
  console.log(`  Cache hits: ${stats.cacheHits}\n`);

  // Get cost savings
  const savings = visionPreflightService.getCostSavings();
  console.log('Cost Savings:');
  console.log(`  Images rejected: ${savings.imagesRejected}`);
  console.log(`  Tokens saved: ${savings.tokensSaved.toLocaleString()}`);
  console.log(`  Savings percentage: ${savings.savingsPercentage}%`);
  console.log(`  Avg preflight tokens: ${savings.avgTokensPerPreflight}`);
  console.log(`  Full annotation tokens: ${savings.fullAnnotationTokens}\n`);

  // Get cache statistics
  const cacheStats = visionPreflightService.getCacheStats();
  console.log('Cache Statistics:');
  console.log(`  Total entries: ${cacheStats.totalEntries}`);
  console.log(`  Valid entries: ${cacheStats.validEntries}`);
  console.log(`  Expired entries: ${cacheStats.expiredEntries}`);
  console.log(`  Max cache size: ${cacheStats.maxSize}`);
  console.log(`  Cache TTL: ${(cacheStats.cacheTTL / 1000 / 60).toFixed(0)} minutes\n`);

  // Get quality thresholds
  const thresholds = visionPreflightService.getThresholds();
  console.log('Quality Thresholds:');
  console.log(`  Min confidence: ${(thresholds.minConfidence * 100).toFixed(0)}%`);
  console.log(`  Min size: ${thresholds.minSize}%`);
  console.log(`  Max occlusion: ${thresholds.maxOcclusion}%\n`);
}

/**
 * Example 5: Real-world usage scenario
 */
export async function processImageBatch(imageUrls: string[]) {
  console.log('=== Example 5: Real-World Batch Processing ===\n');
  console.log(`Processing ${imageUrls.length} images with preflight optimization\n`);

  let preflightPassed = 0;
  let preflightFailed = 0;
  let totalTokensSaved = 0;
  let annotationsGenerated = 0;

  for (const imageUrl of imageUrls) {
    console.log(`\nProcessing: ${imageUrl}`);

    // Preflight check
    const shouldProcess = await visionPreflightService.shouldProcess(imageUrl);

    if (shouldProcess) {
      console.log('  ✓ Preflight PASSED - Processing');
      preflightPassed++;

      // Full annotation
      try {
        const annotations = await visionAIService.generateAnnotations(imageUrl, imageUrl);
        annotationsGenerated += annotations.length;
        console.log(`  ✓ Generated ${annotations.length} annotations`);
      } catch (error) {
        console.log(`  ✗ Annotation failed: ${(error as Error).message}`);
      }

    } else {
      console.log('  ✗ Preflight FAILED - Skipping');
      preflightFailed++;
      totalTokensSaved += 7300; // Approximate tokens saved
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Batch Processing Summary ===');
  console.log(`Total images: ${imageUrls.length}`);
  console.log(`Preflight passed: ${preflightPassed}`);
  console.log(`Preflight failed: ${preflightFailed}`);
  console.log(`Annotations generated: ${annotationsGenerated}`);
  console.log(`Tokens saved: ~${totalTokensSaved.toLocaleString()}`);
  console.log(`Cost savings: ~${((preflightFailed / imageUrls.length) * 100).toFixed(1)}%\n`);

  // Show detailed statistics
  await monitorCosts();
}

/**
 * Example 6: Smart caching for repeated checks
 */
export async function demonstrateCaching() {
  console.log('=== Example 6: Smart Caching Demo ===\n');

  const imageUrl = 'https://example.com/bird.jpg';

  // First check (cache miss)
  console.log('First check (cache miss):');
  const start1 = Date.now();
  await visionPreflightService.detectBird(imageUrl);
  const time1 = Date.now() - start1;
  console.log(`  Time: ${time1}ms\n`);

  // Second check (cache hit)
  console.log('Second check (cache hit):');
  const start2 = Date.now();
  await visionPreflightService.detectBird(imageUrl);
  const time2 = Date.now() - start2;
  console.log(`  Time: ${time2}ms`);
  console.log(`  Speedup: ${(time1 / time2).toFixed(1)}x faster\n`);

  // Cache statistics
  const cacheStats = visionPreflightService.getCacheStats();
  console.log('Cache efficiency:');
  console.log(`  Cache hit rate: ${((cacheStats.validEntries / (cacheStats.validEntries + 1)) * 100).toFixed(1)}%\n`);
}

// Main execution
async function main() {
  const exampleImage = 'https://images.unsplash.com/photo-example-bird.jpg';

  // Run examples
  await basicPreflightCheck(exampleImage);
  await monitorCosts();
}

// Export for use in other modules
export {
  visionPreflightService,
  main
};
