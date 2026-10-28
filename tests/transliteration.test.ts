import { describe, it, expect } from 'vitest';
import { transliterateEnglishToKannada } from '../src/utils/kannadaTransliteration';

describe('kannadaTransliteration', () => {
  it('transliterates vowels correctly', () => {
    expect(transliterateEnglishToKannada('a')).toBe('ಅ');
    expect(transliterateEnglishToKannada('aa')).toBe('ಆ');
    expect(transliterateEnglishToKannada('i')).toBe('ಇ');
    expect(transliterateEnglishToKannada('ee')).toBe('ಈ');
    expect(transliterateEnglishToKannada('u')).toBe('ಉ');
    expect(transliterateEnglishToKannada('oo')).toBe('ಊ');
  });

  it('transliterates consonants and syllables correctly', () => {
    expect(transliterateEnglishToKannada('ka')).toBe('ಕ');
    expect(transliterateEnglishToKannada('kaa')).toBe('ಕಾ');
    expect(transliterateEnglishToKannada('ki')).toBe('ಕಿ');
    expect(transliterateEnglishToKannada('kee')).toBe('ಕೀ');
    expect(transliterateEnglishToKannada('ku')).toBe('ಕು');
    expect(transliterateEnglishToKannada('koo')).toBe('ಕೂ');
  });

  it('preserves whitespace and numbers', () => {
    expect(transliterateEnglishToKannada('namaste 123')).toBe('ನಮಸ್ತೆ 123');
  });
});
