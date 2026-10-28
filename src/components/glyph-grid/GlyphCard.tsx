import React, { useMemo } from 'react';
import type { GlyphData } from '../../types/glyph';
import { useUIStore } from '../../store/uiStore';
import { useGlyphStore } from '../../store/glyphStore';
import { clsx } from 'clsx';
import { CheckCircle2, ClipboardPaste } from 'lucide-react';
import { KANNADA_VECTOR_OUTLINES } from '../../constants/kannadaVectorOutlines';

interface GlyphCardProps {
  glyph: GlyphData;
  isActive: boolean;
  onSelect: (unicode: string) => void;
}

export const GlyphCard: React.FC<GlyphCardProps> = React.memo(({ glyph, isActive, onSelect }) => {
  const handleClick = React.useCallback(() => {
    onSelect(glyph.unicode);
  }, [glyph.unicode, onSelect]);

  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const showToast = useUIStore((s) => s.showToast);
  const clipboard = useGlyphStore((s) => s.clipboard);
  const pastePaths = useGlyphStore((s) => s.pastePaths);
  const hasPaths = glyph.paths && glyph.paths.length > 0;
  const outline = activeOutlines[glyph.unicode] || KANNADA_VECTOR_OUTLINES[glyph.unicode];

  // Mathematically compute exact bounding box square viewBox so letter is 100% centered in both axes
  const squareViewBox = useMemo(() => {
    if (!outline || !outline.bbox) return '0 0 800 800';
    const { x1, y1, x2, y2 } = outline.bbox;
    const w = Math.max(10, x2 - x1);
    const h = Math.max(10, y2 - y1);
    const size = Math.max(w, h);
    const pad = Math.round(size * 0.12);
    const cx = x1 + w / 2;
    const cy = -y2 + h / 2;
    const halfSize = size / 2 + pad;
    const minX = Math.round(cx - halfSize);
    const minY = Math.round(cy - halfSize);
    const totalSize = Math.round(halfSize * 2);
    return `${minX} ${minY} ${totalSize} ${totalSize}`;
  }, [outline]);

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-150 cursor-pointer select-none bg-white h-[116px]',
        isActive
          ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-100'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md shadow-2xs'
      )}
    >
      {/* 1. Top Bar: Unicode Pill (Left) and Centered Character Badge (Right) */}
      <div className="flex items-center justify-between w-full">
        {/* Top-Left: Unicode & Letter Name */}
        <div className="flex flex-col">
          <span className="text-[10px] font-mono-code font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
            {glyph.unicode}
          </span>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[95px]">
            {glyph.name.replace('KANNADA LETTER ', '').replace('KANNADA SIGN ', '')}
          </span>
        </div>

        {/* Top-Right: Flawlessly Centered Character Container using Vector Glyph */}
        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 shadow-2xs flex items-center justify-center shrink-0">
          {outline?.svgPath ? (
            <svg viewBox={squareViewBox} className="w-[18px] h-[18px]">
              <path d={outline.svgPath} fill="#4338ca" />
            </svg>
          ) : (
            <span className="font-kannada font-bold text-xs text-indigo-700 select-none">
              {glyph.character}
            </span>
          )}
        </div>
      </div>

      {/* 2. Center: Dedicated Mini Letter Container - Clean & Perfectly Centered */}
      <div
        className={clsx(
          'relative flex-1 my-1 w-full rounded-lg border transition-all flex items-center justify-center overflow-hidden',
          isActive
            ? 'bg-indigo-50/20 border-indigo-300/80 shadow-2xs'
            : 'bg-slate-50/70 border-slate-200 group-hover:border-slate-300'
        )}
      >
        {hasPaths ? (
          <svg
            viewBox="0 0 800 800"
            className="w-full h-full p-1 relative z-10"
            preserveAspectRatio="xMidYMid meet"
          >
            {glyph.paths.map((p, idx) => (
              <path
                key={idx}
                d={p.pathString}
                stroke={isActive ? '#4f46e5' : '#0f172a'}
                strokeWidth={p.strokeWidth ? Math.max(28, p.strokeWidth * 1.5) : 32}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </svg>
        ) : outline?.svgPath ? (
          <div className="relative w-full h-full flex items-center justify-center z-10 p-1">
            <svg
              viewBox={squareViewBox}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full opacity-60 group-hover:opacity-85 transition-opacity"
            >
              <path
                d={outline.svgPath}
                fill="#1e293b"
              />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center z-10">
            <span className="font-kannada font-normal text-slate-400 text-2xl select-none">
              {glyph.character}
            </span>
          </div>
        )}
      </div>

      {/* 3. Bottom Bar: Drawn Strokes Count only when letter is edited */}
      {hasPaths && (
        <div className="flex items-center pt-0.5 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{glyph.paths.length} {glyph.paths.length === 1 ? 'stroke' : 'strokes'}</span>
          </span>
        </div>
      )}

      {/* Quick Paste Button on Hover if Clipboard has strokes */}
      {clipboard && clipboard.paths.length > 0 && !isActive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const result = pastePaths(glyph.unicode, { x: 0, y: 0 });
            onSelect(glyph.unicode);
            if (result) {
              showToast(`Pasted ${result.count} stroke(s) into '${result.targetChar}'!`);
            }
          }}
          className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md hover:bg-indigo-700 cursor-pointer"
          title={`Paste ${clipboard.paths.length} stroke(s) from '${clipboard.sourceCharacter}' into '${glyph.character}'`}
        >
          <ClipboardPaste className="w-3 h-3" />
          <span>Paste</span>
        </button>
      )}
    </div>
  );
});

GlyphCard.displayName = 'GlyphCard';
