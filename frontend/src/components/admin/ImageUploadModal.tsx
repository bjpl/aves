/**
 * ImageUploadModal Component
 *
 * CONCEPT: Modal for uploading local images with drag-drop support
 * WHY: Provides an intuitive interface for batch uploading bird images
 * PATTERN: Drag & drop zone with file preview, species selection, and progress tracking
 */

import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ProgressBar } from '../ui/ProgressBar';
import { Species } from '../../types';
import { api as axios } from '../../config/axios';
import { error as logError } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  species: Species[];
  onSuccess: () => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

interface UploadResponse {
  message: string;
  uploaded: Array<{
    id: string;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    originalName: string;
  }>;
  failed?: Array<{ filename: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// ============================================================================
// Upload Hook
// ============================================================================

const useUploadImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      speciesId,
      onProgress,
    }: {
      files: File[];
      speciesId: string;
      onProgress?: (progress: number) => void;
    }): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('speciesId', speciesId);
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post<UploadResponse>('/api/admin/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        },
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate gallery queries to show new images
      queryClient.invalidateQueries({ queryKey: ['image-management'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
    onError: (err) => {
      logError('Error uploading images:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

// ============================================================================
// Sub-components
// ============================================================================

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
      );

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <div className="space-y-3">
        <svg
          className={`w-12 h-12 mx-auto ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse files</p>
        </div>

        <p className="text-xs text-gray-400">
          Supports: JPEG, PNG, WebP (max 10MB each, up to 20 files)
        </p>
      </div>
    </div>
  );
};

interface FilePreviewGridProps {
  files: FileWithPreview[];
  onRemove: (id: string) => void;
  disabled: boolean;
}

const FilePreviewGrid: React.FC<FilePreviewGridProps> = ({ files, onRemove, disabled }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">
          Selected Files ({files.length})
        </h4>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
        {files.map((item) => (
          <div
            key={item.id}
            className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200"
          >
            <img
              src={item.preview}
              alt={item.file.name}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-1 py-0.5">
              <p className="text-xs text-white truncate">{item.file.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SpeciesSelectProps {
  species: Species[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const SpeciesSelect: React.FC<SpeciesSelectProps> = ({ species, value, onChange, disabled }) => {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Species <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Select a species...</option>
        {species.map((sp) => (
          <option key={sp.id} value={sp.id}>
            {sp.englishName} ({sp.scientificName})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        All uploaded images will be associated with this species
      </p>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  species,
  onSuccess,
  onToast,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useUploadImages();

  // Handle file selection
  const handleFilesSelected = useCallback((files: File[]) => {
    const newFiles: FileWithPreview[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    setSelectedFiles((prev) => {
      // Limit to 20 files total
      const combined = [...prev, ...newFiles].slice(0, 20);
      return combined;
    });
    setUploadError(null);
  }, []);

  // Handle file removal
  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one image');
      return;
    }

    if (!selectedSpeciesId) {
      setUploadError('Please select a species');
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    try {
      const result = await uploadMutation.mutateAsync({
        files: selectedFiles.map((f) => f.file),
        speciesId: selectedSpeciesId,
        onProgress: setUploadProgress,
      });

      if (result.summary.successful > 0) {
        onToast(
          'success',
          `Successfully uploaded ${result.summary.successful} image${result.summary.successful !== 1 ? 's' : ''}`
        );
        onSuccess();
        handleClose();
      }

      if (result.failed && result.failed.length > 0) {
        onToast(
          'error',
          `${result.failed.length} file${result.failed.length !== 1 ? 's' : ''} failed to upload`
        );
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    }
  };

  // Handle close
  const handleClose = () => {
    // Cleanup previews
    selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview));
    setSelectedFiles([]);
    setSelectedSpeciesId('');
    setUploadProgress(0);
    setUploadError(null);
    onClose();
  };

  const isUploading = uploadMutation.isPending;
  const canUpload = selectedFiles.length > 0 && selectedSpeciesId && !isUploading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Images"
      size="lg"
      closeOnOverlayClick={!isUploading}
      closeOnEscape={!isUploading}
    >
      <div className="space-y-4">
        {uploadError && (
          <Alert variant="danger" onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}

        {/* Drop Zone */}
        <DropZone onFilesSelected={handleFilesSelected} disabled={isUploading} />

        {/* File Previews */}
        <FilePreviewGrid
          files={selectedFiles}
          onRemove={handleRemoveFile}
          disabled={isUploading}
        />

        {/* Species Selection */}
        <SpeciesSelect
          species={species}
          value={selectedSpeciesId}
          onChange={setSelectedSpeciesId}
          disabled={isUploading}
        />

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <ProgressBar
              value={uploadProgress}
              max={100}
              variant="gradient"
              color="primary"
              showLabel
              label="Uploading..."
              animated
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!canUpload}
            isLoading={isUploading}
          >
            Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageUploadModal;
