import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore, pathsAreEqual } from '../src/store/glyphStore';
import type { VectorPathData } from '../src/types/glyph';

describe('Phase 1: Safe Glyph Switching & Persistence', () => {
  beforeEach(() => {
    useGlyphStore.getState().resetProject('Switching-Test');
  });

  it('preserves pending edits and history when switching between multiple glyphs', () => {
    const strokeA1: VectorPathData = {
      id: 'a1',
      pathString: 'M 100 100 L 200 200',
      strokeWidth: 16,
      strokeColor: '#0f172a',
    };
    const strokeA2: VectorPathData = {
      id: 'a2',
      pathString: 'M 200 200 Q 250 300 300 200',
      strokeWidth: 16,
      strokeColor: '#0f172a',
    };
    const strokeB1: VectorPathData = {
      id: 'b1',
      pathString: 'M 50 50 L 150 50',
      strokeWidth: 20,
      strokeColor: '#4338ca',
    };
    const strokeC1: VectorPathData = {
      id: 'c1',
      pathString: 'M 300 300 C 350 400 400 400 450 300',
      strokeWidth: 24,
      strokeColor: '#e11d48',
    };

    // 1. Start on Glyph A (U+0C85: ಅ)
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([strokeA1]);
    useGlyphStore.getState().updateActiveGlyphPaths([strokeA1, strokeA2]);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(2);
    expect(useGlyphStore.getState().canUndo('U+0C85')).toBe(true);

    // 2. Switch to Glyph B (U+0C86: ಆ) and add a stroke
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
    expect(useGlyphStore.getState().canUndo('U+0C86')).toBe(false);

    useGlyphStore.getState().updateActiveGlyphPaths([strokeB1]);
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);

    // 3. Switch to Glyph C (U+0C95: ಕ) and add a stroke
    useGlyphStore.getState().setActiveUnicode('U+0C95');
    expect(useGlyphStore.getState().glyphs['U+0C95'].paths.length).toBe(0);

    useGlyphStore.getState().updateActiveGlyphPaths([strokeC1]);
    expect(useGlyphStore.getState().glyphs['U+0C95'].paths.length).toBe(1);

    // 4. Return to Glyph A (U+0C85)
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    const glyphA = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyphA.paths.length).toBe(2);
    expect(glyphA.paths[0].pathString).toBe(strokeA1.pathString);
    expect(glyphA.paths[1].pathString).toBe(strokeA2.pathString);

    // Undo on Glyph A
    expect(useGlyphStore.getState().canUndo()).toBe(true);
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[0].id).toBe('a1');

    // 5. Return to Glyph B (U+0C86)
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    const glyphB = useGlyphStore.getState().glyphs['U+0C86'];
    expect(glyphB.paths.length).toBe(1);
    expect(glyphB.paths[0].pathString).toBe(strokeB1.pathString);

    // 6. Return to Glyph C (U+0C95)
    useGlyphStore.getState().setActiveUnicode('U+0C95');
    const glyphC = useGlyphStore.getState().glyphs['U+0C95'];
    expect(glyphC.paths.length).toBe(1);
    expect(glyphC.paths[0].pathString).toBe(strokeC1.pathString);
  });

  it('updateGlyphPaths safely updates another glyph and records its history without switching activeUnicode', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const targetStroke: VectorPathData = {
      id: 'target_stroke',
      pathString: 'M 10 10 L 20 20',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    // Update U+0C86 while activeUnicode is U+0C85
    useGlyphStore.getState().updateGlyphPaths('U+0C86', [targetStroke], true);

    // Active glyph should still be U+0C85 and have 0 paths
    expect(useGlyphStore.getState().activeUnicode).toBe('U+0C85');
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(0);

    // Target glyph U+0C86 should have the stroke and its own undo entry
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphHistories['U+0C86'].stack.length).toBe(2);

    // Switching to U+0C86 activates its history
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().canUndo()).toBe(true);
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
  });

  it('pathsAreEqual correctly determines path equivalence', () => {
    const p1: VectorPathData = { id: '1', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    const p2: VectorPathData = { id: '2', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    const p3: VectorPathData = { id: '1', pathString: 'M 0 0 L 20 20', strokeWidth: 16, strokeColor: '#000' };

    // Same geometry and attributes even if IDs differ
    expect(pathsAreEqual([p1], [p2])).toBe(true);
    // Different path geometry
    expect(pathsAreEqual([p1], [p3])).toBe(false);
    // Empty vs empty
    expect(pathsAreEqual([], [])).toBe(true);
    // Undefined
    expect(pathsAreEqual(undefined, undefined)).toBe(true);
    expect(pathsAreEqual([p1], undefined)).toBe(false);
  });
});
