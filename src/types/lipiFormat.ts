import type { GlyphData } from './glyph';

export interface FontMetrics {
  unitsPerEm: number;          // Default 1000
  ascender: number;            // e.g. 800 (Top of deergha/marks)
  capHeight: number;           // e.g. 620 (Top of base characters ಅ, ಕ)
  baseline: number;            // e.g. 250 (Base line)
  descender: number;           // e.g. 100 (Bottom for ottakshara / kombu)
}

export interface LipiProjectMetadata {
  name: string;
  author: string;
  version: string;             // Schema version (e.g., "1.0.0")
  createdAt: string;
  updatedAt: string;
  metrics: FontMetrics;
  weightClass?: number;        // e.g. 100, 300, 400, 500, 600, 700, 800, 900
  weightName?: string;         // e.g. "Thin", "Light", "Regular", "Medium", "Bold", "Black"
  styleName?: string;          // e.g. "Regular", "Bold"
}

export interface LipiFileSchema {
  format: 'LIPI_PROJECT';
  schemaVersion: '1.0.0';
  metadata: LipiProjectMetadata;
  glyphs: Record<string, GlyphData>; // Keyed by Unicode string e.g. "U+0C95"
}
