import type { Point } from '../../utils/curveSmoothing';
import type { PenNode } from '../../utils/strokeTools';
import { autoComputeSmoothCircularHandles } from '../../utils/strokeTools';
import type { EditableSubpath } from '../../utils/pathNodeEditor';
import type { CanvasTool, PenMode, StrokeCap, StrokeJoin } from '../../types/canvas';

export interface OverlayRenderContext {
  activeTool: CanvasTool;
  penMode: PenMode;
  strokeColor: string;
  strokeWidth: number;
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  eraserSize: number;
  hoverPos: Point | null;
  penNodes: PenNode[];
  activeDragIndex: number | null;
  isNearStart: boolean;
  selectedPathExists: boolean;
  editableSubpaths: EditableSubpath[];
  selectedNodeIds: Set<string>;
  hoveredNodeInfo: {
    subpathIndex: number;
    nodeIndex: number;
    type: 'anchor' | 'handleIn' | 'handleOut';
  } | null;
  hoveredSegment: {
    subpathIndex: number;
    segmentIndex: number;
    t: number;
    point: Point;
  } | null;
  marqueeBox: { start: Point; current: Point } | null;
}

/**
 * Cleanly renders pen, eraser, and direct-selection node editing overlays
 * onto the transparent overlay canvas layer above Fabric.js.
 */
export function renderCanvasOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OverlayRenderContext
) {
  ctx.clearRect(0, 0, width, height);

  const {
    activeTool,
    penMode,
    strokeColor,
    strokeWidth,
    strokeCap,
    strokeJoin,
    eraserSize,
    hoverPos,
    penNodes,
    activeDragIndex,
    isNearStart,
    selectedPathExists,
    editableSubpaths,
    selectedNodeIds,
    hoveredNodeInfo,
    hoveredSegment,
    marqueeBox,
  } = state;

  // 1. Eraser Tool: circular eraser indicator
  if (activeTool === 'eraser' && hoverPos) {
    const { x, y } = hoverPos;
    const radius = eraserSize / 2;
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

  // 2. Brush Tool: circular brush indicator matching strokeWidth
  if (activeTool === 'brush' && hoverPos) {
    const { x, y } = hoverPos;
    const radius = Math.max(1.5, strokeWidth / 2);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor ? `${strokeColor}14` : 'rgba(79, 70, 229, 0.08)';
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

  // 3. Pen Tool overlay
  if (activeTool === 'pen') {
    if (penNodes.length > 0 || hoverPos) {
      ctx.save();

      if (penMode === 'sharp') {
        // Sharp Polyline Mode
        if (penNodes.length >= 1) {
          ctx.beginPath();
          ctx.moveTo(penNodes[0].x, penNodes[0].y);
          for (let i = 1; i < penNodes.length; i++) {
            ctx.lineTo(penNodes[i].x, penNodes[i].y);
          }
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = strokeCap;
          ctx.lineJoin = 'miter';
          ctx.stroke();
        }

        // Rubberband line to cursor
        if (penNodes.length > 0 && hoverPos && activeDragIndex === null) {
          const last = penNodes[penNodes.length - 1];
          const target = isNearStart ? penNodes[0] : hoverPos;

          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isNearStart ? '#10b981' : '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Diamond corner anchors
        penNodes.forEach((node, idx) => {
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
        // Rounded Curvature Mode
        if (isNearStart && penNodes.length >= 2) {
          const closedNodes = autoComputeSmoothCircularHandles(
            penNodes.map((n) => ({ ...n })),
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
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = strokeCap;
          ctx.lineJoin = strokeJoin;
          ctx.stroke();

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
              ctx.beginPath();
              ctx.arc(node.x + 12, node.y - 12, 4.5, 0, Math.PI * 2);
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.8;
              ctx.stroke();
            }
          });
        } else {
          const computedNodes = autoComputeSmoothCircularHandles(
            penNodes.map((n) => ({ ...n })),
            false
          );

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
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = strokeCap;
            ctx.lineJoin = strokeJoin;
            ctx.stroke();
          }

          if (penNodes.length > 0 && hoverPos && activeDragIndex === null) {
            const extNodes = autoComputeSmoothCircularHandles(
              [
                ...penNodes.map((n) => ({ ...n })),
                { x: hoverPos.x, y: hoverPos.y, type: 'smooth' as const },
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

  // 4. Direct Selection & Node Editing Overlay
  if (
    activeTool === 'direct-select' ||
    (activeTool === 'pen' && penNodes.length === 0 && selectedPathExists)
  ) {
    if (editableSubpaths.length > 0) {
      ctx.save();

      // Path contour outline
      editableSubpaths.forEach((sub) => {
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

      // Bézier handles and grips
      editableSubpaths.forEach((sub) => {
        sub.nodes.forEach((node) => {
          const isSelected = selectedNodeIds.has(node.id);

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

          // Anchor point (square smooth, diamond corner)
          const isHovered =
            hoveredNodeInfo?.nodeIndex !== undefined &&
            sub.nodes[hoveredNodeInfo.nodeIndex]?.id === node.id &&
            hoveredNodeInfo.type === 'anchor';
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

    // Hovered Segment Insertion Indicator
    if (hoveredSegment) {
      const { point } = hoveredSegment;
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

    // Marquee Selection Box
    if (marqueeBox) {
      const { start, current } = marqueeBox;
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
}
