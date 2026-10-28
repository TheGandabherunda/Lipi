import { pointsToSmoothSVGPath } from '../src/utils/curveSmoothing.ts';

// Sample a simple horizontal stroke from (100, 100) to (500, 100)
const strokePoints = [];
for (let x = 100; x <= 500; x += 5) {
  strokePoints.push({ x, y: 100 });
}

// Eraser at (300, 100) with radius 30
const eraserCenter = { x: 300, y: 100 };
const eraserRadius = 30;

function eraseStrokePoints(points, center, radius) {
  const resultChains = [];
  let currentChain = [];

  points.forEach(p => {
    const dist = Math.hypot(p.x - center.x, p.y - center.y);
    if (dist > radius) {
      currentChain.push(p);
    } else {
      if (currentChain.length > 1) {
        resultChains.push(currentChain);
      }
      currentChain = [];
    }
  });

  if (currentChain.length > 1) {
    resultChains.push(currentChain);
  }

  return resultChains;
}

const chains = eraseStrokePoints(strokePoints, eraserCenter, eraserRadius);
console.log('Original points count:', strokePoints.length);
console.log('Resulting chains count:', chains.length);
chains.forEach((ch, idx) => {
  console.log(`Chain ${idx}: from x=${ch[0].x} to x=${ch[ch.length-1].x}, length=${ch.length}`);
  console.log('SVG Path:', pointsToSmoothSVGPath(ch));
});
