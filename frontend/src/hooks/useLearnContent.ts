/**
 * useLearnContent Hook
 *
 * Fetches and manages learning content from the backend.
 * Integrates with AI-published annotations for the Learn feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiAdapter';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';

export interface LearningContent {
  id: string;
  imageId: string;
  imageUrl: string;
  spanishTerm: string;
  englishTerm: string;
  pronunciation?: string;
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  difficultyLevel: number;
  speciesId?: string;
  speciesName?: string;
  moduleId?: string;
  moduleName?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  titleSpanish: string;
  description?: string;
  difficultyLevel: number;
  contentCount: number;
  avgDifficulty: number;
  isActive: boolean;
}

export interface ContentFilters {
  difficulty?: number;
  type?: string;
  speciesId?: string;
  moduleId?: string;
  limit?: number;
}

// Query key factory for learn content
export const learnQueryKeys = {
  all: ['learn'] as const,
  content: (filters?: ContentFilters) => [...learnQueryKeys.all, 'content', filters] as const,
  modules: () => [...learnQueryKeys.all, 'modules'] as const,
  stats: () => [...learnQueryKeys.all, 'stats'] as const,
  bySpecies: (speciesId: string) => [...learnQueryKeys.all, 'species', speciesId] as const,
  byModule: (moduleId: string) => [...learnQueryKeys.all, 'module', moduleId] as const,
};

/**
 * Fetch learning content from the API
 */
const fetchLearnContent = async (filters?: ContentFilters): Promise<LearningContent[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', String(filters.difficulty));
    if (filters?.type) params.append('type', filters.type);
    if (filters?.speciesId) params.append('speciesId', filters.speciesId);
    if (filters?.moduleId) params.append('moduleId', filters.moduleId);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/content/learn?${params}`);
    if (!response.ok) throw new Error('Failed to fetch learning content');

    const data = await response.json();
    return data.data || [];
  } catch (err) {
    logError('Error fetching learn content', err instanceof Error ? err : new Error(String(err)));
    return [];
  }
};

/**
 * Fetch learning modules
 */
const fetchModules = async (): Promise<LearningModule[]> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/content/modules`);
    if (!response.ok) throw new Error('Failed to fetch modules');

    const data = await response.json();
    return data.data || [];
  } catch (err) {
    logError('Error fetching modules', err instanceof Error ? err : new Error(String(err)));
    return [];
  }
};

/**
 * Hook: Fetch all learning content with optional filters
 */
export const useLearnContent = (filters?: ContentFilters) => {
  return useQuery({
    queryKey: learnQueryKeys.content(filters),
    queryFn: () => fetchLearnContent(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
};

/**
 * Hook: Fetch learning modules
 */
export const useLearningModules = () => {
  return useQuery({
    queryKey: learnQueryKeys.modules(),
    queryFn: fetchModules,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });
};

/**
 * Hook: Fetch content for a specific species
 */
export const useSpeciesLearnContent = (speciesId: string) => {
  return useQuery({
    queryKey: learnQueryKeys.bySpecies(speciesId),
    queryFn: () => fetchLearnContent({ speciesId, limit: 100 }),
    enabled: !!speciesId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook: Fetch content for a specific module
 */
export const useModuleContent = (moduleId: string) => {
  return useQuery({
    queryKey: learnQueryKeys.byModule(moduleId),
    queryFn: () => fetchLearnContent({ moduleId, limit: 100 }),
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook: Group content by image for lesson display
 */
export const useLearnContentByImage = (filters?: ContentFilters) => {
  const { data: content = [], ...rest } = useLearnContent(filters);

  const contentByImage = content.reduce((acc, item) => {
    const key = item.imageUrl;
    if (!acc[key]) {
      acc[key] = {
        imageUrl: item.imageUrl,
        speciesName: item.speciesName,
        annotations: []
      };
    }
    acc[key].annotations.push(item);
    return acc;
  }, {} as Record<string, { imageUrl: string; speciesName?: string; annotations: LearningContent[] }>);

  return {
    ...rest,
    data: Object.values(contentByImage)
  };
};

/**
 * Hook: Get content statistics
 */
export const useContentStats = () => {
  return useQuery({
    queryKey: learnQueryKeys.stats(),
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/content/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        return data.data;
      } catch {
        return { totalPublished: 0, byDifficulty: {}, byType: {}, byModule: {} };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook: Prefetch content for performance
 */
export const usePrefetchLearnContent = () => {
  const queryClient = useQueryClient();

  return {
    prefetchContent: (filters?: ContentFilters) => {
      queryClient.prefetchQuery({
        queryKey: learnQueryKeys.content(filters),
        queryFn: () => fetchLearnContent(filters),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchModules: () => {
      queryClient.prefetchQuery({
        queryKey: learnQueryKeys.modules(),
        queryFn: fetchModules,
        staleTime: 10 * 60 * 1000,
      });
    },
  };
};
