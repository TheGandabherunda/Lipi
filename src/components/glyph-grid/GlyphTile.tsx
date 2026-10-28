import React from 'react';
import type { GlyphData } from '../../types/glyph';
import { clsx } from 'clsx';

interface GlyphTileProps {
  glyph: GlyphData;
  isActive: boolean;
  onSelect: (unicode: string) => void;
}

export const GlyphTile: React.FC<GlyphTileProps> = React.memo(({ glyph, isActive, onSelect }) => {
  const handleClick = React.useCallback(() => {
    onSelect(glyph.unicode);
  }, [glyph.unicode, onSelect]);

  const hasPaths = glyph.paths && glyph.paths.length > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${glyph.name} (${glyph.unicode})`}
      className={clsx(
        'group relative flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer min-w-[72px] h-[82px] select-none text-left',
        isActive
          ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500'
          : 'bg-neutral-900/80 border-neutral-800/80 hover:bg-neutral-800/90 hover:border-neutral-700'
      )}
    >
      {/* Top Header: Unicode Subscript & Edited Indicator */}
      <div className="w-full flex items-center justify-between">
        <span className="text-[10px] font-mono-code text-neutral-400 group-hover:text-neutral-300">
          {glyph.unicode.replace('U+', '')}
        </span>
        {glyph.isEdited && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>

      {/* Center: Character preview or custom vector paths mini-render */}
      <div className="flex-1 flex items-center justify-center w-full">
        {hasPaths ? (
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Background faint reference character */}
            <span className="absolute font-kannada text-2xl font-semibold text-neutral-700 select-none opacity-40">
              {glyph.character}
            </span>
            {/* Drawn Vector preview */}
            <svg
              viewBox="0 0 800 800"
              className="w-10 h-10 z-10"
            >
              {glyph.paths.map((p, idx) => (
                <path
                  key={idx}
                  d={p.pathString}
                  stroke={isActive ? '#818cf8' : '#34d399'}
                  strokeWidth="28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </svg>
          </div>
        ) : (
          <span
            className={clsx(
              'font-kannada text-2xl font-bold transition-transform duration-100 group-hover:scale-110',
              isActive ? 'text-indigo-300' : 'text-neutral-200'
            )}
          >
            {glyph.character}
          </span>
        )}
      </div>

      {/* Bottom status badge */}
      <div className="w-full text-center">
        <span className="text-[9px] text-neutral-400 truncate block">
          {glyph.isEdited ? `${glyph.paths.length} strokes` : glyph.category.slice(0, 5)}
        </span>
      </div>
    </button>
  );
});

GlyphTile.displayName = 'GlyphTile';
