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
    Boolean(obj.group) ||
    Math.abs((obj.left ?? 0) - offsetX) > 0.01 ||
    Math.abs((obj.top ?? 0) - offsetY) > 0.01 ||
    (obj.scaleX !== undefined && Math.abs(obj.scaleX - 1) > 0.001) ||
    (obj.scaleY !== undefined && Math.abs(obj.scaleY - 1) > 0.001) ||
    (obj.angle !== undefined && Math.abs(obj.angle) > 0.01) ||
    Boolean(obj.flipX) ||
    Boolean(obj.flipY);

  // Compute geometric scale factor to preserve visible stroke weight on scale transforms
  const scaleFactor = (Math.hypot(mat[0], mat[1]) + Math.hypot(mat[2], mat[3])) / 2;
  const rawStrokeWidth = (obj.strokeWidth as number) || 16;
  const isStrokeUniform = (obj as any).strokeUniform ?? false;
  const effectiveStrokeWidth =
    hasTransform && !isStrokeUniform && Math.abs(scaleFactor - 1) > 0.001
      ? Math.max(1, Math.round(rawStrokeWidth * scaleFactor * 10) / 10)
      : rawStrokeWidth;

  let finalSegments = pathSegments;
  if (hasTransform) {
    finalSegments = pathSegments.map((seg: any) => {
      const rawCmd = seg[0];
      const cmd = typeof rawCmd === 'string' ? rawCmd.toUpperCase() : rawCmd;
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
        const pt2 = util.transformPoint({ x: seg[3] - offsetX, y: seg[4] - offsetY }, mat);
        return [
          cmd,
          Math.round(pt1.x * 10) / 10, Math.round(pt1.y * 10) / 10,
          Math.round(pt2.x * 10) / 10, Math.round(pt2.y * 10) / 10,
        ];
      } else if (cmd === 'Z') {
        return ['Z'];
      }
      return seg;
    });
  }

  const pathStr = fabricSegmentsToPathString(finalSegments);
  const objId = (obj as any).id || `path_${Date.now()}_${idx}`;
  (obj as any).id = objId;

  const hasFill = Boolean(
    obj.fill &&
    obj.fill !== 'transparent' &&
    obj.fill !== 'none'
  );
  const hasStroke = Boolean(
    obj.stroke &&
    obj.stroke !== 'transparent' &&
    obj.stroke !== 'none' &&
    (obj.strokeWidth === undefined || obj.strokeWidth > 0)
  );

  return {
    id: objId,
    pathString: pathStr,
    strokeWidth: hasStroke ? effectiveStrokeWidth : (hasFill ? 0 : effectiveStrokeWidth),
    strokeColor: typeof obj.stroke === 'string' && obj.stroke ? obj.stroke : '#0f172a',
    fillColor: hasFill ? (obj.fill as string) : undefined,
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
  if (!p || typeof p.pathString !== 'string' || !p.pathString.trim()) {
    return null;
  }

  try {
    const hasFill = Boolean(
      p.fillColor &&
      p.fillColor !== 'transparent' &&
      p.fillColor !== 'none'
    );
    const hasStroke = Boolean(
      p.strokeWidth !== 0 &&
      p.strokeColor !== 'none' &&
      p.strokeColor !== 'transparent'
    );

    // If neither fill nor stroke is explicitly enabled, treat as standard stroked line
    const shouldStroke = hasStroke || !hasFill;
    const effectiveStroke = shouldStroke
      ? (p.strokeColor || options?.fallbackColor || '#0f172a')
      : undefined;
    const effectiveStrokeWidth = shouldStroke ? (p.strokeWidth || 16) : 0;
    const effectiveFill = hasFill ? p.fillColor : undefined;

    const pathObj = new Path(p.pathString, {
      stroke: effectiveStroke,
      strokeWidth: effectiveStrokeWidth,
      fill: effectiveFill,
      strokeLineCap: p.strokeLineCap || 'round',
      strokeLineJoin: p.strokeLineJoin || 'round',
      strokeUniform: true,
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
