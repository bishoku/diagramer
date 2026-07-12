import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getBezierPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { calculateSchedules } from '../../store/scheduler';

export const AnimatedEdge: React.FC<EdgeProps> = (props) => {
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

  const { logicalData, visualData, currentTime, selectedSequenceId } = useAppStore();
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
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);

  // Find all sequences that map to this edge
  const seqsForEdge = logicalData.sequences.filter((s) => s.edgeId === id);
  const isSelected = seqsForEdge.some((s) => s.id === selectedSequenceId);

  // Compute isAsync (dashed stroke style)
  const isAsync = seqsForEdge.some((s) => s.isAsync);

  // Calculate schedules
  const schedules = useMemo(() => {
    return calculateSchedules(logicalData.sequences, visualData.timelines, logicalData.edges);
  }, [logicalData.sequences, visualData.timelines, logicalData.edges]);
  
  // Find if playhead is currently animating this edge
  let activeSeq = null;
  for (const seq of seqsForEdge) {
    const sched = schedules[seq.id];
    if (sched && currentTime >= sched.start && currentTime <= sched.end) {
      activeSeq = seq;
      break;
    }
  }
  const isAnimating = !!activeSeq;

  // Build step labels string, e.g. "1- [HTTP]" or "1, 2- [gRPC]"
  const stepNums = seqsForEdge
    .map((s) => s.stepNumber)
    .sort((a, b) => a - b)
    .filter((value, index, self) => self.indexOf(value) === index);
  const protocolText = le?.protocol ? `- [${le.protocol}]` : '';
  const stepLabel = stepNums.length > 0 ? `${stepNums.join(', ')}${protocolText}` : '';

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl || !isAnimating || !activeSeq) {
      if (particlePos !== null) {
        setParticlePos(null);
      }
      return;
    }

    try {
      const sched = schedules[activeSeq.id];
      if (!sched) {
        if (particlePos !== null) {
          setParticlePos(null);
        }
        return;
      }

      const timing = visualData.timelines[activeSeq.id];
      const stepDuration = timing?.duration ?? 1000;
      const elapsed = currentTime - sched.start;

      let actualProgress = 0;

      if (activeSeq.isRoundTrip) {
        const transitHalf = stepDuration / 2;
        // Return transit starts at (end - transitHalf) relative to schedule start
        // This accounts for nested children extending the schedule beyond just forward+ip+return
        const returnStartElapsed = (sched.end - sched.start) - transitHalf;

        if (elapsed < transitHalf) {
          // Forward transit
          actualProgress = Math.min(Math.max(elapsed / transitHalf, 0), 1);
        } else if (elapsed < returnStartElapsed) {
          // Waiting at target (internal process + nested children executing)
          actualProgress = 1.0;
        } else {
          // Return transit
          const returnElapsed = elapsed - returnStartElapsed;
          actualProgress = 1.0 - Math.min(Math.max(returnElapsed / transitHalf, 0), 1);
        }
      } else {
        const duration = sched.end - sched.start;
        const progress = duration > 0 ? Math.min(Math.max(elapsed / duration, 0), 1) : 1;
        actualProgress = activeSeq.direction === 'reverse' ? (1 - progress) : progress;
      }
      
      const totalLength = pathEl.getTotalLength();
      if (totalLength > 0) {
        const point = pathEl.getPointAtLength(actualProgress * totalLength);
        setParticlePos({ x: point.x, y: point.y });
      }
    } catch (err) {
      if (particlePos !== null) {
        setParticlePos(null);
      }
    }
  }, [currentTime, isAnimating, activeSeq, logicalData.sequences, visualData.timelines, schedules, particlePos]);

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
      
      {/* Playback particle dot (Indigo themed to match exported simulation style) */}
      {particlePos && (
        <g>
          {/* Outer glow ring */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={10}
            fill="#818cf8"
            style={{ opacity: 0.4 }}
          />
          {/* Inner solid particle */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={6}
            fill="#818cf8"
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
};
