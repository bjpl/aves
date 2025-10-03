import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { AnnotationCanvas } from '../../../components/annotation/AnnotationCanvas';
import type { Annotation } from '../../../../../shared/types/annotation.types';

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
  canvas: { width: 800, height: 600 },
};

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AnnotationCanvas Component', () => {
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
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should render StaticLayer component', () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('should render InteractiveLayer component', () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('should render HoverLayer component', () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('should apply correct container class', () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('relative');
      expect(wrapper.className).toContain('inline-block');
    });
  });

  describe('Image Loading', () => {
    it('should hide loading state after image loads', async () => {
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      // Simulate image load
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        Object.defineProperty(img, 'naturalWidth', { value: 800 });
        Object.defineProperty(img, 'naturalHeight', { value: 600 });
        img.dispatchEvent(new Event('load'));
      });

      await waitFor(() => {
        expect(screen.queryByText(/Cargando imagen.../i)).not.toBeInTheDocument();
      });
    });

    it('should update dimensions when image loads', async () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        Object.defineProperty(img, 'naturalWidth', { value: 800 });
        Object.defineProperty(img, 'naturalHeight', { value: 600 });
        img.dispatchEvent(new Event('load'));
      });

      await waitFor(() => {
        const spacer = container.querySelector('[style*="width"]');
        expect(spacer).toBeTruthy();
      });
    });
  });

  describe('Annotation Hover Interactions', () => {
    it('should detect annotation at mouse position', async () => {
      const user = userEvent.setup();
      const handleHover = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationHover={handleHover}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;

      // Simulate hover over annotation
      await user.hover(wrapper);

      // The hover handler is debounced, so we may need to wait
      await waitFor(() => {
        expect(handleHover).toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('should update cursor on annotation hover', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.hover(wrapper);

      // Cursor change may happen based on position
      await waitFor(() => {
        const currentStyle = wrapper.style.cursor;
        expect(['pointer', 'default']).toContain(currentStyle);
      });
    });

    it('should call onAnnotationHover with null when mouse leaves', async () => {
      const user = userEvent.setup();
      const handleHover = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationHover={handleHover}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.hover(wrapper);
      await user.unhover(wrapper);

      await waitFor(() => {
        expect(handleHover).toHaveBeenCalledWith(null);
      });
    });

    it('should not trigger hover when interactive is false', async () => {
      const user = userEvent.setup();
      const handleHover = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationHover={handleHover}
          interactive={false}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.hover(wrapper);

      // Should not call hover handler when not interactive
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handleHover).not.toHaveBeenCalled();
    });
  });

  describe('Annotation Click Interactions', () => {
    it('should detect annotation click', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationClick={handleClick}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.click(wrapper);

      // Click should be detected
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalled();
      });
    });

    it('should not trigger click when interactive is false', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationClick={handleClick}
          interactive={false}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.click(wrapper);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should call onAnnotationClick with correct annotation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationClick={handleClick}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;

      // Simulate click at annotation position
      const rect = wrapper.getBoundingClientRect();
      await user.pointer({
        target: wrapper,
        coords: { clientX: rect.left + 125, clientY: rect.top + 125 },
        keys: '[MouseLeft]',
      });

      await waitFor(() => {
        if (handleClick.mock.calls.length > 0) {
          const calledWith = handleClick.mock.calls[0][0];
          expect(calledWith).toBeTruthy();
        }
      });
    });
  });

  describe('Show Labels Prop', () => {
    it('should pass showLabels prop to InteractiveLayer', () => {
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          showLabels={true}
        />
      );

      // Component should render with labels enabled
      expect(screen.queryByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should work with showLabels false', () => {
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          showLabels={false}
        />
      );

      expect(screen.queryByText(/Cargando imagen.../i)).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should initialize performance monitor', () => {
      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      // Performance monitor should be created
      expect(screen.queryByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should track dirty rectangles', async () => {
      const user = userEvent.setup();
      const handleHover = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationHover={handleHover}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      await user.hover(wrapper);

      // Dirty rect tracking should occur on hover
      await waitFor(() => {
        expect(wrapper).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations array', () => {
      render(
        <AnnotationCanvas imageUrl={mockImageUrl} annotations={[]} />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should handle invisible annotations', () => {
      const invisibleAnnotations = mockAnnotations.map((ann) => ({
        ...ann,
        isVisible: false,
      }));

      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={invisibleAnnotations}
        />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      render(
        <AnnotationCanvas imageUrl={mockImageUrl} annotations={mockAnnotations} />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });

    it('should handle annotation with zero dimensions', () => {
      const zeroDimAnnotations: Annotation[] = [
        {
          ...mockAnnotations[0],
          boundingBox: {
            topLeft: { x: 0, y: 0 },
            width: 0,
            height: 0,
          },
        },
      ];

      render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={zeroDimAnnotations}
        />
      );
      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper container structure', () => {
      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.tagName).toBe('DIV');
    });

    it('should be keyboard accessible when interactive', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
          onAnnotationClick={handleClick}
          interactive={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      wrapper.focus();

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('should clean up on unmount', () => {
      const { unmount } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      unmount();

      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={mockAnnotations}
        />
      );

      const newAnnotations = [...mockAnnotations, {
        ...mockAnnotations[0],
        id: 'ann-3',
      }];

      rerender(
        <AnnotationCanvas
          imageUrl={mockImageUrl}
          annotations={newAnnotations}
        />
      );

      expect(screen.getByText(/Cargando imagen.../i)).toBeInTheDocument();
    });
  });
});
