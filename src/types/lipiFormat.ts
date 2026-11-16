import type { GlyphData } from './glyph';

export interface FontMetrics {
  unitsPerEm: number;          // Default 1000
  ascender: number;            // e.g. 790 (Top of deergha/talekattu/upper marks)
  capHeight: number;           // e.g. 565 (Top of base characters ಅ, ಕ / shirorekha)
  baseline: number;            // 0 (Base line floor)
  descender: number;           // e.g. -420 (Bottom for ottakshara / kombu)
  mahaprana?: number;          // e.g. -144 (Downstroke line for aspirates ಘ, ಛ, ಝ, etc.)
  leftSideBearing?: number;    // e.g. 50 (Default left sidebearing in font units)
  rightSideBearing?: number;   // e.g. 50 (Default right sidebearing in font units)
}

export interface LipiProjectMetadata {
  name: string;
  author: string;
  version: string;             // Project version (e.g., "1.0.0")
  createdAt: string;
  updatedAt: string;
  metrics: FontMetrics;
  weightClass?: number;        // e.g. 100, 300, 400, 500, 600, 700, 800, 900
  weightName?: string;         // e.g. "Thin", "Light", "Regular", "Medium", "Bold", "Black"
  styleName?: string;          // e.g. "Regular", "Bold"
}

export interface LipiFileSchema {
  format: 'LIPI_PROJECT';
  schemaVersion: '1.0.0' | '1.1.0' | string;
  metadata: LipiProjectMetadata;
  glyphs: Record<string, GlyphData>; // Keyed by Unicode string e.g. "U+0C95"
  weightProfiles?: Record<number, Record<string, GlyphData>>;
  customProperties?: Record<string, any>; // Preserves unsupported or user-defined fields safely
}
