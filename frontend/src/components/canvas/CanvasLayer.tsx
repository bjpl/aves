// CONCEPT: Multi-layer canvas architecture for optimized rendering
// WHY: Separate layers for static, interactive, and hover content to achieve 60fps
// PATTERN: Layered canvas rendering with dirty rectangle tracking

import React, { useRef, useEffect, useCallback } from 'react';

export interface LayerConfig {
  zIndex: number;
  opacity?: number;
  clearBeforeRender?: boolean;
}

export interface CanvasLayerProps {
  width: number;
  height: number;
  layerConfig: LayerConfig;
  onRender: (ctx: CanvasRenderingContext2D, timestamp?: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CanvasLayer - Individual canvas layer for optimized rendering
 *
 * Features:
 * - Independent rendering context
 * - requestAnimationFrame integration
 * - Dirty rectangle tracking support
 * - Z-index layering
 */
export const CanvasLayer: React.FC<CanvasLayerProps> = ({
  width,
  height,
  layerConfig,
  onRender,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const render = useCallback((timestamp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Clear canvas if configured
    if (layerConfig.clearBeforeRender !== false) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Apply opacity
    if (layerConfig.opacity !== undefined) {
      ctx.globalAlpha = layerConfig.opacity;
    }

    // Execute render callback
    onRender(ctx, timestamp);

    // Reset alpha
    ctx.globalAlpha = 1;
  }, [onRender, layerConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    // Initial render
    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, render]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: layerConfig.zIndex,
        pointerEvents: 'none',
        ...style
      }}
    />
  );
};

/**
 * Hook for managing canvas layer rendering with requestAnimationFrame
 */
export const useCanvasAnimation = (
  callback: (timestamp: number) => void,
  deps: React.DependencyList = []
) => {
  const animationFrameRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    callback(timestamp);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, ...deps]);

  return {
    cancel: () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };
};

/**
 * Dirty rectangle tracker for optimized partial redraws
 */
export class DirtyRectTracker {
  private dirtyRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  private isDirty = false;

  markDirty(x: number, y: number, width: number, height: number): void {
    this.dirtyRects.push({ x, y, width, height });
    this.isDirty = true;
  }

  markFullDirty(canvasWidth: number, canvasHeight: number): void {
    this.dirtyRects = [{ x: 0, y: 0, width: canvasWidth, height: canvasHeight }];
    this.isDirty = true;
  }

  getDirtyRegions(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.dirtyRects;
  }

  clear(): void {
    this.dirtyRects = [];
    this.isDirty = false;
  }

  hasDirtyRegions(): boolean {
    return this.isDirty;
  }

  /**
   * Merge overlapping rectangles to reduce draw calls
   */
  optimize(): void {
    if (this.dirtyRects.length <= 1) return;

    const optimized: typeof this.dirtyRects = [];
    const sorted = [...this.dirtyRects].sort((a, b) => a.x - b.x);

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if rectangles overlap or are adjacent
      if (this.rectanglesOverlap(current, next)) {
        current = this.mergeRectangles(current, next);
      } else {
        optimized.push(current);
        current = next;
      }
    }

    optimized.push(current);
    this.dirtyRects = optimized;
  }

  private rectanglesOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private mergeRectangles(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.max(a.x + a.width, b.x + b.width) - x;
    const height = Math.max(a.y + a.height, b.y + b.height) - y;

    return { x, y, width, height };
  }
}

/**
 * Performance monitor for canvas rendering
 */
export class CanvasPerformanceMonitor {
  private frameTimestamps: number[] = [];
  private drawCallCount = 0;
  private lastReportTime = 0;
  private readonly sampleSize = 60; // Track last 60 frames

  recordFrame(timestamp: number): void {
    this.frameTimestamps.push(timestamp);

    // Keep only last N frames
    if (this.frameTimestamps.length > this.sampleSize) {
      this.frameTimestamps.shift();
    }
  }

  recordDrawCall(): void {
    this.drawCallCount++;
  }

  getCurrentFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    const frameCount = this.frameTimestamps.length - 1;

    return Math.round((frameCount / timeSpan) * 1000);
  }

  getAverageFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const deltas: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return Math.round(1000 / avgDelta);
  }

  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  getMetrics(): {
    currentFPS: number;
    averageFPS: number;
    drawCalls: number;
    frameCount: number;
  } {
    return {
      currentFPS: this.getCurrentFPS(),
      averageFPS: this.getAverageFPS(),
      drawCalls: this.drawCallCount,
      frameCount: this.frameTimestamps.length
    };
  }

  reset(): void {
    this.frameTimestamps = [];
    this.drawCallCount = 0;
    this.lastReportTime = 0;
  }

  shouldReport(currentTime: number, intervalMs: number = 5000): boolean {
    if (currentTime - this.lastReportTime >= intervalMs) {
      this.lastReportTime = currentTime;
      return true;
    }
    return false;
  }
}

/**
 * Debounced event handler for hover events
 */
export const useDebouncedHover = <T = Element>(
  callback: (event: React.MouseEvent<T>) => void,
  delay: number = 16 // ~60fps
): ((event: React.MouseEvent<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((event: React.MouseEvent<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(event);
    }, delay);
  }, [callback, delay]);
};
