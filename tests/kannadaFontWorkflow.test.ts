import { describe, it, expect, beforeEach } from 'vitest';
import { useGlyphStore } from '../src/store/glyphStore';
import { KANNADA_CHARACTERS_LIST, initialKannadaGlyphs } from '../src/constants/kannadaCharacters';
import { KANNADA_STANDARD_COMPONENTS } from '../src/constants/kannadaComponents';
import { validateProjectPreflight } from '../src/utils/preflightValidator';
import type { VectorPathData, GlyphData } from '../src/types/glyph';

describe('Complete Kannada Font Workflow', () => {
  beforeEach(() => {
    useGlyphStore.getState().resetProject();
  });

  describe('1. Comprehensive Glyph Roster & Categorization', () => {
    it('covers all major categories including ottakshara and archaic symbols', () => {
      const categories = new Set(KANNADA_CHARACTERS_LIST.map((c) => c.category));
      expect(categories.has('swaragalu')).toBe(true);
      expect(categories.has('vyanjanagalu')).toBe(true);
      expect(categories.has('gunithakshara')).toBe(true);
      expect(categories.has('numbers')).toBe(true);
      expect(categories.has('yogavahagalu')).toBe(true);
      expect(categories.has('ottakshara')).toBe(true);
      expect(categories.has('symbols')).toBe(true);
    });

    it('initializes glyphs with default status and sidebearings', () => {
      const glyphs = useGlyphStore.getState().glyphs;
      const ka = glyphs['U+0C95'];
      expect(ka).toBeDefined();
      expect(ka.status).toBe('empty');
      expect(ka.leftSideBearing).toBe(50);
      expect(ka.rightSideBearing).toBe(50);
      expect(ka.advanceWidth).toBeGreaterThan(0);
    });
  });

  describe('2. Glyph Status Tracking & Transitions', () => {
    it('transitions from empty to started when drawing strokes, and allows marking ready', () => {
      const store = useGlyphStore.getState();
      expect(store.glyphs['U+0C85'].status).toBe('empty');

      const stroke: VectorPathData = {
        pathString: 'M 100 100 Q 200 200 300 100',
        strokeColor: '#0f172a',
        strokeWidth: 24,
      };

      // Draw stroke
      store.updateGlyphPaths('U+0C85', [stroke]);
      expect(useGlyphStore.getState().glyphs['U+0C85'].status).toBe('started');

      // Mark ready for production export
      store.setGlyphStatus('U+0C85', 'ready');
      expect(useGlyphStore.getState().glyphs['U+0C85'].status).toBe('ready');

      // Adding another stroke while ready should preserve or respect status
      store.updateGlyphPaths('U+0C85', [stroke, stroke]);
      expect(useGlyphStore.getState().glyphs['U+0C85'].status).toBe('ready');

      // Clearing all strokes returns status to empty
      store.updateGlyphPaths('U+0C85', []);
      expect(useGlyphStore.getState().glyphs['U+0C85'].status).toBe('empty');
    });
  });

  describe('3. Per-Glyph Spacing & Sidebearings', () => {
    it('updates advance width, LSB, and RSB individually', () => {
      const store = useGlyphStore.getState();
      store.updateGlyphMetrics('U+0C95', {
        advanceWidth: 920,
        leftSideBearing: 65,
        rightSideBearing: 70,
      });

      const updated = useGlyphStore.getState().glyphs['U+0C95'];
      expect(updated.advanceWidth).toBe(920);
      expect(updated.leftSideBearing).toBe(65);
      expect(updated.rightSideBearing).toBe(70);
    });
  });

  describe('4. Anatomical Component Library & Stamping', () => {
    it('provides standard curated Kannada typography components', () => {
      expect(KANNADA_STANDARD_COMPONENTS.length).toBeGreaterThanOrEqual(8);
      const talekattu = KANNADA_STANDARD_COMPONENTS.find((c) => c.category === 'talekattu');
      expect(talekattu).toBeDefined();
      expect(talekattu?.paths.length).toBeGreaterThan(0);
    });

    it('stamps component onto active glyph without erasing existing strokes', () => {
      const store = useGlyphStore.getState();
      store.setActiveUnicode('U+0C95'); // 'ಕ'

      const existingStroke: VectorPathData = {
        pathString: 'M 200 400 Q 300 600 400 400',
        strokeColor: '#0f172a',
        strokeWidth: 20,
      };
      store.updateGlyphPaths('U+0C95', [existingStroke]);
      expect(useGlyphStore.getState().glyphs['U+0C95'].paths.length).toBe(1);

      // Stamp Talekattu component
      const talekattu = KANNADA_STANDARD_COMPONENTS[0];
      store.insertComponentIntoActiveGlyph(talekattu.id);

      const updatedGlyph = useGlyphStore.getState().glyphs['U+0C95'];
      expect(updatedGlyph.paths.length).toBe(1 + talekattu.paths.length);
      expect(updatedGlyph.status).toBe('started');
    });

    it('allows registering a custom component', () => {
      const store = useGlyphStore.getState();
      const customComp = {
        id: 'user_arch_loop',
        name: 'Custom Base Loop',
        category: 'loop' as const,
        paths: [{ pathString: 'M 0 0 C 10 10 20 20 30 30 Z', strokeWidth: 16 }],
      };
      store.addComponent(customComp);
      expect(useGlyphStore.getState().components.some((c) => c.id === 'user_arch_loop')).toBe(true);
    });
  });

  describe('5. Industrial Preflight Validator', () => {
    it('blocks export when no glyphs have been drawn', () => {
      const metadata = useGlyphStore.getState().metadata;
      const glyphs = useGlyphStore.getState().glyphs;
      const report = validateProjectPreflight(metadata, glyphs);

      expect(report.canExport).toBe(false);
      expect(report.issues.some((i) => i.type === 'empty' && i.severity === 'error')).toBe(true);
    });

    it('detects invalid font metadata and metric anomalies', () => {
      const metadata = {
        ...useGlyphStore.getState().metadata,
        name: '', // Empty name error
        metrics: {
          ...useGlyphStore.getState().metadata.metrics,
          ascender: 300,
          descender: 500, // Inverted: Ascender <= Descender error
          unitsPerEm: 20, // Invalid UPM error
        },
      };
      const glyphs: Record<string, GlyphData> = {
        'U+0C85': {
          ...initialKannadaGlyphs['U+0C85'],
          paths: [{ pathString: 'M 10 10 L 20 20', strokeWidth: 10 }],
          advanceWidth: -50, // Non-positive advance error
        },
      };

      const report = validateProjectPreflight(metadata, glyphs);
      expect(report.canExport).toBe(false);
      expect(report.issues.some((i) => i.message.includes('Font Family Name is empty'))).toBe(true);
      expect(report.issues.some((i) => i.message.includes('Ascender') && i.message.includes('strictly higher'))).toBe(true);
      expect(report.issues.some((i) => i.message.includes('UnitsPerEm'))).toBe(true);
      expect(report.issues.some((i) => i.type === 'zero_advance')).toBe(true);
    });

    it('detects NaN coordinates in path strings', () => {
      const metadata = useGlyphStore.getState().metadata;
      const glyphs: Record<string, GlyphData> = {
        'U+0C85': {
          ...initialKannadaGlyphs['U+0C85'],
          paths: [{ pathString: 'M NaN 50 L 100 100', strokeWidth: 10 }],
          advanceWidth: 800,
        },
      };

      const report = validateProjectPreflight(metadata, glyphs);
      expect(report.issues.some((i) => i.message.includes('corrupted NaN'))).toBe(true);
    });

    it('detects unclosed contours with solid fills', () => {
      const metadata = useGlyphStore.getState().metadata;
      const glyphs: Record<string, GlyphData> = {
        'U+0C85': {
          ...initialKannadaGlyphs['U+0C85'],
          paths: [{ pathString: 'M 0 0 L 100 0 L 100 100', strokeWidth: 10, fillColor: '#ff0000' }],
          advanceWidth: 800,
        },
      };

      const report = validateProjectPreflight(metadata, glyphs);
      expect(report.issues.some((i) => i.type === 'open_contour')).toBe(true);
    });

    it('approves export when project has valid metadata and drawn glyphs', () => {
      const store = useGlyphStore.getState();
      store.updateMetadata({ name: 'Sirigannada' });
      store.updateGlyphPaths('U+0C85', [{ pathString: 'M 100 100 L 200 200', strokeWidth: 20 }]);
      store.updateGlyphMetrics('U+0C85', { advanceWidth: 800 });

      const report = validateProjectPreflight(
        useGlyphStore.getState().metadata,
        useGlyphStore.getState().glyphs
      );
      expect(report.canExport).toBe(true);
      expect(report.errorCount).toBe(0);
    });
  });

  describe('6. Project Schema 2.0.0 & Dirty State Lifecycle', () => {
    it('marks project dirty on edits and clean on save/reset', () => {
      const store = useGlyphStore.getState();
      expect(store.isDirty).toBe(false);

      // Edit glyph
      store.updateGlyphPaths('U+0C85', [{ pathString: 'M 10 10 L 20 20', strokeWidth: 10 }]);
      expect(useGlyphStore.getState().isDirty).toBe(true);

      // Mark clean
      store.markClean();
      expect(useGlyphStore.getState().isDirty).toBe(false);
    });

    it('serializes to schema 2.0.0 including custom components and status', () => {
      const store = useGlyphStore.getState();
      store.updateMetadata({ name: 'LipiProduction', license: 'SIL Open Font License 1.1' });
      store.updateGlyphPaths('U+0C85', [{ pathString: 'M 50 50 L 150 150', strokeWidth: 15 }]);
      store.setGlyphStatus('U+0C85', 'ready');
      store.updateGlyphMetrics('U+0C85', { leftSideBearing: 60, rightSideBearing: 60 });

      const serialized = store.serializeLipiProject();
      const parsed = JSON.parse(serialized);

      expect(parsed.schemaVersion).toBe('2.0.0');
      expect(parsed.metadata.license).toBe('SIL Open Font License 1.1');
      expect(parsed.glyphs['U+0C85'].status).toBe('ready');
      expect(parsed.glyphs['U+0C85'].leftSideBearing).toBe(60);
      expect(Array.isArray(parsed.components)).toBe(true);
    });

    it('loads schema 2.0.0 file correctly and restores state', () => {
      const store = useGlyphStore.getState();
      const projectPayload = {
        format: 'LIPI_PROJECT',
        schemaVersion: '2.0.0',
        metadata: {
          ...store.metadata,
          name: 'RestoredKannada',
          license: 'MIT',
        },
        components: [
          { id: 'custom_kombu', name: 'Custom Kombu', category: 'kombu', paths: [] },
        ],
        glyphs: {
          'U+0C95': {
            unicode: 'U+0C95',
            character: 'ಕ',
            name: 'KANNADA LETTER KA',
            category: 'vyanjanagalu',
            paths: [{ pathString: 'M 0 0 L 100 100', strokeWidth: 12 }],
            advanceWidth: 850,
            leftSideBearing: 55,
            rightSideBearing: 55,
            status: 'ready',
          },
        },
      };

      const result = store.loadLipiFileContent(JSON.stringify(projectPayload));
      expect(result.success).toBe(true);

      const state = useGlyphStore.getState();
      expect(state.metadata.name).toBe('RestoredKannada');
      expect(state.metadata.license).toBe('MIT');
      expect(state.glyphs['U+0C95'].status).toBe('ready');
      expect(state.glyphs['U+0C95'].advanceWidth).toBe(850);
      expect(state.components.some((c) => c.id === 'custom_kombu')).toBe(true);
      expect(state.isDirty).toBe(false);
    });
  });
});
