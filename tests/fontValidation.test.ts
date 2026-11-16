import { describe, it, expect } from 'vitest';
import { compileFontStandalone, validateCompiledFont } from '../src/utils/fontCompiler';
import type { LipiProjectMetadata } from '../src/types/lipiFormat';
import type { GlyphData } from '../src/types/glyph';

describe('Font Validation Pipeline', () => {
  const mockMetadata: LipiProjectMetadata = {
    name: 'ValidationTestFont',
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

  it('validates a properly compiled font buffer successfully', () => {
    const font = compileFontStandalone(mockMetadata, mockGlyphs, {}, { mapLatinKeys: false });
    const buffer = font.toArrayBuffer();

    const result = validateCompiledFont(buffer);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty or too small buffer (< 500 bytes)', () => {
    const emptyBuffer = new ArrayBuffer(100);
    const result = validateCompiledFont(emptyBuffer);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('under 500 bytes'))).toBe(true);
  });

  it('rejects corrupted binary data that fails opentype parsing', () => {
    const corruptedBuffer = new Uint8Array(2048);
    // Fill with random garbage
    for (let i = 0; i < corruptedBuffer.length; i++) {
      corruptedBuffer[i] = (i * 37 + 13) % 256;
    }

    const result = validateCompiledFont(corruptedBuffer.buffer);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Failed to parse compiled font binary'))).toBe(true);
  });

  it('rejects standalone prototype fonts when requireShapingTables is true without GSUB', () => {
    const font = compileFontStandalone(mockMetadata, mockGlyphs, {}, { mapLatinKeys: false });
    const buffer = font.toArrayBuffer();

    // Standalone prototype mode has no GSUB shaping tables
    const result = validateCompiledFont(buffer, { requireShapingTables: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('GSUB'))).toBe(true);
  });

  it('detects genuine OTTO OpenType CFF format from compiled buffer', () => {
    const font = compileFontStandalone(mockMetadata, mockGlyphs, {}, { mapLatinKeys: false });
    const buffer = font.toArrayBuffer();

    const u8 = new Uint8Array(buffer.slice(0, 4));
    const magic = String.fromCharCode(...u8);
    expect(magic).toBe('OTTO');
  });
});
