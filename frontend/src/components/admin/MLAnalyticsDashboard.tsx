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
      {/* Status Badge - Only show status, not duplicate title */}
      <div className="flex items-center justify-end">
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
              <p className="text-sm font-medium text-gray-600 mb-1">Learned Patterns</p>
              <p className="text-xs text-gray-500 mb-2 px-2">Unique patterns identified from approved annotations</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Quality Improvement</p>
              <p className="text-xs text-gray-500 mb-2 px-2">Change in annotation quality over time</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Vocab Coverage</p>
              <p className="text-xs text-gray-500 mb-2 px-2">Bird anatomy features covered by annotations</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Throughput</p>
              <p className="text-xs text-gray-500 mb-2 px-2">Images processed per second</p>
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Learned Patterns</h3>
                <p className="text-xs text-gray-600 mt-1">Visual and vocabulary features recognized from approved annotations</p>
              </div>
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Vocabulary Gaps</h3>
                <p className="text-xs text-gray-600 mt-1">Underrepresented bird anatomy features needing more annotations</p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vocabulary.topGaps.map((gap, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{gap}</span>
                    <Badge variant="warning" size="sm">
                      Needs more
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quality Trend</h3>
                <p className="text-xs text-gray-600 mt-1">Annotation quality comparison over time</p>
              </div>
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pipeline Performance</h3>
              <p className="text-xs text-gray-600 mt-1">Real-time annotation processing metrics</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">P50 Latency</p>
                <p className="text-xs text-gray-500 mb-2">Median processing time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((performance.pipeline.p50Duration || 0) / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">P95 Latency</p>
                <p className="text-xs text-gray-500 mb-2">95th percentile time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((performance.pipeline.p95Duration || 0) / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-xs text-gray-500 mb-2">Completed without errors</p>
                <p className="text-2xl font-bold text-green-600">
                  {performance.pipeline.successRate || 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Concurrency</p>
                <p className="text-xs text-gray-500 mb-2">Parallel processing</p>
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Species-Specific Recommendations</h3>
              <p className="text-xs text-gray-600 mt-1">AI-generated suggestions for improving dataset coverage per species</p>
            </div>
          </CardHeader>
          <CardBody>
            {/* Actionable Guidance Banner */}
            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">💡 How to use these recommendations</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    These features need more annotations to improve ML accuracy. Focus your annotation efforts on these areas:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>When annotating images of these species, prioritize the listed features</li>
                    <li>Use the ML-optimized pipeline to automatically target underrepresented features</li>
                    <li>More annotations = better ML pattern recognition = higher quality results</li>
                  </ul>
                </div>
              </div>
            </div>

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
                      <p className="text-xs text-gray-600 mb-1">Recommended features to prioritize:</p>
                      <div className="flex flex-wrap gap-1">
                        {insight.recommendedFeatures.map((feature, fIdx) => (
                          <span key={fIdx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
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
