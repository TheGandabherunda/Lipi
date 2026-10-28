import { create } from 'zustand';
import type { GlyphData, VectorPathData } from '../types/glyph';
import type { LipiFileSchema, LipiProjectMetadata } from '../types/lipiFormat';
import { initialKannadaGlyphs } from '../constants/kannadaCharacters';
import { useUIStore } from './uiStore';

interface GlyphStoreState {
  // Project Metadata
  metadata: LipiProjectMetadata;
  glyphs: Record<string, GlyphData>;
  weightProfiles: Record<number, Record<string, GlyphData>>;
  activeUnicode: string;

  // Undo / Redo stacks for active glyph
  history: VectorPathData[][];
  historyIndex: number;

  // Glyph & Canvas Operations
  setActiveUnicode: (unicode: string) => void;
  updateActiveGlyphPaths: (paths: VectorPathData[], recordHistory?: boolean) => void;
  updateAdvanceWidth: (unicode: string, width: number) => void;
  clearActiveGlyph: () => void;

  // History Operations
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Project Actions
  updateMetadata: (patch: Partial<LipiProjectMetadata>) => void;
  resetProject: (name?: string) => void;

  // Custom .lipi File Handlers
  serializeLipiProject: () => string;
  downloadLipiFile: () => void;
  loadLipiFileContent: (jsonString: string) => { success: boolean; error?: string };
}

export const DEFAULT_METRICS = {
  unitsPerEm: 1000,
  ascender: 790,
  capHeight: 565,
  baseline: 0,
  descender: -420,
};

const DEFAULT_METADATA: LipiProjectMetadata = {
  name: 'Lipi-Kannada-Font',
  author: 'Kannada Lipikara',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metrics: DEFAULT_METRICS,
  weightClass: 400,
  weightName: 'Regular',
  styleName: 'Regular',
};

