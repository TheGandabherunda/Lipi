import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGlyphStore } from '../../store/glyphStore';
import {
  KANNADA_GOOGLE_FONTS,
  loadParsedFont,
  extractOutlinesFromFont,
} from '../../utils/googleFontsManager';
import { parseUserFontFile } from '../../utils/fontImporter';
import type { TraceMode } from '../../types/canvas';
import {
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  Loader2,
  BookOpen,
  Wand2,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

export const CanvasReferenceFontControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitchingFont, setIsSwitchingFont] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedGoogleFont = useUIStore((s) => s.selectedGoogleFont);
  const setSelectedGoogleFont = useUIStore((s) => s.setSelectedGoogleFont);
  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const setActiveOutlines = useUIStore((s) => s.setActiveOutlines);
  const tracing = useUIStore((s) => s.tracing);
  const toggleTracing = useUIStore((s) => s.toggleTracing);
  const setTracingOpacity = useUIStore((s) => s.setTracingOpacity);
  const setTraceMode = useUIStore((s) => s.setTraceMode);
  const setOutlineSize = useUIStore((s) => s.setOutlineSize);
  const setFillSize = useUIStore((s) => s.setFillSize);

  const metadata = useGlyphStore((s) => s.metadata);
  const updateMetadata = useGlyphStore((s) => s.updateMetadata);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  // Switch Google Font
  const handleSelectReferenceFont = async (fontId: string) => {
    if (fontId === 'upload') {
      fileInputRef.current?.click();
      return;
    }

    if (fontId === 'none') {
      setSelectedGoogleFont('none');
      setActiveOutlines({});
      return;
    }

    const fontDef = KANNADA_GOOGLE_FONTS.find((f) => f.id === fontId);
    if (!fontDef) return;

    try {
      setIsSwitchingFont(true);
      setSelectedGoogleFont(fontId);

      const parsedFont = await loadParsedFont(fontDef);
      const { metrics, outlines } = extractOutlinesFromFont(parsedFont);

      updateMetadata({
        metrics: {
          ...metadata.metrics,
          ...metrics,
        },
      });
      setActiveOutlines(outlines);
    } catch (err) {
      console.error('Failed to switch Google font:', err);
      alert('Failed to load selected font binary.');
    } finally {
      setIsSwitchingFont(false);
    }
  };

  // Upload custom reference font
  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSwitchingFont(true);
      const result = await parseUserFontFile(file);

      if (!result.success) {
        alert(`Error importing font: ${result.error}`);
        return;
      }

      setSelectedGoogleFont('custom');
      updateMetadata({
        name: result.fontName,
        metrics: result.metrics,
      });
      setActiveOutlines(result.outlines);
    } catch (err) {
      alert(`Failed to import font: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSwitchingFont(false);
      e.target.value = '';
    }
  };

  // Reset Guidelines
  const handleResetGuidelines = () => {
    updateMetadata({
      metrics: {
        ...metadata.metrics,
        unitsPerEm: 1000,
        ascender: 790,
        capHeight: 565,
        baseline: 0,
        descender: -420,
      },
    });
  };

  // Auto-Snap Guidelines to Glyph
  const handleFitGuidelines = () => {
    const outline = activeOutlines[activeUnicode];
    if (!outline || !outline.bbox) return;

    const { y1, y2 } = outline.bbox;
    const upm = metadata.metrics.unitsPerEm || 1000;

    updateMetadata({
      metrics: {
        ...metadata.metrics,
        baseline: 0,
        capHeight: Math.min(upm, Math.max(400, y2 > 700 ? Math.round(y2 * 0.72) : y2)),
        ascender: Math.max(y2, 790),
        descender: y1 < 0 ? y1 : -420,
      },
    });
  };

  const getFontDisplayName = () => {
    if (selectedGoogleFont === 'none') return 'None (Off)';
    if (selectedGoogleFont === 'custom') return 'Custom Font';
    const found = KANNADA_GOOGLE_FONTS.find((f) => f.id === selectedGoogleFont);
    return found ? found.name : 'Select Font';
  };

  const curMode = tracing.mode || 'outline';

  return (
    <div ref={containerRef} className="absolute top-4 right-6 z-20 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomFontUpload}
        accept=".ttf,.otf,.woff"
        className="hidden"
      />

      {/* Trigger Button: Next to canvas top right corner outside (Globe icon removed) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-sm hover:shadow-md text-xs font-semibold transition-all cursor-pointer',
          isOpen
            ? 'border-indigo-400 ring-2 ring-indigo-200 text-indigo-700'
            : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
        )}
        title="Kannada Reference Font Options & Tracing"
      >
        <span className="text-slate-500 font-medium">Ref Font:</span>
        <span className="font-bold text-slate-800 max-w-[130px] truncate">
          {getFontDisplayName()}
        </span>
        {isSwitchingFont ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
        ) : (
          <ChevronDown
            className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isOpen && 'rotate-180')}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-80 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3.5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800">Reference Font & Tracing</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reference Font Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              Reference Font
            </span>
            <select
              value={selectedGoogleFont}
              onChange={(e) => handleSelectReferenceFont(e.target.value)}
              disabled={isSwitchingFont}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <optgroup label="Kannada Reference Fonts">
                {KANNADA_GOOGLE_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom & Options">
                {selectedGoogleFont === 'custom' && (
                  <option value="custom">Custom Imported Font</option>
                )}
                <option value="upload">+ Upload Font File (.ttf, .otf)...</option>
                <option value="none">None (No Reference Outline)</option>
              </optgroup>
            </select>
          </div>

          {/* Reference Tracing Controls (when font selected) */}
          {selectedGoogleFont !== 'none' && (
            <div className="flex flex-col gap-2.5 bg-slate-50/80 border border-slate-200/80 p-2.5 rounded-xl">
              {/* Outline Visibility Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Display Outline:</span>
                <button
                  type="button"
                  onClick={toggleTracing}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                    tracing.enabled
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {tracing.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{tracing.enabled ? 'Visible' : 'Hidden'}</span>
                </button>
              </div>

              {/* TRACE OPTIONS: Outline only, Fill only, Both outline and fill */}
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  Trace Mode
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-0.5 rounded-xl">
                  {(['outline', 'fill', 'both'] as TraceMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTraceMode(m)}
                      className={clsx(
                        'py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                        curMode === m
                          ? 'bg-white text-indigo-700 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {m === 'outline' && 'Outline only'}
                      {m === 'fill' && 'Fill only'}
                      {m === 'both' && 'Both'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIZES: Outline Size & Fill Size */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/60">
                {/* Outline Size Slider (shown for outline only or both) */}
                {(curMode === 'outline' || curMode === 'both') && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Outline Size:</span>
                      <span className="font-mono-code font-bold text-slate-800">
                        {tracing.outlineSize || 2}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={tracing.outlineSize || 2}
                      onChange={(e) => setOutlineSize(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                )}

                {/* Fill Size Slider (shown for fill only or both) */}
                {(curMode === 'fill' || curMode === 'both') && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Fill Size:</span>
                      <span className="font-mono-code font-bold text-slate-800">
                        {tracing.fillSize || 10}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="24"
                      step="1"
                      value={tracing.fillSize || 10}
                      onChange={(e) => setFillSize(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                )}

                {/* Opacity Slider */}
                {tracing.enabled && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Opacity:</span>
                      <span className="font-mono-code font-bold text-slate-800">
                        {Math.round(tracing.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={tracing.opacity}
                      onChange={(e) => setTracingOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Trace to Canvas Button */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('lipi:edit-reference-font'));
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer shadow-2xs mt-1"
                title="Convert reference font outline into editable vector paths directly on the canvas"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trace to Canvas</span>
              </button>
            </div>
          )}

          {/* Quick Guidelines Alignment */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Guideline Alignment
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleResetGuidelines}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Reset to authentic Kannada standards (790, 565, 0, -420)"
              >
                <BookOpen className="w-3 h-3 text-indigo-600" />
                <span>Standards</span>
              </button>

              <button
                type="button"
                onClick={handleFitGuidelines}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Fit guidelines to active character bbox"
              >
                <Wand2 className="w-3 h-3 text-indigo-600" />
                <span>Fit Bounds</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
