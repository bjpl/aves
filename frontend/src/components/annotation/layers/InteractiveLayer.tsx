import React, { useRef, useEffect, useCallback } from 'react';
import { Annotation } from '../../../../../shared/types/annotation.types';
import { CanvasPerformanceMonitor } from '../../canvas/CanvasLayer';

interface InteractiveLayerProps {
  annotations: Annotation[];
  dimensions: { width: number; height: number };
  showLabels: boolean;
  imageLoaded: boolean;
  performanceMonitor: CanvasPerformanceMonitor;
}

const ANNOTATION_COLORS = {
  anatomical: '#3B82F6',
  behavioral: '#10B981',
  color: '#F59E0B',
  pattern: '#8B5CF6'
};

export const InteractiveLayer: React.FC<InteractiveLayerProps> = ({
  annotations,
  dimensions,
  showLabels,
  imageLoaded,
  performanceMonitor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawInteractiveLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    performance.mark('interactive-layer-start');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach(annotation => {
      const { boundingBox, type } = annotation;
      const color = ANNOTATION_COLORS[type as keyof typeof ANNOTATION_COLORS] || '#3B82F6';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      const x = boundingBox.topLeft.x;
      const y = boundingBox.topLeft.y;
      const width = boundingBox.width;
      const height = boundingBox.height;

      ctx.strokeRect(x, y, width, height);

      if (showLabels) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y - 25, width, 25);

        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(annotation.spanishTerm, x + 5, y - 12);
      }

      ctx.setLineDash([]);
    });

    performance.mark('interactive-layer-end');
    performance.measure('interactive-layer-render', 'interactive-layer-start', 'interactive-layer-end');

    performanceMonitor.recordDrawCall();
  }, [annotations, dimensions, imageLoaded, showLabels, performanceMonitor]);

  useEffect(() => {
    drawInteractiveLayer();
  }, [drawInteractiveLayer]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 2,
        pointerEvents: 'none'
      }}
    />
  );
};
