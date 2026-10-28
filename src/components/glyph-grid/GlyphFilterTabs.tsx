import React from 'react';
import { useUIStore } from '../../store/uiStore';
import type { KannadaCategory } from '../../types/glyph';
import { Search, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface TabItem {
  id: KannadaCategory | 'all';
  labelKn: string;
  labelEn: string;
}

const TABS: TabItem[] = [
  { id: 'all', labelKn: 'ಎಲ್ಲಾ', labelEn: 'All' },
  { id: 'swaragalu', labelKn: 'ಸ್ವರಗಳು', labelEn: 'Vowels' },
  { id: 'vyanjanagalu', labelKn: 'ವ್ಯಂಜನಗಳು', labelEn: 'Consonants' },
  { id: 'gunithakshara', labelKn: 'ಗುಣಿತಾಕ್ಷರ', labelEn: 'Matras' },
  { id: 'numbers', labelKn: 'ಅಂಕಿಗಳು', labelEn: 'Digits' },
  { id: 'yogavahagalu', labelKn: 'ಯೋಗವಾಹ', labelEn: 'Yogavaha' },
  { id: 'modifiers', labelKn: 'ಇತರೆ', labelEn: 'Modifiers' },
];

export const GlyphFilterTabs: React.FC = () => {
  const categoryFilter = useUIStore((s) => s.categoryFilter);
  const setCategoryFilter = useUIStore((s) => s.setCategoryFilter);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const showOnlyEdited = useUIStore((s) => s.showOnlyEdited);
  const setShowOnlyEdited = useUIStore((s) => s.setShowOnlyEdited);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {TABS.map((tab) => {
          const isSelected = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer',
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
              )}
            >
              <span className="font-kannada font-semibold">{tab.labelKn}</span>
              <span className="text-[10px] opacity-70">({tab.labelEn})</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls: Filter Edited & Search Input */}
      <div className="flex items-center gap-3">
        {/* Toggle show edited */}
        <button
          type="button"
          onClick={() => setShowOnlyEdited(!showOnlyEdited)}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
            showOnlyEdited
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Edited Only</span>
        </button>

        {/* Search bar */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ಕ, U+0C95..."
            className="pl-8 pr-3 py-1 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-36 transition-all"
          />
        </div>
      </div>
    </div>
  );
};
