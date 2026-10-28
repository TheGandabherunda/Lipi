import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGlyphStore } from '../../store/glyphStore';
import type { CanvasTool } from '../../types/canvas';
import {
  MousePointer,
  MousePointer2,
  PenTool,
  Paintbrush,
  Eraser,
  Hand,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  Spline,
  Square,
  RotateCcw,
  Check,
  X,
  Palette,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { clsx } from 'clsx';

const COLOR_PRESETS = [
  { name: 'Charcoal Ink', hex: '#0f172a' },
  { name: 'Royal Indigo', hex: '#4338ca' },
  { name: 'Crimson Ink', hex: '#b91c1c' },
  { name: 'Forest Green', hex: '#15803d' },
  { name: 'Purple Ink', hex: '#7e22ce' },
  { name: 'Warm Amber', hex: '#d97706' },
];

const WEIGHT_PRESETS = [4, 8, 16, 24, 32, 48];
const SMOOTH_PRESETS = [
  { label: 'Crisp', val: 20 },
  { label: 'Smooth', val: 65 },
  { label: 'Ultra', val: 90 },
];

export const LeftIllustrationToolbar: React.FC = () => {
  // Flyout opens right next to the rail
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(true);
  const [showColorPopover, setShowColorPopover] = useState(false);

  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const strokeWidth = useUIStore((s) => s.strokeWidth);
  const setStrokeWidth = useUIStore((s) => s.setStrokeWidth);
  const strokeColor = useUIStore((s) => s.strokeColor);
  const setStrokeColor = useUIStore((s) => s.setStrokeColor);
  const strokeCap = useUIStore((s) => s.strokeCap);
  const setStrokeCap = useUIStore((s) => s.setStrokeCap);
  const strokeJoin = useUIStore((s) => s.strokeJoin);
  const setStrokeJoin = useUIStore((s) => s.setStrokeJoin);
  const smoothing = useUIStore((s) => s.smoothing);
  const setSmoothing = useUIStore((s) => s.setSmoothing);
  const brushTip = useUIStore((s) => s.brushTip);
  const setBrushTip = useUIStore((s) => s.setBrushTip);
  const penMode = useUIStore((s) => s.penMode);
  const setPenMode = useUIStore((s) => s.setPenMode);
  const eraserSize = useUIStore((s) => s.eraserSize);
  const setEraserSize = useUIStore((s) => s.setEraserSize);
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const resetZoom = useUIStore((s) => s.resetZoom);
  const selectedObjectAngle = useUIStore((s) => s.selectedObjectAngle);

  const undo = useGlyphStore((s) => s.undo);
  const redo = useGlyphStore((s) => s.redo);
  const canUndo = useGlyphStore((s) => s.canUndo());
  const canRedo = useGlyphStore((s) => s.canRedo());
  const clearActiveGlyph = useGlyphStore((s) => s.clearActiveGlyph);

  const dispatchNodeAction = (action: string) => {
    window.dispatchEvent(new CustomEvent('lipi:node-action', { detail: { action } }));
  };

  const handleToolSelect = (toolId: CanvasTool) => {
    setActiveTool(toolId);
    setIsFlyoutOpen(true);
  };

  const TOOLS: { id: CanvasTool; icon: React.FC<{ className?: string }>; label: string; shortcut: string }[] = [
    { id: 'select', icon: MousePointer, label: 'Selection Tool (Transform & Move)', shortcut: 'V' },
    { id: 'direct-select', icon: MousePointer2, label: 'Direct Selection (Anchor & Bézier handles)', shortcut: 'A' },
    { id: 'pen', icon: PenTool, label: 'Pen Tool (Precision Bézier curves)', shortcut: 'P' },
    { id: 'brush', icon: Paintbrush, label: 'Art Brush Tool (Freehand smooth curves)', shortcut: 'B' },
    { id: 'eraser', icon: Eraser, label: 'Vector Eraser (Cut & trim strokes)', shortcut: 'E' },
    { id: 'pan', icon: Hand, label: 'Pan Canvas (or hold Spacebar)', shortcut: 'H' },
  ];

  return (
    <aside className="relative flex h-full z-30 select-none">
      {/* 1. PRIMARY COMPACT VERTICAL TOOL RAIL - Vertically Centered in Middle */}
      <div className="w-14 h-full bg-white border-r border-slate-200/90 flex flex-col items-center justify-center py-4 select-none shadow-xs z-30">
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5 my-auto">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToolSelect(t.id)}
                className={clsx(
                  'group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
                title={`${t.label} [${t.shortcut}]`}
              >
                <Icon className={clsx('w-4.5 h-4.5 stroke-[2.2]', t.id === 'direct-select' && !isActive && 'fill-slate-100 stroke-slate-700')} />
                <span className="absolute -top-1 -right-1 text-[8px] font-mono-code opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1 rounded z-40">
                  {t.shortcut}
                </span>
              </button>
            );
          })}

          <div className="w-8 h-px bg-slate-200 my-0.5" />

          {/* Options Flyout Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
            className={clsx(
              'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
              isFlyoutOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
            title={isFlyoutOpen ? 'Hide Tool Options Panel' : 'Show Tool Options Panel'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span
              className={clsx(
                'absolute -bottom-0.5 w-1.5 h-1.5 rounded-full transition-all',
                isFlyoutOpen ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'
              )}
            />
          </button>

          {/* Color Swatch Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPopover(!showColorPopover);
                setIsFlyoutOpen(false);
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 hover:border-slate-300 transition-all cursor-pointer relative shadow-2xs group"
              title="Stroke Color Palette"
            >
              <div
                className="w-5.5 h-5.5 rounded-lg border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                style={{ backgroundColor: strokeColor }}
              />
            </button>

            {/* Color Swatches Popover */}
            {showColorPopover && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 w-52 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    Color Swatches
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowColorPopover(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => {
                        setStrokeColor(color.hex);
                        setShowColorPopover(false);
                      }}
                      className={clsx(
                        'w-12 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 border cursor-pointer',
                        strokeColor === color.hex ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {strokeColor === color.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-slate-200 my-0.5" />

          {/* Undo, Redo, Clear */}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer',
              canUndo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer',
              canRedo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={clearActiveGlyph}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Clear active glyph strokes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. REFINED CONTEXTUAL TOOL OPTIONS FLYOUT (Opens right to it, aligned in the middle!) */}
      {isFlyoutOpen && (
        <div className="absolute left-16 top-1/2 -translate-y-1/2 z-40 w-76 max-h-[88vh] overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-left-2 duration-150 select-none">
          {/* Header with Tool Name & Close Button */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                {activeTool === 'brush' && <Paintbrush className="w-3.5 h-3.5" />}
                {activeTool === 'pen' && <PenTool className="w-3.5 h-3.5" />}
                {activeTool === 'direct-select' && <MousePointer2 className="w-3.5 h-3.5" />}
                {activeTool === 'select' && <MousePointer className="w-3.5 h-3.5" />}
                {activeTool === 'eraser' && <Eraser className="w-3.5 h-3.5" />}
                {activeTool === 'pan' && <Hand className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-bold text-slate-800">
                {activeTool === 'brush' && 'Brush Studio'}
                {activeTool === 'pen' && 'Pen Tool Properties'}
                {activeTool === 'direct-select' && 'Anchor & Node Editor'}
                {activeTool === 'select' && 'Selection & Stroke'}
                {activeTool === 'eraser' && 'Vector Eraser'}
                {activeTool === 'pan' && 'Canvas Navigation'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFlyoutOpen(false)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ======================================================== */}
          {/* TOOL 1: BRUSH TOOL OPTIONS */}
          {/* ======================================================== */}
          {activeTool === 'brush' && (
            <div className="flex flex-col gap-3.5">
              {/* Stroke Width Slider with Visual Circle Preview */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Stroke Size</span>
                  <div className="flex items-center gap-2">
                    {/* Real-time miniature circle preview */}
                    <div
                      className="rounded-full border border-slate-400 bg-slate-900 shrink-0"
                      style={{
                        width: Math.min(24, Math.max(3, strokeWidth / 2)),
                        height: Math.min(24, Math.max(3, strokeWidth / 2)),
                        backgroundColor: strokeColor,
                      }}
                      title={`Physical stroke thickness: ${strokeWidth}px`}
                    />
                    <span className="text-[11px] font-mono-code font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {strokeWidth}px
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="2"
                  max="64"
                  step="2"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {WEIGHT_PRESETS.map((px) => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => setStrokeWidth(px)}
                      className={clsx(
                        'py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer text-center',
                        strokeWidth === px
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {px}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curve Smoothing Slider */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Curve Smoothing
                  </span>
                  <span className="text-[11px] font-mono-code font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {smoothing}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={smoothing}
                  onChange={(e) => setSmoothing(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                {/* Smoothing Presets */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {SMOOTH_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSmoothing(p.val)}
                      className={clsx(
                        'py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer text-center',
                        smoothing === p.val
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {p.label} ({p.val}%)
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Automatically stabilizes hand movements for clean, vector-ready curves.
                </span>
              </div>

              {/* Brush Tip Style */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700">Brush Style</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['round', 'calligraphy', 'chisel'] as const).map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => setBrushTip(tip)}
                      className={clsx(
                        'py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer capitalize text-center',
                        brushTip === tip
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {tip === 'round' ? 'Round' : tip === 'calligraphy' ? 'Calligraphy 45°' : 'Chisel 90°'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Swatches */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700">Ink Color</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStrokeColor(c.hex)}
                      className={clsx(
                        'h-6 rounded-lg transition-transform hover:scale-110 border cursor-pointer flex items-center justify-center',
                        strokeColor === c.hex ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-200'
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {strokeColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TOOL 2: PEN TOOL OPTIONS */}
          {/* ======================================================== */}
          {activeTool === 'pen' && (
            <div className="flex flex-col gap-3.5">
              {/* Pen Mode: Round vs Sharp */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-700">Pen Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPenMode('rounded')}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-0.5',
                      penMode === 'rounded'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>Smooth Bézier</span>
                    <span className="text-[9px] font-normal opacity-80">Smooth Curves</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPenMode('sharp')}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-0.5',
                      penMode === 'sharp'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>Sharp Corners</span>
                    <span className="text-[9px] font-normal opacity-80">Straight Lines</span>
                  </button>
                </div>
              </div>

              {/* Stroke Width Slider */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Stroke Width</span>
                  <span className="text-[11px] font-mono-code font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {strokeWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="64"
                  step="2"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {WEIGHT_PRESETS.map((px) => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => setStrokeWidth(px)}
                      className={clsx(
                        'py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer text-center',
                        strokeWidth === px
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {px}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stroke Caps & Corner Joins */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-700">End Caps</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['round', 'butt', 'square'] as const).map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setStrokeCap(cap)}
                        className={clsx(
                          'py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer capitalize text-center',
                          strokeCap === cap
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {cap === 'round' ? 'Rounded' : cap}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-700">Corner Joins</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['round', 'miter', 'bevel'] as const).map((join) => (
                      <button
                        key={join}
                        type="button"
                        onClick={() => setStrokeJoin(join)}
                        className={clsx(
                          'py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer capitalize text-center',
                          strokeJoin === join
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {join === 'round' ? 'Rounded' : join}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 flex flex-col gap-1">
                <span className="font-bold text-slate-700">Illustrator Pen Tips:</span>
                <span>• Click to place anchor point</span>
                <span>• Click & drag to pull out Bézier curve handles</span>
                <span>• Click on the first anchor point to close loop</span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TOOL 3: DIRECT SELECTION (NODE EDITING) */}
          {/* ======================================================== */}
          {activeTool === 'direct-select' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800">
                <span className="font-bold">Direct Selection Active:</span>
                <p className="text-[10px] text-sky-700 mt-0.5">
                  Click on any anchor node or Bézier handle on the canvas to move and adjust curve curvature.
                </p>
              </div>

              {/* Node Operations */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-700">Convert Selected Node</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => dispatchNodeAction('smooth')}
                    className="py-2 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Convert selected node to Smooth Bézier curve"
                  >
                    <Spline className="w-4 h-4 text-sky-600" />
                    <span>Smooth Curve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => dispatchNodeAction('corner')}
                    className="py-2 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Convert selected node to sharp Corner"
                  >
                    <Square className="w-4 h-4 text-sky-600" />
                    <span>Sharp Corner</span>
                  </button>
                </div>
              </div>

              {/* Additional Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => dispatchNodeAction('delete')}
                  className="flex-1 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete selected anchor node (Delete / Backspace)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Node</span>
                </button>

                <button
                  type="button"
                  onClick={() => dispatchNodeAction('reverse')}
                  className="flex-1 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Reverse contour direction (TrueType winding)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reverse Path</span>
                </button>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700">Shortcuts:</span>
                <div>• Arrow keys: nudge selected node 1px</div>
                <div>• Shift + Arrow: nudge 10px</div>
                <div>• Alt + Drag handle: break handle angle</div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TOOL 4: SELECTION TOOL OPTIONS */}
          {/* ======================================================== */}
          {activeTool === 'select' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Transform & Edit:</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click any stroke on the canvas to move, rotate, resize, or adjust its stroke properties live.
                </p>
              </div>

              {/* Selected Stroke Width Adjuster */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Selected Stroke Width</span>
                  <span className="text-[11px] font-mono-code font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {strokeWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="64"
                  step="2"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {WEIGHT_PRESETS.map((px) => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => setStrokeWidth(px)}
                      className={clsx(
                        'py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer text-center',
                        strokeWidth === px
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {px}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches for Selection */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700">Stroke Color</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStrokeColor(c.hex)}
                      className={clsx(
                        'h-6 rounded-lg transition-transform hover:scale-110 border cursor-pointer flex items-center justify-center',
                        strokeColor === c.hex ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-200'
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {strokeColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation Angle Badge */}
              {selectedObjectAngle !== null && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="font-bold text-amber-800">Rotation Angle</span>
                  <span className="font-mono-code font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    {selectedObjectAngle}°
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TOOL 5: ERASER TOOL OPTIONS */}
          {/* ======================================================== */}
          {activeTool === 'eraser' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Eraser Diameter</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-full border border-rose-400 bg-rose-500/20 shrink-0"
                      style={{
                        width: Math.min(24, Math.max(4, eraserSize / 2)),
                        height: Math.min(24, Math.max(4, eraserSize / 2)),
                      }}
                    />
                    <span className="text-[11px] font-mono-code font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {eraserSize}px
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="8"
                  max="64"
                  step="4"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[12, 24, 40, 56].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setEraserSize(sz)}
                      className={clsx(
                        'py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer text-center',
                        eraserSize === sz
                          ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700">Eraser Action:</span>
                <p className="mt-0.5">
                  Click and drag across any vector stroke on the canvas to slice and erase path segments.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TOOL 6: PAN / ZOOM OPTIONS */}
          {/* ======================================================== */}
          {activeTool === 'pan' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Pan & Zoom:</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click & drag to pan the canvas viewport. Hold Spacebar at any time with any tool to pan temporarily.
                </p>
              </div>

              {/* Zoom Controls */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Canvas Zoom</span>
                  <span className="text-[11px] font-mono-code font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom(Math.max(0.3, Math.round((zoom - 0.15) * 100) / 100))}
                    className="py-1.5 px-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Zoom Out (Ctrl -)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoom(Math.min(3, Math.round((zoom + 0.15) * 100) / 100))}
                    className="py-1.5 px-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Zoom In (Ctrl +)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>In</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetZoom}
                    className="py-1.5 px-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer hover:bg-indigo-100"
                    title="Reset to 100% (Ctrl 0)"
                  >
                    <span>100%</span>
                  </button>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700">Shortcuts:</span>
                <div>• Ctrl + Plus: Zoom In</div>
                <div>• Ctrl + Minus: Zoom Out</div>
                <div>• Ctrl + 0: Reset 100%</div>
                <div>• Ctrl + Mouse Wheel: Smooth Zoom</div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
