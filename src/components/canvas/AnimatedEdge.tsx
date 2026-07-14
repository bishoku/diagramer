import React, { useRef, memo, useMemo } from 'react';
import { EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useEdgeAnimation } from './hooks';
import { AnimationParticle } from './ParticleSvg';
import { resolveParticleType } from '../../config/particles';

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

  const [edgePath, labelX, labelY] = getParallelBezierPath({
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
  const { particlePos, isAnimating, isSelected, isAsync, seqsForEdge, activeStepNumber } = useEdgeAnimation(id, pathRef);

  // Build step labels string, e.g. "1- [HTTP]" or "1, 2- [gRPC]"
  const stepNums = seqsForEdge
    .map((s) => s.stepNumber)
    .sort((a, b) => a - b)
    .filter((value, index, self) => self.indexOf(value) === index);
  const protocolText = le?.protocol ? `- [${le.protocol}]` : '';
  const stepLabel = stepNums.length > 0 ? `${stepNums.join(', ')}${protocolText}` : '';

  // Read visual properties from VisualEdge (not from LogicalEdge)
  const hasCustomColor = !!(ve?.color);
  const customColor = ve?.color || '#94a3b8';
  const activeColor = hasCustomColor ? ve!.color! : '#6366f1';

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
      
      {/* Playback particle */}
      {particlePos && (
        <g
          transform={`translate(${particlePos.x}, ${particlePos.y}) rotate(${particlePos.rotation})`}
          style={{ pointerEvents: 'none' }}
        >
          <AnimationParticle
            type={particleType}
            rotation={particlePos.rotation}
            stepNumber={activeStepNumber}
          />
        </g>
      )}

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
                  ? "px-2 py-0.5 rounded-full bg-indigo-600 text-white border border-indigo-400 text-[9px] font-extrabold shadow-md select-none transition-colors duration-150"
                  : "px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-950 text-[9px] font-extrabold shadow-md border border-slate-700/50 dark:border-slate-200 transition-colors select-none"
              }
            >
              {stepLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

