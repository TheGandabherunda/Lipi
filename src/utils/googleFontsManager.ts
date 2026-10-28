import opentype from 'opentype.js';
import type { FontMetrics } from '../types/lipiFormat';
import type { VectorGlyphOutline } from '../constants/kannadaVectorOutlines';
import { KANNADA_CHARACTERS_LIST } from '../constants/kannadaCharacters';

export interface KannadaGoogleFontDef {
  id: string;
  name: string;
  designer: string;
  styleDescription: string;
  fileName: string;
  defaultMetrics: FontMetrics;
}

export const KANNADA_GOOGLE_FONTS: KannadaGoogleFontDef[] = [
  {
    id: 'noto-sans-kannada',
    name: 'Noto Sans Kannada',
    designer: 'Google & Monotype',
    styleDescription: 'Modern, high-legibility versatile sans-serif',
    fileName: 'NotoSansKannada.ttf',
    defaultMetrics: {
      unitsPerEm: 1000,
      ascender: 809,
      capHeight: 690,
      baseline: 0,
      descender: -540,
    },
  },
  {
    id: 'anek-kannada',
    name: 'Anek Kannada',
    designer: 'Ek Type',
    styleDescription: 'Contemporary, geometric multi-weight typeface',
    fileName: 'AnekKannada.ttf',
    defaultMetrics: {
      unitsPerEm: 2000,
      ascender: 2030,
      capHeight: 1278,
      baseline: 0,
      descender: -1310,
    },
  },
  {
    id: 'tiro-kannada',
    name: 'Tiro Kannada',
    designer: 'Tiro Typeworks',
    styleDescription: 'Classical literary serif with calligraphic ductus',
    fileName: 'TiroKannada.ttf',
    defaultMetrics: {
      unitsPerEm: 1000,
      ascender: 755,
      capHeight: 699,
      baseline: 0,
      descender: -245,
    },
  },
  {
    id: 'baloo-tamma-2',
    name: 'Baloo Tamma 2',
    designer: 'Ek Type',
    styleDescription: 'Friendly, rounded display font with warm personality',
    fileName: 'BalooTamma2.ttf',
    defaultMetrics: {
      unitsPerEm: 1000,
      ascender: 1078,
      capHeight: 602,
      baseline: 0,
      descender: -673,
    },
  },
  {
    id: 'hubballi',
    name: 'Hubballi',
    designer: 'Erin McLaughlin',
    styleDescription: 'Monolinear geometric rounded font with distinct charm',
    fileName: 'Hubballi.ttf',
    defaultMetrics: {
      unitsPerEm: 1000,
      ascender: 765,
      capHeight: 535,
      baseline: 0,
      descender: -191,
    },
  },
];

// In-memory cache for parsed opentype fonts and raw ArrayBuffers
const parsedFontCache = new Map<string, opentype.Font>();
const rawFontBufferCache = new Map<string, ArrayBuffer>();

/**
 * Retrieves the raw font ArrayBuffer for font patching & compilation
 */
export async function getBaseFontBuffer(fontId: string = 'noto-sans-kannada'): Promise<ArrayBuffer> {
  const fontDef =
    KANNADA_GOOGLE_FONTS.find((f) => f.id === fontId) || KANNADA_GOOGLE_FONTS[0];

  if (rawFontBufferCache.has(fontDef.id)) {
    return rawFontBufferCache.get(fontDef.id)!;
  }

  const response = await fetch(`/fonts/${fontDef.fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load font file: /fonts/${fontDef.fileName}`);
  }

  const buffer = await response.arrayBuffer();
  rawFontBufferCache.set(fontDef.id, buffer);
  return buffer;
}

/**
 * Returns cached font ArrayBuffer synchronously if already fetched
 */
export function getCachedFontBuffer(fontId: string = 'noto-sans-kannada'): ArrayBuffer | null {
  const fontDef =
    KANNADA_GOOGLE_FONTS.find((f) => f.id === fontId) || KANNADA_GOOGLE_FONTS[0];
  return rawFontBufferCache.get(fontDef.id) || null;
}

// Automatically start prefetching default font in browser environments
if (typeof window !== 'undefined') {
  getBaseFontBuffer('noto-sans-kannada').catch(() => {
    // Silently continue if network/offline
  });
}

/**
 * Loads and parses a Kannada font binary via opentype.js
 */
export async function loadParsedFont(fontDef: KannadaGoogleFontDef): Promise<opentype.Font> {
  if (parsedFontCache.has(fontDef.id)) {
    return parsedFontCache.get(fontDef.id)!;
  }

  const arrayBuffer = await getBaseFontBuffer(fontDef.id);
  const font = opentype.parse(arrayBuffer.slice(0));
  parsedFontCache.set(fontDef.id, font);
  return font;
}

/**
 * Extracts vector outlines and metrics for all Kannada characters from an opentype.Font instance
 */
export function extractOutlinesFromFont(
  font: opentype.Font
): {
  metrics: FontMetrics;
  outlines: Record<string, VectorGlyphOutline>;
} {
  const upm = font.unitsPerEm || 1000;
  const ascender = font.ascender || 810;
  const descender = font.descender || -420;
  const capHeight = font.tables.os2?.sCapHeight || Math.round(ascender * 0.75);

  const metrics: FontMetrics = {
    unitsPerEm: upm,
    ascender,
    capHeight,
    baseline: 0,
    descender,
  };

  const outlines: Record<string, VectorGlyphOutline> = {};

  KANNADA_CHARACTERS_LIST.forEach((item) => {
    try {
      const glyph = font.charToGlyph(item.character);
      if (glyph && glyph.unicode !== undefined) {
        const bbox = glyph.getBoundingBox();
        const path = glyph.getPath(0, 0, upm);
        outlines[item.unicode] = {
          character: item.character,
          advanceWidth: glyph.advanceWidth || Math.round(upm * 0.7),
          bbox: {
            x1: Math.round(bbox.x1),
            y1: Math.round(bbox.y1),
            x2: Math.round(bbox.x2),
            y2: Math.round(bbox.y2),
          },
          svgPath: path.toPathData(1),
        };
      }
    } catch {
      // Continue if specific glyph is missing
    }
  });

  return { metrics, outlines };
}
