import opentype from 'opentype.js';
import { extractOutlinesFromFont } from './googleFontsManager';
import type { FontMetrics } from '../types/lipiFormat';
import type { VectorGlyphOutline } from '../constants/kannadaVectorOutlines';

export interface ImportedFontResult {
  success: boolean;
  fontName: string;
  metrics: FontMetrics;
  outlines: Record<string, VectorGlyphOutline>;
  extractedGlyphsCount: number;
  error?: string;
}

/**
 * Parses any user-uploaded font file (.ttf, .otf, .woff) in the browser
 */
export async function parseUserFontFile(file: File): Promise<ImportedFontResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const font = opentype.parse(arrayBuffer);

    const familyName =
      font.getEnglishName('fontFamily') ||
      (font.names.fontFamily as any)?.en ||
      file.name.replace(/\.[^/.]+$/, '');

    const { metrics, outlines } = extractOutlinesFromFont(font);
    const count = Object.keys(outlines).length;

    if (count === 0) {
      return {
        success: false,
        fontName: familyName,
        metrics,
        outlines: {},
        extractedGlyphsCount: 0,
        error: `Font "${familyName}" was loaded, but contains 0 Kannada Unicode glyphs (U+0C80–U+0CFF). A font containing Kannada script is required for reference outlines.`,
      };
    }

    return {
      success: true,
      fontName: familyName,
      metrics,
      outlines,
      extractedGlyphsCount: count,
    };
  } catch (err) {
    return {
      success: false,
      fontName: file.name,
      metrics: {
        unitsPerEm: 1000,
        ascender: 810,
        capHeight: 600,
        baseline: 0,
        descender: -420,
      },
      outlines: {},
      extractedGlyphsCount: 0,
      error: err instanceof Error ? err.message : 'Failed to parse font file binary.',
    };
  }
}
