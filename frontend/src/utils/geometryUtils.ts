/**
 * Geometry Utilities for Polygon/Circle Bounding Box Support
 *
 * PROOF OF CONCEPT - Circle and Polygon Hit Detection
 *
 * Usage:
 *   - Point-in-circle testing for circular annotations
 *   - Point-in-polygon testing using ray casting algorithm
 *   - Supports all normalized (0-1) coordinates
 */

export interface Point {
  x: number;
  y: number;
}

export interface Circle {
  centerX: number;
  centerY: number;
  radius: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Polygon {
  points: Point[];
}

/**
 * Test if a point is inside a circle
 *
 * Algorithm: Distance from center <= radius
 * Complexity: O(1)
 *
 * @param point - Point to test (normalized 0-1 coordinates)
 * @param circle - Circle to test against (normalized 0-1 coordinates)
 * @returns true if point is inside circle
 */
export function pointInCircle(point: Point, circle: Circle): boolean {
  const dx = point.x - circle.centerX;
  const dy = point.y - circle.centerY;
  const distanceSquared = dx * dx + dy * dy;
  const radiusSquared = circle.radius * circle.radius;

  return distanceSquared <= radiusSquared;
}

/**
 * Test if a point is inside a rectangle
 *
 * Algorithm: Simple bounds checking
 * Complexity: O(1)
 *
 * @param point - Point to test (normalized 0-1 coordinates)
 * @param rect - Rectangle to test against (normalized 0-1 coordinates)
 * @returns true if point is inside rectangle
 */
export function pointInRectangle(point: Point, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Test if a point is inside a polygon using ray casting algorithm
 *
 * Algorithm: Ray Casting (odd-even rule)
 * - Cast a ray from the point to infinity (horizontal)
 * - Count intersections with polygon edges
 * - Odd count = inside, Even count = outside
 *
 * Complexity: O(n) where n = number of vertices
 *
 * Handles:
 * - Convex polygons
 * - Concave polygons
 * - Self-intersecting polygons (using odd-even rule)
 *
 * @param point - Point to test (normalized 0-1 coordinates)
 * @param polygon - Polygon to test against (normalized 0-1 coordinates)
 * @returns true if point is inside polygon
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  // Edge case: polygon must have at least 3 vertices
  if (polygon.points.length < 3) {
    return false;
  }

  const { x, y } = point;
  let inside = false;

  // Ray casting algorithm
  // For each edge of the polygon
  for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
    const xi = polygon.points[i].x;
    const yi = polygon.points[i].y;
    const xj = polygon.points[j].x;
    const yj = polygon.points[j].y;

    // Check if ray from point crosses this edge
    const intersect =
      ((yi > y) !== (yj > y)) && // Edge crosses horizontal line through point
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi); // Point is left of intersection

    if (intersect) {
      inside = !inside; // Toggle inside/outside
    }
  }

  return inside;
}

/**
 * Render a circle on canvas context
 *
 * @param ctx - Canvas 2D rendering context
 * @param circle - Circle to render (normalized 0-1 coordinates)
 * @param dimensions - Canvas dimensions in pixels
 * @param style - Rendering style options
 */
export function renderCircle(
  ctx: CanvasRenderingContext2D,
  circle: Circle,
  dimensions: { width: number; height: number },
  style: {
    strokeStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
    fillStyle?: string;
    globalAlpha?: number;
  } = {}
): void {
  // Convert normalized coordinates to pixels
  const centerX = circle.centerX * dimensions.width;
  const centerY = circle.centerY * dimensions.height;
  // Use average dimension for radius to maintain circular shape
  const radius = circle.radius * Math.min(dimensions.width, dimensions.height);

  // Apply styles
  if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
  if (style.lineWidth) ctx.lineWidth = style.lineWidth;
  if (style.lineDash) ctx.setLineDash(style.lineDash);
  if (style.fillStyle) ctx.fillStyle = style.fillStyle;
  if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;

  // Draw circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

  if (style.fillStyle) {
    ctx.fill();
  }
  if (style.strokeStyle) {
    ctx.stroke();
  }

  // Reset styles
  if (style.lineDash) ctx.setLineDash([]);
  if (style.globalAlpha !== undefined) ctx.globalAlpha = 1;
}

/**
 * Render a polygon on canvas context
 *
 * @param ctx - Canvas 2D rendering context
 * @param polygon - Polygon to render (normalized 0-1 coordinates)
 * @param dimensions - Canvas dimensions in pixels
 * @param style - Rendering style options
 */
