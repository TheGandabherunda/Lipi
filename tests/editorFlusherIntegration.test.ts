import { describe, it, expect, beforeEach } from 'vitest';
import { Path, type Canvas as FabricCanvas } from 'fabric';
import { useGlyphStore, registerCanvasFlusher } from '../src/store/glyphStore';
import { useUIStore } from '../src/store/uiStore';
import { flushEditorCanvasToGlyph, type EditorFlushContext } from '../src/components/canvas/utils/canvasFlusher';
import { hasActiveBrushStroke, finalizeBrushStroke } from '../src/components/canvas/utils/fabricBrushAdapter';
import { penNodesToSVGPath, type PenNode } from '../src/utils/strokeTools';
import { serializeCanvasPaths } from '../src/components/canvas/utils/canvasSerialization';

class MockPencilBrush {
  public _points: { x: number; y: number }[] = [];
  public canvas: any;
  public width = 16;
  public color = '#0f172a';

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  _finalizeAndAddPath() {
    if (this._points.length > 1) {
      const p = new Path(`M ${this._points[0].x} ${this._points[0].y} L ${this._points[1].x} ${this._points[1].y}`, {
        stroke: this.color,
        strokeWidth: this.width,
        strokeUniform: true,
      });
      this.canvas.add(p);
    }
  }

  _reset() {
    this._points = [];
  }
}

class MockFabricCanvas {
  public objects: any[] = [];
  public selection = true;
  public isDrawingMode = false;
  public freeDrawingBrush: MockPencilBrush;
  public activeObjects: any[] = [];
  public contextTop = { closePath: () => {} };

  constructor() {
    this.freeDrawingBrush = new MockPencilBrush(this);
  }

  getObjects() {
    return [...this.objects];
  }
  add(...objs: any[]) {
    this.objects.push(...objs);
  }
  remove(...objs: any[]) {
    this.objects = this.objects.filter((o) => !objs.includes(o));
    this.activeObjects = this.activeObjects.filter((o) => !objs.includes(o));
  }
  clear() {
    this.objects = [];
    this.activeObjects = [];
  }
  clearContext(_ctx?: any) {}
  setActiveObject(obj: any) {
    this.activeObjects = [obj];
  }
  getActiveObject() {
    return this.activeObjects[0] || null;
  }
  getActiveObjects() {
    return [...this.activeObjects];
  }
  discardActiveObject() {
    this.activeObjects = [];
  }
  forEachObject(callback: (obj: any) => void) {
    this.objects.forEach(callback);
  }
  requestRenderAll() {}
}

