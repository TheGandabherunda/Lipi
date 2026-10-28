import { Path, util, type Canvas } from 'fabric';
import type { Point } from './curveSmoothing';

export interface EditablePathNode {
  id: string;
  x: number;
  y: number;
  handleIn?: Point | null;
  handleOut?: Point | null;
  type?: 'smooth' | 'corner';
}

export interface EditableSubpath {
  nodes: EditablePathNode[];
  isClosed: boolean;
}

let nodeCounter = 0;
export function generateNodeId(): string {
  return `node-${Date.now()}-${++nodeCounter}`;
}

/**
 * Calculates distance between two points
 */
export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Converts a Fabric Path object's internal SVG commands into canvas-space EditableSubpaths
 */
export function fabricPathToEditableSubpaths(obj: Path): EditableSubpath[] {
  if (!obj || !(obj as any).path) return [];

  const segments: any[] = (obj as any).path;
  const mat = obj.calcTransformMatrix();
  const pathOffsetX = obj.pathOffset?.x ?? 0;
  const pathOffsetY = obj.pathOffset?.y ?? 0;

  const toCanvas = (localX: number, localY: number): Point => {
    return util.transformPoint({ x: localX - pathOffsetX, y: localY - pathOffsetY }, mat);
  };

  const subpaths: EditableSubpath[] = [];
  let currentSubpath: EditableSubpath = { nodes: [], isClosed: false };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const cmd = seg[0];

    if (cmd === 'M') {
      if (currentSubpath.nodes.length > 0) {
        subpaths.push(currentSubpath);
      }
      const pt = toCanvas(seg[1], seg[2]);
      currentSubpath = {
        nodes: [
          {
            id: generateNodeId(),
            x: pt.x,
            y: pt.y,
            handleIn: null,
            handleOut: null,
            type: 'corner',
          },
        ],
        isClosed: false,
      };
    } else if (cmd === 'L') {
      const pt = toCanvas(seg[1], seg[2]);
      currentSubpath.nodes.push({
        id: generateNodeId(),
        x: pt.x,
        y: pt.y,
        handleIn: null,
        handleOut: null,
        type: 'corner',
      });
    } else if (cmd === 'C') {
      const cp1 = toCanvas(seg[1], seg[2]);
      const cp2 = toCanvas(seg[3], seg[4]);
      const pt = toCanvas(seg[5], seg[6]);

      const prev = currentSubpath.nodes[currentSubpath.nodes.length - 1];
      if (prev) {
        prev.handleOut = cp1;
        prev.type = 'smooth';
      }

      currentSubpath.nodes.push({
        id: generateNodeId(),
        x: pt.x,
        y: pt.y,
        handleIn: cp2,
        handleOut: null,
        type: 'smooth',
      });
    } else if (cmd === 'Q') {
      const qp = toCanvas(seg[1], seg[2]);
      const pt = toCanvas(seg[3], seg[4]);

      const prev = currentSubpath.nodes[currentSubpath.nodes.length - 1];
      const prevPt = prev ? { x: prev.x, y: prev.y } : qp;

      // Convert Quadratic to Cubic Bézier control points
      const cp1 = {
        x: prevPt.x + (2 / 3) * (qp.x - prevPt.x),
        y: prevPt.y + (2 / 3) * (qp.y - prevPt.y),
      };
      const cp2 = {
        x: pt.x + (2 / 3) * (qp.x - pt.x),
        y: pt.y + (2 / 3) * (qp.y - pt.y),
      };

      if (prev) {
        prev.handleOut = cp1;
        prev.type = 'smooth';
      }

      currentSubpath.nodes.push({
        id: generateNodeId(),
        x: pt.x,
        y: pt.y,
        handleIn: cp2,
        handleOut: null,
        type: 'smooth',
      });
    } else if (cmd === 'Z') {
      currentSubpath.isClosed = true;
      // If the last node is duplicate of the first node, merge their handles
      if (currentSubpath.nodes.length > 1) {
        const first = currentSubpath.nodes[0];
        const last = currentSubpath.nodes[currentSubpath.nodes.length - 1];
        if (pointDistance(first, last) < 1.0) {
          if (last.handleIn && !first.handleIn) {
            first.handleIn = last.handleIn;
            first.type = 'smooth';
          }
          currentSubpath.nodes.pop();
        }
      }
    }
  }

  if (currentSubpath.nodes.length > 0) {
    subpaths.push(currentSubpath);
  }

  return subpaths;
}

/**
 * Converts EditableSubpaths back into an SVG path string
 */
