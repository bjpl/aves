/**
 * Performance Tracking and Benchmarking
 * Real-time metrics and performance analysis for batch processing
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { info } from './logger';

export interface PerformanceMetrics {
  timestamp: Date;
  batchSize: number;
  concurrency: number;
  totalDuration: number; // milliseconds
  averageTaskDuration: number;
  throughput: number; // tasks per second
  successRate: number; // percentage
  retryRate: number; // average retries per task
  errorRate: number; // percentage
  p50Duration: number; // median
  p95Duration: number; // 95th percentile
  p99Duration: number; // 99th percentile
}

export interface BenchmarkResult {
  name: string;
  baseline?: PerformanceMetrics;
  optimized: PerformanceMetrics;
  improvement: {
    speedup: number; // multiplier (e.g., 2.5x)
    throughputIncrease: number; // percentage
    durationReduction: number; // percentage
  };
}

export class PerformanceTracker {
  private durations: number[] = [];
  private errors: number = 0;
  private retries: number = 0;
  private startTime: number = 0;
  private benchmarkHistory: BenchmarkResult[] = [];

  constructor() {
    this.reset();
  }

  /**
   * Start tracking a new batch
   */
  startBatch(): void {
    this.reset();
    this.startTime = Date.now();
  }

  /**
   * Record task completion
   */
  recordTask(duration: number, retries: number = 0, error: boolean = false): void {
    this.durations.push(duration);
    this.retries += retries;
    if (error) this.errors++;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get current metrics
   */
  getMetrics(batchSize: number, concurrency: number): PerformanceMetrics {
    const totalDuration = Date.now() - this.startTime;
    const completed = this.durations.length;
    const averageTaskDuration = completed > 0
      ? this.durations.reduce((sum, d) => sum + d, 0) / completed
      : 0;

    const throughput = totalDuration > 0 ? (completed / (totalDuration / 1000)) : 0;
    const successRate = batchSize > 0 ? ((completed - this.errors) / batchSize) * 100 : 0;
    const errorRate = batchSize > 0 ? (this.errors / batchSize) * 100 : 0;
    const retryRate = completed > 0 ? this.retries / completed : 0;

    return {
      timestamp: new Date(),
      batchSize,
      concurrency,
      totalDuration,
      averageTaskDuration,
      throughput,
      successRate,
      retryRate,
      errorRate,
      p50Duration: this.calculatePercentile(this.durations, 50),
      p95Duration: this.calculatePercentile(this.durations, 95),
      p99Duration: this.calculatePercentile(this.durations, 99)
    };
  }

  /**
   * Create benchmark comparison
   */
  createBenchmark(
    name: string,
    optimizedMetrics: PerformanceMetrics,
    baselineMetrics?: PerformanceMetrics
  ): BenchmarkResult {
    let improvement = {
      speedup: 1,
      throughputIncrease: 0,
      durationReduction: 0
    };

    if (baselineMetrics) {
      improvement = {
        speedup: baselineMetrics.averageTaskDuration / optimizedMetrics.averageTaskDuration,
        throughputIncrease: ((optimizedMetrics.throughput - baselineMetrics.throughput) / baselineMetrics.throughput) * 100,
        durationReduction: ((baselineMetrics.totalDuration - optimizedMetrics.totalDuration) / baselineMetrics.totalDuration) * 100
      };
    }

    const benchmark: BenchmarkResult = {
      name,
      baseline: baselineMetrics,
      optimized: optimizedMetrics,
      improvement
    };

    this.benchmarkHistory.push(benchmark);
    return benchmark;
  }

  /**
   * Export metrics to JSON file
   */
  exportMetrics(outputPath: string, metrics: PerformanceMetrics): void {
    try {
      // Ensure directory exists
      const dir = join(outputPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const data = {
        exportedAt: new Date().toISOString(),
        metrics,
        benchmarks: this.benchmarkHistory
      };

      writeFileSync(outputPath, JSON.stringify(data, null, 2));
      info('Performance metrics exported', { outputPath });
    } catch (error) {
      info('Failed to export metrics', { error });
    }
  }

  /**
   * Generate performance report
   */
  generateReport(metrics: PerformanceMetrics): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('PERFORMANCE REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Timestamp:        ${metrics.timestamp.toISOString()}`);
    lines.push(`Batch Size:       ${metrics.batchSize}`);
    lines.push(`Concurrency:      ${metrics.concurrency}`);
    lines.push('');
    lines.push('Duration Metrics:');
    lines.push(`  Total:          ${(metrics.totalDuration / 1000).toFixed(2)}s`);
    lines.push(`  Average/Task:   ${metrics.averageTaskDuration.toFixed(0)}ms`);
    lines.push(`  P50 (median):   ${metrics.p50Duration.toFixed(0)}ms`);
    lines.push(`  P95:            ${metrics.p95Duration.toFixed(0)}ms`);
    lines.push(`  P99:            ${metrics.p99Duration.toFixed(0)}ms`);
    lines.push('');
    lines.push('Throughput:');
    lines.push(`  Tasks/second:   ${metrics.throughput.toFixed(2)}`);
    lines.push('');
    lines.push('Quality Metrics:');
    lines.push(`  Success Rate:   ${metrics.successRate.toFixed(1)}%`);
    lines.push(`  Error Rate:     ${metrics.errorRate.toFixed(1)}%`);
    lines.push(`  Avg Retries:    ${metrics.retryRate.toFixed(2)}`);
    lines.push('');

    // Add benchmark comparisons if available
    if (this.benchmarkHistory.length > 0) {
      lines.push('Benchmark Comparisons:');
      this.benchmarkHistory.forEach(bench => {
        lines.push(`  ${bench.name}:`);
        lines.push(`    Speedup:      ${bench.improvement.speedup.toFixed(2)}x`);
        lines.push(`    Throughput:   +${bench.improvement.throughputIncrease.toFixed(1)}%`);
        lines.push(`    Duration:     -${bench.improvement.durationReduction.toFixed(1)}%`);
      });
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }

  /**
   * Log real-time progress
   */
  logProgress(completed: number, total: number, currentMetrics: PerformanceMetrics): void {
    const percent = ((completed / total) * 100).toFixed(1);
    const eta = currentMetrics.throughput > 0
      ? ((total - completed) / currentMetrics.throughput).toFixed(0)
      : 'N/A';

    info('Batch Progress', {
      completed: `${completed}/${total} (${percent}%)`,
      throughput: `${currentMetrics.throughput.toFixed(2)} tasks/s`,
      eta: `${eta}s`,
      successRate: `${currentMetrics.successRate.toFixed(1)}%`
    });
  }

  /**
   * Reset tracker
   */
  private reset(): void {
    this.durations = [];
    this.errors = 0;
    this.retries = 0;
    this.startTime = Date.now();
  }
}
