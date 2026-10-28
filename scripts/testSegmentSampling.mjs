import { Path } from 'fabric';

const p = new Path("M 100 100 Q 200 50 300 200");
console.log('Path segments:', p.path);

function samplePointsFromFabricSegments(segments, step = 4) {
  const points = [];
  let curX = 0, curY = 0;

  segments.forEach(seg => {
    const type = seg[0];
    if (type === 'M') {
      curX = seg[1];
      curY = seg[2];
      points.push({ x: curX, y: curY });
    } else if (type === 'L') {
      const endX = seg[1], endY = seg[2];
      const dist = Math.hypot(endX - curX, endY - curY);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({ x: curX + (endX - curX) * t, y: curY + (endY - curY) * t });
      }
      curX = endX;
      curY = endY;
    } else if (type === 'Q') {
      const cx = seg[1], cy = seg[2], endX = seg[3], endY = seg[4];
      const dist = Math.hypot(cx - curX, cy - curY) + Math.hypot(endX - cx, endY - cy);
      const steps = Math.max(2, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * curX + 2 * mt * t * cx + t * t * endX;
        const y = mt * mt * curY + 2 * mt * t * cy + t * t * endY;
        points.push({ x, y });
      }
      curX = endX;
      curY = endY;
    } else if (type === 'C') {
      const c1x = seg[1], c1y = seg[2], c2x = seg[3], c2y = seg[4], endX = seg[5], endY = seg[6];
      const dist = Math.hypot(c1x - curX, c1y - curY) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(endX - c2x, endY - c2y);
      const steps = Math.max(3, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * curX + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * endX;
        const y = mt * mt * mt * curY + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * endY;
        points.push({ x, y });
      }
      curX = endX;
      curY = endY;
    }
  });

  return points;
}

const sampled = samplePointsFromFabricSegments(p.path);
console.log('Sampled points count:', sampled.length);
console.log('First point:', sampled[0]);
console.log('Last point:', sampled[sampled.length - 1]);
