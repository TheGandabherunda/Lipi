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
  leftMarginX: number;
  rightAdvanceX: number;
  scale: number;
  ascenderUnits: number;
  capHeightUnits: number;
  descenderUnits: number;
}

/**
 * Calculates industrial-standard font design guidelines based on authentic OpenType
 * Indic/Kannada typography metrics:
 * 
 * - UnitsPerEm: 1000 UPM (or font custom upm)
 * - Talekattu / Ascender: +790 to +810 font units (Talekattu, deergha, upper matras ಿ, ೇ, ೈ, and tall vowels ಈ, ಊ, ಔ)
 * - Body Height / Shirorekha: +565 font units (Top of base consonant arches ಕ, ಗ, ಅ, ತ, ಬ, ಲ, ಮ)
 * - Baseline: 0 font units (Primary alignment floor for base letters)
 * - Mahaprana Tail: -144 font units (Downstroke on aspirates ಘ, ಛ, ಝ, ಢ, ಥ, ಧ, ಫ, ಭ)
 * - Ottakshara / Descender: -420 font units (Below-base conjuncts ್ಕ, ್ತ, ್ಮ, lower matras ು, ೂ, ೃ)
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
  const descenderUnits = metrics.descender !== undefined ? metrics.descender : -420;
  const totalSpanUnits = ascenderUnits - descenderUnits; // e.g. 1210
  const glyphAdvance = advanceWidth || Math.round(upm * 0.78);

  // Responsive dual-axis scale: Ensures both vertical span AND horizontal advance width
  // fit comfortably inside the canvas with generous margins for all glyphs (narrow and wide)
  const usableHeight = canvasHeight * 0.72;
  const usableWidth = canvasWidth * 0.78;
  const scaleByHeight = usableHeight / Math.max(upm, totalSpanUnits);
  const scaleByWidth = usableWidth / Math.max(glyphAdvance, 500);
  const unitScale = Math.min(scaleByHeight, scaleByWidth);

  const totalContentHeight = totalSpanUnits * unitScale;
  const topPadding = Math.round((canvasHeight - totalContentHeight) / 2);
  const ascenderY = topPadding;
  const capHeightY = Math.round(topPadding + (ascenderUnits - capHeightUnits) * unitScale);
  const baselineY = Math.round(topPadding + ascenderUnits * unitScale);
  const mahapranaY = Math.round(baselineY + 144 * unitScale);
  const descenderY = Math.round(topPadding + totalSpanUnits * unitScale);

  const usableAdvanceWidth = glyphAdvance * unitScale;
  const centerX = Math.round(canvasWidth / 2);
  const leftMarginX = Math.round(centerX - usableAdvanceWidth / 2);
  const rightAdvanceX = Math.round(leftMarginX + usableAdvanceWidth);

  return {
    ascenderY,
    capHeightY,
    baselineY,
    mahapranaY,
    descenderY,
    centerX,
    leftMarginX,
    rightAdvanceX,
    scale: unitScale,
    ascenderUnits,
    capHeightUnits,
    descenderUnits,
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
  ctx.fillRect(boxX, guides.ascenderY, boxW, guides.capHeightY - guides.ascenderY);

  // Base Body Zone inside container (Mean / Shirorekha to Baseline)
  ctx.fillStyle = 'rgba(2, 132, 199, 0.045)';
  ctx.fillRect(boxX, guides.capHeightY, boxW, guides.baselineY - guides.capHeightY);

  // Mahaprana Zone inside container (Baseline to Mahaprana tail)
  ctx.fillStyle = 'rgba(217, 119, 6, 0.025)';
  ctx.fillRect(boxX, guides.baselineY, boxW, guides.mahapranaY - guides.baselineY);

  // Descender / Ottakshara Zone inside container
  ctx.fillStyle = 'rgba(147, 51, 234, 0.035)';
  ctx.fillRect(boxX, guides.mahapranaY, boxW, guides.descenderY - guides.mahapranaY);

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

  // Container Header Tag at Top: Letter Container • ಅಕ್ಷರ ಚೌಕಟ್ಟು
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
        ctx.fillStyle = `rgba(79, 70, 229, ${fillAlpha})`;
        ctx.fill(path2d);
      }

      // Outline rendering (Outline only or Both)
      if (mode === 'outline' || mode === 'both') {
        ctx.strokeStyle = `rgba(15, 23, 42, ${Math.max(0.06, tracing.opacity)})`;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
        ctx.stroke(path2d);
      }

      ctx.restore();
    }
  }

  // 4. Industrial Guideline Line Drawer
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

  // 1. Talekattu / Ascender (+790 to +810)
  if (config.showAscender) {
    drawMetricLine(
      guides.ascenderY,
      `+${guides.ascenderUnits}`,
      'Ascender / Talekattu',
      'ದೀರ್ಘ / ತಲೆಕಟ್ಟು',
      'rgba(225, 29, 72, 0.95)'
    );
  }

  // 2. Base Consonant Body Height / Shirorekha (+565)
  if (config.showCapHeight) {
    drawMetricLine(
      guides.capHeightY,
      `+${guides.capHeightUnits}`,
      'Body Height / Shirorekha',
      'ಕಾಯ ಎತ್ತರ / ಶಿರೋರೇಖೆ',
      'rgba(2, 132, 199, 0.95)'
    );
  }

  // 3. Baseline (0) - Solid Anchor Ground Line
  if (config.showBaseline) {
    drawMetricLine(
      guides.baselineY,
      '  0',
      'Baseline',
      'ಮೂಲರೇಖೆ / ತಳರೇಖೆ',
      'rgba(22, 163, 74, 1)',
      true
    );
  }

  // 4. Mahaprana Tail (-144) - Vertical tail for ಘ, ಛ, ಝ, ಢ, ಥ, ಧ, ಫ, ಭ
  drawMetricLine(
    guides.mahapranaY,
    '-144',
    'Mahaprana Tail',
    'ಮಹಾಪ್ರಾಣ ಇಳಿ ರೇಖೆ',
    'rgba(217, 119, 6, 0.75)'
  );

  // 5. Ottakshara / Descender (-420)
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

  // Left & Right Sidebearings (LSB / RSB) and Advance Width
  if (config.showAdvanceWidth) {
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    ctx.beginPath();
    ctx.moveTo(guides.leftMarginX, 24);
    ctx.lineTo(guides.leftMarginX, height - 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(guides.rightAdvanceX, 24);
    ctx.lineTo(guides.rightAdvanceX, height - 24);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(79, 70, 229, 0.95)';
    ctx.fillText('LSB (0)', guides.leftMarginX + 4, height - 32);
    ctx.fillText('RSB', guides.rightAdvanceX - 28, height - 32);

    const advanceSpan = Math.round((guides.rightAdvanceX - guides.leftMarginX) / guides.scale);
    ctx.font = '10px Inter, sans-serif';
    const dimText = `⟵  Advance Width: ${advanceSpan} units  ⟶`;
    const dimWidth = ctx.measureText(dimText).width;
    ctx.fillStyle = 'rgba(79, 70, 229, 0.85)';
    ctx.fillText(dimText, guides.centerX - dimWidth / 2, 22);
  }

  ctx.restore();
}
