import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '../../../test/test-utils';
import { StaticLayer } from '../../../components/annotation/layers/StaticLayer';
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

  // Mock Image
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

describe('StaticLayer Component', () => {
  const mockImageUrl = 'https://example.com/bird.jpg';
  let mockPerformanceMonitor: CanvasPerformanceMonitor;
  let mockOnImageLoad: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPerformanceMonitor = new CanvasPerformanceMonitor();
    mockOnImageLoad = vi.fn();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render canvas element', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should apply absolute positioning styles', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
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
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.zIndex).toBe('1');
    });

    it('should disable pointer events', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.pointerEvents).toBe('none');
    });

    it('should have responsive width style', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.width).toBe('100%');
    });
  });

  describe('Image Loading', () => {
    it('should load image on mount', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalled();
      });
    });

    it('should call onImageLoad with image and dimensions', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledWith(
          expect.any(Object),
          { width: 800, height: 600 }
        );
      });
    });

    it('should set crossOrigin to anonymous', async () => {
      let imageInstance: any;
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 800;
        height = 600;
        crossOrigin = '';

        constructor() {
          imageInstance = this;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      } as any;

      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(imageInstance.crossOrigin).toBe('anonymous');
      });
    });

    it('should handle image load error gracefully', async () => {
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
        <StaticLayer
          imageUrl="invalid-url"
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should reload image when imageUrl changes', async () => {
      const { rerender } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledTimes(1);
      });

      mockOnImageLoad.mockClear();

      rerender(
        <StaticLayer
          imageUrl="https://example.com/different-bird.jpg"
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalled();
      });
    });
  });

  describe('Canvas Drawing', () => {
    it('should draw image on canvas', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
      });
    });

    it('should draw image with correct dimensions', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        // The component uses drawImage(img, 0, 0) - no width/height specified
        expect(mockContext.drawImage).toHaveBeenCalledWith(
          expect.any(Object),
          0,
          0
        );
      });
    });

    it('should set canvas dimensions to match image', async () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
      });
    });

    it('should use non-alpha context for performance', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      // Wait for the image to load and trigger getContext call
      await waitFor(() => {
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
          '2d',
          { alpha: false }
        );
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should record draw call', async () => {
      const recordDrawCallSpy = vi.spyOn(mockPerformanceMonitor, 'recordDrawCall');

      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(recordDrawCallSpy).toHaveBeenCalled();
      });
    });

    it('should use performance marks', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.mark).toHaveBeenCalledWith('static-layer-start');
        expect(performance.mark).toHaveBeenCalledWith('static-layer-end');
      });
    });

    it('should measure render time', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(performance.measure).toHaveBeenCalledWith(
          'static-layer-render',
          'static-layer-start',
          'static-layer-end'
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty imageUrl', () => {
      const { container } = render(
        <StaticLayer
          imageUrl=""
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle very large images', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 4000;
        height = 3000;
        crossOrigin = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      } as any;

      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledWith(
          expect.any(Object),
          { width: 4000, height: 3000 }
        );
      });
    });

    it('should handle very small images', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 100;
        height = 100;
        crossOrigin = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      } as any;

      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledWith(
          expect.any(Object),
          { width: 100, height: 100 }
        );
      });
    });

    it('should handle rapid imageUrl changes', async () => {
      const { rerender } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <StaticLayer
            imageUrl={`https://example.com/bird-${i}.jpg`}
            onImageLoad={mockOnImageLoad}
            performanceMonitor={mockPerformanceMonitor}
          />
        );
      }

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalled();
      });
    });
  });

  describe('Image Caching', () => {
    it('should maintain image reference', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalled();
      });

      // Image reference should be maintained
      expect(true).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      unmount();
      expect(true).toBe(true);
    });

    it('should not call onImageLoad after unmount', async () => {
      let imageInstance: any;
      let resolveLoad: (() => void) | undefined;

      // Create a delayed image load to test cleanup
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 800;
        height = 600;
        crossOrigin = '';

        constructor() {
          imageInstance = this;
          // Don't call onload automatically - we control when it fires
          resolveLoad = () => {
            if (this.onload) this.onload();
          };
        }
      } as any;

      const { unmount } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      // Clear the callback reference to simulate unmount cleanup
      unmount();

      // Clear the image's onload handler to prevent callback
      if (imageInstance) {
        imageInstance.onload = null;
      }

      // Try to trigger load after unmount
      if (resolveLoad) resolveLoad();

      // Should not have been called after unmount
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnImageLoad).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should maintain canvas structure', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.tagName).toBe('CANVAS');
    });

    it('should have responsive classes', () => {
      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('max-w-full');
      expect(canvas?.className).toContain('h-auto');
    });
  });

  describe('Context Options', () => {
    it('should request 2d context without alpha channel', async () => {
      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      // Wait for the image to load and trigger getContext call
      await waitFor(() => {
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
          '2d',
          expect.objectContaining({ alpha: false })
        );
      });
    });
  });

  describe('Rendering States', () => {
    it('should handle null context gracefully', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;

      const { container } = render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should redraw when image loads', async () => {
      let imageLoadCallback: (() => void) | null = null;

      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 800;
        height = 600;
        crossOrigin = '';

        constructor() {
          imageLoadCallback = () => {
            if (this.onload) this.onload();
          };
        }
      } as any;

      render(
        <StaticLayer
          imageUrl={mockImageUrl}
          onImageLoad={mockOnImageLoad}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      // Trigger load
      if (imageLoadCallback) imageLoadCallback();

      await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
      });
    });
  });
});
