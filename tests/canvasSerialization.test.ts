import { describe, it, expect } from 'vitest';
import { Path, Group } from 'fabric';
import {
  serializeFabricPathObject,
  rehydrateFabricPath,
} from '../src/components/canvas/utils/canvasSerialization';
import type { VectorPathData } from '../src/types/glyph';

describe('Phase 1: Fabric Canvas Path Serialization & Rehydration', () => {
  it('correctly serializes a standard stroked Path', () => {
    const fabricPath = new Path('M 10 10 L 50 50', {
      stroke: '#ff0000',
      strokeWidth: 20,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });

    const serialized = serializeFabricPathObject(fabricPath, 0);
    expect(serialized).not.toBeNull();
    expect(serialized?.strokeColor).toBe('#ff0000');
    expect(serialized?.strokeWidth).toBe(20);
    expect(serialized?.fillColor).toBeUndefined();
    expect(serialized?.pathString).toContain('M 10 10 L 50 50');
  });

  it('correctly serializes a filled Path without stroke', () => {
    const fabricPath = new Path('M 0 0 L 100 0 L 100 100 Z', {
      fill: '#123456',
      stroke: 'none',
      strokeWidth: 0,
    });

    const serialized = serializeFabricPathObject(fabricPath, 1);
    expect(serialized).not.toBeNull();
    expect(serialized?.fillColor).toBe('#123456');
    expect(serialized?.strokeWidth).toBe(0);
  });

  it('scales effective stroke width and bakes path coordinates when object is transformed', () => {
    const fabricPath = new Path('M 0 0 L 100 0', {
      stroke: '#000000',
      strokeWidth: 10,
      scaleX: 2,
      scaleY: 2,
      left: 50,
      top: 50,
    });

    const serialized = serializeFabricPathObject(fabricPath, 0);
    expect(serialized).not.toBeNull();
    // Scaled by 2x -> strokeWidth should be ~20
    expect(serialized?.strokeWidth).toBe(20);
    // Path points should be transformed by matrix
    expect(serialized?.pathString).not.toBe('M 0 0 L 100 0');
  });

  it('bakes group transforms when object is part of an ActiveSelection or Group', () => {
    const childPath = new Path('M 10 10 L 20 20', {
      stroke: '#000000',
      strokeWidth: 10,
    });

    // Create a mock group or ActiveSelection
    const group = new Group([childPath], {
      left: 100,
      top: 100,
      scaleX: 1.5,
      scaleY: 1.5,
    });

    childPath.group = group;

    const serialized = serializeFabricPathObject(childPath, 0);
    expect(serialized).not.toBeNull();
    // Stroke width scaled by group scale (10 * 1.5 = 15)
    expect(serialized?.strokeWidth).toBe(15);
  });

  it('rehydrates serialized path cleanly and rejects empty/malformed paths', () => {
    const validData: VectorPathData = {
      id: 'test_path_1',
      pathString: 'M 10 10 L 100 100',
      strokeWidth: 18,
      strokeColor: '#3b82f6',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    };

    const rehydrated = rehydrateFabricPath(validData);
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.stroke).toBe('#3b82f6');
    expect(rehydrated?.strokeWidth).toBe(18);

    // Empty or malformed paths return null safely
    const emptyData: VectorPathData = {
      id: 'empty',
      pathString: '',
      strokeWidth: 16,
      strokeColor: '#000',
    };
    expect(rehydrateFabricPath(emptyData)).toBeNull();

    const whitespaceData: VectorPathData = {
      id: 'ws',
      pathString: '   ',
      strokeWidth: 16,
      strokeColor: '#000',
    };
    expect(rehydrateFabricPath(whitespaceData)).toBeNull();
  });

  it('preserves geometry stability over round-trip serialize -> rehydrate cycles', () => {
    const originalSvg = 'M 50 50 L 150 150 C 200 200 250 200 300 150';
    const originalData: VectorPathData = {
      id: 'orig',
      pathString: originalSvg,
      strokeWidth: 16,
      strokeColor: '#0f172a',
    };

    // Cycle 1: Rehydrate -> Serialize
    const obj1 = rehydrateFabricPath(originalData);
    expect(obj1).not.toBeNull();
    const cycle1 = serializeFabricPathObject(obj1!, 0);
    expect(cycle1).not.toBeNull();

    // Cycle 2: Rehydrate -> Serialize again
    const obj2 = rehydrateFabricPath(cycle1!);
    expect(obj2).not.toBeNull();
    const cycle2 = serializeFabricPathObject(obj2!, 0);
    expect(cycle2).not.toBeNull();

    // Coordinate points and strokeWidth must be stable across cycles (no progressive drift)
    expect(cycle2?.strokeWidth).toBe(cycle1?.strokeWidth);
    expect(cycle2?.pathString).toBe(cycle1?.pathString);
  });
});
