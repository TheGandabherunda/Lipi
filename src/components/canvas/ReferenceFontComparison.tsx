import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { KANNADA_GOOGLE_FONTS } from '../../utils/googleFontsManager';
import {
  Eye,
  EyeOff,
  Layers,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { TraceMode } from '../../types/canvas';

interface ReferenceFontComparisonProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceFontComparison: React.FC<ReferenceFontComparisonProps> = ({
  isOpen,
  onClose,
}) => {
  const tracing = useUIStore((s) => s.tracing);
  const toggleTracing = useUIStore((s) => s.toggleTracing);
  const setTracingOpacity = useUIStore((s) => s.setTracingOpacity);
  const setTraceMode = useUIStore((s) => s.setTraceMode);
  const setOutlineSize = useUIStore((s) => s.setOutlineSize);
  const selectedGoogleFont = useUIStore((s) => s.selectedGoogleFont);
  const setSelectedGoogleFont = useUIStore((s) => s.setSelectedGoogleFont);

  if (!isOpen) return null;

  const currentMode = tracing.mode || 'outline';

  return (
    <div className="absolute top-16 right-4 z-40 w-80 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 p-4 select-none animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            Reference Font Layer
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 pt-3">
        {/* Toggle Layer Visibility */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            {tracing.enabled ? (
              <Eye className="w-4 h-4 text-indigo-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs font-semibold text-slate-700">
              Reference Visibility
            </span>
          </div>
          <button
            type="button"
            onClick={toggleTracing}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs',
              tracing.enabled
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            )}
          >
            {tracing.enabled ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Reference Font Selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-700">Source Font</span>
          <select
            value={selectedGoogleFont}
            onChange={(e) => setSelectedGoogleFont(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            {KANNADA_GOOGLE_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.styleDescription})
              </option>
            ))}
            {selectedGoogleFont === 'custom' && (
              <option value="custom">Custom Imported Font (.ttf/.otf)</option>
            )}
          </select>
        </div>

        {/* Tracing Mode: Outline vs Fill vs Both */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-700">Layer Style</span>
          <div className="grid grid-cols-3 gap-1">
            {(['outline', 'fill', 'both'] as TraceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTraceMode(mode)}
                className={clsx(
                  'py-1 rounded-lg text-[10px] font-semibold border capitalize transition-all cursor-pointer text-center',
                  currentMode === mode
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Layer Opacity</span>
            <span className="font-mono-code font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {Math.round(tracing.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={tracing.opacity}
            onChange={(e) => setTracingOpacity(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
        </div>

        {/* Outline Thickness */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Guide Thickness</span>
            <span className="font-mono-code font-bold text-xs text-slate-600">
              {tracing.outlineSize}px
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={tracing.outlineSize}
            onChange={(e) => setOutlineSize(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
