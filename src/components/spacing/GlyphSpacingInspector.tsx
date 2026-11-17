import React, { useState, useMemo } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import {
  Ruler,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Wand2,
  Eye,
  X,
  ArrowLeftRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { GlyphStatus } from '../../types/glyph';

export const GlyphSpacingInspector: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [contextFlankChar, setContextFlankChar] = useState('ಕ');

  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const glyphs = useGlyphStore((s) => s.glyphs);
  const updateGlyphMetrics = useGlyphStore((s) => s.updateGlyphMetrics);
  const setGlyphStatus = useGlyphStore((s) => s.setGlyphStatus);
  const metadata = useGlyphStore((s) => s.metadata);
  const currentGlyph = glyphs[activeUnicode];

  const isSpacingPanelOpen = useUIStore((s) => s.isSpacingPanelOpen);
  const setSpacingPanelOpen = useUIStore((s) => s.setSpacingPanelOpen);

  const currentAdvance = currentGlyph?.advanceWidth || 780;
  const currentLsb = currentGlyph?.leftSideBearing ?? metadata.metrics.leftSideBearing ?? 50;
  const currentRsb = currentGlyph?.rightSideBearing ?? metadata.metrics.rightSideBearing ?? 50;
  const currentStatus: GlyphStatus = currentGlyph?.status || (currentGlyph?.paths && currentGlyph.paths.length > 0 ? 'started' : 'empty');

  // Compute bounding box width of drawn strokes if available
  const estimatedBBoxWidth = useMemo(() => {
    if (!currentGlyph || !currentGlyph.paths || currentGlyph.paths.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    currentGlyph.paths.forEach((p) => {
      const nums = p.pathString.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i];
        if (!isNaN(x)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    });
    if (minX !== Infinity && maxX !== -Infinity) {
      return Math.round(maxX - minX);
    }
    return null;
  }, [currentGlyph]);

  if (!isSpacingPanelOpen || !currentGlyph) return null;

  const handleAdvanceChange = (val: number) => {
    updateGlyphMetrics(activeUnicode, { advanceWidth: Math.max(50, Math.min(3500, val)) });
  };

  const handleLsbChange = (val: number) => {
    updateGlyphMetrics(activeUnicode, { leftSideBearing: Math.max(0, Math.min(1000, val)) });
  };

  const handleRsbChange = (val: number) => {
    updateGlyphMetrics(activeUnicode, { rightSideBearing: Math.max(0, Math.min(1000, val)) });
  };

  const handleAutoFitSpacing = () => {
    if (estimatedBBoxWidth) {
      const targetAdvance = Math.round(estimatedBBoxWidth + currentLsb + currentRsb);
      updateGlyphMetrics(activeUnicode, { advanceWidth: Math.max(200, targetAdvance) });
    }
  };

  const SPACING_PRESETS = [
    { label: 'Narrow', val: 620 },
    { label: 'Regular', val: 780 },
    { label: 'Wide', val: 960 },
    { label: 'Display', val: 1200 },
  ];

  return (
    <aside className="absolute bottom-4 left-20 z-40 w-96 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 p-4 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Ruler className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">
              Spacing & Metrics
            </span>
            <span className="font-kannada font-bold text-xs text-indigo-600">
              {currentGlyph.character}
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">
              ({currentGlyph.unicode})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setSpacingPanelOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Close Spacing Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-3 pt-3">
          {/* 1. Production Export Readiness Status */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700">Glyph Status</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGlyphStatus(activeUnicode, 'empty')}
                className={clsx(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer',
                  currentStatus === 'empty'
                    ? 'bg-slate-200 border-slate-300 text-slate-700 font-bold'
                    : 'border-transparent text-slate-500 hover:bg-slate-100'
                )}
              >
                Empty
              </button>
              <button
                type="button"
                onClick={() => setGlyphStatus(activeUnicode, 'started')}
                className={clsx(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer',
                  currentStatus === 'started'
                    ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                    : 'border-transparent text-slate-500 hover:bg-slate-100'
                )}
              >
                Started
              </button>
              <button
                type="button"
                onClick={() => setGlyphStatus(activeUnicode, 'ready')}
                className={clsx(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
                  currentStatus === 'ready'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                    : 'border-transparent text-slate-500 hover:bg-slate-100'
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Export Ready</span>
              </button>
            </div>
          </div>

          {/* 2. Advance Width Controls */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3 text-indigo-500" />
                Advance Width (ಅಗಲ)
              </span>
              <div className="flex items-center gap-1.5">
                {estimatedBBoxWidth && (
                  <button
                    type="button"
                    onClick={handleAutoFitSpacing}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                    title={`Auto-fit: Art width (${estimatedBBoxWidth}) + Margins`}
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    <span>Auto-Fit</span>
                  </button>
                )}
                <span className="font-mono-code font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {currentAdvance} units
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="200"
                max="2000"
                step="10"
                value={currentAdvance}
                onChange={(e) => handleAdvanceChange(Number(e.target.value))}
                className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleAdvanceChange(currentAdvance - 20)}
                  className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-mono-code text-slate-600"
                >
                  -20
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvanceChange(currentAdvance + 20)}
                  className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-mono-code text-slate-600"
                >
                  +20
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {SPACING_PRESETS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleAdvanceChange(p.val)}
                  className={clsx(
                    'py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer text-center',
                    Math.abs(currentAdvance - p.val) < 15
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {p.label} ({p.val})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Left & Right Sidebearings */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">LSB (Left Margin)</span>
                <span className="font-mono-code text-[10px] font-bold text-slate-600">
                  {currentLsb}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="5"
                  value={currentLsb}
                  onChange={(e) => handleLsbChange(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono-code bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">RSB (Right Margin)</span>
                <span className="font-mono-code text-[10px] font-bold text-slate-600">
                  {currentRsb}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="5"
                  value={currentRsb}
                  onChange={(e) => handleRsbChange(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono-code bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Reading Context Spacing Preview */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <Eye className="w-3 h-3 text-slate-500" />
                Reading Context Preview
              </span>
              <div className="flex items-center gap-1">
                {['ಕ', 'ಅ', 'ನ', 'ಲ'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setContextFlankChar(ch)}
                    className={clsx(
                      'w-5 h-5 rounded text-[10px] font-kannada font-bold transition-colors cursor-pointer',
                      contextFlankChar === ch
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-center font-kannada text-2xl tracking-wider select-none shadow-inner min-h-[50px]">
              <span className="text-slate-400">{contextFlankChar}</span>
              <span
                className="text-amber-300 font-bold mx-1 border-b-2 border-amber-400 px-0.5"
                style={{
                  letterSpacing: `${(currentAdvance - 780) / 60}px`,
                }}
              >
                {currentGlyph.character}
              </span>
              <span className="text-slate-400">{contextFlankChar}</span>
            </div>
            <span className="text-[9px] text-slate-400 text-center">
              Evaluating kerning: {contextFlankChar} + {currentGlyph.character} + {contextFlankChar}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
