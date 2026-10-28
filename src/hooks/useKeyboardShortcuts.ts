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
