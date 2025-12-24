/**
 * ML Analytics Admin Page
 *
 * CONCEPT: Admin dashboard for ML optimization analytics and insights
 * WHY: Visibility into pattern learning, vocabulary balance, and quality improvements
 * PATTERN: Simple page wrapper around MLAnalyticsDashboard component with auth check
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MLAnalyticsDashboard } from '../../components/admin/MLAnalyticsDashboard';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

export const MLAnalyticsPage: React.FC = () => {
  const { user, loading: authLoading } = useSupabaseAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ML analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access ML analytics.</p>
          <Link
            to="/login"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ML Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Pattern learning, vocabulary balance, and quality optimization insights
              </p>
            </div>
            <Link
              to="/admin/annotations"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Annotations
            </Link>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MLAnalyticsDashboard />
      </div>
    </div>
  );
};

export default MLAnalyticsPage;
