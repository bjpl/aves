import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Tooltip } from '../../../components/ui/Tooltip';

describe('Tooltip Component', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
    });

    it('should not show tooltip initially', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Tooltip text')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      await user.hover(button);
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      await user.unhover(button);
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delay', () => {
    it('should use default delay of 200ms', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Should not be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Wait for default 200ms delay
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should use custom delay', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={300}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Should not be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Wait for custom 300ms delay
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      }, { timeout: 600 });
    });

    it('should cancel tooltip if mouse leaves before delay', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={300}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      // Leave immediately before delay completes
      await user.unhover(button);

      // Wait to ensure tooltip never appears
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('should position tooltip at top by default', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('bottom-full');
        expect(tooltip.className).toContain('left-1/2');
        expect(tooltip.className).toContain('mb-2');
      });
    });

    it('should position tooltip at bottom', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" position="bottom" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('top-full');
        expect(tooltip.className).toContain('mt-2');
      });
    });

    it('should position tooltip at left', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" position="left" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('right-full');
        expect(tooltip.className).toContain('mr-2');
      });
    });

    it('should position tooltip at right', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" position="right" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('left-full');
        expect(tooltip.className).toContain('ml-2');
      });
    });
  });

  describe('Disabled State', () => {
    it('should not show tooltip when disabled', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" disabled delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Wait to ensure tooltip never appears
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should not set timeout when disabled', async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" disabled delay={200}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Wait longer than the delay to ensure tooltip never appears
      await new Promise(resolve => setTimeout(resolve, 300));

      // Tooltip should not be in the document because it's disabled
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark background with white text', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltipContent = container.querySelector('.bg-gray-900');
        expect(tooltipContent).toBeInTheDocument();
        expect(tooltipContent?.className).toContain('text-white');
      });
    });

    it('should have proper padding and rounded corners', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltipContent = container.querySelector('.bg-gray-900');
        expect(tooltipContent?.className).toContain('px-3 py-2');
        expect(tooltipContent?.className).toContain('rounded-lg');
      });
    });

    it('should have shadow', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltipContent = container.querySelector('.shadow-xl');
        expect(tooltipContent).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" className="custom-tooltip" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('custom-tooltip');
      });
    });

    it('should have proper text wrapping', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltipContent = container.querySelector('.whitespace-normal');
        expect(tooltipContent).toBeInTheDocument();
      });
    });

    it('should have high z-index for stacking', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.className).toContain('z-[9999]');
      });
    });
  });

  describe('Arrow', () => {
    it('should render arrow pointing to element', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const arrow = container.querySelector('.border-6');
        expect(arrow).toBeInTheDocument();
      });
    });

    it('should position arrow correctly for top position', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" position="top" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const arrow = container.querySelector('.border-t-gray-900');
        expect(arrow).toBeInTheDocument();
        expect(arrow?.className).toContain('top-full');
      });
    });

    it('should position arrow correctly for bottom position', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip content="Tooltip text" position="bottom" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        const arrow = container.querySelector('.border-b-gray-900');
        expect(arrow).toBeInTheDocument();
        expect(arrow?.className).toContain('bottom-full');
      });
    });
  });

  describe('Content Types', () => {
    it('should render string content', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Simple text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Simple text')).toBeInTheDocument();
      });
    });

    it('should render ReactNode content', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip
          content={
            <div>
              <strong>Bold</strong> and <em>italic</em>
            </div>
          }
          delay={0}
        >
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Bold')).toBeInTheDocument();
        expect(screen.getByText('italic')).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const user = userEvent.setup();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <Tooltip content="Tooltip text" delay={200}>
          <button>Hover me</button>
        </Tooltip>
      );

      // Trigger hover to create a timeout
      await user.hover(screen.getByRole('button'));

      // Unmount before timeout completes
      unmount();

      // clearTimeout should be called in useEffect cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have role="tooltip"', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Accessible tooltip" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });
  });
});
