// CONCEPT: AI Exercise Statistics Dashboard
// WHY: Admin interface to monitor AI exercise generation performance and costs
// PATTERN: Dashboard page with real-time metrics and visualizations

import React, { useState } from 'react';
import { useAIExerciseStats, useClearExerciseCache, usePrefetchExercises } from '../../hooks/useAIExercise';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast, ToastContainer } from '../../components/admin/image-management';

export const AIExerciseStatsPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [prefetchCount, setPrefetchCount] = useState(5);

  // Hooks
  const { data: stats, isLoading, error, refetch } = useAIExerciseStats();
  const { mutate: clearCache, isPending: isClearing } = useClearExerciseCache();
  const { mutate: prefetchExercises, isPending: isPrefetching } = usePrefetchExercises();
  const { toasts, addToast, removeToast } = useToast();

  const handleClearCache = () => {
    if (!userId) {
      addToast('error', 'Please enter a user ID');
      return;
    }

    if (confirm(`Clear cache for user ${userId}? This cannot be undone.`)) {
      clearCache(userId, {
        onSuccess: () => {
          addToast('success', 'Cache cleared successfully');
          refetch();
        },
      });
    }
  };

  const handlePrefetch = () => {
    if (!userId) {
      addToast('error', 'Please enter a user ID');
      return;
    }

    prefetchExercises(
      { userId, count: prefetchCount },
      {
        onSuccess: (data) => {
          addToast(
            'success',
            `Prefetched ${data.prefetched} exercises (${data.cached} from cache) - Cost: $${data.totalCost.toFixed(4)}`
          );
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Statistics</h2>
          <p className="text-red-700">{error.message}</p>
          <Button variant="danger" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No statistics available</p>
        </div>
      </div>
    );
  }

  const cacheHitRatePercent = (stats.cacheHitRate * 100).toFixed(1);
  const avgCostPerUser = stats.totalGenerated > 0 ? (stats.totalCost / stats.totalGenerated).toFixed(4) : '0.00';

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">AI Exercise Statistics</h1>
        <p className="text-purple-100">
          Monitor AI exercise generation performance, caching efficiency, and operational costs
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Generated */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Generated</h3>
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalGenerated.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">exercises created</p>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Cache Hit Rate</h3>
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{cacheHitRatePercent}%</p>
          <Badge
            variant={stats.cacheHitRate >= 0.8 ? 'success' : stats.cacheHitRate >= 0.6 ? 'warning' : 'danger'}
            size="sm"
            className="mt-2"
          >
            {stats.cacheHitRate >= 0.8 ? 'Excellent' : stats.cacheHitRate >= 0.6 ? 'Good' : 'Low'}
          </Badge>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
            <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">lifetime API costs</p>
        </div>

        {/* Avg Generation Time */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Time</h3>
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(stats.avgGenerationTime / 1000).toFixed(2)}s</p>
          <p className="text-xs text-gray-500 mt-1">per exercise</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Breakdown</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Cached Exercises</span>
            <span className="text-gray-900 font-semibold">{stats.cached.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700 font-medium">AI Generated</span>
            <span className="text-gray-900 font-semibold">
              {(stats.totalGenerated - stats.cached).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Cost per Exercise</span>
            <span className="text-gray-900 font-semibold">${avgCostPerUser}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-700 font-medium">Estimated Monthly Cost</span>
            <span className="text-gray-900 font-semibold">
              ${((stats.totalCost / stats.totalGenerated) * 30 * 100).toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">(assuming 100 exercises/day)</span>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Indicators</h2>
        <div className="space-y-4">
          {/* Cache Efficiency Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Cache Efficiency</span>
              <span className="text-sm text-gray-600">{cacheHitRatePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  stats.cacheHitRate >= 0.8
                    ? 'bg-green-500'
                    : stats.cacheHitRate >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${cacheHitRatePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: 80% or higher</p>
          </div>

          {/* Cost Efficiency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Cost Efficiency</span>
              <Badge variant={stats.totalCost < 10 ? 'success' : stats.totalCost < 50 ? 'warning' : 'danger'}>
                {stats.totalCost < 10 ? 'Excellent' : stats.totalCost < 50 ? 'Good' : 'High'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Monthly target: &lt;$10 | Current: ${stats.totalCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions</h2>
        <div className="space-y-6">
          {/* User ID Input */}
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Prefetch Exercises */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="prefetchCount" className="block text-sm font-medium text-gray-700 mb-2">
                Prefetch Count
              </label>
              <input
                id="prefetchCount"
                type="number"
                min="1"
                max="20"
                value={prefetchCount}
                onChange={(e) => setPrefetchCount(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handlePrefetch}
              disabled={!userId || isPrefetching}
              isLoading={isPrefetching}
              variant="primary"
            >
              Prefetch Exercises
            </Button>
          </div>

          {/* Clear Cache */}
          <div>
            <Button
              onClick={handleClearCache}
              disabled={!userId || isClearing}
              isLoading={isClearing}
              variant="danger"
              fullWidth
            >
              Clear User Cache
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Warning: This will remove all cached exercises for the specified user
            </p>
          </div>

          {/* Refresh Stats */}
          <div>
            <Button onClick={() => refetch()} variant="outline" fullWidth>
              Refresh Statistics
            </Button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default AIExerciseStatsPage;
