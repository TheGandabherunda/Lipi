import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import {
  Grid,
  Magnet,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

const GRID_SIZE_PRESETS = [16, 24, 32, 48, 64];

export const CanvasGridSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const guidelines = useUIStore((s) => s.guidelines);
  const setGuidelines = useUIStore((s) => s.setGuidelines);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentGridSize = guidelines.gridSize || 32;

  return (
    <div ref={popoverRef} className="relative z-30 select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs',
          isOpen || guidelines.snapToGrid || guidelines.snapToGuidelines
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : 'bg-white/90 hover:bg-white border-slate-200 text-slate-700'
        )}
        title="Canvas Grid, Snapping & Guidelines"
      >
        <Grid className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline">Grid & Snap</span>
        <ChevronDown className={clsx('w-3 h-3 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-72 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3.5 flex flex-col gap-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-indigo-600" />
              Grid, Guides & Snapping
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grid Visibility & Size */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-slate-500" />
                Background Grid
              </span>
              <button
                type="button"
                onClick={() => setGuidelines({ showGrid: !guidelines.showGrid })}
                className={clsx(
                  'px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                  guidelines.showGrid
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                )}
              >
                {guidelines.showGrid ? 'Visible' : 'Hidden'}
              </button>
            </div>

            {guidelines.showGrid && (
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Pitch:</span>
                {GRID_SIZE_PRESETS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGuidelines({ gridSize: size })}
                    className={clsx(
                      'px-2 py-0.5 rounded-md text-[11px] font-mono-code transition-all cursor-pointer border',
                      currentGridSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Snapping Controls */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Magnet className="w-3 h-3 text-indigo-500" />
              Magnetic Snapping
            </span>

            {/* Snap to Grid */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Snap to Grid</span>
                <span className="text-[10px] text-slate-400">Lock nodes to {currentGridSize}px intervals</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(guidelines.snapToGrid)}
                onChange={(e) => setGuidelines({ snapToGrid: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            {/* Snap to Guidelines */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Snap to Typographic Guides</span>
                <span className="text-[10px] text-slate-400">Snap to Ascender, Body, Base & Bearings</span>
              </div>
              <input
                type="checkbox"
                checked={guidelines.snapToGuidelines !== false}
                onChange={(e) => setGuidelines({ snapToGuidelines: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Guidelines Visibility */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Typographic Guides
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setGuidelines({ showAscender: !guidelines.showAscender })}
                className={clsx(
                  'px-2 py-1 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors',
                  guidelines.showAscender
                    ? 'border-rose-200 bg-rose-50/50 text-rose-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                )}
              >
                <span>Ascender (+790)</span>
                {guidelines.showAscender && <Check className="w-3 h-3 text-rose-600" />}
              </button>

              <button
                type="button"
                onClick={() => setGuidelines({ showCapHeight: !guidelines.showCapHeight })}
                className={clsx(
                  'px-2 py-1 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors',
                  guidelines.showCapHeight
                    ? 'border-sky-200 bg-sky-50/50 text-sky-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                )}
              >
                <span>Body / Mean (+565)</span>
                {guidelines.showCapHeight && <Check className="w-3 h-3 text-sky-600" />}
              </button>

              <button
                type="button"
                onClick={() => setGuidelines({ showBaseline: !guidelines.showBaseline })}
                className={clsx(
                  'px-2 py-1 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors',
                  guidelines.showBaseline
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                )}
              >
                <span>Baseline (0)</span>
                {guidelines.showBaseline && <Check className="w-3 h-3 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setGuidelines({ showDescender: !guidelines.showDescender })}
                className={clsx(
                  'px-2 py-1 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors',
                  guidelines.showDescender
                    ? 'border-purple-200 bg-purple-50/50 text-purple-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                )}
              >
                <span>Descender (-420)</span>
                {guidelines.showDescender && <Check className="w-3 h-3 text-purple-600" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
