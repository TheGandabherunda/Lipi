import opentype from 'opentype.js';
import JSZip from 'jszip';
import type { GlyphData } from '../types/glyph';
import type { LipiProjectMetadata } from '../types/lipiFormat';
import type { VectorGlyphOutline } from '../constants/kannadaVectorOutlines';
import { KANNADA_VECTOR_OUTLINES } from '../constants/kannadaVectorOutlines';
import { KANNADA_CHARACTERS_LIST } from '../constants/kannadaCharacters';
import { getBaseFontBuffer, getCachedFontBuffer } from './googleFontsManager';
import { calculateGuidelinePositions } from '../components/canvas/CanvasGuidelines';
import { transformPathToFontUnits } from './coordinateSystem';
import type { VectorPathData } from '../types/glyph';

export { transformPathToFontUnits };

/**
 * Samples continuous point chains from opentype path commands
 */
export function samplePointsFromCommands(
  commands: opentype.PathCommand[],
  step = 4
): { x: number; y: number }[][] {
  const chains: { x: number; y: number }[][] = [];
  let currentChain: { x: number; y: number }[] = [];
  let curX = 0;
  let curY = 0;

  commands.forEach((cmd) => {
    if (cmd.type === 'M') {
      if (currentChain.length > 0) {
        chains.push(currentChain);
      }
      curX = cmd.x;
      curY = cmd.y;
      currentChain = [{ x: curX, y: curY }];
    } else if (cmd.type === 'L') {
      const dist = Math.hypot(cmd.x - curX, cmd.y - curY);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        currentChain.push({
          x: curX + (cmd.x - curX) * t,
          y: curY + (cmd.y - curY) * t,
        });
      }
      curX = cmd.x;
      curY = cmd.y;
    } else if (cmd.type === 'Q') {
      const dist =
        Math.hypot(cmd.x1 - curX, cmd.y1 - curY) +
        Math.hypot(cmd.x - cmd.x1, cmd.y - cmd.y1);
      const steps = Math.max(2, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        currentChain.push({
          x: mt * mt * curX + 2 * mt * t * cmd.x1 + t * t * cmd.x,
          y: mt * mt * curY + 2 * mt * t * cmd.y1 + t * t * cmd.y,
        });
      }
      curX = cmd.x;
      curY = cmd.y;
    } else if (cmd.type === 'C') {
      const dist =
        Math.hypot(cmd.x1 - curX, cmd.y1 - curY) +
        Math.hypot(cmd.x2 - cmd.x1, cmd.y2 - cmd.y1) +
        Math.hypot(cmd.x - cmd.x2, cmd.y - cmd.y2);
      const steps = Math.max(3, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        currentChain.push({
          x:
            mt * mt * mt * curX +
            3 * mt * mt * t * cmd.x1 +
            3 * mt * t * t * cmd.x2 +
            t * t * t * cmd.x,
          y:
            mt * mt * mt * curY +
            3 * mt * mt * t * cmd.y1 +
            3 * mt * t * t * cmd.y2 +
            t * t * t * cmd.y,
        });
      }
      curX = cmd.x;
      curY = cmd.y;
    }
  });

  if (currentChain.length > 0) {
    chains.push(currentChain);
  }

  return chains;
}

/**
 * Expands an open stroked chain of points into an authentic TrueType/OpenType closed outline ribbon
 * with solid fill and round end caps matching the canvas pen/brush thickness.
 */
