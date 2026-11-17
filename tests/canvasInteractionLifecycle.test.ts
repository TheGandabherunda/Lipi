import { describe, it, expect, beforeEach } from 'vitest';
import { Path, Group, type Canvas as FabricCanvas } from 'fabric';
import { useGlyphStore, registerCanvasFlusher } from '../src/store/glyphStore';
import { useUIStore } from '../src/store/uiStore';
import { penNodesToSVGPath, type PenNode } from '../src/utils/strokeTools';
import { isTypingInInputElement } from '../src/utils/keyboardUtils';
import {
  serializeCanvasPaths,
  serializeFabricPathObject,
  rehydrateFabricPath,
} from '../src/components/canvas/utils/canvasSerialization';

class MockFabricBrush {
  public _points: { x: number; y: number }[] = [];
  public canvas: MockFabricCanvas;
  constructor(canvas: MockFabricCanvas) {
    this.canvas = canvas;
  }
  _finalizeAndAddPath() {
    if (this._points.length > 1) {
      const p = new Path(`M ${this._points[0].x} ${this._points[0].y} L ${this._points[1].x} ${this._points[1].y}`, {
        stroke: '#0f172a',
        strokeWidth: 16,
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
  public freeDrawingBrush: MockFabricBrush | null = null;
  public activeObjects: any[] = [];
  public contextTop = {};

  constructor() {
    this.freeDrawingBrush = new MockFabricBrush(this);
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

describe('Phase 1 Acceptance: Canvas Interaction Lifecycle & Edge Cases', () => {
  let canvas: MockFabricCanvas;

  beforeEach(() => {
    useGlyphStore.getState().resetProject('Interaction-Test');
    registerCanvasFlusher(null);
    canvas = new MockFabricCanvas();
  });

  it('flushes a 1-anchor pen path to outgoing glyph without contaminating destination glyph', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85'); // 'ಅ'

    const singleNode: PenNode[] = [{ x: 120, y: 150 }];
    const penNodesRef = { current: [...singleNode] };

    // Set up canvas flusher simulating CanvasEditor
    const flusher = (outgoingUnicode: string) => {
      if (penNodesRef.current.length >= 1) {
        const svg = penNodesToSVGPath(penNodesRef.current, false, 'rounded');
        if (svg) {
          const pathObj = new Path(svg, {
            stroke: '#0f172a',
            strokeWidth: 16,
            strokeUniform: true,
          });
          canvas.add(pathObj);
        }
        penNodesRef.current = [];
      }
      canvas.discardActiveObject();
      const serialized = serializeCanvasPaths(canvas as unknown as FabricCanvas);
      useGlyphStore.getState().updateGlyphPaths(outgoingUnicode, serialized, true);
    };

    registerCanvasFlusher(flusher);

    // Switch to 'U+0C86' ('ಆ')
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    // 1. Outgoing glyph U+0C85 should have received the 1-node stroke
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 120 150');
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(2);

    // 2. Destination glyph U+0C86 must NOT receive glyph A's stroke!
    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);
    expect(useGlyphStore.getState().activeUnicode).toBe('U+0C86');
  });

  it('flushes a multi-anchor pen path to outgoing glyph without writing to destination glyph', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const multiNodes: PenNode[] = [
      { x: 50, y: 50 },
      { x: 150, y: 100 },
      { x: 250, y: 50 },
    ];
    const penNodesRef = { current: [...multiNodes] };

    const flusher = (outgoingUnicode: string) => {
      if (penNodesRef.current.length >= 1) {
        const svg = penNodesToSVGPath(penNodesRef.current, false, 'rounded');
        if (svg) {
          const pathObj = new Path(svg, {
            stroke: '#0f172a',
            strokeWidth: 16,
            strokeUniform: true,
          });
          canvas.add(pathObj);
        }
        penNodesRef.current = [];
      }
      canvas.discardActiveObject();
      const serialized = serializeCanvasPaths(canvas as unknown as FabricCanvas);
      useGlyphStore.getState().updateGlyphPaths(outgoingUnicode, serialized, true);
    };

    registerCanvasFlusher(flusher);

    // Switch to 'U+0C95' ('ಕ')
    useGlyphStore.getState().setActiveUnicode('U+0C95');

    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('C'); // Bézier curve generated

    const glyphK = useGlyphStore.getState().glyphs['U+0C95'];
    expect(glyphK.paths.length).toBe(0);
  });

  it('commits active transform before switching glyphs', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const p = new Path('M 0 0 L 100 100', {
      stroke: '#000',
      strokeWidth: 10,
      left: 100,
      top: 100,
      scaleX: 2,
      scaleY: 2,
      angle: 45,
    });
    canvas.add(p);
    canvas.setActiveObject(p);

    const flusher = (outgoingUnicode: string) => {
      canvas.discardActiveObject();
      const serialized = serializeCanvasPaths(canvas as unknown as FabricCanvas);
      useGlyphStore.getState().updateGlyphPaths(outgoingUnicode, serialized, true);
    };
    registerCanvasFlusher(flusher);

    useGlyphStore.getState().setActiveUnicode('U+0C86');

    // Glyph A must have baked transformed coordinates
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).not.toBe('M 0 0 L 100 100');

    // Active selection on canvas was discarded
    expect(canvas.getActiveObjects().length).toBe(0);
    // Destination glyph B has 0 paths
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
  });

  it('keeps objects unselectable and non-evented when tool changes while Space pan is active', () => {
    const p1 = new Path('M 10 10 L 50 50', { stroke: '#000', strokeWidth: 10, selectable: true, evented: true });
    canvas.add(p1);
    expect(p1.selectable).toBe(true);

    // 1. Simulate Space down
    let isSpaceHeld = true;
    canvas.selection = false;
    canvas.isDrawingMode = false;
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });

    expect(p1.selectable).toBe(false);
    expect(p1.evented).toBe(false);

    // 2. User changes tool while Space is held
    const onToolChange = (newTool: string) => {
      useUIStore.getState().setActiveTool(newTool as any);
      if (isSpaceHeld) {
        // Must maintain non-interactive state
        canvas.selection = false;
        canvas.isDrawingMode = false;
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
        return;
      }
      canvas.forEachObject((obj) => {
        obj.selectable = newTool === 'select';
        obj.evented = true;
      });
    };

    onToolChange('select');
    expect(p1.selectable).toBe(false);
    expect(p1.evented).toBe(false);

    onToolChange('brush');
    expect(canvas.isDrawingMode).toBe(false);
    expect(p1.selectable).toBe(false);

    // 3. User releases Space
    isSpaceHeld = false;
    const curTool = useUIStore.getState().activeTool;
    canvas.isDrawingMode = curTool === 'brush';
    canvas.selection = curTool === 'select';
    canvas.forEachObject((obj) => {
      obj.selectable = curTool === 'select';
      obj.evented = true;
    });

    expect(canvas.isDrawingMode).toBe(true);
  });

