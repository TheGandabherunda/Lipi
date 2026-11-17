import React, { useState } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import {
  Plus,
  Stamp,
  X,
  Shapes,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { FontComponent } from '../../types/glyph';

export const KannadaComponentsDrawer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const components = useGlyphStore((s) => s.components);
  const insertComponent = useGlyphStore((s) => s.insertComponentIntoActiveGlyph);
  const addComponent = useGlyphStore((s) => s.addComponent);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const glyphs = useGlyphStore((s) => s.glyphs);
  const currentGlyph = glyphs[activeUnicode];

  const isComponentsDrawerOpen = useUIStore((s) => s.isComponentsDrawerOpen);
  const setComponentsDrawerOpen = useUIStore((s) => s.setComponentsDrawerOpen);
  const showToast = useUIStore((s) => s.showToast);

  if (!isComponentsDrawerOpen) return null;

  const categories = [
    { id: 'all', label: 'All Components' },
    { id: 'talekattu', label: 'ತಲೆಕಟ್ಟು (Crown)' },
    { id: 'gudisu', label: 'ಗುಡಿಸು (I/II)' },
    { id: 'kombu', label: 'ಕೊಂಬು (U/UU)' },
    { id: 'virama', label: 'ವಿರಾಮ (Halant)' },
    { id: 'vattrisuli', label: 'ವಟ್ರುಸುಳಿ (R)' },
    { id: 'loop', label: 'ಸುಳಿ (Base Loop)' },
  ];

  const filteredComponents = components.filter(
    (c) => selectedCategory === 'all' || c.category === selectedCategory
  );

  const handleInsert = (compId: string) => {
    insertComponent(compId);
    showToast(`Inserted component into ${currentGlyph?.character || 'glyph'}`);
  };

  const handleCreateFromCurrent = () => {
    if (!currentGlyph || !currentGlyph.paths || currentGlyph.paths.length === 0) {
      alert('Please draw at least one stroke before creating a custom component.');
      return;
    }

    const name = prompt('Enter a name for this custom component:', `Part from ${currentGlyph.character}`);
    if (!name || !name.trim()) return;

    const newComp: FontComponent = {
      id: `custom_comp_${Date.now()}`,
      name: name.trim(),
      nameKn: currentGlyph.character,
      category: 'custom',
      paths: currentGlyph.paths,
      defaultWidth: currentGlyph.advanceWidth || 780,
      defaultHeight: 500,
      description: `Saved from ${currentGlyph.character} (${currentGlyph.unicode})`,
      sourceGlyph: currentGlyph.unicode,
    };

    addComponent(newComp);
    showToast(`Saved component "${newComp.name}"`);
  };

  return (
    <aside className="absolute top-16 left-20 z-40 w-88 max-h-[82vh] bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 p-4 select-none flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shapes className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            Anatomical Components (ಅಂಗಗಳು)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setComponentsDrawerOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={clsx(
              'px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 max-h-[50vh] pr-1">
        {filteredComponents.map((comp) => (
          <div
            key={comp.id}
            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all bg-white shadow-2xs group"
          >
            {/* Visual SVG Mini-Preview */}
            <div className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0">
              <svg viewBox="0 0 800 800" className="w-full h-full">
                {comp.paths.map((p, idx) => (
                  <path
                    key={idx}
                    d={p.pathString}
                    stroke="#0f172a"
                    strokeWidth={p.strokeWidth ? p.strokeWidth * 1.5 : 28}
                    fill={p.fillColor && p.fillColor !== 'transparent' ? p.fillColor : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 px-2.5 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-800">
                  {comp.name}
                </span>
                <span className="font-kannada text-[10px] font-bold text-indigo-600">
                  ({comp.nameKn})
                </span>
              </div>
              <span className="text-[9px] text-slate-400 line-clamp-1">
                {comp.description}
              </span>
            </div>

            {/* Insert Button */}
            <button
              type="button"
              onClick={() => handleInsert(comp.id)}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
              title={`Stamp "${comp.name}" into current glyph`}
            >
              <Stamp className="w-3 h-3" />
              <span>Stamp</span>
            </button>
          </div>
        ))}
      </div>

      {/* Save current glyph as custom component */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCreateFromCurrent}
          className="w-full py-1.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Save Current Glyph as Component</span>
        </button>
      </div>
    </aside>
  );
};
