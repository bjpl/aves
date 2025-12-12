import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { VisualDiscrimination } from '../../../components/exercises/VisualDiscrimination';
import type { VisualDiscriminationExercise } from '../../../../../shared/types/exercise.types';

describe('VisualDiscrimination', () => {
  const mockExercise: VisualDiscriminationExercise = {
    id: 'vd-1',
    type: 'visual_discrimination',
    instructions: 'Select the flamingo',
    targetTerm: 'el flamenco',
    options: [
      {
        id: 'opt-1',
        imageUrl: '/flamingo.jpg',
        species: 'flamingo',
      },
      {
        id: 'opt-2',
        imageUrl: '/eagle.jpg',
        species: 'eagle',
      },
      {
        id: 'opt-3',
        imageUrl: '/sparrow.jpg',
        species: 'sparrow',
      },
      {
        id: 'opt-4',
        imageUrl: '/owl.jpg',
        species: 'owl',
      },
    ],
    correctOptionId: 'opt-1',
  };

  const mockOnAnswer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText(mockExercise.instructions)).toBeInTheDocument();
    });

    it('should display target term', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText(mockExercise.targetTerm)).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(mockExercise.options.length);
    });

    it('should display option letters (A, B, C, D)', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should render in 2-column grid layout', () => {
      const { container } = render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onAnswer when option is clicked', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];
      await user.click(firstButton);

      expect(mockOnAnswer).toHaveBeenCalledTimes(1);
      expect(mockOnAnswer).toHaveBeenCalledWith('opt-1');
    });

    it('should not call onAnswer when disabled', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
          disabled={true}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];
      await user.click(firstButton);

      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should not allow multiple selections', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      await user.click(buttons[1]);

      expect(mockOnAnswer).toHaveBeenCalledTimes(1);
    });

    it('should apply hover styles', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];

      // Check that hover class is present in className (not necessarily applied)
      expect(firstButton).toHaveClass('hover:ring-2');
    });
  });

  describe('Visual Feedback', () => {
    it('should highlight selected option before answer', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];
      await user.click(firstButton);

      // After clicking, button should show feedback (green ring for correct)
      await waitFor(() => {
        expect(firstButton.className).toContain('ring-green-500');
      });
    });

    it('should show checkmark on correct answer', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const correctButton = screen.getAllByRole('button')[0];
      await user.click(correctButton);

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });

    it('should show X on incorrect answer', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectButton = screen.getAllByRole('button')[1];
      await user.click(incorrectButton);

      await waitFor(() => {
        expect(screen.getByText('✗')).toBeInTheDocument();
      });
    });

    it('should apply green ring to correct option after answer', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectButton = screen.getAllByRole('button')[1];
      await user.click(incorrectButton);

      await waitFor(() => {
        const correctButton = screen.getAllByRole('button')[0];
        expect(correctButton.className).toContain('ring-green-500');
      });
    });

    it('should apply red ring to incorrect selected option', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const incorrectButton = screen.getAllByRole('button')[1];
      await user.click(incorrectButton);

      await waitFor(() => {
        expect(incorrectButton.className).toContain('ring-red-500');
      });
    });

    it('should fade non-selected options after answer', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const firstButton = screen.getAllByRole('button')[0];
      await user.click(firstButton);

      await waitFor(() => {
        const unselectedButtons = screen
          .getAllByRole('button')
          .filter((btn, index) => index > 0);

        unselectedButtons.forEach((btn) => {
          expect(btn.className).toContain('opacity-50');
        });
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should change cursor style when disabled', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.className).toContain('cursor-default');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <VisualDiscrimination
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
        <VisualDiscrimination
          exercise={mockExercise}
          onAnswer={mockOnAnswer}
        />
      );

      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('.space-y-6')).toBeInTheDocument();
    });
  });
});
