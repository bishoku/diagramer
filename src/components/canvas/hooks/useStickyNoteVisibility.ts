import { useAppStore } from '../../../store/useAppStore';

export const useStickyNoteVisibility = (id: string) => {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const currentTime = useAppStore((s) => s.currentTime);
  const annotation = useAppStore((s) => s.visualData.annotations?.[id]);

  if (!annotation) return { isVisible: false, opacity: 0 };

  // If set to always visible, fully visible
  if (annotation.alwaysVisible) return { isVisible: true, opacity: annotation.style.opacity || 1 };

  // Check against current time
  const inRange = currentTime >= annotation.startTime && currentTime <= annotation.endTime;

  if (isPlaying) {
    return { isVisible: inRange, opacity: inRange ? (annotation.style.opacity || 1) : 0 };
  } else {
    // In design mode (not playing)
    // Only visible if currently in range
    return { isVisible: inRange, opacity: inRange ? (annotation.style.opacity || 1) : 0 };
  }
};
