// CONCEPT: Interactive card for reviewing individual AI-generated annotations
// WHY: Provide admins with a clear UI to review, edit, approve, or reject annotations
// PATTERN: Controlled form component with optimistic updates + enhanced QC workflow + keyboard shortcuts

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { AIAnnotation } from '../../hooks/useAIAnnotations';
import { useApproveAnnotation, useRejectAnnotation, useEditAnnotation, useUpdateAnnotation } from '../../hooks/useAIAnnotations';
import { EnhancedRejectModal } from './EnhancedRejectModal';
import { BoundingBoxEditor } from './BoundingBoxEditor';
import { AnnotationPreviewModal } from './AnnotationPreviewModal';
import { AnnotationHistoryModal } from './AnnotationHistoryModal';
import { RejectionCategoryValue } from '../../constants/annotationQuality';

export interface AnnotationReviewCardProps {
  annotation: AIAnnotation;
  imageUrl: string;
  onActionComplete?: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AnnotationReviewCard: React.FC<AnnotationReviewCardProps> = ({
  annotation,
  imageUrl,
  onActionComplete,
  isSelected = false,
  onSelect,
  onToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    spanishTerm: annotation.spanishTerm,
    englishTerm: annotation.englishTerm,
    pronunciation: annotation.pronunciation || '',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showEnhancedReject, setShowEnhancedReject] = useState(false);
  const [showBboxEditor, setShowBboxEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const approveMutation = useApproveAnnotation();
  const rejectMutation = useRejectAnnotation();
  const editMutation = useEditAnnotation();
  const updateMutation = useUpdateAnnotation();

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(annotation.id);
      onActionComplete?.();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({
        annotationId: annotation.id,
        reason: rejectionReason || undefined,
      });
      setShowRejectForm(false);
      setRejectionReason('');
      onActionComplete?.();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleEdit = async () => {
    try {
      await editMutation.mutateAsync({
        annotationId: annotation.id,
        updates: editedData as Partial<AIAnnotation>,
      });
      setIsEditing(false);
      onActionComplete?.();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({
      spanishTerm: annotation.spanishTerm,
      englishTerm: annotation.englishTerm,
      pronunciation: annotation.pronunciation || '',
    });
  };

  const isLoading = approveMutation.isPending || rejectMutation.isPending || editMutation.isPending || updateMutation.isPending;

  // KEYBOARD SHORTCUTS: Accelerate review workflow
  // WHY: Speed up annotation review from ~30 sec to ~10 sec per annotation
  // PATTERN: Global keyboard listener with input field detection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

      if (isInputField && e.key !== 'Escape') return;

      // Don't trigger if already performing an action
      if (isLoading) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'a':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor) {
            e.preventDefault();
            handleApprove();
          }
          break;

        case 'r':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor) {
            e.preventDefault();
            setShowEnhancedReject(true);
          }
          break;

        case 'e':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor) {
            e.preventDefault();
            setIsEditing(true);
          }
          break;

