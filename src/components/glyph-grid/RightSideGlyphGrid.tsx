import React, { useMemo, useCallback, useRef } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { GlyphCard } from './GlyphCard';
import { KANNADA_CHARACTERS_LIST } from '../../constants/kannadaCharacters';
import type { KannadaCategory } from '../../types/glyph';
import { Search, Sparkles, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORY_TABS: { id: KannadaCategory | 'all'; labelKn: string; labelEn: string }[] = [
  { id: 'all', labelKn: 'ಎಲ್ಲಾ', labelEn: 'All' },
  { id: 'swaragalu', labelKn: 'ಸ್ವರ', labelEn: 'Vowels' },
  { id: 'vyanjanagalu', labelKn: 'ವ್ಯಂಜನ', labelEn: 'Consonants' },
  { id: 'gunithakshara', labelKn: 'ಮಾತ್ರೆ', labelEn: 'Matras' },
  { id: 'numbers', labelKn: 'ಅಂಕಿ', labelEn: 'Digits' },
  { id: 'yogavahagalu', labelKn: 'ಯೋಗ', labelEn: 'Yogavaha' },
];

export const RightSideGlyphGrid: React.FC = React.memo(() => {
  const glyphs = useGlyphStore((s) => s.glyphs);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const setActiveUnicode = useGlyphStore((s) => s.setActiveUnicode);

  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const categoryFilter = useUIStore((s) => s.categoryFilter);
  const setCategoryFilter = useUIStore((s) => s.setCategoryFilter);
  const searchQuery = useUIStore((s) => s.searchQuery.trim().toLowerCase());
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const showOnlyEdited = useUIStore((s) => s.showOnlyEdited);
  const setShowOnlyEdited = useUIStore((s) => s.setShowOnlyEdited);

  const isDraggingSplitter = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);

  const handleSelect = useCallback(
    (unicode: string) => {
      setActiveUnicode(unicode);
    },
    [setActiveUnicode]
  );

  // Filtered glyphs list
  const filteredGlyphs = useMemo(() => {
    return KANNADA_CHARACTERS_LIST.map((c) => glyphs[c.unicode] || {
      unicode: c.unicode,
      character: c.character,
      name: c.name,
      category: c.category,
      sampleWord: c.sampleWord,
      sampleWordMeaning: c.sampleWordMeaning,
      paths: [],
      advanceWidth: c.defaultAdvanceWidth,
      isEdited: false,
    }).filter((glyph) => {
      if (categoryFilter !== 'all' && glyph.category !== categoryFilter) {
        return false;
      }
      if (showOnlyEdited && !glyph.isEdited) {
        return false;
      }
      if (searchQuery) {
        const matchesChar = glyph.character.toLowerCase().includes(searchQuery);
        const matchesName = glyph.name.toLowerCase().includes(searchQuery);
        const matchesUnicode = glyph.unicode.toLowerCase().includes(searchQuery);
        if (!matchesChar && !matchesName && !matchesUnicode) {
          return false;
        }
      }
      return true;
    });
  }, [glyphs, categoryFilter, showOnlyEdited, searchQuery]);

  const editedCount = useMemo(() => {
    return Object.values(glyphs).filter((g) => g.isEdited).length;
  }, [glyphs]);

  // Handle Dragging Splitter to resize sidebar
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const delta = startXRef.current - ev.clientX; // Drag left increases width
      setSidebarWidth(startWidthRef.current + delta);
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <aside
      className="relative h-full flex flex-col bg-white border-l border-slate-200 shadow-sm z-20 shrink-0"
      style={{ width: sidebarWidth }}
    >
      {/* Left Resizer Drag Handle */}
      <div
        onMouseDown={handleSplitterMouseDown}
        className="absolute top-0 -left-1.5 w-3 h-full cursor-col-resize z-30 group flex items-center justify-center hover:bg-indigo-500/10 transition-colors"
        title="Drag to resize sidebar width"
      >
        <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors flex items-center justify-center">
          <GripVertical className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100" />
        </div>
      </div>

      {/* Search & Category Filter Header */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Kannada letter (ಕ, ಅ, U+0C95)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1 shrink-0 cursor-pointer',
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                )}
              >
                <span className="font-kannada">{tab.labelKn}</span>
                <span className="text-[10px] opacity-70">({tab.labelEn})</span>
              </button>
            );
          })}
        </div>

        {/* Below filter chips: show 0/78 drawn count & Edited Only filter */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <strong className="text-indigo-600 font-bold">{editedCount}</strong>/{KANNADA_CHARACTERS_LIST.length} drawn
          </span>
          <button
            type="button"
            onClick={() => setShowOnlyEdited(!showOnlyEdited)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
              showOnlyEdited
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Edited Only</span>
          </button>
        </div>
      </div>

      {/* Cards Grid: 2 columns scrollable area */}
      <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/50">
        {filteredGlyphs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <p className="text-sm">No characters found.</p>
            <p className="text-xs mt-1">Try clearing your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredGlyphs.map((glyph) => (
              <GlyphCard
                key={glyph.unicode}
                glyph={glyph}
                isActive={glyph.unicode === activeUnicode}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
});

RightSideGlyphGrid.displayName = 'RightSideGlyphGrid';