export function subpathsToSVG(subpaths: EditableSubpath[]): string {
  let svg = '';

  for (const sub of subpaths) {
    const { nodes, isClosed } = sub;
    if (nodes.length === 0) continue;

    svg += `M ${nodes[0].x.toFixed(2)} ${nodes[0].y.toFixed(2)}`;

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];

      if (prev.handleOut || curr.handleIn) {
        const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
        const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
        svg += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      } else {
        svg += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      }
    }

    if (isClosed && nodes.length >= 2) {
      const last = nodes[nodes.length - 1];
      const first = nodes[0];
      if (last.handleOut || first.handleIn) {
        const cp1 = last.handleOut || { x: last.x, y: last.y };
        const cp2 = first.handleIn || { x: first.x, y: first.y };
        svg += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
      }
      svg += ' Z';
    }
  }

  return svg.trim();
}

/**
 * Replaces the original Fabric Path on the canvas with the updated path geometry
 */
export function rebuildFabricPathFromSubpaths(
  originalObj: Path,
  subpaths: EditableSubpath[],
  canvas: Canvas
): Path | null {
  const newSvg = subpathsToSVG(subpaths);
  if (!newSvg) {
    canvas.remove(originalObj);
    return null;
  }

  const allObjects = canvas.getObjects();
  let origIndex = allObjects.indexOf(originalObj);
  const objId = (originalObj as any).id;

  if (origIndex === -1 && objId) {
    origIndex = allObjects.findIndex((o) => (o as any).id === objId);
    if (origIndex !== -1) {
      canvas.remove(allObjects[origIndex]);
    }
  } else {
    canvas.remove(originalObj);
  }

  const newPath = new Path(newSvg, {
    stroke: originalObj.stroke,
    strokeWidth: originalObj.strokeWidth,
    fill: originalObj.fill,
    strokeLineCap: originalObj.strokeLineCap || 'round',
    strokeLineJoin: originalObj.strokeLineJoin || 'round',
    selectable: false,
    evented: true,
  });
  (newPath as any).id = objId || `path_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const remainingObjects = canvas.getObjects();
  if (origIndex >= 0 && origIndex <= remainingObjects.length) {
    (canvas as any).insertAt(origIndex, newPath);
  } else {
    canvas.add(newPath);
  }

  return newPath;
}

/**
 * De Casteljau subdivision for a cubic Bézier curve at parameter t in [0, 1]
 */
export function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): {
  left: [Point, Point, Point, Point];
  right: [Point, Point, Point, Point];
} {
  const p01 = { x: (1 - t) * p0.x + t * p1.x, y: (1 - t) * p0.y + t * p1.y };
  const p12 = { x: (1 - t) * p1.x + t * p2.x, y: (1 - t) * p1.y + t * p2.y };
  const p23 = { x: (1 - t) * p2.x + t * p3.x, y: (1 - t) * p2.y + t * p3.y };

  const p012 = { x: (1 - t) * p01.x + t * p12.x, y: (1 - t) * p01.y + t * p12.y };
  const p123 = { x: (1 - t) * p12.x + t * p23.x, y: (1 - t) * p12.y + t * p23.y };

  const pSplit = { x: (1 - t) * p012.x + t * p123.x, y: (1 - t) * p012.y + t * p123.y };

  return {
    left: [p0, p01, p012, pSplit],
    right: [pSplit, p123, p23, p3],
  };
}

/**
 * Computes point along a cubic Bézier curve at parameter t
 */
export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * Finds the closest point on any segment in the subpaths to the query point
 */
export function findClosestPointOnSubpaths(
  subpaths: EditableSubpath[],
  pt: Point,
  maxDist = 14
): {
  subpathIndex: number;
  segmentIndex: number;
  t: number;
  point: Point;
  distance: number;
} | null {
  let closest: {
    subpathIndex: number;
    segmentIndex: number;
    t: number;
    point: Point;
    distance: number;
  } | null = null;
  let minDist = maxDist;

  subpaths.forEach((sub, subIdx) => {
    const nodes = sub.nodes;
    if (nodes.length < 2) return;

    const segCount = sub.isClosed ? nodes.length : nodes.length - 1;

    for (let segIdx = 0; segIdx < segCount; segIdx++) {
      const p0 = nodes[segIdx];
      const p3 = nodes[(segIdx + 1) % nodes.length];

      const isCurve = p0.handleOut || p3.handleIn;
      const p1 = p0.handleOut || { x: p0.x, y: p0.y };
      const p2 = p3.handleIn || { x: p3.x, y: p3.y };

      // Sample along segment to find coarse closest t
      const SAMPLES = isCurve ? 20 : 6;
      let segMinD = Infinity;
      let segBestT = 0;
      let segBestPt: Point = p0;

      for (let s = 0; s <= SAMPLES; s++) {
        const t = s / SAMPLES;
        const curPt = isCurve
          ? cubicBezierPoint(p0, p1, p2, p3, t)
          : { x: (1 - t) * p0.x + t * p3.x, y: (1 - t) * p0.y + t * p3.y };
        const d = pointDistance(pt, curPt);
        if (d < segMinD) {
          segMinD = d;
          segBestT = t;
          segBestPt = curPt;
        }
      }

      // Fine binary search refinement around segBestT
      const step = 1 / SAMPLES;
      let tLow = Math.max(0, segBestT - step);
      let tHigh = Math.min(1, segBestT + step);
      for (let iter = 0; iter < 4; iter++) {
        const tMid1 = tLow + (tHigh - tLow) / 3;
        const tMid2 = tHigh - (tHigh - tLow) / 3;
        const pt1 = isCurve
          ? cubicBezierPoint(p0, p1, p2, p3, tMid1)
          : { x: (1 - tMid1) * p0.x + tMid1 * p3.x, y: (1 - tMid1) * p0.y + tMid1 * p3.y };
        const pt2 = isCurve
          ? cubicBezierPoint(p0, p1, p2, p3, tMid2)
          : { x: (1 - tMid2) * p0.x + tMid2 * p3.x, y: (1 - tMid2) * p0.y + tMid2 * p3.y };
        if (pointDistance(pt, pt1) < pointDistance(pt, pt2)) {
          tHigh = tMid2;
          segBestT = tMid1;
          segBestPt = pt1;
          segMinD = pointDistance(pt, pt1);
        } else {
          tLow = tMid1;
          segBestT = tMid2;
          segBestPt = pt2;
          segMinD = pointDistance(pt, pt2);
        }
      }

      // Avoid snapping right onto endpoints
      if (segBestT > 0.05 && segBestT < 0.95 && segMinD < minDist) {
        minDist = segMinD;
        closest = {
          subpathIndex: subIdx,
          segmentIndex: segIdx,
          t: segBestT,
          point: segBestPt,
          distance: segMinD,
        };
      }
    }
  });

  return closest;
}

/**
 * Inserts a new anchor node at parameter t on a specific segment using de Casteljau split
 */
export function insertNodeOnSegment(
  subpaths: EditableSubpath[],
  subpathIndex: number,
  segmentIndex: number,
  t: number
): { subpaths: EditableSubpath[]; newNodeId: string } {
  const cloned: EditableSubpath[] = subpaths.map((s) => ({
    ...s,
    nodes: s.nodes.map((n) => ({ ...n })),
  }));

  const sub = cloned[subpathIndex];
  if (!sub) return { subpaths, newNodeId: '' };

  const nodes = sub.nodes;
  const p0 = nodes[segmentIndex];
  const nextIdx = (segmentIndex + 1) % nodes.length;
  const p3 = nodes[nextIdx];

  const newNodeId = generateNodeId();

  if (p0.handleOut || p3.handleIn) {
    const p1 = p0.handleOut || { x: p0.x, y: p0.y };
    const p2 = p3.handleIn || { x: p3.x, y: p3.y };
    const split = splitCubicBezier(p0, p1, p2, p3, t);

    p0.handleOut = split.left[1];
    p0.type = 'smooth';

    const newNode: EditablePathNode = {
      id: newNodeId,
      x: split.left[3].x,
      y: split.left[3].y,
      handleIn: split.left[2],
      handleOut: split.right[1],
      type: 'smooth',
    };

    p3.handleIn = split.right[2];
    p3.type = 'smooth';

    nodes.splice(segmentIndex + 1, 0, newNode);
  } else {
    // Linear segment split
    const splitPt = {
      x: (1 - t) * p0.x + t * p3.x,
      y: (1 - t) * p0.y + t * p3.y,
    };
    const newNode: EditablePathNode = {
      id: newNodeId,
      x: splitPt.x,
      y: splitPt.y,
      handleIn: null,
      handleOut: null,
      type: 'corner',
    };
    nodes.splice(segmentIndex + 1, 0, newNode);
  }

  return { subpaths: cloned, newNodeId };
}

/**
 * Deletes nodes from subpaths by ID. If subpaths become too short, removes or cleans them up.
 */
export function deleteNodesFromSubpaths(
  subpaths: EditableSubpath[],
  nodeIdsToDelete: Set<string>
): EditableSubpath[] {
  const result: EditableSubpath[] = [];

  for (const sub of subpaths) {
    const survivingNodes = sub.nodes.filter((n) => !nodeIdsToDelete.has(n.id));

    if (survivingNodes.length >= 2) {
      result.push({
        nodes: survivingNodes,
        isClosed: sub.isClosed && survivingNodes.length >= 3,
      });
    } else if (survivingNodes.length === 1 && sub.isClosed) {
      // 1 node left in closed loop: discard
    }
  }

  return result;
}

/**
 * Converts a node between Smooth (tangent Bézier handles) and Corner (no handles)
 */
export function toggleNodeSmoothCorner(
  node: EditablePathNode,
  prev?: EditablePathNode,
  next?: EditablePathNode
): void {
  const hasHandles = Boolean(node.handleIn || node.handleOut);

  if (hasHandles) {
    // Convert to Corner: retract handles
    node.handleIn = null;
    node.handleOut = null;
    node.type = 'corner';
  } else {
    // Convert to Smooth: pull out tangent handles
    node.type = 'smooth';
    const prevPt = prev ? { x: prev.x, y: prev.y } : { x: node.x - 30, y: node.y };
    const nextPt = next ? { x: next.x, y: next.y } : { x: node.x + 30, y: node.y };

    const dx = nextPt.x - prevPt.x;
    const dy = nextPt.y - prevPt.y;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const dIn = prev ? pointDistance(node, prev) * 0.33 : 25;
    const dOut = next ? pointDistance(node, next) * 0.33 : 25;

    node.handleIn = {
      x: node.x - dirX * dIn,
      y: node.y - dirY * dIn,
    };
    node.handleOut = {
      x: node.x + dirX * dOut,
      y: node.y + dirY * dOut,
    };
  }
}

/**
 * Splits a subpath at a specific segment and parameter t (Scissors tool)
 */
export function splitSubpathAtPoint(
  subpaths: EditableSubpath[],
  subpathIndex: number,
  segmentIndex: number,
  t: number
): EditableSubpath[] {
  const inserted = insertNodeOnSegment(subpaths, subpathIndex, segmentIndex, t);
  const sub = inserted.subpaths[subpathIndex];
  if (!sub) return subpaths;

  const splitIdx = segmentIndex + 1;
  const splitNode = sub.nodes[splitIdx];

  const result: EditableSubpath[] = [];

  inserted.subpaths.forEach((s, idx) => {
    if (idx !== subpathIndex) {
      result.push(s);
      return;
    }

    if (s.isClosed) {
      // Re-order closed subpath into an open path starting at the split point
      const rotated: EditablePathNode[] = [];
      for (let i = 0; i < s.nodes.length; i++) {
        const node = s.nodes[(splitIdx + i) % s.nodes.length];
        rotated.push({ ...node, id: generateNodeId() });
      }
      // Add duplicate end node to finish open path
      rotated.push({
        ...splitNode,
        id: generateNodeId(),
        handleIn: splitNode.handleIn ? { ...splitNode.handleIn } : null,
        handleOut: null,
      });
      rotated[0].handleIn = null;
      result.push({ nodes: rotated, isClosed: false });
    } else {
      // Open path: split into two separate open subpaths
      const firstHalf = s.nodes.slice(0, splitIdx + 1);
      const secondHalf = s.nodes.slice(splitIdx).map((n) => ({ ...n, id: generateNodeId() }));
      if (firstHalf.length >= 2) result.push({ nodes: firstHalf, isClosed: false });
      if (secondHalf.length >= 2) result.push({ nodes: secondHalf, isClosed: false });
    }
  });

  return result;
}

/**
 * Reverses a subpath (inverts winding direction, swaps handleIn and handleOut)
 */
export function reverseSubpath(subpath: EditableSubpath): EditableSubpath {
  const reversedNodes = [...subpath.nodes].reverse().map((n) => ({
    ...n,
    id: generateNodeId(),
    handleIn: n.handleOut ? { ...n.handleOut } : null,
    handleOut: n.handleIn ? { ...n.handleIn } : null,
  }));

  return {
    nodes: reversedNodes,
    isClosed: subpath.isClosed,
  };
}

/**
 * Hit tests for an anchor point, handleIn, or handleOut across all subpaths
 */
export function hitTestSubpathNode(
  subpaths: EditableSubpath[],
  pt: Point,
  radius = 8
): {
  subpathIndex: number;
  nodeIndex: number;
  node: EditablePathNode;
  hitType: 'anchor' | 'handleIn' | 'handleOut';
} | null {
  for (let sIdx = 0; sIdx < subpaths.length; sIdx++) {
    const nodes = subpaths[sIdx].nodes;
    for (let nIdx = 0; nIdx < nodes.length; nIdx++) {
      const node = nodes[nIdx];

      // Test handleIn first (so handle can be grabbed even if near anchor)
      if (node.handleIn && pointDistance(pt, node.handleIn) <= radius + 2) {
        return { subpathIndex: sIdx, nodeIndex: nIdx, node, hitType: 'handleIn' };
      }

      // Test handleOut
      if (node.handleOut && pointDistance(pt, node.handleOut) <= radius + 2) {
        return { subpathIndex: sIdx, nodeIndex: nIdx, node, hitType: 'handleOut' };
      }

      // Test anchor point
      if (pointDistance(pt, node) <= radius + 2) {
        return { subpathIndex: sIdx, nodeIndex: nIdx, node, hitType: 'anchor' };
      }
    }
  }

  return null;
}
