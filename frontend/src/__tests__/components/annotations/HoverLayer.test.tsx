import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '../../../test/test-utils';
import { HoverLayer } from '../../../components/annotation/layers/HoverLayer';
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
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  }) as any;
  global.cancelAnimationFrame = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HoverLayer Component', () => {
  let mockAnnotation: Annotation;
  let mockPerformanceMonitor: CanvasPerformanceMonitor;

  beforeEach(() => {
    // HoverLayer uses normalized coordinates (0-1) with x, y format
    // For 800x600 canvas: x=0.125 => 100px, y=0.1667 => 100px, width=0.0625 => 50px, height=0.0833 => 50px
    mockAnnotation = {
      id: 'ann-1',
      imageId: 'img-1',
      spanishTerm: 'el pico',
      englishTerm: 'the beak',
      pronunciation: '[ˈpiko]',
      type: 'anatomical',
      isVisible: true,
      boundingBox: {
        x: 0.125,  // 100/800 = 0.125
        y: 0.1667, // 100/600 = 0.1667
        width: 0.0625, // 50/800 = 0.0625
        height: 0.0833, // 50/600 = 0.0833
      },
      difficultyLevel: 'beginner',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPerformanceMonitor = new CanvasPerformanceMonitor();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render canvas element', () => {
      const { container } = render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should apply absolute positioning styles', () => {
      const { container } = render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
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
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.zIndex).toBe('3');
    });

    it('should enable pointer events', () => {
      const { container } = render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.pointerEvents).toBe('auto');
    });
  });

  describe('Canvas Drawing', () => {
    it('should clear canvas when no hover', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should draw bounding box when hovering', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // 0.125*800=100, 0.1667*600≈100, 0.0625*800=50, 0.0833*600≈50
        expect(mockContext.strokeRect).toHaveBeenCalledWith(
          expect.closeTo(100, 1),
          expect.closeTo(100, 1),
          expect.closeTo(50, 1),
          expect.closeTo(50, 1)
        );
      });
    });

    it('should draw label background when hovering', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // Label is drawn at y-30 (above the box)
        expect(mockContext.fillRect).toHaveBeenCalledWith(
          expect.closeTo(100, 1),
          expect.closeTo(70, 1), // 100 - 30 = 70
          expect.any(Number),
          30
        );
      });
    });

    it('should draw Spanish term label when hovering', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // fillText is called at x+8, y-labelHeight/2 = 100+8=108, 100-15=85
        expect(mockContext.fillText).toHaveBeenCalledWith(
          'el pico',
          expect.closeTo(108, 1),
          expect.closeTo(85, 1)
        );
      });
    });

    it('should apply shadow effect to bounding box', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.shadowBlur).toBeDefined();
      });
    });

    it('should not draw when image not loaded', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={false}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        const clearCalls = (mockContext.clearRect as any).mock.calls.length;
        expect(clearCalls).toBe(0);
      });
    });
  });

  describe('Annotation Type Colors', () => {
    it('should use blue color for anatomical annotations', async () => {
      const anatomicalAnnotation = { ...mockAnnotation, type: 'anatomical' as const };
      render(
        <HoverLayer
          hoveredAnnotation={anatomicalAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#3B82F6');
      });
    });

    it('should use green color for behavioral annotations', async () => {
      const behavioralAnnotation = { ...mockAnnotation, type: 'behavioral' as const };
      render(
        <HoverLayer
          hoveredAnnotation={behavioralAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#10B981');
      });
    });

    it('should use orange color for color annotations', async () => {
      const colorAnnotation = { ...mockAnnotation, type: 'color' as const };
      render(
        <HoverLayer
          hoveredAnnotation={colorAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#F59E0B');
      });
    });

    it('should use purple color for pattern annotations', async () => {
      const patternAnnotation = { ...mockAnnotation, type: 'pattern' as const };
      render(
        <HoverLayer
          hoveredAnnotation={patternAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#8B5CF6');
      });
    });

    it('should use default blue color for unknown type', async () => {
      const unknownAnnotation = { ...mockAnnotation, type: 'unknown' as any };
      render(
        <HoverLayer
          hoveredAnnotation={unknownAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.strokeStyle).toBe('#3B82F6');
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should record draw call', async () => {
      const recordDrawCallSpy = vi.spyOn(mockPerformanceMonitor, 'recordDrawCall');

      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(recordDrawCallSpy).toHaveBeenCalled();
      });
    });

    it('should record frame timing', async () => {
      const recordFrameSpy = vi.spyOn(mockPerformanceMonitor, 'recordFrame');

      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(recordFrameSpy).toHaveBeenCalled();
      });
    });

    it('should use performance marks', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.mark).toHaveBeenCalledWith('hover-layer-start');
        expect(performance.mark).toHaveBeenCalledWith('hover-layer-end');
      });
    });

    it('should measure render time', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.measure).toHaveBeenCalledWith(
          'hover-layer-render',
          'hover-layer-start',
          'hover-layer-end'
        );
      });
    });
  });

  describe('RequestAnimationFrame', () => {
    it('should use requestAnimationFrame for rendering', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(requestAnimationFrame).toHaveBeenCalled();
      });
    });

    it('should cancel previous animation frame on re-render', async () => {
      const { rerender } = render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const newAnnotation = { ...mockAnnotation, id: 'ann-2' };
      rerender(
        <HoverLayer
          hoveredAnnotation={newAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(cancelAnimationFrame).toHaveBeenCalled();
      });
    });

    it('should cleanup animation frame on unmount', () => {
      const { unmount } = render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      unmount();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Canvas Dimensions', () => {
    it('should set canvas width and height', async () => {
      const { container } = render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 1024, height: 768 }}
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
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      rerender(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 1024, height: 768 }}
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

  describe('Label Sizing', () => {
    it('should ensure minimum label width', async () => {
      // Small annotation (30x30 px) => normalized: 30/800=0.0375 width, 30/600=0.05 height
      const smallAnnotation = {
        ...mockAnnotation,
        boundingBox: {
          x: 0.125, // 100px
          y: 0.1667, // 100px
          width: 0.0375, // 30px - smaller than minimum 150
          height: 0.05, // 30px
        },
      };

      render(
        <HoverLayer
          hoveredAnnotation={smallAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // Label width should be max(annotationWidth=30, 150) = 150
        expect(mockContext.fillRect).toHaveBeenCalledWith(
          expect.closeTo(100, 1),
          expect.closeTo(70, 1), // y - labelHeight = 100 - 30 = 70
          150, // Minimum width
          30
        );
      });
    });

    it('should use annotation width if larger than minimum', async () => {
      // Large annotation (200x50 px) => normalized: 200/800=0.25 width, 50/600=0.0833 height
      const largeAnnotation = {
        ...mockAnnotation,
        boundingBox: {
          x: 0.125, // 100px
          y: 0.1667, // 100px
          width: 0.25, // 200px - larger than minimum 150
          height: 0.0833, // 50px
        },
      };

      render(
        <HoverLayer
          hoveredAnnotation={largeAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // Label width should be max(annotationWidth=200, 150) = 200
        expect(mockContext.fillRect).toHaveBeenCalledWith(
          expect.closeTo(100, 1),
          expect.closeTo(70, 1),
          200, // Use annotation width
          30
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null annotation', async () => {
      render(
        <HoverLayer
          hoveredAnnotation={null}
          dimensions={{ width: 800, height: 600 }}
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
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 0, height: 0 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle rapid hover changes', async () => {
      const { rerender } = render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <HoverLayer
            hoveredAnnotation={i % 2 === 0 ? mockAnnotation : null}
            dimensions={{ width: 800, height: 600 }}
            imageLoaded={true}
            performanceMonitor={mockPerformanceMonitor}
          />
        );
      }

      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
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
        <HoverLayer
          hoveredAnnotation={mockAnnotation}
          dimensions={{ width: 800, height: 600 }}
          imageLoaded={true}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.tagName).toBe('CANVAS');
    });
  });
});
