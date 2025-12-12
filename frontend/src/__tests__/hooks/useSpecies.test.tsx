import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSpecies,
  useSpeciesById,
  useSpeciesSearch,
  useSpeciesStats,
} from '../../hooks/useSpecies';
import { api } from '../../services/apiAdapter';
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

const mockSpecies = [
  {
    id: 'sp-1',
    spanishName: 'Gorrión',
    englishName: 'Sparrow',
    scientificName: 'Passer domesticus',
    orderName: 'Passeriformes',
    habitats: ['Urban', 'Grassland'],
    sizeCategory: 'Small',
  },
  {
    id: 'sp-2',
    spanishName: 'Águila',
    englishName: 'Eagle',
    scientificName: 'Aquila chrysaetos',
    orderName: 'Accipitriformes',
    habitats: ['Mountain', 'Forest'],
    sizeCategory: 'Large',
  },
  {
    id: 'sp-3',
    spanishName: 'Paloma',
    englishName: 'Pigeon',
    scientificName: 'Columba livia',
    orderName: 'Columbiformes',
    habitats: ['Urban'],
    sizeCategory: 'Medium',
  },
];

describe('useSpecies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.species.list as any).mockResolvedValue(mockSpecies);
    (api.species.get as any).mockImplementation((id: string) =>
      Promise.resolve(mockSpecies.find(s => s.id === id))
    );
  });

  describe('useSpecies', () => {
    it('should fetch all species', async () => {
      const { result } = renderHook(() => useSpecies(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toHaveLength(3);
      }, { timeout: 5000 });

      expect(result.current.data).toEqual(mockSpecies);
      expect(api.species.list).toHaveBeenCalled();
    });

    it('should pass filters to API', async () => {
      const filters = { habitat: 'Urban' };
      const { result } = renderHook(() => useSpecies(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.species.list).toHaveBeenCalledWith(filters);
    });

    it('should return empty array on error', async () => {
      (api.species.list as any).mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useSpecies(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should use placeholder data while loading', () => {
      const { result } = renderHook(() => useSpecies(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useSpeciesById', () => {
    it('should fetch species by ID', async () => {
      const { result } = renderHook(() => useSpeciesById('sp-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.spanishName).toBe('Gorrión');
      expect(api.species.get).toHaveBeenCalledWith('sp-1');
    });

    it('should not fetch if ID is not provided', () => {
      const { result } = renderHook(() => useSpeciesById(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(api.species.get).not.toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      (api.species.get as any).mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useSpeciesById('invalid'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useSpeciesSearch', () => {
    it('should search by Spanish name', async () => {
      (api.species.list as any).mockResolvedValue(mockSpecies);

      const { result } = renderHook(() => useSpeciesSearch('Gorrión'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const results = result.current.data || [];
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].spanishName).toBe('Gorrión');
    });

    it('should search by English name', async () => {
      (api.species.list as any).mockResolvedValue(mockSpecies);

      const { result } = renderHook(() => useSpeciesSearch('Eagle'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const results = result.current.data || [];
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].englishName).toBe('Eagle');
    });

    it('should search by scientific name', async () => {
      (api.species.list as any).mockResolvedValue(mockSpecies);

      const { result } = renderHook(() => useSpeciesSearch('Passer'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const results = result.current.data || [];
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].scientificName).toContain('Passer');
    });

    it('should not run query for short queries', () => {
      const { result } = renderHook(() => useSpeciesSearch('ab'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should respect enabled flag', () => {
      const { result } = renderHook(() => useSpeciesSearch('Eagle', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSpeciesStats', () => {
    it('should calculate species statistics', async () => {
      (api.species.list as any).mockResolvedValue(mockSpecies);

      const { result } = renderHook(() => useSpeciesStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const stats = result.current.data!;
      expect(stats.totalSpecies).toBe(3);
      expect(stats.byOrder['Passeriformes']).toBe(1);
      expect(stats.byHabitat['Urban']).toBe(2);
      expect(stats.bySize['Small']).toBe(1);
    });

    it('should not run when no species loaded', () => {
      (api.species.list as any).mockResolvedValue([]);

      const { result } = renderHook(() => useSpeciesStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });
});
