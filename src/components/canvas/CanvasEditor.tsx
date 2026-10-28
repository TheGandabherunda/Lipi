import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Canvas, PencilBrush, Path, ActiveSelection, util, type FabricObject } from 'fabric';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { calculateGuidelinePositions, renderCanvasGuidelines } from './CanvasGuidelines';
import { fabricSegmentsToPathString } from '../../utils/svgExport';
import type { VectorPathData } from '../../types/glyph';
import {
  eraseStrokesAlongSegment,
  samplePointsFromFabricSegments,
  pointsToCalligraphyRibbon,
  penNodesToSVGPath,
  autoComputeSmoothCircularHandles,
  type PenNode,
} from '../../utils/strokeTools';
import { pointsToSmoothSVGPath, type Point } from '../../utils/curveSmoothing';
import {
  fabricPathToEditableSubpaths,
  rebuildFabricPathFromSubpaths,
  findClosestPointOnSubpaths,
  insertNodeOnSegment,
  deleteNodesFromSubpaths,
  toggleNodeSmoothCorner,
  reverseSubpath,
  hitTestSubpathNode,
  pointDistance,
  type EditableSubpath,
} from '../../utils/pathNodeEditor';
import {
  MoveDiagonal,
  RotateCcw,
  Spline,
  Square,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { CanvasReferenceFontControl } from './CanvasReferenceFontControl';

export const CanvasEditor: React.FC = React.memo(() => {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const penOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const isInternalUpdateRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pen tool & Eraser interactive state refs
  const penNodesRef = useRef<PenNode[]>([]);
  const activeDragIndexRef = useRef<number | null>(null);
  const hoverPosRef = useRef<Point | null>(null);
  const isNearStartRef = useRef<boolean>(false);
  const penDragStartPosRef = useRef<Point | null>(null);
  const lastEraserPosRef = useRef<Point | null>(null);

  // Direct selection & Node-level editing interactive state refs
  const selectedPathObjRef = useRef<Path | null>(null);
  const editableSubpathsRef = useRef<EditableSubpath[]>([]);
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const activeNodeDragRef = useRef<{
    type: 'anchor' | 'handleIn' | 'handleOut';
    subpathIndex: number;
    nodeIndex: number;
    startMouse: Point;
    initialNodePositions: Map<string, { x: number; y: number; handleIn?: Point | null; handleOut?: Point | null }>;
  } | null>(null);
  const hoveredNodeInfoRef = useRef<{
    subpathIndex: number;
    nodeIndex: number;
    type: 'anchor' | 'handleIn' | 'handleOut';
  } | null>(null);
  const hoveredSegmentRef = useRef<{
    subpathIndex: number;
    segmentIndex: number;
    t: number;
    point: Point;
  } | null>(null);
  const marqueeBoxRef = useRef<{ start: Point; current: Point } | null>(null);

  const [selectedNodesCount, setSelectedNodesCount] = useState<number>(0);
  const [activeNodeCoords, setActiveNodeCoords] = useState<{ x: number; y: number } | null>(null);
  const [hasActivePath, setHasActivePath] = useState<boolean>(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);

  const isSpacePressedRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resizing state
  const isResizingRef = useRef<boolean>(false);
  const resizeStartPos = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 800, h: 800 });



  // Zustand state slices
  const activeUnicode = useGlyphStore((s) => s.activeUnicode);
  const currentGlyph = useGlyphStore((s) => s.glyphs[s.activeUnicode]);
  const metrics = useGlyphStore((s) => s.metadata.metrics);
  const updateActiveGlyphPaths = useGlyphStore((s) => s.updateActiveGlyphPaths);

  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const penMode = useUIStore((s) => s.penMode);
  const brushTip = useUIStore((s) => s.brushTip);
  const strokeWidth = useUIStore((s) => s.strokeWidth);
  const strokeColor = useUIStore((s) => s.strokeColor);
  const fillColor = useUIStore((s) => s.fillColor);
  const smoothing = useUIStore((s) => s.smoothing);
  const strokeCap = useUIStore((s) => s.strokeCap);
  const strokeJoin = useUIStore((s) => s.strokeJoin);
  const eraserSize = useUIStore((s) => s.eraserSize);
  const guidelinesConfig = useUIStore((s) => s.guidelines);
  const zoom = useUIStore((s) => s.zoom);
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);

  // Canvas Dimensions & Simplified Tracing (Outline + Transparency)
  const canvasWidth = useUIStore((s) => s.canvasWidth);
  const canvasHeight = useUIStore((s) => s.canvasHeight);
  const setCanvasSize = useUIStore((s) => s.setCanvasSize);
  const tracing = useUIStore((s) => s.tracing);
  const activeOutlines = useUIStore((s) => s.activeOutlines);

  // Active outline for the current Unicode
  const activeOutline = activeOutlines[activeUnicode];

  // Compute guideline coordinates matching the active letter's exact OpenType advance width
  const guidePositions = useMemo(() => {
    const advance = activeOutline?.advanceWidth || currentGlyph?.advanceWidth || 778;
    return calculateGuidelinePositions(
      canvasWidth,
      canvasHeight,
      metrics,
      advance
    );
  }, [canvasWidth, canvasHeight, metrics, activeOutline?.advanceWidth, currentGlyph?.advanceWidth]);

  // Render guidelines & clean outline template on the guide canvas
  const drawGuidelines = useCallback(() => {
    const guideCanvas = guideCanvasRef.current;
    if (!guideCanvas) return;
    const ctx = guideCanvas.getContext('2d');
    if (!ctx) return;

    renderCanvasGuidelines(
      ctx,
      canvasWidth,
      canvasHeight,
      guidePositions,
      guidelinesConfig,
      tracing,
      activeUnicode,
      undefined,
      activeOutlines
    );
  }, [
    canvasWidth,
    canvasHeight,
    guidePositions,
    guidelinesConfig,
    tracing,
    activeUnicode,
    activeOutlines,
  ]);

  useEffect(() => {
    drawGuidelines();
  }, [drawGuidelines]);

  // Render pen, eraser, and direct-selection node editing overlay
  const renderOverlay = useCallback(() => {
    const overlay = penOverlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const tool = activeTool;
    const curColor = strokeColor;
    const curWidth = strokeWidth;
    const curCap = strokeCap;
    const curJoin = strokeJoin;
    const curEraserSize = eraserSize;

    // 1. Eraser Tool: draw circular eraser indicator
    if (tool === 'eraser' && hoverPosRef.current) {
      const { x, y } = hoverPosRef.current;
      const radius = curEraserSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 1b. Brush Tool: draw circular brush indicator matching exact strokeWidth
    if (tool === 'brush' && hoverPosRef.current) {
      const { x, y } = hoverPosRef.current;
      const radius = Math.max(1.5, curWidth / 2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = curColor ? `${curColor}14` : 'rgba(79, 70, 229, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Center precision point
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. Illustrator Pen Tool overlay (drawing new stroke)
    if (tool === 'pen') {
      const nodes = penNodesRef.current;
      const hover = hoverPosRef.current;
      const isNearStart = isNearStartRef.current;

      if (nodes.length > 0 || hover) {
        ctx.save();

        if (penMode === 'sharp') {
          // --- SHARP PEN MODE: Polyline / Corner Segments ---
          if (nodes.length >= 1) {
            ctx.beginPath();
            ctx.moveTo(nodes[0].x, nodes[0].y);
            for (let i = 1; i < nodes.length; i++) {
              ctx.lineTo(nodes[i].x, nodes[i].y);
            }
            ctx.strokeStyle = curColor;
            ctx.lineWidth = curWidth;
            ctx.lineCap = curCap;
            ctx.lineJoin = 'miter';
            ctx.stroke();
          }

          // Sharp rubberband line to cursor
          if (nodes.length > 0 && hover && activeDragIndexRef.current === null) {
            const last = nodes[nodes.length - 1];
            const target = isNearStart ? nodes[0] : hover;

            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = isNearStart ? '#10b981' : '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Draw diamond corner anchors
          nodes.forEach((node, idx) => {
            const isFirst = idx === 0;
            const sz = isFirst && isNearStart ? 8 : 6;
            ctx.save();
            ctx.translate(node.x, node.y);
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.rect(-sz / 2, -sz / 2, sz, sz);
            ctx.fillStyle = isFirst && isNearStart ? '#10b981' : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = isFirst && isNearStart ? '#047857' : '#d97706';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          });
        } else {
          // --- ROUNDED PEN MODE: Continuous Smooth Circular Curvature (Illustrator Curvature Tool) ---
          if (isNearStart && nodes.length >= 2) {
            // Path closure preview: compute seamless closed circular handles
            const closedNodes = autoComputeSmoothCircularHandles(
              nodes.map((n) => ({ ...n })),
              true
            );

            ctx.beginPath();
            ctx.moveTo(closedNodes[0].x, closedNodes[0].y);
            for (let i = 1; i < closedNodes.length; i++) {
              const prev = closedNodes[i - 1];
              const curr = closedNodes[i];
              const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
              const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
              ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
            }
            const last = closedNodes[closedNodes.length - 1];
            const first = closedNodes[0];
            const cp1 = last.handleOut || { x: last.x, y: last.y };
            const cp2 = first.handleIn || { x: first.x, y: first.y };
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.x, first.y);

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = curWidth;
            ctx.lineCap = curCap;
            ctx.lineJoin = curJoin;
            ctx.stroke();

            // Draw anchor points for closure
            closedNodes.forEach((node, idx) => {
              const isFirst = idx === 0;
              ctx.beginPath();
              ctx.arc(node.x, node.y, isFirst ? 5 : 4, 0, Math.PI * 2);
              ctx.fillStyle = isFirst ? '#10b981' : '#ffffff';
              ctx.fill();
              ctx.strokeStyle = isFirst ? '#047857' : '#2563eb';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              if (isFirst) {
                // Circle indicator next to cursor/anchor for "Close Path"
                ctx.beginPath();
                ctx.arc(node.x + 12, node.y - 12, 4.5, 0, Math.PI * 2);
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 1.8;
                ctx.stroke();
              }
            });
          } else {
            // Open continuous circular curvature
            const computedNodes = autoComputeSmoothCircularHandles(
              nodes.map((n) => ({ ...n })),
              false
            );

            // 1. Placed solid path
            if (computedNodes.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(computedNodes[0].x, computedNodes[0].y);
              for (let i = 1; i < computedNodes.length; i++) {
                const prev = computedNodes[i - 1];
                const curr = computedNodes[i];
                const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
                const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
              }
              ctx.strokeStyle = curColor;
              ctx.lineWidth = curWidth;
              ctx.lineCap = curCap;
              ctx.lineJoin = curJoin;
              ctx.stroke();
            }

            // 2. Continuous circular rubberband curve to mouse cursor
            if (nodes.length > 0 && hover && activeDragIndexRef.current === null) {
              const extNodes = autoComputeSmoothCircularHandles(
                [
                  ...nodes.map((n) => ({ ...n })),
                  { x: hover.x, y: hover.y, type: 'smooth' as const },
                ],
                false
              );

              const prev = extNodes[extNodes.length - 2];
              const curr = extNodes[extNodes.length - 1];
              const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
              const cp2 = curr.handleIn || { x: curr.x, y: curr.y };

              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // 3. Tangent handles & anchor points
            computedNodes.forEach((node, idx) => {
              if (node.handleIn) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.handleIn.x, node.handleIn.y);
                ctx.strokeStyle = '#93c5fd';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(node.handleIn.x, node.handleIn.y, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
              }

              if (node.handleOut) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.handleOut.x, node.handleOut.y);
                ctx.strokeStyle = '#93c5fd';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(node.handleOut.x, node.handleOut.y, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
              }

              const isFirst = idx === 0;
              const isCorner = node.type === 'corner';

              if (isCorner) {
                // Diamond for corner anchors
                const sz = 6;
                ctx.save();
                ctx.translate(node.x, node.y);
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.rect(-sz / 2, -sz / 2, sz, sz);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
              } else {
                // Smooth circular anchor
                ctx.beginPath();
                ctx.arc(node.x, node.y, isFirst ? 5 : 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            });
          }
        }

        ctx.restore();
      }
    }

    // 3. Illustrator Direct Selection & Node Editing Overlay (A tool & path editing)
    if (
      activeTool === 'direct-select' ||
      (activeTool === 'pen' && penNodesRef.current.length === 0 && selectedPathObjRef.current)
    ) {
      const subpaths = editableSubpathsRef.current;
      const selectedIds = selectedNodeIdsRef.current;

      if (subpaths.length > 0) {
        ctx.save();

        // A. Draw crisp path contour outline indicator
        subpaths.forEach((sub) => {
          if (sub.nodes.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(sub.nodes[0].x, sub.nodes[0].y);
            for (let i = 1; i < sub.nodes.length; i++) {
              const prev = sub.nodes[i - 1];
              const curr = sub.nodes[i];
              if (prev.handleOut || curr.handleIn) {
                const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
                const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
              } else {
                ctx.lineTo(curr.x, curr.y);
              }
            }
            if (sub.isClosed) {
              const last = sub.nodes[sub.nodes.length - 1];
              const first = sub.nodes[0];
              if (last.handleOut || first.handleIn) {
                const cp1 = last.handleOut || { x: last.x, y: last.y };
                const cp2 = first.handleIn || { x: first.x, y: first.y };
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.x, first.y);
              } else {
                ctx.lineTo(first.x, first.y);
              }
            }
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // B. Draw Bézier Handles and Grips
        subpaths.forEach((sub) => {
          sub.nodes.forEach((node) => {
            const isSelected = selectedIds.has(node.id);

            // Handle In
            if (node.handleIn) {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(node.handleIn.x, node.handleIn.y);
              ctx.strokeStyle = '#60a5fa';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(node.handleIn.x, node.handleIn.y, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = '#3b82f6';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            // Handle Out
            if (node.handleOut) {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(node.handleOut.x, node.handleOut.y);
              ctx.strokeStyle = '#60a5fa';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(node.handleOut.x, node.handleOut.y, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = '#3b82f6';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            // C. Draw Anchor Point (Square if smooth, Diamond if corner)
            const isHovered =
              hoveredNodeInfoRef.current?.nodeIndex !== undefined &&
              sub.nodes[hoveredNodeInfoRef.current.nodeIndex]?.id === node.id &&
              hoveredNodeInfoRef.current.type === 'anchor';
            const sz = isHovered ? 9 : 7;

            ctx.save();
            ctx.translate(node.x, node.y);
            if (node.type === 'corner') {
              ctx.rotate(Math.PI / 4);
            }

            ctx.beginPath();
            ctx.rect(-sz / 2, -sz / 2, sz, sz);
            ctx.fillStyle = isSelected ? '#2563eb' : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#1e3a8a' : '#2563eb';
            ctx.lineWidth = isSelected ? 2 : 1.5;
            ctx.stroke();

            if (isSelected) {
              ctx.beginPath();
              ctx.rect(-sz / 2 + 1, -sz / 2 + 1, sz - 2, sz - 2);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            ctx.restore();
          });
        });

        ctx.restore();
      }

      // D. Hovered Segment Insertion Indicator
      if (hoveredSegmentRef.current) {
        const { point } = hoveredSegmentRef.current;
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(point.x - 3, point.y);
        ctx.lineTo(point.x + 3, point.y);
        ctx.moveTo(point.x, point.y - 3);
        ctx.lineTo(point.x, point.y + 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // E. Marquee Selection Box
      if (marqueeBoxRef.current) {
        const { start, current } = marqueeBoxRef.current;
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const w = Math.abs(current.x - start.x);
        const h = Math.abs(current.y - start.y);

        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }
  }, [activeTool, penMode, strokeColor, strokeWidth, strokeCap, strokeJoin, eraserSize]);

  // Serialize current fabric canvas paths into VectorPathData[]
  const serializeCanvasPaths = useCallback((): VectorPathData[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];

    const objects = canvas.getObjects();
    const result: VectorPathData[] = [];

    objects.forEach((obj, idx) => {
      if (obj instanceof Path && (obj as any).path) {
        const pathSegments = (obj as any).path;
        const mat = obj.calcTransformMatrix();
        const offsetX = (obj.pathOffset?.x ?? 0);
        const offsetY = (obj.pathOffset?.y ?? 0);

        // If the object was moved, rotated, or scaled, apply transform to absolute canvas coords
        const hasTransform =
          Math.abs((obj.left ?? 0) - offsetX) > 0.01 ||
          Math.abs((obj.top ?? 0) - offsetY) > 0.01 ||
          (obj.scaleX !== undefined && Math.abs(obj.scaleX - 1) > 0.001) ||
          (obj.scaleY !== undefined && Math.abs(obj.scaleY - 1) > 0.001) ||
          (obj.angle !== undefined && Math.abs(obj.angle) > 0.01);

        let finalSegments = pathSegments;
        if (hasTransform) {
          finalSegments = pathSegments.map((seg: any) => {
            const cmd = seg[0];
            if (cmd === 'M' || cmd === 'L') {
              const pt = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
              return [cmd, Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10];
            } else if (cmd === 'C') {
              const pt1 = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
              const pt2 = util.transformPoint({ x: seg[3] - offsetX, y: seg[4] - offsetY }, mat);
              const pt = util.transformPoint({ x: seg[5] - offsetX, y: seg[6] - offsetY }, mat);
              return [
                cmd,
                Math.round(pt1.x * 10) / 10, Math.round(pt1.y * 10) / 10,
                Math.round(pt2.x * 10) / 10, Math.round(pt2.y * 10) / 10,
                Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10,
              ];
            } else if (cmd === 'Q') {
              const pt1 = util.transformPoint({ x: seg[1] - offsetX, y: seg[2] - offsetY }, mat);
              const pt = util.transformPoint({ x: seg[3] - offsetX, y: seg[4] - offsetY }, mat);
              return [
                cmd,
                Math.round(pt1.x * 10) / 10, Math.round(pt1.y * 10) / 10,
                Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10,
              ];
            }
            return seg;
          });
        }

        const pathStr = fabricSegmentsToPathString(finalSegments);
        const objId = (obj as any).id || `path_${Date.now()}_${idx}`;
        (obj as any).id = objId;
        result.push({
          id: objId,
          pathString: pathStr,
          strokeWidth: (obj.strokeWidth as number) || 16,
          strokeColor: (obj.stroke as string) || '#0f172a',
          fillColor: (obj.fill as string) || undefined,
          strokeLineCap: (obj.strokeLineCap as any) || 'round',
          strokeLineJoin: (obj.strokeLineJoin as any) || 'round',
        });
      }
    });

    return result;
  }, []);

  // Debounced sync to store for 60fps drawing
  const syncToStoreDebounced = useCallback(() => {
    if (isSyncingRef.current) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const paths = serializeCanvasPaths();
      isInternalUpdateRef.current = true;
      updateActiveGlyphPaths(paths, true);
    }, 150);
  }, [serializeCanvasPaths, updateActiveGlyphPaths]);

  // Direct Selection: Loads a Fabric Path into editable subpaths
  const loadPathForNodeEditing = useCallback(
    (pathObj: Path) => {
      if (!pathObj || !(pathObj as any).path) return;
      const subs = fabricPathToEditableSubpaths(pathObj);
      selectedPathObjRef.current = pathObj;
      editableSubpathsRef.current = subs;
      selectedNodeIdsRef.current.clear();
      setHasActivePath(true);
      setSelectedNodesCount(0);
      setActiveNodeCoords(null);
      if (pathObj.strokeWidth !== undefined) {
        useUIStore.getState().setStrokeWidth(pathObj.strokeWidth as number);
      }
      if (pathObj.stroke && typeof pathObj.stroke === 'string') {
        useUIStore.getState().setStrokeColor(pathObj.stroke);
      }
      renderOverlay();
    },
    [renderOverlay]
  );

  // Direct Selection: Clears active path node editing
  const clearNodeEditing = useCallback(() => {
    selectedPathObjRef.current = null;
    editableSubpathsRef.current = [];
    selectedNodeIdsRef.current.clear();
    setHasActivePath(false);
    setSelectedNodesCount(0);
    setActiveNodeCoords(null);
    renderOverlay();
  }, [renderOverlay]);

  // Delete selected anchor node(s)
  const deleteSelectedNodes = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pathObj = selectedPathObjRef.current;
    if (!canvas || !pathObj || selectedNodeIdsRef.current.size === 0) return;

    const updated = deleteNodesFromSubpaths(editableSubpathsRef.current, selectedNodeIdsRef.current);
    const hasNodes = updated.some((s) => s.nodes.length >= 2);

    if (hasNodes) {
      const newPath = rebuildFabricPathFromSubpaths(pathObj, updated, canvas);
      if (newPath) {
        selectedPathObjRef.current = newPath;
        editableSubpathsRef.current = updated;
      } else {
        clearNodeEditing();
      }
    } else {
      canvas.remove(pathObj);
      clearNodeEditing();
    }

    selectedNodeIdsRef.current.clear();
    setSelectedNodesCount(0);
    setActiveNodeCoords(null);
    canvas.requestRenderAll();
    syncToStoreDebounced();
    renderOverlay();
  }, [clearNodeEditing, renderOverlay, syncToStoreDebounced]);

  // Nudge selected anchor node(s) with arrow keys
  const nudgeSelectedNodes = useCallback(
    (dx: number, dy: number) => {
      const canvas = fabricCanvasRef.current;
      const pathObj = selectedPathObjRef.current;
      if (!canvas || !pathObj || selectedNodeIdsRef.current.size === 0) return;

      editableSubpathsRef.current.forEach((sub) => {
        sub.nodes.forEach((node) => {
          if (selectedNodeIdsRef.current.has(node.id)) {
            node.x += dx;
            node.y += dy;
            if (node.handleIn) {
              node.handleIn.x += dx;
              node.handleIn.y += dy;
            }
            if (node.handleOut) {
              node.handleOut.x += dx;
              node.handleOut.y += dy;
            }
          }
        });
      });

      const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
      if (newPath) {
        selectedPathObjRef.current = newPath;
      }

      if (selectedNodeIdsRef.current.size === 1) {
        for (const sub of editableSubpathsRef.current) {
          const found = sub.nodes.find((n) => selectedNodeIdsRef.current.has(n.id));
          if (found) {
            setActiveNodeCoords({ x: Math.round(found.x), y: Math.round(found.y) });
            break;
          }
        }
      }

      canvas.requestRenderAll();
      syncToStoreDebounced();
      renderOverlay();
    },
    [renderOverlay, syncToStoreDebounced]
  );

  // Convert selected nodes to Smooth (Bézier handles)
  const convertSelectedNodesToSmooth = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pathObj = selectedPathObjRef.current;
    if (!canvas || !pathObj || selectedNodeIdsRef.current.size === 0) return;

    editableSubpathsRef.current.forEach((sub) => {
      sub.nodes.forEach((node, idx) => {
        if (selectedNodeIdsRef.current.has(node.id)) {
          const prev = idx > 0 ? sub.nodes[idx - 1] : sub.isClosed ? sub.nodes[sub.nodes.length - 1] : undefined;
          const next = idx < sub.nodes.length - 1 ? sub.nodes[idx + 1] : sub.isClosed ? sub.nodes[0] : undefined;
          toggleNodeSmoothCorner(node, prev, next);
          node.type = 'smooth';
        }
      });
    });

    const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
    if (newPath) selectedPathObjRef.current = newPath;
    canvas.requestRenderAll();
    syncToStoreDebounced();
    renderOverlay();
  }, [renderOverlay, syncToStoreDebounced]);

  // Convert selected nodes to Corner (sharp angles)
  const convertSelectedNodesToCorner = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pathObj = selectedPathObjRef.current;
    if (!canvas || !pathObj || selectedNodeIdsRef.current.size === 0) return;

    editableSubpathsRef.current.forEach((sub) => {
      sub.nodes.forEach((node) => {
        if (selectedNodeIdsRef.current.has(node.id)) {
          node.handleIn = null;
          node.handleOut = null;
          node.type = 'corner';
        }
      });
    });

    const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
    if (newPath) selectedPathObjRef.current = newPath;
    canvas.requestRenderAll();
    syncToStoreDebounced();
    renderOverlay();
  }, [renderOverlay, syncToStoreDebounced]);

  // Reverse active path winding direction
  const reverseActivePathDirection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pathObj = selectedPathObjRef.current;
    if (!canvas || !pathObj || editableSubpathsRef.current.length === 0) return;

    editableSubpathsRef.current = editableSubpathsRef.current.map((sub) => reverseSubpath(sub));
    const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
    if (newPath) selectedPathObjRef.current = newPath;
    canvas.requestRenderAll();
    syncToStoreDebounced();
    renderOverlay();
  }, [renderOverlay, syncToStoreDebounced]);

  // Toggle active path closed / open
  const toggleActivePathClosed = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const pathObj = selectedPathObjRef.current;
    if (!canvas || !pathObj || editableSubpathsRef.current.length === 0) return;

    editableSubpathsRef.current.forEach((sub) => {
      sub.isClosed = !sub.isClosed;
    });

    const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
    if (newPath) selectedPathObjRef.current = newPath;
    canvas.requestRenderAll();
    syncToStoreDebounced();
    renderOverlay();
  }, [renderOverlay, syncToStoreDebounced]);

  // High-precision coordinate update for selected node
  const updateSelectedNodeCoordinate = useCallback(
    (axis: 'x' | 'y', val: number) => {
      if (selectedNodeIdsRef.current.size !== 1) return;
      const canvas = fabricCanvasRef.current;
      const pathObj = selectedPathObjRef.current;
      if (!canvas || !pathObj) return;

      for (const sub of editableSubpathsRef.current) {
        const node = sub.nodes.find((n) => selectedNodeIdsRef.current.has(n.id));
        if (node) {
          const delta = val - node[axis];
          node[axis] = val;
          if (node.handleIn) node.handleIn[axis] += delta;
          if (node.handleOut) node.handleOut[axis] += delta;
          setActiveNodeCoords({ x: Math.round(node.x), y: Math.round(node.y) });
          break;
        }
      }

      const newPath = rebuildFabricPathFromSubpaths(pathObj, editableSubpathsRef.current, canvas);
      if (newPath) selectedPathObjRef.current = newPath;
      canvas.requestRenderAll();
      syncToStoreDebounced();
      renderOverlay();
    },
    [renderOverlay, syncToStoreDebounced]
  );

  // Listen to toolbar node actions
  useEffect(() => {
    const handleNodeAction = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      if (action === 'smooth') convertSelectedNodesToSmooth();
      else if (action === 'corner') convertSelectedNodesToCorner();
      else if (action === 'delete') deleteSelectedNodes();
      else if (action === 'reverse') reverseActivePathDirection();
      else if (action === 'toggle-closed') toggleActivePathClosed();
    };
    window.addEventListener('lipi:node-action', handleNodeAction);
    return () => window.removeEventListener('lipi:node-action', handleNodeAction);
  }, [
    convertSelectedNodesToSmooth,
    convertSelectedNodesToCorner,
    deleteSelectedNodes,
    reverseActivePathDirection,
    toggleActivePathClosed,
  ]);

  // Commits the currently drawn Pen path to the canvas
  const commitPenPath = useCallback(
    (isClosed = false) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      if (penNodesRef.current.length >= 2) {
        const svg = penNodesToSVGPath(penNodesRef.current, isClosed, penMode);
        if (svg) {
          try {
            const pathObj = new Path(svg, {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              fill: isClosed && fillColor !== 'transparent' ? fillColor : undefined,
              strokeLineCap: strokeCap,
              strokeLineJoin: penMode === 'sharp' ? 'miter' : strokeJoin,
              selectable: activeTool === 'select',
              evented: true,
            });
            canvas.add(pathObj);
            canvas.requestRenderAll();
            syncToStoreDebounced();
          } catch (e) {
            console.warn('Failed to commit pen path:', e);
          }
        }
      }

      penNodesRef.current = [];
      isNearStartRef.current = false;
      activeDragIndexRef.current = null;
      penDragStartPosRef.current = null;
      renderOverlay();
    },
    [penMode, strokeColor, strokeWidth, fillColor, strokeCap, strokeJoin, activeTool, renderOverlay, syncToStoreDebounced]
  );

  // Global Keyboard Shortcuts (Ctrl+A, Ctrl+Del, Delete, Backspace, Esc, Enter, Undo, Redo, Tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs or textareas
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const canvas = fabricCanvasRef.current;
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. Ctrl + A: Select All Objects on Canvas
      if (isCtrlOrMeta && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (!canvas) return;
        const selectableObjs = canvas.getObjects().filter((o) => o.selectable !== false);
        if (selectableObjs.length > 0) {
          useUIStore.getState().setActiveTool('select');
          const sel = new ActiveSelection(selectableObjs, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
          const rawAngle = sel.angle || 0;
          useUIStore.getState().setSelectedObjectAngle(Math.round((((rawAngle % 360) + 360) % 360) * 10) / 10);
        }
        return;
      }

      // 2. Ctrl + Delete / Delete / Backspace: Delete selected anchor node OR canvas objects
      if (e.key === 'Delete' || (isCtrlOrMeta && e.key === 'Delete') || e.key === 'Backspace') {
        const curTool = useUIStore.getState().activeTool;
        if (curTool === 'pen' && penNodesRef.current.length > 0) {
          e.preventDefault();
          penNodesRef.current.pop();
          renderOverlay();
          return;
        }

        // Anchor node deletion in Direct Selection mode!
        if (selectedNodeIdsRef.current.size > 0 && selectedPathObjRef.current) {
          e.preventDefault();
          deleteSelectedNodes();
          return;
        }

        if (canvas) {
          const activeObjects = canvas.getActiveObjects();
          if (activeObjects && activeObjects.length > 0) {
            e.preventDefault();
            activeObjects.forEach((obj) => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            syncToStoreDebounced();
            useUIStore.getState().setSelectedObjectAngle(null);
            return;
          }
        }
      }

      // 3. Arrow Keys: Nudge selected anchor node(s) by 1px (or 10px with Shift)
      if (selectedNodeIdsRef.current.size > 0 && selectedPathObjRef.current) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          nudgeSelectedNodes(dx, dy);
          return;
        }
      }

      // 4. Escape: Exit Pen or Clear Selection
      if (e.key === 'Escape') {
        e.preventDefault();
        if (useUIStore.getState().activeTool === 'pen') {
          commitPenPath(false);
        } else if (canvas) {
          canvas.discardActiveObject();
          clearNodeEditing();
          canvas.requestRenderAll();
          useUIStore.getState().setSelectedObjectAngle(null);
        }
        return;
      }

      // 5. Enter: Commit Pen Path
      if (e.key === 'Enter' && useUIStore.getState().activeTool === 'pen') {
        e.preventDefault();
        commitPenPath(false);
        return;
      }

      // Canvas Zoom In: Ctrl + / Ctrl =
      if (isCtrlOrMeta && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        const curZoom = useUIStore.getState().zoom;
        useUIStore.getState().setZoom(Math.min(3, Math.round((curZoom + 0.15) * 100) / 100));
        return;
      }

      // Canvas Zoom Out: Ctrl - / Ctrl _
      if (isCtrlOrMeta && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        const curZoom = useUIStore.getState().zoom;
        useUIStore.getState().setZoom(Math.max(0.3, Math.round((curZoom - 0.15) * 100) / 100));
        return;
      }

      // Canvas Reset Zoom: Ctrl 0
      if (isCtrlOrMeta && (e.key === '0' || e.code === 'Numpad0')) {
        e.preventDefault();
        useUIStore.getState().resetZoom();
        return;
      }

      // 6. Tool Shortcuts: V, A, P, B, E, H
      if (!isCtrlOrMeta && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') {
          useUIStore.getState().setActiveTool('select');
        } else if (e.key === 'a' || e.key === 'A') {
          useUIStore.getState().setActiveTool('direct-select');
        } else if (e.key === 'p' || e.key === 'P') {
          useUIStore.getState().setActiveTool('pen');
        } else if (e.key === 'b' || e.key === 'B') {
          useUIStore.getState().setActiveTool('brush');
        } else if (e.key === 'e' || e.key === 'E') {
          useUIStore.getState().setActiveTool('eraser');
        } else if (e.key === 'h' || e.key === 'H') {
          useUIStore.getState().setActiveTool('pan');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commitPenPath,
    deleteSelectedNodes,
    nudgeSelectedNodes,
    clearNodeEditing,
    renderOverlay,
    syncToStoreDebounced,
  ]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasElementRef.current) return;

    const canvas = new Canvas(canvasElementRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      isDrawingMode: false,
      backgroundColor: 'transparent',
      selection: true, // Allows drag-marquee selection in Select tool
      selectionColor: 'rgba(79, 70, 229, 0.12)',
      selectionBorderColor: '#4f46e5',
      selectionLineWidth: 1.5,
      selectionDashArray: [4, 4],
      renderOnAddRemove: true,
    });

    const brush = new PencilBrush(canvas);
    brush.width = strokeWidth;
    brush.color = strokeColor;
    brush.strokeLineCap = strokeCap;
    brush.strokeLineJoin = strokeJoin;
    brush.decimate = Math.max(0.5, (smoothing / 100) * 8);
    canvas.freeDrawingBrush = brush;

    let isMouseDown = false;

    // Angle detection when strokes/objects are selected or rotated
    const updateAngle = () => {
      const activeObj = canvas.getActiveObject();
      if (!activeObj) {
        useUIStore.getState().setSelectedObjectAngle(null);
        return;
      }
      const rawAngle = activeObj.angle || 0;
      const normalized = ((rawAngle % 360) + 360) % 360;
      useUIStore.getState().setSelectedObjectAngle(Math.round(normalized * 10) / 10);
    };

    const onSelectionChanged = (opt: any) => {
      updateAngle();
      const obj = opt.selected?.[0];
      if (obj && obj instanceof Path) {
        if (obj.strokeWidth !== undefined) {
          useUIStore.getState().setStrokeWidth(obj.strokeWidth as number);
        }
        if (obj.stroke && typeof obj.stroke === 'string') {
          useUIStore.getState().setStrokeColor(obj.stroke);
        }
      }
    };

    canvas.on('selection:created', onSelectionChanged);
    canvas.on('selection:updated', onSelectionChanged);
    canvas.on('selection:cleared', () => useUIStore.getState().setSelectedObjectAngle(null));
    canvas.on('object:rotating', updateAngle);
    canvas.on('object:modified', () => {
      updateAngle();
      syncToStoreDebounced();
    });

    canvas.on('mouse:down', (opt) => {
      const tool = useUIStore.getState().activeTool;
      const curPenMode = useUIStore.getState().penMode;
      const eAny = opt.e as any;
      const pointer =
        opt.scenePoint || (canvas as any).getScenePoint?.(opt.e) || { x: eAny?.offsetX ?? 0, y: eAny?.offsetY ?? 0 };
      isMouseDown = true;

      // Pan with Space held, Pan tool, or Middle mouse button
      if (isSpacePressedRef.current || tool === 'pan' || eAny?.button === 1) {
        isPanningRef.current = true;
        panStartPosRef.current = {
          x: (eAny?.clientX ?? 0) - panOffsetRef.current.x,
          y: (eAny?.clientY ?? 0) - panOffsetRef.current.y,
        };
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = 'grabbing';
        }
        return;
      }

      if (tool === 'direct-select') {
        // 1. Check if hit handle grip
        const handleHit = hitTestSubpathNode(editableSubpathsRef.current, pointer, 8);
        if (handleHit && (handleHit.hitType === 'handleIn' || handleHit.hitType === 'handleOut')) {
          const map = new Map<string, { x: number; y: number; handleIn?: Point | null; handleOut?: Point | null }>();
          editableSubpathsRef.current.forEach((s) =>
            s.nodes.forEach((n) =>
              map.set(n.id, {
                x: n.x,
                y: n.y,
                handleIn: n.handleIn ? { ...n.handleIn } : null,
                handleOut: n.handleOut ? { ...n.handleOut } : null,
              })
            )
          );
          activeNodeDragRef.current = {
            type: handleHit.hitType,
            subpathIndex: handleHit.subpathIndex,
            nodeIndex: handleHit.nodeIndex,
            startMouse: pointer,
            initialNodePositions: map,
          };
          renderOverlay();
          return;
        }

        // 2. Check if hit anchor node
        if (handleHit && handleHit.hitType === 'anchor') {
          const isShift = eAny?.shiftKey;
          if (isShift) {
            if (selectedNodeIdsRef.current.has(handleHit.node.id)) {
              selectedNodeIdsRef.current.delete(handleHit.node.id);
            } else {
              selectedNodeIdsRef.current.add(handleHit.node.id);
            }
          } else {
            if (!selectedNodeIdsRef.current.has(handleHit.node.id)) {
              selectedNodeIdsRef.current.clear();
              selectedNodeIdsRef.current.add(handleHit.node.id);
            }
          }

          setSelectedNodesCount(selectedNodeIdsRef.current.size);
          setActiveNodeCoords({ x: Math.round(handleHit.node.x), y: Math.round(handleHit.node.y) });

          const map = new Map<string, { x: number; y: number; handleIn?: Point | null; handleOut?: Point | null }>();
          editableSubpathsRef.current.forEach((s) =>
            s.nodes.forEach((n) =>
              map.set(n.id, {
                x: n.x,
                y: n.y,
                handleIn: n.handleIn ? { ...n.handleIn } : null,
                handleOut: n.handleOut ? { ...n.handleOut } : null,
              })
            )
          );
          activeNodeDragRef.current = {
            type: 'anchor',
            subpathIndex: handleHit.subpathIndex,
            nodeIndex: handleHit.nodeIndex,
            startMouse: pointer,
            initialNodePositions: map,
          };
          renderOverlay();
          return;
        }

        // 3. Check if clicked an existing Path object on canvas
        const targetObj = opt.target;
        if (targetObj && targetObj instanceof Path && (targetObj as any).path) {
          loadPathForNodeEditing(targetObj);
          return;
        }

        // 4. Clicked on empty canvas -> clear selection & start marquee box
        selectedNodeIdsRef.current.clear();
        setSelectedNodesCount(0);
        setActiveNodeCoords(null);
        marqueeBoxRef.current = { start: pointer, current: pointer };
        renderOverlay();
        return;
      } else if (tool === 'pen') {
        // If an existing path was selected AND user hasn't started drawing a new path yet:
        if (selectedPathObjRef.current && penNodesRef.current.length === 0) {
          const hit = hitTestSubpathNode(editableSubpathsRef.current, pointer, 8);
          if (hit && hit.hitType === 'anchor') {
            const deleteSet = new Set<string>([hit.node.id]);
            const updated = deleteNodesFromSubpaths(editableSubpathsRef.current, deleteSet);
            if (updated.some((s) => s.nodes.length >= 2)) {
              editableSubpathsRef.current = updated;
              const newPath = rebuildFabricPathFromSubpaths(selectedPathObjRef.current, updated, canvas);
              if (newPath) selectedPathObjRef.current = newPath;
            } else {
              canvas.remove(selectedPathObjRef.current);
              clearNodeEditing();
            }
            syncToStoreDebounced();
            renderOverlay();
            return;
          }

          if (hoveredSegmentRef.current) {
            const { subpathIndex, segmentIndex, t } = hoveredSegmentRef.current;
            const inserted = insertNodeOnSegment(editableSubpathsRef.current, subpathIndex, segmentIndex, t);
            editableSubpathsRef.current = inserted.subpaths;
            selectedNodeIdsRef.current.clear();
            selectedNodeIdsRef.current.add(inserted.newNodeId);
            setSelectedNodesCount(1);
            const newPath = rebuildFabricPathFromSubpaths(selectedPathObjRef.current, inserted.subpaths, canvas);
            if (newPath) selectedPathObjRef.current = newPath;
            syncToStoreDebounced();
            renderOverlay();
            return;
          }
        }

        // When starting to place nodes, ensure no stale path editing is active
        if (selectedPathObjRef.current) {
          clearNodeEditing();
        }

        if (isNearStartRef.current && penNodesRef.current.length >= 2) {
          commitPenPath(true);
          return;
        }

        const newNode: PenNode = {
          x: pointer.x,
          y: pointer.y,
          type: curPenMode === 'sharp' ? 'corner' : 'smooth',
          isManual: false,
        };
        penNodesRef.current.push(newNode);
        penDragStartPosRef.current = { x: pointer.x, y: pointer.y };
        activeDragIndexRef.current = penNodesRef.current.length - 1;

        if (curPenMode === 'rounded') {
          autoComputeSmoothCircularHandles(penNodesRef.current, false);
        }

        renderOverlay();
      } else if (tool === 'eraser') {
        lastEraserPosRef.current = { x: pointer.x, y: pointer.y };
        const radius = useUIStore.getState().eraserSize / 2;
        if (eraseStrokesAlongSegment(canvas, pointer, pointer, radius)) {
          syncToStoreDebounced();
        }
      }
    });

    canvas.on('mouse:move', (opt) => {
      const tool = useUIStore.getState().activeTool;
      const curPenMode = useUIStore.getState().penMode;
      const eAny = opt.e as any;
      const pointer =
        opt.scenePoint || (canvas as any).getScenePoint?.(opt.e) || { x: eAny?.offsetX ?? 0, y: eAny?.offsetY ?? 0 };

      if (isPanningRef.current) {
        const nx = (eAny?.clientX ?? 0) - panStartPosRef.current.x;
        const ny = (eAny?.clientY ?? 0) - panStartPosRef.current.y;
        panOffsetRef.current = { x: nx, y: ny };
        useUIStore.getState().setPan(nx, ny);
        return;
      }

      if (tool === 'direct-select') {
        // Dragging anchor(s)
        if (activeNodeDragRef.current?.type === 'anchor') {
          const { startMouse, initialNodePositions } = activeNodeDragRef.current;
          const dx = pointer.x - startMouse.x;
          const dy = pointer.y - startMouse.y;

          editableSubpathsRef.current.forEach((sub) => {
            sub.nodes.forEach((node) => {
              if (selectedNodeIdsRef.current.has(node.id)) {
                const init = initialNodePositions.get(node.id);
                if (init) {
                  node.x = init.x + dx;
                  node.y = init.y + dy;
                  if (init.handleIn) {
                    node.handleIn = { x: init.handleIn.x + dx, y: init.handleIn.y + dy };
                  }
                  if (init.handleOut) {
                    node.handleOut = { x: init.handleOut.x + dx, y: init.handleOut.y + dy };
                  }
                }
              }
            });
          });

          if (selectedPathObjRef.current) {
            const newPath = rebuildFabricPathFromSubpaths(
              selectedPathObjRef.current,
              editableSubpathsRef.current,
              canvas
            );
            if (newPath) selectedPathObjRef.current = newPath;
          }

          if (selectedNodeIdsRef.current.size === 1) {
            for (const sub of editableSubpathsRef.current) {
              const found = sub.nodes.find((n) => selectedNodeIdsRef.current.has(n.id));
              if (found) {
                setActiveNodeCoords({ x: Math.round(found.x), y: Math.round(found.y) });
                break;
              }
            }
          }

          renderOverlay();
          return;
        }

        // Dragging handle
        if (
          activeNodeDragRef.current?.type === 'handleIn' ||
          activeNodeDragRef.current?.type === 'handleOut'
        ) {
          const { type: handleType, subpathIndex, nodeIndex } = activeNodeDragRef.current;
          const sub = editableSubpathsRef.current[subpathIndex];
          const node = sub?.nodes[nodeIndex];
          if (node) {
            const isAlt = eAny?.altKey;
            node[handleType] = { x: pointer.x, y: pointer.y };

            // In Illustrator: smooth nodes maintain opposite tangent colinearity unless Alt is pressed
            if (!isAlt && node.type !== 'corner') {
              const oppType = handleType === 'handleIn' ? 'handleOut' : 'handleIn';
              const oppHandle = node[oppType];
              if (oppHandle) {
                const curDx = pointer.x - node.x;
                const curDy = pointer.y - node.y;
                const curAngle = Math.atan2(curDy, curDx);
                const oppDist = pointDistance(node, oppHandle);
                const oppAngle = curAngle + Math.PI;
                node[oppType] = {
                  x: node.x + oppDist * Math.cos(oppAngle),
                  y: node.y + oppDist * Math.sin(oppAngle),
                };
              }
            }

            if (selectedPathObjRef.current) {
              const newPath = rebuildFabricPathFromSubpaths(
                selectedPathObjRef.current,
                editableSubpathsRef.current,
                canvas
              );
              if (newPath) selectedPathObjRef.current = newPath;
            }
            renderOverlay();
            return;
          }
        }

        // Dragging marquee selection box
        if (marqueeBoxRef.current && isMouseDown) {
          marqueeBoxRef.current.current = pointer;
          const { start, current } = marqueeBoxRef.current;
          const minX = Math.min(start.x, current.x);
          const maxX = Math.max(start.x, current.x);
          const minY = Math.min(start.y, current.y);
          const maxY = Math.max(start.y, current.y);

          editableSubpathsRef.current.forEach((sub) => {
            sub.nodes.forEach((node) => {
              if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
                selectedNodeIdsRef.current.add(node.id);
              }
            });
          });
          setSelectedNodesCount(selectedNodeIdsRef.current.size);
          renderOverlay();
          return;
        }

        // Hover testing
        const hit = hitTestSubpathNode(editableSubpathsRef.current, pointer, 8);
        hoveredNodeInfoRef.current = hit
          ? { subpathIndex: hit.subpathIndex, nodeIndex: hit.nodeIndex, type: hit.hitType }
          : null;

        if (hit) {
          canvas.defaultCursor = hit.hitType === 'anchor' ? 'move' : 'crosshair';
          hoveredSegmentRef.current = null;
        } else {
          const segHit = findClosestPointOnSubpaths(editableSubpathsRef.current, pointer, 12);
          hoveredSegmentRef.current = segHit
            ? {
                subpathIndex: segHit.subpathIndex,
                segmentIndex: segHit.segmentIndex,
                t: segHit.t,
                point: segHit.point,
              }
            : null;
          canvas.defaultCursor = segHit ? 'crosshair' : 'default';
        }

        renderOverlay();
        return;
      } else if (tool === 'pen') {
        hoverPosRef.current = { x: pointer.x, y: pointer.y };

        // 1. Manual tangent dragging: only pull out manual handles if dragged >= 4px
        if (
          curPenMode === 'rounded' &&
          activeDragIndexRef.current !== null &&
          isMouseDown &&
          penDragStartPosRef.current
        ) {
          const startPos = penDragStartPosRef.current;
          const dist = Math.hypot(pointer.x - startPos.x, pointer.y - startPos.y);
          if (dist >= 4) {
            const idx = activeDragIndexRef.current;
            const anchor = penNodesRef.current[idx];
            if (anchor) {
              const dx = pointer.x - anchor.x;
              const dy = pointer.y - anchor.y;
              anchor.handleOut = { x: pointer.x, y: pointer.y };
              anchor.handleIn = { x: anchor.x - dx, y: anchor.y - dy };
              anchor.isManual = true;
            }
          }
        }

        // 2. Check near start for closed loop
        if (penNodesRef.current.length >= 2) {
          const start = penNodesRef.current[0];
          isNearStartRef.current = Math.hypot(pointer.x - start.x, pointer.y - start.y) < 14;
        } else {
          isNearStartRef.current = false;
        }

        // 3. Hovering over anchors/segments of an existing selected path (only if not drawing)
        if (
          selectedPathObjRef.current &&
          editableSubpathsRef.current.length > 0 &&
          penNodesRef.current.length === 0
        ) {
          const hit = hitTestSubpathNode(editableSubpathsRef.current, pointer, 8);
          if (hit && hit.hitType === 'anchor') {
            canvas.defaultCursor = 'crosshair';
            hoveredSegmentRef.current = null;
          } else {
            const segHit = findClosestPointOnSubpaths(editableSubpathsRef.current, pointer, 12);
            hoveredSegmentRef.current = segHit
              ? {
                  subpathIndex: segHit.subpathIndex,
                  segmentIndex: segHit.segmentIndex,
                  t: segHit.t,
                  point: segHit.point,
                }
              : null;
            canvas.defaultCursor = 'crosshair';
          }
        } else {
          hoveredSegmentRef.current = null;
        }

        renderOverlay();
      } else if (tool === 'brush') {
        hoverPosRef.current = { x: pointer.x, y: pointer.y };
        renderOverlay();
      } else if (tool === 'eraser') {
        hoverPosRef.current = { x: pointer.x, y: pointer.y };
        renderOverlay();

        if (isMouseDown && lastEraserPosRef.current) {
          const radius = useUIStore.getState().eraserSize / 2;
          const prev = lastEraserPosRef.current;
          if (eraseStrokesAlongSegment(canvas, prev, pointer, radius)) {
            syncToStoreDebounced();
          }
          lastEraserPosRef.current = { x: pointer.x, y: pointer.y };
        }
      }
    });

    canvas.on('mouse:up', () => {
      const tool = useUIStore.getState().activeTool;
      const curPenMode = useUIStore.getState().penMode;
      isMouseDown = false;
      lastEraserPosRef.current = null;

      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = isSpacePressedRef.current
            ? 'grab'
            : tool === 'pan'
            ? 'grab'
            : tool === 'brush' || tool === 'eraser'
            ? 'none'
            : tool === 'pen'
            ? 'crosshair'
            : 'default';
        }
      }

      if (tool === 'direct-select') {
        if (activeNodeDragRef.current) {
          syncToStoreDebounced();
        }
        activeNodeDragRef.current = null;
        marqueeBoxRef.current = null;
        renderOverlay();
      } else if (tool === 'pen') {
        if (activeDragIndexRef.current !== null) {
          const idx = activeDragIndexRef.current;
          const anchor = penNodesRef.current[idx];
          if (anchor && !anchor.isManual && curPenMode === 'rounded') {
            autoComputeSmoothCircularHandles(penNodesRef.current, false);
          }
        }
        activeDragIndexRef.current = null;
        penDragStartPosRef.current = null;
        renderOverlay();
      }
    });

    canvas.on('mouse:dblclick', (opt) => {
      const tool = useUIStore.getState().activeTool;
      const eAny = opt.e as any;
      const pointer =
        opt.scenePoint || (canvas as any).getScenePoint?.(opt.e) || { x: eAny?.offsetX ?? 0, y: eAny?.offsetY ?? 0 };

      if (tool === 'pen') {
        // If double clicked near an existing node on in-progress pen path: toggle smooth / corner!
        const hitIdx = penNodesRef.current.findIndex(
          (p) => Math.hypot(p.x - pointer.x, p.y - pointer.y) < 12
        );
        if (hitIdx >= 0) {
          const node = penNodesRef.current[hitIdx];
          node.type = node.type === 'corner' ? 'smooth' : 'corner';
          if (node.type === 'corner') {
            node.handleIn = undefined;
            node.handleOut = undefined;
            node.isManual = false;
          } else {
            node.isManual = false;
            autoComputeSmoothCircularHandles(penNodesRef.current, false);
          }
          renderOverlay();
        } else {
          // Double clicking empty space finishes and commits path
          commitPenPath(false);
        }
      } else if (tool === 'direct-select') {
        const hit = hitTestSubpathNode(editableSubpathsRef.current, pointer, 8);
        if (hit && hit.hitType === 'anchor') {
          const sub = editableSubpathsRef.current[hit.subpathIndex];
          const node = sub?.nodes[hit.nodeIndex];
          if (node) {
            const prev =
              hit.nodeIndex > 0
                ? sub.nodes[hit.nodeIndex - 1]
                : sub.isClosed
                ? sub.nodes[sub.nodes.length - 1]
                : undefined;
            const next =
              hit.nodeIndex < sub.nodes.length - 1
                ? sub.nodes[hit.nodeIndex + 1]
                : sub.isClosed
                ? sub.nodes[0]
                : undefined;
            toggleNodeSmoothCorner(node, prev, next);
            if (selectedPathObjRef.current) {
              const newPath = rebuildFabricPathFromSubpaths(
                selectedPathObjRef.current,
                editableSubpathsRef.current,
                canvas
              );
              if (newPath) selectedPathObjRef.current = newPath;
            }
            canvas.requestRenderAll();
            syncToStoreDebounced();
            renderOverlay();
          }
        }
      }
    });

    canvas.on('mouse:out', () => {
      hoverPosRef.current = null;
      renderOverlay();
    });

    canvas.on('path:created', (opt: any) => {
      const tool = useUIStore.getState().activeTool;
      const curTip = useUIStore.getState().brushTip;
      const curWidth = useUIStore.getState().strokeWidth;
      const curColor = useUIStore.getState().strokeColor;
      const curCap = useUIStore.getState().strokeCap;
      const curJoin = useUIStore.getState().strokeJoin;
      const curSmoothing = useUIStore.getState().smoothing;

      const rawPath = opt.path;
      if (!rawPath || !(rawPath as any).path) {
        syncToStoreDebounced();
        return;
      }

      if (tool === 'brush') {
        if (curTip === 'calligraphy' || curTip === 'chisel') {
          const angle = curTip === 'calligraphy' ? 45 : 90;
          const points = samplePointsFromFabricSegments((rawPath as any).path, 2.0);
          if (points.length >= 2) {
            const ribbonSvg = pointsToCalligraphyRibbon(points, curWidth, angle);
            if (ribbonSvg) {
              canvas.remove(rawPath);
              const ribbonObj = new Path(ribbonSvg, {
                fill: curColor,
                stroke: undefined,
                selectable: true,
                evented: true,
              });
              canvas.add(ribbonObj);
              canvas.requestRenderAll();
            }
          }
        } else {
          // Round Art Brush: smooth using curve smoothing setting
          const points = samplePointsFromFabricSegments((rawPath as any).path, 2.0);
          if (points.length >= 2) {
            const smoothedSvg = pointsToSmoothSVGPath(points, Math.max(25, curSmoothing));
            if (smoothedSvg) {
              canvas.remove(rawPath);
              const smoothedObj = new Path(smoothedSvg, {
                stroke: curColor,
                strokeWidth: curWidth,
                fill: undefined,
                strokeLineCap: curCap,
                strokeLineJoin: curJoin,
                selectable: true,
                evented: true,
              });
              canvas.add(smoothedObj);
              canvas.requestRenderAll();
            }
          }
        }
        syncToStoreDebounced();
      } else {
        syncToStoreDebounced();
      }
    });

    fabricCanvasRef.current = canvas;

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Resize Fabric Canvas & Overlay when canvasWidth or canvasHeight changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    canvas.requestRenderAll();
    renderOverlay();
  }, [canvasWidth, canvasHeight, renderOverlay]);

  // Sync active tool, brush tip, and stroke properties with Fabric canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool !== 'pen' && penNodesRef.current.length > 0) {
      commitPenPath(false);
    }

    if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true; // Drag over them to marquee-select all objects
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = true;
        obj.evented = true;
      });
      clearNodeEditing();
    } else if (activeTool === 'direct-select') {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'pointer';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = true;
      });
      if (!selectedPathObjRef.current) {
        const objs = canvas.getObjects();
        const p = objs.find((o) => o instanceof Path && (o as any).path) as Path | undefined;
        if (p) {
          loadPathForNodeEditing(p);
        }
      }
    } else if (activeTool === 'brush') {
      canvas.selection = false;
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.strokeLineCap = strokeCap;
        canvas.freeDrawingBrush.strokeLineJoin = strokeJoin;
        (canvas.freeDrawingBrush as any).decimate = Math.max(0.5, (smoothing / 100) * 8);
      }
      canvas.defaultCursor = 'none';
      canvas.hoverCursor = 'none';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'none';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === 'pen') {
      clearNodeEditing();
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'crosshair';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === 'eraser') {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'none';
      canvas.hoverCursor = 'none';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'none';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = true;
      });
    } else {
      // Pan or other
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = 'grab';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }

    canvas.requestRenderAll();
    renderOverlay();
  }, [
    activeTool,
    brushTip,
    strokeWidth,
    strokeColor,
    strokeCap,
    strokeJoin,
    smoothing,
    commitPenPath,
    clearNodeEditing,
    loadPathForNodeEditing,
    renderOverlay,
  ]);

  // Live update selected object(s) when stroke attributes change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isSyncingRef.current) return;

    let hasModified = false;
    if (activeTool === 'select') {
      const activeObjs = canvas.getActiveObjects();
      activeObjs.forEach((obj) => {
        if (obj instanceof Path) {
          obj.set('strokeWidth', strokeWidth);
          obj.set('stroke', strokeColor);
          obj.set('strokeLineCap', strokeCap);
          obj.set('strokeLineJoin', strokeJoin);
          (obj as any).setCoords?.();
          hasModified = true;
        }
      });
    } else if (activeTool === 'direct-select' && selectedPathObjRef.current) {
      const p = selectedPathObjRef.current;
      p.set('strokeWidth', strokeWidth);
      p.set('stroke', strokeColor);
      p.set('strokeLineCap', strokeCap);
      p.set('strokeLineJoin', strokeJoin);
      (p as any).setCoords?.();
      hasModified = true;
    }

    if (hasModified) {
      canvas.requestRenderAll();
      syncToStoreDebounced();
    }
  }, [strokeWidth, strokeColor, strokeCap, strokeJoin, activeTool, syncToStoreDebounced]);

  // Rehydrate glyph paths when active character changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentGlyph) return;

    // Ignore canvas-initiated updates so strokes are never duplicated or cleared mid-edit
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    clearNodeEditing();
    isSyncingRef.current = true;
    canvas.clear();
    canvas.backgroundColor = 'transparent';
    penNodesRef.current = [];
    renderOverlay();

    if (currentGlyph.paths && currentGlyph.paths.length > 0) {
      currentGlyph.paths.forEach((p) => {
        try {
          const pathObj = new Path(p.pathString, {
            stroke: p.fillColor ? undefined : (p.strokeColor || strokeColor),
            strokeWidth: p.fillColor ? 0 : (p.strokeWidth || 16),
            fill: p.fillColor || undefined,
            strokeLineCap: p.strokeLineCap || 'round',
            strokeLineJoin: p.strokeLineJoin || 'round',
            selectable: activeTool === 'select',
            evented: true,
          });
          (pathObj as any).id = p.id;
          canvas.add(pathObj);
        } catch (e) {
          console.warn('Failed to rehydrate vector path:', e);
        }
      });
    }

    canvas.requestRenderAll();
    isSyncingRef.current = false;
  }, [activeUnicode, currentGlyph?.paths]);



  // Option to Edit the Reference Font directly (converts reference outline into editable paths)
  const editReferenceFont = useCallback(() => {
    const outline = activeOutlines[activeUnicode];
    if (!outline || !outline.svgPath) {
      alert('No reference outline is active for this letter to edit.');
      return;
    }
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const scale = guidePositions.scale;
      const tracingConfig = useUIStore.getState().tracing;
      const mode = tracingConfig.mode || 'outline';
      const outlineWidth = tracingConfig.outlineSize || 4;

      let strokeVal: string | undefined = undefined;
      let fillVal: string | undefined = undefined;
      let strokeW = 0;

      if (mode === 'outline') {
        strokeVal = strokeColor;
        strokeW = outlineWidth;
        fillVal = undefined;
      } else if (mode === 'fill') {
        strokeVal = undefined;
        strokeW = 0;
        fillVal = strokeColor;
      } else {
        strokeVal = strokeColor;
        strokeW = outlineWidth;
        fillVal = strokeColor;
      }

      const pathObj = new Path(outline.svgPath, {
        stroke: strokeVal,
        strokeWidth: strokeW,
        fill: fillVal,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: true,
        evented: true,
      });

      pathObj.set({
        originX: 'center',
        originY: 'center',
        left: guidePositions.leftMarginX + (pathObj.pathOffset?.x || 0) * scale,
        top: guidePositions.baselineY + (pathObj.pathOffset?.y || 0) * scale,
        scaleX: scale,
        scaleY: scale,
      });

      canvas.add(pathObj);
      canvas.setActiveObject(pathObj);
      setActiveTool('select');
      canvas.requestRenderAll();
      syncToStoreDebounced();
    } catch (err) {
      console.error('Failed to edit reference font:', err);
    }
  }, [activeUnicode, activeOutlines, guidePositions, strokeColor, setActiveTool, syncToStoreDebounced]);

  // Listen for "Trace to Canvas" dispatched from unified top navigation
  useEffect(() => {
    const handleTrace = () => {
      editReferenceFont();
    };
    window.addEventListener('lipi:edit-reference-font', handleTrace);
    return () => window.removeEventListener('lipi:edit-reference-font', handleTrace);
  }, [editReferenceFont]);

  // Handle Drag Resizing of the Canvas Card
  const handleResizeMouseDown = (e: React.MouseEvent) => {
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
  };

  // Keep panOffsetRef in sync with store
  useEffect(() => {
    panOffsetRef.current = { x: panX, y: panY };
  }, [panX, panY]);

  // Window-level mousemove & mouseup for smooth canvas panning across entire screen
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const nx = e.clientX - panStartPosRef.current.x;
        const ny = e.clientY - panStartPosRef.current.y;
        panOffsetRef.current = { x: nx, y: ny };
        useUIStore.getState().setPan(nx, ny);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        const canvas = fabricCanvasRef.current;
        if (canvas?.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = isSpacePressedRef.current
            ? 'grab'
            : activeTool === 'pan'
            ? 'grab'
            : activeTool === 'brush' || activeTool === 'eraser'
            ? 'none'
            : activeTool === 'pen'
            ? 'crosshair'
            : 'default';
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeTool]);

  // Spacebar temporary hand/pan tool (Illustrator / Photoshop / Figma standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
        isSpacePressedRef.current = true;
        const canvas = fabricCanvasRef.current;
        if (canvas?.upperCanvasEl) {
          canvas.upperCanvasEl.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpaceHeld(false);
        isSpacePressedRef.current = false;
        if (!isPanningRef.current) {
          const canvas = fabricCanvasRef.current;
          if (canvas?.upperCanvasEl) {
            canvas.upperCanvasEl.style.cursor =
              activeTool === 'brush' || activeTool === 'eraser'
                ? 'none'
                : activeTool === 'pan'
                ? 'grab'
                : activeTool === 'pen'
                ? 'crosshair'
                : 'default';
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool]);

  // Wheel zoom with Ctrl or Cmd
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const curZoom = useUIStore.getState().zoom;
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        const newZoom = Math.max(0.3, Math.min(3, Math.round((curZoom + delta) * 100) / 100));
        useUIStore.getState().setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressedRef.current || activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartPosRef.current = {
        x: e.clientX - panOffsetRef.current.x,
        y: e.clientY - panOffsetRef.current.y,
      };
      const canvas = fabricCanvasRef.current;
      if (canvas?.upperCanvasEl) {
        canvas.upperCanvasEl.style.cursor = 'grabbing';
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full flex flex-col bg-canvas-pattern-light overflow-hidden select-none"
    >


      {/* WORKSPACE & CANVAS AREA */}
      <div
        onMouseDown={handleWorkspaceMouseDown}
        className={clsx(
          "relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-8",
          (isSpaceHeld || activeTool === 'pan') && (isPanningRef.current ? "cursor-grabbing" : "cursor-grab")
        )}
      >
        {/* Kannada Reference Font Options next to canvas top right corner outside */}
        <CanvasReferenceFontControl />

        {/* Floating Contextual Node HUD (Direct Selection & Node Tools) */}
        {activeTool === 'direct-select' && hasActivePath && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-sky-300 shadow-xl text-xs text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="font-bold text-sky-800 flex items-center gap-1.5 pr-1.5 border-r border-slate-200">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              {selectedNodesCount > 0
                ? `${selectedNodesCount} Node${selectedNodesCount > 1 ? 's' : ''} Selected`
                : 'Click Anchor to Edit'}
            </span>

            {/* Coordinate Inputs if single node selected */}
            {activeNodeCoords && selectedNodesCount === 1 && (
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 font-mono-code text-[11px]">
                <label className="flex items-center gap-0.5 text-slate-500">
                  <span>X:</span>
                  <input
                    type="number"
                    value={activeNodeCoords.x}
                    onChange={(e) => updateSelectedNodeCoordinate('x', Number(e.target.value))}
                    className="w-14 px-1 py-0.5 bg-slate-100 rounded border border-slate-300 text-slate-800 font-bold focus:outline-sky-500 text-center"
                  />
                </label>
                <label className="flex items-center gap-0.5 text-slate-500">
                  <span>Y:</span>
                  <input
                    type="number"
                    value={activeNodeCoords.y}
                    onChange={(e) => updateSelectedNodeCoordinate('y', Number(e.target.value))}
                    className="w-14 px-1 py-0.5 bg-slate-100 rounded border border-slate-300 text-slate-800 font-bold focus:outline-sky-500 text-center"
                  />
                </label>
              </div>
            )}

            {/* Node Operations */}
            <button
              type="button"
              onClick={convertSelectedNodesToSmooth}
              className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Convert selected node(s) to Smooth Bézier curves with tangent handles"
            >
              <Spline className="w-3.5 h-3.5 text-sky-600" />
              <span>Smooth</span>
            </button>
            <button
              type="button"
              onClick={convertSelectedNodesToCorner}
              className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Convert selected node(s) to sharp Corner"
            >
              <Square className="w-3.5 h-3.5 text-sky-600" />
              <span>Corner</span>
            </button>
            <button
              type="button"
              onClick={deleteSelectedNodes}
              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Delete selected anchor node(s) [Delete / Backspace]"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Del Node</span>
            </button>
            <button
              type="button"
              onClick={reverseActivePathDirection}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Reverse path winding direction"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reverse</span>
            </button>
            <button
              type="button"
              onClick={toggleActivePathClosed}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Close or open the path loop"
            >
              <span>Close / Open</span>
            </button>
          </div>
        )}

        {/* Main Resizable Canvas Board */}
        <div
          className="relative transition-shadow duration-150 rounded-2xl border-2 border-slate-200/90 bg-white shadow-2xl shadow-slate-300/60"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Layer 1: Industrial Guidelines & Vector Outline Canvas */}
          <canvas
            ref={guideCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 pointer-events-none z-0 rounded-2xl"
          />

          {/* Layer 2: Fabric.js Interactive Vector Canvas */}
          <div className="absolute inset-0 z-10 rounded-2xl overflow-hidden">
            <canvas
              ref={canvasElementRef}
              width={canvasWidth}
              height={canvasHeight}
            />
          </div>

          {/* Layer 3: Pen & Brush & Eraser Real-time Visual Overlay */}
          <canvas
            ref={penOverlayRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              cursor: activeTool === 'brush' || activeTool === 'eraser' ? 'none' : undefined,
            }}
            className="absolute inset-0 pointer-events-none z-20 rounded-2xl"
          />

          {/* Bottom-Right Corner Resize Drag Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 shadow-md flex items-center justify-center cursor-nwse-resize z-30 hover:scale-125 transition-transform"
            title="Drag to resize canvas dimensions"
          >
            <MoveDiagonal className="w-3 h-3 text-indigo-600" />
          </div>
        </div>

        {/* Unified Floating Canvas Resizing & Zoom Pill (All screen resizing and dimension options in one place) */}
        <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-lg text-xs text-slate-700 select-none">
          {/* Canvas Dimensions & Quick Size Presets */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono-code text-[11px] font-semibold text-slate-600">
              {canvasWidth}×{canvasHeight}
            </span>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
              {[600, 800, 1000].map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => setCanvasSize(dim, dim)}
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer',
                    canvasWidth === dim && canvasHeight === dim
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                  title={`Set canvas dimensions to ${dim}×${dim}px`}
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>

          <div className="h-3.5 w-px bg-slate-200" />

          {/* Screen Zoom & View Resizing Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => useUIStore.getState().setZoom(Math.max(0.3, Math.round((zoom - 0.15) * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-sm"
              title="Zoom Out (Ctrl -)"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => useUIStore.getState().resetZoom()}
              className="font-mono-code text-[11px] font-bold text-slate-800 min-w-10 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors text-center cursor-pointer"
              title="Click to reset zoom to 100% (Ctrl 0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => useUIStore.getState().setZoom(Math.min(3, Math.round((zoom + 0.15) * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-sm"
              title="Zoom In (Ctrl +)"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => useUIStore.getState().resetZoom()}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
              title="Reset View to 100% (Ctrl 0)"
            >
              100%
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';
