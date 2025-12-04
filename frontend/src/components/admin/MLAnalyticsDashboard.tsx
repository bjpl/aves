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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Species-Specific Recommendations</h3>
                <p className="text-xs text-gray-600 mt-1">AI-generated suggestions for improving dataset coverage per species</p>
              </div>
              <Tooltip content="These recommendations are generated by analyzing your annotation patterns and identifying underrepresented features that need more training data.">
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full cursor-help">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-purple-700">How it works</span>
                </div>
              </Tooltip>
            </div>
          </CardHeader>
          <CardBody>
            {/* Actionable Guidance Banner */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span>Take Action to Improve ML Accuracy</span>
                    <Badge variant="primary" size="sm">Recommended</Badge>
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    The ML system identified gaps in training data. Annotating these specific features will significantly improve recognition accuracy for each species.
                  </p>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href="/admin/images"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Start Annotating Images
                    </a>
                    <a
                      href="/admin/annotations"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors border-2 border-blue-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Review Existing Annotations
                    </a>
                  </div>

                  {/* Pro Tip */}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      <span><strong>Pro Tip:</strong> Focus on species with the most recommended features first for maximum ML improvement impact.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Species Cards with Action Buttons */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patterns.speciesInsights.slice(0, 8).map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  {/* Header with Species Name and Stats */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-base mb-1 flex items-center gap-2">
                        {insight.species}
                        {insight.recommendedFeatures.length >= 5 && (
                          <Tooltip content="High priority: This species needs significant annotation improvements">
                            <Badge variant="warning" size="sm">
                              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                              High Priority
                            </Badge>
                          </Tooltip>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {insight.annotations} annotations completed
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                          </svg>
                          {insight.features} features tracked
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="info" size="sm">
                        {insight.annotations} done
                      </Badge>
                      <Badge variant={insight.recommendedFeatures.length >= 5 ? 'warning' : 'default'} size="sm">
                        {insight.recommendedFeatures.length} gaps
                      </Badge>
                    </div>
                  </div>

                  {/* Recommended Features */}
                  {insight.recommendedFeatures.length > 0 && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <p className="text-xs font-semibold text-yellow-900">Priority Features (needs more training data):</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {insight.recommendedFeatures.map((feature, fIdx) => (
                          <Tooltip key={fIdx} content={`Add annotations focusing on "${feature}" to improve ML recognition`}>
                            <span className="px-2.5 py-1 bg-white border-2 border-yellow-300 text-yellow-800 text-xs font-medium rounded-full hover:bg-yellow-100 hover:border-yellow-400 transition-colors cursor-help">
                              {feature}
                            </span>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex gap-2">
                    <a
                      href={`/admin/images?species=${encodeURIComponent(insight.species)}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      Annotate {insight.species} Images
                    </a>
                    <Tooltip content="View all existing annotations for this species">
                      <a
                        href={`/admin/annotations?species=${encodeURIComponent(insight.species)}`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors border-2 border-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Review
                      </a>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Help Text */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span>
                  <strong>How this helps:</strong> Each time you add annotations focusing on the recommended features,
                  the ML model learns those patterns and improves its automatic recognition capabilities.
                  The more focused annotations you add, the smarter the system becomes at identifying these features in future images.
                </span>
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
