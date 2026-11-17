import type { Canvas } from 'fabric';
import { useGlyphStore } from '../../../store/glyphStore';
import { serializeCanvasPaths } from './canvasSerialization';
import { finalizeBrushStroke, hasActiveBrushStroke } from './fabricBrushAdapter';
import type { PenNode } from '../../../utils/strokeTools';

export interface EditorFlushContext {
  targetUnicode: string;
  canvas: Canvas | null | undefined;
  penNodesRef: { current: PenNode[] };
  isFlushInProgressRef: { current: boolean };
  lastFlushedUnicodeRef: { current: string | null };
  commitPenPath: (isClosed?: boolean, syncToStore?: boolean) => void;
  clearNodeEditing: () => void;
  debounceTimerRef: { current: ReturnType<typeof setTimeout> | null };
  activeDragIndexRef: { current: number | null };
  penDragStartPosRef: { current: any };
  lastEraserPosRef: { current: any };
  hasErasedDuringDragRef: { current: boolean };
  activeNodeDragRef: { current: any };
  marqueeBoxRef: { current: any };
  hoveredNodeInfoRef: { current: any };
  hoveredSegmentRef: { current: any };
  isMouseDownRef: { current: boolean };
}

/**
 * Synchronously flushes in-progress canvas artwork into the target glyph's state and per-glyph history.
 * Commits pending pen paths, in-progress brush strokes, active transforms, and node edits.
 */
export function flushEditorCanvasToGlyph(ctx: EditorFlushContext): void {
  const { canvas, targetUnicode } = ctx;
  if (!canvas) return;

  ctx.isFlushInProgressRef.current = true;

  try {
    // 1. Commit in-progress pen path (even 1 anchor point) to canvas WITHOUT syncing to store
    if (ctx.penNodesRef.current.length >= 1) {
      ctx.commitPenPath(false, false);
    } else {
      ctx.penNodesRef.current = [];
    }

    // 2. Finalize in-progress brush stroke if user was mid-stroke
    if (hasActiveBrushStroke(canvas)) {
      const res = finalizeBrushStroke(canvas);
      if (res.error) {
        throw new Error(`Failed to finalize active brush stroke before glyph switch: ${res.error.message}`);
      }
    }

    // 3. Clear active drag references
    ctx.activeDragIndexRef.current = null;
    ctx.penDragStartPosRef.current = null;
    ctx.lastEraserPosRef.current = null;
    ctx.hasErasedDuringDragRef.current = false;
    ctx.activeNodeDragRef.current = null;
    ctx.marqueeBoxRef.current = null;
    ctx.hoveredNodeInfoRef.current = null;
    ctx.hoveredSegmentRef.current = null;
    ctx.isMouseDownRef.current = false;

    // 4. Discard active object so any active selection transforms are baked into path coordinates
    canvas.discardActiveObject();
    ctx.clearNodeEditing();

    // 5. Clear any pending debounce timer
    if (ctx.debounceTimerRef.current) {
      clearTimeout(ctx.debounceTimerRef.current);
      ctx.debounceTimerRef.current = null;
    }

    // 6. Serialize all objects currently on canvas (including grouped paths)
    const pendingPaths = serializeCanvasPaths(canvas);

    // 7. Update targetUnicode directly in glyphStore with an independent history frame
    useGlyphStore.getState().updateGlyphPaths(targetUnicode, pendingPaths, true);
    ctx.lastFlushedUnicodeRef.current = targetUnicode;
  } finally {
    ctx.isFlushInProgressRef.current = false;
  }
}
