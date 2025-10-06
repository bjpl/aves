/**
 * Bounding Box Format Converter
 *
 * Handles conversion between two bounding box formats:
 *
 * BACKEND FORMAT (flat):
 * { x: number, y: number, width: number, height: number }
 *
 * EDITOR FORMAT (nested):
 * { topLeft: {x, y}, bottomRight: {x, y}, width: number, height: number }
 */

export interface BackendBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditorBoundingBox {
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  width: number;
  height: number;
}

/**
 * Convert from backend format to editor format
 */
export function toEditorFormat(backend: BackendBoundingBox | EditorBoundingBox): EditorBoundingBox {
  // If already in editor format, return as-is
  if ('topLeft' in backend) {
    return backend as EditorBoundingBox;
  }

  // Convert from backend format
  return {
    topLeft: { x: backend.x, y: backend.y },
    bottomRight: { x: backend.x + backend.width, y: backend.y + backend.height },
    width: backend.width,
    height: backend.height
  };
}

/**
 * Convert from editor format to backend format
 */
export function toBackendFormat(editor: EditorBoundingBox | BackendBoundingBox): BackendBoundingBox {
  // If already in backend format, return as-is
  if ('x' in editor && !('topLeft' in editor)) {
    return editor as BackendBoundingBox;
  }

  // Convert from editor format
  const editorBox = editor as EditorBoundingBox;
  return {
    x: editorBox.topLeft.x,
    y: editorBox.topLeft.y,
    width: editorBox.width,
    height: editorBox.height
  };
}

/**
 * Normalize any bounding box to backend format (for API requests)
 */
export function normalizeForAPI(box: any): BackendBoundingBox {
  if (!box) throw new Error('Bounding box is required');

  // Handle both formats
  if ('topLeft' in box) {
    return toBackendFormat(box as EditorBoundingBox);
  } else if ('x' in box && 'y' in box) {
    return box as BackendBoundingBox;
  } else {
    throw new Error('Invalid bounding box format');
  }
}
