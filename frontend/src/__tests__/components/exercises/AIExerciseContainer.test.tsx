import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { AIExerciseContainer } from '../../../components/exercises/AIExerciseContainer';

// Mock hooks
const mockGenerateExercise = vi.fn();
const mockReset = vi.fn();

vi.mock('../../../hooks/useAIExercise', () => ({
  useAIExerciseAvailability: vi.fn(() => ({
    isAvailable: true,
    reason: '',
  })),
  useGenerateAIExercise: vi.fn(() => ({
    mutate: mockGenerateExercise,
    data: {
      exercise: {
        id: 'ai-ex-1',
        type: 'fill_in_blank',
        prompt: '___  es un pájaro grande.',
        correctAnswer: 'El flamenco',
        options: ['El flamenco', 'La águila', 'El gorrión', 'El búho'],
        explanation: 'Flamingos are large wading birds.',
      },
      metadata: {
        generated: true,
        difficulty: 3,
        cached: false,
      },
    },
    isPending: false,
    error: null,
    reset: mockReset,
  })),
}));

// Import the actual hooks after vi.mock to get typed mocked versions
import { useGenerateAIExercise, useAIExerciseAvailability } from '../../../hooks/useAIExercise';

// Create mocked versions using vi.mocked()
const mockUseGenerateAIExercise = vi.mocked(useGenerateAIExercise);
const mockUseAIExerciseAvailability = vi.mocked(useAIExerciseAvailability);

// Mock ExerciseRenderer
vi.mock('../../../components/practice/ExerciseRenderer', () => ({
  ExerciseRenderer: ({ onAnswer }: any) => (
    <div data-testid="exercise-renderer">
      <button onClick={() => onAnswer('El flamenco')}>Answer</button>
    </div>
  ),
}));

