import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDisclosure } from '../../hooks/useDisclosure';
import { vocabularyAPI } from '../../services/vocabularyAPI';
import { createMockAnnotation } from '../../test/mocks/annotations';

vi.mock('../../services/vocabularyAPI');

describe('useDisclosure', () => {
  const mockAnnotation = createMockAnnotation({
    spanishTerm: 'pico',
    englishTerm: 'beak',
    pronunciation: 'PEE-koh',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (vocabularyAPI.trackInteraction as any) = vi.fn();
    (vocabularyAPI.getEnrichment as any) = vi.fn().mockResolvedValue({
      etymology: 'From Latin piccus',
      mnemonic: 'Think of a woodpecker pecking',
      relatedTerms: ['picotazo', 'picar'],
    });
    (vocabularyAPI.getExamples as any) = vi.fn().mockResolvedValue({
      usageExamples: ['El pico es amarillo', 'Tiene un pico largo'],
      commonPhrases: ['pico amarillo', 'pico rojo'],
    });
  });

  describe('Initialization', () => {
    it('should initialize with level 0', () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      expect(result.current.disclosure.level).toBe(0);
      expect(result.current.disclosure.annotationId).toBe(mockAnnotation.id);
    });

    it('should have empty content at level 0', () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      expect(result.current.disclosure.spanish).toBeUndefined();
      expect(result.current.disclosure.english).toBeUndefined();
      expect(result.current.disclosure.hint).toBeUndefined();
    });
  });

  describe('Level 1: Hover Interaction', () => {
    it('should reveal hint on hover', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.handleHover();
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(1);
        expect(result.current.disclosure.hint).toContain('starts with "p"');
      });
    });

    it('should track interaction on hover', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.handleHover();
      });

      await waitFor(() => {
        expect(vocabularyAPI.trackInteraction).toHaveBeenCalledWith(
          mockAnnotation.id,
          mockAnnotation.spanishTerm,
          1
        );
      });
    });

    it('should not increase level on subsequent hovers', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.handleHover();
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(1);
      });

      await act(async () => {
        await result.current.handleHover();
      });

      expect(result.current.disclosure.level).toBe(1);
    });
  });

  describe('Level 2: Click for Pronunciation', () => {
    it('should reveal English and audio on click', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.handleClick();
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBeGreaterThanOrEqual(1);
      });

      await act(async () => {
        await result.current.handleClick();
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(2);
        expect(result.current.disclosure.english).toBe('beak');
        expect(result.current.disclosure.audioUrl).toContain('/api/audio/pronounce/pico');
      });
    });
  });

  describe('Level 3: Etymology and Related Terms', () => {
    it('should fetch enrichment data at level 3', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(3);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(3);
        expect(result.current.disclosure.etymology).toBeTruthy();
        expect(result.current.disclosure.mnemonic).toBeTruthy();
        expect(result.current.disclosure.relatedTerms).toHaveLength(3);
      });

      expect(vocabularyAPI.getEnrichment).toHaveBeenCalledWith('pico');
    });

    it('should handle enrichment fetch errors gracefully', async () => {
      (vocabularyAPI.getEnrichment as any).mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(3);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(3);
      });

      // Should continue despite error
      expect(result.current.disclosure.etymology).toBeUndefined();
    });
  });

  describe('Level 4: Usage Examples', () => {
    it('should fetch usage examples at level 4', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(4);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(4);
        expect(result.current.disclosure.usageExamples).toHaveLength(2);
        expect(result.current.disclosure.commonPhrases).toHaveLength(2);
      });

      expect(vocabularyAPI.getExamples).toHaveBeenCalledWith('pico');
    });

    it('should handle examples fetch errors gracefully', async () => {
      (vocabularyAPI.getExamples as any).mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(4);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(4);
      });

      expect(result.current.disclosure.usageExamples).toBeUndefined();
    });

    it('should not exceed level 4', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(4);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(4);
      });

      await act(async () => {
        await result.current.handleClick();
      });

      expect(result.current.disclosure.level).toBe(4);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to level 0', async () => {
      const { result } = renderHook(() => useDisclosure(mockAnnotation));

      await act(async () => {
        await result.current.setLevel(3);
      });

      await waitFor(() => {
        expect(result.current.disclosure.level).toBe(3);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.disclosure.level).toBe(0);
      expect(result.current.disclosure.english).toBeUndefined();
    });
  });
});
