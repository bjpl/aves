// CONCEPT: Mobile-responsive annotation system with touch optimization
// WHY: Ensures annotations work seamlessly across all devices
// PATTERN: Responsive canvas with adaptive interaction modes

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, Coordinate } from '../../types';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import { useProgress } from '../../hooks/useProgress';
import { error as logError } from '../../utils/logger';

interface ResponsiveAnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationDiscover?: (annotation: Annotation) => void;
  showLabels?: boolean;
}

export const ResponsiveAnnotationCanvas: React.FC<ResponsiveAnnotationCanvasProps> = ({
  imageUrl,
  annotations,
  onAnnotationDiscover,
  showLabels = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [scale, setScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const { isMobile, hasTouch } = useMobileDetect();
  const { recordTermDiscovery } = useProgress();

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImage(img);
      updateCanvasSize();
    };

    img.onerror = () => {
      logError('Failed to load image', new Error(`Image URL: ${imageUrl}`));
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Update canvas size based on container and device
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current || !image) return;

    const container = containerRef.current;
    const maxWidth = container.clientWidth;
    const maxHeight = window.innerHeight * (isMobile ? 0.5 : 0.7);

    // Calculate scale to fit image in container
    const scaleX = maxWidth / image.width;
    const scaleY = maxHeight / image.height;
    const newScale = Math.min(scaleX, scaleY, 1);

    const width = Math.floor(image.width * newScale);
    const height = Math.floor(image.height * newScale);

    setScale(newScale);
    setCanvasSize({ width, height });
  }, [image, isMobile]);

  // Responsive resize handler
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw annotations
    annotations.forEach(annotation => {
      if (!annotation.isVisible) return;

      const { boundingBox } = annotation;
      const x = boundingBox.x * scale;
      const y = boundingBox.y * scale;
      const width = boundingBox.width * scale;
      const height = boundingBox.height * scale;

      // Determine annotation state
      const isHovered = hoveredAnnotation?.id === annotation.id;
      const isSelected = selectedAnnotation?.id === annotation.id;

      // Set styles based on state and device
      if (isSelected) {
        ctx.strokeStyle = '#10b981'; // Green
        ctx.lineWidth = isMobile ? 3 : 2;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      } else if (isHovered && !hasTouch) {
        ctx.strokeStyle = '#3b82f6'; // Blue
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      } else {
        ctx.strokeStyle = '#6b7280'; // Gray
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(107, 114, 128, 0.05)';
      }

      // Draw bounding box
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // Draw label if enabled or on mobile
      if (showLabels || isSelected || (isMobile && isHovered)) {
        ctx.fillStyle = isSelected ? '#10b981' : '#3b82f6';
        ctx.fillRect(x, y - 24, width, 24);

        ctx.fillStyle = 'white';
        ctx.font = `${isMobile ? '14px' : '12px'} sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          annotation.spanishTerm || '',
          x + width / 2,
          y - 12
        );
      }

      // Draw touch target indicator on mobile
      if (isMobile && !isSelected) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      }
    });
  }, [image, annotations, hoveredAnnotation, selectedAnnotation, scale, isMobile, hasTouch, showLabels]);

  // Get annotation at coordinate
  const getAnnotationAtPoint = useCallback((point: Coordinate): Annotation | null => {
    // Add touch tolerance for mobile
    const tolerance = isMobile ? 20 : 0;

    for (const annotation of annotations) {
      if (!annotation.isVisible) continue;

      const { boundingBox } = annotation;
      const x = boundingBox.x * scale;
      const y = boundingBox.y * scale;
      const width = boundingBox.width * scale;
      const height = boundingBox.height * scale;

      if (
        point.x >= x - tolerance &&
        point.x <= x + width + tolerance &&
        point.y >= y - tolerance &&
        point.y <= y + height + tolerance
      ) {
        return annotation;
      }
    }

    return null;
  }, [annotations, scale, isMobile]);

  // Handle mouse/touch events
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (hasTouch) return; // Skip hover on touch devices

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const annotation = getAnnotationAtPoint({ x, y });
    setHoveredAnnotation(annotation);

    canvas.style.cursor = annotation ? 'pointer' : 'default';
  }, [getAnnotationAtPoint, hasTouch]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const annotation = getAnnotationAtPoint({ x, y });

    if (annotation) {
      setSelectedAnnotation(annotation);
      onAnnotationDiscover?.(annotation);
      recordTermDiscovery(annotation.spanishTerm || '');

      // Vibrate on mobile for feedback
      if (hasTouch && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Auto-clear selection on mobile after delay
      if (isMobile) {
        setTimeout(() => {
          setSelectedAnnotation(null);
        }, 3000);
      }
    } else {
      setSelectedAnnotation(null);
    }
  }, [getAnnotationAtPoint, onAnnotationDiscover, recordTermDiscovery, hasTouch, isMobile]);

  const handlePointerLeave = useCallback(() => {
    setHoveredAnnotation(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-auto rounded-lg shadow-lg"
        onMouseMove={handlePointerMove}
        onMouseDown={handlePointerDown}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        style={{
          maxWidth: '100%',
          touchAction: 'manipulation' // Prevents zoom on double-tap
        }}
      />

      {/* Mobile instruction overlay */}
      {isMobile && annotations.length > 0 && !selectedAnnotation && (
        <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-50 text-white text-sm p-2 rounded-lg">
          Tap on highlighted areas to learn Spanish vocabulary
        </div>
      )}

      {/* Selected annotation info (mobile) */}
      {isMobile && selectedAnnotation && (
        <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg p-4 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedAnnotation.spanishTerm}
              </h3>
              <p className="text-sm text-gray-500 italic">
                {selectedAnnotation.pronunciation}
              </p>
              <p className="text-base text-gray-700 mt-1">
                {selectedAnnotation.englishTerm}
              </p>
            </div>
            <button
              onClick={() => setSelectedAnnotation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};