export const useGlyphStore = create<GlyphStoreState>((set, get) => ({
  metadata: DEFAULT_METADATA,
  glyphs: initialKannadaGlyphs,
  weightProfiles: { 400: initialKannadaGlyphs },
  activeUnicode: 'U+0C85', // Default: 'ಅ'
  history: [[]],
  historyIndex: 0,

  setActiveUnicode: (unicode: string) => {
    const { glyphs } = get();
    const targetGlyph = glyphs[unicode];
    if (!targetGlyph) return;

    set({
      activeUnicode: unicode,
      history: [targetGlyph.paths ? [...targetGlyph.paths] : []],
      historyIndex: 0,
    });
  },

  updateActiveGlyphPaths: (paths: VectorPathData[], recordHistory = true) => {
    const { activeUnicode, glyphs, history, historyIndex } = get();
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    const isEdited = paths.length > 0;
    const updatedGlyphs = {
      ...glyphs,
      [activeUnicode]: {
        ...currentGlyph,
        paths,
        isEdited,
        lastModified: Date.now(),
      },
    };

    if (!recordHistory) {
      set({ glyphs: updatedGlyphs });
      return;
    }

    // Truncate future redo stack and push new state
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(paths);

    // Limit history stack size to 50 for memory optimization
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      glyphs: updatedGlyphs,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateAdvanceWidth: (unicode: string, width: number) => {
    const { glyphs } = get();
    const currentGlyph = glyphs[unicode];
    if (!currentGlyph) return;

    set({
      glyphs: {
        ...glyphs,
        [unicode]: {
          ...currentGlyph,
          advanceWidth: Math.max(100, Math.min(2000, width)),
        },
      },
    });
  },

  clearActiveGlyph: () => {
    get().updateActiveGlyphPaths([], true);
  },

  undo: () => {
    const { history, historyIndex, activeUnicode, glyphs } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const previousPaths = history[newIndex];
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    set({
      historyIndex: newIndex,
      glyphs: {
        ...glyphs,
        [activeUnicode]: {
          ...currentGlyph,
          paths: previousPaths,
          isEdited: previousPaths.length > 0,
          lastModified: Date.now(),
        },
      },
    });
  },

  redo: () => {
    const { history, historyIndex, activeUnicode, glyphs } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextPaths = history[newIndex];
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    set({
      historyIndex: newIndex,
      glyphs: {
        ...glyphs,
        [activeUnicode]: {
          ...currentGlyph,
          paths: nextPaths,
          isEdited: nextPaths.length > 0,
          lastModified: Date.now(),
        },
      },
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  updateMetadata: (patch) => {
    const state = get();
    const oldWeight = state.metadata.weightClass || 400;
    const newWeight = patch.weightClass;

    if (newWeight !== undefined && newWeight !== oldWeight) {
      // 1. Archive current glyphs into old weight profile
      const updatedProfiles = {
        ...state.weightProfiles,
        [oldWeight]: state.glyphs,
      };

      // 2. Retrieve or initialize glyphs for target weight
      let targetGlyphs = updatedProfiles[newWeight];
      if (!targetGlyphs) {
        // Deep clone initial glyphs for this weight profile
        targetGlyphs = JSON.parse(JSON.stringify(initialKannadaGlyphs));
        updatedProfiles[newWeight] = targetGlyphs;
      }

      // 3. Update default stroke size corresponding to typography weight
      const weightWidthMap: Record<number, number> = {
        100: 4,
        200: 6,
        300: 8,
        400: 16,
        500: 24,
        600: 28,
        700: 32,
        800: 38,
        900: 44,
      };
      if (weightWidthMap[newWeight]) {
        useUIStore.getState().setStrokeWidth(weightWidthMap[newWeight]);
      }

      set({
        metadata: {
          ...state.metadata,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        weightProfiles: updatedProfiles,
        glyphs: targetGlyphs,
        history: [targetGlyphs[state.activeUnicode]?.paths ? [...targetGlyphs[state.activeUnicode].paths] : []],
        historyIndex: 0,
      });
      return;
    }

    set((s) => ({
      metadata: {
        ...s.metadata,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  resetProject: (name = 'New-Lipi-Font') => {
    set({
      metadata: {
        ...DEFAULT_METADATA,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      glyphs: initialKannadaGlyphs,
      activeUnicode: 'U+0C85',
      history: [[]],
      historyIndex: 0,
    });
  },

  serializeLipiProject: () => {
    const { metadata, glyphs } = get();
    const payload: LipiFileSchema = {
      format: 'LIPI_PROJECT',
      schemaVersion: '1.0.0',
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
      glyphs,
    };
    return JSON.stringify(payload, null, 2);
  },

  downloadLipiFile: () => {
    const { metadata } = get();
    const jsonStr = get().serializeLipiProject();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (metadata.name || 'font').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.href = url;
    link.download = `${safeName}.lipi`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  loadLipiFileContent: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as LipiFileSchema;

      // Schema verification
      if (parsed.format !== 'LIPI_PROJECT') {
        return { success: false, error: 'Invalid file format: Not a recognized .lipi project.' };
      }
      if (!parsed.glyphs || typeof parsed.glyphs !== 'object') {
        return { success: false, error: 'Corrupted .lipi file: Missing glyphs directory.' };
      }

      // Merge loaded glyphs with initial Kannada set so missing characters aren't lost
      const mergedGlyphs: Record<string, GlyphData> = { ...initialKannadaGlyphs };
      for (const [unicode, glyph] of Object.entries(parsed.glyphs)) {
        if (mergedGlyphs[unicode]) {
          mergedGlyphs[unicode] = {
            ...mergedGlyphs[unicode],
            ...glyph,
            paths: glyph.paths || [],
            isEdited: (glyph.paths && glyph.paths.length > 0) || false,
          };
        } else {
          mergedGlyphs[unicode] = glyph;
        }
      }

      const activeUnicode = parsed.glyphs['U+0C85'] ? 'U+0C85' : Object.keys(mergedGlyphs)[0];
      const activeGlyph = mergedGlyphs[activeUnicode];

      set({
        metadata: {
          ...DEFAULT_METADATA,
          ...(parsed.metadata || {}),
          metrics: {
            ...DEFAULT_METRICS,
            ...(parsed.metadata?.metrics || {}),
          },
        },
        glyphs: mergedGlyphs,
        activeUnicode,
        history: [activeGlyph?.paths ? [...activeGlyph.paths] : []],
        historyIndex: 0,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse .lipi file: ${err instanceof Error ? err.message : 'Unknown JSON syntax error'}`,
      };
    }
  },
}));
