import React, { useState } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import {
  PenTool,
  Eraser,
  MousePointer,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Eye,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';

const COLOR_PRESETS = [
  { name: 'Ink Charcoal', hex: '#0f172a' },
  { name: 'Royal Indigo', hex: '#4338ca' },
  { name: 'Crimson Ink', hex: '#b91c1c' },
  { name: 'Forest Green', hex: '#15803d' },
  { name: 'Purple Ink', hex: '#7e22ce' },
];

export const CanvasToolbar: React.FC = () => {
  const [showGuidelinesMenu, setShowGuidelinesMenu] = useState(false);

  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const strokeWidth = useUIStore((s) => s.strokeWidth);
  const setStrokeWidth = useUIStore((s) => s.setStrokeWidth);
  const strokeColor = useUIStore((s) => s.strokeColor);
  const setStrokeColor = useUIStore((s) => s.setStrokeColor);
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const resetZoom = useUIStore((s) => s.resetZoom);
  const guidelines = useUIStore((s) => s.guidelines);
  const setGuidelines = useUIStore((s) => s.setGuidelines);

  const undo = useGlyphStore((s) => s.undo);
  const redo = useGlyphStore((s) => s.redo);
  const canUndo = useGlyphStore((s) => s.canUndo());
  const canRedo = useGlyphStore((s) => s.canRedo());
  const clearActiveGlyph = useGlyphStore((s) => s.clearActiveGlyph);

  return (
    <div className="h-12 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-20 select-none shadow-xs">
      {/* Left: Drawing Tools */}
      <div className="flex items-center gap-1.5">
        {/* Pen */}
        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          )}
          title="Pen Brush (Draw vector strokes)"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Pen</span>
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          )}
          title="Vector Eraser (Click or drag over paths to erase)"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Eraser</span>
        </button>

        {/* Select */}
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTool === 'select'
              ? 'bg-slate-800 text-white'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          )}
          title="Select & Move vector strokes"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Stroke Width Slider */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-600 font-medium">Width:</span>
          <input
            type="range"
            min="4"
            max="64"
            step="2"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <span className="font-mono-code text-[11px] text-slate-700 w-6 text-right font-semibold">
            {strokeWidth}
          </span>
        </div>

        {/* Color Presets */}
        <div className="flex items-center gap-1.5 ml-1">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => setStrokeColor(color.hex)}
              className={clsx(
                'w-5 h-5 rounded-full transition-all border cursor-pointer flex items-center justify-center',
                strokeColor === color.hex
                  ? 'scale-110 border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-slate-300 hover:scale-105'
              )}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {strokeColor === color.hex && (
                <Check className="w-3 h-3 text-white stroke-[3]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Guidelines Toggles */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowGuidelinesMenu(!showGuidelinesMenu)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
            showGuidelinesMenu
              ? 'bg-slate-100 border-slate-300 text-slate-900'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          )}
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <span>Kannada Guidelines</span>
        </button>

        {showGuidelinesMenu && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
              Typographic Guides
            </span>

            {[
              { key: 'showAscender', label: 'Ascender / Deergha (ದೀರ್ಘ)', color: 'text-rose-600' },
              { key: 'showCapHeight', label: 'Cap / Mean Line (ಶಿರೋರೇಖೆ)', color: 'text-sky-600' },
              { key: 'showBaseline', label: 'Baseline (ತಳರೇಖೆ)', color: 'text-emerald-600' },
              { key: 'showDescender', label: 'Descender / Ottakshara (ಒತ್ತಕ್ಷರ)', color: 'text-purple-600' },
              { key: 'showCenterVertical', label: 'Center Symmetry (ಕೇಂದ್ರ)', color: 'text-amber-600' },
              { key: 'showAdvanceWidth', label: 'Advance Width (LSB / RSB)', color: 'text-indigo-600' },
              { key: 'showGrid', label: 'Background Metric Grid', color: 'text-slate-500' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg"
              >
                <span className={clsx('font-medium', item.color)}>{item.label}</span>
                <input
                  type="checkbox"
                  checked={(guidelines as any)[item.key]}
                  onChange={(e) =>
                    setGuidelines({ [item.key]: e.target.checked } as any)
                  }
                  className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Right: History & Zoom */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={clsx(
            'p-1.5 rounded-lg transition-colors cursor-pointer',
            canUndo
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className={clsx(
            'p-1.5 rounded-lg transition-colors cursor-pointer',
            canRedo
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
          )}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={clearActiveGlyph}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          title="Clear current character drawing"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 px-1 py-0.5">
          <button
            type="button"
            onClick={() => setZoom(zoom - 0.1)}
            className="p-1 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono-code text-[11px] text-slate-700 w-11 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(zoom + 0.1)}
            className="p-1 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer ml-0.5"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
