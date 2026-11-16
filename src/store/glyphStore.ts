import { create } from 'zustand';
import type { GlyphData, VectorPathData } from '../types/glyph';
import type { FontMetrics, LipiFileSchema, LipiProjectMetadata } from '../types/lipiFormat';
import { initialKannadaGlyphs } from '../constants/kannadaCharacters';
import { useUIStore } from './uiStore';
import { translateSVGPathString } from '../utils/svgExport';
import { cloneGlyphRecord, cloneVectorPaths } from '../utils/glyphUtils';

export interface GlyphClipboard {
  paths: VectorPathData[];
  sourceUnicode: string;
  sourceCharacter: string;
  copiedAt: number;
}

export interface GlyphHistoryStack {
  stack: VectorPathData[][];
  index: number;
}

interface GlyphStoreState {
  // Project Metadata
  metadata: LipiProjectMetadata;
  glyphs: Record<string, GlyphData>;
  weightProfiles: Record<number, Record<string, GlyphData>>;
  activeUnicode: string;

  // Clipboard for copying and pasting strokes across any letter
  clipboard: GlyphClipboard | null;
  copyPaths: (paths?: VectorPathData[]) => void;
  pastePaths: (targetUnicode?: string, offset?: { x: number; y: number }) => { count: number; sourceChar: string; targetChar: string } | null;
  copyGlyphToTarget: (sourceUnicode: string, targetUnicode: string) => void;

  // Per-glyph history storage
  glyphHistories: Record<string, GlyphHistoryStack>;

  // Active glyph undo / redo projection (for component reactivity & backwards compatibility)
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
  canUndo: (unicode?: string) => boolean;
  canRedo: (unicode?: string) => boolean;

  // Project Actions
  updateMetadata: (patch: Partial<LipiProjectMetadata>) => void;
  resetProject: (name?: string) => void;

  // Custom .lipi File Handlers
  serializeLipiProject: () => string;
  downloadLipiFile: () => void;
  loadLipiFileContent: (jsonString: string) => { success: boolean; error?: string };
}

export const DEFAULT_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 790,
  capHeight: 565,
  baseline: 0,
  descender: -420,
  mahaprana: -144,
  leftSideBearing: 50,
  rightSideBearing: 50,
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

const initialClonedGlyphs = cloneGlyphRecord(initialKannadaGlyphs);

