import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Spinner, LoadingOverlay } from '../../../components/ui/Spinner';

describe('Spinner Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<Spinner label="Loading data..." />);
      expect(screen.getByLabelText('Loading data...')).toBeInTheDocument();
      // Use getAllByText since there are multiple elements with the same text (sr-only + visible)
      const labels = screen.getAllByText('Loading data...');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should apply size styles', () => {
      const { rerender } = render(<Spinner size="xs" />);
      let spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-4 w-4');

      rerender(<Spinner size="sm" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-6 w-6');

      rerender(<Spinner size="md" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-8 w-8');

      rerender(<Spinner size="lg" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-12 w-12');

      rerender(<Spinner size="xl" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-16 w-16');
    });

    it('should apply color styles', () => {
      const { rerender } = render(<Spinner color="primary" />);
      let spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-blue-600');

      rerender(<Spinner color="secondary" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-gray-600');

      rerender(<Spinner color="success" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-green-600');

      rerender(<Spinner color="danger" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-red-600');

      rerender(<Spinner color="white" />);
      spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-white');
    });

    it('should have spinning animation', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('animate-spin');
    });

    it('should have transparent top border for spinner effect', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-t-transparent');
    });
  });

  describe('Centered Layout', () => {
    it('should center spinner when centered prop is true', () => {
      const { container } = render(<Spinner centered />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex items-center justify-center');
    });

    it('should display label next to centered spinner', () => {
      const { container } = render(<Spinner centered label="Please wait" />);
      // Use getAllByText since there are multiple elements with the same text (sr-only + visible)
      const labels = screen.getAllByText('Please wait');
      expect(labels.length).toBeGreaterThan(0);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex items-center justify-center');
    });

    it('should use inline-flex when not centered', () => {
      const { container } = render(<Spinner centered={false} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Spinner label="Loading content" />);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(<Spinner />);
      const srText = screen.getByText(/loading/i);
      expect(srText.className).toContain('sr-only');
    });

    it('should use custom label in aria-label', () => {
      render(<Spinner label="Fetching data" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');
    });
  });

  describe('Label Display', () => {
    it('should show label with visible text', () => {
      render(<Spinner label="Loading..." centered />);
      const labels = screen.getAllByText('Loading...');
      // Find the visible label (not the sr-only one)
      const visibleLabel = labels.find(label => !label.className.includes('sr-only'));
      expect(visibleLabel).toBeDefined();
      expect(visibleLabel?.className).toContain('text-gray-600');
      expect(visibleLabel?.className).toContain('ml-2');
    });

    it('should not show visible label when not provided', () => {
      const { container } = render(<Spinner />);
      const visibleLabel = container.querySelector('.ml-2.text-gray-600');
      expect(visibleLabel).not.toBeInTheDocument();
    });
  });
});

describe('LoadingOverlay Component', () => {
  describe('Rendering', () => {
    it('should not render when isLoading is false', () => {
      const { container } = render(<LoadingOverlay isLoading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isLoading is true', () => {
      render(<LoadingOverlay isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render with message', () => {
      render(<LoadingOverlay isLoading={true} message="Processing your request..." />);
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
    });

    it('should render without message', () => {
      render(<LoadingOverlay isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have full screen overlay styles', () => {
      const { container } = render(<LoadingOverlay isLoading={true} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.className).toContain('fixed inset-0');
      expect(overlay.className).toContain('z-50');
      expect(overlay.className).toContain('flex items-center justify-center');
    });

    it('should have dark background by default', () => {
      const { container } = render(<LoadingOverlay isLoading={true} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.className).toContain('bg-gray-900 bg-opacity-50');
    });

    it('should have transparent background when transparent prop is true', () => {
      const { container } = render(<LoadingOverlay isLoading={true} transparent />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.className).toContain('bg-white bg-opacity-75');
    });

    it('should have white content box with shadow', () => {
      const { container } = render(<LoadingOverlay isLoading={true} />);
      const contentBox = container.querySelector('.bg-white.rounded-lg.shadow-xl.p-6');
      expect(contentBox).toBeInTheDocument();
    });
  });

  describe('Spinner Integration', () => {
    it('should display large primary spinner', () => {
      render(<LoadingOverlay isLoading={true} />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('h-12 w-12');
      expect(spinner.className).toContain('border-blue-600');
    });
  });

  describe('Message Display', () => {
    it('should display message with proper styling', () => {
      render(<LoadingOverlay isLoading={true} message="Please wait" />);
      const message = screen.getByText('Please wait');
      expect(message.className).toContain('mt-4');
      expect(message.className).toContain('text-gray-700');
      expect(message.className).toContain('font-medium');
    });

    it('should center message below spinner', () => {
      const { container } = render(
        <LoadingOverlay isLoading={true} message="Loading..." />
      );
      const contentBox = container.querySelector('.flex-col.items-center');
      expect(contentBox).toBeInTheDocument();
    });
  });

  describe('Visibility Control', () => {
    it('should toggle visibility based on isLoading prop', () => {
      const { rerender } = render(<LoadingOverlay isLoading={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      rerender(<LoadingOverlay isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<LoadingOverlay isLoading={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
