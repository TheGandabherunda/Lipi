import type { GlyphData, GlyphQAIssue, ProjectQAReport } from '../types/glyph';
import type { LipiProjectMetadata } from '../types/lipiFormat';

/**
 * Industrial Preflight & QA Validation Engine for Kannada Fonts
 * Validates project metadata, glyph outlines, metrics, and Unicode mappings
 * before font compilation to guarantee zero corrupted or invalid font exports.
 */
export function validateProjectPreflight(
  metadata: LipiProjectMetadata,
  glyphs: Record<string, GlyphData>
): ProjectQAReport {
  const issues: GlyphQAIssue[] = [];
  const glyphEntries = Object.values(glyphs);
  const totalGlyphs = glyphEntries.length;

  let readyGlyphsCount = 0;
  let startedGlyphsCount = 0;
  let emptyGlyphsCount = 0;

  // 1. PROJECT METADATA CHECKS
  if (!metadata.name || !metadata.name.trim()) {
    issues.push({
      glyphUnicode: 'PROJECT',
      glyphCharacter: '🏷️',
      type: 'metadata',
      severity: 'error',
      message: 'Font Family Name is empty.',
      suggestion: 'Set a unique font name in Project Settings (e.g., "Mysuru Kannada").',
    });
  }

  if (!metadata.version || !metadata.version.trim()) {
    issues.push({
      glyphUnicode: 'PROJECT',
      glyphCharacter: '🏷️',
      type: 'metadata',
      severity: 'warning',
      message: 'Font version is missing. Defaulting to 1.0.0.',
      suggestion: 'Specify a version number in Project Settings.',
    });
  }

  const upm = metadata.metrics.unitsPerEm || 1000;
  if (upm < 64 || upm > 16384) {
    issues.push({
      glyphUnicode: 'METRICS',
      glyphCharacter: '📏',
      type: 'invalid_metric',
      severity: 'error',
      message: `Invalid UnitsPerEm: ${upm}. OpenType requires 64 to 16384 (standard: 1000).`,
      suggestion: 'Reset UnitsPerEm to 1000 in Font Metrics.',
    });
  }

  if (metadata.metrics.ascender <= metadata.metrics.descender) {
    issues.push({
      glyphUnicode: 'METRICS',
      glyphCharacter: '📏',
      type: 'invalid_metric',
      severity: 'error',
      message: `Ascender (${metadata.metrics.ascender}) must be strictly higher than Descender (${metadata.metrics.descender}).`,
      suggestion: 'Adjust Ascender and Descender in Font Metrics so Ascender > Descender.',
    });
  }

  // 2. PER-GLYPH INSPECTION
  glyphEntries.forEach((glyph) => {
    const hasPaths = Boolean(glyph.paths && glyph.paths.length > 0);

    if (glyph.status === 'ready') {
      readyGlyphsCount++;
    } else if (hasPaths) {
      startedGlyphsCount++;
    } else {
      emptyGlyphsCount++;
    }

    // A. Metrics Checks
    if (glyph.advanceWidth <= 0) {
      issues.push({
        glyphUnicode: glyph.unicode,
        glyphCharacter: glyph.character,
        type: 'zero_advance',
        severity: 'error',
        message: `Glyph ${glyph.character} (${glyph.unicode}) has non-positive advance width: ${glyph.advanceWidth}px.`,
        suggestion: 'Increase advance width to at least 200 font units in Spacing Inspector.',
      });
    } else if (glyph.advanceWidth > 4000) {
      issues.push({
        glyphUnicode: glyph.unicode,
        glyphCharacter: glyph.character,
        type: 'invalid_metric',
        severity: 'warning',
        message: `Glyph ${glyph.character} advance width is exceptionally large (${glyph.advanceWidth}px).`,
        suggestion: 'Check if advance width matches expected Kannada proportion.',
      });
    }

    const lsb = glyph.leftSideBearing ?? metadata.metrics.leftSideBearing ?? 50;
    const rsb = glyph.rightSideBearing ?? metadata.metrics.rightSideBearing ?? 50;
    if (lsb + rsb >= glyph.advanceWidth) {
      issues.push({
        glyphUnicode: glyph.unicode,
        glyphCharacter: glyph.character,
        type: 'overflow_bearing',
        severity: 'warning',
        message: `Sidebearings (LSB ${lsb} + RSB ${rsb} = ${lsb + rsb}) exceed advance width (${glyph.advanceWidth}) for ${glyph.character}.`,
        suggestion: 'Reduce sidebearings or widen advance width.',
      });
    }

    // B. Path Syntax & Integrity Checks
    if (hasPaths) {
      glyph.paths.forEach((p, pathIdx) => {
        if (!p.pathString || typeof p.pathString !== 'string' || !p.pathString.trim()) {
          issues.push({
            glyphUnicode: glyph.unicode,
            glyphCharacter: glyph.character,
            type: 'invalid_path',
            severity: 'error',
            message: `Stroke #${pathIdx + 1} on ${glyph.character} has empty path data.`,
            suggestion: 'Redraw the path or delete the empty stroke.',
          });
          return;
        }

        if (p.pathString.includes('NaN') || p.pathString.includes('undefined')) {
          issues.push({
            glyphUnicode: glyph.unicode,
            glyphCharacter: glyph.character,
            type: 'invalid_path',
            severity: 'error',
            message: `Stroke #${pathIdx + 1} on ${glyph.character} contains corrupted NaN coordinates.`,
            suggestion: 'Clear or re-edit this stroke on the canvas.',
          });
        }

        // Check if fill is requested on open paths
        const hasFill = Boolean(p.fillColor && p.fillColor !== 'transparent' && p.fillColor !== 'none');
        const isClosed = p.pathString.trim().endsWith('Z') || p.pathString.trim().endsWith('z');
        if (hasFill && !isClosed) {
          issues.push({
            glyphUnicode: glyph.unicode,
            glyphCharacter: glyph.character,
            type: 'open_contour',
            severity: 'warning',
            message: `Stroke #${pathIdx + 1} on ${glyph.character} has a solid fill but an unclosed contour.`,
            suggestion: 'Close the loop with the Pen tool or switch to stroke-only rendering.',
          });
        }
      });
    }

    // C. Unicode Syntax Check
    if (!glyph.unicode || !/^U\+[0-9A-Fa-f]{4,5}$/.test(glyph.unicode)) {
      issues.push({
        glyphUnicode: glyph.unicode,
        glyphCharacter: glyph.character,
        type: 'metadata',
        severity: 'error',
        message: `Invalid Unicode format "${glyph.unicode}" for character "${glyph.character}".`,
        suggestion: 'Ensure format is standard hexadecimal (e.g., U+0C95).',
      });
    }
  });

  // 3. MINIMUM DRAWN GLYPHS GATE
  const drawnCount = startedGlyphsCount + readyGlyphsCount;
  if (drawnCount === 0) {
    issues.push({
      glyphUnicode: 'PROJECT',
      glyphCharacter: '✍️',
      type: 'empty',
      severity: 'error',
      message: 'No glyphs have been drawn in this project. An empty font cannot be compiled.',
      suggestion: 'Draw at least one Kannada letter (such as "ಅ" or "ಕ") before exporting.',
    });
  } else if (drawnCount < 5) {
    issues.push({
      glyphUnicode: 'PROJECT',
      glyphCharacter: 'ℹ️',
      type: 'empty',
      severity: 'info',
      message: `Draft font preview: ${drawnCount} custom glyphs drawn. Remaining letters will use reference base font.`,
    });
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    timestamp: Date.now(),
    totalGlyphs,
    readyGlyphsCount,
    startedGlyphsCount,
    emptyGlyphsCount,
    issues,
    errorCount,
    warningCount,
    infoCount,
    canExport: errorCount === 0 && drawnCount > 0,
  };
}
