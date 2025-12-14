// CONCEPT: React Query hooks for species data management with intelligent caching
// WHY: Leverages React Query for automatic caching, background refetching, and optimistic updates
// PATTERN: useQuery/useMutation hooks with cache key factories

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Species } from '../types';
import { api } from '../services/apiAdapter';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';

// Hook: Fetch all species with optional filters
export const useSpecies = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.species.list(filters),
    queryFn: async () => {
      try {
        return await api.species.list(filters);
      } catch (err) {
        logError('Error fetching species', err instanceof Error ? err : new Error(String(err)));
        return []; // Return empty array on error
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - species data is relatively static
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: [], // Show empty array while loading
  });
};

// Hook: Fetch single species by ID
export const useSpeciesById = (id: string) => {
  return useQuery({
    queryKey: queryKeys.species.detail(id),
    queryFn: async () => {
      try {
        return await api.species.get(id);
      } catch (err) {
        logError('Error fetching species details', err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    enabled: !!id, // Only fetch if ID is provided
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// Hook: Search species (client-side filtering for now)
export const useSpeciesSearch = (query: string, enabled = true) => {
  const { data: allSpecies = [] } = useSpecies();

  return useQuery({
    queryKey: queryKeys.species.search(query),
    queryFn: () => {
      const searchTerm = query.toLowerCase();
      return allSpecies.filter(s =>
        s.spanishName?.toLowerCase().includes(searchTerm) ||
        s.englishName?.toLowerCase().includes(searchTerm) ||
        s.scientificName?.toLowerCase().includes(searchTerm)
      );
    },
    enabled: enabled && query.length > 2 && allSpecies.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute - search is dynamic
    gcTime: 2 * 60 * 1000,
  });
};

// Hook: Get species statistics
export const useSpeciesStats = () => {
  const { data: species = [] } = useSpecies();

  return useQuery({
    queryKey: queryKeys.species.stats(),
    queryFn: () => {
      const stats = {
        totalSpecies: species.length,
        byOrder: {} as Record<string, number>,
        byHabitat: {} as Record<string, number>,
        bySize: {} as Record<string, number>
      };

      species.forEach(s => {
        // Count by order
        if (s.orderName) {
          stats.byOrder[s.orderName] = (stats.byOrder[s.orderName] || 0) + 1;
        }

        // Count by habitat
        s.habitats?.forEach(habitat => {
          stats.byHabitat[habitat] = (stats.byHabitat[habitat] || 0) + 1;
        });

        // Count by size
        if (s.sizeCategory) {
          stats.bySize[s.sizeCategory] = (stats.bySize[s.sizeCategory] || 0) + 1;
        }
      });

      return stats;
    },
    enabled: species.length > 0,
    staleTime: 10 * 60 * 1000,
  });
};

// Hook: Prefetch species for performance optimization
export const usePrefetchSpecies = () => {
  const queryClient = useQueryClient();

  return {
    prefetchSpecies: (filters?: any) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.species.list(filters),
        queryFn: () => api.species.list(filters),
        staleTime: 10 * 60 * 1000,
      });
    },
    prefetchSpeciesById: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.species.detail(id),
        queryFn: () => api.species.get(id),
        staleTime: 10 * 60 * 1000,
      });
    },
  };
};

// Hook: Get similar species recommendations
export const useSimilarSpecies = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...queryKeys.species.detail(id), 'similar'],
    queryFn: async () => {
      try {
        return await api.species.getSimilar(id);
      } catch (err) {
        logError('Error fetching similar species', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    enabled: enabled && !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes - recommendations are static
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });
};

// Mutation: Create/Update species (for admin functionality)
export const useSpeciesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (species: Partial<Species>) => {
      // Implement create/update logic when backend is ready
      return species;
    },
    onSuccess: () => {
      // Invalidate and refetch species queries
      queryClient.invalidateQueries({ queryKey: queryKeys.species.all });
    },
    onError: (error) => {
      logError('Error mutating species', error instanceof Error ? error : new Error(String(error)));
    },
  });
};