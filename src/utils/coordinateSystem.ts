import opentype from 'opentype.js';

export interface GuideMetricsRef {
  leftMarginX: number;
  baselineY: number;
  scale: number;
  baselineUnits?: number;
}

/**
 * Transforms a point from screen/canvas pixel coordinates into font units (UPM)
 * where X=0 is Left Side Bearing origin and Y=baselineUnits is the Baseline (upward positive).
 */
export function canvasToFontPoint(
  canvasX: number,
  canvasY: number,
  guides: GuideMetricsRef
): { x: number; y: number } {
  const baseUnits = guides.baselineUnits ?? 0;
  return {
    x: Math.round((canvasX - guides.leftMarginX) / guides.scale),
    y: baseUnits + Math.round((guides.baselineY - canvasY) / guides.scale),
  };
}

/**
 * Transforms a point from font design units into canvas pixel coordinates
 * where Y grows downward.
 */
export function fontToCanvasPoint(
  fontX: number,
  fontY: number,
  guides: GuideMetricsRef
): { x: number; y: number } {
  const baseUnits = guides.baselineUnits ?? 0;
  return {
    x: Math.round((guides.leftMarginX + fontX * guides.scale) * 10) / 10,
    y: Math.round((guides.baselineY - (fontY - baseUnits) * guides.scale) * 10) / 10,
  };
}

/**
 * Transforms an opentype.Path from canvas pixel coordinates into font design units.
 */
export function transformPathToFontUnits(
  path: opentype.Path,
  leftMarginX: number,
  baselineY: number,
  scale: number,
  baselineUnits: number = 0
): opentype.Path {
  const result = new opentype.Path();

  path.commands.forEach((cmd) => {
    switch (cmd.type) {
      case 'M':
        result.moveTo(
          Math.round((cmd.x - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y) / scale)
        );
        break;
      case 'L':
        result.lineTo(
          Math.round((cmd.x - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y) / scale)
        );
        break;
      case 'Q':
        result.quadTo(
          Math.round((cmd.x1 - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y1) / scale),
          Math.round((cmd.x - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y) / scale)
        );
        break;
      case 'C':
        result.curveTo(
          Math.round((cmd.x1 - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y1) / scale),
          Math.round((cmd.x2 - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y2) / scale),
          Math.round((cmd.x - leftMarginX) / scale),
          baselineUnits + Math.round((baselineY - cmd.y) / scale)
        );
        break;
      case 'Z':
        result.close();
        break;
    }
  });

  return result;
}

/**
 * Transforms an opentype.Path from font design units into canvas pixel coordinates.
 */
export function transformFontPathToCanvas(
  path: opentype.Path,
  leftMarginX: number,
  baselineY: number,
  scale: number,
  baselineUnits: number = 0
): opentype.Path {
  const result = new opentype.Path();

  path.commands.forEach((cmd) => {
    switch (cmd.type) {
      case 'M':
        result.moveTo(
          Math.round(leftMarginX + cmd.x * scale),
          Math.round(baselineY - (cmd.y - baselineUnits) * scale)
        );
        break;
      case 'L':
        result.lineTo(
          Math.round(leftMarginX + cmd.x * scale),
          Math.round(baselineY - (cmd.y - baselineUnits) * scale)
        );
        break;
      case 'Q':
        result.quadTo(
          Math.round(leftMarginX + cmd.x1 * scale),
          Math.round(baselineY - (cmd.y1 - baselineUnits) * scale),
          Math.round(leftMarginX + cmd.x * scale),
          Math.round(baselineY - (cmd.y - baselineUnits) * scale)
        );
        break;
      case 'C':
        result.curveTo(
          Math.round(leftMarginX + cmd.x1 * scale),
          Math.round(baselineY - (cmd.y1 - baselineUnits) * scale),
          Math.round(leftMarginX + cmd.x2 * scale),
          Math.round(baselineY - (cmd.y2 - baselineUnits) * scale),
          Math.round(leftMarginX + cmd.x * scale),
          Math.round(baselineY - (cmd.y - baselineUnits) * scale)
        );
        break;
      case 'Z':
        result.close();
        break;
    }
  });

  return result;
}
