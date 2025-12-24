import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { FeedbackDisplay } from '../../../components/practice/FeedbackDisplay';

describe('FeedbackDisplay', () => {
  describe('Correct Answer Feedback', () => {
    it('should render without crashing for correct answer', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="El pájaro" />);
      expect(screen.getByText(/¡Excelente! Correct!/i)).toBeInTheDocument();
    });

    it('should display success message when correct', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="La pluma" />);
      expect(screen.getByText('¡Excelente! Correct!')).toBeInTheDocument();
    });

    it('should apply green background for correct answer', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="El ala" />);
      const feedbackDiv = container.querySelector('.bg-green-100');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should apply green text for correct answer', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="El pico" />);
      const message = screen.getByText('¡Excelente! Correct!');
      expect(message).toHaveClass('text-green-700');
    });

    it('should not show correct answer when answer is correct', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="El nido" />);
      expect(screen.queryByText(/The answer was:/i)).not.toBeInTheDocument();
    });
  });

  describe('Incorrect Answer Feedback', () => {
    it('should render without crashing for incorrect answer', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El pájaro" />);
      expect(screen.getByText(/Not quite/i)).toBeInTheDocument();
    });

    it('should display error message when incorrect', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="La pluma" />);
      expect(screen.getByText('Not quite. The answer was: La pluma')).toBeInTheDocument();
    });

    it('should show the correct answer when incorrect', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El ala" />);
      expect(screen.getByText(/El ala/)).toBeInTheDocument();
    });

    it('should apply red background for incorrect answer', () => {
      const { container } = render(<FeedbackDisplay isCorrect={false} correctAnswer="El pico" />);
      const feedbackDiv = container.querySelector('.bg-red-100');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should apply red text for incorrect answer', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El nido" />);
      const message = screen.getByText(/Not quite/i);
      expect(message).toHaveClass('text-red-700');
    });
  });

  describe('Various Correct Answers', () => {
    it('should display simple Spanish term', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="gato" />);
      expect(screen.getByText(/gato/)).toBeInTheDocument();
    });

    it('should display term with article', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El gorrión" />);
      expect(screen.getByText(/El gorrión/)).toBeInTheDocument();
    });

    it('should display long answer text', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El águila calva americana" />);
      expect(screen.getByText(/El águila calva americana/)).toBeInTheDocument();
    });

    it('should display answer with special characters', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="El búho ñandú" />);
      expect(screen.getByText(/El búho ñandú/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should apply margin top', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const feedbackDiv = container.querySelector('.mt-6');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should apply padding', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const feedbackDiv = container.querySelector('.p-4');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should apply rounded corners', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const feedbackDiv = container.querySelector('.rounded-lg');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should center text', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const feedbackDiv = container.querySelector('.text-center');
      expect(feedbackDiv).toBeInTheDocument();
    });

    it('should use large bold text', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const message = screen.getByText(/¡Excelente!/);
      expect(message).toHaveClass('text-lg', 'font-bold');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const { container } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should have readable text for correct state', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const message = screen.getByText('¡Excelente! Correct!');
      expect(message).toBeVisible();
    });

    it('should have readable text for incorrect state', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="test" />);
      const message = screen.getByText(/Not quite/);
      expect(message).toBeVisible();
    });

    it('should provide sufficient color contrast for green state', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      const message = screen.getByText('¡Excelente! Correct!');
      expect(message).toHaveClass('text-green-700');
    });

    it('should provide sufficient color contrast for red state', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="test" />);
      const message = screen.getByText(/Not quite/);
      expect(message).toHaveClass('text-red-700');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty correct answer', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="" />);
      expect(screen.getByText('Not quite. The answer was:')).toBeInTheDocument();
    });

    it('should handle very long correct answer', () => {
      const longAnswer = 'A'.repeat(100);
      render(<FeedbackDisplay isCorrect={false} correctAnswer={longAnswer} />);
      expect(screen.getByText(new RegExp(longAnswer))).toBeInTheDocument();
    });

    it('should handle correct answer with numbers', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="123 pájaros" />);
      expect(screen.getByText(/123 pájaros/)).toBeInTheDocument();
    });

    it('should handle correct answer with punctuation', () => {
      render(<FeedbackDisplay isCorrect={false} correctAnswer="¿El pájaro?" />);
      expect(screen.getByText(/¿El pájaro?/)).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should toggle between correct and incorrect styles', () => {
      const { rerender, container, unmount } = render(
        <FeedbackDisplay isCorrect={true} correctAnswer="test" />
      );
      expect(container.querySelector('.bg-green-100')).toBeInTheDocument();

      unmount();
      const { container: newContainer } = render(<FeedbackDisplay isCorrect={false} correctAnswer="test" />);
      expect(newContainer.querySelector('.bg-red-100')).toBeInTheDocument();
      expect(newContainer.querySelector('.bg-green-100')).not.toBeInTheDocument();
    });

    it('should update message when isCorrect changes', () => {
      const { rerender } = render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      expect(screen.getByText('¡Excelente! Correct!')).toBeInTheDocument();

      rerender(<FeedbackDisplay isCorrect={false} correctAnswer="test" />);
      expect(screen.queryByText('¡Excelente! Correct!')).not.toBeInTheDocument();
      expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    });

    it('should update correct answer when prop changes', () => {
      const { rerender } = render(<FeedbackDisplay isCorrect={false} correctAnswer="first" />);
      expect(screen.getByText(/first/)).toBeInTheDocument();

      rerender(<FeedbackDisplay isCorrect={false} correctAnswer="second" />);
      expect(screen.getByText(/second/)).toBeInTheDocument();
      expect(screen.queryByText(/first/)).not.toBeInTheDocument();
    });
  });

  describe('Bilingual Support', () => {
    it('should display Spanish exclamation in success message', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      expect(screen.getByText(/¡Excelente!/)).toBeInTheDocument();
    });

    it('should display English translation in success message', () => {
      render(<FeedbackDisplay isCorrect={true} correctAnswer="test" />);
      expect(screen.getByText(/Correct!/)).toBeInTheDocument();
    });
  });
});
