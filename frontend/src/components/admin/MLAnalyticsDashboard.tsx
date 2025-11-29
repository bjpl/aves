// CONCEPT: ML Optimization Analytics Dashboard
// WHY: Provide visibility into ML pattern learning, vocabulary balance, and quality improvements
// PATTERN: Data visualization with cards, charts, and progress indicators

import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import {
  useMLOverview,
  useVocabularyBalance,
  usePatternLearning,
  useQualityTrends,
  usePerformanceMetrics
} from '../../hooks/useMLAnalytics';

/**
 * MLAnalyticsDashboard Component
 *
 * Displays comprehensive ML optimization analytics including:
 * - Pattern learning progress and insights
 * - Vocabulary balance and coverage
 * - Quality improvement trends
 * - Performance metrics (latency, throughput)
 * - Species-specific recommendations
 */
export const MLAnalyticsDashboard: React.FC = () => {
  const { data: overview, isLoading: overviewLoading } = useMLOverview();
  const { data: vocabulary, isLoading: vocabularyLoading } = useVocabularyBalance();
  const { data: patterns, isLoading: patternsLoading } = usePatternLearning();
  const { data: trends, isLoading: trendsLoading } = useQualityTrends();
  const { data: performance, isLoading: performanceLoading } = usePerformanceMetrics();

  const isLoading = overviewLoading || vocabularyLoading || patternsLoading || trendsLoading || performanceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ML analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ML Optimization Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pattern learning, vocabulary balance, and quality improvements
          </p>
        </div>
        <Badge variant={patterns?.learningStatus === 'active' ? 'success' : 'warning'} size="lg">
          {patterns?.learningStatus === 'active' ? '🧠 Learning Active' : '⏳ Initializing'}
        </Badge>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patterns */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <Tooltip content="Number of unique visual/vocabulary patterns the ML model has identified from approved annotations" position="bottom">
                <p className="text-sm font-medium text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Learned Patterns</p>
              </Tooltip>
              <p className="text-4xl font-bold text-purple-600">{overview?.patternLearning.totalPatterns || 0}</p>
              <p className="text-xs text-gray-500 mt-2">
                Across {overview?.patternLearning.speciesTracked || 0} species
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Confidence Improvement */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <Tooltip content="Percentage change in annotation quality comparing recent annotations to historical baseline" position="bottom">
                <p className="text-sm font-medium text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Quality Improvement</p>
              </Tooltip>
              <p className={`text-4xl font-bold ${overview?.qualityMetrics.improvement.startsWith('+') ? 'text-green-600' : 'text-gray-600'}`}>
                {overview?.qualityMetrics.improvement || '0%'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Recent vs Historical
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Vocabulary Coverage */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <Tooltip content="Percentage of expected bird anatomy features (beak, wing, tail, etc.) covered by annotations across all species" position="bottom">
                <p className="text-sm font-medium text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Vocab Coverage</p>
              </Tooltip>
              <p className="text-4xl font-bold text-blue-600">{vocabulary?.coverage || 0}%</p>
              <p className="text-xs text-gray-500 mt-2">
                {vocabulary?.totalFeatures || 0} features tracked
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Pipeline Performance */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <Tooltip content="Average number of images processed per second by the annotation pipeline" position="bottom">
                <p className="text-sm font-medium text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Throughput</p>
              </Tooltip>
              <p className="text-4xl font-bold text-orange-600">
                {(performance?.pipeline?.throughput || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                images/second
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* PATTERN LEARNING */}
      {patterns && patterns.topPatterns.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Top Learned Patterns</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {patterns.topPatterns.slice(0, 6).map((pattern, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-lg p-4 ${
                    pattern.reliability === 'high' ? 'border-green-300 bg-green-50' :
                    pattern.reliability === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">{pattern.feature}</span>
                    <Badge
                      variant={pattern.reliability === 'high' ? 'success' : pattern.reliability === 'medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {(pattern.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {pattern.observations} observations
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* VOCABULARY BALANCE & QUALITY TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vocabulary Gaps */}
        {vocabulary && vocabulary.topGaps && vocabulary.topGaps.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Top Vocabulary Gaps</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vocabulary.topGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">{gap}</span>
                    <Badge variant="warning" size="sm">
                      Missing
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">
                💡 Run ML-optimized pipeline to target these features
              </p>
            </CardBody>
          </Card>
        )}

        {/* Quality Trends */}
        {trends && trends.summary && (
          <Card variant="elevated">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quality Trend</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Quality</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {((trends.summary.currentQuality || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Improvement</span>
                  <span className={`text-xl font-bold ${Number(trends.summary.improvement || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {Number(trends.summary.improvement || 0) > 0 ? '+' : ''}{trends.summary.improvement || 0}%
                  </span>
                </div>
                {trends.summary.totalWeeks && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600">
                      📈 Tracking {trends.summary.totalWeeks} weeks of data
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* PERFORMANCE METRICS */}
      {performance && performance.status?.pipelineStatus === 'active' && performance.pipeline && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Tooltip content="Median processing time - 50% of images complete within this time" position="bottom">
                  <p className="text-sm text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">P50 Latency</p>
                </Tooltip>
                <p className="text-2xl font-bold text-gray-900">
                  {((performance.pipeline.p50Duration || 0) / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="text-center">
                <Tooltip content="95th percentile processing time - 95% of images complete within this time (worst-case typical)" position="bottom">
                  <p className="text-sm text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">P95 Latency</p>
                </Tooltip>
                <p className="text-2xl font-bold text-gray-900">
                  {((performance.pipeline.p95Duration || 0) / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="text-center">
                <Tooltip content="Percentage of annotation attempts that completed without errors" position="bottom">
                  <p className="text-sm text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Success Rate</p>
                </Tooltip>
                <p className="text-2xl font-bold text-green-600">
                  {performance.pipeline.successRate || 0}%
                </p>
              </div>
              <div className="text-center">
                <Tooltip content="Number of images being processed in parallel - higher means faster batch processing" position="bottom">
                  <p className="text-sm text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400">Concurrency</p>
                </Tooltip>
                <p className="text-2xl font-bold text-purple-600">
                  {performance.pipeline.concurrency || 1}x
                </p>
              </div>
            </div>
            {performance.status?.lastRun && (
              <p className="text-xs text-gray-600 mt-4 text-center">
                Last run: {new Date(performance.status.lastRun).toLocaleString()}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {/* SPECIES INSIGHTS */}
      {patterns && patterns.speciesInsights.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Species-Specific Recommendations</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patterns.speciesInsights.slice(0, 8).map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{insight.species}</span>
                    <div className="flex gap-2">
                      <Badge variant="info" size="sm">
                        {insight.annotations} annotations
                      </Badge>
                      <Badge variant="default" size="sm">
                        {insight.features} features
                      </Badge>
                    </div>
                  </div>
                  {insight.recommendedFeatures.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Recommended features:</p>
                      <div className="flex flex-wrap gap-1">
                        {insight.recommendedFeatures.map((feature, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
