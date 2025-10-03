// CONCEPT: Multi-layer canvas architecture for 60fps rendering
// WHY: Separate rendering layers (static, interactive, hover) to minimize redraws
// PATTERN: Layered rendering with requestAnimationFrame and dirty rectangle tracking

import React, { useState, useCallback, useMemo } from 'react';
import { Annotation, Coordinate } from '../../../../shared/types/annotation.types';
import {
  CanvasPerformanceMonitor,
  DirtyRectTracker,
  useDebouncedHover
} from '../canvas/CanvasLayer';
import { StaticLayer } from './layers/StaticLayer';
import { InteractiveLayer } from './layers/InteractiveLayer';
import { HoverLayer } from './layers/HoverLayer';

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationHover?: (annotation: Annotation | null) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  interactive?: boolean;
  showLabels?: boolean;
}


export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  annotations,
  onAnnotationHover,
  onAnnotationClick,
  interactive = true,
  showLabels = false
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredAnnotation, setHoveredAnnotation] = useState<Annotation | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Performance monitoring
  const performanceMonitor = useMemo(() => new CanvasPerformanceMonitor(), []);
  const dirtyRectTracker = useMemo(() => new DirtyRectTracker(), []);

  const handleImageLoad = useCallback((_img: HTMLImageElement, dims: { width: number; height: number }) => {
    setDimensions(dims);
    setImageLoaded(true);
  }, []);

  const getAnnotationAtPoint = (point: Coordinate): Annotation | null => {
    for (const annotation of annotations) {
      const { boundingBox } = annotation;
      const { topLeft, width, height } = boundingBox;

      if (
        point.x >= topLeft.x &&
        point.x <= topLeft.x + width &&
        point.y >= topLeft.y &&
        point.y <= topLeft.y + height
      ) {
        return annotation;
      }
    }
    return null;
  };

  // Debounced hover handler for reduced redraws
  const handleMouseMoveInternal = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const point: Coordinate = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    const annotation = getAnnotationAtPoint(point);

    if (annotation !== hoveredAnnotation) {
      setHoveredAnnotation(annotation);
      onAnnotationHover?.(annotation);

      // Mark dirty region for hover layer
      if (annotation) {
        const { boundingBox } = annotation;
        dirtyRectTracker.markDirty(
          boundingBox.topLeft.x,
          boundingBox.topLeft.y - 30,
          Math.max(boundingBox.width, 150),
          boundingBox.height + 30
        );
      } else {
        dirtyRectTracker.markFullDirty(dimensions.width, dimensions.height);
      }

      e.currentTarget.style.cursor = annotation ? 'pointer' : 'default';
    }
  }, [interactive, dimensions, hoveredAnnotation, onAnnotationHover, dirtyRectTracker, getAnnotationAtPoint]);

  // Apply debouncing to reduce hover event processing
  const handleMouseMove = useDebouncedHover(handleMouseMoveInternal, 16);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const point: Coordinate = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    const annotation = getAnnotationAtPoint(point);
    if (annotation) {
      onAnnotationClick?.(annotation);

      dirtyRectTracker.markDirty(
        annotation.boundingBox.topLeft.x,
        annotation.boundingBox.topLeft.y,
        annotation.boundingBox.width,
        annotation.boundingBox.height
      );
    }
  }, [interactive, dimensions, onAnnotationClick, dirtyRectTracker, getAnnotationAtPoint]);

  const handleMouseLeave = useCallback(() => {
    setHoveredAnnotation(null);
    onAnnotationHover?.(null);
    dirtyRectTracker.markFullDirty(dimensions.width, dimensions.height);
  }, [onAnnotationHover, dimensions, dirtyRectTracker]);

  return (
    <div
      className="relative inline-block max-w-full"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
    >
      <StaticLayer
        imageUrl={imageUrl}
        onImageLoad={handleImageLoad}
        performanceMonitor={performanceMonitor}
      />

      <InteractiveLayer
        annotations={annotations}
        dimensions={dimensions}
        showLabels={showLabels}
        imageLoaded={imageLoaded}
        performanceMonitor={performanceMonitor}
      />

      <HoverLayer
        hoveredAnnotation={hoveredAnnotation}
        dimensions={dimensions}
        imageLoaded={imageLoaded}
        performanceMonitor={performanceMonitor}
      />

      {/* Spacer to maintain layout dimensions */}
      <div
        style={{
          width: dimensions.width || 'auto',
          height: dimensions.height || 'auto',
          visibility: 'hidden'
        }}
      />

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Cargando imagen...</div>
        </div>
      )}
    </div>
  );
};