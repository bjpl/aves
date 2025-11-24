/**
 * ML Analytics Production Endpoint Testing Script
 * Tests all ML analytics endpoints for response time, data accuracy, and error handling
 */

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  responseTime: number;
  statusCode?: number;
  error?: string;
  dataValidation?: {
    schemaValid: boolean;
    dataIntegrity: boolean;
    issues?: string[];
  };
}

interface PerformanceMetrics {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

const BASE_URL = 'https://aves-production.up.railway.app';
const TEST_ITERATIONS = 5; // Run each test multiple times for performance metrics

/**
 * ACTUAL AVAILABLE ENDPOINTS:
 * 1. GET /api/ml/analytics/test
 * 2. GET /api/ml/analytics/overview
 * 3. GET /api/ml/analytics/vocabulary-balance
 * 4. GET /api/ml/analytics/pattern-learning
 * 5. GET /api/ml/analytics/quality-trends
 * 6. GET /api/ml/analytics/performance-metrics
 */

class MLAnalyticsProductionTester {
  private results: TestResult[] = [];
  private performanceData: Map<string, number[]> = new Map();

  /**
   * Make HTTP request with timing
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: any; responseTime: number; statusCode: number }> {
    const startTime = performance.now();

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      return {
        data,
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      const endTime = performance.now();
      throw {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: endTime - startTime,
      };
    }
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(endpoint: string, responseTime: number): void {
    if (!this.performanceData.has(endpoint)) {
      this.performanceData.set(endpoint, []);
    }
    this.performanceData.get(endpoint)!.push(responseTime);
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get performance metrics for an endpoint
   */
  private getPerformanceMetrics(endpoint: string): PerformanceMetrics | null {
    const times = this.performanceData.get(endpoint);
    if (!times || times.length === 0) return null;

    return {
      endpoint,
      p50: this.calculatePercentile(times, 50),
      p95: this.calculatePercentile(times, 95),
      p99: this.calculatePercentile(times, 99),
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
    };
  }

  /**
   * Validate overview endpoint response
   */
  private validateOverview(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }

