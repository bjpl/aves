/**
 * useImageGallery Hook
 *
 * CONCEPT: React Query hook for fetching and managing gallery images
 * WHY: Centralized data fetching with caching, pagination, and mutation support
 * PATTERN: Custom hook with React Query for data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api as axios } from '../config/axios';
import { error as logError } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface GalleryImage {
  id: string;
  url: string;
  speciesId: string;
  speciesName: string;
  annotationCount: number;
  qualityScore: number | null;
  createdAt: string;
  width: number | null;
  height: number | null;
}

export interface ImageDetails extends GalleryImage {
  unsplashId: string | null;
  description: string | null;
  photographer: string | null;
  photographerUsername: string | null;
  species: {
    englishName: string | null;
    spanishName: string | null;
    scientificName: string | null;
  };
  annotations: ImageAnnotation[];
}

export interface ImageAnnotation {
  id: string;
  jobId: string;
  spanishTerm: string;
  englishTerm: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  annotationType: string;
  difficultyLevel: string;
  pronunciation: string | null;
  confidence: number | null;
  status: string;
  createdAt: string;
}

export interface GalleryPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GalleryFilters {
  page?: number;
  pageSize?: number;
  speciesId?: string;
  annotationStatus?: 'all' | 'annotated' | 'unannotated';
  qualityFilter?: 'all' | 'high' | 'medium' | 'low' | 'unscored';
  sortBy?: 'createdAt' | 'speciesName' | 'annotationCount' | 'qualityScore';
  sortOrder?: 'asc' | 'desc';
}

interface GalleryResponse {
  data: {
    images: GalleryImage[];
    pagination: GalleryPagination;
  };
}

interface ImageDetailsResponse {
  data: ImageDetails;
}

// ============================================================================
// Query Keys
// ============================================================================

export const galleryKeys = {
  all: ['gallery'] as const,
  list: (filters: GalleryFilters) => [...galleryKeys.all, 'list', filters] as const,
  detail: (id: string) => [...galleryKeys.all, 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated gallery images with filters
 */
export const useGalleryImages = (filters: GalleryFilters = {}) => {
  const {
    page = 1,
    pageSize = 20,
    speciesId,
    annotationStatus = 'all',
    qualityFilter = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  return useQuery({
    queryKey: galleryKeys.list(filters),
    queryFn: async (): Promise<{ images: GalleryImage[]; pagination: GalleryPagination }> => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          annotationStatus,
          qualityFilter,
          sortBy,
          sortOrder,
        });

        if (speciesId) {
          params.append('speciesId', speciesId);
        }

        const response = await axios.get<GalleryResponse>(`/api/admin/images?${params}`);
        return response.data.data;
      } catch (err) {
        logError('Error fetching gallery images:', err instanceof Error ? err : new Error(String(err)));
        return {
          images: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch single image with full details and annotations
 */
export const useImageDetails = (imageId: string | null) => {
  return useQuery({
    queryKey: galleryKeys.detail(imageId || ''),
    queryFn: async (): Promise<ImageDetails | null> => {
      if (!imageId) return null;

      try {
        const response = await axios.get<ImageDetailsResponse>(`/api/admin/images/${imageId}`);
        return response.data.data;
      } catch (err) {
        logError('Error fetching image details:', err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    enabled: !!imageId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Delete an image
 */
export const useDeleteImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string): Promise<{ message: string; imageId: string }> => {
      const response = await axios.delete<{ message: string; imageId: string }>(
        `/api/admin/images/${imageId}`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate gallery list queries to refetch
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
    onError: (err) => {
      logError('Error deleting image:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

/**
 * Trigger annotation for a single image
 */
export const useAnnotateImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string): Promise<{
      message: string;
      imageId: string;
      annotationCount: number;
      jobId: string;
    }> => {
      // Validate imageId format before making request
      if (!imageId || typeof imageId !== 'string') {
        throw new Error('Invalid image ID provided');
      }

      // UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(imageId)) {
        throw new Error('Invalid image ID format');
      }

      const response = await axios.post<{
        message: string;
        imageId: string;
        annotationCount: number;
        jobId: string;
      }>(`/api/admin/images/${imageId}/annotate`);
      return response.data;
    },
    onSuccess: (_data, imageId) => {
      // Invalidate specific image and list queries
      queryClient.invalidateQueries({ queryKey: galleryKeys.detail(imageId) });
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
    onError: (err: any) => {
      // Extract meaningful error message from API response
      const errorMessage = err?.response?.data?.error
        || err?.response?.data?.message
        || err?.message
        || 'Failed to annotate image';
      logError('Error annotating image:', new Error(errorMessage));
    },
  });
};
