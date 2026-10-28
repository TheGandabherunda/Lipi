import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGlyphStore } from '../store/glyphStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing into an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Keyboard Shortcuts Dialog: '?' or 'Ctrl+/' or 'Cmd+/'
      if (
        (e.key === '?' && !isCtrlOrCmd) ||
        (isCtrlOrCmd && (e.key === '/' || e.code === 'Slash'))
      ) {
        e.preventDefault();
        const current = useUIStore.getState().isShortcutsModalOpen;
        useUIStore.getState().setShortcutsModalOpen(!current);
        return;
      }

      // Close shortcuts modal on Escape if open
      if (e.key === 'Escape' && useUIStore.getState().isShortcutsModalOpen) {
        e.preventDefault();
        useUIStore.getState().setShortcutsModalOpen(false);
        return;
      }

      // Undo: Ctrl+Z
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useGlyphStore.getState().undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === 'y') ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        useGlyphStore.getState().redo();
        return;
      }

      // Save Project: Ctrl+S
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        useGlyphStore.getState().downloadLipiFile();
        return;
      }

      // Copy: Ctrl+C / Cmd+C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lipi:canvas-copy'));
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lipi:canvas-paste'));
        return;
      }

      // Cut: Ctrl+X / Cmd+X
      if (isCtrlOrCmd && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lipi:canvas-cut'));
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lipi:canvas-duplicate'));
        return;
      }

      // Canvas Zoom In: Ctrl + / Ctrl =
      if (isCtrlOrCmd && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        const current = useUIStore.getState().zoom;
        useUIStore.getState().setZoom(Math.min(3, Math.round((current + 0.15) * 100) / 100));
        return;
      }

      // Canvas Zoom Out: Ctrl - / Ctrl _
      if (isCtrlOrCmd && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        const current = useUIStore.getState().zoom;
        useUIStore.getState().setZoom(Math.max(0.3, Math.round((current - 0.15) * 100) / 100));
        return;
      }

      // Canvas Reset Zoom: Ctrl 0
      if (isCtrlOrCmd && (e.key === '0' || e.code === 'Numpad0')) {
        e.preventDefault();
        useUIStore.getState().resetZoom();
        return;
      }

      // Tool shortcuts (Illustrator standard font tools: V, A, P, B, E, H)
      if (!isCtrlOrCmd && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') {
          useUIStore.getState().setActiveTool('select');
        } else if (k === 'a') {
          useUIStore.getState().setActiveTool('direct-select');
        } else if (k === 'p') {
          useUIStore.getState().setActiveTool('pen');
        } else if (k === 'b') {
          useUIStore.getState().setActiveTool('brush');
        } else if (k === 'e') {
          useUIStore.getState().setActiveTool('eraser');
        } else if (k === 'h') {
          useUIStore.getState().setActiveTool('pan');
        }
      }

      // Stroke width adjustments: [ and ]
      if (e.key === '[') {
        const current = useUIStore.getState().strokeWidth;
        useUIStore.getState().setStrokeWidth(Math.max(2, current - 2));
      } else if (e.key === ']') {
        const current = useUIStore.getState().strokeWidth;
        useUIStore.getState().setStrokeWidth(Math.min(64, current + 2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
