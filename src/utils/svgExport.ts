import type { GlyphData } from '../types/glyph';
import type { FontMetrics } from '../types/lipiFormat';

/**
 * Converts Fabric.js path segments array [['M', 10, 20], ['Q', 15, 25, 30, 40]]
 * into standard SVG path 'd' string
 */
export function fabricSegmentsToPathString(segments: any[]): string {
  if (!Array.isArray(segments)) return '';
  return segments
    .map((seg) => {
      const command = seg[0];
      const coords = seg.slice(1).map((n: number) => Math.round(n * 100) / 100).join(' ');
      return `${command} ${coords}`;
    })
    .join(' ');
}

/**
 * Generates an SVG string representation of a glyph for preview or export
 */
export function glyphToSVG(
  glyph: GlyphData,
  _metrics?: FontMetrics,
  options?: { width?: number; height?: number; strokeColor?: string }
): string {
  const width = options?.width || 800;
  const height = options?.height || 800;
  const fallbackColor = options?.strokeColor || '#ffffff';

  const pathsSVG = (glyph.paths || [])
    .map((p) => {
      const color = p.strokeColor || fallbackColor;
      const sw = p.strokeWidth || 12;
      const cap = p.strokeLineCap || 'round';
      const join = p.strokeLineJoin || 'round';
      const fill = p.fillColor || 'none';
      return `<path d="${p.pathString}" stroke="${fill !== 'none' ? 'none' : color}" stroke-width="${sw}" fill="${fill}" stroke-linecap="${cap}" stroke-linejoin="${join}" />`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g id="glyph-${glyph.unicode}">
    ${pathsSVG}
  </g>
</svg>`;
}

/**
 * Downloads a complete SVG file for the current glyph
 */
export function downloadGlyphSVG(glyph: GlyphData, metrics?: FontMetrics) {
  const svgContent = glyphToSVG(glyph, metrics);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kannada_${glyph.character}_${glyph.unicode}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
