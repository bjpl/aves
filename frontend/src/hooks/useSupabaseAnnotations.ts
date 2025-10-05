/**
 * Supabase Annotations Hook
 *
 * CONCEPT: React hook for managing AI-generated annotations from Supabase
 * WHY: Provides real-time access to Claude-generated bird annotations
 * PATTERN: React Query integration with Supabase realtime subscriptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { info, error as logError } from '../utils/logger';

export interface AIAnnotation {
  id: string;
  image_id: string;
  spanish_term: string;
  english_term: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  annotation_type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficulty_level: number;
  pronunciation?: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  created_at: string;
  imageUrl?: string; // Added for admin review UI
}

/**
 * Fetch all annotations for a specific image
 */
export const useImageAnnotations = (imageId: string) => {
  return useQuery({
    queryKey: ['annotations', imageId],
    queryFn: async () => {
      info('Fetching annotations from Supabase', { imageId });

      const { data, error } = await supabase
        .from('ai_annotation_items')
        .select('*')
        .eq('image_id', imageId)
        .order('difficulty_level', { ascending: true });

      if (error) {
        logError('Failed to fetch annotations', new Error(error.message));
        throw new Error(error.message);
      }

      info('Annotations fetched successfully', { imageId, count: data?.length || 0 });
      return data as AIAnnotation[];
    },
    enabled: !!imageId,
  });
};

/**
 * Fetch all pending annotations with image URLs (for admin review)
 */
export const usePendingAnnotations = () => {
  return useQuery({
    queryKey: ['annotations', 'pending'],
    queryFn: async () => {
      info('Fetching pending annotations from Supabase');

      // First, get all pending annotations
      const { data: annotations, error: annotError } = await supabase
        .from('ai_annotation_items')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (annotError) {
        logError('Failed to fetch pending annotations', new Error(annotError.message));
        throw new Error(annotError.message);
      }

      // Get unique image IDs
      const imageIds = [...new Set(annotations?.map(a => a.image_id) || [])];

      // Fetch image URLs for all images
      const { data: images, error: imgError } = await supabase
        .from('images')
        .select('id, url')
        .in('id', imageIds);

      if (imgError) {
        logError('Failed to fetch image URLs', new Error(imgError.message));
        // Continue without images rather than failing completely
      }

      // Create image URL lookup map
      const imageUrlMap = new Map(
        images?.map(img => [img.id, img.url]) || []
      );

      // Enrich annotations with image URLs
      const enrichedAnnotations = annotations?.map(annotation => ({
        ...annotation,
        imageUrl: imageUrlMap.get(annotation.image_id) || '',
      })) || [];

      info('Pending annotations fetched with image URLs', { count: enrichedAnnotations.length });

      return enrichedAnnotations;
    },
  });
};

/**
 * Approve an annotation
 */
export const useApproveAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId, notes }: { annotationId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('ai_annotation_items')
        .update({ status: 'approved' })
        .eq('id', annotationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Record review action
      if (notes) {
        await supabase.from('ai_annotation_reviews').insert({
          annotation_id: annotationId,
          action: 'approved',
          notes,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations'] });
      info('Annotation approved successfully');
    },
  });
};

/**
 * Reject an annotation
 */
export const useRejectAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId, reason }: { annotationId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('ai_annotation_items')
        .update({ status: 'rejected' })
        .eq('id', annotationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Record review action
      await supabase.from('ai_annotation_reviews').insert({
        annotation_id: annotationId,
        action: 'rejected',
        notes: reason,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations'] });
      info('Annotation rejected');
    },
  });
};

/**
 * Edit an annotation
 */
export const useEditAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      annotationId,
      updates,
    }: {
      annotationId: string;
      updates: Partial<AIAnnotation>;
    }) => {
      const { data, error } = await supabase
        .from('ai_annotation_items')
        .update({ ...updates, status: 'edited' })
        .eq('id', annotationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations'] });
      info('Annotation edited successfully');
    },
  });
};

/**
 * Subscribe to real-time annotation updates
 */
export const useAnnotationSubscription = (imageId: string, callback: (payload: any) => void) => {
  useQuery({
    queryKey: ['annotations-subscription', imageId],
    queryFn: () => {
      const channel = supabase
        .channel(`annotations-${imageId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_annotation_items',
            filter: `image_id=eq.${imageId}`,
          },
          (payload) => {
            info('Real-time annotation update', { imageId, event: payload.eventType });
            callback(payload);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    },
    enabled: !!imageId,
  });
};

export default {
  useImageAnnotations,
  usePendingAnnotations,
  useApproveAnnotation,
  useRejectAnnotation,
  useEditAnnotation,
  useAnnotationSubscription,
};
