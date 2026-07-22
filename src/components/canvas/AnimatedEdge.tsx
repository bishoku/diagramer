import React, { useRef, memo, useMemo } from 'react';
import { EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useEdgeAnimation } from './hooks';
import { AnimationParticle } from './ParticleSvg';
import { resolveParticleType } from '../../config/particles';
import { getThemeEdgeColors } from '../../utils/themeUtils';

interface ParallelBezierParams {
  sourceX: number;
  sourceY: number;
  sourcePosition: string;
  targetX: number;
  targetY: number;
  targetPosition: string;
  offset: number;
}

function getParallelBezierPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  offset,
}: ParallelBezierParams): [string, number, number] {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  let c1x = sourceX;
  let c1y = sourceY;
  let c2x = targetX;
  let c2y = targetY;

  const controlOffset = Math.max(30, len * 0.3);

  if (sourcePosition === 'left') c1x -= controlOffset;
  else if (sourcePosition === 'right') c1x += controlOffset;
  else if (sourcePosition === 'top') c1y -= controlOffset;
  else if (sourcePosition === 'bottom') c1y += controlOffset;

  if (targetPosition === 'left') c2x -= controlOffset;
  else if (targetPosition === 'right') c2x += controlOffset;
  else if (targetPosition === 'top') c2y -= controlOffset;
  else if (targetPosition === 'bottom') c2y += controlOffset;

  c1x += nx * offset;
  c1y += ny * offset;
  c2x += nx * offset;
  c2y += ny * offset;

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;

  const labelX = 0.125 * sourceX + 0.375 * c1x + 0.375 * c2x + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * c1y + 0.375 * c2y + 0.125 * targetY;

  return [path, labelX, labelY];
}

/**
 * Generates a prominent loop path for self-referencing edges (source === target).
 * The loop exits from the source handle, arcs outward, and returns to the target handle.
 * The arc direction and size adapt to which handles are used.
 */
function getSelfLoopPath(
  sourceX: number,
  sourceY: number,
  sourcePosition: string,
  targetX: number,
  targetY: number,
  targetPosition: string,
  siblingIndex: number,
  _siblingCount: number,
): [string, number, number] {
  // Base loop radius — grows with sibling index to prevent overlap
  const baseRadius = 70;
  const siblingStep = 35;
  const radius = baseRadius + siblingIndex * siblingStep;

  // Determine the outward direction based on source handle position
  const srcSide = sourcePosition as string;
  const tgtSide = targetPosition as string;

  // If source and target handles are on the same side, create a U-loop on that side
  if (srcSide === tgtSide) {
    // Both handles on same side — separate them vertically/horizontally
    const gap = 20; // spread between the two endpoints
    let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY;
    let c1x: number, c1y: number, c2x: number, c2y: number;

    switch (srcSide) {
      case 'top':
        sx = sourceX - gap; sy = sourceY;
        tx = targetX + gap; ty = targetY;
        c1x = sx - radius * 0.5; c1y = sy - radius;
        c2x = tx + radius * 0.5; c2y = ty - radius;
        break;
      case 'bottom':
        sx = sourceX - gap; sy = sourceY;
        tx = targetX + gap; ty = targetY;
        c1x = sx - radius * 0.5; c1y = sy + radius;
        c2x = tx + radius * 0.5; c2y = ty + radius;
        break;
      case 'left':
        sx = sourceX; sy = sourceY - gap;
        tx = targetX; ty = targetY + gap;
        c1x = sx - radius; c1y = sy - radius * 0.5;
        c2x = tx - radius; c2y = ty + radius * 0.5;
        break;
      case 'right':
      default:
        sx = sourceX; sy = sourceY - gap;
        tx = targetX; ty = targetY + gap;
        c1x = sx + radius; c1y = sy - radius * 0.5;
        c2x = tx + radius; c2y = ty + radius * 0.5;
        break;
    }

    const path = `M ${sx},${sy} C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`;
    const labelX = 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx;
    const labelY = 0.125 * sy + 0.375 * c1y + 0.375 * c2y + 0.125 * ty;
    return [path, labelX, labelY];
  }

  // Different sides — create an L-shaped loop going outward from both handles
  let c1x = sourceX, c1y = sourceY;
  let c2x = targetX, c2y = targetY;

  // Extend control points outward from their respective sides
  switch (srcSide) {
    case 'top':    c1y -= radius; break;
    case 'bottom': c1y += radius; break;
    case 'left':   c1x -= radius; break;
    case 'right':  c1x += radius; break;
  }

  switch (tgtSide) {
    case 'top':    c2y -= radius; break;
    case 'bottom': c2y += radius; break;
    case 'left':   c2x -= radius; break;
    case 'right':  c2x += radius; break;
  }

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  const labelX = 0.125 * sourceX + 0.375 * c1x + 0.375 * c2x + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * c1y + 0.375 * c2y + 0.125 * targetY;
  return [path, labelX, labelY];
}

