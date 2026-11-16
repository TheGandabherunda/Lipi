import type { FontMetrics } from '../../types/lipiFormat';
import type { CanvasGuidelinesConfig, TracingConfig } from '../../types/canvas';
import type { VectorGlyphOutline } from '../../constants/kannadaVectorOutlines';
import { KANNADA_VECTOR_OUTLINES } from '../../constants/kannadaVectorOutlines';

export interface GuideMetrics {
  ascenderY: number;
  capHeightY: number;
  baselineY: number;
  mahapranaY: number;
  descenderY: number;
  centerX: number;
  leftMarginX: number; // Glyph Origin X (font X = 0)
  originX: number;     // Semantic alias for leftMarginX
  rightAdvanceX: number; // Advance Width boundary X (font X = advanceWidth)
  advanceX: number;      // Semantic alias for rightAdvanceX
  lsbX: number;          // Left Side Bearing Line X (font X = leftSideBearingUnits)
  rsbX: number;          // Right Side Bearing Line X (font X = advanceWidth - rightSideBearingUnits)
  scale: number;
  unitScale: number;
  unitsPerEm: number;
  ascenderUnits: number;
  capHeightUnits: number;
  baselineUnits: number;
  descenderUnits: number;
  mahapranaUnits: number;
  leftSideBearingUnits: number;
  rightSideBearingUnits: number;
}

/**
 * Calculates industrial-standard font design guidelines based on project-configurable
 * OpenType metrics with authentic Kannada typography defaults:
 * 
 * - UnitsPerEm: default 1000 UPM
 * - Talekattu / Ascender: default +790 font units (Talekattu, deergha, upper matras ಿ, ೇ, ೈ, and tall vowels ಈ, ಊ, ಔ)
 * - Body Height / Shirorekha: default +565 font units (Top of base consonant arches ಕ, ಗ, ಅ, ತ, ಬ, ಲ, ಮ)
 * - Baseline: default 0 font units (Primary alignment floor for base letters)
 * - Mahaprana Tail: default -144 font units (Downstroke on aspirates ಘ, ಛ, ಝ, ಢ, ಥ, ಧ, ಫ, ಭ)
 * - Ottakshara / Descender: default -420 font units (Below-base conjuncts ್ಕ, ್ತ, ್ಮ, lower matras ು, ೂ, ೃ)
 */
export function calculateGuidelinePositions(
  canvasWidth: number,
  canvasHeight: number,
  metrics: FontMetrics,
  advanceWidth: number
): GuideMetrics {
  const upm = metrics.unitsPerEm || 1000;
  const ascenderUnits = metrics.ascender || 790;
  const capHeightUnits = metrics.capHeight || 565;
  const baselineUnits = metrics.baseline !== undefined ? metrics.baseline : 0;
  const descenderUnits = metrics.descender !== undefined ? metrics.descender : -420;
  const mahapranaUnits = metrics.mahaprana !== undefined ? metrics.mahaprana : -144;
  const leftSideBearingUnits = metrics.leftSideBearing !== undefined ? metrics.leftSideBearing : 50;
  const rightSideBearingUnits = metrics.rightSideBearing !== undefined ? metrics.rightSideBearing : 50;

  const totalSpanUnits = Math.max(100, ascenderUnits - descenderUnits); // e.g. 1210
  const glyphAdvance = advanceWidth || Math.round(upm * 0.78);

  // Maintain uniform font-unit scale across standard glyphs based on canvas height
  const usableHeight = canvasHeight * 0.72;
  const usableWidth = canvasWidth * 0.78;
  const scaleByHeight = usableHeight / Math.max(upm, totalSpanUnits);
  // Scale down only if exceptionally wide glyph would overflow usable canvas width
  const scaleByWidth = glyphAdvance * scaleByHeight > usableWidth ? usableWidth / glyphAdvance : scaleByHeight;
  const unitScale = Math.min(scaleByHeight, scaleByWidth);

  const totalContentHeight = totalSpanUnits * unitScale;
  const topPadding = Math.round((canvasHeight - totalContentHeight) / 2);

  // Unified vertical coordinate mapping: all guide Y coordinates follow the exact same transform
  const baselineY = Math.round(topPadding + (ascenderUnits - baselineUnits) * unitScale);
  const fontYToCanvasY = (fontY: number) => Math.round(baselineY - (fontY - baselineUnits) * unitScale);

  const ascenderY = fontYToCanvasY(ascenderUnits);
  const capHeightY = fontYToCanvasY(capHeightUnits);
  const mahapranaY = fontYToCanvasY(mahapranaUnits);
  const descenderY = fontYToCanvasY(descenderUnits);

  const usableAdvanceWidth = glyphAdvance * unitScale;
  const centerX = Math.round(canvasWidth / 2);
  const leftMarginX = Math.round(centerX - usableAdvanceWidth / 2); // Origin (0)
  const rightAdvanceX = Math.round(leftMarginX + usableAdvanceWidth); // Advance boundary

  // Actual sidebearing guide positions
  const lsbX = Math.round(leftMarginX + leftSideBearingUnits * unitScale);
  const rsbX = Math.round(rightAdvanceX - rightSideBearingUnits * unitScale);

  return {
    ascenderY,
    capHeightY,
    baselineY,
    mahapranaY,
    descenderY,
    centerX,
    leftMarginX,
    originX: leftMarginX,
    rightAdvanceX,
    advanceX: rightAdvanceX,
    lsbX,
    rsbX,
    scale: unitScale,
    unitScale,
    unitsPerEm: upm,
    ascenderUnits,
    capHeightUnits,
    baselineUnits,
    descenderUnits,
    mahapranaUnits,
    leftSideBearingUnits,
    rightSideBearingUnits,
  };
}

