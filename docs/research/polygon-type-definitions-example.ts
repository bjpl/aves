/**
 * EXAMPLE TYPE DEFINITIONS FOR POLYGON SUPPORT
 *
 * This file demonstrates how to extend AVES annotation types
 * to support circles, ellipses, and polygons.
 *
 * Location: shared/types/annotation.types.ts (when implemented)
 *
 * PROOF OF CONCEPT - Not currently in use
 */

// ============================================================================
// SHAPE TYPE DEFINITIONS
// ============================================================================

export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'polygon';

/**
 * Rectangle bounding box (current AVES implementation)
 * Normalized coordinates (0-1)
 */
export interface RectangleBox {
  type: 'rectangle';
  x: number;      // Top-left X (0-1)
  y: number;      // Top-left Y (0-1)
  width: number;  // Width (0-1)
  height: number; // Height (0-1)
}

/**
 * Circle bounding box
 * Normalized coordinates (0-1)
 *
 * Example use cases:
 * - Bird eye annotations
 * - Beak tip points
 * - Small feature highlights
 */
export interface CircleBox {
  type: 'circle';
  centerX: number; // Center X (0-1)
  centerY: number; // Center Y (0-1)
  radius: number;  // Radius (0-1, relative to image width)
}

/**
 * Ellipse bounding box
 * Normalized coordinates (0-1)
 *
 * Example use cases:
 * - Bird body outlines
 * - Wing shapes
 * - Head shapes
 */
export interface EllipseBox {
  type: 'ellipse';
  centerX: number;  // Center X (0-1)
  centerY: number;  // Center Y (0-1)
  radiusX: number;  // Horizontal radius (0-1)
  radiusY: number;  // Vertical radius (0-1)
  rotation?: number; // Rotation angle in radians (optional, default 0)
}

/**
 * Polygon bounding box
 * Normalized coordinates (0-1)
 *
 * Example use cases:
 * - Irregular wing shapes
 * - Beak outlines
 * - Tail feather patterns
 * - Complex plumage patterns
 */
export interface PolygonBox {
  type: 'polygon';
  points: Array<{ x: number; y: number }>; // Vertices (0-1 normalized)
}

/**
 * Union type for all supported bounding box shapes
 *
 * TypeScript discriminated union enables type-safe handling:
 *   if (box.type === 'circle') {
 *     // TypeScript knows box has centerX, centerY, radius
 *   }
 */
export type BoundingBox = RectangleBox | CircleBox | EllipseBox | PolygonBox;

// ============================================================================
// ANNOTATION INTERFACE (UPDATED)
// ============================================================================

export type AnnotationType = 'anatomical' | 'behavioral' | 'color' | 'pattern' | 'habitat';

