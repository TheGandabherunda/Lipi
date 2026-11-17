import { describe, it, expect, beforeEach } from 'vitest';
import type { Canvas as FabricCanvas } from 'fabric';
import { applyCanvasInteractionMode } from '../src/components/canvas/utils/canvasInteractionMode';

class MockObject {
  public selectable = true;
  public evented = true;
}

class MockFabricCanvas {
  public selection = true;
  public isDrawingMode = false;
  public defaultCursor = 'default';
  public hoverCursor = 'default';
  public objects: MockObject[] = [];
  public activeObject: MockObject | null = null;
  public upperCanvasEl = { style: { cursor: 'default' } };
  public freeDrawingBrush: any = {
    width: 16,
    color: '#000',
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    decimate: 0.4,
  };

  getActiveObject() {
    return this.activeObject;
  }
  discardActiveObject() {
    this.activeObject = null;
  }
  forEachObject(cb: (obj: any) => void) {
    this.objects.forEach(cb);
  }
  requestRenderAll() {}
}

describe('Canvas Interaction Mode Centralization', () => {
  let canvas: MockFabricCanvas;
  let obj1: MockObject;
  let obj2: MockObject;

  beforeEach(() => {
    canvas = new MockFabricCanvas();
    obj1 = new MockObject();
    obj2 = new MockObject();
    canvas.objects = [obj1, obj2];
  });

  it('strictly isolates canvas and locks objects when Space is held regardless of tool', () => {
    canvas.activeObject = obj1;

    // 1. Tool is 'select', but Space is held
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'select',
      isSpaceHeld: true,
      isPanning: false,
    });

    expect(canvas.selection).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);
    expect(canvas.defaultCursor).toBe('grab');
    expect(canvas.upperCanvasEl.style.cursor).toBe('grab');
    expect(obj1.selectable).toBe(false);
    expect(obj1.evented).toBe(false);
    expect(obj2.selectable).toBe(false);
    expect(obj2.evented).toBe(false);

    // 2. User switches tool to 'brush' while Space is still held
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'brush',
      isSpaceHeld: true,
      isPanning: false,
    });

    // Must remain strictly locked in pan mode!
    expect(canvas.selection).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);
    expect(obj1.selectable).toBe(false);
    expect(obj1.evented).toBe(false);

    // 3. User begins dragging (panning = true)
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'brush',
      isSpaceHeld: true,
      isPanning: true,
    });

    expect(canvas.defaultCursor).toBe('grabbing');
    expect(canvas.upperCanvasEl.style.cursor).toBe('grabbing');
    expect(obj1.selectable).toBe(false);

    // 4. User releases Space
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'brush',
      isSpaceHeld: false,
      isPanning: false,
    });

    // Cleanly restores brush mode
    expect(canvas.isDrawingMode).toBe(true);
    expect(canvas.selection).toBe(false);
    expect(canvas.defaultCursor).toBe('none');
  });

  it('restores select mode with marquee selection and selectable objects when Space is released', () => {
    canvas.activeObject = obj1;

    // Space held
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'select',
      isSpaceHeld: true,
      isPanning: false,
    });
    expect(obj1.selectable).toBe(false);

    // Space released
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'select',
      isSpaceHeld: false,
      isPanning: false,
    });

    expect(canvas.selection).toBe(true);
    expect(canvas.isDrawingMode).toBe(false);
    expect(canvas.defaultCursor).toBe('default');
    expect(obj1.selectable).toBe(true);
    expect(obj1.evented).toBe(true);
    expect(obj2.selectable).toBe(true);
    expect(obj2.evented).toBe(true);
  });

  it('configures pen tool mode with crosshair cursor and non-selectable objects', () => {
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'pen',
      isSpaceHeld: false,
      isPanning: false,
    });

    expect(canvas.selection).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);
    expect(canvas.defaultCursor).toBe('crosshair');
    expect(canvas.upperCanvasEl.style.cursor).toBe('crosshair');
    expect(obj1.selectable).toBe(false);
    expect(obj1.evented).toBe(false);
  });

  it('configures direct-select tool mode where objects are evented but not bounding-box selectable', () => {
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'direct-select',
      isSpaceHeld: false,
      isPanning: false,
    });

    expect(canvas.selection).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);
    expect(canvas.hoverCursor).toBe('pointer');
    expect(obj1.selectable).toBe(false);
    expect(obj1.evented).toBe(true);
  });

  it('maintains strict isolation and prevents object mutation when tool is changed while Space is held', () => {
    canvas.activeObject = obj1;

    // 1. User holds Space in select tool
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'select',
      isSpaceHeld: true,
      isPanning: false,
    });

    expect(canvas.selection).toBe(false);
    expect(obj1.selectable).toBe(false);
    expect(obj1.evented).toBe(false);

    // 2. User switches tool to 'brush' while Space is still held
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'brush',
      isSpaceHeld: true,
      isPanning: false,
    });

    // Must STILL be in Pan mode (drawingMode false, objects locked, cursor grab)
    expect(canvas.selection).toBe(false);
    expect(canvas.isDrawingMode).toBe(false);
    expect(canvas.defaultCursor).toBe('grab');
    expect(obj1.selectable).toBe(false);

    // 3. User releases Space
    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'brush',
      isSpaceHeld: false,
      isPanning: false,
    });

    // Now enters brush mode while preserving the selected object
    expect(canvas.isDrawingMode).toBe(true);
    expect(canvas.defaultCursor).toBe('none');
    expect(canvas.activeObject).toBe(obj1);
    expect(obj1.selectable).toBe(false);
  });

  it('clears canvas._currentTransform when Space pan activates to prevent dragged transform mutation', () => {
    let mouseUpFired = false;
    (canvas as any)._onMouseUp = () => {
      mouseUpFired = true;
    };
    (canvas as any)._currentTransform = { target: obj1, action: 'scale' };

    applyCanvasInteractionMode(canvas as unknown as FabricCanvas, {
      activeTool: 'select',
      isSpaceHeld: true,
      isPanning: false,
    });

    expect(mouseUpFired).toBe(true);
    expect((canvas as any)._currentTransform).toBeNull();
  });
});
