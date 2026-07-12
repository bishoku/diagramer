import React, { useRef, memo } from 'react';
import { getBezierPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useEdgeAnimation } from './hooks';

export const AnimatedEdge: React.FC<EdgeProps> = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
  } = props;

  const logicalData = useAppStore((s) => s.logicalData);
  const le = logicalData.edges.find((e) => e.id === id);
  const isReversed = le ? le.from !== props.source : false;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: isReversed ? targetX : sourceX,
    sourceY: isReversed ? targetY : sourceY,
    sourcePosition: isReversed ? targetPosition : sourcePosition,
    targetPosition: isReversed ? sourcePosition : targetPosition,
    targetX: isReversed ? sourceX : targetX,
    targetY: isReversed ? sourceY : targetY,
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

  // Determine stroke color and style
  let strokeColor = '#94a3b8'; // Default slate-400
  let isEdgeActive = false;

  if (isAnimating) {
    strokeColor = '#6366f1'; // Active animating indigo-500
    isEdgeActive = true;
  } else if (isSelected) {
    strokeColor = '#6366f1'; // Selected indigo-500
  }

  return (
    <>
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
        stroke={strokeColor}
        strokeWidth={isEdgeActive ? 3.5 : (isSelected ? 3 : 2)}
        strokeDasharray={isAsync ? '5,5' : undefined}
        markerEnd={markerEnd}
        className="react-flow__edge-path transition-all duration-150"
        style={isEdgeActive ? { filter: 'drop-shadow(0 0 3px rgba(99, 102, 241, 0.6))' } : undefined}
      />
      
      {/* Playback particle dot (Billiard ball style with sequence number) */}
      {particlePos && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Outer glow ring */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={16}
            fill="#818cf8"
            style={{ opacity: 0.3 }}
          />
          {/* Main Billiard Ball Body */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={11}
            fill="#4f46e5"
          />
          {/* Billiard Ball Center (White Stripe/Circle) */}
          {activeStepNumber !== null && (
            <>
              <circle
                cx={particlePos.x}
                cy={particlePos.y}
                r={6.5}
                fill="#ffffff"
              />
              {/* Sequence Step Number */}
              <text
                x={particlePos.x}
                y={particlePos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1e293b"
                style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                  userSelect: 'none'
                }}
              >
                {activeStepNumber}
              </text>
            </>
          )}
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