export interface Annotation {
  id: string;
  imageId: string;
  boundingBox: BoundingBox;  // NOW SUPPORTS MULTIPLE SHAPES
  type: AnnotationType;
  spanishTerm: string;
  englishTerm: string;
  pronunciation?: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DATABASE SCHEMA MAPPING
// ============================================================================

/**
 * Example database storage for polygon annotations
 *
 * PostgreSQL JSONB column stores shape data:
 *
 * Rectangle:
 *   { "type": "rectangle", "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.25 }
 *
 * Circle:
 *   { "type": "circle", "centerX": 0.5, "centerY": 0.5, "radius": 0.1 }
 *
 * Ellipse:
 *   { "type": "ellipse", "centerX": 0.5, "centerY": 0.5, "radiusX": 0.15, "radiusY": 0.1 }
 *
 * Polygon:
 *   {
 *     "type": "polygon",
 *     "points": [
 *       { "x": 0.1, "y": 0.2 },
 *       { "x": 0.3, "y": 0.15 },
 *       { "x": 0.4, "y": 0.3 },
 *       { "x": 0.2, "y": 0.35 }
 *     ]
 *   }
 *
 * SQL Migration:
 *   ALTER TABLE annotations
 *     ADD COLUMN shape_type VARCHAR(20) DEFAULT 'rectangle'
 *     CHECK (shape_type IN ('rectangle', 'circle', 'ellipse', 'polygon'));
 *
 *   -- No change to bounding_box column (already JSONB)
 */

// ============================================================================
// TYPE GUARDS (Runtime Type Checking)
// ============================================================================

export function isRectangleBox(box: BoundingBox): box is RectangleBox {
  return box.type === 'rectangle';
}

export function isCircleBox(box: BoundingBox): box is CircleBox {
  return box.type === 'circle';
}

export function isEllipseBox(box: BoundingBox): box is EllipseBox {
  return box.type === 'ellipse';
}

export function isPolygonBox(box: BoundingBox): box is PolygonBox {
  return box.type === 'polygon';
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Creating a circle annotation for a bird's eye
const eyeAnnotation: Annotation = {
  id: 'a1b2c3d4',
  imageId: 'img_123',
  boundingBox: {
    type: 'circle',
    centerX: 0.6,
    centerY: 0.3,
    radius: 0.02
  },
  type: 'anatomical',
  spanishTerm: 'Ojo',
  englishTerm: 'Eye',
  difficultyLevel: 1,
  isVisible: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example 2: Creating a polygon annotation for a wing
const wingAnnotation: Annotation = {
  id: 'e5f6g7h8',
  imageId: 'img_123',
  boundingBox: {
    type: 'polygon',
    points: [
      { x: 0.2, y: 0.4 },
      { x: 0.5, y: 0.3 },
      { x: 0.6, y: 0.5 },
      { x: 0.4, y: 0.7 },
      { x: 0.2, y: 0.6 }
    ]
  },
  type: 'anatomical',
  spanishTerm: 'Ala',
  englishTerm: 'Wing',
  difficultyLevel: 3,
  isVisible: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example 3: Type-safe rendering switch
function renderAnnotation(annotation: Annotation, ctx: CanvasRenderingContext2D) {
  const { boundingBox } = annotation;

  switch (boundingBox.type) {
    case 'rectangle':
      // TypeScript knows: x, y, width, height
      ctx.strokeRect(
        boundingBox.x,
        boundingBox.y,
        boundingBox.width,
        boundingBox.height
      );
      break;

    case 'circle':
      // TypeScript knows: centerX, centerY, radius
      ctx.arc(
        boundingBox.centerX,
        boundingBox.centerY,
        boundingBox.radius,
        0,
        2 * Math.PI
      );
      break;

    case 'ellipse':
      // TypeScript knows: centerX, centerY, radiusX, radiusY
      ctx.ellipse(
        boundingBox.centerX,
        boundingBox.centerY,
        boundingBox.radiusX,
        boundingBox.radiusY,
        0,
        0,
        2 * Math.PI
      );
      break;

    case 'polygon':
      // TypeScript knows: points array
      ctx.beginPath();
      ctx.moveTo(boundingBox.points[0].x, boundingBox.points[0].y);
      for (let i = 1; i < boundingBox.points.length; i++) {
        ctx.lineTo(boundingBox.points[i].x, boundingBox.points[i].y);
      }
      ctx.closePath();
      break;
  }
}

// ============================================================================
// W3C WEB ANNOTATION FORMAT CONVERSION
// ============================================================================

/**
 * Convert AVES BoundingBox to W3C Web Annotation Selector
 * (For Annotorious compatibility)
 */
export function toW3CSelector(box: BoundingBox, imageWidth: number, imageHeight: number): object {
  switch (box.type) {
    case 'rectangle': {
      const x = Math.round(box.x * imageWidth);
      const y = Math.round(box.y * imageHeight);
      const w = Math.round(box.width * imageWidth);
      const h = Math.round(box.height * imageHeight);

      return {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=pixel:${x},${y},${w},${h}`
      };
    }

    case 'circle': {
      const cx = Math.round(box.centerX * imageWidth);
      const cy = Math.round(box.centerY * imageHeight);
      const r = Math.round(box.radius * Math.min(imageWidth, imageHeight));

      return {
        type: 'SvgSelector',
        value: `<svg><circle cx="${cx}" cy="${cy}" r="${r}"/></svg>`
      };
    }

    case 'polygon': {
      const points = box.points
        .map(p => `${Math.round(p.x * imageWidth)},${Math.round(p.y * imageHeight)}`)
        .join(' ');

      return {
        type: 'SvgSelector',
        value: `<svg><polygon points="${points}"/></svg>`
      };
    }

    case 'ellipse': {
      const cx = Math.round(box.centerX * imageWidth);
      const cy = Math.round(box.centerY * imageHeight);
      const rx = Math.round(box.radiusX * imageWidth);
      const ry = Math.round(box.radiusY * imageHeight);

      return {
        type: 'SvgSelector',
        value: `<svg><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></svg>`
      };
    }
  }
}

/**
 * Convert W3C Web Annotation Selector to AVES BoundingBox
 * (For importing Annotorious annotations)
 */
export function fromW3CSelector(selector: any, imageWidth: number, imageHeight: number): BoundingBox | null {
  if (selector.type === 'FragmentSelector' && selector.value.startsWith('xywh=pixel:')) {
    // Parse: "xywh=pixel:100,200,150,100"
    const coords = selector.value.replace('xywh=pixel:', '').split(',').map(Number);
    const [x, y, w, h] = coords;

    return {
      type: 'rectangle',
      x: x / imageWidth,
      y: y / imageHeight,
      width: w / imageWidth,
      height: h / imageHeight
    };
  }

  if (selector.type === 'SvgSelector') {
    const svg = selector.value;

    // Parse circle: <svg><circle cx="100" cy="100" r="50"/></svg>
    const circleMatch = svg.match(/<circle\s+cx="(\d+)"\s+cy="(\d+)"\s+r="(\d+)"/);
    if (circleMatch) {
      const [, cx, cy, r] = circleMatch.map(Number);
      return {
        type: 'circle',
        centerX: cx / imageWidth,
        centerY: cy / imageHeight,
        radius: r / Math.min(imageWidth, imageHeight)
      };
    }

    // Parse polygon: <svg><polygon points="100,100 150,80 200,120"/></svg>
    const polygonMatch = svg.match(/<polygon\s+points="([^"]+)"/);
    if (polygonMatch) {
      const pointsStr = polygonMatch[1];
      const points = pointsStr.split(/\s+/).map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return {
          x: x / imageWidth,
          y: y / imageHeight
        };
      });
      return {
        type: 'polygon',
        points
      };
    }
  }

  return null; // Unsupported format
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Convert old flat format to new discriminated union
 * Supports migration from existing AVES annotations
 */
export function migrateLegacyBoundingBox(legacy: {
  x: number;
  y: number;
  width: number;
  height: number;
}): RectangleBox {
  return {
    type: 'rectangle',
    ...legacy
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateBoundingBox(box: BoundingBox): string[] {
  const errors: string[] = [];

  switch (box.type) {
    case 'rectangle':
      if (box.x < 0 || box.x > 1) errors.push('Rectangle x must be 0-1');
      if (box.y < 0 || box.y > 1) errors.push('Rectangle y must be 0-1');
      if (box.width <= 0 || box.x + box.width > 1) errors.push('Invalid rectangle width');
      if (box.height <= 0 || box.y + box.height > 1) errors.push('Invalid rectangle height');
      break;

    case 'circle':
      if (box.centerX < 0 || box.centerX > 1) errors.push('Circle centerX must be 0-1');
      if (box.centerY < 0 || box.centerY > 1) errors.push('Circle centerY must be 0-1');
      if (box.radius <= 0 || box.radius > 0.5) errors.push('Circle radius must be 0-0.5');
      break;

    case 'polygon':
      if (box.points.length < 3) errors.push('Polygon must have at least 3 vertices');
      for (const point of box.points) {
        if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
          errors.push('All polygon vertices must be within 0-1');
          break;
        }
      }
      break;

    case 'ellipse':
      if (box.centerX < 0 || box.centerX > 1) errors.push('Ellipse centerX must be 0-1');
      if (box.centerY < 0 || box.centerY > 1) errors.push('Ellipse centerY must be 0-1');
      if (box.radiusX <= 0 || box.radiusX > 0.5) errors.push('Ellipse radiusX must be 0-0.5');
      if (box.radiusY <= 0 || box.radiusY > 0.5) errors.push('Ellipse radiusY must be 0-0.5');
      break;
  }

  return errors;
}
