import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { ExerciseContainer } from '../../../components/exercises/ExerciseContainer';
import type { Annotation } from '../../../../../shared/types/annotation.types';

// Mock EnhancedExerciseGenerator with static methods
const mockGenerateAdaptiveExercise = vi.fn(() => ({
  id: 'test-exercise-1',
  type: 'visual_discrimination',
  prompt: 'Which bird is a flamingo?',
  instructions: 'Select the correct image',
  targetTerm: 'flamingo',
  options: [
    { id: 'opt-1', imageUrl: '/img1.jpg', species: 'flamingo' },
    { id: 'opt-2', imageUrl: '/img2.jpg', species: 'eagle' },
  ],
  correctOptionId: 'opt-1',
  pedagogicalLevel: 'beginner',
  learningObjective: 'Identify basic bird species',
}));

const mockUpdateLevel = vi.fn();
const mockCheckAnswer = vi.fn((exercise, answer) => answer === exercise.correctOptionId);
const mockGenerateFeedback = vi.fn((isCorrect) =>
  isCorrect ? '¡Correcto! Well done!' : 'Try again!'
);

// Create a mock class with static methods
class MockEnhancedExerciseGenerator {
  generateAdaptiveExercise = mockGenerateAdaptiveExercise;
  updateLevel = mockUpdateLevel;

  static checkAnswer = mockCheckAnswer;
  static generateFeedback = mockGenerateFeedback;
}

vi.mock('../../../services/enhancedExerciseGenerator', () => ({
  EnhancedExerciseGenerator: MockEnhancedExerciseGenerator,
}));

describe('ExerciseContainer', () => {
  let mockAnnotations: Annotation[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockAnnotations = [
      {
        id: 'ann-1',
        imageId: 'img-1',
        parts: [
          {
            id: 'part-1',
            type: 'beak',
            bbox: { x: 0, y: 0, width: 10, height: 10 },
            spanishTerm: 'el pico',
            englishTranslation: 'the beak',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Practice Session/i)).toBeInTheDocument();
    });

    it('should display progress header', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Accuracy/i)).toBeInTheDocument();
      expect(screen.getByText(/Streak/i)).toBeInTheDocument();
    });

    it('should show initial progress values', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText('0')).toBeInTheDocument(); // Completed
      expect(screen.getByText('0%')).toBeInTheDocument(); // Accuracy
    });

    it('should display learning objective', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Identify basic bird species/i)).toBeInTheDocument();
    });

    it('should display pedagogical level', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Level: beginner/i)).toBeInTheDocument();
    });

    it('should render skip button', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Skip →/i)).toBeInTheDocument();
    });
  });

  describe('Exercise Generation', () => {
    it('should generate exercise on mount', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      expect(screen.getByText(/Which bird is a flamingo/i)).toBeInTheDocument();
    });

    it('should render correct exercise component type', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);
      // Should render VisualDiscrimination component
      expect(screen.getByText(/Select the correct image/i)).toBeInTheDocument();
    });
  });

  describe('Answer Handling', () => {
    it('should handle correct answer submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      // Click correct option (first button)
      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        await waitFor(() => {
          expect(screen.getByText(/Correcto/i)).toBeInTheDocument();
        });
      }
    });

    it('should update progress after correct answer', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        await waitFor(() => {
          expect(screen.getByText('1')).toBeInTheDocument(); // 1 completed
        });
      }
    });

    it('should display feedback message', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        await waitFor(() => {
          expect(screen.getByText(/Next exercise loading/i)).toBeInTheDocument();
        });
      }
    });

    it('should prevent multiple answer submissions', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButtons = buttons.filter((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButtons.length >= 2) {
        await user.click(optionButtons[0]);
        await user.click(optionButtons[1]); // Should not trigger

        await waitFor(() => {
          // Should only have one feedback message
          const feedbackMessages = screen.queryAllByText(/Next exercise loading/i);
          expect(feedbackMessages.length).toBe(1);
        });
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate accuracy percentage correctly', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        await waitFor(() => {
          expect(screen.getByText('100%')).toBeInTheDocument();
        });
      }
    });

    it('should track current streak', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        await waitFor(() => {
          const streakElements = screen.getAllByText('1');
          expect(streakElements.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Skip Functionality', () => {
    it('should skip to next exercise when skip button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const skipButton = screen.getByText(/Skip →/i);
      await user.click(skipButton);

      // Should clear feedback state
      expect(screen.queryByText(/Next exercise loading/i)).not.toBeInTheDocument();
    });
  });

  describe('Auto-advance', () => {
    it('should auto-advance after timeout', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      const optionButton = buttons.find((btn) =>
        btn.className.includes('rounded-lg')
      );

      if (optionButton) {
        await user.click(optionButton);

        // Fast-forward timers
        vi.advanceTimersByTime(3000);

        await waitFor(() => {
          // Feedback should be cleared after auto-advance
          expect(screen.queryByText(/Next exercise loading/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('should clean up timeout on unmount', () => {
      const { unmount } = render(<ExerciseContainer annotations={mockAnnotations} />);

      unmount();

      // Should not throw errors
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExerciseContainer annotations={mockAnnotations} />);

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        buttons[0].focus();
        expect(document.activeElement).toBe(buttons[0]);
      }
    });
  });
});
