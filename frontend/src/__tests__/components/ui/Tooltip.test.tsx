import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Tooltip } from '../../../components/ui/Tooltip';

describe('Tooltip Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

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
      const user = userEvent.setup({ delay: null });
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
      const user = userEvent.setup({ delay: null });
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
      const user = userEvent.setup({ delay: null });
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Should not be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Fast-forward time by 200ms
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should use custom delay', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <Tooltip content="Tooltip text" delay={500}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // Should not be visible after 200ms
      vi.advanceTimersByTime(200);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Should be visible after 500ms
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should cancel tooltip if mouse leaves before delay', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <Tooltip content="Tooltip text" delay={500}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      // Leave before delay completes
      vi.advanceTimersByTime(200);
      await user.unhover(button);

      // Complete the delay
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Position', () => {
    it('should position tooltip at top by default', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('bottom-full');
      expect(tooltip.className).toContain('left-1/2');
      expect(tooltip.className).toContain('mb-2');
    });

    it('should position tooltip at bottom', () => {
      render(
        <Tooltip content="Tooltip text" position="bottom" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('top-full');
      expect(tooltip.className).toContain('mt-2');
    });

    it('should position tooltip at left', () => {
      render(
        <Tooltip content="Tooltip text" position="left" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('right-full');
      expect(tooltip.className).toContain('mr-2');
    });

    it('should position tooltip at right', () => {
      render(
        <Tooltip content="Tooltip text" position="right" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('left-full');
      expect(tooltip.className).toContain('ml-2');
    });
  });

  describe('Disabled State', () => {
    it('should not show tooltip when disabled', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <Tooltip content="Tooltip text" disabled delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should not set timeout when disabled', async () => {
      const user = userEvent.setup({ delay: null });
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      render(
        <Tooltip content="Tooltip text" disabled delay={200}>
          <button>Hover me</button>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));

      // setTimeout should not be called for tooltip display
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });

  describe('Styling', () => {
    it('should have dark background with white text', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltipContent = screen.getByText('Tooltip text').parentElement;
      expect(tooltipContent?.className).toContain('bg-gray-900');
      expect(tooltipContent?.className).toContain('text-white');
    });

    it('should have proper padding and rounded corners', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltipContent = screen.getByText('Tooltip text').parentElement;
      expect(tooltipContent?.className).toContain('px-3 py-2');
      expect(tooltipContent?.className).toContain('rounded-lg');
    });

    it('should have shadow', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltipContent = screen.getByText('Tooltip text').parentElement;
      expect(tooltipContent?.className).toContain('shadow-lg');
    });

    it('should apply custom className', () => {
      render(
        <Tooltip content="Tooltip text" className="custom-tooltip" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('custom-tooltip');
    });

    it('should have whitespace-nowrap', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('whitespace-nowrap');
    });

    it('should have z-50 for stacking', () => {
      render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('z-50');
    });
  });

  describe('Arrow', () => {
    it('should render arrow pointing to element', () => {
      const { container } = render(
        <Tooltip content="Tooltip text" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const arrow = container.querySelector('.border-8');
      expect(arrow).toBeInTheDocument();
    });

    it('should position arrow correctly for top position', () => {
      const { container } = render(
        <Tooltip content="Tooltip text" position="top" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const arrow = container.querySelector('.border-t-gray-900');
      expect(arrow).toBeInTheDocument();
      expect(arrow?.className).toContain('top-full');
    });

    it('should position arrow correctly for bottom position', () => {
      const { container } = render(
        <Tooltip content="Tooltip text" position="bottom" delay={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const arrow = container.querySelector('.border-b-gray-900');
      expect(arrow).toBeInTheDocument();
      expect(arrow?.className).toContain('bottom-full');
    });
  });

  describe('Content Types', () => {
    it('should render string content', async () => {
      const user = userEvent.setup({ delay: null });
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
      const user = userEvent.setup({ delay: null });
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
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have role="tooltip"', async () => {
      const user = userEvent.setup({ delay: null });
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
