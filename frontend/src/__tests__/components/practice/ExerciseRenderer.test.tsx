import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { ExerciseRenderer } from '../../../components/practice/ExerciseRenderer';

describe('ExerciseRenderer', () => {
  const mockOnAnswer = vi.fn();

  const baseProps = {
    question: '¿Qué pájaro es este?',
    options: ['Gorrión', 'Águila', 'Búho', 'Flamenco'],
    selectedAnswer: null,
    correctAnswer: 'Gorrión',
    showFeedback: false,
    onAnswer: mockOnAnswer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual Match Type', () => {
    const visualMatchProps = {
      ...baseProps,
      type: 'visual_match' as const,
      imageUrl: 'https://example.com/bird.jpg',
    };

    it('should render visual match exercise', () => {
      render(<ExerciseRenderer {...visualMatchProps} />);
      expect(screen.getByText('¿Qué pájaro es este?')).toBeInTheDocument();
    });

    it('should display bird image', () => {
      render(<ExerciseRenderer {...visualMatchProps} />);
      const image = screen.getByAltText('Bird to identify');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/bird.jpg');
    });

    it('should render all options in grid', () => {
      render(<ExerciseRenderer {...visualMatchProps} />);
      expect(screen.getByText('Gorrión')).toBeInTheDocument();
      expect(screen.getByText('Águila')).toBeInTheDocument();
      expect(screen.getByText('Búho')).toBeInTheDocument();
      expect(screen.getByText('Flamenco')).toBeInTheDocument();
    });

    it('should handle option click', async () => {
      const user = userEvent.setup();
      render(<ExerciseRenderer {...visualMatchProps} />);

      await user.click(screen.getByText('Gorrión'));
      expect(mockOnAnswer).toHaveBeenCalledWith('Gorrión');
    });

    it('should not render without image URL', () => {
      const propsWithoutImage = { ...visualMatchProps, imageUrl: undefined };
      render(<ExerciseRenderer {...propsWithoutImage} />);
      expect(screen.queryByAltText('Bird to identify')).not.toBeInTheDocument();
    });

    it('should use 2-column grid layout', () => {
      const { container } = render(<ExerciseRenderer {...visualMatchProps} />);
      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Fill in the Blank Type', () => {
    const fillBlankProps = {
      ...baseProps,
      type: 'fill_blank' as const,
      question: 'El ___ vuela alto.',
      translation: 'The ___ flies high.',
    };

    it('should render fill blank exercise', () => {
      render(<ExerciseRenderer {...fillBlankProps} />);
      expect(screen.getByText('El ___ vuela alto.')).toBeInTheDocument();
    });

    it('should display translation', () => {
      render(<ExerciseRenderer {...fillBlankProps} />);
      expect(screen.getByText('The ___ flies high.')).toBeInTheDocument();
    });

    it('should render options as buttons', () => {
      render(<ExerciseRenderer {...fillBlankProps} />);
      baseProps.options.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('should handle option selection', async () => {
      const user = userEvent.setup();
      render(<ExerciseRenderer {...fillBlankProps} />);

      await user.click(screen.getByText('Águila'));
      expect(mockOnAnswer).toHaveBeenCalledWith('Águila');
    });

    it('should render without translation when not provided', () => {
      const propsWithoutTranslation = { ...fillBlankProps, translation: undefined };
      render(<ExerciseRenderer {...propsWithoutTranslation} />);
      expect(screen.queryByText(/flies high/)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Choice Type', () => {
    const multipleChoiceProps = {
      ...baseProps,
      type: 'multiple_choice' as const,
      explanation: 'Sparrows are small birds.',
    };

    it('should render multiple choice exercise', () => {
      render(<ExerciseRenderer {...multipleChoiceProps} />);
      expect(screen.getByText('¿Qué pájaro es este?')).toBeInTheDocument();
    });

    it('should render options vertically', () => {
      const { container } = render(<ExerciseRenderer {...multipleChoiceProps} />);
      const optionsContainer = container.querySelector('.space-y-3');
      expect(optionsContainer).toBeInTheDocument();
    });

    it('should handle answer selection', async () => {
      const user = userEvent.setup();
      render(<ExerciseRenderer {...multipleChoiceProps} />);

      await user.click(screen.getByText('Búho'));
      expect(mockOnAnswer).toHaveBeenCalledWith('Búho');
    });

    it('should show explanation after feedback', () => {
      const propsWithFeedback = { ...multipleChoiceProps, showFeedback: true };
      render(<ExerciseRenderer {...propsWithFeedback} />);
      expect(screen.getByText('Sparrows are small birds.')).toBeInTheDocument();
    });

    it('should not show explanation before feedback', () => {
      render(<ExerciseRenderer {...multipleChoiceProps} />);
      expect(screen.queryByText('Sparrows are small birds.')).not.toBeInTheDocument();
    });

    it('should render without explanation when not provided', () => {
      const propsWithoutExplanation = { ...multipleChoiceProps, explanation: undefined, showFeedback: true };
      render(<ExerciseRenderer {...propsWithoutExplanation} />);
      expect(screen.queryByText(/Sparrows/)).not.toBeInTheDocument();
    });
  });

  describe('Answer Selection and Feedback', () => {
    it('should highlight selected answer', () => {
      const propsWithSelection = {
        ...baseProps,
        type: 'multiple_choice' as const,
        selectedAnswer: 'Gorrión',
      };
      render(<ExerciseRenderer {...propsWithSelection} />);

      const selectedButton = screen.getByText('Gorrión');
      expect(selectedButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should show correct answer in green when feedback shown', () => {
      const propsWithFeedback = {
        ...baseProps,
        type: 'multiple_choice' as const,
        showFeedback: true,
      };
      render(<ExerciseRenderer {...propsWithFeedback} />);

      const correctButton = screen.getByText('Gorrión');
      expect(correctButton).toHaveClass('bg-green-500', 'text-white');
    });

    it('should show incorrect answer in red when feedback shown', () => {
      const propsWithWrongAnswer = {
        ...baseProps,
        type: 'multiple_choice' as const,
        selectedAnswer: 'Águila',
        showFeedback: true,
      };
      render(<ExerciseRenderer {...propsWithWrongAnswer} />);

      const incorrectButton = screen.getByText('Águila');
      expect(incorrectButton).toHaveClass('bg-red-500', 'text-white');
    });

    it('should disable buttons when feedback is shown', async () => {
      const user = userEvent.setup();
      const propsWithFeedback = {
        ...baseProps,
        type: 'multiple_choice' as const,
        showFeedback: true,
      };
      render(<ExerciseRenderer {...propsWithFeedback} />);

      const button = screen.getByText('Águila');
      expect(button).toBeDisabled();

      await user.click(button);
      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should apply hover styles to unselected options', () => {
      render(<ExerciseRenderer {...baseProps} type="multiple_choice" />);

      const button = screen.getByText('Búho');
      expect(button).toHaveClass('hover:border-blue-400');
    });
  });

  describe('Button Styling Logic', () => {
    it('should use default style for unselected option', () => {
      render(<ExerciseRenderer {...baseProps} type="multiple_choice" />);

      const button = screen.getByText('Búho');
      expect(button).toHaveClass('bg-white', 'border-2', 'border-gray-300');
    });

    it('should highlight correct answer even if not selected', () => {
      const props = {
        ...baseProps,
        type: 'multiple_choice' as const,
        selectedAnswer: 'Águila',
        showFeedback: true,
      };
      render(<ExerciseRenderer {...props} />);

      const correctButton = screen.getByText('Gorrión');
      expect(correctButton).toHaveClass('bg-green-500');
    });
  });

  describe('Invalid Type Handling', () => {
    it('should return null for unknown exercise type', () => {
      const invalidProps = {
        ...baseProps,
        type: 'unknown' as any,
      };
      const { container } = render(<ExerciseRenderer {...invalidProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable buttons', () => {
      render(<ExerciseRenderer {...baseProps} type="multiple_choice" />);

      baseProps.options.forEach(option => {
        const button = screen.getByText(option);
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have accessible image alt text', () => {
      const props = {
        ...baseProps,
        type: 'visual_match' as const,
        imageUrl: 'test.jpg',
      };
      render(<ExerciseRenderer {...props} />);

      const image = screen.getByAltText('Bird to identify');
      expect(image).toBeInTheDocument();
    });

    it('should maintain focus on interactive elements', async () => {
      const user = userEvent.setup();
      render(<ExerciseRenderer {...baseProps} type="multiple_choice" />);

      const button = screen.getByText('Gorrión');
      await user.tab();
      // Button should be focusable
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      const emptyOptionsProps = { ...baseProps, type: 'multiple_choice' as const, options: [] };
      render(<ExerciseRenderer {...emptyOptionsProps} />);
      expect(screen.getByText('¿Qué pájaro es este?')).toBeInTheDocument();
    });

    it('should handle single option', () => {
      const singleOptionProps = {
        ...baseProps,
        type: 'multiple_choice' as const,
        options: ['Only Option'],
      };
      render(<ExerciseRenderer {...singleOptionProps} />);
      expect(screen.getByText('Only Option')).toBeInTheDocument();
    });

    it('should handle very long question text', () => {
      const longQuestionProps = {
        ...baseProps,
        type: 'multiple_choice' as const,
        question: 'A'.repeat(200),
      };
      render(<ExerciseRenderer {...longQuestionProps} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle special characters in options', () => {
      const specialCharsProps = {
        ...baseProps,
        type: 'multiple_choice' as const,
        options: ['Ñandú', 'Búho', 'Águila', 'Colibrí'],
      };
      render(<ExerciseRenderer {...specialCharsProps} />);
      expect(screen.getByText('Ñandú')).toBeInTheDocument();
      expect(screen.getByText('Colibrí')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should apply spacing classes', () => {
      const { container } = render(<ExerciseRenderer {...baseProps} type="visual_match" imageUrl="test.jpg" />);
      const spacingDiv = container.querySelector('.space-y-6');
      expect(spacingDiv).toBeInTheDocument();
    });

    it('should use centered layout for headings', () => {
      render(<ExerciseRenderer {...baseProps} type="multiple_choice" />);
      const heading = screen.getByText('¿Qué pájaro es este?');
      expect(heading).toHaveClass('text-center');
    });

    it('should apply max-width to option containers', () => {
      const { container } = render(<ExerciseRenderer {...baseProps} type="fill_blank" />);
      const maxWidthDiv = container.querySelector('.max-w-md');
      expect(maxWidthDiv).toBeInTheDocument();
    });
  });
});
