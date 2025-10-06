// CONCEPT: Comprehensive analytics dashboard for annotation review workflow
// WHY: Provide visibility into dataset quality, progress, and rejection patterns
// PATTERN: Data visualization with cards, progress bars, and tables

import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAnnotationAnalytics, calculateDatasetProgress } from '../../hooks/useAnnotationAnalytics';

/**
 * Props for AnnotationAnalyticsDashboard
 */
export interface AnnotationAnalyticsDashboardProps {
  /** Target number of annotations for MVP (default: 400) */
  targetCount?: number;
}

/**
 * AnnotationAnalyticsDashboard Component
 *
 * Displays comprehensive analytics for the annotation review workflow including:
 * - Overall progress toward dataset goal
 * - Status breakdown (pending/approved/rejected)
 * - Quality flags (too small, low confidence)
 * - Species coverage
 * - Annotation type distribution
 * - Rejection category breakdown
 *
 * @example
 * <AnnotationAnalyticsDashboard targetCount={400} />
 */
export const AnnotationAnalyticsDashboard: React.FC<AnnotationAnalyticsDashboardProps> = ({
  targetCount = 400,
}) => {
  const { data: analytics, isLoading, error } = useAnnotationAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">Failed to load analytics</p>
        <p className="text-red-600 text-sm">Please check your connection and try again.</p>
      </div>
    );
  }

  const progress = calculateDatasetProgress(analytics.overview.total, targetCount);
  const qualityIssueCount = analytics.qualityFlags.tooSmall + analytics.qualityFlags.lowConfidence;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Annotation Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Dataset quality and review progress metrics
          </p>
        </div>
        <Badge variant="info" size="lg">
          {analytics.overview.total} Total Annotations
        </Badge>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending Review</p>
              <p className="text-4xl font-bold text-yellow-600">{analytics.overview.pending}</p>
              <p className="text-xs text-gray-500 mt-2">
                {((analytics.overview.pending / analytics.overview.total) * 100).toFixed(1)}% of total
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Approved Card */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
              <p className="text-4xl font-bold text-green-600">{analytics.overview.approved}</p>
              <p className="text-xs text-gray-500 mt-2">
                {((analytics.overview.approved / analytics.overview.total) * 100).toFixed(1)}% of total
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Rejected Card */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Rejected</p>
              <p className="text-4xl font-bold text-red-600">{analytics.overview.rejected}</p>
              <p className="text-xs text-gray-500 mt-2">
                {((analytics.overview.rejected / analytics.overview.total) * 100).toFixed(1)}% of total
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Confidence Card */}
        <Card variant="elevated">
          <CardBody>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Avg Confidence</p>
              <p className="text-4xl font-bold text-blue-600">
                {(parseFloat(analytics.overview.avgConfidence) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {parseFloat(analytics.overview.avgConfidence) >= 0.8 ? 'High' : 'Medium'} quality
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* PROGRESS BAR */}
      <Card variant="elevated">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Dataset Progress</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {analytics.overview.total} / {targetCount} annotations
              </span>
              <span className="font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              {targetCount - analytics.overview.total} more annotations needed for MVP dataset
            </p>
          </div>
        </CardBody>
      </Card>

      {/* QUALITY FLAGS */}
      {qualityIssueCount > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Quality Flags</h3>
              <Badge variant="warning" size="sm">
                {qualityIssueCount} Issues Detected
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Too Small */}
              {analytics.qualityFlags.tooSmall > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-900 mb-1">
                        ⚠️ Too Small (&lt;2%)
                      </p>
                      <p className="text-xs text-yellow-700">
                        Bounding boxes covering less than 2% of image area
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {analytics.qualityFlags.tooSmall}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-800 mt-2">
                    💡 Suggestion: Consider rejecting or requesting better images
                  </p>
                </div>
              )}

              {/* Low Confidence */}
              {analytics.qualityFlags.lowConfidence > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">
                        ⚠️ Low Confidence (&lt;70%)
                      </p>
                      <p className="text-xs text-red-700">
                        AI confidence score below recommended threshold
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {analytics.qualityFlags.lowConfidence}
                    </span>
                  </div>
                  <p className="text-xs text-red-800 mt-2">
                    💡 Suggestion: Review carefully before approving
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* SPECIES COVERAGE & TYPE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Coverage */}
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Species Coverage</h3>
          </CardHeader>
          <CardBody>
            {Object.keys(analytics.bySpecies).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(analytics.bySpecies)
                  .sort(([, a], [, b]) => b - a)
                  .map(([species, count]) => (
                    <div
                      key={species}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">{species}</span>
                      <Badge variant="info" size="sm">
                        {count} annotations
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No species data available
              </p>
            )}
          </CardBody>
        </Card>

        {/* Type Distribution */}
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Annotation Types</h3>
          </CardHeader>
          <CardBody>
            {Object.keys(analytics.byType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const percentage = (count / analytics.overview.pending) * 100;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{type}</span>
                          <span className="text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No type distribution data available
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* REJECTION CATEGORIES */}
      {Object.keys(analytics.rejectionsByCategory).length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Rejection Categories</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(analytics.rejectionsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-900">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="danger" size="sm">
                        {count}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
