import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore } from '../src/store/glyphStore';
import type { VectorPathData } from '../src/types/glyph';

describe('Phase 1: Per-Glyph Independent Undo / Redo System', () => {
  beforeEach(() => {
    useGlyphStore.getState().resetProject('Undo-Redo-Test');
  });

  it('keeps history stacks strictly independent between different glyphs', () => {
    const sA1: VectorPathData = { id: 'sa1', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    const sA2: VectorPathData = { id: 'sa2', pathString: 'M 10 10 L 20 20', strokeWidth: 16, strokeColor: '#000' };
    const sB1: VectorPathData = { id: 'sb1', pathString: 'M 50 50 L 60 60', strokeWidth: 16, strokeColor: '#000' };

    // Set 2 strokes on A
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([sA1]);
    useGlyphStore.getState().updateActiveGlyphPaths([sA1, sA2]);
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(3);

    // Switch to B and set 1 stroke
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    useGlyphStore.getState().updateActiveGlyphPaths([sB1]);
    expect(useGlyphStore.getState().glyphHistories['U+0C86'].stack.length).toBe(2);

    // Undo on B
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
    expect(useGlyphStore.getState().canUndo()).toBe(false);
    expect(useGlyphStore.getState().canRedo()).toBe(true);

    // Check A's history was untouched
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(3);
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].index).toBe(2);
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(2);

    // Switch back to A and undo on A
    useGlyphStore.getState().setActiveUnicode('U+0C85');
    expect(useGlyphStore.getState().canUndo()).toBe(true);
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);

    // Switch to B: redo on B
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    expect(useGlyphStore.getState().canRedo()).toBe(true);
    useGlyphStore.getState().redo();
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths[0].id).toBe('sb1');
  });

  it('truncates redo branch when a new edit is made after undo', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const s1: VectorPathData = { id: 's1', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    const s2: VectorPathData = { id: 's2', pathString: 'M 10 10 L 20 20', strokeWidth: 16, strokeColor: '#000' };
    const s3: VectorPathData = { id: 's3', pathString: 'M 20 20 L 30 30', strokeWidth: 16, strokeColor: '#000' };
    const sNew: VectorPathData = { id: 'sNew', pathString: 'M 99 99 L 100 100', strokeWidth: 16, strokeColor: '#000' };

    useGlyphStore.getState().updateActiveGlyphPaths([s1]);
    useGlyphStore.getState().updateActiveGlyphPaths([s1, s2]);
    useGlyphStore.getState().updateActiveGlyphPaths([s1, s2, s3]);
    // Stack: [], [s1], [s1, s2], [s1, s2, s3] -> index 3

    // Undo twice
    useGlyphStore.getState().undo(); // to [s1, s2]
    useGlyphStore.getState().undo(); // to [s1]
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths.length).toBe(1);
    expect(useGlyphStore.getState().canRedo()).toBe(true);

    // Make new edit
    useGlyphStore.getState().updateActiveGlyphPaths([s1, sNew]);

    // Redo branch must be cleared
    expect(useGlyphStore.getState().canRedo()).toBe(false);
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(3); // [], [s1], [s1, sNew]
    expect(useGlyphStore.getState().glyphs['U+0C85'].paths[1].id).toBe('sNew');
  });

  it('deduplicates identical path updates without pushing redundant stack frames', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const s1: VectorPathData = { id: 's1', pathString: 'M 0 0 L 10 10', strokeWidth: 16, strokeColor: '#000' };
    useGlyphStore.getState().updateActiveGlyphPaths([s1]);
    const initialStackLen = useGlyphStore.getState().glyphHistories['U+0C85'].stack.length;

    // Push identical paths
    useGlyphStore.getState().updateActiveGlyphPaths([{ ...s1 }]);
    expect(useGlyphStore.getState().glyphHistories['U+0C85'].stack.length).toBe(initialStackLen);
  });

  it('caps history stack at 50 entries and maintains valid bounds', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    for (let i = 0; i < 60; i++) {
      const stroke: VectorPathData = {
        id: `s_${i}`,
        pathString: `M ${i} ${i} L ${i + 10} ${i + 10}`,
        strokeWidth: 16,
        strokeColor: '#000',
      };
      useGlyphStore.getState().updateActiveGlyphPaths([stroke]);
    }

    const history = useGlyphStore.getState().glyphHistories['U+0C85'];
    expect(history.stack.length).toBe(50);
    expect(history.index).toBe(49);
    expect(useGlyphStore.getState().canUndo()).toBe(true);
    expect(useGlyphStore.getState().canRedo()).toBe(false);
  });

  it('ensures history snapshots are immutable and do not share references', () => {
    useGlyphStore.getState().setActiveUnicode('U+0C85');

    const stroke: VectorPathData = {
      id: 'immut',
      pathString: 'M 10 10 L 20 20',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().updateActiveGlyphPaths([stroke]);

    // Mutate the local object
    stroke.strokeWidth = 999;
    stroke.pathString = 'M 999 999';

    // Verify stored snapshot is unaffected
    const stored = useGlyphStore.getState().glyphs['U+0C85'].paths[0];
    expect(stored.strokeWidth).toBe(16);
    expect(stored.pathString).toBe('M 10 10 L 20 20');

    // Mutate paths in glyphs directly (if someone attempted to)
    const historyStack = useGlyphStore.getState().glyphHistories['U+0C85'].stack;
    const historySnapshot = historyStack[historyStack.length - 1][0];
    expect(historySnapshot.strokeWidth).toBe(16);
  });
});
