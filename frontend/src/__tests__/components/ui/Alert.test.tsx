import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Alert } from '../../../components/ui/Alert';

describe('Alert Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Alert>This is an alert message</Alert>);
      expect(screen.getByText('This is an alert message')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(
        <Alert title="Important Notice">
          Please read this carefully
        </Alert>
      );
      expect(screen.getByText('Important Notice')).toBeInTheDocument();
      expect(screen.getByText('Please read this carefully')).toBeInTheDocument();
    });

    it('should render without title', () => {
      render(<Alert>Message only</Alert>);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should have role="alert"', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply info variant styles by default', () => {
      const { container } = render(<Alert>Info message</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-blue-50');
      expect(alert.className).toContain('border-blue-400');
      expect(alert.className).toContain('text-blue-700');
    });

    it('should apply success variant styles', () => {
      const { container } = render(<Alert variant="success">Success!</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-green-50');
      expect(alert.className).toContain('border-green-400');
      expect(alert.className).toContain('text-green-700');
    });

    it('should apply warning variant styles', () => {
      const { container } = render(<Alert variant="warning">Warning!</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-yellow-50');
      expect(alert.className).toContain('border-yellow-400');
      expect(alert.className).toContain('text-yellow-700');
    });

    it('should apply danger variant styles', () => {
      const { container } = render(<Alert variant="danger">Error!</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
      expect(alert.className).toContain('border-red-400');
      expect(alert.className).toContain('text-red-700');
    });
  });

  describe('Icons', () => {
    it('should render default info icon', () => {
      const { container } = render(<Alert variant="info">Info</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render default success icon', () => {
      const { container } = render(<Alert variant="success">Success</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render default warning icon', () => {
      const { container } = render(<Alert variant="warning">Warning</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render default danger icon', () => {
      const { container } = render(<Alert variant="danger">Error</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      render(
        <Alert icon={<span data-testid="custom-icon">⚠️</span>}>
          Custom icon alert
        </Alert>
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should override default icon with custom icon', () => {
      const { container } = render(
        <Alert
          variant="info"
          icon={<span data-testid="custom-icon">★</span>}
        >
          Alert
        </Alert>
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should render close button when onClose is provided', () => {
      const handleClose = vi.fn();
      render(<Alert onClose={handleClose}>Closable alert</Alert>);
      expect(screen.getByLabelText('Close alert')).toBeInTheDocument();
    });

    it('should not render close button when onClose is not provided', () => {
      render(<Alert>Non-closable alert</Alert>);
      expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<Alert onClose={handleClose}>Closable alert</Alert>);

      await user.click(screen.getByLabelText('Close alert'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should have proper close button styling', () => {
      const handleClose = vi.fn();
      render(<Alert onClose={handleClose}>Alert</Alert>);

      const closeButton = screen.getByLabelText('Close alert');
      expect(closeButton.className).toContain('text-gray-400');
      expect(closeButton.className).toContain('hover:text-gray-600');
    });

    it('should render close icon SVG', () => {
      const handleClose = vi.fn();
      const { container } = render(<Alert onClose={handleClose}>Alert</Alert>);

      const closeButton = screen.getByLabelText('Close alert');
      const svg = closeButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have border-left design', () => {
      const { container } = render(<Alert>Alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('border-l-4');
      expect(alert.className).toContain('rounded');
      expect(alert.className).toContain('p-4');
    });

    it('should arrange elements in flex layout', () => {
      render(
        <Alert title="Title" onClose={() => {}}>
          Content
        </Alert>
      );
      const alert = screen.getByRole('alert');
      const flexContainer = alert.querySelector('.flex.items-start');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have icon with proper spacing', () => {
      const { container } = render(<Alert>Alert</Alert>);
      const iconContainer = container.querySelector('.flex-shrink-0');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should have content area with proper spacing', () => {
      const { container } = render(<Alert title="Title">Content</Alert>);
      const contentArea = container.querySelector('.ml-3.flex-1');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Title Styling', () => {
    it('should style title as bold', () => {
      render(<Alert title="Important">Message</Alert>);
      const title = screen.getByText('Important');
      expect(title.className).toContain('font-bold');
      expect(title.className).toContain('text-sm');
      expect(title.className).toContain('mb-1');
    });

    it('should render title as h3', () => {
      render(<Alert title="Notice">Content</Alert>);
      const title = screen.getByText('Notice');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('Content Styling', () => {
    it('should apply text-sm to content', () => {
      const { container } = render(<Alert>Content text</Alert>);
      const content = container.querySelector('.text-sm');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible for close button', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<Alert onClose={handleClose}>Alert</Alert>);

      const closeButton = screen.getByLabelText('Close alert');
      closeButton.focus();
      await user.keyboard('{Enter}');

      expect(handleClose).toHaveBeenCalled();
    });

    it('should have focus styles on close button', () => {
      const handleClose = vi.fn();
      render(<Alert onClose={handleClose}>Alert</Alert>);

      const closeButton = screen.getByLabelText('Close alert');
      expect(closeButton.className).toContain('focus:outline-none');
      expect(closeButton.className).toContain('focus:ring-2');
      expect(closeButton.className).toContain('focus:ring-offset-2');
    });

    it('should have proper aria-label for close button', () => {
      const handleClose = vi.fn();
      render(<Alert onClose={handleClose}>Alert</Alert>);

      expect(screen.getByLabelText('Close alert')).toHaveAttribute('aria-label', 'Close alert');
    });
  });

  describe('Color Variants', () => {
    it('should have consistent icon color with variant', () => {
      const { container, rerender } = render(<Alert variant="info">Info</Alert>);
      let iconContainer = container.querySelector('.text-blue-400');
      expect(iconContainer).toBeInTheDocument();

      rerender(<Alert variant="success">Success</Alert>);
      iconContainer = container.querySelector('.text-green-400');
      expect(iconContainer).toBeInTheDocument();

      rerender(<Alert variant="warning">Warning</Alert>);
      iconContainer = container.querySelector('.text-yellow-400');
      expect(iconContainer).toBeInTheDocument();

      rerender(<Alert variant="danger">Danger</Alert>);
      iconContainer = container.querySelector('.text-red-400');
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
