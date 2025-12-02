import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { AnnotationBatchActions } from '../../../components/admin/AnnotationBatchActions';
import * as useAIAnnotationsModule from '../../../hooks/useAIAnnotations';

// Mock hooks
vi.mock('../../../hooks/useAIAnnotations', () => ({
  useBatchApprove: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
  useBatchReject: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('AnnotationBatchActions Component', () => {
  const mockSelectedIds = ['ann-1', 'ann-2', 'ann-3'];
  const mockTotalCount = 10;
  const mockSelectAll = vi.fn();
  const mockClearSelection = vi.fn();
  const mockBatchComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: vi.fn(),
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: 'idle',
      isIdle: true,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as any);
    vi.mocked(useAIAnnotationsModule.useBatchReject).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: vi.fn(),
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: 'idle',
      isIdle: true,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as any);
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      expect(screen.getByText(/Select annotations for batch operations/i)).toBeInTheDocument();
    });

    it('should display selection count when items selected', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });

    it('should show clear selection button when items selected', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      expect(screen.getByText(/Clear selection/i)).toBeInTheDocument();
    });

    it('should render approve all button', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      expect(screen.getByText(/Approve All \(3\)/i)).toBeInTheDocument();
    });

    it('should render reject all button', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      expect(screen.getByText(/Reject All \(3\)/i)).toBeInTheDocument();
    });

    it('should show checkmark icon in approve button', () => {
      const { container } = render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should show X icon in reject button', () => {
      const { container } = render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Select All Checkbox', () => {
    it('should render select all checkbox', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      const checkbox = screen.getByLabelText(/Select all annotations/i);
      expect(checkbox).toBeInTheDocument();
    });

    it('should be unchecked when no items selected', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      const checkbox = screen.getByLabelText(/Select all annotations/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should be checked when all items selected', () => {
      const allIds = Array.from({ length: mockTotalCount }, (_, i) => `ann-${i}`);
      render(
        <AnnotationBatchActions
          selectedIds={allIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );
      const checkbox = screen.getByLabelText(/Select all annotations/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call onSelectAll when checked', async () => {
      const user = userEvent.setup();
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const checkbox = screen.getByLabelText(/Select all annotations/i);
      await user.click(checkbox);

      expect(mockSelectAll).toHaveBeenCalled();
    });

    it('should call onClearSelection when unchecked', async () => {
      const user = userEvent.setup();
      const allIds = Array.from({ length: mockTotalCount }, (_, i) => `ann-${i}`);
      render(
        <AnnotationBatchActions
          selectedIds={allIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const checkbox = screen.getByLabelText(/Select all annotations/i);
      await user.click(checkbox);

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Clear Selection', () => {
    it('should call onClearSelection when clicked', async () => {
      const user = userEvent.setup();
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const clearButton = screen.getByText(/Clear selection/i);
      await user.click(clearButton);

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Batch Approve', () => {
    it('should call batch approve mutation', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      await user.click(approveButton);

      expect(mutateAsync).toHaveBeenCalledWith(mockSelectedIds);
    });

    it('should call onClearSelection after successful approve', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });

    it('should call onBatchComplete after successful approve', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
          onBatchComplete={mockBatchComplete}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockBatchComplete).toHaveBeenCalled();
      });
    });

    it('should be disabled when no selection', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(0\)/i);
      expect(approveButton).toBeDisabled();
    });

    it('should show loading state during approve', () => {
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'pending',
        isIdle: false,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      expect(approveButton).toBeDisabled();
    });

    it('should show error message on approve failure', () => {
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: true,
        mutate: vi.fn(),
        data: undefined,
        error: new Error('Failed'),
        reset: vi.fn(),
        status: 'error',
        isIdle: false,
        variables: undefined,
        context: undefined,
        failureCount: 1,
        failureReason: new Error('Failed'),
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      expect(screen.getByText(/Failed to approve annotations/i)).toBeInTheDocument();
    });
  });

  describe('Batch Reject', () => {
    it('should show confirmation dialog before reject', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const rejectButton = screen.getByText(/Reject All \(3\)/i);
      await user.click(rejectButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 annotation(s)')
      );
    });

    it('should call batch reject mutation when confirmed', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchReject).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const rejectButton = screen.getByText(/Reject All \(3\)/i);
      await user.click(rejectButton);

      expect(mutateAsync).toHaveBeenCalledWith({ annotationIds: mockSelectedIds });
    });

    it('should not call mutation when cancelled', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => false);
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchReject).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const rejectButton = screen.getByText(/Reject All \(3\)/i);
      await user.click(rejectButton);

      expect(mutateAsync).not.toHaveBeenCalled();
      global.confirm = vi.fn(() => true); // Reset
    });

    it('should be disabled when no selection', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const rejectButton = screen.getByText(/Reject All \(0\)/i);
      expect(rejectButton).toBeDisabled();
    });

    it('should show error message on reject failure', () => {
      vi.mocked(useAIAnnotationsModule.useBatchReject).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: true,
        mutate: vi.fn(),
        data: undefined,
        error: new Error('Failed'),
        reset: vi.fn(),
        status: 'error',
        isIdle: false,
        variables: undefined,
        context: undefined,
        failureCount: 1,
        failureReason: new Error('Failed'),
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      expect(screen.getByText(/Failed to reject annotations/i)).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('should show progress during approve', () => {
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'pending',
        isIdle: false,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      const { rerender } = render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      // Simulate clicking approve to show progress
      const approveButton = screen.getByText(/Approve All \(3\)/i);
      approveButton.click();

      rerender(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      // Progress bar should be visible during operation
      expect(screen.queryByText(/Processing batch operation/i)).toBeInTheDocument();
    });

    it('should show success message after completion', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selection', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={0}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const checkbox = screen.getByLabelText(/Select all annotations/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should not trigger approve with empty selection', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn();
      vi.mocked(useAIAnnotationsModule.useBatchApprove).mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        reset: vi.fn(),
        status: 'idle',
        isIdle: true,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      } as any);

      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(0\)/i);
      await user.click(approveButton);

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for select all checkbox', () => {
      render(
        <AnnotationBatchActions
          selectedIds={[]}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const checkbox = screen.getByLabelText(/Select all annotations/i);
      expect(checkbox).toHaveAttribute('aria-label', 'Select all annotations');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const checkbox = screen.getByLabelText(/Select all annotations/i);
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);

      await user.tab();
      expect(document.activeElement).not.toBe(checkbox);
    });

    it('should have focusable action buttons', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      const approveButton = screen.getByText(/Approve All \(3\)/i);
      const rejectButton = screen.getByText(/Reject All \(3\)/i);

      approveButton.focus();
      expect(document.activeElement).toBe(approveButton);

      rejectButton.focus();
      expect(document.activeElement).toBe(rejectButton);
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile devices', () => {
      render(
        <AnnotationBatchActions
          selectedIds={mockSelectedIds}
          totalCount={mockTotalCount}
          onSelectAll={mockSelectAll}
          onClearSelection={mockClearSelection}
        />
      );

      expect(screen.getByText(/Approve All \(3\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Reject All \(3\)/i)).toBeInTheDocument();
    });
  });
});
