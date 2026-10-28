import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore } from '../src/store/glyphStore';
import type { VectorPathData } from '../src/types/glyph';

describe('Glyph Clipboard & Cross-Letter Copy Paste', () => {
  beforeEach(() => {
    useGlyphStore.setState({
      activeUnicode: 'U+0C85', // 'ಅ'
      clipboard: null,
    });
  });

  it('copies strokes from active glyph to clipboard', () => {
    const mockStroke: VectorPathData = {
      id: 's1',
      pathString: 'M 100 100 L 200 200',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().updateActiveGlyphPaths([mockStroke]);
    useGlyphStore.getState().copyPaths();

    const clipboard = useGlyphStore.getState().clipboard;
    expect(clipboard).toBeTruthy();
    expect(clipboard?.paths.length).toBe(1);
    expect(clipboard?.sourceUnicode).toBe('U+0C85');
    expect(clipboard?.sourceCharacter).toBe('ಅ');
  });

  it('pastes strokes into another letter working canvas', () => {
    const mockStroke: VectorPathData = {
      id: 's1',
      pathString: 'M 100 100 L 200 200',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().updateActiveGlyphPaths([mockStroke]);
    useGlyphStore.getState().copyPaths();

    // Switch to 'ಆ' (U+0C86)
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().activeUnicode).toBe('U+0C86');

    // Paste into 'ಆ'
    const result = useGlyphStore.getState().pastePaths('U+0C86');
    expect(result).toBeTruthy();
    expect(result?.count).toBe(1);
    expect(result?.sourceChar).toBe('ಅ');
    expect(result?.targetChar).toBe('ಆ');

    const targetGlyph = useGlyphStore.getState().glyphs['U+0C86'];
    expect(targetGlyph.paths.length).toBe(1);
    expect(targetGlyph.isEdited).toBe(true);
  });

  it('copies glyph directly to target letter with copyGlyphToTarget', () => {
    const mockStroke: VectorPathData = {
      id: 's1',
      pathString: 'M 150 150 Q 200 250 300 300',
      strokeWidth: 20,
      strokeColor: '#4338ca',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C95'); // 'ಕ'
    useGlyphStore.getState().updateActiveGlyphPaths([mockStroke]);

    // Copy 'ಕ' directly to 'ಖ'
    useGlyphStore.getState().copyGlyphToTarget('U+0C95', 'U+0C96');

    const targetGlyph = useGlyphStore.getState().glyphs['U+0C96'];
    expect(targetGlyph.paths.length).toBe(1);
    expect(targetGlyph.isEdited).toBe(true);
  });
});
