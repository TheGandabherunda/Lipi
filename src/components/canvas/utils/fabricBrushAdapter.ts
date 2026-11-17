import type { Canvas, FabricObject } from 'fabric';

export interface BrushFinalizationResult {
  committed: boolean;
  path?: FabricObject;
  error?: Error;
}

/**
 * Checks whether the canvas free-drawing brush has active recorded stroke points.
 */
export function hasActiveBrushStroke(canvas: Canvas | null | undefined): boolean {
  if (!canvas || !canvas.freeDrawingBrush) return false;
  const brush = canvas.freeDrawingBrush as any;
  return Array.isArray(brush._points) && brush._points.length > 0;
}

/**
 * Finalizes an in-progress brush stroke onto the canvas.
 * Inspects Fabric 7.x PencilBrush internal points and commits them to canvas.
 * If finalization fails, throws/returns an error rather than silently omitting the stroke.
 */
export function finalizeBrushStroke(canvas: Canvas | null | undefined): BrushFinalizationResult {
  if (!canvas || !canvas.freeDrawingBrush) {
    return { committed: false };
  }

  const brush = canvas.freeDrawingBrush as any;
  const points = brush._points;
  if (!Array.isArray(points) || points.length === 0) {
    return { committed: false };
  }

  // Need at least 2 points to form a segment (if 1 point, add a slight offset point to capture the dot)
  if (points.length < 2) {
    const pt = points[0];
    points.push({ x: pt.x + 0.1, y: pt.y + 0.1 });
  }

  try {
    // 1. Try Fabric native _finalizeAndAddPath
    if (typeof brush._finalizeAndAddPath === 'function') {
      if (canvas.contextTop && typeof canvas.contextTop.closePath !== 'function') {
        canvas.contextTop.closePath = () => {};
      }
      brush._finalizeAndAddPath();
      const objects = canvas.getObjects();
      const addedPath = objects[objects.length - 1];
      brushReset(canvas);
      return { committed: true, path: addedPath };
    }

    // 2. Fallback: manually construct path from points if _finalizeAndAddPath is unavailable
    if (typeof brush.convertPointsToSVGPath === 'function' && typeof brush.createPath === 'function') {
      const svgPathData = brush.convertPointsToSVGPath(points);
      const pathObj = brush.createPath(svgPathData);
      if (pathObj) {
        canvas.add(pathObj);
        canvas.requestRenderAll();
        if (typeof pathObj.setCoords === 'function') pathObj.setCoords();
        canvas.fire('path:created', { path: pathObj });
        brushReset(canvas);
        return { committed: true, path: pathObj };
      }
    }

    throw new Error('Fabric brush has neither _finalizeAndAddPath nor convertPointsToSVGPath');
  } catch (err) {
    brushReset(canvas);
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Failed to finalize brush stroke:', error);
    return { committed: false, error };
  }
}

/**
 * Safely cancels an in-progress brush stroke, clearing points and top canvas context.
 */
export function cancelBrushStroke(canvas: Canvas | null | undefined): void {
  if (!canvas || !canvas.freeDrawingBrush) return;
  brushReset(canvas);
}

function brushReset(canvas: Canvas) {
  const brush = canvas.freeDrawingBrush as any;
  if (!brush) return;
  brush._points = [];
  if (typeof brush._reset === 'function') {
    try {
      brush._reset();
    } catch {
      // Ignore reset failure in non-standard context
    }
  }
  if (canvas.clearContext && canvas.contextTop) {
    try {
      canvas.clearContext(canvas.contextTop);
    } catch {}
  }
}
