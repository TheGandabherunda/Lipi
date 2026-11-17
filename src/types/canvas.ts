export type CanvasTool = 'select' | 'direct-select' | 'pen' | 'brush' | 'eraser' | 'pan';

export type BrushTip = 'round' | 'calligraphy' | 'chisel';
export type PenMode = 'rounded' | 'sharp';
export type StrokeCap = 'round' | 'butt' | 'square';
export type StrokeJoin = 'round' | 'bevel' | 'miter';

export interface CanvasGuidelinesConfig {
  showAscender: boolean;
  showCapHeight: boolean;
  showBaseline: boolean;
  showDescender: boolean;
  showCenterVertical: boolean;
  showAdvanceWidth: boolean;
  showGrid: boolean;
  gridSize?: number;            // e.g. 10, 20, 50, 100 font units
  snapToGrid?: boolean;
  snapToGuidelines?: boolean;
  showRulers?: boolean;
}

export type TraceMode = 'outline' | 'fill' | 'both';
export type ReferenceComparisonMode = 'overlay' | 'side-by-side' | 'difference';

export interface TracingConfig {
  enabled: boolean;
  opacity: number;          // 0.05 to 1.0 (transparency slider)
  mode: TraceMode;          // 'outline' | 'fill' | 'both'
  outlineSize: number;      // Outline thickness e.g. 1 to 24
  fillSize: number;         // Fill density / size e.g. 1 to 24
  color?: string;           // Custom reference font color
  comparisonMode?: ReferenceComparisonMode;
}

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface SelectedStrokeProperties {
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  brushTip: BrushTip;
  opacity: number;
  angle: number | null;
}
