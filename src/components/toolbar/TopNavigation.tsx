import React, { useRef, useState, useEffect } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { parseUserFontFile } from '../../utils/fontImporter';
import {
  Save,
  Download,
  Settings,
  FileCode2,
  Upload,
  Type,
  Settings2,
  RotateCw,
  BookOpen,
  Wand2,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TopNavigationProps {
  onOpenPreview: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ onOpenPreview }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fontImportInputRef = useRef<HTMLInputElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Glyph Store
  const metadata = useGlyphStore((s) => s.metadata);
  const updateMetadata = useGlyphStore((s) => s.updateMetadata);
  const downloadLipiFile = useGlyphStore((s) => s.downloadLipiFile);
  const loadLipiFileContent = useGlyphStore((s) => s.loadLipiFileContent);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);

  // UI Store
  const setSelectedGoogleFont = useUIStore((s) => s.setSelectedGoogleFont);
  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const setActiveOutlines = useUIStore((s) => s.setActiveOutlines);
  const selectedObjectAngle = useUIStore((s) => s.selectedObjectAngle);
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen);
  const setSettingsModalOpen = useUIStore((s) => s.setSettingsModalOpen);

  // Close options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    if (isOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOptionsOpen]);

  // Handle importing a custom font file (.ttf, .otf, .woff)
  const handleUserFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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
      alert(
        `Successfully imported "${result.fontName}" with ${result.extractedGlyphsCount} Kannada characters! Guidelines updated.`
      );
    } catch (err) {
      alert(`Failed to import font: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      e.target.value = '';
    }
  };

  // Handle loading a .lipi project file
  const handleLipiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = loadLipiFileContent(content);
        if (!result.success) {
          alert(`Error loading file: ${result.error}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset Guidelines to authentic Kannada typography standards (790, 565, 0, -420)
  const resetToStandardGuidelines = () => {
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

  // Auto-Snap Guidelines to the active character's exact bounding box
  const autoSnapGuidelinesToGlyph = () => {
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

  return (
    <header className="h-14 border-b border-slate-200/90 bg-white px-5 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* LEFT: Brand & Editable Project Font Name */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 overflow-hidden">
            <svg viewBox="-12 -98 130 130" className="w-5 h-5">
              <path
                d="M37.50 1.20Q26.70 1.20 19.15-2.90Q11.60-7 7.65-14.25Q3.70-21.50 3.70-30.80Q3.70-38.70 6.25-44.40Q8.80-50.10 13.45-53.20Q18.10-56.30 24.20-56.30Q28.70-56.30 31.90-54.70Q35.10-53.10 36.80-50.10Q38.50-47.10 38.50-42.90Q38.50-38.60 36.55-35.20Q34.60-31.80 30.75-29.80Q26.90-27.80 21.20-27.80Q19-27.80 17.10-28.20Q15.20-28.60 13.65-29.35Q12.10-30.10 10.80-30.90L11.80-38Q12.80-37.30 14.15-36.55Q15.50-35.80 17.10-35.30Q18.70-34.80 20.60-34.80Q25.90-34.80 28.30-37.05Q30.70-39.30 30.70-42.70Q30.70-45.90 28.90-47.60Q27.10-49.30 24.20-49.30Q20.90-49.30 18-47.50Q15.10-45.70 13.30-41.60Q11.50-37.50 11.50-30.60Q11.50-24.10 14.50-18.70Q17.50-13.30 23.35-10.10Q29.20-6.90 37.80-6.90Q46.20-6.90 52.05-9.40Q57.90-11.90 60.95-16.65Q64-21.40 64-28.10Q64-35.20 60-40.35Q56-45.50 49.20-49.10L53.80-56.50Q62.50-51.80 67.35-44.80Q72.20-37.80 72.20-28.10Q72.20-20.10 68.65-13.45Q65.10-6.80 57.45-2.80Q49.80 1.20 37.50 1.20M87.80-31.10Q82.10-31.10 77.85-32.95Q73.60-34.80 70.65-37.70Q67.70-40.60 65.80-43.60L70-48Q73-44.40 75.95-42.30Q78.90-40.20 81.70-39.35Q84.50-38.50 87.10-38.50Q90.90-38.50 93.45-39.65Q96-40.80 97.30-43.25Q98.60-45.70 98.60-49.70L98.60-50.70Q98.60-54.80 97.05-57.90Q95.50-61 93-62.75Q90.50-64.50 87.60-64.50Q84.30-64.50 82.60-63.15Q80.90-61.80 80.90-59.50Q80.90-57.50 81.90-56.40Q82.90-55.30 84.25-54.90Q85.60-54.50 86.70-54.50Q91.30-54.50 94.15-56.40Q97-58.30 99.20-61.50L102.30-56.90Q101-55 99-52.85Q97-50.70 94-49.25Q91-47.80 86.70-47.80Q83.30-47.80 80.20-49Q77.10-50.20 75.20-52.65Q73.30-55.10 73.30-59Q73.30-64.10 77.15-67.65Q81-71.20 87.60-71.20Q93.20-71.20 97.45-68.50Q101.70-65.80 104.05-61.10Q106.40-56.40 106.40-50.40Q106.40-43.70 104.05-39.40Q101.70-35.10 97.55-33.10Q93.40-31.10 87.80-31.10"
                fill="white"
              />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900">Lipi</span>
              <span className="font-kannada text-xs font-bold text-indigo-600">ಲಿಪಿ</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">Font Forge</span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Editable Project Font Name */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
          <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => updateMetadata({ name: e.target.value })}
            className="bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 px-1 py-0.5 rounded text-xs font-semibold text-slate-800 focus:outline-none transition-colors w-32"
            title="Rename project font"
          />
        </div>
      </div>

      {/* CENTER: Selected Object Angle (shown only when a stroke is rotated) */}
      <div className="flex items-center justify-center">
        {selectedObjectAngle !== null && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-mono-code text-xs font-bold shadow-2xs">
            <RotateCw className="w-3.5 h-3.5 text-amber-600" />
            <span>Angle: {selectedObjectAngle}°</span>
          </div>
        )}
      </div>

      {/* RIGHT: Type Preview, Export Package & Options Icon Button with Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLipiUpload}
          accept=".lipi,.json"
          className="hidden"
        />
        <input
          type="file"
          ref={fontImportInputRef}
          onChange={handleUserFontFile}
          accept=".ttf,.otf,.woff"
          className="hidden"
        />

        {/* Live Type-Testing Preview Screen */}
        <button
          type="button"
          onClick={onOpenPreview}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
          title="Open interactive typing preview screen"
        >
          <Type className="w-3.5 h-3.5 text-emerald-600" />
          <span>Type Preview</span>
        </button>

        {/* Export Complete Font Package */}
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          title="Export TTF, OTF, WOFF, and ZIP Package"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Options Icon Button with Dropdown (Keeps remaining options clutter-free) */}
        <div ref={optionsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className={clsx(
              'p-2 rounded-xl border transition-all cursor-pointer shadow-2xs',
              isOptionsOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            )}
            title="Project & Font Options"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {isOptionsOpen && (
            <div className="absolute right-0 top-11 w-64 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                  Project & Font Options
                </span>
                <button
                  type="button"
                  onClick={() => setIsOptionsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Weight Selector */}
              <div className="flex flex-col gap-1 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  Font Family Weight
                </span>
                <select
                  value={metadata.weightClass || 400}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const weightsMap: Record<number, string> = {
                      100: 'Thin',
                      300: 'Light',
                      400: 'Regular',
                      500: 'Medium',
                      600: 'SemiBold',
                      700: 'Bold',
                      800: 'ExtraBold',
                      900: 'Black',
                    };
                    updateMetadata({
                      weightClass: val,
                      weightName: weightsMap[val] || 'Regular',
                      styleName: weightsMap[val] || 'Regular',
                    });
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={100}>Thin (100)</option>
                  <option value={300}>Light (300)</option>
                  <option value={400}>Regular (400)</option>
                  <option value={500}>Medium (500)</option>
                  <option value={600}>SemiBold (600)</option>
                  <option value={700}>Bold (700)</option>
                  <option value={800}>ExtraBold (800)</option>
                  <option value={900}>Black (900)</option>
                </select>
              </div>

              <div className="h-px bg-slate-100 my-0.5" />

              {/* Project Actions */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    downloadLipiFile();
                    setIsOptionsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Save Project (.lipi)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsOptionsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Load Project (.lipi)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fontImportInputRef.current?.click();
                    setIsOptionsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Import Font (.ttf, .otf, .woff)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsModalOpen(true);
                    setIsOptionsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Typography Metrics & Settings</span>
                </button>
              </div>

              <div className="h-px bg-slate-100 my-0.5" />

              {/* Guidelines Quick Actions */}
              <div className="flex flex-col gap-1 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Guidelines Actions
                </span>
                <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetToStandardGuidelines();
                      setIsOptionsOpen(false);
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    title="Reset to authentic Kannada standards (790, 565, 0, -420)"
                  >
                    <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Standards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      autoSnapGuidelinesToGlyph();
                      setIsOptionsOpen(false);
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    title="Fit guidelines to active glyph bounding box"
                  >
                    <Wand2 className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Fit Bounds</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
