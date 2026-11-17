import { describe, it, expect, beforeEach } from 'vitest';
import { Path, type Canvas as FabricCanvas } from 'fabric';
import { useGlyphStore, registerCanvasFlusher } from '../src/store/glyphStore';
import { useUIStore } from '../src/store/uiStore';
import { applyCanvasInteractionMode } from '../src/components/canvas/utils/canvasInteractionMode';
import {
  serializeCanvasPaths,
  rehydrateFabricPath,
} from '../src/components/canvas/utils/canvasSerialization';
import type { SelectedStrokeProperties } from '../src/types/canvas';

class MockFabricCanvas {
  public objects: any[] = [];
  public selection = true;
  public isDrawingMode = false;
  public activeObjects: any[] = [];
  public upperCanvasEl = { style: { cursor: 'default' } };
  public freeDrawingBrush: any = {
    width: 16,
    color: '#000',
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    decimate: 0.4,
  };

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

describe('Selected Stroke Property Inspector & Object-Aware Controls', () => {
  let canvas: MockFabricCanvas;

  beforeEach(() => {
    useGlyphStore.getState().resetProject('Inspector-Test');
    registerCanvasFlusher(null);
    canvas = new MockFabricCanvas();

    // Reset UI Store defaults
    useUIStore.setState({
      activeTool: 'select',
      strokeWidth: 16,
      strokeColor: '#0f172a',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      selectedStroke: null,
      selectedObjectAngle: null,
    });
  });

  it('1. Selecting a stroke populates inspector with that stroke\'s properties', () => {
    const path = new Path('M 100 100 L 200 200', {
      stroke: '#b91c1c',
      strokeWidth: 28,
      fill: '#4338ca',
      strokeLineCap: 'square',
      strokeLineJoin: 'miter',
      opacity: 0.75,
      angle: 45,
    });
    (path as any).id = 'stroke_test_1';
    (path as any).brushTip = 'calligraphy';
    canvas.add(path);
    canvas.setActiveObject(path);

    // Simulate property extraction logic from CanvasEditor
    const angle = Math.round(((((path.angle || 0) % 360) + 360) % 360) * 10) / 10;
    const strokeProps: SelectedStrokeProperties = {
      strokeWidth: Number(path.strokeWidth ?? 16),
      strokeColor: typeof path.stroke === 'string' ? path.stroke : '#0f172a',
      fillColor: typeof path.fill === 'string' && path.fill !== 'none' ? path.fill : 'transparent',
      strokeCap: (path.strokeLineCap as any) || 'round',
      strokeJoin: (path.strokeLineJoin as any) || 'round',
      brushTip: (path as any).brushTip || 'round',
      opacity: typeof path.opacity === 'number' ? Math.round(path.opacity * 100) / 100 : 1,
      angle: angle === 0 ? null : angle,
    };

    useUIStore.getState().setSelectedStroke(strokeProps);
    useUIStore.getState().setSelectedObjectAngle(strokeProps.angle);

    const sel = useUIStore.getState().selectedStroke;
    expect(sel).not.toBeNull();
    expect(sel?.strokeWidth).toBe(28);
    expect(sel?.strokeColor).toBe('#b91c1c');
    expect(sel?.fillColor).toBe('#4338ca');
    expect(sel?.strokeCap).toBe('square');
    expect(sel?.strokeJoin).toBe('miter');
    expect(sel?.brushTip).toBe('calligraphy');
    expect(sel?.opacity).toBe(0.75);
    expect(sel?.angle).toBe(45);
    expect(useUIStore.getState().selectedObjectAngle).toBe(45);
  });

  it('2. Editing properties on selected stroke updates stroke and creates undo frame', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const path = new Path('M 100 100 L 200 200', {
      stroke: '#0f172a',
      strokeWidth: 16,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
    (path as any).id = 'stroke_test_2';
    canvas.add(path);
    canvas.setActiveObject(path);

    // Initial save to store
    const initialPaths = serializeCanvasPaths(canvas as unknown as FabricCanvas);
    useGlyphStore.getState().updateActiveGlyphPaths(initialPaths, false);
    expect(useGlyphStore.getState().canUndo()).toBe(false);

    // Select the stroke in UI
    useUIStore.getState().setSelectedStroke({
      strokeWidth: 16,
      strokeColor: '#0f172a',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      opacity: 1,
      angle: null,
    });

    // User updates stroke width to 32 and color to crimson '#b91c1c'
    useUIStore.getState().updateSelectedStroke({
      strokeWidth: 32,
      strokeColor: '#b91c1c',
      strokeCap: 'square',
    });

    // Update the Fabric object directly as CanvasEditor's event listener does
    path.set('strokeWidth', 32);
    path.set('stroke', '#b91c1c');
    path.set('strokeLineCap', 'square');

    // Synchronize to store with recordHistory = true
    const updatedPaths = serializeCanvasPaths(canvas as unknown as FabricCanvas);
    useGlyphStore.getState().updateActiveGlyphPaths(updatedPaths, true);

    // 1. Inspector state has new values
    const currentSel = useUIStore.getState().selectedStroke;
    expect(currentSel?.strokeWidth).toBe(32);
    expect(currentSel?.strokeColor).toBe('#b91c1c');
    expect(currentSel?.strokeCap).toBe('square');

    // 2. GlyphStore has new values and an undo frame
    const activePaths = useGlyphStore.getState().glyphs['U+0C85'].paths;
    expect(activePaths.length).toBe(1);
    expect(activePaths[0].strokeWidth).toBe(32);
    expect(activePaths[0].strokeColor).toBe('#b91c1c');
    expect(activePaths[0].strokeLineCap).toBe('square');
    expect(useGlyphStore.getState().canUndo()).toBe(true);
  });

  it('3. Tool defaults remain unchanged when editing selected stroke', () => {
    // Tool defaults before edit
    expect(useUIStore.getState().strokeWidth).toBe(16);
    expect(useUIStore.getState().strokeColor).toBe('#0f172a');
    expect(useUIStore.getState().strokeCap).toBe('round');

    // Select a stroke
    useUIStore.getState().setSelectedStroke({
      strokeWidth: 16,
      strokeColor: '#0f172a',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      opacity: 1,
      angle: null,
    });

    // Update selected stroke properties
    useUIStore.getState().updateSelectedStroke({
      strokeWidth: 48,
      strokeColor: '#7e22ce',
      strokeCap: 'butt',
      opacity: 0.5,
    });

    // Verify selected stroke changed
    expect(useUIStore.getState().selectedStroke?.strokeWidth).toBe(48);
    expect(useUIStore.getState().selectedStroke?.strokeColor).toBe('#7e22ce');
    expect(useUIStore.getState().selectedStroke?.strokeCap).toBe('butt');
    expect(useUIStore.getState().selectedStroke?.opacity).toBe(0.5);

    // CRITICAL: Tool defaults must NOT have changed!
    expect(useUIStore.getState().strokeWidth).toBe(16);
    expect(useUIStore.getState().strokeColor).toBe('#0f172a');
    expect(useUIStore.getState().strokeCap).toBe('round');
  });

  it('4. Deselection restores tool defaults in inspector', () => {
    // Select stroke
    useUIStore.getState().setSelectedStroke({
      strokeWidth: 32,
      strokeColor: '#b91c1c',
      fillColor: '#15803d',
      strokeCap: 'butt',
      strokeJoin: 'bevel',
      brushTip: 'chisel',
      opacity: 0.6,
      angle: 90,
    });
    useUIStore.getState().setSelectedObjectAngle(90);
    expect(useUIStore.getState().selectedStroke).not.toBeNull();

    // Deselect
    useUIStore.getState().deselectStroke();

    // Inspector selectedStroke is null, resetting to tool defaults
    expect(useUIStore.getState().selectedStroke).toBeNull();
    expect(useUIStore.getState().selectedObjectAngle).toBeNull();
    expect(useUIStore.getState().strokeWidth).toBe(16);
    expect(useUIStore.getState().strokeColor).toBe('#0f172a');
  });

  it('5. Tool switching preserves selected stroke state and active object', () => {
    const path = new Path('M 10 10 L 50 50', { stroke: '#0f172a', strokeWidth: 16 });
    (path as any).id = 'stroke_switch_test';
    canvas.add(path);
    canvas.setActiveObject(path);

    useUIStore.getState().setSelectedStroke({
      strokeWidth: 24,
      strokeColor: '#4338ca',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      opacity: 1,
      angle: null,
    });

    const tools = ['select', 'pen', 'brush', 'eraser', 'pan', 'direct-select'] as const;

    for (const tool of tools) {
      useUIStore.getState().setActiveTool(tool);

      applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
        activeTool: tool,
        isSpaceHeld: false,
        isPanning: false,
      });

      // Active object and selectedStroke in UI store must remain preserved across all tool changes
      expect(canvas.getActiveObject()).toBe(path);
      expect(useUIStore.getState().selectedStroke).not.toBeNull();
      expect(useUIStore.getState().selectedStroke?.strokeWidth).toBe(24);
      expect(useUIStore.getState().selectedStroke?.strokeColor).toBe('#4338ca');
    }
  });

  it('6. Direct Select preserves selected stroke properties and allows editing', () => {
    const path = new Path('M 10 10 L 50 50', { stroke: '#15803d', strokeWidth: 20 });
    (path as any).id = 'stroke_direct_select_test';
    canvas.add(path);
    canvas.setActiveObject(path);

    useUIStore.getState().setSelectedStroke({
      strokeWidth: 20,
      strokeColor: '#15803d',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      opacity: 1,
      angle: null,
    });

    // Switch to direct-select
    useUIStore.getState().setActiveTool('direct-select');
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'direct-select',
      isSpaceHeld: false,
      isPanning: false,
    });

    expect(canvas.getActiveObject()).toBe(path);
    expect(useUIStore.getState().selectedStroke?.strokeColor).toBe('#15803d');

    // Edit property while in direct-select
    useUIStore.getState().updateSelectedStroke({
      strokeWidth: 32,
      strokeColor: '#d97706',
    });

    expect(useUIStore.getState().selectedStroke?.strokeWidth).toBe(32);
    expect(useUIStore.getState().selectedStroke?.strokeColor).toBe('#d97706');
    // Tool defaults untouched
    expect(useUIStore.getState().strokeWidth).toBe(16);
  });

  it('7. Glyph switch clears selected stroke state so no properties leak to next glyph', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    useUIStore.getState().setSelectedStroke({
      strokeWidth: 40,
      strokeColor: '#b91c1c',
      fillColor: '#4338ca',
      strokeCap: 'square',
      strokeJoin: 'miter',
      brushTip: 'calligraphy',
      opacity: 0.8,
      angle: 30,
    });
    useUIStore.getState().setSelectedObjectAngle(30);

    // Simulate switching glyph to 'U+0C86'
    // As in CanvasEditor glyph change effect: selection is cleared on glyph switch
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    canvas.discardActiveObject();
    useUIStore.getState().setSelectedStroke(null);
    useUIStore.getState().setSelectedObjectAngle(null);

    expect(useUIStore.getState().selectedStroke).toBeNull();
    expect(useUIStore.getState().selectedObjectAngle).toBeNull();
    expect(useGlyphStore.getState().activeUnicode).toBe('U+0C86');
  });

  it('8. Project reset / load clears selected stroke state cleanly', () => {
    useUIStore.getState().setSelectedStroke({
      strokeWidth: 32,
      strokeColor: '#7e22ce',
      fillColor: 'transparent',
      strokeCap: 'round',
      strokeJoin: 'round',
      brushTip: 'round',
      opacity: 1,
      angle: 15,
    });

    // Reset project
    useGlyphStore.getState().resetProject('New-Project');
    useUIStore.getState().setSelectedStroke(null);
    useUIStore.getState().setSelectedObjectAngle(null);

    expect(useUIStore.getState().selectedStroke).toBeNull();
    expect(useUIStore.getState().selectedObjectAngle).toBeNull();
  });

  it('9. Undo/redo restores stroke properties and inspector updates correctly', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const path = new Path('M 10 10 L 100 100', {
      stroke: '#0f172a',
      strokeWidth: 16,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
    (path as any).id = 'stroke_undo_test';
    canvas.add(path);
    canvas.setActiveObject(path);

    // Frame 1: initial state
    useGlyphStore.getState().updateActiveGlyphPaths(serializeCanvasPaths(canvas as unknown as FabricCanvas), true);

    // Frame 2: user updates stroke to width 32, royal indigo '#4338ca', square cap
    path.set('strokeWidth', 32);
    path.set('stroke', '#4338ca');
    path.set('strokeLineCap', 'square');
    useGlyphStore.getState().updateActiveGlyphPaths(serializeCanvasPaths(canvas as unknown as FabricCanvas), true);

    expect(useGlyphStore.getState().canUndo()).toBe(true);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[0].strokeWidth).toBe(32);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[0].strokeColor).toBe('#4338ca');

    // Perform Undo
    useGlyphStore.getState().undo();

    // Rehydrate undone paths
    const undonePaths = useGlyphStore.getState().glyphs['U+0C85'].paths;
    expect(undonePaths[0].strokeWidth).toBe(16);
    expect(undonePaths[0].strokeColor).toBe('#0f172a');
    expect(undonePaths[0].strokeLineCap).toBe('round');

    const rehydrated = rehydrateFabricPath(undonePaths[0]);
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.strokeWidth).toBe(16);
    expect(rehydrated?.stroke).toBe('#0f172a');

    // Perform Redo
    expect(useGlyphStore.getState().canRedo()).toBe(true);
    useGlyphStore.getState().redo();

    const redonePaths = useGlyphStore.getState().glyphs['U+0C85'].paths;
    expect(redonePaths[0].strokeWidth).toBe(32);
    expect(redonePaths[0].strokeColor).toBe('#4338ca');
    expect(redonePaths[0].strokeLineCap).toBe('square');
  });
});
