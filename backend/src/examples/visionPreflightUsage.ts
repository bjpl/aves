/**
 * VisionPreflightService Usage Examples
 * Demonstrates how to use lightweight preflight checks to optimize API costs
 */

import { visionPreflightService } from '../services/VisionPreflightService';
import { visionAIService } from '../services/VisionAIService';
import logger from '../utils/logger';

/**
 * Example 1: Basic preflight check before full annotation
 */
export async function basicPreflightCheck(imageUrl: string) {
  logger.info('=== Example 1: Basic Preflight Check ===\n');

  // Step 1: Quick preflight check (500-1000 tokens)
  const detection = await visionPreflightService.detectBird(imageUrl);

  logger.info({
    birdDetected: detection.birdDetected,
    confidence: detection.confidence,
    size: detection.approximateSize,
    position: detection.position,
    occlusion: detection.occlusion,
    assessment: detection.quickAssessment
  }, 'Preflight Detection Result');

  // Step 2: Only proceed with full annotation if preflight passes
  const shouldProcess = await visionPreflightService.shouldProcess(imageUrl);

  if (shouldProcess) {
    logger.info('✓ Preflight PASSED - Proceeding with full annotation\n');

    // Full annotation (8000 tokens)
    const annotations = await visionAIService.generateAnnotations(imageUrl, 'img-001');
    logger.info(`Generated ${annotations.length} annotations\n`);

    return { success: true, annotations };
  } else {
    logger.info('✗ Preflight FAILED - Skipping annotation to save costs\n');
    logger.info('Cost saved: ~7000 tokens\n');

    return { success: false, reason: 'Failed preflight check' };
  }
}

/**
 * Example 2: Batch preflight checking for multiple images
 */
