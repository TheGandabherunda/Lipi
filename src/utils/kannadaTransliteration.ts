/**
 * Authentic Kannada Phonetic (Baraha / ITRANS) Transliteration Utility
 * Enables instant English-to-Kannada typing directly on any standard physical keyboard.
 */

const INDEPENDENT_VOWELS: [string, string][] = [
  ['aa', 'ಆ'], ['AA', 'ಆ'], ['A', 'ಆ'], ['a', 'ಅ'],
  ['ee', 'ಈ'], ['ii', 'ಈ'], ['I', 'ಈ'], ['i', 'ಇ'],
  ['oo', 'ಊ'], ['uu', 'ಊ'], ['U', 'ಊ'], ['u', 'ಉ'],
  ['Ru', 'ಋ'], ['RU', 'ಋ'],
  ['ai', 'ಐ'], ['EE', 'ಏ'], ['E', 'ಏ'], ['e', 'ಎ'],
  ['au', 'ಔ'], ['ou', 'ಔ'], ['OO', 'ಓ'], ['O', 'ಓ'], ['o', 'ಒ'],
  ['am', 'ಅಂ'], ['aha', 'ಅಃ']
];

const CONSONANTS: [string, string][] = [
  ['kh', 'ಖ'], ['gh', 'ಘ'], ['chh', 'ಛ'], ['ch', 'ಚ'], ['jh', 'ಝ'],
  ['Th', 'ಠ'], ['Dh', 'ಢ'], ['th', 'ಥ'], ['dh', 'ಧ'],
  ['ph', 'ಫ'], ['bh', 'ಭ'], ['sh', 'ಶ'], ['Sh', 'ಷ'],
  ['k', 'ಕ'], ['g', 'ಗ'], ['j', 'ಜ'],
  ['T', 'ಟ'], ['D', 'ಡ'], ['N', 'ಣ'],
  ['t', 'ತ'], ['d', 'ದ'], ['n', 'ನ'],
  ['p', 'ಪ'], ['f', 'ಫ'], ['b', 'ಬ'], ['m', 'ಮ'],
  ['y', 'ಯ'], ['r', 'ರ'], ['l', 'ಲ'], ['v', 'ವ'], ['w', 'ವ'],
  ['s', 'ಸ'], ['h', 'ಹ'], ['L', 'ಳ']
];

const MATRAS: [string, string][] = [
  ['aa', 'ಾ'], ['AA', 'ಾ'], ['A', 'ಾ'],
  ['ee', 'ೀ'], ['ii', 'ೀ'], ['I', 'ೀ'],
  ['i', 'ಿ'],
  ['oo', 'ೂ'], ['uu', 'ೂ'], ['U', 'ೂ'],
  ['u', 'ು'],
  ['Ru', 'ೃ'], ['RU', 'ೃ'],
  ['ai', 'ೈ'], ['E', 'ೇ'], ['e', 'ೆ'],
  ['au', 'ೌ'], ['ou', 'ೌ'], ['O', 'ೋ'], ['o', 'ೊ'],
  ['M', 'ಂ'], ['H', 'ಃ'],
  ['a', '']
];

export function transliterateEnglishToKannada(input: string): string {
  let output = '';
  let i = 0;
  const n = input.length;

  while (i < n) {
    // 1. Non-alphabetic characters (spaces, punctuation, symbols, newlines)
    if (!/[a-zA-Z]/.test(input[i])) {
      output += input[i];
      i++;
      continue;
    }

    // 2. Check if this is a consonant at position i
    let matchedConsonant: string | null = null;
    let consLen = 0;
    for (const [key, val] of CONSONANTS) {
      if (input.slice(i, i + key.length) === key) {
        matchedConsonant = val;
        consLen = key.length;
        break;
      }
    }

    if (matchedConsonant) {
      i += consLen;
      // Check for attached vowel (matra)
      let matchedMatra: string | null = null;
      let matraLen = 0;

      for (const [key, val] of MATRAS) {
        if (input.slice(i, i + key.length) === key) {
          matchedMatra = val;
          matraLen = key.length;
          break;
        }
      }

      if (matchedMatra !== null) {
        i += matraLen;
        output += matchedConsonant + matchedMatra;
      } else {
        // No vowel followed: Virama (Halant) attached
        output += matchedConsonant + '್';
      }
      continue;
    }

    // 3. Independent vowel (start of word or syllable)
    let matchedVowel: string | null = null;
    let vowelLen = 0;
    for (const [key, val] of INDEPENDENT_VOWELS) {
      if (input.slice(i, i + key.length) === key) {
        matchedVowel = val;
        vowelLen = key.length;
        break;
      }
    }

    if (matchedVowel) {
      output += matchedVowel;
      i += vowelLen;
      continue;
    }

    // Fallback: copy character
    output += input[i];
    i++;
  }

  // Clean up any double viramas if needed
  return output.replace(/್್+/g, '್');
}