/**
 * Renders professional font development guidelines (Glyphs App / FontLab style)
 * and the clean vector glyph OUTLINE with direct transparency control.
 */
export function renderCanvasGuidelines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guides: GuideMetrics,
  config: CanvasGuidelinesConfig,
  tracing?: TracingConfig,
  activeUnicode?: string,
  _sampleWord?: string,
  customOutlines?: Record<string, VectorGlyphOutline>
) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Container Box Coordinates (The official Letter Container)
  const boxX = guides.leftMarginX;
  const boxY = guides.ascenderY;
  const boxW = Math.max(10, guides.rightAdvanceX - guides.leftMarginX);
  const boxH = Math.max(10, guides.descenderY - guides.ascenderY);

  // 1. Subtle Metric Grid in Background
  if (config.showGrid) {
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.07)';
    ctx.lineWidth = 1;
    const gridSize = Math.round(width / 24);
    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  // 2. Dim Margins Outside the Letter Container
  ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
  ctx.fillRect(0, 0, boxX, height); // Left outside
  ctx.fillRect(boxX + boxW, 0, width - (boxX + boxW), height); // Right outside

  // 3. LETTER CONTAINER INTERIOR (Pristine White Drawing Box with Indic Zone Tints)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Upper Zone inside container (Talekattu / Ascender)
  ctx.fillStyle = 'rgba(225, 29, 72, 0.035)';
  ctx.fillRect(boxX, guides.ascenderY, boxW, Math.max(0, guides.capHeightY - guides.ascenderY));

  // Base Body Zone inside container (Mean / Shirorekha to Baseline)
  ctx.fillStyle = 'rgba(2, 132, 199, 0.045)';
  ctx.fillRect(boxX, guides.capHeightY, boxW, Math.max(0, guides.baselineY - guides.capHeightY));

  // Mahaprana Zone inside container (Baseline to Mahaprana tail)
  ctx.fillStyle = 'rgba(217, 119, 6, 0.025)';
  ctx.fillRect(boxX, guides.baselineY, boxW, Math.max(0, guides.mahapranaY - guides.baselineY));

  // Descender / Ottakshara Zone inside container
  ctx.fillStyle = 'rgba(147, 51, 234, 0.035)';
  ctx.fillRect(boxX, guides.mahapranaY, boxW, Math.max(0, guides.descenderY - guides.mahapranaY));

  // 4. LETTER CONTAINER BOUNDARY FRAME & CORNER BRACKETS
  ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  // Prominent Corner Brackets (┌ ┐ └ ┘) to clearly establish the letter writing box
  const bracketLen = Math.min(22, Math.round(boxW * 0.12));
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Top-Left corner
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + bracketLen);
  ctx.lineTo(boxX, boxY);
  ctx.lineTo(boxX + bracketLen, boxY);
  ctx.stroke();

  // Top-Right corner
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - bracketLen, boxY);
  ctx.lineTo(boxX + boxW, boxY);
  ctx.lineTo(boxX + boxW, boxY + bracketLen);
  ctx.stroke();

  // Bottom-Left corner
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxH - bracketLen);
  ctx.lineTo(boxX, boxY + boxH);
  ctx.lineTo(boxX + bracketLen, boxY + boxH);
  ctx.stroke();

  // Bottom-Right corner
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - bracketLen, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH - bracketLen);
  ctx.stroke();

  // Baseline Indicator Ticks on Container Edges (Solid Green)
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(boxX - 7, guides.baselineY);
  ctx.lineTo(boxX, guides.baselineY - 4);
  ctx.lineTo(boxX, guides.baselineY + 4);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(boxX + boxW + 7, guides.baselineY);
  ctx.lineTo(boxX + boxW, guides.baselineY - 4);
  ctx.lineTo(boxX + boxW, guides.baselineY + 4);
  ctx.fill();

  // Container Header Tag at Top
  const advanceSpan = Math.round(boxW / guides.scale);
  ctx.font = 'bold 11px Inter, sans-serif';
  const badgeText = `Letter Container • ಅಕ್ಷರ ಚೌಕಟ್ಟು (${advanceSpan} units)`;
  const badgeWidth = ctx.measureText(badgeText).width;
  const badgeX = Math.round(guides.centerX - badgeWidth / 2);
  const badgeY = Math.max(16, boxY - 14);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX - 10, badgeY - 12, badgeWidth + 20, 18, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4338ca';
  ctx.fillText(badgeText, badgeX, badgeY);

  // 5. TRACING OUTLINE SITS EXACTLY INSIDE THIS CONTAINER
  // Rendered with distinct color & dashed styling so it is visually unmistakable from user strokes
  if (tracing?.enabled && activeUnicode) {
    const outline = customOutlines !== undefined
      ? customOutlines[activeUnicode]
      : KANNADA_VECTOR_OUTLINES[activeUnicode];

    if (outline && outline.svgPath) {
      ctx.save();
      // Translate directly to Left Sidebearing and Baseline inside the letter container
      ctx.translate(guides.leftMarginX, guides.baselineY);
      ctx.scale(guides.scale, guides.scale);

      const path2d = new Path2D(outline.svgPath);
      const mode = tracing.mode || 'outline';
      const outlineWidth = (tracing.outlineSize || 2) / guides.scale;
      const fillIntensity = (tracing.fillSize || 10) / 10;

      // Fill rendering (Fill only or Both)
      if (mode === 'fill' || mode === 'both') {
        const fillAlpha = Math.min(0.85, Math.max(0.04, tracing.opacity * 0.45 * fillIntensity));
        ctx.fillStyle = `rgba(99, 102, 241, ${fillAlpha})`;
        ctx.fill(path2d);
      }

      // Outline rendering (Outline only or Both)
      if (mode === 'outline' || mode === 'both') {
        ctx.strokeStyle = `rgba(99, 102, 241, ${Math.max(0.12, tracing.opacity)})`;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        // Distinct dashed line for reference font outline so it cannot be confused with user ink
        ctx.setLineDash([5 / guides.scale, 4 / guides.scale]);
        ctx.stroke(path2d);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  // 6. Industrial Guideline Line Drawer
  const drawMetricLine = (
    y: number,
    metricUnit: string,
    labelEn: string,
    labelKn: string,
    color: string,
    isSolid = false
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = isSolid ? 1.6 : 1.2;
    ctx.setLineDash(isSolid ? [] : [4, 4]);

    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(width - 16, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '11px Inter, sans-serif';
    const text = `${metricUnit}  ${labelEn} (${labelKn})`;
    const textWidth = ctx.measureText(text).width;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(20, y - 16, textWidth + 14, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(text, 26, y - 4);
  };

  // 1. Talekattu / Ascender (project-configured)
  if (config.showAscender) {
    drawMetricLine(
      guides.ascenderY,
      `+${guides.ascenderUnits}`,
      'Ascender / Talekattu',
      'ದೀರ್ಘ / ತಲೆಕಟ್ಟು',
      'rgba(225, 29, 72, 0.95)'
    );
  }

  // 2. Base Consonant Body Height / Shirorekha (project-configured)
  if (config.showCapHeight) {
    drawMetricLine(
      guides.capHeightY,
      `+${guides.capHeightUnits}`,
      'Body Height / Shirorekha',
      'ಕಾಯ ಎತ್ತರ / ಶಿರೋರೇಖೆ',
      'rgba(2, 132, 199, 0.95)'
    );
  }

  // 3. Baseline (project-configured, default 0) - Solid Anchor Ground Line
  if (config.showBaseline) {
    drawMetricLine(
      guides.baselineY,
      `  ${guides.baselineUnits}`,
      'Baseline',
      'ಮೂಲರೇಖೆ / ತಳರೇಖೆ',
      'rgba(22, 163, 74, 1)',
      true
    );
  }

  // 4. Mahaprana Tail (project-configured, default -144)
  drawMetricLine(
    guides.mahapranaY,
    `${guides.mahapranaUnits < 0 ? guides.mahapranaUnits : `-${guides.mahapranaUnits}`}`,
    'Mahaprana Tail',
    'ಮಹಾಪ್ರಾಣ ಇಳಿ ರೇಖೆ',
    'rgba(217, 119, 6, 0.75)'
  );

  // 5. Ottakshara / Descender (project-configured, default -420)
  if (config.showDescender) {
    drawMetricLine(
      guides.descenderY,
      `${guides.descenderUnits < 0 ? guides.descenderUnits : `-${guides.descenderUnits}`}`,
      'Descender / Ottakshara',
      'ಒತ್ತಕ್ಷರ / ಇಳಿ ಸಾಲು',
      'rgba(147, 51, 234, 0.95)'
    );
  }

  // Center Vertical Line
  if (config.showCenterVertical) {
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(guides.centerX, 16);
    ctx.lineTo(guides.centerX, height - 16);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(217, 119, 6, 0.95)';
    ctx.fillText('Center (ಕೇಂದ್ರ)', guides.centerX + 6, 30);
  }

  // Left & Right Boundaries (Origin, LSB, RSB, Advance Width)
  if (config.showAdvanceWidth) {
    const advanceSpan = Math.round((guides.rightAdvanceX - guides.leftMarginX) / guides.scale);

    // 1. Origin Boundary (X = 0)
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(guides.leftMarginX, 24);
    ctx.lineTo(guides.leftMarginX, height - 24);
    ctx.stroke();

    // 2. Advance Boundary (X = advanceWidth)
    ctx.beginPath();
    ctx.moveTo(guides.rightAdvanceX, 24);
    ctx.lineTo(guides.rightAdvanceX, height - 24);
    ctx.stroke();

    // 3. Sidebearing Guides (LSB and RSB ink margins)
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.65)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    if (guides.leftSideBearingUnits > 0) {
      ctx.beginPath();
      ctx.moveTo(guides.lsbX, 28);
      ctx.lineTo(guides.lsbX, height - 28);
      ctx.stroke();
    }

    if (guides.rightSideBearingUnits > 0) {
      ctx.beginPath();
      ctx.moveTo(guides.rsbX, 28);
      ctx.lineTo(guides.rsbX, height - 28);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.font = '10px Inter, sans-serif';

    // Labels for Origin and Advance
    ctx.fillStyle = 'rgba(79, 70, 229, 0.95)';
    ctx.fillText('Origin (0)', guides.leftMarginX + 4, height - 32);
    ctx.fillText(`Advance (${advanceSpan})`, guides.rightAdvanceX - 70, height - 32);

    // Labels for LSB and RSB
    ctx.fillStyle = 'rgba(2, 132, 199, 0.95)';
    if (guides.leftSideBearingUnits > 0) {
      ctx.fillText(`LSB (+${guides.leftSideBearingUnits})`, guides.lsbX + 4, height - 46);
    }
    if (guides.rightSideBearingUnits > 0) {
      ctx.fillText(`RSB (-${guides.rightSideBearingUnits})`, guides.rsbX - 58, height - 46);
    }

    const dimText = `⟵  Advance Width: ${advanceSpan} units  ⟶`;
    const dimWidth = ctx.measureText(dimText).width;
    ctx.fillStyle = 'rgba(79, 70, 229, 0.85)';
    ctx.fillText(dimText, guides.centerX - dimWidth / 2, 22);
  }

  ctx.restore();
}
