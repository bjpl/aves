// CONCEPT: Admin dashboard for reviewing AI-generated annotations
// WHY: Centralized interface for annotation quality control before publishing
// PATTERN: Filtered list view with pagination and keyboard shortcuts

import React, { useState, useEffect, useCallback } from 'react';
import {
  useAIAnnotationsPending,
  useAIAnnotations,
  useAIAnnotationStats,
  AIAnnotationStatus,
} from '../../hooks/useAIAnnotations';
import { AnnotationReviewCard } from '../../components/admin/AnnotationReviewCard';
import { AnnotationBatchActions } from '../../components/admin/AnnotationBatchActions';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useToast, ToastContainer } from '../../components/admin/image-management';

const ITEMS_PER_PAGE = 10;

export const AnnotationReviewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AIAnnotationStatus>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toasts, addToast, removeToast } = useToast();

  // Fetch data based on active tab
  const { data: annotations = [], isLoading, error } = useAIAnnotations({ status: activeTab });
  const { data: stats } = useAIAnnotationStats();

  // Pagination
  const totalPages = Math.ceil(annotations.length / ITEMS_PER_PAGE);
  const paginatedAnnotations = annotations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handle tab change
  const handleTabChange = (status: AIAnnotationStatus) => {
    setActiveTab(status);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    setSelectedIds(paginatedAnnotations.map((a) => a.id));
  }, [paginatedAnnotations]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleToggleSelection = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) =>
      selected ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // A = Approve first annotation
      if (e.key === 'a' && paginatedAnnotations.length > 0) {
        const firstCard = document.querySelector('[data-annotation-id]');
        const approveButton = firstCard?.querySelector('button[data-action="approve"]') as HTMLButtonElement;
        approveButton?.click();
      }

      // R = Reject first annotation
      if (e.key === 'r' && paginatedAnnotations.length > 0) {
        const firstCard = document.querySelector('[data-annotation-id]');
        const rejectButton = firstCard?.querySelector('button[data-action="reject"]') as HTMLButtonElement;
        rejectButton?.click();
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
      if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [paginatedAnnotations, currentPage, totalPages]);

  // Reset selection when page changes
  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Annotation Review Dashboard
        </h1>
        <p className="text-gray-600">
          Review and approve AI-generated annotations before publishing to learners.
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600 mt-1">Total Generated</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600 mt-1">Pending Review</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-gray-600 mt-1">Approved</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600">
                {(stats.avgConfidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg Confidence</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(value) => handleTabChange(value as AIAnnotationStatus)}>
        <TabList className="mb-6">
          <Tab value="pending">
            Pending Review
            {stats && stats.pending > 0 && (
              <Badge variant="warning" size="sm" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </Tab>
          <Tab value="approved">
            Approved
            {stats && stats.approved > 0 && (
              <Badge variant="success" size="sm" className="ml-2">
                {stats.approved}
              </Badge>
            )}
          </Tab>
          <Tab value="rejected">
            Rejected
            {stats && stats.rejected > 0 && (
              <Badge variant="danger" size="sm" className="ml-2">
                {stats.rejected}
              </Badge>
            )}
          </Tab>
        </TabList>

        <TabPanel value="pending">
          {renderContent('pending')}
        </TabPanel>
        <TabPanel value="approved">
          {renderContent('approved')}
        </TabPanel>
        <TabPanel value="rejected">
          {renderContent('rejected')}
        </TabPanel>
      </Tabs>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">Keyboard Shortcuts:</p>
        <p>A = Approve | R = Reject | ← → = Navigate</p>
      </div>
    </div>
  );

  function renderContent(status: AIAnnotationStatus) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="error">
          Failed to load annotations. Please try again later.
        </Alert>
      );
    }

    if (annotations.length === 0) {
      return (
        <Card variant="outlined" padding="lg">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No {status} annotations
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {status === 'pending'
                ? 'All annotations have been reviewed!'
                : `No annotations have been ${status} yet.`}
            </p>
          </div>
        </Card>
      );
    }

    return (
      <div>
        {/* Batch Actions (only for pending) */}
        {status === 'pending' && (
          <AnnotationBatchActions
            selectedIds={selectedIds}
            totalCount={paginatedAnnotations.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onBatchComplete={() => addToast('success', 'Batch operation completed successfully!')}
          />
        )}

        {/* Annotation Cards */}
        <div className="space-y-4">
          {paginatedAnnotations.map((annotation) => (
            <div key={annotation.id} data-annotation-id={annotation.id}>
              <AnnotationReviewCard
                annotation={annotation}
                imageUrl={annotation.imageUrl}
                isSelected={selectedIds.includes(annotation.id)}
                onSelect={(selected) => handleToggleSelection(annotation.id, selected)}
                onActionComplete={() => addToast('success', 'Action completed successfully!')}
                onToast={addToast}
              />
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, annotations.length)}
                  </span>{' '}
                  of <span className="font-medium">{annotations.length}</span> results
                </p>
              </div>
              <div>
                <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};
