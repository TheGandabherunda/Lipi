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
  weightProfileHistories: Record<number, Record<string, GlyphHistoryStack>>;
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
  updateGlyphPaths: (unicode: string, paths: VectorPathData[], recordHistory?: boolean) => void;
  updateAdvanceWidth: (unicode: string, width: number) => void;
  clearActiveGlyph: () => void;

  // History Operations
  undo: () => void;
  redo: () => void;
  canUndo: (unicode?: string) => boolean;
  canRedo: (unicode?: string) => boolean;

  // Project Actions
  projectRevision: number;
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

/**
 * Validates and safely repairs font metrics from arbitrary JSON or user input.
 * Guarantees zero NaNs, positive UPM, and strict ascender > descender ordering.
 */
export function sanitizeMetrics(raw: any): FontMetrics {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_METRICS };
  }

  const parseNum = (val: any, fallback: number, min?: number, max?: number): number => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    let res = n;
    if (min !== undefined) res = Math.max(min, res);
    if (max !== undefined) res = Math.min(max, res);
    return res;
  };

  const unitsPerEm = parseNum(raw.unitsPerEm, DEFAULT_METRICS.unitsPerEm, 16, 16384);
  let ascender = parseNum(raw.ascender, DEFAULT_METRICS.ascender, -5000, 10000);
  let descender = parseNum(raw.descender, DEFAULT_METRICS.descender, -5000, 5000);
  const capHeight = parseNum(raw.capHeight, DEFAULT_METRICS.capHeight, -5000, 10000);
  const baseline = parseNum(raw.baseline, DEFAULT_METRICS.baseline, -2000, 2000);
  const mahaprana = parseNum(raw.mahaprana, DEFAULT_METRICS.mahaprana ?? -144, -5000, 5000);
  const leftSideBearing = parseNum(raw.leftSideBearing, DEFAULT_METRICS.leftSideBearing ?? 50, 0, 2500);
  const rightSideBearing = parseNum(raw.rightSideBearing, DEFAULT_METRICS.rightSideBearing ?? 50, 0, 2500);

  // Consistency repair: ascender must be strictly above descender
  if (ascender <= descender) {
    ascender = DEFAULT_METRICS.ascender;
    descender = DEFAULT_METRICS.descender;
  }

  return {
    unitsPerEm,
    ascender,
    capHeight,
    baseline,
    descender,
    mahaprana,
    leftSideBearing,
    rightSideBearing,
  };
}

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

export function pathsAreEqual(a?: VectorPathData[], b?: VectorPathData[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      p1.pathString !== p2.pathString ||
      p1.strokeWidth !== p2.strokeWidth ||
      p1.strokeColor !== p2.strokeColor ||
      p1.fillColor !== p2.fillColor ||
      p1.strokeLineCap !== p2.strokeLineCap ||
      p1.strokeLineJoin !== p2.strokeLineJoin
    ) {
      return false;
    }
  }
  return true;
}

const initialHistories: Record<string, GlyphHistoryStack> = {};
for (const code of Object.keys(initialClonedGlyphs)) {
  initialHistories[code] = { stack: [[]], index: 0 };
}

export type CanvasFlusher = (targetUnicode: string) => void;
let registeredCanvasFlusher: CanvasFlusher | null = null;

export function registerCanvasFlusher(flusher: CanvasFlusher | null) {
  registeredCanvasFlusher = flusher;
}

