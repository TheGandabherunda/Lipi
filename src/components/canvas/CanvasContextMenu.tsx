import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Spline,
  ArrowRight,
  X,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';
import { KANNADA_CHARACTERS_LIST } from '../../constants/kannadaCharacters';

export interface CanvasContextMenuProps {
  position: { x: number; y: number } | null;
  selectedCount: number;
  strokeColor?: string;
  strokeWidth?: number;
  canPaste: boolean;
  clipboardChar?: string;
  clipboardCount?: number;
  isRightClick?: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onCut: () => void;
  onDelete: () => void;
  onFlipX: () => void;
  onFlipY: () => void;
  onEditNodes: () => void;
  onCopyToLetter: (targetUnicode: string) => void;
  onClose: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  position,
  selectedCount,
  strokeColor,
  strokeWidth,
  canPaste,
  clipboardChar,
  clipboardCount = 0,
  isRightClick = false,
  onCopy,
  onPaste,
  onDuplicate,
  onCut,
  onDelete,
  onFlipX,
  onFlipY,
  onEditNodes,
  onCopyToLetter,
  onClose,
}) => {
  const [showLetterPicker, setShowLetterPicker] = useState(false);
  const [letterSearch, setLetterSearch] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    let active = true;
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay attaching click listener to next frame so the right-click event does not immediately dismiss the menu
    const frameId = requestAnimationFrame(() => {
      if (active) {
        window.addEventListener('pointerdown', handleOutsideClick);
        window.addEventListener('keydown', handleKeyDown);
      }
    });

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  // Filtered letters for the "Copy to Letter..." picker
  const filteredLetters = KANNADA_CHARACTERS_LIST.filter(
    (item) =>
      item.character.includes(letterSearch) ||
      item.name.toLowerCase().includes(letterSearch.toLowerCase()) ||
      item.unicode.toLowerCase().includes(letterSearch.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        left: `${Math.max(16, Math.min(window.innerWidth - 260, position.x))}px`,
        top: `${Math.max(64, Math.min(window.innerHeight - 340, position.y))}px`,
      }}
      className={clsx(
        'fixed z-50 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-150',
        isRightClick ? 'w-64' : 'w-auto max-w-sm'
      )}
    >
      {/* 1. Header with Stroke Info & Dismiss */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
        <div className="flex items-center gap-1.5">
          {strokeColor && (
            <span
              className="w-3 h-3 rounded-full border border-slate-200 inline-block shadow-2xs"
              style={{ backgroundColor: strokeColor }}
            />
          )}
          <span className="font-bold text-slate-800">
            {selectedCount > 1
              ? `${selectedCount} Strokes Selected`
              : selectedCount === 1
              ? `Stroke ${strokeWidth ? `(${strokeWidth}px)` : ''}`
              : 'Canvas Options'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Primary Actions List */}
      <div className="flex flex-col gap-0.5 text-xs text-slate-700">
        {/* Copy */}
        <button
          type="button"
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium">
              {selectedCount > 0 ? 'Copy Selected' : 'Copy All Letter Strokes'}
            </span>
          </span>
          <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+C</kbd>
        </button>

        {/* Paste */}
        <button
          type="button"
          onClick={() => {
            onPaste();
            onClose();
          }}
          disabled={!canPaste}
          className={clsx(
            'w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors',
            canPaste
              ? 'hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer text-slate-700'
              : 'text-slate-300 cursor-not-allowed'
          )}
        >
          <span className="flex items-center gap-2">
            <ClipboardPaste className={clsx('w-3.5 h-3.5', canPaste ? 'text-indigo-600' : 'text-slate-300')} />
            <span className="font-medium">
              Paste {clipboardChar ? `from '${clipboardChar}'` : ''}
            </span>
          </span>
          {canPaste && clipboardCount > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full">
              {clipboardCount}
            </span>
          )}
          <kbd className="text-[10px] text-slate-400 font-mono ml-auto pl-2">Ctrl+V</kbd>
        </button>

        {selectedCount > 0 && (
          <>
            {/* Duplicate */}
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <CopyPlus className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">Duplicate</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+D</kbd>
            </button>

            {/* Cut */}
            <button
              type="button"
              onClick={() => {
                onCut();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">Cut</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+X</kbd>
            </button>

            <div className="h-px bg-slate-100 my-0.5" />

            {/* Edit Nodes (Direct Selection) */}
            <button
              type="button"
              onClick={() => {
                onEditNodes();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Spline className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Edit Anchor Nodes</span>
              </span>
              <kbd className="text-[10px] text-slate-400 font-mono">A</kbd>
            </button>

            {/* Transform: Flip Horizontal / Vertical */}
            <div className="grid grid-cols-2 gap-1 py-0.5">
              <button
                type="button"
                onClick={() => {
                  onFlipX();
                  onClose();
                }}
                className="px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors"
                title="Flip horizontally"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Flip X</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onFlipY();
                  onClose();
                }}
                className="px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors"
                title="Flip vertically"
              >
                <FlipVertical className="w-3.5 h-3.5 text-slate-500" />
                <span>Flip Y</span>
              </button>
            </div>

            <div className="h-px bg-slate-100 my-0.5" />

            {/* Copy to Another Letter (Direct Cross-Letter Transfer) */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setShowLetterPicker(!showLetterPicker)}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-medium">Paste / Copy to Letter...</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-bold">Pick &rarr;</span>
              </button>

              {/* Sub-picker for Kannada letters */}
              {showLetterPicker && (
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1.5 max-h-48 overflow-y-auto animate-in fade-in duration-100">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={letterSearch}
                      onChange={(e) => setLetterSearch(e.target.value)}
                      placeholder="Search letter (e.g. ಆ, ಕ)..."
                      className="w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {filteredLetters.slice(0, 25).map((item) => (
                      <button
                        key={item.unicode}
                        type="button"
                        onClick={() => {
                          onCopyToLetter(item.unicode);
                          onClose();
                        }}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-800 font-bold font-kannada text-xs flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                        title={`Copy stroke into ${item.character} (${item.name})`}
                      >
                        {item.character}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 my-0.5" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-50 hover:text-rose-700 text-rose-600 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold">Delete Selected</span>
              </span>
              <kbd className="text-[10px] text-rose-400 font-mono">Del</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
