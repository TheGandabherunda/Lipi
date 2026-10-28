import { Path } from 'fabric';
import type { Point } from './curveSmoothing';

export interface PenNode {
  x: number;
  y: number;
  handleIn?: Point;
  handleOut?: Point;
  type?: 'smooth' | 'corner';
  isManual?: boolean;
}

/**
 * Samples equidistant points along a Fabric Path's internal SVG segments,
 * grouping separate sub-paths (M commands) into distinct Point[] chains.
 */
export function sampleChainsFromFabricSegments(
  segments: any[],
  offsetX = 0,
  offsetY = 0,
  step = 2.5
): Point[][] {
  const chains: Point[][] = [];
  let currentChain: Point[] = [];
  let curX = 0;
  let curY = 0;

  segments.forEach((seg) => {
    const type = seg[0];
    if (type === 'M') {
      if (currentChain.length > 0) {
        chains.push(currentChain);
      }
      curX = seg[1] + offsetX;
      curY = seg[2] + offsetY;
      currentChain = [{ x: curX, y: curY }];
    } else if (type === 'L') {
      const endX = seg[1] + offsetX;
      const endY = seg[2] + offsetY;
      const dist = Math.hypot(endX - curX, endY - curY);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        currentChain.push({ x: curX + (endX - curX) * t, y: curY + (endY - curY) * t });
      }
      curX = endX;
      curY = endY;
    } else if (type === 'Q') {
      const cx = seg[1] + offsetX;
      const cy = seg[2] + offsetY;
      const endX = seg[3] + offsetX;
      const endY = seg[4] + offsetY;
      const dist = Math.hypot(cx - curX, cy - curY) + Math.hypot(endX - cx, endY - cy);
      const steps = Math.max(2, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * curX + 2 * mt * t * cx + t * t * endX;
        const y = mt * mt * curY + 2 * mt * t * cy + t * t * endY;
        currentChain.push({ x, y });
      }
      curX = endX;
      curY = endY;
    } else if (type === 'C') {
      const c1x = seg[1] + offsetX;
      const c1y = seg[2] + offsetY;
      const c2x = seg[3] + offsetX;
      const c2y = seg[4] + offsetY;
      const endX = seg[5] + offsetX;
      const endY = seg[6] + offsetY;
      const dist =
        Math.hypot(c1x - curX, c1y - curY) +
        Math.hypot(c2x - c1x, c2y - c1y) +
        Math.hypot(endX - c2x, endY - c2y);
      const steps = Math.max(3, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x =
          mt * mt * mt * curX +
          3 * mt * mt * t * c1x +
          3 * mt * t * t * c2x +
          t * t * t * endX;
        const y =
          mt * mt * mt * curY +
          3 * mt * mt * t * c1y +
          3 * mt * t * t * c2y +
          t * t * t * endY;
        currentChain.push({ x, y });
      }
      curX = endX;
      curY = endY;
    }
  });

  if (currentChain.length > 0) {
    chains.push(currentChain);
  }

  return chains;
}

/**
 * Samples a flat list of points from Fabric segments.
 */
export function samplePointsFromFabricSegments(
  segments: any[],
  step = 2.5,
  offsetX = 0,
  offsetY = 0
): Point[] {
  const chains = sampleChainsFromFabricSegments(segments, offsetX, offsetY, step);
  return chains.flat();
}

/**
 * Calculates squared distance from point p to line segment vw.
 */
export function distToSegmentSquared(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
}

/**
 * Converts a sequence of continuous sampled points into an exact linear SVG path.
 * With round cap and round join, this preserves the exact original curve shape with zero distortion.
 */
export function pointsToExactLinearSVGPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${(points[0].x + 0.2).toFixed(1)} ${(points[0].y + 0.2).toFixed(1)}`;
  }
  let pathStr = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    pathStr += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return pathStr;
}

/**
 * Erases portions of vector strokes that fall within a capsule swept between points a and b with the given radius.
 * Preserves the exact geometry of surviving stroke pieces without repeated re-smoothing distortion.
 */
export function eraseStrokesAlongSegment(
  canvas: any,
  a: Point,
  b: Point,
  radius: number
): boolean {
  if (!canvas) return false;

  const objects = canvas.getObjects();
  let anyModified = false;
  const radiusSq = radius * radius;

  // Process in reverse to safely remove and replace objects
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj instanceof Path && (obj as any).path) {
      const offsetX = (obj.left ?? 0) - (obj.pathOffset?.x ?? 0);
      const offsetY = (obj.top ?? 0) - (obj.pathOffset?.y ?? 0);

      // Quick bounding box check
      const strokePad = ((obj.strokeWidth as number) || 0) / 2;
      const minX = Math.min(a.x, b.x) - radius - strokePad;
      const maxX = Math.max(a.x, b.x) + radius + strokePad;
      const minY = Math.min(a.y, b.y) - radius - strokePad;
      const maxY = Math.max(a.y, b.y) + radius + strokePad;

      const bbox = obj.getBoundingRect();
      if (
        maxX < bbox.left ||
        minX > bbox.left + bbox.width ||
        maxY < bbox.top ||
        minY > bbox.top + bbox.height
      ) {
        continue;
      }

      const chains = sampleChainsFromFabricSegments((obj as any).path, offsetX, offsetY, 2.0);
      if (chains.length === 0) continue;

      // Check if any point in any chain intersects the capsule
      let hasHit = false;
      for (const chain of chains) {
        if (chain.some((p) => distToSegmentSquared(p, a, b) <= (radius + strokePad * 0.3) ** 2)) {
          hasHit = true;
          break;
        }
      }

      if (!hasHit) continue;

      anyModified = true;

      // Split chains into surviving contiguous runs of points
      const survivingChains: Point[][] = [];

      chains.forEach((chain) => {
        let currentRun: Point[] = [];
        chain.forEach((p) => {
          const d2 = distToSegmentSquared(p, a, b);
          if (d2 > radiusSq) {
            currentRun.push(p);
          } else {
            if (currentRun.length >= 2) {
              survivingChains.push(currentRun);
            } else if (currentRun.length === 1) {
              survivingChains.push([currentRun[0], { x: currentRun[0].x + 0.2, y: currentRun[0].y + 0.2 }]);
            }
            currentRun = [];
          }
        });
        if (currentRun.length >= 2) {
          survivingChains.push(currentRun);
        } else if (currentRun.length === 1) {
          survivingChains.push([currentRun[0], { x: currentRun[0].x + 0.2, y: currentRun[0].y + 0.2 }]);
        }
      });

      // Remove the original path
      canvas.remove(obj);

      // Re-add surviving continuous chains with exact linear path geometry
      survivingChains.forEach((chain) => {
        const pathString = pointsToExactLinearSVGPath(chain);
        if (pathString) {
          try {
            const splitPath = new Path(pathString, {
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              fill: obj.fill,
              strokeLineCap: obj.strokeLineCap || 'round',
              strokeLineJoin: obj.strokeLineJoin || 'round',
              selectable: false,
              evented: true,
            });
            canvas.add(splitPath);
          } catch {
            // Ignore malformed segments
          }
        }
      });
    }
  }

  if (anyModified) {
    canvas.requestRenderAll();
  }

  return anyModified;
}

/**
 * Backward compatibility alias for single-point erase
 */
export function eraseStrokesAtPoint(
  canvas: any,
  cx: number,
  cy: number,
  radius: number
): boolean {
  return eraseStrokesAlongSegment(canvas, { x: cx, y: cy }, { x: cx, y: cy }, radius);
}

/**
 * Builds an authentic 45-degree broad-edge Kannada calligraphy ribbon path from a series of points.
 * Creates distinctive thick-and-thin modulation based on stroke angle.
 */
export function pointsToCalligraphyRibbon(points: Point[], strokeWidth: number, angleDeg = 45): string {
  if (points.length < 2) return '';

  const angleRad = (angleDeg * Math.PI) / 180;
  const halfNib = strokeWidth / 2;
  const dx = halfNib * Math.cos(angleRad);
  const dy = -halfNib * Math.sin(angleRad);

  const topEdge: Point[] = [];
  const bottomEdge: Point[] = [];

  points.forEach((p) => {
    topEdge.push({ x: p.x + dx, y: p.y + dy });
    bottomEdge.push({ x: p.x - dx, y: p.y - dy });
  });

  // Smooth topEdge forward with quadratic curves
  let pathStr = `M ${topEdge[0].x.toFixed(1)} ${topEdge[0].y.toFixed(1)}`;
  if (topEdge.length === 2) {
    pathStr += ` L ${topEdge[1].x.toFixed(1)} ${topEdge[1].y.toFixed(1)}`;
  } else {
    for (let i = 1; i < topEdge.length - 1; i++) {
      const curr = topEdge[i];
      const next = topEdge[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      pathStr += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }
    const lastTop = topEdge[topEdge.length - 1];
    pathStr += ` L ${lastTop.x.toFixed(1)} ${lastTop.y.toFixed(1)}`;
  }

  // Connect to bottomEdge and smooth backward
  const lastBottom = bottomEdge[bottomEdge.length - 1];
  pathStr += ` L ${lastBottom.x.toFixed(1)} ${lastBottom.y.toFixed(1)}`;
  if (bottomEdge.length === 2) {
    pathStr += ` L ${bottomEdge[0].x.toFixed(1)} ${bottomEdge[0].y.toFixed(1)}`;
  } else {
    for (let i = bottomEdge.length - 2; i > 0; i--) {
      const curr = bottomEdge[i];
      const prev = bottomEdge[i - 1];
      const midX = (curr.x + prev.x) / 2;
      const midY = (curr.y + prev.y) / 2;
      pathStr += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }
    pathStr += ` L ${bottomEdge[0].x.toFixed(1)} ${bottomEdge[0].y.toFixed(1)}`;
  }
  pathStr += ' Z';

  return pathStr;
}

/**
 * Automatically computes continuous circular / Catmull-Rom Bézier handles for nodes,
 * matching Adobe Illustrator's Curvature Tool behavior.
 * When the user simply clicks points (without manual dragging), this generates
 * perfectly smooth circular arcs through all anchor points.
 */
export function autoComputeSmoothCircularHandles(
  nodes: PenNode[],
  isClosed = false,
  tension = 0.35
): PenNode[] {
  const n = nodes.length;
  if (n < 2) return nodes;

  for (let i = 0; i < n; i++) {
    const curr = nodes[i];
    // If it's explicitly a sharp corner, clear handles
    if (curr.type === 'corner') {
      curr.handleIn = undefined;
      curr.handleOut = undefined;
      continue;
    }

    // If the user manually dragged out tangent handles, respect them
    if (curr.isManual) {
      continue;
    }

    let prev: PenNode;
    let next: PenNode;

    if (isClosed) {
      prev = nodes[(i - 1 + n) % n];
      next = nodes[(i + 1) % n];
    } else {
      if (i === 0) {
        next = nodes[1];
        const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);
        if (n >= 3) {
          const p2 = nodes[2];
          // Extrapolated start tangent from first 3 points for circular continuation
          const tx = 2 * (next.x - curr.x) - 0.5 * (p2.x - curr.x);
          const ty = 2 * (next.y - curr.y) - 0.5 * (p2.y - curr.y);
          const tLen = Math.hypot(tx, ty);
          if (tLen > 1e-6) {
            curr.handleOut = {
              x: curr.x + (tx / tLen) * dNext * tension,
              y: curr.y + (ty / tLen) * dNext * tension,
            };
          }
        }
        if (!curr.handleOut) {
          curr.handleOut = {
            x: curr.x + (next.x - curr.x) * tension,
            y: curr.y + (next.y - curr.y) * tension,
          };
        }
        curr.handleIn = undefined;
        continue;
      }

      if (i === n - 1) {
        prev = nodes[n - 2];
        const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        if (n >= 3) {
          const pPrev2 = nodes[n - 3];
          // Extrapolated end tangent for circular continuation
          const tx = 2 * (curr.x - prev.x) - 0.5 * (curr.x - pPrev2.x);
          const ty = 2 * (curr.y - prev.y) - 0.5 * (curr.y - pPrev2.y);
          const tLen = Math.hypot(tx, ty);
          if (tLen > 1e-6) {
            curr.handleIn = {
              x: curr.x - (tx / tLen) * dPrev * tension,
              y: curr.y - (ty / tLen) * dPrev * tension,
            };
          }
        }
        if (!curr.handleIn) {
          curr.handleIn = {
            x: curr.x - (curr.x - prev.x) * tension,
            y: curr.y - (curr.y - prev.y) * tension,
          };
        }
        curr.handleOut = undefined;
        continue;
      }

      prev = nodes[i - 1];
      next = nodes[i + 1];
    }

    // Tangent vector parallel to chord from prev to next
    const vx = next.x - prev.x;
    const vy = next.y - prev.y;
    const vLen = Math.hypot(vx, vy);

    if (vLen > 1e-6) {
      const dirX = vx / vLen;
      const dirY = vy / vLen;
      const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);

      curr.handleIn = {
        x: curr.x - dirX * d1 * tension,
        y: curr.y - dirY * d1 * tension,
      };
      curr.handleOut = {
        x: curr.x + dirX * d2 * tension,
        y: curr.y + dirY * d2 * tension,
      };
    } else {
      curr.handleIn = undefined;
      curr.handleOut = undefined;
    }
  }

  return nodes;
}

/**
 * Converts a series of Illustrator-style Pen Tool nodes into an authentic SVG path string.
 * Supports both 'rounded' (Smooth Bézier curves with continuous circular curvature) and 'sharp' (Corner/Polyline segments).
 */
export function penNodesToSVGPath(
  nodes: PenNode[],
  isClosed: boolean,
  mode: 'rounded' | 'sharp' = 'rounded'
): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) {
    return `M ${nodes[0].x.toFixed(1)} ${nodes[0].y.toFixed(1)} L ${(nodes[0].x + 0.1).toFixed(1)} ${(nodes[0].y + 0.1).toFixed(1)}`;
  }

  // Clone nodes to avoid mutating callers
  const computedNodes: PenNode[] = nodes.map((n) => ({
    x: n.x,
    y: n.y,
    type: n.type || (mode === 'sharp' ? 'corner' : 'smooth'),
    handleIn: n.handleIn ? { ...n.handleIn } : undefined,
    handleOut: n.handleOut ? { ...n.handleOut } : undefined,
    isManual: n.isManual,
  }));

  if (mode === 'rounded') {
    autoComputeSmoothCircularHandles(computedNodes, isClosed);
  }

  let svg = `M ${computedNodes[0].x.toFixed(1)} ${computedNodes[0].y.toFixed(1)}`;

  for (let i = 1; i < computedNodes.length; i++) {
    const prev = computedNodes[i - 1];
    const curr = computedNodes[i];

    if (mode === 'rounded' && (prev.handleOut || curr.handleIn)) {
      const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
      const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
      svg += ` C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    } else {
      svg += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
  }

  if (isClosed && computedNodes.length > 2) {
    const last = computedNodes[computedNodes.length - 1];
    const first = computedNodes[0];
    if (mode === 'rounded' && (last.handleOut || first.handleIn)) {
      const cp1 = last.handleOut || { x: last.x, y: last.y };
      const cp2 = first.handleIn || { x: first.x, y: first.y };
      svg += ` C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)} ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    } else {
      svg += ` L ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    }
    svg += ' Z';
  }

  return svg;
}

