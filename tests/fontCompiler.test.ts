import { describe, it, expect } from 'vitest';
import { compileFontStandalone } from '../src/utils/fontCompiler';
import type { LipiProjectMetadata } from '../src/types/lipiFormat';
import type { GlyphData } from '../src/types/glyph';

const mockMetadata: LipiProjectMetadata = {
  name: 'TestFont',
  version: '1.0.0',
  metrics: {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
  },
};

const mockGlyphs: Record<string, GlyphData> = {
  'U+0C85': {
    unicode: 'U+0C85',
    character: 'ಅ',
    name: 'KANNADA LETTER A',
    category: 'swaragalu',
    advanceWidth: 800,
    isEdited: true,
    paths: [
      {
        id: 'p1',
        pathString: 'M 100 100 L 200 200 L 100 200 Z',
        strokeWidth: 10,
        strokeColor: '#000000',
      },
    ],
  },
};

describe('fontCompiler Latin Mapping', () => {
  it('maps custom Kannada glyphs to Latin keys when mapLatinKeys is true', () => {
    const font = compileFontStandalone(mockMetadata, mockGlyphs, {}, { mapLatinKeys: true });
    expect(font).toBeTruthy();

    const glyphA = font.charToGlyph('a');
    expect(glyphA).toBeTruthy();
    expect(glyphA.name).toBe('uni0C85');

    const glyphKannada = font.charToGlyph('ಅ');
    expect(glyphKannada).toBeTruthy();
    expect(glyphKannada.name).toBe('uni0C85');
  });

  it('keeps standard Unicode mapping only when mapLatinKeys is false', () => {
    const font = compileFontStandalone(mockMetadata, mockGlyphs, {}, { mapLatinKeys: false });
    expect(font).toBeTruthy();

    const glyphKannada = font.charToGlyph('ಅ');
    expect(glyphKannada).toBeTruthy();
    expect(glyphKannada.name).toBe('uni0C85');

    // 'a' should not map to uni0C85
    const glyphA = font.charToGlyph('a');
    expect(glyphA.name).not.toBe('uni0C85');
  });
});

