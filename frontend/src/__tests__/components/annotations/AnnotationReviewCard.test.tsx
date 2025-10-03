import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { AnnotationReviewCard } from '../../../components/admin/AnnotationReviewCard';
import type { AIAnnotation } from '../../../hooks/useAIAnnotations';

// Mock hooks
vi.mock('../../../hooks/useAIAnnotations', () => ({
  useApproveAnnotation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
  useRejectAnnotation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
  useEditAnnotation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}));

// Mock AnnotationCanvas
vi.mock('../../../components/annotation/AnnotationCanvas', () => ({
  AnnotationCanvas: ({ annotations }: any) => (
    <div data-testid="annotation-canvas">
      Canvas with {annotations.length} annotation(s)
    </div>
  ),
}));

describe('AnnotationReviewCard Component', () => {
  let mockAnnotation: AIAnnotation;
  const mockImageUrl = 'https://example.com/bird.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnnotation = {
      id: 'ann-1',
      imageId: 'img-1',
      spanishTerm: 'el pico',
      englishTerm: 'the beak',
      pronunciation: '[ˈpiko]',
      type: 'anatomical',
      isVisible: true,
      boundingBox: {
        topLeft: { x: 100, y: 100 },
        width: 50,
        height: 50,
      },
      difficultyLevel: 'beginner',
      confidenceScore: 0.85,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/AI-Generated Annotation/i)).toBeInTheDocument();
    });

    it('should display annotation type', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/anatomical/i)).toBeInTheDocument();
    });

    it('should display confidence score', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Confidence: 85.0%/i)).toBeInTheDocument();
    });

    it('should display difficulty level', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Difficulty: beginner/i)).toBeInTheDocument();
    });

    it('should render AnnotationCanvas preview', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByTestId('annotation-canvas')).toBeInTheDocument();
    });

    it('should display annotation data', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText('el pico')).toBeInTheDocument();
      expect(screen.getByText('the beak')).toBeInTheDocument();
      expect(screen.getByText('[ˈpiko]')).toBeInTheDocument();
    });

    it('should display bounding box info', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/X: 100, Y: 100/i)).toBeInTheDocument();
      expect(screen.getByText(/W: 50, H: 50/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Approve \(A\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Edit/i)).toBeInTheDocument();
      expect(screen.getByText(/Reject \(R\)/i)).toBeInTheDocument();
    });
  });

  describe('Confidence Badge Variants', () => {
    it('should show success badge for high confidence', () => {
      const highConfidence = { ...mockAnnotation, confidenceScore: 0.9 };
      render(
        <AnnotationReviewCard
          annotation={highConfidence}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Confidence: 90.0%/i)).toBeInTheDocument();
    });

    it('should show warning badge for medium confidence', () => {
      const mediumConfidence = { ...mockAnnotation, confidenceScore: 0.65 };
      render(
        <AnnotationReviewCard
          annotation={mediumConfidence}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Confidence: 65.0%/i)).toBeInTheDocument();
    });

    it('should show danger badge for low confidence', () => {
      const lowConfidence = { ...mockAnnotation, confidenceScore: 0.4 };
      render(
        <AnnotationReviewCard
          annotation={lowConfidence}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Confidence: 40.0%/i)).toBeInTheDocument();
    });

    it('should handle missing confidence score', () => {
      const noConfidence = { ...mockAnnotation, confidenceScore: undefined };
      render(
        <AnnotationReviewCard
          annotation={noConfidence}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.queryByText(/Confidence:/i)).not.toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('should render checkbox when onSelect provided', () => {
      const handleSelect = vi.fn();
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
          onSelect={handleSelect}
        />
      );
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should call onSelect when checkbox changed', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
          onSelect={handleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleSelect).toHaveBeenCalledWith(true);
    });

    it('should reflect isSelected prop', () => {
      const handleSelect = vi.fn();
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
          onSelect={handleSelect}
          isSelected={true}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should not render checkbox when onSelect not provided', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
    });
  });

  describe('Approve Functionality', () => {
    it('should call approve mutation when approve clicked', async () => {
      const user = userEvent.setup();
      const { useApproveAnnotation } = require('../../../hooks/useAIAnnotations');
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      useApproveAnnotation.mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      await user.click(approveButton);

      expect(mutateAsync).toHaveBeenCalledWith(mockAnnotation.id);
    });

    it('should call onActionComplete after successful approve', async () => {
      const user = userEvent.setup();
      const handleComplete = vi.fn();
      const { useApproveAnnotation } = require('../../../hooks/useAIAnnotations');
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      useApproveAnnotation.mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
          onActionComplete={handleComplete}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      await user.click(approveButton);

      await waitFor(() => {
        expect(handleComplete).toHaveBeenCalled();
      });
    });

    it('should show loading state during approve', () => {
      const { useApproveAnnotation } = require('../../../hooks/useAIAnnotations');
      useApproveAnnotation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      expect(approveButton).toBeDisabled();
    });

    it('should show success message after approve', () => {
      const { useApproveAnnotation } = require('../../../hooks/useAIAnnotations');
      useApproveAnnotation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      expect(screen.getByText(/Approved!/i)).toBeInTheDocument();
    });
  });

  describe('Reject Functionality', () => {
    it('should show reject form when reject clicked', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const rejectButton = screen.getByText(/Reject \(R\)/i);
      await user.click(rejectButton);

      expect(screen.getByText(/Rejection Reason/i)).toBeInTheDocument();
    });

    it('should call reject mutation with reason', async () => {
      const user = userEvent.setup();
      const { useRejectAnnotation } = require('../../../hooks/useAIAnnotations');
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      useRejectAnnotation.mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const rejectButton = screen.getByText(/Reject \(R\)/i);
      await user.click(rejectButton);

      const reasonInput = screen.getByPlaceholderText(/Why is this annotation being rejected/i);
      await user.type(reasonInput, 'Incorrect bounding box');

      const confirmButton = screen.getByText(/Confirm Rejection/i);
      await user.click(confirmButton);

      expect(mutateAsync).toHaveBeenCalledWith({
        annotationId: mockAnnotation.id,
        reason: 'Incorrect bounding box',
      });
    });

    it('should cancel reject form', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const rejectButton = screen.getByText(/Reject \(R\)/i);
      await user.click(rejectButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/Rejection Reason/i)).not.toBeInTheDocument();
    });

    it('should show success message after reject', () => {
      const { useRejectAnnotation } = require('../../../hooks/useAIAnnotations');
      useRejectAnnotation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      expect(screen.getByText(/Rejected!/i)).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('should enter edit mode when edit clicked', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit/i);
      await user.click(editButton);

      expect(screen.getByText(/Edit Annotation Data/i)).toBeInTheDocument();
    });

    it('should show editable fields in edit mode', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit/i);
      await user.click(editButton);

      expect(screen.getByDisplayValue('el pico')).toBeInTheDocument();
      expect(screen.getByDisplayValue('the beak')).toBeInTheDocument();
      expect(screen.getByDisplayValue('[ˈpiko]')).toBeInTheDocument();
    });

    it('should update field values in edit mode', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit/i);
      await user.click(editButton);

      const spanishInput = screen.getByDisplayValue('el pico');
      await user.clear(spanishInput);
      await user.type(spanishInput, 'la cabeza');

      expect(screen.getByDisplayValue('la cabeza')).toBeInTheDocument();
    });

    it('should call edit mutation when save clicked', async () => {
      const user = userEvent.setup();
      const { useEditAnnotation } = require('../../../hooks/useAIAnnotations');
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      useEditAnnotation.mockReturnValue({
        mutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit/i);
      await user.click(editButton);

      const spanishInput = screen.getByDisplayValue('el pico');
      await user.clear(spanishInput);
      await user.type(spanishInput, 'la cabeza');

      const saveButton = screen.getByText(/Save & Approve/i);
      await user.click(saveButton);

      expect(mutateAsync).toHaveBeenCalledWith({
        annotationId: mockAnnotation.id,
        updates: expect.objectContaining({
          spanishTerm: 'la cabeza',
        }),
      });
    });

    it('should cancel edit mode', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit/i);
      await user.click(editButton);

      const spanishInput = screen.getByDisplayValue('el pico');
      await user.clear(spanishInput);
      await user.type(spanishInput, 'la cabeza');

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/Edit Annotation Data/i)).not.toBeInTheDocument();
      expect(screen.getByText('el pico')).toBeInTheDocument();
    });

    it('should show success message after edit', () => {
      const { useEditAnnotation } = require('../../../hooks/useAIAnnotations');
      useEditAnnotation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      expect(screen.getByText(/Updated!/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable all buttons during any mutation', () => {
      const { useApproveAnnotation } = require('../../../hooks/useAIAnnotations');
      useApproveAnnotation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
      });

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      const editButton = screen.getByText(/Edit/i);
      const rejectButton = screen.getByText(/Reject \(R\)/i);

      expect(approveButton).toBeDisabled();
      expect(editButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing pronunciation', () => {
      const noPronunciation = { ...mockAnnotation, pronunciation: undefined };
      render(
        <AnnotationReviewCard
          annotation={noPronunciation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText('el pico')).toBeInTheDocument();
      expect(screen.getByText('the beak')).toBeInTheDocument();
    });

    it('should handle missing confidence score', () => {
      const noConfidence = { ...mockAnnotation, confidenceScore: undefined };
      render(
        <AnnotationReviewCard
          annotation={noConfidence}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.queryByText(/Confidence:/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for checkbox', () => {
      const handleSelect = vi.fn();
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
          onSelect={handleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', 'Select annotation for batch operations');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      approveButton.focus();
      expect(document.activeElement).toBe(approveButton);

      await user.tab();
      expect(document.activeElement).not.toBe(approveButton);
    });
  });
});
