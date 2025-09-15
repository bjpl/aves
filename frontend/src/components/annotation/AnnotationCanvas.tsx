import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, BoundingBox, Coordinate } from '../../../../shared/types/annotation.types';

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationHover?: (annotation: Annotation | null) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  interactive?: boolean;
  showLabels?: boolean;
}

const ANNOTATION_COLORS = {
  anatomical: '#3B82F6',
  behavioral: '#10B981',
  color: '#F59E0B',
  pattern: '#8B5CF6'
};

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  annotations,
  onAnnotationHover,
  onAnnotationClick,
  interactive = true,
  showLabels = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredAnnotation, setHoveredAnnotation] = useState<Annotation | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const loadImage = useCallback(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !imageLoaded) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    annotations.forEach(annotation => {
      const { boundingBox, type } = annotation;
      const color = ANNOTATION_COLORS[type];
      const isHovered = hoveredAnnotation?.id === annotation.id;

      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.setLineDash(isHovered ? [] : [5, 5]);

      const x = boundingBox.topLeft.x;
      const y = boundingBox.topLeft.y;
      const width = boundingBox.width;
      const height = boundingBox.height;

      ctx.strokeRect(x, y, width, height);

      if (isHovered || showLabels) {
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
  }, [annotations, dimensions, hoveredAnnotation, imageLoaded, showLabels]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
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
      canvasRef.current.style.cursor = annotation ? 'pointer' : 'default';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const point: Coordinate = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    const annotation = getAnnotationAtPoint(point);
    if (annotation) {
      onAnnotationClick?.(annotation);
    }
  };

  const handleMouseLeave = () => {
    setHoveredAnnotation(null);
    onAnnotationHover?.(null);
  };

  return (
    <div className="relative inline-block max-w-full">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        style={{
          width: dimensions.width ? '100%' : 'auto',
          maxWidth: dimensions.width
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Cargando imagen...</div>
        </div>
      )}
    </div>
  );
};