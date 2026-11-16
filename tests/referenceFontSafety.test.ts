import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore } from '../src/store/glyphStore';
import { useUIStore } from '../src/store/uiStore';

describe('Reference Font Workflow Isolation', () => {
  beforeEach(() => {
    useGlyphStore.setState({
      activeUnicode: 'U+0C85',
      glyphs: {
        'U+0C85': {
          unicode: 'U+0C85',
          character: 'ಅ',
          name: 'KANNADA LETTER A',
          category: 'swaragalu',
          advanceWidth: 800,
          isEdited: false,
          paths: [],
        },
      },
      metadata: {
        name: 'OriginalProjectFont',
        version: '1.0.0',
        metrics: {
          unitsPerEm: 1000,
          ascender: 800,
          descender: -200,
          capHeight: 700,
          xHeight: 500,
          mahaprana: 950,
          leftSideBearing: 50,
          rightSideBearing: 50,
        },
      },
    });

    useUIStore.setState({
      activeOutlines: {},
      selectedReferenceFont: 'NotoSansKannada',
      tracing: {
        enabled: true,
        font: 'NotoSansKannada',
        opacity: 0.25,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
    });
  });

  it('caching reference font outlines does not mutate project metadata or metrics', () => {
    const originalMetrics = { ...useGlyphStore.getState().metadata.metrics };
    const originalName = useGlyphStore.getState().metadata.name;

    // Simulate loading reference font outlines
    useUIStore.getState().setActiveOutlines({
      'U+0C85': {
        pathString: 'M 10 10 L 20 20 Z',
        advanceWidth: 920,
        bbox: { x1: 10, y1: 10, x2: 20, y2: 20 },
      },
    });

    // Check that reference font outline is stored in UI store
    expect(useUIStore.getState().activeOutlines['U+0C85']).toBeDefined();
    expect(useUIStore.getState().activeOutlines['U+0C85'].advanceWidth).toBe(920);

    // Verify glyph store metadata and metrics are untouched
    expect(useGlyphStore.getState().metadata.name).toBe(originalName);
    expect(useGlyphStore.getState().metadata.metrics).toEqual(originalMetrics);

    // Verify glyph paths in glyphStore are still empty and unedited
    const glyph = useGlyphStore.getState().glyphs['U+0C85'];
    expect(glyph.isEdited).toBe(false);
    expect(glyph.paths).toHaveLength(0);
  });

  it('switching reference fonts preserves user drawn artwork without overwriting', () => {
    // Add user drawn paths
    useGlyphStore.getState().updateActiveGlyphPaths([
      {
        id: 'user-stroke-1',
        pathString: 'M 100 100 L 200 200',
        strokeWidth: 12,
        strokeColor: '#ff0000',
      },
    ]);

    // Change reference font in UI store
    useUIStore.getState().setSelectedGoogleFont('Tunga');
    useUIStore.getState().setActiveOutlines({
      'U+0C85': {
        pathString: 'M 5 5 L 15 15 Z',
        advanceWidth: 750,
      },
    });

    const activeGlyph = useGlyphStore.getState().glyphs['U+0C85'];
    expect(activeGlyph.isEdited).toBe(true);
    expect(activeGlyph.paths).toHaveLength(1);
    expect(activeGlyph.paths[0].id).toBe('user-stroke-1');
  });
});