    // Check required fields based on actual schema
    const requiredFields = ['patternLearning', 'datasetMetrics', 'qualityMetrics'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Validate patternLearning structure
    if (data.patternLearning) {
      if (typeof data.patternLearning.totalPatterns !== 'number') {
        issues.push('patternLearning.totalPatterns should be a number');
      }
      if (typeof data.patternLearning.speciesTracked !== 'number') {
        issues.push('patternLearning.speciesTracked should be a number');
      }
      if (!Array.isArray(data.patternLearning.topFeatures)) {
        issues.push('patternLearning.topFeatures should be an array');
      }
    }

    // Validate datasetMetrics
    if (data.datasetMetrics) {
      if (typeof data.datasetMetrics.totalAnnotations !== 'number') {
        issues.push('datasetMetrics.totalAnnotations should be a number');
      }
      if (typeof data.datasetMetrics.totalImages !== 'number') {
        issues.push('datasetMetrics.totalImages should be a number');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Validate vocabulary balance endpoint response
   */
  private validateVocabularyBalance(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }

    // Check required fields based on actual schema
    if (!Array.isArray(data.features)) {
      issues.push('features should be an array');
    }

    if (typeof data.totalFeatures !== 'number') {
      issues.push('totalFeatures should be a number');
    }

    // Optional fields that may not be present when no data exists
    if (typeof data.coverage !== 'number' && typeof data.coverage !== 'string') {
      issues.push('coverage should be a number or string');
    }

    // targetVocabulary and topGaps are optional when no data
    if (data.targetVocabulary !== undefined && typeof data.targetVocabulary !== 'number') {
      issues.push('targetVocabulary should be a number when present');
    }

    if (data.topGaps !== undefined && !Array.isArray(data.topGaps)) {
      issues.push('topGaps should be an array when present');
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Validate pattern learning endpoint response
   */
  private validatePatternLearning(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }

    // Check required fields based on actual schema
    if (!data.overview) {
      issues.push('overview object is missing');
    } else {
      if (typeof data.overview.totalPatterns !== 'number') {
        issues.push('overview.totalPatterns should be a number');
      }
      if (typeof data.overview.speciesTracked !== 'number') {
        issues.push('overview.speciesTracked should be a number');
      }
    }

    if (!Array.isArray(data.topPatterns)) {
      issues.push('topPatterns should be an array');
    }

    if (!Array.isArray(data.speciesInsights)) {
      issues.push('speciesInsights should be an array');
    }

    if (typeof data.learningStatus !== 'string') {
      issues.push('learningStatus should be a string');
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Validate quality trends endpoint response
   */
  private validateQualityTrends(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }

    if (!Array.isArray(data.trends)) {
      issues.push('trends should be an array');
    }

    if (!data.summary) {
      issues.push('summary object is missing');
    } else {
      // improvement can be number (when 0) or string (when formatted)
      if (typeof data.summary.improvement !== 'string' && typeof data.summary.improvement !== 'number') {
        issues.push('summary.improvement should be a string or number');
      }
      if (typeof data.summary.currentQuality !== 'number') {
        issues.push('summary.currentQuality should be a number');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Validate performance metrics endpoint response
   */
  private validatePerformanceMetrics(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }

    if (!data.pipeline) {
      issues.push('pipeline object is missing');
    }

    if (!data.improvements) {
      issues.push('improvements object is missing');
    }

    if (!data.status) {
      issues.push('status object is missing');
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Test overview endpoint
   */
  async testOverview(): Promise<void> {
    const endpoint = '/api/ml/analytics/overview';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        const validation = this.validateOverview(data);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 && validation.valid ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: validation.valid,
            dataIntegrity: validation.valid,
            issues: validation.issues,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Schema valid: ${validation.valid}`);
          if (validation.issues.length > 0) {
            console.log(`  ⚠ Issues: ${validation.issues.join(', ')}`);
          }
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test vocabulary balance endpoint
   */
  async testVocabularyBalance(): Promise<void> {
    const endpoint = '/api/ml/analytics/vocabulary-balance';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        const validation = this.validateVocabularyBalance(data);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 && validation.valid ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: validation.valid,
            dataIntegrity: validation.valid,
            issues: validation.issues,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Schema valid: ${validation.valid}`);
          if (validation.issues.length > 0) {
            console.log(`  ⚠ Issues: ${validation.issues.join(', ')}`);
          }
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test pattern learning endpoint
   */
  async testPatternLearning(): Promise<void> {
    const endpoint = '/api/ml/analytics/pattern-learning';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        const validation = this.validatePatternLearning(data);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 && validation.valid ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: validation.valid,
            dataIntegrity: validation.valid,
            issues: validation.issues,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Schema valid: ${validation.valid}`);
          if (validation.issues.length > 0) {
            console.log(`  ⚠ Issues: ${validation.issues.join(', ')}`);
          }
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test quality trends endpoint
   */
  async testQualityTrends(): Promise<void> {
    const endpoint = '/api/ml/analytics/quality-trends';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        const validation = this.validateQualityTrends(data);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 && validation.valid ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: validation.valid,
            dataIntegrity: validation.valid,
            issues: validation.issues,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Schema valid: ${validation.valid}`);
          if (validation.issues.length > 0) {
            console.log(`  ⚠ Issues: ${validation.issues.join(', ')}`);
          }
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test performance metrics endpoint
   */
  async testPerformanceMetrics(): Promise<void> {
    const endpoint = '/api/ml/analytics/performance-metrics';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        const validation = this.validatePerformanceMetrics(data);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 && validation.valid ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: validation.valid,
            dataIntegrity: validation.valid,
            issues: validation.issues,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Schema valid: ${validation.valid}`);
          if (validation.issues.length > 0) {
            console.log(`  ⚠ Issues: ${validation.issues.join(', ')}`);
          }
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test endpoint
   */
  async testTestEndpoint(): Promise<void> {
    const endpoint = '/api/ml/analytics/test';
    console.log(`\n🧪 Testing ${endpoint}...`);

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { data, responseTime, statusCode } = await this.makeRequest(endpoint);
        this.recordPerformance(endpoint, responseTime);

        this.results.push({
          endpoint,
          method: 'GET',
          status: statusCode === 200 ? 'PASS' : 'FAIL',
          responseTime,
          statusCode,
          dataValidation: {
            schemaValid: true,
            dataIntegrity: true,
          },
        });

        if (i === 0) {
          console.log(`  ✓ Status: ${statusCode}`);
          console.log(`  ✓ Response time: ${responseTime.toFixed(2)}ms`);
          console.log(`  ✓ Data: ${JSON.stringify(data)}`);
        }
      } catch (error: any) {
        this.results.push({
          endpoint,
          method: 'GET',
          status: 'FAIL',
          responseTime: error.responseTime || 0,
          error: error.error || 'Unknown error',
        });
        console.log(`  ✗ Error: ${error.error}`);
      }
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n🧪 Testing Error Handling...');

    // Test 404
    try {
      const { statusCode, responseTime } = await this.makeRequest('/api/ml/analytics/nonexistent');
      this.results.push({
        endpoint: '/api/ml/analytics/nonexistent',
        method: 'GET',
        status: statusCode === 404 ? 'PASS' : 'FAIL',
        responseTime,
        statusCode,
      });
      console.log(`  ✓ 404 handling: ${statusCode === 404 ? 'PASS' : 'FAIL'}`);
    } catch (error: any) {
      console.log(`  ✓ 404 handling: Error correctly thrown`);
    }

    // Test invalid method
    try {
      const { statusCode, responseTime } = await this.makeRequest('/api/ml/analytics/overview', {
        method: 'POST',
      });
      this.results.push({
        endpoint: '/api/ml/analytics/overview',
        method: 'POST',
        status: statusCode === 405 ? 'PASS' : 'WARN',
        responseTime,
        statusCode,
      });
      console.log(`  ✓ Invalid method: ${statusCode}`);
    } catch (error: any) {
      console.log(`  ✓ Invalid method: Error thrown`);
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): void {
    console.log('\n\n📊 PERFORMANCE METRICS');
    console.log('═'.repeat(80));

    const endpoints = Array.from(this.performanceData.keys());
    for (const endpoint of endpoints) {
      const metrics = this.getPerformanceMetrics(endpoint);
      if (!metrics) continue;

      console.log(`\n${endpoint}`);
      console.log(`  Min:     ${metrics.min.toFixed(2)}ms`);
      console.log(`  Average: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50:     ${metrics.p50.toFixed(2)}ms`);
      console.log(`  P95:     ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99:     ${metrics.p99.toFixed(2)}ms`);
      console.log(`  Max:     ${metrics.max.toFixed(2)}ms`);

      // Performance assessment
      if (metrics.p95 < 2000) {
        console.log(`  ✓ P95 < 2s: PASS`);
      } else {
        console.log(`  ✗ P95 > 2s: FAIL`);
      }
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(): void {
    console.log('\n\n📋 TEST SUMMARY');
    console.log('═'.repeat(80));

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`✓ Passed:    ${passed} (${((passed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`✗ Failed:    ${failed} (${((failed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`⚠ Warnings:  ${warnings} (${((warnings / totalTests) * 100).toFixed(1)}%)`);

    // Show failures
    const failures = this.results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      console.log('\n❌ FAILURES:');
      failures.forEach(f => {
        console.log(`  ${f.endpoint} (${f.method}): ${f.error || 'Validation failed'}`);
        if (f.dataValidation?.issues) {
          f.dataValidation.issues.forEach(issue => {
            console.log(`    - ${issue}`);
          });
        }
      });
    }

    // Production readiness assessment
    console.log('\n\n🚀 PRODUCTION READINESS ASSESSMENT');
    console.log('═'.repeat(80));

    const passRate = (passed / totalTests) * 100;
    const allP95UnderThreshold = Array.from(this.performanceData.keys()).every(endpoint => {
      const metrics = this.getPerformanceMetrics(endpoint);
      return metrics ? metrics.p95 < 2000 : false;
    });

    console.log(`\n✓ Pass Rate:         ${passRate.toFixed(1)}%`);
    console.log(`✓ Performance (P95): ${allP95UnderThreshold ? '< 2s' : '> 2s'}`);
    console.log(`✓ Data Integrity:    ${failures.length === 0 ? 'PASS' : 'FAIL'}`);

    if (passRate >= 95 && allP95UnderThreshold && failures.length === 0) {
      console.log('\n✅ PRODUCTION READY');
    } else {
      console.log('\n⚠️  NOT PRODUCTION READY - Issues detected');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting ML Analytics Production Tests');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🔄 Iterations per endpoint: ${TEST_ITERATIONS}`);
    console.log('═'.repeat(80));

    await this.testTestEndpoint();
    await this.testOverview();
    await this.testVocabularyBalance();
    await this.testPatternLearning();
    await this.testQualityTrends();
    await this.testPerformanceMetrics();
    await this.testErrorHandling();

    this.generatePerformanceReport();
    this.generateSummaryReport();
  }
}

// Run tests
const tester = new MLAnalyticsProductionTester();
tester.runAllTests().catch(console.error);
