import { create } from 'zustand';
import type { CanvasTool, BrushTip, PenMode, StrokeCap, StrokeJoin, CanvasGuidelinesConfig, TracingConfig } from '../types/canvas';
import type { KannadaCategory } from '../types/glyph';
import type { VectorGlyphOutline } from '../constants/kannadaVectorOutlines';
import { KANNADA_VECTOR_OUTLINES } from '../constants/kannadaVectorOutlines';

interface UIStoreState {
  // Illustration & Canvas Tools
  activeTool: CanvasTool;
  brushTip: BrushTip;
  penMode: PenMode;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  smoothing: number; // 0 (raw) to 100 (ultra smooth curves)
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  eraserSize: number;
  selectedObjectAngle: number | null;

  // Resizable Canvas & Splitter
  canvasWidth: number;
  canvasHeight: number;
  sidebarWidth: number;

  // Guidelines Toggles
  guidelines: CanvasGuidelinesConfig;

  // Clean Outline & Transparency (Tracing)
  tracing: TracingConfig;

  // Google Fonts & Reference Outlines
  selectedGoogleFont: string;
  activeOutlines: Record<string, VectorGlyphOutline>;
  isLoadingFont: boolean;

  // Viewport
  zoom: number;
  panX: number;
  panY: number;

  // Right Side Glyph Grid Filters
  categoryFilter: KannadaCategory | 'all';
  searchQuery: string;
  showOnlyEdited: boolean;

  // Modal Visibility
  isExportModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isHelpModalOpen: boolean;

  // Actions
  setActiveTool: (tool: CanvasTool) => void;
  setBrushTip: (tip: BrushTip) => void;
  setPenMode: (mode: PenMode) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setSmoothing: (smooth: number) => void;
  setStrokeCap: (cap: StrokeCap) => void;
  setStrokeJoin: (join: StrokeJoin) => void;
  setEraserSize: (size: number) => void;
  setSelectedObjectAngle: (angle: number | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  setSidebarWidth: (width: number) => void;
  setGuidelines: (patch: Partial<CanvasGuidelinesConfig>) => void;
  setTracingOpacity: (opacity: number) => void;
  toggleTracing: () => void;
  setTraceMode: (mode: 'outline' | 'fill' | 'both') => void;
  setOutlineSize: (size: number) => void;
  setFillSize: (size: number) => void;
  setSelectedGoogleFont: (fontId: string) => void;
  setActiveOutlines: (outlines: Record<string, VectorGlyphOutline>) => void;
  setIsLoadingFont: (loading: boolean) => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
  setPan: (x: number, y: number) => void;
  resetPan: () => void;
  setCategoryFilter: (cat: KannadaCategory | 'all') => void;
  setSearchQuery: (q: string) => void;
  setShowOnlyEdited: (show: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  activeTool: 'pen',
  brushTip: 'round',
  penMode: 'rounded',
  strokeWidth: 16,
  strokeColor: '#0f172a', // Rich charcoal ink
  fillColor: 'transparent',
  smoothing: 65, // Default balanced curve smoothing
  strokeCap: 'round',
  strokeJoin: 'round',
  eraserSize: 24,
  selectedObjectAngle: null,

  canvasWidth: 800,
  canvasHeight: 800,
  sidebarWidth: 380,

  guidelines: {
    showAscender: true,
    showCapHeight: true,
    showBaseline: true,
    showDescender: true,
    showCenterVertical: true,
    showAdvanceWidth: true,
    showGrid: true,
  },

  // Tracing options: outline only, fill only, both, plus outline and fill sizes
  tracing: {
    enabled: true,
    opacity: 0.35,
    mode: 'outline',
    outlineSize: 2,
    fillSize: 10,
  },

  selectedGoogleFont: 'noto-sans-kannada',
  activeOutlines: KANNADA_VECTOR_OUTLINES,
  isLoadingFont: false,

  zoom: 1,
  panX: 0,
  panY: 0,

  categoryFilter: 'all',
  searchQuery: '',
  showOnlyEdited: false,

  isExportModalOpen: false,
  isSettingsModalOpen: false,
  isHelpModalOpen: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushTip: (tip) => set({ brushTip: tip }),
  setPenMode: (penMode) => set({ penMode }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setSmoothing: (smoothing) => set({ smoothing }),
  setStrokeCap: (strokeCap) => set({ strokeCap }),
  setStrokeJoin: (strokeJoin) => set({ strokeJoin }),
  setEraserSize: (eraserSize) => set({ eraserSize }),
  setSelectedObjectAngle: (selectedObjectAngle) => set({ selectedObjectAngle }),
  setCanvasSize: (w, h) => set({
    canvasWidth: Math.max(480, Math.min(1400, w)),
    canvasHeight: Math.max(480, Math.min(1400, h)),
  }),
  setSidebarWidth: (sidebarWidth) => set({
    sidebarWidth: Math.max(280, Math.min(650, sidebarWidth)),
  }),
  setGuidelines: (patch) => set((s) => ({ guidelines: { ...s.guidelines, ...patch } })),
  setTracingOpacity: (opacity) => set((s) => ({ tracing: { ...s.tracing, opacity } })),
  toggleTracing: () => set((s) => ({ tracing: { ...s.tracing, enabled: !s.tracing.enabled } })),
  setTraceMode: (mode) => set((s) => ({ tracing: { ...s.tracing, mode } })),
  setOutlineSize: (outlineSize) => set((s) => ({ tracing: { ...s.tracing, outlineSize } })),
  setFillSize: (fillSize) => set((s) => ({ tracing: { ...s.tracing, fillSize } })),
  setSelectedGoogleFont: (fontId) => set({ selectedGoogleFont: fontId }),
  setActiveOutlines: (activeOutlines) => set({ activeOutlines }),
  setIsLoadingFont: (isLoadingFont) => set({ isLoadingFont }),
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(3, zoom)) }),
  resetZoom: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setPan: (panX, panY) => set({ panX, panY }),
  resetPan: () => set({ panX: 0, panY: 0 }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowOnlyEdited: (showOnlyEdited) => set({ showOnlyEdited }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setSettingsModalOpen: (isSettingsModalOpen) => set({ isSettingsModalOpen }),
  setHelpModalOpen: (isHelpModalOpen) => set({ isHelpModalOpen }),
}));
