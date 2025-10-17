/**
 * Admin Annotation Review Page
 *
 * CONCEPT: Human-in-the-loop annotation review interface with analytics
 * WHY: Quality control for Claude-generated educational content
 * PATTERN: Tabbed interface with review workflow and analytics dashboard
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAIAnnotationsPending, useAIAnnotationStats } from '../../hooks/useAIAnnotations';
import { AnnotationReviewCard } from '../../components/admin/AnnotationReviewCard';
import { AnnotationAnalyticsDashboard } from '../../components/admin/AnnotationAnalyticsDashboard';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'edited';
type SortType = 'newest' | 'oldest' | 'confidence' | 'difficulty';
type TabType = 'review' | 'analytics';

export const AdminAnnotationReviewPage: React.FC = () => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { data: annotations, isLoading, error, refetch } = useAIAnnotationsPending();
  const { data: stats, isLoading: statsLoading } = useAIAnnotationStats();

  const [filter, setFilter] = useState<FilterType>('pending');
  const [sort, setSort] = useState<SortType>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('review');

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading annotations...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the admin panel.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Annotations</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredAnnotations = annotations || [];

  // Use stats from API instead of calculating from filtered list
  const pendingCount = stats?.pending || 0;
  const approvedCount = stats?.approved || 0;
  const totalCount = stats?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Annotation Review</h1>
              <p className="text-gray-600 mt-1">
                Review and approve Claude-generated bird annotations
              </p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
                <div className="text-xs text-gray-600">Approved</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Review Annotations
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Analytics Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'analytics' ? (
          <AnnotationAnalyticsDashboard targetCount={400} />
        ) : (
          <>
            {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-md font-medium ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({totalCount})
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <span className="text-sm text-gray-600 self-center">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Annotations Grid */}
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Done!</h3>
            <p className="text-gray-600">No pending annotations to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAnnotations.map((annotation: any) => (
              <AnnotationReviewCard
                key={annotation.id}
                annotation={annotation}
                imageUrl={annotation.imageUrl || ''}
                onActionComplete={() => refetch()}
                isSelected={selectedIds.has(annotation.id)}
                onSelect={(selected) => {
                  const newSelected = new Set(selectedIds);
                  if (selected) {
                    newSelected.add(annotation.id);
                  } else {
                    newSelected.delete(annotation.id);
                  }
                  setSelectedIds(newSelected);
                }}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnnotationReviewPage;
