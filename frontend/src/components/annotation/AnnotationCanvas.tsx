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
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
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
      const { x, y, width, height } = boundingBox;

      if (
        point.x >= x &&
        point.x <= x + width &&
        point.y >= y &&
        point.y <= y + height
      ) {
        return annotation;
      }
    }
    return null;
  };

  // Debounced hover handler for reduced redraws
  const handleMouseMoveInternal = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (!e.currentTarget) return; // Guard against null in debounced calls

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
          boundingBox.x,
          boundingBox.y - 30,
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
    if (!e.currentTarget) return; // Guard against null

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const point: Coordinate = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    const annotation = getAnnotationAtPoint(point);
    if (annotation) {
      setSelectedAnnotation(annotation);
      onAnnotationClick?.(annotation);

      dirtyRectTracker.markDirty(
        annotation.boundingBox.x,
        annotation.boundingBox.y,
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

  // Keyboard navigation handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !selectedAnnotation) return;

    const MOVE_AMOUNT = 5;
    let handled = false;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        // Move annotation up (visual feedback only, actual movement would need state management)
        console.log('Move annotation up by', MOVE_AMOUNT);
        handled = true;
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move annotation down
        console.log('Move annotation down by', MOVE_AMOUNT);
        handled = true;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Move annotation left
        console.log('Move annotation left by', MOVE_AMOUNT);
        handled = true;
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Move annotation right
        console.log('Move annotation right by', MOVE_AMOUNT);
        handled = true;
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedAnnotation(null);
        setHoveredAnnotation(null);
        onAnnotationHover?.(null);
        handled = true;
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        // Delete annotation (would need to call parent handler)
        console.log('Delete annotation', selectedAnnotation.id);
        handled = true;
        break;
      case 'Tab':
        // Allow tab to cycle through annotations
        if (!e.shiftKey && annotations.length > 0) {
          e.preventDefault();
          const currentIndex = annotations.findIndex(a => a.id === selectedAnnotation.id);
          const nextIndex = (currentIndex + 1) % annotations.length;
          const nextAnnotation = annotations[nextIndex];
          setSelectedAnnotation(nextAnnotation);
          setHoveredAnnotation(nextAnnotation);
          onAnnotationHover?.(nextAnnotation);
          handled = true;
        }
        break;
    }

    if (handled) {
      dirtyRectTracker.markFullDirty(dimensions.width, dimensions.height);
    }
  }, [interactive, selectedAnnotation, annotations, onAnnotationHover, dirtyRectTracker, dimensions]);

  return (
    <div
      className="relative inline-block max-w-full"
      role="application"
      aria-label={`Bird annotation canvas with ${annotations.length} annotations. Use arrow keys to move selected annotation, Escape to deselect, Delete to remove, Tab to cycle through annotations.`}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onClick={(e) => handleClick(e as any)}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
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