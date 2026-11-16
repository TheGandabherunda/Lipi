import { describe, it, expect } from 'vitest';
import opentype from 'opentype.js';
import {
  canvasToFontPoint,
  fontToCanvasPoint,
  transformPathToFontUnits,
  transformFontPathToCanvas,
} from '../src/utils/coordinateSystem';
import { calculateGuidelinePositions } from '../src/components/canvas/CanvasGuidelines';
import type { FontMetrics } from '../src/types/lipiFormat';

describe('Coordinate System Math', () => {
  const defaultMetrics: FontMetrics = {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
    mahaprana: 950,
    leftSideBearing: 50,
    rightSideBearing: 50,
  };

  const canvasWidth = 800;
  const canvasHeight = 800;
  const advanceWidth = 778;

  const guides = calculateGuidelinePositions(
    canvasWidth,
    canvasHeight,
    defaultMetrics,
    advanceWidth
  );

  it('correctly maps baseline to font y = 0', () => {
    // When canvasY is exactly at guides.baselineY, font Y must be 0
    const fontPoint = canvasToFontPoint(150, guides.baselineY, guides);
    expect(fontPoint.y).toBe(0);
  });

  it('correctly maps ascender line to font y = ascender', () => {
    // When canvasY is exactly at guides.ascenderY, font Y must equal defaultMetrics.ascender
    const fontPoint = canvasToFontPoint(150, guides.ascenderY, guides);
    expect(fontPoint.y).toBe(defaultMetrics.ascender);
  });

  it('performs an exact round trip from canvas to font and back', () => {
    const originalPoints = [
      { x: 100, y: 150 },
      { x: 250, y: 350 },
      { x: 400, y: 580 },
      { x: 600, y: 700 },
    ];

    for (const pt of originalPoints) {
      const fontPt = canvasToFontPoint(pt.x, pt.y, guides);
      const canvasPt = fontToCanvasPoint(fontPt.x, fontPt.y, guides);

      // Within 1.5 pixel rounding accuracy
      expect(Math.abs(canvasPt.x - pt.x)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(canvasPt.y - pt.y)).toBeLessThanOrEqual(1.5);
    }
  });

  it('transforms complex opentype paths to font units and inverts cleanly', () => {
    const originalPath = new opentype.Path();
    originalPath.moveTo(150, 200);
    originalPath.curveTo(200, 150, 300, 150, 350, 200);
    originalPath.lineTo(400, 400);
    originalPath.close();

    const fontPath = transformPathToFontUnits(
      originalPath,
      guides.leftMarginX,
      guides.baselineY,
      guides.scale
    );

    expect(fontPath).toBeTruthy();
    expect(fontPath.commands.length).toBe(originalPath.commands.length);

    const reconstructedCanvasPath = transformFontPathToCanvas(
      fontPath,
      guides.leftMarginX,
      guides.baselineY,
      guides.scale
    );

    expect(reconstructedCanvasPath.commands.length).toBe(originalPath.commands.length);
    for (let i = 0; i < originalPath.commands.length; i++) {
      const origCmd = originalPath.commands[i];
      const reconCmd = reconstructedCanvasPath.commands[i];
      expect(reconCmd.type).toBe(origCmd.type);

      if ('x' in origCmd && 'x' in reconCmd && typeof origCmd.x === 'number' && typeof reconCmd.x === 'number') {
        expect(Math.abs(reconCmd.x - origCmd.x)).toBeLessThanOrEqual(1.5);
      }
      if ('y' in origCmd && 'y' in reconCmd && typeof origCmd.y === 'number' && typeof reconCmd.y === 'number') {
        expect(Math.abs(reconCmd.y - origCmd.y)).toBeLessThanOrEqual(1.5);
      }
    }
  });
});
