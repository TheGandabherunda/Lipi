import type { Canvas, FabricObject } from 'fabric';
import type { CanvasTool } from '../../../types/canvas';

export interface InteractionModeState {
  activeTool: CanvasTool;
  isSpaceHeld: boolean;
  isPanning: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  strokeCap?: CanvasLineCap;
  strokeJoin?: CanvasLineJoin;
  smoothing?: number;
}

/**
 * Single source of truth for applying canvas interaction modes:
 * Controls selection, drawingMode, object selectability & eventability, and cursors.
 */
export function applyCanvasInteractionMode(
  canvas: Canvas | null | undefined,
  state: InteractionModeState
): void {
  if (!canvas) return;

  const { activeTool, isSpaceHeld, isPanning } = state;
  const isPanModifierActive = isSpaceHeld || isPanning || activeTool === 'pan';

  if (isPanModifierActive) {
    // 1. Pan / Space-drag mode: strict isolation
    // Marquee selection and free-drawing must be off
    canvas.selection = false;
    canvas.isDrawingMode = false;

    const panCursor = isPanning ? 'grabbing' : 'grab';
    canvas.defaultCursor = panCursor;
    canvas.hoverCursor = panCursor;
    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.cursor = panCursor;
    }

    // Active selection & all canvas objects must NOT be selectable or evented while panning
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      activeObj.selectable = false;
      activeObj.evented = false;
    }

    canvas.forEachObject((obj: FabricObject) => {
      obj.selectable = false;
      obj.evented = false;
    });

    canvas.requestRenderAll();
    return;
  }

  // 2. Normal Tool Interaction Modes
  switch (activeTool) {
    case 'select': {
      canvas.isDrawingMode = false;
      canvas.selection = true; // Allow marquee drag selection
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'default';

      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.selectable = true;
        activeObj.evented = true;
      }

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = true;
        obj.evented = true;
      });
      break;
    }

    case 'direct-select': {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'pointer';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'default';

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = true; // Path must receive events so clicking loads it for node editing
      });
      break;
    }

    case 'brush': {
      canvas.selection = false;
      canvas.isDrawingMode = true;
      canvas.defaultCursor = 'none';
      canvas.hoverCursor = 'none';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'none';

      if (canvas.freeDrawingBrush) {
        if (state.strokeWidth !== undefined) canvas.freeDrawingBrush.width = state.strokeWidth;
        if (state.strokeColor !== undefined) canvas.freeDrawingBrush.color = state.strokeColor;
        if (state.strokeCap !== undefined) canvas.freeDrawingBrush.strokeLineCap = state.strokeCap;
        if (state.strokeJoin !== undefined) canvas.freeDrawingBrush.strokeLineJoin = state.strokeJoin;
        if (state.smoothing !== undefined) {
          (canvas.freeDrawingBrush as any).decimate = Math.max(0.5, (state.smoothing / 100) * 8);
        }
      }

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
      break;
    }

    case 'pen': {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'crosshair';

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
      break;
    }

    case 'eraser': {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'none';
      canvas.hoverCursor = 'none';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'none';

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = true;
      });
      break;
    }

    default: {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'grab';

      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
      break;
    }
  }

  canvas.requestRenderAll();
}
