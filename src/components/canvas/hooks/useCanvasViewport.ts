import { useEffect, useRef, useState, useCallback } from 'react';
import { useUIStore } from '../../../store/uiStore';
import type { Canvas as FabricCanvas } from 'fabric';
import { isTypingInInputElement } from '../../../utils/keyboardUtils';

export interface UseCanvasViewportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fabricCanvasRef: React.RefObject<FabricCanvas | null>;
}

export function useCanvasViewport({ containerRef, fabricCanvasRef }: UseCanvasViewportOptions) {
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const isSpacePressedRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isResizingRef = useRef<boolean>(false);
  const resizeStartPos = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 800,
    h: 800,
  });

  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const setPan = useUIStore((s) => s.setPan);
  const canvasWidth = useUIStore((s) => s.canvasWidth);
  const canvasHeight = useUIStore((s) => s.canvasHeight);
  const setCanvasSize = useUIStore((s) => s.setCanvasSize);
  const activeTool = useUIStore((s) => s.activeTool);

  // Resize Dragging
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: canvasWidth,
      h: canvasHeight,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = (moveEvent.clientX - resizeStartPos.current.x) / zoom;
      const deltaY = (moveEvent.clientY - resizeStartPos.current.y) / zoom;
      const newWidth = Math.round(resizeStartPos.current.w + deltaX);
      const newHeight = Math.round(resizeStartPos.current.h + deltaY);
      setCanvasSize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [canvasWidth, canvasHeight, zoom, setCanvasSize]);

  // Global Pointer / Mouse Move and Up for Panning
  const stopPan = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const currentTool = useUIStore.getState().activeTool;
        canvas.selection = currentTool === 'select' && !isSpacePressedRef.current;
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = isSpacePressedRef.current
            ? 'grab'
            : currentTool === 'pan'
            ? 'grab'
            : currentTool === 'brush' || currentTool === 'eraser'
            ? 'none'
            : currentTool === 'pen'
            ? 'crosshair'
            : 'default';
        }
      }
    }
  }, [activeTool, fabricCanvasRef]);

  useEffect(() => {
    const handleGlobalPointerMove = (e: MouseEvent | PointerEvent) => {
      if (isPanningRef.current) {
        const nx = e.clientX - panStartPosRef.current.x;
        const ny = e.clientY - panStartPosRef.current.y;
        setPan(panOffsetRef.current.x + nx, panOffsetRef.current.y + ny);
      }
    };

    const handleGlobalPointerUp = () => {
      stopPan();
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('mousemove', handleGlobalPointerMove);
    window.addEventListener('mouseup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('mousemove', handleGlobalPointerMove);
      window.removeEventListener('mouseup', handleGlobalPointerUp);
    };
  }, [setPan, stopPan]);

  // Spacebar Handlers for Panning & Window Blur Safety
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInputElement(e)) {
        return;
      }

      if ((e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') && !e.repeat && !isSpacePressedRef.current) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpaceHeld(true);
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          // Disable drawing mode, marquee selection, and object interactions immediately
          canvas.isDrawingMode = false;
          canvas.selection = false;
          const activeObj = canvas.getActiveObject();
          if (activeObj) {
            activeObj.selectable = false;
            activeObj.evented = false;
          }
          canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = false;
          });
          if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.cursor = 'grab';
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space key release must ALWAYS be processed, even if focus moved into an input element
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        isSpacePressedRef.current = false;
        setIsSpaceHeld(false);
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          const currentTool = useUIStore.getState().activeTool;
          canvas.isDrawingMode = currentTool === 'brush';
          canvas.selection = currentTool === 'select';
          canvas.forEachObject((obj) => {
            obj.selectable = currentTool === 'select';
            obj.evented = currentTool === 'select' || currentTool === 'direct-select' || currentTool === 'eraser';
          });
          const activeObj = canvas.getActiveObject();
          if (activeObj) {
            activeObj.selectable = currentTool === 'select';
            activeObj.evented = currentTool === 'select';
          }
          if (!isPanningRef.current && canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.cursor =
              currentTool === 'brush' || currentTool === 'eraser'
                ? 'none'
                : currentTool === 'pan'
                ? 'grab'
                : currentTool === 'pen'
                ? 'crosshair'
                : 'default';
          }
        }
        return;
      }

      if (isTypingInInputElement(e)) {
        return;
      }
    };

    // Safely release Spacebar and Pan state if the window loses focus
    const handleWindowBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpaceHeld(false);
      stopPan();
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const currentTool = useUIStore.getState().activeTool;
        canvas.isDrawingMode = currentTool === 'brush';
        canvas.selection = currentTool === 'select';
        canvas.forEachObject((obj) => {
          obj.selectable = currentTool === 'select';
          obj.evented = currentTool === 'select' || currentTool === 'direct-select' || currentTool === 'eraser';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeTool, fabricCanvasRef, stopPan]);

  // Mouse Wheel Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || isSpacePressedRef.current) {
        e.preventDefault();
        const curZoom = useUIStore.getState().zoom;
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        const newZoom = Math.max(0.3, Math.min(3, Math.round((curZoom + delta) * 100) / 100));
        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, setZoom]);

  // Programmatic / Direct Start Pan
  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      isPanningRef.current = true;
      setIsPanning(true);
      panStartPosRef.current = { x: clientX, y: clientY };
      panOffsetRef.current = { x: useUIStore.getState().panX, y: useUIStore.getState().panY };

      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.selection = false;
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = 'grabbing';
        }
      }
    },
    [fabricCanvasRef]
  );

  // Workspace Mouse / Pointer Down Handler
  const handleWorkspaceMouseDown = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      if (e.button === 1 || isSpacePressedRef.current || activeTool === 'pan') {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
      }
    },
    [activeTool, startPan]
  );

  return {
    isSpaceHeld,
    isSpacePressedRef,
    isPanning,
    isPanningRef,
    startPan,
    stopPan,
    handleResizeMouseDown,
    handleWorkspaceMouseDown,
  };
}
