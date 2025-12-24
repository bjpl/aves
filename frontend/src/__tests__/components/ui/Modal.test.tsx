import React from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Modal } from '../../../components/ui/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render without title', () => {
      render(<Modal {...defaultProps} title={undefined} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render with footer', () => {
      render(
        <Modal
          {...defaultProps}
          footer={
            <>
              <button>Cancel</button>
              <button>Confirm</button>
            </>
          }
        />
      );
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size', () => {
      const { container } = render(<Modal {...defaultProps} size="sm" />);
      const modalContent = container.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply medium size (default)', () => {
      const { container } = render(<Modal {...defaultProps} size="md" />);
      const modalContent = container.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(<Modal {...defaultProps} size="lg" />);
      const modalContent = container.querySelector('.max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply extra large size', () => {
      const { container } = render(<Modal {...defaultProps} size="xl" />);
      const modalContent = container.querySelector('.max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply full size', () => {
      const { container } = render(<Modal {...defaultProps} size="full" />);
      const modalContent = container.querySelector('.max-w-full');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should render close button by default', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should not render close button when disabled', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      const closeButton = screen.queryByRole('button', { name: /close modal/i });
      expect(closeButton).not.toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay Interaction', () => {
    it('should close when overlay clicked by default', async () => {
      const user = userEvent.setup();
      const { container } = render(<Modal {...defaultProps} />);

      const backdrop = container.querySelector('.bg-gray-900');
      if (backdrop) {
        await user.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });

    it('should not close when overlay clicked if disabled', async () => {
      const user = userEvent.setup();
      const { container } = render(<Modal {...defaultProps} closeOnOverlayClick={false} />);

      const backdrop = container.querySelector('.bg-gray-900');
      if (backdrop) {
        await user.click(backdrop);
        expect(defaultProps.onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Keyboard Interaction', () => {
    it('should close on Escape key by default', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not close on Escape if disabled', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} closeOnEscape={false} />);

      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should associate title with modal', () => {
      render(<Modal {...defaultProps} />);
      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('id', 'modal-title');
    });
  });
});
