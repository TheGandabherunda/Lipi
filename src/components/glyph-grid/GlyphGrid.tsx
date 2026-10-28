import React, { useMemo, useCallback } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { GlyphTile } from './GlyphTile';
import { GlyphFilterTabs } from './GlyphFilterTabs';
import { KANNADA_CHARACTERS_LIST } from '../../constants/kannadaCharacters';

export const GlyphGrid: React.FC = React.memo(() => {
  const glyphs = useGlyphStore((s) => s.glyphs);
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const setActiveUnicode = useGlyphStore((s) => s.setActiveUnicode);

  const categoryFilter = useUIStore((s) => s.categoryFilter);
  const searchQuery = useUIStore((s) => s.searchQuery.trim().toLowerCase());
  const showOnlyEdited = useUIStore((s) => s.showOnlyEdited);

  const handleSelect = useCallback(
    (unicode: string) => {
      setActiveUnicode(unicode);
    },
    [setActiveUnicode]
  );

  // Compute filtered list without re-rendering on mouse events
  const filteredGlyphs = useMemo(() => {
    return KANNADA_CHARACTERS_LIST.map((c) => glyphs[c.unicode] || {
      unicode: c.unicode,
      character: c.character,
      name: c.name,
      category: c.category,
      paths: [],
      advanceWidth: c.defaultAdvanceWidth,
      isEdited: false,
    }).filter((glyph) => {
      // Category filter
      if (categoryFilter !== 'all' && glyph.category !== categoryFilter) {
        return false;
      }
      // Edited filter
      if (showOnlyEdited && !glyph.isEdited) {
        return false;
      }
      // Search filter (by character, name, or unicode)
      if (searchQuery) {
        const matchesChar = glyph.character.toLowerCase().includes(searchQuery);
        const matchesName = glyph.name.toLowerCase().includes(searchQuery);
        const matchesUnicode = glyph.unicode.toLowerCase().includes(searchQuery);
        if (!matchesChar && !matchesName && !matchesUnicode) return false;
      }
      return true;
    });
  }, [glyphs, categoryFilter, showOnlyEdited, searchQuery]);

  return (
    <div className="w-full flex flex-col bg-neutral-950 border-t border-neutral-800 shadow-2xl z-20">
      {/* Category Tabs & Search Bar */}
      <GlyphFilterTabs />

      {/* Horizontal Scrollable Tiles Strip */}
      <div className="flex items-center gap-2 p-3 overflow-x-auto min-h-[106px] max-h-[106px] scrollbar-thin">
        {filteredGlyphs.length === 0 ? (
          <div className="w-full flex items-center justify-center py-4 text-xs text-neutral-500">
            No Kannada characters match your criteria.
          </div>
        ) : (
          filteredGlyphs.map((glyph) => (
            <GlyphTile
              key={glyph.unicode}
              glyph={glyph}
              isActive={glyph.unicode === activeUnicode}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
});

GlyphGrid.displayName = 'GlyphGrid';