export async function batchPreflightCheck(imageUrls: string[]) {
  logger.info('=== Example 2: Batch Preflight Check ===\n');

  logger.info(`Checking ${imageUrls.length} images...\n`);

  // Run preflight checks for all images
  const results = await visionPreflightService.batchCheck(imageUrls);

  // Filter images that pass preflight
  const goodImages = results.filter(r => r.shouldProcess);
  const badImages = results.filter(r => !r.shouldProcess);

  logger.info('Batch Results:');
  logger.info(`  Total images: ${imageUrls.length}`);
  logger.info(`  Passed preflight: ${goodImages.length}`);
  logger.info(`  Failed preflight: ${badImages.length}`);
  logger.info(`  Rejection rate: ${((badImages.length / imageUrls.length) * 100).toFixed(1)}%\n`);

  // Process only good images with full annotation
  const annotations = [];
  for (const { url, result } of goodImages) {
    logger.info(`Processing: ${url}`);
    logger.info(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    logger.info(`  Size: ${result.approximateSize.toFixed(1)}%`);

    const imageAnnotations = await visionAIService.generateAnnotations(url, url);
    annotations.push({ url, annotations: imageAnnotations });
  }

  // Show cost savings
  const savings = visionPreflightService.getCostSavings();
  logger.info('\nCost Savings:');
  logger.info(`  Tokens saved: ${savings.tokensSaved.toLocaleString()}`);
  logger.info(`  Savings percentage: ${savings.savingsPercentage}%\n`);

  return { goodImages, badImages, annotations };
}

/**
 * Example 3: Pipeline with preflight check
 */
export async function annotationPipeline(imageUrl: string) {
  logger.info('=== Example 3: Annotation Pipeline with Preflight ===\n');

  try {
    // Stage 1: Preflight check
    logger.info('[Stage 1] Running preflight check...');
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

    logger.info('[Stage 1] ✓ Preflight passed\n');

    // Stage 2: Full annotation
    logger.info('[Stage 2] Running full annotation...');
    const annotations = await visionAIService.generateAnnotations(imageUrl, 'img-001', {
      enablePatternLearning: true
    });
    logger.info(`[Stage 2] ✓ Generated ${annotations.length} annotations\n`);

    return {
      stage: 'completed',
      success: true,
      detection,
      annotations,
      tokensUsed: '~8700'
    };

  } catch (error) {
    logger.error('Pipeline failed:', error);
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
  logger.info('=== Example 4: Cost Monitoring ===\n');

  // Get performance statistics
  const stats = visionPreflightService.getStats();
  logger.info('Performance Statistics:');
  logger.info(`  Total preflight checks: ${stats.totalChecks}`);
  logger.info(`  Birds detected: ${stats.birdDetected}`);
  logger.info(`  Birds rejected: ${stats.birdRejected}`);
  logger.info(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  logger.info(`  Average tokens/check: ${stats.avgTokensUsed.toFixed(0)}`);
  logger.info(`  Cache hits: ${stats.cacheHits}\n`);

  // Get cost savings
  const savings = visionPreflightService.getCostSavings();
  logger.info('Cost Savings:');
  logger.info(`  Images rejected: ${savings.imagesRejected}`);
  logger.info(`  Tokens saved: ${savings.tokensSaved.toLocaleString()}`);
  logger.info(`  Savings percentage: ${savings.savingsPercentage}%`);
  logger.info(`  Avg preflight tokens: ${savings.avgTokensPerPreflight}`);
  logger.info(`  Full annotation tokens: ${savings.fullAnnotationTokens}\n`);

  // Get cache statistics
  const cacheStats = visionPreflightService.getCacheStats();
  logger.info('Cache Statistics:');
  logger.info(`  Total entries: ${cacheStats.totalEntries}`);
  logger.info(`  Valid entries: ${cacheStats.validEntries}`);
  logger.info(`  Expired entries: ${cacheStats.expiredEntries}`);
  logger.info(`  Max cache size: ${cacheStats.maxSize}`);
  logger.info(`  Cache TTL: ${(cacheStats.cacheTTL / 1000 / 60).toFixed(0)} minutes\n`);

  // Get quality thresholds
  const thresholds = visionPreflightService.getThresholds();
  logger.info('Quality Thresholds:');
  logger.info(`  Min confidence: ${(thresholds.minConfidence * 100).toFixed(0)}%`);
  logger.info(`  Min size: ${thresholds.minSize}%`);
  logger.info(`  Max occlusion: ${thresholds.maxOcclusion}%\n`);
}

/**
 * Example 5: Real-world usage scenario
 */
export async function processImageBatch(imageUrls: string[]) {
  logger.info('=== Example 5: Real-World Batch Processing ===\n');
  logger.info(`Processing ${imageUrls.length} images with preflight optimization\n`);

  let preflightPassed = 0;
  let preflightFailed = 0;
  let totalTokensSaved = 0;
  let annotationsGenerated = 0;

  for (const imageUrl of imageUrls) {
    logger.info(`\nProcessing: ${imageUrl}`);

    // Preflight check
    const shouldProcess = await visionPreflightService.shouldProcess(imageUrl);

    if (shouldProcess) {
      logger.info('  ✓ Preflight PASSED - Processing');
      preflightPassed++;

      // Full annotation
      try {
        const annotations = await visionAIService.generateAnnotations(imageUrl, imageUrl);
        annotationsGenerated += annotations.length;
        logger.info(`  ✓ Generated ${annotations.length} annotations`);
      } catch (error) {
        logger.info(`  ✗ Annotation failed: ${(error as Error).message}`);
      }

    } else {
      logger.info('  ✗ Preflight FAILED - Skipping');
      preflightFailed++;
      totalTokensSaved += 7300; // Approximate tokens saved
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  logger.info('\n=== Batch Processing Summary ===');
  logger.info(`Total images: ${imageUrls.length}`);
  logger.info(`Preflight passed: ${preflightPassed}`);
  logger.info(`Preflight failed: ${preflightFailed}`);
  logger.info(`Annotations generated: ${annotationsGenerated}`);
  logger.info(`Tokens saved: ~${totalTokensSaved.toLocaleString()}`);
  logger.info(`Cost savings: ~${((preflightFailed / imageUrls.length) * 100).toFixed(1)}%\n`);

  // Show detailed statistics
  await monitorCosts();
}

/**
 * Example 6: Smart caching for repeated checks
 */
export async function demonstrateCaching() {
  logger.info('=== Example 6: Smart Caching Demo ===\n');

  const imageUrl = 'https://example.com/bird.jpg';

  // First check (cache miss)
  logger.info('First check (cache miss):');
  const start1 = Date.now();
  await visionPreflightService.detectBird(imageUrl);
  const time1 = Date.now() - start1;
  logger.info(`  Time: ${time1}ms\n`);

  // Second check (cache hit)
  logger.info('Second check (cache hit):');
  const start2 = Date.now();
  await visionPreflightService.detectBird(imageUrl);
  const time2 = Date.now() - start2;
  logger.info(`  Time: ${time2}ms`);
  logger.info(`  Speedup: ${(time1 / time2).toFixed(1)}x faster\n`);

  // Cache statistics
  const cacheStats = visionPreflightService.getCacheStats();
  logger.info('Cache efficiency:');
  logger.info(`  Cache hit rate: ${((cacheStats.validEntries / (cacheStats.validEntries + 1)) * 100).toFixed(1)}%\n`);
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
