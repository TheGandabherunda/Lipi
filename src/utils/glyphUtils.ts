import type { GlyphData, VectorPathData } from '../types/glyph';

/**
 * Deep clones an individual VectorPathData object, ensuring nested
 * fabricJSON or other properties are never shared by reference.
 */
export function cloneVectorPath(p: VectorPathData): VectorPathData {
  return {
    id: p.id,
    pathString: p.pathString,
    strokeWidth: p.strokeWidth,
    strokeColor: p.strokeColor,
    fillColor: p.fillColor,
    strokeLineCap: p.strokeLineCap,
    strokeLineJoin: p.strokeLineJoin,
    fabricJSON: p.fabricJSON ? JSON.parse(JSON.stringify(p.fabricJSON)) : undefined,
  };
}

/**
 * Deep clones an array of VectorPathData objects.
 */
export function cloneVectorPaths(paths: VectorPathData[] = []): VectorPathData[] {
  return paths.map(cloneVectorPath);
}

/**
 * Deep clones a GlyphData object.
 */
export function cloneGlyph(g: GlyphData): GlyphData {
  return {
    ...g,
    paths: cloneVectorPaths(g.paths || []),
  };
}

/**
 * Deep clones an entire record of glyphs keyed by Unicode.
 */
export function cloneGlyphRecord(glyphs: Record<string, GlyphData>): Record<string, GlyphData> {
  const result: Record<string, GlyphData> = {};
  for (const [key, glyph] of Object.entries(glyphs)) {
    result[key] = cloneGlyph(glyph);
  }
  return result;
}
