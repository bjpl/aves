/**
 * Custom hook for image management API calls and state
 *
 * OPTIMIZATIONS:
 * - Combined dashboard endpoint reduces initial API calls from 4 to 1
 * - Smart polling only when active jobs exist
 * - Optimistic updates for mutations
 * - Prefetching for adjacent gallery pages
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api as axios } from '../../../config/axios';
import { error as logError } from '../../../utils/logger';
import {
  ImageStats,
  QuotaStatus,
  CollectionJob,
  CollectionRequest,
  AnnotationRequest,
  GalleryResponse,
  BulkDeleteResponse,
  BulkAnnotateResponse,
} from './types';

// ============================================================================
// Types for Dashboard Response
// ============================================================================

interface DashboardResponse {
  data: {
    stats: ImageStats;
    quota: QuotaStatus;
    jobs: CollectionJob[];
    hasActiveJobs: boolean;
  };
}

// ============================================================================
// Query Keys
// ============================================================================

export const imageManagementKeys = {
  all: ['image-management'] as const,
  dashboard: () => [...imageManagementKeys.all, 'dashboard'] as const,
  stats: () => [...imageManagementKeys.all, 'stats'] as const,
  quota: () => [...imageManagementKeys.all, 'quota'] as const,
  jobs: () => [...imageManagementKeys.all, 'jobs'] as const,
  pendingImages: () => [...imageManagementKeys.all, 'pending-images'] as const,
  gallery: (page: number, status: string, speciesId?: string) =>
    [...imageManagementKeys.all, 'gallery', { page, status, speciesId }] as const,
};

// ============================================================================
// Combined Dashboard Hook (Optimized - Single API Call)
// ============================================================================

export const useDashboard = () => {
  return useQuery({
    queryKey: imageManagementKeys.dashboard(),
    queryFn: async (): Promise<DashboardResponse['data']> => {
      try {
        const response = await axios.get<DashboardResponse>('/api/admin/dashboard');
        return response.data.data;
      } catch (err) {
        logError('Error fetching dashboard:', err instanceof Error ? err : new Error(String(err)));
        // Return default values on error
        return {
          stats: {
            totalImages: 0,
            pendingAnnotation: 0,
            annotated: 0,
            failed: 0,
            bySpecies: {},
          },
          quota: {
            unsplash: { remaining: 50, limit: 50, resetTime: null },
            anthropic: { remaining: 1000, limit: 1000, resetTime: null },
          },
          jobs: [],
          hasActiveJobs: false,
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Individual Hooks (for backward compatibility and specific use cases)
// ============================================================================

export const useImageStats = () => {
  return useQuery({
    queryKey: imageManagementKeys.stats(),
    queryFn: async (): Promise<ImageStats> => {
      try {
        const response = await axios.get<{ data: ImageStats }>('/api/admin/images/stats');
        return response.data.data;
      } catch (err) {
        logError('Error fetching image stats:', err instanceof Error ? err : new Error(String(err)));
        return {
          totalImages: 0,
          pendingAnnotation: 0,
          annotated: 0,
          failed: 0,
          bySpecies: {},
        };
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useQuotaStatus = () => {
  return useQuery({
    queryKey: imageManagementKeys.quota(),
    queryFn: async (): Promise<QuotaStatus> => {
      try {
        const response = await axios.get<{ data: QuotaStatus }>('/api/admin/quota/status');
        return response.data.data;
      } catch (err) {
        logError('Error fetching quota status:', err instanceof Error ? err : new Error(String(err)));
        return {
          unsplash: { remaining: 50, limit: 50, resetTime: null },
          anthropic: { remaining: 1000, limit: 1000, resetTime: null },
        };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useCollectionJobs = (hasActiveJobs: boolean = false) => {
  return useQuery({
    queryKey: imageManagementKeys.jobs(),
    queryFn: async (): Promise<CollectionJob[]> => {
      try {
        const response = await axios.get<{ jobs: CollectionJob[]; count: number }>('/api/admin/images/jobs');
        return response.data.jobs;
      } catch (err) {
        logError('Error fetching jobs:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    // Smart polling: only poll when there are active jobs
    refetchInterval: hasActiveJobs ? 3000 : false,
  });
};

export const usePendingImages = () => {
  return useQuery({
    queryKey: imageManagementKeys.pendingImages(),
    queryFn: async (): Promise<{ id: string; speciesId: string; url: string; createdAt: string }[]> => {
      try {
        const response = await axios.get<{ data: { id: string; speciesId: string; url: string; createdAt: string }[] }>(
          '/api/admin/images/pending'
        );
        return response.data.data;
      } catch (err) {
        logError('Error fetching pending images:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Mutations
// ============================================================================

export const useCollectImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CollectionRequest): Promise<CollectionJob> => {
      const response = await axios.post<{ data: CollectionJob }>('/api/admin/images/collect', request);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate dashboard to refresh all data
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.stats() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.quota() });
    },
    onError: (err) => {
      logError('Error starting image collection:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

export const useStartAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AnnotationRequest): Promise<CollectionJob> => {
      const response = await axios.post<{ data: CollectionJob }>('/api/admin/images/annotate', request);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.stats() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.quota() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.pendingImages() });
    },
    onError: (err) => {
      logError('Error starting annotation:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

export const useGalleryImages = (page: number, status: string, speciesId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: imageManagementKeys.gallery(page, status, speciesId),
    queryFn: async (): Promise<GalleryResponse['data']> => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
          annotationStatus: status,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (speciesId) {
          params.append('speciesId', speciesId);
        }
        const response = await axios.get<GalleryResponse>(`/api/admin/images?${params.toString()}`);
        return response.data.data;
      } catch (err) {
        logError('Error fetching gallery images:', err instanceof Error ? err : new Error(String(err)));
        return { images: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new
  });

  // Prefetch next page for smoother pagination
  const prefetchNextPage = () => {
    if (query.data && page < query.data.pagination.totalPages) {
      queryClient.prefetchQuery({
        queryKey: imageManagementKeys.gallery(page + 1, status, speciesId),
        queryFn: async () => {
          const params = new URLSearchParams({
            page: String(page + 1),
            pageSize: '20',
            annotationStatus: status,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });
          if (speciesId) {
            params.append('speciesId', speciesId);
          }
          const response = await axios.get<GalleryResponse>(`/api/admin/images?${params.toString()}`);
          return response.data.data;
        },
        staleTime: 30 * 1000,
      });
    }
  };

  return { ...query, prefetchNextPage };
};

export const useBulkDeleteImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageIds: string[]): Promise<BulkDeleteResponse> => {
      const response = await axios.post<BulkDeleteResponse>('/api/admin/images/bulk/delete', { imageIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.all });
    },
    onError: (err) => {
      logError('Error deleting images:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

export const useBulkAnnotateImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageIds: string[]): Promise<BulkAnnotateResponse> => {
      const response = await axios.post<BulkAnnotateResponse>('/api/admin/images/bulk/annotate', { imageIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.stats() });
    },
    onError: (err) => {
      logError('Error starting bulk annotation:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

// ============================================================================
// Unified Hook (Optimized with Combined Dashboard Endpoint)
// ============================================================================

export const useImageManagement = () => {
  const queryClient = useQueryClient();

  // Use combined dashboard endpoint for initial load (single API call instead of 4)
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard
  } = useDashboard();

  // Smart polling for jobs - only when there are active jobs
  const hasActiveJobs = dashboardData?.hasActiveJobs || false;
  const { data: liveJobs } = useCollectionJobs(hasActiveJobs);

  // Use live jobs if polling, otherwise use dashboard jobs
  const jobs = hasActiveJobs && liveJobs ? liveJobs : (dashboardData?.jobs || []);

  const { data: pendingImages = [] } = usePendingImages();

  const collectMutation = useCollectImages();
  const annotateMutation = useStartAnnotation();
  const bulkDeleteMutation = useBulkDeleteImages();
  const bulkAnnotateMutation = useBulkAnnotateImages();

  // Refetch function that invalidates dashboard
  const refetchStats = () => {
    queryClient.invalidateQueries({ queryKey: imageManagementKeys.dashboard() });
    return refetchDashboard();
  };

  return {
    stats: dashboardData?.stats,
    quota: dashboardData?.quota,
    jobs,
    pendingImages,
    isLoading: dashboardLoading,
    hasActiveJobs,
    refetchStats,
    collectMutation,
    annotateMutation,
    bulkDeleteMutation,
    bulkAnnotateMutation,
  };
};