export const AnimatedEdge: React.FC<EdgeProps> = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props;

  const logicalData = useAppStore((s) => s.logicalData);
  const layoutEdges = useAppStore((s) => s.visualData.layoutEdges);
  const le = logicalData.edges.find((e) => e.id === id);
  const ve = layoutEdges[id];
  const isReversed = le ? le.sourceId !== props.source : false;
  const isSelfLoop = le ? le.sourceId === le.targetId : false;

  const siblingEdges = useMemo(() => {
    if (!le) return [];
    const related = logicalData.edges.filter(
      (e) => (e.sourceId === le.sourceId && e.targetId === le.targetId) || (e.sourceId === le.targetId && e.targetId === le.sourceId)
    );
    return [...related].sort((a, b) => {
      const aSeqs = logicalData.sequences.filter(s => s.edgeId === a.id);
      const bSeqs = logicalData.sequences.filter(s => s.edgeId === b.id);
      const aMinStep = aSeqs.length > 0 ? Math.min(...aSeqs.map(s => s.stepNumber)) : 999;
      const bMinStep = bSeqs.length > 0 ? Math.min(...bSeqs.map(s => s.stepNumber)) : 999;
      if (aMinStep !== bMinStep) return aMinStep - bMinStep;
      return a.id.localeCompare(b.id);
    });
  }, [logicalData.edges, logicalData.sequences, le]);

  const siblingIndex = siblingEdges.findIndex((e) => e.id === id);
  const siblingCount = siblingEdges.length;

  let offset = 0;
  if (siblingCount > 1 && siblingIndex >= 0) {
    const step = 30;
    const start = -((siblingCount - 1) * step) / 2;
    offset = start + siblingIndex * step;
  }

  if (le && le.sourceId > le.targetId) {
    offset = -offset;
  }

  // Use dedicated self-loop path when source === target
  const [edgePath, labelX, labelY] = isSelfLoop
    ? getSelfLoopPath(
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        siblingIndex >= 0 ? siblingIndex : 0,
        siblingCount,
      )
    : getParallelBezierPath({
        sourceX: isReversed ? targetX : sourceX,
        sourceY: isReversed ? targetY : sourceY,
        sourcePosition: isReversed ? targetPosition : sourcePosition,
        targetPosition: isReversed ? sourcePosition : targetPosition,
        targetX: isReversed ? sourceX : targetX,
        targetY: isReversed ? sourceY : targetY,
        offset,
      });
  const pathRef = useRef<SVGPathElement>(null);

  // Use our custom hook to abstract animation calculation
  const { particlePos, particlePositions, isAnimating, isSelected, isAsync, seqsForEdge, activeStepNumber } = useEdgeAnimation(id, pathRef);

  // Build step labels string, e.g. "1- [HTTP]" or "1, 2- [gRPC]"
  const stepNums = seqsForEdge
    .map((s) => s.stepNumber)
    .sort((a, b) => a - b)
    .filter((value, index, self) => self.indexOf(value) === index);
  const protocolText = le?.protocol ? `- [${le.protocol}]` : '';
  const stepLabel = stepNums.length > 0 ? `${stepNums.join(', ')}${protocolText}` : '';

  const appTheme = useAppStore((s) => s.theme);
  const themeColors = useMemo(() => getThemeEdgeColors(appTheme), [appTheme]);

  // Read visual properties from VisualEdge (not from LogicalEdge)
  const hasCustomColor = !!(ve?.color);
  const customColor = ve?.color || themeColors.defaultColor;
  const activeColor = hasCustomColor ? ve!.color! : themeColors.activeColor;

  let isEdgeActive = false;
  if (isAnimating || isSelected) isEdgeActive = true;

  const strokeColor = isEdgeActive ? activeColor : customColor;

  const particleType = resolveParticleType(ve?.particleType);
  const showArrow = ve?.showArrow ?? false;

  // Build unique marker IDs per edge+state so the arrowhead color matches the stroke.
  const markerId = showArrow ? `arrow-${id}-${isEdgeActive ? 'active' : 'idle'}` : undefined;
  // Arrow fill always equals the stroke color — single source of truth.
  const markerFill = strokeColor;

  return (
    <>
      {/* Arrowhead marker definition — only rendered when showArrow is enabled */}
      {showArrow && (
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={markerFill} />
          </marker>
        </defs>
      )}

      {/* Invisible thicker path to make clicking the edge easier */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visible edge line */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        strokeDasharray={isAsync ? '5,5' : undefined}
        markerEnd={showArrow ? `url(#${markerId})` : undefined}
        className="react-flow__edge-path transition-all duration-150"
        style={{
          stroke: strokeColor,
          strokeWidth: isEdgeActive ? 4 : 2,
          filter: isEdgeActive ? `drop-shadow(0 0 6px ${activeColor}cc)` : undefined,
        }}
      />
      
      {/* Playback particles — repeat mode renders multiple, normal/roundTrip render single */}
      {particlePositions && particlePositions.length > 0
        ? particlePositions.map((pos, idx) => (
            <g
              key={`particle-${idx}`}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotation})`}
              style={{ pointerEvents: 'none' }}
            >
              <AnimationParticle
                type={particleType}
                rotation={pos.rotation}
                stepNumber={activeStepNumber}
                color={strokeColor}
              />
            </g>
          ))
        : particlePos && (
            <g
              transform={`translate(${particlePos.x}, ${particlePos.y}) rotate(${particlePos.rotation})`}
              style={{ pointerEvents: 'none' }}
            >
              <AnimationParticle
                type={particleType}
                rotation={particlePos.rotation}
                stepNumber={activeStepNumber}
                color={strokeColor}
              />
            </g>
          )
      }

      {/* Dynamic Step Order Labels overlay */}
      {stepLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div 
              className={
                isEdgeActive
                  ? "px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold shadow-md select-none transition-colors duration-150"
                  : "px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-950 text-[9px] font-extrabold shadow-md border border-slate-700/50 dark:border-slate-200 transition-colors select-none"
              }
              style={isEdgeActive ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
            >
              {stepLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

