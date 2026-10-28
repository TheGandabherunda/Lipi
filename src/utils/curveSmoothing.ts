export interface Point {
  x: number;
  y: number;
}

/**
 * Simplifies points using the Ramer-Douglas-Peucker algorithm
 */
export function simplifyPoints(points: Point[], tolerance = 2): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}

/**
 * Converts a sequence of points into a smooth SVG bezier path string (M ... Q ...).
 * Smoothing factor (0 = raw line, 100 = maximum curve smoothing)
 */
export function pointsToSmoothSVGPath(points: Point[], smoothing = 60): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;

  // Apply tolerance simplification based on smoothness
  const tolerance = (smoothing / 100) * 4;
  const simplified = tolerance > 0.5 ? simplifyPoints(points, tolerance) : points;

  if (simplified.length <= 2) {
    return `M ${simplified[0].x} ${simplified[0].y} L ${simplified[1]?.x ?? simplified[0].x} ${simplified[1]?.y ?? simplified[0].y}`;
  }

  let pathStr = `M ${simplified[0].x} ${simplified[0].y}`;

  // Smooth quadratic bezier curves through midpoints
  for (let i = 1; i < simplified.length - 1; i++) {
    const current = simplified[i];
    const next = simplified[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    pathStr += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = simplified[simplified.length - 1];
  pathStr += ` L ${last.x} ${last.y}`;

  return pathStr;
}
