import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import {
  Keyboard,
  X,
  Search,
  MousePointer,
  MousePointer2,
  PenTool,
  Paintbrush,
  Eraser,
  Hand,
  RotateCcw,
  RotateCw,
  Save,
  Copy,
  ClipboardPaste,
  Scissors,
  CopyPlus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Command,
  Monitor,
  CornerDownLeft,
  Move,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

type ShortcutCategory = 'all' | 'tools' | 'canvas' | 'clipboard' | 'history' | 'view';

interface ShortcutItem {
  id: string;
  title: string;
  description: string;
  category: Exclude<ShortcutCategory, 'all'>;
  keysWin: string[];
  keysMac: string[];
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // 1. Tools
  {
    id: 'tool-select',
    title: 'Selection Tool',
    description: 'Select, move, rotate, and scale vector strokes on canvas',
    category: 'tools',
    keysWin: ['V'],
    keysMac: ['V'],
    icon: MousePointer,
    badge: 'Primary',
  },
  {
    id: 'tool-direct-select',
    title: 'Direct Selection (Anchor Nodes)',
    description: 'Select anchor points and adjust Bézier direction handles directly',
    category: 'tools',
    keysWin: ['A'],
    keysMac: ['A'],
    icon: MousePointer2,
  },
  {
    id: 'tool-pen',
    title: 'Pen Tool (Bézier Curves)',
    description: 'Click to plot nodes; drag while clicking to draw smooth curves',
    category: 'tools',
    keysWin: ['P'],
    keysMac: ['P'],
    icon: PenTool,
    badge: 'Vector',
  },
  {
    id: 'tool-brush',
    title: 'Art Brush Tool',
    description: 'Freehand calligraphy with real-time curve smoothing & pen tips',
    category: 'tools',
    keysWin: ['B'],
    keysMac: ['B'],
    icon: Paintbrush,
  },
  {
    id: 'tool-eraser',
    title: 'Vector Eraser Tool',
    description: 'Click or drag across strokes to slice, trim, or delete vector paths',
    category: 'tools',
    keysWin: ['E'],
    keysMac: ['E'],
    icon: Eraser,
  },
  {
    id: 'tool-pan',
    title: 'Pan Tool (Hand)',
    description: 'Grab and scroll the canvas viewport without moving strokes',
    category: 'tools',
    keysWin: ['H'],
    keysMac: ['H'],
    icon: Hand,
  },

  // 2. Canvas & Anchor Editing
  {
    id: 'quick-pan',
    title: 'Quick Pan Viewport',
    description: 'Hold Spacebar while dragging mouse to pan from any active tool',
    category: 'canvas',
    keysWin: ['Space', '+', 'Drag'],
    keysMac: ['Space', '+', 'Drag'],
    icon: Move,
    badge: 'Handy',
  },
  {
    id: 'commit-pen',
    title: 'Commit Pen Path',
    description: 'Finalize active drawing path and convert to permanent vector stroke',
    category: 'canvas',
    keysWin: ['Enter'],
    keysMac: ['Return ↵'],
    icon: CornerDownLeft,
  },
  {
    id: 'cancel-escape',
    title: 'Cancel / Deselect All',
    description: 'Cancel unfinished pen path, clear node selection, or close dialogs',
    category: 'canvas',
    keysWin: ['Esc'],
    keysMac: ['Esc'],
    icon: X,
  },
  {
    id: 'delete-selected',
    title: 'Delete Selected',
    description: 'Remove selected vector strokes or active anchor nodes',
    category: 'canvas',
    keysWin: ['Del', 'or', 'Backspace'],
    keysMac: ['Delete ⌫'],
    icon: Trash2,
  },
  {
    id: 'nudge-node-1px',
    title: 'Nudge Anchor Point (1px)',
    description: 'Move selected anchor point by 1 pixel with precision',
    category: 'canvas',
    keysWin: ['↑', '↓', '←', '→'],
    keysMac: ['↑', '↓', '←', '→'],
    icon: Move,
  },
  {
    id: 'nudge-node-10px',
    title: 'Fast Nudge Anchor (10px)',
    description: 'Move selected anchor point by 10 pixels for fast placement',
    category: 'canvas',
    keysWin: ['Shift', '+', 'Arrow Keys'],
    keysMac: ['⇧ Shift', '+', 'Arrow Keys'],
    icon: Move,
  },
  {
    id: 'stroke-decrease',
    title: 'Decrease Stroke Thickness',
    description: 'Decrease brush & pen stroke width by 2px (min 2px)',
    category: 'canvas',
    keysWin: ['['],
    keysMac: ['['],
    icon: Paintbrush,
  },
  {
    id: 'stroke-increase',
    title: 'Increase Stroke Thickness',
    description: 'Increase brush & pen stroke width by 2px (max 64px)',
    category: 'canvas',
    keysWin: [']'],
    keysMac: [']'],
    icon: Paintbrush,
  },

  // 3. Clipboard & Cross-Letter Editing
  {
    id: 'copy-strokes',
    title: 'Copy Selected / All Strokes',
    description: 'Copy selected stroke(s) or entire active letter to global clipboard',
    category: 'clipboard',
    keysWin: ['Ctrl', '+', 'C'],
    keysMac: ['⌘ Cmd', '+', 'C'],
    icon: Copy,
    badge: 'Cross-Letter',
  },
  {
    id: 'paste-strokes',
    title: 'Paste into Letter Canvas',
    description: 'Paste copied strokes into any letter canvas with clean offset',
    category: 'clipboard',
    keysWin: ['Ctrl', '+', 'V'],
    keysMac: ['⌘ Cmd', '+', 'V'],
    icon: ClipboardPaste,
    badge: 'Cross-Letter',
  },
  {
    id: 'duplicate-stroke',
    title: 'Duplicate Stroke',
    description: 'Immediately clone selected stroke(s) with 20px placement offset',
    category: 'clipboard',
    keysWin: ['Ctrl', '+', 'D'],
    keysMac: ['⌘ Cmd', '+', 'D'],
    icon: CopyPlus,
  },
  {
    id: 'cut-stroke',
    title: 'Cut Stroke',
    description: 'Copy selected strokes to clipboard and remove from active letter',
    category: 'clipboard',
    keysWin: ['Ctrl', '+', 'X'],
    keysMac: ['⌘ Cmd', '+', 'X'],
    icon: Scissors,
  },
  {
    id: 'context-menu',
    title: 'Right-Click Context Menu',
    description: 'Right-click stroke or canvas for Copy, Paste, Duplicate, Flip & Node edit',
    category: 'clipboard',
    keysWin: ['Right Click'],
    keysMac: ['Right Click / ⌃ Click'],
    icon: Sparkles,
  },

  // 4. History & Project
  {
    id: 'undo-action',
    title: 'Undo Canvas Change',
    description: 'Revert last drawing stroke, deletion, or transform action',
    category: 'history',
    keysWin: ['Ctrl', '+', 'Z'],
    keysMac: ['⌘ Cmd', '+', 'Z'],
    icon: RotateCcw,
  },
  {
    id: 'redo-action',
    title: 'Redo Canvas Change',
    description: 'Reapply undone canvas change',
    category: 'history',
    keysWin: ['Ctrl', '+', 'Y'],
    keysMac: ['⌘ Cmd', '+', '⇧ Shift', '+', 'Z'],
    icon: RotateCw,
  },
  {
    id: 'save-project',
    title: 'Save Project File (.lipi)',
    description: 'Download and backup complete font project as a .lipi JSON file',
    category: 'history',
    keysWin: ['Ctrl', '+', 'S'],
    keysMac: ['⌘ Cmd', '+', 'S'],
    icon: Save,
  },

  // 5. Viewport & Navigation
  {
    id: 'zoom-in',
    title: 'Zoom In',
    description: 'Enlarge canvas up to 300% to view fine typographic curves',
    category: 'view',
    keysWin: ['Ctrl', '+', '+'],
    keysMac: ['⌘ Cmd', '+', '+'],
    icon: ZoomIn,
  },
  {
    id: 'zoom-out',
    title: 'Zoom Out',
    description: 'Shrink canvas down to 30% for high-level glyph view',
    category: 'view',
    keysWin: ['Ctrl', '+', '-'],
    keysMac: ['⌘ Cmd', '+', '-'],
    icon: ZoomOut,
  },
  {
    id: 'reset-zoom',
    title: 'Reset Zoom (100%)',
    description: 'Reset zoom level to standard 100% and re-center the canvas',
    category: 'view',
    keysWin: ['Ctrl', '+', '0'],
    keysMac: ['⌘ Cmd', '+', '0'],
    icon: Maximize2,
  },
  {
    id: 'wheel-zoom',
    title: 'Mouse Wheel Zoom',
    description: 'Smoothly zoom canvas centered on your mouse cursor position',
    category: 'view',
    keysWin: ['Ctrl', '+', 'Wheel'],
    keysMac: ['⌘ Cmd', '+', 'Wheel'],
    icon: Move,
  },
  {
    id: 'shortcuts-modal',
    title: 'Keyboard Shortcuts Helper',
    description: 'Toggle this interactive cheatsheet modal from anywhere',
    category: 'view',
    keysWin: ['?', 'or', 'Ctrl', '+', '/'],
    keysMac: ['?', 'or', '⌘ Cmd', '+', '/'],
    icon: Keyboard,
    badge: 'This Helper',
  },
];

const CATEGORIES: { id: ShortcutCategory; label: string }[] = [
  { id: 'all', label: 'All Shortcuts' },
  { id: 'tools', label: 'Drawing Tools' },
  { id: 'canvas', label: 'Canvas & Nodes' },
  { id: 'clipboard', label: 'Clipboard & Edit' },
  { id: 'history', label: 'History & Project' },
  { id: 'view', label: 'View & Navigation' },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.isShortcutsModalOpen);
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen);

  // Auto-detect OS
  const [os, setOs] = useState<'windows' | 'mac'>('windows');
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac'>('windows');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac =
        navigator.userAgent.toLowerCase().includes('mac') ||
        navigator.platform.toLowerCase().includes('mac');
      const detected = isMac ? 'mac' : 'windows';
      setOs(detected);
      setDetectedOs(detected);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHORTCUTS.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Text search
      if (!q) return true;
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const keysWinMatch = item.keysWin.some((k) => k.toLowerCase().includes(q));
      const keysMacMatch = item.keysMac.some((k) => k.toLowerCase().includes(q));
      return titleMatch || descMatch || keysWinMatch || keysMacMatch;
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* 1. Header with Title, OS Toggle & Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-indigo-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Keyboard Shortcuts</h3>
                <span className="text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {SHORTCUTS.length} shortcuts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Master font design in Lipi with industry-standard typography keybindings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Platform Selector Switch (Windows / Linux vs macOS) */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setOs('windows')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  os === 'windows'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="View Windows & Linux keybindings (Ctrl, Alt)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Windows / Linux</span>
                {detectedOs === 'windows' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" title="Detected OS" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setOs('mac')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  os === 'mac'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="View Apple macOS keybindings (⌘ Cmd, ⌥ Option)"
              >
                <Command className="w-3.5 h-3.5" />
                <span>macOS</span>
                {detectedOs === 'mac' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" title="Detected OS" />
                )}
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Search & Category Filters Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcut e.g. 'copy', 'pen'..."
              className="w-full pl-8.5 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Shortcuts List (2-column responsive grid) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <HelpCircle className="w-10 h-10 mb-2 opacity-40 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-700">No shortcuts found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                No matching keybindings for "{search}". Try searching for another keyword or clear filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item) => {
                const Icon = item.icon;
                const keys = os === 'mac' ? item.keysMac : item.keysWin;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all group"
                  >
                    {/* Action Title & Icon */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 px-1.5 py-0.2 rounded-md shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Physical Keycaps Display */}
                    <div className="flex items-center gap-1 shrink-0">
                      {keys.map((k, idx) => {
                        const isSeparator = k === '+' || k === 'or';
                        if (isSeparator) {
                          return (
                            <span
                              key={idx}
                              className="text-[10px] font-medium text-slate-400 px-0.5"
                            >
                              {k}
                            </span>
                          );
                        }

                        return (
                          <kbd
                            key={idx}
                            className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 text-[11px] font-mono font-bold rounded-lg border text-slate-800 bg-linear-to-b from-white to-slate-100 border-slate-300 shadow-2xs group-hover:border-indigo-300 group-hover:to-indigo-50/30 transition-all select-none"
                          >
                            {k}
                          </kbd>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Footer Tip Banner */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span>
              <strong className="text-slate-700 font-semibold">Pro Tip:</strong> Hold{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                Spacebar
              </kbd>{' '}
              any time while drawing to pan around the canvas.
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 font-mono font-bold text-slate-700">
              ?
            </kbd>
            <span>anywhere to toggle shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