export const useGlyphStore = create<GlyphStoreState>((set, get) => ({
  metadata: DEFAULT_METADATA,
  glyphs: initialClonedGlyphs,
  weightProfiles: { 400: cloneGlyphRecord(initialClonedGlyphs) },
  activeUnicode: 'U+0C85', // Default: 'ಅ'
  glyphHistories: {
    'U+0C85': { stack: [[]], index: 0 },
  },
  history: [[]],
  historyIndex: 0,
  clipboard: null,

  copyPaths: (paths?: VectorPathData[]) => {
    const { activeUnicode, glyphs } = get();
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    const sourcePaths = paths && paths.length > 0 ? paths : currentGlyph.paths || [];
    if (sourcePaths.length === 0) return;

    // Deep clone paths so subsequent edits never mutate clipboard content
    const cloned: VectorPathData[] = cloneVectorPaths(sourcePaths).map((p) => ({
      ...p,
      id: `copy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }));

    set({
      clipboard: {
        paths: cloned,
        sourceUnicode: activeUnicode,
        sourceCharacter: currentGlyph.character,
        copiedAt: Date.now(),
      },
    });
  },

  pastePaths: (targetUnicode?: string, offset?: { x: number; y: number }) => {
    const { clipboard, activeUnicode, glyphs, glyphHistories } = get();
    if (!clipboard || clipboard.paths.length === 0) return null;

    const targetCode = targetUnicode || activeUnicode;
    const targetGlyph = glyphs[targetCode];
    if (!targetGlyph) return null;

    const isSameGlyph = targetCode === clipboard.sourceUnicode;
    const dx = offset?.x ?? (isSameGlyph ? 20 : 0);
    const dy = offset?.y ?? (isSameGlyph ? 20 : 0);

    const pastedPaths: VectorPathData[] = cloneVectorPaths(clipboard.paths).map((p, idx) => ({
      ...p,
      id: `pasted_${Date.now()}_${idx}`,
      pathString: dx !== 0 || dy !== 0 ? translateSVGPathString(p.pathString, dx, dy) : p.pathString,
    }));

    const newPaths = [...cloneVectorPaths(targetGlyph.paths || []), ...pastedPaths];
    const updatedGlyphs = {
      ...glyphs,
      [targetCode]: {
        ...targetGlyph,
        paths: cloneVectorPaths(newPaths),
        isEdited: true,
        lastModified: Date.now(),
      },
    };

    // Update per-glyph history for target
    const currentTargetHistory = glyphHistories[targetCode] || {
      stack: [cloneVectorPaths(targetGlyph.paths || [])],
      index: 0,
    };
    const newStack = currentTargetHistory.stack
      .slice(0, currentTargetHistory.index + 1)
      .map((entry) => cloneVectorPaths(entry));
    newStack.push(cloneVectorPaths(newPaths));
    if (newStack.length > 50) newStack.shift();

    const updatedHistories = {
      ...glyphHistories,
      [targetCode]: {
        stack: newStack,
        index: newStack.length - 1,
      },
    };

    if (targetCode === activeUnicode) {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
        history: newStack,
        historyIndex: newStack.length - 1,
      });
    } else {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
      });
    }

    return {
      count: pastedPaths.length,
      sourceChar: clipboard.sourceCharacter,
      targetChar: targetGlyph.character,
    };
  },

  copyGlyphToTarget: (sourceUnicode: string, targetUnicode: string) => {
    const { glyphs, activeUnicode, glyphHistories } = get();
    const sourceGlyph = glyphs[sourceUnicode];
    const targetGlyph = glyphs[targetUnicode];
    if (!sourceGlyph || !targetGlyph || !sourceGlyph.paths || sourceGlyph.paths.length === 0) return;

    const cloned = cloneVectorPaths(sourceGlyph.paths).map((p, idx) => ({
      ...p,
      id: `transferred_${Date.now()}_${idx}`,
    }));

    const newPaths = [...cloneVectorPaths(targetGlyph.paths || []), ...cloned];
    const updatedGlyphs = {
      ...glyphs,
      [targetUnicode]: {
        ...targetGlyph,
        paths: cloneVectorPaths(newPaths),
        isEdited: true,
        lastModified: Date.now(),
      },
    };

    const currentTargetHistory = glyphHistories[targetUnicode] || {
      stack: [cloneVectorPaths(targetGlyph.paths || [])],
      index: 0,
    };
    const newStack = currentTargetHistory.stack
      .slice(0, currentTargetHistory.index + 1)
      .map((entry) => cloneVectorPaths(entry));
    newStack.push(cloneVectorPaths(newPaths));
    if (newStack.length > 50) newStack.shift();

    const updatedHistories = {
      ...glyphHistories,
      [targetUnicode]: {
        stack: newStack,
        index: newStack.length - 1,
      },
    };

    if (targetUnicode === activeUnicode) {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
        history: newStack,
        historyIndex: newStack.length - 1,
      });
    } else {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
      });
    }
  },

  setActiveUnicode: (unicode: string) => {
    const { glyphs, glyphHistories } = get();
    const targetGlyph = glyphs[unicode];
    if (!targetGlyph) return;

    // Retrieve or initialize the per-glyph history stack for this specific character
    let targetHistory = glyphHistories[unicode];
    if (!targetHistory || !targetHistory.stack || targetHistory.stack.length === 0) {
      targetHistory = {
        stack: [cloneVectorPaths(targetGlyph.paths || [])],
        index: 0,
      };
    }

    set({
      activeUnicode: unicode,
      glyphHistories: {
        ...glyphHistories,
        [unicode]: targetHistory,
      },
      history: targetHistory.stack.map((entry) => cloneVectorPaths(entry)),
      historyIndex: targetHistory.index,
    });
  },

  updateActiveGlyphPaths: (paths: VectorPathData[], recordHistory = true) => {
    const { activeUnicode, glyphs, glyphHistories } = get();
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    const clonedPaths = cloneVectorPaths(paths);
    const isEdited = clonedPaths.length > 0;
    const updatedGlyphs = {
      ...glyphs,
      [activeUnicode]: {
        ...currentGlyph,
        paths: clonedPaths,
        isEdited,
        lastModified: Date.now(),
      },
    };

    if (!recordHistory) {
      set({ glyphs: updatedGlyphs });
      return;
    }

    // Retrieve current history for this specific glyph
    const activeHistory = glyphHistories[activeUnicode] || {
      stack: [cloneVectorPaths(currentGlyph.paths || [])],
      index: 0,
    };

    // Truncate redo states and push new state
    const newStack = activeHistory.stack
      .slice(0, activeHistory.index + 1)
      .map((entry) => cloneVectorPaths(entry));
    newStack.push(cloneVectorPaths(clonedPaths));

    // Limit stack size to 50
    if (newStack.length > 50) {
      newStack.shift();
    }

    const updatedStackEntry: GlyphHistoryStack = {
      stack: newStack,
      index: newStack.length - 1,
    };

    set({
      glyphs: updatedGlyphs,
      glyphHistories: {
        ...glyphHistories,
        [activeUnicode]: updatedStackEntry,
      },
      history: newStack,
      historyIndex: updatedStackEntry.index,
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
          advanceWidth: Math.max(100, Math.min(2500, Math.round(width))),
        },
      },
    });
  },

  clearActiveGlyph: () => {
    get().updateActiveGlyphPaths([], true);
  },

  undo: () => {
    const { glyphHistories, activeUnicode, glyphs } = get();
    const activeHistory = glyphHistories[activeUnicode];
    if (!activeHistory || activeHistory.index <= 0) return;

    const newIndex = activeHistory.index - 1;
    const previousPaths = cloneVectorPaths(activeHistory.stack[newIndex] || []);
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    const updatedStackEntry: GlyphHistoryStack = {
      ...activeHistory,
      index: newIndex,
    };

    set({
      historyIndex: newIndex,
      glyphHistories: {
        ...glyphHistories,
        [activeUnicode]: updatedStackEntry,
      },
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
    const { glyphHistories, activeUnicode, glyphs } = get();
    const activeHistory = glyphHistories[activeUnicode];
    if (!activeHistory || activeHistory.index >= activeHistory.stack.length - 1) return;

    const newIndex = activeHistory.index + 1;
    const nextPaths = cloneVectorPaths(activeHistory.stack[newIndex] || []);
    const currentGlyph = glyphs[activeUnicode];
    if (!currentGlyph) return;

    const updatedStackEntry: GlyphHistoryStack = {
      ...activeHistory,
      index: newIndex,
    };

    set({
      historyIndex: newIndex,
      glyphHistories: {
        ...glyphHistories,
        [activeUnicode]: updatedStackEntry,
      },
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

  canUndo: (unicode?: string) => {
    const { glyphHistories, activeUnicode } = get();
    const code = unicode || activeUnicode;
    const hist = glyphHistories[code];
    return Boolean(hist && hist.index > 0);
  },

  canRedo: (unicode?: string) => {
    const { glyphHistories, activeUnicode } = get();
    const code = unicode || activeUnicode;
    const hist = glyphHistories[code];
    return Boolean(hist && hist.index < hist.stack.length - 1);
  },

  updateMetadata: (patch) => {
    const state = get();
    const oldWeight = state.metadata.weightClass || 400;
    const newWeight = patch.weightClass;

    if (newWeight !== undefined && newWeight !== oldWeight) {
      // 1. Deep clone and archive current glyphs into old weight profile
      const updatedProfiles: Record<number, Record<string, GlyphData>> = {};
      for (const [w, gRecord] of Object.entries(state.weightProfiles)) {
        updatedProfiles[Number(w)] = cloneGlyphRecord(gRecord);
      }
      updatedProfiles[oldWeight] = cloneGlyphRecord(state.glyphs);

      // 2. Retrieve or initialize glyphs for target weight safely
      let targetGlyphs = updatedProfiles[newWeight];
      if (!targetGlyphs) {
        targetGlyphs = cloneGlyphRecord(initialKannadaGlyphs);
        updatedProfiles[newWeight] = targetGlyphs;
      } else {
        targetGlyphs = cloneGlyphRecord(targetGlyphs);
      }

      // 3. Update stroke size according to standard typography weight
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

      const activePaths = targetGlyphs[state.activeUnicode]?.paths
        ? cloneVectorPaths(targetGlyphs[state.activeUnicode].paths)
        : [];

      set({
        metadata: {
          ...state.metadata,
          ...patch,
          weightClass: newWeight,
          updatedAt: new Date().toISOString(),
        },
        weightProfiles: updatedProfiles,
        glyphs: targetGlyphs,
        glyphHistories: {
          [state.activeUnicode]: {
            stack: [cloneVectorPaths(activePaths)],
            index: 0,
          },
        },
        history: [cloneVectorPaths(activePaths)],
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
    const freshGlyphs = cloneGlyphRecord(initialKannadaGlyphs);
    set({
      metadata: {
        ...DEFAULT_METADATA,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      glyphs: freshGlyphs,
      weightProfiles: { 400: cloneGlyphRecord(freshGlyphs) },
      activeUnicode: 'U+0C85',
      glyphHistories: {
        'U+0C85': { stack: [[]], index: 0 },
      },
      history: [[]],
      historyIndex: 0,
    });
  },

  serializeLipiProject: () => {
    const { metadata, glyphs, weightProfiles } = get();

    // Ensure current active weight profile is up-to-date
    const curWeight = metadata.weightClass || 400;
    const profilesCopy: Record<number, Record<string, GlyphData>> = {};
    for (const [w, gRecord] of Object.entries(weightProfiles)) {
      profilesCopy[Number(w)] = cloneGlyphRecord(gRecord);
    }
    profilesCopy[curWeight] = cloneGlyphRecord(glyphs);

    const payload: LipiFileSchema = {
      format: 'LIPI_PROJECT',
      schemaVersion: '1.1.0',
      metadata: {
        ...metadata,
        metrics: {
          ...DEFAULT_METRICS,
          ...(metadata.metrics || {}),
        },
        updatedAt: new Date().toISOString(),
      },
      glyphs: cloneGlyphRecord(glyphs),
      weightProfiles: profilesCopy,
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
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'Empty or invalid file content.' };
      }

      const parsed = JSON.parse(jsonString) as LipiFileSchema;

      // 1. Strict schema verification
      if (!parsed || typeof parsed !== 'object' || parsed.format !== 'LIPI_PROJECT') {
        return { success: false, error: 'Invalid file format: Not a recognized .lipi project file.' };
      }
      if (!parsed.glyphs || typeof parsed.glyphs !== 'object') {
        return { success: false, error: 'Corrupted .lipi file: Missing glyphs directory.' };
      }

      // 2. Validate and sanitize project metrics
      const rawMetrics = parsed.metadata?.metrics || {};
      const validatedMetrics: FontMetrics = {
        unitsPerEm: Number(rawMetrics.unitsPerEm) || DEFAULT_METRICS.unitsPerEm,
        ascender: Number(rawMetrics.ascender) || DEFAULT_METRICS.ascender,
        capHeight: Number(rawMetrics.capHeight) || DEFAULT_METRICS.capHeight,
        baseline: rawMetrics.baseline !== undefined ? Number(rawMetrics.baseline) : DEFAULT_METRICS.baseline,
        descender: rawMetrics.descender !== undefined ? Number(rawMetrics.descender) : DEFAULT_METRICS.descender,
        mahaprana: rawMetrics.mahaprana !== undefined ? Number(rawMetrics.mahaprana) : DEFAULT_METRICS.mahaprana,
        leftSideBearing: rawMetrics.leftSideBearing !== undefined ? Number(rawMetrics.leftSideBearing) : DEFAULT_METRICS.leftSideBearing,
        rightSideBearing: rawMetrics.rightSideBearing !== undefined ? Number(rawMetrics.rightSideBearing) : DEFAULT_METRICS.rightSideBearing,
      };

      // 3. Merge loaded glyphs safely over initialKannadaGlyphs so standard characters are never lost
      const mergedGlyphs: Record<string, GlyphData> = cloneGlyphRecord(initialKannadaGlyphs);
      for (const [unicode, glyph] of Object.entries(parsed.glyphs)) {
        if (!unicode || typeof glyph !== 'object') continue;

        const rawPaths = Array.isArray(glyph.paths) ? glyph.paths : [];
        const validatedPaths = rawPaths
          .filter((p) => p && typeof p === 'object' && typeof p.pathString === 'string')
          .map((p) => ({
            id: p.id || `restored_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            pathString: p.pathString,
            strokeWidth: Number(p.strokeWidth) || 16,
            strokeColor: p.strokeColor || '#0f172a',
            fillColor: p.fillColor || undefined,
            strokeLineCap: p.strokeLineCap || 'round',
            strokeLineJoin: p.strokeLineJoin || 'round',
            fabricJSON: p.fabricJSON,
          }));

        if (mergedGlyphs[unicode]) {
          mergedGlyphs[unicode] = {
            ...mergedGlyphs[unicode],
            ...glyph,
            unicode,
            paths: validatedPaths,
            advanceWidth: Number(glyph.advanceWidth) || mergedGlyphs[unicode].advanceWidth,
            isEdited: validatedPaths.length > 0,
            lastModified: glyph.lastModified || Date.now(),
          };
        } else {
          mergedGlyphs[unicode] = {
            unicode,
            character: glyph.character || '?',
            name: glyph.name || `GLYPH ${unicode}`,
            category: glyph.category || 'modifiers',
            paths: validatedPaths,
            advanceWidth: Number(glyph.advanceWidth) || 780,
            isEdited: validatedPaths.length > 0,
            lastModified: glyph.lastModified || Date.now(),
          };
        }
      }

      // 4. Validate and restore weight profiles
      const validatedProfiles: Record<number, Record<string, GlyphData>> = {};
      const currentWeight = Number(parsed.metadata?.weightClass) || 400;

      if (parsed.weightProfiles && typeof parsed.weightProfiles === 'object') {
        for (const [weightKey, profileGlyphs] of Object.entries(parsed.weightProfiles)) {
          const wNum = Number(weightKey);
          if (!isNaN(wNum) && profileGlyphs && typeof profileGlyphs === 'object') {
            const profileMerged = cloneGlyphRecord(initialKannadaGlyphs);
            for (const [u, g] of Object.entries(profileGlyphs)) {
              if (profileMerged[u] && g) {
                profileMerged[u] = {
                  ...profileMerged[u],
                  ...g,
                  paths: cloneVectorPaths(g.paths || []),
                  isEdited: (g.paths && g.paths.length > 0) || false,
                };
              }
            }
            validatedProfiles[wNum] = profileMerged;
          }
        }
      }

      if (!validatedProfiles[currentWeight]) {
        validatedProfiles[currentWeight] = cloneGlyphRecord(mergedGlyphs);
      }

      // 5. Initialize active character and clean per-glyph histories
      const activeUnicode = parsed.glyphs['U+0C85'] ? 'U+0C85' : Object.keys(mergedGlyphs)[0];
      const activeGlyph = mergedGlyphs[activeUnicode];
      const initialActivePaths = cloneVectorPaths(activeGlyph?.paths || []);

      const initializedHistories: Record<string, GlyphHistoryStack> = {};
      for (const [code, g] of Object.entries(mergedGlyphs)) {
        initializedHistories[code] = {
          stack: [cloneVectorPaths(g.paths || [])],
          index: 0,
        };
      }

      set({
        metadata: {
          ...DEFAULT_METADATA,
          ...(parsed.metadata || {}),
          metrics: validatedMetrics,
          weightClass: currentWeight,
          updatedAt: new Date().toISOString(),
        },
        glyphs: mergedGlyphs,
        weightProfiles: validatedProfiles,
        activeUnicode,
        glyphHistories: initializedHistories,
        history: [initialActivePaths],
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
