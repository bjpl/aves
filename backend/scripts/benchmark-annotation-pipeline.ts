/**
 * Benchmark Script - Compare Sequential vs Parallel Annotation Processing
 * Validates 2-3x speed improvement target
 */

import { visionAIService } from '../src/services/VisionAIService';
import { createClient } from '@supabase/supabase-js';
import { ParallelBatchProcessor, BatchTask } from '../src/utils/batch-processor';
import { PerformanceTracker } from '../src/utils/performance-tracker';
import { CostEstimator } from '../src/utils/cost-estimator';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ImageTask {
  id: string;
  url: string;
  species_id: string;
}

/**
 * Sequential processing (baseline)
 */
async function runSequential(images: any[]): Promise<void> {
  console.log('\n📊 BASELINE: Sequential Processing');
  console.log('='.repeat(60));

  const tracker = new PerformanceTracker();
  tracker.startBatch();

  for (const image of images) {
    const startTime = Date.now();
    try {
      await visionAIService.generateAnnotations(image.url, image.id);
      const duration = Date.now() - startTime;
      tracker.recordTask(duration, 0, false);
      console.log(`✓ ${image.id} (${duration}ms)`);

      // Simulated rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      const duration = Date.now() - startTime;
      tracker.recordTask(duration, 0, true);
      console.log(`✗ ${image.id} (${duration}ms)`);
    }
  }

  const metrics = tracker.getMetrics(images.length, 1);
  console.log('\n' + tracker.generateReport(metrics));

  return;
}

/**
 * Parallel processing (optimized)
 */
async function runParallel(images: any[], concurrency: number): Promise<void> {
  console.log(`\n⚡ OPTIMIZED: Parallel Processing (concurrency: ${concurrency})`);
  console.log('='.repeat(60));

  const tracker = new PerformanceTracker();
  tracker.startBatch();

  const tasks: BatchTask<ImageTask, any>[] = images.map(img => ({
    id: img.id,
    data: img,
    priority: 1
  }));

  const processor = new ParallelBatchProcessor({
    concurrency,
    retryAttempts: 3,
    retryDelay: 1000,
    taskTimeout: 60000,
    rateLimitDelay: 200
  });

  await processor.processBatch(tasks, async (imageTask) => {
    const startTime = Date.now();
    try {
      const annotations = await visionAIService.generateAnnotations(
        imageTask.url,
        imageTask.id
      );
      const duration = Date.now() - startTime;
      tracker.recordTask(duration, 0, false);
      console.log(`✓ ${imageTask.id} (${duration}ms)`);
      return annotations;
    } catch (error) {
      const duration = Date.now() - startTime;
      tracker.recordTask(duration, 0, true);
      console.log(`✗ ${imageTask.id} (${duration}ms)`);
      throw error;
    }
  });

  const metrics = tracker.getMetrics(images.length, concurrency);
  console.log('\n' + tracker.generateReport(metrics));

  return;
}

/**
 * Run comprehensive benchmark
 */
