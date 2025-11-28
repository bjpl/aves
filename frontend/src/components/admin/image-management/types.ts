/**
 * Type definitions for Image Management
 */

export interface ImageStats {
  totalImages: number;
  pendingAnnotation: number;
  annotated: number;
  failed: number;
  bySpecies: Record<string, number>;
}

export interface QuotaStatus {
  unsplash: {
    remaining: number;
    limit: number;
    resetTime: string | null;
  };
  anthropic: {
    remaining: number;
    limit: number;
    resetTime: string | null;
  };
}

export interface CollectionJob {
  id: string;
  type: 'collection' | 'annotation';
  status: 'pending' | 'running' | 'completed' | 'failed';
  speciesIds: string[];
  imagesPerSpecies?: number;
  progress: number;
  total: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  results?: {
    collected?: number;
    annotated?: number;
    failed?: number;
  };
}

export interface CollectionRequest {
  speciesIds: string[];
  imagesPerSpecies: number;
}

export interface AnnotationRequest {
  imageIds?: string[];
  all?: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  description?: string;
  width?: number;
  height?: number;
  speciesId: string;
  speciesName: string;
  scientificName?: string;
  createdAt: string;
  hasAnnotations: boolean;
  annotationCount: number;
}

export interface GalleryResponse {
  data: {
    images: GalleryImage[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

export interface BulkDeleteResponse {
  message: string;
  deleted: number;
  failed: number;
  errors?: Array<{ imageId: string; error: string }>;
}

export interface BulkAnnotateResponse {
  jobId: string;
  status: string;
  message: string;
  totalImages: number;
}

export type TabType = 'collection' | 'annotation' | 'gallery' | 'statistics' | 'history';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
