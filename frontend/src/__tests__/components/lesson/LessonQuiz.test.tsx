import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { LessonQuiz } from '../../../components/lesson/LessonQuiz';

describe('LessonQuiz', () => {
  const mockOnAnswerChange = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnComplete = vi.fn();

  const sampleQuizzes = [
    {
      id: 1,
      attributes: {
        question: 'What is a bird?',
        type: 'multiple_choice',
        points: 10,
        options: ['An animal', 'A plant', 'A mineral'],
        explanation: 'Birds are warm-blooded animals.',
      },
    },
    {
      id: 2,
      attributes: {
        question: 'Birds can fly?',
        type: 'true_false',
        points: 5,
        explanation: 'Most birds can fly, but not all.',
      },
    },
  ];

  const defaultProps = {
    quizzes: sampleQuizzes,
    quizAnswers: {},
    quizResults: {},
    quizScore: { correct: 0, total: 0 },
    onAnswerChange: mockOnAnswerChange,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('Lesson Quiz')).toBeInTheDocument();
    });

    it('should display all questions', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('What is a bird?')).toBeInTheDocument();
      expect(screen.getByText('Birds can fly?')).toBeInTheDocument();
    });

    it('should show question numbers', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    it('should display point values', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('10 points')).toBeInTheDocument();
      expect(screen.getByText('5 points')).toBeInTheDocument();
    });
  });

  describe('Multiple Choice Questions', () => {
    it('should render multiple choice options', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('An animal')).toBeInTheDocument();
      expect(screen.getByText('A plant')).toBeInTheDocument();
      expect(screen.getByText('A mineral')).toBeInTheDocument();
    });

    it('should handle multiple choice selection', async () => {
      const user = userEvent.setup();
      render(<LessonQuiz {...defaultProps} />);

      const radioButton = screen.getByDisplayValue('An animal');
      await user.click(radioButton);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(1, 'An animal');
    });

    it('should use radio inputs for multiple choice', () => {
      render(<LessonQuiz {...defaultProps} />);
      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs.length).toBeGreaterThan(0);
    });

    it('should group radio buttons by question', () => {
      const { container } = render(<LessonQuiz {...defaultProps} />);
      const radioButton = screen.getByDisplayValue('An animal');
      expect(radioButton).toHaveAttribute('name', 'quiz-1');
    });
  });

  describe('True/False Questions', () => {
    it('should render true/false options', () => {
      render(<LessonQuiz {...defaultProps} />);
      const trueOptions = screen.getAllByText('True');
      const falseOptions = screen.getAllByText('False');
      expect(trueOptions.length).toBeGreaterThan(0);
      expect(falseOptions.length).toBeGreaterThan(0);
    });

    it('should handle true/false selection', async () => {
      const user = userEvent.setup();
      render(<LessonQuiz {...defaultProps} />);

      const trueButtons = screen.getAllByDisplayValue('true');
      await user.click(trueButtons[0]);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(2, 'true');
    });

    it('should convert true/false to lowercase values', async () => {
      const user = userEvent.setup();
      render(<LessonQuiz {...defaultProps} />);

      const falseButtons = screen.getAllByDisplayValue('false');
      await user.click(falseButtons[0]);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(2, 'false');
    });
  });

  describe('Submit Button', () => {
    it('should show submit button before submission', () => {
      render(<LessonQuiz {...defaultProps} />);
      expect(screen.getByText('Submit Quiz')).toBeInTheDocument();
    });

    it('should disable submit button when not all answered', () => {
      render(<LessonQuiz {...defaultProps} />);
      const submitButton = screen.getByText('Submit Quiz');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when all answered', () => {
      const propsWithAnswers = {
        ...defaultProps,
        quizAnswers: { 1: 'An animal', 2: 'true' },
      };
      render(<LessonQuiz {...propsWithAnswers} />);

      const submitButton = screen.getByText('Submit Quiz');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call onSubmit when clicked', async () => {
      const user = userEvent.setup();
      const propsWithAnswers = {
        ...defaultProps,
        quizAnswers: { 1: 'An animal', 2: 'true' },
      };
      render(<LessonQuiz {...propsWithAnswers} />);

      await user.click(screen.getByText('Submit Quiz'));
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Quiz Results', () => {
    it('should display feedback for correct answer', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
      };
      render(<LessonQuiz {...propsWithResults} />);

      expect(screen.getByText('Correct!')).toBeInTheDocument();
    });

    it('should display feedback for incorrect answer', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: false },
      };
      render(<LessonQuiz {...propsWithResults} />);

      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });

    it('should show explanation after submission', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
      };
      render(<LessonQuiz {...propsWithResults} />);

      expect(screen.getByText('Birds are warm-blooded animals.')).toBeInTheDocument();
    });

    it('should apply green background for correct answers', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
      };
      const { container } = render(<LessonQuiz {...propsWithResults} />);

      const correctFeedback = container.querySelector('.bg-green-50');
      expect(correctFeedback).toBeInTheDocument();
    });

    it('should apply red background for incorrect answers', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: false },
      };
      const { container } = render(<LessonQuiz {...propsWithResults} />);

      const incorrectFeedback = container.querySelector('.bg-red-50');
      expect(incorrectFeedback).toBeInTheDocument();
    });

    it('should disable inputs after submission', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
      };
      render(<LessonQuiz {...propsWithResults} />);

      const radioButton = screen.getByDisplayValue('An animal');
      expect(radioButton).toBeDisabled();
    });
  });

  describe('Score Display', () => {
    it('should show score after submission', () => {
      const propsWithScore = {
        ...defaultProps,
        quizResults: { 1: true, 2: false },
        quizScore: { correct: 1, total: 2 },
      };
      render(<LessonQuiz {...propsWithScore} />);

      expect(screen.getByText('You scored 1 out of 2!')).toBeInTheDocument();
    });

    it('should show perfect score', () => {
      const propsWithPerfectScore = {
        ...defaultProps,
        quizResults: { 1: true, 2: true },
        quizScore: { correct: 2, total: 2 },
      };
      render(<LessonQuiz {...propsWithPerfectScore} />);

      expect(screen.getByText('You scored 2 out of 2!')).toBeInTheDocument();
    });

    it('should show zero score', () => {
      const propsWithZeroScore = {
        ...defaultProps,
        quizResults: { 1: false, 2: false },
        quizScore: { correct: 0, total: 2 },
      };
      render(<LessonQuiz {...propsWithZeroScore} />);

      expect(screen.getByText('You scored 0 out of 2!')).toBeInTheDocument();
    });
  });

  describe('Complete Button', () => {
    it('should show complete button after submission when provided', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true, 2: true },
        quizScore: { correct: 2, total: 2 },
        onComplete: mockOnComplete,
      };
      render(<LessonQuiz {...propsWithResults} />);

      expect(screen.getByText('Complete Lesson')).toBeInTheDocument();
    });

    it('should call onComplete when clicked', async () => {
      const user = userEvent.setup();
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true, 2: true },
        quizScore: { correct: 2, total: 2 },
        onComplete: mockOnComplete,
      };
      render(<LessonQuiz {...propsWithResults} />);

      await user.click(screen.getByText('Complete Lesson'));
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('should not show complete button when callback not provided', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
        quizScore: { correct: 1, total: 2 },
      };
      render(<LessonQuiz {...propsWithResults} />);

      expect(screen.queryByText('Complete Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Empty Quiz State', () => {
    it('should show message when no quizzes available', () => {
      const emptyProps = {
        ...defaultProps,
        quizzes: [],
      };
      render(<LessonQuiz {...emptyProps} />);

      expect(screen.getByText('No quiz available for this lesson.')).toBeInTheDocument();
    });

    it('should show complete button in empty state when provided', () => {
      const emptyProps = {
        ...defaultProps,
        quizzes: [],
        onComplete: mockOnComplete,
      };
      render(<LessonQuiz {...emptyProps} />);

      expect(screen.getByText('Complete Lesson')).toBeInTheDocument();
    });

    it('should call onComplete from empty state', async () => {
      const user = userEvent.setup();
      const emptyProps = {
        ...defaultProps,
        quizzes: [],
        onComplete: mockOnComplete,
      };
      render(<LessonQuiz {...emptyProps} />);

      await user.click(screen.getByText('Complete Lesson'));
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('should show check icon for correct answer', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: true },
      };
      const { container } = render(<LessonQuiz {...propsWithResults} />);

      // CheckCircle icon should be rendered
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('should show X icon for incorrect answer', () => {
      const propsWithResults = {
        ...defaultProps,
        quizResults: { 1: false },
      };
      const { container } = render(<LessonQuiz {...propsWithResults} />);

      // XCircle icon should be rendered
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should use radio groups for quiz questions', () => {
      render(<LessonQuiz {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThan(0);
    });

    it('should have clickable labels', () => {
      const { container } = render(<LessonQuiz {...defaultProps} />);
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach(label => {
        expect(label).toHaveClass('cursor-pointer');
      });
    });

    it('should have submit button with proper semantics', () => {
      const propsWithAnswers = {
        ...defaultProps,
        quizAnswers: { 1: 'An animal', 2: 'true' },
      };
      render(<LessonQuiz {...propsWithAnswers} />);

      const submitButton = screen.getByRole('button', { name: /Submit Quiz/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle quiz without options', () => {
      const quizWithoutOptions = [
        {
          id: 3,
          attributes: {
            question: 'Question without options',
            type: 'multiple_choice',
            points: 5,
          },
        },
      ];
      const props = { ...defaultProps, quizzes: quizWithoutOptions };
      render(<LessonQuiz {...props} />);

      expect(screen.getByText('Question without options')).toBeInTheDocument();
    });

    it('should handle quiz without explanation', () => {
      const quizWithoutExplanation = [
        {
          id: 4,
          attributes: {
            question: 'Test question',
            type: 'true_false',
            points: 5,
          },
        },
      ];
      const props = {
        ...defaultProps,
        quizzes: quizWithoutExplanation,
        quizResults: { 4: true },
      };
      render(<LessonQuiz {...props} />);

      expect(screen.queryByText(/explanation/i)).not.toBeInTheDocument();
    });

    it('should handle partial quiz results', () => {
      const props = {
        ...defaultProps,
        quizResults: { 1: true }, // Only first question answered
      };
      render(<LessonQuiz {...props} />);

      // First question should show feedback
      expect(screen.getByText('Correct!')).toBeInTheDocument();

      // Second question should still be interactive
      const trueButtons = screen.getAllByDisplayValue('true');
      expect(trueButtons[0]).not.toBeDisabled();
    });
  });

  describe('Layout and Styling', () => {
    it('should apply spacing between questions', () => {
      const { container } = render(<LessonQuiz {...defaultProps} />);
      const spacingDiv = container.querySelector('.space-y-6');
      expect(spacingDiv).toBeInTheDocument();
    });

    it('should use bordered cards for questions', () => {
      const { container } = render(<LessonQuiz {...defaultProps} />);
      const cards = container.querySelectorAll('.border.rounded-lg');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should apply full width to submit button', () => {
      render(<LessonQuiz {...defaultProps} />);
      const submitButton = screen.getByText('Submit Quiz');
      expect(submitButton).toHaveClass('w-full');
    });
  });
});
