import React from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { X, Sliders, Type } from 'lucide-react';

export const ProjectSettingsModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.isSettingsModalOpen);
  const setOpen = useUIStore((s) => s.setSettingsModalOpen);

  const metadata = useGlyphStore((s) => s.metadata);
  const updateMetadata = useGlyphStore((s) => s.updateMetadata);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const currentGlyph = useGlyphStore((s) => s.glyphs[s.activeUnicode]);
  const updateAdvanceWidth = useGlyphStore((s) => s.updateAdvanceWidth);

  if (!isOpen) return null;

  const metrics = metadata.metrics;

  const handleMetricChange = (key: keyof typeof metrics, val: number) => {
    updateMetadata({
      metrics: {
        ...metrics,
        [key]: val,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Font Metrics & Typographic Settings</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Font Info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Font Family Name</label>
              <input
                type="text"
                value={metadata.name}
                onChange={(e) => updateMetadata({ name: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Author / Designer</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => updateMetadata({ author: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Font Weight</label>
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
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
          </div>

          <div className="h-px bg-slate-100" />

          {/* Kannada Vertical Metrics */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kannada Vertical Metrics (Units / 1000)
            </span>

            {/* Ascender / Deergha */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-800 block">Ascender / Deergha (ದೀರ್ಘ)</span>
                <span className="text-[11px] text-slate-500">Top height for vowel signs</span>
              </div>
              <input
                type="number"
                value={metrics.ascender}
                onChange={(e) => handleMetricChange('ascender', Number(e.target.value))}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code text-right text-rose-600 font-bold"
              />
            </div>

            {/* Cap Height */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-800 block">Cap / Mean Line (ಶಿರೋರೇಖೆ)</span>
                <span className="text-[11px] text-slate-500">Top of base Kannada body letters</span>
              </div>
              <input
                type="number"
                value={metrics.capHeight}
                onChange={(e) => handleMetricChange('capHeight', Number(e.target.value))}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code text-right text-sky-600 font-bold"
              />
            </div>

            {/* Baseline */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-800 block">Baseline (ತಳರೇಖೆ)</span>
                <span className="text-[11px] text-slate-500">Base reference line for letter foundations</span>
              </div>
              <input
                type="number"
                value={metrics.baseline}
                onChange={(e) => handleMetricChange('baseline', Number(e.target.value))}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code text-right text-emerald-600 font-bold"
              />
            </div>

            {/* Descender / Ottakshara */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-800 block">Descender / Ottakshara (ಒತ್ತಕ್ಷರ)</span>
                <span className="text-[11px] text-slate-500">Bottom depth for conjunct subscripts & kombu</span>
              </div>
              <input
                type="number"
                value={metrics.descender}
                onChange={(e) => handleMetricChange('descender', Number(e.target.value))}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code text-right text-purple-600 font-bold"
              />
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Active Glyph Advance Width */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <Type className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Active Glyph Advance Width ({currentGlyph?.character})
                </span>
                <span className="text-[11px] text-slate-500">
                  Horizontal advance spacing for current character
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentGlyph?.advanceWidth || 700}
                onChange={(e) => updateAdvanceWidth(activeUnicode, Number(e.target.value))}
                className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono-code text-right text-indigo-600 font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500">units</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