export function expandChainToRibbon(
  points: { x: number; y: number }[],
  strokeWidth: number,
  cap: 'round' | 'butt' | 'square' = 'round'
): opentype.Path | null {
  if (points.length < 2) {
    if (points.length === 1) {
      const p = points[0];
      const r = strokeWidth / 2;
      const dot = new opentype.Path();
      dot.moveTo(p.x - r, p.y);
      dot.curveTo(p.x - r, p.y + r * 1.33, p.x + r, p.y + r * 1.33, p.x + r, p.y);
      dot.curveTo(p.x + r, p.y - r * 1.33, p.x - r, p.y - r * 1.33, p.x - r, p.y);
      dot.close();
      return dot;
    }
    return null;
  }

  const halfW = strokeWidth / 2;
  const n = points.length;
  const leftEdge: { x: number; y: number }[] = [];
  const rightEdge: { x: number; y: number }[] = [];

  const isClosed =
    Math.hypot(points[0].x - points[n - 1].x, points[0].y - points[n - 1].y) < halfW * 0.4;

  for (let i = 0; i < n; i++) {
    let dx: number;
    let dy: number;
    if (isClosed) {
      const prev = points[(i - 1 + n) % n];
      const next = points[(i + 1) % n];
      dx = next.x - prev.x;
      dy = next.y - prev.y;
    } else {
      if (i === 0) {
        dx = points[1].x - points[0].x;
        dy = points[1].y - points[0].y;
      } else if (i === n - 1) {
        dx = points[n - 1].x - points[n - 2].x;
        dy = points[n - 1].y - points[n - 2].y;
      } else {
        dx = points[i + 1].x - points[i - 1].x;
        dy = points[i + 1].y - points[i - 1].y;
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    leftEdge.push({
      x: Math.round(points[i].x + nx * halfW),
      y: Math.round(points[i].y + ny * halfW),
    });
    rightEdge.push({
      x: Math.round(points[i].x - nx * halfW),
      y: Math.round(points[i].y - ny * halfW),
    });
  }

  const ribbon = new opentype.Path();
  ribbon.moveTo(leftEdge[0].x, leftEdge[0].y);
  for (let i = 1; i < n; i++) {
    ribbon.lineTo(leftEdge[i].x, leftEdge[i].y);
  }

  if (!isClosed) {
    if (cap === 'square' || cap === 'butt') {
      ribbon.lineTo(rightEdge[n - 1].x, rightEdge[n - 1].y);
    } else {
      // Semicircular round end cap
      const pn = points[n - 1];
      const dnx = points[n - 1].x - points[n - 2].x;
      const dny = points[n - 1].y - points[n - 2].y;
      const lenn = Math.hypot(dnx, dny) || 1;
      const tnx = dnx / lenn;
      const tny = dny / lenn;
      ribbon.curveTo(
        Math.round(pn.x + tnx * halfW * 1.33),
        Math.round(pn.y + tny * halfW * 1.33),
        rightEdge[n - 1].x,
        rightEdge[n - 1].y,
        rightEdge[n - 1].x,
        rightEdge[n - 1].y
      );
    }

    for (let i = n - 2; i >= 0; i--) {
      ribbon.lineTo(rightEdge[i].x, rightEdge[i].y);
    }

    if (cap === 'square' || cap === 'butt') {
      ribbon.lineTo(leftEdge[0].x, leftEdge[0].y);
    } else {
      // Semicircular round start cap
      const p0 = points[0];
      const d0x = points[1].x - points[0].x;
      const d0y = points[1].y - points[0].y;
      const len0 = Math.hypot(d0x, d0y) || 1;
      const t0x = -d0x / len0;
      const t0y = -d0y / len0;
      ribbon.curveTo(
        Math.round(p0.x + t0x * halfW * 1.33),
        Math.round(p0.y + t0y * halfW * 1.33),
        leftEdge[0].x,
        leftEdge[0].y,
        leftEdge[0].x,
        leftEdge[0].y
      );
    }
  } else {
    ribbon.close();
    ribbon.moveTo(rightEdge[0].x, rightEdge[0].y);
    for (let i = 1; i < n; i++) {
      ribbon.lineTo(rightEdge[i].x, rightEdge[i].y);
    }
  }

  ribbon.close();
  return ribbon;
}

/**
 * Converts user-drawn canvas strokes into solid OpenType filled vector contours
 * with accurate letter container alignment, advance width, and baseline metrics.
 */
export function convertUserPathsToFontGlyphPath(
  paths: VectorPathData[],
  canvasWidth: number,
  canvasHeight: number,
  metrics: LipiProjectMetadata['metrics'],
  advanceWidth: number,
  fallbackMetrics?: { leftMarginX: number; baselineY: number; scale: number }
): opentype.Path {
  const combinedPath = new opentype.Path();
  const guides =
    fallbackMetrics ||
    calculateGuidelinePositions(canvasWidth, canvasHeight, metrics, advanceWidth);
  const { leftMarginX, baselineY, scale } = guides;

  paths.forEach((p) => {
    try {
      if (!p.pathString || !p.pathString.trim()) return;

      const rawPath = (new opentype.Path() as any).fromSVG(p.pathString, { flipY: false });
      if (!rawPath || !rawPath.commands || rawPath.commands.length === 0) return;

      const transformed = transformPathToFontUnits(rawPath, leftMarginX, baselineY, scale);

      const isFilled = Boolean(
        p.fillColor &&
        p.fillColor !== 'none' &&
        p.fillColor !== 'transparent'
      );

      if (isFilled) {
        // Pre-filled ribbon (e.g. calligraphy brush or filled polygon)
        transformed.commands.forEach((c: any) => combinedPath.commands.push(c));
      } else {
        // Stroked path (Pen, Round brush): Expand into closed ribbon
        const strokeW = p.strokeWidth || 16;
        const fontStrokeWidth = Math.max(12, Math.round(strokeW / scale));
        const chains = samplePointsFromCommands(transformed.commands, 4);

        chains.forEach((chain) => {
          const ribbon = expandChainToRibbon(
            chain,
            fontStrokeWidth,
            (p.strokeLineCap as any) || 'round'
          );
          if (ribbon && ribbon.commands.length > 0) {
            ribbon.commands.forEach((c: any) => combinedPath.commands.push(c));
          }
        });
      }
    } catch (e) {
      console.warn('Failed converting user path to font glyph:', e);
    }
  });

  return combinedPath;
}

export interface CompileFontOptions {
  canvasMetrics?: { leftMarginX: number; baselineY: number; scale: number };
  canvasWidth?: number;
  canvasHeight?: number;
  baseFontBuffer?: ArrayBuffer;
  fontId?: string;
  mapLatinKeys?: boolean;
}

/**
 * Optional Latin preview aliases (maps standard English keys to primary Kannada glyphs).
 * Intended solely for previewing custom glyphs on keyboards without Kannada input methods
 * or in simple desktop font viewers (e.g. Windows fontview.exe).
 * NOTE: This is NOT Indic complex text shaping.
 */
export const KANNADA_TO_LATIN_KEYS: Record<string, number[]> = {
  'U+0C85': [97],             // ಅ -> 'a'
  'U+0C86': [65],             // ಆ -> 'A'
  'U+0C87': [105],            // ಇ -> 'i'
  'U+0C88': [73],             // ಈ -> 'I'
  'U+0C89': [117],            // ಉ -> 'u'
  'U+0C8A': [85],             // ಊ -> 'U'
  'U+0C8B': [82],             // ಋ -> 'R'
  'U+0C8E': [101],            // ಎ -> 'e'
  'U+0C8F': [69],             // ಏ -> 'E'
  'U+0C90': [89],             // ಐ -> 'Y'
  'U+0C92': [111],            // ಒ -> 'o'
  'U+0C93': [79],             // ಓ -> 'O'
  'U+0C94': [87],             // ಔ -> 'W'
  'U+0C95': [107],            // ಕ -> 'k'
  'U+0C96': [75],             // ಖ -> 'K'
  'U+0C97': [103],            // ಗ -> 'g'
  'U+0C98': [71],             // ಘ -> 'G'
  'U+0C9A': [99],             // ಚ -> 'c'
  'U+0C9B': [67],             // ಛ -> 'C'
  'U+0C9C': [106],            // ಜ -> 'j'
  'U+0C9D': [74],             // ಝ -> 'J'
  'U+0C9F': [116],            // ಟ -> 't'
  'U+0CA1': [100],            // ಡ -> 'd'
  'U+0CA3': [78],             // ಣ -> 'N'
  'U+0CA4': [84],             // ತ -> 'T'
  'U+0CA6': [68],             // ದ -> 'D'
  'U+0CA8': [110],            // ನ -> 'n'
  'U+0CAA': [112],            // ಪ -> 'p'
  'U+0CAB': [102],            // ಫ -> 'f'
  'U+0CAC': [98],             // ಬ -> 'b'
  'U+0CAD': [66],             // ಭ -> 'B'
  'U+0CAE': [109],            // ಮ -> 'm'
  'U+0CAF': [121],            // ಯ -> 'y'
  'U+0CB0': [114],            // ರ -> 'r'
  'U+0CB2': [108],            // ಲ -> 'l'
  'U+0CB3': [76],             // ಳ -> 'L'
  'U+0CB5': [118],            // ವ -> 'v'
  'U+0CB6': [83],             // ಶ -> 'S'
  'U+0CB7': [120],            // ಷ -> 'x'
  'U+0CB8': [115],            // ಸ -> 's'
  'U+0CB9': [104],            // ಹ -> 'h'
  'U+0CE6': [48],             // ೦ -> '0'
  'U+0CE7': [49],             // ೧ -> '1'
  'U+0CE8': [50],             // ೨ -> '2'
  'U+0CE9': [51],             // ೩ -> '3'
  'U+0CEA': [52],             // ೪ -> '4'
  'U+0CEB': [53],             // ೫ -> '5'
  'U+0CEC': [54],             // ೬ -> '6'
  'U+0CED': [55],             // ೭ -> '7'
  'U+0CEE': [56],             // ೮ -> '8'
  'U+0CEF': [57],             // ೯ -> '9'
};

export interface FontValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the integrity of an OpenType font instance or compiled ArrayBuffer before export.
 */
export function validateCompiledFont(fontOrBuffer: opentype.Font | ArrayBuffer): FontValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fontOrBuffer) {
    errors.push('Font object or buffer is null or undefined.');
    return { valid: false, errors, warnings };
  }

  let font: opentype.Font;
  let buffer: ArrayBuffer;

  if (fontOrBuffer instanceof ArrayBuffer) {
    buffer = fontOrBuffer;
    if (buffer.byteLength < 500) {
      errors.push(`Compiled font binary is unexpectedly small / under 500 bytes (${buffer.byteLength} bytes).`);
      return { valid: false, errors, warnings };
    }
    try {
      font = opentype.parse(buffer);
    } catch (err) {
      errors.push(`Failed to parse compiled font binary: ${err instanceof Error ? err.message : String(err)}`);
      return { valid: false, errors, warnings };
    }
  } else {
    font = fontOrBuffer;
    // Test binary serialization
    try {
      buffer = font.toArrayBuffer();
      if (!buffer || buffer.byteLength < 500) {
        errors.push(`Compiled font binary is unexpectedly small (${buffer ? buffer.byteLength : 0} bytes).`);
      }
    } catch (err) {
      errors.push(`font.toArrayBuffer() failed: ${err instanceof Error ? err.message : String(err)}`);
      return { valid: false, errors, warnings };
    }

    // Test round-trip parse
    try {
      const reparsed = opentype.parse(buffer);
      if (!reparsed || !reparsed.glyphs || reparsed.glyphs.length === 0) {
        errors.push('Re-parsing font binary yielded an empty glyph table.');
      }
    } catch (err) {
      errors.push(`Re-parsing font binary failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!font.unitsPerEm || font.unitsPerEm <= 0) {
    errors.push(`Invalid unitsPerEm: ${font.unitsPerEm}`);
  }

  if (!font.glyphs || font.glyphs.length === 0) {
    errors.push('Font contains no glyphs.');
    return { valid: false, errors, warnings };
  }

  // Ensure mandatory .notdef glyph exists at index 0
  const notdef = font.glyphs.get(0);
  if (!notdef) {
    warnings.push('Font lacks a standard .notdef glyph at index 0.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Compiles a font by patching custom-drawn vector glyphs onto an authentic Kannada base font.
 * NOTE (Hybrid Base Mode): This patches user-drawn primary Kannada outlines into the base font.
 * Complex Indic shaping (GSUB/GPOS conjunct substitutions and mark positioning) is inherited
 * from the base font for existing conjunct glyphs.
 */
export function compileFontFromBase(
  baseBuffer: ArrayBuffer,
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>,
  _referenceOutlines: Record<string, VectorGlyphOutline> = KANNADA_VECTOR_OUTLINES,
  options?: CompileFontOptions
): opentype.Font {
  const font = opentype.parse(baseBuffer.slice(0));

  const familyName =
    (metadata.name || 'LipiKannadaFont').trim().replace(/[^a-zA-Z0-9_\- ]/g, '') ||
    'LipiKannada';
  const styleName = metadata.weightName || metadata.styleName || 'Regular';
  const weightClass = metadata.weightClass || 400;

  const anyFont = font as any;
  anyFont.names = anyFont.names || {};
  anyFont.names.windows = anyFont.names.windows || {};
  anyFont.names.windows.fontFamily = { en: familyName };
  anyFont.names.windows.fontSubfamily = { en: styleName };
  anyFont.names.windows.fullName = { en: `${familyName} ${styleName}` };
  anyFont.names.windows.postScriptName = { en: `${familyName.replace(/\s+/g, '')}-${styleName}` };

  anyFont.names.macintosh = {
    ...anyFont.names.windows,
    ...anyFont.names.macintosh,
    fontFamily: { en: familyName },
    fontSubfamily: { en: styleName },
  };
  anyFont.names.unicode = { ...anyFont.names.windows };
  anyFont.familyName = familyName;
  anyFont.styleName = styleName;

  try {
    if (anyFont.tables?.os2) {
      anyFont.tables.os2.usWeightClass = weightClass;
    }
  } catch {
    // Continue
  }

  const upm = font.unitsPerEm || 1000;
  const cw = options?.canvasWidth || 800;
  const ch = options?.canvasHeight || 800;

  // Patch any glyphs that user has custom-drawn
  KANNADA_CHARACTERS_LIST.forEach((item) => {
    const userGlyph = glyphs[item.unicode];
    if (userGlyph && userGlyph.paths && userGlyph.paths.length > 0) {
      const advanceWidth = userGlyph.advanceWidth || item.defaultAdvanceWidth || Math.round(upm * 0.78);
      const combinedPath = convertUserPathsToFontGlyphPath(
        userGlyph.paths,
        cw,
        ch,
        metadata.metrics,
        advanceWidth,
        options?.canvasMetrics
      );

      const targetGlyph = font.charToGlyph(item.character);
      if (targetGlyph && targetGlyph.unicode !== undefined) {
        targetGlyph.path = combinedPath;
        if (userGlyph.advanceWidth && userGlyph.advanceWidth > 0) {
          targetGlyph.advanceWidth = userGlyph.advanceWidth;
        }

        // Optional Latin preview alias mapping
        if (options?.mapLatinKeys && KANNADA_TO_LATIN_KEYS[item.unicode]) {
          const latinCodes = KANNADA_TO_LATIN_KEYS[item.unicode];
          const curUnicodes = targetGlyph.unicodes || (targetGlyph.unicode !== undefined ? [targetGlyph.unicode] : []);
          targetGlyph.unicodes = Array.from(new Set([...curUnicodes, ...latinCodes]));

          latinCodes.forEach((code) => {
            const char = String.fromCharCode(code);
            const latinGlyph = font.charToGlyph(char);
            if (latinGlyph && latinGlyph !== targetGlyph) {
              latinGlyph.path = combinedPath;
              if (userGlyph.advanceWidth && userGlyph.advanceWidth > 0) {
                latinGlyph.advanceWidth = userGlyph.advanceWidth;
              }
            }
          });
        }
      }
    }
  });

  const validation = validateCompiledFont(font);
  if (!validation.valid) {
    console.warn('Base font compilation validation warnings/errors:', validation.errors);
  }

  return font;
}

/**
 * Standalone compilation mode (when base font binary is unavailable or when exporting pure outlines).
 * NOTE (Standalone Prototype Mode): Compiles primary Kannada Unicode glyphs (U+0C80..U+0CFF) with
 * accurate metrics into a standalone TrueType font. Does NOT construct custom GSUB/GPOS Indic
 * shaping tables from scratch. Full complex conjunct shaping requires external mastering.
 */
export function compileFontStandalone(
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>,
  referenceOutlines: Record<string, VectorGlyphOutline> = KANNADA_VECTOR_OUTLINES,
  options?: CompileFontOptions
): opentype.Font {
  const familyName = (metadata.name || 'LipiKannadaFont').trim().replace(/[^a-zA-Z0-9_\- ]/g, '') || 'LipiKannada';
  const upm = metadata.metrics.unitsPerEm || 1000;
  const ascender = metadata.metrics.ascender || 790;
  const descender = metadata.metrics.descender !== undefined ? metadata.metrics.descender : -420;
  const cw = options?.canvasWidth || 800;
  const ch = options?.canvasHeight || 800;

  // 1. Mandatory .notdef glyph (Glyph 0)
  const notdefPath = new opentype.Path();
  const notdefWidth = Math.round(upm * 0.55);
  notdefPath.moveTo(50, 0);
  notdefPath.lineTo(notdefWidth - 50, 0);
  notdefPath.lineTo(notdefWidth - 50, Math.round(ascender * 0.8));
  notdefPath.lineTo(50, Math.round(ascender * 0.8));
  notdefPath.close();

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: notdefWidth,
    path: notdefPath,
  });

  // 2. Space glyph
  const spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: Math.round(upm * 0.35),
    path: new opentype.Path(),
  });

  const fontGlyphs = [notdefGlyph, spaceGlyph];

  // 3. Compile all Kannada glyphs
  KANNADA_CHARACTERS_LIST.forEach((item) => {
    const unicodeNum = parseInt(item.unicode.replace('U+', ''), 16);
    const userGlyph = glyphs[item.unicode];
    const advanceWidth = userGlyph?.advanceWidth || item.defaultAdvanceWidth || Math.round(upm * 0.78);

    const latinCodes =
      options?.mapLatinKeys && KANNADA_TO_LATIN_KEYS[item.unicode]
        ? KANNADA_TO_LATIN_KEYS[item.unicode]
        : [];
    const glyphUnicodes = Array.from(new Set([unicodeNum, ...latinCodes]));

    if (userGlyph && userGlyph.paths && userGlyph.paths.length > 0) {
      const combinedPath = convertUserPathsToFontGlyphPath(
        userGlyph.paths,
        cw,
        ch,
        metadata.metrics,
        advanceWidth,
        options?.canvasMetrics
      );

      const glyph = new opentype.Glyph({
        name: `uni${unicodeNum.toString(16).toUpperCase().padStart(4, '0')}`,
        unicode: unicodeNum,
        unicodes: glyphUnicodes,
        advanceWidth,
        path: combinedPath,
      });

      fontGlyphs.push(glyph);
    } else {
      const outline = referenceOutlines[item.unicode] || KANNADA_VECTOR_OUTLINES[item.unicode];
      const refPath = new opentype.Path();

      if (outline && outline.svgPath) {
        try {
          const parsed = (new opentype.Path() as any).fromSVG(outline.svgPath, { flipY: false });
          parsed.commands.forEach((cmd: any) => {
            const c = { ...cmd };
            if ('y' in c && c.y !== undefined) c.y = -c.y;
            if ('y1' in c && c.y1 !== undefined) c.y1 = -c.y1;
            if ('y2' in c && c.y2 !== undefined) c.y2 = -c.y2;
            refPath.commands.push(c);
          });
        } catch {
          // Empty path fallback
        }
      }

      const glyph = new opentype.Glyph({
        name: `uni${unicodeNum.toString(16).toUpperCase().padStart(4, '0')}`,
        unicode: unicodeNum,
        unicodes: glyphUnicodes,
        advanceWidth: outline?.advanceWidth || advanceWidth,
        path: refPath,
      });

      fontGlyphs.push(glyph);
    }
  });

  const styleName = metadata.weightName || metadata.styleName || 'Regular';
  const weightClass = metadata.weightClass || 400;

  const font = new opentype.Font({
    familyName,
    styleName,
    unitsPerEm: upm,
    ascender,
    descender,
    glyphs: fontGlyphs,
  });

  try {
    if ((font as any).tables?.os2) {
      (font as any).tables.os2.usWeightClass = weightClass;
      (font as any).tables.os2.sTypoAscender = ascender;
      (font as any).tables.os2.sTypoDescender = descender;
      (font as any).tables.os2.usWinAscent = Math.max(1000, ascender);
      (font as any).tables.os2.usWinDescent = Math.abs(descender);
    }
    if ((font as any).tables?.hhea) {
      (font as any).tables.hhea.ascender = ascender;
      (font as any).tables.hhea.descender = descender;
    }
  } catch {
    // Continue
  }

  const validation = validateCompiledFont(font);
  if (!validation.valid) {
    console.warn('Standalone font compilation validation warnings/errors:', validation.errors);
  }

  return font;
}

/**
 * Synchronous compileFont that automatically uses cached base buffer if present,
 * or falls back cleanly to standalone prototype compilation.
 */
export function compileFont(
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>,
  referenceOutlines: Record<string, VectorGlyphOutline> = KANNADA_VECTOR_OUTLINES,
  options?: CompileFontOptions
): opentype.Font {
  const baseBuffer = options?.baseFontBuffer || getCachedFontBuffer(options?.fontId || 'noto-sans-kannada');
  if (baseBuffer) {
    try {
      return compileFontFromBase(baseBuffer, metadata, glyphs, referenceOutlines, options);
    } catch (e) {
      console.warn('Failed compiling from base font, falling back to standalone prototype:', e);
    }
  }

  return compileFontStandalone(metadata, glyphs, referenceOutlines, options);
}

/**
 * Asynchronous compileFont that guarantees loading the authentic Indic base font
 */
export async function compileFontAsync(
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>,
  referenceOutlines: Record<string, VectorGlyphOutline> = KANNADA_VECTOR_OUTLINES,
  options?: CompileFontOptions
): Promise<opentype.Font> {
  try {
    const baseBuffer =
      options?.baseFontBuffer ||
      (await getBaseFontBuffer(options?.fontId || 'noto-sans-kannada'));
    return compileFontFromBase(baseBuffer, metadata, glyphs, referenceOutlines, options);
  } catch (e) {
    console.warn('Failed loading base font buffer, using standalone prototype fallback:', e);
    return compileFontStandalone(metadata, glyphs, referenceOutlines, options);
  }
}

/**
 * Downloads a font in the specified binary format (.ttf, .otf, .woff, or complete .zip)
 */
export async function downloadFontPackage(
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>,
  referenceOutlines: Record<string, VectorGlyphOutline>,
  format: 'ttf' | 'otf' | 'woff' | 'zip',
  canvasMetrics?: { leftMarginX: number; baselineY: number; scale: number },
  fontId?: string,
  extraOptions?: {
    canvasWidth?: number;
    canvasHeight?: number;
    mapLatinKeys?: boolean;
  }
): Promise<void> {
  let isHybridMode = false;
  let font: opentype.Font;

  try {
    const baseBuffer = await getBaseFontBuffer(fontId || 'noto-sans-kannada');
    font = compileFontFromBase(baseBuffer, metadata, glyphs, referenceOutlines, {
      canvasMetrics,
      fontId,
      canvasWidth: extraOptions?.canvasWidth,
      canvasHeight: extraOptions?.canvasHeight,
      mapLatinKeys: extraOptions?.mapLatinKeys,
    });
    isHybridMode = true;
  } catch {
    font = compileFontStandalone(metadata, glyphs, referenceOutlines, {
      canvasMetrics,
      fontId,
      canvasWidth: extraOptions?.canvasWidth,
      canvasHeight: extraOptions?.canvasHeight,
      mapLatinKeys: extraOptions?.mapLatinKeys,
    });
    isHybridMode = false;
  }

  const fontName = (metadata.name || 'LipiKannadaFont').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const buffer = font.toArrayBuffer();

  if (format === 'ttf') {
    const blob = new Blob([buffer], { type: 'font/ttf' });
    triggerDownload(blob, `${fontName}.ttf`);
    return;
  }

  if (format === 'otf') {
    const blob = new Blob([buffer], { type: 'font/otf' });
    triggerDownload(blob, `${fontName}.otf`);
    return;
  }

  if (format === 'woff') {
    const blob = new Blob([buffer], { type: 'font/woff' });
    triggerDownload(blob, `${fontName}.woff`);
    return;
  }

  // --- Complete Font Package (ZIP) ---
  const zip = new JSZip();

  // 1. Binaries
  zip.file(`${fontName}.ttf`, buffer);
  zip.file(`${fontName}.otf`, buffer);
  zip.file(`${fontName}.woff`, buffer);

  // 2. Clear Cross-Platform Installation Guide with Honest Shaping Notes
  const instructions = `========================================================================
${metadata.name} - Kannada Font Installation & Usage Instructions
========================================================================
Author: ${metadata.author || 'Kannada Lipikara'}
Version: ${metadata.version || '1.0.0'}
Generated by: Lipi (ಲಿಪಿ) - Kannada Typeface Design Studio
Export Mode: ${isHybridMode ? 'Hybrid Base Mode (Noto Sans Kannada engine)' : 'Standalone Outline Prototype Mode'}
Script: Kannada (Unicode block U+0C80..U+0CFF)

--- ABOUT SHAPING & COMPLEX TEXT LAYOUT ---
- Single Characters: Standard Kannada vowels, consonants, standalone matras, and numerals are directly mapped to their official Unicode code points.
${isHybridMode
  ? '- Complex Shaping (GSUB/GPOS): This font patches user-drawn base outlines onto the authentic Noto Sans Kannada base engine. Base consonant and vowel appearances use your custom artwork; unedited subjoined forms (ottakshara) use the base font engine.'
  : '- Complex Shaping (GSUB/GPOS): This is an outline prototype font. It provides standard Unicode glyph mappings for design and visual testing. For full production Indic text layout (automatic below-base conjunct substitution and mark positioning), import these glyph outlines into an OpenType font mastering tool (such as FontForge, Glyphs, or fonttools).'}

--- HOW TO INSTALL ON WINDOWS ---
1. Right-click "${fontName}.ttf" and choose "Install" (or "Install for all users").
2. The font will appear in MS Word, Photoshop, Illustrator, Figma, Notepad, etc.

--- HOW TO INSTALL ON MACOS ---
1. Double-click "${fontName}.ttf".
2. Apple Font Book will open. Click "Install Font".

--- HOW TO INSTALL ON LINUX ---
1. Copy "${fontName}.ttf" to ~/.local/share/fonts/ (or /usr/share/fonts/).
2. Run "fc-cache -f -v" in your terminal.

--- HOW TO USE ON WEBSITES (CSS) ---
@font-face {
  font-family: '${metadata.name}';
  src: url('${fontName}.woff') format('woff'),
       url('${fontName}.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

body {
  font-family: '${metadata.name}', 'Anek Kannada', 'Noto Sans Kannada', sans-serif;
  text-rendering: optimizeLegibility;
}
`;
  zip.file('INSTALL_INSTRUCTIONS.txt', instructions);

  // 3. Interactive HTML Preview Tester
  const base64Font = arrayBufferToBase64(buffer);
  const sampleHtml = `<!DOCTYPE html>
<html lang="kn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.name} - Kannada Type Tester</title>
  <style>
    @font-face {
      font-family: 'CustomKannadaFont';
      src: url('data:font/ttf;base64,${base64Font}') format('truetype');
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 40px 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .custom-kannada {
      font-family: 'CustomKannadaFont', 'Anek Kannada', 'Noto Sans Kannada', sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #6366f1;
      margin-bottom: 6px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    textarea {
      width: 100%;
      height: 140px;
      padding: 18px;
      font-size: 32px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 14px;
      margin-top: 12px;
      box-sizing: border-box;
      outline: none;
      resize: vertical;
    }
    textarea:focus {
      border-color: #6366f1;
    }
    .specimen-row {
      border-bottom: 1px solid #334155;
      padding: 16px 0;
    }
    .specimen-label {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <h1>${metadata.name} - Kannada Type Tester</h1>
  <p>Mode: ${isHybridMode ? 'Hybrid Base Mode (Noto Sans Kannada)' : 'Standalone Prototype Mode'} • Unicode U+0C80..U+0CFF</p>

  <div class="card">
    <h2 style="font-size: 18px; margin-top: 0; color: #cbd5e1;">Interactive Typewriter</h2>
    <textarea class="custom-kannada" placeholder="ಕನ್ನಡದಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...">ಕನ್ನಡ ಲಿಪಿ ನುಡಿ • ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ! • ಅಕ್ಕ ಅತ್ತೆ ಅಣ್ಣ ಅಪ್ಪ ಅಮ್ಮ ವಿದ್ಯಾ ಸೂರ್ಯ ಕೃಷ್ಣ</textarea>
  </div>

  <div class="card">
    <h2 style="font-size: 18px; margin-top: 0; color: #cbd5e1;">Specimen Waterfall</h2>
    <div class="specimen-row">
      <div class="specimen-label">72px Display</div>
      <div class="custom-kannada" style="font-size: 72px; line-height: 1.25;">ಕನ್ನಡ ಲಿಪಿ ನುಡಿ</div>
    </div>
    <div class="specimen-row">
      <div class="specimen-label">48px Heading</div>
      <div class="custom-kannada" style="font-size: 48px; line-height: 1.3;">ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ!</div>
    </div>
    <div class="specimen-row">
      <div class="specimen-label">32px Subheading</div>
      <div class="custom-kannada" style="font-size: 32px; line-height: 1.35;">ಎಲ್ಲಾದರೂ ಇರು, ಎಂತಾದರೂ ಇರು, ಎಂದೆಂದಿಗೂ ನೀ ಕನ್ನಡವಾಗಿರು.</div>
    </div>
    <div class="specimen-row">
      <div class="specimen-label">24px Conjunct Test (ಒತ್ತಕ್ಷರಗಳು)</div>
      <div class="custom-kannada" style="font-size: 24px; line-height: 1.4;">ಅಕ್ಕ, ಅತ್ತೆ, ಅಣ್ಣ, ಅಪ್ಪ, ಅಮ್ಮ, ಶಕ್ತಿ, ವಿದ್ಯಾ, ಸೂರ್ಯ, ಕೃಷ್ಣ, ಪುಷ್ಪ, ಧನುಸ್ಸು, ರಾಷ್ಟ್ರ</div>
    </div>
    <div class="specimen-row" style="border: none;">
      <div class="specimen-label">18px Body Text</div>
      <div class="custom-kannada" style="font-size: 18px; line-height: 1.5;">ಕನ್ನಡವು ಭಾರತ ದೇಶದ ಪ್ರಮುಖ ದ್ರಾವಿಡ ಭಾಷೆಗಳಲ್ಲಿ ಒಂದಾಗಿದ್ದು, ಕರ್ನಾಟಕ ರಾಜ್ಯದ ಅಧಿಕೃತ ಭಾಷೆಯಾಗಿದೆ.</div>
    </div>
  </div>
</body>
</html>`;
  zip.file('sample-preview.html', sampleHtml);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${fontName}_Complete_Font_Package.zip`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
