// CONCEPT: React Query hooks for AI-generated annotation review workflow
// WHY: Manage AI annotation review, approval, rejection, and batch operations
// PATTERN: useQuery and useMutation hooks with optimistic updates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Annotation } from '../types';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';
import { api as axios } from '../config/axios';

/**
 * Status of AI-generated annotations
 */
export type AIAnnotationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Extended annotation with AI metadata
 */
export interface AIAnnotation extends Annotation {
  status: AIAnnotationStatus;
  confidenceScore?: number;
  aiGenerated: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

/**
 * Filters for querying AI annotations
 */
export interface AIAnnotationFilters {
  status?: AIAnnotationStatus;
  imageId?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

/**
 * Batch operation request
 */
export interface BatchOperationRequest {
  annotationIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Query keys for AI annotations
 */
export const aiAnnotationKeys = {
  all: ['ai-annotations'] as const,
  lists: () => [...aiAnnotationKeys.all, 'list'] as const,
  list: (filters?: AIAnnotationFilters) => [...aiAnnotationKeys.lists(), filters] as const,
  pending: () => [...aiAnnotationKeys.all, 'pending'] as const,
  stats: () => [...aiAnnotationKeys.all, 'stats'] as const,
};

/**
 * Hook: Fetch AI annotations with optional filters
 */
export const useAIAnnotations = (filters?: AIAnnotationFilters) => {
  return useQuery({
    queryKey: aiAnnotationKeys.list(filters),
    queryFn: async (): Promise<AIAnnotation[]> => {
      try {
        const response = await axios.get<{ data: AIAnnotation[] }>('/api/ai/annotations', {
          params: filters,
        });
        return response.data.data;
      } catch (err) {
        logError('Error fetching AI annotations:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - annotations change during review
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
};

/**
 * Hook: Fetch pending AI annotations for review
 */
export const useAIAnnotationsPending = () => {
  return useQuery({
    queryKey: aiAnnotationKeys.pending(),
    queryFn: async (): Promise<AIAnnotation[]> => {
      try {
        const response = await axios.get<{ annotations: AIAnnotation[] }>('/api/ai/annotations/pending');
        return response.data.annotations;
      } catch (err) {
        logError('Error fetching pending AI annotations:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - pending annotations change frequently
    gcTime: 3 * 60 * 1000,
    placeholderData: [],
  });
};

/**
 * Hook: Get AI annotation statistics
 */
export const useAIAnnotationStats = () => {
  return useQuery({
    queryKey: aiAnnotationKeys.stats(),
    queryFn: async () => {
      try {
        const response = await axios.get<{
          data: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
            avgConfidence: number;
          };
        }>('/api/ai/annotations/stats');

        return response.data.data;
      } catch (err) {
        console.error('❌ STATS QUERY: Error fetching stats:', err);
        logError('Error fetching AI annotation stats:', err instanceof Error ? err : new Error(String(err)));
        return {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          avgConfidence: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook: Approve an AI annotation
 */
export const useApproveAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotationId: string): Promise<AIAnnotation> => {
      try {
        const response = await axios.post<{ data: AIAnnotation }>(
          `/api/ai/annotations/${annotationId}/approve`
        );

        return response.data.data;
      } catch (error: any) {
        console.error('❌ APPROVE MUTATION: Request failed!', {
          error,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    onMutate: async (annotationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

      // Optimistically update the cache
      const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

      if (previousData) {
        const filtered = previousData.filter((a) => a.id !== annotationId);
        queryClient.setQueryData<AIAnnotation[]>(
          aiAnnotationKeys.pending(),
          filtered
        );
      }

      return { previousData };
    },
    onSuccess: async (data, annotationId) => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.all
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
    onError: (err, annotationId, context) => {
      console.error('❌ APPROVE MUTATION: onError called!', {
        err,
        annotationId,
        hasContext: !!context,
        hasPreviousData: !!context?.previousData
      });

      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
      }

      logError('Error approving annotation', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

/**
 * Hook: Reject an AI annotation
 */
export const useRejectAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      annotationId,
      category,
      notes,
      reason,
    }: {
      annotationId: string;
      category?: string;
      notes?: string;
      reason?: string;
    }): Promise<AIAnnotation> => {
      const response = await axios.post<{ data: AIAnnotation }>(
        `/api/ai/annotations/${annotationId}/reject`,
        { category, notes, reason }
      );
      return response.data.data;
    },
    onMutate: async ({ annotationId }) => {
      await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

      const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

      if (previousData) {
        queryClient.setQueryData<AIAnnotation[]>(
          aiAnnotationKeys.pending(),
          previousData.filter((a) => a.id !== annotationId)
        );
      }

      return { previousData };
    },
    onSuccess: async () => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
      }
      logError('Error rejecting annotation', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

/**
 * Hook: Update AI annotation WITHOUT approving (keeps it in review queue)
 *
 * PATTERN: Optimistic update with rollback
 * WHY: Provide instant UI feedback when editing bounding boxes or annotation data
 * HOW: Update cache immediately, rollback on error, refetch on success
 */
export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      annotationId,
      updates,
    }: {
      annotationId: string;
      updates: Partial<Annotation>;
    }): Promise<{ message: string; annotationId: string }> => {
      const response = await axios.patch<{ message: string; annotationId: string }>(
        `/api/ai/annotations/${annotationId}`,
        updates
      );
      return response.data;
    },
    // OPTIMISTIC UPDATE: Apply changes to UI immediately
    onMutate: async ({ annotationId, updates }) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

      // Snapshot previous state for rollback
      const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

      // Optimistically update the annotation in cache
      if (previousData) {
        queryClient.setQueryData<AIAnnotation[]>(
          aiAnnotationKeys.pending(),
          previousData.map((a) =>
            a.id === annotationId ? { ...a, ...updates } : a
          )
        );
      }

      return { previousData };
    },
    // ROLLBACK: Restore previous state if API fails
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
      }
      logError('Error updating annotation', error instanceof Error ? error : new Error(String(error)));
    },
    // REFETCH: Get fresh data from server on success
    onSuccess: async () => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
  });
};

/**
 * Hook: Edit and approve an AI annotation (moves to production)
 */
export const useEditAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      annotationId,
      updates,
    }: {
      annotationId: string;
      updates: Partial<Annotation>;
    }): Promise<AIAnnotation> => {
      const response = await axios.post<{ data: AIAnnotation }>(
        `/api/ai/annotations/${annotationId}/edit`,
        updates
      );
      return response.data.data;
    },
    onSuccess: async () => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.all
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
    onError: (error) => {
      logError('Error editing annotation', error instanceof Error ? error : new Error(String(error)));
    },
  });
};

/**
 * Hook: Batch approve annotations
 */
export const useBatchApprove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotationIds: string[]): Promise<{ approved: number }> => {
      const response = await axios.post<{ data: { approved: number } }>(
        '/api/ai/annotations/batch/approve',
        { annotationIds }
      );
      return response.data.data;
    },
    onMutate: async (annotationIds) => {
      await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

      const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

      if (previousData) {
        queryClient.setQueryData<AIAnnotation[]>(
          aiAnnotationKeys.pending(),
          previousData.filter((a) => !annotationIds.includes(a.id))
        );
      }

      return { previousData };
    },
    onSuccess: async () => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.all
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
      }
      logError('Error batch approving annotations', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

/**
 * Hook: Batch reject annotations
 */
export const useBatchReject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      annotationIds,
      reason,
    }: {
      annotationIds: string[];
      reason?: string;
    }): Promise<{ rejected: number }> => {
      const response = await axios.post<{ data: { rejected: number } }>(
        '/api/ai/annotations/batch/reject',
        { annotationIds, reason }
      );
      return response.data.data;
    },
    onMutate: async ({ annotationIds }) => {
      await queryClient.cancelQueries({ queryKey: aiAnnotationKeys.all });

      const previousData = queryClient.getQueryData<AIAnnotation[]>(aiAnnotationKeys.pending());

      if (previousData) {
        queryClient.setQueryData<AIAnnotation[]>(
          aiAnnotationKeys.pending(),
          previousData.filter((a) => !annotationIds.includes(a.id))
        );
      }

      return { previousData };
    },
    onSuccess: async () => {
      // Invalidate and FORCE immediate refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.all,
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: aiAnnotationKeys.stats(),
          refetchType: 'active'
        })
      ]);

      // Force immediate refetch of pending annotations
      await queryClient.refetchQueries({
        queryKey: aiAnnotationKeys.pending(),
        type: 'active'
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aiAnnotationKeys.pending(), context.previousData);
      }
      logError('Error batch rejecting annotations', err instanceof Error ? err : new Error(String(err)));
    },
  });
};
