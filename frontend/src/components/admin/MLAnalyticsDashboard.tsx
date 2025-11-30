// CONCEPT: ML Optimization Analytics Dashboard
// WHY: Provide visibility into ML pattern learning, vocabulary balance, and quality improvements
// PATTERN: Data visualization with cards, charts, and progress indicators

import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import {
  useMLOverview,
  useVocabularyBalance,
  usePatternLearning,
  useQualityTrends,
  usePerformanceMetrics
} from '../../hooks/useMLAnalytics';

interface PatternDetail {
  feature: string;
  confidence: number;
  observations: number;
  reliability: 'high' | 'medium' | 'low';
}

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

  const [selectedPattern, setSelectedPattern] = useState<PatternDetail | null>(null);
  const [showAllPatterns, setShowAllPatterns] = useState(false);

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
            <div className="flex items-center justify-between">
              <Tooltip content="Visual and vocabulary features the ML model has learned to recognize from approved annotations. Higher confidence patterns are more reliably detected." position="right">
                <h3 className="text-lg font-semibold text-gray-900 cursor-help border-b border-dotted border-gray-400 inline-block">Top Learned Patterns</h3>
              </Tooltip>
              {patterns.topPatterns.length > 6 && (
                <button
                  onClick={() => setShowAllPatterns(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View all {patterns.topPatterns.length} patterns
                </button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {patterns.topPatterns.slice(0, 6).map((pattern, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPattern(pattern)}
                  className={`text-left border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    pattern.reliability === 'high' ? 'border-green-300 bg-green-50 hover:border-green-400' :
                    pattern.reliability === 'medium' ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400' :
                    'border-gray-300 bg-gray-50 hover:border-gray-400'
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
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{pattern.observations} observations</span>
                    <span className="text-blue-600">Click for details</span>
                  </div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pattern Detail Modal */}
      <Modal
        isOpen={selectedPattern !== null}
        onClose={() => setSelectedPattern(null)}
        title="Pattern Details"
        size="md"
      >
        {selectedPattern && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              selectedPattern.reliability === 'high' ? 'bg-green-50' :
              selectedPattern.reliability === 'medium' ? 'bg-yellow-50' :
              'bg-gray-50'
            }`}>
              <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedPattern.feature}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Confidence Score</p>
                  <p className="text-2xl font-bold text-blue-600">{(selectedPattern.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Observations</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedPattern.observations}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Reliability Level</p>
              <Badge
                variant={selectedPattern.reliability === 'high' ? 'success' : selectedPattern.reliability === 'medium' ? 'warning' : 'default'}
                size="lg"
              >
                {selectedPattern.reliability.charAt(0).toUpperCase() + selectedPattern.reliability.slice(1)} Reliability
              </Badge>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>What this means:</strong> The ML system has learned to recognize "{selectedPattern.feature}" with{' '}
                {selectedPattern.reliability === 'high' ? 'high' : selectedPattern.reliability === 'medium' ? 'moderate' : 'low'}{' '}
                accuracy based on {selectedPattern.observations} verified examples in the training data.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* All Patterns Modal */}
      <Modal
        isOpen={showAllPatterns}
        onClose={() => setShowAllPatterns(false)}
        title="All Learned Patterns"
        size="lg"
      >
        {patterns && (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {patterns.topPatterns.map((pattern, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowAllPatterns(false);
                    setSelectedPattern(pattern);
                  }}
                  className={`text-left border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                    pattern.reliability === 'high' ? 'border-green-300 bg-green-50' :
                    pattern.reliability === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{pattern.feature}</span>
                    <Badge
                      variant={pattern.reliability === 'high' ? 'success' : pattern.reliability === 'medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {(pattern.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {pattern.observations} observations
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* VOCABULARY BALANCE & QUALITY TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vocabulary Gaps */}
        {vocabulary && vocabulary.topGaps && vocabulary.topGaps.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <Tooltip content="Bird anatomy features that are underrepresented in the dataset. Filling these gaps improves the model's ability to identify all parts of a bird." position="right">
                <h3 className="text-lg font-semibold text-gray-900 cursor-help border-b border-dotted border-gray-400 inline-block">Top Vocabulary Gaps</h3>
              </Tooltip>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vocabulary.topGaps.map((gap, idx) => (
                  <Tooltip key={idx} content={`Feature "${gap}" needs more annotations to improve ML detection accuracy`} position="left">
                    <div className="flex items-center justify-between py-2 px-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors cursor-help">
                      <span className="text-sm font-medium text-gray-700">{gap}</span>
                      <Badge variant="warning" size="sm">
                        Missing
                      </Badge>
                    </div>
                  </Tooltip>
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
              <Tooltip content="Comparison of annotation quality over time. Positive improvement means recent annotations are higher quality than historical baseline." position="right">
                <h3 className="text-lg font-semibold text-gray-900 cursor-help border-b border-dotted border-gray-400 inline-block">Quality Trend</h3>
              </Tooltip>
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
            <Tooltip content="Real-time metrics showing how efficiently the annotation pipeline is processing images" position="right">
              <h3 className="text-lg font-semibold text-gray-900 cursor-help border-b border-dotted border-gray-400 inline-block">Pipeline Performance</h3>
            </Tooltip>
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
            <Tooltip content="AI-generated recommendations for improving dataset coverage per species. Shows which features need more annotations for each bird type." position="right">
              <h3 className="text-lg font-semibold text-gray-900 cursor-help border-b border-dotted border-gray-400 inline-block">Species-Specific Recommendations</h3>
            </Tooltip>
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
                      <Tooltip content={`Total annotations collected for ${insight.species}`} position="left">
                        <div className="cursor-help">
                          <Badge variant="info" size="sm">
                            {insight.annotations} annotations
                          </Badge>
                        </div>
                      </Tooltip>
                      <Tooltip content={`Number of different features annotated for ${insight.species}`} position="left">
                        <div className="cursor-help">
                          <Badge variant="default" size="sm">
                            {insight.features} features
                          </Badge>
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                  {insight.recommendedFeatures.length > 0 && (
                    <div className="mt-2">
                      <Tooltip content="These features are underrepresented for this species and should be prioritized in future annotations" position="right">
                        <p className="text-xs text-gray-600 mb-1 cursor-help border-b border-dotted border-gray-400 inline-block">Recommended features:</p>
                      </Tooltip>
                      <div className="flex flex-wrap gap-1">
                        {insight.recommendedFeatures.map((feature, fIdx) => (
                          <Tooltip key={fIdx} content={`Priority feature to annotate for ${insight.species}`} position="top">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-help">
                              {feature}
                            </span>
                          </Tooltip>
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