describe('AIExerciseContainer', () => {
  const defaultProps = {
    userId: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset to default mock implementations
    mockUseAIExerciseAvailability.mockReturnValue({
      isAvailable: true,
      reason: '',
    });

    mockUseGenerateAIExercise.mockReturnValue({
      mutate: mockGenerateExercise,
      data: {
        exercise: {
          id: 'ai-ex-1',
          type: 'fill_in_blank',
          prompt: '___  es un pájaro grande.',
          correctAnswer: 'El flamenco',
          options: ['El flamenco', 'La águila', 'El gorrión', 'El búho'],
          explanation: 'Flamingos are large wading birds.',
        },
        metadata: {
          generated: true,
          difficulty: 3,
          cached: false,
        },
      },
      isPending: false,
      error: null,
      reset: mockReset,
    });
  });

  describe('Rendering - Available State', () => {
    it('should render without crashing', () => {
      render(<AIExerciseContainer {...defaultProps} />);
      expect(screen.getByRole('region', { name: /AI Exercise/i })).toBeInTheDocument();
    });

    it('should display AI-generated badge', () => {
      render(<AIExerciseContainer {...defaultProps} />);
      expect(screen.getByText(/AI-Generated/i)).toBeInTheDocument();
    });

    it('should display difficulty indicator', () => {
      render(<AIExerciseContainer {...defaultProps} />);
      expect(screen.getByText(/Difficulty: 3\/5/i)).toBeInTheDocument();
    });

    it('should render ExerciseRenderer', () => {
      render(<AIExerciseContainer {...defaultProps} />);
      expect(screen.getByTestId('exercise-renderer')).toBeInTheDocument();
    });

    it('should display next exercise button', () => {
      render(<AIExerciseContainer {...defaultProps} />);
      expect(screen.getByText(/Skip Exercise/i)).toBeInTheDocument();
    });

    it('should hide AI badge when showAIBadge is false', () => {
      render(<AIExerciseContainer {...defaultProps} showAIBadge={false} />);
      expect(screen.queryByText(/AI-Generated/i)).not.toBeInTheDocument();
    });
  });

  describe('Auto-generation', () => {
    it('should auto-generate exercise on mount when autoGenerate is true', () => {
      mockUseAIExerciseAvailability.mockReturnValue({
        isAvailable: true,
        reason: '',
      });

      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: null,
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} autoGenerate={true} />);

      expect(mockGenerateExercise).toHaveBeenCalledWith({
        userId: 'user-123',
        type: undefined,
        difficulty: undefined,
      });
    });

    it('should not auto-generate when autoGenerate is false', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: null,
        reset: mockReset,
      });

      mockGenerateExercise.mockClear();

      render(<AIExerciseContainer {...defaultProps} autoGenerate={false} />);

      expect(mockGenerateExercise).not.toHaveBeenCalled();
    });

    it('should pass exerciseType to generator', () => {
      mockUseAIExerciseAvailability.mockReturnValue({
        isAvailable: true,
        reason: '',
      });

      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: null,
        reset: mockReset,
      });

      mockGenerateExercise.mockClear();

      render(
        <AIExerciseContainer
          {...defaultProps}
          exerciseType="multiple_choice"
          autoGenerate={true}
        />
      );

      expect(mockGenerateExercise).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'multiple_choice',
        difficulty: undefined,
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when generating', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: true,
        error: null,
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/Generating personalized exercise/i)).toBeInTheDocument();
    });

    it('should show AI-powered message during loading', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: true,
        error: null,
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/Using AI to create content just for you/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when generation fails', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: new Error('API failed'),
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/Failed to Generate Exercise/i)).toBeInTheDocument();
      expect(screen.getByText(/API failed/i)).toBeInTheDocument();
    });

    it('should show Try Again button on error', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: new Error('API failed'),
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const mockOnError = vi.fn();

      const testError = new Error('Test error');
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: testError,
        reset: mockReset,
      });

      render(<AIExerciseContainer {...defaultProps} onError={mockOnError} />);

      expect(mockOnError).toHaveBeenCalledWith(testError);
    });
  });

  describe('Unavailable State', () => {
    it('should display unavailable message when AI not available', () => {
      mockUseAIExerciseAvailability.mockReturnValue({
        isAvailable: false,
        reason: 'Backend server not connected',
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/AI Exercises Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend server not connected/i)).toBeInTheDocument();
    });

    it('should explain requirement for backend connection', () => {
      mockUseAIExerciseAvailability.mockReturnValue({
        isAvailable: false,
        reason: 'Static mode',
      });

      render(<AIExerciseContainer {...defaultProps} />);

      expect(
        screen.getByText(/AI-powered exercise generation requires a backend server connection/i)
      ).toBeInTheDocument();
    });
  });

  describe('Answer Handling', () => {
    it('should handle answer submission', async () => {
      const user = userEvent.setup();
      render(<AIExerciseContainer {...defaultProps} />);

      const answerButton = screen.getByText('Answer');
      await user.click(answerButton);

      await waitFor(() => {
        expect(screen.getByText(/Correct/i)).toBeInTheDocument();
      });
    });

    it('should call onComplete callback on answer', async () => {
      const mockOnComplete = vi.fn();
      const user = userEvent.setup();

      render(<AIExerciseContainer {...defaultProps} onComplete={mockOnComplete} />);

      const answerButton = screen.getByText('Answer');
      await user.click(answerButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should not allow answering after feedback shown', async () => {
      const user = userEvent.setup();
      render(<AIExerciseContainer {...defaultProps} />);

      const answerButton = screen.getByText('Answer');
      await user.click(answerButton);
      await user.click(answerButton); // Try again

      await waitFor(() => {
        // Should only have one feedback
        const feedback = screen.getAllByText(/Correct/i);
        expect(feedback.length).toBe(1);
      });
    });
  });

  describe('Next Exercise', () => {
    it('should change button text after answering', async () => {
      const user = userEvent.setup();
      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByText(/Skip Exercise/i)).toBeInTheDocument();

      const answerButton = screen.getByText('Answer');
      await user.click(answerButton);

      await waitFor(() => {
        expect(screen.getByText(/Next Exercise/i)).toBeInTheDocument();
      });
    });

    it('should generate new exercise when next button clicked', async () => {
      const user = userEvent.setup();
      render(<AIExerciseContainer {...defaultProps} />);

      mockGenerateExercise.mockClear();

      const nextButton = screen.getByText(/Skip Exercise/i);
      await user.click(nextButton);

      expect(mockGenerateExercise).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AIExerciseContainer {...defaultProps} />);

      expect(screen.getByRole('region', { name: /AI Exercise/i })).toBeInTheDocument();
    });

    it('should mark loading state with aria-live', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: true,
        error: null,
        reset: mockReset,
      });

      const { container } = render(<AIExerciseContainer {...defaultProps} />);

      const loadingStatus = container.querySelector('[role="status"][aria-live="polite"]');
      expect(loadingStatus).toBeInTheDocument();
    });

    it('should mark error with aria-live assertive', () => {
      mockUseGenerateAIExercise.mockReturnValue({
        mutate: mockGenerateExercise,
        data: null,
        isPending: false,
        error: new Error('Test error'),
        reset: mockReset,
      });

      const { container } = render(<AIExerciseContainer {...defaultProps} />);

      const errorAlert = container.querySelector('[role="alert"][aria-live="assertive"]');
      expect(errorAlert).toBeInTheDocument();
    });
  });
});
