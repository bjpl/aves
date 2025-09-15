import { useState, useCallback } from 'react';
import { Species } from '../../../shared/types/species.types';
import axios from 'axios';

const API_BASE_URL = '/api';

export const useSpecies = () => {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/species`);
      setSpecies(response.data.species);
    } catch (err) {
      setError('Failed to load species');
      console.error('Error fetching species:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpeciesById = useCallback(async (id: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/species/${id}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching species details:', err);
      return null;
    }
  }, []);

  const searchSpecies = useCallback(async (query: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/species/search`, {
        params: { q: query }
      });
      return response.data.results;
    } catch (err) {
      console.error('Error searching species:', err);
      return [];
    }
  }, []);

  const getSpeciesStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/species/stats`);
      return response.data;
    } catch (err) {
      console.error('Error fetching species stats:', err);
      return null;
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