async function runBenchmark() {
  console.log('🔬 ANNOTATION PIPELINE BENCHMARK');
  console.log('='.repeat(80));
  console.log('Target: 2-3x speed improvement with parallel processing');
  console.log('='.repeat(80));

  // Fetch test images
  const { data: images, error } = await supabase
    .from('images')
    .select('id, url, species_id')
    .limit(10); // Benchmark with 10 images

  if (error || !images || images.length === 0) {
    console.error('❌ Failed to fetch test images');
    return;
  }

  console.log(`\n📸 Testing with ${images.length} images`);

  // Run baseline
  const baselineTracker = new PerformanceTracker();
  baselineTracker.startBatch();

  console.log('\n' + '='.repeat(80));
  console.log('BASELINE TEST: Sequential Processing');
  console.log('='.repeat(80));

  for (const image of images.slice(0, 5)) { // Use 5 images for faster baseline
    const startTime = Date.now();
    try {
      await visionAIService.generateAnnotations(image.url, image.id);
      const duration = Date.now() - startTime;
      baselineTracker.recordTask(duration, 0, false);
      console.log(`  ✓ Image ${image.id}: ${duration}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      const duration = Date.now() - startTime;
      baselineTracker.recordTask(duration, 0, true);
      console.log(`  ✗ Image ${image.id}: ${duration}ms`);
    }
  }

  const baselineMetrics = baselineTracker.getMetrics(5, 1);
  console.log('\n' + baselineTracker.generateReport(baselineMetrics));

  // Run optimized (parallel)
  const optimizedTracker = new PerformanceTracker();
  optimizedTracker.startBatch();

  console.log('\n' + '='.repeat(80));
  console.log('OPTIMIZED TEST: Parallel Processing (4 concurrent)');
  console.log('='.repeat(80));

  const tasks: BatchTask<ImageTask, any>[] = images.slice(0, 5).map(img => ({
    id: img.id,
    data: img,
    priority: 1
  }));

  const processor = new ParallelBatchProcessor({
    concurrency: 4,
    retryAttempts: 3,
    retryDelay: 1000,
    taskTimeout: 60000,
    rateLimitDelay: 200
  });

  await processor.processBatch(tasks, async (imageTask) => {
    const startTime = Date.now();
    try {
      const annotations = await visionAIService.generateAnnotations(
        imageTask.url,
        imageTask.id
      );
      const duration = Date.now() - startTime;
      optimizedTracker.recordTask(duration, 0, false);
      console.log(`  ✓ Image ${imageTask.id}: ${duration}ms`);
      return annotations;
    } catch (error) {
      const duration = Date.now() - startTime;
      optimizedTracker.recordTask(duration, 0, true);
      console.log(`  ✗ Image ${imageTask.id}: ${duration}ms`);
      throw error;
    }
  });

  const optimizedMetrics = optimizedTracker.getMetrics(5, 4);
  console.log('\n' + optimizedTracker.generateReport(optimizedMetrics));

  // Create benchmark comparison
  const benchmark = optimizedTracker.createBenchmark(
    'Sequential vs Parallel (4 concurrent)',
    optimizedMetrics,
    baselineMetrics
  );

  // Final comparison
  console.log('\n' + '='.repeat(80));
  console.log('🏆 BENCHMARK RESULTS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Baseline (Sequential):`);
  console.log(`  Total Time:       ${(baselineMetrics.totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Throughput:       ${baselineMetrics.throughput.toFixed(2)} tasks/s`);
  console.log(`  Avg Task Time:    ${baselineMetrics.averageTaskDuration.toFixed(0)}ms`);
  console.log('');
  console.log(`Optimized (Parallel 4x):`);
  console.log(`  Total Time:       ${(optimizedMetrics.totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Throughput:       ${optimizedMetrics.throughput.toFixed(2)} tasks/s`);
  console.log(`  Avg Task Time:    ${optimizedMetrics.averageTaskDuration.toFixed(0)}ms`);
  console.log('');
  console.log(`🚀 IMPROVEMENTS:`);
  console.log(`  Speed Increase:   ${benchmark.improvement.speedup.toFixed(2)}x faster`);
  console.log(`  Throughput Gain:  +${benchmark.improvement.throughputIncrease.toFixed(1)}%`);
  console.log(`  Time Saved:       -${benchmark.improvement.durationReduction.toFixed(1)}%`);
  console.log('');

  const targetMet = benchmark.improvement.speedup >= 2.0;
  console.log(`Target Achievement: ${targetMet ? '✅ MET' : '⚠️  NOT MET'} (target: 2-3x)`);
  console.log('');

  // Export results
  const metricsPath = join(__dirname, '..', 'metrics', 'benchmark-results.json');
  optimizedTracker.exportMetrics(metricsPath, optimizedMetrics);
  console.log(`📁 Results exported to: ${metricsPath}`);
  console.log('');
  console.log('='.repeat(80));
}

// Run benchmark
runBenchmark().catch(console.error);
