// CONCEPT: Hook for species data management with dual-mode support
// WHY: Abstracts data fetching logic from components, works with both API and client storage
// PATTERN: Custom hook with loading states and error handling

import { useState, useCallback, useEffect } from 'react';
import { Species } from '../types';
import { api } from '../services/apiAdapter';

export const useSpecies = () => {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all species
  const fetchSpecies = useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.species.list(filters);
      setSpecies(data);
      return data;
    } catch (err) {
      const errorMessage = 'Failed to load species';
      setError(errorMessage);
      console.error('Error fetching species:', err);

      // Return empty array on error so UI can still render
      setSpecies([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch species by ID
  const fetchSpeciesById = useCallback(async (id: string) => {
    try {
      const data = await api.species.get(id);
      return data;
    } catch (err) {
      console.error('Error fetching species details:', err);
      return null;
    }
  }, []);

  // Search species
  const searchSpecies = useCallback(async (query: string) => {
    try {
      // For now, do client-side search on loaded species
      const searchTerm = query.toLowerCase();
      const results = species.filter(s =>
        s.spanishName?.toLowerCase().includes(searchTerm) ||
        s.englishName?.toLowerCase().includes(searchTerm) ||
        s.scientificName?.toLowerCase().includes(searchTerm)
      );
      return results;
    } catch (err) {
      console.error('Error searching species:', err);
      return [];
    }
  }, [species]);

  // Get species statistics
  const getSpeciesStats = useCallback(() => {
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
  }, [species]);

  // Auto-load species on mount for static data
  useEffect(() => {
    // Only auto-load if we're using client storage (GitHub Pages)
    const storageMode = api.utils.getMode();
    if (storageMode === 'client' && species.length === 0) {
      fetchSpecies();
    }
  }, []);

  return {
    species,
    loading,
    error,
    fetchSpecies,
    fetchSpeciesById,
    searchSpecies,
    getSpeciesStats
  };
};