import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore } from '../src/store/glyphStore';
import { isTypingInInputElement } from '../src/utils/keyboardUtils';
import type { VectorPathData } from '../src/types/glyph';

describe('Phase 1: Clipboard Operations & Input Element Protection', () => {
  beforeEach(() => {
    useGlyphStore.getState().resetProject('Clipboard-Test');
  });

  it('guarantees copied and pasted paths are independent deep clones', () => {
    const originalStroke: VectorPathData = {
      id: 'orig_1',
      pathString: 'M 10 10 L 100 100',
      strokeWidth: 16,
      strokeColor: '#000000',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([originalStroke]);
    useGlyphStore.getState().copyPaths();

    // Paste into U+0C86
    const res = useGlyphStore.getState().pastePaths('U+0C86');
    expect(res).not.toBeNull();

    const pasted = useGlyphStore.getState().glyphs['U+0C86'].paths[0];
    expect(pasted).toBeDefined();
    // Unique ID assigned
    expect(pasted.id).not.toBe(originalStroke.id);

    // Mutating pasted stroke does not affect source stroke
    pasted.strokeWidth = 999;
    const sourceStroke = useGlyphStore.getState().glyphs['U+0C85'].paths[0];
    expect(sourceStroke.strokeWidth).toBe(16);
  });

  it('applies offset correctly when pasting into the same glyph vs different glyph', () => {
    const stroke: VectorPathData = {
      id: 's_offset',
      pathString: 'M 0 0 L 10 10',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([stroke]);
    useGlyphStore.getState().copyPaths();

    // Paste into same glyph: should offset by default (+20)
    useGlyphStore.getState().pastePaths('U+0C85');
    const sameGlyphPaths = useGlyphStore.getState().glyphs['U+0C85'].paths;
    expect(sameGlyphPaths.length).toBe(2);
    expect(sameGlyphPaths[1].pathString).toContain('20');

    // Paste into different glyph with custom offset {x: 0, y: 0}
    useGlyphStore.getState().pastePaths('U+0C86', { x: 0, y: 0 });
    const diffGlyphPaths = useGlyphStore.getState().glyphs['U+0C86'].paths;
    expect(diffGlyphPaths.length).toBe(1);
    expect(diffGlyphPaths[0].pathString).toBe('M 0 0 L 10 10');
  });

  it('updates undo history for the target glyph when pasting', () => {
    const stroke: VectorPathData = {
      id: 's_hist',
      pathString: 'M 50 50 L 100 100',
      strokeWidth: 16,
      strokeColor: '#000',
    };

    useGlyphStore.getState().setActiveUnicode('U+0C85');
    useGlyphStore.getState().updateActiveGlyphPaths([stroke]);
    useGlyphStore.getState().copyPaths();

    // Paste into U+0C86
    useGlyphStore.getState().setActiveUnicode('U+0C86');
    useGlyphStore.getState().pastePaths('U+0C86');
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(1);
    expect(useGlyphStore.getState().canUndo('U+0C86')).toBe(true);

    // Undo paste on target glyph
    useGlyphStore.getState().undo();
    expect(useGlyphStore.getState().glyphs['U+0C86'].paths.length).toBe(0);
  });

  it('isTypingInInputElement correctly detects text inputs, textareas, selects, and contentEditable elements', () => {
    // Standard input
    const inputEvent = { target: { tagName: 'INPUT' } } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(inputEvent)).toBe(true);

    // Textarea
    const textareaEvent = { target: { tagName: 'TEXTAREA' } } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(textareaEvent)).toBe(true);

    // Select
    const selectEvent = { target: { tagName: 'SELECT' } } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(selectEvent)).toBe(true);

    // contentEditable element
    const editableEvent = { target: { tagName: 'DIV', isContentEditable: true } } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(editableEvent)).toBe(true);

    // ARIA textbox role
    const ariaEvent = {
      target: {
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'role' ? 'textbox' : null),
      },
    } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(ariaEvent)).toBe(true);

    // ARIA combobox role
    const comboboxEvent = {
      target: {
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'role' ? 'combobox' : null),
      },
    } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(comboboxEvent)).toBe(true);

    // Regular non-input canvas or div element
    const normalEvent = {
      target: {
        tagName: 'CANVAS',
        isContentEditable: false,
        getAttribute: () => null,
      },
    } as unknown as KeyboardEvent;
    expect(isTypingInInputElement(normalEvent)).toBe(false);

    // Event with null or undefined target
    expect(isTypingInInputElement({} as unknown as KeyboardEvent)).toBe(false);
  });
});
