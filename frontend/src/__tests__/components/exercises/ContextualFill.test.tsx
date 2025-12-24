import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { ContextualFill } from '../../../components/exercises/ContextualFill';
import type { ContextualFillExercise } from '../../../../../shared/types/exercise.types';

describe('ContextualFill', () => {
  const mockExercise: ContextualFillExercise = {
    id: 'cf-1',
    type: 'contextual_fill',
    instructions: 'Fill in the blank with the correct word',
    sentence: 'El flamenco tiene un ___ largo y rosado.',
    correctAnswer: 'cuello',
    options: ['cuello', 'pico', 'ala', 'pluma'],
  };

  const mockOnAnswer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText(mockExercise.instructions)).toBeInTheDocument();
    });

    it('should display sentence with blank', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText(/El flamenco tiene un/i)).toBeInTheDocument();
      expect(screen.getByText(/largo y rosado/i)).toBeInTheDocument();
    });

    it('should show blank placeholder initially', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText('___')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      mockExercise.options.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('should display option letters (A, B, C, D)', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/A\./)).toBeInTheDocument();
      expect(screen.getByText(/B\./)).toBeInTheDocument();
      expect(screen.getByText(/C\./)).toBeInTheDocument();
      expect(screen.getByText(/D\./)).toBeInTheDocument();
    });

    it('should render in 2-column grid', () => {
      const { container } = render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onAnswer when option is selected', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      expect(mockOnAnswer).toHaveBeenCalledTimes(1);
      expect(mockOnAnswer).toHaveBeenCalledWith(mockExercise.options[0]);
    });

    it('should fill blank with selected answer', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      await waitFor(() => {
        expect(screen.queryByText('___')).not.toBeInTheDocument();
      });
    });

    it('should not allow multiple selections', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const options = mockExercise.options.map((opt) => screen.getByText(opt));
      await user.click(options[0]);
      await user.click(options[1]);

      expect(mockOnAnswer).toHaveBeenCalledTimes(1);
    });

    it('should not call onAnswer when disabled', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
          disabled={true}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      expect(mockOnAnswer).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback - Correct Answer', () => {
    it('should highlight correct answer in green', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const correctOption = screen.getByText(mockExercise.correctAnswer);
      await user.click(correctOption);

      await waitFor(() => {
        expect(correctOption.closest('button')).toHaveClass('bg-green-500');
      });
    });

    it('should show checkmark on correct answer', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const correctOption = screen.getByText(mockExercise.correctAnswer);
      await user.click(correctOption);

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });

    it('should display success message', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const correctOption = screen.getByText(mockExercise.correctAnswer);
      await user.click(correctOption);

      await waitFor(() => {
        expect(screen.getByText(/¡Correcto!/i)).toBeInTheDocument();
      });
    });

    it('should fill blank with correct answer in green', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const correctOption = screen.getByText(mockExercise.correctAnswer);
      await user.click(correctOption);

      await waitFor(() => {
        const blankSpans = screen.getAllByText(mockExercise.correctAnswer);
        // Find the span in the sentence (not in the button)
        const sentenceSpan = blankSpans.find(el => el.tagName === 'SPAN' && el.className.includes('text-green-600'));
        expect(sentenceSpan).toBeDefined();
        expect(sentenceSpan).toHaveClass('text-green-600');
      });
    });
  });

  describe('Visual Feedback - Incorrect Answer', () => {
    it('should highlight incorrect answer in red', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectOption = screen.getByText(mockExercise.options[1]);
      await user.click(incorrectOption);

      await waitFor(() => {
        expect(incorrectOption.closest('button')).toHaveClass('bg-red-500');
      });
    });

    it('should show X on incorrect answer', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectOption = screen.getByText(mockExercise.options[1]);
      await user.click(incorrectOption);

      await waitFor(() => {
        expect(screen.getByText('✗')).toBeInTheDocument();
      });
    });

    it('should display error message with correct answer', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectOption = screen.getByText(mockExercise.options[1]);
      await user.click(incorrectOption);

      await waitFor(() => {
        expect(screen.getByText(/Incorrect/i)).toBeInTheDocument();
        expect(screen.getByText(/The answer was:/i)).toBeInTheDocument();
      });
    });

    it('should show correct answer after wrong selection', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectOption = screen.getByText(mockExercise.options[1]);
      await user.click(incorrectOption);

      await waitFor(() => {
        const correctAnswerInMessage = screen.getAllByText(mockExercise.correctAnswer);
        expect(correctAnswerInMessage.length).toBeGreaterThan(1);
      });
    });

    it('should fill blank with incorrect answer in red', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectOption = screen.getByText(mockExercise.options[1]);
      await user.click(incorrectOption);

      await waitFor(() => {
        const blankSpans = screen.getAllByText(mockExercise.options[1]);
        // Find the span in the sentence (not in the button)
        const sentenceSpan = blankSpans.find(el => el.tagName === 'SPAN' && el.className.includes('text-red-600'));
        expect(sentenceSpan).toBeDefined();
        expect(sentenceSpan).toHaveClass('text-red-600');
      });
    });

    it('should fade non-selected options', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      await waitFor(() => {
        const unselectedButtons = screen
          .getAllByRole('button')
          .filter((btn) => !btn.textContent?.includes(mockExercise.options[0]));

        unselectedButtons.forEach((btn) => {
          expect(btn).toHaveClass('bg-gray-100');
        });
      });
    });
  });

  describe('Button States', () => {
    it('should disable all buttons after selection', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((btn) => {
          expect(btn).toBeDisabled();
        });
      });
    });

    it('should change cursor to default after selection', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstOption = screen.getByText(mockExercise.options[0]);
      await user.click(firstOption);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((btn) => {
          expect(btn).toHaveClass('cursor-default');
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(mockExercise.options.length);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      await user.keyboard('{Enter}');

      expect(mockOnAnswer).toHaveBeenCalled();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(
        <ContextualFill
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('.space-y-6')).toBeInTheDocument();
    });
  });
});
