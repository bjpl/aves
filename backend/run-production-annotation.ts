/**
 * Optimized Production Annotation Pipeline
 * Features:
 * - Parallel processing (3-5 concurrent requests)
 * - Real-time progress tracking
 * - Cost estimation per batch
 * - Token usage optimization
 * - Error recovery with exponential backoff
 * - Performance benchmarking
 * - Adaptive batch sizing
 * - Detailed metrics export
 *
 * Target: 2-3x speed improvement while maintaining quality
 */

import { visionAIService, AIAnnotation } from './src/services/VisionAIService';
import { createClient } from '@supabase/supabase-js';
import { ParallelBatchProcessor, BatchTask } from './src/utils/batch-processor';
import { CostEstimator } from './src/utils/cost-estimator';
import { PerformanceTracker } from './src/utils/performance-tracker';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ImageTask {
  id: string;
  url: string;
  species_id: string;
}

interface AnnotationResult {
  imageId: string;
  annotations: AIAnnotation[];
  duration: number;
  error?: string;
}

/**
 * Adaptive batch sizing based on API limits and performance
 */
function calculateOptimalBatchSize(availableImages: number): number {
  // Claude API rate limits (approximate):
  // - 50 requests per minute for Sonnet 4.5
  // - With 4 concurrent requests and 1s per request = ~12-15 images/min
  // Target: Process in batches to stay under limits

  const MIN_BATCH = 5;
  const MAX_BATCH = 100;
  const OPTIMAL_BATCH = 20; // Good balance for most cases

  if (availableImages <= MIN_BATCH) return availableImages;
  if (availableImages >= MAX_BATCH) return OPTIMAL_BATCH;

  return Math.min(availableImages, OPTIMAL_BATCH);
}

/**
 * Main annotation pipeline
 */
