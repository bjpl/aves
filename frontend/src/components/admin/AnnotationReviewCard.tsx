// CONCEPT: Interactive card for reviewing individual AI-generated annotations
// WHY: Provide admins with a clear UI to review, edit, approve, or reject annotations
// PATTERN: Controlled form component with optimistic updates + enhanced QC workflow

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { AnnotationCanvas } from '../annotation/AnnotationCanvas';
import { AIAnnotation } from '../../hooks/useAIAnnotations';
import { useApproveAnnotation, useRejectAnnotation, useEditAnnotation, useUpdateAnnotation } from '../../hooks/useAIAnnotations';
import { Annotation } from '../../types';
import { EnhancedRejectModal } from './EnhancedRejectModal';
import { BoundingBoxEditor } from './BoundingBoxEditor';
import { RejectionCategoryValue } from '../../constants/annotationQuality';
import { toEditorFormat, toBackendFormat } from '../../utils/boundingBoxConverter';

export interface AnnotationReviewCardProps {
  annotation: AIAnnotation;
  imageUrl: string;
  onActionComplete?: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export const AnnotationReviewCard: React.FC<AnnotationReviewCardProps> = ({
  annotation,
  imageUrl,
  onActionComplete,
  isSelected = false,
  onSelect,
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
  const [editedBbox, setEditedBbox] = useState(annotation.boundingBox);

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
        updates: editedData as Partial<Annotation>,
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

  const getConfidenceBadgeVariant = (score?: number) => {
    if (!score) return 'default';
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'danger';
  };

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
          <div className="flex gap-2">
            {annotation.confidenceScore !== undefined && (
              <Badge
                variant={getConfidenceBadgeVariant(annotation.confidenceScore)}
                size="sm"
              >
                Confidence: {(annotation.confidenceScore * 100).toFixed(1)}%
              </Badge>
            )}
            <Badge variant="info" size="sm">
              Difficulty: {annotation.difficultyLevel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview with Annotation */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Image Preview</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden relative bg-gray-900">
              <div className="relative w-full" style={{ paddingTop: '75%' }}>
                {/* Bird Image */}
                <img
                  src={imageUrl}
                  alt={annotation.englishTerm}
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Yellow Bounding Box Overlay */}
                {annotation.boundingBox && annotation.boundingBox.topLeft && (
                  <div
                    className="absolute border-4 border-yellow-400 bg-yellow-400 bg-opacity-10 pointer-events-none"
                    style={{
                      left: `${annotation.boundingBox.topLeft.x * 100}%`,
                      top: `${annotation.boundingBox.topLeft.y * 100}%`,
                      width: `${annotation.boundingBox.width * 100}%`,
                      height: `${annotation.boundingBox.height * 100}%`,
                      boxShadow: 'inset 0 0 0 2px rgba(250, 204, 21, 0.6), 0 0 20px rgba(250, 204, 21, 0.4)',
                    }}
                  >
                    {/* Spanish Term Label */}
                    <div className="absolute -top-8 left-0 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-md text-sm font-bold shadow-lg whitespace-nowrap">
                      {annotation.spanishTerm}
                    </div>
                  </div>
                )}
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
            <div className="bg-blue-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-blue-900 mb-2">Bounding Box (Normalized 0-1)</h5>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800 font-mono">
                <div>
                  X: {annotation.boundingBox.topLeft.x.toFixed(2)}, Y:{' '}
                  {annotation.boundingBox.topLeft.y.toFixed(2)}
                </div>
                <div>
                  W: {annotation.boundingBox.width.toFixed(2)}, H:{' '}
                  {annotation.boundingBox.height.toFixed(2)}
                </div>
              </div>
            </div>

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
                  Edit
                </Button>
              </>
            )}
          </div>

          {/* Right: Fix Position & Reject */}
          {!isEditing && !showRejectForm && (
            <div className="flex gap-2">
              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowBboxEditor(true)}
                disabled={isLoading}
              >
                🎯 Fix Position
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
          initialBox={toEditorFormat(annotation.boundingBox)}
          label={annotation.spanishTerm}
          onSave={async (newBox) => {
            try {
              console.log('🔧 BBOX Editor - New box from editor:', newBox);

              // Convert from editor format to backend format
              const backendFormat = toBackendFormat(newBox);
              console.log('🔧 BBOX Editor - Converted to backend format:', backendFormat);

              console.log('🔧 BBOX Editor - Sending PATCH to annotation:', annotation.id);

              // Update bounding box WITHOUT approving (keeps in review queue)
              const result = await updateMutation.mutateAsync({
                annotationId: annotation.id,
                updates: { boundingBox: backendFormat }
              });

              console.log('🔧 BBOX Editor - Update result:', result);

              setEditedBbox(newBox);
              setShowBboxEditor(false);
              onActionComplete?.();
            } catch (error) {
              console.error('❌ Failed to update bounding box:', error);
              console.error('Error details:', error);
            }
          }}
          onCancel={() => setShowBboxEditor(false)}
        />
      )}
    </Card>
  );
};