export const useGlyphStore = create<GlyphStoreState>((set, get) => ({
  metadata: DEFAULT_METADATA,
  glyphs: initialClonedGlyphs,
  weightProfiles: { 400: cloneGlyphRecord(initialClonedGlyphs) },
  weightProfileHistories: {
    400: initialHistories,
  },
  activeUnicode: 'U+0C85', // Default: 'ಅ'
  glyphHistories: initialHistories,
  history: [[]],
  historyIndex: 0,
  projectRevision: 0,
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
    const { activeUnicode } = get();
    if (unicode === activeUnicode) return;

    // 1. Flush outgoing glyph before switching activeUnicode
    if (registeredCanvasFlusher) {
      try {
        registeredCanvasFlusher(activeUnicode);
      } catch (err) {
        console.warn('Failed to flush outgoing glyph before switch:', err);
      }
    }

    const refreshedState = get();
    const targetGlyph = refreshedState.glyphs[unicode];
    if (!targetGlyph) return;

    // Retrieve or initialize the per-glyph history stack for this specific character
    let targetHistory = refreshedState.glyphHistories[unicode];
    if (!targetHistory || !targetHistory.stack || targetHistory.stack.length === 0) {
      targetHistory = {
        stack: [cloneVectorPaths(targetGlyph.paths || [])],
        index: 0,
      };
    }

    set({
      activeUnicode: unicode,
      glyphHistories: {
        ...refreshedState.glyphHistories,
        [unicode]: targetHistory,
      },
      history: targetHistory.stack.map((entry) => cloneVectorPaths(entry)),
      historyIndex: targetHistory.index,
    });
  },

  updateGlyphPaths: (unicode: string, paths: VectorPathData[], recordHistory = true) => {
    const { glyphs, glyphHistories, activeUnicode } = get();
    const targetGlyph = glyphs[unicode];
    if (!targetGlyph) return;

    const clonedPaths = cloneVectorPaths(paths);
    const isEdited = clonedPaths.length > 0;
    const updatedGlyphs = {
      ...glyphs,
      [unicode]: {
        ...targetGlyph,
        paths: cloneVectorPaths(clonedPaths),
        isEdited,
        lastModified: Date.now(),
      },
    };

    if (!recordHistory) {
      set({ glyphs: updatedGlyphs });
      return;
    }

    // Retrieve or initialize current history for this specific glyph
    const targetHistory = glyphHistories[unicode] || {
      stack: [cloneVectorPaths(targetGlyph.paths || [])],
      index: 0,
    };

    // If new paths are identical to top-of-stack, do not push redundant duplicate
    const currentTop = targetHistory.stack[targetHistory.index];
    if (currentTop && pathsAreEqual(currentTop, clonedPaths)) {
      set({ glyphs: updatedGlyphs });
      return;
    }

    // Truncate redo states and push new state
    const newStack = targetHistory.stack
      .slice(0, targetHistory.index + 1)
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

    const updatedHistories = {
      ...glyphHistories,
      [unicode]: updatedStackEntry,
    };

    if (unicode === activeUnicode) {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
        history: newStack.map((entry) => cloneVectorPaths(entry)),
        historyIndex: updatedStackEntry.index,
      });
    } else {
      set({
        glyphs: updatedGlyphs,
        glyphHistories: updatedHistories,
      });
    }
  },

  updateActiveGlyphPaths: (paths: VectorPathData[], recordHistory = true) => {
    const { activeUnicode } = get();
    get().updateGlyphPaths(activeUnicode, paths, recordHistory);
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
      history: activeHistory.stack.map((entry) => cloneVectorPaths(entry)),
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
      history: activeHistory.stack.map((entry) => cloneVectorPaths(entry)),
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

      // Archive current glyphHistories into old weight profile
      const updatedProfileHistories: Record<number, Record<string, GlyphHistoryStack>> = {
        ...(state.weightProfileHistories || {}),
      };
      const clonedOldHistories: Record<string, GlyphHistoryStack> = {};
      for (const [code, hist] of Object.entries(state.glyphHistories)) {
        clonedOldHistories[code] = {
          stack: hist.stack.map((s) => cloneVectorPaths(s)),
          index: hist.index,
        };
      }
      updatedProfileHistories[oldWeight] = clonedOldHistories;

      // 2. Retrieve or initialize glyphs for target weight safely
      let targetGlyphs = updatedProfiles[newWeight];
      if (!targetGlyphs) {
        targetGlyphs = cloneGlyphRecord(initialKannadaGlyphs);
        updatedProfiles[newWeight] = targetGlyphs;
      } else {
        targetGlyphs = cloneGlyphRecord(targetGlyphs);
      }

      // Retrieve or initialize glyphHistories for target weight
      let targetHistories = updatedProfileHistories[newWeight];
      if (!targetHistories) {
        targetHistories = {};
        for (const [code, g] of Object.entries(targetGlyphs)) {
          targetHistories[code] = {
            stack: [cloneVectorPaths(g.paths || [])],
            index: 0,
          };
        }
        updatedProfileHistories[newWeight] = targetHistories;
      } else {
        const clonedTargetHistories: Record<string, GlyphHistoryStack> = {};
        for (const [code, hist] of Object.entries(targetHistories)) {
          clonedTargetHistories[code] = {
            stack: hist.stack.map((s) => cloneVectorPaths(s)),
            index: hist.index,
          };
        }
        targetHistories = clonedTargetHistories;
      }

      let activeHistory = targetHistories[state.activeUnicode];
      if (!activeHistory) {
        const activePaths = targetGlyphs[state.activeUnicode]?.paths || [];
        activeHistory = {
          stack: [cloneVectorPaths(activePaths)],
          index: 0,
        };
        targetHistories[state.activeUnicode] = activeHistory;
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

      set({
        metadata: {
          ...state.metadata,
          ...patch,
          weightClass: newWeight,
          updatedAt: new Date().toISOString(),
        },
        weightProfiles: updatedProfiles,
        weightProfileHistories: updatedProfileHistories,
        glyphs: targetGlyphs,
        glyphHistories: targetHistories,
        history: activeHistory.stack.map((s) => cloneVectorPaths(s)),
        historyIndex: activeHistory.index,
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
    const freshHistories: Record<string, GlyphHistoryStack> = {};
    for (const code of Object.keys(freshGlyphs)) {
      freshHistories[code] = { stack: [[]], index: 0 };
    }

    set({
      metadata: {
        ...DEFAULT_METADATA,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      glyphs: freshGlyphs,
      weightProfiles: { 400: cloneGlyphRecord(freshGlyphs) },
      weightProfileHistories: {
        400: freshHistories,
      },
      activeUnicode: 'U+0C85',
      glyphHistories: freshHistories,
      history: [[]],
      historyIndex: 0,
      projectRevision: (get().projectRevision || 0) + 1,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lipi:project-loaded'));
    }
  },

  serializeLipiProject: () => {
    const { metadata, glyphs, weightProfiles, glyphHistories } = get();

    // Ensure current active weight profile is up-to-date
    const curWeight = metadata.weightClass || 400;
    const profilesCopy: Record<number, Record<string, GlyphData>> = {};
    for (const [w, gRecord] of Object.entries(weightProfiles)) {
      profilesCopy[Number(w)] = cloneGlyphRecord(gRecord);
    }
    profilesCopy[curWeight] = cloneGlyphRecord(glyphs);

    // Deep clone per-glyph histories for persistence
    const serializedHistories: Record<string, { stack: VectorPathData[][]; index: number }> = {};
    for (const [u, h] of Object.entries(glyphHistories)) {
      if (h && Array.isArray(h.stack)) {
        serializedHistories[u] = {
          stack: h.stack.map((entry) => cloneVectorPaths(entry)),
          index: h.index,
        };
      }
    }

    const payload: LipiFileSchema = {
      format: 'LIPI_PROJECT',
      schemaVersion: '1.1.0',
      metadata: {
        ...metadata,
        metrics: sanitizeMetrics(metadata.metrics),
        updatedAt: new Date().toISOString(),
      },
      glyphs: cloneGlyphRecord(glyphs),
      weightProfiles: profilesCopy,
      glyphHistories: serializedHistories,
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

      // 2. Validate and sanitize project metrics (strictly guarantees zero NaNs, positive UPM, ascender > descender)
      const validatedMetrics = sanitizeMetrics(parsed.metadata?.metrics);

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

      // 5. Initialize active character and restore or create per-glyph histories
      const activeUnicode = parsed.glyphs['U+0C85'] ? 'U+0C85' : Object.keys(mergedGlyphs)[0];
      const activeGlyph = mergedGlyphs[activeUnicode];

      const restoredHistories: Record<string, GlyphHistoryStack> = {};
      const savedHistories = parsed.glyphHistories && typeof parsed.glyphHistories === 'object'
        ? parsed.glyphHistories
        : {};

      for (const [code, g] of Object.entries(mergedGlyphs)) {
        const saved = savedHistories[code];
        if (saved && Array.isArray(saved.stack) && saved.stack.length > 0) {
          const validatedStack = saved.stack.map((rawPaths) => {
            if (!Array.isArray(rawPaths)) return [];
            return rawPaths
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
          });
          const safeIndex = typeof saved.index === 'number'
            ? Math.max(0, Math.min(validatedStack.length - 1, Math.floor(saved.index)))
            : validatedStack.length - 1;

          restoredHistories[code] = {
            stack: validatedStack.length > 0 ? validatedStack : [cloneVectorPaths(g.paths || [])],
            index: safeIndex,
          };
        } else {
          restoredHistories[code] = {
            stack: [cloneVectorPaths(g.paths || [])],
            index: 0,
          };
        }
      }

      const activeHistory = restoredHistories[activeUnicode] || {
        stack: [cloneVectorPaths(activeGlyph?.paths || [])],
        index: 0,
      };

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
        weightProfileHistories: {
          [currentWeight]: restoredHistories,
        },
        activeUnicode,
        glyphHistories: restoredHistories,
        history: activeHistory.stack.map((entry) => cloneVectorPaths(entry)),
        historyIndex: activeHistory.index,
        projectRevision: (get().projectRevision || 0) + 1,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lipi:project-loaded'));
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse .lipi file: ${err instanceof Error ? err.message : 'Unknown JSON syntax error'}`,
      };
    }
  },
}));
