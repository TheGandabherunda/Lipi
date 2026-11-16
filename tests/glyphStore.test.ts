import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore, DEFAULT_METRICS } from '../src/store/glyphStore';
import type { VectorPathData } from '../src/types/glyph';

describe('Glyph State System & Per-Glyph History', () => {
  beforeEach(() => {
    useGlyphStore.getState().resetProject('Test-Font');
  });

  it('persists path edits per glyph and maintains separate undo/redo history when switching glyphs', () => {
    const strokeA: VectorPathData = {
      id: 'stroke_A_1',
      pathString: 'M 100 100 L 200 200',
      strokeWidth: 16,
      strokeColor: '#0f172a',
    };

    const strokeB: VectorPathData = {
      id: 'stroke_B_1',
      pathString: 'M 300 300 Q 400 350 500 300',
      strokeWidth: 20,
      strokeColor: '#4338ca',
    };

    // 1. Draw on 'U+0C85' (ಅ)
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([strokeA]);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    expect(useGlyphStore.getState().canUndo('U+0C85')).toBe(true);

    // 2. Switch to 'U+0C86' (ಆ) and draw strokeB
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
    expect(useGlyphStore.getState().canUndo('U+0C86')).toBe(false);

    useGlyphStore.getState().updateActiveGlyphPaths([strokeB]);
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().canUndo('U+0C86')).toBe(true);

    // 3. Switch back to 'U+0C85' (ಅ)
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    // History must NOT have been wiped! Can still undo on 'U+0C85'
    expect(useGlyphStore.getState().canUndo('U+0C85')).toBe(true);
    expect(useGlyphStore.getState().canUndo()).toBe(true);

    // 4. Undo on 'U+0C85'
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(0);
    expect(useGlyphStore.getState().canUndo('U+0C85')).toBe(false);
    expect(useGlyphStore.getState().canRedo('U+0C85')).toBe(true);

    // 5. Verify 'U+0C86' was completely unaffected by 'U+0C85' undo
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().canUndo('U+0C86')).toBe(true);

    // 6. Redo on 'U+0C85'
    useGlyphStore.getState().redo();
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
  });

  it('deep-clones path objects so external mutations do not contaminate store state', () => {
    const stroke: VectorPathData = {
      id: 'stroke_orig',
      pathString: 'M 10 10 L 20 20',
      strokeWidth: 16,
      strokeColor: '#123456',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([stroke]);

    // Mutate local object
    stroke.pathString = 'M 999 999';
    stroke.strokeWidth = 999;

    const storedStroke = useGlyphStore.getState().glyphs['U+0C85'].paths[0];
    expect(storedStroke.pathString).toBe('M 10 10 L 20 20');
    expect(storedStroke.strokeWidth).toBe(16);
  });

  it('safely switches weight profiles without corrupting glyphs or metadata', () => {
    const regularStroke: VectorPathData = {
      id: 'stroke_reg',
      pathString: 'M 50 50 L 150 150',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([regularStroke]);

    // Switch to Bold (700)
    useGlyphStore.getState().updateMetadata({ weightClass: 700, weightName: 'Bold' });
    expect(useGlyphStore.getState().metadata.weightClass).toBe(700);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(0);

    const boldStroke: VectorPathData = {
      id: 'stroke_bold',
      pathString: 'M 50 50 L 150 150',
      strokeWidth: 32,
      strokeColor: '#000',
    };
    useGlyphStore.getState().updateActiveGlyphPaths([boldStroke]);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[0].strokeWidth).toBe(32);

    // Switch back to Regular (400)
    useGlyphStore.getState().updateMetadata({ weightClass: 400, weightName: 'Regular' });
    expect(useGlyphStore.getState().metadata.weightClass).toBe(400);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[0].strokeWidth).toBe(16);
  });

  it('performs full round-trip serialization and loading without losing data', () => {
    const stroke: VectorPathData = {
      id: 'stroke_persist',
      pathString: 'M 100 200 C 150 250 200 250 250 200',
      strokeWidth: 18,
      strokeColor: '#2563eb',
    };

    useGlyphStore.getState().updateMetadata({
      name: 'CustomKannadaType',
      author: 'Master Typographer',
      metrics: {
        ...DEFAULT_METRICS,
        ascender: 820,
        descender: -430,
        mahaprana: -150,
      },
    });

    useGlyphStore.getState().setActiveUnicode('U+0C95'); // 'ಕ'
    useGlyphStore.getState().updateActiveGlyphPaths([stroke]);
    useGlyphStore.getState().updateAdvanceWidth('U+0C95', 650);

    const json = useGlyphStore.getState().serializeLipiProject();
    expect(json).toBeTruthy();

    // Reset project to blank
    useGlyphStore.getState().resetProject('Blank');
    expect(useGlyphStore.getState().metadata.name).toBe('Blank');
    expect(useGlyphStore.getState().glyphs['U+0C95'].paths.length).toBe(0);

    // Load back from JSON
    const loadResult = useGlyphStore.getState().loadLipiFileContent(json);
    expect(loadResult.success).toBe(true);

    const reloaded = useGlyphStore.getState();
    expect(reloaded.metadata.name).toBe('CustomKannadaType');
    expect(reloaded.metadata.author).toBe('Master Typographer');
    expect(reloaded.metadata.metrics.ascender).toBe(820);
    expect(reloaded.metadata.metrics.descender).toBe(-430);
    expect(reloaded.metadata.metrics.mahaprana).toBe(-150);

    const loadedGlyph = reloaded.glyphs['U+0C95'];
    expect(loadedGlyph.paths.length).toBe(1);
    expect(loadedGlyph.paths[0].pathString).toBe('M 100 200 C 150 250 200 250 250 200');
    expect(loadedGlyph.advanceWidth).toBe(650);
  });

  it('rejects invalid or corrupted .lipi files with a clear error message', () => {
    const result1 = useGlyphStore.getState().loadLipiFileContent('not a json');
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('Failed to parse');

    const result2 = useGlyphStore.getState().loadLipiFileContent(JSON.stringify({ format: 'WRONG' }));
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Not a recognized');

    const result3 = useGlyphStore.getState().loadLipiFileContent(JSON.stringify({ format: 'LIPI_PROJECT' }));
    expect(result3.success).toBe(false);
    expect(result3.error).toContain('Missing glyphs');
  });
});
