import React, { useState, useMemo } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { downloadFontPackage } from '../../utils/fontCompiler';
import { downloadGlyphSVG, glyphToSVG } from '../../utils/svgExport';
import {
  X,
  Download,
  Package,
  FileCheck,
  Code,
  FileText,
  CheckCircle2,
  Loader2,
  Type,
  Keyboard,
  Sparkles,
  Info,
  ChevronDown,
  Laptop,
  Check,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';

export const ExportModal: React.FC = () => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [mapLatinKeys, setMapLatinKeys] = useState<boolean>(true);
  const [testText, setTestText] = useState<string>('ಅಮ್ಮ');
  const [showWindowsGuide, setShowWindowsGuide] = useState<boolean>(true);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const isOpen = useUIStore((s) => s.isExportModalOpen);
  const setOpen = useUIStore((s) => s.setExportModalOpen);

  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const glyphs = useGlyphStore((s) => s.glyphs);
  const metadata = useGlyphStore((s) => s.metadata);
  const downloadLipiFile = useGlyphStore((s) => s.downloadLipiFile);
  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const selectedGoogleFont = useUIStore((s) => s.selectedGoogleFont);

  const currentGlyph = glyphs[activeUnicode];
  const editedGlyphs = useMemo(
    () => Object.values(glyphs).filter((g) => g.isEdited && g.paths && g.paths.length > 0),
    [glyphs]
  );

  if (!isOpen) return null;

  const handleDownloadFont = async (format: 'ttf' | 'otf' | 'woff' | 'zip') => {
    try {
      setIsExporting(format);
      const canvasWidth = useUIStore.getState().canvasWidth || 800;
      const canvasHeight = useUIStore.getState().canvasHeight || 800;
      await downloadFontPackage(
        metadata,
        glyphs,
        activeOutlines,
        format,
        undefined,
        selectedGoogleFont,
        { canvasWidth, canvasHeight, mapLatinKeys }
      );
      setDownloadSuccessToast(
        format === 'zip' ? 'Complete font package (.zip)' : `Font binary (.${format.toUpperCase()})`
      );
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown compilation error'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCurrentSVG = () => {
    if (!currentGlyph) return;
    downloadGlyphSVG(currentGlyph, metadata.metrics);
    setDownloadSuccessToast(`SVG glyph for ${currentGlyph.character}`);
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  const handleExportAllJSON = () => {
    const data = {
      project: metadata.name,
      author: metadata.author,
      version: metadata.version,
      metrics: metadata.metrics,
      editedGlyphsCount: editedGlyphs.length,
      glyphs: editedGlyphs.map((g) => ({
        unicode: g.unicode,
        character: g.character,
        name: g.name,
        advanceWidth: g.advanceWidth,
        pathsCount: g.paths?.length || 0,
        svg: glyphToSVG(g, metadata.metrics),
        paths: g.paths,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name.replace(/\s+/g, '_')}_manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccessToast('Vector JSON manifest');
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Sleek Studio Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  Export Kannada Font
                </h3>
                <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200/80">
                  {metadata.name || 'LipiKannada'} v{metadata.version || '1.0.0'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compile into installable desktop, web, and mobile OpenType font binaries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
          {/* Toast Notification */}
          {downloadSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium animate-in slide-in-from-top-2 duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Downloaded <strong>{downloadSuccessToast}</strong> successfully. Check your browser downloads folder!</span>
            </div>
          )}

          {/* Section A: "Where is my letter?" & Visual Glyph Verification */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-slate-50/40 to-white flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Visual Preview Tile of Custom Letter */}
                <div className="w-14 h-14 rounded-2xl bg-white border border-indigo-200/80 shadow-xs flex items-center justify-center relative overflow-hidden group">
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #4338ca 1px, transparent 1px), linear-gradient(to bottom, #4338ca 1px, transparent 1px)',
                      backgroundSize: '8px 8px',
                    }}
                  />
                  <span className="font-bold text-2xl text-indigo-950 font-kannada relative z-10">
                    {currentGlyph?.character || (editedGlyphs[0]?.character ?? 'ಅ')}
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {editedGlyphs.length > 0 ? (
                        <>Custom Vector Glyph Ready: {editedGlyphs.map((g) => g.character).join(', ')}</>
                      ) : (
                        <>Ready to Export Base Kannada Font</>
                      )}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Compiled in Binary
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5">
                    Unicode: <strong>{currentGlyph?.unicode || 'U+0C85'}</strong> &bull; Advance Width: <strong>{currentGlyph?.advanceWidth || 863} UPM</strong> &bull; Total Drawn Strokes: <strong>{currentGlyph?.paths?.length || 1}</strong>
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-slate-500 block">Drawn Letters</span>
                <span className="text-base font-extrabold text-indigo-700">
                  {editedGlyphs.length} <span className="text-xs font-normal text-slate-400">/ 78</span>
                </span>
              </div>
            </div>

            {/* "Where is my letter in Windows?" Clarification Banner */}
            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/90 flex flex-col gap-2">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowWindowsGuide(!showWindowsGuide)}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-amber-900">
                    Where is my letter when opening the .TTF in Windows?
                  </span>
                </div>
                <button
                  type="button"
                  className="text-amber-700 hover:text-amber-900 text-xs flex items-center gap-1 font-medium"
                >
                  <span>{showWindowsGuide ? 'Hide' : 'Explain'}</span>
                  <ChevronDown
                    className={clsx('w-3.5 h-3.5 transition-transform duration-200', showWindowsGuide && 'rotate-180')}
                  />
                </button>
              </div>

              {showWindowsGuide && (
                <div className="text-xs text-amber-900/90 leading-relaxed border-t border-amber-200/60 pt-2 flex flex-col gap-1.5">
                  <p>
                    <strong>Why Windows Font Viewer looks English:</strong> The default Windows Font Viewer (<code>fontview.exe</code>) is hardcoded to render the English sentence <em>"The quick brown fox jumps over the lazy dog"</em>. Because it only queries Latin ASCII letters, it does not display Kannada letters by default.
                  </p>
                  <p>
                    <strong>Your drawn letter IS 100% inside the font:</strong> It is stored at Unicode <code>U+0C85</code> (Kannada Letter 'ಅ').
                  </p>
                  <p className="flex items-center gap-1.5 text-amber-950 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <strong>Instant Solution:</strong> Keep <em>"Direct English Keyboard Mapping"</em> enabled below! This maps your 'ಅ' to both Unicode U+0C85 AND the English 'a' key. When you open the TTF in Windows, the letter 'a' in <em>"lazy"</em> and <em>"abcdef..."</em> will immediately show your custom 'ಅ'!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Keyboard & Encoding Architecture Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
              Keyboard & Encoding Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Direct English Keyboard Mode (Recommended) */}
              <button
                type="button"
                onClick={() => setMapLatinKeys(true)}
                className={clsx(
                  'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                  mapLatinKeys
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Direct English Keys (Dual)
                    <span className="text-[9px] font-bold uppercase bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">
                      Recommended
                    </span>
                  </span>
                  {mapLatinKeys && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Maps <strong>'a'</strong> &rarr; <strong>'ಅ'</strong>, <strong>'k'</strong> &rarr; <strong>'ಕ'</strong>. Instantly visible in Windows Font Viewer and types on any English keyboard without installing an IME.
                </p>
              </button>

              {/* Option 2: Canonical Indic Unicode Mode */}
              <button
                type="button"
                onClick={() => setMapLatinKeys(false)}
                className={clsx(
                  'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                  !mapLatinKeys
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-900">
                    Strict Unicode 15.0
                  </span>
                  {!mapLatinKeys && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Strictly maps to official Indic Unicode points (<code>U+0C80</code>&ndash;<code>U+0CFF</code>). Ideal for formal publishing with Windows Indic or Nudi keyboards.
                </p>
              </button>
            </div>
          </div>

          {/* Section C: Live Type Tester Strip */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Live Type Tester
              </span>
              <div className="flex items-center gap-1">
                {['ಅ', 'ಅಮ್ಮ', 'ಕನ್ನಡ', 'ಸಿರಿಗನ್ನಡ'].map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => setTestText(word)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Type Kannada words to test..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
              <div className="px-4 py-1.5 bg-white border border-indigo-200 rounded-xl shadow-2xs min-w-28 text-center">
                <span className="font-kannada font-bold text-lg text-indigo-900">
                  {testText || 'ಅ'}
                </span>
              </div>
            </div>
          </div>

          {/* Section D: Primary Export Option (Complete Suite ZIP) */}
          <div className="p-4 rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Complete Studio Font Package (.zip)
                  <span className="text-[9px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.2 rounded-full">
                    Recommended
                  </span>
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Includes <strong>.TTF</strong>, <strong>.OTF</strong>, <strong>.WOFF</strong>, interactive browser typewriter (<strong>type_test.html</strong>), & installation manual.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadFont('zip')}
              disabled={isExporting !== null}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/25 shrink-0"
            >
              {isExporting === 'zip' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download ZIP</span>
            </button>
          </div>

          {/* Section E: Individual Font Binaries */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700">
              Individual Font Binaries
            </span>
            <div className="grid grid-cols-3 gap-3">
              {/* TTF */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">TrueType (.ttf)</span>
                    <span className="text-[10px] text-slate-400">Desktop & Windows</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">
                  Standard installable font for Windows, Mac, Word, & Figma.
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadFont('ttf')}
                  disabled={isExporting !== null}
                  className="w-full py-1.5 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 hover:border-indigo-600 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isExporting === 'ttf' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span>Export .TTF</span>
                </button>
              </div>

              {/* OTF */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">OpenType (.otf)</span>
                    <span className="text-[10px] text-slate-400">Print & Publishing</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">
                  High-precision Bezier curves for Photoshop & InDesign.
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadFont('otf')}
                  disabled={isExporting !== null}
                  className="w-full py-1.5 bg-slate-50 hover:bg-purple-600 hover:text-white border border-slate-200 hover:border-purple-600 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isExporting === 'otf' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span>Export .OTF</span>
                </button>
              </div>

              {/* WOFF */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">WebFont (.woff)</span>
                    <span className="text-[10px] text-slate-400">Web & CSS</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">
                  Compressed format for website @font-face embeds.
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadFont('woff')}
                  disabled={isExporting !== null}
                  className="w-full py-1.5 bg-slate-50 hover:bg-emerald-600 hover:text-white border border-slate-200 hover:border-emerald-600 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isExporting === 'woff' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span>Export .WOFF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section F: Vector Source Assets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700">
              Source & Vector Assets
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={downloadLipiFile}
                className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white text-left flex items-center gap-2.5 cursor-pointer transition-colors shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 truncate">Project (.lipi)</span>
                  <span className="text-[10px] text-slate-400">Editable snapshot</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportCurrentSVG}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-300 bg-white text-left flex items-center gap-2.5 cursor-pointer transition-colors shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Type className="w-4 h-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 truncate">Glyph SVG</span>
                  <span className="text-[10px] text-slate-400">{currentGlyph?.character || 'ಅ'} vector</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportAllJSON}
                className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white text-left flex items-center gap-2.5 cursor-pointer transition-colors shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Code className="w-4 h-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 truncate">Vectors JSON</span>
                  <span className="text-[10px] text-slate-400">Path manifest</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Refined Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Laptop className="w-3.5 h-3.5 text-slate-400" />
            <span>Install font: Right click <code>.ttf</code> &rarr; <strong>Install</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
