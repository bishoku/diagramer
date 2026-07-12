import { useEffect, useState, useMemo, RefObject } from 'react';
import { useAppStore } from '../../../store/useAppStore';
export const useEdgeAnimation = (edgeId: string, pathRef: RefObject<SVGPathElement | null>) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);

  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeStepNumber, setActiveStepNumber] = useState<number | null>(null);

  const seqsForEdge = useMemo(() => logicalData.sequences.filter((s) => s.edgeId === edgeId), [logicalData.sequences, edgeId]);
  const isSelected = useMemo(() => seqsForEdge.some((s) => s.id === selectedSequenceId), [seqsForEdge, selectedSequenceId]);
  const isAsync = useMemo(() => seqsForEdge.some((s) => s.isAsync), [seqsForEdge]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const currentTime = state.currentTime;
      // Skip redundant checks if time hasn't changed and data hasn't changed
      if (currentTime === 0 && prevState.currentTime === 0 && 
          state.logicalData === prevState.logicalData && 
          state.visualData === prevState.visualData) {
        return;
      }

      const schedules = state.schedules;

      let activeSeq = null;
      for (const seq of seqsForEdge) {
        const sched = schedules[seq.id];
        if (sched && currentTime >= sched.start && currentTime <= sched.end) {
          activeSeq = seq;
          break;
        }
      }

      const newIsAnimating = !!activeSeq;
      setIsAnimating((prev) => {
        if (prev !== newIsAnimating) return newIsAnimating;
        return prev;
      });

      const nextStepNum = activeSeq ? activeSeq.stepNumber : null;
      setActiveStepNumber((prev) => (prev !== nextStepNum ? nextStepNum : prev));

      const pathEl = pathRef.current;
      if (!pathEl || !newIsAnimating || !activeSeq) {
        setParticlePos((prev) => (prev !== null ? null : prev));
        return;
      }

      try {
        const sched = schedules[activeSeq.id];
        if (!sched) {
          setParticlePos((prev) => (prev !== null ? null : prev));
          return;
        }

        const timing = state.visualData.timelines[activeSeq.id];
        const stepDuration = timing?.duration ?? 1000;
        const elapsed = currentTime - sched.start;

        let actualProgress = 0;

        if (activeSeq.isRoundTrip) {
          const transitHalf = stepDuration / 2;
          const returnStartElapsed = (sched.end - sched.start) - transitHalf;

          if (elapsed < transitHalf) {
            actualProgress = Math.min(Math.max(elapsed / transitHalf, 0), 1);
          } else if (elapsed < returnStartElapsed) {
            actualProgress = 1.0;
          } else {
            const returnElapsed = elapsed - returnStartElapsed;
            actualProgress = 1.0 - Math.min(Math.max(returnElapsed / transitHalf, 0), 1);
          }
        } else {
          const transitDuration = stepDuration;
          if (elapsed < transitDuration) {
            const progress = Math.min(Math.max(elapsed / transitDuration, 0), 1);
            actualProgress = activeSeq.direction === 'reverse' ? (1 - progress) : progress;
          } else {
            actualProgress = activeSeq.direction === 'reverse' ? 0 : 1;
          }
        }
        
        const totalLength = pathEl.getTotalLength();
        if (totalLength > 0) {
          const point = pathEl.getPointAtLength(actualProgress * totalLength);
          setParticlePos({ x: point.x, y: point.y });
        }
      } catch (err) {
        setParticlePos((prev) => (prev !== null ? null : prev));
      }
    });

    return unsub;
  }, [seqsForEdge, pathRef]);

  return {
    particlePos,
    isAnimating,
    isSelected,
    isAsync,
    seqsForEdge,
    activeStepNumber,
  };
};
