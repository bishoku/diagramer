import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useNodeAnimation = (nodeId: string) => {
  const [animState, setAnimState] = useState({
    tooltipActive: false,
    tooltipText: '',
    nodeActive: false,
  });

  useEffect(() => {
    // Only subscribe to changes in currentTime, logicalData, or visualData
    const unsub = useAppStore.subscribe((state, prevState) => {
      // If we're not playing and the time hasn't changed, we don't necessarily need to recalculate every tick
      // However, if logicalData changes we should recalculate if time > 0.
      const currentTime = state.currentTime;
      if (currentTime === prevState.currentTime && 
          state.logicalData === prevState.logicalData && 
          state.visualData === prevState.visualData) {
        return;
      }

      let tooltipActive = false;
      let tooltipText = '';
      let nodeActive = false;

      try {
        const schedules = state.schedules;

        for (const seq of state.logicalData.sequences) {
          const edge = state.logicalData.edges.find((e: any) => e.id === seq.edgeId);
          if (!edge) continue;

          const sched = schedules[seq.id];
          if (!sched) continue;

          const timing = state.visualData.timelines[seq.id];
          const ipDuration = (!seq.isRoundTrip && timing?.internalProcess) 
            ? (timing.internalProcess.duration ?? 1000) 
            : 0;

          const activeEnd = sched.end + ipDuration;
          if (currentTime < sched.start || currentTime > activeEnd) continue;

          const srcId = edge.sourceId;
          const tgtId = edge.targetId;
          const elapsed = currentTime - sched.start;
          const stepDuration = timing?.duration ?? 1000;

          if (seq.isRoundTrip) {
            const halfTransit = stepDuration / 2;
            const totalElapsed = sched.end - sched.start;
            const returnStartElapsed = totalElapsed - halfTransit;

            if (nodeId === srcId) {
              if (elapsed < halfTransit || elapsed >= returnStartElapsed) {
                nodeActive = true;
              }
            }
            if (nodeId === tgtId) {
              if (elapsed >= halfTransit && elapsed < returnStartElapsed) {
                nodeActive = true;
              }
            }

            if (nodeId === tgtId && timing?.internalProcess) {
              const ipDuration = timing.internalProcess.duration ?? 1000;
              const tooltipStart = sched.end - halfTransit - ipDuration;
              const tooltipEnd = tooltipStart + ipDuration;
              if (currentTime >= tooltipStart && currentTime < tooltipEnd) {
                tooltipActive = true;
                tooltipText = timing.internalProcess.text;
              }
            }
          } else {
            const transitDuration = stepDuration;

            if (nodeId === srcId) {
              if (elapsed < transitDuration) {
                nodeActive = true;
              }
            }
            if (nodeId === tgtId) {
              if (elapsed >= transitDuration) {
                nodeActive = true;
              }
            }

            if (nodeId === tgtId && timing?.internalProcess) {
              const tooltipStart = sched.end;
              const tooltipEnd = sched.end + timing.internalProcess.duration;
              if (currentTime >= tooltipStart && currentTime < tooltipEnd) {
                tooltipActive = true;
                tooltipText = timing.internalProcess.text;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error calculating node anim state:', err);
      }

      setAnimState((prev) => {
        if (
          prev.tooltipActive !== tooltipActive ||
          prev.tooltipText !== tooltipText ||
          prev.nodeActive !== nodeActive
        ) {
          return { tooltipActive, tooltipText, nodeActive };
        }
        return prev; // Return previous object to prevent re-render
      });
    });

    return unsub;
  }, [nodeId]);

  return animState;
};
