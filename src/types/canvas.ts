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
}

export type TraceMode = 'outline' | 'fill' | 'both';

export interface TracingConfig {
  enabled: boolean;
  opacity: number;          // 0.05 to 1.0 (transparency slider)
  mode: TraceMode;          // 'outline' | 'fill' | 'both'
  outlineSize: number;      // Outline thickness e.g. 1 to 24
  fillSize: number;         // Fill density / size e.g. 1 to 24
}

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}
