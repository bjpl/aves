import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAnnotations,
  useAnnotationsByTerm,
  useAnnotationsByDifficulty,
  useUniqueTerms,
} from '../../hooks/useAnnotations';
import { api } from '../../services/apiAdapter';
import { createMockAnnotations } from '../../test/mocks/annotations';
import { ReactNode } from 'react';

vi.mock('../../services/apiAdapter');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAnnotations', () => {
  const mockAnnotations = createMockAnnotations(5);

  beforeEach(() => {
    vi.clearAllMocks();
    (api.annotations.list as any).mockResolvedValue(mockAnnotations);
  });

  describe('useAnnotations', () => {
    it('should fetch all annotations', async () => {
      const { result } = renderHook(() => useAnnotations(), {
        wrapper: createWrapper(),
      });

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the fetched data has the expected length
      expect(result.current.data).toHaveLength(5);
      expect(api.annotations.list).toHaveBeenCalledWith(undefined);
    });

    it('should fetch annotations for specific image', async () => {
      const { result } = renderHook(() => useAnnotations('img-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.annotations.list).toHaveBeenCalledWith('img-1');
    });

    it('should return empty array on error', async () => {
      (api.annotations.list as any).mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useAnnotations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should use placeholder data while loading', () => {
      const { result } = renderHook(() => useAnnotations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAnnotationsByTerm', () => {
    it('should filter annotations by Spanish term', async () => {
      (api.annotations.list as any).mockResolvedValue(mockAnnotations);

      const { result } = renderHook(() => useAnnotationsByTerm('pico'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const filtered = result.current.data || [];
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(a => a.spanishTerm?.toLowerCase().includes('pico'))).toBe(true);
    });

    it('should filter annotations by English term', async () => {
      (api.annotations.list as any).mockResolvedValue(mockAnnotations);

      const { result } = renderHook(() => useAnnotationsByTerm('beak'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const filtered = result.current.data || [];
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(a => a.englishTerm?.toLowerCase().includes('beak'))).toBe(true);
    });

    it('should not run query when term is empty', () => {
      const { result } = renderHook(() => useAnnotationsByTerm(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useAnnotationsByDifficulty', () => {
    it('should filter annotations by difficulty level', async () => {
      (api.annotations.list as any).mockResolvedValue(mockAnnotations);

      const { result } = renderHook(() => useAnnotationsByDifficulty(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const filtered = result.current.data || [];
      expect(filtered.every(a => a.difficultyLevel === 2)).toBe(true);
    });
  });

  describe('useUniqueTerms', () => {
    it('should return unique terms only', async () => {
      const duplicateAnnotations = [
        ...mockAnnotations,
        ...mockAnnotations.map(a => ({ ...a, id: `${a.id}-dup` })),
      ];
      (api.annotations.list as any).mockResolvedValue(duplicateAnnotations);

      const { result } = renderHook(() => useUniqueTerms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const uniqueTerms = result.current.data || [];
      const spanishTerms = uniqueTerms.map(a => a.spanishTerm);
      const uniqueSpanishTerms = new Set(spanishTerms);

      expect(spanishTerms.length).toBe(uniqueSpanishTerms.size);
    });
  });
});