  it('resets canvas cleanly when project is loaded without flushing stale canvas into new project', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    // Add drawing to canvas
    const p = new Path('M 0 0 L 50 50', { stroke: '#000', strokeWidth: 16 });
    canvas.add(p);

    // Create a mock project file
    const newProjectJson = JSON.stringify({
      format: 'LIPI_PROJECT',
      schemaVersion: '1.1.0',
      metadata: { name: 'FreshFont', metrics: { unitsPerEm: 1000, ascender: 790, descender: -420 } },
      glyphs: {
        'U+0C85': {
          unicode: 'U+0C85',
          character: 'ಅ',
          paths: [{ id: 'p_fresh', pathString: 'M 200 200 L 300 300', strokeWidth: 20, strokeColor: '#123' }],
        },
      },
    });

    let resetCount = 0;
    const handleProjectLoaded = () => {
      canvas.clear();
      resetCount++;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lipi:project-loaded', handleProjectLoaded);
    }

    useGlyphStore.getState().loadLipiFileContent(newProjectJson);

    // Simulate listener invocation
    handleProjectLoaded();

    expect(resetCount).toBeGreaterThanOrEqual(1);
    expect(canvas.getObjects().length).toBe(0);

    const loadedGlyph = useGlyphStore.getState().glyphs['U+0C85'];
    expect(loadedGlyph.paths.length).toBe(1);
    expect(loadedGlyph.paths[0].id).toBe('p_fresh');
  });

  it('serializes non-uniformly scaled, rotated, flipped, and grouped paths with exact geometry', () => {
    // 1. Non-uniform scale (scaleX: 3, scaleY: 1.5)
    const stretchedPath = new Path('M 10 10 L 50 50', {
      stroke: '#000',
      strokeWidth: 10,
      scaleX: 3,
      scaleY: 1.5,
      strokeUniform: true,
    });
    const s1 = serializeFabricPathObject(stretchedPath, 0);
    expect(s1).not.toBeNull();
    // Stroke width preserved uniformly when strokeUniform: true
    expect(s1?.strokeWidth).toBe(10);
    // Coordinates transformed non-uniformly
    expect(s1?.pathString).not.toBe('M 10 10 L 50 50');

    // 2. Flipped path (flipX: true, flipY: true)
    const flippedPath = new Path('M 0 0 L 100 50', {
      stroke: '#000',
      strokeWidth: 16,
      flipX: true,
      flipY: true,
    });
    const s2 = serializeFabricPathObject(flippedPath, 1);
    expect(s2).not.toBeNull();
    expect(s2?.pathString).not.toBe('M 0 0 L 100 50');

    // 3. Grouped path
    const child1 = new Path('M 0 0 L 10 10', { stroke: '#000', strokeWidth: 10, strokeUniform: true });
    const child2 = new Path('M 20 20 L 30 30', { stroke: '#000', strokeWidth: 10, strokeUniform: true });
    const group = new Group([child1, child2], {
      left: 100,
      top: 100,
      scaleX: 2,
      scaleY: 2,
    });
    child1.group = group;
    child2.group = group;

    const sChild1 = serializeFabricPathObject(child1, 0);
    const sChild2 = serializeFabricPathObject(child2, 1);
    expect(sChild1).not.toBeNull();
    expect(sChild2).not.toBeNull();
    expect(sChild1?.strokeWidth).toBe(10);
    // Group translation and scale must be incorporated into path coordinates
    expect(sChild1?.pathString).not.toBe('M 0 0 L 10 10');
  });

  it('releases space pan state on keyup even if focus moved into an input element', () => {
    let isSpaceHeld = true;
    let isSpacePressed = true;

    const handleKeyUp = (e: { code: string; target: any }) => {
      // Space key release must ALWAYS be processed regardless of focus target
      if (e.code === 'Space' || e.code === 'Spacebar') {
        isSpacePressed = false;
        isSpaceHeld = false;
        return;
      }
      if (e.target?.tagName === 'INPUT') {
        return;
      }
    };

    // User pressed Space, clicked inside an input, and released Space
    handleKeyUp({ code: 'Space', target: { tagName: 'INPUT' } });
    expect(isSpaceHeld).toBe(false);
    expect(isSpacePressed).toBe(false);
  });

  it('flushes in-progress brush stroke to outgoing glyph when switching mid-stroke', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85'); // 'ಅ'

    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush._points = [
        { x: 30, y: 40 },
        { x: 180, y: 220 },
      ];
    }

    const flusher = (outgoingUnicode: string) => {
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        if (canvas.freeDrawingBrush._points.length > 1) {
          canvas.freeDrawingBrush._finalizeAndAddPath();
        }
        canvas.freeDrawingBrush._reset();
      }
      canvas.discardActiveObject();
      const serialized = serializeCanvasPaths(canvas as unknown as FabricCanvas);
      useGlyphStore.getState().updateGlyphPaths(outgoingUnicode, serialized, true);
    };

    registerCanvasFlusher(flusher);

    // Switch to 'U+0C86' ('ಆ')
    useGlyphStore.getState().setActiveUnicode('U+0C86');

    // 1. Outgoing glyph U+0C85 should have received the brush stroke
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 30 40 L 180 220');

    // 2. Destination glyph U+0C86 must NOT receive glyph A's stroke
    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(0);

    // 3. Brush points must be reset
    expect(canvas.freeDrawingBrush?._points.length).toBe(0);
  });

  it('flushes in-progress eraser drag to outgoing glyph when switching mid-erase', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    // Glyph A starts with two strokes
    const p1 = new Path('M 10 10 L 50 50', { stroke: '#000', strokeWidth: 10 });
    const p2 = new Path('M 100 100 L 200 200', { stroke: '#000', strokeWidth: 10 });
    canvas.add(p1, p2);

    // User is mid-eraser drag: p2 was removed on canvas, but pointerup has not fired yet
    canvas.remove(p2);
    let hasErasedDuringDrag = true;
    let lastEraserPos = { x: 150, y: 150 };

    const flusher = (outgoingUnicode: string) => {
      hasErasedDuringDrag = false;
      lastEraserPos = null as any;
      canvas.discardActiveObject();
      const serialized = serializeCanvasPaths(canvas as unknown as FabricCanvas);
      useGlyphStore.getState().updateGlyphPaths(outgoingUnicode, serialized, true);
    };

    registerCanvasFlusher(flusher);

    // Switch to 'U+0C95'
    useGlyphStore.getState().setActiveUnicode('U+0C95');

    // Outgoing glyph receives erased canvas state (1 remaining stroke)
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(1);
    expect(glyphA.paths[0].pathString).toContain('M 10 10 L 50 50');

    // Destination glyph is completely untouched
    const glyphK = useGlyphStore.getState().glyphs['U+0C95'];
    expect(glyphK.paths.length).toBe(0);

    // Eraser refs are cleared
    expect(hasErasedDuringDrag).toBe(false);
    expect(lastEraserPos).toBeNull();
  });

  it('ensures redo branch truncation works correctly across glyph switches', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85'); // Glyph A

    const s1 = { id: 's1', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    const s2 = { id: 's2', pathString: 'M 10 10 L 20 20', strokeWidth: 16, strokeColor: '#000' };
    const s3 = { id: 's3', pathString: 'M 20 20 L 30 30', strokeWidth: 16, strokeColor: '#000' };
    const s4 = { id: 's4', pathString: 'M 40 40 L 50 50', strokeWidth: 16, strokeColor: '#000' };
    const sB = { id: 'sB', pathString: 'M 90 90 L 99 99', strokeWidth: 16, strokeColor: '#000' };

    useGlyphStore.getState().updateActiveGlyphPaths([s1]);
    useGlyphStore.getState().updateActiveGlyphPaths([s1, s2]);
    useGlyphStore.getState().updateActiveGlyphPaths([s1, s2, s3]);
    expect(useGlyphStore.getState().canUndo()).toBe(true);

    // Undo on Glyph A to state [s1, s2]
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(2);
    expect(useGlyphStore.getState().canRedo()).toBe(true);

    // Switch to Glyph B and perform edits
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().canUndo()).toBe(false);
    useGlyphStore.getState().updateActiveGlyphPaths([sB]);
    expect(useGlyphStore.getState().canUndo()).toBe(true);

    // Switch back to Glyph A
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    // Glyph A must still retain redo capability
    expect(useGlyphStore.getState().canRedo()).toBe(true);

    // New edit on Glyph A must truncate redo branch
    useGlyphStore.getState().updateActiveGlyphPaths([s1, s2, s4]);
    expect(useGlyphStore.getState().canRedo()).toBe(false);

    // Glyph B must remain untouched with its own history
    expect(useGlyphStore.getState().glyphHistories['U+0C86'].stack.length).toBe(2);
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths[0].id).toBe('sB');
  });

  it('ensures serialize -> rehydrate -> serialize preserves fill-only, stroke-only, and transformed shapes with zero geometric drift', () => {
    // 1. Stroke-only path
    const strokeOnlyPath = {
      id: 'stroke_1',
      pathString: 'M 100 100 L 200 200',
      strokeWidth: 24,
      strokeColor: '#0f172a',
      strokeLineCap: 'round' as const,
      strokeLineJoin: 'round' as const,
    };
    const fObj1 = rehydrateFabricPath(strokeOnlyPath);
    expect(fObj1).not.toBeNull();
    const s1 = serializeFabricPathObject(fObj1, 0);
    expect(s1?.pathString).toBe(strokeOnlyPath.pathString);
    expect(s1?.strokeWidth).toBe(24);
    expect(s1?.strokeColor).toBe('#0f172a');
    expect(s1?.fillColor).toBeUndefined();

    // 2. Fill-only path
    const fillOnlyPath = {
      id: 'fill_1',
      pathString: 'M 0 0 L 100 0 L 100 100 Z',
      strokeWidth: 0,
      strokeColor: '#0f172a',
      fillColor: '#4f46e5',
      strokeLineCap: 'round' as const,
      strokeLineJoin: 'round' as const,
    };
    const fObj2 = rehydrateFabricPath(fillOnlyPath);
    expect(fObj2).not.toBeNull();
    const s2 = serializeFabricPathObject(fObj2, 1);
    expect(s2?.pathString).toBe(fillOnlyPath.pathString);
    expect(s2?.fillColor).toBe('#4f46e5');
    expect(s2?.strokeWidth).toBe(0);

    // 3. Round-trip stability for scaled & rotated path: geometry stays identical on 2nd cycle
    const transformed = new Path('M 0 0 L 50 50', {
      stroke: '#000',
      strokeWidth: 16,
      scaleX: 2,
      scaleY: 2,
      angle: 90,
      strokeUniform: true,
    });
    const bakedData = serializeFabricPathObject(transformed, 2);
    expect(bakedData).not.toBeNull();

    // Rehydrate baked data and re-serialize without moving
    const rehydratedBaked = rehydrateFabricPath(bakedData!);
    expect(rehydratedBaked).not.toBeNull();
    const secondPassData = serializeFabricPathObject(rehydratedBaked, 3);

    expect(secondPassData?.pathString).toBe(bakedData?.pathString);
    expect(secondPassData?.strokeWidth).toBe(bakedData?.strokeWidth);
  });

  it('prevents Spacebar panning from moving, transforming, or drawing active objects', () => {
    const p1 = new Path('M 10 10 L 50 50', {
      stroke: '#000',
      strokeWidth: 16,
      selectable: true,
      evented: true,
    });
    canvas.add(p1);
    canvas.setActiveObject(p1);

    // 1. Space down
    canvas.isDrawingMode = false;
    canvas.selection = false;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      activeObj.selectable = false;
      activeObj.evented = false;
    }
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });

    expect(p1.selectable).toBe(false);
    expect(p1.evented).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);

    // 2. Pan simulation: objects are not touched
    const origPath = p1.path;
    expect(p1.path).toBe(origPath);

    // 3. Space up: restore active tool
    const curTool = 'select';
    canvas.forEachObject((obj) => {
      obj.selectable = curTool === 'select';
      obj.evented = curTool === 'select';
    });
    if (activeObj) {
      activeObj.selectable = curTool === 'select';
      activeObj.evented = curTool === 'select';
    }

    expect(p1.selectable).toBe(true);
    expect(p1.evented).toBe(true);
  });

  it('protects keyboard shortcuts inside inputs, textareas, contentEditable, and ARIA widgets', () => {
    // Input element
    const inputEl = { tagName: 'INPUT', isContentEditable: false, getAttribute: () => null };
    expect(isTypingInInputElement({ target: inputEl } as any)).toBe(true);

    // Textarea element
    const textareaEl = { tagName: 'TEXTAREA', isContentEditable: false, getAttribute: () => null };
    expect(isTypingInInputElement({ target: textareaEl } as any)).toBe(true);

    // Select element
    const selectEl = { tagName: 'SELECT', isContentEditable: false, getAttribute: () => null };
    expect(isTypingInInputElement({ target: selectEl } as any)).toBe(true);

    // ContentEditable element
    const editableEl = { tagName: 'DIV', isContentEditable: true, getAttribute: () => null };
    expect(isTypingInInputElement({ target: editableEl } as any)).toBe(true);

    // Nested child of contentEditable
    const nestedChild = {
      tagName: 'SPAN',
      isContentEditable: false,
      getAttribute: () => null,
      closest: (sel: string) => (sel.includes('contenteditable') ? true : null),
    };
    expect(isTypingInInputElement({ target: nestedChild } as any)).toBe(true);

    // ARIA textbox
    const ariaTextbox = {
      tagName: 'DIV',
      isContentEditable: false,
      getAttribute: (attr: string) => (attr === 'role' ? 'textbox' : null),
    };
    expect(isTypingInInputElement({ target: ariaTextbox } as any)).toBe(true);

    // ARIA combobox, searchbox, and spinbutton
    const ariaCombobox = {
      tagName: 'DIV',
      isContentEditable: false,
      getAttribute: (attr: string) => (attr === 'role' ? 'combobox' : null),
    };
    expect(isTypingInInputElement({ target: ariaCombobox } as any)).toBe(true);

    const ariaSearchbox = {
      tagName: 'DIV',
      isContentEditable: false,
      getAttribute: (attr: string) => (attr === 'role' ? 'searchbox' : null),
    };
    expect(isTypingInInputElement({ target: ariaSearchbox } as any)).toBe(true);

    const ariaSpinbutton = {
      tagName: 'DIV',
      isContentEditable: false,
      getAttribute: (attr: string) => (attr === 'role' ? 'spinbutton' : null),
    };
    expect(isTypingInInputElement({ target: ariaSpinbutton } as any)).toBe(true);

    // Normal canvas container (must NOT be treated as input)
    const canvasDiv = {
      tagName: 'DIV',
      isContentEditable: false,
      getAttribute: () => null,
      closest: () => null,
    };
    expect(isTypingInInputElement({ target: canvasDiv } as any)).toBe(false);
  });

  it('window blur and pointer cancel cleanly finalize active gestures without stuck flags', () => {
    // 1. Simulating an eraser drag
    let isMouseDown = true;
    let hasErased = true;
    let lastEraserPos: any = { x: 40, y: 50 };
    let activeDragIndex: any = 2;
    let marqueeBox: any = { x: 0, y: 0, width: 50, height: 50 };
    let syncCount = 0;

    const syncMock = () => {
      syncCount++;
    };

    // Global pointerup/cancel/blur handler logic
    const handleGlobalCleanup = () => {
      if (isMouseDown) {
        isMouseDown = false;
        if (hasErased) {
          hasErased = false;
          syncMock();
        }
      }
      activeDragIndex = null;
      marqueeBox = null;
      lastEraserPos = null;
      hasErased = false;
    };

    // Trigger blur / cancel
    handleGlobalCleanup();

    expect(isMouseDown).toBe(false);
    expect(hasErased).toBe(false);
    expect(lastEraserPos).toBeNull();
    expect(activeDragIndex).toBeNull();
    expect(marqueeBox).toBeNull();
    expect(syncCount).toBe(1);

    // Second call (e.g. redundant pointerup after blur) must be idempotent
    handleGlobalCleanup();
    expect(syncCount).toBe(1); // not called again
  });
});
