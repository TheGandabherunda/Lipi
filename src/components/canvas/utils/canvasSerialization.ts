import { Path, util, type Canvas } from 'fabric';
import type { VectorPathData } from '../../../types/glyph';
import { fabricSegmentsToPathString } from '../../../utils/svgExport';

/**
 * Serializes an individual Fabric object into a VectorPathData object,
 * applying any active object transformation matrix to path segments.
 */
export function serializeFabricPathObject(obj: any, idx = 0): VectorPathData | null {
  if (!(obj instanceof Path) || !obj.path) return null;
  const pathSegments = obj.path;
  const mat = obj.calcTransformMatrix();
  const offsetX = obj.pathOffset?.x ?? 0;
  const offsetY = obj.pathOffset?.y ?? 0;

  const hasTransform =
    Math.abs((obj.left ?? 0) - offsetX) > 0.01 ||
    Math.abs((obj.top ?? 0) - offsetY) > 0.01 ||
    (obj.scaleX !== undefined && Math.abs(obj.scaleX - 1) > 0.001) ||
    (obj.scaleY !== undefined && Math.abs(obj.scaleY - 1) > 0.001) ||
    (obj.angle !== undefined && Math.abs(obj.angle) > 0.01) ||
    obj.flipX ||
    obj.flipY;

  let finalSegments = pathSegments;
  if (hasTransform) {
    finalSegments = pathSegments.map((seg: any) => {
      const cmd = seg[0];
      if (cmd === 'M' || cmd === 'L') {
        const pt = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
        return [cmd, Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10];
      } else if (cmd === 'C') {
        const pt1 = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
        const pt2 = util.transformPoint({ x: seg[3] - offsetX, y: seg[4] - offsetY }, mat);
        const pt = util.transformPoint({ x: seg[5] - offsetX, y: seg[6] - offsetY }, mat);
        return [
          cmd,
          Math.round(pt1.x * 10) / 10, Math.round(pt1.y * 10) / 10,
          Math.round(pt2.x * 10) / 10, Math.round(pt2.y * 10) / 10,
          Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10,
        ];
      } else if (cmd === 'Q') {
        const pt1 = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
        const pt = util.transformPoint({ x: seg[3] - offsetX, y: seg[4] - offsetY }, mat);
        return [
          cmd,
          Math.round(pt1.x * 10) / 10, Math.round(pt1.y * 10) / 10,
          Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10,
        ];
      }
      return seg;
    });
  }

  const pathStr = fabricSegmentsToPathString(finalSegments);
  const objId = (obj as any).id || `path_${Date.now()}_${idx}`;
  (obj as any).id = objId;

  return {
    id: objId,
    pathString: pathStr,
    strokeWidth: (obj.strokeWidth as number) || 16,
    strokeColor: (obj.stroke as string) || '#0f172a',
    fillColor: (obj.fill as string) || undefined,
    strokeLineCap: (obj.strokeLineCap as any) || 'round',
    strokeLineJoin: (obj.strokeLineJoin as any) || 'round',
  };
}

/**
 * Serializes all paths currently placed on the Fabric canvas.
 */
export function serializeCanvasPaths(canvas: Canvas | null): VectorPathData[] {
  if (!canvas) return [];
  const objects = canvas.getObjects();
  const result: VectorPathData[] = [];

  objects.forEach((obj, idx) => {
    const serialized = serializeFabricPathObject(obj, idx);
    if (serialized) result.push(serialized);
  });

  return result;
}

/**
 * Rehydrates a VectorPathData object into a Fabric Path ready for canvas display.
 */
export function rehydrateFabricPath(
  p: VectorPathData,
  options?: { fallbackColor?: string; selectable?: boolean }
): Path | null {
  try {
    const pathObj = new Path(p.pathString, {
      stroke: p.fillColor ? undefined : (p.strokeColor || options?.fallbackColor || '#0f172a'),
      strokeWidth: p.fillColor ? 0 : (p.strokeWidth || 16),
      fill: p.fillColor || undefined,
      strokeLineCap: p.strokeLineCap || 'round',
      strokeLineJoin: p.strokeLineJoin || 'round',
      selectable: options?.selectable ?? true,
      evented: true,
    });
    (pathObj as any).id = p.id;
    return pathObj;
  } catch (err) {
    console.warn('Failed to rehydrate Fabric path:', err);
    return null;
  }
}
