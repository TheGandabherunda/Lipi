import { describe, it, expect } from 'vitest';
import { compileFontStandalone } from '../src/utils/fontCompiler';
import { KANNADA_CHARACTERS_LIST } from '../src/constants/kannadaCharacters';
import type { LipiProjectMetadata } from '../src/types/lipiFormat';
import type { GlyphData } from '../src/types/glyph';

describe('Kannada Export and Unicode Mapping Honesty', () => {
  const metadata: LipiProjectMetadata = {
    name: 'KannadaStudioTest',
    version: '1.0.0',
    metrics: {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      capHeight: 700,
      xHeight: 500,
      mahaprana: 950,
      leftSideBearing: 50,
      rightSideBearing: 50,
    },
  };

  // Build a test set of key Kannada characters
  const testChars = [
    'U+0C85', // ಅ (Svara A)
    'U+0C86', // ಆ (Svara AA)
    'U+0C95', // ಕ (Vyanjana KA)
    'U+0CAE', // ಮ (Vyanjana MA)
    'U+0CB3', // ಳ (Vyanjana LLA)
    'U+0CBF', // ಿ (Vowel sign I)
    'U+0CCD', // ್ (Virama)
    'U+0CE6', // ೦ (Digit 0)
  ];

  const glyphs: Record<string, GlyphData> = {};
  for (const code of testChars) {
    const meta = KANNADA_CHARACTERS_LIST.find((c) => c.unicode === code);
    glyphs[code] = {
      unicode: code,
      character: meta?.character || '',
      name: meta?.name || '',
      category: meta?.category || 'vyanjanagalu',
      advanceWidth: 800,
      isEdited: true,
      paths: [
        {
          id: `p-${code}`,
          pathString: 'M 100 200 L 300 200 L 200 400 Z',
          strokeWidth: 10,
          strokeColor: '#000000',
        },
      ],
    };
  }

  it('compiles standalone outline font with accurate Unicode mappings for Kannada characters', () => {
    const font = compileFontStandalone(metadata, glyphs, {}, { mapLatinKeys: false });
    expect(font).toBeTruthy();

    for (const code of testChars) {
      const char = glyphs[code].character;
      const glyph = font.charToGlyph(char);
      expect(glyph).toBeTruthy();
      expect(glyph.name).toBe(`uni${code.replace('U+', '')}`);
      expect(glyph.unicodes).toContain(parseInt(code.replace('U+', ''), 16));
    }
  });

  it('keeps Latin mappings strictly optional for preview convenience', () => {
    const fontNoLatin = compileFontStandalone(metadata, glyphs, {}, { mapLatinKeys: false });
    const fontWithLatin = compileFontStandalone(metadata, glyphs, {}, { mapLatinKeys: true });

    // Without Latin keys, 'k' should NOT map to Kannada 'ಕ'
    const glyphKNoLatin = fontNoLatin.charToGlyph('k');
    expect(glyphKNoLatin.name).not.toBe('uni0C95');

    // With Latin keys enabled for preview, 'k' maps to uni0C95
    const glyphKWithLatin = fontWithLatin.charToGlyph('k');
    expect(glyphKWithLatin.name).toBe('uni0C95');
  });

  it('does not invent fake GSUB tables in standalone outline mode', () => {
    const font = compileFontStandalone(metadata, glyphs, {}, { mapLatinKeys: false });
    // In standalone outline prototype mode, font is a clean outline font
    // opentype.Font tables should not have fabricated unvalidated GSUB shaping
    expect(font.tables.gsub).toBeUndefined();
  });
});
