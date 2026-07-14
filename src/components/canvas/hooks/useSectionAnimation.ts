import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useSectionAnimation = (sectionId: string) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      const currentTime = state.currentTime;
      if (currentTime === prevState.currentTime && 
          state.logicalData === prevState.logicalData && 
          state.visualData === prevState.visualData) {
        return;
      }

      let active = false;
      try {
        const schedules = state.schedules;
        
        const targetSeqs = state.logicalData.sequences.filter((s: any) => {
          const edge = state.logicalData.edges.find((e: any) => e.id === s.edgeId);
          return edge && edge.targetId === sectionId;
        });
        
        for (const seq of targetSeqs) {
          const sched = schedules[seq.id];
          if (sched && currentTime >= sched.start && currentTime < sched.end) {
            active = true;
            break;
          }
        }
      } catch (err) {
        // Silently handle errors
      }

      setIsActive((prev) => {
        if (prev !== active) return active;
        return prev;
      });
    });

    return unsub;
  }, [sectionId]);

  return isActive;
};
