export type KannadaCategory =
  | 'swaragalu'       // ಸ್ವರಗಳು (Vowels: ಅ, ಆ, ಇ, ಈ, ಉ, ಊ, ಋ, ಎ, ಏ, ಐ, ಒ, ಓ, ಔ)
  | 'yogavahagalu'    // ಯೋಗವಾಹಗಳು (ಅಂ, ಅಃ)
  | 'vyanjanagalu'    // ವ್ಯಂಜನಗಳು (ಕ, ಖ, ಗ, ಘ, ಙ, ಚ... ಳ)
  | 'gunithakshara'   // ಗುಣಿತಾಕ್ಷರ ಚಿಹ್ನೆಗಳು / ಮಾತ್ರೆಗಳು (ಾ, ಿ, ೀ, ು, ೂ, ೃ, ೆ, ೇ, ೈ, ೊ, ೋ, ೌ, ್)
  | 'numbers'         // ಅಂಕಿಗಳು (೦, ೧, ೨, ೩, ೪, ೫, ೬, ೭, ೮, ೯)
  | 'modifiers';      // ಒತ್ತುಗಳು / Ottakshara signs, avagraha, etc.

export interface VectorPathData {
  id: string;
  pathString: string;               // Standard SVG Path string e.g. "M 100 200 Q 150 250 ..."
  strokeWidth: number;
  strokeColor: string;
  fillColor?: string;
  strokeLineCap?: 'round' | 'butt' | 'square';
  strokeLineJoin?: 'round' | 'bevel' | 'miter';
  fabricJSON?: Record<string, any>; // Serialized Fabric object for perfect rehydration
}

export interface GlyphData {
  unicode: string;                  // e.g. "U+0C85"
  character: string;                // e.g. "ಅ"
  name: string;                     // e.g. "KANNADA LETTER A"
  category: KannadaCategory;
  sampleWord?: string;              // e.g. "ಅಮ್ಮ" (Amma)
  sampleWordMeaning?: string;       // e.g. "Mother"
  paths: VectorPathData[];          // Vector strokes drawn
  advanceWidth: number;             // Metric width for the character
  isEdited: boolean;                // Visual flag for the grid
  lastModified?: number;
}

export interface KannadaCharacterDefinition {
  unicode: string;
  character: string;
  name: string;
  category: KannadaCategory;
  defaultAdvanceWidth: number;
  sampleWord?: string;
  sampleWordMeaning?: string;
}