describe('Editor Canvas Flusher & Active Tool Transition Integration', () => {
  let canvas: MockFabricCanvas;
  let penNodesRef: { current: PenNode[] };
  let isFlushInProgressRef: { current: boolean };
  let lastFlushedUnicodeRef: { current: string | null };
  let debounceTimerRef: { current: any };
  let activeDragIndexRef: { current: number | null };
  let penDragStartPosRef: { current: any };
  let lastEraserPosRef: { current: any };
  let hasErasedDuringDragRef: { current: boolean };
  let activeNodeDragRef: { current: any };
  let marqueeBoxRef: { current: any };
  let hoveredNodeInfoRef: { current: any };
  let hoveredSegmentRef: { current: any };
  let isMouseDownRef: { current: boolean };

  const commitPenPath = (isClosed = false, syncToStore = true) => {
    if (penNodesRef.current.length >= 1) {
      const svg = penNodesToSVGPath(penNodesRef.current, isClosed, 'rounded');
      if (svg) {
        const pathObj = new Path(svg, {
          stroke: '#0f172a',
          strokeWidth: 16,
          strokeUniform: true,
        });
        canvas.add(pathObj);
        if (syncToStore) {
          const paths = serializeCanvasPaths(canvas as unknown as FabricCanvas);
          useGlyphStore.getState().updateActiveGlyphPaths(paths, true);
        }
      }
    }
    penNodesRef.current = [];
  };

  const clearNodeEditing = () => {};

  const createRealFlushContext = (targetUnicode: string): EditorFlushContext => ({
    targetUnicode,
    canvas: canvas as unknown as FabricCanvas,
    penNodesRef,
    isFlushInProgressRef,
    lastFlushedUnicodeRef,
    commitPenPath,
    clearNodeEditing,
    debounceTimerRef,
    activeDragIndexRef,
    penDragStartPosRef,
    lastEraserPosRef,
    hasErasedDuringDragRef,
    activeNodeDragRef,
    marqueeBoxRef,
    hoveredNodeInfoRef,
    hoveredSegmentRef,
    isMouseDownRef,
  });

  beforeEach(() => {
    useGlyphStore.getState().resetProject('Flusher-Integration');
    canvas = new MockFabricCanvas();
    penNodesRef = { current: [] };
    isFlushInProgressRef = { current: false };
    lastFlushedUnicodeRef = { current: null };
    debounceTimerRef = { current: null };
    activeDragIndexRef = { current: null };
    penDragStartPosRef = { current: null };
    lastEraserPosRef = { current: null };
    hasErasedDuringDragRef = { current: false };
    activeNodeDragRef = { current: null };
    marqueeBoxRef = { current: null };
    hoveredNodeInfoRef = { current: null };
    hoveredSegmentRef = { current: null };
    isMouseDownRef = { current: false };

    // Register the REAL editor flusher with the store
    registerCanvasFlusher((outgoingUnicode: string) => {
      flushEditorCanvasToGlyph(createRealFlushContext(outgoingUnicode));
    });
  });

  it('Regression: switching tools during an active brush stroke commits the stroke to current glyph and history', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85'); // 'ಅ'
    useUIStore.getState().setActiveTool('brush');
    canvas.isDrawingMode = true;

    // User is mid-brush stroke
    canvas.freeDrawingBrush._points = [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    isMouseDownRef.current = true;

    expect(hasActiveBrushStroke(canvas as unknown as FabricCanvas)).toBe(true);

    // Simulate switching activeTool from 'brush' to 'select'
    const newTool = 'select';
    if (newTool !== 'brush' && hasActiveBrushStroke(canvas as unknown as FabricCanvas)) {
      const res = finalizeBrushStroke(canvas as unknown as FabricCanvas);
      if (res.committed) {
        const paths = serializeCanvasPaths(canvas as unknown as FabricCanvas);
        useGlyphStore.getState().updateActiveGlyphPaths(paths, true);
      }
    }
    isMouseDownRef.current = false;
    useUIStore.getState().setActiveTool(newTool);

    // Current glyph U+0C85 must have received the finalized brush stroke
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 10 10 L 100 100');
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(2);
    expect(hasActiveBrushStroke(canvas as unknown as FabricCanvas)).toBe(false);
  });

  it('flushes an active pen path (1 anchor or multi-anchor) through real editor flusher on glyph switch', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    // 1-anchor in-progress pen node
    penNodesRef.current = [{ x: 50, y: 60 }];

    // Switch glyphs: triggers registered real flusher
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    // Outgoing glyph receives path
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 50 60');

    // Destination glyph is completely clean
    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);
    expect(useGlyphStore.getState().activeUnicode).toBe('U+0C86');
  });

  it('flushes an active brush stroke through real editor flusher on glyph switch', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush._points = [
      { x: 25, y: 35 },
      { x: 125, y: 135 },
    ];

    // Switch glyphs
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 25 35 L 125 135');

    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);
  });

  it('flushes an active eraser operation through real editor flusher on glyph switch', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    const p1 = new Path('M 10 10 L 20 20', { stroke: '#000', strokeWidth: 10 });
    const p2 = new Path('M 30 30 L 40 40', { stroke: '#000', strokeWidth: 10 });
    canvas.add(p1, p2);

    // Eraser removed p2 during drag
    canvas.remove(p2);
    hasErasedDuringDragRef.current = true;
    lastEraserPosRef.current = { x: 35, y: 35 };

    // Switch glyphs
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 10 10 L 20 20');

    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);
    expect(hasErasedDuringDragRef.current).toBe(false);
  });

  it('bakes active selection transform through real editor flusher on glyph switch', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const path = new Path('M 0 0 L 100 100', {
      stroke: '#000',
      strokeWidth: 10,
      scaleX: 2.5,
      scaleY: 1.5,
      angle: 30,
      strokeUniform: true,
    });
    canvas.add(path);
    canvas.setActiveObject(path);

    // Switch glyphs: real flusher discards active selection and bakes transform matrix
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    // Coordinates must be transformed
    expect(glyphA.paths[0].pathString).not.toBe('M 0 0 L 100 100');
    expect(canvas.getActiveObjects().length).toBe(0);

    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);
  });
});