        case 'f':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor && !showPreview) {
            e.preventDefault();
            setShowBboxEditor(true);
          }
          break;

        case 'p':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor && !showPreview && !showHistory) {
            e.preventDefault();
            setShowPreview(true);
          }
          break;

        case 'h':
          if (!isEditing && !showRejectForm && !showEnhancedReject && !showBboxEditor && !showPreview && !showHistory) {
            e.preventDefault();
            setShowHistory(true);
          }
          break;

        case 'escape':
          e.preventDefault();
          // Close any open modals/forms
          setShowEnhancedReject(false);
          setShowBboxEditor(false);
          setShowRejectForm(false);
          setShowPreview(false);
          setShowHistory(false);
          setShowPreview(false);
          if (isEditing) {
            handleCancelEdit();
          }
          break;
      }
    };

    // Attach listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isEditing, showRejectForm, showEnhancedReject, showBboxEditor, showPreview, isLoading]);

  const getConfidenceBadgeVariant = (score?: number) => {
    if (!score) return 'default';
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'danger';
  };

  // AUTOMATED QUALITY FLAGS
  // WHY: Help reviewers quickly identify problematic annotations
  // PATTERN: Calculate quality metrics and show visual warnings
  const getBoundingBoxArea = () => {
    const bbox = annotation.boundingBox;
    if (!bbox || !bbox.width || !bbox.height) return 0;
    return bbox.width * bbox.height; // Normalized area (0-1)
  };

  const isBboxTooSmall = getBoundingBoxArea() < 0.02; // <2% of image
  const isConfidenceLow = (annotation.confidenceScore ?? 1) < 0.70; // <70%
  const hasQualityIssues = isBboxTooSmall || isConfidenceLow;

  return (
    <Card variant="elevated" className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-3">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-label="Select annotation for batch operations"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                AI-Generated Annotation
              </h3>
              <p className="text-sm text-gray-500">
                Type: <span className="font-medium">{annotation.type}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {annotation.confidenceScore !== undefined && (
              <Badge
                variant={getConfidenceBadgeVariant(annotation.confidenceScore)}
                size="sm"
              >
                Confidence: {(annotation.confidenceScore * 100).toFixed(1)}%
              </Badge>
            )}
            <Badge variant="primary" size="sm">
              Difficulty: {annotation.difficultyLevel}
            </Badge>

            {/* QUALITY WARNING BADGES */}
            {isBboxTooSmall && (
              <Badge variant="warning" size="sm">
                ⚠️ Too Small ({(getBoundingBoxArea() * 100).toFixed(1)}%)
              </Badge>
            )}
            {isConfidenceLow && (
              <Badge variant="danger" size="sm">
                ⚠️ Low Confidence
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview with Annotation */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Image Preview</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden relative bg-gray-900">
              <div className="relative w-full overflow-hidden" style={{ paddingTop: '75%' }}>
                {/* Bird Image */}
                <img
                  src={imageUrl}
                  alt={annotation.englishTerm}
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Yellow Bounding Box Overlay */}
                {annotation.boundingBox && (() => {
                  // Clamp bounding box values to valid range (0-1)
                  const x = Math.max(0, Math.min(1, annotation.boundingBox.x));
                  const y = Math.max(0, Math.min(1, annotation.boundingBox.y));
                  const width = Math.min(annotation.boundingBox.width, 1 - x);
                  const height = Math.min(annotation.boundingBox.height, 1 - y);

                  return (
                    <div
                      className="absolute border-4 border-yellow-400 bg-yellow-400 bg-opacity-10 pointer-events-none"
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${width * 100}%`,
                        height: `${height * 100}%`,
                        boxShadow: 'inset 0 0 0 2px rgba(250, 204, 21, 0.6), 0 0 20px rgba(250, 204, 21, 0.4)',
                      }}
                    >
                      {/* Spanish Term Label */}
                      <div className="absolute -top-8 left-0 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-md text-sm font-bold shadow-lg whitespace-nowrap">
                        {annotation.spanishTerm}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Annotation Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">
              {isEditing ? 'Edit Annotation Data' : 'Annotation Data'}
            </h4>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spanish Term
                  </label>
                  <Input
                    value={editedData.spanishTerm}
                    onChange={(e) =>
                      setEditedData({ ...editedData, spanishTerm: e.target.value })
                    }
                    placeholder="Spanish term"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Term
                  </label>
                  <Input
                    value={editedData.englishTerm}
                    onChange={(e) =>
                      setEditedData({ ...editedData, englishTerm: e.target.value })
                    }
                    placeholder="English term"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pronunciation (IPA)
                  </label>
                  <Input
                    value={editedData.pronunciation}
                    onChange={(e) =>
                      setEditedData({ ...editedData, pronunciation: e.target.value })
                    }
                    placeholder="Pronunciation (optional)"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Spanish:</span>{' '}
                  <span className="text-base text-gray-900">{annotation.spanishTerm}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">English:</span>{' '}
                  <span className="text-base text-gray-900">{annotation.englishTerm}</span>
                </div>
                {annotation.pronunciation && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Pronunciation:</span>{' '}
                    <span className="text-base text-gray-900 font-mono">
                      {annotation.pronunciation}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bounding Box Info */}
            {annotation.boundingBox ? (
              <div className={`rounded-lg p-3 ${hasQualityIssues ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-blue-50'}`}>
                <h5 className={`text-xs font-semibold mb-2 ${hasQualityIssues ? 'text-yellow-900' : 'text-blue-900'}`}>
                  Bounding Box (Normalized 0-1)
                </h5>
                <div className={`grid grid-cols-2 gap-2 text-xs font-mono ${hasQualityIssues ? 'text-yellow-800' : 'text-blue-800'}`}>
                  <div>
                    X: {annotation.boundingBox.x.toFixed(2)}, Y:{' '}
                    {annotation.boundingBox.y.toFixed(2)}
                  </div>
                  <div>
                    W: {annotation.boundingBox.width.toFixed(2)}, H:{' '}
                    {annotation.boundingBox.height.toFixed(2)}
                  </div>
                </div>

                {/* Quality Issue Suggestions */}
                {hasQualityIssues && (
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <p className="text-xs text-yellow-900 font-semibold mb-1">💡 Suggested Action:</p>
                    <ul className="text-xs text-yellow-800 space-y-1">
                      {isBboxTooSmall && (
                        <li>• Consider rejecting: "Too Small (&lt;2% of image)"</li>
                      )}
                      {isConfidenceLow && (
                        <li>• Review carefully: AI confidence below 70%</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg p-3 bg-red-50 border-2 border-red-300">
                <h5 className="text-xs font-semibold mb-2 text-red-900">
                  ⚠️ Missing Bounding Box
                </h5>
                <p className="text-xs text-red-800">
                  This annotation is missing bounding box data. It should be rejected or have a bounding box added via "Fix Position".
                </p>
              </div>
            )}

            {/* Rejection Form */}
            {showRejectForm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-red-900 mb-2">
                  Rejection Reason (Optional)
                </label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why is this annotation being rejected?"
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleReject}
                    isLoading={rejectMutation.isPending}
                  >
                    Confirm Rejection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardBody>

      <CardFooter>
        <div className="flex items-center justify-between w-full gap-4">
          {/* Left: Primary Actions */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleEdit}
                  isLoading={editMutation.isPending}
                  disabled={isLoading}
                >
                  Save & Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={approveMutation.isPending}
                  disabled={isLoading}
                >
                  Approve (A)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  Edit (E)
                </Button>
              </>
            )}
          </div>

          {/* Right: Preview, History, Fix Position & Reject */}
          {!isEditing && !showRejectForm && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={isLoading}
              >
                👁️ Preview (P)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHistory(true)}
                disabled={isLoading}
                title="View annotation edit history"
              >
                📜 History (H)
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowBboxEditor(true)}
                disabled={isLoading}
              >
                🎯 Fix Position (F)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowEnhancedReject(true)}
                disabled={isLoading}
              >
                Reject (R)
              </Button>
            </div>
          )}
        </div>
      </CardFooter>

      {/* Visual Feedback on Success */}
      {(approveMutation.isSuccess || rejectMutation.isSuccess || editMutation.isSuccess) && (
        <div className="absolute inset-0 bg-green-100 bg-opacity-50 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="bg-white px-6 py-3 rounded-lg shadow-lg">
            <span className="text-green-600 font-semibold">
              {approveMutation.isSuccess && 'Approved!'}
              {rejectMutation.isSuccess && 'Rejected!'}
              {editMutation.isSuccess && 'Updated!'}
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Rejection Modal */}
      {showEnhancedReject && (
        <EnhancedRejectModal
          annotationLabel={`${annotation.spanishTerm} (${annotation.englishTerm})`}
          onReject={async (category: RejectionCategoryValue, notes: string) => {
            try {
              await rejectMutation.mutateAsync({
                annotationId: annotation.id,
                category,
                notes
              });
              setShowEnhancedReject(false);
              onActionComplete?.();
            } catch (error) {
              console.error('Rejection failed:', error);
            }
          }}
          onCancel={() => setShowEnhancedReject(false)}
        />
      )}

      {/* Bounding Box Editor Modal */}
      {showBboxEditor && (
        <BoundingBoxEditor
          imageUrl={imageUrl}
          initialBox={{
            ...annotation.boundingBox,
            shape: annotation.boundingBox.shape === 'polygon' ? 'rectangle' : annotation.boundingBox.shape
          }}
          label={annotation.spanishTerm}
          onSave={async (newBox) => {
            try {
              // Update bounding box WITHOUT approving (keeps in review queue)
              await updateMutation.mutateAsync({
                annotationId: annotation.id,
                updates: { boundingBox: newBox }
              });

              setShowBboxEditor(false);
              onActionComplete?.();
            } catch (error: any) {
              console.error('❌ Failed to update bounding box:', error);

              // Show detailed error information
              const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
              const statusCode = error?.response?.status;

              if (onToast) {
                onToast('error', `Failed to save annotation position (${statusCode || 'N/A'}): ${errorMessage}`);
              } else {
                // Fallback to alert if no toast handler provided
                alert(
                  `Failed to save annotation position!\n\n` +
                  `Status: ${statusCode || 'N/A'}\n` +
                  `Error: ${errorMessage}\n\n` +
                  `Check browser console (F12) for more details.`
                );
              }

              // Don't close the editor so user can try again
            }
          }}
          onCancel={() => setShowBboxEditor(false)}
        />
      )}

      {/* Preview as Student Modal */}
      {showPreview && (
        <AnnotationPreviewModal
          annotation={{
            id: annotation.id,
            imageUrl: imageUrl,
            spanishTerm: annotation.spanishTerm,
            englishTerm: annotation.englishTerm,
            type: annotation.type,
            species: annotation.species || 'Bird',
            boundingBox: annotation.boundingBox,
            pronunciation: annotation.pronunciation,
            difficultyLevel: annotation.difficultyLevel
          }}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Annotation History Modal */}
      {showHistory && (
        <AnnotationHistoryModal
          annotationId={annotation.id}
          annotationLabel={`${annotation.spanishTerm} (${annotation.englishTerm})`}
          onClose={() => setShowHistory(false)}
        />
      )}
    </Card>
  );
};
