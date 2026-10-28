import React, { useState } from 'react';
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
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const isOpen = useUIStore((s) => s.isExportModalOpen);
  const setOpen = useUIStore((s) => s.setExportModalOpen);

  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const glyphs = useGlyphStore((s) => s.glyphs);
  const metadata = useGlyphStore((s) => s.metadata);
  const downloadLipiFile = useGlyphStore((s) => s.downloadLipiFile);
  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const selectedGoogleFont = useUIStore((s) => s.selectedGoogleFont);

  if (!isOpen) return null;

  const currentGlyph = glyphs[activeUnicode];
  const editedGlyphs = Object.values(glyphs).filter((g) => g.isEdited);

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
        { canvasWidth, canvasHeight }
      );
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown compilation error'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCurrentSVG = () => {
    if (!currentGlyph) return;
    downloadGlyphSVG(currentGlyph, metadata.metrics);
  };

  const handleExportAllJSON = () => {
    const data = {
      project: metadata.name,
      editedGlyphsCount: editedGlyphs.length,
      glyphs: editedGlyphs.map((g) => ({
        unicode: g.unicode,
        character: g.character,
        name: g.name,
        svg: glyphToSVG(g, metadata.metrics),
        paths: g.paths,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name}_vector_manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Export Installable Kannada Font Package
              </h3>
              <span className="text-[11px] text-slate-500">
                Install on Windows, Mac, Linux, Android, iOS, or Web
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Status summary */}
          <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium">Font Family Name:</span>
              <span className="text-base font-bold text-indigo-900">{metadata.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 font-medium">Custom Drawn Glyphs:</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {editedGlyphs.length} customized (Full Kannada set included)
              </span>
            </div>
          </div>

          {/* Primary Action: Complete Font Package (ZIP) */}
          <div className="p-4 rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Complete Font Package (.zip)
                  <span className="text-[9px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.2 rounded-full">
                    Recommended
                  </span>
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Includes .TTF, .OTF, .WOFF, installation guide, and HTML typewriter tester
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadFont('zip')}
              disabled={isExporting !== null}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
            >
              {isExporting === 'zip' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download ZIP</span>
            </button>
          </div>

          {/* Individual Installable Font Formats */}
          <div className="grid grid-cols-3 gap-3">
            {/* TTF */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">TrueType (.ttf)</span>
              </div>
              <span className="text-[11px] text-slate-500 leading-tight">
                Standard installable font for Windows, Mac, Office & Figma.
              </span>
              <button
                type="button"
                onClick={() => handleDownloadFont('ttf')}
                disabled={isExporting !== null}
                className="w-full py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {isExporting === 'ttf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>.TTF</span>
              </button>
            </div>

            {/* OTF */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">OpenType (.otf)</span>
              </div>
              <span className="text-[11px] text-slate-500 leading-tight">
                High-precision curves for Adobe Photoshop, InDesign & Print.
              </span>
              <button
                type="button"
                onClick={() => handleDownloadFont('otf')}
                disabled={isExporting !== null}
                className="w-full py-1.5 bg-white hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {isExporting === 'otf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>.OTF</span>
              </button>
            </div>

            {/* WOFF */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Web Font (.woff)</span>
              </div>
              <span className="text-[11px] text-slate-500 leading-tight">
                Optimized compressed web format for website @font-face.
              </span>
              <button
                type="button"
                onClick={() => handleDownloadFont('woff')}
                disabled={isExporting !== null}
                className="w-full py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {isExporting === 'woff' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>.WOFF</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Secondary Assets: .lipi, SVG, JSON */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={downloadLipiFile}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-left flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-700 truncate">Project (.lipi)</span>
                <span className="text-[10px] text-slate-400">Editable state</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportCurrentSVG}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-left flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Type className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-700 truncate">Current SVG</span>
                <span className="text-[10px] text-slate-400">{currentGlyph?.character || 'ಅ'} vector</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportAllJSON}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-left flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Code className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-700 truncate">Vectors JSON</span>
                <span className="text-[10px] text-slate-400">Path manifest</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
