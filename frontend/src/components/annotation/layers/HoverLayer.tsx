import React, { useRef, useEffect, useCallback } from 'react';
import { Annotation } from '../../../../../shared/types/annotation.types';
import { CanvasPerformanceMonitor } from '../../canvas/CanvasLayer';

interface HoverLayerProps {
  hoveredAnnotation: Annotation | null;
  dimensions: { width: number; height: number };
  imageLoaded: boolean;
  performanceMonitor: CanvasPerformanceMonitor;
}

const ANNOTATION_COLORS = {
  anatomical: '#3B82F6',
  behavioral: '#10B981',
  color: '#F59E0B',
  pattern: '#8B5CF6'
};

export const HoverLayer: React.FC<HoverLayerProps> = ({
  hoveredAnnotation,
  dimensions,
  imageLoaded,
  performanceMonitor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const drawHoverLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    performance.mark('hover-layer-start');

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (hoveredAnnotation) {
        const { boundingBox, type } = hoveredAnnotation;
        const color = ANNOTATION_COLORS[type as keyof typeof ANNOTATION_COLORS] || '#3B82F6';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        const x = boundingBox.x;
        const y = boundingBox.y;
        const width = boundingBox.width;
        const height = boundingBox.height;

        ctx.strokeRect(x, y, width, height);

        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.fillRect(x, y - 30, Math.max(width, 150), 30);

        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(hoveredAnnotation.spanishTerm, x + 8, y - 15);
      }

      performance.mark('hover-layer-end');
      performance.measure('hover-layer-render', 'hover-layer-start', 'hover-layer-end');

      performanceMonitor.recordDrawCall();
      performanceMonitor.recordFrame(performance.now());

      if (performanceMonitor.shouldReport(performance.now())) {
        const metrics = performanceMonitor.getMetrics();
        console.log('[Canvas Performance]', {
          fps: metrics.currentFPS,
          avgFPS: metrics.averageFPS,
          drawCalls: metrics.drawCalls,
          frames: metrics.frameCount
        });
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [hoveredAnnotation, dimensions, imageLoaded, performanceMonitor]);

  useEffect(() => {
    drawHoverLayer();
  }, [drawHoverLayer]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 3,
        pointerEvents: 'auto'
      }}
    />
  );
};
