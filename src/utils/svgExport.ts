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
 * Offsets/translates all coordinates in an SVG path string by (dx, dy)
 */
export function translateSVGPathString(pathString: string, dx: number, dy: number): string {
  if (!pathString || (dx === 0 && dy === 0)) return pathString;
  try {
    const res = pathString.replace(/([a-zA-Z])([^a-zA-Z]*)/g, (_, cmd, argsStr) => {
      const numbers = (argsStr.trim().match(/-?[0-9]*\.?[0-9]+/g) || []).map(Number);
      if (numbers.length === 0) return cmd + ' ';

      const uppercaseCmd = cmd.toUpperCase();
      if (uppercaseCmd === 'M' || uppercaseCmd === 'L' || uppercaseCmd === 'T') {
        const shifted: number[] = [];
        for (let i = 0; i < numbers.length; i += 2) {
          shifted.push(Math.round((numbers[i] + dx) * 100) / 100);
          if (i + 1 < numbers.length) {
            shifted.push(Math.round((numbers[i + 1] + dy) * 100) / 100);
          }
        }
        return cmd + ' ' + shifted.join(' ') + ' ';
      }
      if (uppercaseCmd === 'Q') {
        const shifted: number[] = [];
        for (let i = 0; i < numbers.length; i += 4) {
          shifted.push(Math.round((numbers[i] + dx) * 100) / 100);
          shifted.push(Math.round((numbers[i + 1] + dy) * 100) / 100);
          if (i + 2 < numbers.length) shifted.push(Math.round((numbers[i + 2] + dx) * 100) / 100);
          if (i + 3 < numbers.length) shifted.push(Math.round((numbers[i + 3] + dy) * 100) / 100);
        }
        return cmd + ' ' + shifted.join(' ') + ' ';
      }
      if (uppercaseCmd === 'C') {
        const shifted: number[] = [];
        for (let i = 0; i < numbers.length; i += 6) {
          shifted.push(Math.round((numbers[i] + dx) * 100) / 100);
          shifted.push(Math.round((numbers[i + 1] + dy) * 100) / 100);
          if (i + 2 < numbers.length) shifted.push(Math.round((numbers[i + 2] + dx) * 100) / 100);
          if (i + 3 < numbers.length) shifted.push(Math.round((numbers[i + 3] + dy) * 100) / 100);
          if (i + 4 < numbers.length) shifted.push(Math.round((numbers[i + 4] + dx) * 100) / 100);
          if (i + 5 < numbers.length) shifted.push(Math.round((numbers[i + 5] + dy) * 100) / 100);
        }
        return cmd + ' ' + shifted.join(' ') + ' ';
      }
      return cmd + ' ' + numbers.join(' ') + ' ';
    });
    return res.trim().replace(/\s+/g, ' ');
  } catch {
    return pathString;
  }
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
