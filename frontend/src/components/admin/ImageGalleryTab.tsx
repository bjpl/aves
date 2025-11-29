/**
 * ImageGalleryTab Component
 *
 * CONCEPT: Grid-based gallery view for browsing and managing collected images
 * WHY: Provides visual overview of all images with filtering, sorting, and quick actions
 * PATTERN: Paginated grid with modal detail view and inline actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { LazyImage } from '../ui/LazyImage';
import { Species } from '../../types';
import {
  useGalleryImages,
  useImageDetails,
  useDeleteImage,
  useAnnotateImage,
  GalleryFilters,
  GalleryImage,
  ImageAnnotation,
} from '../../hooks/useImageGallery';
import { ImageUploadModal } from './ImageUploadModal';
import { BulkActionToolbar } from './image-management/BulkActionToolbar';

// ============================================================================
// Types
// ============================================================================

interface ImageGalleryTabProps {
  species: Species[];
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  selectedImages?: string[];
  onSelectionChange?: (imageIds: string[]) => void;
}

type AnnotationStatus = 'all' | 'annotated' | 'unannotated';
type QualityFilter = 'all' | 'high' | 'medium' | 'low' | 'unscored';
type SortBy = 'createdAt' | 'speciesName' | 'annotationCount' | 'qualityScore';
type SortOrder = 'asc' | 'desc';

/**
 * Get quality badge variant and label based on score
 * High: 80-100 (green), Medium: 60-79 (yellow), Low: 0-59 (red)
 */
const getQualityBadgeProps = (
  score: number | null
): { variant: 'success' | 'warning' | 'danger' | 'info'; label: string } => {
  if (score === null || score === undefined) {
    return { variant: 'info', label: 'N/A' };
  }
  if (score >= 80) {
    return { variant: 'success', label: `${score}%` };
  }
  if (score >= 60) {
    return { variant: 'warning', label: `${score}%` };
  }
  return { variant: 'danger', label: `${score}%` };
};

// ============================================================================
// Sub-components
// ============================================================================

