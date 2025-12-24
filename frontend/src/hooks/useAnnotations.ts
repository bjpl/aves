// CONCEPT: React Query hooks for annotation data management with intelligent caching
// WHY: Leverages React Query for automatic caching and derived data queries
// PATTERN: useQuery hooks with filtered/computed data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Annotation } from '../types';
import { api } from '../services/apiAdapter';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';

// Hook: Fetch all annotations with optional image filter
export const useAnnotations = (imageId?: string) => {
  return useQuery({
    queryKey: queryKeys.annotations.list(imageId),
    queryFn: async () => {
      try {
        return await api.annotations.list(imageId);
      } catch (err) {
        logError('Error fetching annotations:', err instanceof Error ? err : new Error(String(err)));
        return []; // Return empty array on error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - annotations are semi-static
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
};

// Hook: Get annotations filtered by term
export const useAnnotationsByTerm = (term: string) => {
  const { data: allAnnotations = [] } = useAnnotations();

  return useQuery({
    queryKey: queryKeys.annotations.byTerm(term),
    queryFn: () => {
      return allAnnotations.filter(a =>
        a.spanishTerm?.toLowerCase().includes(term.toLowerCase()) ||
        a.englishTerm?.toLowerCase().includes(term.toLowerCase())
      );
    },
    enabled: term.length > 0 && allAnnotations.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook: Get annotations filtered by difficulty level
export const useAnnotationsByDifficulty = (level: number) => {
  const { data: allAnnotations = [] } = useAnnotations();

  return useQuery({
    queryKey: queryKeys.annotations.byDifficulty(level),
    queryFn: () => {
      return allAnnotations.filter(a => a.difficultyLevel === level);
    },
    enabled: allAnnotations.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook: Get unique terms for exercises
export const useUniqueTerms = () => {
  const { data: annotations = [] } = useAnnotations();

  return useQuery({
    queryKey: queryKeys.annotations.unique(),
    queryFn: () => {
      const terms = new Map<string, Annotation>();
      annotations.forEach(a => {
        if (a.spanishTerm && !terms.has(a.spanishTerm)) {
          terms.set(a.spanishTerm, a);
        }
      });
      return Array.from(terms.values());
    },
    enabled: annotations.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation: Create/Update annotation (for admin functionality)
export const useAnnotationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotation: Partial<Annotation>) => {
      // Implement create/update logic when backend is ready
      return annotation;
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant annotation queries
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });

      // Optimistically update the cache if we have an imageId
      if (variables.imageId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.list(variables.imageId)
        });
      }
    },
    onError: (error) => {
      logError('Error mutating annotation', error instanceof Error ? error : new Error(String(error)));
    },
  });
};

// Hook: Prefetch annotations for performance
export const usePrefetchAnnotations = () => {
  const queryClient = useQueryClient();

  return (imageId?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.annotations.list(imageId),
      queryFn: () => api.annotations.list(imageId),
      staleTime: 5 * 60 * 1000,
    });
  };
};