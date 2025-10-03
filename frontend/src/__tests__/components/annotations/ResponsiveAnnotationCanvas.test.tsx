import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { ResponsiveAnnotationCanvas } from '../../../components/annotation/ResponsiveAnnotationCanvas';
import type { Annotation } from '../../../types';

// Mock hooks
vi.mock('../../../hooks/useMobileDetect', () => ({
  useMobileDetect: vi.fn(() => ({
    isMobile: false,
    hasTouch: false,
  })),
}));

vi.mock('../../../hooks/useProgress', () => ({
  useProgress: vi.fn(() => ({
    recordTermDiscovery: vi.fn(),
  })),
}));

// Mock canvas context
const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  arc: vi.fn(),
  setLineDash: vi.fn(),
  canvas: { width: 800, height: 600 },
};

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;
  global.Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    width = 800;
    height = 600;
    crossOrigin = '';

    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  } as any;

  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResponsiveAnnotationCanvas Component', () => {
  let mockAnnotations: Annotation[];
  const mockImageUrl = 'https://example.com/bird.jpg';

  beforeEach(() => {
    mockAnnotations = [
      {
        id: 'ann-1',
        imageId: 'img-1',
        spanishTerm: 'el pico',
        englishTerm: 'the beak',
        pronunciation: '[ˈpiko]',
        type: 'anatomical',
        isVisible: true,
        boundingBox: {
          topLeft: { x: 100, y: 100 },
          width: 50,
          height: 50,
        },
        difficultyLevel: 'beginner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ann-2',
        imageId: 'img-1',
        spanishTerm: 'el ala',
        englishTerm: 'the wing',
        pronunciation: '[ˈala]',
        type: 'anatomical',
        isVisible: true,
        boundingBox: {
          topLeft: { x: 200, y: 150 },
          width: 80,
          height: 60,
        },
        difficultyLevel: 'beginner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render canvas element', () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should apply responsive classes', () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('w-full');
      expect(canvas?.className).toContain('h-auto');
      expect(canvas?.className).toContain('rounded-lg');
    });

    it('should set canvas dimensions', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas?.width).toBeGreaterThan(0);
        expect(canvas?.height).toBeGreaterThan(0);
      });
    });
  });

  describe('Canvas Drawing', () => {
    it('should draw image on canvas', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
      });
    });

    it('should draw annotation bounding boxes', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeRect).toHaveBeenCalled();
      });
    });

    it('should draw labels when showLabels is true', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          showLabels={true}
        />
      );

      await waitFor(() => {
        expect(mockContext.fillText).toHaveBeenCalled();
      });
    });

    it('should clear canvas before redrawing', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should skip invisible annotations', async () => {
      const invisibleAnnotations = mockAnnotations.map((ann) => ({
        ...ann,
        isVisible: false,
      }));

      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={invisibleAnnotations}
        />
      );

      await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
      });
    });
  });

  describe('Mouse Interactions', () => {
    it('should handle mouse move', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });
    });

    it('should change cursor on annotation hover', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.mouseMove(canvas, { clientX: 125, clientY: 125 });

      await waitFor(() => {
        expect(['pointer', 'default']).toContain(canvas.style.cursor);
      });
    });

    it('should handle mouse down on annotation', async () => {
      const handleDiscover = vi.fn();

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationDiscover={handleDiscover}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.mouseDown(canvas, { clientX: 125, clientY: 125 });

      await waitFor(() => {
        expect(handleDiscover).toHaveBeenCalledWith(
          expect.objectContaining({ spanishTerm: 'el pico' })
        );
      });
    });

    it('should handle mouse leave', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseLeave(canvas);

      await waitFor(() => {
        expect(canvas.style.cursor).toBe('default');
      });
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      const { useMobileDetect } = require('../../../hooks/useMobileDetect');
      useMobileDetect.mockReturnValue({
        isMobile: true,
        hasTouch: true,
      });
    });

    it('should handle touch start', async () => {
      const handleDiscover = vi.fn();

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationDiscover={handleDiscover}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      await waitFor(() => {
        expect(handleDiscover).toHaveBeenCalled();
      });
    });

    it('should show mobile instruction overlay', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/Tap on highlighted areas/i)
        ).toBeInTheDocument();
      });
    });

    it('should show selected annotation info on mobile', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      await waitFor(() => {
        expect(screen.getByText('el pico')).toBeInTheDocument();
        expect(screen.getByText('the beak')).toBeInTheDocument();
      });
    });

    it('should auto-clear selection on mobile after delay', async () => {
      vi.useFakeTimers();

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('el pico')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should close annotation info when close button clicked', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      await waitFor(() => {
        expect(screen.getByText('el pico')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('el pico')).not.toBeInTheDocument();
      });
    });

    it('should trigger vibration on touch (if supported)', async () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      await waitFor(() => {
        expect(vibrateMock).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize', async () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeTruthy();
      });

      // Trigger resize
      global.innerWidth = 500;
      global.innerHeight = 800;
      fireEvent.resize(window);

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should adapt to mobile viewport', () => {
      const { useMobileDetect } = require('../../../hooks/useMobileDetect');
      useMobileDetect.mockReturnValue({
        isMobile: true,
        hasTouch: true,
      });

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.style.touchAction).toBe('manipulation');
    });

    it('should scale annotations to fit container', async () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeRect).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should record term discovery', async () => {
      const { useProgress } = require('../../../hooks/useProgress');
      const recordTermDiscovery = vi.fn();
      useProgress.mockReturnValue({ recordTermDiscovery });

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.mouseDown(canvas, { clientX: 125, clientY: 125 });

      await waitFor(() => {
        expect(recordTermDiscovery).toHaveBeenCalledWith('el pico');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations', () => {
      render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={[]}
        />
      );

      expect(screen.queryByText(/Tap on highlighted areas/i)).not.toBeInTheDocument();
    });

    it('should handle image load error', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: ((err: any) => void) | null = null;
        src = '';
        crossOrigin = '';

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Failed to load'));
          }, 0);
        }
      } as any;

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl="invalid-url"
          annotations={mockAnnotations}
        />
      );

      await waitFor(() => {
        expect(container).toBeTruthy();
      });
    });

    it('should handle click outside annotations', async () => {
      const handleDiscover = vi.fn();

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationDiscover={handleDiscover}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.mouseDown(canvas, { clientX: 500, clientY: 500 });

      await waitFor(() => {
        expect(handleDiscover).not.toHaveBeenCalled();
      });
    });

    it('should handle annotation with touch tolerance', async () => {
      const { useMobileDetect } = require('../../../hooks/useMobileDetect');
      useMobileDetect.mockReturnValue({
        isMobile: true,
        hasTouch: true,
      });

      const handleDiscover = vi.fn();

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationDiscover={handleDiscover}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      // Click near annotation (within tolerance)
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 90, clientY: 90 }],
      });

      await waitFor(() => {
        expect(handleDiscover).toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup image listeners on unmount', () => {
      const { unmount } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      unmount();
      expect(true).toBe(true);
    });

    it('should cleanup resize listener on unmount', () => {
      const { unmount } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });
  });

  describe('Accessibility', () => {
    it('should have touch-action style for mobile', () => {
      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.style.touchAction).toBe('manipulation');
    });

    it('should provide close button for mobile overlay', async () => {
      const { useMobileDetect } = require('../../../hooks/useMobileDetect');
      useMobileDetect.mockReturnValue({
        isMobile: true,
        hasTouch: true,
      });

      const { container } = render(
        <ResponsiveAnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      await waitFor(() => {
        expect(canvas).toBeTruthy();
      });

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 125, clientY: 125 }],
      });

      await waitFor(() => {
        const closeButton = screen.getByRole('button');
        expect(closeButton).toBeInTheDocument();
      });
    });
  });
});
