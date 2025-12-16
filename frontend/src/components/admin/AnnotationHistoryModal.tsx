// CONCEPT: Modal to display annotation edit history with version control
// WHY: Allow admins to track changes, understand annotation evolution, and audit edits
// PATTERN: Modal with timeline view showing chronological changes

import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';
import { error as logError } from '../../utils/logger';

export interface AnnotationHistoryEntry {
  id: string;
  changedAt: string;
  changedByEmail: string;
  changeType: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  changesSummary: string;
  changedFields: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

interface AnnotationHistoryModalProps {
  annotationId: string;
  annotationLabel: string;
  onClose: () => void;
}

export const AnnotationHistoryModal: React.FC<AnnotationHistoryModalProps> = ({
  annotationId,
  annotationLabel,
  onClose,
}) => {
  const [history, setHistory] = useState<AnnotationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/annotations/${annotationId}/history`);

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        logError('Failed to fetch annotation history', err instanceof Error ? err : { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [annotationId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
      create: 'success',
      update: 'info',
      approve: 'success',
      reject: 'danger',
      delete: 'danger',
    };

    return (
      <Badge variant={variants[changeType] || 'default'} size="sm">
        {changeType.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Annotation History</h2>
            <p className="text-blue-100 text-sm mt-1">{annotationLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
              <span className="ml-3 text-gray-600">Loading history...</span>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
            </Alert>
          ) : history.length === 0 ? (
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No history available</h3>
              <p className="mt-1 text-sm text-gray-500">
                This annotation has no recorded changes yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                {history.map((entry, index) => (
                  <div key={entry.id} className="relative pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute left-6 top-2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />

                    {/* History card */}
                    <div className="ml-14 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getChangeTypeBadge(entry.changeType)}
                            <span className="text-sm font-medium text-gray-900">
                              {entry.changesSummary}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span>{entry.changedByEmail}</span>
                            <span className="text-gray-400">•</span>
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span title={formatDate(entry.changedAt)}>
                              {getRelativeTime(entry.changedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Changed fields */}
                      {entry.changedFields.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {entry.changedFields.map((field, fieldIndex) => (
                            <div
                              key={fieldIndex}
                              className="bg-white rounded p-3 border border-gray-200"
                            >
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                {field.field}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-500 font-medium mb-1">Before:</div>
                                  <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800 font-mono text-xs break-all">
                                    {field.oldValue}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 font-medium mb-1">After:</div>
                                  <div className="bg-green-50 border border-green-200 rounded p-2 text-green-800 font-mono text-xs break-all">
                                    {field.newValue}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
