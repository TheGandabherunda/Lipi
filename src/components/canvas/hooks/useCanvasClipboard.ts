import { useEffect, useCallback } from 'react';
import { Path, ActiveSelection, type Canvas as FabricCanvas, type FabricObject } from 'fabric';
import { useGlyphStore } from '../../../store/glyphStore';
import { useUIStore } from '../../../store/uiStore';
import { translateSVGPathString } from '../../../utils/svgExport';
import { cloneVectorPaths } from '../../../utils/glyphUtils';
import { serializeFabricPathObject } from '../utils/canvasSerialization';
import type { VectorPathData } from '../../../types/glyph';

export interface UseCanvasClipboardOptions {
  fabricCanvasRef: React.RefObject<FabricCanvas | null>;
  syncToStoreDebounced: () => void;
}

export function useCanvasClipboard({ fabricCanvasRef, syncToStoreDebounced }: UseCanvasClipboardOptions) {
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const currentGlyph = useGlyphStore((s) => s.glyphs[s.activeUnicode]);
  const activeTool = useUIStore((s) => s.activeTool);
  const strokeColor = useUIStore((s) => s.strokeColor);

  // 1. COPY ACTION
  const handleCopy = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjs = canvas.getActiveObjects();
    let pathsToCopy: VectorPathData[] = [];

    if (activeObjs.length > 0) {
      activeObjs.forEach((obj, idx) => {
        const serialized = serializeFabricPathObject(obj, idx);
        if (serialized) pathsToCopy.push(serialized);
      });
    } else {
      pathsToCopy = cloneVectorPaths(currentGlyph?.paths || []);
    }

    if (pathsToCopy.length === 0) {
      useUIStore.getState().showToast('No strokes to copy on this canvas.');
      return;
    }

    useGlyphStore.getState().copyPaths(pathsToCopy);
    useUIStore.getState().showToast(
      `Copied ${pathsToCopy.length} stroke${pathsToCopy.length > 1 ? 's' : ''} from '${currentGlyph?.character || 'ಅ'}'. Switch to any letter and press Ctrl+V to paste!`
    );
  }, [currentGlyph, fabricCanvasRef]);

  // 2. PASTE ACTION
  const handlePaste = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const clip = useGlyphStore.getState().clipboard;
    if (!clip || clip.paths.length === 0) {
      useUIStore.getState().showToast('Clipboard is empty! Copy strokes with Ctrl+C first.');
      return;
    }

    const isSameGlyph = activeUnicode === clip.sourceUnicode;
    const dx = isSameGlyph ? 24 : 0;
    const dy = isSameGlyph ? 24 : 0;

    const newlyAdded: FabricObject[] = [];
    const clonedClipboardPaths = cloneVectorPaths(clip.paths);

    clonedClipboardPaths.forEach((p, idx) => {
      try {
        const translatedStr = dx !== 0 || dy !== 0 ? translateSVGPathString(p.pathString, dx, dy) : p.pathString;
        const pathObj = new Path(translatedStr, {
          stroke: p.fillColor ? undefined : (p.strokeColor || strokeColor),
          strokeWidth: p.fillColor ? 0 : (p.strokeWidth || 16),
          fill: p.fillColor || undefined,
          strokeLineCap: p.strokeLineCap || 'round',
          strokeLineJoin: p.strokeLineJoin || 'round',
          selectable: activeTool === 'select',
          evented: true,
        });
        (pathObj as any).id = `pasted_${Date.now()}_${idx}`;
        canvas.add(pathObj);
        newlyAdded.push(pathObj);
      } catch (e) {
        console.warn('Failed to paste path:', e);
      }
    });

    if (newlyAdded.length > 0) {
      canvas.discardActiveObject();
      if (newlyAdded.length === 1) {
        canvas.setActiveObject(newlyAdded[0]);
      } else {
        const sel = new ActiveSelection(newlyAdded, { canvas });
        canvas.setActiveObject(sel);
      }
      canvas.requestRenderAll();
      syncToStoreDebounced();

      useUIStore.getState().showToast(
        `Pasted ${newlyAdded.length} stroke${newlyAdded.length > 1 ? 's' : ''} from '${clip.sourceCharacter}' into '${currentGlyph?.character || 'ಅ'}'!`
      );
    }
  }, [activeUnicode, currentGlyph, strokeColor, activeTool, fabricCanvasRef, syncToStoreDebounced]);

  // 3. DUPLICATE ACTION
  const handleDuplicate = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length === 0) return;

    const newlyAdded: FabricObject[] = [];
    activeObjs.forEach((obj, idx) => {
      const serialized = serializeFabricPathObject(obj, idx);
      if (serialized) {
        const translated = translateSVGPathString(serialized.pathString, 20, 20);
        const dupObj = new Path(translated, {
          stroke: serialized.fillColor ? undefined : serialized.strokeColor,
          strokeWidth: serialized.fillColor ? 0 : serialized.strokeWidth,
          fill: serialized.fillColor,
          strokeLineCap: serialized.strokeLineCap,
          strokeLineJoin: serialized.strokeLineJoin,
          selectable: true,
          evented: true,
        });
        (dupObj as any).id = `dup_${Date.now()}_${idx}`;
        canvas.add(dupObj);
        newlyAdded.push(dupObj);
      }
    });

    if (newlyAdded.length > 0) {
      canvas.discardActiveObject();
      if (newlyAdded.length === 1) {
        canvas.setActiveObject(newlyAdded[0]);
      } else {
        const sel = new ActiveSelection(newlyAdded, { canvas });
        canvas.setActiveObject(sel);
      }
      canvas.requestRenderAll();
      syncToStoreDebounced();
      useUIStore.getState().showToast(`Duplicated ${newlyAdded.length} stroke${newlyAdded.length > 1 ? 's' : ''}`);
    }
  }, [fabricCanvasRef, syncToStoreDebounced]);

  // 4. CUT ACTION
  const handleCut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length === 0) return;

    handleCopy();
    activeObjs.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncToStoreDebounced();
  }, [fabricCanvasRef, handleCopy, syncToStoreDebounced]);

  // Register Global Canvas Shortcuts / Events
  useEffect(() => {
    const onCopy = () => handleCopy();
    const onPaste = () => handlePaste();
    const onCut = () => handleCut();
    const onDuplicate = () => handleDuplicate();

    window.addEventListener('lipi:canvas-copy', onCopy);
    window.addEventListener('lipi:canvas-paste', onPaste);
    window.addEventListener('lipi:canvas-cut', onCut);
    window.addEventListener('lipi:canvas-duplicate', onDuplicate);

    return () => {
      window.removeEventListener('lipi:canvas-copy', onCopy);
      window.removeEventListener('lipi:canvas-paste', onPaste);
      window.removeEventListener('lipi:canvas-cut', onCut);
      window.removeEventListener('lipi:canvas-duplicate', onDuplicate);
    };
  }, [handleCopy, handlePaste, handleCut, handleDuplicate]);

  return {
    handleCopy,
    handlePaste,
    handleCut,
    handleDuplicate,
  };
}