export function renderPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  dimensions: { width: number; height: number },
  style: {
    strokeStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
    fillStyle?: string;
    globalAlpha?: number;
  } = {}
): void {
  // Edge case: polygon must have at least 3 vertices
  if (polygon.points.length < 3) {
    // This is debug-level logging since it's expected during annotation creation
    // warn('Cannot render polygon with fewer than 3 vertices', { points: polygon.points.length });
    return;
  }

  // Apply styles
  if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
  if (style.lineWidth) ctx.lineWidth = style.lineWidth;
  if (style.lineDash) ctx.setLineDash(style.lineDash);
  if (style.fillStyle) ctx.fillStyle = style.fillStyle;
  if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;

  // Draw polygon
  ctx.beginPath();

  // Start at first vertex (convert normalized to pixels)
  const firstPoint = polygon.points[0];
  ctx.moveTo(
    firstPoint.x * dimensions.width,
    firstPoint.y * dimensions.height
  );

  // Draw lines to remaining vertices
  for (let i = 1; i < polygon.points.length; i++) {
    const point = polygon.points[i];
    ctx.lineTo(
      point.x * dimensions.width,
      point.y * dimensions.height
    );
  }

  // Close path back to first vertex
  ctx.closePath();

  if (style.fillStyle) {
    ctx.fill();
  }
  if (style.strokeStyle) {
    ctx.stroke();
  }

  // Reset styles
  if (style.lineDash) ctx.setLineDash([]);
  if (style.globalAlpha !== undefined) ctx.globalAlpha = 1;
}

/**
 * Render an ellipse on canvas context
 *
 * @param ctx - Canvas 2D rendering context
 * @param ellipse - Ellipse to render (normalized 0-1 coordinates)
 * @param dimensions - Canvas dimensions in pixels
 * @param style - Rendering style options
 */
export function renderEllipse(
  ctx: CanvasRenderingContext2D,
  ellipse: { centerX: number; centerY: number; radiusX: number; radiusY: number },
  dimensions: { width: number; height: number },
  style: {
    strokeStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
    fillStyle?: string;
    globalAlpha?: number;
  } = {}
): void {
  // Convert normalized coordinates to pixels
  const centerX = ellipse.centerX * dimensions.width;
  const centerY = ellipse.centerY * dimensions.height;
  const radiusX = ellipse.radiusX * dimensions.width;
  const radiusY = ellipse.radiusY * dimensions.height;

  // Apply styles
  if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
  if (style.lineWidth) ctx.lineWidth = style.lineWidth;
  if (style.lineDash) ctx.setLineDash(style.lineDash);
  if (style.fillStyle) ctx.fillStyle = style.fillStyle;
  if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;

  // Draw ellipse
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);

  if (style.fillStyle) {
    ctx.fill();
  }
  if (style.strokeStyle) {
    ctx.stroke();
  }

  // Reset styles
  if (style.lineDash) ctx.setLineDash([]);
  if (style.globalAlpha !== undefined) ctx.globalAlpha = 1;
}

/**
 * Calculate bounding rectangle for a polygon
 * Useful for dirty rectangle tracking
 *
 * @param polygon - Polygon to calculate bounds for
 * @returns Bounding rectangle in normalized coordinates
 */
export function getPolygonBounds(polygon: Polygon): Rectangle {
  if (polygon.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = polygon.points[0].x;
  let maxX = polygon.points[0].x;
  let minY = polygon.points[0].y;
  let maxY = polygon.points[0].y;

  for (const point of polygon.points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Convert rectangle to circle (inscribed or circumscribed)
 * Useful for migration or fallback scenarios
 *
 * @param rect - Rectangle to convert
 * @param mode - 'inscribed' (circle fits inside rect) or 'circumscribed' (circle contains rect)
 * @returns Circle approximating the rectangle
 */
export function rectangleToCircle(rect: Rectangle, mode: 'inscribed' | 'circumscribed' = 'inscribed'): Circle {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let radius: number;
  if (mode === 'inscribed') {
    // Circle fits inside rectangle (radius = smallest dimension / 2)
    radius = Math.min(rect.width, rect.height) / 2;
  } else {
    // Circle contains rectangle (radius = diagonal / 2)
    radius = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
  }

  return { centerX, centerY, radius };
}

/**
 * Test if two circles overlap
 * Useful for annotation collision detection
 *
 * @param circle1 - First circle
 * @param circle2 - Second circle
 * @returns true if circles overlap
 */
export function circlesOverlap(circle1: Circle, circle2: Circle): boolean {
  const dx = circle1.centerX - circle2.centerX;
  const dy = circle1.centerY - circle2.centerY;
  const distanceSquared = dx * dx + dy * dy;
  const radiusSum = circle1.radius + circle2.radius;

  return distanceSquared < radiusSum * radiusSum;
}
