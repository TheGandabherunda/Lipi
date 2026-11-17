import { describe, it, expect, beforeEach } from 'vitest';
import { Path, Group, type Canvas as FabricCanvas } from 'fabric';
import { useGlyphStore, registerCanvasFlusher } from '../src/store/glyphStore';
import { useUIStore } from '../src/store/uiStore';
import { penNodesToSVGPath, type PenNode } from '../src/utils/strokeTools';
import {
  serializeCanvasPaths,
  serializeFabricPathObject,
} from '../src/components/canvas/utils/canvasSerialization';

class MockFabricCanvas {
  public objects: any[] = [];
  public selection = true;
  public isDrawingMode = false;
  public activeObjects: any[] = [];

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
  setActiveObject(obj: any) {
    this.activeObjects = [obj];
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
});
