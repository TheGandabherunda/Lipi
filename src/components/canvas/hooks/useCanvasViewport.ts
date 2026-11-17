import { useEffect, useRef, useState, useCallback } from 'react';
import { useUIStore } from '../../../store/uiStore';
import type { Canvas as FabricCanvas } from 'fabric';
import { isTypingInInputElement } from '../../../utils/keyboardUtils';
import { applyCanvasInteractionMode } from '../utils/canvasInteractionMode';

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
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);

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

  // Global Pointer Move and Up for Panning
  const stopPan = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    applyCanvasInteractionMode(fabricCanvasRef.current, {
      activeTool: useUIStore.getState().activeTool,
      isSpaceHeld: isSpacePressedRef.current,
      isPanning: false,
    });
  }, [fabricCanvasRef]);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      panStartPosRef.current = { x: clientX, y: clientY };
      panOffsetRef.current = { x: panX, y: panY };
      isPanningRef.current = true;
      setIsPanning(true);
      applyCanvasInteractionMode(fabricCanvasRef.current, {
        activeTool: useUIStore.getState().activeTool,
        isSpaceHeld: isSpacePressedRef.current || isSpaceHeld,
        isPanning: true,
      });
    },
    [panX, panY, isSpaceHeld, fabricCanvasRef]
  );

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
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

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
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
        applyCanvasInteractionMode(fabricCanvasRef.current, {
          activeTool: useUIStore.getState().activeTool,
          isSpaceHeld: true,
          isPanning: isPanningRef.current,
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space key release must ALWAYS be processed, even if focus moved into an input element
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        isSpacePressedRef.current = false;
        setIsSpaceHeld(false);
        stopPan();
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
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [fabricCanvasRef, stopPan]);

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
