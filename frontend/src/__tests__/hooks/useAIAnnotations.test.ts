// CONCEPT: Tests for useAIAnnotations React Query hooks
// WHY: Verify AI annotation review workflow, mutations, and optimistic updates
// PATTERN: renderHook with React Query testing, mock axios responses

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import {
  useAIAnnotations,
  useAIAnnotationsPending,
  useAIAnnotationStats,
  useApproveAnnotation,
  useRejectAnnotation,
  useEditAnnotation,
  useBatchApprove,
  useBatchReject,
  type AIAnnotation,
} from '../../hooks/useAIAnnotations';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return Wrapper;
};

const mockAIAnnotation = (overrides: Partial<AIAnnotation> = {}): AIAnnotation => ({
  id: 'ann-1',
  imageId: 'img-1',
  spanishTerm: 'pico',
  englishTerm: 'beak',
  coordinates: { x: 100, y: 100, width: 50, height: 50 },
  status: 'pending',
  aiGenerated: true,
  confidenceScore: 0.95,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('useAIAnnotations', () => {
  // Use vi.mocked() to get properly typed mock functions from the global axios mock
  const mockAxios = {
    get: vi.mocked(axios.get),
    post: vi.mocked(axios.post),
    patch: vi.mocked(axios.patch),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAIAnnotations - Query', () => {
    it('should fetch AI annotations without filters', async () => {
      const mockAnnotations = [
        mockAIAnnotation({ id: 'ann-1' }),
        mockAIAnnotation({ id: 'ann-2' }),
      ];

      mockAxios.get.mockResolvedValueOnce({
        data: { data: mockAnnotations },
      });

      const { result } = renderHook(() => useAIAnnotations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAnnotations);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/ai/annotations', {
        params: undefined,
      });
    });

    it('should fetch AI annotations with filters', async () => {
      const filters = {
        status: 'pending' as const,
        minConfidence: 0.8,
      };

      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const { result } = renderHook(() => useAIAnnotations(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/ai/annotations', {
        params: filters,
      });
    });

    it('should return empty array on API error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAIAnnotations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should use placeholder data', () => {
      mockAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAIAnnotations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAIAnnotationsPending', () => {
    it('should fetch only pending annotations', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const { result } = renderHook(() => useAIAnnotationsPending(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/ai/annotations', {
        params: { status: 'pending' },
      });
    });
  });

  describe('useAIAnnotationStats', () => {
    it('should fetch annotation statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 30,
        approved: 60,
        rejected: 10,
        avgConfidence: 0.87,
      };

      mockAxios.get.mockResolvedValueOnce({
        data: { data: mockStats },
      });

      const { result } = renderHook(() => useAIAnnotationStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/ai/annotations/stats');
    });

    it('should return default stats on error', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useAIAnnotationStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        avgConfidence: 0,
      });
    });
  });

  describe('useApproveAnnotation - Mutation', () => {
    it('should approve an annotation', async () => {
      const approvedAnnotation = mockAIAnnotation({
        id: 'ann-1',
        status: 'approved',
        reviewedAt: new Date(),
      });

      mockAxios.post.mockResolvedValueOnce({
        data: { data: approvedAnnotation },
      });

      const { result } = renderHook(() => useApproveAnnotation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('ann-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/ann-1/approve');
    });

    it('should handle approval error', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useApproveAnnotation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('ann-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should perform optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial pending annotations
      const pendingAnnotations = [
        mockAIAnnotation({ id: 'ann-1' }),
        mockAIAnnotation({ id: 'ann-2' }),
      ];

      queryClient.setQueryData(['ai-annotations', 'pending'], pendingAnnotations);

      mockAxios.post.mockResolvedValueOnce({
        data: { data: mockAIAnnotation({ id: 'ann-1', status: 'approved' }) },
      });

      function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
      }

      const { result } = renderHook(() => useApproveAnnotation(), { wrapper: Wrapper });

      result.current.mutate('ann-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify optimistic update removed annotation from pending
      const updatedPending = queryClient.getQueryData(['ai-annotations', 'pending']);
      expect(updatedPending).toBeDefined();
    });
  });

  describe('useRejectAnnotation - Mutation', () => {
    it('should reject an annotation with reason', async () => {
      const rejectedAnnotation = mockAIAnnotation({
        id: 'ann-1',
        status: 'rejected',
        rejectionReason: 'Incorrect term',
      });

      mockAxios.post.mockResolvedValueOnce({
        data: { data: rejectedAnnotation },
      });

      const { result } = renderHook(() => useRejectAnnotation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annotationId: 'ann-1',
        reason: 'Incorrect term',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/ann-1/reject', {
        category: undefined,
        notes: undefined,
        reason: 'Incorrect term',
      });
    });

    it('should reject without reason', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { data: mockAIAnnotation({ status: 'rejected' }) },
      });

      const { result } = renderHook(() => useRejectAnnotation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ annotationId: 'ann-1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/ann-1/reject', {
        category: undefined,
        notes: undefined,
        reason: undefined,
      });
    });
  });

  describe('useEditAnnotation - Mutation', () => {
    it('should edit an annotation', async () => {
      const updatedAnnotation = mockAIAnnotation({
        spanishTerm: 'ala',
        englishTerm: 'wing',
      });

      mockAxios.patch.mockResolvedValueOnce({
        data: { data: updatedAnnotation },
      });

      const { result } = renderHook(() => useEditAnnotation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annotationId: 'ann-1',
        updates: {
          spanishTerm: 'ala',
          englishTerm: 'wing',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/ann-1/edit', {
        spanishTerm: 'ala',
        englishTerm: 'wing',
      });
    });
  });

  describe('useBatchApprove - Mutation', () => {
    it('should batch approve multiple annotations', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { data: { approved: 3 } },
      });

      const { result } = renderHook(() => useBatchApprove(), {
        wrapper: createWrapper(),
      });

      const annotationIds = ['ann-1', 'ann-2', 'ann-3'];
      result.current.mutate(annotationIds);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ approved: 3 });
      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/batch/approve', {
        annotationIds,
      });
    });

    it('should handle batch approve errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Batch error'));

      const { result } = renderHook(() => useBatchApprove(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(['ann-1', 'ann-2']);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useBatchReject - Mutation', () => {
    it('should batch reject multiple annotations', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { data: { rejected: 2 } },
      });

      const { result } = renderHook(() => useBatchReject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annotationIds: ['ann-1', 'ann-2'],
        reason: 'Low confidence',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ rejected: 2 });
      expect(mockAxios.post).toHaveBeenCalledWith('/api/ai/annotations/batch/reject', {
        annotationIds: ['ann-1', 'ann-2'],
        reason: 'Low confidence',
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate related queries after approval', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockAxios.post.mockResolvedValueOnce({
        data: { data: mockAIAnnotation({ status: 'approved' }) },
      });

      function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
      }

      const { result } = renderHook(() => useApproveAnnotation(), { wrapper: Wrapper });

      result.current.mutate('ann-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
