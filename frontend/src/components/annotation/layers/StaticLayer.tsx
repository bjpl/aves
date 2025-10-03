import React, { useRef, useEffect, useCallback } from 'react';
import { CanvasPerformanceMonitor } from '../../canvas/CanvasLayer';

interface StaticLayerProps {
  imageUrl: string;
  onImageLoad: (img: HTMLImageElement, dimensions: { width: number; height: number }) => void;
  performanceMonitor: CanvasPerformanceMonitor;
}

export const StaticLayer: React.FC<StaticLayerProps> = ({
  imageUrl,
  onImageLoad,
  performanceMonitor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawStaticLayer = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    performance.mark('static-layer-start');
    ctx.drawImage(img, 0, 0);
    performance.mark('static-layer-end');
    performance.measure('static-layer-render', 'static-layer-start', 'static-layer-end');

    performanceMonitor.recordDrawCall();
  }, [performanceMonitor]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawStaticLayer(img);
      onImageLoad(img, { width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl, drawStaticLayer, onImageLoad]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />
  );
};
