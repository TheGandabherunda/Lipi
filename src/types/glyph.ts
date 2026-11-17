export type KannadaCategory =
  | 'swaragalu'       // ಸ್ವರಗಳು (Vowels: ಅ, ಆ, ಇ, ಈ, ಉ, ಊ, ಋ, ಎ, ಏ, ಐ, ಒ, ಓ, ಔ)
  | 'yogavahagalu'    // ಯೋಗವಾಹಗಳು (ಅಂ, ಅಃ)
  | 'vyanjanagalu'    // ವ್ಯಂಜನಗಳು (ಕ, ಖ, ಗ, ಘ, ಙ, ಚ... ಳ)
  | 'gunithakshara'   // ಗುಣಿತಾಕ್ಷರ ಚಿಹ್ನೆಗಳು / ಮಾತ್ರೆಗಳು (ಾ, ಿ, ೀ, ು, ೂ, ೃ, ೆ, ೇ, ೈ, ೊ, ೋ, ೌ, ್)
  | 'ottakshara'      // ಒತ್ತಕ್ಷರಗಳು / Subjoined forms (್ಕ, ್ತ, ್ಮ, ಇತ್ಯಾದಿ)
  | 'numbers'         // ಅಂಕಿಗಳು (೦, ೧, ೨, ೩, ೪, ೫, ೬, ೭, ೮, ೯)
  | 'modifiers'       // ಒತ್ತುಗಳು / Ottakshara signs, avagraha, etc.
  | 'symbols';        // Kannada symbols & punctuation

export type GlyphStatus = 'empty' | 'started' | 'ready';

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
  leftSideBearing?: number;         // Left side bearing in font units (defaults to metrics.leftSideBearing)
  rightSideBearing?: number;        // Right side bearing in font units (defaults to metrics.rightSideBearing)
  status?: GlyphStatus;             // 'empty' | 'started' | 'ready'
  isEdited: boolean;                // Visual flag for the grid
  lastModified?: number;
}

export interface KannadaCharacterDefinition {
  unicode: string;
  character: string;
  name: string;
  category: KannadaCategory;
  defaultAdvanceWidth: number;
  defaultLsb?: number;
  defaultRsb?: number;
  sampleWord?: string;
  sampleWordMeaning?: string;
}

export interface FontComponent {
  id: string;
  name: string;
  nameKn: string;
  category: 'talekattu' | 'kombu' | 'gudisu' | 'virama' | 'vattrisuli' | 'loop' | 'custom';
  paths: VectorPathData[];
  defaultWidth: number;
  defaultHeight: number;
  description?: string;
  sourceGlyph?: string;
}

export type QASeverity = 'error' | 'warning' | 'info';

export interface GlyphQAIssue {
  glyphUnicode: string;
  glyphCharacter: string;
  type:
    | 'empty'
    | 'open_contour'
    | 'invalid_metric'
    | 'zero_advance'
    | 'overflow_bearing'
    | 'invalid_path'
    | 'metadata';
  severity: QASeverity;
  message: string;
  suggestion?: string;
}

export interface ProjectQAReport {
  timestamp: number;
  totalGlyphs: number;
  readyGlyphsCount: number;
  startedGlyphsCount: number;
  emptyGlyphsCount: number;
  issues: GlyphQAIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  canExport: boolean;
}
