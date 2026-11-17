import { describe, it, expect } from 'vitest';
import { Path, type Canvas as FabricCanvas } from 'fabric';
import {
  hasActiveBrushStroke,
  finalizeBrushStroke,
  cancelBrushStroke,
} from '../src/components/canvas/utils/fabricBrushAdapter';

class MockPencilBrush {
  public _points: { x: number; y: number }[] = [];
  public canvas: any;
  public decimate = 0.4;
  public width = 16;
  public color = '#0f172a';

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  _finalizeAndAddPath() {
    if (this.canvas.throwOnFinalize) {
      throw new Error('Simulated Fabric finalize crash');
    }
    const svgPath = this.convertPointsToSVGPath(this._points);
    const p = this.createPath(svgPath);
    this.canvas.add(p);
  }

  convertPointsToSVGPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return '';
    const first = points[0];
    let d = `M ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  createPath(svgData: string) {
    return new Path(svgData, {
      stroke: this.color,
      strokeWidth: this.width,
      strokeUniform: true,
    });
  }

  _reset() {
    this._points = [];
  }
}

class MockCanvas {
  public isDrawingMode = true;
  public objects: any[] = [];
  public freeDrawingBrush: MockPencilBrush;
  public contextTop = { closePath: () => {} };
  public throwOnFinalize = false;

  constructor() {
    this.freeDrawingBrush = new MockPencilBrush(this);
  }

  getObjects() {
    return [...this.objects];
  }

  add(...objs: any[]) {
    this.objects.push(...objs);
  }

  requestRenderAll() {}

  clearContext(_ctx?: any) {}

  fire(_event: string, _opt?: any) {}
}

describe('Fabric Brush Adapter (Fabric 7.x compatibility & resilience)', () => {
  it('correctly detects active in-progress brush strokes', () => {
    const canvas = new MockCanvas();
    expect(hasActiveBrushStroke(canvas as unknown as FabricCanvas)).toBe(false);

    canvas.freeDrawingBrush._points = [{ x: 10, y: 10 }];
    expect(hasActiveBrushStroke(canvas as unknown as FabricCanvas)).toBe(true);

    cancelBrushStroke(canvas as unknown as FabricCanvas);
    expect(hasActiveBrushStroke(canvas as unknown as FabricCanvas)).toBe(false);
  });

  it('finalizes a multi-point brush stroke and adds it to the canvas', () => {
    const canvas = new MockCanvas();
    canvas.freeDrawingBrush._points = [
      { x: 10, y: 20 },
      { x: 50, y: 80 },
      { x: 120, y: 160 },
    ];

    const result = finalizeBrushStroke(canvas as unknown as FabricCanvas);
    expect(result.committed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(canvas.getObjects().length).toBe(1);

    const createdPath = canvas.getObjects()[0] as Path;
    expect(createdPath).toBeDefined();
    // Points must be cleared following finalization
    expect(canvas.freeDrawingBrush._points.length).toBe(0);
  });

  it('finalizes a single tap into a dot/segment so user clicks are not dropped', () => {
    const canvas = new MockCanvas();
    canvas.freeDrawingBrush._points = [{ x: 55, y: 75 }];

    const result = finalizeBrushStroke(canvas as unknown as FabricCanvas);
    expect(result.committed).toBe(true);
    expect(canvas.getObjects().length).toBe(1);
    expect(canvas.freeDrawingBrush._points.length).toBe(0);
  });

  it('falls back to convertPointsToSVGPath and createPath if _finalizeAndAddPath is missing', () => {
    const canvas = new MockCanvas();
    (canvas.freeDrawingBrush as any)._finalizeAndAddPath = undefined;
    canvas.freeDrawingBrush._points = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];

    const result = finalizeBrushStroke(canvas as unknown as FabricCanvas);
    expect(result.committed).toBe(true);
    expect(canvas.getObjects().length).toBe(1);
    expect(canvas.freeDrawingBrush._points.length).toBe(0);
  });

  it('does not silently drop strokes if finalization throws, reporting the error and resetting', () => {
    const canvas = new MockCanvas();
    canvas.throwOnFinalize = true;
    (canvas.freeDrawingBrush as any).convertPointsToSVGPath = undefined;
    canvas.freeDrawingBrush._points = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];

    const result = finalizeBrushStroke(canvas as unknown as FabricCanvas);
    expect(result.committed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Simulated Fabric finalize crash');
    // State reset despite error
    expect(canvas.freeDrawingBrush._points.length).toBe(0);
  });

  it('safely cancels in-progress brush strokes without adding to canvas', () => {
    const canvas = new MockCanvas();
    canvas.freeDrawingBrush._points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];

    cancelBrushStroke(canvas as unknown as FabricCanvas);
    expect(canvas.freeDrawingBrush._points.length).toBe(0);
    expect(canvas.getObjects().length).toBe(0);
  });
});