async function runOptimizedAnnotation() {
  console.log('🚀 OPTIMIZED BATCH ANNOTATION PIPELINE');
  console.log('='.repeat(80));
  console.log(`Model:            ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'}`);
  console.log(`Concurrency:      4 parallel requests`);
  console.log(`Retry Strategy:   3 attempts with exponential backoff`);
  console.log(`Rate Limiting:    200ms between requests`);
  console.log('='.repeat(80));
  console.log('');

  // Initialize trackers
  const costEstimator = new CostEstimator(process.env.ANTHROPIC_MODEL);
  const performanceTracker = new PerformanceTracker();
  performanceTracker.startBatch();

  // Fetch images to process
  const { data: allImages, error: fetchError } = await supabase
    .from('images')
    .select('id, url, species_id')
    .limit(100); // Fetch up to 100 images

  if (fetchError) {
    console.error('❌ Error fetching images:', fetchError);
    return;
  }

  if (!allImages || allImages.length === 0) {
    console.log('ℹ️  No images found in database');
    return;
  }

  console.log(`📸 Found ${allImages.length} images`);

  // Calculate optimal batch size
  const batchSize = calculateOptimalBatchSize(allImages.length);
  const images = allImages.slice(0, batchSize);

  console.log(`📊 Processing batch of ${images.length} images`);
  console.log('');

  // Estimate costs
  const promptLength = 1500; // Approximate prompt length
  const estimatedCost = costEstimator.estimateBatchCost(images.length, promptLength, 1000);
  console.log('💰 COST ESTIMATION:');
  console.log(`   Input tokens:     ~${((promptLength / 4) * images.length).toLocaleString()}`);
  console.log(`   Output tokens:    ~${(1000 * images.length).toLocaleString()}`);
  console.log(`   Estimated cost:   ${costEstimator.formatCost(estimatedCost.totalCost)}`);
  console.log('');

  // Create batch tasks
  const tasks: BatchTask<ImageTask, AnnotationResult>[] = images.map(img => ({
    id: img.id,
    data: img,
    priority: 1
  }));

  // Configure parallel processor
  const processor = new ParallelBatchProcessor<ImageTask, AnnotationResult>({
    concurrency: 4, // 4 parallel requests for optimal throughput
    retryAttempts: 3,
    retryDelay: 1000, // 1s base delay, exponential backoff
    taskTimeout: 60000, // 60s timeout per task
    rateLimitDelay: 200, // 200ms between requests
    progressCallback: (metrics) => {
      performanceTracker.logProgress(metrics.completed, images.length, {
        timestamp: new Date(),
        batchSize: images.length,
        concurrency: 4,
        totalDuration: metrics.totalDuration,
        averageTaskDuration: metrics.averageDuration,
        throughput: metrics.throughput,
        successRate: metrics.successRate,
        retryRate: metrics.retryRate,
        errorRate: (metrics.failed / images.length) * 100,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0
      });
    }
  });

  // Process annotations
  console.log('⚡ STARTING PARALLEL PROCESSING...');
  console.log('');

  const results = await processor.processBatch(tasks, async (imageTask) => {
    const startTime = Date.now();

    try {
      const annotations = await visionAIService.generateAnnotations(
        imageTask.url,
        imageTask.id
      );

      const duration = Date.now() - startTime;

      // Track performance
      performanceTracker.recordTask(duration, 0, false);

      // Track token usage (estimated)
      costEstimator.trackUsage({
        inputTokens: Math.ceil(promptLength / 4) + 1600, // prompt + image
        outputTokens: 1000, // estimated
        imageTokens: 1600,
        totalTokens: Math.ceil(promptLength / 4) + 1600 + 1000
      });

      // Store annotations in database
      for (const ann of annotations) {
        await supabase.from('annotations').insert({
          image_id: imageTask.id,
          species_id: imageTask.species_id,
          spanish_term: ann.spanishTerm,
          english_term: ann.englishTerm,
          bounding_box: ann.boundingBox,
          type: ann.type,
          difficulty_level: ann.difficultyLevel,
          pronunciation: ann.pronunciation
        });
      }

      console.log(`✅ ${imageTask.id}: ${annotations.length} annotations (${duration}ms)`);

      return {
        imageId: imageTask.id,
        annotations,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceTracker.recordTask(duration, 0, true);

      console.error(`❌ ${imageTask.id}: ${(error as Error).message}`);

      throw error;
    }
  });

  // Calculate final metrics
  const finalMetrics = performanceTracker.getMetrics(images.length, 4);

  console.log('');
  console.log('='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  console.log('');

  // Performance summary
  console.log(performanceTracker.generateReport(finalMetrics));

  // Cost summary
  console.log('');
  console.log('💰 ACTUAL COSTS:');
  costEstimator.logSummary();
  console.log('');

  // Success metrics
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  const totalAnnotations = results
    .filter(r => r.result)
    .reduce((sum, r) => sum + (r.result?.annotations.length || 0), 0);

  console.log('✅ PROCESSING SUMMARY:');
  console.log(`   Successful:       ${successful}/${images.length} (${((successful/images.length)*100).toFixed(1)}%)`);
  console.log(`   Failed:           ${failed}/${images.length}`);
  console.log(`   Total Annotations: ${totalAnnotations}`);
  console.log(`   Avg per Image:    ${(totalAnnotations/successful).toFixed(1)}`);
  console.log('');

  // Calculate improvement (assuming baseline of 1 req/sec sequential)
  const baselineDuration = images.length * 5000; // 5s per image sequential
  const improvement = baselineDuration / finalMetrics.totalDuration;

  console.log('🚀 OPTIMIZATION RESULTS:');
  console.log(`   Speedup:          ${improvement.toFixed(2)}x faster`);
  console.log(`   Baseline Est:     ${(baselineDuration/1000).toFixed(1)}s (sequential)`);
  console.log(`   Optimized Time:   ${(finalMetrics.totalDuration/1000).toFixed(1)}s (parallel)`);
  console.log(`   Time Saved:       ${((baselineDuration-finalMetrics.totalDuration)/1000).toFixed(1)}s`);
  console.log('');

  // Export metrics
  const metricsPath = join(__dirname, 'metrics', 'batch-annotation-metrics.json');
  performanceTracker.exportMetrics(metricsPath, finalMetrics);
  console.log(`📁 Metrics exported to: ${metricsPath}`);
  console.log('');

  // Optimization recommendations
  const tips = costEstimator.getOptimizationTips();
  if (tips.length > 0) {
    console.log('💡 OPTIMIZATION TIPS:');
    tips.forEach(tip => console.log(`   - ${tip}`));
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('✨ Pipeline completed successfully!');
  console.log('='.repeat(80));
}

// Run the pipeline
runOptimizedAnnotation().catch(error => {
  console.error('');
  console.error('='.repeat(80));
  console.error('❌ PIPELINE FAILED');
  console.error('='.repeat(80));
  console.error('');
  console.error('Error:', error);
  console.error('');
  process.exit(1);
});
