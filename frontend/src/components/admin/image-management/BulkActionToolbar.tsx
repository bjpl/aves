/**
 * Bulk action toolbar for image selection
 */

import React from 'react';
import { Button } from '../../ui/Button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onAnnotate: () => void;
  isDeleting: boolean;
  isAnnotating: boolean;
  totalCount: number;
  allSelected: boolean;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onAnnotate,
  isDeleting,
  isAnnotating,
  totalCount,
  allSelected,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-[140px] z-20 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="font-medium text-blue-900">
            {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {!allSelected && totalCount > 0 && (
              <button
                type="button"
                onClick={onSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Select all {totalCount}
              </button>
            )}
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Deselect all
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAnnotate}
            isLoading={isAnnotating}
            disabled={isAnnotating || isDeleting}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Annotate Selected
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
            disabled={isAnnotating || isDeleting}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
};
