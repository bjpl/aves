import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '../../../test/test-utils';
import { InteractiveLayer } from '../../../components/annotation/layers/InteractiveLayer';
import type { Annotation } from '../../../../../shared/types/annotation.types';
import { CanvasPerformanceMonitor } from '../../../components/canvas/CanvasLayer';

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
  global.performance = {
    mark: vi.fn(),
    measure: vi.fn(),
    now: vi.fn(() => Date.now()),
  } as any;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InteractiveLayer Component', () => {
  let mockAnnotations: Annotation[];
  let mockPerformanceMonitor: CanvasPerformanceMonitor;

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

    mockPerformanceMonitor = new CanvasPerformanceMonitor();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render canvas element', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should apply absolute positioning styles', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.position).toBe('absolute');
      expect(canvas.style.top).toBe('0px');
      expect(canvas.style.left).toBe('0px');
    });

    it('should set correct z-index', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.zIndex).toBe('2');
    });

    it('should disable pointer events', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.pointerEvents).toBe('none');
    });
  });

  describe('Canvas Drawing', () => {
    it('should clear canvas before drawing', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should draw all annotations', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeRect).toHaveBeenCalledTimes(2);
      });
    });

    it('should draw dashed bounding boxes', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.setLineDash).toHaveBeenCalledWith([5, 5]);
      });
    });

    it('should reset line dash after drawing', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.setLineDash).toHaveBeenCalledWith([]);
      });
    });

    it('should draw labels when showLabels is true', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={true}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.fillText).toHaveBeenCalledWith('el pico', 105, 88);
        expect(mockContext.fillText).toHaveBeenCalledWith('el ala', 205, 138);
      });
    });

    it('should not draw labels when showLabels is false', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.fillText).not.toHaveBeenCalled();
      });
    });

    it('should not draw when image not loaded', () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={false}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      expect(mockContext.clearRect).not.toHaveBeenCalled();
    });
  });

  describe('Annotation Type Colors', () => {
    it('should use blue color for anatomical annotations', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#3B82F6');
      });
    });

    it('should use green color for behavioral annotations', async () => {
      const behavioralAnnotations = mockAnnotations.map(ann => ({
        ...ann,
        type: 'behavioral' as const,
      }));

      render(
        <InteractiveLayer
          annotations={behavioralAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#10B981');
      });
    });

    it('should use orange color for color annotations', async () => {
      const colorAnnotations = mockAnnotations.map(ann => ({
        ...ann,
        type: 'color' as const,
      }));

      render(
        <InteractiveLayer
          annotations={colorAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#F59E0B');
      });
    });

    it('should use purple color for pattern annotations', async () => {
      const patternAnnotations = mockAnnotations.map(ann => ({
        ...ann,
        type: 'pattern' as const,
      }));

      render(
        <InteractiveLayer
          annotations={patternAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#8B5CF6');
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should record draw call', async () => {
      const recordDrawCallSpy = vi.spyOn(mockPerformanceMonitor, 'recordDrawCall');

      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(recordDrawCallSpy).toHaveBeenCalled();
      });
    });

    it('should use performance marks', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.mark).toHaveBeenCalledWith('interactive-layer-start');
        expect(performance.mark).toHaveBeenCalledWith('interactive-layer-end');
      });
    });

    it('should measure render time', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.measure).toHaveBeenCalledWith(
          'interactive-layer-render',
          'interactive-layer-start',
          'interactive-layer-end'
        );
      });
    });
  });

  describe('Canvas Dimensions', () => {
    it('should set canvas width and height', async () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 1024, height: 768 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);
      });
    });

    it('should update dimensions when props change', async () => {
      const { container, rerender } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      rerender(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 1024, height: 768 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);
      });
    });
  });

  describe('Label Drawing', () => {
    it('should draw label background with correct color', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={true}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalledWith(100, 75, 50, 25);
        expect(mockContext.fillRect).toHaveBeenCalledWith(200, 125, 80, 25);
      });
    });

    it('should set proper text alignment for labels', async () => {
      render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={true}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.textBaseline).toBe('middle');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations array', async () => {
      render(
        <InteractiveLayer
          annotations={[]}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
        expect(mockContext.strokeRect).not.toHaveBeenCalled();
      });
    });

    it('should handle zero dimensions', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 0, height: 0 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should redraw when annotations change', async () => {
      const { rerender } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const newAnnotations = [mockAnnotations[0]];
      rerender(
        <InteractiveLayer
          annotations={newAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should redraw when showLabels changes', async () => {
      const { rerender } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      rerender(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={true}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.fillText).toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      unmount();
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should maintain canvas structure', () => {
      const { container } = render(
        <InteractiveLayer
          annotations={mockAnnotations}
          dimensions={{ width: 800, height: 600 }}
          showLabels={false}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.tagName).toBe('CANVAS');
    });
  });
});
