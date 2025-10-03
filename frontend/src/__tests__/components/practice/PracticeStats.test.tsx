import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { PracticeStats } from '../../../components/practice/PracticeStats';

describe('PracticeStats', () => {
  const defaultProps = {
    score: 15,
    accuracy: 85,
    streak: 3,
    totalAttempts: 20,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<PracticeStats {...defaultProps} />);
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display score correctly', () => {
      render(<PracticeStats {...defaultProps} />);
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });

    it('should display accuracy with percentage', () => {
      render(<PracticeStats {...defaultProps} />);
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });

    it('should display streak count', () => {
      render(<PracticeStats {...defaultProps} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
    });

    it('should display total attempts', () => {
      render(<PracticeStats {...defaultProps} />);
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should render all four stat cards', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const statCards = container.querySelectorAll('.bg-white.rounded-lg.p-4');
      expect(statCards.length).toBe(4);
    });
  });

  describe('Zero Values', () => {
    it('should handle zero score', () => {
      render(<PracticeStats {...defaultProps} score={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle zero accuracy', () => {
      render(<PracticeStats {...defaultProps} accuracy={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle zero streak', () => {
      render(<PracticeStats {...defaultProps} streak={0} />);
      expect(screen.getAllByText('0')[0]).toBeInTheDocument();
    });

    it('should handle all zeros', () => {
      render(<PracticeStats score={0} accuracy={0} streak={0} totalAttempts={0} />);
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('High Values', () => {
    it('should handle perfect accuracy', () => {
      render(<PracticeStats {...defaultProps} accuracy={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle large score values', () => {
      render(<PracticeStats {...defaultProps} score={999} />);
      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should handle long streak', () => {
      render(<PracticeStats {...defaultProps} streak={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should handle large total attempts', () => {
      render(<PracticeStats {...defaultProps} totalAttempts={1000} />);
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct color to score', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const scoreElement = screen.getByText('15');
      expect(scoreElement).toHaveClass('text-gray-900');
    });

    it('should apply correct color to accuracy', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const accuracyElement = screen.getByText('85%');
      expect(accuracyElement).toHaveClass('text-blue-600');
    });

    it('should apply correct color to streak', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const streakElement = screen.getByText('3');
      expect(streakElement).toHaveClass('text-green-600');
    });

    it('should apply correct color to total', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const totalElement = screen.getByText('20');
      expect(totalElement).toHaveClass('text-purple-600');
    });

    it('should use grid layout with 4 columns', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const grid = container.querySelector('.grid.grid-cols-4');
      expect(grid).toBeInTheDocument();
    });

    it('should apply shadow to all cards', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const cards = container.querySelectorAll('.shadow-sm');
      expect(cards.length).toBe(4);
    });
  });

  describe('Decimal Values', () => {
    it('should handle decimal accuracy', () => {
      render(<PracticeStats {...defaultProps} accuracy={87.5} />);
      expect(screen.getByText('87.5%')).toBeInTheDocument();
    });

    it('should display accuracy without rounding', () => {
      render(<PracticeStats {...defaultProps} accuracy={85.75} />);
      expect(screen.getByText('85.75%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have readable text contrast', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const labels = container.querySelectorAll('.text-sm.text-gray-600');
      expect(labels.length).toBe(4);
    });

    it('should use semantic structure', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });

    it('should maintain text hierarchy', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const headings = container.querySelectorAll('.text-2xl.font-bold');
      expect(headings.length).toBe(4);
    });
  });

  describe('Responsive Layout', () => {
    it('should render with grid gap', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const grid = container.querySelector('.gap-4');
      expect(grid).toBeInTheDocument();
    });

    it('should center text in cards', () => {
      const { container } = render(<PracticeStats {...defaultProps} />);
      const cards = container.querySelectorAll('.text-center');
      expect(cards.length).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values gracefully', () => {
      render(<PracticeStats score={-1} accuracy={-5} streak={-2} totalAttempts={-10} />);
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('-5%')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      render(<PracticeStats score={999999} accuracy={100} streak={999} totalAttempts={999999} />);
      const largeNumbers = screen.getAllByText('999999');
      expect(largeNumbers.length).toBe(2); // Score and Total
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });
});
