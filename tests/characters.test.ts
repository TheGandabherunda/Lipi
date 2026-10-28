import { describe, it, expect } from 'vitest';
import { KANNADA_CHARACTERS_LIST } from '../src/constants/kannadaCharacters';

describe('kannadaCharacters', () => {
  it('contains valid roster of Kannada characters', () => {
    expect(KANNADA_CHARACTERS_LIST.length).toBeGreaterThanOrEqual(78);
  });

  it('has valid Unicode format and advance widths for each character', () => {
    KANNADA_CHARACTERS_LIST.forEach((charDef) => {
      expect(charDef.unicode).toMatch(/^U\+[0-9A-F]{4}$/);
      expect(charDef.character).toBeTruthy();
      expect(charDef.defaultAdvanceWidth).toBeGreaterThan(0);
      expect(['swaragalu', 'vyanjanagalu', 'gunithakshara', 'numbers', 'yogavahagalu', 'modifiers']).toContain(charDef.category);
    });
  });
});
