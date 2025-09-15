// CONCEPT: Hook for annotation data management
// WHY: Centralizes annotation logic and provides consistent data access
// PATTERN: Custom hook with caching and error handling

import { useState, useCallback, useEffect } from 'react';
import { Annotation } from '../types';
import { api } from '../services/apiAdapter';

export const useAnnotations = (imageId?: string) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch annotations
  const fetchAnnotations = useCallback(async (imgId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.annotations.list(imgId || imageId);
      setAnnotations(data);
      return data;
    } catch (err) {
      const errorMessage = 'Failed to load annotations';
      setError(errorMessage);
      console.error('Error fetching annotations:', err);

      // Return empty array so UI can still render
      setAnnotations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [imageId]);

  // Get annotations by term
  const getAnnotationsByTerm = useCallback((term: string) => {
    return annotations.filter(a =>
      a.spanishTerm?.toLowerCase().includes(term.toLowerCase()) ||
      a.englishTerm?.toLowerCase().includes(term.toLowerCase())
    );
  }, [annotations]);

  // Get annotations by difficulty
  const getAnnotationsByDifficulty = useCallback((level: number) => {
    return annotations.filter(a => a.difficultyLevel === level);
  }, [annotations]);

  // Get unique terms for exercises
  const getUniqueTerms = useCallback(() => {
    const terms = new Map<string, Annotation>();
    annotations.forEach(a => {
      if (a.spanishTerm && !terms.has(a.spanishTerm)) {
        terms.set(a.spanishTerm, a);
      }
    });
    return Array.from(terms.values());
  }, [annotations]);

  // Auto-load annotations on mount
  useEffect(() => {
    const storageMode = api.utils.getMode();
    if (storageMode === 'client' && annotations.length === 0) {
      fetchAnnotations();
    }
  }, []);

  return {
    annotations,
    loading,
    error,
    fetchAnnotations,
    getAnnotationsByTerm,
    getAnnotationsByDifficulty,
    getUniqueTerms
  };
};