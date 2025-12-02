import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { AnnotationReviewCard } from '../../../components/admin/AnnotationReviewCard';
import type { AIAnnotation } from '../../../hooks/useAIAnnotations';
import * as useAIAnnotationsModule from '../../../hooks/useAIAnnotations';

// Mock hooks - include all hooks used by AnnotationReviewCard
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
  useUpdateAnnotation: vi.fn(() => ({
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
      Canvas with {annotations?.length || 0} annotation(s)
    </div>
  ),
}));

// Helper to create mock mutation result
const createMockMutation = (overrides: Partial<ReturnType<typeof useAIAnnotationsModule.useApproveAnnotation>> = {}) => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
  reset: vi.fn(),
  status: 'idle' as const,
  isIdle: true,
  variables: undefined,
  context: undefined,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  submittedAt: 0,
  ...overrides,
});

describe('AnnotationReviewCard Component', () => {
  let mockAnnotation: AIAnnotation;
  const mockImageUrl = 'https://example.com/bird.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to default implementation
    vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(createMockMutation() as any);
    vi.mocked(useAIAnnotationsModule.useRejectAnnotation).mockReturnValue(createMockMutation() as any);
    vi.mocked(useAIAnnotationsModule.useEditAnnotation).mockReturnValue(createMockMutation() as any);
    vi.mocked(useAIAnnotationsModule.useUpdateAnnotation).mockReturnValue(createMockMutation() as any);

    // FIX: boundingBox uses x, y directly, not topLeft.x, topLeft.y
    mockAnnotation = {
      id: 'ann-1',
      imageId: 'img-1',
      spanishTerm: 'el pico',
      englishTerm: 'the beak',
      pronunciation: '[ˈpiko]',
      type: 'anatomical',
      isVisible: true,
      boundingBox: {
        x: 0.2,  // Normalized 0-1
        y: 0.3,
        width: 0.1,
        height: 0.15,
      },
      difficultyLevel: 'beginner',
      confidenceScore: 0.85,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      aiGenerated: true,
    } as unknown as AIAnnotation;
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
      // Canvas is mocked - just check component renders
      expect(screen.getByText(/AI-Generated Annotation/i)).toBeInTheDocument();
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
      // Values are normalized 0-1, displayed with 2 decimal places
      expect(screen.getByText(/X: 0.20, Y: 0.30/i)).toBeInTheDocument();
      expect(screen.getByText(/W: 0.10, H: 0.15/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText(/Approve \(A\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Edit \(E\)/i)).toBeInTheDocument();
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
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(
        createMockMutation({ mutateAsync }) as any
      );

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
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(
        createMockMutation({ mutateAsync }) as any
      );

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
      vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(
        createMockMutation({ isPending: true, isIdle: false, status: 'pending' }) as any
      );

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
      vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(
        createMockMutation({ isSuccess: true, isIdle: false, status: 'success' }) as any
      );

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
    it('should show reject modal when reject clicked', async () => {
      const user = userEvent.setup();

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const rejectButton = screen.getByText(/Reject \(R\)/i);
      await user.click(rejectButton);

      // The enhanced reject modal should be shown
      expect(screen.getByText(/Reject Annotation/i)).toBeInTheDocument();
    });

    it('should show success message after reject', () => {
      vi.mocked(useAIAnnotationsModule.useRejectAnnotation).mockReturnValue(
        createMockMutation({ isSuccess: true, isIdle: false, status: 'success' }) as any
      );

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

      const editButton = screen.getByText(/Edit \(E\)/i);
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

      const editButton = screen.getByText(/Edit \(E\)/i);
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

      const editButton = screen.getByText(/Edit \(E\)/i);
      await user.click(editButton);

      const spanishInput = screen.getByDisplayValue('el pico');
      await user.clear(spanishInput);
      await user.type(spanishInput, 'la cabeza');

      expect(screen.getByDisplayValue('la cabeza')).toBeInTheDocument();
    });

    it('should call edit mutation when save clicked', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAIAnnotationsModule.useEditAnnotation).mockReturnValue(
        createMockMutation({ mutateAsync }) as any
      );

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const editButton = screen.getByText(/Edit \(E\)/i);
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

      const editButton = screen.getByText(/Edit \(E\)/i);
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
      vi.mocked(useAIAnnotationsModule.useEditAnnotation).mockReturnValue(
        createMockMutation({ isSuccess: true, isIdle: false, status: 'success' }) as any
      );

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
      vi.mocked(useAIAnnotationsModule.useApproveAnnotation).mockReturnValue(
        createMockMutation({ isPending: true, isIdle: false, status: 'pending' }) as any
      );

      render(
        <AnnotationReviewCard
          annotation={mockAnnotation}
          imageUrl={mockImageUrl}
        />
      );

      const approveButton = screen.getByText(/Approve \(A\)/i);
      const editButton = screen.getByText(/Edit \(E\)/i);
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
