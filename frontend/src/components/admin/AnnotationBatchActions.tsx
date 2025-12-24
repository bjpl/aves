// CONCEPT: Batch action controls for efficient annotation review
// WHY: Enable admins to process multiple annotations simultaneously
// PATTERN: Selection state management with progress feedback

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useBatchApprove, useBatchReject } from '../../hooks/useAIAnnotations';

export interface AnnotationBatchActionsProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchComplete?: () => void;
}

export const AnnotationBatchActions: React.FC<AnnotationBatchActionsProps> = ({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchComplete,
}) => {
  const [showProgress, setShowProgress] = useState(false);

  const batchApproveMutation = useBatchApprove();
  const batchRejectMutation = useBatchReject();

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      setShowProgress(true);
      await batchApproveMutation.mutateAsync(selectedIds);
      onClearSelection();
      onBatchComplete?.();
    } catch (error) {
      // Error is handled by mutation
    } finally {
      setTimeout(() => setShowProgress(false), 1000);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to reject ${selectedIds.length} annotation(s)?`
    );

    if (!confirmed) return;

    try {
      setShowProgress(true);
      await batchRejectMutation.mutateAsync({ annotationIds: selectedIds });
      onClearSelection();
      onBatchComplete?.();
    } catch (error) {
      // Error is handled by mutation
    } finally {
      setTimeout(() => setShowProgress(false), 1000);
    }
  };

  const isLoading = batchApproveMutation.isPending || batchRejectMutation.isPending;
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Selection Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.length === totalCount && totalCount > 0}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectAll();
              } else {
                onClearSelection();
              }
            }}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            aria-label="Select all annotations"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              {hasSelection ? (
                <>
                  <Badge variant="primary" size="sm" className="mr-2">
                    {selectedIds.length}
                  </Badge>
                  selected
                </>
              ) : (
                'Select annotations for batch operations'
              )}
            </span>
            {hasSelection && (
              <button
                onClick={onClearSelection}
                className="ml-3 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={handleBatchApprove}
            disabled={!hasSelection || isLoading}
            isLoading={batchApproveMutation.isPending}
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
          >
            Approve All ({selectedIds.length})
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleBatchReject}
            disabled={!hasSelection || isLoading}
            isLoading={batchRejectMutation.isPending}
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            }
          >
            Reject All ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {showProgress && (
        <div className="mt-4">
          <ProgressBar
            value={isLoading ? 50 : 100}
            max={100}
            color={isLoading ? 'primary' : 'success'}
            size="sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            {isLoading
              ? 'Processing batch operation...'
              : `Successfully processed ${selectedIds.length} annotation(s)`}
          </p>
        </div>
      )}

      {/* Error Messages */}
      {batchApproveMutation.isError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            Failed to approve annotations. Please try again.
          </p>
        </div>
      )}

      {batchRejectMutation.isError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            Failed to reject annotations. Please try again.
          </p>
        </div>
      )}
    </div>
  );
};
