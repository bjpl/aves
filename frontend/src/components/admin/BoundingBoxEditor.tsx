/**
 * Interactive Bounding Box Editor
 *
 * CONCEPT: Drag-and-resize bounding box editor for annotation correction
 * WHY: Allow human reviewers to fix Claude's imprecise box positioning
 * PATTERN: Drag handles with real-time coordinate updates
 */

import React, { useState, useRef, useEffect } from 'react';

interface BoundingBox {
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  width: number;
  height: number;
}

interface BoundingBoxEditorProps {
  imageUrl: string;
  initialBox: BoundingBox;
  label: string;
  onSave: (box: BoundingBox) => void;
  onCancel: () => void;
}

export const BoundingBoxEditor: React.FC<BoundingBoxEditorProps> = ({
  imageUrl,
  initialBox,
  label,
  onSave,
  onCancel,
}) => {
  const [box, setBox] = useState(initialBox);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize', handle?: string) => {
    e.preventDefault();
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(handle || null);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    if (!isDragging && !isResizing) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStart.x) / rect.width;
    const deltaY = (e.clientY - dragStart.y) / rect.height;

    if (isDragging) {
      // Move entire box
      const newX = Math.max(0, Math.min(1 - box.width, box.topLeft.x + deltaX));
      const newY = Math.max(0, Math.min(1 - box.height, box.topLeft.y + deltaY));

      setBox({
        ...box,
        topLeft: { x: newX, y: newY },
        bottomRight: { x: newX + box.width, y: newY + box.height }
      });
    } else if (isResizing) {
      // Resize box based on handle
      let newBox = { ...box };

      if (isResizing.includes('n')) {
        // North - adjust top
        const newTop = Math.max(0, Math.min(box.bottomRight.y - 0.05, box.topLeft.y + deltaY));
        newBox.topLeft.y = newTop;
        newBox.height = newBox.bottomRight.y - newTop;
      }
      if (isResizing.includes('s')) {
        // South - adjust bottom
        const newBottom = Math.max(box.topLeft.y + 0.05, Math.min(1, box.bottomRight.y + deltaY));
        newBox.bottomRight.y = newBottom;
        newBox.height = newBottom - newBox.topLeft.y;
      }
      if (isResizing.includes('w')) {
        // West - adjust left
        const newLeft = Math.max(0, Math.min(box.bottomRight.x - 0.05, box.topLeft.x + deltaX));
        newBox.topLeft.x = newLeft;
        newBox.width = newBox.bottomRight.x - newLeft;
      }
      if (isResizing.includes('e')) {
        // East - adjust right
        const newRight = Math.max(box.topLeft.x + 0.05, Math.min(1, box.bottomRight.x + deltaX));
        newBox.bottomRight.x = newRight;
        newBox.width = newRight - newBox.topLeft.x;
      }

      setBox(newBox);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleReset = () => {
    setBox(initialBox);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔧 BoundingBoxEditor - handleSave called');
    console.log('🔧 BoundingBoxEditor - Current box:', box);
    onSave(box);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal if clicking backdrop
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg">
          <h3 className="text-xl font-bold">Adjust Bounding Box - {label}</h3>
          <p className="text-sm text-gray-300 mt-1">
            Drag the box to move • Drag corners/edges to resize • Click Save when done
          </p>
        </div>

        {/* Editor */}
        <div className="p-6">
          <div
            ref={containerRef}
            className="relative bg-gray-900 rounded-lg overflow-hidden select-none"
            style={{ paddingTop: '75%' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Bird Image */}
            <img
              src={imageUrl}
              alt={label}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Editable Bounding Box */}
            <div
              className={`absolute border-4 bg-yellow-400 bg-opacity-20 ${
                isDragging ? 'cursor-move border-green-400' : 'cursor-move border-yellow-400'
              }`}
              style={{
                left: `${box.topLeft.x * 100}%`,
                top: `${box.topLeft.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                boxShadow: isDragging
                  ? '0 0 30px rgba(34, 197, 94, 0.8)'
                  : '0 0 20px rgba(250, 204, 21, 0.6)',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'drag')}
            >
              {/* Label */}
              <div className="absolute -top-10 left-0 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-md text-sm font-bold shadow-lg whitespace-nowrap">
                {label}
              </div>

              {/* Resize Handles */}
              {/* Top-left */}
              <div
                className="absolute -left-2 -top-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-nw-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'nw'); }}
              />
              {/* Top-right */}
              <div
                className="absolute -right-2 -top-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-ne-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'ne'); }}
              />
              {/* Bottom-left */}
              <div
                className="absolute -left-2 -bottom-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-sw-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'sw'); }}
              />
              {/* Bottom-right */}
              <div
                className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-se-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'se'); }}
              />
              {/* Top edge */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-n-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'n'); }}
              />
              {/* Bottom edge */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-s-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 's'); }}
              />
              {/* Left edge */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-w-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'w'); }}
              />
              {/* Right edge */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-white border-2 border-yellow-600 rounded-full cursor-e-resize hover:scale-150 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize', 'e'); }}
              />
            </div>
          </div>

          {/* Coordinates Display */}
          <div className="mt-4 bg-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Coordinates (Normalized 0-1)</h4>
            <div className="grid grid-cols-4 gap-4 text-sm font-mono">
              <div>
                <span className="text-gray-600">X:</span>{' '}
                <span className="text-blue-600 font-bold">{box.topLeft.x.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">Y:</span>{' '}
                <span className="text-blue-600 font-bold">{box.topLeft.y.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">W:</span>{' '}
                <span className="text-green-600 font-bold">{box.width.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-600">H:</span>{' '}
                <span className="text-green-600 font-bold">{box.height.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex gap-3">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReset(); }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          >
            ↺ Reset to Original
          </button>
          <div className="flex-1"></div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              console.log('🔧 Save button clicked');
              handleSave(e);
            }}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors shadow-md"
          >
            💾 Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoundingBoxEditor;