interface FilterBarProps {
  species: Species[];
  filters: GalleryFilters;
  onFilterChange: (filters: Partial<GalleryFilters>) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ species, filters, onFilterChange }) => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg mb-6">
      {/* Species Filter */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
        <select
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={filters.speciesId || ''}
          onChange={(e) => onFilterChange({ speciesId: e.target.value || undefined, page: 1 })}
        >
          <option value="">All Species</option>
          {species.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.englishName}
            </option>
          ))}
        </select>
      </div>

      {/* Annotation Status Filter */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Annotation Status</label>
        <select
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={filters.annotationStatus || 'all'}
          onChange={(e) =>
            onFilterChange({ annotationStatus: e.target.value as AnnotationStatus, page: 1 })
          }
        >
          <option value="all">All Images</option>
          <option value="annotated">Annotated</option>
          <option value="unannotated">Unannotated</option>
        </select>
      </div>

      {/* Quality Filter */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
        <select
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={filters.qualityFilter || 'all'}
          onChange={(e) =>
            onFilterChange({ qualityFilter: e.target.value as QualityFilter, page: 1 })
          }
        >
          <option value="all">All Quality</option>
          <option value="high">High (80-100)</option>
          <option value="medium">Medium (60-79)</option>
          <option value="low">Low (0-59)</option>
          <option value="unscored">Unscored</option>
        </select>
      </div>

      {/* Sort By */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
        <select
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={filters.sortBy || 'createdAt'}
          onChange={(e) => onFilterChange({ sortBy: e.target.value as SortBy })}
        >
          <option value="createdAt">Date Added</option>
          <option value="speciesName">Species Name</option>
          <option value="annotationCount">Annotation Count</option>
          <option value="qualityScore">Quality Score</option>
        </select>
      </div>

      {/* Sort Order */}
      <div className="flex-1 min-w-[150px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
        <select
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={filters.sortOrder || 'desc'}
          onChange={(e) => onFilterChange({ sortOrder: e.target.value as SortOrder })}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
    </div>
  );
};

interface ImageCardProps {
  image: GalleryImage;
  onView: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isAnnotating: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onView,
  onAnnotate,
  onDelete,
  isDeleting,
  isAnnotating,
  isSelected,
  onToggleSelect,
}) => {
  return (
    <div className={`relative group bg-white rounded-lg shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
    }`}>
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white shadow-sm"
          title={isSelected ? 'Deselect image' : 'Select image'}
        />
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] cursor-pointer" onClick={onView}>
        <LazyImage
          src={image.url}
          alt={image.speciesName}
          className="w-full h-full object-cover"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-opacity">
            Click to view
          </span>
        </div>

        {/* Quality badge */}
        <div className="absolute bottom-2 left-2">
          {(() => {
            const qualityProps = getQualityBadgeProps(image.qualityScore);
            return (
              <Badge variant={qualityProps.variant} size="sm" title="Quality Score">
                {qualityProps.label}
              </Badge>
            );
          })()}
        </div>

        {/* Annotation badge */}
        <div className="absolute bottom-2 right-2">
          <Badge
            variant={image.annotationCount > 0 ? 'success' : 'warning'}
            size="sm"
          >
            {image.annotationCount} annotations
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate" title={image.speciesName}>
          {image.speciesName}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(image.createdAt).toLocaleDateString()}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={onView} className="flex-1">
            View
          </Button>
          {image.annotationCount === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAnnotate}
              isLoading={isAnnotating}
              disabled={isAnnotating}
              className="flex-1"
            >
              Annotate
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}) => {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <p className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {total} images
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-4 py-2 text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

interface ImageDetailModalProps {
  imageId: string;
  isOpen: boolean;
  onClose: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  isAnnotating: boolean;
  isDeleting: boolean;
}

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  imageId,
  isOpen,
  onClose,
  onAnnotate,
  onDelete,
  isAnnotating,
  isDeleting,
}) => {
  const { data: imageDetails, isLoading } = useImageDetails(isOpen ? imageId : null);
  const [showAnnotations, setShowAnnotations] = useState(true);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Image Details" size="xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : imageDetails ? (
        <div className="space-y-6">
          {/* Image with annotations overlay */}
          <div className="relative">
            <img
              src={imageDetails.url}
              alt={imageDetails.species?.englishName || 'Bird image'}
              className="w-full rounded-lg"
            />

            {/* Annotation overlays */}
            {showAnnotations &&
              imageDetails.annotations.map((annotation: ImageAnnotation) =>
                annotation.boundingBox ? (
                  <div
                    key={annotation.id}
                    className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 rounded"
                    style={{
                      left: `${annotation.boundingBox.x * 100}%`,
                      top: `${annotation.boundingBox.y * 100}%`,
                      width: `${annotation.boundingBox.width * 100}%`,
                      height: `${annotation.boundingBox.height * 100}%`,
                    }}
                    title={`${annotation.spanishTerm} (${annotation.englishTerm})`}
                  >
                    <span className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {annotation.spanishTerm}
                    </span>
                  </div>
                ) : null
              )}
          </div>

          {/* Toggle annotations */}
          {imageDetails.annotations.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showAnnotations"
                checked={showAnnotations}
                onChange={(e) => setShowAnnotations(e.target.checked)}
                className="rounded text-blue-600"
              />
              <label htmlFor="showAnnotations" className="text-sm text-gray-600">
                Show annotation overlays
              </label>
            </div>
          )}

          {/* Species info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900">Species</h4>
              <p className="text-gray-600">{imageDetails.species?.englishName || 'Unknown'}</p>
              <p className="text-sm text-gray-500 italic">
                {imageDetails.species?.scientificName}
              </p>
              <p className="text-sm text-gray-500">{imageDetails.species?.spanishName}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Image Info</h4>
              <p className="text-sm text-gray-600">
                {imageDetails.width} x {imageDetails.height}
              </p>
              {/* Quality Score */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">Quality:</span>
                {(() => {
                  const qualityProps = getQualityBadgeProps(imageDetails.qualityScore);
                  return (
                    <Badge variant={qualityProps.variant} size="sm">
                      {qualityProps.label}
                    </Badge>
                  );
                })()}
              </div>
              {imageDetails.photographer && (
                <p className="text-sm text-gray-500 mt-1">
                  Photo by {imageDetails.photographer}
                  {imageDetails.photographerUsername && (
                    <span className="text-gray-400">
                      {' '}
                      (@{imageDetails.photographerUsername})
                    </span>
                  )}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Added {new Date(imageDetails.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Annotations list */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Annotations ({imageDetails.annotations.length})
            </h4>
            {imageDetails.annotations.length === 0 ? (
              <p className="text-gray-500 text-sm">No annotations yet</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3">Spanish</th>
                      <th className="text-left py-2 px-3">English</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imageDetails.annotations.map((annotation: ImageAnnotation) => (
                      <tr key={annotation.id} className="border-b">
                        <td className="py-2 px-3 font-medium">{annotation.spanishTerm}</td>
                        <td className="py-2 px-3">{annotation.englishTerm}</td>
                        <td className="py-2 px-3">
                          <Badge variant="info" size="sm">
                            {annotation.annotationType}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              annotation.status === 'approved'
                                ? 'success'
                                : annotation.status === 'rejected'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {annotation.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {annotation.confidence
                            ? `${(annotation.confidence * 100).toFixed(0)}%`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {imageDetails.annotations.length === 0 && (
              <Button
                variant="primary"
                onClick={onAnnotate}
                isLoading={isAnnotating}
                disabled={isAnnotating}
              >
                Generate Annotations
              </Button>
            )}
            <Button
              variant="danger"
              onClick={onDelete}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              Delete Image
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="danger">Failed to load image details</Alert>
      )}
    </Modal>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ImageGalleryTab: React.FC<ImageGalleryTabProps> = ({
  species,
  onToast,
  selectedImages: externalSelectedImages,
  onSelectionChange,
}) => {
  // State
  const [filters, setFilters] = useState<GalleryFilters>({
    page: 1,
    pageSize: 20,
    annotationStatus: 'all',
    qualityFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [internalSelectedImages, setInternalSelectedImages] = useState<string[]>([]);

  // Use external selection state if provided, otherwise use internal state
  const selectedImages = externalSelectedImages ?? internalSelectedImages;
  const setSelectedImages = onSelectionChange ?? setInternalSelectedImages;

  // Queries & Mutations
  const { data, isLoading, refetch } = useGalleryImages(filters);
  const deleteMutation = useDeleteImage();
  const annotateMutation = useAnnotateImage();

  // Clear selection when filters change
  useEffect(() => {
    setSelectedImages([]);
  }, [filters.speciesId, filters.annotationStatus, filters.qualityFilter, setSelectedImages]);

  // Handlers
  const handleFilterChange = useCallback((newFilters: Partial<GalleryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleViewImage = useCallback((imageId: string) => {
    setSelectedImageId(imageId);
  }, []);

  const handleAnnotateImage = useCallback(
    async (imageId: string) => {
      try {
        const result = await annotateMutation.mutateAsync(imageId);
        onToast('success', `Generated ${result.annotationCount} annotations`);
        refetch();
      } catch {
        onToast('error', 'Failed to generate annotations');
      }
    },
    [annotateMutation, onToast, refetch]
  );

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      try {
        await deleteMutation.mutateAsync(imageId);
        onToast('success', 'Image deleted successfully');
        setSelectedImageId(null);
        setDeleteConfirmId(null);
        refetch();
      } catch {
        onToast('error', 'Failed to delete image');
      }
    },
    [deleteMutation, onToast, refetch]
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Selection handlers
  const handleToggleSelect = useCallback(
    (imageId: string) => {
      setSelectedImages((prev) =>
        prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
      );
    },
    [setSelectedImages]
  );

  const handleSelectAll = useCallback(() => {
    const currentPageImageIds = (data?.images || []).map((img) => img.id);
    setSelectedImages(currentPageImageIds);
  }, [data?.images, setSelectedImages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedImages([]);
  }, [setSelectedImages]);

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    if (selectedImages.length === 0) return;

    try {
      // Delete all selected images sequentially
      for (const imageId of selectedImages) {
        await deleteMutation.mutateAsync(imageId);
      }
      onToast('success', `Deleted ${selectedImages.length} image(s) successfully`);
      setSelectedImages([]);
      refetch();
    } catch {
      onToast('error', 'Failed to delete selected images');
    }
  }, [selectedImages, deleteMutation, onToast, setSelectedImages, refetch]);

  const handleBulkAnnotate = useCallback(async () => {
    if (selectedImages.length === 0) return;

    try {
      let successCount = 0;
      // Annotate all selected images sequentially
      for (const imageId of selectedImages) {
        const result = await annotateMutation.mutateAsync(imageId);
        if (result) successCount++;
      }
      onToast('success', `Generated annotations for ${successCount} image(s)`);
      setSelectedImages([]);
      refetch();
    } catch {
      onToast('error', 'Failed to generate annotations for selected images');
    }
  }, [selectedImages, annotateMutation, onToast, setSelectedImages, refetch]);

  const images = data?.images || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };
  const currentPageImageIds = images.map((img) => img.id);
  const allCurrentPageSelected =
    currentPageImageIds.length > 0 &&
    currentPageImageIds.every((id) => selectedImages.includes(id));

  return (
    <div>
      <Card variant="elevated" padding="lg">
        <CardHeader
          title="Image Gallery"
          subtitle={`Browse and manage ${pagination.total} collected images`}
        />
        <CardBody>
          {/* Action Bar */}
          <div className="flex justify-end mb-4">
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload Images
            </Button>
          </div>

          {/* Filters */}
          <FilterBar species={species} filters={filters} onFilterChange={handleFilterChange} />

          {/* Bulk Action Toolbar */}
          <BulkActionToolbar
            selectedCount={selectedImages.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDelete={handleBulkDelete}
            onAnnotate={handleBulkAnnotate}
            isDeleting={deleteMutation.isPending}
            isAnnotating={annotateMutation.isPending}
            totalCount={currentPageImageIds.length}
            allSelected={allCurrentPageSelected}
          />

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading images...</span>
            </div>
          ) : images.length === 0 ? (
            /* Empty state */
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">No images found</p>
              <p className="text-sm mt-1">
                Try adjusting your filters or collect some images first.
              </p>
            </div>
          ) : (
            /* Image grid */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    onView={() => handleViewImage(image.id)}
                    onAnnotate={() => handleAnnotateImage(image.id)}
                    onDelete={() => setDeleteConfirmId(image.id)}
                    isDeleting={deleteMutation.isPending && deleteConfirmId === image.id}
                    isAnnotating={annotateMutation.isPending}
                    isSelected={selectedImages.includes(image.id)}
                    onToggleSelect={() => handleToggleSelect(image.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Image Detail Modal */}
      {selectedImageId && (
        <ImageDetailModal
          imageId={selectedImageId}
          isOpen={!!selectedImageId}
          onClose={() => setSelectedImageId(null)}
          onAnnotate={() => handleAnnotateImage(selectedImageId)}
          onDelete={() => handleDeleteImage(selectedImageId)}
          isAnnotating={annotateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Image"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this image? This will also delete all associated
            annotations. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDeleteImage(deleteConfirmId)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <ImageUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        species={species}
        onSuccess={() => refetch()}
        onToast={onToast}
      />
    </div>
  );
};

export default ImageGalleryTab;
