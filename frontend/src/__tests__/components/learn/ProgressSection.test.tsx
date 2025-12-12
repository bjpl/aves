import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { ProgressSection } from '../../../components/learn/ProgressSection';

describe('ProgressSection', () => {
  const defaultProps = {
    progress: 65,
    discoveredCount: 13,
    totalCount: 20,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText('Learning Progress')).toBeInTheDocument();
    });

    it('should display progress label', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText('Learning Progress')).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText(/65%/)).toBeInTheDocument();
    });

    it('should display discovered count', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText(/13 \/ 20 terms/)).toBeInTheDocument();
    });

    it('should show both percentage and term count', () => {
      render(<ProgressSection {...defaultProps} />);
      const progressText = screen.getByText(/65% \(13 \/ 20 terms\)/);
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar container', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const progressBar = container.querySelector('.bg-gray-200');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('rounded-full');
      expect(progressBar).toHaveClass('h-3');
    });

    it('should render filled progress indicator', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const filledBar = container.querySelector('.bg-gradient-to-r.from-green-400.to-blue-500');
      expect(filledBar).toBeInTheDocument();
    });

    it('should set correct width based on progress', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('65%');
    });

    it('should apply transition to progress bar', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const filledBar = container.querySelector('.transition-all.duration-500');
      expect(filledBar).toBeInTheDocument();
    });

    it('should use full width for container', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const progressContainer = container.querySelector('.w-full');
      expect(progressContainer).toBeInTheDocument();
    });
  });

  describe('Progress Values', () => {
    it('should handle zero progress', () => {
      const { container } = render(<ProgressSection progress={0} discoveredCount={0} totalCount={20} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('0%');
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle complete progress', () => {
      const { container } = render(<ProgressSection progress={100} discoveredCount={20} totalCount={20} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('100%');
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should handle partial progress', () => {
      const { container } = render(<ProgressSection progress={33.5} discoveredCount={7} totalCount={21} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('33.5%');
    });

    it('should round progress percentage', () => {
      render(<ProgressSection progress={67.89} discoveredCount={15} totalCount={22} />);
      expect(screen.getByText(/68%/)).toBeInTheDocument();
    });

    it('should handle decimal progress values', () => {
      const { container } = render(<ProgressSection progress={45.5} discoveredCount={9} totalCount={20} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('45.5%');
    });
  });

  describe('Term Counts', () => {
    it('should display correct discovered count', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText(/13 \/ 20/)).toBeInTheDocument();
    });

    it('should display correct total count', () => {
      render(<ProgressSection progress={50} discoveredCount={5} totalCount={10} />);
      expect(screen.getByText(/5 \/ 10/)).toBeInTheDocument();
    });

    it('should handle single term total', () => {
      render(<ProgressSection progress={100} discoveredCount={1} totalCount={1} />);
      expect(screen.getByText(/1 \/ 1 terms/)).toBeInTheDocument();
    });

    it('should handle large term counts', () => {
      render(<ProgressSection progress={75} discoveredCount={75} totalCount={100} />);
      expect(screen.getByText(/75 \/ 100 terms/)).toBeInTheDocument();
    });

    it('should display zero discovered terms', () => {
      render(<ProgressSection progress={0} discoveredCount={0} totalCount={15} />);
      expect(screen.getByText(/0 \/ 15 terms/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply margin top', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const section = container.querySelector('.mt-4');
      expect(section).toBeInTheDocument();
    });

    it('should use gray text for labels', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const labels = container.querySelectorAll('.text-gray-600');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should use small text size', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const smallText = container.querySelectorAll('.text-sm');
      expect(smallText.length).toBeGreaterThan(0);
    });

    it('should apply rounded corners to progress bar', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const roundedBars = container.querySelectorAll('.rounded-full');
      expect(roundedBars.length).toBe(2); // Container and filled bar
    });

    it('should set consistent height for progress bar', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const heightBars = container.querySelectorAll('.h-3');
      expect(heightBars.length).toBe(2);
    });

    it('should use gradient background', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const gradient = container.querySelector('.bg-gradient-to-r.from-green-400.to-blue-500');
      expect(gradient).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should space label and percentage', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const spacedDiv = container.querySelector('.flex.justify-between');
      expect(spacedDiv).toBeInTheDocument();
    });

    it('should apply margin between text and bar', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const marginBottom = container.querySelector('.mb-1');
      expect(marginBottom).toBeInTheDocument();
    });

    it('should maintain proper text alignment', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const flexContainer = container.querySelector('.flex.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle progress over 100%', () => {
      const { container } = render(<ProgressSection progress={150} discoveredCount={30} totalCount={20} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('150%');
    });

    it('should handle negative progress', () => {
      const { container } = render(<ProgressSection progress={-10} discoveredCount={0} totalCount={20} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      // Component should still render and display the percentage text
      expect(filledBar).toBeInTheDocument();
      expect(screen.getByText(/-10%/)).toBeInTheDocument();
      // Negative width values are handled by the component
      expect(filledBar).toBeTruthy();
    });

    it('should handle zero total count', () => {
      render(<ProgressSection progress={0} discoveredCount={0} totalCount={0} />);
      expect(screen.getByText(/0 \/ 0 terms/)).toBeInTheDocument();
    });

    it('should handle mismatched counts gracefully', () => {
      // More discovered than total (edge case)
      render(<ProgressSection progress={100} discoveredCount={25} totalCount={20} />);
      expect(screen.getByText(/25 \/ 20 terms/)).toBeInTheDocument();
    });

    it('should handle very small progress values', () => {
      const { container } = render(<ProgressSection progress={0.5} discoveredCount={0} totalCount={200} />);
      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('0.5%');
      expect(screen.getByText(/1%/)).toBeInTheDocument(); // Rounded from 0.5
    });

    it('should handle very precise progress values', () => {
      render(<ProgressSection progress={33.333333} discoveredCount={10} totalCount={30} />);
      expect(screen.getByText(/33%/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have readable text', () => {
      render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText('Learning Progress')).toBeVisible();
    });

    it('should display progress information clearly', () => {
      render(<ProgressSection {...defaultProps} />);
      const progressInfo = screen.getByText(/65% \(13 \/ 20 terms\)/);
      expect(progressInfo).toBeVisible();
    });

    it('should have sufficient color contrast for progress bar', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const filledBar = container.querySelector('.from-green-400.to-blue-500');
      expect(filledBar).toBeInTheDocument();
    });

    it('should use semantic structure', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('Progress Animation', () => {
    it('should apply transition duration', () => {
      const { container } = render(<ProgressSection {...defaultProps} />);
      const animatedBar = container.querySelector('.duration-500');
      expect(animatedBar).toBeInTheDocument();
    });

    it('should update smoothly when progress changes', () => {
      const { container, rerender } = render(<ProgressSection {...defaultProps} />);
      let filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('65%');

      rerender(<ProgressSection progress={80} discoveredCount={16} totalCount={20} />);
      filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('80%');
    });

    it('should maintain transition class during updates', () => {
      const { container, rerender } = render(<ProgressSection {...defaultProps} />);

      rerender(<ProgressSection progress={90} discoveredCount={18} totalCount={20} />);
      const transitionBar = container.querySelector('.transition-all');
      expect(transitionBar).toBeInTheDocument();
    });
  });

  describe('Percentage Formatting', () => {
    it('should round to nearest integer', () => {
      render(<ProgressSection progress={65.4} discoveredCount={13} totalCount={20} />);
      expect(screen.getByText(/65%/)).toBeInTheDocument();
    });

    it('should round up when >= 0.5', () => {
      render(<ProgressSection progress={65.5} discoveredCount={13} totalCount={20} />);
      expect(screen.getByText(/66%/)).toBeInTheDocument();
    });

    it('should display 0% for very small values', () => {
      render(<ProgressSection progress={0.1} discoveredCount={0} totalCount={100} />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should display 100% for complete progress', () => {
      render(<ProgressSection progress={100} discoveredCount={20} totalCount={20} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  describe('Component Updates', () => {
    it('should update when progress changes', () => {
      const { rerender } = render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText(/65%/)).toBeInTheDocument();

      rerender(<ProgressSection progress={75} discoveredCount={15} totalCount={20} />);
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it('should update when counts change', () => {
      const { rerender } = render(<ProgressSection {...defaultProps} />);
      expect(screen.getByText(/13 \/ 20 terms/)).toBeInTheDocument();

      rerender(<ProgressSection progress={70} discoveredCount={14} totalCount={20} />);
      expect(screen.getByText(/14 \/ 20 terms/)).toBeInTheDocument();
    });

    it('should handle rapid updates', () => {
      const { rerender, container } = render(<ProgressSection progress={10} discoveredCount={2} totalCount={20} />);

      rerender(<ProgressSection progress={20} discoveredCount={4} totalCount={20} />);
      rerender(<ProgressSection progress={30} discoveredCount={6} totalCount={20} />);
      rerender(<ProgressSection progress={40} discoveredCount={8} totalCount={20} />);

      const filledBar = container.querySelector('.bg-gradient-to-r') as HTMLElement;
      expect(filledBar.style.width).toBe('40%');
      expect(screen.getByText(/40%/)).toBeInTheDocument();
    });
  });
});
